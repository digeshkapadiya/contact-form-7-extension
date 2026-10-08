/**
 * Safe Contact Form 7 Synthetic Test Submission Engine
 */
import { WordPressClient } from '../wordpress/client.js';
export interface TestSubmissionOptions {
    formId: number;
    mode?: 'valid' | 'invalid_email' | 'missing_required' | 'custom';
    customData?: Record<string, string>;
    confirmProduction?: boolean;
}
export interface TestResult {
    formId: number;
    targetEndpoint: string;
    isProduction: boolean;
    testMode: string;
    status: 'passed' | 'failed' | 'aborted';
    httpStatus: number;
    cf7Status?: string;
    cf7Message?: string;
    invalidFields?: Array<{
        field: string;
        message: string;
    }>;
    diagnosticNotes: string[];
}
export declare class CF7FormTester {
    static testForm(wpClient: WordPressClient, baseUrl: string, options: TestSubmissionOptions): Promise<TestResult>;
}
