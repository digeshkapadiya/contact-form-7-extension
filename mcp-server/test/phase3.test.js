import test from 'node:test';
import assert from 'node:assert';
import { MultiSiteManager } from '../dist/multisite/manager.js';
import { CF7DeliveryDiagnostics } from '../dist/diagnostics/delivery.js';
import { CF7DiffEngine } from '../dist/backup/diff.js';
import * as fs from 'fs';
import * as path from 'path';

test('MultiSiteManager: manages multiple site configurations', () => {
  const testConfigFile = path.join(process.cwd(), '.test-sites.json');
  const siteManager = new MultiSiteManager(testConfigFile);

  siteManager.addSite({
    id: 'site-a',
    name: 'Production Store',
    baseUrl: 'https://store.example.com',
    username: 'admin',
    environment: 'production'
  });

  siteManager.addSite({
    id: 'site-b',
    name: 'Staging Shop',
    baseUrl: 'https://staging.example.com',
    username: 'tester',
    environment: 'staging'
  });

  const sites = siteManager.listSites();
  assert.strictEqual(sites.length, 2);

  const switched = siteManager.setActiveSite('site-b');
  assert.strictEqual(switched, true);

  const active = siteManager.getActiveSite();
  assert.strictEqual(active?.id, 'site-b');

  // Clean up
  fs.rmSync(testConfigFile, { force: true });
});

test('CF7DeliveryDiagnostics: evaluates layered email pipeline', () => {
  const sampleForm = {
    id: 50,
    title: 'Inquiry Form',
    form: '[text* name][email* user_email][submit]',
    mail: {
      sender: '[user_email]', // Critical DMARC error
      recipient: 'admin@test.com',
      additional_headers: '' // Missing Reply-To
    }
  };

  const report = CF7DeliveryDiagnostics.diagnose(sampleForm, 'https://mysite.com');
  assert.strictEqual(report.overallDeliveryRisk, 'critical');
  assert.strictEqual(report.layers.length, 5);

  const dmarcLayer = report.layers.find(l => l.layerName.includes('DMARC'));
  assert.strictEqual(dmarcLayer?.status, 'critical');
});

test('CF7DiffEngine: computes difference between form snapshots', () => {
  const v1 = {
    id: 10,
    title: 'Job Form',
    form: '[text your-name][email your-email][submit]',
    mail: {
      sender: 'wordpress@domain.com',
      body: 'Name: [your-name]'
    }
  };

  const v2 = {
    id: 10,
    title: 'Job Form (Updated)',
    form: '[text* your-name][email* your-email][file resume][submit]',
    mail: {
      sender: 'wordpress@domain.com',
      body: 'Name: [your-name]\nEmail: [your-email]'
    }
  };

  const diff = CF7DiffEngine.compare(v1, v2);
  assert.strictEqual(diff.hasChanges, true);
  assert.ok(diff.diffs.length >= 3);

  const titleDiff = diff.diffs.find(d => d.field === 'title');
  assert.strictEqual(titleDiff?.type, 'modified');
});
