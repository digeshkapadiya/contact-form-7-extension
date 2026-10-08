import test from 'node:test';
import assert from 'node:assert';
import { CF7TagParser } from '../dist/audit/tag-parser.js';
import { CF7Analyzer } from '../dist/audit/analyzer.js';
import { BackupManager } from '../dist/backup/manager.js';
import * as fs from 'fs';
import * as path from 'path';

test('CF7TagParser: correctly parses form tags', () => {
  const formHtml = `
    <label>Name [text* your-name placeholder "John"]</label>
    <label>Email [email* your-email akismet:author_email]</label>
    <label>Resume [file* your-resume filetypes:pdf|docx limit:5mb]</label>
    <label>Department [select* dept "Sales|sales@test.com" "Support|support@test.com"]</label>
    [submit "Send"]
  `;

  const tags = CF7TagParser.parseFormTags(formHtml);
  assert.strictEqual(tags.length, 5);

  const nameTag = tags.find(t => t.name === 'your-name');
  assert.ok(nameTag);
  assert.strictEqual(nameTag.isRequired, true);
  assert.strictEqual(nameTag.baseType, 'text');

  const emailTag = tags.find(t => t.name === 'your-email');
  assert.ok(emailTag);
  assert.strictEqual(emailTag.isAkismet, true);
  assert.strictEqual(emailTag.akismetType, 'author_email');

  const fileTag = tags.find(t => t.name === 'your-resume');
  assert.ok(fileTag);
  assert.deepStrictEqual(fileTag.fileTypes, ['pdf', 'docx']);
  assert.strictEqual(fileTag.fileLimit, '5mb');

  const selectTag = tags.find(t => t.name === 'dept');
  assert.ok(selectTag);
  assert.strictEqual(selectTag.pipes?.length, 2);
  assert.strictEqual(selectTag.pipes[0].value, 'sales@test.com');
});

test('CF7Analyzer: detects tag mismatches and deliverability issues', () => {
  const faultyForm = {
    id: 101,
    title: 'Test Contact Form',
    form: `
      [text* user-name]
      [email* user-email]
      [file* user-cv]
      [submit "Send"]
    `,
    mail: {
      active: true,
      sender: '[user-email]', // Faulty: using user email in sender causes DMARC failure
      recipient: 'admin@mysite.com',
      subject: 'New contact from [missing-tag]', // Faulty: missing tag
      body: 'Name: [user-name]',
      attachments: '' // Faulty: user-cv not in attachments
    }
  };

  const audit = CF7Analyzer.audit(faultyForm);
  assert.ok(audit.healthScore < 60);

  const mismatch = audit.issues.find(i => i.category === 'tag-mismatch' && i.field === 'missing-tag');
  assert.ok(mismatch, 'Should flag missing-tag');

  const deliverability = audit.issues.find(i => i.category === 'deliverability' && i.field === 'sender');
  assert.ok(deliverability, 'Should flag DMARC risk on sender');

  const fileCheck = audit.issues.find(i => i.field === 'user-cv');
  assert.ok(fileCheck, 'Should flag user-cv missing from attachments');
});

test('BackupManager: creates snapshot and retrieves it', () => {
  const testDir = path.join(process.cwd(), '.test-backups');
  const manager = new BackupManager(testDir);

  const sampleForm = {
    id: 999,
    title: 'Sample Form',
    form: '[text* name][submit]'
  };

  const snap = manager.createSnapshot(sampleForm, 'Unit test backup');
  assert.ok(snap.id);
  assert.strictEqual(snap.formId, 999);

  const retrieved = manager.getSnapshot(snap.id);
  assert.ok(retrieved);
  assert.strictEqual(retrieved.data.title, 'Sample Form');

  const list = manager.listSnapshots(999);
  assert.strictEqual(list.length, 1);

  // Clean up test dir
  fs.rmSync(testDir, { recursive: true, force: true });
});
