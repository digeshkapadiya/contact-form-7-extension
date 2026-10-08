# CF7 Developer Assistant Testing & QA Checklist

Use this comprehensive checklist to validate Contact Form 7 configurations, forms, security rules, email deliverability, and custom PHP hooks.

---

## Test Scenarios & Verification Matrix

### 1. Basic Contact Form
- [ ] Render form on a test page via shortcode `[contact-form-7 id="..." title="..."]`.
- [ ] Fill out all required fields (`your-name`, `your-email`, `your-subject`, `your-message`) and submit.
- [ ] Confirm submission status banner turns green with success message.
- [ ] Confirm email arrives in administrator inbox with correct subject and body content.
- [ ] Verify that hitting "Reply" in your mail client addresses the submitter's email (`Reply-To:` header).

### 2. Job Application Form & File Uploads
- [ ] Test file upload with supported formats (`.pdf`, `.docx`).
- [ ] Test file upload rejection with unsupported formats (`.exe`, `.php`, `.zip`).
- [ ] Test file upload exceeding limit (e.g. upload >5MB file) and verify user error message.
- [ ] Confirm uploaded file is attached to the notification email in the recipient inbox.
- [ ] Verify `/wp-content/uploads/wpcf7_uploads/` directory is created with `755` permissions and temporary files are cleaned up after transmission.

### 3. Quote Request & Pipes Syntax
- [ ] Select each department option in the select dropdown.
- [ ] Confirm the email routes dynamically to the correct department email address.
- [ ] Confirm the email body displays the human-readable label (`[_raw_department]`).
- [ ] Verify multiple checkbox options are passed cleanly without formatting breaks.

### 4. Mail Configuration & Tag Synchronization
- [ ] Check every form tag against the Mail tab:
  - [ ] No missing fields in Message Body.
  - [ ] No nonexistent/orphaned mail tags.
- [ ] Verify `From:` header matches the site's domain (e.g. `no-reply@domain.com`).
- [ ] Verify Mail (2) auto-responder is dispatched to the submitter.

### 5. Custom PHP Validation
- [ ] **Phone validation**: Test with invalid phone string (e.g. `1234`) -> verify inline validation error under telephone field.
- [ ] **Corporate email validation**: Test with `user@gmail.com` -> verify inline validation error requiring corporate address.
- [ ] **Word count limit**: Submit textarea with >300 words -> verify error tip.
- [ ] **Conditional validation**: Select "Other" without filling the details field -> verify validation invalidation.

### 6. AJAX Submission & REST API Diagnostics
- [ ] Open Browser DevTools Network tab.
- [ ] Submit form and verify `POST /wp-json/contact-form-7/v1/contact-forms/{id}/feedback` returns `200 OK`.
- [ ] Verify page does **not** hard-reload upon submission.
- [ ] Verify loading spinner (`.wpcf7-spinner`) is visible during network request and disappears upon completion.
- [ ] Test with REST API blocked (e.g. simulate 403) and verify graceful fallback or error reporting.

### 7. Email Delivery & SMTP / DMARC Compliance
- [ ] Test using an authenticated SMTP plugin (e.g., FluentSMTP, WP Mail SMTP).
- [ ] Verify DKIM, SPF, and DMARC alignment passes in email headers.
- [ ] Check Spam / Junk folder to confirm zero false-positive spam flagging.

### 8. Anti-Spam & Security
- [ ] **Honeypot field test**: Fill the hidden honeypot input (`website-verify`) manually -> verify form displays spam rejection (orange border) without sending email.
- [ ] **Akismet test**: Submit test with name `viagra-test-123` -> verify Akismet flags the submission.
- [ ] **reCAPTCHA v3**: Check that invisible badge / token is verified in backend.
- [ ] **Header injection**: Attempt sending newline characters in subject/email fields -> verify headers are not split.

### 9. Custom CSS & Responsiveness
- [ ] Test form layout at desktop viewport (`>1024px`) -> 2-column fields align side-by-side.
- [ ] Test form layout at mobile viewport (`<640px`) -> 2-column fields stack cleanly into 100% width.
- [ ] Verify focus outline states (`:focus-visible`) are distinct and accessible.
- [ ] Verify error tooltips (`.wpcf7-not-valid-tip`) render directly beneath invalid fields.

### 10. JavaScript DOM Events
- [ ] Open browser console and submit valid form -> verify `wpcf7mailsent` event fires.
- [ ] Submit empty required form -> verify `wpcf7invalid` event fires and page smooth-scrolls to first invalid element.
- [ ] Verify GA4 / GTM event triggers appropriately on `wpcf7mailsent`.

---

## Phase 3 Advanced MCP & Automation Testing

### 11. Multi-Site Management
- [ ] Execute `wp_add_site` with staging and production URLs.
- [ ] Verify `wp_list_sites` outputs all registered sites with active marker.
- [ ] Switch active site with `wp_select_site` and verify subsequent queries run in the new site context.

### 12. Site-Wide Automated Health Check
- [ ] Run `cf7_health_check` across all forms on a site.
- [ ] Verify forms are accurately sorted into **Confirmed Errors** (critical score drops), **Needs Review** (warnings), and **Clean Forms** (score 100).

### 13. Synthetic Form Testing Engine
- [ ] Execute `cf7_test_submission` with `mode: "valid"` on local/staging -> verify `mail_sent` status.
- [ ] Execute `cf7_test_submission` with `mode: "invalid_email"` -> verify `validation_failed` and target field error extraction.
- [ ] Test against a production domain without `confirm_production: true` -> verify safety lock aborts execution.

### 14. 5-Layer Email Delivery Diagnostics
- [ ] Run `cf7_diagnose_delivery` on a form with mismatched sender -> verify Layer 2 DMARC critical alert and specific remediation steps.

### 15. Snapshot Diff & Rollback
- [ ] Run `cf7_update_form` on form #12 -> verify snapshot created in `.cf7-backups/`.
- [ ] Run `cf7_diff_snapshots` -> verify field-by-field before/after comparison with plain English explanation.
- [ ] Run `cf7_restore_form` -> verify form is rolled back to original state cleanly.

---

## Phase 4 Ecosystem Integrations & Agency Automation Testing

### 16. CRM & Webhook Integration
- [ ] Run `cf7_configure_integration` with field mappings (`[your-name]` -> `customer.name`, `[your-email]` -> `customer.email`).
- [ ] Verify `cf7_list_integrations` lists the configured integration.
- [ ] Run `cf7_test_integration` -> verify pre-flight schema analysis catches missing or mismatched fields.
- [ ] Run `cf7_generate_integration_code` -> verify generated WordPress PHP code uses `wpcf7_mail_sent` and `wp_safe_remote_post` non-blocking dispatch.

### 17. Agency Templates
- [ ] Run `cf7_list_templates` -> verify standard templates (Job Application, Quote Request, Contact Us, Support Ticket) are listed.
- [ ] Run `cf7_apply_template` with `template_id: "quote-request"` -> verify new form is created on target WordPress site.

### 18. CI/CD Pipeline & CLI Linter
- [ ] Run `npm run lint:cf7` / `npx cf7-lint` -> verify CLI scans all forms, validates tag integrity, and returns exit code 0 when clean.
- [ ] Verify GitHub Actions workflow (`.github/workflows/cf7-audit.yml`) executes successfully.


