# Security Policy

## Reporting a vulnerability
Email update@optimizedtheme.com with details and reproduction steps. Please do not open public issues for security problems. Expect an acknowledgement within a few days.

## Credentials
The MCP server reads `WORDPRESS_URL`, `WORDPRESS_USERNAME` and `WORDPRESS_APP_PASSWORD` from the environment. Use a WordPress Application Password for a dedicated user, never your login password. Never commit `.env` files.

## Safety defaults
`cf7_test_submission` is locked on production sites, and `cf7_update_form` snapshots to `.cf7-backups/` before writing.

## Stored site credentials
`wp_add_site` saves the site (including its application password) to `.cf7-sites.json` in the folder where Claude Code runs. Prefer the plugin's Configure options, which store the password as a sensitive value. If you do use `wp_add_site`, never commit `.cf7-sites.json` (it is in `.gitignore` here) and revoke the application password when finished.

## Browser connection
`wp_connect_start` runs a temporary HTTP listener bound to `127.0.0.1` only, protected by a random one-time `state` token, and closes it after approval, rejection or 10 minutes. The Application Password is saved to `.cf7-sites.json` (mode 0600) and is never shown to the model. Revoke it any time in WordPress under Users > Profile > Application Passwords (look for "Claude CF7 Developer Assistant").
