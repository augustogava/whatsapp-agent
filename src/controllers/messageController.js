// src/controllers/messageController.js

const client = require('../services/whatsappClient');
const { Location, Buttons, List, Poll } = require('whatsapp-web.js');

// Helper: List of all commands and short descriptions
const helpMessage = `
*Available Commands* (Prefix everything with "@"):

1. *@ping* - Replies with 'pong'.
   - Example: @ping
2. *@ping reply* - Replies with 'pong' (using msg.reply).
   - Example: @ping reply
3. *@sendto <number> <message>* - Send a new message to a specific number.
   - Example: @sendto 123456789 Hello there
4. *@subject <new group subject>* - Change the group subject.
   - Example: @subject New Subject
5. *@desc <new group description>* - Change the group description.
   - Example: @desc New description here
6. *@echo <your text>* - Bot will echo your text.
   - Example: @echo Hello World
7. *@preview <your text>* - Reply with text & attempt link preview if present.
   - Example: @preview https://google.com
8. *@leave* - The bot leaves the current group.
9. *@join <inviteCode>* - The bot joins a group by invite code.
   - Example: @join EViTeCoDEHeRE
10. *@addmembers* - Add specified members to the group.
11. *@creategroup* - Creates a new group with specified participants.
12. *@groupinfo* - Shows basic information about the group.
13. *@chats* - Shows how many chats the bot has open.
14. *@info* - Shows the bot's connection/user info.
15. *@mediainfo* - Shows info about media in the quoted message.
16. *@quoteinfo* - Shows info about the quoted message.
17. *@resendmedia* - Resends the quoted message’s media.
18. *@isviewonce* - Converts quoted media message into a view-once message.
19. *@location* - Sends a sample location (Googleplex).
20. *@status <new status>* - Updates the bot’s status.
21. *@mentionUsers* - Mentions a user or multiple users.
22. *@mentionGroups* - Mentions a group or multiple groups by ID.
23. *@getGroupMentions* - Example usage of retrieving group mentions.
24. *@delete* - Deletes a quoted message if it was sent by the bot.
25. *@pin* / *@archive* / *@mute* - Pin, archive, or mute the current chat.
26. *@typing* / *@recording* / *@clearstate* - Set chat state or clear it.
27. *@jumpto* - Jump to the quoted message in the UI (if supported).
28. *@buttons* - Sends sample interactive buttons.
29. *@list* - Sends a sample list.
30. *@reaction* - Reacts with a given emoji.
31. *@sendpoll* - Sends sample polls.
32. *@edit* - Edits a quoted message if it was sent by the bot.
33. *@updatelabels* / *@addlabels* / *@removelabels* - Manage labels.
34. *@approverequest* - Approves group membership requests.
35. *@pinmsg* - Pin the quoted message for a specified duration.
36. *@howManyConnections* - Returns how many devices are connected.
37. *@syncHistory* - Sync chat history if available.
38. *@statuses* - Fetch broadcast statuses.

And of course:
- *@help* - Show this help message.

Enjoy! 
`;

client.on('message', async (msg) => {
    console.log('--- MESSAGE RECEIVED ---');
    console.log('FROM:', msg.from);
    console.log('BODY:', msg.body);

    // Convert the entire msg.body to string and trim, just to be safe
    let incomingMsg = msg.body.toString().trim();

    // For improved reliability, you could also do: incomingMsg.toLowerCase()
    // and handle commands in lowercase only.
    // For simplicity, we keep them case-sensitive as in your original code.

    // ---------- @help command ----------
    if (incomingMsg === '@help') {
        console.log('[DEBUG] @help command triggered by user:', msg.from);
        try {
            await msg.reply(helpMessage);
        } catch (error) {
            console.error('Error handling @help:', error);
            msg.reply('Oops, an error occurred while showing help.');
        }
        return;
    }

    // ---------- @ping reply ----------
    if (incomingMsg === '@ping reply') {
        console.log('[DEBUG] @ping reply triggered by user:', msg.from);
        try {
            msg.reply('pong');
        } catch (error) {
            console.error('Error handling @ping reply:', error);
            msg.reply('An error occurred processing @ping reply command.');
        }
        return;
    }

    // ---------- @ping ----------
    if (incomingMsg === '@ping') {
        console.log('[DEBUG] @ping triggered by user:', msg.from);
        try {
            await client.sendMessage(msg.from, 'pong');
        } catch (error) {
            console.error('Error handling @ping:', error);
            msg.reply('An error occurred processing @ping command.');
        }
        return;
    }

    // ---------- @sendto <number> <message> ----------
    if (incomingMsg.startsWith('@sendto ')) {
        console.log('[DEBUG] @sendto triggered by user:', msg.from);
        try {
            let parts = incomingMsg.split(' ');
            let number = parts[1];
            let message = incomingMsg.substring(incomingMsg.indexOf(number) + number.length).trim();

            number = number.includes('@c.us') ? number : `${number}@c.us`;
            let chat = await msg.getChat();
            await chat.sendSeen();
            await client.sendMessage(number, message);
            msg.reply(`Message sent to ${number}`);
        } catch (error) {
            console.error('Error handling @sendto:', error);
            msg.reply('An error occurred while trying to send the message.');
        }
        return;
    }

    // ---------- @subject <new group subject> ----------
    if (incomingMsg.startsWith('@subject ')) {
        console.log('[DEBUG] @subject triggered by user:', msg.from);
        try {
            let chat = await msg.getChat();
            if (chat.isGroup) {
                let newSubject = incomingMsg.slice(9).trim();
                await chat.setSubject(newSubject);
                msg.reply(`Group subject changed to "${newSubject}"`);
            } else {
                msg.reply('This command can only be used in a group!');
            }
        } catch (error) {
            console.error('Error handling @subject:', error);
            msg.reply('An error occurred while changing the group subject.');
        }
        return;
    }

    // ---------- @echo <text> ----------
    if (incomingMsg.startsWith('@echo ')) {
        console.log('[DEBUG] @echo triggered by user:', msg.from);
        try {
            msg.reply(incomingMsg.slice(6));
        } catch (error) {
            console.error('Error handling @echo:', error);
            msg.reply('An error occurred while echoing your message.');
        }
        return;
    }

    // ---------- @preview <text> ----------
    if (incomingMsg.startsWith('@preview ')) {
        console.log('[DEBUG] @preview triggered by user:', msg.from);
        try {
            const text = incomingMsg.slice(9);
            msg.reply(text, null, { linkPreview: true });
        } catch (error) {
            console.error('Error handling @preview:', error);
            msg.reply('An error occurred while sending the preview.');
        }
        return;
    }

    // ---------- @desc <new group description> ----------
    if (incomingMsg.startsWith('@desc ')) {
        console.log('[DEBUG] @desc triggered by user:', msg.from);
        try {
            let chat = await msg.getChat();
            if (chat.isGroup) {
                let newDescription = incomingMsg.slice(6).trim();
                await chat.setDescription(newDescription);
                msg.reply(`Group description updated to "${newDescription}"`);
            } else {
                msg.reply('This command can only be used in a group!');
            }
        } catch (error) {
            console.error('Error handling @desc:', error);
            msg.reply('An error occurred while changing the group description.');
        }
        return;
    }

    // ---------- @leave ----------
    if (incomingMsg === '@leave') {
        console.log('[DEBUG] @leave triggered by user:', msg.from);
        try {
            let chat = await msg.getChat();
            if (chat.isGroup) {
                await chat.leave();
                console.log('Bot left the group:', chat.name);
            } else {
                msg.reply('This command can only be used in a group!');
            }
        } catch (error) {
            console.error('Error handling @leave:', error);
            msg.reply('An error occurred while leaving the group.');
        }
        return;
    }

    // ---------- @join <inviteCode> ----------
    if (incomingMsg.startsWith('@join ')) {
        console.log('[DEBUG] @join triggered by user:', msg.from);
        try {
            const inviteCode = incomingMsg.split(' ')[1];
            await client.acceptInvite(inviteCode);
            msg.reply('Joined the group!');
        } catch (error) {
            console.error('Error handling @join:', error);
            msg.reply('That invite code seems to be invalid or an error occurred.');
        }
        return;
    }

    // ---------- @addmembers ----------
    if (incomingMsg.startsWith('@addmembers')) {
        console.log('[DEBUG] @addmembers triggered by user:', msg.from);
        try {
            const group = await msg.getChat();
            // Replace with your real participant phone numbers
            const result = await group.addParticipants(['number1@c.us', 'number2@c.us', 'number3@c.us']);
            console.log('Add members result:', result);
            msg.reply('Members added to the group.');
        } catch (error) {
            console.error('Error handling @addmembers:', error);
            msg.reply('An error occurred while adding members.');
        }
        return;
    }

    // ---------- @creategroup ----------
    if (incomingMsg === '@creategroup') {
        console.log('[DEBUG] @creategroup triggered by user:', msg.from);
        try {
            const participantsToAdd = ['number1@c.us', 'number2@c.us', 'number3@c.us'];
            const result = await client.createGroup('Group Title', participantsToAdd);
            console.log('Create group result:', result);
            msg.reply('Group created successfully.');
        } catch (error) {
            console.error('Error handling @creategroup:', error);
            msg.reply('Failed to create group.');
        }
        return;
    }

    // ---------- @groupinfo ----------
    if (incomingMsg === '@groupinfo') {
        console.log('[DEBUG] @groupinfo triggered by user:', msg.from);
        try {
            let chat = await msg.getChat();
            if (chat.isGroup) {
                msg.reply(
                    `*Group Details*\n` +
                    `Name: ${chat.name}\n` +
                    `Description: ${chat.description}\n` +
                    `Created At: ${chat.createdAt.toString()}\n` +
                    `Created By: ${chat.owner.user}\n` +
                    `Participant count: ${chat.participants.length}`
                );
            } else {
                msg.reply('This command can only be used in a group!');
            }
        } catch (error) {
            console.error('Error handling @groupinfo:', error);
            msg.reply('An error occurred while retrieving group information.');
        }
        return;
    }

    // ---------- @chats ----------
    if (incomingMsg === '@chats') {
        console.log('[DEBUG] @chats triggered by user:', msg.from);
        try {
            const chats = await client.getChats();
            await client.sendMessage(msg.from, `The bot has ${chats.length} chats open.`);
        } catch (error) {
            console.error('Error handling @chats:', error);
            msg.reply('An error occurred while retrieving chats.');
        }
        return;
    }

    // ---------- @info ----------
    if (incomingMsg === '@info') {
        console.log('[DEBUG] @info triggered by user:', msg.from);
        try {
            let info = client.info;
            await client.sendMessage(
                msg.from,
                `*Connection info*\n` +
                `User name: ${info.pushname}\n` +
                `My number: ${info.wid.user}\n` +
                `Platform: ${info.platform}`
            );
        } catch (error) {
            console.error('Error handling @info:', error);
            msg.reply('An error occurred while retrieving info.');
        }
        return;
    }

    // ---------- @mediainfo ----------
    if (incomingMsg === '@mediainfo' && msg.hasMedia) {
        console.log('[DEBUG] @mediainfo triggered by user:', msg.from);
        try {
            const attachmentData = await msg.downloadMedia();
            msg.reply(
                `*Media info*\n` +
                `MimeType: ${attachmentData.mimetype}\n` +
                `Filename: ${attachmentData.filename}\n` +
                `Data (length): ${attachmentData.data.length}`
            );
        } catch (error) {
            console.error('Error handling @mediainfo:', error);
            msg.reply('An error occurred while retrieving media info.');
        }
        return;
    }

    // ---------- @quoteinfo ----------
    if (incomingMsg === '@quoteinfo' && msg.hasQuotedMsg) {
        console.log('[DEBUG] @quoteinfo triggered by user:', msg.from);
        try {
            const quotedMsg = await msg.getQuotedMessage();
            quotedMsg.reply(
                `ID: ${quotedMsg.id._serialized}\n` +
                `Type: ${quotedMsg.type}\n` +
                `Author: ${quotedMsg.author || quotedMsg.from}\n` +
                `Timestamp: ${quotedMsg.timestamp}\n` +
                `Has Media? ${quotedMsg.hasMedia}`
            );
        } catch (error) {
            console.error('Error handling @quoteinfo:', error);
            msg.reply('An error occurred while retrieving quote info.');
        }
        return;
    }

    // ---------- @resendmedia ----------
    if (incomingMsg === '@resendmedia' && msg.hasQuotedMsg) {
        console.log('[DEBUG] @resendmedia triggered by user:', msg.from);
        try {
            const quotedMsg = await msg.getQuotedMessage();
            if (quotedMsg.hasMedia) {
                const attachmentData = await quotedMsg.downloadMedia();
                await client.sendMessage(
                    msg.from,
                    attachmentData,
                    { caption: 'Here\'s your requested media.' }
                );

                // If quoted message is audio, also send as voice note
                if (quotedMsg.type === 'audio') {
                    await client.sendMessage(msg.from, attachmentData, { sendAudioAsVoice: true });
                }
            } else {
                msg.reply('The quoted message does not contain media.');
            }
        } catch (error) {
            console.error('Error handling @resendmedia:', error);
            msg.reply('An error occurred while resending media.');
        }
        return;
    }

    // ---------- @isviewonce ----------
    if (incomingMsg === '@isviewonce' && msg.hasQuotedMsg) {
        console.log('[DEBUG] @isviewonce triggered by user:', msg.from);
        try {
            const quotedMsg = await msg.getQuotedMessage();
            if (quotedMsg.hasMedia) {
                const media = await quotedMsg.downloadMedia();
                await client.sendMessage(msg.from, media, { isViewOnce: true });
            } else {
                msg.reply('The quoted message does not contain media.');
            }
        } catch (error) {
            console.error('Error handling @isviewonce:', error);
            msg.reply('An error occurred while converting media to view-once.');
        }
        return;
    }

    // ---------- @location ----------
    if (incomingMsg === '@location') {
        console.log('[DEBUG] @location triggered by user:', msg.from);
        try {
            let location = new Location(37.422, -122.084, {
                name: 'Googleplex',
                address: '1600 Amphitheatre Pkwy, Mountain View, CA 94043, USA',
                url: 'https://google.com'
            });
            await msg.reply(location);
        } catch (error) {
            console.error('Error handling @location:', error);
            msg.reply('An error occurred while sending location.');
        }
        return;
    }

    // Echo back location messages from user
    if (msg.location) {
        console.log('[DEBUG] Location message received from:', msg.from);
        try {
            msg.reply(msg.location);
        } catch (error) {
            console.error('Error handling location echo:', error);
        }
        return;
    }

    // ---------- @status <newStatus> ----------
    if (incomingMsg.startsWith('@status ')) {
        console.log('[DEBUG] @status triggered by user:', msg.from);
        try {
            const newStatus = incomingMsg.split(' ')[1];
            await client.setStatus(newStatus);
            msg.reply(`Status was updated to *${newStatus}*`);
        } catch (error) {
            console.error('Error handling @status:', error);
            msg.reply('An error occurred while updating status.');
        }
        return;
    }

    // ---------- @mentionUsers ----------
    if (incomingMsg === '@mentionUsers') {
        console.log('[DEBUG] @mentionUsers triggered by user:', msg.from);
        try {
            const chat = await msg.getChat();
            const userNumber = 'XXXXXXXXXX'; // Replace with a valid number
            await chat.sendMessage(`Hi @${userNumber}`, { mentions: [`${userNumber}@c.us`] });
            await chat.sendMessage(
                `Hi @${userNumber}, @${userNumber}`,
                { mentions: [`${userNumber}@c.us`, `${userNumber}@c.us`] }
            );
        } catch (error) {
            console.error('Error handling @mentionUsers:', error);
            msg.reply('An error occurred while mentioning users.');
        }
        return;
    }

    // ---------- @mentionGroups ----------
    if (incomingMsg === '@mentionGroups') {
        console.log('[DEBUG] @mentionGroups triggered by user:', msg.from);
        try {
            const chat = await msg.getChat();
            const groupId = 'YYYYYYYYYY@g.us'; // Replace with a valid group ID
            await chat.sendMessage(`Check the last message here: @${groupId}`, {
                groupMentions: { subject: 'GroupSubject', id: groupId }
            });
            await chat.sendMessage(
                `Check the last message in these groups: @${groupId}, @${groupId}`,
                {
                    groupMentions: [
                        { subject: 'FirstGroup', id: groupId },
                        { subject: 'SecondGroup', id: groupId }
                    ]
                }
            );
        } catch (error) {
            console.error('Error handling @mentionGroups:', error);
            msg.reply('An error occurred while mentioning groups.');
        }
        return;
    }

    // ---------- @getGroupMentions ----------
    if (incomingMsg === '@getGroupMentions') {
        console.log('[DEBUG] @getGroupMentions triggered by user:', msg.from);
        try {
            const groupId = 'ZZZZZZZZZZ@g.us';
            let sentMsg = await client.sendMessage(
                msg.from,
                `Check the last message here: @${groupId}`,
                { groupMentions: { subject: 'GroupSubject', id: groupId } }
            );
            const groupMentions = await sentMsg.getGroupMentions();
            console.log('Group Mentions:', groupMentions);
            msg.reply(`Group Mentions: ${JSON.stringify(groupMentions)}`);
        } catch (error) {
            console.error('Error handling @getGroupMentions:', error);
            msg.reply('An error occurred while getting group mentions.');
        }
        return;
    }

    // ---------- @delete ----------
    if (incomingMsg === '@delete') {
        console.log('[DEBUG] @delete triggered by user:', msg.from);
        try {
            if (msg.hasQuotedMsg) {
                const quotedMsg = await msg.getQuotedMessage();
                if (quotedMsg.fromMe) {
                    await quotedMsg.delete(true);
                    msg.reply('Message deleted successfully.');
                } else {
                    msg.reply('I can only delete my own messages.');
                }
            } else {
                msg.reply('Please quote a message to delete.');
            }
        } catch (error) {
            console.error('Error handling @delete:', error);
            msg.reply('An error occurred while deleting the message.');
        }
        return;
    }

    // ---------- @pin ----------
    if (incomingMsg === '@pin') {
        console.log('[DEBUG] @pin triggered by user:', msg.from);
        try {
            const chat = await msg.getChat();
            await chat.pin();
            msg.reply('Chat pinned successfully.');
        } catch (error) {
            console.error('Error handling @pin:', error);
            msg.reply('An error occurred while pinning the chat.');
        }
        return;
    }

    // ---------- @archive ----------
    if (incomingMsg === '@archive') {
        console.log('[DEBUG] @archive triggered by user:', msg.from);
        try {
            const chat = await msg.getChat();
            await chat.archive();
            msg.reply('Chat archived successfully.');
        } catch (error) {
            console.error('Error handling @archive:', error);
            msg.reply('An error occurred while archiving the chat.');
        }
        return;
    }

    // ---------- @mute ----------
    if (incomingMsg === '@mute') {
        console.log('[DEBUG] @mute triggered by user:', msg.from);
        try {
            const chat = await msg.getChat();
            const unmuteDate = new Date();
            unmuteDate.setSeconds(unmuteDate.getSeconds() + 20);
            await chat.mute(unmuteDate);
            msg.reply('Chat muted for 20 seconds.');
        } catch (error) {
            console.error('Error handling @mute:', error);
            msg.reply('An error occurred while muting the chat.');
        }
        return;
    }

    // ---------- @typing ----------
    if (incomingMsg === '@typing') {
        console.log('[DEBUG] @typing triggered by user:', msg.from);
        try {
            const chat = await msg.getChat();
            chat.sendStateTyping();
        } catch (error) {
            console.error('Error handling @typing:', error);
            msg.reply('An error occurred while simulating typing.');
        }
        return;
    }

    // ---------- @recording ----------
    if (incomingMsg === '@recording') {
        console.log('[DEBUG] @recording triggered by user:', msg.from);
        try {
            const chat = await msg.getChat();
            chat.sendStateRecording();
        } catch (error) {
            console.error('Error handling @recording:', error);
            msg.reply('An error occurred while simulating recording.');
        }
        return;
    }

    // ---------- @clearstate ----------
    if (incomingMsg === '@clearstate') {
        console.log('[DEBUG] @clearstate triggered by user:', msg.from);
        try {
            const chat = await msg.getChat();
            chat.clearState();
        } catch (error) {
            console.error('Error handling @clearstate:', error);
            msg.reply('An error occurred while clearing state.');
        }
        return;
    }

    // ---------- @jumpto ----------
    if (incomingMsg === '@jumpto') {
        console.log('[DEBUG] @jumpto triggered by user:', msg.from);
        try {
            if (msg.hasQuotedMsg) {
                const quotedMsg = await msg.getQuotedMessage();
                client.interface.openChatWindowAt(quotedMsg.id._serialized);
            } else {
                msg.reply('Please quote a message to jump to.');
            }
        } catch (error) {
            console.error('Error handling @jumpto:', error);
            msg.reply('An error occurred while jumping to the quoted message.');
        }
        return;
    }

    // ---------- @buttons ----------
    if (incomingMsg === '@buttons') {
        console.log('[DEBUG] @buttons triggered by user:', msg.from);
        try {
            let button = new Buttons('Button body', [
                { body: 'bt1' },
                { body: 'bt2' },
                { body: 'bt3' }
            ], 'title', 'footer');
            await client.sendMessage(msg.from, button);
        } catch (error) {
            console.error('Error handling @buttons:', error);
            msg.reply('An error occurred while sending buttons.');
        }
        return;
    }

    // ---------- @list ----------
    if (incomingMsg === '@list') {
        console.log('[DEBUG] @list triggered by user:', msg.from);
        try {
            let sections = [
                {
                    title: 'sectionTitle',
                    rows: [
                        { title: 'ListItem1', description: 'desc' },
                        { title: 'ListItem2' }
                    ]
                }
            ];
            let list = new List('List body', 'btnText', sections, 'Title', 'footer');
            await client.sendMessage(msg.from, list);
        } catch (error) {
            console.error('Error handling @list:', error);
            msg.reply('An error occurred while sending the list.');
        }
        return;
    }

    // ---------- @reaction ----------
    if (incomingMsg === '@reaction') {
        console.log('[DEBUG] @reaction triggered by user:', msg.from);
        try {
            await msg.react('👍');
        } catch (error) {
            console.error('Error handling @reaction:', error);
            msg.reply('An error occurred while sending reaction.');
        }
        return;
    }

    // ---------- @sendpoll ----------
    if (incomingMsg === '@sendpoll') {
        console.log('[DEBUG] @sendpoll triggered by user:', msg.from);
        try {
            await msg.reply(new Poll('Winter or Summer?', ['Winter', 'Summer']));
            await msg.reply(new Poll('Cats or Dogs?', ['Cats', 'Dogs'], { allowMultipleAnswers: true }));
            await msg.reply(
                new Poll(
                    'Cats or Dogs?',
                    ['Cats', 'Dogs'],
                    {
                        messageSecret: [
                            1, 2, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
                            0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
                        ]
                    }
                )
            );
        } catch (error) {
            console.error('Error handling @sendpoll:', error);
            msg.reply('An error occurred while sending poll.');
        }
        return;
    }

    // ---------- @edit ----------
    if (incomingMsg.startsWith('@edit')) {
        console.log('[DEBUG] @edit triggered by user:', msg.from);
        try {
            if (msg.hasQuotedMsg) {
                const quotedMsg = await msg.getQuotedMessage();
                if (quotedMsg.fromMe) {
                    // Replace '@edit' with an empty string
                    await quotedMsg.edit(incomingMsg.replace('@edit', '').trim());
                    msg.reply('Message edited successfully.');
                } else {
                    msg.reply('I can only edit my own messages.');
                }
            } else {
                msg.reply('Please quote a message to edit.');
            }
        } catch (error) {
            console.error('Error handling @edit:', error);
            msg.reply('An error occurred while editing the quoted message.');
        }
        return;
    }

    // ---------- @updatelabels ----------
    if (incomingMsg === '@updatelabels') {
        console.log('[DEBUG] @updatelabels triggered by user:', msg.from);
        try {
            const chat = await msg.getChat();
            await chat.changeLabels([0, 1]);
            msg.reply('Labels updated to [0,1].');
        } catch (error) {
            console.error('Error handling @updatelabels:', error);
            msg.reply('An error occurred while updating labels.');
        }
        return;
    }

    // ---------- @addlabels ----------
    if (incomingMsg === '@addlabels') {
        console.log('[DEBUG] @addlabels triggered by user:', msg.from);
        try {
            const chat = await msg.getChat();
            let labels = (await chat.getLabels()).map(l => l.id);
            // Add label '0' and '1'
            labels.push('0', '1');
            await chat.changeLabels(labels);
            msg.reply(`Labels added. Current labels: ${labels.join(', ')}`);
        } catch (error) {
            console.error('Error handling @addlabels:', error);
            msg.reply('An error occurred while adding labels.');
        }
        return;
    }

    // ---------- @removelabels ----------
    if (incomingMsg === '@removelabels') {
        console.log('[DEBUG] @removelabels triggered by user:', msg.from);
        try {
            const chat = await msg.getChat();
            await chat.changeLabels([]);
            msg.reply('All labels removed from this chat.');
        } catch (error) {
            console.error('Error handling @removelabels:', error);
            msg.reply('An error occurred while removing labels.');
        }
        return;
    }

    // ---------- @approverequest ----------
    if (incomingMsg === '@approverequest') {
        console.log('[DEBUG] @approverequest triggered by user:', msg.from);
        try {
            // NOTE: This is just a demonstration of various calls
            // Replace 'number@c.us' with your actual requesters or handle dynamically.
            await client.approveGroupMembershipRequests(msg.from, { requesterIds: 'number@c.us' });
            const group = await msg.getChat();
            await group.approveGroupMembershipRequests({ requesterIds: 'number@c.us' });

            const approval = await client.approveGroupMembershipRequests(msg.from, {
                requesterIds: ['number1@c.us', 'number2@c.us']
            });
            console.log('Approval:', approval);

            // Additional calls just for demonstration:
            await client.approveGroupMembershipRequests(msg.from);
            await client.approveGroupMembershipRequests(msg.from, {
                requesterIds: ['number1@c.us', 'number2@c.us'],
                sleep: 300
            });
            await client.approveGroupMembershipRequests(msg.from, {
                requesterIds: ['number1@c.us', 'number2@c.us'],
                sleep: [100, 300]
            });
            await client.approveGroupMembershipRequests(msg.from, {
                requesterIds: ['number1@c.us', 'number2@c.us'],
                sleep: null
            });

            msg.reply('Group membership requests approved (demonstration).');
        } catch (error) {
            console.error('Error handling @approverequest:', error);
            msg.reply('An error occurred while approving group membership requests.');
        }
        return;
    }

    // ---------- @pinmsg ----------
    if (incomingMsg === '@pinmsg') {
        console.log('[DEBUG] @pinmsg triggered by user:', msg.from);
        try {
            // This command typically requires the user to quote a message to pin,
            // but as in your existing code, it tries to pin 'msg' itself
            const result = await msg.pin(60);
            console.log('Pin result:', result);
            msg.reply('Message pinned for 60 seconds.');
        } catch (error) {
            console.error('Error handling @pinmsg:', error);
            msg.reply('An error occurred while pinning the message.');
        }
        return;
    }

    // ---------- @howManyConnections ----------
    if (incomingMsg === '@howManyConnections') {
        console.log('[DEBUG] @howManyConnections triggered by user:', msg.from);
        try {
            let deviceCount = await client.getContactDeviceCount(msg.from);
            await msg.reply(`You have *${deviceCount}* devices connected.`);
        } catch (error) {
            console.error('Error handling @howManyConnections:', error);
            msg.reply('An error occurred while retrieving device count.');
        }
        return;
    }

    // ---------- @syncHistory ----------
    if (incomingMsg === '@syncHistory') {
        console.log('[DEBUG] @syncHistory triggered by user:', msg.from);
        try {
            const isSynced = await client.syncHistory(msg.from);
            await msg.reply(isSynced ? 'Historical chat is syncing..' : 'There is no historical chat to sync.');
        } catch (error) {
            console.error('Error handling @syncHistory:', error);
            msg.reply('An error occurred while syncing history.');
        }
        return;
    }

    // ---------- @statuses ----------
    if (incomingMsg === '@statuses') {
        console.log('[DEBUG] @statuses triggered by user:', msg.from);
        try {
            const statuses = await client.getBroadcasts();
            console.log('Broadcast statuses:', statuses);
            const chat = await statuses[0]?.getChat();
            console.log('Chat of first status:', chat);
            msg.reply('Statuses fetched. Check console logs for details.');
        } catch (error) {
            console.error('Error handling @statuses:', error);
            msg.reply('An error occurred while fetching statuses.');
        }
        return;
    }

    console.log('[DEBUG] No commands');
});

client.on('message_create', async (msg) => {
    console.log('--- message_create event triggered ---');
    console.log('Message info:', msg.id._serialized);
    if (msg.fromMe) {
        console.log('Message from me:', msg.body);
    }

    // Example for unpin:
    if (msg.fromMe && msg.body.startsWith('@unpin')) {
        console.log('[DEBUG] @unpin triggered by me:', msg.from);
        try {
            const pinnedMsg = await msg.getQuotedMessage();
            if (pinnedMsg) {
                const result = await pinnedMsg.unpin();
                console.log('Unpin result:', result);
                msg.reply('Message unpinned successfully.');
            } else {
                msg.reply('Please quote a pinned message to unpin.');
            }
        } catch (error) {
            console.error('Error handling @unpin:', error);
            msg.reply('An error occurred while unpinning the message.');
        }
    }
});

// No need to export handleMessage as it is not used elsewhere.
module.exports = {};
