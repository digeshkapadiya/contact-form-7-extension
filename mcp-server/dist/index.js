#!/usr/bin/env node
/**
 * CF7 Developer Assistant MCP Server Entrypoint (Phase 1, 2, 3, 4)
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { WordPressClient } from './wordpress/client.js';
import { BackupManager } from './backup/manager.js';
import { MultiSiteManager } from './multisite/manager.js';
import { IntegrationManager } from './integrations/manager.js';
import { registerTools } from './tools/index.js';
async function main() {
    const server = new McpServer({
        name: 'cf7-developer-assistant',
        version: '1.4.0'
    }, {
        instructions: [
            'CONNECT FIRST: before any action on a WordPress site (listing, reading, auditing, creating, updating, testing forms), call wp_check_connection.',
            'If it reports connected: false or "No WordPress site connected", STOP. Do not draft-and-create. Ask the user for their site URL and whether it is staging or production (recommend staging first).',
            'Then connect with the browser flow: call wp_connect_start with the URL. It opens the WordPress admin approval page; tell the user to log in if asked and click "Yes, I approve of this connection". Then call wp_connect_complete. No password is copied or pasted.',
            'Fallbacks: /plugin -> cf7-developer-assistant -> Configure options (site URL, username, Application Password), or wp_add_site if the browser is not on the same computer as Claude Code.',
            'wp_check_connection also reports authenticated. If authenticated is false, do NOT try to create or update forms: explain authError to the user and reconnect. A Contact Form 7 "Using $this when not in object context" fatal means the request was not authorized, not that Contact Form 7 needs updating.',
            'After wp_connect_complete reports connected and contactForm7Detected, show the existing forms and only then create or change anything.',
            'Never create or modify forms on a site the user has not confirmed.',
            'To read stored form entries ("show my latest submissions"), use cf7_get_submissions. If it says the CF7 Submissions Bridge plugin is not active, tell the user to install wordpress-plugin/cf7-submissions-bridge; submissions are only captured after it is active. Submissions contain personal data: show only what was asked for.'
        ].join('\n')
    });
    const siteManager = new MultiSiteManager();
    const wpClient = new WordPressClient();
    const backupManager = new BackupManager();
    const integrationManager = new IntegrationManager();
    // Register all 18 CF7 & WordPress MCP tools across Phases 1, 2, 3, and 4
    registerTools(server, wpClient, backupManager, siteManager, integrationManager);
    const transport = new StdioServerTransport();
    await server.connect(transport);
}
main().catch((error) => {
    console.error('Fatal error in CF7 MCP Server:', error);
    process.exit(1);
});
