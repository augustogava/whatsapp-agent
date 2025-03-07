// curl -X POST "http://localhost:3000/webhook" -H "Content-Type: application/json"  -d '{"number": "5511940779540", "message": "Gay 2"}'

const functions = require('firebase-functions');
const express = require('express');
const app = express();

// Middleware to parse JSON bodies
app.use(express.json());

app.get('/', (req, res) => {
    res.status(200).send({data: "Gay" });
});

app.post('/send', async (req, res) => {
    const { number, message } = req.body;

    // Validate that both number and message are provided
    if (!number || !message) {
        return res.status(400).send('Please include both "number" and "message" in the request body.');
    }

    try {
        // Format the number: ensure it ends with '@c.us'
        const formattedNumber = number.includes('@c.us') ? number : `${number}@c.us`;

        // Send the message using WhatsApp client
        const response = await client.sendMessage(formattedNumber, message);
        res.status(200).send(`Message sent successfully: ${response.id._serialized}`);
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).send('Error sending message.');
    }
});

exports.app = functions.https.onRequest(app);

// Start the Express server
// app.listen(port, () => {
//     console.log(`Webhook server listening on port ${port}`);
// });
