---
description: Create a new Contact Form 7 form with a matching mail template
argument-hint: [description of the form]
---
First call `wp_check_connection`. If no site is connected, stop and ask me to connect my WordPress site (URL, username, Application Password, and staging vs production; suggest `/plugin` -> Configure options, or use `wp_add_site`). Do not continue until connected. Follow the cf7-create-form and cf7-configure-mail skills to design a form for: $ARGUMENTS. Show me the form markup and mail template first. After I approve, create it with `cf7_create_form` (or `cf7_apply_template` if a template fits).
