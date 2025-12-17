import {AppCertificateGenerator} from './Apparmor.js';
import { Journal } from "./Journal.js";

// Mint Dock
class AppRegistry {
  constructor() {
    this.apps = new Map();
  }

  register(app) {
    if (!app.id) throw new Error("App must have id");
    this.apps.set(app.id, {
      ...app,
      state: "idle", // idle | open | minimized
      instance: null
    });
  }

  get(id) {
    return this.apps.get(id);
  }

  setState(id, state) {
    const app = this.apps.get(id);
    if (app) app.state = state;
  }
}
class TaskbarShortcuts {
  constructor(registry) {
    this.registry = registry;
    this.container = document.querySelector(".dock");
    this.icons = new Map();
  }

  add(appId) {
    const app = this.registry.get(appId);
    if (!app || this.icons.has(appId)) return;

    const icon = document.createElement("div");
    icon.className = "taskbar-icon dot_icon";
    icon.style.backgroundImage = `url(${app.icon})`;
    icon.title = app.title;

    const indicator = document.createElement("div");
    indicator.className = "app-status-indicator";
    icon.appendChild(indicator);


    icon.addEventListener("click", () => {
      app.execute();
    });

    icon.addEventListener("mouseenter", () => {
      if (app.thumbnailPreview && app.windowType === "Modern") {
        PreviewManager.show(appId, icon);
      }
    });

    icon.addEventListener("mouseleave", () => {
      PreviewManager.hide(appId);
    });

    this.container.appendChild(icon);
    this.icons.set(appId, icon);
  }

updateState(appId, state) {
  const icon = this.icons.get(appId);
  if (!icon) return;

  // Limpiar animaciones previas
  icon.classList.remove("appopen", "appclose");

  if (state === "open") {
    icon.classList.add("active", "appopen");
    icon.classList.remove("minimized");
  }

  else if (state === "minimized") {
    icon.classList.add("minimized");
    icon.classList.remove("active");
  }

  else if (state === "closed") {
    icon.classList.add("appclose");
    icon.classList.remove("active", "minimized");

    // Opcional: quitar tras animación
    setTimeout(() => {
      icon.classList.remove("appclose");
    }, 200);
  }
}

}
class AppLauncher {
  constructor(registry) {
    this.registry = registry;
  }

  add(appId, regShortcut = false) {
    const app = this.registry.get(appId);
    if (!app) return;

    // menú / grid por categorías
    if (regShortcut) {
      this.createDesktopShortcut(app);
    }
  }

  createDesktopShortcut(app) {
    // opcional
  }
}
class PreviewManager {
  static current = null;
  static registry = null; // se inyecta una vez

  static init(registry) {
    this.registry = registry;
  }

  static async show(appId, anchorEl) {
    if (!this.registry) return;

    const app = this.registry.get(appId);
    if (!app) return;

    this.hide();

    const preview = document.createElement("div");
    preview.className = "taskbar-preview";

    const title = document.createElement("div");
    title.className = "preview-title";
    title.textContent = app.title || app.name;

    preview.appendChild(title);

    // ── Snapshot ──
    if (app.window?.getSnapshot) {
      const canvas = await app.window.getSnapshot();
      if (canvas) preview.appendChild(canvas);
    }

    document.body.appendChild(preview);

    const r = anchorEl.getBoundingClientRect();
    preview.style.left = `${r.left}px`;
    preview.style.bottom = `64px`;

    this.current = preview;
  }

  static hide() {
    if (this.current) {
      this.current.remove();
      this.current = null;
    }
  }
}

class Taskbar {
  constructor() {
    this.registry = new AppRegistry();
    this.launcher = new AppLauncher(this.registry);
    this.shortcuts = new TaskbarShortcuts(this.registry);
    PreviewManager.init(this.registry);
  }

  addApp(config) {
    this.registry.register(config);
    if (config.pinned) {
      this.shortcuts.add(config.id);
    }
  }

  registerApptoLauncher(config) {
    this.registry.register(config);
    this.launcher.add(config.id, config.regShortcut);
  }

  updateAppState(appId, state) {
    this.registry.setState(appId, state);
    this.shortcuts.updateState(appId, state);
  }
}

// Mint Window Manager Legacy
class WDM {
    constructor(containerOrConfig = {}, maximizedOrUndefined = false) {
        // support legacy signature: (selectorString, maximized)
        this.noMaximize = !!maximizedOrUndefined;
        this.isDragging = false;
        this.isResizing = false;
        this.previousSize = {};
        this.isMinimized = false;
        this.dockInstance = null;
        this.onStateChange = null;
        this.maximized = false;
        this.prevSize = null;
        this.prevPos = null;
        this.contentEl = null;

        // interpret containerOrConfig
        if (typeof containerOrConfig === 'string') {
            // selector string: try to find element, else create one with that id
            const sel = containerOrConfig;
            let el = document.querySelector(sel);
            if (!el) {
                const id = sel.startsWith('#') ? sel.slice(1) : sel;
                el = this._createWindowElement({ id, name: id });
                document.querySelector('.desktop').appendChild(el);
            }
            this.container = el;
            this.WDM_Name = sel;
        } else if (containerOrConfig instanceof Element) {
            this.container = containerOrConfig;
            this.WDM_Name = `#${this.container.id || ('cw-' + Math.random().toString(36).slice(2, 6))}`;
        } else if (typeof containerOrConfig === 'object') {
            // config object
            const cfg = containerOrConfig;
            const id = cfg.id || `cw-${Date.now()}-${Math.random().toString(36).slice(2, 4)}`;
            let el = document.getElementById(id);
            if (!el) {
                el = this._createWindowElement({
                    id,
                    name: cfg.name || id,
                    left: cfg.left,
                    top: cfg.top,
                    width: cfg.width,
                    height: cfg.height,
                    icon: cfg.icon
                });
                document.querySelector('.desktop').appendChild(el);
            }
            this.container = el;
            this.WDM_Name = cfg.name || `#${id}`;
            if (cfg.startMinimized) {
                this.isMinimized = true;
                try { this.container.style.display = 'none'; } catch (e) { }
            }
        } else {
            throw new Error("WDM: parámetro inválido en constructor");
        }

        // ensure dataset.icon exists
        if (!this.container.dataset) this.container.dataset = {};
        this.container.dataset.icon = this.container.dataset.icon || '';

this.config = Object.assign({
  minWidth: 200,
  minHeight: 120,
  width: (this.container ? this.container.offsetWidth : 480),
  height: (this.container ? this.container.offsetHeight : 320)
}, (typeof containerOrConfig === 'object' ? containerOrConfig : {}));

        // init UI references and event wiring
        this.init();
    }

    // crea un DOM básico de ventana
    _createWindowElement({ id, name = 'App', left = 120, top = 120, width = 480, height = 320, icon = '' } = {}) {
        const el = document.createElement('div');
        el.className = 'window';
        el.id = id;
        el.style.position = 'absolute';
        el.style.left = `${left}px`;
        el.style.top = `${top}px`;
        el.style.width = `${width}px`;
        el.style.height = `${height}px`;
        //el.style.background = '#111';
        el.style.color = '#fff';
        el.dataset.icon = icon || '';

        el.innerHTML = `
      <div class="window-titlebar" id="${name}">${name}
        <span class="controls" style="float:right">
          <button class="minimize">_</button>
          <button class="maximize">▢</button>
          <button class="close">×</button>
        </span>
      </div>
      <div class="window-content"></div>
    `;
        return el;
    }

    init() {
        // grab basic elements (create if missing)
        this.titleBar = this.container.querySelector(".window-titlebar");
        this.minimizeButton = this.container.querySelector(".minimize");
        this.maximizeButton = this.container.querySelector(".maximize");
        this.closeButton = this.container.querySelector(".close");
        this.resizeHandle = this.container.querySelector(".resize-handle");
        if (!this.resizeHandle) {
            this.resizeHandle = document.createElement("div");
            this.resizeHandle.className = "resize-handle";
            this.container.appendChild(this.resizeHandle);
        }

        // safe defaults for style/zIndex
        if (!this.container.style.position) this.container.style.position = 'absolute';
        if (!this.container.style.zIndex) this.container.style.zIndex = 1000;

        this.addEventListeners();
    }

    addEventListeners() {
        // guards: botones pueden faltar si custom UI
        if (this.minimizeButton) this.minimizeButton.addEventListener("click", () => this.minimizeWindow());
        if (this.maximizeButton) {
            if (this.noMaximize === true) this.maximizeButton.style.pointerEvents = 'none';
            else this.maximizeButton.addEventListener("click", () => this.maximizeWindow());
        }
        if (this.closeButton) this.closeButton.addEventListener("click", () => this.closeWindow());

        if (this.titleBar) {
            this._titlePointerDown = (e) => this.startDrag(e);
            this.titleBar.addEventListener("mousedown", this._titlePointerDown);
        }

        // listeners globales simples (legacy style)
        this._docMouseMove = (e) => this.dragWindow(e);
        this._docMouseUp = () => this.stopDrag();
        document.addEventListener("mousemove", this._docMouseMove);
        document.addEventListener("mouseup", this._docMouseUp);

        this._resizePointerDown = (e) => this.startResize(e);
        this.resizeHandle.addEventListener("mousedown", this._resizePointerDown);
        this._docResizeMove = (e) => this.resizeWindow(e);
        this._docResizeUp = () => this.stopResize();
        document.addEventListener("mousemove", this._docResizeMove);
        document.addEventListener("mouseup", this._docResizeUp);

        // bring to front on click
        this._bringPointerDown = () => this.bringToFront();
        this.container.addEventListener("mousedown", this._bringPointerDown);
    }

    // muestra/oculta estado en top bar (si existe)
    currentAPP() {
        try {
            const Activity = document.getElementById("app-1");
            if (!Activity) return;
            Activity.innerHTML = (this.container.style.display === "none") ? "Desktop" : (this.WDM_Name.replace('#', ''));
        } catch (e) { }
    }

    setContent(html) {
        const content = this.container.querySelector(".window-content");
        if (!content) return;
        content.innerHTML = html;
        this.contentEl = this.container.querySelector('.window-content');
        return this.contentEl;
    }

    getContent(){
        return this.contentEl;
    }

    appendContent(node) {
        const content = this.container.querySelector(".window-content");
        if (!content) return;
        content.appendChild(node);
    }

    maximizeWindow() {
        if (this.noMaximize) return;
        if (!this.maximized) {
            const rect = this.container.getBoundingClientRect();
            this.prevSize = { width: `${rect.width}px`, height: `${rect.height}px` };
            this.prevPos = { left: `${rect.left}px`, top: `${rect.top}px` };
            const topBar = document.getElementById("top-bar");
            const topBarHeight = topBar ? topBar.getBoundingClientRect().height : 0;
            this.container.style.left = "0";
            this.container.style.top = `${topBarHeight}px`;
            this.container.style.width = "100vw";
            this.container.style.height = `calc(93.2vh - ${topBarHeight + (this._taskbarHeight() || 0)}px)`;
            this.container.style.borderRadius = '0px';
            this.maximized = true;
            // hide dock if present
            const tb = document.querySelector(".docker");
            if (tb) tb.style.display = "none";
            if (this.onStateChange) this.onStateChange("open");
        } else {
            this.restoreWindow();
        }
    }

    minimizeWindow() {
        try { this.container.style.display = "none"; } catch (e) { }
        this.isMinimized = true;
        this.currentAPP();
        if (this.onStateChange) this.onStateChange("minimized");
        // notify dock if attached
        try {
            if (this.dockInstance && this.dockInstance.apps && this.dockInstance.apps[this.WDM_Name]) {
                this.dockInstance.apps[this.WDM_Name].icon.classList.add("minimized");
                this.dockInstance.apps[this.WDM_Name].icon.classList.remove("active");
            }
        } catch (e) { }
    }
restoreWindow() {
  try {
    if (this.prevSize && this.prevPos) {
      this.container.style.width = this.prevSize.width;
      this.container.style.height = this.prevSize.height;
      this.container.style.left = this.prevPos.left;
      this.container.style.top = this.prevPos.top;
    } else {
      const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
      const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);

      // desired puede venir de this.config; lo normalizamos a número válido
      let desiredW = Number(this?.config?.width);
      let desiredH = Number(this?.config?.height);
      if (!desiredW || isNaN(desiredW)) desiredW = this.container?.offsetWidth || 800;
      if (!desiredH || isNaN(desiredH)) desiredH = this.container?.offsetHeight || 600;

      const minW = (this.config && this.config.minWidth) ? Number(this.config.minWidth) : 200;
      const minH = (this.config && this.config.minHeight) ? Number(this.config.minHeight) : 120;

      const maxW = Math.max(100, Math.floor(vw * 0.95));
      const maxH = Math.max(100, Math.floor(vh * 0.90));

      const w = Math.max(minW, Math.min(desiredW, maxW));
      const h = Math.max(minH, Math.min(desiredH, maxH));

      this.container.style.width = `${w}px`;
      this.container.style.height = `${h}px`;

      this.container.style.left = `${Math.max(0, Math.round((vw - w) / 2))}px`;
      this.container.style.top = `${Math.max(0, Math.round((vh - h) / 2))}px`;
      this.container.style.borderRadius = '7px';
    }
  } catch (e) {
    console.warn('restoreWindow error', e);
  }

  try { this.container.style.display = "block"; } catch (e) { }
  this.isMinimized = false;
  this.maximized = false;
  this.bringToFront();
  this.currentAPP();
  if (this.onStateChange) this.onStateChange("open");
  try { const tb = document.querySelector(".docker"); if (tb) tb.style.display = "flex"; } catch (e) { }
  // notify dock
  try {
    if (this.dockInstance && this.dockInstance.apps && this.dockInstance.apps[this.WDM_Name]) {
      this.dockInstance.apps[this.WDM_Name].icon.classList.add("active");
      this.dockInstance.apps[this.WDM_Name].icon.classList.remove("minimized");
    }
  } catch (e) { }
}

    closeWindow({ destroy = false } = {}) {
        try { this.container.style.display = "none"; } catch (e) { }
        this.isMinimized = false;
        this.maximized = false;
        if (this.onStateChange) this.onStateChange("closed");
        // clear dock state
        try {
            if (this.dockInstance && this.dockInstance.apps && this.dockInstance.apps[this.WDM_Name]) {
                const entry = this.dockInstance.apps[this.WDM_Name];
                entry.icon.classList.remove("active", "minimized");
            }
        } catch (e) { }
        if (destroy) {
            try { this.destroy?.(); } catch (e) { }
            try { this.container.remove(); } catch (e) { }
            try { if (this.dockInstance && typeof this.dockInstance.removeApp === 'function') this.dockInstance.removeApp(this.WDM_Name); } catch (e) { }
        }
    }

    bringToFront() {
        try {
            const allWindows = document.querySelectorAll(".window");
            let maxZ = 0;
            allWindows.forEach(win => {
                const z = parseInt(win.style.zIndex) || 0;
                maxZ = Math.max(maxZ, z);
            });
            this.container.style.zIndex = maxZ + 1;
        } catch (e) { }
        // mark active in dock
        try {
            if (this.dockInstance && this.dockInstance.apps && this.dockInstance.apps[this.WDM_Name]) {
                const appEntry = this.dockInstance.apps[this.WDM_Name];
                appEntry.icon.classList.add("active");
                appEntry.icon.classList.remove("minimized");
            }
        } catch (e) { }
    }

    fullscreenToggle() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            const topBar = document.getElementById("top-bar"); if (topBar) topBar.style.display = "none";
            const dockEl = document.querySelector(".docker"); if (dockEl) dockEl.style.display = "none";
        } else {
            document.exitFullscreen();
            const topBar = document.getElementById("top-bar"); if (topBar) topBar.style.display = "flex";
            const dockEl = document.querySelector(".docker"); if (dockEl) dockEl.style.display = "flex";
        }
    }

    startDrag(e) {
        if (this.maximized) return;
        this.isDragging = true;
        const rect = this.container.getBoundingClientRect();
        this.offsetX = e.clientX - rect.left;
        this.offsetY = e.clientY - rect.top;
        e.preventDefault();
    }

    dragWindow(e) {
        if (!this.isDragging) return;
        try {
            this.container.style.left = `${Math.max(0, e.clientX - this.offsetX)}px`;
            this.container.style.top = `${Math.max(0, e.clientY - this.offsetY)}px`;
        } catch (e) { }
    }

    stopDrag() { this.isDragging = false; }

    startResize(e) {
        this.isResizing = true;
        const rect = this.container.getBoundingClientRect();
        this.resizeStartX = e.clientX; this.resizeStartY = e.clientY;
        this.resizeStartWidth = rect.width; this.resizeStartHeight = rect.height;
        e.preventDefault();
    }

    resizeWindow(e) {
        if (!this.isResizing) return;
        try {
            const deltaX = e.clientX - this.resizeStartX;
            const deltaY = e.clientY - this.resizeStartY;
            const newW = Math.max(200, this.resizeStartWidth + deltaX);
            const newH = Math.max(120, this.resizeStartHeight + deltaY);
            this.container.style.width = `${newW}px`;
            this.container.style.height = `${newH}px`;
        } catch (e) { }
    }

    stopResize() { this.isResizing = false; }

    attachToDock(dockInstance) {
        try { this.dockInstance = dockInstance; } catch (e) { }
    }

    _taskbarHeight() {
        const tb = document.querySelector(".docker");
        if (!tb) return 0;
        return tb.getBoundingClientRect().height || 0;
    }

    // destroy listeners if needed
    destroy() {
        try {
            if (this.titleBar) this.titleBar.removeEventListener("mousedown", this._titlePointerDown);
            if (this.resizeHandle) this.resizeHandle.removeEventListener("mousedown", this._resizePointerDown);
            document.removeEventListener("mousemove", this._docMouseMove);
            document.removeEventListener("mouseup", this._docMouseUp);
            document.removeEventListener("mousemove", this._docResizeMove);
            document.removeEventListener("mouseup", this._docResizeUp);
            this.container.removeEventListener("mousedown", this._bringPointerDown);
        } catch (e) { }
    }
}

// Mint Window Manager
class MWDM {
  constructor(containerOrConfig = {}, maximizedOrUndefined = false) {
    this.noMaximize = !!maximizedOrUndefined;
    this.isDragging = false;
    this.isResizing = false;
    this.isMinimized = false;
    this.maximized = false;
    this.prevSize = null;
    this.prevPos = null;
    this.dockInstance = null;
    this.onStateChange = null;
    this.contentEl = null;

    // ─── CONFIG ──────────────────────────────
    this.config = Object.assign({
      id: null,
      name: 'App',
      width: 480,
      height: 320,
      minWidth: 200,
      minHeight: 120,
      icon: null,
      titleAlign: 'left',      // left | center
      titleIcon: null,         // icono antes del título
      shortcuts: []            // botones extra junto a handlers
    }, typeof containerOrConfig === 'object' ? containerOrConfig : {});

    // ─── CREAR / RESOLVER CONTENEDOR ─────────
    if (typeof containerOrConfig === 'string') {
      let el = document.querySelector(containerOrConfig);
      if (!el) {
        el = this._createWindowElement();
        document.querySelector('.desktop').appendChild(el);
      }
      this.container = el;
    } else if (containerOrConfig instanceof Element) {
      this.container = containerOrConfig;
    } else if (typeof containerOrConfig === 'object') {
      let el = document.getElementById(this.config.id);
      if (!el) {
        el = this._createWindowElement();
        document.querySelector('.desktop').appendChild(el);
      }
      this.container = el;
    } else {
      throw new Error('WDM: parámetro inválido');
    }

    this.WDM_Name = this.config.name;
    this.init();
  }

  _emitState(state) {
  if (typeof this.onStateChange === "function") {
    this.onStateChange(state);
  }
}

  _createWindowElement() {
    const el = document.createElement('div');
    el.className = 'window';
    el.id = this.config.id || `cw-${Date.now()}`;
    el.style.width = `${this.config.width}px`;
    el.style.height = `${this.config.height}px`;
    el.style.position = 'absolute';
    el.style.left = '120px';
    el.style.top = '120px';

    el.innerHTML = `
      <div class="window-titlebar ${this.config.titleAlign === 'center' ? 'centered' : ''}">
        <div class="title-left">
          ${this.config.titleIcon ? `<img class="window-icon" src="${this.config.titleIcon}">` : ''}
          <span class="window-title-text">${this.config.name}</span>
        </div>
        <div class="title-right">
          <span class="window-shortcuts"></span>
          <span class="controls">
            <button class="minimize">_</button>
            <button class="maximize">▢</button>
            <button class="close">×</button>
          </span>
        </div>
      </div>
      <div class="window-content"></div>
    `;

    return el;
  }

  init() {
    this.titleBar = this.container.querySelector('.window-titlebar');
    this.minimizeButton = this.container.querySelector('.minimize');
    this.maximizeButton = this.container.querySelector('.maximize');
    this.closeButton = this.container.querySelector('.close');
    this.contentEl = this.container.querySelector('.window-content');

    this._initShortcuts();
    this.addEventListeners();
  }

  _initShortcuts() {
    const shortcutsEl = this.container.querySelector('.window-shortcuts');
    if (!shortcutsEl || !this.config.shortcuts?.length) return;

    this.config.shortcuts.forEach(sc => {
      const btn = document.createElement('button');
      btn.className = 'window-shortcut';
      btn.title = sc.title || '';
      btn.innerHTML = sc.icon
        ? `<img src="${sc.icon}">`
        : (sc.text || '•');

      if (typeof sc.onClick === 'function') {
        btn.addEventListener('click', sc.onClick);
      }
      shortcutsEl.appendChild(btn);
    });
  }

  addEventListeners() {
    this.minimizeButton?.addEventListener('click', () => this.minimizeWindow());
    this.maximizeButton?.addEventListener('click', () => this.maximizeWindow());
    this.closeButton?.addEventListener('click', () => this.closeWindow());

    this.titleBar?.addEventListener('mousedown', e => this.startDrag(e));
    document.addEventListener('mousemove', e => this.dragWindow(e));
    document.addEventListener('mouseup', () => this.stopDrag());

    this.container.addEventListener('mousedown', () => this.bringToFront());
  }

setContent(content) {
  this.contentEl.innerHTML = "";

  if (content instanceof Element) {
    this.contentEl.appendChild(content);
  } else {
    this.contentEl.innerHTML = content;
  }

  return this.contentEl;
}

getContent() {
  return this.contentEl;
}

async getSnapshot() {
  const el = this.getContent();
  if (!el) return null;

  // html2canvas o equivalente
  return await html2canvas(el, {
    backgroundColor: null,
    scale: 0.25
  });
}


  startDrag(e) {
    if (this.maximized) return;
    this.isDragging = true;
    const rect = this.container.getBoundingClientRect();
    this.offsetX = e.clientX - rect.left;
    this.offsetY = e.clientY - rect.top;
  }

  dragWindow(e) {
    if (!this.isDragging) return;
    this.container.style.left = `${e.clientX - this.offsetX}px`;
    this.container.style.top = `${e.clientY - this.offsetY}px`;
  }

  stopDrag() {
    this.isDragging = false;
  }

minimizeWindow() {
  this.container.style.display = "none";
  this.isMinimized = true;
  this._emitState("minimized");
}

  maximizeWindow() {
    if (this.noMaximize) return;
    if (!this.maximized) {
      const r = this.container.getBoundingClientRect();
      this.prevSize = { w: r.width, h: r.height };
      this.prevPos = { l: r.left, t: r.top };
      this.container.style.left = '0';
      this.container.style.top = '0';
      this.container.style.width = '100vw';
      this.container.style.height = '100vh';
      this.maximized = true;
    } else {
      this.restoreWindow();
    }
  }

 restoreWindow() {
  // ── Si estaba minimizada ──
  if (this.isMinimized) {
    this.container.style.display = "block";
    this.isMinimized = false;
    this._emitState("open");
    return;
  }

  // ── Si estaba maximizada ──
  if (this.prevSize && this.prevPos) {
    this.container.style.width = `${this.prevSize.w}px`;
    this.container.style.height = `${this.prevSize.h}px`;
    this.container.style.left = `${this.prevPos.l}px`;
    this.container.style.top = `${this.prevPos.t}px`;
    this.maximized = false;
    this._emitState("open");
  }
}


closeWindow() {
  this._emitState("closed");

  if (this.dockInstance) {
    this.dockInstance.notifyClosed(this.WDM_Name);
  }

  this.container.remove();
}


  bringToFront() {
    const wins = document.querySelectorAll('.window');
    let maxZ = 0;
    wins.forEach(w => maxZ = Math.max(maxZ, parseInt(w.style.zIndex) || 0));
    this.container.style.zIndex = maxZ + 1;
  }

attachToDock(dock) {
  this.dockInstance = dock;
}

}

class ErrorManager {
    constructor(config) {
        // Configuración por defecto
        const defaultConfig = {
            MSGBOX_title: "Error",
            fatal: "Unknown Error",
            source: "Unknown Source",
            addr: "Unknown Address",
            chunk: "Unknown Block",
            error: "Unknown Error Type",
            customStyles: {},
            errorLevel: "Error", // Nivel de error: Info, Warning, Error, Critical
            autoClose: false, // Cierre automático del mensaje después de un tiempo
            autoCloseTime: 5000 // Tiempo en milisegundos para el auto-cierre
        };

        // Mezclamos la configuración por defecto con la proporcionada
        this.config = {
            ...defaultConfig,
            ...config
        };

        // Llamamos al método para mostrar el error
        this.MK_ERR();
    }

    // Inicializa el manejador de errores
    MK_ERR() {
        if (!this.config.error) {
            this.config.error = "Unknown Error"; // Asigna un valor por defecto si no hay error
        }

        this.#showError(this.config.fatal, this.config.source, this.config.addr, this.config.chunk, this.config.error);

        // Si se debe cerrar automáticamente, iniciamos el temporizador
        if (this.config.autoClose) {
            setTimeout(() => this.#removeMessage(this.ms_box), this.config.autoCloseTime);
        }

        // Registrar el error si es necesario
        this.#logError();
    }

    // Muestra el mensaje de error
    #showError(message, source, addr, chunk, error) {
        this.ms_box = document.createElement('div');
        this.ms_box.setAttribute('id', 'Message_Box');

        // Estilos personalizados
        this.ms_box.style.background = this.config.customStyles.background || "#1e1e1e";
        this.ms_box.style.color = this.config.customStyles.color || "#ffffff";
        this.ms_box.style.height = this.config.customStyles.height || "250px";
        this.ms_box.style.width = this.config.customStyles.width || '400px';
        this.ms_box.style.position = 'absolute';
        this.ms_box.style.margin = 'auto';
        this.ms_box.style.inset = '0';
        this.ms_box.style.filter = 'drop-shadow(2px 4px 6px black)';
        this.ms_box.style.zIndex = '99999';
        this.ms_box.style.display = 'flex';
        this.ms_box.style.flexDirection = 'column';
        this.ms_box.style.flexWrap = 'nowrap';
        this.ms_box.style.justifyContent = 'space-between';

        const ms_err = document.createElement('div');
        ms_err.setAttribute('class', 'ms_container');
        ms_err.innerHTML = `System Exception Error: ${message}<br>
                            Source: ${source}<br>
                            Address: ${addr}<br>
                            Block: ${chunk}<br>
                            HK_ERR_TYPE: ${error}`;

        ms_err.style.position = 'absolute';
        ms_err.style.margin = 'auto';
        ms_err.style.inset = '0';
        ms_err.style.width = 'fit-content';
        ms_err.style.height = 'fit-content';

        const ms_box_title = document.createElement('div');
        ms_box_title.innerHTML = this.config.MSGBOX_title;
        ms_box_title.style.fontWeight = "bold";
        ms_box_title.style.background = this.config.customStyles.titleBackground || '#2e2e2e';
        ms_box_title.style.padding = "10px";
        ms_box_title.style.textAlign = 'center';

        const ms_box_summit = document.createElement('button');
        ms_box_summit.setAttribute('id', 'err_btn');
        ms_box_summit.innerHTML = this.config.customStyles.buttonText || 'OK';
        ms_box_summit.style.background = this.config.customStyles.buttonBackground || '#1f1f1f';
        ms_box_summit.style.outline = 'none';
        ms_box_summit.style.fontFamily = 'system-ui';
        ms_box_summit.style.padding = '10px';
        ms_box_summit.style.color = this.config.customStyles.buttonColor || '#fff';
        ms_box_summit.style.border = 'solid 1px #ffffff3b';

        ms_box_summit.onclick = () => this.#removeMessage(this.ms_box);

        this.ms_box.appendChild(ms_box_title);
        this.ms_box.appendChild(ms_err);
        this.ms_box.appendChild(ms_box_summit);

        document.body.appendChild(this.ms_box);
    }

    // Elimina el mensaje de error
    #removeMessage(ms_box) {
        ms_box.remove();
        console.clear(); // Limpiar la consola (opcional)
    }

    // Log de errores (opcional)
    #logError() {
        const errorDetails = {
            message: this.config.error,
            source: this.config.source,
            address: this.config.addr,
            chunk: this.config.chunk,
            errorLevel: this.config.errorLevel,
            timestamp: new Date().toISOString()
        };

        // Registrar el error en consola
        console.error("Error Logged:", errorDetails);

        // Ejemplo de cómo podrías almacenar los detalles en localStorage
        localStorage.setItem('errorLog', JSON.stringify(errorDetails));

        // O enviar al servidor (como un ejemplo)
        // fetch('/log-error', {
        //     method: 'POST',
        //     headers: {
        //         'Content-Type': 'application/json'
        //     },
        //     body: JSON.stringify(errorDetails)
        // });
    }
}
class PasswordHasher {
    constructor(saltLength = 16) {
        this.saltLength = saltLength; // Longitud del salt
    }

    // Generar un salt aleatorio
    #generateSalt() {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let salt = '';
        for (let i = 0; i < this.saltLength; i++) {
            const randomIndex = Math.floor(Math.random() * characters.length);
            salt += characters[randomIndex];
        }
        return salt;
    }

    // Hash de la contraseña con un salt
    hash(password) {
        const salt = this.#generateSalt();
        const hash = this.#simpleHash(password + salt); // Concatenar password y salt
        return {
            hash,
            salt
        }; // Retornar el hash y el salt
    }

    // Verificar una contraseña
    verify(password, storedHash, storedSalt) {
        const hash = this.#simpleHash(password + storedSalt);
        return hash === storedHash; // Comparar los hashes
    }

    // Función simple de hash (SHA-256)
    #simpleHash(data) {
        let hash = 0,
            i, chr;
        for (i = 0; i < data.length; i++) {
            chr = data.charCodeAt(i);
            hash = ((hash << 5) - hash) + chr; // hash * 31 + chr
            hash |= 0; // Convertir a entero de 32 bits
        }
        return hash.toString(16); // Retornar en formato hexadecimal
    }
}
class NetworkManager {
    constructor(callback = null) {
        this.callback = callback;
        this.initNetwork();
    }

    initNetwork() {
        this.notifyUpdate(); // Cambiado de this.updateNetworkStatus() a this.notifyUpdate()

        // Añadir event listeners para detectar cambios de conexión
        window.addEventListener('online', () => this.notifyUpdate());
        window.addEventListener('offline', () => this.notifyUpdate());

        // Si está disponible la API de Network Information, escuchar cambios
        if (navigator.connection) {
            navigator.connection.addEventListener('change', () => this.notifyUpdate());
        }
    }

    getNetworkStatus() {
        const isOnline = navigator.onLine;
        const connection = navigator.connection || {};

        return {
            status: isOnline ? "Online" : "Offline",
            isOnline,
            type: connection.effectiveType || "Desconocido",
            downlink: connection.downlink || "Desconocido",
            rtt: connection.rtt || "Desconocido"
        };
    }

    notifyUpdate() {
        const status = this.getNetworkStatus();
        if (this.callback) this.callback(status);
    }

    async curl(url, responseType = "text") {
        try {
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`Error en la descarga: ${response.status} ${response.statusText}`);
            }

            switch (responseType.toLowerCase()) {
                case "json":
                    return await response.json();
                case "blob":
                    return await response.blob();
                default:
                    return await response.text();
            }
        } catch (error) {
            console.error("Error al obtener el archivo:", error);
            return null;
        }
    }

    // Función ping para comprobar la disponibilidad de una URL
    async ping(url, timeout = 5000) {
        const controller = new AbortController();
        const signal = controller.signal;

        // Configuramos el timeout para abortar la petición si tarda demasiado
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
            const response = await fetch(url, {
                signal,
                mode: 'no-cors'
            });

            // Limpiar el timeout si la respuesta es exitosa
            clearTimeout(timeoutId);

            // Comprobamos si la respuesta es exitosa
            if (response.ok) {
                console.log("Ping exitoso");
                return {
                    success: true,
                    status: "success",
                    time: response.headers.get('X-Response-Time') || "Desconocido"
                };
            } else {
                console.log("Ping fallido: Estado " + response.status);
                return {
                    success: false,
                    status: "failed",
                    error: response.statusText
                };
            }
        } catch (error) {
            console.error("Error de ping:", error);
            return {
                success: false,
                status: "failed",
                error: error.message
            };
        }
    }

    destroy() {
        window.removeEventListener('online', () => this.notifyUpdate());
        window.removeEventListener('offline', () => this.notifyUpdate());

        if (navigator.connection) {
            navigator.connection.removeEventListener('change', () => this.notifyUpdate());
        }
    }
}
class BatteryManager {
    constructor(callback = null) {
        this.battery = null;
        this.callback = callback;
        this.lastLevel = null;
        this.lastTimestamp = null;
        this.initBattery();
    }

    async initBattery() {
        try {
            this.battery = await navigator.getBattery();
            this.updateBatteryInfo();

            const events = ["levelchange", "chargingchange", "chargingtimechange", "dischargingtimechange"];
            events.forEach(event => this.battery.addEventListener(event, () => this.updateBatteryInfo()));
        } catch (error) {
            console.error("Error al obtener información de la batería:", error);
        }
    }

    formatTime(seconds) {
        if (seconds === Infinity || seconds < 0) return "Desconocido";
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${hours}h ${minutes}m`;
    }

    estimateTimeRemaining() {
        if (!this.battery || this.lastLevel === null || this.lastTimestamp === null) return "Calculando...";

        const currentTime = Date.now();
        const elapsedSeconds = (currentTime - this.lastTimestamp) / 1000; // Convertir ms a segundos
        const levelChange = this.battery.level - this.lastLevel;

        if (levelChange === 0) return "Calculando..."; // No hubo cambio

        const ratePerSecond = levelChange / elapsedSeconds;
        const remainingLevel = this.battery.charging ? (1 - this.battery.level) : this.battery.level;
        const estimatedTime = remainingLevel / Math.abs(ratePerSecond);

        return this.formatTime(estimatedTime);
    }

    updateBatteryInfo() {
        if (this.battery) {
            const status = {
                level: this.battery.level * 100,
                charging: this.battery.charging,
                chargingTime: this.formatTime(this.battery.chargingTime),
                dischargingTime: this.formatTime(this.battery.dischargingTime),
                estimatedTimeRemaining: this.estimateTimeRemaining()
            };

            // Guardar el nivel de batería y el timestamp para futuras estimaciones
            this.lastLevel = this.battery.level;
            this.lastTimestamp = Date.now();

            if (this.callback) this.callback(status);
            return status;
        }
        return null;
    }

    getBatteryStatus() {
        return this.updateBatteryInfo();
    }

    destroy() {
        if (this.battery) {
            const events = ["levelchange", "chargingchange", "chargingtimechange", "dischargingtimechange"];
            events.forEach(event => this.battery.removeEventListener(event, () => this.updateBatteryInfo()));
        }
    }
}
class UniqueGen {
    static generateRandomString(length) {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        const charactersLength = characters.length;
        for (let i = 0; i < length; i++) {
            result += characters.charAt(Math.floor(Math.random() * charactersLength));
        }
        return result;
    }
}

// System Security Core (SECore)
class SECore {
    constructor(frozenPolicy = {}) {
        // 📜 Policy (read-only)
        this.Policy = frozenPolicy;

        // 🧬 Runtime state (mutable)
        this.State = {
            EnableSE: !!frozenPolicy.EnableSE,
            SEMode: frozenPolicy.SEMode ?? "permissive",
            policies: new Map(),
            auditLog: []
        };
    }

    // -------------------------------------------------
    // Init
    // -------------------------------------------------
    initialize(enableSE = false, seMode = "permissive") {
        // ❌ NO tocar this.Policy
        this.State.EnableSE = enableSE;
        this.State.SEMode = seMode;

        Journal.add(
            `[SECore] Security module initialized - Enabled: ${enableSE}, Mode: ${seMode}`
        );
    }

    // -------------------------------------------------
    // Policy management
    // -------------------------------------------------
    setPolicy(context, permission, allowed = true) {
        if (!this.State.EnableSE) return;
        const policyKey = `${context}:${permission}`;
        this.State.policies.set(policyKey, allowed);
        Journal.add(`[SECore] Policy set: ${policyKey} = ${allowed}`);
    }

    checkPermission(context, permission) {
        if (!this.State.EnableSE) return true;

        const policyKey = `${context}:${permission}`;
        const allowed = this.State.policies.get(policyKey);

        if (allowed === undefined) {
            this.#auditAccess(policyKey, "UNKNOWN", false);
            return this.State.SEMode === "permissive";
        }

        this.#auditAccess(policyKey, allowed ? "ALLOW" : "DENY", allowed);

        if (!allowed && this.State.SEMode === "enforcing") {
            Journal.add(`[SECore] ACCESS DENIED: ${policyKey}`);
            return false;
        }

        return true;
    }

    // -------------------------------------------------
    // Audit
    // -------------------------------------------------
    #auditAccess(policy, decision, allowed) {
        this.State.auditLog.push({
            timestamp: new Date().toISOString(),
            policy,
            decision,
            mode: this.State.SEMode
        });
        Journal.add(`[SECore:AUDIT] ${policy} - ${decision}`);
    }

    getAuditLog() {
        return this.State.auditLog;
    }

    getCurrentPolicies() {
        return Array.from(this.State.policies.entries()).map(
            ([key, value]) => ({ policy: key, allowed: value })
        );
    }

    // -------------------------------------------------
    // State getters
    // -------------------------------------------------
    getCurrentMode() {
        return this.State.SEMode;
    }

    isEnabled() {
        return this.State.EnableSE;
    }

    // -------------------------------------------------
    // Mode control
    // -------------------------------------------------
    setMode(mode) {
        if (this.State.EnableSE) {
            this.State.SEMode = mode;
            Journal.add(`[SECore] SE mode changed to: ${mode}`);
        }
    }

    disable() {
        this.State.EnableSE = false;
        Journal.add("[SECore] Security module disabled");
    }

    enable() {
        this.State.EnableSE = true;
        Journal.add("[SECore] Security module enabled");
    }

    // -------------------------------------------------
    // Integrity & certs (unchanged logic)
    // -------------------------------------------------
    async verifySystemIntegrity(expectedHash) {
        if (this.State.EnableSE) {
            if (!this.checkPermission("system", "integrity_check")) {
                return false;
            }
        }

        Journal.add("[SECore] Verifying system integrity...");
        const currentHash = this.#simpleHash(
            navigator.userAgent +
            navigator.platform +
            screen.width +
            screen.height
        );

        return currentHash === expectedHash;
    }

    #simpleHash(data) {
        let hash = 0;
        for (let i = 0; i < data.length; i++) {
            hash = ((hash << 5) - hash) + data.charCodeAt(i);
            hash |= 0;
        }
        return hash.toString(16);
    }

    // -------------------------------------------------
    // IndexedDB helpers (igual que antes)
    // -------------------------------------------------
    async saveToIndexedDB(storeName, data) {
        const db = await this.openDatabase();
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        store.add({ id: Date.now(), data: this.encryptData(data) });
        return tx.complete;
    }

    async openDatabase() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('SECoreDB', 1);
            request.onupgradeneeded = () => {
                const db = request.result;
                db.createObjectStore('certificates', { keyPath: 'id' });
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    encryptData(data) {
        return btoa(JSON.stringify(data));
    }
}


//CoreVer (Winver clone)
class CoreVer {
    static renderDialog() {
        const dialog = document.createElement('div');
        dialog.id = 'corever-dialog';
        dialog.className = '';
        dialog.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #fff;
            border-radius: 12px;
            padding: 20px;
            z-index: 10000;
            font-family: Arial, sans-serif;
            box-shadow: 0 0 10px rgba(0,0,0,0.5);
            `;
        dialog.innerHTML = `
            <h2>About Nova Mint (Beta Pre-Release 1)</h2>
            <p>Version: 0.5.3</p>
            <p>Build: 57</p>
            <p>Build Date: ${new Date().toLocaleDateString()}</p>
            <p>© 2025 Nova LLC. Written with ❤</p>
            <button id="corever-close-btn" class="snap-btn">Close</button>
        `;
        document.body.appendChild(dialog);

        document.getElementById('corever-close-btn').addEventListener('click', () => {
            dialog.remove();
        });
    }                                                 
}

// Kernel Panic
class KernelPanic {
    static trigger(errorCode = 0, message = "Unknown Error", context = {}) {
        console.error(`[KERNEL PANIC] Code: ${errorCode} | Message: ${message}`, context);
        this.displayPanicScreen(errorCode, message, context);
    }

    static displayPanicScreen(errorCode, message, context) {
        const panicScreen = document.createElement('div');
        panicScreen.id = 'kernel-panic-screen';
        panicScreen.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: #0c0c0c;
            color: #00ff00;
            font-family: 'Courier New', monospace;
            padding: 20px;
            overflow-y: auto;
            z-index: 999999;
            white-space: pre-wrap;
            word-wrap: break-word;
        `;

        const timestamp = new Date().toISOString();
        const panicContent = `
╔════════════════════════════════════════════════════════════╗
║                    *** KERNEL PANIC ***                    ║
╚════════════════════════════════════════════════════════════╝

Error Code: 0x${errorCode.toString(16).toUpperCase().padStart(8, '0')}
Timestamp: ${timestamp}
Message: ${message}

System Context:
  - User Agent: ${navigator.userAgent}
  - Platform: ${navigator.platform}
  - Memory: ${navigator.deviceMemory || 'Unknown'} GB
  - Online: ${navigator.onLine ? 'Yes' : 'No'}

Additional Context:
${JSON.stringify(context, null, 2)}

System will attempt recovery...
Press F12 for debugging information.
        `;

        panicScreen.textContent = panicContent;
        document.body.innerHTML = '';
        document.body.appendChild(panicScreen);

        this.logPanic(errorCode, message, context, timestamp);
    }

    static logPanic(errorCode, message, context, timestamp) {
        const panicLog = {
            timestamp,
            errorCode,
            message,
            context,
            userAgent: navigator.userAgent,
            url: window.location.href
        };

        try {
            localStorage.setItem('kernelPanicLog', JSON.stringify(panicLog));
        } catch (e) {
            console.error('Failed to log panic', e);
        }
    }

    static recover() {
        try {
            localStorage.removeItem('kernelPanicLog');
            location.reload();
        } catch (e) {
            console.error('Recovery failed', e);
        }
    }

    static getLastPanic() {
        try {
            const log = localStorage.getItem('kernelPanicLog');
            return log ? JSON.parse(log) : null;
        } catch (e) {
            return null;
        }
    }
}
// Audio Metadata ID3v2
class AudioMetadataReader {
    constructor(source, options = {}) {
        this.source = source;
        this.colorizer = options.colorizer ?? null;
        this.useColorize = options.useColorize ?? false;
        this.defaultMime = options.defaultMime ?? 'image/jpeg';
        this.debug = options.debug ?? false;
    }

    // Public: lee metadatos y opcionalmente paleta de colores basada en la portada
    async readMetadata() {
        const buffer = await this._toArrayBuffer(this.source);
        const dv = new DataView(buffer);

        const result = {
            version: null,
            metadata: {
                title: null,
                artist: null,
                album: null,
                year: null,
                comment: null,
                track: null,
                genre: null,
                cover: null // { blob, objectURL, mime }
            }
        };

        // ID3v2?
        if (this._isID3v2(dv)) {
            result.version = 'ID3v2';
            const tags = this._extractID3v2Tags(dv);
            Object.assign(result.metadata, tags);
        }

        // ID3v1 fallback (merge only missing fields)
        if (this._isID3v1(dv)) {
            const tags1 = this._extractID3v1Tags(dv);
            if (!result.version) result.version = 'ID3v1';
            // only fill fields that are missing
            for (const k of Object.keys(tags1)) {
                if (!result.metadata[k]) result.metadata[k] = tags1[k];
            }
        }

        // If cover extracted and colorize enabled -> run colorizer
        if ((this.useColorize || this.colorizer) && result.metadata.cover && result.metadata.cover.blob) {
            try {
                const colorizer = this.colorizer ?? (typeof window !== 'undefined' ? window.ColorizeV4 : null);
                if (!colorizer) {
                    if (this.debug) console.warn('No colorizer provided and ColorizeV4 not found globally.');
                } else {
                    // si es clase/constructor, crear instancia rápida con opciones por defecto
                    const cz = (typeof colorizer === 'function') ? new colorizer({ debug: this.debug }) : colorizer;
                    // extractColors espera Blob/File/ArrayBuffer/url/img/base64
                    const colorRes = await cz.extractColors(result.metadata.cover.blob);
                    result.metadata.colors = colorRes;
                }
            } catch (err) {
                if (this.debug) console.error('Colorize error:', err);
                result.metadata.colorsError = String(err);
            }
        }

        return result;
    }

    // -------------------------
    // Util: convertir `source` a ArrayBuffer
    // soporta: File/Blob, ArrayBuffer, TypedArray, dataURL (base64), URL (http(s))
    // -------------------------
    async _toArrayBuffer(source) {
        // File/Blob
        if (source instanceof Blob || (typeof File !== 'undefined' && source instanceof File)) {
            return new Response(source).arrayBuffer();
        }
        // ArrayBuffer or view
        if (source instanceof ArrayBuffer) return source;
        if (ArrayBuffer.isView(source)) return source.buffer;

        // String
        if (typeof source === 'string') {
            const s = source.trim();
            // data URL
            if (s.startsWith('data:')) {
                const base64 = s.split(',')[1] || '';
                const bin = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
                return bin.buffer;
            }
            // http/https -> fetch
            if (/^https?:\/\//i.test(s) || s.startsWith('/') || s.startsWith('./') || s.startsWith('../')) {
                const resp = await fetch(s);
                if (!resp.ok) throw new Error(`Failed to fetch "${s}" (status ${resp.status})`);
                return await resp.arrayBuffer();
            }
            // bare base64
            const maybeBase64 = s.replace(/\s+/g, '');
            if (/^[A-Za-z0-9+/=]+$/.test(maybeBase64) && maybeBase64.length % 4 === 0) {
                const bin = Uint8Array.from(atob(maybeBase64), c => c.charCodeAt(0));
                return bin.buffer;
            }
        }

        throw new Error('Unsupported source type for AudioMetadataFusion._toArrayBuffer');
    }

    // -------------------------
    // ID3 detection & extraction
    // -------------------------
    _isID3v2(dv) {
        try {
            return dv.getUint8(0) === 0x49 && dv.getUint8(1) === 0x44 && dv.getUint8(2) === 0x33;
        } catch {
            return false;
        }
    }

    _isID3v1(dv) {
        try {
            const tagOffset = dv.byteLength - 128;
            if (tagOffset < 0) return false;
            return dv.getUint8(tagOffset) === 0x54 &&
                dv.getUint8(tagOffset + 1) === 0x41 &&
                dv.getUint8(tagOffset + 2) === 0x47;
        } catch {
            return false;
        }
    }

    _syncSafeToInt(b0, b1, b2, b3) {
        // ID3v2 4-byte syncsafe -> int
        return (b0 << 21) | (b1 << 14) | (b2 << 7) | b3;
    }

    _extractID3v2Tags(dv) {
        const tags = {
            title: null, artist: null, album: null, year: null,
            comment: null, track: null, genre: null,
            cover: null // { blob, objectURL, mime }
        };

        // header: "ID3" verMajor verRev flags size(4 syncsafe)
        const verMajor = dv.getUint8(3);
        const verRev = dv.getUint8(4);
        const flags = dv.getUint8(5);
        const size = this._syncSafeToInt(dv.getUint8(6), dv.getUint8(7), dv.getUint8(8), dv.getUint8(9));

        let pos = 10;
        const end = pos + size;

        while (pos + 10 <= dv.byteLength && pos + 10 <= end) {
            // Frame header: id(4), size(4) (big-endian), flags(2)
            const frameID = this._readAsciiString(dv, pos, 4);
            const frameSize = dv.getUint32(pos + 4, false); // big-endian
            // seguridad: si frameID no es válido, salimos
            if (!/^[A-Z0-9]{3,4}$/.test(frameID)) break;
            const frameStart = pos + 10;
            if (frameSize <= 0 || frameStart + frameSize > dv.byteLength) break;

            // Procesar frames de interés
            if (frameID === 'TIT2' || frameID === 'TPE1' || frameID === 'TALB' || frameID === 'TYER' || frameID === 'TDRC' || frameID === 'TCON' || frameID === 'COMM' || frameID === 'TRCK') {
                try {
                    const text = this._readTextFrame(dv, frameStart, frameSize);
                    switch (frameID) {
                        case 'TIT2': tags.title = text; break;
                        case 'TPE1': tags.artist = text; break;
                        case 'TALB': tags.album = text; break;
                        case 'TYER': tags.year = text; break;
                        case 'TDRC': tags.year = tags.year || text; break;
                        case 'TRCK': tags.track = text; break;
                        case 'TCON': tags.genre = text; break;
                        case 'COMM': tags.comment = text; break;
                    }
                } catch (err) {
                    if (this.debug) console.warn('Error reading text frame', frameID, err);
                }
            } else if (frameID === 'APIC') {
                try {
                    const pic = this._readPictureFrame(dv, frameStart, frameSize);
                    if (pic) tags.cover = pic;
                } catch (err) {
                    if (this.debug) console.warn('Error reading APIC', err);
                }
            }

            pos = frameStart + frameSize;
        }

        return tags;
    }

    _extractID3v1Tags(dv) {
        const tagOffset = dv.byteLength - 128;
        const title = this._readAsciiString(dv, tagOffset + 3, 30).trim() || null;
        const artist = this._readAsciiString(dv, tagOffset + 33, 30).trim() || null;
        const album = this._readAsciiString(dv, tagOffset + 63, 30).trim() || null;
        const year = this._readAsciiString(dv, tagOffset + 93, 4).trim() || null;
        const comment = this._readAsciiString(dv, tagOffset + 97, 28).trim() || null;
        const genreByte = dv.getUint8(tagOffset + 127);
        const genre = genreByte ? String(genreByte) : null; // mapping genres -> names se puede añadir
        return { title, artist, album, year, comment, genre };
    }

    // -------------------------
    // Lectores de frames y utilidades
    // -------------------------
    _readAsciiString(dv, offset, length) {
        let s = '';
        for (let i = 0; i < length; i++) {
            const c = dv.getUint8(offset + i);
            if (c === 0) break;
            s += String.fromCharCode(c);
        }
        return s;
    }

    _readTextFrame(dv, offset, length) {
        // primer byte = encoding
        const encodingByte = dv.getUint8(offset);
        const payloadOffset = offset + 1;
        const payloadLength = Math.max(0, length - 1);
        const bytes = new Uint8Array(dv.buffer, payloadOffset, payloadLength);

        let decoder;
        switch (encodingByte) {
            case 0: // ISO-8859-1
                decoder = new TextDecoder('iso-8859-1');
                break;
            case 1: // UTF-16 with BOM or BE/LE
                // detectar BOM
                if (bytes.length >= 2 && bytes[0] === 0xFF && bytes[1] === 0xFE) {
                    decoder = new TextDecoder('utf-16le');
                    // skip BOM
                    return new TextDecoder('utf-16le').decode(bytes.subarray(2)).replace(/\0/g, '').trim();
                } else if (bytes.length >= 2 && bytes[0] === 0xFE && bytes[1] === 0xFF) {
                    decoder = new TextDecoder('utf-16be');
                    return new TextDecoder('utf-16be').decode(bytes.subarray(2)).replace(/\0/g, '').trim();
                } else {
                    decoder = new TextDecoder('utf-16le');
                }
                break;
            case 2: // UTF-16BE without BOM (rare)
                decoder = new TextDecoder('utf-16be');
                break;
            case 3: // UTF-8
                decoder = new TextDecoder('utf-8');
                break;
            default:
                decoder = new TextDecoder('utf-8');
        }
        return decoder.decode(bytes).replace(/\0/g, '').trim();
    }

    _readPictureFrame(dv, offset, length) {
        let pos = offset;
        const encoding = dv.getUint8(pos++); // text encoding for MIME/desc (rarely useful)

        // read mimeType (terminated by 0x00)
        let mime = '';
        while (pos < dv.byteLength) {
            const c = dv.getUint8(pos++);
            if (c === 0) break;
            mime += String.fromCharCode(c);
        }
        mime = mime || this.defaultMime;

        // read picture type byte (1 byte)
        const picType = dv.getUint8(pos++); // often ignored

        // read description (terminated by 0x00). encoding may matter but we'll skip robust decode and just skip bytes until 0
        while (pos < dv.byteLength && dv.getUint8(pos) !== 0) pos++;
        if (pos < dv.byteLength) pos++; // skip terminator

        // remaining bytes = image data
        const imageSize = length - (pos - offset);
        if (imageSize <= 0 || pos + imageSize > dv.byteLength) {
            if (this.debug) console.error('Invalid image size in APIC');
            return null;
        }

        const imageBytes = new Uint8Array(dv.buffer.slice(pos, pos + imageSize));

        // Try to detect real mime by header
        if (imageBytes[0] === 0xFF && imageBytes[1] === 0xD8) mime = 'image/jpeg';
        else if (imageBytes[0] === 0x89 && imageBytes[1] === 0x50) mime = 'image/png';
        else if (imageBytes[0] === 0x47 && imageBytes[1] === 0x49) mime = 'image/gif';
        else if (imageBytes[0] === 0x42 && imageBytes[1] === 0x4D) mime = 'image/bmp';
        // else keep declared mime or default

        const blob = new Blob([imageBytes], { type: mime });
        const objectURL = URL.createObjectURL(blob);

        if (this.debug) {
            console.log('APIC extracted:', { mime, imageSize, objectURL });
        }

        return { blob, objectURL, mime, size: imageSize, type: picType };
    }
}
// Video Metadata
class VideoMetadataReader {
    constructor(videotag) {
        this.videoplayer = document.querySelector(videotag);
    }

    async read(file) {
        return new Promise((resolve, reject) => {
            if (!this.videoplayer) return reject("No se encontró el elemento de video.");

            this.videoplayer.onloadedmetadata = () => {
                const metadata = {
                    title: file.name,
                    duration: this.videoplayer.duration.toFixed(2) + " s",
                    resolution: this.videoplayer.videoWidth + "x" + this.videoplayer.videoHeight,
                    fps: this.videoplayer.frameRate || "Desconocido"
                };
                resolve(metadata);
            };

            this.videoplayer.onerror = () => reject("Error al cargar el video.");
        });
    }
}
// Image Metadata
class ImageMetadataReader {
    constructor(file) {
        this.file = file;
    }

    async readMetadata() {
        return new Promise((resolve, reject) => {
            if (!this.file) {
                reject("No file provided");
                return;
            }

            const reader = new FileReader();
            reader.onload = (event) => {
                const arrayBuffer = event.target.result;
                const dataView = new DataView(arrayBuffer);

                const metadata = {
                    format: this.getFormat(),
                    size: this.file.size,
                    width: 0,
                    height: 0,
                    colorDepth: 24, // Estimado
                    EXIF: "Not Found",
                    exifData: {}
                };

                // Extraer dimensiones usando Image
                const img = new Image();
                img.onload = () => {
                    metadata.width = img.width;
                    metadata.height = img.height;

                    // Intentar extraer EXIF si es JPEG
                    if (metadata.format === "JPEG") {
                        const exif = this.extractEXIF(dataView);
                        if (exif) {
                            metadata.EXIF = "Found";
                            metadata.exifData = exif;
                        }
                    }

                    resolve(metadata);
                };
                img.onerror = () => reject("Error loading image.");
                img.src = URL.createObjectURL(this.file);
            };

            reader.onerror = () => reject("Error reading file");
            reader.readAsArrayBuffer(this.file);
        });
    }

    getFormat() {
        const type = this.file.type.toLowerCase();
        if (type.includes("jpeg")) return "JPEG";
        if (type.includes("png")) return "PNG";
        if (type.includes("gif")) return "GIF";
        if (type.includes("bmp")) return "BMP";
        if (type.includes("webp")) return "WebP";
        return "Unknown";
    }

    extractEXIF(dataView) {
        if (dataView.getUint16(0, false) !== 0xFFD8) return null; // No es JPEG

        let offset = 2;
        while (offset < dataView.byteLength) {
            if (dataView.getUint16(offset, false) === 0xFFE1) { // APP1 Marker (EXIF)
                return this.parseEXIF(dataView, offset + 4);
            }
            offset += 2 + dataView.getUint16(offset + 2, false);
        }
        return null;
    }

    parseEXIF(dataView, start) {
        const exifData = {};
        const littleEndian = dataView.getUint16(start) === 0x4949;
        const offset = start + 8;

        for (let i = 0; i < 12; i++) {
            const tag = dataView.getUint16(offset + i * 12, littleEndian);
            const valueOffset = offset + i * 12 + 8;

            switch (tag) {
                case 0x010F:
                    exifData["Camera Brand"] = this.readString(dataView, valueOffset, 20);
                    break;
                case 0x0110:
                    exifData["Camera Model"] = this.readString(dataView, valueOffset, 20);
                    break;
                case 0x9003:
                    exifData["Date Taken"] = this.readString(dataView, valueOffset, 20);
                    break;
                case 0x0112:
                    exifData["Orientation"] = dataView.getUint16(valueOffset, littleEndian);
                    break;
                case 0x8827:
                    exifData["ISO"] = dataView.getUint16(valueOffset, littleEndian);
                    break;
                case 0x829A:
                    exifData["Shutter Speed"] = dataView.getFloat32(valueOffset, littleEndian).toFixed(3);
                    break;
                case 0x829D:
                    exifData["Aperture"] = dataView.getFloat32(valueOffset, littleEndian).toFixed(3);
                    break;
            }
        }

        return exifData;
    }

    readString(dataView, offset, length) {
        let result = "";
        for (let i = 0; i < length; i++) {
            const char = dataView.getUint8(offset + i);
            if (char === 0) break;
            result += String.fromCharCode(char);
        }
        return result.trim();
    }
}
// Validar si la imagen esta corrupta o no
class ImageValidator {
    static async isValidImage(blobUrl) {
        try {
            const response = await fetch(blobUrl);
            if (!response.ok) throw new Error("No se pudo obtener el Blob");

            const blob = await response.blob();
            const bitmap = await createImageBitmap(blob);

            return bitmap.width > 0 && bitmap.height > 0;
        } catch (error) {
            return false; // Si hay un error, la imagen es inválida o está corrupta
        }
    }
}
// Generador de Miniatura (Video)
class VideoThumbnailGenerator {
    static async generateThumbnail(videoUrl, timeInSeconds = 1) {
        return new Promise((resolve, reject) => {
            const video = document.createElement("video");
            video.src = videoUrl;
            video.crossOrigin = "anonymous"; // Evita problemas con CORS
            video.muted = true; // Evita advertencias en algunos navegadores
            video.playsInline = true;

            video.addEventListener("loadeddata", () => {
                video.currentTime = Math.min(timeInSeconds, video.duration - 0.1);
            });

            video.addEventListener("seeked", () => {
                const canvas = document.createElement("canvas");
                const ctx = canvas.getContext("2d");
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;

                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                video.pause();

                resolve(canvas.toDataURL("image/png"));
            });

            video.onerror = () => reject("Error al cargar el video");
        });
    }
}
// Compress Algorithm
class Zip {
    constructor() {
        this.files = new Map();
    }

    async addFile(name, data) {
        if (typeof data === "string") {
            data = new TextEncoder().encode(data);
        } else if (data instanceof Blob) {
            data = new Uint8Array(await data.arrayBuffer());
        }
        this.files.set(name, data);
    }

    async generateZip() {
        const encoder = new TextEncoder();
        let fileData = [];
        let directoryEntries = [];
        let offset = 0;

        function crc32(buffer) {
            let table = new Uint32Array(256);
            for (let i = 0; i < 256; i++) {
                let c = i;
                for (let j = 0; j < 8; j++) {
                    c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
                }
                table[i] = c;
            }
            let crc = 0xFFFFFFFF;
            for (let i = 0; i < buffer.length; i++) {
                crc = (crc >>> 8) ^ table[(crc ^ buffer[i]) & 0xFF];
            }
            return (crc ^ 0xFFFFFFFF) >>> 0;
        }

        for (const [name, data] of this.files.entries()) {
            let nameBytes = encoder.encode(name);
            let crc = crc32(data);
            let size = data.length;

            let header = new Uint8Array(30 + nameBytes.length);
            header.set([0x50, 0x4B, 0x03, 0x04]); // Firma ZIP
            header.set([20, 0], 4); // Versión mínima
            header.set([0, 0], 6); // Flags
            header.set([0, 0], 8); // Compresión (0 = sin compresión)
            header.set([0, 0, 0, 0], 10); // Hora y fecha
            header.set([(crc) & 0xFF, (crc >> 8) & 0xFF, (crc >> 16) & 0xFF, (crc >> 24) & 0xFF], 14); // CRC32
            header.set([(size) & 0xFF, (size >> 8) & 0xFF, (size >> 16) & 0xFF, (size >> 24) & 0xFF], 18); // Tamaño comprimido
            header.set([(size) & 0xFF, (size >> 8) & 0xFF, (size >> 16) & 0xFF, (size >> 24) & 0xFF], 22); // Tamaño real
            header.set([(nameBytes.length) & 0xFF, (nameBytes.length >> 8) & 0xFF], 26); // Tamaño del nombre
            header.set(nameBytes, 30);

            fileData.push(header, data);
            let fileOffset = offset;
            offset += header.length + data.length;

            let centralHeader = new Uint8Array(46 + nameBytes.length);
            centralHeader.set([0x50, 0x4B, 0x01, 0x02]); // Firma central
            centralHeader.set([20, 0], 4); // Versión creada
            centralHeader.set([20, 0], 6); // Versión mínima
            centralHeader.set([0, 0], 8); // Flags
            centralHeader.set([0, 0], 10); // Compresión
            centralHeader.set([0, 0, 0, 0], 12); // Hora y fecha
            centralHeader.set([(crc) & 0xFF, (crc >> 8) & 0xFF, (crc >> 16) & 0xFF, (crc >> 24) & 0xFF], 16); // CRC32
            centralHeader.set([(size) & 0xFF, (size >> 8) & 0xFF, (size >> 16) & 0xFF, (size >> 24) & 0xFF], 20); // Tamaño comprimido
            centralHeader.set([(size) & 0xFF, (size >> 8) & 0xFF, (size >> 16) & 0xFF, (size >> 24) & 0xFF], 24); // Tamaño real
            centralHeader.set([(nameBytes.length) & 0xFF, (nameBytes.length >> 8) & 0xFF], 28); // Tamaño del nombre
            centralHeader.set([0, 0, 0, 0, 0, 0, 0, 0, 0, 0], 30); // Extra fields y atributos
            centralHeader.set([(fileOffset) & 0xFF, (fileOffset >> 8) & 0xFF, (fileOffset >> 16) & 0xFF, (fileOffset >> 24) & 0xFF], 42); // Offset local file header
            centralHeader.set(nameBytes, 46);

            directoryEntries.push(centralHeader);
        }

        let directoryOffset = offset;
        let directorySize = directoryEntries.reduce((sum, entry) => sum + entry.length, 0);
        let endOfCentralDir = new Uint8Array(22);
        endOfCentralDir.set([0x50, 0x4B, 0x05, 0x06]); // Firma EOCD
        endOfCentralDir.set([0, 0], 4); // Número de discos
        endOfCentralDir.set([0, 0], 6); // Disco donde empieza directorio
        endOfCentralDir.set([this.files.size & 0xFF, this.files.size >> 8 & 0xFF], 8); // Cantidad de registros
        endOfCentralDir.set([this.files.size & 0xFF, this.files.size >> 8 & 0xFF], 10); // Total de registros
        endOfCentralDir.set([directorySize & 0xFF, directorySize >> 8 & 0xFF, directorySize >> 16 & 0xFF, directorySize >> 24 & 0xFF], 12); // Tamaño directorio central
        endOfCentralDir.set([directoryOffset & 0xFF, directoryOffset >> 8 & 0xFF, directoryOffset >> 16 & 0xFF, directoryOffset >> 24 & 0xFF], 16); // Offset directorio central

        let zipBlob = new Blob([...fileData, ...directoryEntries, endOfCentralDir], {
            type: "application/zip"
        });
        return zipBlob;
    }

    async extractZip(zipBlob) {
        this.files.clear();
        const data = new Uint8Array(await zipBlob.arrayBuffer());
        let offset = 0;

        while (offset < data.length) {
            if (data[offset] !== 0x50 || data[offset + 1] !== 0x4B) break; // Verificar firma ZIP

            let nameLength = data[offset + 26] | (data[offset + 27] << 8);
            let fileSize = data[offset + 18] | (data[offset + 19] << 8) | (data[offset + 20] << 16) | (data[offset + 21] << 24);
            let fileName = new TextDecoder().decode(data.subarray(offset + 30, offset + 30 + nameLength));
            let fileContent = data.slice(offset + 30 + nameLength, offset + 30 + nameLength + fileSize);

            this.files.set(fileName, fileContent);
            offset += 30 + nameLength + fileSize;
        }
    }

    getFile(name) {
        let data = this.files.get(name);
        if (!data) return null;
        return new Blob([data], {
            type: "application/octet-stream"
        });
    }
}

export {
    SECore,
    CoreVer,
    KernelPanic,
    Taskbar,
    WDM,
    MWDM,
    ErrorManager,
    PasswordHasher,
    NetworkManager,
    BatteryManager,
    UniqueGen,
    AudioMetadataReader,
    VideoMetadataReader,
    ImageMetadataReader,
    ImageValidator,
    VideoThumbnailGenerator,
    Zip,
};