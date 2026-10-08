/**
 * CF7 Integration Tester and Pre-Flight Validation Engine
 */
import { IntegrationConfig, IntegrationTestResult } from './types.js';
import { CF7FormItem } from '../wordpress/types.js';
export declare class IntegrationTester {
    static testIntegration(integration: IntegrationConfig, form?: CF7FormItem, sendLiveRequest?: boolean): Promise<IntegrationTestResult>;
    private static getSampleValue;
}
