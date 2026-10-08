# Basic Contact Form Example

A production-ready basic contact form with semantic labels, accessible markup, matched mail templates, and an auto-responder.

---

## 1. Form Template (Paste into Form Tab)

```html
<div class="cf7-form-container">
  <div class="cf7-row">
    <div class="cf7-col-6">
      <div class="cf7-form-group">
        <label for="contact-name">Your Name <span class="required">*</span></label>
        [text* your-name id:contact-name class:cf7-input placeholder "John Smith"]
      </div>
    </div>
    <div class="cf7-col-6">
      <div class="cf7-form-group">
        <label for="contact-email">Your Email <span class="required">*</span></label>
        [email* your-email id:contact-email class:cf7-input placeholder "john@example.com"]
      </div>
    </div>
  </div>

  <div class="cf7-form-group">
    <label for="contact-subject">Subject <span class="required">*</span></label>
    [text* your-subject id:contact-subject class:cf7-input placeholder "Project inquiry"]
  </div>

  <div class="cf7-form-group">
    <label for="contact-message">Message <span class="required">*</span></label>
    [textarea* your-message id:contact-message class:cf7-textarea placeholder "Tell us about your project..."]
  </div>

  <!-- Honeypot Anti-Spam Field -->
  <div class="cf7-hp-wrap" style="position:absolute!important;left:-9999px!important;top:-9999px!important;opacity:0;pointer-events:none;" aria-hidden="true" tabindex="-1">
    <label for="contact-verify">Leave blank</label>
    [text website-verify id:contact-verify autocomplete="off"]
  </div>

  <div class="cf7-form-group">
    [submit class:cf7-btn-submit "Send Message"]
  </div>
</div>
```

---

## 2. Mail Configuration (Mail Tab)

* **To**: `[_site_admin_email]`
* **From**: `[_site_title] <no-reply@yourdomain.com>`
* **Subject**: `[your-subject] - Inquiry via [_site_title]`
* **Additional Headers**: `Reply-To: [your-name] <[your-email]>`
* **Message Body**:
```text
You received a new inquiry from your website contact form.

Name: [your-name]
Email: [your-email]
Subject: [your-subject]

Message:
[your-message]

---
Sent from: [_url]
Date: [_date] [_time]
IP: [_remote_ip]
```

---

## 3. Auto-Responder Configuration (Mail 2 Tab)

* **Use Mail (2)**: `[x]` Checked
* **To**: `[your-email]`
* **From**: `[_site_title] <no-reply@yourdomain.com>`
* **Subject**: `We received your message - [_site_title]`
* **Additional Headers**: `Reply-To: [_site_admin_email]`
* **Message Body**:
```text
Hello [your-name],

Thank you for reaching out to [_site_title]. We have received your message regarding "[your-subject]" and will respond shortly.

Here is a summary of your inquiry:
--------------------------------------------
[your-message]
--------------------------------------------

Best regards,
The [_site_title] Team
[_site_url]
```
