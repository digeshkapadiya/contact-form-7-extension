/**
 * Standard Reusable CF7 Form Templates for Agencies and Teams
 */
import { CF7FormItem } from '../wordpress/types.js';
export interface FormTemplate {
    id: string;
    name: string;
    category: 'General' | 'Careers' | 'Sales' | 'Support' | 'Marketing';
    description: string;
    data: Omit<CF7FormItem, 'id'>;
}
export declare class TemplateManager {
    private static TEMPLATES;
    static listTemplates(): FormTemplate[];
    static getTemplate(templateId: string): FormTemplate | null;
}
