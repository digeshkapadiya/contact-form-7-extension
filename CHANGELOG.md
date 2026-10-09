# Changelog

All notable changes to the **CF7 Developer Assistant** plugin will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.4.1] - 2026-10-09

### Changed
- The MCP server no longer ships an 827 KB bundled file. It now runs the readable compiled code in `mcp-server/dist`, with `@modelcontextprotocol/sdk` and `zod` installed by Claude Code from the root `package-lock.json`. This keeps every file small and reviewable for the Claude plugin directory.
- Updated `@modelcontextprotocol/sdk` to 1.32.1 (fixes a high-severity advisory). `npm audit` reports 0 vulnerabilities.

### Added
- README section and SECURITY notes that disclose what the plugin runs, reads, sends and stores, including personal data from submissions.

## [1.4.0] - 2026-10-09

### Added
- **Read form submissions from Claude.** New `cf7_get_submissions` and `cf7_submissions_status` tools and a `/submissions` command. Filter by form, search text or date, or fetch one entry in full.
- **CF7 Submissions Bridge** WordPress plugin (`wordpress-plugin/cf7-submissions-bridge`). Stores every valid Contact Form 7 submission in WordPress (even if the email fails) and serves them, plus Flamingo messages, through `/wp-json/cf7-bridge/v1/`. Restricted to administrators and Flamingo message editors; captcha tokens are not stored; uploads keep file names only.
- Integration test that submits a real form and reads it back through both Flamingo and the Bridge.

## [1.3.6] - 2026-10-08

### Fixed
- **Misleading "Using $this when not in object context" error.** Contact Form 7 6.2 turns an unauthorized REST request into a PHP fatal (HTTP 500) instead of a 403. The plugin now explains that it is an authorization problem and lists the real causes (HTTPS, stripped Authorization header, disabled Application Passwords, wrong password, insufficient role) instead of leading users to update or roll back Contact Form 7.

### Added
- `wp_check_connection` now reports `authenticated`, `authenticatedAs` and `authError` by verifying the credentials against the site.
- Integration tests for wrong credentials; integration environment now defaults to Contact Form 7 6.2.

## [1.3.5] - 2026-10-08

### Added
- **One-click browser connection** using WordPress's built-in Application Authorization: `wp_connect_start` opens the site's approval page, the user clicks Approve, and `wp_connect_complete` receives the new Application Password on a loopback-only listener (random per-request token), saves the site, and verifies Contact Form 7. The password is never returned to the model.
- End-to-end integration test that logs into a real WordPress, approves the request, and checks the saved credentials work.

### Changed
- Connect-first instructions, skills and commands now use the browser flow; Configure options and `wp_add_site` remain as fallbacks.
- `.cf7-sites.json` is written with 0600 permissions.

## [1.3.4] - 2026-10-08

### Added
- **Connect-first flow:** the MCP server now sends instructions telling Claude to run `wp_check_connection` and ask the user to connect their WordPress site (URL, username, Application Password, staging vs production) before creating or changing anything. The same step is in the create-form, configure-mail, debug-form, security and validation skills and in every command.
- `/connect` command to link or switch the WordPress site.
- `.cf7-sites.json` and `.cf7-integrations.json` added to `.gitignore`; credential-storage note in `SECURITY.md`.

## [1.3.3] - 2026-10-08

### Added
- `userConfig` in `plugin.json`: Claude Code now prompts for site URL, username and application password (password stored as sensitive).

### Fixed
- With no site configured the server no longer falls back to `http://localhost` and returns a 404; it says to run `wp_add_site` or configure the plugin. Unset or unresolved config values are ignored.
- **Safety:** the site created from `WORDPRESS_URL` was always labeled `local`, which bypassed the production lock on `cf7_test_submission`. It is now `production` unless the URL is localhost/.local/.test.

## [1.3.2] - 2026-10-08

### Fixed
- MCP server crashed on a fresh install; it is now bundled (`mcp-server/bundle/server.mjs`).

## [1.3.1] - 2026-10-08

### Added
- Marketplace manifest (`.claude-plugin/marketplace.json`) and slash commands (`/audit`, `/new-form`, `/health-check`, `/diagnose-delivery`).
- `SECURITY.md`, `.gitignore`.
- Tests for the WordPress client, backup manager, templates and all 21 MCP tools.
- Docker-based integration test against real WordPress + Contact Form 7.
- CI: plugin manifest validation and a check that committed `dist/` is current.

### Fixed
- **Create/update/restore never saved on a real site.** CF7's REST API only persists when the request carries `context: "save"`; the client now sends it.
- **Reads had the wrong shape.** CF7 nests `form`, `mail`, `messages` etc. under `properties` (with `form`/`additional_settings` as `{content}` objects). The client now flattens them, so audits, health checks and diffs see real form data.
- MCP server path now uses `${CLAUDE_PLUGIN_ROOT}`.

## [1.3.0] - 2026-09-24

### Added
- **Phase 4 Integrations & Agency Automation**:
  - **Ecosystem Integration Framework**: Support for Webhook, CRM (HubSpot, Salesforce, Zoho), Google Sheets, and Custom REST API connectors.
  - `cf7_list_integrations`: List active integrations per form and site.
  - `cf7_configure_integration`: Map CF7 fields to external payload parameters with custom transforms (`phone_digits`, `iso_date`, `trim`).
  - `cf7_test_integration`: Pre-flight mapping validator and optional live endpoint HTTP test dispatcher.
  - `cf7_generate_integration_code`: Generates production-ready, non-blocking WordPress PHP hooks (`wpcf7_mail_sent` via `wp_safe_remote_post`).
  - **Agency Template System**:
    - `cf7_list_templates`: Access pre-built templates (`contact-us`, `job-application`, `quote-request`, `support-ticket`).
    - `cf7_apply_template`: Instantly scaffold forms across client sites.
  - **CI/CD Linter & GitHub Actions**:
    - CLI command `cf7-lint` / `npm run lint:cf7` to audit forms and mappings during automated build pipelines.
    - GitHub Actions workflow (`.github/workflows/cf7-audit.yml`).
- Added 4 new unit tests covering integration mapping, tester validation, PHP code generation, and template manager.

## [1.2.0] - 2026-09-24

### Added
- **Phase 3 Advanced Automation, Monitoring & Diagnostics**:
  - **Multi-Site Support**: Manage and audit multiple WordPress sites (`wp_list_sites`, `wp_add_site`, `wp_select_site`) with isolated credentials.
  - **Automated Site-Wide Health Check**: `cf7_health_check` tool scanning all forms on a site and classifying findings into Confirmed Errors, Needs Review, and Clean Forms.
  - **Safe Form Testing Engine**: `cf7_test_submission` tool executing synthetic submissions (valid, invalid email, missing required, custom) with production environment safety locks.
  - **5-Layer Email Delivery Diagnostics**: `cf7_diagnose_delivery` tool evaluating CF7 tags, DMARC/SPF sender compliance, WordPress `wp_mail()`, SMTP providers, and spam filtering.
  - **Snapshot Diff & Comparison Engine**: `cf7_diff_snapshots` tool producing field-by-field comparisons between live forms and saved backups with change explanations.
  - **Analytics Status Inspection**: `cf7_get_analytics` tool auditing submission database logging status (Flamingo / DB logs).
- Added comprehensive unit tests for MultiSiteManager, CF7DeliveryDiagnostics, and CF7DiffEngine.

## [1.1.0] - 2026-09-24

### Added
- **Live WordPress MCP Server**: Production TypeScript MCP server for direct WordPress & CF7 REST API integration.
- 8 Core MCP Tools:
  - `wp_check_connection`: Verify site reachability, core version, and CF7 plugin detection.
  - `cf7_list_forms`: List all forms with IDs and shortcodes.
  - `cf7_get_form`: Retrieve complete form markup, mail tabs, and error messages.
  - `cf7_audit_form`: Automated static diagnostic engine calculating Health Score (0-100) and flagging tag mismatches, DMARC errors, and missing spam protections.
  - `cf7_create_form`: Safely create new forms via REST API.
  - `cf7_update_form`: Update forms with automated pre-modification snapshot creation.
  - `cf7_list_backups` & `cf7_restore_form`: Snapshot rollback and safety management.
- Unit test suite for tag parsing, analyzer diagnostics, and backup manager.

## [1.0.0] - 2026-09-24

### Added
- Initial production release of **CF7 Developer Assistant** for Claude Code.
- Plugin manifest `.claude-plugin/plugin.json` supporting standard Claude Code plugin format.
- 6 Core Skills:
  - `cf7-create-form`: Semantic HTML scaffold, tag reference, pipes syntax, and mail template generator.
  - `cf7-configure-mail`: Deliverability rules, sender domain enforcement, Mail (2) autoresponder, and tag mismatch audit.
  - `cf7-debug-form`: Systematic diagnostic workflow for AJAX issues, REST API blockages, border response code decoding, and SMTP troubleshooting.
  - `cf7-validation`: Built-in attribute validation and safe PHP server-side validation filters (`wpcf7_validate_*`).
  - `cf7-security`: Defense-in-depth spam strategy (Honeypot, Akismet, reCAPTCHA v3 / Turnstile) and file upload hardening.
  - `cf7-styling`: Modern Vanilla CSS design system (CSS variables, responsive grid, status borders) and Vanilla JS DOM event integration.
- Production-ready Examples:
  - Basic Contact Form (`examples/forms/basic-contact-form.md`)
  - Job Application Form with Resume Upload (`examples/forms/job-application-form.md`)
  - Quote & Estimate Request Form (`examples/forms/quote-request-form.md`)
  - Custom Validation Hooks (`examples/php-snippets/custom-validation.php`)
  - Anti-Spam & Security Hooks (`examples/php-snippets/spam-protection-hooks.php`)
  - Dynamic Recipient Routing (`examples/php-snippets/dynamic-recipient-routing.php`)
  - Responsive CSS Stylesheet (`examples/css/modern-cf7-styles.css`)
  - Custom DOM Event Handlers (`examples/js/cf7-event-handlers.js`)
- Comprehensive QA Checklist (`TESTING.md`).
- Community Contribution Guidelines (`CONTRIBUTING.md`).
- MIT License (`LICENSE`).
