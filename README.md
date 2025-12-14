![Nova Mint OS](https://raw.githubusercontent.com/HaruMitzuVT/Mint/refs/heads/main/docs/banner.png)

# Nova Mint OS

Proyecto experimental.

Este repositorio existe principalmente para control de versiones.
Contiene archivos internos del sistema Mint / Singapura.

No hay documentación completa.
No hay garantías.
Las cosas pueden romperse.

## Estado
Trabajo en progreso (creo).

## Uso
No usar en producción... 
a menos que seas un kamikaze o alguien que no conoce el sol.
---

## Requisitos
Instalacion de **Arch Linux (Minimal)** con las siguientes dependencias
- SSH server
- wget
- pipewire
- xorg (xorg-server, xorg-xinit.. etc)
- gtk3 

Si no quieres sacrificar tu equipo recomiendo el uso de una VM.
* [Virtualbox](https://www.virtualbox.org/)
* [VMWare](https://www.vmware.com/products/desktop-hypervisor/workstation-and-fusion)
* [KVM linux](https://linux-kvm.org/page/Main_Page)
* [QEMU](https://www.qemu.org/download/)

Descarga de **Arch Linux**
* [Arch Linux](https://archlinux.org/download/#download-mirrors)
* [Arch Liux Direct Mirror](https://mirrors.edge.kernel.org/archlinux/iso/2025.12.01/)
---

## Instalación

Compilar el contenido de [CoreOS](https://github.com/HaruMitzuVT/Mint/tree/main/CoreOs) en Electron 
```
    npm run build:linux
```
mover el compilado y darle permisos
```bash 
    #Si no tienes los directorios crealos
    mkdir -p /opt/Mint /opt/Mint/home /opt/Mint/addons /opt/MintBridge

    cp -r $WORKING_DIRECTORY/dist/linux-unpacked/* /opt/Mint/

    chmod +x /opt/Mint/singapura

    #Si eres paranoico usa esto
    chmod -R 777 /opt/Mint/
```

Compilar el contenido de [CoreServer](https://github.com/HaruMitzuVT/Mint/tree/main/CoreServer) en Bun
```
    bun build main.js --compile --target=bun-linux-x64 --outfile dist/bridge
```
mover el compilado y darle permisos
```bash 
    cp $WORKING_DIRECTORY/dist/bridge /opt/MintBridge/bridge
    chmod +x /opt/MintBridge/bridge
    chmod -R 777 /opt/MintBridge/
```
Crear el servicio del bridge
```bash 
    sudo nano /etc/systemd/system/mint.service
```
añadir esto a mint.service
```bash                                                              
[Unit]
Description=Nova Mint Bridge
After=network.target

[Service]
Type=simple
User=singapura
WorkingDirectory=/opt/Mint/home
ExecStart=/opt/MintBridge/bridge
Restart=always
RestartSec=2
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```
Registrar y activar el servicio
```bash 
    sudo systemctl reload-daemon
    sudo systemctl enable mint
    sudo systemctl start mint
```
Verificar que salio todo bien
```bash 
    sudo systemctl status mint

    # Debe salir algo como esto
● mint.service - Nova Mint Bridge
     Loaded: loaded (/etc/systemd/system/mint.service; enabled; preset: disabled)
     Active: active (running) since Sat 2025-12-13 18:55:49 CST; 51min ago
 Invocation: d72a0436b3674878939b0eb69ee707ac
   Main PID: 6312 (bridge)
      Tasks: 4 (limit: 2333)
     Memory: 31.4M (peak: 38.1M)
        CPU: 995ms
     CGroup: /system.slice/mint.service
             └─6312 /opt/MintBridge/bridge

dic 13 18:55:49 mint systemd[1]: Started Nova Mint Bridge.
dic 13 18:55:49 mint bridge[6312]: Nova Mint Services running on http://localhost:1033
dic 13 18:55:49 mint bridge[6312]: Mint User HOME   → /opt/Mint/home
dic 13 18:55:49 mint bridge[6312]: Mint System ADDONS → /opt/Mint/home/addons
 
```
Compilar el contenido de [CoreUpdater](https://github.com/HaruMitzuVT/Mint/tree/main/CoreUpdater) en Bun (Opcional)

**⚠️ Usar esto si vas a montar tu propio servidor de Actualizaciones de lo contrario solo ignoralo**

```
    bun build index.js --compile --target=bun-linux-x64 --outfile dist/updater

```
mover el compilado y darle permisos
```bash 
cp $WORKING_DIRECTORY/dist/updater /opt/updater


    chmod +x updater

    # Esto ya es experimental y no me hago responsable si llega a borrar la instalacion entera
```

## Licencia
GNU GPL v3

## Notas

* A menos que tengas una muy buena idea (NO me solicites añadir features)
* Puedes contribuir al proyecto pero añade cosas que tengan justificacion de exisir en el proyecto
* Los cambios pueden ser lentos o muy rapidos
* why Git WHY??????
* Porque sigo escribiendo esto?
* Si esto tiene errores tipograficos... ni me juzgues que no queria escribir esto en primer lugar (GitHub me obligo)
