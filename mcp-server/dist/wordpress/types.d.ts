/**
 * TypeScript Interfaces for WordPress & Contact Form 7 REST API
 */
export interface WPConnectionConfig {
    baseUrl: string;
    username?: string;
    applicationPassword?: string;
    authHeader?: string;
    timeoutMs?: number;
}
export interface WPCoreInfo {
    name: string;
    description: string;
    url: string;
    home: string;
    gmt_offset: string;
    timezone_string: string;
    namespaces: string[];
    authentication: Record<string, unknown>;
}
export interface CF7MailConfig {
    active?: boolean;
    subject?: string;
    sender?: string;
    recipient?: string;
    additional_headers?: string;
    body?: string;
    attachments?: string;
    use_html?: boolean;
    exclude_blank?: boolean;
}
export interface CF7MessagesConfig {
    mail_sent_ok?: string;
    mail_sent_ng?: string;
    validation_error?: string;
    spam?: string;
    accept_terms?: string;
    invalid_required?: string;
    invalid_too_long?: string;
    invalid_too_short?: string;
    invalid_date?: string;
    date_too_early?: string;
    date_too_late?: string;
    upload_failed?: string;
    upload_file_type_invalid?: string;
    upload_file_too_large?: string;
    upload_failed_php_error?: string;
    invalid_number?: string;
    number_too_small?: string;
    number_too_large?: string;
    invalid_email?: string;
    invalid_url?: string;
    invalid_tel?: string;
    [key: string]: string | undefined;
}
export interface CF7FormItem {
    id: number;
    slug?: string;
    title: string;
    locale?: string;
    form?: string;
    mail?: CF7MailConfig;
    mail_2?: CF7MailConfig;
    messages?: CF7MessagesConfig;
    additional_settings?: string;
    date?: string;
    modified?: string;
    status?: string;
}
export interface CF7ParsedTag {
    raw: string;
    type: string;
    baseType: string;
    isRequired: boolean;
    name: string;
    options: string[];
    values: string[];
    pipes?: {
        label: string;
        value: string;
    }[];
    isAkismet: boolean;
    akismetType?: 'author' | 'author_email' | 'author_url';
    fileTypes?: string[];
    fileLimit?: string;
}
export interface AuditIssue {
    severity: 'critical' | 'warning' | 'info';
    category: 'tag-mismatch' | 'deliverability' | 'security' | 'validation' | 'accessibility';
    field?: string;
    message: string;
    suggestion: string;
}
export interface AuditReport {
    formId: number;
    formTitle: string;
    healthScore: number;
    totalTags: number;
    issues: AuditIssue[];
    stats: {
        formTagsCount: number;
        mailTagsUsedCount: number;
        hasHoneypot: boolean;
        hasAkismet: boolean;
        hasFileUpload: boolean;
        hasMail2: boolean;
    };
}
export interface FormSnapshot {
    id: string;
    formId: number;
    timestamp: string;
    note?: string;
    data: CF7FormItem;
}
