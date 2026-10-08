/**
 * Multi-Site Configuration Manager for WordPress & CF7
 */
import * as fs from 'fs';
import * as path from 'path';
export class MultiSiteManager {
    configPath;
    sites = new Map();
    activeSiteId;
    constructor(customConfigPath) {
        this.configPath = customConfigPath || path.join(process.cwd(), '.cf7-sites.json');
        this.loadSites();
    }
    loadSites() {
        // 1. Load from primary environment variables as default site
        const envUrl = process.env.WORDPRESS_URL;
        if (envUrl) {
            this.sites.set('default', {
                id: 'default',
                name: 'Default Environment Site',
                baseUrl: envUrl,
                username: process.env.WORDPRESS_USERNAME,
                applicationPassword: process.env.WORDPRESS_APP_PASSWORD,
                environment: 'local'
            });
            this.activeSiteId = 'default';
        }
        // 2. Load stored site registry file if exists
        if (fs.existsSync(this.configPath)) {
            try {
                const raw = fs.readFileSync(this.configPath, 'utf-8');
                const data = JSON.parse(raw);
                if (Array.isArray(data.sites)) {
                    for (const s of data.sites) {
                        this.sites.set(s.id, s);
                    }
                }
                if (data.activeSiteId && this.sites.has(data.activeSiteId)) {
                    this.activeSiteId = data.activeSiteId;
                }
            }
            catch {
                // Skip corrupted config file
            }
        }
    }
    saveSites() {
        const list = Array.from(this.sites.values());
        const data = {
            activeSiteId: this.activeSiteId,
            sites: list
        };
        fs.writeFileSync(this.configPath, JSON.stringify(data, null, 2), 'utf-8');
    }
    listSites() {
        return Array.from(this.sites.values()).map(s => ({
            id: s.id,
            name: s.name,
            baseUrl: s.baseUrl,
            username: s.username,
            environment: s.environment,
            isActive: s.id === this.activeSiteId,
            hasAuth: !!(s.applicationPassword || s.authHeader)
        }));
    }
    getActiveSite() {
        if (!this.activeSiteId || !this.sites.has(this.activeSiteId)) {
            if (this.sites.size > 0) {
                return this.sites.values().next().value || null;
            }
            return null;
        }
        return this.sites.get(this.activeSiteId) || null;
    }
    getSite(siteId) {
        return this.sites.get(siteId) || null;
    }
    addSite(config) {
        this.sites.set(config.id, config);
        if (!this.activeSiteId) {
            this.activeSiteId = config.id;
        }
        this.saveSites();
    }
    removeSite(siteId) {
        const existed = this.sites.delete(siteId);
        if (this.activeSiteId === siteId) {
            this.activeSiteId = this.sites.size > 0 ? this.sites.keys().next().value : undefined;
        }
        this.saveSites();
        return existed;
    }
    setActiveSite(siteId) {
        if (!this.sites.has(siteId)) {
            return false;
        }
        this.activeSiteId = siteId;
        this.saveSites();
        return true;
    }
}
