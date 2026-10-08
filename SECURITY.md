# Security Policy

## Reporting a vulnerability
Email update@optimizedtheme.com with details and reproduction steps. Please do not open public issues for security problems. Expect an acknowledgement within a few days.

## Credentials
The MCP server reads `WORDPRESS_URL`, `WORDPRESS_USERNAME` and `WORDPRESS_APP_PASSWORD` from the environment. Use a WordPress Application Password for a dedicated user, never your login password. Never commit `.env` files.

## Safety defaults
`cf7_test_submission` is locked on production sites, and `cf7_update_form` snapshots to `.cf7-backups/` before writing.
