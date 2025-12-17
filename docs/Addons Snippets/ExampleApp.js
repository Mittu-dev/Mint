// WebView Hello World App (API nueva)
// Mint Example Addon

class HelloWebApp {
  constructor() {
    this.window = null;
    this.webview = null;

    this.config = {
      id: "webview",
      name: "Mint WebView",
      title: "Mint WebView",
      width: 1000,
      height: 700,
      icon: "https://static.vecteezy.com/system/resources/previews/016/716/476/non_2x/internet-browser-icon-free-png.png",

      titleAlign: "center",
      titleIcon: "https://static.vecteezy.com/system/resources/previews/016/716/476/non_2x/internet-browser-icon-free-png.png",

      // Ejemplo de shortcut en titlebar
      shortcuts: [
        {
          text: "↻",
          title: "Reload",
          onClick: () => this.reload()
        }
      ]
    };
  }

  /* ─────────────────────────────
   *  PUBLIC API (Taskbar / Launcher)
   * ───────────────────────────── */

  toggle() {
    if (!this.window) {
      this._create();
      return;
    }

    if (this.window.isMinimized) {
      this.window.restoreWindow();
    } else {
      this.window.minimizeWindow();
    }
  }

  /* ─────────────────────────────
   *  INTERNAL
   * ───────────────────────────── */

_create() {
  this.window = new core.wdm.Current(this.config);

  this.webview = new core.SnapSDK.WebView({
    initialUrl: "https://example.com",
    showControls: true,      // navegación visible
    allowNavigation: true
  });

  const container = document.createElement("div");
  container.style.width = "100%";
  container.style.height = "100%";

  this.webview.render(container);

    this.window.setContent("");
    this.window.getContent().appendChild(container);


  // ── Bridge window → taskbar ──
  this.window.onStateChange = (state) => {
    core.taskbar.updateAppState("webview", state);

    if (state === "closed") {
      this._destroy();
    }
  };

  core.taskbar.updateAppState("webview", "open");
}


  reload() {
    if (this.webview) {
      this.webview.reload();
    }
  }

  _destroy() {
    if (this.webview) {
      this.webview.destroy();
      this.webview = null;
    }
    this.window = null;
  }
}

const helloWebApp = new HelloWebApp();

core.taskbar.addApp({
  id: "webview",
  name: "Mint WebView",
  icon: "https://static.vecteezy.com/system/resources/previews/016/716/476/non_2x/internet-browser-icon-free-png.png",
  title: "Example",

  executeType: "function",
  execute: () => helloWebApp.toggle(),

  windowType: "Modern",

  thumbnailPreview: false,
  mediaControl: false,

  pinned: true,
  category: "utilities"
});