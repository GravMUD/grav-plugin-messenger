/**
 * Admin2 floating widget shell — loads mud-messenger-admin-cockpit.js
 */
(function () {
  const TAG = window.__GRAV_WIDGET_TAG || 'grav-messenger--widget';

  function cockpitScriptUrl() {
    const base = (window.__GRAV_API_SERVER_URL || window.__GRAV_CONFIG__?.serverUrl || window.location.origin || '').replace(/\/+$/, '');
    return `${base}/user/plugins/messenger/assets/mud-messenger-admin-cockpit.js`;
  }

  function loadCockpit() {
    if (window.MudMessengerAdminCockpit) {
      return window.MudMessengerAdminCockpit.ensure();
    }
    return new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-mm-admin-cockpit-loader]');
      if (existing) {
        existing.addEventListener('load', () => {
          window.MudMessengerAdminCockpit?.ensure().then(resolve).catch(reject);
        }, { once: true });
        existing.addEventListener('error', () => reject(new Error('Cockpit loader failed')), { once: true });
        return;
      }
      const s = document.createElement('script');
      s.src = cockpitScriptUrl();
      s.defer = true;
      s.setAttribute('data-mm-admin-cockpit-loader', '1');
      s.onload = () => {
        window.MudMessengerAdminCockpit?.ensure().then(resolve).catch(reject);
      };
      s.onerror = () => reject(new Error('Cockpit loader failed'));
      document.head.appendChild(s);
    });
  }

  class MessengerAdminCockpitWidget extends HTMLElement {
    connectedCallback() {
      this.style.cssText = 'display:none!important';
      loadCockpit().catch((err) => {
        console.warn('[MessengerAdminCockpit]', err);
      });
    }
  }

  if (!customElements.get(TAG)) {
    customElements.define(TAG, MessengerAdminCockpitWidget);
  }

  loadCockpit().catch((err) => {
    console.warn('[MessengerAdminCockpit]', err);
  });
})();
