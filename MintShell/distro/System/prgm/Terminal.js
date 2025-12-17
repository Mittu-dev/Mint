let TermAPI;
var TermSE;
let CurrentUser;

import { MWDM, CoreVer } from "../CloudBase.js";
import { Journal } from "../Journal.js";

let Commands = {
    help: {
        description: 'List all available commands',
        execute: function () {
            const keys = Object.keys(Commands).sort();
            const count = keys.length;
            // compute padding for aligned columns
            const maxNameLen = keys.reduce((max, k) => Math.max(max, k.length), 0);
            const pad = (s, n) => s + ' '.repeat(Math.max(0, n - s.length));
            const header = `Available commands (${count}):\n`;
            const lines = keys.map(k => {
                const desc = Commands[k].description || '';
                return `<pre>${pad(k, maxNameLen + 2)}${desc}</pre>`;
            });
            return header + lines.join('\n');
        }
    },
    echo: {
        description: 'Echo the input text',
        execute: function (args) {
            return args.join(' ');
        }
    },
    clear: {
        description: 'Clear the terminal output',
        execute: function () {
            const outputEl = document.getElementById('output');
            outputEl.innerHTML = ``;
            return Commands.about.execute();
        }
    },
    SDK_Ver: {
        description: 'Display Snap SDK version',
        execute: function () {
            return CORE.SnapSDK.API_SDK_VER;
        }
    },
    Runtime_Ver: {
        description: 'Display Snap Runtime version',
        execute: function () {
            return CORE.Snap.API_RUNTIME_VER;
        }
    },
    print: {
        description: 'Print a message to the terminal',
        execute: function (args) {
            return args.join(' ');
        }
    },
    runtime: {
        description: 'Display Snap Runtime Endpoint',
        execute: function () {
            const keys = Object.keys(CORE.Snap).sort();
            const count = keys.length;
            // compute padding for aligned columns
            const maxNameLen = keys.reduce((max, k) => Math.max(max, k.length), 0);
            const pad = (s, n) => s + ' '.repeat(Math.max(0, n - s.length));
            const header = `Available Runtime APIS (${count}):\n`;
            const lines = keys.map(k => {
                const desc = Commands[k] || '';
                return `<pre>${pad(k, maxNameLen + 2)}${desc}</pre>`;
            });
            return header + lines.join('\n');
        }
    },
    dev: {
        description: 'Display Snap SDK Endpoint',
        execute: function () {
            const keys = Object.keys(CORE.SnapSDK).sort();
            const count = keys.length;
            // compute padding for aligned columns
            const maxNameLen = keys.reduce((max, k) => Math.max(max, k.length), 0);
            const pad = (s, n) => s + ' '.repeat(Math.max(0, n - s.length));
            const header = `Available Runtime SDK APIS (${count}):\n`;
            const lines = keys.map(k => {
                const desc = Commands[k] || '';
                return `<pre>${pad(k, maxNameLen + 2)}${desc}</pre>`;
            });
            return header + lines.join('\n');
        }
    },
    nano: {
        description: 'Open a simple text editor (nano)',
        execute: function (args) {
            if (args.length > 0) {
                CORE.Journal.add('[edit] Opening nano editor for file: ' + args[0], 4);
                edit(args[0]);
            } else {
                CORE.Journal.add('[edit] Opening nano editor', 4);
                edit();
            }
            return 'Opened nano editor. Use Ctrl+S to save, Ctrl+O to open, Ctrl+Q to quit.';
        }
    },
    reboot: {
        description: 'Reboot the system',
        execute: function () {
            CORE.Journal.add('[System] Rebooting system...', 5);
            setTimeout(() => {
                window.location.reload();
            }, 500);
            return 'Rebooting system in 0.5 seconds...';
        }
    },
    logout: {
        description: 'Logout the current user',
        execute: function () {
            CORE.Journal.add('[System] Logging out user...', 5);
            setTimeout(() => {
                CORE.ACM.Logout();
            }, 500);
            return 'Logging out in 0.5 seconds...';
        }
    },
    pkg: {
        description: 'Package manager (list/install/remove packages)',
        execute: function (args) {
            CORE.Journal.add('[PKG] Using a experimental function', 5);
            return `Not implemented yet. Args: ${args.join(' ')}`;
        }
    },
    about: {
        description: 'Display information about Nova Core OS',
        execute: function () {
            if (typeof (TermSE) === "undefined") {
                TerminalSE();
            }
            return `
                <pre>
                      ╱|、      Nova Mint (Beta Pre-Release 1)
                    (˚ˎ 。7     Version 0.5.3 Build 57
                     |、˜〵     Copyright (C) 2025 Nova,LLC  Written with ❤
                    じしˍ,)ノ   Type "help" to see available commands.
                </pre>
                <pre>${TermSE}</pre> 
            `;
        }
    },
    coreVer: {
        description: 'Display Nova Mint version',
        execute: function () {
            return CoreVer.renderDialog();
        }
    },
    ls: {
        description: 'List files in the current directory',
        execute: function () {
            CORE.Journal.add('[System] Listing files...', 1);
            try {
                CORE.Journal.add('[System] Accessing file system...', 1);
                const FS = Object.getPrototypeOf(localStorage);
                if (typeof CORE !== 'undefined' && CORE.FS && typeof CORE.FS.listFiles === 'function') {
                    CORE.Journal.add('[System] Using CORE.FS to list files...', 1);
                    const files = CORE.FS.listFiles();
                    return `<pre>${files.length > 0 ? files.join('\n') : 'No files found.'}</pre>`;
                } else {
                    CORE.Journal.add('[System] Using localStorage to list files...', 1);
                    const files = [];
                    for (let i = 0; i < localStorage.length; i++) {
                        const key = localStorage.key(i);
                        files.push(key);
                    }
                    return `<pre>${files.length > 0 ? files.join('\n') : 'No files found in localStorage.'}</pre>`;
                }
            } catch (e) {
                CORE.Journal.add('[System] Error accessing file system: ' + (e.message || e), 2);
                return `Error accessing file system: ${e.message || e}`;
            }
        }
    },
    curl: {
        description: 'Fetch content from a URL',
        execute: async function (args) {
            if (args.length === 0) {
                return 'Usage: curl [url]';
            }
            const url = args[0];
            try {
                CORE.Journal.add('[WebView] Fetching URL: ' + url, 1);
                const response = await fetch(url);
                if (!response.ok) {
                    CORE.Journal.add('[WebView] Error fetching URL: ' + response.status + ' ' + response.statusText, 2);
                    return `Error fetching URL: ${response.status} ${response.statusText}`;
                }
                CORE.Journal.add('[WebView] Successfully fetched URL.', 1);
                const text = JSON.stringify(await response.text());
                return `<pre>${text.substring(0, 1000)}${text.length > 1000 ? '\n...[truncated]' : ''}</pre>`;
            } catch (e) {
                CORE.Journal.add('[WebView] Error fetching URL: ' + (e.message || e), 2);
                return `Error fetching URL: ${e.message || e}`;
            }
        }
    },
    cat: {
        description: 'Display the contents of a file',
        execute: function (args) {
            if (args.length === 0) {
                return 'Usage: cat [filename]';
            }
            const filename = args[0];
            try {
                CORE.Journal.add('[FS] Reading file: ' + filename, 5);
                let content = '';
                if (typeof CORE !== 'undefined' && CORE.FS && typeof CORE.FS.readFile === 'function') {
                    content = CORE.FS.readFile(filename);
                } else {
                    content = localStorage.getItem(`editor:${filename}`) || '';
                }
                return `<pre>${content}</pre>`;
            } catch (e) {
                CORE.Journal.add('[FS] Error reading file: ' + (e.message || e)), 2;
                return `Error reading file: ${e.message || e}`;
            }
        }
    },
    tail: {
        description: 'Display the last N lines of a file',
        execute: function (args) {
            if (args.length < 2) {
                return 'Usage: tail [filename] [num_lines]';
            }
            const filename = args[0];
            const numLines = parseInt(args[1], 10);
            if (isNaN(numLines) || numLines <= 0) {
                return 'Error: num_lines must be a positive integer.';
            }
            try {
                CORE.Journal.add('[FS] Reading file for tail: ' + filename, 1);
                let content = '';
                if (typeof CORE !== 'undefined' && CORE.FS && typeof CORE.FS.readFile === 'function') {
                    content = CORE.FS.readFile(filename);
                } else {
                    content = localStorage.getItem(`editor:${filename}`) || '';
                }
                const lines = content.split('\n');
                const tailLines = lines.slice(-numLines);
                return `<pre>${tailLines.join('\n')}</pre>`;
            } catch (e) {
                CORE.Journal.add('[FS] Error reading file for tail: ' + (e.message || e), 2);
                return `Error reading file: ${e.message || e}`;
            }
        }
    },
    grep: {
        description: 'Search for a pattern in a file',
        execute: function (args) {
            if (args.length < 2) {
                return 'Usage: grep [pattern] [filename]';
            }
            const pattern = args[0];
            const filename = args[1];
            try {
                CORE.Journal.add('[FS] Reading file for grep: ' + filename, 1);
                let content = '';
                if (typeof CORE !== 'undefined' && CORE.FS && typeof CORE.FS.readFile === 'function') {
                    content = CORE.FS.readFile(filename);
                } else {
                    content = localStorage.getItem(`editor:${filename}`) || '';
                }
                const lines = content.split('\n');
                const matchedLines = lines.filter(line => line.includes(pattern));
                return `<pre>${matchedLines.length > 0 ? matchedLines.join('\n') : 'No matches found.'}</pre>`;
            } catch (e) {
                CORE.Journal.add('[FS] Error reading file for grep: ' + (e.message || e), 2);
                return `Error reading file: ${e.message || e}`;
            }
        }
    },
    su: {
        description: 'Execute a command with elevated privileges',
        execute: function (args) {
            if (args.length === 0) {
                return 'Usage: sudo [command]';
            }
            const commandLine = args.join(' ');
            CORE.Journal.add('[su] executing command whith elevated privileges: ' + commandLine, 5);
            CORE.UAC.UserElevationPrompt({})
            return executeCommand(commandLine);
        }
    },
    journalctl: {
        description: 'View System Logs',
        execute: function (args) {
            return JournalView(args)
        }       
    }
}

class bashHistory {
    constructor() {
        this.history = [];
        this.currentIndex = -1;
        this.load();
    }

    add(command) {
        this.history.push(command);
        this.currentIndex = this.history.length; // Reset index
        this.save();
    }

    previous() {
        if (this.currentIndex > 0) {
            this.currentIndex--;
            return this.history[this.currentIndex];
        }
        return null;
    }

    next() {
        if (this.currentIndex < this.history.length - 1) {
            this.currentIndex++;
            return this.history[this.currentIndex];
        }
        return null;
    }
    getCurrent() {
        if (this.currentIndex >= 0 && this.currentIndex < this.history.length) {
            return this.history[this.currentIndex];
        }
        return '';
    }

    save() {
        localStorage.setItem('terminalHistory', JSON.stringify(this.history));
    }

    load() {
        const data = localStorage.getItem('terminalHistory');
        if (data) {
            this.history = JSON.parse(data);
            this.currentIndex = this.history.length;
        }
    }
}

class TermWindow extends MWDM {
    constructor(config) {
        super(config);
    }

    updateEnforcedView() {
        const o = setInterval(() => {
            try {
                TerminalSE();
            } catch(e){
                Journal.add('[Terminal]: Ilegal execption aborting',2)
                clearInterval(o);
                return 0;
            }
        }, 1000);
    }
}

const history = new bashHistory();

function Terminit() {
    const MainWindow = {
        name: 'Terminal',
        left: 470,
        top: 200,
        width: 1000,
        height: 550,
        icon: 'Assets/Beta/terminal.png'
    }

    const TermWDM = new TermWindow(MainWindow);
    TermAPI = TermWDM;
    TermWDM.updateEnforcedView();
    //TermWDM.minimizeWindow();

    CORE.Dock.addApp(MainWindow.name, MainWindow.icon, TermWDM);

    let getUser;
    CORE.SE.modFunc('NovaAccounts', 'getCurrentUser', (e) =>{
        const User = e;
        if(!User.username){
            getUser = e.usename
        } else {
            getUser = User.username
        }    
    })


    CurrentUser = `${getUser}@Core-Cloud`

    window.CORE.term = Commands;
    Terminal();
    TerminalSE();
    //TermWDM.cl
}

function TerminalSE() {
    const GetCurrentSEMode = CORE.SE.currentMode();

    if (GetCurrentSEMode === "Enforced") {
        Commands.su = {
            description: "Disabled SECore in Enforced mode",
            execute: function () {
                return "Disabled SECore in Enforced mode";
            }
        }
        Commands.pkg = {
            description: "Disabled SECore in Enforced mode",
            execute: function () {
                return "Disabled SECore in Enforced mode";
            }
        }
        Commands.runtime = {
            description: "Disabled SECore in Enforced mode",
            execute: function () {
                return "Disabled SECore in Enforced mode";
            }
        }
        Commands.dev = {
            description: "Disabled SECore in Enforced mode",
            execute: function () {
                return "Disabled SECore in Enforced mode";
            }
        }
        Commands.API_RUNTIME_VER = {
            description: "Disabled SECore in Enforced mode",
            execute: function () {
                return "Disabled SECore in Enforced mode";
            }
        }
        Commands.API_SDK_VER = {
            description: "Disabled SECore in Enforced mode",
            execute: function () {
                return "Disabled SECore in Enforced mode";
            }
        }
        TermSE = "[SECore] Security in Enforced Mode";
    } else if (typeof (CORE.SE) === "undefined") {
        TermSE = "[SECore] Security in Permissive Mode";
    } else {
        TermSE = "[SECore] Security Disabled";
    }
}

function Terminal() {
    if (typeof (TermSE) === "undefined") {
        TerminalSE();
    }

    const terminalHTML = `
        <div style="display: flex; flex-direction: column; height: 100%; color: #ffffffff; font-family: monospace; padding: 10px;">
            <div style="flex: 1; overflow-y: auto; padding: 10px; margin-bottom: 10px;" id="output">
                <pre>
                      ╱|、      Nova Mint (Beta Pre-Release 1)
                    (˚ˎ 。7     Version 0.5.3 Build 57
                     |、˜〵     Copyright (C) 2025 Nova,LLC  Written with ❤
                    じしˍ,)ノ   Type "help" to see available commands.
                </pre>
                <pre>${TermSE}</pre> 
                <pre>Logged as: ${CurrentUser}</pre>
            </div>
            <input type="text" id="input" placeholder="${CurrentUser} : Type a Command" style="color: #ffffffff; border: 1px solid #444; forgba(255, 255, 255, 1)ly: monospace;">
        </div>
    `;

    TermAPI.setContent(terminalHTML);

    const inputEl = document.getElementById('input');
    const outputEl = document.getElementById('output');

    inputEl.addEventListener('keypress', async (e) => {
        if (e.key === 'Enter') {
            const command = inputEl.value;
            outputEl.innerHTML += `<div>> ${command}</div>`;
            inputEl.value = '';
            outputEl.scrollTop = outputEl.scrollHeight;
            const result = await executeCommand(command);
            if (result) {
                outputEl.innerHTML += `<div>${result}</div>`;
                outputEl.scrollTop = outputEl.scrollHeight;
            }
        }
    });
    inputEl.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (history.history.length === 0) return;
            history.currentIndex = Math.min(history.currentIndex + 1, history.history.length - 1);
            inputEl.value = history.getCurrent();
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (history.history.length === 0) return;
            history.currentIndex = Math.max(history.currentIndex - 1, -1);
            inputEl.value = history.getCurrent();
        }
    });
}

async function executeCommand(commandLine) {
    if (!commandLine || typeof commandLine !== 'string') return '';

    // Split by && but ignore && inside quotes
    function splitByAndAnd(line) {
        const parts = [];
        let cur = '';
        let inSingle = false;
        let inDouble = false;
        for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            const next = line[i + 1];
            if (ch === "'" && !inDouble) {
                inSingle = !inSingle;
                cur += ch;
                continue;
            }
            if (ch === '"' && !inSingle) {
                inDouble = !inDouble;
                cur += ch;
                continue;
            }
            if (!inSingle && !inDouble && ch === '&' && next === '&') {
                parts.push(cur);
                cur = '';
                i++; // skip next &
                continue;
            }
            cur += ch;
        }
        parts.push(cur);
        return parts.map(p => p.trim()).filter(p => p.length > 0);
    }

    // Split a command into tokens respecting quotes and escapes
    function parseArgs(cmd) {
        const args = [];
        let cur = '';
        let inSingle = false;
        let inDouble = false;
        for (let i = 0; i < cmd.length; i++) {
            const ch = cmd[i];
            if (ch === '\\') {
                // simple escape: take next char literally
                i++;
                if (i < cmd.length) cur += cmd[i];
                continue;
            }
            if (ch === "'" && !inDouble) {
                inSingle = !inSingle;
                continue;
            }
            if (ch === '"' && !inSingle) {
                inDouble = !inDouble;
                continue;
            }
            if (!inSingle && !inDouble && /\s/.test(ch)) {
                if (cur.length) {
                    args.push(cur);
                    cur = '';
                }
                continue;
            }
            cur += ch;
        }
        if (cur.length) args.push(cur);
        return args;
    }

    const cmds = splitByAndAnd(commandLine);
    const outputs = [];

    for (let i = 0; i < cmds.length; i++) {
        const tokens = parseArgs(cmds[i]);
        if (tokens.length === 0) continue;
        const [commandName, ...args] = tokens;
        const command = Commands[commandName];

        if (command) {
            try {
                const result = await Promise.resolve(command.execute(args));
history.add([commandName, ...args].join(' '));

if (result === false || result === null || typeof result === 'undefined') {
    return result === false ? `Command "${commandName}" failed.` : '';
}

outputs.push(String(result));

            } catch (err) {
                return `Error executing "${commandName}": ${err && err.message ? err.message : err}`;
            }
        } else {
            // Attempt to run as a runtime command
            history.add(commandName);
            const runtimeResult = await runtimecommand(commandName);
            if (runtimeResult !== undefined) {
                return `<pre>${JSON.stringify(runtimeResult, null, 2)}</pre>` // Format objects/arrays
            } else {
                outputs.push(`Command "${commandName}" not found.`);
            }
        }
    }

    return outputs.join('\n');
}

function JournalView(args = []) {
    if (!Array.isArray(args)) args = [String(args || '')];
    if (args.length === 0 || (args.length === 1 && !args[0])) {
        return [
            'journalctl comandos:',
            '  journalctl list [page]          - listar entradas (pag: 1, size 25)',
            '  journalctl last <N>             - mostrar últimas N entradas (default 10)',
            '  journalctl tail <N>             - similar a last; use JournalReader para follow',
            '  journalctl follow               - abrir JournalReader en modo follow (si está disponible)',
            '  journalctl show <id>            - mostrar entrada por id',
            '  journalctl search <texto>       - buscar en mensajes/id',
            '  journalctl clear                - eliminar todas las entradas',
            '  journalctl export               - descargar todo el journal .log',
        ].join('\n');
    }

    return JournalDaemon(args);
}

function JournalDaemon(argv) {
    const sub = String(argv[0] || '').toLowerCase();

    const all = (typeof Journal !== 'undefined' && typeof Journal.getAll === 'function')
        ? Journal.getAll()
        : (Array.isArray(Journal?.entries) ? Journal.entries : []);

    const getTs = (entry) => {
        const t = entry?.timestamp;
        if (t instanceof Date) return t.getTime();
        const parsed = Date.parse(String(t || '')) ;
        return isNaN(parsed) ? Date.now() : parsed;
    };

    const extractTag = (msg) => {
        if (!msg) return '';
        const s = String(msg);
        const m = s.match(/\[([^\]]+)\]/);
        return m ? m[1] : '';
    };

    const normalizeType = (entry) => {
        if (!entry) return 'INFO';
        const t = entry.type ?? '';
        if (!t) return 'INFO';
        return String(t).replace(/\[|\]/g, '').toUpperCase();
    };

    try {
        if (sub === 'clear') {
            if (typeof Journal !== 'undefined' && typeof Journal.clear === 'function') {
                Journal.clear();
                if (typeof Journal.add === 'function') Journal.add('[journalctl] cleared journal', 4);
                return 'Journal cleared.';
            }
            return 'Error: Journal.clear() not available.';
        }

        if (sub === 'list') {
            const page = Math.max(1, parseInt(argv[1], 10) || 1);
            const pageSize = 25;
            if (!all.length) return 'Journal is empty.';
            const totalPages = Math.ceil(all.length / pageSize);
            const pageClamped = Math.min(page, totalPages);
            const start = (pageClamped - 1) * pageSize;
            const slice = all.slice(start, start + pageSize);

            const lines = slice.map(e => {
                const ts = new Date(getTs(e)).toISOString();
                const tag = extractTag(e.message) || 'log';
                const lvl = normalizeType(e);
                const preview = (typeof e.message === 'string') ? e.message.replace(/\s+/g,' ').slice(0,120) : JSON.stringify(e.message).slice(0,120);
                return `ID: ${e.id} | ${ts} | ${lvl} | ${tag} | ${preview}`;
            });

            return `<pre>Page ${pageClamped}/${totalPages}\n${lines.join('\n')}</pre>`;
        }

        if (sub === 'last' || sub === 'tail') {
            const n = Math.max(1, parseInt(argv[1], 10) || 10);
            if (!all.length) return 'Journal is empty.';
            const slice = all.slice(-n);
            const lines = slice.map(e => {
                const ts = new Date(getTs(e)).toISOString();
                const tag = extractTag(e.message) || 'log';
                const lvl = normalizeType(e);
                const preview = (typeof e.message === 'string') ? e.message : JSON.stringify(e.message);
                return `[${ts}] [${lvl}] [${tag}] ${preview}`;
            });

            if (sub === 'tail' && argv[1] === '-f') {
                return `tail -f no soportado en modo terminal. Usa 'journalctl follow' para abrir el JournalReader y seguir en vivo. Últimas ${n} entradas:\n\n<pre>${lines.join('\n\n')}</pre>`;
            }
            return `<pre>${lines.join('\n\n')}</pre>`;
        }

        if (sub === 'follow') {
            if (typeof window.JournalReader === 'function') {
                try {
                    const jr = new window.JournalReader({ attachTo: document.body, title: 'System Journal' });
                    jr.open();
                    jr.toggleTail();
                    if (typeof Journal.add === 'function') Journal.add('[journalctl] follow opened JournalReader', 3);
                    return 'JournalReader opened in follow mode.';
                } catch (e) {
                    return `Failed to open JournalReader: ${e.message || e}`;
                }
            } else {
                return "JournalReader UI not available. Include JournalReader.js to use 'journalctl follow'.";
            }
        }

        if (sub === 'show') {
            const id = argv[1];
            if (!id) return 'Usage: journalctl show <id>';
            const entry = (typeof Journal !== 'undefined' && typeof Journal.get === 'function') ? Journal.get(id) : null;
            if (!entry) return `Entry not found: ${id}`;
            const ts = new Date(getTs(entry)).toISOString();
            const lvl = normalizeType(entry);
            const tag = extractTag(entry.message) || '';
            const msg = (typeof entry.message === 'string') ? entry.message : JSON.stringify(entry.message, null, 2);
            return `<pre>id: ${entry.id}\ntimestamp: ${ts}\nlevel: ${lvl}\ntag: ${tag}\n\n${msg}</pre>`;
        }

        if (sub === 'search') {
            const term = argv.slice(1).join(' ').trim().toLowerCase();
            if (!term) return 'Usage: journalctl search <texto>';
            const matches = all.filter(e => {
                const txt = ((typeof e.message === 'string') ? e.message : JSON.stringify(e.message)).toLowerCase();
                return txt.includes(term) || String(e.id).toLowerCase().includes(term) || (String(e.type || '').toLowerCase().includes(term));
            });
            if (!matches.length) return 'No matches found.';
            const lines = matches.map(e => {
                const ts = new Date(getTs(e)).toISOString();
                const tag = extractTag(e.message) || 'log';
                const lvl = normalizeType(e);
                const preview = (typeof e.message === 'string') ? e.message.replace(/\s+/g,' ').slice(0,300) : JSON.stringify(e.message).slice(0,300);
                return `${e.id} | ${ts} | ${lvl} | ${tag}\n${preview}\n---`;
            });
            return `<pre>${lines.join('\n')}</pre>`;
        }

        if (sub === 'export') {
            if (!all.length) return 'Journal is empty.';
            const lines = all.map(e => {
                const ts = new Date(getTs(e)).toISOString();
                const lvl = normalizeType(e);
                const tag = extractTag(e.message) || '';
                const msg = (typeof e.message === 'string') ? e.message : JSON.stringify(e.message);
                return `[${ts}] [${lvl}] [${tag}] [${e.id}] ${msg}`;
            }).join('\n');

            try {
                const blob = new Blob([lines], { type: 'text/plain;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `journal_${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.log`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(url);
                if (typeof Journal.add === 'function') Journal.add('[journalctl] exported journal', 3);
                return 'Journal exported and download started.';
            } catch (e) {
                return `Export failed: ${e && e.message ? e.message : e}`;
            }
        }

        const maybeNum = parseInt(sub, 10);
        if (!isNaN(maybeNum)) {
            const n = Math.max(1, maybeNum);
            if (!all.length) return 'Journal is empty.';
            const slice = all.slice(-n);
            const lines = slice.map(e => {
                const ts = new Date(getTs(e)).toISOString();
                const lvl = normalizeType(e);
                const tag = extractTag(e.message) || 'log';
                const preview = (typeof e.message === 'string') ? e.message : JSON.stringify(e.message);
                return `[${ts}] [${lvl}] [${tag}] ${preview}`;
            });
            return `<pre>${lines.join('\n\n')}</pre>`;
        }

        return `Unknown journalctl subcommand: ${sub}\nType 'journalctl' for usage.`;

    } catch (err) {
        try { if (typeof Journal.add === 'function') Journal.add(`[journalctl] error: ${err.message || err}`, 2); } catch(e){}
        return `journalctl error: ${err.message || err}`;
    }
}

function edit(initialFilename = '', initialContent = '') {
    // Simple in-terminal text editor with basic nano-like keybindings:
    // Ctrl+S = Save, Ctrl+O = Open, Ctrl+Q = Quit
    let currentFilename = initialFilename || '';
    const editorHTML = `
        <div style="display:flex;flex-direction:column;height:100%;color:#ffffffff;font-family:monospace;padding:6px;">
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:6px;">
                <div style="font-weight:bold;">Editor ${currentFilename ? `- ${currentFilename}` : ''}</div>
                <div style="opacity:0.8;">(Ctrl+S Save • Ctrl+O Open • Ctrl+Q Quit)</div>
            </div>
            <textarea id="nova-editor" spellcheck="false" style="flex:1;width:100%;resize:none;background:#000000aa;color:#ffffffff;border:1px solid #444;padding:8px;font-family:monospace;font-size:13px;line-height:1.3;overflow:auto;"></textarea>
            <div id="nova-editor-status" style="height:24px;margin-top:6px;padding:4px 6px;background:#111;border:1px solid #333;color:#ddd;font-size:12px;">
                Ready
            </div>
        </div>
    `;
    TermAPI.setContent(editorHTML);

    const editorEl = document.getElementById('nova-editor');
    const statusEl = document.getElementById('nova-editor-status');

    // Try to load initial content if provided or if filename exists in available APIs/localStorage
    if (initialContent) {
        editorEl.value = initialContent;
    } else if (currentFilename) {
        // Prefer CORE.FS if present, otherwise localStorage
        try {
            if (typeof CORE !== 'undefined' && CORE.FS && typeof CORE.FS.readFile === 'function') {
                const txt = CORE.FS.readFile(currentFilename);
                editorEl.value = txt == null ? '' : txt;
            } else {
                editorEl.value = localStorage.getItem(`editor:${currentFilename}`) || '';
            }
        } catch (e) {
            editorEl.value = '';
        }
    } else {
        editorEl.value = '';
    }

    editorEl.focus();
    // Ensure cursor at end
    editorEl.selectionStart = editorEl.selectionEnd = editorEl.value.length;

    let statusTimer = null;
    function setStatus(msg, ttl = 3000) {
        statusEl.textContent = msg;
        if (statusTimer) clearTimeout(statusTimer);
        if (ttl > 0) {
            statusTimer = setTimeout(() => {
                statusEl.textContent = 'Ready';
                statusTimer = null;
            }, ttl);
        }
    }

    function saveAs(filename, content) {
        if (!filename) return false;
        try {
            if (typeof CORE !== 'undefined' && CORE.FS && typeof CORE.FS.writeFile === 'function') {
                CORE.FS.writeFile(filename, content);
                setStatus(`Saved to ${filename}`);
            } else {
                localStorage.setItem(`editor:${filename}`, content);
                setStatus(`Saved to localStorage as editor:${filename}`);
            }
            currentFilename = filename;
            return true;
        } catch (e) {
            setStatus(`Save failed: ${e.message || e}`, 5000);
            return false;
        }
    }

    function openFile(filename) {
        if (!filename) return false;
        try {
            let txt = '';
            if (typeof CORE !== 'undefined' && CORE.FS && typeof CORE.FS.readFile === 'function') {
                txt = CORE.FS.readFile(filename) || '';
                setStatus(`Opened ${filename}`);
            } else {
                txt = localStorage.getItem(`editor:${filename}`);
                setStatus(txt ? `Opened from localStorage: ${filename}` : `Not found: ${filename}`);
                txt = txt || '';
            }
            editorEl.value = txt;
            currentFilename = filename;
            editorEl.focus();
            editorEl.selectionStart = editorEl.selectionEnd = 0;
            return true;
        } catch (e) {
            setStatus(`Open failed: ${e.message || e}`, 5000);
            return false;
        }
    }

    function doSaveFlow() {
        const content = editorEl.value;
        if (!currentFilename) {
            const name = prompt('Save as filename:');
            if (!name) {
                setStatus('Save cancelled', 2000);
                return;
            }
            saveAs(name, content);
        } else {
            saveAs(currentFilename, content);
        }
    }

    function doOpenFlow() {
        const name = prompt('Open filename:');
        if (!name) {
            setStatus('Open cancelled', 2000);
            return;
        }
        openFile(name);
    }

    function quitEditor() {
        // Optionally warn about unsaved changes
        const unsaved = (currentFilename && (() => {
            try {
                if (typeof CORE !== 'undefined' && CORE.FS && typeof CORE.FS.readFile === 'function') {
                    return (CORE.FS.readFile(currentFilename) || '') !== editorEl.value;
                } else {
                    return (localStorage.getItem(`editor:${currentFilename}`) || '') !== editorEl.value;
                }
            } catch (e) { return true; }
        })()) || (!currentFilename && editorEl.value.length > 0);

        if (unsaved) {
            const ok = confirm('You have unsaved changes. Quit anyway?');
            if (!ok) {
                setStatus('Quit cancelled', 1500);
                return;
            }
        }
        // Restore terminal UI
        Terminal();
        setTimeout(() => {
            const out = document.getElementById('output');
            if (out) out.innerHTML += `<div>Exited editor${currentFilename ? ' (' + currentFilename + ')' : ''}</div>`;
            if (out) out.scrollTop = out.scrollHeight;
        }, 100);
    }

    // Keyboard shortcuts
    editorEl.addEventListener('keydown', (e) => {
        if (e.ctrlKey || e.metaKey) {
            const key = e.key.toLowerCase();
            if (key === 's') {
                e.preventDefault();
                doSaveFlow();
            } else if (key === 'q') {
                e.preventDefault();
                quitEditor();
            } else if (key === 'o') {
                e.preventDefault();
                doOpenFlow();
            }
        }
    });
}

function runtimecommand(command) {
    if (TermSE === "[SECore] Security in Enforced Mode - Restricted Terminal Commands") {
        return "Disabled SECore in Enforced mode";
    } else {
        return secureEvalRuntime(command);
    }
}

function secureEvalRuntime(command) {
    if (TermSE === "[SECore] Security in Enforced Mode - Restricted Terminal Commands") {
        return "Disabled SECore in Enforced mode";
    } else {
        try {
            const func = new Function(`return (async () => { 
                const result = await ${command}; 
                return result; 
            })();`);
            const promise = func();
            if (promise && typeof promise.then === 'function') {
                return promise.then(result => result).catch(e => `Runtime Error: ${e.message || e}`);
            }
            return promise;
        } catch (e) {
            return `Runtime Error: ${e.message || e}`;
        }
    }
}

class CommandManager {
    static register(name, description, execute) {
        if (typeof name !== 'string' || !name.trim()) {
            throw new Error('Command name must be a non-empty string');
        }
        if (typeof execute !== 'function') {
            throw new Error('Execute must be a function');
        }
        Commands[name] = {
            description: description || '',
            execute: execute
        };
        Journal.add(`[Terminal] Registered command: ${name}`, 5);
    }

    static unregister(name) {
        if (Commands[name]) {
            delete Commands[name];
            return true;
        }
        return false;
    }

    static getCommand(name) {
        return Commands[name] || null;
    }

    static getAllCommands() {
        return { ...Commands };
    }

    static listCommands() {
        return Object.keys(Commands).sort();
    }

    static commandExists(name) {
        return name in Commands;
    }

    static executeCommand(name, args = []) {
        const command = Commands[name];
        if (!command || typeof command.execute !== 'function') {
            return null;
        }
        return command.execute(args);
    }
}

export {
    Terminit,
    CommandManager
}