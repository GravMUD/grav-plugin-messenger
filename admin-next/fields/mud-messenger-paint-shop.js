/**
 * Messenger Pro — full JavaBean-style Paint Shop (presets · accent · fonts · density · corners · CSS)
 */
(function () {
  const TAG = 'mud-messenger-paint-shop';

  const ACCENT_PRESETS = [
    { label: 'Grav', hue: 271, saturation: 91 },
    { label: 'Blue', hue: 221, saturation: 83 },
    { label: 'Orange', hue: 25, saturation: 95 },
    { label: 'Emerald', hue: 160, saturation: 84 },
    { label: 'Violet', hue: 263, saturation: 70 },
    { label: 'Rose', hue: 347, saturation: 77 },
    { label: 'Cyan', hue: 192, saturation: 91 },
    { label: 'Amber', hue: 38, saturation: 92 },
    { label: 'Teal', hue: 172, saturation: 66 },
    { label: 'Zinc', hue: 240, saturation: 6 },
  ];

  const DENSITY = [
    { value: 'compact', label: 'Compact' },
    { value: 'comfy', label: 'Comfy' },
    { value: 'spacious', label: 'Spacious' },
  ];

  const RADIUS = [
    { value: 'subtle', label: 'Subtle' },
    { value: 'default', label: 'Default' },
    { value: 'round', label: 'Round' },
  ];

  const FONT_CATEGORIES = [
    { key: 'sans', label: 'Sans' },
    { key: 'serif', label: 'Serif' },
    { key: 'mono', label: 'Mono' },
  ];

  function esc(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  class MudMessengerPaintShop extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this._cfg = {};
      this._presets = [];
      this._fonts = [];
    }

    set presets(v) {
      this._presets = Array.isArray(v) ? v : [];
      if (this.isConnected) this._renderPresets();
    }

    set fonts(v) {
      this._fonts = Array.isArray(v) ? v : [];
      if (this.isConnected) this._renderFonts();
    }

    set config(v) {
      this._cfg = v && typeof v === 'object' ? { ...v } : {};
      if (this.isConnected) this._syncControls();
    }

    get draft() {
      const root = this.shadowRoot;
      const draft = { ...this._cfg };
      draft.theme_preset = root.querySelector('[data-preset].selected')?.getAttribute('data-preset')
        || draft.theme_preset || 'default';
      draft.theme_use_preset_accent = root.querySelector('[data-use-preset-accent]')?.checked !== false;
      draft.theme_accent_hue = root.querySelector('[data-hue]')?.value === ''
        ? null : Number(root.querySelector('[data-hue]').value);
      draft.theme_accent_saturation = Number(root.querySelector('[data-sat]')?.value || 85);
      draft.theme_density = root.querySelector('[data-density].selected')?.getAttribute('data-density')
        || draft.theme_density || 'comfy';
      draft.theme_radius = root.querySelector('[data-radius].selected')?.getAttribute('data-radius')
        || draft.theme_radius || 'default';
      draft.theme_font = root.querySelector('[data-font].selected')?.getAttribute('data-font')
        || draft.theme_font || 'inter';
      draft.theme_custom_css = root.querySelector('[data-custom-css]')?.value || '';
      return draft;
    }

    connectedCallback() {
      this._renderShell();
      this._renderPresets();
      this._renderFonts();
      this._syncControls();
      this._bind();
    }

    _emit() {
      this.dispatchEvent(new CustomEvent('mm-paint-change', { bubbles: true, detail: this.draft }));
    }

    _renderShell() {
      this.shadowRoot.innerHTML = `
        <style>
          :host { display: block; font-family: ui-sans-serif, system-ui, sans-serif; color: #e4e4e7; }
          .panel { border: 1px solid #3f3f46; border-radius: 0.85rem; background: linear-gradient(180deg, #18181b 0%, #09090b 100%); overflow: hidden; }
          .body { padding: 0.85rem; display: flex; flex-direction: column; gap: 1rem; max-height: calc(100vh - 12rem); overflow: auto; }
          section h3 { margin: 0 0 0.5rem; font-size: 0.72rem; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: #a1a1aa; }
          .preset-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.45rem; }
          @media (min-width: 520px) { .preset-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
          .preset-card { border: 2px solid #3f3f46; border-radius: 0.55rem; padding: 0.45rem; cursor: pointer; background: #27272a; text-align: left; color: inherit; font: inherit; }
          .preset-card.selected { border-color: #a855f7; box-shadow: 0 0 0 1px #a855f7; }
          .swatch { height: 2rem; border-radius: 0.35rem; margin-bottom: 0.25rem; border: 1px solid rgba(255,255,255,0.08); }
          .preset-card strong { display: block; font-size: 0.72rem; }
          .preset-card span { font-size: 0.62rem; opacity: 0.65; line-height: 1.25; display: block; }
          .swatches { display: flex; flex-wrap: wrap; gap: 0.35rem; margin-bottom: 0.5rem; }
          .swatch-btn { border: 2px solid transparent; border-radius: 0.5rem; padding: 0.3rem 0.45rem; font-size: 0.62rem; font-weight: 600; cursor: pointer; background: #27272a; color: #e4e4e7; display: flex; align-items: center; gap: 0.3rem; }
          .swatch-btn.selected { border-color: #a855f7; }
          .dot { width: 0.75rem; height: 0.75rem; border-radius: 999px; border: 1px solid rgba(255,255,255,0.12); }
          .slider-row { display: grid; grid-template-columns: 4rem 1fr 2.25rem; gap: 0.4rem; align-items: center; margin-bottom: 0.35rem; font-size: 0.68rem; color: #a1a1aa; }
          input[type="range"] { width: 100%; accent-color: #a855f7; }
          .toggle-row { display: flex; align-items: center; gap: 0.4rem; font-size: 0.68rem; margin-bottom: 0.45rem; color: #d4d4d8; }
          .cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.4rem; }
          .pick-card { border: 2px solid #3f3f46; border-radius: 0.55rem; padding: 0.5rem; cursor: pointer; text-align: center; background: #27272a; font-size: 0.68rem; font-weight: 600; }
          .pick-card.selected { border-color: #a855f7; background: #3b0764; color: #f3e8ff; }
          .font-group-label { font-size: 0.62rem; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: #71717a; margin: 0.35rem 0 0.15rem; }
          .font-row { display: flex; flex-wrap: wrap; gap: 0.35rem; }
          .font-pill { border: 1px solid #52525b; border-radius: 999px; padding: 0.3rem 0.55rem; font-size: 0.68rem; cursor: pointer; background: #27272a; color: #fafafa; }
          .font-pill.selected { border-color: #a855f7; background: #3b0764; color: #f3e8ff; }
          .pro-bar { display: flex; flex-wrap: wrap; gap: 0.35rem; margin-top: 0.35rem; }
          .pro-btn { font-size: 0.65rem; font-weight: 600; border: 1px solid #52525b; border-radius: 0.4rem; padding: 0.3rem 0.5rem; cursor: pointer; background: #27272a; color: #e4e4e7; }
          .pro-btn.danger { color: #fca5a5; border-color: #7f1d1d; }
          .css-editor { width: 100%; min-height: 7rem; border: none; padding: 0.65rem; font-family: ui-monospace, monospace; font-size: 0.72rem; line-height: 1.45; background: #0f172a; color: #e2e8f0; resize: vertical; box-sizing: border-box; border-radius: 0 0 0.55rem 0.55rem; }
          details.pro { border: 1px solid #3f3f46; border-radius: 0.55rem; overflow: hidden; }
          details.pro summary { cursor: pointer; padding: 0.5rem 0.65rem; font-size: 0.72rem; font-weight: 600; background: #27272a; list-style: none; }
          details.pro summary::-webkit-details-marker { display: none; }
          .hint { font-size: 0.62rem; color: #71717a; margin-top: 0.25rem; line-height: 1.35; }
        </style>
        <div class="panel"><div class="body">
          <section><h3>Presets</h3><div class="preset-grid" data-presets></div></section>
          <section>
            <h3>Accent</h3>
            <label class="toggle-row"><input type="checkbox" data-use-preset-accent checked> Use preset accent colours</label>
            <div class="swatches" data-accent-swatches hidden></div>
            <div class="slider-row"><label>Hue</label><input type="range" data-hue min="0" max="360" value="271"><span data-hue-val>271</span></div>
            <div class="slider-row"><label>Sat</label><input type="range" data-sat min="0" max="100" value="85"><span data-sat-val>85</span></div>
          </section>
          <section><h3>Density</h3><div class="cards" data-density-row></div></section>
          <section><h3>Corners</h3><div class="cards" data-radius-row></div></section>
          <section><h3>Typography</h3><div data-fonts></div></section>
          <section>
            <h3>Pro tools</h3>
            <div class="pro-bar">
              <button type="button" class="pro-btn" data-export>Export JSON</button>
              <button type="button" class="pro-btn" data-import>Import JSON</button>
              <button type="button" class="pro-btn danger" data-reset>Reset preset defaults</button>
            </div>
            <p class="hint">Export/import theme_* keys only. Reset clears custom accent + CSS for the active preset.</p>
          </section>
          <section>
            <details class="pro" open><summary>Custom CSS</summary>
              <textarea class="css-editor" data-custom-css placeholder=".mud-messenger-panel { … }"></textarea>
            </details>
          </section>
        </div></div>`;

      const accentRow = this.shadowRoot.querySelector('[data-accent-swatches]');
      ACCENT_PRESETS.forEach((p) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'swatch-btn';
        btn.innerHTML = `<span class="dot" style="background:hsl(${p.hue} ${p.saturation}% 50%)"></span>${esc(p.label)}`;
        btn.addEventListener('click', () => {
          this.shadowRoot.querySelector('[data-use-preset-accent]').checked = false;
          this.shadowRoot.querySelector('[data-hue]').value = String(p.hue);
          this.shadowRoot.querySelector('[data-sat]').value = String(p.saturation);
          this._syncAccentUi();
          accentRow.hidden = false;
          this._emit();
        });
        accentRow.appendChild(btn);
      });

      const densityRow = this.shadowRoot.querySelector('[data-density-row]');
      DENSITY.forEach((d) => {
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'pick-card';
        card.setAttribute('data-density', d.value);
        card.textContent = d.label;
        card.addEventListener('click', () => {
          densityRow.querySelectorAll('.pick-card').forEach((c) => c.classList.remove('selected'));
          card.classList.add('selected');
          this._emit();
        });
        densityRow.appendChild(card);
      });

      const radiusRow = this.shadowRoot.querySelector('[data-radius-row]');
      RADIUS.forEach((r) => {
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'pick-card';
        card.setAttribute('data-radius', r.value);
        card.textContent = r.label;
        card.addEventListener('click', () => {
          radiusRow.querySelectorAll('.pick-card').forEach((c) => c.classList.remove('selected'));
          card.classList.add('selected');
          this._emit();
        });
        radiusRow.appendChild(card);
      });
    }

    _renderPresets() {
      const grid = this.shadowRoot?.querySelector('[data-presets]');
      if (!grid) return;
      const active = this._cfg.theme_preset || 'default';
      grid.innerHTML = '';
      this._presets.forEach((p) => {
        const accent = p.vars?.['--mm-accent'] || '#888';
        const bg = p.vars?.['--mm-bg'] || '#222';
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'preset-card' + (p.id === active ? ' selected' : '');
        btn.setAttribute('data-preset', p.id);
        btn.innerHTML = `<div class="swatch" style="background:linear-gradient(135deg,${esc(accent)},${esc(bg)})"></div><strong>${esc(p.label)}</strong><span>${esc(p.tagline || '')}</span>`;
        btn.addEventListener('click', () => {
          grid.querySelectorAll('.preset-card').forEach((c) => c.classList.remove('selected'));
          btn.classList.add('selected');
          this._cfg.theme_preset = p.id;
          this._emit();
        });
        grid.appendChild(btn);
      });
    }

    _renderFonts() {
      const wrap = this.shadowRoot?.querySelector('[data-fonts]');
      if (!wrap) return;
      wrap.innerHTML = '';
      const fonts = this._fonts.length ? this._fonts : [{ slug: 'inter', label: 'Inter', category: 'sans' }];
      FONT_CATEGORIES.forEach((cat) => {
        const group = fonts.filter((f) => f.category === cat.key);
        if (!group.length) return;
        const label = document.createElement('div');
        label.className = 'font-group-label';
        label.textContent = cat.label;
        wrap.appendChild(label);
        const row = document.createElement('div');
        row.className = 'font-row';
        group.forEach((f) => {
          const pill = document.createElement('button');
          pill.type = 'button';
          pill.className = 'font-pill';
          pill.setAttribute('data-font', f.slug);
          pill.textContent = f.label;
          pill.style.fontFamily = f.stack || 'inherit';
          pill.addEventListener('click', () => {
            wrap.querySelectorAll('.font-pill').forEach((p) => p.classList.remove('selected'));
            pill.classList.add('selected');
            this._emit();
          });
          row.appendChild(pill);
        });
        wrap.appendChild(row);
      });
    }

    _syncControls() {
      const c = this._cfg;
      const root = this.shadowRoot;
      if (!root) return;
      const preset = c.theme_preset || 'default';
      root.querySelectorAll('[data-preset]').forEach((el) => {
        el.classList.toggle('selected', el.getAttribute('data-preset') === preset);
      });
      root.querySelector('[data-use-preset-accent]').checked = c.theme_use_preset_accent !== false;
      root.querySelector('[data-hue]').value = c.theme_accent_hue ?? 271;
      root.querySelector('[data-sat]').value = c.theme_accent_saturation ?? 85;
      root.querySelector('[data-custom-css]').value = c.theme_custom_css || '';
      const density = c.theme_density || 'comfy';
      root.querySelectorAll('[data-density]').forEach((el) => {
        el.classList.toggle('selected', el.getAttribute('data-density') === density);
      });
      const radius = c.theme_radius || 'default';
      root.querySelectorAll('[data-radius]').forEach((el) => {
        el.classList.toggle('selected', el.getAttribute('data-radius') === radius);
      });
      const font = c.theme_font || 'inter';
      root.querySelectorAll('[data-font]').forEach((el) => {
        el.classList.toggle('selected', el.getAttribute('data-font') === font);
      });
      this._syncAccentUi();
    }

    _syncAccentUi() {
      const root = this.shadowRoot;
      const usePreset = root.querySelector('[data-use-preset-accent]').checked;
      root.querySelector('[data-accent-swatches]').hidden = usePreset;
      root.querySelector('[data-hue-val]').textContent = root.querySelector('[data-hue]').value;
      root.querySelector('[data-sat-val]').textContent = root.querySelector('[data-sat]').value;
    }

    _bind() {
      const root = this.shadowRoot;
      root.querySelector('[data-use-preset-accent]').addEventListener('change', () => {
        this._syncAccentUi();
        this._emit();
      });
      ['data-hue', 'data-sat'].forEach((sel) => {
        root.querySelector(`[${sel}]`).addEventListener('input', () => {
          root.querySelector('[data-use-preset-accent]').checked = false;
          this._syncAccentUi();
          root.querySelector('[data-accent-swatches]').hidden = false;
          this._emit();
        });
      });
      root.querySelector('[data-custom-css]').addEventListener('input', () => this._emit());
      root.querySelector('[data-export]').addEventListener('click', () => {
        const keys = ['theme_preset', 'theme_use_preset_accent', 'theme_accent_hue', 'theme_accent_saturation', 'theme_density', 'theme_radius', 'theme_font', 'theme_custom_css'];
        const payload = {};
        keys.forEach((k) => { payload[k] = this.draft[k]; });
        navigator.clipboard?.writeText(JSON.stringify(payload, null, 2));
      });
      root.querySelector('[data-import]').addEventListener('click', () => {
        const raw = window.prompt('Paste theme JSON');
        if (!raw) return;
        try {
          const parsed = JSON.parse(raw);
          this._cfg = { ...this._cfg, ...parsed };
          this._syncControls();
          this._emit();
        } catch (_e) {
          window.alert('Invalid JSON');
        }
      });
      root.querySelector('[data-reset]').addEventListener('click', () => {
        this._cfg.theme_use_preset_accent = true;
        this._cfg.theme_accent_hue = null;
        this._cfg.theme_accent_saturation = 85;
        this._cfg.theme_custom_css = '';
        this._syncControls();
        this._emit();
      });
    }
  }

  if (!customElements.get(TAG)) customElements.define(TAG, MudMessengerPaintShop);
})();
