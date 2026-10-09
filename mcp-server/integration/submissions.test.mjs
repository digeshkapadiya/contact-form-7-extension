import test from 'node:test';
import assert from 'node:assert';
import { WordPressClient } from '../dist/wordpress/client.js';

const client = new WordPressClient();

test('submissions are stored and readable through Flamingo and the Bridge', async () => {
  const form = await client.createForm({
    title: 'Sub Form',
    form: '[text* your-name] [email* your-email] [textarea your-message] [submit "Send"]'
  });
  const body = new FormData();
  body.set('your-name', 'Ann Tester');
  body.set('your-email', 'ann@example.com');
  body.set('your-message', 'Hello from the integration test');
  body.set('_wpcf7_unit_tag', `wpcf7-f${form.id}-p1-o1`);
  const res = await fetch(`${process.env.WORDPRESS_URL}/wp-json/contact-form-7/v1/contact-forms/${form.id}/feedback`, { method: 'POST', body });
  assert.ok(res.ok, 'feedback accepted: ' + res.status);

  const status = await client.getSubmissionStatus();
  assert.strictEqual(status.flamingo_active, true);
  assert.strictEqual(status.default_source, 'flamingo');

  for (const source of ['flamingo', 'bridge']) {
    const list = await client.listSubmissions({ form_id: form.id, source });
    assert.strictEqual(list.source, source);
    assert.strictEqual(list.total, 1, `${source}: ${JSON.stringify(list).slice(0, 500)}`);
    const item = list.items[0];
    assert.strictEqual(item.fields['your-name'], 'Ann Tester');
    assert.strictEqual(item.fields['your-email'], 'ann@example.com');
    assert.ok(!Object.keys(item.fields).some(k => k.startsWith('_')), 'no internal fields leak');
    const one = await client.getSubmission(item.id);
    assert.strictEqual(one.fields['your-message'], 'Hello from the integration test');
  }

  assert.strictEqual((await client.listSubmissions({ form_id: form.id, search: 'nomatchxyz' })).total, 0);
  assert.strictEqual((await client.listSubmissions({ form_id: 999999 })).total, 0, 'unknown form matches nothing');
});

test('submissions are refused without valid credentials', async () => {
  const anon = new WordPressClient({ baseUrl: process.env.WORDPRESS_URL, username: 'admin', applicationPassword: 'wrong wrong wrong wrong' });
  await assert.rejects(() => anon.listSubmissions({}), /401|403|not authori|permission/i);
});
