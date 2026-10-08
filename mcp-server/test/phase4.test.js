import test from 'node:test';
import assert from 'node:assert';
import { IntegrationManager } from '../dist/integrations/manager.js';
import { IntegrationTester } from '../dist/integrations/tester.js';
import { IntegrationPhpGenerator } from '../dist/integrations/php-generator.js';
import { TemplateManager } from '../dist/templates/manager.js';
import * as fs from 'fs';
import * as path from 'path';

test('IntegrationManager: manages CRM & Webhook mappings', () => {
  const testConfigFile = path.join(process.cwd(), '.test-integrations.json');
  const manager = new IntegrationManager(testConfigFile);

  const integration = manager.saveIntegration({
    formId: 101,
    name: 'HubSpot Sync',
    type: 'crm',
    provider: 'HubSpot',
    endpointUrl: 'https://api.hubapi.com/crm/v3/objects/contacts',
    httpMethod: 'POST',
    auth: { type: 'bearer', token: 'mock-token' },
    fieldMappings: [
      { cf7Field: '[your-name]', targetField: 'firstname', required: true },
      { cf7Field: '[your-email]', targetField: 'email', required: true }
    ],
    active: true
  });

  assert.ok(integration.id);
  assert.strictEqual(integration.provider, 'HubSpot');

  const list = manager.listIntegrations(101);
  assert.strictEqual(list.length, 1);

  // Cleanup
  fs.rmSync(testConfigFile, { force: true });
});

test('IntegrationTester: validates mapping against form schema', async () => {
  const form = {
    id: 101,
    title: 'Quote Form',
    form: '[text your-name][email* your-email][submit]'
  };

  const integration = {
    id: 'int_test',
    formId: 101,
    name: 'Lead Webhook',
    type: 'webhook',
    endpointUrl: 'https://webhook.site/test',
    httpMethod: 'POST',
    auth: { type: 'none' },
    fieldMappings: [
      { cf7Field: '[your-name]', targetField: 'name', required: true }, // your-name is optional in form -> warning
      { cf7Field: '[missing-field]', targetField: 'company', required: true } // doesn't exist -> critical
    ],
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const testResult = await IntegrationTester.testIntegration(integration, form, false);
  assert.strictEqual(testResult.overallStatus, 'failed');
  assert.strictEqual(testResult.checks.mappingIssues.length, 2);

  const critical = testResult.checks.mappingIssues.find(i => i.severity === 'critical');
  assert.ok(critical);
  assert.strictEqual(critical.cf7Field, '[missing-field]');
});

test('IntegrationPhpGenerator: creates valid WordPress relay code', () => {
  const integration = {
    id: 'int_zapier',
    formId: 44,
    name: 'Zapier Webhook',
    type: 'webhook',
    endpointUrl: 'https://hooks.zapier.com/hooks/catch/12345/abc',
    httpMethod: 'POST',
    auth: { type: 'apiKey', apiKey: 'secret-key-123' },
    fieldMappings: [
      { cf7Field: '[client-name]', targetField: 'client_name' },
      { cf7Field: '[client-email]', targetField: 'client_email' }
    ],
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const code = IntegrationPhpGenerator.generateHookCode(integration);
  assert.ok(code.includes('add_action( \'wpcf7_mail_sent\''));
  assert.ok(code.includes('wp_safe_remote_post'));
  assert.ok(code.includes('client_name'));
  assert.ok(code.includes('44'));
});

test('TemplateManager: provides pre-built templates', () => {
  const templates = TemplateManager.listTemplates();
  assert.ok(templates.length >= 4);

  const jobTemplate = TemplateManager.getTemplate('job-application');
  assert.ok(jobTemplate);
  assert.strictEqual(jobTemplate.category, 'Careers');
  assert.ok(jobTemplate.data.form.includes('applicant-resume'));
});
