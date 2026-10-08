import test from 'node:test';
import assert from 'node:assert';
import { CF7Analyzer } from '../dist/audit/analyzer.js';
import { WordPressClient } from '../dist/wordpress/client.js';

const client = new WordPressClient();

test('connects and detects Contact Form 7', async () => {
  const r = await client.checkConnection();
  assert.strictEqual(r.connected, true, r.error);
  assert.strictEqual(r.hasCf7, true);
});

test('create, get, update and list a form on a real site', async () => {
  const created = await client.createForm({
    title: 'IT Form',
    form: '[text* your-name] [email* your-email] [submit "Send"]'
  });
  const id = created.id;
  assert.ok(id, 'form id returned: ' + JSON.stringify(created).slice(0, 600));
  const got = await client.getForm(id);
  assert.strictEqual(got.title, 'IT Form');
  assert.ok(got.form.includes('your-name'), 'form markup is flattened to the top level');
  await client.updateForm(id, { title: 'IT Form 2' });
  assert.strictEqual((await client.getForm(id)).title, 'IT Form 2');
  assert.ok((await client.listForms()).some(f => f.id === id));
});

test('analyzer works on a form fetched from a real site', async () => {
  const [first] = await client.listForms();
  const form = await client.getForm(first.id);
  const audit = CF7Analyzer.audit(form, process.env.WORDPRESS_URL);
  assert.strictEqual(typeof audit.healthScore, 'number');
  assert.ok(Array.isArray(audit.issues));
});

test('wrong credentials are reported clearly (no misleading PHP fatal advice)', async () => {
  const bad = new WordPressClient({ baseUrl: process.env.WORDPRESS_URL, username: 'admin', applicationPassword: 'wrong wrong wrong wrong' });
  const status = await bad.checkConnection();
  assert.strictEqual(status.connected, true);
  assert.strictEqual(status.authenticated, false, 'bad password must not count as authenticated');
  assert.ok(status.authError);
  await assert.rejects(() => bad.createForm({ title: 'x', form: '[submit]' }), err => {
    assert.match(err.message, /not authori[sz]ed|not authenticated|permission denied/i);
    assert.ok(!/\$this when not in object context\s*$/.test(err.message));
    return true;
  });
});

test('good credentials report authenticated', async () => {
  const s = await client.checkConnection();
  assert.strictEqual(s.authenticated, true, s.authError);
});
