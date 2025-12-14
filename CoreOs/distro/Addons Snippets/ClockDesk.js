// Hello World App

// usar la API WDM
const CoreWindow = CORE.CORE_WDM;

// Importar Gestor de iconos (TaskbarDocker)
const iconMan = CORE.CORE_DOCK;

// usar Snap 
const SnapUI = CORE.Snap;

// Configurar Ventana
const App = {
    name: "ClockDesk",
    left: 500,
    top: 200,
    width: 400,
    height: 400,
    icon: "https://icons.veryicon.com/png/o/application/a1/default-application.png"
}
// Crear Contenido
const Content = '<p class="headerclock" style="font-size: 8em;position: absolute;inset: 0;margin: auto;width: fit-content;height: fit-content;"></p>'

// crear ventana y Registrar en el dock
const MyWin = new CoreWindow(App);



MyWin.minimizeWindow();

MyWin.setContent(Content)
iconMan.addApp(App.name, App.icon, MyWin);

function TimeUI(){
    const CurrentTime = SnapUI.DateTime.Clock('12H');
    document.querySelector('.headerclock').textContent = CurrentTime;
}

function init() {
   SnapUI.Scheduler.loop(()=>{
    TimeUI();
   }, 1000)
}
init();