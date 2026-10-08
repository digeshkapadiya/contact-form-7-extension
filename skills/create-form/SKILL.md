---
name: cf7-create-form
description: Generate semantic, accessible, and valid WordPress Contact Form 7 form tags and matching mail templates for any form type.
---

# Contact Form 7 Form Generator

Use this skill to create valid Contact Form 7 (CF7) forms with correct form tags, clean semantic markup, accessibility considerations, and perfectly matched mail templates.

---

## Step 0: Connect the WordPress Site First

Before any live-site action (list, read, audit, create, update, test), call `wp_check_connection`.

If it is not connected, **stop and ask the user to connect their site** before drafting-and-creating. Ask for:
1. **Site URL** (e.g. `https://example.com`) and whether it is **staging or production**. Recommend staging first.
2. **WordPress username** and an **Application Password** (WordPress admin -> Users -> Profile -> Application Passwords -> Add).
3. Preferred way to store them: `/plugin` -> cf7-developer-assistant -> **Configure options** (password kept as a sensitive value). Otherwise call `wp_add_site` and `wp_select_site` with the details the user gives you.

Then re-run `wp_check_connection` and confirm Contact Form 7 is detected. Only then create or change anything. If the user only wants markup or code (no live site), skip this step and say the form will not be created on a site.

---

## Generation Workflow

1. **Understand Requirements**: Identify necessary fields, types, required statuses, file upload limits, and layout structure.
2. **Inspect Existing Context**: If working within an existing WordPress theme or project, check for custom CSS framework classes (e.g., custom grid classes, Bootstrap, or existing CF7 wrapper styles).
3. **Generate Semantic Form Markup**: Build clean HTML wrappers around standard CF7 tag syntax.
4. **Generate Matching Mail Template**: Produce corresponding mail tags for the Mail tab and optional Mail (2) auto-responder.
5. **Output Additional Settings**: Provide relevant CF7 settings (e.g., `subscribers_only: true`, `demo_mode: on`) if applicable.

---

## Contact Form 7 Tag Reference

A CF7 form tag follows this syntax:
```text
[type[*] name (options) (values)]
```
* Asterisk `*` indicates a required field.
* Options include `class:my-class`, `id:my-id`, `placeholder "Text"`, `min:N`, `max:N`, `step:N`, `filetypes:pdf|docx`, `limit:5mb`.

### Form Tag Types & Syntax

| Field Type | Tag Syntax Example | Notes |
| :--- | :--- | :--- |
| **Text** | `[text* full-name class:form-control placeholder "John Doe"]` | Standard text input |
| **Email** | `[email* user-email placeholder "john@example.com"]` | RFC compliant email validation |
| **Telephone** | `[tel* phone-number placeholder "+1 (555) 000-0000"]` | Tel input |
| **URL** | `[url user-website placeholder "https://example.com"]` | Validates web URL |
| **Number** | `[number* guests-count min:1 max:20 step:1 "1"]` | Numeric input |
| **Range** | `[range budget-range min:1000 max:50000 step:500]` | Slider input |
| **Date** | `[date* appointment-date min:2026-01-01 max:2026-12-31]` | Date picker |
| **Textarea** | `[textarea* user-message x5 placeholder "Enter your message..."]` | Multiline text |
| **Drop-down** | `[select* service-type include_blank "Web Development" "SEO" "Design"]` | Single select |
| **Drop-down (Pipes)** | `[select* department "Sales\|sales@example.com" "Support\|support@example.com"]` | Label \| Value pairing |
| **Checkboxes** | `[checkbox interested-services use_label_element "Design" "Code" "Marketing"]` | Multi-select |
| **Exclusive Checkbox** | `[checkbox* contact-method exclusive "Email" "Phone"]` | Behaves like radio button |
| **Radio Buttons** | `[radio urgency default:1 "Low" "Medium" "High"]` | Single select option |
| **Acceptance** | `[acceptance terms-conditions] I agree to the <a href="/terms">Terms</a>[/acceptance]` | Must check to submit |
| **File Upload** | `[file* resume-file filetypes:pdf\|docx limit:5mb]` | Multipart file upload |
| **Hidden Field** | `[hidden page-source default:get]` | Dynamic or query parameter |
| **Submit Button** | `[submit class:btn class:btn-primary "Submit Message"]` | Form submit button |

---

## Dropdown & Select Pipes Syntax

When options need human-friendly labels but pass specific email addresses or IDs to the mail template:

```text
[select* recipient-department include_blank
  "General Inquiries|info@example.com"
  "Sales Department|sales@example.com"
  "Technical Support|support@example.com"]
```

* Mail Tag `[recipient-department]` will output the **value** (e.g. `support@example.com`).
* Mail Tag `[_raw_recipient-department]` will output the **label** (e.g. `Technical Support`).

---

## Special CF7 Mail Tags

CF7 provides built-in submission metadata tags:

| Special Mail Tag | Description |
| :--- | :--- |
| `[_remote_ip]` | Client's IP address |
| `[_user_agent]` | Submitter's browser User Agent |
| `[_url]` | URL of the webpage where form was submitted |
| `[_date]` | Date of submission |
| `[_time]` | Time of submission |
| `[_post_id]` | ID of the post/page containing the form |
| `[_post_title]` | Title of the post/page containing the form |
| `[_post_url]` | Permalink of the post containing the form |
| `[_site_title]` | WordPress site title |
| `[_site_admin_email]` | WordPress admin email address |
| `[_site_url]` | WordPress home URL |

---

## Best Practices for Semantic Markup & Accessibility

1. **Explicit `<label>` Elements**: Always wrap or associate labels with form controls.
2. **Accessible Required Fields**: Use visual indicators `*` and ensure screen readers announce required status.
3. **Structured Form Rows**: Use CSS grid or flexbox classes (`form-row`, `form-col-6`, `form-group`) instead of non-semantic `<br>` or `<p>` tags.
4. **Avoid Raw HTML ID Duplication**: Ensure field IDs are unique per page if used.
5. **Clear Placeholder Text**: Placeholders should show format examples, not replace visible `<label>` tags.

---

## Output Template Format

When generating a form, always output both the **Form Editor Code** and the **Mail Configuration**:

```markdown
### 1. Form Template (Paste into Contact Form 7 Form Tab)
```html
<div class="cf7-form-container">
  <div class="cf7-row">
    <div class="cf7-col-6">
      <label for="cf7-name">Full Name <span class="required">*</span></label>
      [text* full-name id:cf7-name class:cf7-input placeholder "Jane Doe"]
    </div>
    <div class="cf7-col-6">
      <label for="cf7-email">Email Address <span class="required">*</span></label>
      [email* user-email id:cf7-email class:cf7-input placeholder "jane@example.com"]
    </div>
  </div>

  <div class="cf7-form-group">
    <label for="cf7-message">Your Message <span class="required">*</span></label>
    [textarea* user-message id:cf7-message class:cf7-textarea placeholder "How can we help you?"]
  </div>

  <div class="cf7-form-group">
    [submit class:cf7-btn-submit "Send Message"]
  </div>
</div>
```

### 2. Mail Tab Configuration
* **To**: `[_site_admin_email]`
* **From**: `[_site_title] <wordpress@yourdomain.com>`
* **Subject**: `New Inquiry from [full-name]: "[_site_title]"`
* **Additional Headers**: `Reply-To: [user-email]`
* **Message Body**:
```text
You received a new message from [full-name] ([user-email]).

Message Body:
[user-message]

---
Sent from: [_url]
Date: [_date] at [_time]
IP Address: [_remote_ip]
```
```
