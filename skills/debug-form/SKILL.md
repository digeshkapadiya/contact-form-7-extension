---
name: cf7-debug-form
description: Systematically diagnose and resolve Contact Form 7 submission failures, email delivery issues, AJAX/REST API errors, and theme/plugin conflicts.
---

# Contact Form 7 Diagnostic & Debugging Skill

Use this skill to diagnose and resolve issues with Contact Form 7 without making premature assumptions. Always follow the systematic debugging workflow.

---

## Systematic Debugging Workflow

1. **Identify the Symptom**:
   - What visual indicator occurs (border color, endless spinning circle, silent failure, page refresh)?
   - Are there JavaScript console errors or HTTP network failures?
2. **Inspect Existing Files & Configuration**:
   - Check form tags, mail configuration, theme `functions.php`, and server environment.
3. **Isolate Root Cause Layer**:
   - Layer 1: Client-side (JavaScript, theme `wp_footer()`, CSS hiding elements)
   - Layer 2: Network / REST API (Blocked `/wp-json/`, Cloudflare WAF, caching)
   - Layer 3: Application / CF7 Logic (Spam filter, custom PHP validation hook)
   - Layer 4: Server / Email Delivery (`wp_mail()`, PHP mail, SMTP authentication, SPF/DMARC)
4. **Explain Findings Clearly**: Explain *why* the issue occurs.
5. **Propose the Smallest Safe Fix**: Prefer official configuration and hooks over monkey patching.

---

## Visual Response Code Cheat Sheet

When a user submits a form, CF7 applies specific border colors to `.wpcf7-response-output`:

| Border Color | Internal Status | Primary Cause | Immediate Fix / Check |
| :--- | :--- | :--- | :--- |
| **Green** | `mail_sent` | Form valid & `wp_mail()` returned true | Email was sent. If not received in inbox, check SMTP/Spam. |
| **Red / Pink** | `validation_failed` / `mail_failed` | Fields invalid OR `wp_mail()` returned false | Check missing required fields or check server mail/SMTP log. |
| **Orange** | `spam` | Flagged by Spam filter (reCAPTCHA, Akismet, Honeypot) | Check reCAPTCHA v3 score, Disallowed Comment Keys, or test with clean data. |
| **Yellow** | `acceptance_missing` | Required acceptance checkbox not checked | Ensure user checks the required acceptance box. |

---

## Common Problem Matrix & Solutions

### 1. Spinning Arrow Spins Forever (No Response)

* **Causes**:
  1. The WordPress REST API endpoint (`/wp-json/contact-form-7/v1/contact-forms/{id}/feedback`) is blocked by a security plugin, `.htaccess`, or Cloudflare WAF.
  2. JavaScript error on the page halting execution.
  3. Caching plugin caching a stale REST nonce or minifying CF7 JavaScript with broken dependencies.
* **Diagnosis Steps**:
  1. Open Browser DevTools -> **Console**: Look for `Uncaught TypeError` or script crashes.
  2. Open Browser DevTools -> **Network**: Look at the request to `/wp-json/contact-form-7/v1/...`. Check the HTTP status code:
     - `403 Forbidden`: WAF / Security plugin blocking REST API.
     - `404 Not Found`: Permalink structure issue (resave WordPress Permalinks under Settings -> Permalinks).
     - `500 Internal Server Error`: PHP crash in a custom validation or mail hook.
* **Fix**:
  - Whitelist `/wp-json/contact-form-7/v1/*` in security plugins.
  - Exclude CF7 scripts from aggressive JS deferral/aggregation if broken.

---

### 2. Form Submits with Green Border, but Email is Never Received

* **Root Cause**: WordPress's default `wp_mail()` function uses PHP `mail()`. Most hosting providers (cPanel, AWS, DigitalOcean, VPS) do not have a configured MTA or are blacklisted by Gmail/Outlook due to missing SPF, DKIM, and DMARC records.
* **Diagnosis**:
  - `wp_mail()` returned `true` (PHP handed the message to local sendmail), but the upstream mail server rejected or dropped it.
* **Fix**:
  - Install a reliable SMTP plugin (e.g., **FluentSMTP**, **WP Mail SMTP**, or **Post SMTP**).
  - Connect to a transactional email provider (SendGrid, Postmark, Mailgun, Amazon SES, Brevo, or Google Workspace).
  - Verify that the `From:` address in CF7 Mail tab matches the authenticated domain in the SMTP provider.

---

### 3. Page Reloads on Submission Instead of AJAX

* **Root Cause**:
  1. Missing `wp_footer();` in the active theme's `footer.php`.
  2. CF7 scripts explicitly disabled via `wpcf7_load_js` filter or dequeue.
  3. jQuery or CF7 scripts blocked by JavaScript errors earlier in the execution chain.
* **Diagnosis**:
  - View page source and search for `wp-content/plugins/contact-form-7/includes/js/index.js`.
* **Fix**:
  - Ensure `<?php wp_footer(); ?>` is present just before `</body>` in `footer.php`.

---

### 4. File Upload Fails or Submission Errors on Upload

* **Causes**:
  1. Temporary upload directory `/wp-content/uploads/wpcf7_uploads` does not exist or has incorrect directory permissions (must be `755`).
  2. Uploaded file exceeds server `upload_max_filesize` or `post_max_size` in `php.ini`.
  3. File extension is not listed in `filetypes:pdf|jpg|png`.
  4. Mail tag is missing from the **File Attachments** field in the Mail tab.
* **Fix**:
  - Create `/wp-content/uploads/wpcf7_uploads` and verify write permissions.
  - Set explicit `filetypes` and `limit` in the CF7 tag: `[file* user-file filetypes:pdf|docx limit:10mb]`.

---

### 5. Orange Border (Spam Detected on Legitimate Users)

* **Causes**:
  1. Google reCAPTCHA v3 score threshold is too aggressive (defaults to `0.50`).
  2. The submitter entered a keyword matching WordPress **Settings -> Discussion -> Disallowed Comment Keys**.
  3. Honeypot field filled in by browser auto-fill extensions.
* **Fix**:
  - Adjust reCAPTCHA threshold via filter:
    ```php
    add_filter( 'wpcf7_recaptcha_threshold', function( $threshold ) {
        return 0.30; // Lower threshold (0.0 to 1.0) to be less aggressive
    });
    ```
  - Check Disallowed Comment Keys under WordPress Settings.

---

## Live MCP Diagnostics (When Connected to WordPress)

When the `cf7-wordpress` MCP server is enabled in Claude Code:

1. **Test Site Connection**: Run `wp_check_connection` to verify the REST API is reachable and detect the CF7 version.
2. **List Forms**: Run `cf7_list_forms` to view all forms on the target site.
3. **Audit Form**: Run `cf7_audit_form(form_id)` to automatically check for:
   - Tag mismatches between form and mail templates
   - Deliverability / DMARC risks (From domain mismatch)
   - Missing Reply-To headers
   - Unattached file upload fields
   - Missing spam protection
4. **Snapshot & Safe Fix**: Run `cf7_update_form` with `backup_note` to safely patch configuration errors while retaining a rollback snapshot in `.cf7-backups/`.

