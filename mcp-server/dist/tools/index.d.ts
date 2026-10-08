/**
 * Complete MCP Tools Registry for CF7 Developer Assistant (Phase 1, 2, 3, 4)
 */
import { WordPressClient } from '../wordpress/client.js';
import { BackupManager } from '../backup/manager.js';
import { MultiSiteManager } from '../multisite/manager.js';
import { IntegrationManager } from '../integrations/manager.js';
export declare function registerTools(server: any, wpClient: WordPressClient, backupManager: BackupManager, siteManager: MultiSiteManager, integrationManager: IntegrationManager): void;
