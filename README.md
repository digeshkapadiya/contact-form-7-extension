# CF7 Developer Assistant for Claude Code

[![Claude Code Plugin](https://img.shields.io/badge/Claude%20Code-Plugin-blueviolet.svg)](https://docs.anthropic.com/en/docs/agents-and-tools/claude-code)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![WordPress Compatibility](https://img.shields.io/badge/WordPress-6.0%2B-blue.svg)](https://wordpress.org)
[![CF7 Compatibility](https://img.shields.io/badge/Contact%20Form%207-5.7%2B-green.svg)](https://contactform7.com)

**CF7 Developer Assistant** is a production-ready Claude Code plugin designed for WordPress developers. It streamlines the creation, configuration, debugging, server-side validation, anti-spam security hardening, and styling of [Contact Form 7 (CF7)](https://contactform7.com/) forms directly from your Claude Code workflow.

---

## Features

- 🏗️ **Smart Form Generation**: Quickly scaffold semantic, accessible CF7 form tags (text, email, tel, number, date, dropdowns with pipes, file uploads, acceptance, etc.).
- ✉️ **Mail & Mail (2) Configuration**: Generate bulletproof email templates, enforce DMARC/SPF sender compliance, and prevent tag mismatches.
- 🩺 **Deep Diagnostics & Debugging**: Systematic troubleshooting for AJAX failures, infinite spinning wheels, REST API blocks, wp_mail/SMTP delivery issues, and spam false-positives.
- 🔌 **Live WordPress MCP Integration**: Connect directly to your WordPress site over REST API to list, inspect, audit, create, update, and back up CF7 forms.
- 🛡️ **Custom Server-Side Validation**: Generate safe PHP validation filters (`wpcf7_validate_*`) for phone formats, corporate email restriction, word count limits, and conditional logic.
- 🔒 **Defense-in-Depth Spam Protection**: Combine Honeypot fields, Akismet tags, reCAPTCHA v3 / Cloudflare Turnstile, and email header injection protection.
- 🎨 **Modern Vanilla CSS & JS**: Plug-and-play responsive grid layouts, custom form control styling, and DOM event listeners (`wpcf7mailsent`, `wpcf7invalid`) for analytics tracking.

---

## Plugin Architecture

```text
contact-form-7/
├── .claude-plugin/
│   └── plugin.json           # Plugin metadata, skill & MCP registrations
├── skills/
│   ├── create-form/
│   │   └── SKILL.md          # Form tag generator & template patterns
│   ├── configure-mail/
│   │   └── SKILL.md          # Mail & Mail (2) deliverability configuration
│   ├── debug-form/
│   │   └── SKILL.md          # Diagnostics & root-cause issue isolation
│   ├── validation/
│   │   └── SKILL.md          # Native & custom PHP validation hooks
│   ├── security/
│   │   └── SKILL.md          # Honeypots, spam defense, & security auditing
│   └── styling/
│       └── SKILL.md          # CSS design tokens & JavaScript event listeners
├── mcp-server/               # TypeScript MCP Server for Live WordPress
│   ├── src/
│   │   ├── index.ts          # Server entrypoint (stdio transport)
│   │   ├── tools/            # MCP tools (list, get, audit, create, update, backup)
│   │   ├── wordpress/        # Resilient WordPress REST client & typings
│   │   ├── audit/            # Syntax parser & diagnostic analyzer
│   │   └── backup/           # Snapshot safety manager
│   ├── package.json
│   └── tsconfig.json
├── examples/
│   ├── forms/                # Production form templates (Basic, Job, Quote)
│   ├── php-snippets/         # Safe WordPress PHP hooks and filters
│   ├── css/                  # Responsive CSS stylesheet
│   └── js/                   # Event listeners & conversion tracking
├── TESTING.md                # QA validation checklist
├── CHANGELOG.md              # Version release notes
├── CONTRIBUTING.md           # Guidelines for community contributions
└── LICENSE                   # MIT License
```

---

## Live WordPress MCP Server Setup (Optional)

To connect Claude directly to your live WordPress site, set environment variables:

```bash
export WORDPRESS_URL="https://your-wordpress-site.com"
export WORDPRESS_USERNAME="admin"
export WORDPRESS_APP_PASSWORD="xxxx xxxx xxxx xxxx xxxx xxxx"
```

### Available MCP Tools (Complete Suite)

| Tool | Category | Purpose |
| :--- | :--- | :--- |
| `wp_list_sites` | Multi-Site | List all configured WordPress sites with active status and environments. |
| `wp_add_site` | Multi-Site | Register a new WordPress site (production/staging/local) with isolated auth. |
| `wp_select_site` | Multi-Site | Switch active working site context. |
| `wp_check_connection` | Connectivity | Verify WordPress connectivity, core version, and CF7 plugin detection. |
| `cf7_list_forms` | Forms | List all contact forms (ID, title, shortcode) on the active site. |
| `cf7_get_form` | Forms | Retrieve complete form markup, mail settings, and messages. |
| `cf7_health_check` | Health & QA | Automated scan of all site forms, separating Confirmed Errors from Review Items. |
| `cf7_audit_form` | Health & QA | Deep audit checking tag mismatches, DMARC risk, and missing attachments (0–100 score). |
| `cf7_test_submission` | Testing | Safe synthetic test submissions (valid, invalid email, missing required) with prod lock. |
| `cf7_diagnose_delivery`| Diagnostics | 5-layer email deliverability diagnostics (Tags → DMARC → wp_mail → SMTP → Receiver). |
| `cf7_diff_snapshots` | Safety & Diff | Compare live form against saved backup snapshot with field-by-field diffs. |
| `cf7_list_integrations`| Integrations | List CRM, Webhook, and Google Sheets integrations for forms. |
| `cf7_configure_integration`| Integrations | Configure external API mapping with custom field transforms. |
| `cf7_test_integration` | Integrations | Validate integration field mapping and send optional test requests. |
| `cf7_generate_integration_code`| Integrations | Generate production-ready WordPress PHP code (`wpcf7_mail_sent` non-blocking relay). |
| `cf7_list_templates` | Templates | Access standard reusable templates (Job App, Quote, Support, Contact). |
| `cf7_apply_template` | Templates | Instantiate and deploy a standard agency template to the active site. |
| `cf7_create_form` | Form Actions | Create a new Contact Form 7 form in WordPress. |
| `cf7_update_form` | Form Actions | Update form with automatic snapshot creation and post-update validation. |
| `cf7_list_backups` | Safety & Diff | View saved pre-update snapshots in `.cf7-backups/`. |
| `cf7_restore_form` | Safety & Diff | Rollback a form to a previous snapshot state. |
| `cf7_get_analytics` | Analytics | Inspect Flamingo / DB submission log storage status. |


---

## Requirements

* **Claude Code**: Latest version
* **WordPress**: 6.0 or higher
* **Contact Form 7**: 5.7 or higher (tested up to latest 5.9+)
* **PHP**: 7.4 to 8.3+

---

## Installation

### Method 0: Marketplace (recommended)

```text
/plugin marketplace add digeshkapadiya/contact-form-7-extension
/plugin install cf7-developer-assistant@cf7-developer-tools
```

Slash commands: `/cf7-developer-assistant:audit`, `:new-form`, `:health-check`, `:diagnose-delivery`.

### Method 1: Local Installation in Claude Code

Clone or copy this repository into your workspace or Claude configuration:

```bash
git clone https://github.com/cf7-developer-assistant/cf7-developer-assistant.git contact-form-7
```

In Claude Code, add the plugin to your project or install it directly via the Claude Plugin Manager:

```bash
claude plugin install ./contact-form-7
```

### Method 2: Global Configuration

Add the plugin path to your `.claude/config.json` or project settings.

---

## Available Skills

| Skill | Identifier | Description |
| :--- | :--- | :--- |
| **Create Form** | `cf7-create-form` | Generates semantic HTML, valid CF7 form tags, pipes syntax, and paired mail templates. |
| **Configure Mail** | `cf7-configure-mail` | Configures To, From, Subject, Additional Headers, Mail (2), and catches tag mismatches. |
| **Debug Form** | `cf7-debug-form` | Diagnoses border response colors, AJAX/REST API blocks, SMTP deliverability, and theme conflicts. |
| **Validation** | `cf7-validation` | Implements native and custom PHP server-side validation filters (`wpcf7_validate_*`). |
| **Security & Spam** | `cf7-security` | Audits forms for honeypot traps, Akismet integration, reCAPTCHA tuning, and header injection. |
| **Styling & Events** | `cf7-styling` | Provides responsive CSS variables, grid systems, and JS CustomEvent listeners (`wpcf7mailsent`). |

---

## Example Prompts

Try asking Claude Code:

### 1. Form Creation
> *"Create a Contact Form 7 job application form with a resume upload field, position selector, and privacy acceptance checkbox."*

### 2. Mail Configuration & Auditing
> *"Check this form for incorrect mail tags and configure Mail (2) as an autoresponder."*

### 3. Debugging & Deliverability
> *"Debug why my Contact Form 7 emails are not arriving even though the form shows a green success border."*
> *"My form shows an orange border when legitimate users submit. How do I fix this?"*

### 4. Custom Server-Side Validation
> *"Add custom phone-number validation to ensure submitted numbers contain 10-15 digits using safe WordPress hooks."*
> *"Write a PHP hook to restrict form submissions to business emails only, blocking @gmail and @yahoo."*

### 5. Security & Spam Hardening
> *"Review this CF7 setup for security and spam issues, and add a lightweight honeypot field."*

### 6. Styling & Conversion Tracking
> *"Improve the styling of this Contact Form 7 form with a modern 2-column layout and send a Google Analytics 4 event on submission."*

---

## Important Developer Guidelines

When utilizing this plugin:

1. **Inspect Existing Files First**: The assistant always reviews your current theme/plugin files before proposing modifications.
2. **Safe Code Placement**: Custom PHP validation code is placed in your **Child Theme's `functions.php`** or a dedicated **custom plugin**—never in parent themes or core CF7 files.
3. **Smallest Safe Fix**: Proposes targeted fixes without rewriting working configurations.
4. **Standards Compliant**: Uses only official WordPress & Contact Form 7 APIs.

---

## Security Notes

* **No Secret Exposure**: The assistant never includes hardcoded API keys, passwords, or credentials in form code.
* **Header Injection Prevention**: Always sanitizes custom mail headers by stripping newline characters (`\r\n`).
* **Upload Restrictions**: Always specifies explicit `filetypes` and `limit` on `[file]` tags.

---

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details on code style, skill design, and pull request guidelines.

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
