const express = require('express');
const router = express.Router();
const client = require('../services/whatsappClient');
const messageController = require('../controllers/messageController');

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

router.post('/command', async (req, res) => {
    try {
        const { number, command } = req.body;
        
        if (!number || !command) {
            return res.status(400).json({ error: 'Missing number or command' });
        }
        
        const chatId = number.includes('@c.us') ? number : `${number}@c.us`;
        
        const mockMsg = {
            from: chatId,
            body: command,
            id: {
                _serialized: `API_REQUEST_${Date.now()}`
            },
            reply: async (text) => {
                await client.sendMessage(chatId, text);
                return { id: { _serialized: `API_REPLY_${Date.now()}` } };
            }
        };
        
        const result = await messageController.processCommand(command, mockMsg, false);
        
        res.json({ 
            success: true, 
            message: 'Command processed successfully',
            result
        });
    } catch (error) {
        console.error('Error processing command via API:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/status', (req, res) => {
    try {
        const info = client.info || {};
        const status = {
            connected: !!client.info,
            user: info.wid ? info.wid.user : null,
            pushname: info.pushname || null,
            platform: info.platform || null
        };
        
        res.json(status);
    } catch (error) {
        console.error('Error getting status:', error);
        res.status(500).json({ error: error.message });
    }
});

router.post('/ai-webhook', async (req, res) => {
    try {
        const { number, message, command, context } = req.body;
        
        if (command) {
            // Execute a specific command based on AI's decision
            await messageController.processCommand(command, mockMsg(number), false);
        } else if (message) {
            // Send regular message from AI
            await client.sendMessage(formatNumber(number), message);
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('AI webhook error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

function formatNumber(number) {
    return number.includes('@c.us') ? number : `${number}@c.us`;
}

function mockMsg(number) {
    const chatId = formatNumber(number);
    return {
        from: chatId,
        body: '',
        id: { _serialized: `AI_REQUEST_${Date.now()}` },
        reply: async (text) => {
            await client.sendMessage(chatId, text);
            return { id: { _serialized: `AI_REPLY_${Date.now()}` } };
        }
    };
}

module.exports = router;
