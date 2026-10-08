/**
 * Comprehensive Contact Form 7 Form Auditor and Diagnostics Engine
 */
import { CF7FormItem, AuditReport } from '../wordpress/types.js';
export declare class CF7Analyzer {
    private static SPECIAL_MAIL_TAGS;
    static audit(form: CF7FormItem, siteUrl?: string): AuditReport;
}
