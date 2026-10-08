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
  const server = new McpServer(
    {
      name: 'cf7-developer-assistant',
      version: '1.3.4'
    },
    {
      instructions: [
        'CONNECT FIRST: before any action on a WordPress site (listing, reading, auditing, creating, updating, testing forms), call wp_check_connection.',
        'If it reports connected: false or "No WordPress site connected", STOP. Do not draft-and-create. Ask the user to connect their WordPress site:',
        '(1) preferred: /plugin -> cf7-developer-assistant -> Configure options, enter site URL, username and an Application Password (WordPress admin -> Users -> Profile -> Application Passwords); or',
        '(2) give you the site URL, username and application password so you can call wp_add_site then wp_select_site.',
        'Also ask whether the site is staging or production, and recommend trying staging first. After connecting, call wp_check_connection again and confirm Contact Form 7 was detected before creating or changing anything.',
        'Never create or modify forms on a site the user has not confirmed.'
      ].join('\n')
    }
  );

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
