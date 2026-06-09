/**
 * GravFans Messenger — Admin2 floating chat bubble (all admin pages).
 */
(function () {
  'use strict';

  const ROOT_ID = 'mud-messenger-admin-cockpit';
  const CSS_ATTR = 'data-mm-admin-cockpit-css';
  const FONT_ATTR = 'data-mm-admin-cockpit-font';
  const CUSTOM_ATTR = 'data-mm-admin-cockpit-custom';
  const JS_ATTR = 'data-mm-admin-cockpit-js';
  const BOOT_ATTR = 'data-mm-admin-cockpit-boot';

  let bootPromise = null;
  let previewTimer = null;

  function shouldShowCockpit(draft) {
    if (draft && typeof draft === 'object' && draft.admin_cockpit_bubble === false) {
      return false;
    }
    return true;
  }

  function waitForApiToken(maxMs) {
    const limit = maxMs || 45000;
    const start = Date.now();
    return new Promise((resolve) => {
      (function tick() {
        if (apiCfg().token || Date.now() - start > limit) {
          resolve();
          return;
        }
        setTimeout(tick, 80);
      })();
    });
  }

  function apiCfg() {
    const cfg = window.__GRAV_CONFIG__ || {};
    return {
      serverUrl: window.__GRAV_API_SERVER_URL || cfg.serverUrl || '',
      apiPrefix: window.__GRAV_API_PREFIX || cfg.apiPrefix || '/api/v1',
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

  function whenAdminApiReady(fn, maxMs) {
    const limit = maxMs || 15000;
    const start = Date.now();
    (function tick() {
      if (apiCfg().serverUrl || apiCfg().token || window.__GRAV_CONFIG__) {
        fn();
        return;
      }
      if (Date.now() - start > limit) {
        fn();
        return;
      }
      setTimeout(tick, 40);
    })();
  }

  function loadStylesheet(href, attr) {
    if (!href) return Promise.resolve();
    return new Promise((resolve, reject) => {
      let link = document.querySelector(`link[${attr}]`);
      if (!link) {
        link = document.createElement('link');
        link.rel = 'stylesheet';
        link.setAttribute(attr, '1');
        link.onload = () => resolve();
        link.onerror = () => reject(new Error('Messenger stylesheet failed: ' + href));
        document.head.appendChild(link);
      } else {
        link.onload = () => resolve();
        link.onerror = () => reject(new Error('Messenger stylesheet failed: ' + href));
      }
      if (link.getAttribute('href') !== href) {
        link.setAttribute('href', href);
      } else if (link.sheet) {
        resolve();
      }
    });
  }

  function loadScriptOnce(src, attr) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[${attr}]`)) {
        if (typeof window.MudMessengerBoot === 'function') {
          resolve();
          return;
        }
        const existing = document.querySelector(`script[${attr}]`);
        existing.addEventListener('load', () => resolve(), { once: true });
        existing.addEventListener('error', () => reject(new Error('Messenger script failed')), { once: true });
        return;
      }
      const s = document.createElement('script');
      s.src = src;
      s.defer = true;
      s.setAttribute(attr, '1');
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('Messenger script failed'));
      document.head.appendChild(s);
    });
  }

  function applyCustomCss(css) {
    let style = document.querySelector(`style[${CUSTOM_ATTR}]`);
    if (!style) {
      style = document.createElement('style');
      style.setAttribute(CUSTOM_ATTR, '1');
      document.head.appendChild(style);
    }
    style.textContent = css || '';
  }

  function destroyCockpit() {
    const root = document.getElementById(ROOT_ID);
    if (root && root._mmApp && typeof root._mmApp.stopStream === 'function') {
      root._mmApp.stopStream();
    }
    root?.remove();
  }

  function applyThemeClasses(root, payload) {
    const preset = String(payload.theme_preset || 'default').replace(/[^a-z0-9_-]/gi, '');
    root.classList.add('mud-messenger-root--admin-cockpit');
    if (payload.is_pro) {
      root.classList.add('mud-messenger-root--pro');
    }
    if (preset) {
      root.classList.add('mud-messenger-root--preset-' + preset);
    }
  }

  function applyThemeStyle(root, payload) {
    const style = String(payload.style || '').trim();
    if (style) {
      root.setAttribute('data-theme-style', style);
      root.setAttribute('style', style);
    }
  }

  async function ensureThemeAssets(payload) {
    const cssUrl = payload.css_url || pluginAssetUrl('assets/mud-messenger.css');
    if (!document.querySelector(`link[${CSS_ATTR}]`)) {
      await loadStylesheet(cssUrl, CSS_ATTR);
    }
    if (payload.font_link && !document.querySelector(`link[${FONT_ATTR}]`)) {
      await loadStylesheet(payload.font_link, FONT_ATTR);
    }
    if (payload.custom_css && !document.querySelector(`style[${CUSTOM_ATTR}]`)) {
      applyCustomCss(payload.custom_css);
    }
  }

  async function mountFromPayload(payload) {
    destroyCockpit();
    await ensureThemeAssets(payload);

    const root = document.createElement('div');
    root.id = ROOT_ID;
    root.className = 'mud-messenger-root';
    applyThemeClasses(root, payload);
    applyThemeStyle(root, payload);
    root.setAttribute('data-mud-messenger', '');
    root.setAttribute('data-api', payload.api || apiUrl('/mud-messenger'));
    root.setAttribute('data-default-group', payload.default_group || 'general');
    root.setAttribute('data-giphy', payload.giphy || '1');
    root.setAttribute('data-poll', String(payload.poll || 2500));
    root.setAttribute('data-poll-only', '1');
    root.setAttribute('data-edition', payload.edition || 'lite');
    root.setAttribute('data-brand-title', payload.brand_title || 'GravFans Messenger');
    root.setAttribute('data-footer', payload.footer || '1');
    root.setAttribute('data-footer-text', payload.footer_text || 'Powered by GravFans.Live');
    root.setAttribute('data-footer-url', payload.footer_url || 'https://gravfans.live');
    root.setAttribute('data-launcher-icon', payload.launcher_icon || '💬');
    root.setAttribute('data-launcher-position', payload.launcher_position || 'bottom-right');
    if (payload.theme_preset) {
      root.setAttribute('data-theme-preset', payload.theme_preset);
    }
    if (payload.thread_background) {
      root.setAttribute('data-thread-bg', payload.thread_background);
    }
    root.setAttribute('data-moderation', payload.moderation === '0' ? '0' : '1');
    if (payload.session && typeof payload.session === 'object') {
      root.setAttribute('data-session', JSON.stringify(payload.session));
    }
    root.setAttribute('data-admin-cockpit', '1');

    document.body.appendChild(root);

    if (typeof window.MudMessengerBoot === 'function') {
      window.MudMessengerBoot(root);
    }
  }

  function loadBootPayloadScript() {
    return new Promise((resolve, reject) => {
      if (window.__MM_ADMIN_COCKPIT_BOOT) {
        resolve();
        return;
      }
      const existing = document.querySelector(`script[${BOOT_ATTR}]`);
      if (existing) {
        existing.addEventListener('load', () => resolve(), { once: true });
        existing.addEventListener('error', () => reject(new Error('Cockpit boot script failed')), { once: true });
        return;
      }
      const s = document.createElement('script');
      s.src = apiUrl('/messenger/admin/cockpit-boot.js') + '?v=' + Date.now();
      s.setAttribute(BOOT_ATTR, '1');
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('Cockpit boot script failed'));
      document.head.appendChild(s);
    });
  }

  async function resolveBootstrapPayload(draft) {
    if (draft && typeof draft === 'object') {
      await waitForApiToken();
      return fetchBootstrapApi(draft);
    }
    await waitForApiToken(20000);
    if (apiCfg().token) {
      try {
        return await fetchBootstrapApi(null);
      } catch (err) {
        console.warn('[MessengerAdminCockpit] authed bootstrap failed, using public boot', err);
      }
    }
    if (window.__MM_ADMIN_COCKPIT_BOOT) {
      return window.__MM_ADMIN_COCKPIT_BOOT;
    }
    await loadBootPayloadScript();
    if (window.__MM_ADMIN_COCKPIT_BOOT) {
      return window.__MM_ADMIN_COCKPIT_BOOT;
    }
    throw new Error('Could not load messenger admin boot payload');
  }

  async function fetchBootstrapApi(draft) {
    const headers = { Accept: 'application/json' };
    if (apiCfg().token) headers['X-API-Token'] = apiCfg().token;
    const opts = {
      method: draft ? 'POST' : 'GET',
      headers,
      credentials: 'include',
    };
    if (draft) {
      headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(draft);
    }
    const res = await fetch(apiUrl('/messenger/admin/launcher-bootstrap'), opts);
    const json = await res.json();
    const data = json.data !== undefined ? json.data : json;
    if (!res.ok) {
      throw new Error(data.detail || data.error || data.message || `HTTP ${res.status}`);
    }
    return data;
  }

  async function bootstrap(draft) {
    if (!shouldShowCockpit(draft)) {
      destroyCockpit();
      return;
    }
    await loadScriptOnce(pluginAssetUrl('assets/mud-messenger.js'), JS_ATTR);
    const payload = await resolveBootstrapPayload(draft && typeof draft === 'object' ? draft : null);
    await mountFromPayload(payload);
    if (!hasLauncher()) {
      throw new Error('Messenger launcher did not mount');
    }
  }

  function ensureBoot(draft) {
    if (!shouldShowCockpit(draft)) {
      destroyCockpit();
      return Promise.resolve();
    }
    if (!bootPromise) {
      bootPromise = new Promise((resolve, reject) => {
        whenAdminApiReady(() => {
          bootstrap(draft).then(resolve).catch((err) => {
            bootPromise = null;
            reject(err);
          });
        });
      });
    }
    return bootPromise;
  }

  function schedulePreview(draft) {
    clearTimeout(previewTimer);
    previewTimer = setTimeout(() => {
      bootPromise = null;
      ensureBoot(draft).catch((err) => {
        console.warn('[MessengerAdminCockpit]', err);
      });
    }, 180);
  }

  function onPreview(e) {
    schedulePreview(e.detail || null);
  }

  function onRefresh() {
    bootPromise = null;
    delete window.__MM_ADMIN_COCKPIT_BOOT;
    document.querySelector(`script[${BOOT_ATTR}]`)?.remove();
    ensureBoot(null).catch((err) => {
      console.warn('[MessengerAdminCockpit]', err);
    });
  }

  if (!window.__mmAdminCockpitListeners) {
    window.__mmAdminCockpitListeners = true;
    window.addEventListener('mm-admin-cockpit-preview', onPreview);
    window.addEventListener('mm-admin-cockpit-refresh', onRefresh);
  }

  window.MudMessengerAdminCockpit = {
    ensure: () => ensureBoot(null),
    destroy: () => {
      bootPromise = null;
      destroyCockpit();
    },
    refresh: () => window.dispatchEvent(new CustomEvent('mm-admin-cockpit-refresh')),
    preview: (draft) => window.dispatchEvent(new CustomEvent('mm-admin-cockpit-preview', { detail: draft })),
  };

  function hasLauncher() {
    const root = document.getElementById(ROOT_ID);
    return !!(root && root.querySelector('.mud-messenger-launcher'));
  }

  function bootWithRetry(attempt) {
    ensureBoot(null)
      .then(() => {
        if (!hasLauncher() && attempt < 10) {
          bootPromise = null;
          setTimeout(() => bootWithRetry(attempt + 1), 350 + attempt * 250);
        }
      })
      .catch((err) => {
        console.warn('[MessengerAdminCockpit]', err);
        if (attempt < 10) {
          bootPromise = null;
          setTimeout(() => bootWithRetry(attempt + 1), 500 + attempt * 350);
        }
      });
  }

  if (!window.__mmAdminCockpitAutoBoot) {
    window.__mmAdminCockpitAutoBoot = true;
    whenAdminApiReady(() => bootWithRetry(0), 20000);
  }
})();
