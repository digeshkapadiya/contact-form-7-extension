/**
 * CF7 Integration Manager
 */
import { IntegrationConfig } from './types.js';
export declare class IntegrationManager {
    private configPath;
    private integrations;
    constructor(customConfigPath?: string);
    private loadIntegrations;
    private saveIntegrations;
    listIntegrations(formId?: number): IntegrationConfig[];
    getIntegration(id: string): IntegrationConfig | null;
    saveIntegration(config: Omit<IntegrationConfig, 'id' | 'createdAt' | 'updatedAt'> & {
        id?: string;
    }): IntegrationConfig;
    removeIntegration(id: string): boolean;
}
