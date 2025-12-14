// Hello World App

// usar la API WDM
const CoreWindow = CORE.CORE_WDM;

// Importar Gestor de iconos (TaskbarDocker)
const iconMan = CORE.CORE_DOCK;

// Configurar Ventana
const App = {
    name: "Myapp",
    left: 500,
    top: 200,
    width: 200,
    height: 100,
    icon: "https://icons.veryicon.com/png/o/application/a1/default-application.png"
}
// Crear Contenido
const Content = '<p>Hello World!</p>'

// crear ventana y Registrar en el dock
const MyWin = new CoreWindow(App);
MyWin.minimizeWindow();

MyWin.setContent(Content)
iconMan.addApp(App.name, App.icon, MyWin);