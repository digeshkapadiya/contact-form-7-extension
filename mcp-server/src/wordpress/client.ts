/**
 * Resilient WordPress REST API Client for Contact Form 7
 */

import { WPConnectionConfig, WPCoreInfo, CF7FormItem } from './types.js';
import { readEnv } from './env.js';

/**
 * CF7's REST API nests form/mail/mail_2/messages/additional_settings under `properties`.
 * Flatten them so the rest of the codebase can read them at the top level.
 */
function normalizeForm(raw: any): CF7FormItem {
  if (raw && typeof raw === 'object' && raw.properties && typeof raw.properties === 'object') {
    const { properties, ...rest } = raw;
    const flat: Record<string, unknown> = { ...properties, ...rest };
    // On reads CF7 returns `form` and `additional_settings` as { content, ... } objects.
    for (const key of ['form', 'additional_settings']) {
      const v = flat[key] as any;
      if (v && typeof v === 'object' && typeof v.content === 'string') {
        flat[key] = v.content;
      }
    }
    return flat as unknown as CF7FormItem;
  }
  return raw as CF7FormItem;
}

export class WordPressClient {
  private baseUrl: string;
  private authHeader?: string;
  private timeoutMs: number;

  constructor(config?: Partial<WPConnectionConfig>) {
    const rawUrl = config?.baseUrl || readEnv('WORDPRESS_URL') || '';
    this.baseUrl = rawUrl.replace(/\/+$/, '');
    this.timeoutMs = config?.timeoutMs || 15000;

    const username = config?.username || readEnv('WORDPRESS_USERNAME');
    const appPassword = config?.applicationPassword || readEnv('WORDPRESS_APP_PASSWORD');

    if (config?.authHeader) {
      this.authHeader = config.authHeader;
    } else if (username && appPassword) {
      // Basic auth with Application Password
      const token = Buffer.from(`${username}:${appPassword}`).toString('base64');
      this.authHeader = `Basic ${token}`;
    }
  }

  private async fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
    if (!this.baseUrl) {
      throw new Error(
        'No WordPress site connected. Add one with the wp_add_site tool, or configure the plugin (site URL, username, application password).'
      );
    }
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), this.timeoutMs);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(options.headers as Record<string, string> || {})
    };

    if (this.authHeader) {
      headers['Authorization'] = this.authHeader;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal
      });
      return response;
    } finally {
      clearTimeout(id);
    }
  }

  /**
   * 1. Test WordPress Connection and detect installed CF7 namespaces
   */
  public async checkConnection(): Promise<{
    connected: boolean;
    siteName?: string;
    wpVersion?: string;
    hasCf7: boolean;
    cf7Namespace?: string;
    error?: string;
  }> {
    try {
      const wpJsonUrl = `${this.baseUrl}/wp-json/`;
      const res = await this.fetchWithTimeout(wpJsonUrl);

      if (!res.ok) {
        return {
          connected: false,
          hasCf7: false,
          error: `HTTP ${res.status} ${res.statusText}: Failed to access ${wpJsonUrl}`
        };
      }

      const coreInfo = (await res.json()) as WPCoreInfo;
      const namespaces = coreInfo.namespaces || [];
      const cf7Namespace = namespaces.find(ns => ns.startsWith('contact-form-7/'));

      return {
        connected: true,
        siteName: coreInfo.name,
        wpVersion: (coreInfo as any).version || undefined,
        hasCf7: !!cf7Namespace,
        cf7Namespace: cf7Namespace || undefined
      };
    } catch (err: any) {
      return {
        connected: false,
        hasCf7: false,
        error: `Connection error: ${err?.message || String(err)}`
      };
    }
  }

  /**
   * 2. List all Contact Form 7 forms
   */
  public async listForms(): Promise<CF7FormItem[]> {
    const endpoint = `${this.baseUrl}/wp-json/contact-form-7/v1/contact-forms`;
    const res = await this.fetchWithTimeout(endpoint);

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Failed to list CF7 forms (HTTP ${res.status}): ${body}`);
    }

    const data = await res.json();
    return Array.isArray(data) ? data : [];
  }

  /**
   * 3. Get single form by ID
   */
  public async getForm(formId: number): Promise<CF7FormItem> {
    const endpoint = `${this.baseUrl}/wp-json/contact-form-7/v1/contact-forms/${formId}`;
    const res = await this.fetchWithTimeout(endpoint);

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Failed to retrieve form ID ${formId} (HTTP ${res.status}): ${body}`);
    }

    return normalizeForm(await res.json());
  }

  /**
   * 4. Create new Contact Form 7 form
   */
  public async createForm(params: {
    title: string;
    form: string;
    mail?: Partial<CF7FormItem['mail']>;
    mail_2?: Partial<CF7FormItem['mail_2']>;
    messages?: Record<string, string>;
    additional_settings?: string;
  }): Promise<CF7FormItem> {
    const endpoint = `${this.baseUrl}/wp-json/contact-form-7/v1/contact-forms`;
    const res = await this.fetchWithTimeout(endpoint, {
      method: 'POST',
      body: JSON.stringify({ ...params, context: 'save' })
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Failed to create CF7 form (HTTP ${res.status}): ${body}`);
    }

    return normalizeForm(await res.json());
  }

  /**
   * 5. Update existing Contact Form 7 form
   */
  public async updateForm(
    formId: number,
    params: Partial<Omit<CF7FormItem, 'id'>>
  ): Promise<CF7FormItem> {
    const endpoint = `${this.baseUrl}/wp-json/contact-form-7/v1/contact-forms/${formId}`;
    const res = await this.fetchWithTimeout(endpoint, {
      method: 'POST', // CF7 REST API accepts POST for updates
      body: JSON.stringify({ ...params, context: 'save' })
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Failed to update CF7 form ID ${formId} (HTTP ${res.status}): ${body}`);
    }

    return normalizeForm(await res.json());
  }
}
