/**
 * CF7 Integration Tester and Pre-Flight Validation Engine
 */

import { IntegrationConfig, IntegrationTestResult } from './types.js';
import { CF7FormItem } from '../wordpress/types.js';
import { CF7TagParser } from '../audit/tag-parser.js';

export class IntegrationTester {
  public static async testIntegration(
    integration: IntegrationConfig,
    form?: CF7FormItem,
    sendLiveRequest = false
  ): Promise<IntegrationTestResult> {
    const diagnosticNotes: string[] = [];
    const mappingIssues: IntegrationTestResult['checks']['mappingIssues'] = [];
    const samplePayload: Record<string, any> = {};

    // 1. Analyze Field Mappings against Form structure
    if (form && form.form) {
      const parsedTags = CF7TagParser.parseFormTags(form.form);
      const formTagMap = new Map(parsedTags.filter(t => t.name).map(t => [t.name, t]));

      for (const mapping of integration.fieldMappings) {
        const cleanField = mapping.cf7Field.replace(/[\[\]]/g, '');
        const tag = formTagMap.get(cleanField);

        if (!tag) {
          mappingIssues.push({
            cf7Field: mapping.cf7Field,
            targetField: mapping.targetField,
            issue: `CF7 form field "${mapping.cf7Field}" does not exist in Form ID ${form.id}.`,
            severity: 'critical'
          });
        } else if (mapping.required && !tag.isRequired) {
          mappingIssues.push({
            cf7Field: mapping.cf7Field,
            targetField: mapping.targetField,
            issue: `Target field "${mapping.targetField}" is required by the integration, but CF7 field "${mapping.cf7Field}" is optional. Empty submissions may trigger API errors.`,
            severity: 'warning'
          });
        }

        // Generate sample mock value for preview
        samplePayload[mapping.targetField] = this.getSampleValue(cleanField, tag?.baseType);
      }
    } else {
      // Form not provided, generate generic sample payload
      for (const mapping of integration.fieldMappings) {
        samplePayload[mapping.targetField] = `sample_${mapping.targetField}`;
      }
    }

    // 2. Auth Configuration Check
    const authConfigured = integration.auth.type === 'none' ||
      !!(integration.auth.token || integration.auth.apiKey || (integration.auth.username && integration.auth.password));

    if (!authConfigured) {
      diagnosticNotes.push('Warning: Authentication type is configured as "' + integration.auth.type + '" but credentials appear empty.');
    }

    let endpointReachable = false;
    let httpStatus: number | undefined;
    let responseTimeMs: number | undefined;
    let responsePreview: string | undefined;

    // 3. Live Request Test (if enabled)
    if (sendLiveRequest && integration.endpointUrl.startsWith('http')) {
      const startTime = Date.now();
      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(integration.headers || {})
        };

        if (integration.auth.type === 'bearer' && integration.auth.token) {
          headers['Authorization'] = `Bearer ${integration.auth.token}`;
        } else if (integration.auth.type === 'apiKey' && integration.auth.apiKey) {
          const headerName = integration.auth.headerName || 'X-API-Key';
          headers[headerName] = integration.auth.apiKey;
        }

        const res = await fetch(integration.endpointUrl, {
          method: integration.httpMethod || 'POST',
          headers,
          body: JSON.stringify(samplePayload)
        });

        responseTimeMs = Date.now() - startTime;
        httpStatus = res.status;
        endpointReachable = true;

        const body = await res.text();
        responsePreview = body.length > 300 ? body.slice(0, 300) + '...' : body;

        if (res.ok) {
          diagnosticNotes.push(`PASS: Integration endpoint responded with HTTP ${res.status} in ${responseTimeMs}ms.`);
        } else {
          diagnosticNotes.push(`WARNING: Endpoint returned HTTP ${res.status} ${res.statusText}. Inspect sample payload and credentials.`);
        }
      } catch (err: any) {
        responseTimeMs = Date.now() - startTime;
        endpointReachable = false;
        diagnosticNotes.push(`FAIL: Network connection error to ${integration.endpointUrl}: ${err?.message || String(err)}`);
      }
    } else {
      diagnosticNotes.push('Pre-flight schema validation complete. Live network transmission was skipped (set send_live_request: true to test real transmission).');
    }

    const hasCritical = mappingIssues.some(m => m.severity === 'critical');
    const hasWarnings = mappingIssues.some(m => m.severity === 'warning') || !authConfigured;

    return {
      integrationId: integration.id,
      provider: integration.provider || integration.type,
      endpointUrl: integration.endpointUrl,
      overallStatus: hasCritical ? 'failed' : hasWarnings ? 'warning' : 'passed',
      checks: {
        authConfigured,
        endpointReachable,
        httpStatus,
        responseTimeMs,
        mappingIssues
      },
      samplePayload,
      responsePreview,
      diagnosticNotes
    };
  }

  private static getSampleValue(fieldName: string, baseType?: string): string {
    if (fieldName.includes('email')) return 'john.doe@example.com';
    if (fieldName.includes('phone') || fieldName.includes('tel')) return '+1-555-019-2834';
    if (fieldName.includes('name')) return 'Jane Doe';
    if (baseType === 'number') return '42';
    if (baseType === 'date') return '2026-10-15';
    return `Sample ${fieldName}`;
  }
}
