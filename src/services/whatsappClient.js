const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const client = new Client({
    authStrategy: new LocalAuth({ dataPath: './session' }),
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    },
});

// Log QR code so you only need to scan once
client.on('qr', (qr) => {
    console.log('QR Code received, scan to authenticate:');
    qrcode.generate(qr, { small: true });
});

client.on('authenticated', () => {
    console.log('Client is authenticated');
});

client.on('auth_failure', (msg) => {
    console.error('Authentication failure:', msg);
});

client.on('ready', () => {
    console.log('WhatsApp client is ready');
    // Optional: catch Puppeteer errors
    if (client.pupPage) {
        client.pupPage.on('pageerror', (err) =>
            console.error('Page error:', err.toString())
        );
        client.pupPage.on('error', (err) =>
            console.error('Page error:', err.toString())
        );
    }
});

client.initialize();

module.exports = client;

require('../controllers/messageController');

