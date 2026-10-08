---
description: Diagnose why a Contact Form 7 form's emails are not arriving
argument-hint: [form-id]
---
Run `cf7_diagnose_delivery` for form `$ARGUMENTS` and walk through the five layers (tags, DMARC/SPF, wp_mail, SMTP, receiver). Identify the failing layer and give concrete next steps, following the cf7-debug-form skill.
