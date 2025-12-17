// ClockDesk App (API nueva)

class ClockDesk {
  constructor() {
    this.window = null;

    this.config = {
      id: "clockdesk-window",
      name: "ClockDesk",
      width: 400,
      height: 400,
      icon: "https://icons.veryicon.com/png/o/application/a1/default-application.png"
    };
  }

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

  _create() {
    this.window = new core.wdm.Legacy(this.config);

    const content = `
      <p class="headerclock"
         style="font-size:8em;position:absolute;inset:0;margin:auto;width:fit-content;height:fit-content;">
      </p>
    `;

    this.window.setContent(content);

    this.window.onStateChange = (state) => {
      core.taskbar.updateAppState("clockdesk", state);

      if (state === "closed") {
        this.window = null;
      }
    };

    this._startClock();
    core.taskbar.updateAppState("clockdesk", "open");
  }

  _startClock() {
    core.Snap.Scheduler.loop(() => {
      const time = core.Snap.DateTime.Clock("12H");
      const el = document.querySelector(".headerclock");
      if (el) el.textContent = time;
    }, 1000);
  }
}

const clockApp = new ClockDesk();

core.taskbar.addApp({
  id: "clockdesk",
  name: "ClockDesk",
  icon: "https://icons.veryicon.com/png/o/application/a1/default-application.png",
  title: "ClockDesk",

  executeType: "function",
  execute: () => clockApp.toggle(),

  windowType: "Legacy",
  pinned: true,
  category: "utilities"
});