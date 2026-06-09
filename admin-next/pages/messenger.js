/**
 * GravFans Messenger Pro — Admin2 cockpit (native Tailwind / settings-panel UX)
 */
(function () {
  const TAG = window.__GRAV_PAGE_TAG || 'grav-messenger--page';
  const BASE_VIEWS = ['display', 'groups', 'giphy', 'moderation', 'forms', 'paint'];
  const TAB_LABELS = {
    display: 'Display',
    groups: 'Chat groups',
    giphy: 'Giphy',
    moderation: 'Moderation',
    forms: 'Form builder',
    paint: 'Paint Shop',
    swag: 'Swag tags',
  };

  const TAB =
    'gfm-tab -mb-px border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground';
  const TAB_ON =
    'gfm-tab -mb-px border-b-2 border-primary px-4 py-2.5 text-sm font-medium text-primary transition-colors';
  const VIEW = 'gfm-view hidden';
  const VIEW_ON = 'gfm-view block px-6 py-5';
  const INPUT =
    'flex h-9 w-full min-w-[12rem] max-w-xs rounded-md border border-input bg-muted/50 px-3 py-1 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring';
  const CARD_INPUT =
    'flex h-9 w-full rounded-md border border-input bg-muted/50 px-2.5 py-1 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring';
  const PILL =
    'mm-pill min-w-[4.25rem] border-0 bg-transparent px-3.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground';
  const PILL_ON =
    'mm-pill min-w-[4.25rem] border-0 bg-primary px-3.5 py-1.5 text-xs font-medium text-primary-foreground';

  const CONFIG_API = '/messenger/admin/config';

  const LAUNCHER_EMOJIS = [
    '💬', '📢', '🎉', '🔥', '👋', '❤️', '🩵', '💯', '🚀', '🍕', '☕', '🧪',
    '👾', '✨', '🌐', '📣', '🎮', '🎵', '😀', '😍', '🥹', '🪽', '🧡', '💜',
  ];

  const POSITIONS = [
    { id: 'bottom-right', label: 'Bottom right' },
    { id: 'bottom-left', label: 'Bottom left' },
    { id: 'top-right', label: 'Top right' },
    { id: 'top-left', label: 'Top left' },
  ];

  function apiCfg() {
    return {
      serverUrl: window.__GRAV_API_SERVER_URL || window.__GRAV_CONFIG__?.serverUrl || '',
      apiPrefix: window.__GRAV_API_PREFIX || window.__GRAV_CONFIG__?.apiPrefix || '/api/v1',
      token: window.__GRAV_API_TOKEN || null,
    };
  }

  function apiUrl(path) {
    const c = apiCfg();
    const origin = (c.serverUrl || window.location.origin || '').replace(/\/+$/, '');
    const prefix = c.apiPrefix || '/api/v1';
    const base = `${origin}${prefix.startsWith('/') ? prefix : `/${prefix}`}`.replace(/\/+$/, '');
    return `${base}${path.startsWith('/') ? path : `/${path}`}`;
  }

  function pluginAssetUrl(subpath) {
    const base = (apiCfg().serverUrl || window.location.origin || '').replace(/\/+$/, '');
    return `${base}/user/plugins/messenger/${subpath.replace(/^\//, '')}`;
  }

  function paintShopScriptUrl() {
    return pluginAssetUrl('admin-next/fields/mud-messenger-paint-shop.js');
  }

  function ensurePaintShopScript() {
    return new Promise((resolve, reject) => {
      if (customElements.get('mud-messenger-paint-shop')) {
        resolve();
        return;
      }
      const existing = document.querySelector('script[data-mm-paint-shop]');
      if (existing) {
        existing.addEventListener('load', () => resolve(), { once: true });
        existing.addEventListener('error', () => reject(new Error('Paint Shop script failed')), { once: true });
        return;
      }
      const s = document.createElement('script');
      s.src = paintShopScriptUrl();
      s.setAttribute('data-mm-paint-shop', '1');
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('Paint Shop script failed'));
      document.head.appendChild(s);
    });
  }

  async function api(path, options) {
    const c = apiCfg();
    const headers = { Accept: 'application/json', ...(options?.headers || {}) };
    if (!(options?.body instanceof FormData)) headers['Content-Type'] = 'application/json';
    if (c.token) headers['X-API-Token'] = c.token;
    const res = await fetch(apiUrl(path), { ...options, headers, credentials: 'include' });
    const json = await res.json();
    const data = json.data !== undefined ? json.data : json;
    if (!res.ok) throw new Error(data.detail || data.error || data.message || `HTTP ${res.status}`);
    return data;
  }

  function esc(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /** Mirror Paint Shop accent resolution for admin UI previews (not JavaBean primary). */
  function resolveThemeVars(cfg, presets) {
    const presetId = cfg?.theme_preset || 'default';
    const preset = (presets || []).find((p) => p.id === presetId) || presets?.[0];
    const vars = { ...(preset?.vars || {}) };
    const usePreset = cfg?.theme_use_preset_accent !== false;
    const hue = cfg?.theme_accent_hue;
    if (!usePreset && hue != null && hue !== '') {
      const h = Math.max(0, Math.min(360, Number(hue) || 0));
      const s = Math.max(0, Math.min(100, Number(cfg.theme_accent_saturation ?? 85)));
      vars['--mm-accent'] = `hsl(${h} ${s}% 45%)`;
      vars['--mm-accent-dark'] = `hsl(${h} ${s}% 35%)`;
    }
    return vars;
  }

  function ensureLauncherPreviewStyles() {
    if (document.getElementById('mm-launcher-preview-style')) return;
    const s = document.createElement('style');
    s.id = 'mm-launcher-preview-style';
    s.textContent = `
      [data-launcher-preview] {
        display: grid !important;
        place-items: center !important;
        width: 3.5rem !important;
        height: 3.5rem !important;
        min-width: 3.5rem;
        min-height: 3.5rem;
        border-radius: 999px;
        line-height: 1;
        padding: 0;
        box-sizing: border-box;
        flex-shrink: 0;
      }
      [data-launcher-preview-icon] {
        display: block;
        line-height: 1;
        font-size: 1.35rem;
        text-align: center;
      }
    `;
    document.head.appendChild(s);
  }

  function launcherPreviewCss(cfg, presets) {
    const vars = resolveThemeVars(cfg, presets);
    const accent = vars['--mm-accent'] || '#0082c0';
    const accentDark = vars['--mm-accent-dark'] || '#006699';
    const preset = cfg?.theme_preset || 'default';
    let shadow = '0 12px 40px rgb(0 0 0 / 0.18)';
    if (preset === 'goggrav') shadow = '0 12px 36px rgb(226 17 17 / 0.35)';
    return {
      background: `linear-gradient(135deg, ${accent}, ${accentDark})`,
      color: '#fff',
      boxShadow: shadow,
      border: 'none',
    };
  }

  function settingRow(label, help, control) {
    return `
      <div class="grid gap-3 border-b border-border py-4 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start sm:gap-6">
        <div class="min-w-0">
          <div class="text-sm font-semibold text-foreground">${esc(label)}</div>
          ${help ? `<div class="mt-1 text-xs leading-relaxed text-muted-foreground">${help}</div>` : ''}
        </div>
        <div class="min-w-[12rem] sm:justify-self-end">${control}</div>
      </div>`;
  }

  function toggleRow(key, label, help, on, yesLabel, noLabel) {
    const y = yesLabel || 'Yes';
    const n = noLabel || 'No';
    return settingRow(label, help, `
      <div class="inline-flex overflow-hidden rounded-md border border-border" data-toggle-key="${esc(key)}">
        <input type="checkbox" data-k="${esc(key)}" class="mm-pills-input hidden" ${on ? 'checked' : ''}>
        <button type="button" class="${on ? PILL_ON : PILL} mm-pill-yes" data-bool="1">${esc(y)}</button>
        <button type="button" class="${!on ? PILL_ON : PILL} mm-pill-no border-l border-border" data-bool="0">${esc(n)}</button>
      </div>`);
  }

  function textRow(key, label, value, placeholder, type) {
    return settingRow(label, '', `
      <input class="${INPUT}" type="${type || 'text'}" data-k="${esc(key)}" value="${esc(value || '')}" placeholder="${esc(placeholder || '')}" autocomplete="${type === 'password' ? 'off' : 'on'}">`);
  }

  function selectRow(key, label, options, value) {
    const opts = options.map((o) => {
      const id = typeof o === 'string' ? o : o.id;
      const lab = typeof o === 'string' ? o : o.label;
      return `<option value="${esc(id)}" ${value === id ? 'selected' : ''}>${esc(lab)}</option>`;
    }).join('');
    return settingRow(label, '', `<select class="${INPUT}" data-k="${esc(key)}">${opts}</select>`);
  }

  function ensureAdminCockpitScript() {
    return new Promise((resolve, reject) => {
      if (window.MudMessengerAdminCockpit) {
        window.MudMessengerAdminCockpit.ensure().then(resolve).catch(reject);
        return;
      }
      const existing = document.querySelector('script[data-mm-admin-cockpit-loader]');
      if (existing) {
        existing.addEventListener('load', () => {
          window.MudMessengerAdminCockpit?.ensure().then(resolve).catch(reject);
        }, { once: true });
        existing.addEventListener('error', () => reject(new Error('Cockpit loader failed')), { once: true });
        return;
      }
      const s = document.createElement('script');
      s.src = pluginAssetUrl('assets/mud-messenger-admin-cockpit.js');
      s.defer = true;
      s.setAttribute('data-mm-admin-cockpit-loader', '1');
      s.onload = () => {
        window.MudMessengerAdminCockpit?.ensure().then(resolve).catch(reject);
      };
      s.onerror = () => reject(new Error('Cockpit loader failed'));
      document.head.appendChild(s);
    });
  }

  function normalizeList(raw) {
    if (Array.isArray(raw)) return raw;
    if (raw && typeof raw === 'object') return Object.values(raw);
    return [];
  }

  function normalizeGroups(raw) {
    if (Array.isArray(raw)) {
      return raw.map((g) => ({
        id: String(g.id || g.slug || ''),
        title: String(g.title || ''),
        emoji: String(g.emoji || '💬'),
        description: String(g.description || ''),
      }));
    }
    if (raw && typeof raw === 'object') {
      return Object.entries(raw).map(([id, g]) => ({
        id,
        title: String(g?.title || id),
        emoji: String(g?.emoji || '💬'),
        description: String(g?.description || ''),
      }));
    }
    return [];
  }

  class MessengerAdminPage extends HTMLElement {
    connectedCallback() {
      if (this._booted) return;
      this._booted = true;
      this._view = 'display';
      this._cfg = {};
      this._views = [...BASE_VIEWS];
      this._swagStoreEnabled = false;
      this._swagProducts = [];
      this._presets = [];
      this._fonts = [];
      this._etag = '';
      this._liveTimer = null;
      this.className = 'flex h-full min-h-0 flex-col text-foreground';
      this.innerHTML = `
        <div class="flex h-full min-h-[28rem] flex-col">
          <nav class="flex shrink-0 flex-wrap border-b border-border px-6" data-tabs role="tablist"></nav>
          <div class="min-h-0 flex-1 overflow-y-auto" data-views></div>
          <div class="shrink-0 border-t border-border px-6 py-3">
            <p class="min-h-[1.2em] text-xs text-muted-foreground" data-status></p>
            <button type="button" class="mt-2 inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90" data-save>Save settings</button>
          </div>
        </div>`;
      this._els = {
        tabs: this.querySelector('[data-tabs]'),
        views: this.querySelector('[data-views]'),
        status: this.querySelector('[data-status]'),
      };
      this._views.forEach((id) => this._addViewTab(id));
      this.querySelector('[data-save]').addEventListener('click', () => this._save().catch((e) => this._status(e.message, true)));
      this.addEventListener('input', (e) => {
        if (e.target.matches('[data-k], [data-mod], [data-form], [data-swag], [data-group]')) this._scheduleLivePreview();
      });
      this.addEventListener('change', (e) => {
        if (e.target.matches('[data-k], [data-mod], [data-form], [data-swag], [data-group], .mm-pills-input')) this._scheduleLivePreview();
      });
      this._load().catch((e) => this._status(e.message, true));
      ensureAdminCockpitScript().catch(() => {});
      this._switch('display');
    }

    disconnectedCallback() {
      clearTimeout(this._liveTimer);
    }

    _status(msg, err) {
      this._els.status.textContent = msg || '';
      this._els.status.classList.toggle('text-destructive', !!err);
      this._els.status.classList.toggle('text-muted-foreground', !err);
    }

    _applyConfigPayload(payload) {
      const data = payload?.config !== undefined ? payload : { config: payload };
      this._cfg = data.config || {};
      this._giphyKeySet = !!data.giphy_key_set;
      this._giphyKeyMasked = data.giphy_key_masked || '';
    }

    _assetUrl(path) {
      if (!path) return '';
      if (/^https?:\/\//i.test(path) || path.startsWith('//')) return path;
      const origin = (apiCfg().serverUrl || window.location.origin || '').replace(/\/+$/, '');
      return `${origin}${path.startsWith('/') ? path : `/${path}`}`;
    }

    _viewEl(id) {
      return this._els.views.querySelector(`.gfm-view[data-view="${id}"]`);
    }

    _addViewTab(id) {
      if (this._els.tabs.querySelector(`[data-view="${id}"]`)) return;
      const tab = document.createElement('button');
      tab.type = 'button';
      tab.role = 'tab';
      tab.className = TAB;
      tab.dataset.view = id;
      tab.textContent = TAB_LABELS[id] || id;
      tab.addEventListener('click', () => this._switch(id));
      const paintTab = this._els.tabs.querySelector('[data-view="paint"]');
      if (id === 'swag' && paintTab) {
        this._els.tabs.insertBefore(tab, paintTab);
      } else {
        this._els.tabs.appendChild(tab);
      }
      const view = document.createElement('div');
      view.className = VIEW;
      view.dataset.view = id;
      view.role = 'tabpanel';
      const paintView = this._els.views.querySelector('[data-view="paint"]');
      if (id === 'swag' && paintView) {
        this._els.views.insertBefore(view, paintView);
      } else {
        this._els.views.appendChild(view);
      }
    }

    async _detectSwagStore() {
      try {
        const res = await fetch(apiUrl('/config/plugins/swag-store'), {
          headers: { Accept: 'application/json', ...(apiCfg().token ? { 'X-API-Token': apiCfg().token } : {}) },
          credentials: 'include',
        });
        if (!res.ok) return;
        const json = await res.json();
        const cfg = json.data !== undefined ? json.data : json;
        this._swagStoreEnabled = cfg.enabled !== false;
      } catch {
        this._swagStoreEnabled = false;
      }
      if (!this._swagStoreEnabled) return;
      if (!this._views.includes('swag')) {
        this._views.splice(this._views.indexOf('paint'), 0, 'swag');
        this._addViewTab('swag');
      }
      try {
        const cat = await api('/swag-cockpit/admin/catalog');
        this._swagProducts = Array.isArray(cat.products) ? cat.products : [];
      } catch {
        this._swagProducts = [];
      }
    }

    _switch(id) {
      this._view = id;
      this._els.tabs.querySelectorAll('.gfm-tab').forEach((t) => {
        t.className = t.dataset.view === id ? TAB_ON : TAB;
        t.setAttribute('aria-selected', t.dataset.view === id ? 'true' : 'false');
      });
      this._els.views.querySelectorAll('.gfm-view').forEach((v) => {
        v.className = v.dataset.view === id ? VIEW_ON : VIEW;
      });
      if (id === 'paint') {
        this._renderPaint().catch((e) => this._status(e.message, true));
      }
      if (id === 'swag') {
        this._renderSwag();
      }
      if (id === 'groups') {
        this._renderGroups();
      }
    }

    _bindTogglePills(root) {
      root.querySelectorAll('[data-toggle-key]').forEach((wrap) => {
        const input = wrap.querySelector('.mm-pills-input');
        if (!input) return;
        const yes = wrap.querySelector('.mm-pill-yes');
        const no = wrap.querySelector('.mm-pill-no');
        const sync = (on) => {
          yes.className = `${on ? PILL_ON : PILL} mm-pill-yes`;
          no.className = `${!on ? PILL_ON : PILL} mm-pill-no border-l border-border`;
        };
        wrap.querySelectorAll('.mm-pill').forEach((btn) => {
          btn.addEventListener('click', () => {
            const on = btn.getAttribute('data-bool') === '1';
            input.checked = on;
            sync(on);
            input.dispatchEvent(new Event('change', { bubbles: true }));
          });
        });
      });
    }

    async _load() {
      const [cfgRes, presetData] = await Promise.all([
        fetch(apiUrl(CONFIG_API), {
          headers: { Accept: 'application/json', ...(apiCfg().token ? { 'X-API-Token': apiCfg().token } : {}) },
          credentials: 'include',
        }),
        api('/messenger/admin/theme-presets').catch(() => ({ presets: [], fonts: [] })),
      ]);
      const json = await cfgRes.json();
      if (!cfgRes.ok) {
        throw new Error(json.detail || json.title || json.error || `HTTP ${cfgRes.status}`);
      }
      this._applyConfigPayload(json.data !== undefined ? json.data : json);
      this._presets = presetData.presets || [];
      this._fonts = presetData.fonts || [];
      if (this._cfg.theme_use_preset_accent === undefined) this._cfg.theme_use_preset_accent = true;
      if (!this._cfg.theme_density) this._cfg.theme_density = 'comfy';
      if (!this._cfg.theme_radius) this._cfg.theme_radius = 'default';
      if (!this._cfg.theme_font) this._cfg.theme_font = 'inter';
      if (this._cfg.theme_accent_saturation == null) this._cfg.theme_accent_saturation = 85;
      if (!this._cfg.launcher_icon) this._cfg.launcher_icon = '💬';
      if (!this._cfg.launcher_position) this._cfg.launcher_position = 'bottom-right';
      await this._detectSwagStore();
      this._renderDisplay();
      this._renderGroups();
      this._renderGiphy();
      this._renderMod();
      this._renderForms();
      if (this._swagStoreEnabled) this._renderSwag();
      this._renderPaint().catch(() => {});
      this._scheduleLivePreview();
      this._status(`Loaded · ${this._presets.length} paint presets`);
    }

    _liveDraft() {
      try {
        return this._collect();
      } catch {
        return this._paintDraft();
      }
    }

    _scheduleLivePreview() {
      clearTimeout(this._liveTimer);
      this._liveTimer = setTimeout(() => {
        try {
          const draft = this._liveDraft();
          if (window.MudMessengerAdminCockpit) {
            window.MudMessengerAdminCockpit.preview(draft);
          } else {
            window.dispatchEvent(new CustomEvent('mm-admin-cockpit-preview', { detail: draft }));
          }
        } catch (e) {
          this._status(`Live preview: ${e.message}`, true);
        }
      }, 220);
    }

    _renderDisplay() {
      ensureLauncherPreviewStyles();
      const root = this._viewEl('display');
      const icon = this._cfg.launcher_icon || '💬';
      const showFooter = this._cfg.show_footer_branding !== false;
      root.innerHTML = `<div class="max-w-4xl">
        ${textRow('brand_title', 'Panel title', this._cfg.brand_title || '', 'GravFans Messenger Pro')}
        ${toggleRow('float_bubble', 'Show floating chat bubble', 'Launcher bubble on public site pages.', this._cfg.float_bubble !== false, 'Yes', 'No')}
        ${toggleRow('admin_cockpit_bubble', 'Show chat bubble in Admin2', 'Floating launcher on all admin pages while you work.', this._cfg.admin_cockpit_bubble !== false, 'Yes', 'No')}
        ${selectRow('launcher_position', 'Chatbox position', POSITIONS, this._cfg.launcher_position || 'bottom-right')}
        <div class="border-b border-border py-4">
          <div class="text-sm font-semibold text-foreground">Bubble icon</div>
          <div class="mt-1 text-xs text-muted-foreground">Pick the emoji shown on the floating launcher.</div>
          <input type="hidden" data-k="launcher_icon" value="${esc(icon)}">
          <div class="mt-3 flex max-w-xs flex-wrap gap-1.5" data-launcher-emojis></div>
          <div class="mt-3" data-launcher-preview aria-hidden="true"><span data-launcher-preview-icon>${esc(icon)}</span></div>
        </div>
        ${toggleRow('show_footer_branding', 'Show &quot;Powered by&quot; footer', 'Branding line in the messenger panel footer.', showFooter, 'Yes', 'No')}
        <div data-footer-fields ${showFooter ? '' : 'hidden'}>
          ${textRow('footer_text', 'Footer text', this._cfg.footer_text || 'Powered by GravFans.Live', '')}
          ${textRow('footer_url', 'Footer URL', this._cfg.footer_url || 'https://gravfans.live', 'https://')}
        </div>
        ${this._cfg.edition === 'pro' ? settingRow(
          'Thread background image',
          'Watermark behind the message list. Leave empty for preset default (GetGRAV! logo on goggrav).',
          this._threadBgUploaderHtml()
        ) : ''}
      </div>`;

      this._bindTogglePills(root);
      const grid = root.querySelector('[data-launcher-emojis]');
      const hidden = root.querySelector('[data-k="launcher_icon"]');
      const preview = root.querySelector('[data-launcher-preview]');
      const emojiCls =
        'inline-flex items-center justify-center rounded-md border border-border bg-muted/50 px-2 py-1 text-lg hover:bg-accent';
      const emojiOn = `${emojiCls} border-primary bg-primary/10`;
      LAUNCHER_EMOJIS.forEach((em) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = em === icon ? emojiOn : emojiCls;
        btn.textContent = em;
        btn.addEventListener('click', () => {
          hidden.value = em;
          this._cfg.launcher_icon = em;
          grid.querySelectorAll('button').forEach((b) => {
            b.className = b === btn ? emojiOn : emojiCls;
          });
          const iconEl = preview?.querySelector('[data-launcher-preview-icon]');
          if (iconEl) iconEl.textContent = em;
          this._syncLauncherPreview();
          this._scheduleLivePreview();
        });
        grid.appendChild(btn);
      });

      const footerInput = root.querySelector('[data-k="show_footer_branding"]');
      const footerFields = root.querySelector('[data-footer-fields]');
      footerInput?.addEventListener('change', () => {
        if (footerFields) footerFields.hidden = !footerInput.checked;
      });
      this._bindThreadBgUploader(root);
      this._syncLauncherPreview();
    }

    _threadBgUploaderHtml() {
      const url = this._cfg.thread_background_image || '';
      const previewSrc = url ? this._assetUrl(url) : '';
      return `<div data-thread-bg-uploader>
        <input type="hidden" data-k="thread_background_image" value="${esc(url)}">
        <div class="flex flex-wrap items-start gap-3">
          <div class="grid h-24 w-40 place-items-center overflow-hidden rounded-md border border-dashed border-border bg-muted/30 p-2" data-thread-bg-preview>
            ${previewSrc
    ? `<img src="${esc(previewSrc)}" alt="" class="max-h-full max-w-full object-contain opacity-80">`
    : '<span class="px-2 text-center text-xs text-muted-foreground">Preset default</span>'}
          </div>
          <div class="flex flex-col gap-2">
            <label class="inline-flex cursor-pointer items-center rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent">
              Upload image
              <input type="file" class="hidden" data-thread-bg-file accept="image/*,.svg">
            </label>
            <button type="button" class="text-left text-xs text-muted-foreground hover:text-foreground" data-thread-bg-clear ${url ? '' : 'hidden'}>Remove custom</button>
          </div>
        </div>
      </div>`;
    }

    _syncThreadBgPreview() {
      const wrap = this._viewEl('display')?.querySelector('[data-thread-bg-uploader]');
      if (!wrap) return;
      const hidden = wrap.querySelector('[data-k="thread_background_image"]');
      const preview = wrap.querySelector('[data-thread-bg-preview]');
      const clearBtn = wrap.querySelector('[data-thread-bg-clear]');
      const url = hidden?.value || '';
      if (clearBtn) clearBtn.hidden = !url;
      if (!preview) return;
      if (!url) {
        preview.innerHTML = '<span class="px-2 text-center text-xs text-muted-foreground">Preset default</span>';
        return;
      }
      const src = this._assetUrl(url);
      preview.innerHTML = `<img src="${esc(src)}" alt="" class="max-h-full max-w-full object-contain opacity-80">`;
    }

    _bindThreadBgUploader(root) {
      const wrap = root.querySelector('[data-thread-bg-uploader]');
      if (!wrap) return;
      const hidden = wrap.querySelector('[data-k="thread_background_image"]');
      const fileInput = wrap.querySelector('[data-thread-bg-file]');
      const clearBtn = wrap.querySelector('[data-thread-bg-clear]');

      fileInput?.addEventListener('change', () => {
        const file = fileInput.files?.[0];
        fileInput.value = '';
        if (!file) return;
        this._uploadThreadBackground(file)
          .then((url) => {
            if (hidden) hidden.value = url;
            this._cfg.thread_background_image = url;
            this._syncThreadBgPreview();
            this._scheduleLivePreview();
            this._status('Background image uploaded — save settings to keep');
          })
          .catch((err) => this._status(err.message, true));
      });

      clearBtn?.addEventListener('click', () => {
        if (hidden) hidden.value = '';
        this._cfg.thread_background_image = '';
        this._syncThreadBgPreview();
        this._scheduleLivePreview();
      });
    }

    async _uploadThreadBackground(file) {
      const fd = new FormData();
      fd.append('file', file);
      const headers = { Accept: 'application/json' };
      if (apiCfg().token) headers['X-API-Token'] = apiCfg().token;
      const res = await fetch(apiUrl('/messenger/admin/thread-background'), {
        method: 'POST',
        headers,
        body: fd,
        credentials: 'include',
      });
      const json = await res.json();
      const data = json.data !== undefined ? json.data : json;
      if (!res.ok) throw new Error(data.detail || data.error || data.message || `HTTP ${res.status}`);
      return data.url || data.path || '';
    }

    _syncLauncherPreview() {
      const preview = this._viewEl('display')?.querySelector('[data-launcher-preview]');
      if (!preview) return;
      const style = launcherPreviewCss(this._paintDraft(), this._presets);
      Object.assign(preview.style, style);
    }

    _groupDefaultOptions() {
      const root = this._viewEl('groups');
      const ids = [];
      root?.querySelectorAll('[data-group-index]').forEach((row) => {
        const id = row.querySelector('[data-group="id"]')?.value.trim();
        if (id) ids.push(id);
      });
      if (!ids.length) {
        normalizeGroups(this._cfg.groups).forEach((g) => {
          if (g.id) ids.push(g.id);
        });
      }
      return ids.map((id) => ({ id, label: id }));
    }

    _groupCard(g, index) {
      const id = g.id || '';
      const emoji = g.emoji || '💬';
      const emojiCls =
        'inline-flex items-center justify-center rounded-md border border-border bg-muted/50 px-2 py-1 text-lg hover:bg-accent';
      const emojiOn = `${emojiCls} border-primary bg-primary/10`;
      const emojiBtns = LAUNCHER_EMOJIS.map((em) =>
        `<button type="button" class="${em === emoji ? emojiOn : emojiCls}" data-group-emoji="${esc(em)}">${esc(em)}</button>`
      ).join('');
      return `<article class="rounded-lg border border-border bg-card p-3 shadow-sm" data-group-index="${index}">
        <div class="mb-2 flex items-center justify-between gap-2">
          <span class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Group ${index + 1}</span>
          <button type="button" class="text-xs text-destructive hover:underline" data-remove-group>Remove</button>
        </div>
        <div class="grid gap-2 sm:grid-cols-2">
          <label class="block"><span class="mb-1 block text-xs font-medium text-muted-foreground">Group id</span>
            <input class="${CARD_INPUT}" data-group="id" value="${esc(id)}" placeholder="general"></label>
          <label class="block"><span class="mb-1 block text-xs font-medium text-muted-foreground">Title</span>
            <input class="${CARD_INPUT}" data-group="title" value="${esc(g.title || '')}" placeholder="General"></label>
        </div>
        <label class="mt-2 block"><span class="mb-1 block text-xs font-medium text-muted-foreground">Description</span>
          <input class="${CARD_INPUT}" data-group="description" value="${esc(g.description || '')}" placeholder="Site-wide hangout"></label>
        <div class="mt-3">
          <div class="text-xs font-medium text-muted-foreground">Emoji</div>
          <input type="hidden" data-group="emoji" value="${esc(emoji)}">
          <div class="mt-1.5 flex max-w-md flex-wrap gap-1" data-group-emojis>${emojiBtns}</div>
        </div>
      </article>`;
    }

    _bindGroupCards(root) {
      root.querySelectorAll('[data-group-index]').forEach((card) => {
        const hidden = card.querySelector('[data-group="emoji"]');
        const grid = card.querySelector('[data-group-emojis]');
        grid?.querySelectorAll('[data-group-emoji]').forEach((btn) => {
          btn.addEventListener('click', () => {
            const em = btn.getAttribute('data-group-emoji') || '💬';
            if (hidden) hidden.value = em;
            grid.querySelectorAll('[data-group-emoji]').forEach((b) => {
              b.className = b === btn
                ? 'inline-flex items-center justify-center rounded-md border border-primary bg-primary/10 px-2 py-1 text-lg hover:bg-accent'
                : 'inline-flex items-center justify-center rounded-md border border-border bg-muted/50 px-2 py-1 text-lg hover:bg-accent';
            });
            this._scheduleLivePreview();
          });
        });
        card.querySelector('[data-remove-group]')?.addEventListener('click', () => {
          card.remove();
          this._refreshGroupDefaultSelect();
          this._scheduleLivePreview();
        });
      });
    }

    _refreshGroupDefaultSelect() {
      const root = this._viewEl('groups');
      const sel = root?.querySelector('[data-k="default_group"]');
      if (!sel) return;
      const current = sel.value;
      const opts = this._groupDefaultOptions();
      sel.innerHTML = opts.map((o) =>
        `<option value="${esc(o.id)}" ${current === o.id ? 'selected' : ''}>${esc(o.label)}</option>`
      ).join('');
    }

    _renderGroups() {
      const groups = normalizeGroups(this._cfg.groups);
      const root = this._viewEl('groups');
      const defaultOpts = (groups.length ? groups : [{ id: 'general', title: 'General' }])
        .map((g) => ({ id: g.id, label: g.title ? `${g.title} (${g.id})` : g.id }));
      root.innerHTML = `<div class="w-full max-w-none">
        ${selectRow('default_group', 'Default group', defaultOpts, this._cfg.default_group || 'general')}
        <p class="mt-1 text-xs text-muted-foreground">Which channel opens first when chat loads.</p>
        <div class="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2" data-group-list>${groups.length ? groups.map((g, i) => this._groupCard(g, i)).join('') : ''}</div>
        ${groups.length ? '' : '<p class="mt-3 text-xs text-muted-foreground">No groups yet — add one below.</p>'}
        <button type="button" class="mt-3 inline-flex items-center rounded-md border border-dashed border-border px-4 py-2 text-sm text-muted-foreground hover:border-primary/40 hover:text-foreground" data-add-group>+ Add chat group</button>
      </div>`;
      this._bindGroupCards(root);
      root.querySelector('[data-add-group]')?.addEventListener('click', () => {
        const list = root.querySelector('[data-group-list]');
        const empty = root.querySelector('p.text-muted-foreground');
        if (empty && empty.textContent.includes('No groups yet')) empty.remove();
        const idx = list.querySelectorAll('[data-group-index]').length;
        list.insertAdjacentHTML('beforeend', this._groupCard({ emoji: '💬' }, idx));
        this._bindGroupCards(root);
        this._refreshGroupDefaultSelect();
      });
      root.querySelectorAll('[data-group="id"]').forEach((inp) => {
        inp.addEventListener('input', () => this._refreshGroupDefaultSelect());
      });
    }

    _renderGiphy() {
      const masked = this._giphyKeyMasked || (this._giphyKeySet ? '••••••••' : '');
      const root = this._viewEl('giphy');
      root.innerHTML = `<div class="max-w-4xl">
        ${toggleRow('giphy_enabled', 'Enable GIF picker', 'Giphy key is proxied server-side — never shipped to browsers.', this._cfg.giphy_enabled !== false, 'Enabled', 'Disabled')}
        ${textRow('giphy_api_key', 'API key', '', masked || 'Paste from developers.giphy.com', 'password')}
      </div>`;
      this._bindTogglePills(root);
    }

    _swagProductOptions(selectedId) {
      const opts = ['<option value="">Pick a product…</option>'];
      this._swagProducts.forEach((p) => {
        const id = String(p.id || '');
        if (!id) return;
        const label = String(p.title || p.name || id);
        opts.push(`<option value="${esc(id)}" ${selectedId === id ? 'selected' : ''}>${esc(label)}</option>`);
      });
      return opts.join('');
    }

    _swagCard(row, index) {
      const tag = row.tag || '';
      const productId = row.product_id || '';
      return `<article class="rounded-lg border border-border bg-card p-3 shadow-sm" data-swag-index="${index}">
        <div class="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tag ${index + 1}</div>
        <div class="grid gap-2 sm:grid-cols-2">
          <label class="block"><span class="mb-1 block text-xs font-medium text-muted-foreground">Tag slug</span>
            <input class="${CARD_INPUT}" data-swag="tag" value="${esc(tag)}" placeholder="getgrav-tee"></label>
          <label class="block"><span class="mb-1 block text-xs font-medium text-muted-foreground">Swag product</span>
            <select class="${CARD_INPUT}" data-swag="product_id">${this._swagProductOptions(productId)}</select></label>
        </div>
        <p class="mt-2 text-xs text-muted-foreground">Chat shortcode: <code>:${esc(tag || 'tag')}:</code></p>
      </article>`;
    }

    _renderSwag() {
      if (!this._swagStoreEnabled) return;
      const tags = normalizeList(this._cfg.swag_tags);
      const root = this._viewEl('swag');
      if (!root) return;
      root.innerHTML = `<div class="w-full max-w-none">
        ${toggleRow('swag_tags_enabled', 'Enable swag tags', 'Admins & moderators get the 🛍 picker — guests can still see tags in messages.', this._cfg.swag_tags_enabled !== false, 'Enabled', 'Disabled')}
        ${toggleRow('swag_tags_mod_only', 'Mods only (picker)', 'When on, only admins/moderators can insert swag tags (recommended).', this._cfg.swag_tags_mod_only !== false, 'Yes', 'No')}
        <p class="mt-2 text-xs text-muted-foreground">${this._swagProducts.length} products in catalog · sync from Swag Store admin if empty.</p>
        <div class="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2" data-swag-list>${tags.length ? tags.map((t, i) => this._swagCard(t, i)).join('') : ''}</div>
        ${tags.length ? '' : '<p class="mt-3 text-xs text-muted-foreground">No swag tags yet — add one below.</p>'}
        <button type="button" class="mt-3 inline-flex items-center rounded-md border border-dashed border-border px-4 py-2 text-sm text-muted-foreground hover:border-primary/40 hover:text-foreground" data-add-swag>+ Add swag tag</button>
      </div>`;
      this._bindTogglePills(root);
      root.querySelector('[data-add-swag]')?.addEventListener('click', () => {
        const list = root.querySelector('[data-swag-list]');
        const empty = root.querySelector('p.text-muted-foreground');
        if (empty && empty.textContent.includes('No swag tags')) empty.remove();
        const idx = list.querySelectorAll('[data-swag-index]').length;
        list.insertAdjacentHTML('beforeend', this._swagCard({}, idx));
      });
    }

    _modCard(m, index) {
      return `<article class="rounded-lg border border-border bg-card p-3 shadow-sm" data-mod-index="${index}">
        <div class="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Moderator ${index + 1}</div>
        <div class="space-y-2">
          <label class="block"><span class="mb-1 block text-xs font-medium text-muted-foreground">Chat display name</span><input class="${CARD_INPUT}" data-mod="username" value="${esc(m.username || '')}"></label>
          <label class="block"><span class="mb-1 block text-xs font-medium text-muted-foreground">Grav account (optional)</span><input class="${CARD_INPUT}" data-mod="grav_user" value="${esc(m.grav_user || '')}" placeholder="chief — skips mod key when logged in"></label>
          <label class="block"><span class="mb-1 block text-xs font-medium text-muted-foreground">Mod key (guest / no Grav login)</span><input class="${CARD_INPUT}" data-mod="mod_key" value="${esc(m.mod_key || '')}"></label>
          <label class="flex items-center gap-2 text-xs text-foreground"><input type="checkbox" data-mod="can_launch_forms" ${m.can_launch_forms !== false ? 'checked' : ''}> Can launch forms</label>
        </div>
      </article>`;
    }

    _renderMod() {
      const mods = normalizeList(this._cfg.moderators);
      const root = this._viewEl('moderation');
      root.innerHTML = `<div class="w-full max-w-none">
        ${toggleRow('moderation_enabled', 'Enable moderation tools', 'Admin2 users auto-mod. Community mods use display name + mod key, or link a Grav account.', !!this._cfg.moderation_enabled, 'Enabled', 'Disabled')}
        <div class="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2" data-mod-list>${mods.length ? mods.map((m, i) => this._modCard(m, i)).join('') : ''}</div>
        ${mods.length ? '' : '<p class="mt-3 text-xs text-muted-foreground">No moderators yet — add one below.</p>'}
        <button type="button" class="mt-3 inline-flex items-center rounded-md border border-dashed border-border px-4 py-2 text-sm text-muted-foreground hover:border-primary/40 hover:text-foreground" data-add-mod>+ Add moderator</button>
      </div>`;
      this._bindTogglePills(root);
      root.querySelector('[data-add-mod]')?.addEventListener('click', () => {
        const list = root.querySelector('[data-mod-list]');
        const empty = root.querySelector('.text-muted-foreground');
        if (empty && empty.textContent.includes('No moderators')) empty.remove();
        const idx = list.querySelectorAll('[data-mod-index]').length;
        list.insertAdjacentHTML('beforeend', this._modCard({}, idx));
      });
    }

    _formCard(f, index) {
      const tplOpts = ['survey', 'lead_gen', 'booking'].map((t) =>
        `<option value="${t}" ${f.template === t ? 'selected' : ''}>${t}</option>`
      ).join('');
      return `<article class="flex min-w-0 flex-col gap-2.5 rounded-lg border border-border bg-card p-3 shadow-sm" data-form-index="${index}">
        <div class="flex items-center justify-between gap-2">
          <span class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Form ${index + 1}</span>
          <label class="flex items-center gap-1.5 whitespace-nowrap text-xs text-foreground"><input type="checkbox" data-form="enabled" ${f.enabled !== false ? 'checked' : ''}> On</label>
        </div>
        <label class="block"><span class="mb-1 block text-xs font-medium text-muted-foreground">ID</span><input class="${CARD_INPUT}" data-form="id" value="${esc(f.id || '')}" placeholder="rsvp-survey"></label>
        <label class="block"><span class="mb-1 block text-xs font-medium text-muted-foreground">Title</span><input class="${CARD_INPUT}" data-form="title" value="${esc(f.title || '')}"></label>
        <label class="block"><span class="mb-1 block text-xs font-medium text-muted-foreground">Template</span><select class="${CARD_INPUT}" data-form="template">${tplOpts}</select></label>
        <label class="block"><span class="mb-1 block text-xs font-medium text-muted-foreground">Intro</span><textarea class="${CARD_INPUT} min-h-[4rem] resize-y py-2" data-form="intro" rows="2">${esc(f.intro || '')}</textarea></label>
      </article>`;
    }

    _renderForms() {
      const forms = normalizeList(this._cfg.forms);
      const root = this._viewEl('forms');
      root.innerHTML = `<div class="w-full max-w-none">
        ${toggleRow('forms_enabled', 'Enable form builder', 'Launch surveys and lead-gen flows from the messenger toolbar.', !!this._cfg.forms_enabled, 'Enabled', 'Disabled')}
        <div class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" data-form-list>${forms.map((f, i) => this._formCard(f, i)).join('')}</div>
        ${forms.length ? '' : '<p class="mt-3 text-xs text-muted-foreground">No forms yet — add one below.</p>'}
        <button type="button" class="mt-3 inline-flex items-center rounded-md border border-dashed border-border px-4 py-2 text-sm text-muted-foreground hover:border-primary/40 hover:text-foreground" data-add-form>+ Add form</button>
      </div>`;
      this._bindTogglePills(root);
      root.querySelector('[data-add-form]')?.addEventListener('click', () => {
        const list = root.querySelector('[data-form-list]');
        const empty = root.querySelector('p.text-muted-foreground');
        if (empty && empty.textContent.includes('No forms yet')) empty.remove();
        const idx = list.querySelectorAll('[data-form-index]').length;
        list.insertAdjacentHTML('beforeend', this._formCard({}, idx));
      });
    }

    _paintDraft() {
      const shop = this._viewEl('paint')?.querySelector('mud-messenger-paint-shop');
      if (shop && shop.draft) return { ...this._cfg, ...shop.draft };
      return { ...this._cfg };
    }

    async _renderPaint() {
      await ensurePaintShopScript();
      const root = this._viewEl('paint');
      root.innerHTML = `
        <div class="max-w-2xl">
          <p class="mb-3 text-xs text-muted-foreground">JavaBean Paint Shop · ${this._fonts.length || 14} fonts · live preview updates the floating chat bubble</p>
          <mud-messenger-paint-shop></mud-messenger-paint-shop>
        </div>`;
      const shop = root.querySelector('mud-messenger-paint-shop');
      shop.presets = this._presets;
      shop.fonts = this._fonts;
      shop.config = this._cfg;
      shop.addEventListener('mm-paint-change', () => {
        Object.assign(this._cfg, shop.draft);
        this._syncLauncherPreview();
        this._scheduleLivePreview();
        const label = this._presets.find((p) => p.id === shop.draft.theme_preset)?.label || shop.draft.theme_preset;
        this._status(`Paint Shop · ${label}`);
      });
    }

    _collect() {
      const patch = this._paintDraft();
      this.querySelectorAll('[data-k]').forEach((el) => {
        const k = el.getAttribute('data-k');
        if (!k) return;
        if (el.type === 'checkbox') patch[k] = el.checked;
        else if (el.type === 'number') patch[k] = el.value === '' ? null : Number(el.value);
        else if (el.type === 'password') { if (el.value) patch[k] = el.value; }
        else patch[k] = el.value;
      });
      const mods = [];
      this._viewEl('moderation')?.querySelectorAll('[data-mod-index]').forEach((row) => {
        const m = {};
        row.querySelectorAll('[data-mod]').forEach((inp) => {
          m[inp.getAttribute('data-mod')] = inp.type === 'checkbox' ? inp.checked : inp.value;
        });
        if (m.username) mods.push(m);
      });
      patch.moderators = mods;
      const forms = [];
      this._viewEl('forms')?.querySelectorAll('[data-form-index]').forEach((row) => {
        const f = {};
        row.querySelectorAll('[data-form]').forEach((inp) => {
          f[inp.getAttribute('data-form')] = inp.type === 'checkbox' ? inp.checked : inp.value;
        });
        if (f.id) forms.push(f);
      });
      patch.forms = forms;
      const groupView = this._viewEl('groups');
      if (groupView) {
        const groupsObj = {};
        groupView.querySelectorAll('[data-group-index]').forEach((row) => {
          const g = {};
          row.querySelectorAll('[data-group]').forEach((inp) => {
            g[inp.getAttribute('data-group')] = inp.value;
          });
          const id = String(g.id || '').trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
          if (!id) return;
          groupsObj[id] = {
            title: String(g.title || id).trim(),
            emoji: String(g.emoji || '💬').trim() || '💬',
            description: String(g.description || '').trim(),
          };
        });
        if (Object.keys(groupsObj).length) patch.groups = groupsObj;
      }
      const swagView = this._viewEl('swag');
      if (swagView) {
        const swagRows = [];
        swagView.querySelectorAll('[data-swag-index]').forEach((row) => {
          const t = {};
          row.querySelectorAll('[data-swag]').forEach((inp) => {
            t[inp.getAttribute('data-swag')] = inp.value;
          });
          if (t.tag && t.product_id) swagRows.push(t);
        });
        patch.swag_tags = swagRows;
      }
      return patch;
    }

    async _save() {
      const patch = this._collect();
      const headers = { Accept: 'application/json', 'Content-Type': 'application/json' };
      if (apiCfg().token) headers['X-API-Token'] = apiCfg().token;
      const res = await fetch(apiUrl(CONFIG_API), {
        method: 'PATCH', headers, body: JSON.stringify(patch), credentials: 'include',
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.detail || json.title || json.error || json.message || `HTTP ${res.status}`);
      this._applyConfigPayload(json.data !== undefined ? json.data : json);
      this._renderGiphy();
      this._syncThreadBgPreview();
      if (window.MudMessengerAdminCockpit) {
        if (this._cfg.admin_cockpit_bubble === false) {
          window.MudMessengerAdminCockpit.destroy();
        } else {
          window.MudMessengerAdminCockpit.refresh();
        }
      } else if (this._cfg.admin_cockpit_bubble === false) {
        window.dispatchEvent(new CustomEvent('mm-admin-cockpit-refresh'));
      } else {
        window.dispatchEvent(new CustomEvent('mm-admin-cockpit-refresh'));
      }
      this._status('Saved — hard refresh /community for live site changes');
    }
  }

  if (!customElements.get(TAG)) customElements.define(TAG, MessengerAdminPage);
})();
