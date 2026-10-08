/**
 * Contact Form 7 Configuration Diff & Comparison Engine
 */
import { CF7FormItem } from '../wordpress/types.js';
export interface FormDiffEntry {
    field: string;
    type: 'added' | 'removed' | 'modified' | 'unchanged';
    before?: string;
    after?: string;
    explanation: string;
}
export interface FormComparisonReport {
    formId: number;
    beforeLabel: string;
    afterLabel: string;
    hasChanges: boolean;
    totalDiffs: number;
    diffs: FormDiffEntry[];
}
export declare class CF7DiffEngine {
    static compare(before: CF7FormItem, after: CF7FormItem, beforeLabel?: string, afterLabel?: string): FormComparisonReport;
}
