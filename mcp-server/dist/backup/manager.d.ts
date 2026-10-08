/**
 * CF7 Form Backup & Snapshot Manager
 */
import { CF7FormItem, FormSnapshot } from '../wordpress/types.js';
export declare class BackupManager {
    private backupDir;
    constructor(customDir?: string);
    private ensureDirectory;
    /**
     * Create snapshot before modifying a form
     */
    createSnapshot(form: CF7FormItem, note?: string): FormSnapshot;
    /**
     * List all snapshots for a given form ID or all forms
     */
    listSnapshots(formId?: number): FormSnapshot[];
    /**
     * Get specific snapshot by snapshot ID
     */
    getSnapshot(snapshotId: string): FormSnapshot | null;
}
