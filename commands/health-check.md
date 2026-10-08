---
description: Scan every Contact Form 7 form on the active WordPress site
---
First call `wp_check_connection`. If no site is connected, stop and connect my WordPress site: ask for the site URL and staging vs production, then use `wp_connect_start` (opens WordPress so I can click Approve) followed by `wp_connect_complete`. Do not continue until connected. Run `wp_check_connection`, then `cf7_health_check` on the active site. Report Confirmed Errors, Needs Review, and Clean Forms, ordered by severity, with a suggested fix for each.
