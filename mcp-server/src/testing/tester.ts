/**
 * Safe Contact Form 7 Synthetic Test Submission Engine
 */

import { WordPressClient } from '../wordpress/client.js';
import { CF7TagParser } from '../audit/tag-parser.js';

export interface TestSubmissionOptions {
  formId: number;
  mode?: 'valid' | 'invalid_email' | 'missing_required' | 'custom';
  customData?: Record<string, string>;
  confirmProduction?: boolean;
}

export interface TestResult {
  formId: number;
  targetEndpoint: string;
  isProduction: boolean;
  testMode: string;
  status: 'passed' | 'failed' | 'aborted';
  httpStatus: number;
  cf7Status?: string;
  cf7Message?: string;
  invalidFields?: Array<{ field: string; message: string }>;
  diagnosticNotes: string[];
}

export class CF7FormTester {
  public static async testForm(
    wpClient: WordPressClient,
    baseUrl: string,
    options: TestSubmissionOptions
  ): Promise<TestResult> {
    const isProd = !baseUrl.includes('localhost') && !baseUrl.includes('.local') && !baseUrl.includes('127.0.0.1') && !baseUrl.includes('staging') && !baseUrl.includes('dev');

    if (isProd && !options.confirmProduction) {
      return {
        formId: options.formId,
        targetEndpoint: `${baseUrl}/wp-json/contact-form-7/v1/contact-forms/${options.formId}/feedback`,
        isProduction: true,
        testMode: options.mode || 'valid',
        status: 'aborted',
        httpStatus: 0,
        diagnosticNotes: [
          'SAFETY LOCK: Target site appears to be a live production environment.',
          'To run a test submission against production, explicitly set "confirm_production: true" in tool arguments.'
        ]
      };
    }

    // 1. Fetch form configuration
    const form = await wpClient.getForm(options.formId);
    const tags = CF7TagParser.parseFormTags(form.form || '');

    // 2. Synthesize payload based on test mode
    const payload = new FormData();
    const notes: string[] = [];
    const mode = options.mode || 'valid';

    if (mode === 'custom' && options.customData) {
      for (const [k, v] of Object.entries(options.customData)) {
        payload.append(k, v);
      }
    } else {
      for (const tag of tags) {
        if (!tag.name || tag.baseType === 'submit') continue;

        if (mode === 'missing_required' && tag.isRequired) {
          // Intentionally omit required field
          continue;
        }

        switch (tag.baseType) {
          case 'text':
            payload.append(tag.name, 'Automated Test Name');
            break;
          case 'email':
            if (mode === 'invalid_email') {
              payload.append(tag.name, 'not-an-email-address');
            } else {
              payload.append(tag.name, 'test-cf7-assistant@example.com');
            }
            break;
          case 'tel':
            payload.append(tag.name, '+15550199283');
            break;
          case 'textarea':
            payload.append(tag.name, 'This is an automated diagnostic test from CF7 Developer Assistant.');
            break;
          case 'select':
          case 'radio':
            if (tag.values.length > 0) {
              const val = tag.values[0].includes('|') ? tag.values[0].split('|')[1].trim() : tag.values[0];
              payload.append(tag.name, val);
            }
            break;
          case 'checkbox':
            if (tag.values.length > 0) {
              payload.append(`${tag.name}[]`, tag.values[0]);
            }
            break;
          case 'acceptance':
            payload.append(tag.name, '1');
            break;
          case 'number':
            payload.append(tag.name, '1');
            break;
          case 'date':
            payload.append(tag.name, '2026-10-01');
            break;
          default:
            payload.append(tag.name, 'Test Value');
        }
      }
    }

    const endpoint = `${baseUrl}/wp-json/contact-form-7/v1/contact-forms/${options.formId}/feedback`;
    notes.push(`Sending synthetic ${mode} request to endpoint: ${endpoint}`);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        body: payload
      });

      const httpStatus = response.status;
      const json: any = await response.json().catch(() => ({}));

      const cf7Status = json.status || 'unknown';
      const cf7Message = json.message || '';
      const invalidFields: Array<{ field: string; message: string }> = [];

      if (json.invalid_fields && Array.isArray(json.invalid_fields)) {
        for (const item of json.invalid_fields) {
          invalidFields.push({
            field: item.field || item.into || 'unknown',
            message: item.message || ''
          });
        }
      }

      let testPassed = false;
      if (mode === 'valid') {
        testPassed = cf7Status === 'mail_sent';
        if (cf7Status === 'mail_sent') {
          notes.push('PASS: Form accepted input and processed submission successfully.');
        } else if (cf7Status === 'mail_failed') {
          notes.push('FAIL: Form validated inputs, but wp_mail() failed to dispatch the email. Investigate SMTP/hosting mail transport.');
        } else if (cf7Status === 'spam') {
          notes.push('FLAGGED: Submission flagged as SPAM by anti-spam filters.');
        } else if (cf7Status === 'validation_failed') {
          notes.push('FAIL: Form inputs failed validation.');
        }
      } else if (mode === 'invalid_email' || mode === 'missing_required') {
        testPassed = cf7Status === 'validation_failed' && invalidFields.length > 0;
        notes.push(testPassed
          ? `PASS: Validation correctly caught the invalid/missing input (${cf7Status}).`
          : `FAIL: Expected validation_failed but received status "${cf7Status}".`
        );
      }

      return {
        formId: options.formId,
        targetEndpoint: endpoint,
        isProduction: isProd,
        testMode: mode,
        status: testPassed ? 'passed' : 'failed',
        httpStatus,
        cf7Status,
        cf7Message,
        invalidFields: invalidFields.length > 0 ? invalidFields : undefined,
        diagnosticNotes: notes
      };
    } catch (err: any) {
      return {
        formId: options.formId,
        targetEndpoint: endpoint,
        isProduction: isProd,
        testMode: mode,
        status: 'failed',
        httpStatus: 0,
        diagnosticNotes: [
          `Network / HTTP Failure connecting to ${endpoint}: ${err?.message || String(err)}`
        ]
      };
    }
  }
}
