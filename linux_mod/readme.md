![Nova Mint OS](https://raw.githubusercontent.com/HaruMitzuVT/Mint/refs/heads/main/docs/banner.png)
# Linux Mod

Este directorio existe para Ayudar a crear una "Distro" de linux basada en **Arch Linux**

---

## Contenido

### Archivos de configuración

Archivos necesarios para modificar la base del sistema.

Incluye:

- `config.jsonc`  
  Archivo de configuracion para fastfetch

- `mint.ascii`  
  Icono para fastfetch


---

### Instalacion

Primero es necesario contar ya con **Arch linux Minimal** como base.

1. hay que instalar lo siguiente (En root)
```
pacman -S fastfetch htop plymouth --noconfirm
```
2. copiamos lo siguiente a su respectiva ruta

* Config.json
```
   cp -r $WORKING_DIRECTORY/linux_mod/config.jsonc ~/config.jsonc
```
* ```mint.ascii``` (Root)
```
   cp -r $WORKING_DIRECTORY/linux_mod/mint.ascii /etc/mint.ascii
```

3. editamos ```/etc/os-release```

``` 
sudo nano /etc/os-release
# Modificamos o añadimos lo siguiente

NAME="Nova Mint"
PRETTY_NAME="Nova Mint Linux"
ID=novamint
ID_LIKE=arch # Deja esto asi o preparate para sufrir

# verifica
cat /etc/os-release

```

4. editamos ```hostname```

``` 
sudo hostnamectl set-hostname nova-mint

# verifica
lsb_release -a 
hostnamectl

```

5. editamos ```TTY```

``` 
sudo nano /etc/issue

# ingresamos
Nova Mint Linux \n \l

# En caso de usar un Display Manager eso es opcional.

```

Nota: Esto mantiene los repos oficiales de pacman. En caso de incluir tu propio repositorio hacer lo siguiente:
6. editamos ```/etc/pacman.conf```

``` 
sudo nano /etc/pacman.conf

# Agregamos al final del archivo 
# Obviamente cambia el nombre a tu repo

[myCustomRepo]
SigLevel = Optional TrustAll
Server = https://repo.myserver.org/$arch

```

Comprobacion final
```
hostnamectl
cat /etc/os-release
lsb_release -a  # si tienes lsb-release instalado

#Si todo sale bien Reinicia 

sudo reboot --now
```

---
## Configuracion de Plymouth (Opcional)

Plymouth es el encargado de hacer que el arranque se vea visualmente bonito (Si eres de eso que se desespera con tanto log en el boot esto puede que sirva)

Hay 2 maneras de configurar Plymouth
la rapida y la personalizada

primero instalemos las dependencias
```
sudo pacman -S --needed base-devel dkms

# Instalar la header correpodiente a tu kernel

# Para averiguar tu kernel ejecuta esto
uname -r

# (Kernel Stable):
sudo pacman -S linux-headers

# (Kernel LTS):
sudo pacman -S linux-lts-headers

# (Kernel Zen):
sudo pacman -S linux-zen-headers

# (Kernel Hardened):
sudo pacman -S linux-hardened-headers
```


* Configuracion rapida
```
# Primero activemos plymouth
sudo plymouth-set-default-theme -l

# Si no sabes que tema usar puedes enlistar los que estan dispónibles asi
ls /usr/share/plymouth/themes/


# Aplicar Spinner (por ejemplo)
sudo plymouth-set-default-theme spinner -R

# despues solo reinicia la maquina
sudo reboot --now
```

* Configuracion perzonalizada
```
# Primero activemos plymouth
sudo plymouth-set-default-theme -l

# Clona un tema ya existente de Plymouth
cd /usr/share/plymouth/themes
sudo cp -r spinner nova-mint
cd nova-mint

# Renombra
sudo mv spinner.plymouth nova-mint.plymouth
sudo mv spinner.script nova-mint.script

# Edita el .plymouth
[Plymouth Theme]
Name=Nova Mint
Description=Nova Mint Boot Theme
ModuleName=script

[script]
ImageDir=/usr/share/plymouth/themes/nova-mint
ScriptFile=/usr/share/plymouth/themes/nova-mint/nova-mint.script

# Edita el .script
message("Nova Mint");
logo = Image("logo.png");
sprite.SetImage(logo);

# Agrega tu imagen
sudo cp -r $WORKING_DIRECTORY/logo.png /usr/share/plymouth/themes/nova-mint/logo.png

# Aplica el tema creado
sudo plymouth-set-default-theme nova-mint -R

# despues solo reinicia la maquina
sudo reboot --now
```

---

## Notas

- Esto puede cambiar de estructura sin aviso.
- Esto no contiene ninguna garantia y puede fallar.
- Si algo no funciona, probablemente es esperado.