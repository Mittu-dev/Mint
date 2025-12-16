// Mint FileSystem

import * as Snap from '../Snap/Snap.js';

const SYSTEM_SERVER = 'http://localhost:1033';

// Backend: Local (SnapFS) [IndexedDB]
class LocalFSBackend {
  constructor(options = {}) {
    this.fs = new Snap.SFS('MintFS', 1, {
      fsType: 'standard',
      verbose: true,
      maxCacheSize: 50 * 1024 * 1024,
      compression: true,
      ...options
    });
  }

  async init() {
    await this.fs.init();
  }

  exists(path) {
    return this.fs.exists(path);
  }

  read(path) {
    return this.fs.readFile(path);
  }

  write(path, content, type = 'text', perms = 'rw') {
    return this.fs.writeFile(path, content, type, perms);
  }

  delete(path) {
    return this.fs.deleteFile(path);
  }

  list(dir = '/', options = {}) {
    return this.fs.listFiles(dir, options);
  }
  
readdir(dir = '/') {
  return this.fs.listFiles(dir).then(files =>
    files.map(f => f.name)
  );
}

  mkdir(path, perms = 'rwx') {
    return this.fs.createFolder(path, perms);
  }

  async rmdir(path, { recursive = true } = {}) {
    if (!recursive) {
      const files = await this.fs.listFiles(path);
      if (files.length > 0) {
        throw new Error('Directory not empty');
      }
    }
    return this.fs.deleteFile(path);
  }

  async rename(from, to) {
    const node = await this.fs.readFile(from);

    if (node.type === 'folder') {
      await this.fs.createFolder(to, node.permissions);
      const children = await this.fs.listFiles(from);

      for (const child of children) {
        const newPath = to + child.path.slice(from.length);
        await this.rename(child.path, newPath);
      }
      await this.fs.deleteFile(from);
    } else {
      await this.fs.writeFile(
        to,
        node.content,
        node.type,
        node.permissions
      );
      await this.fs.deleteFile(from);
    }

    return true;
  }
}
// Backend: Remote (System Server) [HTTP API]
class RemoteFSBackend {
  constructor(baseURL = SYSTEM_SERVER) {
    this.baseURL = baseURL;
  }

  async init() {
    const r = await fetch(`${this.baseURL}/system/status`);
    if (!r.ok) throw new Error('Remote FS unavailable');
  }

  async read(path) {
    const r = await fetch(`${this.baseURL}/fs/read`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path })
    });
    if (!r.ok) throw new Error('Read failed');
    return { content: await r.text(), type: 'text' };
  }

  async write(path, content) {
    const r = await fetch(`${this.baseURL}/fs/write`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, content })
    });
    if (!r.ok) throw new Error('Write failed');
    return true;
  }

  async delete(path) {
    const r = await fetch(`${this.baseURL}/fs/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path })
    });
    if (!r.ok) throw new Error('Delete failed');
    return true;
  }

  async list(dir = '/') {
    const r = await fetch(
      `${this.baseURL}/fs/list?dir=${encodeURIComponent(dir)}`
    );
    if (!r.ok) throw new Error('List failed');

    return (await r.json()).map(name => ({
      name,
      path: `${dir}/${name}`.replace(/\/+/g, '/'),
      type: name.includes('.') ? 'file' : 'folder'
    }));
  }

  async mkdir(path) {
    const r = await fetch(`${this.baseURL}/fs/mkdir`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path })
    });
    if (!r.ok) throw new Error('mkdir failed');
    return true;
  }

  async rmdir(path) {
    return this.delete(path);
  }

  async rename(from, to) {
    const r = await fetch(`${this.baseURL}/fs/rename`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to })
    });
    if (!r.ok) throw new Error('rename failed');
    return true;
  }

  async readdir(dir = '/') {
  const r = await fetch(
    `${this.baseURL}/fs/readdir?dir=${encodeURIComponent(dir)}`
  );
  if (!r.ok) throw new Error('readdir failed');
  return r.json(); // string[]
}

}

class FileSystem {
  constructor() {
    this.backend = null;
    this.backendType = 'none';

    // Clipboard de sesión
    this.clipboard = {
      mode: null,   // 'copy' | 'cut'
      source: null
    };
  }

  async init() {
    if (await this.#hasSystemServer()) {
      this.backend = new RemoteFSBackend();
      this.backendType = 'remote';
    } else {
      this.backend = new LocalFSBackend();
      this.backendType = 'local';
    }

    await this.backend.init();
    this.#expose();
  }

  /* ───────── FS API ───────── */

  exists(p) { return this.backend.exists?.(p); }
  read(p)   { return this.backend.read(p); }
  write(p,c,t,perms){ return this.backend.write(p,c,t,perms); }
  delete(p){ return this.backend.delete(p); }
  list(d,o){ return this.backend.list(d,o); }

  mkdir(p, perms){ return this.backend.mkdir(p, perms); }
  rmdir(p, opts){ return this.backend.rmdir(p, opts); }
  rename(a,b){ return this.backend.rename(a,b); }

  /* ───────── Clipboard API ───────── */

  copy(path) {
    this.clipboard = { mode: 'copy', source: path };
    return true;
  }

  cut(path) {
    this.clipboard = { mode: 'cut', source: path };
    return true;
  }
  
  readdir(path = '/') {
  return this.backend.readdir(path);
  }


  async paste(targetDir) {
    if (!this.clipboard.source) {
      throw new Error('Clipboard empty');
    }

    const from = this.clipboard.source;
    const name = from.split('/').pop();
    const to = `${targetDir}/${name}`.replace(/\/+/g, '/');

    if (this.clipboard.mode === 'copy') {
      await this.#copyRecursive(from, to);
    }

    if (this.clipboard.mode === 'cut') {
      await this.backend.rename(from, to);
      this.clipboard = { mode: null, source: null };
    }

    return true;
  }

  /* ───────── Internos ───────── */

  async #copyRecursive(from, to) {
    const node = await this.backend.read(from);

    if (node.type === 'folder') {
      await this.backend.mkdir(to);
      const children = await this.backend.list(from);

      for (const child of children) {
        await this.#copyRecursive(
          child.path,
          `${to}/${child.name}`
        );
      }
    } else {
      await this.backend.write(
        to,
        node.content,
        node.type,
        node.permissions
      );
    }
  }

  async #hasSystemServer() {
    try {
      const r = await fetch(`${SYSTEM_SERVER}/system/info`, {
        cache: 'no-store'
      });
      return r.ok;
    } catch {
      return false;
    }
  }

  #expose() {
    if (!window.CORE) window.CORE = {};
    window.CORE.fs = this;
  }

  info() {
    return { backend: this.backendType };
  }
}

export { FileSystem };
