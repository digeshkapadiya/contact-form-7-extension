---
description: Audit a Contact Form 7 form (tag/mail mismatches, DMARC risk, attachments)
argument-hint: [form-id]
---
First call `wp_check_connection`. If no site is connected, stop and connect my WordPress site: ask for the site URL and staging vs production, then use `wp_connect_start` (opens WordPress so I can click Approve) followed by `wp_connect_complete`. Do not continue until connected. Use the cf7-wordpress MCP tools to audit Contact Form 7 form `$ARGUMENTS`. If no ID is given, call `cf7_list_forms` and ask which form. Run `cf7_audit_form`, then summarize the score, confirmed errors, and review items, and propose fixes. Do not update the form until I approve.
