# Mint Bridge – API Reference

Bridge headless que conecta la PWA con el sistema Linux (Arch-based),
ejecutándose en modo appliance dentro de una VM.

- Runtime: Node.js
- Comunicación: HTTP (JSON)
- Scope FS: `/opt/${PWA}/home`
- UI: PWA (única consumidora)
- Trust model: Appliance / Kiosk

---

## Base URL

```
http://<host>:1033
```

---

## System API

### GET /system/info
Devuelve información estática del sistema.

**Uso**
- About
- Diagnóstico
- Logs

**Response**
```json
{
  "os": "Arch Linux",
  "kernel": "6.12.59-lts",
  "arch": "x64",
  "cpu": "Celeron N3060",
  "memory": 3828,
  "hostname": "mint",
  "user": "mint"
}
```

---

### GET /system/status
Estado dinámico del sistema en tiempo real.

**Uso**
- Dashboard
- Health monitor
- Tray indicators

**Response**
```json
{
  "cpu": {
    "load": 7.67,
    "cores": 2
  },
  "memory": {
    "used": 2716,
    "total": 3828
  },
  "disk": {
    "used": 37.1,
    "total": 108
  },
  "uptime": 1920.92,
  "bridge": {
    "pid": 1777,
    "uptime": 54
  }
}
```

---

### GET /health
Health check simple del bridge.

**Response**
```json
{
  "ok": true,
  "uptime": 1234.56
}
```

---

## File System API (Sandboxed)

> Acceso TOTAL de lectura/escritura  
> **Limitado estrictamente a:**  
> `/opt/${PWA}/home`

---

### GET /fs/list
Lista el contenido de un directorio.

**Query**
```
?dir=<relative-path>
```

**Ejemplo**
```
/fs/list?dir=addons
```

**Response**
```json
["addons", "projects", "config.json"]
```

---

### POST /fs/read
Lee un archivo de texto.

**Body**
```json
{
  "path": "config.json"
}
```

---

### POST /fs/write
Escribe o sobrescribe un archivo.

**Body**
```json
{
  "path": "config.json",
  "content": "{ \"theme\": \"dark\" }"
}
```

---

### POST /fs/delete
Elimina archivo o directorio.

**Body**
```json
{
  "path": "addons/example-addon"
}
```

---

## Command Profiles API

> La PWA **NO ejecuta comandos arbitrarios**  
> La PWA solicita **perfiles declarativos**  
> El bridge decide cómo se ejecutan

---

### POST /cmd/run

**Body**
```json
{
  "profile": "system:update"
}
```

**Response**
```json
{
  "stdout": "...",
  "stderr": "",
  "code": 0
}
```

---

### Command Profiles Disponibles

| Profile | Descripción |
|-------|------------|
| `system:update` | Actualiza el sistema (`pacman -Syu`) |
| `system:install` | Instala paquetes del sistema |
| `system:remove` | Elimina paquetes del sistema |

---

### Ejemplo con argumentos dinámicos

```json
{
  "profile": "system:install",
  "args": ["htop"]
}
```

---

## PKG Manager – PWA Addons

Los addons viven en:
```
/opt/${PWA}/home/addons
```

Cada addon es una carpeta (git repo, paquete, etc).

---

### POST /pkg/install
Instala un addon (git clone).

**Body**
```json
{
  "name": "my-addon",
  "repo": "https://github.com/user/my-addon.git"
}
```

---

### GET /pkg/load
Lista addons instalados.

**Response**
```json
[
  "music-addon",
  "terminal-addon",
  "settings-addon"
]
```

---

### POST /pkg/update
Actualiza un addon existente.

**Body**
```json
{
  "name": "music-addon"
}
```

---

### POST /pkg/uninstall
Elimina un addon.

**Body**
```json
{
  "name": "music-addon"
}
```

---

## Seguridad y Modelo de Confianza

- No hay usuarios externos
- No hay auth pública
- La PWA es la única consumidora
- El bridge NO expone shell libre
- El FS está sandboxed
- `pacman` se ejecuta vía sudoers controlado
- No se permite escape de `/opt/${PWA}/home`

Diseñado para entornos **appliance / OS-like**.

---

## Estados y Errores

```json
{
  "error": "Description"
}
```

---

## Notas Finales

- Single-file runtime
- Headless
- Compatible con systemd
- Pensado para boot automático
- UI completamente desacoplada
