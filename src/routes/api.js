const express = require('express');
const router = express.Router();
const client = require('../services/whatsappClient');

router.post('/sendMessage', async (req, res) => {
    try {
        const { number, text } = req.body;
        if (!number || !text) {
            return res.status(400).json({ error: 'Missing number or text' });
        }
        const chatId = number.includes('@c.us') ? number : `${number}@c.us`;
        const response = await client.sendMessage(chatId, text);
        res.json({ success: true, messageId: response.id._serialized });
    } catch (error) {
        console.error('Error sending message via API:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
