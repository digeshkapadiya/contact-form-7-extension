---
description: Retrieve stored Contact Form 7 / Flamingo submissions from WordPress
---
First call `wp_check_connection`. If no site is connected, connect it as in `/connect`. Then call `cf7_submissions_status`; if the CF7 Submissions Bridge plugin is missing, explain how to install `wordpress-plugin/cf7-submissions-bridge` and stop. Otherwise call `cf7_get_submissions` for what I asked (form, date range, search text; default: the 10 newest) and present the entries as a table (date, form, name, email, message). Offer to open any entry in full.
