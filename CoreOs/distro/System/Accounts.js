// Mint Accounts
import { Journal } from "./Journal.js";
import * as System from "./CloudBase.js";
import * as Snap from "../Snap/Snap.js";
import * as SnapSDK from "../Snap/SnapUX.js";
let CORE_SECURITY_POLICY = {};
let Enforcer;
// Helper DOM

// Tipos de Usuarios AccountService.RegisterlocalAccount
/*
    Administrator = {
        "session": {
            "SECore": {
                "Mode": "Disabled",
                "Security": false,
                "SEAuth": {
                    "token": ,
                    "SEAUTHORITY": ,
                    "OAuth": 
                }
            }
        }
    }

    Standard = {
        "session": {
            "SECore": {
                "Mode": "Disabled",
                "Security": true,
                "SEAuth": {
                    "token": ,
                    "SEAUTHORITY": ,
                    "OAuth": 
                }
            }
        }
    }

    Limited = {
        "session": {
            "SECore": {
                "Mode": "Enforced",
                "Security": true,
                "SEAuth": {
                    "token": ,
                    "SEAUTHORITY": ,
                    "OAuth": 
                }
            }
        }
    }
*/
const UserTypes = ['Administrator', 'Standard', 'Limited']

const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));


class AccountService{
    static OnlineSignUp =  false;
    static LocalUser = {};

    static async init(){
        AccountService.CheckLocaluserExist();
        AccountService.load();
    }

static load(){
    const data = JSON.parse(localStorage.getItem('NAccounts'));
    AccountService.LocalUser =
        data && typeof data === 'object' ? data : {};
}


    static save(){
        const Compress = JSON.stringify(AccountService.LocalUser);
        localStorage.setItem('NAccounts', Compress)
    }

    static async SignIn(data1, data2){
        AccountService.OfflineSignup(data1, data2);
    }
    
static CheckLocaluserExist(){
    const data = JSON.parse(localStorage.getItem('NAccounts'));
    if (!data || Object.keys(data).length === 0) {
        AccountService.RegisterlocalAccount();
    }
}

static async OfflineSignup(user, password){
    if (!user || !password) return;

    const hashed = await hash(password);
    const local = AccountService.LocalUser[user];

    if (!local) {
        SnapSDK.Snackbar.show({
            type: "error",
            message: "User not found"
        });
        return;
    }

    if (local.password !== hashed) {
        SnapSDK.Snackbar.show({
            type: "error",
            message: "Invalid password"
        });
        return;
    }

    AccountManager.Login({
        user: local.user,
        session: local.session
    });
    
    Snap.Scheduler.delay(() => {
        if (window.CORE?.Services) {
            CORE.Services();
        }
    }, 2000);
}

    //La razon de esta funcion es porque solo lo va usar RegisterlocalAccount y para no hacer copy paste de lo mismo 
    static UI(){
        $('.container-t').classList.toggle('hidden');
        $('.container-r').classList.toggle('hidden');
    }

    static RegisterlocalAccount(){
        $('.container-t').classList.toggle('hidden');
        $('.container-r').classList.toggle('hidden');
        $('.container-r .register').onclick = async ()=>{
            const usr = $('.container-r .usr').value;
            const passwd = $('.container-r .pwssd').value;
            const type = $('.container-r .CM-type').value; 

            const reg = new SnapSDK.Prompt({
                type: "Progress",
                title: "Nova Accounts",
                msg: "Register user...",
                Options: {
                    BarType: "infinite",
                    BarColor: "#9341ff",
                    isDynamicBar: true,
                },
            })

            reg.execute()

            Snap.Scheduler.delay(async () => {
                reg.kill();
                await AccountService.localadd(usr, passwd, type);
            }, 2000)
        }
    }

    static async localadd(user, passwd, type){
        if(!user) return;
        if(!passwd) return;
        if(!type) { type = 'Limited'};

        const Info = {
            user: {username: user, displayName: user},
            password: await hash(passwd),
            session: AccountService.ResolveType(type)
        }
        
        AccountService.LocalUser[user] = Info;
        AccountService.save();

       const reg = new SnapSDK.Prompt({
                type: "Progress",
                title: "Nova Accounts",
                msg: "Preparing Account....",
                Options: {
                    BarType: "infinite",
                    BarColor: "#9341ff",
                    isDynamicBar: true,
                },
        })

        reg.execute()

        Snap.Scheduler.delay(async () => {
            reg.kill();
            delete Info.password;
            AccountManager.Login(Info);
            AccountService.UI();
        }, 3000)        
    }

    static ResolveType(type){
        if(!type) return; 

        const AppToken = generateToken(32);
        const SystemToken = generateToken(24);
        const UserToken = generateToken(42);
        if(type === 'Administrator'){
            return {
                    "SECore": {
                        "Mode": "Disabled",
                        "Security": false,
                        "SEAuth": {
                            "token": AppToken,
                            "SEAUTHORITY": SystemToken,
                            "OAuth": UserToken
                        }
                }
            }
        }else if(type === 'Standard'){
            return {
                    "SECore": {
                        "Mode": "Disabled",
                        "Security": true,
                        "SEAuth": {
                            "token": AppToken,
                            "SEAUTHORITY": SystemToken,
                            "OAuth": UserToken
                        }
                }
            }            
        }else if(type === 'Limited'){
            return {
                    "SECore": {
                        "Mode": "Enforced",
                        "Security": true,
                        "SEAuth": {
                            "token": AppToken,
                            "SEAUTHORITY": SystemToken,
                            "OAuth": UserToken
                        }
                }
            }
        }else{
            return 'failed to create type acocunt aborting!.'
        }
    }
}


class AccountManager {
    static CurrentUser = {};

    static Login(data) {
        if(!data){
            SnapSDK.Snackbar.show({
                type: "error",
                message: "Invalid login payload",
                duration: 1000
            }); 
            return;           
        }

        $('.CM-login').classList.add('forbidden');
        AccountManager.CurrentUser = {
            User: data['user'],
            Sign: data['session']
        }
        AccountManager.SecurePayload(data);

        const loading = new SnapSDK.Prompt({
            type: "Progress",
            title: "Nova Accounts",
            msg: "Sign In....",
            Options: {
                BarType: "infinite",
                BarColor: "#9341ff",
                isDynamicBar: true,
            },
        })

        loading.execute()

        Snap.Scheduler.delay(() => {
            loading.kill()
            $('.CM-login').classList.toggle('hidden');
            $('.desktop').classList.toggle('hidden');
            $('.user').textContent = AccountManager.CurrentUser.User.displayName;
        }, 4500)
    }

    static SecurePayload(data){
        if(!data) return;

        CORE_SECURITY_POLICY = {
            EnableSE: data['session']['SECore']['Security'],
            SEMode: data['session']['SECore']['Mode'], // "permissive" or "enforcing"
            policies: new Map(),
            auditLog: [],
            key: data['session']['SECore']['SEAuth']
        }
        CORE_SECURITY_POLICY = Object.freeze({
            EnableSE: data.session.SECore.Security,
            SEMode: data.session.SECore.Mode,
            policies: Object.freeze(new Map()),
            auditLog: Object.freeze([]),
            key: Object.freeze(data.session.SECore.SEAuth)
        });

        Enforcer = new System.SECore(CORE_SECURITY_POLICY);
        Enforcer.initialize(CORE_SECURITY_POLICY.EnableSE, CORE_SECURITY_POLICY.SEMode);
    }

    static Logout() {
        AccountManager.CurrentUser = {}
        $('.CM-login').classList.remove('forbidden');
        $('.CM-login').classList.toggle('hidden');
        $('.desktop').classList.toggle('hidden');
        $('.user').textContent = '';
        SnapSDK.Snackbar.show({
            type: "info",
            message: "Signed out",
            duration: 1000
        });
    }

    static getCurrentUser(){
        return AccountManager.CurrentUser.User;
    }
}



class Userinit {
    static getCurrentUser() {
        if (isEmpty(AccountManager.CurrentUser)) {
            return {
                user: null,
                token: null,
                session: null,
                username: ''
            };
        } else {
            return AccountManager.CurrentUser;
        }
    }

    static UserElevationPrompt(AppExec) {
        if (isEmpty(AccountManager.CurrentUser)) {
            return '[UAC] No user logged in';
        }

        if (isEmpty(AppExec)) {
            const Dialog = new SnapSDK.DialogBox({
                title: "User Accounts",
                content: "Ilegal Execption running 'UserElevationPrompt'",
                type: "error",
                handlers: {
                    DB_1: (action) => console.log(action),
                },
                labels: {
                    DB_1: "Ok",
                },
                allowOverlayCancel: false
            });
            return 0;
        }

        const Elevation = AppExec.prompt || 'legacy';

        if (Elevation === 'legacy') {
            UAC.LegacyElevationPrompt(AppExec);
        } else if (Elevation === 'current') {
            UAC.ElevationPrompt(AppExec);
        } else {
            const Dialog = new SnapSDK.DialogBox({
                title: "User Accounts",
                content: "Ilegal Execption running 'UserElevationPrompt'",
                type: "error",
                handlers: {
                    DB_1: (action) => console.log(action),
                },
                labels: {
                    DB_1: "Ok",
                },
                allowOverlayCancel: false
            });
        }
    }
}

// Control de cuentas de usuario (Solo ara aplicaiones que lo requieran)
class UAC {
    static LegacyElevationPrompt(Sign) {
        if (!Sign) {
            throw new Error("[UAC] Invalid or Empty Context!")
        }

        const SandboxElevation = [];
        let SanboxID = new System.UniqueGen();
        //Expected Method { auth = null, cert = "", icon = "", appName = "App", publisher = "Publisher", origin = "Origin", callback = null }     
        SandboxElevation[SanboxID] = new SnapSDK.ConsentComponent({
            auth: Sign.auth,
            cert: Sign.appSign,
            icon: Sign.icon,
            appName: Sign.appName,
            publisher: Sign.dev,
            origin: Sign.compact,
            callback: Sign.callback
        });
        SandboxElevation[SanboxID].open();
    }
    static ElevationPrompt(Sign) {
        if (!Sign) {
            throw new Error("[UAC] Invalid or Empty Context!")
        }

        const SandboxElevation = [];
        let SanboxID = new System.UniqueGen();
        //Expected Method { auth = null, cert = "", icon = "", appName = "App", publisher = "Publisher", origin = "Origin", callback = null }     
        SandboxElevation[SanboxID] = new SnapSDK.Authorize({
            appName: Sign.appName,
            appLogo: Sign.logo,
            permissions: Sign.permissions,
            onAccept: Sign.done,
            onDeny: Sign.deny
        });
        SandboxElevation[SanboxID].open();
    }
}

function isEmpty(obj) {
    if (!obj || typeof obj !== 'object') return true;
    return Object.keys(obj).length === 0;
}


function generateToken(n) {
    var chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    var token = '';
    for(var i = 0; i < n; i++) {
        token += chars[Math.floor(Math.random() * chars.length)];
    }
    return token;
}

async function hash(password) {
  const enc = new TextEncoder().encode(password);
  const buf = await crypto.subtle.digest('SHA-512', enc);
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function isServerAlive(url) {
  return fetch(url, { method: 'HEAD', mode: 'no-cors' })
    .then(() => true) // Server responded with anything
    .catch(() => false); // Network error, server is offline
}

async function XServe(URI, BODY) {
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

export { AccountManager, UAC, Userinit, AccountService}