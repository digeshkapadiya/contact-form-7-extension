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
    version: '1.3.0'
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
