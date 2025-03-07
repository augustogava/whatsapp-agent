const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

let pairingCodeRequested = true;
let cell = '5511954859333';

const client = new Client({
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    }
});

// client.on('ready', () => {
//     console.log('Client is ready!');
// });

client.on('qr', qr => {
    qrcode.generate(qr, {small: true});
});

client.on('message_create', message => {
    if (message.body === '!ping') {
        client.sendMessage(message.from, 'pong');
    }
});


client.on('qr', async (qr) => {
    console.log('QR RECEIVED', qr);

    // paiuting code example
    const pairingCodeEnabled = false;
    if (pairingCodeEnabled && !pairingCodeRequested) {
        const pairingCode = await client.requestPairingCode(cell);
        qrcode.generate(qr, {small: true});
        console.log('Pairing code enabled, code: '+ pairingCode);
        pairingCodeRequested = true;
    }
});

client.on('authenticated', () => {
    console.log('AUTHENTICATED');
});

client.on('auth_failure', msg => {
    // Fired if session restore was unsuccessful
    console.error('AUTHENTICATION FAILURE', msg);
});

client.on('ready', async () => {
    console.log('READY');
    // const debugWWebVersion = await client.getWWebVersion();
    // console.log(`WWebVersion = ${debugWWebVersion}`);
    const number = '5511954859333@c.us';
    const text = 'gay!';

    try {
        const response = await client.sendMessage(number, text);
        console.log('Message sent!', response.id._serialized);
    } catch (error) {
        console.error('Could not send message:', error);
    }


    client.pupPage.on('pageerror', function(err) {
        console.log('Page error: ' + err.toString());
    });
    client.pupPage.on('error', function(err) {
        console.log('Page error: ' + err.toString());
    });

});


client.initialize();
