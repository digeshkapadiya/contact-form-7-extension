---
description: Connect (or switch) the WordPress site this plugin works on
argument-hint: [site URL]
---
Connect my WordPress site. Ask me for the site URL ($ARGUMENTS if given) and whether it is staging or production (recommend staging first). Then call `wp_connect_start`, which opens the WordPress approval page in my browser, tell me to log in if asked and click "Yes, I approve of this connection", and call `wp_connect_complete`. Report whether Contact Form 7 was detected and list the existing forms. If it fails, explain the likely cause (HTTP instead of HTTPS, Plain permalinks, Contact Form 7 inactive, browser on a different computer). Fall back to `/plugin` -> Configure options or `wp_add_site` only if the browser flow cannot work.
