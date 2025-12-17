// SettingsApp.js
import { WDM } from "../../System/CloudBase.js";
import { Preferences } from "./PreferencesStore.js";
import { Journal } from "../../System/Journal.js";

export class SettingsApp {
  constructor(container) {
    this.container = container;
  }

  init() {
    Journal.add("[Settings] Initializing Settings App");
    Preferences.load();
    this.render();
  }

  render() {
    const theme = Preferences.get("appearance.theme");
    const notifications = Preferences.get("notifications.enabled");
    const volume = Preferences.get("media.volume");

    this.container.innerHTML = `
      <div class="settings">
        <h2>Settings</h2>

        <section>
          <h3>Appearance</h3>
          <select id="theme">
            <option value="dark" ${theme === "dark" ? "selected" : ""}>Dark</option>
            <option value="light" ${theme === "light" ? "selected" : ""}>Light</option>
          </select>
        </section>

        <section>
          <h3>Notifications</h3>
          <label>
            <input type="checkbox" id="notifications" ${notifications ? "checked" : ""}/>
            Enable notifications
          </label>
        </section>

        <section>
          <h3>Media</h3>
          <input type="range" id="volume" min="0" max="1" step="0.05" value="${volume}"/>
        </section>
      </div>
    `;

    this.bind();
  }

  bind() {
    this.container.querySelector("#theme")
      .addEventListener("change", e => {
        Preferences.set("appearance.theme", e.target.value);
      });

    this.container.querySelector("#notifications")
      .addEventListener("change", e => {
        Preferences.set("notifications.enabled", e.target.checked);
      });

    this.container.querySelector("#volume")
      .addEventListener("input", e => {
        Preferences.set("media.volume", parseFloat(e.target.value));
      });
  }
}

export function launchSettings() {
  const win = WDM.createWindow({
    id: "Settings",
    title: "Settings",
    width: 600,
    height: 400,
    resizable: true
  });

  const app = new SettingsApp(win.content);
  app.init();

  return win;
}