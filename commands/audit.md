---
description: Audit a Contact Form 7 form (tag/mail mismatches, DMARC risk, attachments)
argument-hint: [form-id]
---
Use the cf7-wordpress MCP tools to audit Contact Form 7 form `$ARGUMENTS`. If no ID is given, call `cf7_list_forms` and ask which form. Run `cf7_audit_form`, then summarize the score, confirmed errors, and review items, and propose fixes. Do not update the form until I approve.
