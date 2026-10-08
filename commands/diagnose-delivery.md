---
description: Diagnose why a Contact Form 7 form's emails are not arriving
argument-hint: [form-id]
---
First call `wp_check_connection`. If no site is connected, stop and connect my WordPress site: ask for the site URL and staging vs production, then use `wp_connect_start` (opens WordPress so I can click Approve) followed by `wp_connect_complete`. Do not continue until connected. Run `cf7_diagnose_delivery` for form `$ARGUMENTS` and walk through the five layers (tags, DMARC/SPF, wp_mail, SMTP, receiver). Identify the failing layer and give concrete next steps, following the cf7-debug-form skill.
