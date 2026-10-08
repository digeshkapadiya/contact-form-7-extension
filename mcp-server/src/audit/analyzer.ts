/**
 * Comprehensive Contact Form 7 Form Auditor and Diagnostics Engine
 */

import { CF7FormItem, AuditReport, AuditIssue } from '../wordpress/types.js';
import { CF7TagParser } from './tag-parser.js';

export class CF7Analyzer {
  private static SPECIAL_MAIL_TAGS = new Set([
    '_remote_ip',
    '_user_agent',
    '_url',
    '_date',
    '_time',
    '_post_id',
    '_post_title',
    '_post_url',
    '_post_author',
    '_post_author_email',
    '_site_title',
    '_site_description',
    '_site_url',
    '_site_admin_email',
    '_serial_number',
    '_format'
  ]);

  public static audit(form: CF7FormItem, siteUrl?: string): AuditReport {
    const issues: AuditIssue[] = [];
    let score = 100;

    const formMarkup = form.form || '';
    const formTags = CF7TagParser.parseFormTags(formMarkup);
    const formFieldNames = new Set(formTags.filter(t => t.name).map(t => t.name));

    // Combine all text where mail tags can be used
    const mail = form.mail || {};
    const allMailText = [
      mail.subject || '',
      mail.sender || '',
      mail.recipient || '',
      mail.additional_headers || '',
      mail.body || '',
      mail.attachments || ''
    ].join('\n');

    const usedMailTags = CF7TagParser.extractMailTags(allMailText);

    // 1. Tag Mismatch: Mail tag does not exist in form
    for (const tag of usedMailTags) {
      // Check for raw prefix from pipes e.g. _raw_department
      const cleanTag = tag.startsWith('_raw_') ? tag.replace('_raw_', '') : tag;

      if (!this.SPECIAL_MAIL_TAGS.has(cleanTag) && !formFieldNames.has(cleanTag)) {
        score -= 15;
        issues.push({
          severity: 'critical',
          category: 'tag-mismatch',
          field: tag,
          message: `Mail tag [${tag}] is used in Mail settings, but no matching [${cleanTag}] field exists in the form.`,
          suggestion: `Add [text ${cleanTag}] to the form or remove [${tag}] from Mail tab.`
        });
      }
    }

    // 2. Tag Mismatch: Form input field not included in Mail body/settings
    for (const ft of formTags) {
      if (ft.name && !['submit', 'acceptance'].includes(ft.baseType)) {
        if (!usedMailTags.includes(ft.name)) {
          // Warning for unused form fields
          score -= 5;
          issues.push({
            severity: 'warning',
            category: 'tag-mismatch',
            field: ft.name,
            message: `Form field [${ft.name}] is collected from the user but not used in the Mail settings.`,
            suggestion: `Add [${ft.name}] into the Mail Message Body or remove the redundant field.`
          });
        }
      }
    }

    // 3. Deliverability: Sender ('From') header checks
    const sender = mail.sender || '';
    if (!sender) {
      score -= 20;
      issues.push({
        severity: 'critical',
        category: 'deliverability',
        field: 'sender',
        message: 'Mail From header is empty.',
        suggestion: 'Set From to "[_site_title] <no-reply@yourdomain.com>".'
      });
    } else {
      // Detect if user email tag is used in From (causing DMARC/SPF failure)
      for (const ft of formTags) {
        if (['email', 'email*'].includes(ft.type) && ft.name && sender.includes(`[${ft.name}]`)) {
          score -= 25;
          issues.push({
            severity: 'critical',
            category: 'deliverability',
            field: 'sender',
            message: `The From field uses the submitter's email [${ft.name}]. This will fail SPF/DMARC checks and be marked as spam.`,
            suggestion: `Change From to a site domain address (e.g. "no-reply@yourdomain.com") and put "Reply-To: [${ft.name}]" in Additional Headers.`
          });
        }
      }
    }

    // 4. Deliverability: Missing Reply-To header
    const headers = mail.additional_headers || '';
    const hasReplyTo = /reply-to:/i.test(headers);
    const emailFields = formTags.filter(t => ['email', 'email*'].includes(t.type));
    if (emailFields.length > 0 && !hasReplyTo) {
      score -= 10;
      issues.push({
        severity: 'warning',
        category: 'deliverability',
        field: 'additional_headers',
        message: 'No Reply-To header configured in Additional Headers.',
        suggestion: `Add "Reply-To: [${emailFields[0].name}]" to Additional Headers so you can reply to the submitter directly.`
      });
    }

    // 5. File Uploads Check
    const fileTags = formTags.filter(t => ['file', 'file*'].includes(t.type));
    const attachments = mail.attachments || '';
    for (const fTag of fileTags) {
      if (!attachments.includes(`[${fTag.name}]`)) {
        score -= 20;
        issues.push({
          severity: 'critical',
          category: 'validation',
          field: fTag.name,
          message: `File upload field [${fTag.name}] is defined in form, but missing from File Attachments in Mail settings.`,
          suggestion: `Add [${fTag.name}] to the "File Attachments" textarea in the Mail tab.`
        });
      }

      if (!fTag.fileTypes || fTag.fileTypes.length === 0) {
        score -= 10;
        issues.push({
          severity: 'warning',
          category: 'security',
          field: fTag.name,
          message: `File field [${fTag.name}] does not restrict file types.`,
          suggestion: `Add filetypes option e.g. [file* ${fTag.name} filetypes:pdf|docx|png|jpg limit:5mb].`
        });
      }
    }

    // 6. Spam Protection Checks
    const hasAkismet = formTags.some(t => t.isAkismet);
    const hasHoneypot = formMarkup.includes('website-verify') || formMarkup.includes('cf7-hp') || formMarkup.includes('honeypot');

    if (!hasAkismet && !hasHoneypot) {
      score -= 10;
      issues.push({
        severity: 'warning',
        category: 'security',
        message: 'No client-side spam protection detected (Akismet tags or Honeypot field).',
        suggestion: 'Add Akismet tags (e.g. akismet:author_email) or a hidden honeypot field.'
      });
    }

    // 7. Form Structure: Missing Submit Button
    const hasSubmit = formTags.some(t => t.baseType === 'submit') || formMarkup.includes('[submit');
    if (!hasSubmit) {
      score -= 30;
      issues.push({
        severity: 'critical',
        category: 'accessibility',
        message: 'Form has no submit button tag [submit]. Users will not be able to submit the form.',
        suggestion: 'Add [submit "Submit"] at the end of the form.'
      });
    }

    const healthScore = Math.max(0, Math.min(100, score));

    return {
      formId: form.id,
      formTitle: form.title || 'Untitled Form',
      healthScore,
      totalTags: formTags.length,
      issues,
      stats: {
        formTagsCount: formTags.length,
        mailTagsUsedCount: usedMailTags.length,
        hasHoneypot,
        hasAkismet,
        hasFileUpload: fileTags.length > 0,
        hasMail2: !!(form.mail_2 && form.mail_2.active)
      }
    };
  }
}
