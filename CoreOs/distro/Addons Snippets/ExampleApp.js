// Singapura Create App

// importar WDM del base 
import { WDM } from '..CloudBase.js';

// o usar de la API si no se haran WDM Custom
const CoreWindow = CORE.CORE_WDM;

// Importar Gestor de iconos (TaskbarDocker)
const iconMan = CORE.CORE_DOCK;

// Configurar Ventana
const WindowSettings = {
    name: "Myapp",
    left: 500,
    top: 200,
    width: 854,
    height: 480,
    icon: //path to icon (png or svg)
}

// crear ventana y Registrar en el dock
const MyWin = new CoreWindow(WindowSettings);
iconMan.addApp(WindowSettings.name, WindowSettings.icon, MyWin);

// Endpoints de la Api (CORE)

CORE_WDM // Getsor de ventanas
CORE_DOCK // gestor de iconos de la barra de tareas
CORE_WALLPAPER // Fondo actual
Snap // UI Kit (Snap)
SnapSDK // UI SDK Kit (Snap)
Journal // Registros
Network // Accesso a la red
SE // Opciones de seguridad (SECore)
Kernel // Acceso al Kernel (Cloudbase) (Si SECore esta en Enforced y true este endpoint estara desactivado)
