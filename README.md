![Nova Mint OS](https://raw.githubusercontent.com/Mittu-dev/Mint/main/docs/banner.png)

# Mint Shell

Proyecto experimental.

Este repositorio existe principalmente para control de versiones.
Contiene archivos internos del sistema Mint.

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
* [Arch Linux Direct Mirror](https://mirrors.edge.kernel.org/archlinux/iso/2025.12.01/)
---

## Instalación
Nota: Se asume que existe un usuario llamado ```mint``` de lo contrario usar el que tengas establecido en tu instalacion.

Compilar el contenido de [CoreOS](https://github.com/Mittu-dev/Mint/tree/main/MintShell) en Electron 
```
    npm run build:linux
```
mover el compilado y darle permisos
```bash 
    #Si no tienes los directorios crealos
    mkdir -p /opt/Mint /opt/Mint/home /opt/Mint/addons /opt/MintBridge
    chown mint:mint -R /opt/Mint

    cp -r $WORKING_DIRECTORY/dist/linux-unpacked/* /opt/Mint/

    chmod +x /opt/Mint/mint
```

Compilar el contenido de [CoreServer](https://github.com/Mittu-dev/Mint/tree/main/MintBridge) en Bun
```
    bun build main.js --compile --target=bun-linux-x64 --outfile dist/bridge
```
mover el compilado y darle permisos
```bash 
    cp $WORKING_DIRECTORY/dist/bridge /opt/MintBridge/bridge
    chown -R mint:mint /opt/MintBridge
    chmod +x /opt/MintBridge/bridge
```
Crear el servicio del bridge
```bash 
    sudo nano /etc/systemd/system/mint.service
```
añadir esto a mint.service
```bash                                                              
[Unit]
Description= Mint Bridge
After=network.target

[Service]
Type=simple
User=mint
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
    sudo systemctl daemon-reload
    sudo systemctl enable mint
    sudo systemctl start mint
```
Verificar que salio todo bien
```bash 
    sudo systemctl status mint

    # Debe salir algo como esto
● mint.service - Mint Bridge
     Loaded: loaded (/etc/systemd/system/mint.service; enabled; preset: disabled)
     Active: active (running) since Sat 2025-12-13 18:55:49 CST; 51min ago
 Invocation: d72a0436b3674878939b0eb69ee707ac
   Main PID: 6312 (bridge)
      Tasks: 4 (limit: 2333)
     Memory: 31.4M (peak: 38.1M)
        CPU: 995ms
     CGroup: /system.slice/mint.service
             └─6312 /opt/MintBridge/bridge

dic 13 18:55:49 mint systemd[1]: Started Mint Bridge.
dic 13 18:55:49 mint bridge[6312]: Mint Bridge Server running on http://localhost:1033
dic 13 18:55:49 mint bridge[6312]: Mint User HOME   → /opt/Mint/home
dic 13 18:55:49 mint bridge[6312]: Mint System ADDONS → /opt/Mint/home/addons
 
```

## Licencia
Apache-2.0 license [View here](https://www.apache.org/licenses/LICENSE-2.0.txt)

## Notas

* A menos que tengas una muy buena idea (NO me solicites añadir features)
* Puedes contribuir al proyecto pero añade cosas que tengan justificacion de exisir en el proyecto
* Los cambios pueden ser lentos o muy rapidos
* why Git WHY??????
* Porque sigo escribiendo esto?
* Si esto tiene errores tipograficos... ni me juzgues que no queria escribir esto en primer lugar (GitHub me obligo)

## Screenshots
![Login Screen](https://raw.githubusercontent.com/Mittu-dev/Mint/main/docs/screenshots/Mint_Login.png)
![Desktop](https://raw.githubusercontent.com/Mittu-dev/Mint/main/docs/screenshots/Mint_Desktop.png)
![Desktop with Terminal](https://raw.githubusercontent.com/Mittu-dev/Mint/main/docs/screenshots/Mint_terminal.png)

