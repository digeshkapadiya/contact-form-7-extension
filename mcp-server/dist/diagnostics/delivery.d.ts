/**
 * Layered Email Delivery Diagnostic Engine
 */
import { CF7FormItem } from '../wordpress/types.js';
export interface DeliveryDiagnosticLayer {
    layerName: string;
    status: 'healthy' | 'warning' | 'critical' | 'investigate';
    summary: string;
    details: string[];
    recommendations: string[];
}
export interface DeliveryDiagnosticReport {
    formId: number;
    formTitle: string;
    overallDeliveryRisk: 'low' | 'moderate' | 'high' | 'critical';
    layers: DeliveryDiagnosticLayer[];
    nextAction: string;
}
export declare class CF7DeliveryDiagnostics {
    static diagnose(form: CF7FormItem, siteUrl?: string): DeliveryDiagnosticReport;
}
