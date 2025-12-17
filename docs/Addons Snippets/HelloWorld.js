// Mint Example Addon
// Simple Hello World App 
class MyApp {
  constructor() {
    this.window = null;

    this.config = {
      id: "myapp-window",
      name: "MyApp",
      title: "My App",
      width: 854,
      height: 480,
      icon: "Assets/Mint.png",

      // ── Titlebar options ──
      titleAlign: "center",
      titleIcon: "Assets/Mint.png",

      shortcuts: [
        {
          icon: "https://cdn-icons-png.flaticon.com/512/189/189687.png",
          title: "Refresh",
          onClick: () => this.refresh()
        },
        {
          icon: "https://static.wikia.nocookie.net/logopedia/images/3/36/Settings-visionOS.png/revision/latest/scale-to-width-down/128?cb=20250408165303",
          title: "Settings",
          onClick: () => this.openSettings()
        }
      ]
    };
  }

  /* ─────────────────────────────
   *  PUBLIC API (Taskbar / Launcher)
   * ───────────────────────────── */

  toggle() {
    // ── Create ──
    if (!this.window) {
      this._create();
      return;
    }

    // ── Toggle ──
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

    this.window.setContent(`
      <div style="padding:20px">
        <h1>Hello from MyApp 👋</h1>
        <p>This app uses Modern WDM</p>
      </div>
    `);

    // ── Bridge window → taskbar ──
    this.window.onStateChange = (state) => {
      core.taskbar.updateAppState("myapp", state);

      if (state === "closed") {
        this.window = null;
      }
    };

    core.taskbar.updateAppState("myapp", "open");
  }

  /* ─────────────────────────────
   *  APP ACTIONS
   * ───────────────────────────── */

  refresh() {
    console.log("Refresh clicked");
  }

  openSettings() {
    console.log("Settings clicked");
  }
}
const myApp = new MyApp();

core.taskbar.addApp({
  id: "myapp",
  name: "MyApp",
  icon: "Assets/Mint.png",
  title: "My App",

  executeType: "function",
  execute: () => myApp.toggle(),

  windowType: "Modern",

  thumbnailPreview: true,
  mediaControl: false,

  pinned: true,
  category: "utilities"
});