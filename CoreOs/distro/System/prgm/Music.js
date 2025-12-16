// Mint Music
import { WDM } from "../CloudBase.js"; // igual que en Terminal
import { CommandManager } from "./Terminal.js"
import { Journal } from "../Journal.js";  

class NovaMusic{
  constructor(){
    this.music = null;
    this.musicFiles = [];
    this.config = {
      id: 'Music',
      title: 'Nova Music',
      width: 1200,
      height: 700,
      icon: 'Assets/Beta/music.png'
    };
  }

  async Init(){
    Journal.add("[Nova Music] Initializing Nova Music Application...");
    this.music = new WDM(this.config);
    CORE.CORE_DOCK.addApp(this.config.name, this.config.icon, this.music);
    this.music.minimizeWindow();
    this.registerTerminalCommand();
    await this.startIndex();
    this.inyectCSS();
    this.createUI();
  }

  async startIndex(){
    Journal.add("[Nova Music] Indexing Music Files...");
    const DefaultFolder = '/home/Music';
    const exists = await CORE.fs.exists('home/Music');
    if(!exists){
      Journal.add("[Nova Music] Music folder not found. Creating default Music folder...");
      await CORE.fs.mkdir(DefaultFolder);
    }
    Journal.add("[Nova Music] Loading music files from Music folder...");
    const files = await CORE.fs.readdir(DefaultFolder);   
    this.musicFiles = files;
  }

  renderMusicCards(){
    Journal.add("[Nova Music] Rendering music files...");
    if(!this.musicFiles.length){
      Journal.add("[Nova Music] No music files found in Music folder.");
      return;
    };
    const grid = this.music.window.querySelector('.music-grid');
    grid.innerHTML = '';
    this.musicFiles.forEach(file => {
      const card = document.createElement('div');
      card.classList.add('music-card');
      grid.appendChild(card);
    });
    Journal.add("[Nova Music] Music files rendered successfully.");
  }

  open(){
    this.music.restoreWindow();
  }

  kill(){
    this.music.closeWindow();
  }

  registerTerminalCommand(){
    Journal.add("[Nova Music] Registering terminal command 'music' to launch Nova Music Application...");
    CommandManager.register('music', 'Launch Nova Music Application', () => {
      this.open();
    });
  }
  
  inyectCSS(){
    Journal.add("[Nova Music] Injecting custom CSS for Nova Music...");
    const style = document.createElement('style');
    style.textContent = `
* {
  box-sizing: border-box;
  font-family: system-ui, sans-serif;
}

.music-app {
    height: 100%;
    padding: 5px;
    display: grid;
    grid-template-rows: auto 1fr;
    color: #fff;
}

/* ───────── Header ───────── */

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
    margin-top: 1vh;
}

.music-top input {
    width: 280px;
    padding: 10px 18px;
    border-radius: 20px;
    border: none;
    outline: none;
    background: rgb(97 97 97 / 26%);
    color: white;
}

/* ───────── Grid ───────── */

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
    transition: transform .2s ease, box-shadow .2s ease;
}
.music-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 28px 70px rgba(0,0,0,.6);
}

/* ───────── Player ───────── */

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
    box-shadow: 0 22px 60px rgba(0,0,0,.6);
    justify-items: center;
}

/* Meta */

.player-meta {
  display: flex;
  align-items: center;
  gap: 14px;
}

.player-meta img {
  width: 56px;
  height: 56px;
  border-radius: 12px;
}

.meta-text {
  display: flex;
  flex-direction: column;
}

.meta-text .song {
  font-weight: 600;
}

.meta-text .artist {
  opacity: .7;
  font-size: .9rem;
}

/* Center */

.player-center {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 6px;
    padding: 11px;
    background: #81818126;
    border-radius: 17px;
}

.controls {
  display: flex;
  gap: 20px;
  align-items: center;
}

.controls .material-icons {
    font-size: 2.2rem;
    cursor: pointer;
    opacity: .9;
    transition: transform .15s ease;
    font-family: 'Material Icons';
}

.controls .play {
  font-size: 2.8rem;
}

.controls .material-icons:hover {
  transform: scale(1.15);
  opacity: 1;
}

/* Seek */

.seek {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: .85rem;
    opacity: .85;
    height: fit-content;
    margin-top: 1vh;
}

.seek input {
  width: 260px;
}

/* Volume */

.player-volume {
  display: flex;
  align-items: center;
  gap: 10px;
}

.player-volume input {
  width: 90px;
}
    `;
    document.head.appendChild(style);
  }

  createUI(){
    Journal.add("[Nova Music] Creating User Interface...");
    const Layout = `
<div class="music-app">

  <!-- Top bar -->
  <header class="music-top">
    <h1>Music</h1>
    <input type="search" placeholder="Search Music">
  </header>

  <!-- Grid -->
  <section class="music-grid">
  </section>

  <!-- Player -->
  <footer class="music-player">
    <div class="player-meta">
      <img src="Assets/Beta/music.png" alt="Album Art">
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
        <span0:00</span>
        <input type="range" min="0" max="100" value="0">
        <span></span>
      </div>
    </div>

    <div class="player-volume">
      <span class="material-icons tray">volume_up</span>
      <input type="range" min="0" max="100" value="100">
    </div>
  </footer>

</div>

    `
    this.music.setContent(Layout);
    Journal.add("[Nova Music] User Interface created successfully.");
    this.renderMusicCards();
    Journal.add("[Nova Music] Nova Music Application is ready to use.");
  } 
}

export { NovaMusic };