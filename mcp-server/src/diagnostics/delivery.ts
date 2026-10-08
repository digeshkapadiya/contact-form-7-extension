/**
 * Layered Email Delivery Diagnostic Engine
 */

import { CF7FormItem } from '../wordpress/types.js';
import { CF7Analyzer } from '../audit/analyzer.js';

export interface DeliveryDiagnosticLayer {
  layerName: string;
  status: 'healthy' | 'warning' | 'critical' | 'investigate';
  summary: string;
  details: string[];
  recommendations: string[];
}

export interface DeliveryDiagnosticReport {
  formId: number;
  formTitle: string;
  overallDeliveryRisk: 'low' | 'moderate' | 'high' | 'critical';
  layers: DeliveryDiagnosticLayer[];
  nextAction: string;
}

export class CF7DeliveryDiagnostics {
  public static diagnose(form: CF7FormItem, siteUrl?: string): DeliveryDiagnosticReport {
    const audit = CF7Analyzer.audit(form, siteUrl);
    const mail = form.mail || {};
    const layers: DeliveryDiagnosticLayer[] = [];

    // Layer 1: Form & Tag Integrity
    const tagIssues = audit.issues.filter(i => i.category === 'tag-mismatch');
    layers.push({
      layerName: '1. CF7 Form & Tag Configuration',
      status: tagIssues.some(i => i.severity === 'critical') ? 'critical' : tagIssues.length > 0 ? 'warning' : 'healthy',
      summary: tagIssues.length === 0
        ? 'Form tags and mail tags are properly synchronized.'
        : `Detected ${tagIssues.length} tag synchronization issues.`,
      details: tagIssues.map(i => i.message),
      recommendations: tagIssues.map(i => i.suggestion)
    });

    // Layer 2: Mail Headers & DMARC/SPF Deliverability
    const sender = mail.sender || '';
    const deliverabilityIssues = audit.issues.filter(i => i.category === 'deliverability');
    const hasSenderMismatch = deliverabilityIssues.some(i => i.field === 'sender');
    const hasReplyTo = /reply-to:/i.test(mail.additional_headers || '');

    layers.push({
      layerName: '2. Mail Headers & DMARC/SPF Alignment',
      status: hasSenderMismatch ? 'critical' : !hasReplyTo ? 'warning' : 'healthy',
      summary: hasSenderMismatch
        ? 'CRITICAL DMARC/SPF RISK: Sender "From" field uses submitter email instead of domain address.'
        : !hasReplyTo
          ? 'Reply-To header is missing in Additional Headers.'
          : 'Headers conform to standard email deliverability practices.',
      details: [
        `Sender (From): ${sender || 'EMPTY'}`,
        `Recipient (To): ${mail.recipient || 'EMPTY'}`,
        `Additional Headers: ${mail.additional_headers || 'None'}`
      ],
      recommendations: deliverabilityIssues.map(i => i.suggestion)
    });

    // Layer 3: WordPress Core wp_mail()
    layers.push({
      layerName: '3. WordPress Core wp_mail() & PHP mail()',
      status: 'investigate',
      summary: 'WordPress core uses PHP mail() by default, which lacks DKIM signatures and is often blocked by Gmail/Outlook.',
      details: [
        'Default PHP sendmail has no authenticated handshake.',
        'Shared hosting servers often suffer from dirty IP reputations.'
      ],
      recommendations: [
        'Do not rely on standard unauthenticated PHP mail().',
        'Check if an SMTP plugin (FluentSMTP, WP Mail SMTP, Post SMTP) is active on the WordPress site.'
      ]
    });

    // Layer 4: SMTP / Transactional Mail Provider
    layers.push({
      layerName: '4. SMTP / Transactional Mail Provider',
      status: 'investigate',
      summary: 'Authenticated transactional SMTP routes email reliably through dedicated mail servers.',
      details: [
        'Recommended providers: Postmark, SendGrid, Amazon SES, Mailgun, Brevo, Google Workspace.',
        'Verify that DNS records (SPF: v=spf1 include:... ~all, DKIM, and DMARC: v=DMARC1; p=quarantine;) are configured on the sender domain.'
      ],
      recommendations: [
        'Send a test email from the SMTP plugin dashboard to verify SMTP handshake.',
        'Check bounce logs and delivery webhooks in your email provider dashboard.'
      ]
    });

    // Layer 5: Receiving Mail Server & Spam Filtering
    layers.push({
      layerName: '5. Recipient Mail Server & Spam Filters',
      status: 'investigate',
      summary: 'Recipient mail servers (Google Workspace, Microsoft 365) evaluate content and IP reputation.',
      details: [
        'Check Junk / Spam / Quarantine folder.',
        'Ensure the subject line does not contain spam trigger keywords.',
        'Avoid sending blank test submissions.'
      ],
      recommendations: [
        'Test delivery with mail-tester.com to get a comprehensive spam score.'
      ]
    });

    // Compute overall risk
    let overallDeliveryRisk: DeliveryDiagnosticReport['overallDeliveryRisk'] = 'low';
    let nextAction = 'Run a test submission to verify end-to-end receipt.';

    if (hasSenderMismatch) {
      overallDeliveryRisk = 'critical';
      nextAction = 'Fix the From header in CF7 Mail tab immediately to prevent DMARC rejection.';
    } else if (tagIssues.length > 0 || !hasReplyTo) {
      overallDeliveryRisk = 'moderate';
      nextAction = 'Fix tag mismatches and add Reply-To header in Additional Headers.';
    }

    return {
      formId: form.id,
      formTitle: form.title,
      overallDeliveryRisk,
      layers,
      nextAction
    };
  }
}
