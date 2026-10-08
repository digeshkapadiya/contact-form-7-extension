---
name: cf7-security
description: Harden Contact Form 7 forms against spam bots, email header injection, malicious file uploads, and unauthorized form submissions.
---

# Contact Form 7 Security & Spam Protection Guide

Use this skill to audit and harden Contact Form 7 forms, eliminate bot spam, and enforce secure WordPress coding practices.

---

## Defense-in-Depth Spam Protection Strategy

Combining multiple lightweight spam protection methods yields near-zero spam without compromising user experience.

```text
Submission Flow:
[User Submits Form] 
       │
       ▼
[Layer 1: Akismet Native Tags] ────(Flagged)───► [Mark as Spam (Orange Border)]
       │ (Passed)
       ▼
[Layer 2: Honeypot Hidden Field] ──(Filled)────► [Silent Drop / Spam Error]
       │ (Passed)
       ▼
[Layer 3: reCAPTCHA v3 / Turnstile] (Low Score)► [Block Submission]
       │ (Passed)
       ▼
[Layer 4: WordPress Disallowed Keys] (Matched)─► [Mark as Spam]
       │ (Clean)
       ▼
[Valid Submission & Email Dispatch]
```

---

## 1. Built-In Akismet Integration

CF7 integrates natively with Akismet. Add `akismet:` options to your standard form tags:

```text
[text* your-name akismet:author placeholder "Your Name"]
[email* your-email akismet:author_email placeholder "Your Email"]
[url your-website akismet:author_url placeholder "https://yourwebsite.com"]
```

When Akismet is active on WordPress with a valid API key, CF7 passes these fields automatically to Akismet's anti-spam machine learning API.

---

## 2. Honeypot Implementation

Bots automatically fill every input field they encounter in the DOM. A honeypot field is hidden from legitimate humans using CSS/HTML, so if it contains a value, the submission is rejected.

### Form Tag with CSS Hide:
```html
<div class="cf7-hp-wrap" style="position: absolute !important; left: -9999px !important; top: -9999px !important; opacity: 0; pointer-events: none;" aria-hidden="true" tabindex="-1">
  <label for="cf7-website-verify">Leave this field empty if you are human</label>
  [text website-verify id:cf7-website-verify autocomplete="off"]
</div>
```

### Server-Side Hook (in `functions.php` or Custom Plugin):
```php
add_filter( 'wpcf7_spam', 'custom_cf7_honeypot_filter', 10, 2 );

function custom_cf7_honeypot_filter( $spam, $submission ) {
    if ( $spam ) {
        return $spam;
    }

    $hp_value = isset( $_POST['website-verify'] ) ? sanitize_text_field( wp_unslash( $_POST['website-verify'] ) ) : '';

    if ( ! empty( $hp_value ) ) {
        // Honeypot was filled: flag as spam
        return true;
    }

    return $spam;
}
```

---

## 3. Secure File Upload Hardening

Unrestricted file uploads represent a critical security vulnerability. Ensure every `[file]` tag conforms to strict restrictions:

### Form Tag Rules:
```text
[file* user-attachment filetypes:pdf|docx|jpg|png limit:5mb]
```

### Security Checklist:
1. **Restrict File Types**: Never allow `.php`, `.phtml`, `.exe`, `.sh`, `.js`, `.html`, or `.svg` (SVG can execute stored XSS).
2. **Limit File Size**: Explicitly define `limit:Nmb` or `limit:Nkb`.
3. **Directory Security**: Contact Form 7 automatically places a `.htaccess` file denying script execution in `/wp-content/uploads/wpcf7_uploads/`. Ensure this directory is protected on Nginx/LiteSpeed as well.

---

## 4. Email Header Injection Prevention

Email header injection occurs when malicious payloads containing newline characters (`\r` or `\n`) are injected into email headers (such as `Reply-To:` or `Cc:`), turning your server into an open relay for spam campaigns.

### Best Practices:
* Contact Form 7 automatically sanitizes headers generated through standard mail tags.
* When adding custom PHP code via `wpcf7_mail_components` or `wpcf7_before_send_mail`, **always** strip newline characters from header values:

```php
add_filter( 'wpcf7_mail_components', 'custom_cf7_secure_mail_headers', 10, 3 );

function custom_cf7_secure_mail_headers( $components, $form, $mail ) {
    // Strip line breaks from subject and headers to prevent mail injection
    if ( isset( $components['subject'] ) ) {
        $components['subject'] = str_replace( [ "\r", "\n", "%0a", "%0d" ], ' ', $components['subject'] );
    }
    return $components;
}
```

---

## 5. Secrets and Credentials Protection

* **Never** hardcode SMTP credentials, API tokens, or webhook passwords in form tags or client-side JavaScript.
* Store sensitive credentials in `wp-config.php` constants or environment variables:
```php
// In wp-config.php:
define( 'CF7_CRM_API_KEY', 'your-secret-key-here' );
```
