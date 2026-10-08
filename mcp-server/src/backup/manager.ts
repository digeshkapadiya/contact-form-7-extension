/**
 * CF7 Form Backup & Snapshot Manager
 */

import * as fs from 'fs';
import * as path from 'path';
import { CF7FormItem, FormSnapshot } from '../wordpress/types.js';

export class BackupManager {
  private backupDir: string;

  constructor(customDir?: string) {
    this.backupDir = customDir || path.join(process.cwd(), '.cf7-backups');
    this.ensureDirectory();
  }

  private ensureDirectory(): void {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  /**
   * Create snapshot before modifying a form
   */
  public createSnapshot(form: CF7FormItem, note?: string): FormSnapshot {
    this.ensureDirectory();
    const timestamp = new Date().toISOString();
    const snapshotId = `form_${form.id}_${Date.now()}`;
    const snapshot: FormSnapshot = {
      id: snapshotId,
      formId: form.id,
      timestamp,
      note: note || 'Pre-modification auto backup',
      data: form
    };

    const filePath = path.join(this.backupDir, `${snapshotId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(snapshot, null, 2), 'utf-8');
    return snapshot;
  }

  /**
   * List all snapshots for a given form ID or all forms
   */
  public listSnapshots(formId?: number): FormSnapshot[] {
    this.ensureDirectory();
    const files = fs.readdirSync(this.backupDir).filter(f => f.endsWith('.json'));
    const snapshots: FormSnapshot[] = [];

    for (const file of files) {
      try {
        const content = fs.readFileSync(path.join(this.backupDir, file), 'utf-8');
        const snap = JSON.parse(content) as FormSnapshot;
        if (!formId || snap.formId === formId) {
          snapshots.push(snap);
        }
      } catch {
        // Skip corrupted files
      }
    }

    // Sort newest first
    return snapshots.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  /**
   * Get specific snapshot by snapshot ID
   */
  public getSnapshot(snapshotId: string): FormSnapshot | null {
    this.ensureDirectory();
    const filePath = path.join(this.backupDir, `${snapshotId}.json`);
    if (!fs.existsSync(filePath)) {
      return null;
    }
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content) as FormSnapshot;
    } catch {
      return null;
    }
  }
}
