// Mint Music
import { MWDM } from "../CloudBase.js";
import { CommandManager } from "./Terminal.js";
import { Journal } from "../Journal.js";

class NovaMusic {
  constructor() {
    this.window = null;
    this.musicFiles = [];
    this._cssInjected = false;

    this.config = {
      id: "mint-music-window",
      name: "Music",
      title: "Nova Music",
      width: 1200,
      height: 700,
      icon: "Assets/Beta/music.png",
      titleAlign: "center"
    };

    this.registerTerminalCommand();
  }

  /* ─────────────────────────────
   *  PUBLIC API (Taskbar / Terminal)
   * ───────────────────────────── */

  async toggle() {
    // ── App no creada → crear ──
    if (!this.window) {
      await this._create();
      return;
    }

    // ── App existente → toggle ──
    if (this.window.isMinimized) {
      this.window.restoreWindow();
    } else {
      this.window.minimizeWindow();
    }
  }

  kill() {
    if (!this.window) return;
    this.window.closeWindow();
    this.window = null;
  }

  /* ─────────────────────────────
   *  INTERNAL CREATION
   * ───────────────────────────── */

  async _create() {
    Journal.add("[Nova Music] Launching Nova Music...");

    this.window = new MWDM(this.config);

    // ── Window → Taskbar state bridge ──
    this.window.onStateChange = (state) => {
      core.taskbar.updateAppState("mint-music", state);

      if (state === "closed") {
        this.window = null;
      }
    };

    await this._indexMusic();
    this._injectCSS();
    this._createUI();

    core.taskbar.updateAppState("mint-music", "open");
    Journal.add("[Nova Music] Ready.");
  }

  /* ─────────────────────────────
   *  FILESYSTEM
   * ───────────────────────────── */

  async _indexMusic() {
    Journal.add("[Nova Music] Indexing music files...");

    const folder = "/home/Music";
    const exists = await core.fs.exists("home/Music");

    if (!exists) {
      Journal.add("[Nova Music] Music folder not found. Creating...");
      await core.fs.mkdir(folder);
    }

    this.musicFiles = await core.fs.readdir(folder);
  }

  /* ─────────────────────────────
   *  UI
   * ───────────────────────────── */

  _createUI() {
    const layout = `
      <div class="music-app">

        <header class="music-top">
          <h1>Music</h1>
          <input type="search" placeholder="Search Music">
        </header>

        <section class="music-grid"></section>

        <footer class="music-player">
          <div class="player-meta">
            <img src="Assets/Beta/music.png">
            <div class="meta-text">
              <span class="song"></span>
              <span class="artist"></span>
            </div>
          </div>

          <div class="player-center">
            <div class="controls">
              <span class="material-icons">skip_previous</span>
              <span class="material-icons play">play_arrow</span>
              <span class="material-icons">skip_next</span>
            </div>

            <div class="seek">
              <span>0:00</span>
              <input type="range" min="0" max="100" value="0">
              <span>0:00</span>
            </div>
          </div>

          <div class="player-volume">
            <span class="material-icons">volume_up</span>
            <input type="range" min="0" max="100" value="100">
          </div>
        </footer>

      </div>
    `;

    this.window.setContent(layout);
    this._renderMusicCards();
  }

  _renderMusicCards() {
    if (!this.musicFiles.length) return;

    const grid = this.window.getContent().querySelector(".music-grid");
    grid.innerHTML = "";

    this.musicFiles.forEach(() => {
      const card = document.createElement("div");
      card.className = "music-card";
      grid.appendChild(card);
    });
  }

  /* ─────────────────────────────
   *  TERMINAL
   * ───────────────────────────── */

  registerTerminalCommand() {
    CommandManager.register(
      "music",
      "Launch Nova Music Application",
      () => this.toggle()
    );
  }

  /* ─────────────────────────────
   *  CSS
   * ───────────────────────────── */

  _injectCSS() {
    if (this._cssInjected) return;
    this._cssInjected = true;

    const style = document.createElement("style");
    style.textContent = `
      * { box-sizing: border-box; }

      .music-app {
        height: 100%;
        padding: 6px;
        display: grid;
        grid-template-rows: auto 1fr;
        color: #fff;
      }

      .music-top {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 28px;
      }

      .music-top h1 {
        font-size: 2.6rem;
        font-weight: 500;
        margin-left: 1vw;
      }

      .music-top input {
        width: 280px;
        padding: 10px 18px;
        border-radius: 20px;
        border: none;
        background: rgb(97 97 97 / 26%);
        color: white;
      }

      .music-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
        gap: 28px;
        padding-bottom: 140px;
      }

      .music-card {
        aspect-ratio: 4 / 3;
        background: rgb(101 101 101 / 35%);
        border-radius: 28px;
        box-shadow: 0 18px 40px rgba(0,0,0,.45);
        transition: transform .2s ease;
      }

      .music-card:hover {
        transform: translateY(-6px);
      }

      .music-player {
        position: absolute;
        left: 24px;
        right: 24px;
        bottom: 24px;
        height: 90px;
        background: rgb(23 23 23 / 85%);
        backdrop-filter: blur(18px);
        border-radius: 26px;
        display: grid;
        grid-template-columns: auto 1fr auto;
        align-items: center;
        padding: 0 24px;
      }

      .player-meta {
        display: flex;
        gap: 14px;
        align-items: center;
      }

      .player-meta img {
        width: 56px;
        height: 56px;
        border-radius: 12px;
      }

      .player-center {
        display: flex;
        gap: 10px;
        align-items: center;
        justify-content: center;
      }

      .controls {
        display: flex;
        gap: 20px;
      }

      .controls .material-icons {
        font-size: 2.2rem;
        cursor: pointer;
      }

      .controls .play {
        font-size: 2.8rem;
      }

      .player-volume {
        display: flex;
        gap: 10px;
        align-items: center;
      }
    `;
    document.head.appendChild(style);
  }
}

export { NovaMusic };
