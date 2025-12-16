// Import Modules
import * as Snap from "../Snap/Snap.js";
import * as SnapSDK from "../Snap/SnapUX.js";
import * as System from "./CloudBase.js";
import { AccountManager, UAC, Userinit, AccountService } from "./Accounts.js";
import { Journal } from "./Journal.js";
import { SPL } from "./PKG.js";
import { Mixer, MixerUI } from "./Mixer.js";
import { FileSystem } from "./Filesystem.js";



// Helper DOM
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));

// Configuración de endpoints (placeholders / dev)


// System Wire
let CORE_DOCK = new System.Dock();
let CORE_WDM = System.WDM;
let Network = new System.NetworkManager((e)=>{Service(e) });
let SystemPanic = System.KernelPanic;
let SE = {};
let Enforcer;
let CORE_SECURITY_POLICY = {};
let SECloud;
let MixerTray;

// Apis Publicas "window.CORE"
let CS_API = {
    CORE_DOCK,
    CORE_WDM,
    Snap,
    SnapSDK,
    Journal,
    Network,
    MixerTray,
    Mixer,
    Services,
    AccountService,
    Storage
};

// Helpers
let CM_User = $('.usr');
let CM_Passwd = $('.pwssd');
let CM_Sign = $('.sign');


function Service(d){
    if(d.isOnline){
        $('.network').innerHTML = 'signal_wifi_4_bar';
        $('.network').title = 'Connected to internet';
    }else{
        $('.network').innerHTML = 'signal_wifi_bad';
        $('.network').title = 'Disconnected to internet';
    }
}

// Gestion de cuenta de Usuario

// Boot
async function Fastboot() {
    try {
        Journal.add('[BOOT] Loading kernel', 1);
            window.CORE = CS_API;            
            await Boot();
    } catch (error) {
        SystemPanic.trigger('BOOT_FATAL');
        Journal.add(`[BOOT] Fatal error: ${error.message}`, 2);
        showErrorDialog("System", "An unexpected error occurred during boot.");
    }
}
async function Boot() {
    try {
        Journal.add('[System] Loading Services', 1);
        
        $('.background').style.backgroundImage = `url("Assets/default.jpg")`;
        AccountService.init();
        $('.CM-login').style.opacity = '1';
        $('.CM-login').style.pointerEvents = 'unset';
        $('.CM-login').classList.add('animate-zoomIn');
        attachLoginHandlers();
        SECloud = new SecurityModule(CORE_SECURITY_POLICY);
        SECloud.Bind(UAC, 'uac');
        SECloud.Bind(Userinit, 'Users');
        SECloud.Bind(AccountManager, 'NovaAccounts');
        Storage = new FileSystem();
        await Storage.init();
    } catch (error) {
        SystemPanic.trigger('SERVICE_LOAD_FAIL');
        Journal.add(`[System] Boot error: ${error.message}`, 2);
        showErrorDialog("System", "Failed to initialize system services.");
    }
}

function attachLoginHandlers() {
    CM_Sign.addEventListener('click', async () => {
        try {
            let username = CM_User.value;
            let password = CM_Passwd.value;

            if (!username || !password) {
                SnapSDK.Snackbar.show({
                    type: "warning",
                    message: "Please enter credentials"
                });
                return;
            }else{
                await AccountService.SignIn(username, password);
            }

        } catch (error) {
            Journal.add(`[Login] Error: ${error.message}`, 2);
        }
    });

    $('.CM-logout').addEventListener('click', () => {
        $('.CM-login').classList.toggle('forbidden');
        AccountManager.Logout();
    });

    $('.restart').onclick = ()=>{ window.location.reload() };
    $('.shutdown').onclick = ()=>{ window.close() };
}


async function Services() {
    try {
        const mx = document.querySelector('.mixer-dock');
        MixerTray = new MixerUI({
            root: mx
        });
        Snap.Scheduler.loop(()=>{ ClockTik() }, 1000)
        await SPL();
        Journal.add('[System] Loaded Services', 1);
        Journal.load();
    } catch (error) {
        Journal.add(`[Services] Error: ${error.message}`, 2);
        console.error(error)
    }
}

function showErrorDialog(title, content) {
    new SnapSDK.DialogBox({
        title,
        content,
        type: "error",
        handlers: {
            DB_1: (action) => console.log(action),
        },
        labels: {
            DB_1: "Ok"
        },
        allowOverlayCancel: false
    });
}

//Other Services & Modules
function ClockTik() {
    let CurrentTime = Snap.DateTime.Clock('12');

    $('.clock').textContent = CurrentTime;
}

async function Server(URI) {
    try {
        const {
            data,
            meta
        } = await Snap.Fetch.fetchJson(URI, {
            timeoutMs: 7000,
            retries: 0,
            allowProxy: false,
            useRequestId: false
        });
        //console.log(data)
        return data.results ?? data; // según la API
    } catch (err) {
        console.error("Server Error:", err);
        return null;
    }
}
async function ServerPOST(URI, BODY) {
    return new Promise((resolve, reject) => {
        let xhr = new XMLHttpRequest();
        xhr.open('POST', URI, true); // ⚠️ Usa URI, no CORE_API_LOGIN
        xhr.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');

        xhr.onload = function() {
            if (xhr.status === 201 || xhr.status === 200) {
                resolve(JSON.parse(xhr.response)); // ✅
            } else {
                SnapSDK.Snackbar.show({
                    type: "error",
                    message: "invalid credentials"
                });
                reject(new Error('Request failed'));
            }
        };

        xhr.onerror = function() {
            reject(new Error('Network error'));
        };

        xhr.send(JSON.stringify(BODY));
    });
}

function isEmpty(obj) {
    for (const prop in obj) {
        if (Object.hasOwn(obj, prop)) {
            return false;
        }
    }

    return true;
}

// Modulo de seguridad Secure Core (SECore)
class SecurityModule {
    constructor(frozenPolicy) {
        if (!frozenPolicy) {
            throw new Error('[SECore] Missing security policy');
        }

        // 📜 Política INMUTABLE (solo lectura)
        this.Policy = frozenPolicy;

        // 🧬 Contexto MUTABLE (runtime)
        this.Context = {
            EnableSE: frozenPolicy.EnableSE,
            SEMode: frozenPolicy.SEMode,
            keystore: { ...frozenPolicy.key }, // copia segura
            bindings: new Map()
        };

        this.#init();
    }

    // -------------------------------------------------
    // Init runtime
    // -------------------------------------------------
    #init() {
        if (this.Context.SEMode === 'Enforced') {
            Journal.add('[SECore] Enforced mode enabled', 90);
            CORE.Kernel = '[SECore] Kernel access restricted';
        } else {
            Journal.add('[SECore] Permissive mode enabled', 90);
            CORE.Kernel = System;
        }

        // 🌐 API pública de seguridad
        CORE.SE = {
            currentMode: () => this.getCurrentMode(),
            bindedKernel: () => this.isEnabled(),
            getToken: (t) => this.getToken(t),
            bind: (m, n) => this.bindModule(m, n),
            modFunc: (n, f, c) => this.callModuleFunction(n, f, c)
        };
    }

    // -------------------------------------------------
    // Getters
    // -------------------------------------------------
    getCurrentMode() {
        return this.Context.SEMode;
    }

    isEnabled() {
        return this.Context.EnableSE;
    }

    // -------------------------------------------------
    // Token access (controlled)
    // -------------------------------------------------
    getToken(type) {
        const ks = this.Context.keystore;
        if (!ks) return null;

        if (type === 'user') return ks.OAuth;
        if (type === 'app') return ks.token;

        if (type === 'system') {
            if (this.Context.SEMode === 'Enforced') {
                return null;
            }
            return ks.SEAUTHORITY;
        }

        return null;
    }

    // -------------------------------------------------
    // Module binding
    // -------------------------------------------------
    bindModule(module, name) {
        if (!module || !name) return false;
        this.Context.bindings.set(name, module);
        Journal.add(`[SEEnv] Module bound: ${name}`, 1);
        return true;
    }

    // Alias legacy (compatibilidad)
    Bind(module, name) {
        return this.bindModule(module, name);
    }


    // -------------------------------------------------
    // Controlled function execution
    // -------------------------------------------------
    callModuleFunction(name, func, callback) {
        const sandbox = this.Context.bindings.get(name);
        if (!sandbox) return callback?.(undefined);

        const method = sandbox[func];
        if (typeof method !== 'function') {
            return callback?.(undefined);
        }

        try {
            const result = method.call(sandbox);
            callback?.(result);
        } catch (err) {
            Journal.add(`[SEEnv] Execution error: ${err.message}`, 2);
            callback?.(undefined);
        }
    }
}

window.onload = () => {
    Journal.load();
    Journal.add('[Boot] Starting Cloud System', 1);
    Network.initNetwork();
    Fastboot();
}