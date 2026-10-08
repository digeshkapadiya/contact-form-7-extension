/**
 * CF7 Submission Analytics and Log Reader
 */
import { WordPressClient } from '../wordpress/client.js';
export interface AnalyticsReport {
    hasSubmissionStorage: boolean;
    storageProvider?: 'Flamingo' | 'CFDB7' | 'None';
    totalLoggedSubmissions?: number;
    notes: string[];
}
export declare class CF7AnalyticsReader {
    static checkAnalytics(wpClient: WordPressClient): Promise<AnalyticsReport>;
}
