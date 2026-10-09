/**
 * Resilient WordPress REST API Client for Contact Form 7
 */
import { WPConnectionConfig, CF7FormItem } from './types.js';
export declare class WordPressClient {
    private baseUrl;
    private authHeader?;
    private timeoutMs;
    constructor(config?: Partial<WPConnectionConfig>);
    private fetchWithTimeout;
    /**
     * 1. Test WordPress Connection and detect installed CF7 namespaces
     */
    checkConnection(): Promise<{
        connected: boolean;
        siteName?: string;
        wpVersion?: string;
        hasCf7: boolean;
        cf7Namespace?: string;
        authenticated?: boolean;
        authenticatedAs?: string;
        authError?: string;
        error?: string;
    }>;
    /**
     * 2. List all Contact Form 7 forms
     */
    listForms(): Promise<CF7FormItem[]>;
    /**
     * 3. Get single form by ID
     */
    getForm(formId: number): Promise<CF7FormItem>;
    /**
     * 4. Create new Contact Form 7 form
     */
    createForm(params: {
        title: string;
        form: string;
        mail?: Partial<CF7FormItem['mail']>;
        mail_2?: Partial<CF7FormItem['mail_2']>;
        messages?: Record<string, string>;
        additional_settings?: string;
    }): Promise<CF7FormItem>;
    /**
     * 5. Update existing Contact Form 7 form
     */
    updateForm(formId: number, params: Partial<Omit<CF7FormItem, 'id'>>): Promise<CF7FormItem>;
    /**
     * 6. Submissions (served by the CF7 Submissions Bridge WordPress plugin)
     */
    private bridgeGet;
    getSubmissionStatus(): Promise<any>;
    listSubmissions(params: {
        form_id?: number;
        search?: string;
        after?: string;
        source?: 'auto' | 'bridge' | 'flamingo';
        per_page?: number;
        page?: number;
        include_spam?: boolean;
    }): Promise<any>;
    getSubmission(id: string): Promise<any>;
}
