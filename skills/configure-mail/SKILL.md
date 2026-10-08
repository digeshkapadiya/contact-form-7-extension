---
name: cf7-configure-mail
description: Configure Contact Form 7 Mail and Mail (2) settings, enforce DMARC/SPF email deliverability compliance, and detect tag mismatches.
---

# Contact Form 7 Mail Configuration Guide

Use this skill to configure CF7 email settings (Mail and Mail (2)), prevent deliverability and DMARC/SPF failures, and diagnose tag synchronization mismatches.

---

## Step 0: Connect the WordPress Site First

Before any live-site action (list, read, audit, create, update, test), call `wp_check_connection`.

If it is not connected, **stop and ask the user to connect their site** before drafting-and-creating. Ask for:
1. **Site URL** (e.g. `https://example.com`) and whether it is **staging or production**. Recommend staging first.
2. **WordPress username** and an **Application Password** (WordPress admin -> Users -> Profile -> Application Passwords -> Add).
3. Preferred way to store them: `/plugin` -> cf7-developer-assistant -> **Configure options** (password kept as a sensitive value). Otherwise call `wp_add_site` and `wp_select_site` with the details the user gives you.

Then re-run `wp_check_connection` and confirm Contact Form 7 is detected. Only then create or change anything. If the user only wants markup or code (no live site), skip this step and say the form will not be created on a site.

---

## The Golden Rules of CF7 Email Deliverability

1. **Sender Domain Matching (`From` field)**:
   - **NEVER** set the `From` field to the submitter's email `[your-email]`.
   - The `From` field **MUST** use an email address belonging to your site's domain (e.g., `no-reply@yourdomain.com` or `wordpress@yourdomain.com`).
   - If the sender domain differs from the actual sending mail server domain, SPF and DMARC checks will fail, and mail will be marked as spam or silently rejected.

2. **Replying to the Submitter (`Reply-To` header)**:
   - Always put `Reply-To: [your-email]` in the **Additional Headers** textarea.
   - When the site administrator clicks "Reply" in their email client, it will automatically address the submitter.

3. **File Attachments**:
   - Mail attachment tags (e.g., `[resume-file]`) must be placed in the **File Attachments** field at the bottom of the Mail tab, **NOT** in the Message Body.

---

## Mail Tab Field Reference

| Field | Recommended Format | Purpose / Example |
| :--- | :--- | :--- |
| **To** | `admin@yourdomain.com` or `[_site_admin_email]` or `[department-email]` | Recipient address |
| **From** | `[_site_title] <no-reply@yourdomain.com>` | Sender address (must match domain) |
| **Subject** | `New Contact Submission: [subject-field]` | Email subject line |
| **Additional Headers** | `Reply-To: [user-name] <[user-email]>`<br>`Cc: sales@yourdomain.com`<br>`Bcc: archive@yourdomain.com` | Custom MIME headers |
| **Message Body** | Plain text or HTML template | Email content containing mail tags |
| **File Attachments** | `[uploaded-file-tag]` | Uploaded files to attach to the email |
| **Use HTML content type** | Checkbox | Check if sending styled HTML emails |
| **Exclude lines with blank mail-tags** | Checkbox | Strips empty lines when optional fields are skipped |

---

## Mail (2) Auto-Responder Setup

Mail (2) is a secondary email template sent automatically to the submitter as a confirmation receipt.

* Check the **"Use Mail (2)"** checkbox in CF7 Mail settings.
* **To**: `[user-email]`
* **From**: `[_site_title] <no-reply@yourdomain.com>`
* **Subject**: `We received your message: "[_site_title]"`
* **Additional Headers**: `Reply-To: support@yourdomain.com`
* **Message Body**:
```text
Hi [full-name],

Thank you for contacting [_site_title]. We have received your inquiry and our team will get back to you within 1-2 business days.

A copy of your submission:
----------------------------------------
Subject: [subject]
Message:
[user-message]
----------------------------------------

Best regards,
The [_site_title] Team
[_site_url]
```

---

## Mail Tag Validation & Mismatch Detection

When reviewing or generating mail configurations, perform the following validation checklist:

1. **Tag Correspondence Check**:
   - For every input tag `[text* user-name]` in the Form tab, verify whether `[user-name]` exists in the Mail tab.
   - Flag any orphaned mail tags in the Mail body that do not exist in the Form tab.

2. **Select Pipes Syntax Handling**:
   - If using pipes (`[select* department "Sales|sales@domain.com"]`):
     - In `To` field: use `[department]` (evaluates to `sales@domain.com`).
     - In `Message Body`: use `[_raw_department]` (evaluates to `Sales`).

3. **Checkboxes & Multi-select Formatting**:
   - Checkbox outputs are comma-separated strings by default.
   - For individual lines, recommend custom filters if clean formatting is required.

---

## Advanced Additional Headers

You can specify additional MIME headers in the **Additional Headers** section:

```text
Reply-To: [user-email]
Cc: manager@yourdomain.com
Bcc: crm-inbox@yourdomain.com
X-CF7-Source-Page: [_url]
X-CF7-Remote-IP: [_remote_ip]
```
