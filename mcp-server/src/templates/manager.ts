/**
 * Standard Reusable CF7 Form Templates for Agencies and Teams
 */

import { CF7FormItem } from '../wordpress/types.js';

export interface FormTemplate {
  id: string;
  name: string;
  category: 'General' | 'Careers' | 'Sales' | 'Support' | 'Marketing';
  description: string;
  data: Omit<CF7FormItem, 'id'>;
}

export class TemplateManager {
  private static TEMPLATES: FormTemplate[] = [
    {
      id: 'contact-us',
      name: 'Standard Contact Form',
      category: 'General',
      description: 'Clean, accessible 2-column contact form with honeypot spam protection.',
      data: {
        title: 'Contact Us',
        form: `<div class="cf7-row">
  <div class="cf7-col-6">
    <label>Your Name <span class="required">*</span> [text* your-name placeholder "John Doe"]</label>
  </div>
  <div class="cf7-col-6">
    <label>Your Email <span class="required">*</span> [email* your-email akismet:author_email placeholder "john@example.com"]</label>
  </div>
</div>
<label>Subject <span class="required">*</span> [text* your-subject placeholder "Inquiry"]</label>
<label>Your Message <span class="required">*</span> [textarea* your-message placeholder "How can we help?"]</label>
<div style="position:absolute!important;left:-9999px!important;opacity:0;" aria-hidden="true">[text website-verify autocomplete="off"]</div>
[submit "Send Message"]`,
        mail: {
          active: true,
          subject: '[your-subject] - Contact Inquiry',
          sender: '[_site_title] <no-reply@yourdomain.com>',
          recipient: '[_site_admin_email]',
          additional_headers: 'Reply-To: [your-email]',
          body: `New message from [your-name] ([your-email]):\n\n[your-message]\n\n--\nSource: [_url]\nDate: [_date] [_time]`,
          use_html: false
        }
      }
    },
    {
      id: 'job-application',
      name: 'Job Application & Resume Upload',
      category: 'Careers',
      description: 'Career application form with resume file upload, position selector, and privacy acceptance.',
      data: {
        title: 'Job Application',
        form: `<div class="cf7-row">
  <div class="cf7-col-6">
    <label>Full Name <span class="required">*</span> [text* applicant-name placeholder "Jane Smith"]</label>
  </div>
  <div class="cf7-col-6">
    <label>Email Address <span class="required">*</span> [email* applicant-email placeholder "jane@example.com"]</label>
  </div>
</div>
<div class="cf7-row">
  <div class="cf7-col-6">
    <label>Phone Number <span class="required">*</span> [tel* applicant-phone placeholder "+1 (555) 000-0000"]</label>
  </div>
  <div class="cf7-col-6">
    <label>Position Applied For <span class="required">*</span> [select* applied-position include_blank "Frontend Developer" "Backend Developer" "UI/UX Designer"]</label>
  </div>
</div>
<label>Resume / CV (PDF or DOCX, max 5MB) <span class="required">*</span> [file* applicant-resume filetypes:pdf|docx limit:5mb]</label>
<label>Cover Letter / Portfolio Link [textarea applicant-cover-letter placeholder "Tell us about your experience..."]</label>
[acceptance gdpr-terms] I agree to the processing of my data for recruitment purposes.[/acceptance]
[submit "Submit Application"]`,
        mail: {
          active: true,
          subject: '[Job Application] [applied-position] - [applicant-name]',
          sender: '[_site_title] Careers <no-reply@yourdomain.com>',
          recipient: 'careers@yourdomain.com',
          additional_headers: 'Reply-To: [applicant-name] <[applicant-email]>',
          attachments: '[applicant-resume]',
          body: `Job Application Details:\n\nName: [applicant-name]\nEmail: [applicant-email]\nPhone: [applicant-phone]\nPosition: [applied-position]\n\nCover Letter:\n[applicant-cover-letter]\n\n--\nSubmitted from: [_url]`
        }
      }
    },
    {
      id: 'quote-request',
      name: 'Project Quote & Estimate',
      category: 'Sales',
      description: 'Project inquiry form with pipes department routing, budget range, and multi-service selection.',
      data: {
        title: 'Request a Quote',
        form: `<div class="cf7-row">
  <div class="cf7-col-6">
    <label>Your Name <span class="required">*</span> [text* client-name placeholder "Alex Morgan"]</label>
  </div>
  <div class="cf7-col-6">
    <label>Work Email <span class="required">*</span> [email* client-email placeholder "alex@company.com"]</label>
  </div>
</div>
<label>Target Department <span class="required">*</span> [select* department include_blank "Web Development|dev@yourdomain.com" "Design|design@yourdomain.com" "Consulting|consult@yourdomain.com"]</label>
<label>Estimated Budget [select budget "$5,000 - $15,000" "$15,000 - $35,000" "$35,000+"]</label>
<label>Project Details <span class="required">*</span> [textarea* project-details placeholder "Describe scope, goals, and timeline..."]</label>
[submit "Get Quote"]`,
        mail: {
          active: true,
          subject: '[Quote Request] [_raw_department] - [client-name]',
          sender: '[_site_title] Sales <no-reply@yourdomain.com>',
          recipient: '[department]',
          additional_headers: 'Reply-To: [client-email]',
          body: `New Quote Request:\n\nClient: [client-name]\nEmail: [client-email]\nDepartment: [_raw_department]\nBudget: [budget]\n\nScope:\n[project-details]`
        }
      }
    },
    {
      id: 'support-ticket',
      name: 'Customer Support Ticket',
      category: 'Support',
      description: 'Customer ticket submission with urgency selector and screenshot upload.',
      data: {
        title: 'Support Ticket',
        form: `<div class="cf7-row">
  <div class="cf7-col-6">
    <label>Name <span class="required">*</span> [text* customer-name]</label>
  </div>
  <div class="cf7-col-6">
    <label>Account Email <span class="required">*</span> [email* customer-email]</label>
  </div>
</div>
<div class="cf7-row">
  <div class="cf7-col-6">
    <label>Order / Ticket ID [text order-id placeholder "#10294"]</label>
  </div>
  <div class="cf7-col-6">
    <label>Urgency <span class="required">*</span> [select* urgency default:2 "Low" "Medium" "High" "Critical"]</label>
  </div>
</div>
<label>Issue Description <span class="required">*</span> [textarea* issue-description placeholder "Please describe the problem in detail..."]</label>
<label>Screenshot / Error Log (Optional) [file error-screenshot filetypes:jpg|jpeg|png|pdf limit:4mb]</label>
[submit "Open Ticket"]`,
        mail: {
          active: true,
          subject: '[Support Ticket] [urgency] - [customer-name] ([order-id])',
          sender: '[_site_title] Support <no-reply@yourdomain.com>',
          recipient: 'support@yourdomain.com',
          additional_headers: 'Reply-To: [customer-email]',
          attachments: '[error-screenshot]',
          body: `Support Ticket Opened:\n\nCustomer: [customer-name]\nEmail: [customer-email]\nOrder/Ticket ID: [order-id]\nUrgency: [urgency]\n\nDescription:\n[issue-description]`
        }
      }
    }
  ];

  public static listTemplates(): FormTemplate[] {
    return this.TEMPLATES;
  }

  public static getTemplate(templateId: string): FormTemplate | null {
    return this.TEMPLATES.find(t => t.id === templateId) || null;
  }
}
