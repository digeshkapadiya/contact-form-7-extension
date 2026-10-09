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

const AUTH_HELP =
  'WordPress did not accept the credentials. Common causes: (0) the normal WordPress LOGIN password was used; the REST API only accepts an Application Password (Users > Profile > Application Passwords), never the login password; (1) the site is not HTTPS (Application Passwords are disabled over plain HTTP unless the site is local); ' +
  '(2) the host strips the Authorization header (add `RewriteRule .* - [E=HTTP_AUTHORIZATION:%{HTTP:Authorization}]` to .htaccess, or ask the host); ' +
  '(3) a security plugin or host setting disables Application Passwords; (4) the Application Password was revoked or mistyped. ' +
  'Fix: reconnect with wp_connect_start (browser approval) after resolving the above.';

/** Turn raw REST failures into messages that name the real cause. */
function explainHttpFailure(prefix: string, status: number, body: string): Error {
  // Contact Form 7 6.2 has a bug: its "not allowed" branch uses $this inside a static closure,
  // so an UNAUTHORIZED request becomes a PHP fatal (HTTP 500) instead of a 403.
  if (/Using \$this when not in object context/.test(body) && /contact-form-7/.test(body)) {
    return new Error(
      `${prefix} (HTTP ${status}): the request was not authorized. Contact Form 7 6.2 reports this as a PHP fatal ` +
      `("Using $this when not in object context") instead of a 403. Updating or rolling back Contact Form 7 will not fix it. ${AUTH_HELP}`
    );
  }
  if (status === 401) return new Error(`${prefix} (HTTP 401): not authenticated. ${AUTH_HELP}`);
  if (status === 403) {
    return new Error(`${prefix} (HTTP 403): permission denied. The connected WordPress user must be able to edit Contact Form 7 forms (Administrator or Editor). If the user is correct, ${AUTH_HELP}`);
  }
  return new Error(`${prefix} (HTTP ${status}): ${body}`);
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
    authenticated?: boolean;
    authenticatedAs?: string;
    authError?: string;
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

      let authenticated = false;
      let authenticatedAs: string | undefined;
      let authError: string | undefined;
      if (!this.authHeader) {
        authError = 'No credentials are configured for this site. Connect with wp_connect_start.';
      } else {
        try {
          const me = await this.fetchWithTimeout(`${this.baseUrl}/wp-json/wp/v2/users/me?context=edit`);
          if (me.ok) {
            const user = (await me.json()) as any;
            authenticated = true;
            authenticatedAs = user?.slug || user?.name;
            const caps = user?.capabilities;
            if (caps && caps.wpcf7_edit_contact_forms === false) {
              authenticated = false;
              authError = `User "${authenticatedAs}" cannot edit Contact Form 7 forms. Connect as an Administrator or Editor.`;
            }
          } else {
            authError = `HTTP ${me.status}. ${AUTH_HELP}`;
          }
        } catch (e: any) {
          authError = `Could not verify credentials: ${e?.message || String(e)}`;
        }
      }

      return {
        connected: true,
        authenticated,
        authenticatedAs,
        authError,
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
      throw explainHttpFailure(`Failed to list CF7 forms`, res.status, body);
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
      throw explainHttpFailure(`Failed to retrieve form ID ${formId}`, res.status, body);
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
      throw explainHttpFailure(`Failed to create CF7 form`, res.status, body);
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
      throw explainHttpFailure(`Failed to update CF7 form ID ${formId}`, res.status, body);
    }

    return normalizeForm(await res.json());
  }
  /**
   * 6. Submissions (served by the CF7 Submissions Bridge WordPress plugin)
   */
  private async bridgeGet(path: string, params: Record<string, string | number | boolean | undefined> = {}): Promise<any> {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== '') qs.set(k, String(v));
    }
    const query = qs.toString();
    const url = `${this.baseUrl}/wp-json/cf7-bridge/v1${path}${query ? `?${query}` : ''}`;
    const res = await this.fetchWithTimeout(url);
    if (res.ok) return res.json();

    const body = await res.text();
    if (res.status === 404 && /rest_no_route/.test(body)) {
      throw new Error(
        'The CF7 Submissions Bridge plugin is not active on this site. Install and activate wordpress-plugin/cf7-submissions-bridge ' +
        '(zip the folder, then Plugins > Add New > Upload Plugin). It stores new submissions and lets Claude read them, including Flamingo messages.'
      );
    }
    throw explainHttpFailure('Failed to read submissions', res.status, body);
  }

  public getSubmissionStatus(): Promise<any> {
    return this.bridgeGet('/status');
  }

  public listSubmissions(params: {
    form_id?: number;
    search?: string;
    after?: string;
    source?: 'auto' | 'bridge' | 'flamingo';
    per_page?: number;
    page?: number;
    include_spam?: boolean;
  }): Promise<any> {
    return this.bridgeGet('/submissions', params);
  }

  public getSubmission(id: string): Promise<any> {
    return this.bridgeGet(`/submissions/${encodeURIComponent(id)}`);
  }
}
