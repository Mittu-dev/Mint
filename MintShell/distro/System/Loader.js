// System/CoreServices.js

import { Journal } from "./Journal.js";

// built-in apps / services
import { Terminit } from "./prgm/Terminal.js";
import { MintExplorer } from "./prgm/Files.js";
import { NovaMusic } from "./prgm/Music.js";

async function loadCoreServices() {
  Journal.add("[Core] Loading built-in services...", 1);

  // Servicios sin UI
  //Terminit();
  Journal.add("[Core] Terminal initialized", 1);

const musicApp = new NovaMusic();

core.taskbar.addApp({
  id: "mint-music",
  name: "Mint Music",
  icon: "Assets/Beta/music.png",
  title: "Music",
  executeType: "function",
  execute: () => musicApp.toggle(),
  windowType: "Modern",
  mediaControl: false,
  thumbnailPreview: true,
  pinned: true,
  category: "multimedia"
});

  Journal.add("[Core] Music service initialized", 1);

  // Apps core (UI)
  //new MintExplorer();
  Journal.add("[Core] MintExplorer started", 1);

  Journal.add("[Core] Built-in services loaded", 1);
}

export { loadCoreServices };
