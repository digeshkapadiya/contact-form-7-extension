#!/usr/bin/env node

/**
 * CF7 CLI & CI/CD Linter
 * Scans markdown form snippets, PHP templates, or live REST endpoints for CF7 tag and deliverability issues.
 */

import * as fs from 'fs';
import * as path from 'path';
import { CF7Analyzer } from '../audit/analyzer.js';
import { CF7TagParser } from '../audit/tag-parser.js';

function extractHtmlFromMarkdown(content: string): string {
  // If the file contains ```html ... ``` code block, extract it
  const match = content.match(/```html\s*([\s\S]*?)\s*```/);
  return match ? match[1] : content;
}

function extractMailConfigFromMarkdown(content: string) {
  const mail: {
    active: boolean;
    sender?: string;
    recipient?: string;
    subject?: string;
    additional_headers?: string;
    body?: string;
    attachments?: string;
  } = {
    active: true,
    sender: '[_site_title] <no-reply@yourdomain.com>',
    recipient: '[_site_admin_email]'
  };

  const senderMatch = content.match(/\*\*From\*\*:\s*`?([^\n`]+)`?/i);
  if (senderMatch) mail.sender = senderMatch[1].trim();

  const recipientMatch = content.match(/\*\*To\*\*:\s*`?([^\n`]+)`?/i);
  if (recipientMatch) mail.recipient = recipientMatch[1].trim();

  const subjectMatch = content.match(/\*\*Subject\*\*:\s*`?([^\n`]+)`?/i);
  if (subjectMatch) mail.subject = subjectMatch[1].trim();

  const headersMatch = content.match(/\*\*Additional Headers\*\*:\s*`?([^\n`]+)`?/i);
  if (headersMatch) mail.additional_headers = headersMatch[1].trim();

  const attachmentsMatch = content.match(/\*\*File Attachments\*\*:\s*`?([^\n`]+)`?/i);
  if (attachmentsMatch) mail.attachments = attachmentsMatch[1].trim();

  const bodyMatch = content.match(/```text\s*([\s\S]*?)\s*```/);
  if (bodyMatch) {
    mail.body = bodyMatch[1].trim();
  }

  return mail;
}

async function runCliLint() {
  console.log('🔍 Running Contact Form 7 CI/CD Audit...\n');

  let totalErrors = 0;
  let totalWarnings = 0;
  let scannedCount = 0;

  let examplesDir = path.join(process.cwd(), 'examples/forms');
  if (!fs.existsSync(examplesDir)) {
    examplesDir = path.join(process.cwd(), '../examples/forms');
  }

  if (fs.existsSync(examplesDir)) {
    const files = fs.readdirSync(examplesDir).filter(f => f.endsWith('.md'));

    for (const file of files) {
      scannedCount++;
      const rawContent = fs.readFileSync(path.join(examplesDir, file), 'utf-8');
      const formMarkup = extractHtmlFromMarkdown(rawContent);
      const mailConfig = extractMailConfigFromMarkdown(rawContent);

      const formTags = CF7TagParser.parseFormTags(formMarkup);

      console.log(`📄 Form: ${file} (${formTags.length} CF7 form tags parsed)`);

      const formItem = {
        id: scannedCount,
        title: file.replace('.md', ''),
        form: formMarkup,
        mail: mailConfig
      };

      const audit = CF7Analyzer.audit(formItem);
      for (const issue of audit.issues) {
        if (issue.severity === 'critical') {
          totalErrors++;
          console.error(`  ❌ [CRITICAL] ${issue.message}`);
        } else {
          totalWarnings++;
          console.warn(`  ⚠️  [WARNING] ${issue.message}`);
        }
      }

      if (audit.issues.length === 0) {
        console.log('  ✅ Clean: 100/100 Health Score\n');
      } else {
        console.log(`  Health Score: ${audit.healthScore}/100\n`);
      }
    }
  }

  console.log(`========================================`);
  console.log(`Audit Complete: Scanned ${scannedCount} forms.`);
  console.log(`Errors: ${totalErrors} | Warnings: ${totalWarnings}`);
  console.log(`========================================\n`);

  if (totalErrors > 0) {
    process.exit(1);
  }
}

runCliLint().catch(err => {
  console.error('Lint failure:', err);
  process.exit(1);
});
