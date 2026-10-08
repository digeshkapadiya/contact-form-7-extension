/**
 * Multi-Site Configuration Manager for WordPress & CF7
 */
import { WPConnectionConfig } from '../wordpress/types.js';
export interface SiteConfig extends WPConnectionConfig {
    id: string;
    name: string;
    environment?: 'production' | 'staging' | 'local';
}
export declare class MultiSiteManager {
    private configPath;
    private sites;
    private activeSiteId?;
    constructor(customConfigPath?: string);
    private loadSites;
    private saveSites;
    listSites(): Array<Omit<SiteConfig, 'applicationPassword'> & {
        isActive: boolean;
        hasAuth: boolean;
    }>;
    getActiveSite(): SiteConfig | null;
    getSite(siteId: string): SiteConfig | null;
    addSite(config: SiteConfig): void;
    removeSite(siteId: string): boolean;
    setActiveSite(siteId: string): boolean;
}
