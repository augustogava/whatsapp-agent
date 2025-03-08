// src/controllers/messageController.js

const client = require('../services/whatsappClient');
const { Location, Buttons, List, Poll, MessageMedia } = require('whatsapp-web.js');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

// Storage for monitoring, schedules
const monitoredChats = new Map(); // chatId -> {userId, lastCheckedMessageId}
const scheduledCommands = []; // [{time, command, chatId}]

// Helper: List of all commands and short descriptions
const helpMessage = `
*Your Personal WhatsApp Secretary* 📱✨

*Basic Commands:*
- *@help* - Show this help message
- *@ping* - Check if the assistant is active
- *@echo <text>* - Bot will echo your text
- *@info* - Show connection info and statistics

*Notes Management:*
- *@note <text>* - Save a quick note
- *@notes* - View all saved notes
- *@clear-notes* - Clear all saved notes

*To-Do List:*
- *@todo <task>* - Add a task to your to-do list
- *@todos* - View all your to-dos
- *@done <number>* - Mark a to-do as done

*Reminders & Time Management:*
- *@reminder <minutes> <message>* - Set a reminder that will notify you after specified minutes
- *@calendar <date>* - Show your schedule for a date (format: YYYY-MM-DD)
- *@weather <city>* - Get current weather for a city
- *@schedule <time> <command>* - Schedule a command to run at a specific time

*Messaging Commands:*
- *@sendto <number> <message>* - Send message to another number
- *@reply <text>* - Reply to the last received message
- *@newmessages* - Check your recent unread messages
- *@chats* - List all your available chats
- *@chathistory <number> <count>* - Get message history from a specific chat
- *@contacts* - List your contacts
- *@archive <number>* - Archive a chat

*AI Assistant:*
- *@ia <your request>* - Send request to AI (e.g., "@ia create excel document")
- *@summarize <chatId> <count>* - Generate a summary of recent chat conversations
- *@translate <language> <text>* - Translate text to specified language
- *@extract <text>* - Extract important information (dates, emails, tasks)
- *@search <query>* - Search across all chats for specific text
- *@monitor <chatId>* - Monitor a chat for new messages
- *@unmonitor <chatId>* - Stop monitoring a chat
- *@transcribe* - Transcribe a voice message (reply to a voice message)
- *@voice <text>* - Convert text to a voice message

*Quick Responses:*
- *@busy* - Send "I'm in a meeting, will respond later"
- *@later* - Send "I'll get back to you later today"
- *@thanks* - Send a thank you message

*API Access:*
You can trigger these commands remotely via API:
- POST to /api/command with {"number":"your_number", "command":"@command_here"}
- POST to /api/sendMessage with {"number":"recipient", "text":"message"}
- GET /api/status to check WhatsApp connection status

This secretary is optimized for personal productivity and communication management.
You can message yourself to use these commands or have them triggered via API.

Type any command to get started!
`;

// Storage for notes and todos (non-persistent for now)
const userNotes = [];
const userTodos = [];
const reminders = [];

// Process commands from the message event (from other people)
client.on('message', async (msg) => {
    console.log('--- MESSAGE RECEIVED ---');
    console.log('FROM:', msg.from);
    console.log('BODY:', msg.body);

    // Convert the entire msg.body to string and trim, just to be safe
    let incomingMsg = msg.body.toString().trim();

    // Store last incoming message for reply functionality
    global.lastIncomingMessage = {
        from: msg.from,
        body: msg.body,
        timestamp: new Date()
    };

    // Check if this message is from a monitored chat
    checkMonitoredChats(msg);

    // Process commands
    await processCommand(incomingMsg, msg, false);
});

// Function to check if message is from a monitored chat
async function checkMonitoredChats(msg) {
    try {
        if (monitoredChats.has(msg.from)) {
            const monitor = monitoredChats.get(msg.from);
            // Don't notify about the user's own messages
            if (msg.from !== monitor.userId) {
                const chat = await msg.getChat();
                const contact = chat.name || msg.from;
                await client.sendMessage(
                    monitor.userId,
                    `📢 *New message in monitored chat*\nFrom: ${contact}\nMessage: ${msg.body}`
                );
                // Update last checked message ID
                monitor.lastCheckedMessageId = msg.id._serialized;
            }
        }
    } catch (error) {
        console.error("Error in monitoring chats:", error);
    }
}

// Check for scheduled commands every minute
setInterval(async () => {
    const now = new Date();
    const commandsToRun = [];
    
    // Find commands that need to be executed
    scheduledCommands.forEach((scheduled, index) => {
        if (new Date(scheduled.time) <= now) {
            commandsToRun.push(scheduled);
            scheduledCommands.splice(index, 1);
        }
    });
    
    // Execute commands
    for (const scheduled of commandsToRun) {
        try {
            console.log(`Executing scheduled command: ${scheduled.command}`);
            const mockMsg = {
                from: scheduled.chatId,
                body: scheduled.command,
                id: { _serialized: `SCHEDULED_${Date.now()}` },
                reply: async (text) => {
                    await client.sendMessage(scheduled.chatId, text);
                    return { id: { _serialized: `SCHEDULED_REPLY_${Date.now()}` } };
                }
            };
            await processCommand(scheduled.command, mockMsg, false);
            await client.sendMessage(
                scheduled.chatId,
                `⏰ Executed scheduled command: ${scheduled.command}`
            );
        } catch (error) {
            console.error(`Error executing scheduled command: ${error}`);
            await client.sendMessage(
                scheduled.chatId,
                `❌ Error executing scheduled command: ${scheduled.command}\nError: ${error.message}`
            );
        }
    }
}, 60000); // Check every minute

// Process commands from myself (when I send commands to my own number)
client.on('message_create', async (msg) => {
    console.log('--- message_create event triggered ---');
    console.log('Message info:', msg.id._serialized);

    if (msg.fromMe) {
        console.log('Message from me:', msg.body);

        // Process commands in messages from me
        let incomingMsg = msg.body.toString().trim();

        // Process all commands for messages I send to myself
        await processCommand(incomingMsg, msg, true);
    }
});

// Central command processing function
async function processCommand(incomingMsg, msg, isFromMe) {
    const respond = async (text) => {
        try {
            if (isFromMe) {
                // For messages from myself, send a new message instead of replying
                await client.sendMessage(msg.from, text);
            } else {
                // For messages from others, use reply
                await msg.reply(text);
            }
        } catch (error) {
            console.error('Error responding:', error);
        }
    };

    // ---------- @help command ----------
    if (incomingMsg === '@help') {
        console.log('[DEBUG] @help command triggered');
        try {
            await respond(helpMessage);
        } catch (error) {
            console.error('Error handling @help:', error);
            await respond('Oops, an error occurred while showing help.');
        }
        return;
    }

    // ---------- @ping command ----------
    if (incomingMsg === '@ping') {
        console.log('[DEBUG] @ping command triggered');
        try {
            await respond('pong - Your secretary is active and ready to assist!');
        } catch (error) {
            console.error('Error handling @ping:', error);
            await respond('An error occurred processing @ping command.');
        }
        return;
    }

    // ---------- @echo <text> ----------
    if (incomingMsg.startsWith('@echo ')) {
        console.log('[DEBUG] @echo command triggered');
        try {
            await respond(incomingMsg.slice(6));
        } catch (error) {
            console.error('Error handling @echo:', error);
            await respond('An error occurred while echoing your message.');
        }
        return;
    }

    // ---------- @note <text> ----------
    if (incomingMsg.startsWith('@note ')) {
        console.log('[DEBUG] @note command triggered');
        try {
            const noteText = incomingMsg.slice(6).trim();
            if (noteText) {
                const timestamp = new Date().toLocaleString();
                userNotes.push({ text: noteText, timestamp });
                await respond(`✅ Note saved: "${noteText}"`);
            } else {
                await respond('Please provide text for your note.');
            }
        } catch (error) {
            console.error('Error handling @note:', error);
            await respond('An error occurred while saving your note.');
        }
        return;
    }

    // ---------- @notes ----------
    if (incomingMsg === '@notes') {
        console.log('[DEBUG] @notes command triggered');
        try {
            if (userNotes.length === 0) {
                await respond('You have no saved notes.');
            } else {
                let notesMessage = '*Your Saved Notes:*\n\n';
                userNotes.forEach((note, index) => {
                    notesMessage += `${index + 1}. [${note.timestamp}] ${note.text}\n\n`;
                });
                await respond(notesMessage);
            }
        } catch (error) {
            console.error('Error handling @notes:', error);
            await respond('An error occurred while retrieving your notes.');
        }
        return;
    }

    // ---------- @clear-notes ----------
    if (incomingMsg === '@clear-notes') {
        console.log('[DEBUG] @clear-notes command triggered');
        try {
            const noteCount = userNotes.length;
            userNotes.length = 0; // Clear the array
            await respond(`✅ Cleared ${noteCount} saved notes.`);
        } catch (error) {
            console.error('Error handling @clear-notes:', error);
            await respond('An error occurred while clearing your notes.');
        }
        return;
    }

    // ---------- @todo <task> ----------
    if (incomingMsg.startsWith('@todo ')) {
        console.log('[DEBUG] @todo command triggered');
        try {
            const todoText = incomingMsg.slice(6).trim();
            if (todoText) {
                const timestamp = new Date().toLocaleString();
                userTodos.push({ text: todoText, timestamp, done: false });
                await respond(`✅ Task added to your to-do list: "${todoText}"`);
            } else {
                await respond('Please provide a task for your to-do.');
            }
        } catch (error) {
            console.error('Error handling @todo:', error);
            await respond('An error occurred while adding your task.');
        }
        return;
    }

    // ---------- @todos ----------
    if (incomingMsg === '@todos') {
        console.log('[DEBUG] @todos command triggered');
        try {
            if (userTodos.length === 0) {
                await respond('You have no tasks in your to-do list.');
            } else {
                let activeTodos = userTodos.filter(todo => !todo.done);
                let completedTodos = userTodos.filter(todo => todo.done);

                let todosMessage = '*Your To-Do List:*\n\n';

                if (activeTodos.length > 0) {
                    todosMessage += '*Active Tasks:*\n';
                    activeTodos.forEach((todo, index) => {
                        todosMessage += `${index + 1}. ${todo.text} [${todo.timestamp}]\n`;
                    });
                    todosMessage += '\n';
                }

                if (completedTodos.length > 0) {
                    todosMessage += '*Completed Tasks:*\n';
                    completedTodos.forEach((todo, index) => {
                        todosMessage += `✓ ${todo.text}\n`;
                    });
                }

                await respond(todosMessage);
            }
        } catch (error) {
            console.error('Error handling @todos:', error);
            await respond('An error occurred while retrieving your to-do list.');
        }
        return;
    }

    // ---------- @done <number> ----------
    if (incomingMsg.startsWith('@done ')) {
        console.log('[DEBUG] @done command triggered');
        try {
            const taskNumber = parseInt(incomingMsg.slice(6).trim());
            const activeTodos = userTodos.filter(todo => !todo.done);

            if (isNaN(taskNumber) || taskNumber < 1 || taskNumber > activeTodos.length) {
                await respond(`Please provide a valid task number between 1 and ${activeTodos.length}.`);
            } else {
                const todoIndex = userTodos.indexOf(activeTodos[taskNumber - 1]);
                userTodos[todoIndex].done = true;
                userTodos[todoIndex].completedAt = new Date().toLocaleString();

                await respond(`✅ Marked task "${userTodos[todoIndex].text}" as done!`);
            }
        } catch (error) {
            console.error('Error handling @done:', error);
            await respond('An error occurred while marking your task as done.');
        }
        return;
    }

    // ---------- @reminder <time> <message> ----------
    if (incomingMsg.startsWith('@reminder ')) {
        console.log('[DEBUG] @reminder command triggered');
        try {
            const reminderText = incomingMsg.slice(10).trim();
            const timeMatch = reminderText.match(/^(\d+)\s+(.+)$/);

            if (timeMatch) {
                const minutes = parseInt(timeMatch[1]);
                const message = timeMatch[2];

                if (minutes > 0) {
                    const reminderTime = new Date(Date.now() + minutes * 60000);
                    const reminderTimeStr = reminderTime.toLocaleTimeString();

                    // Add to reminders
                    const reminder = {
                        message,
                        time: reminderTime,
                        chatId: msg.from
                    };

                    reminders.push(reminder);

                    // Set timeout to send reminder
                    setTimeout(async () => {
                        try {
                            await client.sendMessage(
                                reminder.chatId,
                                `🔔 *REMINDER*: ${reminder.message}`
                            );
                            // Remove from reminders array
                            const index = reminders.findIndex(r =>
                                r.time.getTime() === reminder.time.getTime() &&
                                r.message === reminder.message
                            );
                            if (index !== -1) {
                                reminders.splice(index, 1);
                            }
                        } catch (error) {
                            console.error('Error sending reminder:', error);
                        }
                    }, minutes * 60000);

                    await respond(`⏰ Reminder set for ${reminderTimeStr} (in ${minutes} minutes): "${message}"`);
                } else {
                    await respond('Please provide a positive number of minutes for the reminder.');
                }
            } else {
                await respond('Please use the format: @reminder <minutes> <message>');
            }
        } catch (error) {
            console.error('Error handling @reminder:', error);
            await respond('An error occurred while setting your reminder.');
        }
        return;
    }

    // ---------- @weather <city> ----------
    if (incomingMsg.startsWith('@weather ')) {
        console.log('[DEBUG] @weather command triggered');
        try {
            const city = incomingMsg.slice(9).trim();
            await respond(`🌦️ Weather feature is not yet fully implemented. When connected to a weather API, this would show weather for ${city}.`);

            // In a real implementation, you would call a weather API here
            // Example: const weather = await getWeatherForCity(city);
            // Then format and return the results
        } catch (error) {
            console.error('Error handling @weather:', error);
            await respond('An error occurred while retrieving weather information.');
        }
        return;
    }

    // ---------- @busy ----------
    if (incomingMsg === '@busy') {
        console.log('[DEBUG] @busy quick response triggered');
        try {
            if (global.lastIncomingMessage && !isFromMe) {
                await client.sendMessage(
                    global.lastIncomingMessage.from,
                    "I'm in a meeting right now. I'll get back to you as soon as possible."
                );
                await respond('✅ Busy response sent.');
            } else if (isFromMe) {
                await respond('The @busy command works when replying to messages from others.');
            } else {
                await respond('No recent messages to respond to.');
            }
        } catch (error) {
            console.error('Error handling @busy:', error);
            await respond('An error occurred while sending busy response.');
        }
        return;
    }

    // ---------- @later ----------
    if (incomingMsg === '@later') {
        console.log('[DEBUG] @later quick response triggered');
        try {
            if (global.lastIncomingMessage && !isFromMe) {
                await client.sendMessage(
                    global.lastIncomingMessage.from,
                    "I'll get back to you later today. Thanks for your message!"
                );
                await respond('✅ Later response sent.');
            } else if (isFromMe) {
                await respond('The @later command works when replying to messages from others.');
            } else {
                await respond('No recent messages to respond to.');
            }
        } catch (error) {
            console.error('Error handling @later:', error);
            await respond('An error occurred while sending later response.');
        }
        return;
    }

    // ---------- @thanks ----------
    if (incomingMsg === '@thanks') {
        console.log('[DEBUG] @thanks quick response triggered');
        try {
            if (global.lastIncomingMessage && !isFromMe) {
                await client.sendMessage(
                    global.lastIncomingMessage.from,
                    "Thank you for your message! I appreciate it."
                );
                await respond('✅ Thank you response sent.');
            } else if (isFromMe) {
                await respond('The @thanks command works when replying to messages from others.');
            } else {
                await respond('No recent messages to respond to.');
            }
        } catch (error) {
            console.error('Error handling @thanks:', error);
            await respond('An error occurred while sending thank you response.');
        }
        return;
    }

    // ---------- @reply <text> ----------
    if (incomingMsg.startsWith('@reply ')) {
        console.log('[DEBUG] @reply command triggered');
        try {
            const replyText = incomingMsg.slice(7).trim();

            if (global.lastIncomingMessage && !isFromMe) {
                await client.sendMessage(global.lastIncomingMessage.from, replyText);
                await respond(`✅ Reply sent: "${replyText}"`);
            } else if (isFromMe) {
                await respond('The @reply command works when replying to messages from others.');
            } else {
                await respond('No recent messages to reply to.');
            }
        } catch (error) {
            console.error('Error handling @reply:', error);
            await respond('An error occurred while sending your reply.');
        }
        return;
    }

    // In messageController.js, add a new special command for AI
    if (incomingMsg.startsWith('@ask ')) {
        console.log('[DEBUG] @ask AI command triggered');
        try {
            const question = incomingMsg.slice(5).trim();

            // Send "thinking" indicator
            await respond("🤔 Thinking...");

            // Call your AI service (example with fetch)
            const aiResponse = await fetch('https://your-ai-service.com/api', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    question,
                    context: { from: msg.from }
                })
            }).then(res => res.json());

            // Send AI's response back
            await respond(`🤖 *AI Response:*\n\n${aiResponse.message}`);
        } catch (error) {
            console.error('Error handling @ask:', error);
            await respond('An error occurred while asking the AI.');
        }
        return;
    }

    // ---------- @info ----------
    if (incomingMsg === '@info') {
        console.log('[DEBUG] @info command triggered');
        try {
            let info = client.info;
            await respond(
                `*Connection Info*\n` +
                `User name: ${info.pushname}\n` +
                `My number: ${info.wid.user}\n` +
                `Platform: ${info.platform}\n` +
                `Active Reminders: ${reminders.length}\n` +
                `Saved Notes: ${userNotes.length}\n` +
                `To-Do Items: ${userTodos.length}`
            );
        } catch (error) {
            console.error('Error handling @info:', error);
            await respond('An error occurred while retrieving info.');
        }
        return;
    }

    // ---------- @sendto <number> <message> ----------
    if (incomingMsg.startsWith('@sendto ')) {
        console.log('[DEBUG] @sendto command triggered');
        try {
            let parts = incomingMsg.split(' ');
            let number = parts[1];
            let message = incomingMsg.substring(incomingMsg.indexOf(number) + number.length).trim();

            number = number.includes('@c.us') ? number : `${number}@c.us`;
            await client.sendMessage(number, message);
            await respond(`✅ Message sent to ${number}: "${message}"`);
        } catch (error) {
            console.error('Error handling @sendto:', error);
            await respond('An error occurred while trying to send the message.');
        }
        return;
    }

    // ---------- @newmessages ----------
    if (incomingMsg === '@newmessages') {
        console.log('[DEBUG] @newmessages command triggered');
        try {
            const chats = await client.getChats();
            const unreadChats = chats.filter(chat => chat.unreadCount > 0);
            
            if (unreadChats.length === 0) {
                await respond('You have no unread messages.');
            } else {
                let unreadMessage = '*Unread Messages:*\n\n';
                for (const chat of unreadChats) {
                    const contact = chat.name || chat.id.user;
                    unreadMessage += `- *${contact}*: ${chat.unreadCount} message(s)\n`;
                }
                await respond(unreadMessage);
            }
        } catch (error) {
            console.error('Error handling @newmessages:', error);
            await respond('An error occurred while checking for new messages.');
        }
        return;
    }

    // ---------- @chats ----------
    if (incomingMsg === '@chats') {
        console.log('[DEBUG] @chats command triggered');
        try {
            const chats = await client.getChats();
            
            if (chats.length === 0) {
                await respond('You have no chats.');
            } else {
                let chatList = '*Your Chats:*\n\n';
                chats.slice(0, 15).forEach((chat, index) => {
                    const chatName = chat.name || chat.id.user;
                    chatList += `${index + 1}. *${chatName}*${chat.unreadCount > 0 ? ` (${chat.unreadCount} unread)` : ''}\n`;
                });
                
                if (chats.length > 15) {
                    chatList += `\n_...and ${chats.length - 15} more chats_`;
                }
                
                await respond(chatList);
            }
        } catch (error) {
            console.error('Error handling @chats:', error);
            await respond('An error occurred while retrieving your chats.');
        }
        return;
    }

    // ---------- @chathistory <number> <count> ----------
    if (incomingMsg.startsWith('@chathistory ')) {
        console.log('[DEBUG] @chathistory command triggered');
        try {
            const params = incomingMsg.slice(12).trim().split(' ');
            let chatId = params[0];
            const messageCount = params.length > 1 ? parseInt(params[1]) : 10;
            
            if (!chatId) {
                await respond('Please provide a phone number to fetch chat history.');
                return;
            }
            
            chatId = chatId.includes('@c.us') ? chatId : `${chatId}@c.us`;
            const chat = await client.getChatById(chatId);
            const messages = await chat.fetchMessages({ limit: messageCount });
            
            if (messages.length === 0) {
                await respond(`No messages found in chat with ${chatId}.`);
            } else {
                let historyText = `*Chat History with ${chat.name || chatId}:*\n\n`;
                messages.reverse().forEach(msg => {
                    const sender = msg.fromMe ? 'You' : (chat.name || chatId);
                    const time = new Date(msg.timestamp * 1000).toLocaleTimeString();
                    historyText += `[${time}] *${sender}*: ${msg.body}\n\n`;
                });
                
                await respond(historyText);
            }
        } catch (error) {
            console.error('Error handling @chathistory:', error);
            await respond('An error occurred while retrieving chat history.');
        }
        return;
    }

    // ---------- @contacts ----------
    if (incomingMsg === '@contacts') {
        console.log('[DEBUG] @contacts command triggered');
        try {
            const contacts = await client.getContacts();
            
            if (contacts.length === 0) {
                await respond('You have no contacts.');
            } else {
                const savedContacts = contacts.filter(contact => contact.name !== undefined);
                
                if (savedContacts.length === 0) {
                    await respond('You have no saved contacts.');
                } else {
                    let contactList = '*Your Contacts:*\n\n';
                    savedContacts.slice(0, 20).forEach((contact, index) => {
                        contactList += `${index + 1}. *${contact.name}* (${contact.number})\n`;
                    });
                    
                    if (savedContacts.length > 20) {
                        contactList += `\n_...and ${savedContacts.length - 20} more contacts_`;
                    }
                    
                    await respond(contactList);
                }
            }
        } catch (error) {
            console.error('Error handling @contacts:', error);
            await respond('An error occurred while retrieving your contacts.');
        }
        return;
    }

    // ---------- @archive <number> ----------
    if (incomingMsg.startsWith('@archive ')) {
        console.log('[DEBUG] @archive command triggered');
        try {
            const number = incomingMsg.slice(9).trim();
            
            if (!number) {
                await respond('Please provide a phone number to archive.');
                return;
            }
            
            const chatId = number.includes('@c.us') ? number : `${number}@c.us`;
            const chat = await client.getChatById(chatId);
            
            await chat.archive();
            await respond(`Chat with ${chat.name || chatId} has been archived.`);
        } catch (error) {
            console.error('Error handling @archive:', error);
            await respond('An error occurred while archiving the chat.');
        }
        return;
    }

    // ---------- @ia <prompt> ----------
    if (incomingMsg.startsWith('@ia ')) {
        console.log('[DEBUG] @ia command triggered');
        try {
            const prompt = incomingMsg.slice(4).trim();
            
            if (!prompt) {
                await respond('Please provide a request for the AI.');
                return;
            }
            
            // Send thinking message
            await respond('🧠 Thinking... Processing your AI request...');
            
            // Configuration for your AI service
            const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'https://your-ai-service-url.com/api';
            const AI_SERVICE_KEY = process.env.AI_SERVICE_KEY || 'your-api-key';
            
            // Make request to AI service
            try {
                const aiResponse = await fetch(AI_SERVICE_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${AI_SERVICE_KEY}`
                    },
                    body: JSON.stringify({
                        prompt: prompt,
                        user: msg.from,
                        messageId: msg.id._serialized
                    })
                });
                
                if (!aiResponse.ok) {
                    throw new Error(`AI service responded with status: ${aiResponse.status}`);
                }
                
                const result = await aiResponse.json();
                
                // Send AI response back to user
                await respond(`🤖 *AI Response:*\n\n${result.response || result.message || JSON.stringify(result)}`);
                
                // If AI generated a file or attachment
                if (result.attachmentUrl) {
                    // Send as media if it's an image, document for other files
                    if (result.attachmentType === 'image') {
                        await client.sendMessage(msg.from, {
                            url: result.attachmentUrl
                        }, { caption: result.attachmentName || 'AI Generated Image' });
                    } else {
                        // For documents, spreadsheets, etc.
                        const media = await MessageMedia.fromUrl(result.attachmentUrl);
                        media.filename = result.attachmentName || 'AI Generated File';
                        await client.sendMessage(msg.from, media);
                    }
                }
            } catch (aiError) {
                console.error('Error calling AI service:', aiError);
                await respond(`Sorry, I couldn't complete your AI request: ${aiError.message}`);
            }
        } catch (error) {
            console.error('Error handling @ia command:', error);
            await respond('An error occurred while processing your AI request.');
        }
        return;
    }

    // ---------- @summarize <chatId> <count> ----------
    if (incomingMsg.startsWith('@summarize ')) {
        console.log('[DEBUG] @summarize command triggered');
        try {
            const params = incomingMsg.slice(11).trim().split(' ');
            let chatId = params[0];
            const messageCount = params.length > 1 ? parseInt(params[1]) : 20;
            
            if (!chatId) {
                await respond('Please provide a phone number to summarize chat.');
                return;
            }
            
            await respond('🔍 Retrieving messages and generating summary...');
            
            chatId = chatId.includes('@c.us') ? chatId : `${chatId}@c.us`;
            const chat = await client.getChatById(chatId);
            const messages = await chat.fetchMessages({ limit: messageCount });
            
            if (messages.length === 0) {
                await respond(`No messages found in chat with ${chatId}.`);
                return;
            }
            
            // Format the messages for AI processing
            let chatContent = messages.map(m => {
                const sender = m.fromMe ? 'You' : 'Them';
                return `${sender}: ${m.body}`;
            }).join('\n');
            
            // Send to AI for summarization
            const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'https://your-ai-service-url.com/api';
            const AI_SERVICE_KEY = process.env.AI_SERVICE_KEY || 'your-api-key';
            
            const aiResponse = await fetch(AI_SERVICE_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${AI_SERVICE_KEY}`
                },
                body: JSON.stringify({
                    action: 'summarize',
                    content: chatContent,
                    chatId: chatId
                })
            });
            
            if (!aiResponse.ok) {
                throw new Error(`AI service responded with status: ${aiResponse.status}`);
            }
            
            const result = await aiResponse.json();
            await respond(`📝 *Chat Summary*\n\n${result.summary || 'No summary available'}`);
            
        } catch (error) {
            console.error('Error handling @summarize:', error);
            await respond('An error occurred while generating summary.');
        }
        return;
    }

    // ---------- @translate <language> <text> ----------
    if (incomingMsg.startsWith('@translate ')) {
        console.log('[DEBUG] @translate command triggered');
        try {
            const params = incomingMsg.slice(11).trim();
            const firstSpace = params.indexOf(' ');
            
            if (firstSpace === -1) {
                await respond('Please use the format: @translate <language> <text>');
                return;
            }
            
            const language = params.substring(0, firstSpace);
            const text = params.substring(firstSpace + 1);
            
            if (!text) {
                await respond('Please provide text to translate.');
                return;
            }
            
            await respond(`🔄 Translating to ${language}...`);
            
            // Send to AI for translation
            const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'https://your-ai-service-url.com/api';
            const AI_SERVICE_KEY = process.env.AI_SERVICE_KEY || 'your-api-key';
            
            const aiResponse = await fetch(AI_SERVICE_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${AI_SERVICE_KEY}`
                },
                body: JSON.stringify({
                    action: 'translate',
                    text: text,
                    language: language
                })
            });
            
            if (!aiResponse.ok) {
                throw new Error(`AI service responded with status: ${aiResponse.status}`);
            }
            
            const result = await aiResponse.json();
            await respond(`🌐 *Translation (${language})*\n\n${result.translation || 'Translation failed'}`);
            
        } catch (error) {
            console.error('Error handling @translate:', error);
            await respond('An error occurred while translating.');
        }
        return;
    }

    // ---------- @extract <text> ----------
    if (incomingMsg.startsWith('@extract ')) {
        console.log('[DEBUG] @extract command triggered');
        try {
            const text = incomingMsg.slice(9).trim();
            
            if (!text) {
                await respond('Please provide text to extract information from.');
                return;
            }
            
            await respond('🔍 Extracting important information...');
            
            // Send to AI for information extraction
            const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'https://your-ai-service-url.com/api';
            const AI_SERVICE_KEY = process.env.AI_SERVICE_KEY || 'your-api-key';
            
            const aiResponse = await fetch(AI_SERVICE_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${AI_SERVICE_KEY}`
                },
                body: JSON.stringify({
                    action: 'extract',
                    text: text
                })
            });
            
            if (!aiResponse.ok) {
                throw new Error(`AI service responded with status: ${aiResponse.status}`);
            }
            
            const result = await aiResponse.json();
            
            let extractionResult = '📋 *Extracted Information*\n\n';
            
            if (result.dates && result.dates.length > 0) {
                extractionResult += '*Dates:*\n';
                result.dates.forEach(date => {
                    extractionResult += `- ${date}\n`;
                });
                extractionResult += '\n';
            }
            
            if (result.emails && result.emails.length > 0) {
                extractionResult += '*Emails:*\n';
                result.emails.forEach(email => {
                    extractionResult += `- ${email}\n`;
                });
                extractionResult += '\n';
            }
            
            if (result.tasks && result.tasks.length > 0) {
                extractionResult += '*Tasks:*\n';
                result.tasks.forEach(task => {
                    extractionResult += `- ${task}\n`;
                });
                extractionResult += '\n';
            }
            
            if (result.entities && result.entities.length > 0) {
                extractionResult += '*Other:*\n';
                result.entities.forEach(entity => {
                    extractionResult += `- ${entity.type}: ${entity.value}\n`;
                });
            }
            
            await respond(extractionResult);
            
        } catch (error) {
            console.error('Error handling @extract:', error);
            await respond('An error occurred while extracting information.');
        }
        return;
    }

    // ---------- @search <query> ----------
    if (incomingMsg.startsWith('@search ')) {
        console.log('[DEBUG] @search command triggered');
        try {
            const query = incomingMsg.slice(8).trim();
            
            if (!query) {
                await respond('Please provide a search query.');
                return;
            }
            
            await respond(`🔍 Searching chats for "${query}"...`);
            
            const chats = await client.getChats();
            let results = [];
            const MAX_CHATS_TO_SEARCH = 10; // Limit to prevent performance issues
            
            for (let i = 0; i < Math.min(chats.length, MAX_CHATS_TO_SEARCH); i++) {
                const chat = chats[i];
                const chatName = chat.name || chat.id.user;
                
                try {
                    const messages = await chat.fetchMessages({ limit: 30 });
                    const matchingMessages = messages.filter(m => 
                        m.body.toLowerCase().includes(query.toLowerCase())
                    );
                    
                    if (matchingMessages.length > 0) {
                        results.push({
                            chatName,
                            chatId: chat.id._serialized,
                            matches: matchingMessages.map(m => ({
                                fromMe: m.fromMe,
                                body: m.body,
                                timestamp: m.timestamp
                            }))
                        });
                    }
                } catch (chatError) {
                    console.error(`Error searching chat ${chatName}:`, chatError);
                }
            }
            
            if (results.length === 0) {
                await respond(`No matches found for "${query}".`);
            } else {
                let searchResults = `🔍 *Search Results for "${query}"*\n\n`;
                
                results.forEach(result => {
                    searchResults += `*In chat with ${result.chatName}:*\n`;
                    result.matches.slice(0, 3).forEach(match => {
                        const sender = match.fromMe ? 'You' : 'Them';
                        const preview = match.body.length > 50 
                            ? match.body.substring(0, 50) + '...' 
                            : match.body;
                        searchResults += `- [${sender}] "${preview}"\n`;
                    });
                    
                    if (result.matches.length > 3) {
                        searchResults += `  ...and ${result.matches.length - 3} more matches\n`;
                    }
                    searchResults += '\n';
                });
                
                await respond(searchResults);
            }
            
        } catch (error) {
            console.error('Error handling @search:', error);
            await respond('An error occurred while searching chats.');
        }
        return;
    }

    // ---------- @monitor <chatId> ----------
    if (incomingMsg.startsWith('@monitor ')) {
        console.log('[DEBUG] @monitor command triggered');
        try {
            let chatId = incomingMsg.slice(9).trim();
            
            if (!chatId) {
                await respond('Please provide a chat ID to monitor.');
                return;
            }
            
            chatId = chatId.includes('@c.us') || chatId.includes('@g.us') ? chatId : `${chatId}@c.us`;
            
            // Check if chat exists
            try {
                await client.getChatById(chatId);
            } catch (chatError) {
                await respond(`Chat ${chatId} not found.`);
                return;
            }
            
            monitoredChats.set(chatId, {
                userId: msg.from,
                lastCheckedMessageId: null
            });
            
            await respond(`👀 Now monitoring chat ${chatId}. You'll be notified of new messages.`);
            
        } catch (error) {
            console.error('Error handling @monitor:', error);
            await respond('An error occurred while setting up monitoring.');
        }
        return;
    }

    // ---------- @unmonitor <chatId> ----------
    if (incomingMsg.startsWith('@unmonitor ')) {
        console.log('[DEBUG] @unmonitor command triggered');
        try {
            let chatId = incomingMsg.slice(11).trim();
            
            if (!chatId) {
                await respond('Please provide a chat ID to stop monitoring.');
                return;
            }
            
            chatId = chatId.includes('@c.us') || chatId.includes('@g.us') ? chatId : `${chatId}@c.us`;
            
            if (monitoredChats.has(chatId)) {
                monitoredChats.delete(chatId);
                await respond(`✅ Stopped monitoring chat ${chatId}.`);
            } else {
                await respond(`You are not currently monitoring chat ${chatId}.`);
            }
            
        } catch (error) {
            console.error('Error handling @unmonitor:', error);
            await respond('An error occurred while stopping monitoring.');
        }
        return;
    }

    // ---------- @transcribe ----------
    if (incomingMsg === '@transcribe') {
        console.log('[DEBUG] @transcribe command triggered');
        try {
            // Check if message is a reply to a voice message
            if (!msg.hasQuotedMsg) {
                await respond('Please reply to a voice message with @transcribe.');
                return;
            }
            
            const quotedMsg = await msg.getQuotedMessage();
            
            if (!quotedMsg.hasMedia || quotedMsg.type !== 'audio') {
                await respond('This command only works with voice messages.');
                return;
            }
            
            await respond('🎤 Downloading and transcribing voice message...');
            
            // Download the media
            const media = await quotedMsg.downloadMedia();
            
            if (!media) {
                await respond('Failed to download voice message.');
                return;
            }
            
            // Create a temporary file
            const tempDir = path.join(__dirname, '../../temp');
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }
            
            const tempFile = path.join(tempDir, `voice_${Date.now()}.ogg`);
            fs.writeFileSync(tempFile, media.data, 'base64');
            
            // Send to AI for transcription
            const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'https://your-ai-service-url.com/api';
            const AI_SERVICE_KEY = process.env.AI_SERVICE_KEY || 'your-api-key';
            
            const formData = new FormData();
            formData.append('file', fs.createReadStream(tempFile));
            formData.append('action', 'transcribe');
            
            const aiResponse = await fetch(AI_SERVICE_URL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${AI_SERVICE_KEY}`
                },
                body: formData
            });
            
            // Clean up temp file
            fs.unlinkSync(tempFile);
            
            if (!aiResponse.ok) {
                throw new Error(`AI service responded with status: ${aiResponse.status}`);
            }
            
            const result = await aiResponse.json();
            await respond(`📝 *Transcription*\n\n${result.transcription || 'Transcription failed'}`);
            
        } catch (error) {
            console.error('Error handling @transcribe:', error);
            await respond('An error occurred while transcribing the voice message.');
        }
        return;
    }

    // ---------- @voice <text> ----------
    if (incomingMsg.startsWith('@voice ')) {
        console.log('[DEBUG] @voice command triggered');
        try {
            const text = incomingMsg.slice(7).trim();
            
            if (!text) {
                await respond('Please provide text to convert to voice.');
                return;
            }
            
            await respond('🔊 Converting text to voice...');
            
            // Send to AI for text-to-speech
            const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'https://your-ai-service-url.com/api';
            const AI_SERVICE_KEY = process.env.AI_SERVICE_KEY || 'your-api-key';
            
            const aiResponse = await fetch(AI_SERVICE_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${AI_SERVICE_KEY}`
                },
                body: JSON.stringify({
                    action: 'textToSpeech',
                    text: text
                })
            });
            
            if (!aiResponse.ok) {
                throw new Error(`AI service responded with status: ${aiResponse.status}`);
            }
            
            const result = await aiResponse.json();
            
            if (!result.audioUrl) {
                throw new Error('No audio URL returned from AI service');
            }
            
            // Download the audio file
            const audioResponse = await fetch(result.audioUrl);
            const arrayBuffer = await audioResponse.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            
            // Create a MessageMedia object
            const media = new MessageMedia(
                'audio/mp3',
                buffer.toString('base64'),
                'voice_message.mp3'
            );
            
            // Send the voice message
            await client.sendMessage(msg.from, media, { 
                sendAudioAsVoice: true 
            });
            
        } catch (error) {
            console.error('Error handling @voice:', error);
            await respond('An error occurred while creating the voice message.');
        }
        return;
    }

    // ---------- @schedule <time> <command> ----------
    if (incomingMsg.startsWith('@schedule ')) {
        console.log('[DEBUG] @schedule command triggered');
        try {
            const params = incomingMsg.slice(10).trim();
            const firstSpace = params.indexOf(' ');
            
            if (firstSpace === -1) {
                await respond('Please use the format: @schedule <time> <command>');
                return;
            }
            
            const timeStr = params.substring(0, firstSpace);
            const command = params.substring(firstSpace + 1);
            
            if (!command) {
                await respond('Please provide a command to schedule.');
                return;
            }
            
            if (!command.startsWith('@')) {
                await respond('The scheduled command must start with @.');
                return;
            }
            
            // Parse the time (accept both HH:MM and YYYY-MM-DD HH:MM formats)
            let scheduledTime;
            
            if (timeStr.includes(':') && !timeStr.includes('-')) {
                // HH:MM format - schedule for today
                const [hours, minutes] = timeStr.split(':').map(Number);
                scheduledTime = new Date();
                scheduledTime.setHours(hours, minutes, 0, 0);
                
                // If the time is in the past, schedule for tomorrow
                if (scheduledTime < new Date()) {
                    scheduledTime.setDate(scheduledTime.getDate() + 1);
                }
            } else {
                // YYYY-MM-DD HH:MM format
                scheduledTime = new Date(timeStr);
            }
            
            if (isNaN(scheduledTime.getTime())) {
                await respond('Invalid time format. Use HH:MM for today/tomorrow or YYYY-MM-DD HH:MM for a specific date.');
                return;
            }
            
            // Add to scheduled commands
            scheduledCommands.push({
                time: scheduledTime,
                command: command,
                chatId: msg.from
            });
            
            await respond(`⏰ Command "${command}" scheduled for ${scheduledTime.toLocaleString()}`);
            
        } catch (error) {
            console.error('Error handling @schedule:', error);
            await respond('An error occurred while scheduling the command.');
        }
        return;
    }

    // If we got here and the message starts with @, it might be an unrecognized command
    if (incomingMsg.startsWith('@')) {
        console.log('[DEBUG] Unrecognized command:', incomingMsg);
        await respond(`Command not recognized. Type @help to see available commands.`);
        return;
    }

    // Not a command - no action needed if from me
    if (isFromMe) {
        return;
    }

    // Optional: Auto-response for messages that aren't commands
    // await respond('I received your message. Type @help to see what I can do.');
}

// No need to export handleMessage as it is not used elsewhere.
module.exports = {
    processCommand
};
