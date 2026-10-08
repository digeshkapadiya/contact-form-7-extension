/**
 * CF7 Integration Manager
 */
import * as fs from 'fs';
import * as path from 'path';
export class IntegrationManager {
    configPath;
    integrations = new Map();
    constructor(customConfigPath) {
        this.configPath = customConfigPath || path.join(process.cwd(), '.cf7-integrations.json');
        this.loadIntegrations();
    }
    loadIntegrations() {
        if (fs.existsSync(this.configPath)) {
            try {
                const raw = fs.readFileSync(this.configPath, 'utf-8');
                const data = JSON.parse(raw);
                if (Array.isArray(data)) {
                    for (const item of data) {
                        this.integrations.set(item.id, item);
                    }
                }
            }
            catch {
                // Skip corrupted file
            }
        }
    }
    saveIntegrations() {
        const list = Array.from(this.integrations.values());
        fs.writeFileSync(this.configPath, JSON.stringify(list, null, 2), 'utf-8');
    }
    listIntegrations(formId) {
        const all = Array.from(this.integrations.values());
        if (formId) {
            return all.filter(i => i.formId === formId);
        }
        return all;
    }
    getIntegration(id) {
        return this.integrations.get(id) || null;
    }
    saveIntegration(config) {
        const id = config.id || `int_${config.formId}_${Date.now()}`;
        const now = new Date().toISOString();
        const existing = this.integrations.get(id);
        const fullConfig = {
            ...config,
            id,
            createdAt: existing ? existing.createdAt : now,
            updatedAt: now
        };
        this.integrations.set(id, fullConfig);
        this.saveIntegrations();
        return fullConfig;
    }
    removeIntegration(id) {
        const deleted = this.integrations.delete(id);
        if (deleted) {
            this.saveIntegrations();
        }
        return deleted;
    }
}
