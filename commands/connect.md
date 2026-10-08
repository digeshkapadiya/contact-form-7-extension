---
description: Connect (or switch) the WordPress site this plugin works on
argument-hint: [site URL]
---
Help me connect a WordPress site. Ask me for anything missing: site URL ($ARGUMENTS if given), whether it is staging or production, WordPress username, and an Application Password (WordPress admin -> Users -> Profile -> Application Passwords). Recommend `/plugin` -> cf7-developer-assistant -> Configure options for storing them, or register the site with `wp_add_site` and `wp_select_site`. Then run `wp_check_connection` and `cf7_list_forms` and tell me whether Contact Form 7 was detected and which forms exist. If it fails, explain the likely cause (HTTP vs HTTPS, Plain permalinks, Contact Form 7 inactive, wrong password).
