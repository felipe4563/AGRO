const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

console.log('🔧 Inicializando WhatsApp Web.js...');

// Crear cliente con configuración mejorada
const client = new Client({
    authStrategy: new LocalAuth({
        clientId: "whatsapp-client",
        //para windows
        dataPath: "C:\\Users\\ASUS\\OneDrive\\Escritorio\\SISTEMAS\\SIS-COOP\\backend\\watsap\\wwebjs_sessions",
        //para linux
        //dataPath: "/home/ubuntu/SISTEMAS/SIS-COOP/backend/watsap/wwebjs_sessions"

    }),
    puppeteer: {
        //para windows
        executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        //para linux
        //executablePath: '/usr/bin/google-chrome',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--disable-gpu',
            '--headless=new'
        ]
    }
});

// Evento QR - CON MÁS DETALLES
client.on('qr', (qr) => {
    console.log('🔄 QR RECIBIDO - Escanea este código en WhatsApp:');
    console.log('⏰ Tienes 30 segundos para escanear...');
    qrcode.generate(qr, { small: true });
    console.log('📱 Ve a WhatsApp → Menú de 3 puntos → Dispositivos vinculados → Vincular un dispositivo');
});

// Evento de autenticación exitosa
client.on('authenticated', () => {
    console.log('✅ AUTENTICACIÓN EXITOSA - Sesión guardada');
});

// Evento listo
client.on('ready', () => {
    console.log('🚀 WHATSAPP WEB CONECTADO Y LISTO');
    console.log('👤 Usuario:', client.info?.pushname);
});

// Evento de cambio de estado
client.on('change_state', state => {
    console.log('📱 Cambio de estado:', state);
});

// Manejo de errores MEJORADO
client.on('auth_failure', msg => {
    console.error('❌ FALLO DE AUTENTICACIÓN:', msg);
});

client.on('disconnected', (reason) => {
    console.log('🔌 DESCONECTADO:', reason);
    console.log('🔄 Reconectando en 10 segundos...');
    setTimeout(() => {
        client.initialize();
    }, 10000);
});

// Inicializar con manejo de errores
console.log('🚀 Inicializando cliente de WhatsApp...');
client.initialize().then(() => {
    console.log('✅ Cliente de WhatsApp inicializado');
}).catch(error => {
    console.error('❌ ERROR al inicializar WhatsApp:', error);
});

// Función para verificar estado
const getWhatsAppStatus = () => {
    return {
        isReady: !!client.info,
        state: client.info ? 'connected' : 'disconnected'
    };
};

// Función para formatear número boliviano
function formatPhoneNumber(numero) {
    if (!numero) return null;
    numero = numero.replace(/\D/g, '');
    if (numero.startsWith('591')) return `+${numero}`;
    if (numero.startsWith('0')) return `+591${numero.slice(1)}`;
    return `+591${numero}`;
}

// Función para enviar mensaje
const sendWhatsApp = async (numero, mensaje, imagePath = null) => {
    if (!client.info) {
        console.log('⏳ Esperando que WhatsApp esté listo...');
        await new Promise(resolve => client.once('ready', resolve));
    }
    
    const chatId = formatPhoneNumber(numero).replace('+', '') + '@c.us';

    try {
        if (imagePath) {
            const media = MessageMedia.fromFilePath(imagePath);
            await client.sendMessage(chatId, media, { caption: mensaje });
        } else {
            await client.sendMessage(chatId, mensaje);
        }
        console.log('✅ Mensaje enviado a', numero);
        return true;
    } catch (error) {
        console.error('❌ Error enviando WhatsApp:', error);
        throw error;
    }
};

// Exportar con función de estado
module.exports = { 
    client, 
    sendWhatsApp, 
    getWhatsAppStatus 
};
