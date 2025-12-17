// Mint Explorer (v2 clean)
import { MWDM } from "../CloudBase.js";
import { CommandManager } from "./Terminal.js";
import { Journal } from "../Journal.js";

class MintExplorerWM extends MWDM {

  constructor(config){
    super(config);
    this.contentEl = this.container.querySelector('.window-content');
  }

  setContent(html){
    super.setContent(html);
    this.contentEl = this.container.querySelector('.window-content');
    return this.contentEl;
  }

  getContent(){
    return this.contentEl;
  }
}



class MintExplorer {

  constructor(){
    this.window = null;
    this.root = null;

    this.cwd = '/home';
    this.entries = [];

    this.config = {
      id: 'Explorer',
      title: 'Explorer',
      width: 900,
      height: 600,
      icon: 'Assets/Beta/files.png'
    };

    this.init();
  }

  /* ───────── INIT ───────── */

  async init(){
    Journal.add('[Explorer] Initializing');

    this.window = new MintExplorerWM(this.config);
    CORE.Dock.addApp(this.config.id, this.config.icon, this.window);
    this.window.minimizeWindow();

    this.createUI();
    this.injectCSS();
    this.registerCommand();

    await this.loadDirectory(this.cwd);
  }

  registerCommand(){
    CommandManager.register('files', 'Open File Explorer', () => {
      this.window.restoreWindow();
    });
  }

  /* ───────── FS ───────── */

  async loadDirectory(path){
    try{
      Journal.add(`[Explorer] load ${path}`);
      this.cwd = path;
      this.entries = await CORE.fs.readdir(path);
      this.render();
    }catch(err){
      console.error('[Explorer]', err);
    }
  }

  /* ───────── RENDER ───────── */

  render(){
    if(!this.root) return;

    const list = this.root.querySelector('.fe-list');
    const pathLabel = this.root.querySelector('.fe-path');

    if(!list || !pathLabel) return;

    pathLabel.textContent = this.cwd;
    list.innerHTML = '';

    // subir nivel
    if(this.cwd !== '/'){
      list.appendChild(this.createItem({
        name: '..',
        up: true
      }));
    }

    this.entries.forEach(name => {
      list.appendChild(this.createItem({ name }));
    });
  }

  createItem(entry){
    const el = document.createElement('div');
    el.className = 'fe-item';
    el.textContent = entry.name;

    el.ondblclick = async () => {
      if(entry.up){
        const parent = this.cwd.split('/').slice(0, -1).join('/') || '/';
        await this.loadDirectory(parent);
        return;
      }

      const target = `${this.cwd}/${entry.name}`;

      // intento abrir como carpeta
      try{
        await CORE.fs.readdir(target);
        await this.loadDirectory(target);
      }catch{
        // si falla, es archivo
        Journal.add(`[Explorer] open file ${target}`);
        CORE.dispatch('file:open', { path: target });
      }
    };

    return el;
  }

  /* ───────── UI ───────── */

  createUI(){
    this.root = this.window.setContent(`
      <div class="fe-app">
        <div class="fe-header fe-path"></div>
        <div class="fe-list"></div>
      </div>
    `);
  }

  injectCSS(){
    const style = document.createElement('style');
    style.textContent = `
      .fe-app{
        height:100%;
        display:flex;
        flex-direction:column;
        background:#1c1c1c;
        color:#fff;
        font-family:system-ui;
      }

      .fe-header{
        padding:8px 12px;
        background:#2a2a2a;
        font-size:.85rem;
        opacity:.85;
      }

      .fe-list{
        flex:1;
        padding:8px;
        overflow:auto;
        display:flex;
        flex-direction:column;
        gap:4px;
      }

      .fe-item{
        padding:6px 10px;
        border-radius:6px;
        cursor:pointer;
      }

      .fe-item:hover{
        background:#ffffff14;
      }
    `;
    document.head.appendChild(style);
  }
}

export { MintExplorer };
