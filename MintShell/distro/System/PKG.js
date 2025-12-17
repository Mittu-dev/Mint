// Mint Package Loader

import { Journal } from "./Journal.js";
import { CommandManager } from "./prgm/Terminal.js";
import { FileSystem } from "./Filesystem.js";
import { loadCoreServices } from "./Loader.js";

class AddonLoader {
  constructor({ fs, secore = null }) {
    this.fs = fs;
    this.secore = secore;
  }

  async load(packageName) {
    const base = `/addons/${packageName}`;

    // ─── Manifest ───────────────────────────
    const manifest = JSON.parse(
      (await this.fs.read(`${base}/manifest.json`)).content
    );

    // ─── Permissions ─────────────────────────
    const permissions = JSON.parse(
      (await this.fs.read(`${base}/permissions.json`)).content
    );

    // ─── Security check ──────────────────────
    if (this.secore?.requestPermissions) {
      const allowed = await this.secore.requestPermissions(
        manifest.name,
        permissions
      );

      if (!allowed) {
        Journal.add(`[AddonLoader] Permission denied: ${manifest.name}`, 2);
        throw new Error("Permission denied");
      }
    }

    // ─── Load entry file ─────────────────────
    const entry = manifest.main || "main.js";
    const code = (await this.fs.read(`${base}/${entry}`)).content;

    const blob = new Blob([code], { type: "text/javascript" });
    const url = URL.createObjectURL(blob);

    const module = await import(url);

    if (typeof module.default !== "function") {
      throw new Error("Addon must export default function");
    }

    Journal.add(`[AddonLoader] Loaded ${manifest.name}`, 1);

    // ─── Execute addon ───────────────────────
    return module.default({
      core,
      fs: this.fs,
      manifest
    });
  }
}

class MBP {
  constructor() {
    this.fs = core?.fs ?? new FileSystem();
    this.ready = Promise.resolve(true);
    this.loader = new AddonLoader({
      fs: this.fs,
      secore: core?.SE
    });

    this.registerCommands();
  }

  registerCommands() {
    CommandManager.register("mbp", "Mint Package Manager", async (args) => {
switch (args[0]) {
  case "list":
    return await this.list();

  case "run":
    if (!args[1]) return "Usage: mbp run <package>";
    await this.loader.load(args[1]);
    return "Addon executed";

  case "help":
  default:
    return this.help();
}

    });
  }

  async list() {
    await this.ready;
    return await this.fs.readdir("/addons");
  }

  help() {
    return `
MBP - Mint Package Manager

Commands:
mbp list
mbp run <package>
`;
  }
}

let MBP_INSTANCE = null;

async function SPL() {
  try {
    Journal.add("[SPL] Initializing core subsystems...", 1);

    // Inicializar Package Manager (pero no instalar nada)
    MBP_INSTANCE = new MBP();
    loadCoreServices();

    Journal.add("[SPL] Package subsystem ready", 1);

    // Exponer a CORE (como antes)
    if (!window.core) window.core = {};
    core.MBP = MBP_INSTANCE;

    Journal.add("[SPL] SPL initialization complete", 1);
    return true;

  } catch (error) {
    Journal.add(`[SPL] Initialization Error: ${error.message}`, 2);
    throw error;
  }
}


export { MBP, SPL };

