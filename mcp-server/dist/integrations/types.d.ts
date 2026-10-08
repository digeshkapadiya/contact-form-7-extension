/**
 * CF7 Integration Framework Types (Webhooks, CRM, Sheets, Custom APIs)
 */
export type IntegrationType = 'webhook' | 'crm' | 'sheets' | 'email' | 'custom';
export interface FieldMapping {
    cf7Field: string;
    targetField: string;
    required?: boolean;
    defaultValue?: string;
    transform?: 'trim' | 'lowercase' | 'uppercase' | 'phone_digits' | 'iso_date';
}
export interface IntegrationAuth {
    type: 'none' | 'bearer' | 'basic' | 'apiKey' | 'customHeader';
    headerName?: string;
    token?: string;
    username?: string;
    password?: string;
    apiKey?: string;
}
export interface IntegrationConfig {
    id: string;
    formId: number;
    name: string;
    type: IntegrationType;
    provider?: string;
    endpointUrl: string;
    httpMethod: 'POST' | 'PUT' | 'PATCH';
    auth: IntegrationAuth;
    fieldMappings: FieldMapping[];
    headers?: Record<string, string>;
    active: boolean;
    createdAt: string;
    updatedAt: string;
}
export interface IntegrationTestResult {
    integrationId: string;
    provider: string;
    endpointUrl: string;
    overallStatus: 'passed' | 'warning' | 'failed';
    checks: {
        authConfigured: boolean;
        endpointReachable: boolean;
        httpStatus?: number;
        responseTimeMs?: number;
        mappingIssues: Array<{
            cf7Field: string;
            targetField: string;
            issue: string;
            severity: 'warning' | 'critical';
        }>;
    };
    samplePayload: Record<string, any>;
    responsePreview?: string;
    diagnosticNotes: string[];
}
export interface IntegrationLogEntry {
    id: string;
    integrationId: string;
    formId: number;
    timestamp: string;
    status: 'success' | 'failed';
    httpStatus?: number;
    durationMs?: number;
    errorMessage?: string;
}
