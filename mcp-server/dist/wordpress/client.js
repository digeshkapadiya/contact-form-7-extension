/**
 * Resilient WordPress REST API Client for Contact Form 7
 */
export class WordPressClient {
    baseUrl;
    authHeader;
    timeoutMs;
    constructor(config) {
        const rawUrl = config?.baseUrl || process.env.WORDPRESS_URL || 'http://localhost';
        this.baseUrl = rawUrl.replace(/\/+$/, '');
        this.timeoutMs = config?.timeoutMs || 15000;
        const username = config?.username || process.env.WORDPRESS_USERNAME;
        const appPassword = config?.applicationPassword || process.env.WORDPRESS_APP_PASSWORD;
        if (config?.authHeader) {
            this.authHeader = config.authHeader;
        }
        else if (username && appPassword) {
            // Basic auth with Application Password
            const token = Buffer.from(`${username}:${appPassword}`).toString('base64');
            this.authHeader = `Basic ${token}`;
        }
    }
    async fetchWithTimeout(url, options = {}) {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), this.timeoutMs);
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...(options.headers || {})
        };
        if (this.authHeader) {
            headers['Authorization'] = this.authHeader;
        }
        try {
            const response = await fetch(url, {
                ...options,
                headers,
                signal: controller.signal
            });
            return response;
        }
        finally {
            clearTimeout(id);
        }
    }
    /**
     * 1. Test WordPress Connection and detect installed CF7 namespaces
     */
    async checkConnection() {
        try {
            const wpJsonUrl = `${this.baseUrl}/wp-json/`;
            const res = await this.fetchWithTimeout(wpJsonUrl);
            if (!res.ok) {
                return {
                    connected: false,
                    hasCf7: false,
                    error: `HTTP ${res.status} ${res.statusText}: Failed to access ${wpJsonUrl}`
                };
            }
            const coreInfo = (await res.json());
            const namespaces = coreInfo.namespaces || [];
            const cf7Namespace = namespaces.find(ns => ns.startsWith('contact-form-7/'));
            return {
                connected: true,
                siteName: coreInfo.name,
                wpVersion: coreInfo.version || undefined,
                hasCf7: !!cf7Namespace,
                cf7Namespace: cf7Namespace || undefined
            };
        }
        catch (err) {
            return {
                connected: false,
                hasCf7: false,
                error: `Connection error: ${err?.message || String(err)}`
            };
        }
    }
    /**
     * 2. List all Contact Form 7 forms
     */
    async listForms() {
        const endpoint = `${this.baseUrl}/wp-json/contact-form-7/v1/contact-forms`;
        const res = await this.fetchWithTimeout(endpoint);
        if (!res.ok) {
            const body = await res.text();
            throw new Error(`Failed to list CF7 forms (HTTP ${res.status}): ${body}`);
        }
        const data = await res.json();
        return Array.isArray(data) ? data : [];
    }
    /**
     * 3. Get single form by ID
     */
    async getForm(formId) {
        const endpoint = `${this.baseUrl}/wp-json/contact-form-7/v1/contact-forms/${formId}`;
        const res = await this.fetchWithTimeout(endpoint);
        if (!res.ok) {
            const body = await res.text();
            throw new Error(`Failed to retrieve form ID ${formId} (HTTP ${res.status}): ${body}`);
        }
        return await res.json();
    }
    /**
     * 4. Create new Contact Form 7 form
     */
    async createForm(params) {
        const endpoint = `${this.baseUrl}/wp-json/contact-form-7/v1/contact-forms`;
        const res = await this.fetchWithTimeout(endpoint, {
            method: 'POST',
            body: JSON.stringify(params)
        });
        if (!res.ok) {
            const body = await res.text();
            throw new Error(`Failed to create CF7 form (HTTP ${res.status}): ${body}`);
        }
        return await res.json();
    }
    /**
     * 5. Update existing Contact Form 7 form
     */
    async updateForm(formId, params) {
        const endpoint = `${this.baseUrl}/wp-json/contact-form-7/v1/contact-forms/${formId}`;
        const res = await this.fetchWithTimeout(endpoint, {
            method: 'POST', // CF7 REST API accepts POST for updates
            body: JSON.stringify(params)
        });
        if (!res.ok) {
            const body = await res.text();
            throw new Error(`Failed to update CF7 form ID ${formId} (HTTP ${res.status}): ${body}`);
        }
        return await res.json();
    }
}
