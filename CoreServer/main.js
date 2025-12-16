#!/usr/bin/env node
'use strict';

/* ───────────────── CONFIG ───────────────── */

import express from 'express';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';
import si from 'systeminformation';

const PORT = 1033;
const PWA_DIR = 'Singapura';

const BASE_HOME  = `/opt/${PWA_DIR}/home`;
const ADDONS_DIR = `${BASE_HOME}/addons`;
const BIN_PATH   = '/usr/bin';

/* ───────────────── HELPERS ───────────────── */

function safePath(p = '') {
  const resolved = path.resolve(BASE_HOME, p);
  if (!resolved.startsWith(BASE_HOME)) {
    throw new Error('Path escape detected');
  }
  return resolved;
}

function jsonError(res, err, code = 400) {
  res.status(code).json({ error: err.message });
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

ensureDir(BASE_HOME);
ensureDir(ADDONS_DIR);

/* ───────────────── COMMAND PROFILES ───────────────── */

let pacmanBusy = false;

const COMMAND_PROFILES = {
  /* System */
  'system:update': {
    cmd: 'pacman',
    args: ['-Syu', '--noconfirm'],
    sudo: true,
    lock: 'pacman'
  },

  'system:install': {
    cmd: 'pacman',
    args: ['-S', '--noconfirm'],
    sudo: true,
    dynamicArgs: true,
    lock: 'pacman'
  },

  'system:remove': {
    cmd: 'pacman',
    args: ['-Rns', '--noconfirm'],
    sudo: true,
    dynamicArgs: true,
    lock: 'pacman'
  },
  'system:fetch': {
    cmd: 'fastfetch',
    args: [],
    sudo: false,
    dynamicArgs: true,
    lock: 'fastfetch'
  },
  'system:proc': {
    cmd: 'ps',
    args: ["-ef"],
    sudo: false,
    dynamicArgs: true,
    lock: 'ps'
  },
  'system:prockill': {
    cmd: 'pkill',
    args: ["-9"],
    sudo: false,
    dynamicArgs: true,
    lock: 'pkill'
  }
};

/* ───────────────── EXECUTOR ───────────────── */

function runProfile({ profile, args = [] }) {
  const p = COMMAND_PROFILES[profile];
  if (!p) throw new Error('Invalid command profile');

  if (p.lock === 'pacman') {
    if (pacmanBusy) throw new Error('pacman is busy');
    pacmanBusy = true;
  }

  const finalArgs = [...p.args];
  if (p.dynamicArgs) finalArgs.push(...args);

  const cmd = p.sudo ? 'sudo' : p.cmd;
  const cmdArgs = p.sudo ? [p.cmd, ...finalArgs] : finalArgs;

  const proc = spawn(cmd, cmdArgs, {
    cwd: BASE_HOME,
    env: {
      HOME: BASE_HOME,
      PATH: BIN_PATH
    }
  });

  const killer = setTimeout(() => proc.kill('SIGKILL'), 60_000);

  proc.on('close', () => {
    clearTimeout(killer);
    if (p.lock === 'pacman') pacmanBusy = false;
  });

  return proc;
}

/* ───────────────── PKG MANAGER (PWA ADDONS) ───────────────── */

function addonPath(name) {
  if (!name || name.includes('..')) {
    throw new Error('Invalid addon name');
  }
  return path.join(ADDONS_DIR, name);
}

/* pkg:install */
function pkgInstall({ name, repo }) {
  const target = addonPath(name);
  if (fs.existsSync(target)) throw new Error('Addon already exists');

  return spawn('git', ['clone', repo, target], {
    cwd: ADDONS_DIR,
    env: { PATH: BIN_PATH }
  });
}

/* pkg:load */
function pkgLoad() {
  return fs.readdirSync(ADDONS_DIR).filter(d =>
    fs.statSync(path.join(ADDONS_DIR, d)).isDirectory()
  );
}

/* pkg:update */
function pkgUpdate({ name }) {
  const target = addonPath(name);
  if (!fs.existsSync(target)) throw new Error('Addon not found');

  return spawn('git', ['pull'], {
    cwd: target,
    env: { PATH: BIN_PATH }
  });
}

/* pkg:uninstall */
function pkgUninstall({ name }) {
  const target = addonPath(name);
  if (!fs.existsSync(target)) throw new Error('Addon not found');

  fs.rmSync(target, { recursive: true, force: true });
}

/* ───────────────── SYSTEM INFO ───────────────── */

async function getSystemInfo() {
  const [osInfo, cpu, mem] = await Promise.all([
    si.osInfo(),
    si.cpu(),
    si.mem()
  ]);

  return {
    os: osInfo.distro,
    kernel: osInfo.kernel,
    arch: osInfo.arch,
    cpu: cpu.brand,
    memory: Math.round(mem.total / 1024 / 1024),
    hostname: osInfo.hostname,
    user: process.env.USER
  };
}

async function getSystemStatus() {
  const [load, mem, fsSize, time] = await Promise.all([
    si.currentLoad(),
    si.mem(),
    si.fsSize(),
    si.time()
  ]);

  const disk = fsSize.find(d => BASE_HOME.startsWith(d.mount));

  return {
    cpu: { load: Number(load.currentLoad.toFixed(2)), cores: load.cpus.length },
    memory: {
      used: Math.round(mem.used / 1024 / 1024),
      total: Math.round(mem.total / 1024 / 1024)
    },
    disk,
    uptime: time.uptime,
    bridge: { pid: process.pid, uptime: Math.floor(process.uptime()) }
  };
}

/* ───────────────── EXPRESS API ───────────────── */

const app = express();
app.use(express.json());

/* System */
app.get('/system/info', async (_, res) => res.json(await getSystemInfo()));
app.get('/system/status', async (_, res) => res.json(await getSystemStatus()));

/* FS – FULL ACCESS (sandboxed) */
app.get('/fs/list', (req, res) => {
  try {
    const dir = safePath(req.query.dir || '');
    res.json(fs.readdirSync(dir));
  } catch (e) { jsonError(res, e); }
});

app.get('/fs/readdir', (req, res) => {
  try {
    const dir = safePath(req.query.dir || '');
    const entries = fs.readdirSync(dir);
    res.json(entries);
  } catch (e) {
    jsonError(res, e);
  }
});

app.post('/fs/read', (req, res) => {
  try {
    const file = safePath(req.body.path);
    res.send(fs.readFileSync(file, 'utf8'));
  } catch (e) { jsonError(res, e); }
});

app.post('/fs/write', (req, res) => {
  try {
    const file = safePath(req.body.path);
    fs.writeFileSync(file, req.body.content);
    res.json({ ok: true });
  } catch (e) { jsonError(res, e); }
});

app.post('/fs/delete', (req, res) => {
  try {
    const target = safePath(req.body.path);
    fs.rmSync(target, { recursive: true, force: true });
    res.json({ ok: true });
  } catch (e) { jsonError(res, e); }
});

app.post('/fs/mkdir', (req, res) => {
  try {
    const dir = safePath(req.body.path);
    fs.mkdirSync(dir, { recursive: true });
    res.json({ ok: true });
  } catch (e) {
    jsonError(res, e);
  }
});

app.post('/fs/rename', (req, res) => {
  try {
    const from = safePath(req.body.from);
    const to   = safePath(req.body.to);
    fs.renameSync(from, to);
    res.json({ ok: true });
  } catch (e) { jsonError(res, e); }
});

app.post('/fs/rename', (req, res) => {
  try {
    const from = safePath(req.body.from);
    const to   = safePath(req.body.to);
    fs.renameSync(from, to);
    res.json({ ok: true });
  } catch (e) {
    jsonError(res, e);
  }
});

/* Commands */
app.post('/cmd/run', (req, res) => {
  try {
    const proc = runProfile(req.body);
    let stdout = '', stderr = '';

    proc.stdout.on('data', d => stdout += d);
    proc.stderr.on('data', d => stderr += d);

    proc.on('close', code => res.json({ stdout, stderr, code }));
  } catch (e) { jsonError(res, e); }
});

/* PKG */
app.post('/pkg/install', (req, res) => {
  try {
    const p = pkgInstall(req.body);
    p.on('close', () => res.json({ ok: true }));
  } catch (e) { jsonError(res, e); }
});

app.get('/pkg/load', (_, res) => {
  try {
    res.json(pkgLoad());
  } catch (e) { jsonError(res, e); }
});

app.post('/pkg/update', (req, res) => {
  try {
    const p = pkgUpdate(req.body);
    p.on('close', () => res.json({ ok: true }));
  } catch (e) { jsonError(res, e); }
});

app.post('/pkg/uninstall', (req, res) => {
  try {
    pkgUninstall(req.body);
    res.json({ ok: true });
  } catch (e) { jsonError(res, e); }
});

/* ───────────────── BOOT ───────────────── */

app.listen(PORT, () => {
  console.log(`Nova Mint Services running on http://localhost:${PORT}`);
  console.log(`Mint User HOME   → ${BASE_HOME}`);
  console.log(`Mint System ADDONS → ${ADDONS_DIR}`);
});
