/**
 * Complete MCP Tools Registry for CF7 Developer Assistant (Phase 1, 2, 3, 4)
 */
import { z } from 'zod';
import { WordPressClient } from '../wordpress/client.js';
import { CF7Analyzer } from '../audit/analyzer.js';
import { CF7FormTester } from '../testing/tester.js';
import { CF7DeliveryDiagnostics } from '../diagnostics/delivery.js';
import { CF7DiffEngine } from '../backup/diff.js';
import { IntegrationTester } from '../integrations/tester.js';
import { IntegrationPhpGenerator } from '../integrations/php-generator.js';
import { TemplateManager } from '../templates/manager.js';
import { startAuthorization, waitForAuthorization, openInBrowser, normalizeSiteUrl } from '../connect/authorize.js';
import { readEnv } from '../wordpress/env.js';
export function registerTools(server, wpClient, backupManager, siteManager, integrationManager) {
    // Helper to get client for currently selected site or fallback
    const getActiveClient = (siteId) => {
        if (siteId) {
            const targetSite = siteManager.getSite(siteId);
            if (targetSite) {
                return {
                    client: new WordPressClient(targetSite),
                    baseUrl: targetSite.baseUrl
                };
            }
        }
        const active = siteManager.getActiveSite();
        if (active) {
            return {
                client: new WordPressClient(active),
                baseUrl: active.baseUrl
            };
        }
        return {
            client: wpClient,
            baseUrl: readEnv('WORDPRESS_URL') || ''
        };
    };
    /**
     * ==========================================
     * 1. Multi-Site Management Tools (Phase 3.1)
     * ==========================================
     */
    server.tool('wp_list_sites', 'List all configured WordPress websites with connection status and environments.', {}, async () => {
        const sites = siteManager.listSites();
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({ total: sites.length, sites }, null, 2)
                }
            ]
        };
    });
    server.tool('wp_add_site', 'Register a new WordPress site for multi-site monitoring and management.', {
        id: z.string().describe('Unique identifier for this site (e.g. client-one, staging-shop)'),
        name: z.string().describe('Human-friendly site title'),
        url: z.string().describe('Base WordPress URL (e.g. https://client.example.com)'),
        username: z.string().optional().describe('WordPress username'),
        application_password: z.string().optional().describe('WordPress application password'),
        environment: z.enum(['production', 'staging', 'local']).optional().default('production')
    }, async (params) => {
        siteManager.addSite({
            id: params.id,
            name: params.name,
            baseUrl: params.url,
            username: params.username,
            applicationPassword: params.application_password,
            environment: params.environment
        });
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        success: true,
                        message: `Site "${params.name}" (${params.id}) registered successfully.`
                    }, null, 2)
                }
            ]
        };
    });
    // Pending browser authorizations, keyed by normalized site URL
    const pendingAuths = new Map();
    server.tool('wp_connect_start', 'Start connecting a WordPress site through the browser. Returns a WordPress admin URL (and tries to open it) where the user clicks "Approve"; no password needs to be copied. Then call wp_connect_complete.', {
        url: z.string().describe('WordPress site URL, e.g. https://example.com'),
        environment: z.enum(['production', 'staging', 'local']).optional().describe('Type of site. Ask the user; recommend staging first.'),
        name: z.string().optional().describe('Friendly site name'),
        open_browser: z.boolean().optional().default(true).describe('Try to open the approval page in the default browser')
    }, async ({ url, environment, name, open_browser }) => {
        let siteUrl;
        try {
            siteUrl = normalizeSiteUrl(url);
        }
        catch {
            throw new Error(`"${url}" is not a valid site URL. Use something like https://example.com`);
        }
        const existing = pendingAuths.get(siteUrl);
        if (existing)
            existing.pending.close();
        const pending = await startAuthorization(siteUrl);
        const isLocalUrl = /localhost|127\.0\.0\.1|\.local\b|\.test\b/i.test(siteUrl);
        pendingAuths.set(siteUrl, { pending, environment: environment || (isLocalUrl ? 'local' : 'production'), name });
        const opened = open_browser === false ? false : openInBrowser(pending.authUrl);
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        status: 'waiting_for_approval',
                        site: siteUrl,
                        approvalUrl: pending.authUrl,
                        browserOpened: opened,
                        next: 'Tell the user to open approvalUrl (if it did not open), log in to WordPress if asked, and click "Yes, I approve of this connection". Then call wp_connect_complete with the same url.',
                        note: 'This only works if the browser is on the same computer as Claude Code. Otherwise use Configure options or wp_add_site.'
                    }, null, 2)
                }
            ]
        };
    });
    server.tool('wp_connect_complete', 'Finish connecting a WordPress site after the user approved it in the browser. Waits for the approval, saves the site, selects it, and verifies Contact Form 7.', {
        url: z.string().describe('The same site URL given to wp_connect_start'),
        wait_seconds: z.number().optional().default(90).describe('How long to wait for approval (max 240)')
    }, async ({ url, wait_seconds }) => {
        const siteUrl = normalizeSiteUrl(url);
        const entry = pendingAuths.get(siteUrl);
        if (!entry) {
            throw new Error(`No pending connection for ${siteUrl}. Call wp_connect_start first.`);
        }
        const { pending } = entry;
        await waitForAuthorization(pending, Math.min(Math.max(wait_seconds ?? 90, 1), 240) * 1000);
        if (pending.rejected) {
            pendingAuths.delete(siteUrl);
            return { content: [{ type: 'text', text: JSON.stringify({ status: 'declined', message: 'The connection was declined in WordPress. Run wp_connect_start again to retry.' }, null, 2) }] };
        }
        if (!pending.result) {
            const expired = pending.closed;
            if (expired)
                pendingAuths.delete(siteUrl);
            return {
                content: [{
                        type: 'text',
                        text: JSON.stringify({
                            status: expired ? 'expired' : 'still_waiting',
                            message: expired
                                ? 'The approval window expired. Run wp_connect_start again.'
                                : 'No approval yet. Ask the user to click "Approve" in the browser, then call wp_connect_complete again.'
                        }, null, 2)
                    }]
            };
        }
        const { username, password } = pending.result;
        pendingAuths.delete(siteUrl);
        const host = new URL(siteUrl).host.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
        const siteId = host || 'site';
        siteManager.addSite({
            id: siteId,
            name: entry.name || host,
            baseUrl: siteUrl,
            username,
            applicationPassword: password,
            environment: entry.environment
        });
        siteManager.setActiveSite(siteId);
        const client = new WordPressClient({ baseUrl: siteUrl, username, applicationPassword: password });
        const check = await client.checkConnection();
        let forms = [];
        let authWorks = false;
        if (check.connected && check.hasCf7) {
            try {
                forms = (await client.listForms()).map(f => ({ id: f.id, title: f.title }));
                authWorks = true;
            }
            catch {
                authWorks = false;
            }
        }
        return {
            content: [{
                    type: 'text',
                    text: JSON.stringify({
                        status: 'connected',
                        siteId,
                        site: siteUrl,
                        username,
                        environment: entry.environment,
                        wordpress: check.siteName,
                        contactForm7Detected: check.hasCf7,
                        credentialsWork: authWorks,
                        forms,
                        message: check.hasCf7
                            ? 'Site connected and selected. You can now create or edit forms.'
                            : 'Connected to WordPress, but Contact Form 7 was not detected. Ask the user to install and activate Contact Form 7 (and use pretty permalinks).'
                    }, null, 2)
                }]
        };
    });
    server.tool('wp_select_site', 'Switch active WordPress site context.', {
        site_id: z.string().describe('The ID of the site to activate')
    }, async ({ site_id }) => {
        const switched = siteManager.setActiveSite(site_id);
        if (!switched) {
            throw new Error(`Site with ID "${site_id}" not found.`);
        }
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        success: true,
                        message: `Active site switched to "${site_id}".`
                    }, null, 2)
                }
            ]
        };
    });
    /**
     * ==========================================
     * 2. Core CF7 & Diagnostics (Phase 2 & 3.2)
     * ==========================================
     */
    server.tool('wp_check_connection', 'Test WordPress REST API connectivity, core version, and Contact Form 7 plugin status.', {
        site_id: z.string().optional().describe('Optional site ID to test')
    }, async ({ site_id }) => {
        const { client } = getActiveClient(site_id);
        const result = await client.checkConnection();
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(result, null, 2)
                }
            ]
        };
    });
    server.tool('cf7_list_forms', 'List all Contact Form 7 forms on the connected WordPress website.', {
        site_id: z.string().optional().describe('Optional site ID')
    }, async ({ site_id }) => {
        const { client } = getActiveClient(site_id);
        const forms = await client.listForms();
        const summary = forms.map(f => ({
            id: f.id,
            title: f.title,
            slug: f.slug,
            shortcode: `[contact-form-7 id="${f.id}" title="${f.title}"]`
        }));
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({ total: forms.length, forms: summary }, null, 2)
                }
            ]
        };
    });
    server.tool('cf7_get_form', 'Retrieve complete configuration of a specific Contact Form 7 form by ID.', {
        form_id: z.number().describe('The ID of the Contact Form 7 form'),
        site_id: z.string().optional().describe('Optional site ID')
    }, async ({ form_id, site_id }) => {
        const { client } = getActiveClient(site_id);
        const form = await client.getForm(form_id);
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(form, null, 2)
                }
            ]
        };
    });
    server.tool('cf7_health_check', 'Run automated health check across all forms on the site, separating confirmed errors from items needing review.', {
        site_id: z.string().optional().describe('Optional site ID to scan')
    }, async ({ site_id }) => {
        const { client, baseUrl } = getActiveClient(site_id);
        const forms = await client.listForms();
        const confirmedErrors = [];
        const needsReview = [];
        const cleanForms = [];
        for (const f of forms) {
            const fullForm = await client.getForm(f.id);
            const audit = CF7Analyzer.audit(fullForm, baseUrl);
            const criticals = audit.issues.filter(i => i.severity === 'critical');
            const warnings = audit.issues.filter(i => i.severity === 'warning');
            if (criticals.length > 0) {
                confirmedErrors.push({
                    formId: f.id,
                    title: f.title,
                    healthScore: audit.healthScore,
                    criticalIssues: criticals
                });
            }
            else if (warnings.length > 0) {
                needsReview.push({
                    formId: f.id,
                    title: f.title,
                    healthScore: audit.healthScore,
                    reviewItems: warnings
                });
            }
            else {
                cleanForms.push({
                    formId: f.id,
                    title: f.title,
                    healthScore: 100
                });
            }
        }
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        site: baseUrl,
                        scannedFormsCount: forms.length,
                        summary: {
                            confirmedErrorsCount: confirmedErrors.length,
                            needsReviewCount: needsReview.length,
                            cleanFormsCount: cleanForms.length
                        },
                        confirmedErrors,
                        needsReview,
                        cleanForms
                    }, null, 2)
                }
            ]
        };
    });
    /**
     * Stored submissions (CF7 Submissions Bridge plugin / Flamingo)
     */
    server.tool('cf7_submissions_status', 'Check whether form submissions are being stored on the connected WordPress site (CF7 Submissions Bridge plugin and/or Flamingo) and how many exist.', { site_id: z.string().optional().describe('Optional site ID') }, async ({ site_id }) => {
        const { client } = getActiveClient(site_id);
        const status = await client.getSubmissionStatus();
        return { content: [{ type: 'text', text: JSON.stringify(status, null, 2) }] };
    });
    server.tool('cf7_get_submissions', 'Retrieve stored Contact Form 7 / Flamingo submissions from WordPress, newest first. Filter by form, search text or date. Pass id to fetch one submission in full.', {
        id: z.string().optional().describe('A single submission id from a previous result, e.g. flamingo-12 or cf7sb-34'),
        form_id: z.number().optional().describe('Only submissions of this Contact Form 7 form'),
        search: z.string().optional().describe('Text to search for (name, email, message...)'),
        after: z.string().optional().describe('Only submissions on or after this date (YYYY-MM-DD or ISO 8601)'),
        source: z.enum(['auto', 'bridge', 'flamingo']).optional().default('auto').describe('auto uses Flamingo when active, otherwise the Bridge plugin'),
        limit: z.number().min(1).max(100).optional().default(20),
        page: z.number().min(1).optional().default(1),
        include_spam: z.boolean().optional().default(false).describe('Include messages Flamingo marked as spam'),
        site_id: z.string().optional().describe('Optional site ID')
    }, async (params) => {
        const { client } = getActiveClient(params.site_id);
        const data = params.id
            ? await client.getSubmission(params.id)
            : await client.listSubmissions({
                form_id: params.form_id,
                search: params.search,
                after: params.after,
                source: params.source,
                per_page: params.limit,
                page: params.page,
                include_spam: params.include_spam
            });
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    });
    server.tool('cf7_audit_form', 'Run deep diagnostics and security/deliverability audit on a specific form.', {
        form_id: z.number().describe('The ID of the Contact Form 7 form to audit'),
        site_id: z.string().optional().describe('Optional site ID')
    }, async ({ form_id, site_id }) => {
        const { client, baseUrl } = getActiveClient(site_id);
        const form = await client.getForm(form_id);
        const auditResult = CF7Analyzer.audit(form, baseUrl);
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(auditResult, null, 2)
                }
            ]
        };
    });
    /**
     * ==========================================
     * 3. Form Testing Engine (Phase 3.3)
     * ==========================================
     */
    server.tool('cf7_test_submission', 'Perform safe synthetic submission testing against a CF7 form endpoint.', {
        form_id: z.number().describe('The ID of the form to test'),
        mode: z.enum(['valid', 'invalid_email', 'missing_required', 'custom']).optional().default('valid'),
        custom_data: z.record(z.string()).optional().describe('Custom field payload when mode is custom'),
        confirm_production: z.boolean().optional().describe('Must be true if executing tests on a production domain'),
        site_id: z.string().optional().describe('Optional site ID')
    }, async (params) => {
        const { client, baseUrl } = getActiveClient(params.site_id);
        const result = await CF7FormTester.testForm(client, baseUrl, {
            formId: params.form_id,
            mode: params.mode,
            customData: params.custom_data,
            confirmProduction: params.confirm_production
        });
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(result, null, 2)
                }
            ]
        };
    });
    /**
     * ==========================================
     * 4. Email Delivery Diagnostics (Phase 3.4)
     * ==========================================
     */
    server.tool('cf7_diagnose_delivery', 'Run layered 5-tier email deliverability diagnostics for a specific form.', {
        form_id: z.number().describe('The ID of the form to diagnose'),
        site_id: z.string().optional().describe('Optional site ID')
    }, async ({ form_id, site_id }) => {
        const { client, baseUrl } = getActiveClient(site_id);
        const form = await client.getForm(form_id);
        const report = CF7DeliveryDiagnostics.diagnose(form, baseUrl);
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(report, null, 2)
                }
            ]
        };
    });
    /**
     * ==========================================
     * 5. Snapshots & Change Diffing (Phase 3.6 & 3.7)
     * ==========================================
     */
    server.tool('cf7_diff_snapshots', 'Compare current live form state against a saved backup snapshot, or between two snapshots.', {
        form_id: z.number().describe('Form ID'),
        snapshot_id: z.string().describe('Snapshot ID to compare against'),
        site_id: z.string().optional().describe('Optional site ID')
    }, async ({ form_id, snapshot_id, site_id }) => {
        const { client } = getActiveClient(site_id);
        const current = await client.getForm(form_id);
        const snapshot = backupManager.getSnapshot(snapshot_id);
        if (!snapshot) {
            throw new Error(`Snapshot "${snapshot_id}" was not found in local backups.`);
        }
        const diff = CF7DiffEngine.compare(snapshot.data, current, `Snapshot (${snapshot.timestamp})`, 'Live Form');
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(diff, null, 2)
                }
            ]
        };
    });
    server.tool('cf7_list_backups', 'List all stored local snapshots/backups of Contact Form 7 forms.', {
        form_id: z.number().optional().describe('Filter backups by specific form ID')
    }, async ({ form_id }) => {
        const snapshots = backupManager.listSnapshots(form_id);
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({ total: snapshots.length, snapshots }, null, 2)
                }
            ]
        };
    });
    server.tool('cf7_restore_form', 'Restore a form to a previous state using a snapshot ID.', {
        snapshot_id: z.string().describe('The snapshot ID to restore'),
        site_id: z.string().optional().describe('Optional site ID')
    }, async ({ snapshot_id, site_id }) => {
        const { client } = getActiveClient(site_id);
        const snapshot = backupManager.getSnapshot(snapshot_id);
        if (!snapshot) {
            throw new Error(`Snapshot with ID "${snapshot_id}" not found.`);
        }
        const current = await client.getForm(snapshot.formId);
        backupManager.createSnapshot(current, `Pre-restore safety backup (Restoring to ${snapshot_id})`);
        const restored = await client.updateForm(snapshot.formId, {
            title: snapshot.data.title,
            form: snapshot.data.form,
            mail: snapshot.data.mail,
            mail_2: snapshot.data.mail_2,
            messages: snapshot.data.messages,
            additional_settings: snapshot.data.additional_settings
        });
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        success: true,
                        message: `Form ID ${snapshot.formId} successfully restored to snapshot "${snapshot_id}".`,
                        form: restored
                    }, null, 2)
                }
            ]
        };
    });
    /**
     * ==========================================
     * 6. Ecosystem Integrations & Webhooks (Phase 4.1 - 4.7)
     * ==========================================
     */
    server.tool('cf7_list_integrations', 'List all configured CRM, Webhook, Google Sheets, or Custom API integrations for a form.', {
        form_id: z.number().optional().describe('Optional Form ID filter')
    }, async ({ form_id }) => {
        const integrations = integrationManager.listIntegrations(form_id);
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({ total: integrations.length, integrations }, null, 2)
                }
            ]
        };
    });
    server.tool('cf7_configure_integration', 'Configure a Webhook, CRM, or Google Sheets integration mapping for a Contact Form 7 form.', {
        form_id: z.number().describe('The CF7 Form ID'),
        name: z.string().describe('Integration Name (e.g. "HubSpot Lead Sync", "Zapier Webhook")'),
        type: z.enum(['webhook', 'crm', 'sheets', 'email', 'custom']).describe('Integration connector type'),
        provider: z.string().optional().describe('Provider name (e.g. HubSpot, Salesforce, Zapier)'),
        endpoint_url: z.string().describe('Target REST/Webhook API URL'),
        http_method: z.enum(['POST', 'PUT', 'PATCH']).optional().default('POST'),
        auth_type: z.enum(['none', 'bearer', 'basic', 'apiKey', 'customHeader']).optional().default('none'),
        auth_token: z.string().optional().describe('Bearer token or API key'),
        field_mappings: z.array(z.object({
            cf7Field: z.string().describe('Source CF7 form field (e.g. [your-name])'),
            targetField: z.string().describe('Target external JSON key (e.g. customer.name)'),
            required: z.boolean().optional(),
            defaultValue: z.string().optional(),
            transform: z.enum(['trim', 'lowercase', 'uppercase', 'phone_digits', 'iso_date']).optional()
        })).describe('Field mapping pairs'),
        id: z.string().optional()
    }, async (params) => {
        const saved = integrationManager.saveIntegration({
            id: params.id,
            formId: params.form_id,
            name: params.name,
            type: params.type,
            provider: params.provider,
            endpointUrl: params.endpoint_url,
            httpMethod: params.http_method || 'POST',
            auth: {
                type: params.auth_type || 'none',
                token: params.auth_token,
                apiKey: params.auth_token
            },
            fieldMappings: params.field_mappings,
            active: true
        });
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        success: true,
                        message: `Integration "${saved.name}" saved with ID ${saved.id}.`,
                        integration: saved
                    }, null, 2)
                }
            ]
        };
    });
    server.tool('cf7_test_integration', 'Test an integration mapping against a form schema with pre-flight schema checks and optional live request testing.', {
        integration_id: z.string().describe('The integration ID to test'),
        send_live_request: z.boolean().optional().default(false).describe('Send live HTTP test request to endpoint'),
        site_id: z.string().optional().describe('Optional site ID')
    }, async ({ integration_id, send_live_request, site_id }) => {
        const integration = integrationManager.getIntegration(integration_id);
        if (!integration) {
            throw new Error(`Integration "${integration_id}" not found.`);
        }
        let formItem;
        try {
            const { client } = getActiveClient(site_id);
            formItem = await client.getForm(integration.formId);
        }
        catch {
            // Form inspection optional if offline
        }
        const testResult = await IntegrationTester.testIntegration(integration, formItem, send_live_request);
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(testResult, null, 2)
                }
            ]
        };
    });
    server.tool('cf7_generate_integration_code', 'Generate safe, non-blocking WordPress PHP code (wpcf7_mail_sent hook) for an integration.', {
        integration_id: z.string().describe('The integration ID to generate code for')
    }, async ({ integration_id }) => {
        const integration = integrationManager.getIntegration(integration_id);
        if (!integration) {
            throw new Error(`Integration "${integration_id}" not found.`);
        }
        const phpCode = IntegrationPhpGenerator.generateHookCode(integration);
        return {
            content: [
                {
                    type: 'text',
                    text: phpCode
                }
            ]
        };
    });
    /**
     * ==========================================
     * 7. Reusable Agency Form Templates (Phase 4.9)
     * ==========================================
     */
    server.tool('cf7_list_templates', 'List all battle-tested agency form templates (Contact Us, Job Application, Quote Request, Support Ticket).', {}, async () => {
        const templates = TemplateManager.listTemplates().map(t => ({
            id: t.id,
            name: t.name,
            category: t.category,
            description: t.description
        }));
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({ total: templates.length, templates }, null, 2)
                }
            ]
        };
    });
    server.tool('cf7_apply_template', 'Instantiate and create a form on the WordPress site from a standard agency template.', {
        template_id: z.string().describe('Template ID (e.g. contact-us, job-application, quote-request, support-ticket)'),
        custom_title: z.string().optional().describe('Custom title override'),
        site_id: z.string().optional().describe('Optional site ID')
    }, async ({ template_id, custom_title, site_id }) => {
        const template = TemplateManager.getTemplate(template_id);
        if (!template) {
            throw new Error(`Template "${template_id}" not found.`);
        }
        const { client } = getActiveClient(site_id);
        const created = await client.createForm({
            title: custom_title || template.data.title,
            form: template.data.form || '',
            mail: template.data.mail,
            mail_2: template.data.mail_2,
            messages: template.data.messages,
            additional_settings: template.data.additional_settings
        });
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        success: true,
                        message: `Form created from template "${template.name}" with ID ${created.id}.`,
                        form: created
                    }, null, 2)
                }
            ]
        };
    });
    /**
     * ==========================================
     * 8. Form Modification (Create & Update)
     * ==========================================
     */
    server.tool('cf7_create_form', 'Create a new Contact Form 7 form on the WordPress site.', {
        title: z.string().describe('Title of the contact form'),
        form: z.string().describe('Form HTML and CF7 shortcode tags'),
        mail: z.object({
            active: z.boolean().optional(),
            subject: z.string().optional(),
            sender: z.string().optional(),
            recipient: z.string().optional(),
            additional_headers: z.string().optional(),
            body: z.string().optional(),
            attachments: z.string().optional(),
            use_html: z.boolean().optional()
        }).optional().describe('Mail configuration'),
        mail_2: z.object({
            active: z.boolean().optional(),
            subject: z.string().optional(),
            sender: z.string().optional(),
            recipient: z.string().optional(),
            additional_headers: z.string().optional(),
            body: z.string().optional(),
            attachments: z.string().optional(),
            use_html: z.boolean().optional()
        }).optional().describe('Mail (2) autoresponder configuration'),
        additional_settings: z.string().optional().describe('CF7 additional settings'),
        site_id: z.string().optional().describe('Optional site ID')
    }, async (params) => {
        const { client } = getActiveClient(params.site_id);
        const created = await client.createForm(params);
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        success: true,
                        message: `Form created successfully with ID ${created.id}`,
                        form: created
                    }, null, 2)
                }
            ]
        };
    });
    server.tool('cf7_update_form', 'Update an existing Contact Form 7 form with automatic pre-modification backup.', {
        form_id: z.number().describe('The ID of the form to update'),
        title: z.string().optional(),
        form: z.string().optional(),
        mail: z.object({
            active: z.boolean().optional(),
            subject: z.string().optional(),
            sender: z.string().optional(),
            recipient: z.string().optional(),
            additional_headers: z.string().optional(),
            body: z.string().optional(),
            attachments: z.string().optional(),
            use_html: z.boolean().optional()
        }).optional(),
        mail_2: z.object({
            active: z.boolean().optional(),
            subject: z.string().optional(),
            sender: z.string().optional(),
            recipient: z.string().optional(),
            additional_headers: z.string().optional(),
            body: z.string().optional(),
            attachments: z.string().optional(),
            use_html: z.boolean().optional()
        }).optional(),
        additional_settings: z.string().optional(),
        backup_note: z.string().optional().describe('Optional note for the pre-modification backup'),
        site_id: z.string().optional().describe('Optional site ID')
    }, async (params) => {
        const { form_id, backup_note, site_id, ...updateData } = params;
        const { client } = getActiveClient(site_id);
        // 1. Snapshot
        const current = await client.getForm(form_id);
        const snapshot = backupManager.createSnapshot(current, backup_note || 'Automated pre-update backup');
        // 2. Update
        const updated = await client.updateForm(form_id, updateData);
        // 3. Audit
        const audit = CF7Analyzer.audit(updated);
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        success: true,
                        message: `Form ID ${form_id} updated successfully.`,
                        snapshot_id: snapshot.id,
                        audit_summary: {
                            health_score: audit.healthScore,
                            issues_count: audit.issues.length
                        },
                        form: updated
                    }, null, 2)
                }
            ]
        };
    });
}
