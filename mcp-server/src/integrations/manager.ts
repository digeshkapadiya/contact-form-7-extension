/**
 * CF7 Integration Manager
 */

import * as fs from 'fs';
import * as path from 'path';
import { IntegrationConfig } from './types.js';

export class IntegrationManager {
  private configPath: string;
  private integrations: Map<string, IntegrationConfig> = new Map();

  constructor(customConfigPath?: string) {
    this.configPath = customConfigPath || path.join(process.cwd(), '.cf7-integrations.json');
    this.loadIntegrations();
  }

  private loadIntegrations(): void {
    if (fs.existsSync(this.configPath)) {
      try {
        const raw = fs.readFileSync(this.configPath, 'utf-8');
        const data = JSON.parse(raw);
        if (Array.isArray(data)) {
          for (const item of data) {
            this.integrations.set(item.id, item);
          }
        }
      } catch {
        // Skip corrupted file
      }
    }
  }

  private saveIntegrations(): void {
    const list = Array.from(this.integrations.values());
    fs.writeFileSync(this.configPath, JSON.stringify(list, null, 2), 'utf-8');
  }

  public listIntegrations(formId?: number): IntegrationConfig[] {
    const all = Array.from(this.integrations.values());
    if (formId) {
      return all.filter(i => i.formId === formId);
    }
    return all;
  }

  public getIntegration(id: string): IntegrationConfig | null {
    return this.integrations.get(id) || null;
  }

  public saveIntegration(config: Omit<IntegrationConfig, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): IntegrationConfig {
    const id = config.id || `int_${config.formId}_${Date.now()}`;
    const now = new Date().toISOString();
    const existing = this.integrations.get(id);

    const fullConfig: IntegrationConfig = {
      ...config,
      id,
      createdAt: existing ? existing.createdAt : now,
      updatedAt: now
    };

    this.integrations.set(id, fullConfig);
    this.saveIntegrations();
    return fullConfig;
  }

  public removeIntegration(id: string): boolean {
    const deleted = this.integrations.delete(id);
    if (deleted) {
      this.saveIntegrations();
    }
    return deleted;
  }
}
