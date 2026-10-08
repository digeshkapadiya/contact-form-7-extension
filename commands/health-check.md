---
description: Scan every Contact Form 7 form on the active WordPress site
---
First call `wp_check_connection`. If no site is connected, stop and ask me to connect my WordPress site (URL, username, Application Password, and staging vs production; suggest `/plugin` -> Configure options, or use `wp_add_site`). Do not continue until connected. Run `wp_check_connection`, then `cf7_health_check` on the active site. Report Confirmed Errors, Needs Review, and Clean Forms, ordered by severity, with a suggested fix for each.
