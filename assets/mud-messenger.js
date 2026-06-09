(function () {
  "use strict";

  var EMOJIS = [
    "😀", "😂", "🥹", "😍", "🔥", "💯", "👍", "👋", "🎉", "💬", "❤️", "🩵",
    "🚀", "⚡", "👑", "🤖", "📢", "📜", "🎬", "🎨", "🛸", "🏆", "💎", "🫡",
  ];

  function esc(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function fmtTime(iso) {
    try {
      return new Date(iso).toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (_e) {
      return "";
    }
  }

  function nickKey() {
    return "mud_messenger_nick_v1";
  }

  function getNick() {
    return localStorage.getItem(nickKey()) || "";
  }

  function setNick(v) {
    localStorage.setItem(nickKey(), String(v || "").trim().slice(0, 32));
  }

  function modKeyStorage() {
    return "mud_messenger_mod_key_v1";
  }

  function getModKey() {
    return localStorage.getItem(modKeyStorage()) || "";
  }

  function setModKey(v) {
    localStorage.setItem(modKeyStorage(), String(v || "").trim());
  }

  function apiAuthHeaders() {
    var headers = { Accept: "application/json" };
    if (window.__GRAV_API_TOKEN) {
      headers["X-API-Token"] = window.__GRAV_API_TOKEN;
    }
    return headers;
  }

  function parseSessionAttr(root) {
    if (!root) return null;
    var raw = root.getAttribute("data-session");
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (_e) {
      return null;
    }
  }

  function escAttr(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;")
      .replace(/</g, "&lt;");
  }

  /** Serialize WYSIWYG compose HTML → markdown for flat-file storage (bots still wub markdown). */
  function htmlToMarkdown(html) {
    var wrap = document.createElement("div");
    wrap.innerHTML = html || "";

    function walk(node) {
      if (node.nodeType === 3) {
        return node.textContent || "";
      }
      if (node.nodeType !== 1) {
        return "";
      }
      var tag = node.tagName.toLowerCase();
      var inner = "";
      for (var i = 0; i < node.childNodes.length; i++) {
        inner += walk(node.childNodes[i]);
      }
      if (tag === "br") {
        return "\n";
      }
      if (tag === "div" || tag === "p") {
        return inner + (inner.endsWith("\n") ? "" : "\n");
      }
      if (tag === "strong" || tag === "b") {
        return "**" + inner + "**";
      }
      if (tag === "em" || tag === "i") {
        return "*" + inner + "*";
      }
      if (tag === "code") {
        return "`" + inner + "`";
      }
      if (tag === "a") {
        var href = String(node.getAttribute("href") || "").trim();
        if (href && /^https?:\/\//i.test(href)) {
          return "[" + inner + "](" + href + ")";
        }
        return inner;
      }
      return inner;
    }

    return walk(wrap).replace(/\n{3,}/g, "\n\n");
  }

  function editorPlainText(el) {
    return String(el && el.textContent ? el.textContent : "")
      .replace(/\u00a0/g, " ")
      .trim();
  }

  /** Safe chat markdown → HTML (subset: bold, italic, code, links, swag tags, line breaks). */
  function renderMarkdown(raw, swagTagMap) {
    var blocks = [];
    var s = esc(String(raw || ""));
    swagTagMap = swagTagMap || {};

    s = s.replace(/:([a-z0-9-]+):/gi, function (_m, slug) {
      var key = String(slug || "").toLowerCase();
      var tag = swagTagMap[key];
      if (!tag || !tag.image) {
        return _m;
      }
      var i = blocks.length;
      var href = tag.buyUrl ? esc(tag.buyUrl) : "#";
      var title = esc(tag.title || key);
      var price = tag.priceLabel ? '<span class="mm-swag-tag-price">' + esc(tag.priceLabel) + "</span>" : "";
      blocks.push(
        '<a class="mm-swag-tag" href="' +
          href +
          '" target="_blank" rel="noopener noreferrer" title="Shop: ' +
          title +
          '">' +
          '<img class="mm-swag-tag-img" src="' +
          esc(tag.image) +
          '" alt="' +
          title +
          '" loading="lazy">' +
          '<span class="mm-swag-tag-meta"><span class="mm-swag-tag-label">' +
          title +
          "</span>" +
          price +
          '<span class="mm-swag-tag-shop">Shop ↗</span></span></a>'
      );
      return "\x00BLOCK" + i + "\x00";
    });

    s = s.replace(/```([\s\S]*?)```/g, function (_m, code) {
      var i = blocks.length;
      blocks.push('<pre class="mm-md-pre"><code>' + code.trim() + "</code></pre>");
      return "\x00BLOCK" + i + "\x00";
    });
    s = s.replace(/`([^`\n]+)`/g, function (_m, code) {
      var i = blocks.length;
      blocks.push('<code class="mm-md-code">' + code + "</code>");
      return "\x00BLOCK" + i + "\x00";
    });
    s = s.replace(/\*\*\*([^*\n]+)\*\*\*/g, "<strong><em>$1</em></strong>");
    s = s.replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>");
    s = s.replace(/\*([^*\n]+)\*/g, "<em>$1</em>");
    s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, function (_m, label, url) {
      url = String(url || "").trim();
      if (!/^https?:\/\//i.test(url)) {
        return esc("[" + label + "](" + url + ")");
      }
      return (
        '<a href="' +
        esc(url) +
        '" target="_blank" rel="noopener noreferrer" class="mm-md-link">' +
        label +
        "</a>"
      );
    });
    s = s.replace(/\n/g, "<br>");

    blocks.forEach(function (html, i) {
      s = s.split("\x00BLOCK" + i + "\x00").join(html);
    });

    return s;
  }

  function MessengerApp(opts) {
    this.api = opts.api.replace(/\/$/, "");
    this.defaultGroup = opts.defaultGroup || "general";
    this.giphyEnabled = !!opts.giphyEnabled;
    this.pollMs = opts.pollMs || 2500;
    this.embed = !!opts.embed;
    this.pollOnly = !!opts.pollOnly;
    this.edition = opts.edition || "lite";
    this.moderationEnabled = opts.moderationEnabled !== false;
    this.brandTitle = opts.brandTitle || "GravFans Messenger";
    this.showFooter = !!opts.showFooter;
    this.footerText = opts.footerText || "Powered by GravFans.Live";
    this.footerUrl = opts.footerUrl || "https://gravfans.live";
    this.launcherIcon = opts.launcherIcon || "💬";
    this.launcherPosition = opts.launcherPosition || "bottom-right";
    this.group = this.defaultGroup;
    this.groups = [];
    this.messages = [];
    this.lastId = "";
    this.open = this.embed;
    this.unread = 0;
    this.eventSource = null;
    this.pollTimer = null;
    this.root = opts.root;
    this.swagTagMap = {};
    this.swagTags = [];
    this.forms = [];
    this.modPerms = {};
    this.isMod = false;
    this.session = opts.session || null;
    this.nickLocked = !!opts.nickLocked;
    this.adminCockpit = !!opts.adminCockpit;
    this.build();
    this.applySession();
    this.loadGroups();
    this.loadForms();
    this.refreshModSession();
    this.loadMessages();
    this.connectStream();
  }

  MessengerApp.prototype.build = function () {
    var self = this;
    this.root.innerHTML = "";
    this.root.removeAttribute("hidden");
    this.root.classList.remove(
      "mud-messenger-root--pos-bottom-right",
      "mud-messenger-root--pos-bottom-left",
      "mud-messenger-root--pos-top-right",
      "mud-messenger-root--pos-top-left"
    );
    var pos = String(this.launcherPosition || "bottom-right").replace(/_/g, "-");
    this.root.classList.add("mud-messenger-root--pos-" + pos);

    if (!this.embed) {
      this.launcher = document.createElement("button");
      this.launcher.type = "button";
      this.launcher.className = "mud-messenger-launcher";
      this.launcher.setAttribute("aria-label", "Open community chat");
      this.launcher.innerHTML = esc(this.launcherIcon) + "<span class=\"mm-badge\"></span>";
      this.launcher.addEventListener("click", function () {
        self.togglePanel(true);
      });
      this.root.appendChild(this.launcher);
      this.badge = this.launcher.querySelector(".mm-badge");
    }

    this.panel = document.createElement("div");
    this.panel.className = "mud-messenger-panel" + (this.embed ? " mud-messenger-panel--embed" : "");
    if (this.open) this.panel.classList.add("is-open");

    this.panel.innerHTML =
      '<header class="mud-messenger-header">' +
      "<h2>" + esc(this.brandTitle) + "</h2>" +
      (this.edition === "pro" ? '<span class="mud-messenger-pro-badge">PRO</span>' : "") +
      '<button type="button" data-mm-fullscreen title="Fullscreen" aria-label="Fullscreen">⤢</button>' +
      (this.embed ? "" : '<button type="button" data-mm-close aria-label="Close">×</button>') +
      "</header>" +
      '<div class="mud-messenger-nick"><label>Nick</label><input type="text" data-mm-nick placeholder="Your display name" maxlength="32">' +
      (this.edition === "pro" && this.moderationEnabled ? '<label class="mm-mod-label">Mod key</label><input type="password" data-mm-mod-key placeholder="Pro mod key" autocomplete="off">' : "") +
      "</div>" +
      '<div class="mud-messenger-body">' +
      '<nav class="mud-messenger-groups" data-mm-groups></nav>' +
      '<div class="mud-messenger-chat">' +
      '<div class="mud-messenger-thread" data-mm-thread></div>' +
      '<div class="mud-messenger-compose">' +
      '<div class="mud-messenger-picker" data-mm-emoji-picker><div class="mud-messenger-emoji-grid"></div></div>' +
      '<div class="mud-messenger-picker" data-mm-swag-picker hidden>' +
      '<div class="mud-messenger-swag-grid" data-mm-swag-grid></div></div>' +
      '<div class="mud-messenger-picker" data-mm-form-picker hidden>' +
      '<div class="mud-messenger-form-launch-grid" data-mm-form-grid></div></div>' +
      '<div class="mud-messenger-picker mud-messenger-giphy-panel" data-mm-giphy-picker>' +
      '<div class="mud-messenger-giphy-search"><input type="search" data-mm-giphy-q placeholder="Search GIFs…" autocomplete="off"></div>' +
      '<div class="mud-messenger-giphy-cats" data-mm-giphy-cats role="tablist" aria-label="GIF categories"></div>' +
      '<div class="mud-messenger-giphy-grid" data-mm-giphy-grid></div></div>' +
      '<div class="mud-messenger-toolbar">' +
      '<div class="mud-messenger-format" role="toolbar" aria-label="Formatting">' +
      '<button type="button" class="mm-fmt-btn" data-mm-fmt="bold" title="Bold" aria-label="Bold"><strong>B</strong></button>' +
      '<button type="button" class="mm-fmt-btn" data-mm-fmt="italic" title="Italic" aria-label="Italic"><em>I</em></button>' +
      '<button type="button" class="mm-fmt-btn" data-mm-fmt="code" title="Code" aria-label="Code"><span class="mm-fmt-code">&lt;/&gt;</span></button>' +
      '<button type="button" class="mm-fmt-btn" data-mm-fmt="link" title="Insert link" aria-label="Insert link"><span class="mm-fmt-link" aria-hidden="true">🔗</span></button>' +
      "</div>" +
      '<button type="button" data-mm-emoji title="Emoji">😀</button>' +
      '<button type="button" data-mm-swag title="Swag tags" hidden>🛍</button>' +
      (this.edition === "pro" ? '<button type="button" data-mm-forms title="Launch form" hidden>📋</button>' : "") +
      (this.giphyEnabled ? '<button type="button" data-mm-giphy title="Giphy">GIF</button>' : "") +
      "</div>" +
      '<div class="mud-messenger-input-row">' +
      '<div class="mud-messenger-compose-field">' +
      '<div class="mud-messenger-editor" data-mm-input contenteditable="true" role="textbox" aria-multiline="true" data-placeholder="Message… Shift+Enter for newline"></div>' +
      "</div>" +
      '<button type="button" class="mud-messenger-send" data-mm-send aria-label="Send">➤</button>' +
      "</div>" +
      '<footer class="mud-messenger-footer" data-mm-footer hidden></footer>' +
      "</div></div></div>";

    this.root.appendChild(this.panel);

    this.threadEl = this.panel.querySelector("[data-mm-thread]");
    this.groupsEl = this.panel.querySelector("[data-mm-groups]");
    this.inputEl = this.panel.querySelector("[data-mm-input]");
    this.nickEl = this.panel.querySelector("[data-mm-nick]");
    this.modKeyEl = this.panel.querySelector("[data-mm-mod-key]");
    this.formsBtn = this.panel.querySelector("[data-mm-forms]");
    this.formPicker = this.panel.querySelector("[data-mm-form-picker]");
    this.formGrid = this.panel.querySelector("[data-mm-form-grid]");
    this.emojiPicker = this.panel.querySelector("[data-mm-emoji-picker]");
    this.swagPicker = this.panel.querySelector("[data-mm-swag-picker]");
    this.swagGrid = this.panel.querySelector("[data-mm-swag-grid]");
    this.swagBtn = this.panel.querySelector("[data-mm-swag]");
    this.giphyPicker = this.panel.querySelector("[data-mm-giphy-picker]");
    this.giphyCats = this.panel.querySelector("[data-mm-giphy-cats]");
    this.giphyGrid = this.panel.querySelector("[data-mm-giphy-grid]");
    this.giphyDebounce = null;
    this.giphyCategories = [];
    this.giphyActiveCat = "trending";
    this.fullscreen = false;
    this.footerEl = this.panel.querySelector("[data-mm-footer]");

    if (this.footerEl && this.showFooter) {
      this.footerEl.hidden = false;
      var footLink = this.footerUrl
        ? '<a href="' + esc(this.footerUrl) + '" target="_blank" rel="noopener noreferrer">' + esc(this.footerText) + "</a>"
        : esc(this.footerText);
      this.footerEl.innerHTML = footLink;
    }

    if (this.nickEl) {
      this.nickEl.value = getNick();
      this.nickEl.addEventListener("change", function () {
        if (self.nickLocked) return;
        setNick(self.nickEl.value);
        self.refreshModSession();
      });
    }
    if (this.modKeyEl) {
      this.modKeyEl.value = getModKey();
      this.modKeyEl.addEventListener("change", function () {
        setModKey(self.modKeyEl.value);
        self.refreshModSession();
      });
    }

    var emojiGrid = this.panel.querySelector(".mud-messenger-emoji-grid");
    EMOJIS.forEach(function (em) {
      var b = document.createElement("button");
      b.type = "button";
      b.textContent = em;
      b.addEventListener("click", function () {
        self.insertAtCursor(em);
        self.emojiPicker.classList.remove("is-open");
      });
      emojiGrid.appendChild(b);
    });

    var closeBtn = this.panel.querySelector("[data-mm-close]");
    if (closeBtn) {
      closeBtn.addEventListener("click", function () {
        self.togglePanel(false);
      });
    }

    this.panel.querySelector("[data-mm-send]").addEventListener("click", function () {
      self.sendText();
    });
    this.inputEl.addEventListener("keydown", function (ev) {
      if (ev.key === "Enter" && !ev.shiftKey) {
        ev.preventDefault();
        self.sendText();
      }
    });
    this.inputEl.addEventListener("input", function () {
      self.autoResizeInput();
    });
    this.inputEl.addEventListener("paste", function (ev) {
      ev.preventDefault();
      var text = (ev.clipboardData || window.clipboardData).getData("text/plain");
      document.execCommand("insertText", false, text);
    });
    this.autoResizeInput();

    this.panel.querySelectorAll("[data-mm-fmt]").forEach(function (btn) {
      btn.addEventListener("mousedown", function (ev) {
        ev.preventDefault();
      });
      btn.addEventListener("click", function () {
        self.applyFormat(btn.getAttribute("data-mm-fmt"));
      });
    });

    this.panel.querySelector("[data-mm-emoji]").addEventListener("click", function () {
      self.closePickers("emoji");
      self.emojiPicker.classList.toggle("is-open");
    });

    if (this.swagBtn) {
      this.swagBtn.addEventListener("click", function () {
        self.closePickers("swag");
        self.swagPicker.classList.toggle("is-open");
      });
    }

    if (this.formsBtn) {
      this.formsBtn.addEventListener("click", function () {
        self.closePickers("forms");
        self.formPicker.classList.toggle("is-open");
      });
    }

    var fsBtn = this.panel.querySelector("[data-mm-fullscreen]");
    if (fsBtn) {
      fsBtn.addEventListener("click", function () {
        self.toggleFullscreen();
      });
    }

    if (this.giphyEnabled) {
      var giphyQ = this.panel.querySelector("[data-mm-giphy-q]");
      this.panel.querySelector("[data-mm-giphy]").addEventListener("click", function () {
        self.closePickers("giphy");
        var open = !self.giphyPicker.classList.contains("is-open");
        self.giphyPicker.classList.toggle("is-open", open);
        if (open) {
          self.loadGiphyCategories();
          self.loadGiphyCategory(self.giphyActiveCat || "trending");
          if (giphyQ) giphyQ.focus();
        }
      });
      if (giphyQ) {
        giphyQ.addEventListener("input", function () {
          clearTimeout(self.giphyDebounce);
          self.giphyDebounce = setTimeout(function () {
            self.searchGiphy(giphyQ.value);
          }, 320);
        });
      }
    }
  };

  MessengerApp.prototype.toggleFullscreen = function () {
    this.fullscreen = !this.fullscreen;
    this.panel.classList.toggle("is-fullscreen", this.fullscreen);
    var btn = this.panel.querySelector("[data-mm-fullscreen]");
    if (btn) {
      btn.textContent = this.fullscreen ? "⤡" : "⤢";
      btn.title = this.fullscreen ? "Exit fullscreen" : "Fullscreen";
      btn.setAttribute("aria-label", btn.title);
    }
  };

  MessengerApp.prototype.loadGiphyCategories = function () {
    var self = this;
    if (!this.giphyCats || this.giphyCategories.length) {
      this.renderGiphyCategories();
      return;
    }
    fetch(this.api + "/giphy/categories", { headers: { Accept: "application/json" } })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.ok && data.categories) {
          self.giphyCategories = data.categories;
          self.renderGiphyCategories();
        }
      })
      .catch(function () {});
  };

  MessengerApp.prototype.renderGiphyCategories = function () {
    var self = this;
    if (!this.giphyCats) return;
    var cats = this.giphyCategories.length
      ? this.giphyCategories
      : [{ id: "trending", label: "Trending", mode: "trending" }];
    this.giphyCats.innerHTML = cats
      .map(function (c) {
        var active = c.id === self.giphyActiveCat ? " is-active" : "";
        return (
          '<button type="button" class="mm-giphy-cat' +
          active +
          '" data-cat="' +
          esc(c.id) +
          '">' +
          esc(c.label) +
          "</button>"
        );
      })
      .join("");
    this.giphyCats.querySelectorAll("[data-cat]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        self.giphyActiveCat = btn.getAttribute("data-cat");
        self.renderGiphyCategories();
        var q = self.panel.querySelector("[data-mm-giphy-q]");
        if (q) q.value = "";
        self.loadGiphyCategory(self.giphyActiveCat);
      });
    });
  };

  MessengerApp.prototype.loadGiphyCategory = function (catId) {
    var cat = this.giphyCategories.find(function (c) { return c.id === catId; });
    if (!cat || cat.mode === "trending") {
      this.fetchGiphy(this.api + "/giphy/trending");
      return;
    }
    this.searchGiphy(cat.query || cat.label || "");
  };

  MessengerApp.prototype.togglePanel = function (open) {
    this.open = open;
    this.panel.classList.toggle("is-open", open);
    if (open) {
      this.unread = 0;
      this.updateBadge();
      this.scrollThread();
    }
  };

  MessengerApp.prototype.updateBadge = function () {
    if (!this.badge) return;
    if (this.unread > 0 && !this.open) {
      this.badge.textContent = this.unread > 9 ? "9+" : String(this.unread);
      this.badge.classList.add("is-visible");
    } else {
      this.badge.classList.remove("is-visible");
    }
  };

  MessengerApp.prototype.applyFormat = function (kind) {
    if (!this.inputEl) return;
    this.inputEl.focus();
    var sel = window.getSelection();
    var selected = sel && sel.rangeCount ? sel.toString() : "";

    if (kind === "bold") {
      document.execCommand("bold", false, null);
      this.autoResizeInput();
      return;
    }
    if (kind === "italic") {
      document.execCommand("italic", false, null);
      this.autoResizeInput();
      return;
    }
    if (kind === "code") {
      var codeText = selected || "code";
      document.execCommand(
        "insertHTML",
        false,
        "<code class=\"mm-md-code\">" + esc(codeText) + "</code>"
      );
      this.autoResizeInput();
      return;
    }
    if (kind === "link") {
      var label = selected || "link text";
      var url = window.prompt("Link URL (https://…)", "https://");
      if (!url) return;
      url = String(url).trim();
      if (!/^https?:\/\//i.test(url)) {
        url = "https://" + url.replace(/^\/+/, "");
      }
      document.execCommand(
        "insertHTML",
        false,
        '<a href="' +
          escAttr(url) +
          '" class="mm-md-link" target="_blank" rel="noopener noreferrer">' +
          esc(label) +
          "</a>"
      );
      this.autoResizeInput();
    }
  };

  MessengerApp.prototype.insertAtCursor = function (text) {
    if (!this.inputEl) return;
    this.inputEl.focus();
    document.execCommand("insertText", false, text);
    this.autoResizeInput();
  };

  MessengerApp.prototype.autoResizeInput = function () {
    if (!this.inputEl) return;
    var el = this.inputEl;
    var maxPx = 160;
    el.style.height = "auto";
    var next = Math.min(Math.max(el.scrollHeight, 44), maxPx);
    el.style.height = next + "px";
  };

  MessengerApp.prototype.getComposeMarkdown = function () {
    if (!this.inputEl) return "";
    return htmlToMarkdown(this.inputEl.innerHTML).trim();
  };

  MessengerApp.prototype.clearCompose = function () {
    if (!this.inputEl) return;
    this.inputEl.innerHTML = "";
    this.autoResizeInput();
  };

  MessengerApp.prototype.closePickers = function (except) {
    if (except !== "emoji" && this.emojiPicker) {
      this.emojiPicker.classList.remove("is-open");
    }
    if (except !== "swag" && this.swagPicker) {
      this.swagPicker.classList.remove("is-open");
    }
    if (except !== "giphy" && this.giphyPicker) {
      this.giphyPicker.classList.remove("is-open");
    }
    if (except !== "forms" && this.formPicker) {
      this.formPicker.classList.remove("is-open");
    }
  };

  MessengerApp.prototype.modPayload = function (extra) {
    var base = {
      author: String(this.nickEl && this.nickEl.value ? this.nickEl.value : getNick() || "anon").trim(),
      modKey: String(this.modKeyEl && this.modKeyEl.value ? this.modKeyEl.value : getModKey() || ""),
      group: this.group,
    };
    var out = {};
    var k;
    for (k in base) {
      if (Object.prototype.hasOwnProperty.call(base, k)) out[k] = base[k];
    }
    extra = extra || {};
    for (k in extra) {
      if (Object.prototype.hasOwnProperty.call(extra, k)) out[k] = extra[k];
    }
    return out;
  };

  MessengerApp.prototype.applySession = function () {
    if (!this.session || !this.nickEl) {
      return;
    }
    if (this.session.author) {
      this.nickEl.value = this.session.author;
      setNick(this.session.author);
    }
    if (this.session.nick_locked || this.nickLocked) {
      this.nickLocked = true;
      this.nickEl.readOnly = true;
      this.nickEl.title = "Signed in as your Admin2 account";
    }
    if (this.session.auto_mod) {
      this.isMod = true;
      this.modPerms = this.session.mod_permissions || {};
      this.loadSwagTags();
      if (this.modKeyEl) {
        this.modKeyEl.closest(".mud-messenger-nick") &&
          this.modKeyEl.previousElementSibling &&
          this.modKeyEl.previousElementSibling.classList.contains("mm-mod-label") &&
          (this.modKeyEl.previousElementSibling.hidden = true);
        this.modKeyEl.hidden = true;
      }
      if (this.formsBtn && this.modPerms.can_launch_forms) {
        this.formsBtn.hidden = false;
      }
    }
  };

  MessengerApp.prototype.refreshModSession = function () {
    var self = this;
    if (this.edition !== "pro" || !this.moderationEnabled) {
      return;
    }
    if (this.session && this.session.auto_mod) {
      this.isMod = true;
      this.modPerms = this.session.mod_permissions || {};
      this.loadSwagTags();
      return;
    }
    var author = encodeURIComponent(String(this.nickEl && this.nickEl.value ? this.nickEl.value : getNick() || ""));
    var modKey = encodeURIComponent(String(this.modKeyEl && this.modKeyEl.value ? this.modKeyEl.value : getModKey() || ""));
    var headers = apiAuthHeaders();
    fetch(this.api + "/mod/session?author=" + author + "&modKey=" + modKey, {
      headers: headers,
      credentials: "include",
    })
      .then(function (r) {
        return r.json();
      })
      .then(function (data) {
        if (!data.ok) return;
        self.isMod = !!data.isModerator;
        self.modPerms = data.permissions || {};
        if (self.formsBtn && self.modPerms.can_launch_forms) {
          self.formsBtn.hidden = false;
        } else if (self.formsBtn) {
          self.formsBtn.hidden = true;
        }
        self.loadSwagTags();
        self.renderThread();
      })
      .catch(function () {});
  };

  MessengerApp.prototype.modPost = function (path, payload) {
    var self = this;
    var headers = apiAuthHeaders();
    headers["Content-Type"] = "application/json";
    return fetch(this.api + "/" + path, {
      method: "POST",
      headers: headers,
      credentials: "include",
      body: JSON.stringify(this.modPayload(payload)),
    })
      .then(function (r) {
        return r.json();
      })
      .then(function (data) {
        if (data.ok && data.message) {
          self.upsertMessage(data.message);
        }
        return data;
      });
  };

  MessengerApp.prototype.upsertMessage = function (m) {
    if (!m || !m.id) return;
    var idx = -1;
    for (var i = 0; i < this.messages.length; i++) {
      if (this.messages[i].id === m.id) {
        idx = i;
        break;
      }
    }
    if (idx >= 0) {
      this.messages[idx] = m;
      this.renderThread();
      return;
    }
    this.appendMessage(m);
  };

  MessengerApp.prototype.bindFormCards = function () {
    var self = this;
    if (!this.threadEl) return;
    this.threadEl.querySelectorAll(".mm-form-body").forEach(function (formEl) {
      if (formEl.dataset.bound) return;
      formEl.dataset.bound = "1";
      formEl.addEventListener("submit", function (ev) {
        ev.preventDefault();
        var card = formEl.closest(".mm-form-card");
        var formId = card ? card.getAttribute("data-form-id") : "";
        if (formId) self.submitFormCard(formId, formEl);
      });
    });
  };

  MessengerApp.prototype.loadForms = function () {
    var self = this;
    if (this.edition !== "pro") return;
    fetch(this.api + "/forms", { headers: { Accept: "application/json" } })
      .then(function (r) {
        return r.json();
      })
      .then(function (data) {
        if (!data.ok || !data.forms) return;
        self.forms = data.forms;
        self.renderFormLauncher();
      })
      .catch(function () {});
  };

  MessengerApp.prototype.renderFormLauncher = function () {
    if (!this.formGrid) return;
    var self = this;
    this.formGrid.innerHTML = "";
    this.forms.forEach(function (form) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "mm-form-launch";
      b.innerHTML = "<strong>" + esc(form.title) + "</strong><span>" + esc(form.templateLabel || form.template) + "</span>";
      b.addEventListener("click", function () {
        self.launchForm(form.id);
      });
      self.formGrid.appendChild(b);
    });
  };

  MessengerApp.prototype.launchForm = function (formId) {
    var self = this;
    this.modPost("mod/forms/" + encodeURIComponent(formId) + "/launch", {}).then(function (data) {
      if (data.ok && self.formPicker) {
        self.formPicker.classList.remove("is-open");
      }
    });
  };

  MessengerApp.prototype.submitFormCard = function (formId, formEl) {
    var self = this;
    var answers = {};
    formEl.querySelectorAll("[data-field-id]").forEach(function (input) {
      var fid = input.getAttribute("data-field-id");
      if (!fid) return;
      if (input.type === "radio") {
        if (input.checked) answers[fid] = input.value;
      } else if (input.tagName === "SELECT" || input.type !== "radio") {
        answers[fid] = input.value;
      }
    });
    fetch(this.api + "/forms/" + encodeURIComponent(formId) + "/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ author: getNick() || "anon", answers: answers }),
    })
      .then(function (r) {
        return r.json();
      })
      .then(function (data) {
        if (data.ok) {
          formEl.innerHTML = '<p class="mm-form-thanks">Thanks — response saved.</p>';
        }
      });
  };

  MessengerApp.prototype.bindModMenus = function () {
    var self = this;
    if (!this.isMod || !this.threadEl) return;
    this.threadEl.querySelectorAll("[data-mm-msg]").forEach(function (node) {
      var menu = node.querySelector(".mm-mod-menu");
      if (!menu || menu.dataset.bound) return;
      menu.dataset.bound = "1";
      menu.querySelectorAll("[data-mod-action]").forEach(function (btn) {
        btn.addEventListener("click", function (ev) {
          ev.stopPropagation();
          var action = btn.getAttribute("data-mod-action");
          var msgId = node.getAttribute("data-mm-msg");
          var target = node.getAttribute("data-mm-author");
          if (action === "edit" && self.modPerms.can_edit) {
            var bubble = node.querySelector(".mud-messenger-bubble");
            var next = window.prompt("Edit message:", bubble ? bubble.innerText : "");
            if (next === null) return;
            self.modPost("mod/message/edit", { messageId: msgId, body: next });
          } else if (action === "delete" && self.modPerms.can_delete) {
            self.modPost("mod/message/delete", { messageId: msgId });
          } else if (action === "warn" && self.modPerms.can_warn) {
            var reason = window.prompt("Warning reason for " + target + ":", "Please keep it civil.");
            if (!reason) return;
            self.modPost("mod/warn", { target: target, reason: reason });
          } else if (action === "boot" && self.modPerms.can_boot) {
            self.modPost("mod/boot", { target: target, minutes: 60 });
          } else if (action === "ban" && self.modPerms.can_ban) {
            if (window.confirm("Ban " + target + " from all rooms?")) {
              self.modPost("mod/ban", { target: target, days: 7 });
            }
          } else if (action === "unban" && self.modPerms.can_ban) {
            self.modPost("mod/unban", { target: target });
          }
        });
      });
    });
  };

  MessengerApp.prototype.renderFormFields = function (form) {
    var html = "";
    (form.fields || []).forEach(function (field) {
      var id = esc(field.id || "");
      var label = esc(field.label || field.id || "");
      var req = field.required ? " *" : "";
      html += '<label class="mm-form-field"><span class="mm-form-label">' + label + req + "</span>";
      if (field.type === "textarea") {
        html += '<textarea data-field-id="' + id + '" rows="2"></textarea>';
      } else if (field.type === "radio" || field.type === "select") {
        html += field.type === "select"
          ? '<select data-field-id="' + id + '"><option value="">Choose…</option>'
          : '<div class="mm-form-options">';
        (field.options || []).forEach(function (opt, idx) {
          var val = esc(opt);
          if (field.type === "select") {
            html += '<option value="' + val + '">' + val + "</option>";
          } else {
            html += '<label><input type="radio" name="f_' + id + '" data-field-id="' + id + '" value="' + val + '"> ' + val + "</label>";
          }
        });
        html += field.type === "select" ? "</select>" : "</div>";
      } else {
        html += '<input type="' + esc(field.type === "email" ? "email" : field.type === "date" ? "date" : "text") + '" data-field-id="' + id + '">';
      }
      html += "</label>";
    });
    return html;
  };

  MessengerApp.prototype.renderFormMessage = function (m) {
    var form = m.form || {};
    var formId = esc(m.formId || form.id || "");
    var intro = form.intro ? '<p class="mm-form-intro">' + esc(form.intro) + "</p>" : "";
    return (
      '<div class="mm-form-card" data-form-id="' +
      formId +
      '">' +
      '<div class="mm-form-head"><strong>' +
      esc(form.title || "Form") +
      '</strong><span class="mm-form-template">' +
      esc(form.templateLabel || form.template || "") +
      "</span></div>" +
      intro +
      '<form class="mm-form-body">' +
      this.renderFormFields(form) +
      '<button type="submit" class="mm-form-submit">Submit</button></form></div>'
    );
  };

  MessengerApp.prototype.renderModMenu = function (m, nick) {
    if (!this.isMod || m.author === nick || m.type === "system") {
      return "";
    }
    var btns = "";
    if (this.modPerms.can_edit && m.type === "text") btns += '<button type="button" data-mod-action="edit" title="Edit">✏️</button>';
    if (this.modPerms.can_delete) btns += '<button type="button" data-mod-action="delete" title="Delete">🗑</button>';
    if (this.modPerms.can_warn) btns += '<button type="button" data-mod-action="warn" title="Warn">⚠️</button>';
    if (this.modPerms.can_boot) btns += '<button type="button" data-mod-action="boot" title="Boot">🥾</button>';
    if (this.modPerms.can_ban) {
      btns += '<button type="button" data-mod-action="ban" title="Ban">⛔</button>';
      btns += '<button type="button" data-mod-action="unban" title="Unban">✅</button>';
    }
    if (!btns) return "";
    return '<div class="mm-mod-menu">' + btns + "</div>";
  };

  MessengerApp.prototype.renderBody = function (raw) {
    return renderMarkdown(raw, this.swagTagMap);
  };

  MessengerApp.prototype.loadSwagTags = function () {
    var self = this;
    if (!this.isMod) {
      if (this.swagBtn) this.swagBtn.hidden = true;
      if (this.swagPicker) this.swagPicker.hidden = true;
      return;
    }
    var headers = apiAuthHeaders();
    fetch(this.api + "/swag-tags", { headers: headers, credentials: "include" })
      .then(function (r) {
        return r.json();
      })
      .then(function (data) {
        if (!data.ok || !data.tags || !data.tags.length) {
          return;
        }
        self.swagTags = data.tags;
        self.swagTagMap = {};
        data.tags.forEach(function (tag) {
          if (tag.tag) {
            self.swagTagMap[String(tag.tag).toLowerCase()] = tag;
          }
        });
        self.renderSwagPicker();
        if (self.swagBtn) {
          self.swagBtn.hidden = false;
        }
        if (self.swagPicker) {
          self.swagPicker.hidden = false;
        }
        self.renderThread();
      })
      .catch(function () {});
  };

  MessengerApp.prototype.renderSwagPicker = function () {
    if (!this.swagGrid) {
      return;
    }
    var self = this;
    this.swagGrid.innerHTML = "";
    this.swagTags.forEach(function (tag) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "mm-swag-pick";
      b.title = tag.title + " — :" + tag.tag + ":";
      b.innerHTML =
        '<img src="' +
        esc(tag.image) +
        '" alt="" loading="lazy">' +
        '<span>:' +
        esc(tag.tag) +
        ":</span>";
      b.addEventListener("click", function () {
        self.insertAtCursor(":" + tag.tag + ":");
        self.swagPicker.classList.remove("is-open");
      });
      self.swagGrid.appendChild(b);
    });
  };

  MessengerApp.prototype.loadGroups = function () {
    var self = this;
    fetch(this.api + "/groups", { headers: { Accept: "application/json" } })
      .then(function (r) {
        return r.json();
      })
      .then(function (data) {
        if (!data.ok) return;
        self.groups = data.groups || [];
        self.renderGroups();
      })
      .catch(function () {});
  };

  MessengerApp.prototype.renderGroups = function () {
    var self = this;
    this.groupsEl.innerHTML = "";
    this.groups.forEach(function (g) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className =
        "mud-messenger-group-btn" + (g.id === self.group ? " is-active" : "");
      btn.innerHTML =
        '<span class="mm-emoji">' +
        esc(g.emoji || "💬") +
        "</span><span>" +
        esc(g.title || g.id) +
        "</span>";
      btn.addEventListener("click", function () {
        self.switchGroup(g.id);
      });
      self.groupsEl.appendChild(btn);
    });
  };

  MessengerApp.prototype.switchGroup = function (id) {
    this.group = id;
    this.messages = [];
    this.lastId = "";
    this.renderGroups();
    this.loadMessages();
    this.reconnectStream();
  };

  MessengerApp.prototype.loadMessages = function () {
    var self = this;
    fetch(
      this.api +
        "/messages?group=" +
        encodeURIComponent(this.group) +
        "&limit=80",
      { headers: { Accept: "application/json" } }
    )
      .then(function (r) {
        return r.json();
      })
      .then(function (data) {
        if (!data.ok) return;
        self.messages = data.messages || [];
        if (self.messages.length) {
          self.lastId = self.messages[self.messages.length - 1].id || "";
        }
        self.renderThread();
      })
      .catch(function () {
        self.threadEl.innerHTML =
          '<p class="mud-messenger-empty">Chat relay offline. Is PHP running?</p>';
      });
  };

  MessengerApp.prototype.renderThread = function () {
    var self = this;
    var nick = getNick();
    if (!this.messages.length) {
      this.threadEl.innerHTML =
        '<p class="mud-messenger-empty">No messages yet. Say hi to the resistance.</p>';
      return;
    }
    this.threadEl.innerHTML = this.messages
      .map(function (m) {
        return self.renderMessage(m, nick);
      })
      .join("");
    this.bindModMenus();
    this.bindFormCards();
    this.scrollThread();
  };

  MessengerApp.prototype.renderMessage = function (m, nick) {
    var isMe = nick && m.author === nick;
    var isSystem = m.type === "system" || m.deleted;
    var body = "";
    var bubbleClass = "mud-messenger-bubble mud-messenger-md";

    if (m.type === "form" && m.form) {
      body = this.renderFormMessage(m);
      bubbleClass = "mud-messenger-bubble mud-messenger-form-wrap";
    } else if (m.type === "giphy" && m.giphyUrl) {
      body =
        '<img class="mm-giphy" src="' +
        esc(m.giphyUrl) +
        '" alt="GIF" loading="lazy">';
    } else if (isSystem) {
      body = this.renderBody(m.body || "");
      bubbleClass = "mud-messenger-bubble mud-messenger-system";
    } else {
      body = this.renderBody(m.body || "");
      if (m.edited) {
        body += '<span class="mm-edited-tag"> (edited)</span>';
      }
    }

    var modMenu = this.renderModMenu(m, nick);

    var role = String(m.author_role || "");
    var roleClass = role ? " is-role-" + role : "";

    return (
      '<div class="mud-messenger-msg' +
      (isMe ? " is-me" : "") +
      (isSystem ? " is-system" : "") +
      roleClass +
      '" data-mm-msg="' +
      escAttr(m.id || "") +
      '" data-mm-author="' +
      escAttr(m.author || "") +
      '">' +
      '<div class="mud-messenger-msg-meta' +
      roleClass +
      '">' +
      esc(m.author || "anon") +
      " · " +
      esc(fmtTime(m.ts)) +
      modMenu +
      "</div>" +
      '<div class="' +
      bubbleClass +
      '">' +
      body +
      "</div></div>"
    );
  };

  MessengerApp.prototype.appendMessage = function (m) {
    var nick = getNick();
    var empty = this.threadEl.querySelector(".mud-messenger-empty");
    if (empty) empty.remove();
    this.messages.push(m);
    this.lastId = m.id || this.lastId;
    this.threadEl.insertAdjacentHTML("beforeend", this.renderMessage(m, nick));
    this.bindModMenus();
    this.bindFormCards();
    this.scrollThread();
    if (!this.open && m.author !== nick) {
      this.unread++;
      this.updateBadge();
    }
  };

  MessengerApp.prototype.scrollThread = function () {
    this.threadEl.scrollTop = this.threadEl.scrollHeight;
  };

  MessengerApp.prototype.sendText = function () {
    var body = this.getComposeMarkdown();
    if (!body || !editorPlainText(this.inputEl)) return;
    if (body.length > 4000) {
      body = body.slice(0, 4000);
    }
    var nick = String(this.nickEl.value || getNick() || "anon").trim() || "anon";
    setNick(nick);
    this.postMessage({ type: "text", body: body });
    this.clearCompose();
  };

  MessengerApp.prototype.sendGiphy = function (item) {
    var nick = String(this.nickEl.value || getNick() || "anon").trim() || "anon";
    setNick(nick);
    this.postMessage({
      type: "giphy",
      giphyId: item.id,
      giphyUrl: item.url,
    });
    this.giphyPicker.classList.remove("is-open");
  };

  MessengerApp.prototype.postMessage = function (payload) {
    var self = this;
    payload.group = this.group;
    payload.author = String(this.nickEl.value || getNick() || "anon").trim() || "anon";
    if (this.isMod && this.modKeyEl && this.modKeyEl.value) {
      payload.modKey = String(this.modKeyEl.value).trim();
    }
    var headers = apiAuthHeaders();
    headers["Content-Type"] = "application/json";
    fetch(this.api + "/messages", {
      method: "POST",
      headers: headers,
      credentials: "include",
      body: JSON.stringify(payload),
    })
      .then(function (r) {
        return r.json();
      })
      .then(function (data) {
        if (data.ok && data.message) {
          self.appendMessage(data.message);
          return;
        }
        if (data.detail || data.error || data.message) {
          alert(data.detail || data.error || data.message);
        }
      })
      .catch(function () {});
  };

  MessengerApp.prototype.searchGiphy = function (q) {
    var url =
      this.api +
      "/giphy/search?q=" +
      encodeURIComponent(q || "");
    this.fetchGiphy(url);
  };

  MessengerApp.prototype.fetchGiphy = function (url) {
    var self = this;
    var grid = this.giphyGrid || this.panel.querySelector("[data-mm-giphy-grid]");
    if (!grid) return;
    grid.innerHTML = '<p class="mud-messenger-empty">Loading GIFs…</p>';
    fetch(url, { headers: { Accept: "application/json" } })
      .then(function (r) {
        return r.json().then(function (json) {
          return { ok: r.ok, status: r.status, json: json };
        });
      })
      .then(function (res) {
        var data = res.json;
        if (data && data.data && typeof data.data === "object" && data.ok !== false) {
          data = data.data;
        }
        if (!data.ok) {
          grid.innerHTML =
            '<p class="mud-messenger-empty">' +
            esc(data.error || data.detail || data.message || "Giphy request failed.") +
            "</p>";
          return;
        }
        if (!data.results || !data.results.length) {
          grid.innerHTML = '<p class="mud-messenger-empty">No GIFs found for that search.</p>';
          return;
        }
        grid.innerHTML = "";
        data.results.forEach(function (item) {
          var b = document.createElement("button");
          b.type = "button";
          b.title = item.title || "GIF";
          b.innerHTML =
            '<img src="' + esc(item.preview || item.url) + '" alt="" loading="lazy">';
          b.addEventListener("click", function () {
            self.sendGiphy(item);
          });
          grid.appendChild(b);
        });
      })
      .catch(function () {
        grid.innerHTML = '<p class="mud-messenger-empty">Giphy offline — check API key in Admin → Messenger Pro → Giphy.</p>';
      });
  };

  MessengerApp.prototype.connectStream = function () {
    var self = this;
    this.stopStream();

    var pollOnly =
      this.pollOnly ||
      this.root.getAttribute("data-realtime") === "poll" ||
      this.root.getAttribute("data-poll-only") === "1";

    if (pollOnly || typeof EventSource === "undefined") {
      this.pollTimer = setInterval(function () {
        self.pollNew();
      }, this.pollMs);
      return;
    }

    var url =
      this.api +
      "/stream/" +
      encodeURIComponent(this.group) +
      "?since=" +
      encodeURIComponent(this.lastId || "");
    try {
      this.eventSource = new EventSource(url);
      this.eventSource.addEventListener("message", function (ev) {
        try {
          var data = JSON.parse(ev.data);
          if (data.ok && data.message) {
            var exists = self.messages.some(function (m) {
              return m.id === data.message.id;
            });
            if (!exists) self.appendMessage(data.message);
          }
        } catch (_e) {}
      });
      this.eventSource.onerror = function () {
        self.stopStream();
        self.pollTimer = setInterval(function () {
          self.pollNew();
        }, self.pollMs);
      };
    } catch (_e) {
      this.pollTimer = setInterval(function () {
        self.pollNew();
      }, this.pollMs);
    }
  };

  MessengerApp.prototype.reconnectStream = function () {
    this.connectStream();
  };

  MessengerApp.prototype.stopStream = function () {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  };

  MessengerApp.prototype.pollNew = function () {
    var self = this;
    if (!this.lastId) return;
    fetch(
      this.api +
        "/messages?group=" +
        encodeURIComponent(this.group) +
        "&since=" +
        encodeURIComponent(this.lastId) +
        "&limit=50",
      { headers: { Accept: "application/json" } }
    )
      .then(function (r) {
        return r.json();
      })
      .then(function (data) {
        if (!data.ok || !data.messages) return;
        data.messages.forEach(function (m) {
          var exists = self.messages.some(function (x) {
            return x.id === m.id;
          });
          if (!exists) self.appendMessage(m);
        });
      })
      .catch(function () {});
  };

  function applyThreadBackground(root) {
    var bg = String(root.getAttribute("data-thread-bg") || "").trim();
    if (!bg) return;
    root.style.setProperty("--mm-thread-bg-image", 'url("' + bg.replace(/"/g, "") + '")');
    root.classList.add("mud-messenger-root--has-thread-bg");
  }

  function bootRoot(root) {
    var preset = String(root.getAttribute("data-theme-preset") || "").replace(/[^a-z0-9_-]/gi, "");
    if (preset) {
      root.classList.add("mud-messenger-root--preset-" + preset);
    }
    if (root.getAttribute("data-theme-style")) {
      root.setAttribute("style", root.getAttribute("data-theme-style"));
    }
    applyThreadBackground(root);
    var session = parseSessionAttr(root);
    var app = new MessengerApp({
      root: root,
      api: root.getAttribute("data-api") || "/api/v1/mud-messenger",
      defaultGroup: root.getAttribute("data-default-group") || "general",
      giphyEnabled: root.getAttribute("data-giphy") === "1",
      pollMs: parseInt(root.getAttribute("data-poll") || "2500", 10),
      embed: root.hasAttribute("data-mud-messenger-embed"),
      edition: root.getAttribute("data-edition") || "lite",
      moderationEnabled: root.getAttribute("data-moderation") !== "0",
      brandTitle: root.getAttribute("data-brand-title") || "GravFans Messenger",
      showFooter: root.getAttribute("data-footer") === "1",
      footerText: root.getAttribute("data-footer-text") || "Powered by GravFans.Live",
      footerUrl: root.getAttribute("data-footer-url") || "https://gravfans.live",
      launcherIcon: root.getAttribute("data-launcher-icon") || "💬",
      launcherPosition: root.getAttribute("data-launcher-position") || "bottom-right",
      pollOnly:
        root.getAttribute("data-realtime") === "poll" ||
        root.getAttribute("data-poll-only") === "1",
      session: session,
      nickLocked: !!(session && session.nick_locked),
      adminCockpit: root.getAttribute("data-admin-cockpit") === "1",
    });
    root._mmApp = app;
  }

  function mountEmbed(el) {
    if (!el || el.querySelector("[data-mud-messenger]")) {
      return el && el.querySelector("[data-mud-messenger]");
    }
    var inner = document.createElement("div");
    inner.setAttribute("data-mud-messenger", "");
    inner.setAttribute("data-mud-messenger-embed", "");
    inner.setAttribute("data-api", el.getAttribute("data-api") || "/api/v1/mud-messenger");
    inner.setAttribute("data-default-group", el.getAttribute("data-group") || "general");
    inner.setAttribute("data-giphy", el.getAttribute("data-giphy") || "1");
    inner.setAttribute("data-poll", el.getAttribute("data-poll") || "2500");
    if (el.getAttribute("data-edition")) {
      inner.setAttribute("data-edition", el.getAttribute("data-edition"));
    }
    if (el.getAttribute("data-brand-title")) {
      inner.setAttribute("data-brand-title", el.getAttribute("data-brand-title"));
    }
    if (el.getAttribute("data-footer")) {
      inner.setAttribute("data-footer", el.getAttribute("data-footer"));
    }
    if (el.getAttribute("data-footer-text")) {
      inner.setAttribute("data-footer-text", el.getAttribute("data-footer-text"));
    }
    if (el.getAttribute("data-footer-url")) {
      inner.setAttribute("data-footer-url", el.getAttribute("data-footer-url"));
    }
    if (el.getAttribute("data-launcher-icon")) {
      inner.setAttribute("data-launcher-icon", el.getAttribute("data-launcher-icon"));
    }
    if (el.getAttribute("data-launcher-position")) {
      inner.setAttribute("data-launcher-position", el.getAttribute("data-launcher-position"));
    }
    if (el.getAttribute("data-realtime")) {
      inner.setAttribute("data-realtime", el.getAttribute("data-realtime"));
    }
    if (el.getAttribute("data-theme-style")) {
      inner.setAttribute("data-theme-style", el.getAttribute("data-theme-style"));
    }
    if (el.getAttribute("data-theme") === "goggrav") {
      inner.className = "mud-messenger-root mud-messenger-root--goggrav";
    }
    el.appendChild(inner);
    bootRoot(inner);
    return inner;
  }

  window.MudMessengerBoot = bootRoot;
  window.MudMessengerMountEmbed = mountEmbed;

  document.querySelectorAll("[data-mud-messenger]").forEach(bootRoot);
  document.querySelectorAll("[data-mud-messenger-embed]").forEach(mountEmbed);
})();
