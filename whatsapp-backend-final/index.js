const express = require('express');
const cors = require('cors');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const fetch = require('node-fetch');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const sessions = {};
const n8nWebhookUrl = 'https://vitallink.app.n8n.cloud/webhook-test/whatsapp-connected';

console.log('Starting server...');

app.post('/start-session', (req, res) => {
    const { userId } = req.body;
    if (!userId) {
        return res.status(400).json({ success: false, error: 'userId is required' });
    }

    console.log(`Starting session for userId: ${userId}`);
    const sessionId = `session-${userId}`;

    if (sessions[sessionId] && sessions[sessionId].ready) {
        console.log(`Session for ${userId} is already ready.`);
        return res.json({ success: true, message: "Client is already connected!" });
    }
    
    if (sessions[sessionId] && sessions[sessionId].client) {
         console.log(`Initialization already in progress for ${userId}.`);
    } else {
        const client = new Client({
            authStrategy: new LocalAuth({ clientId: sessionId }),
            puppeteer: {
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--single-process',
                    '--disable-gpu'
                ]
            }
        });

        client.on('qr', async (qr) => {
            console.log(`QR code generated for ${userId}`);
            try {
                const qrCodeBase64 = await qrcode.toDataURL(qr);
                if (sessions[sessionId]) {
                    sessions[sessionId].qr = qrCodeBase64;
                }
            } catch (err) {
                console.error('Error generating QR code data URL', err);
            }
        });

        client.on('ready', async () => {
            console.log(`WhatsApp client is ready for ${userId}!`);
            if (sessions[sessionId]) {
                sessions[sessionId].ready = true;
                delete sessions[sessionId].qr;
            }

            // Notificar o n8n
            const payload = {
                userId: userId,
                sessionId: sessionId,
                status: 'connected',
                meta: {
                    timestamp: new Date().toISOString(),
                    clientInfo: client.info
                }
            };

            try {
                console.log('Notifying n8n webhook...');
                const n8nResponse = await fetch(n8nWebhookUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (n8nResponse.ok) {
                    console.log('n8n webhook notified successfully.');
                } else {
                    const responseBody = await n8nResponse.text();
                    console.error(`Failed to notify n8n webhook. Status: ${n8nResponse.status}`, responseBody);
                }
            } catch (error) {
                console.error('Error calling n8n webhook:', error);
            }
        });

        client.on('auth_failure', msg => {
            console.error(`Authentication failure for ${userId}:`, msg);
             if (sessions[sessionId]) {
                sessions[sessionId].client.destroy();
                delete sessions[sessionId];
            }
        });

        client.on('disconnected', (reason) => {
            console.log(`Client for ${userId} was logged out:`, reason);
            if (sessions[sessionId]) {
                sessions[sessionId].client.destroy();
                delete sessions[sessionId];
            }
        });
        
        console.log(`Initializing new client for ${userId}`);
        sessions[sessionId] = { client, ready: false, qr: null };
        client.initialize().catch(err => console.error(`Failed to initialize client for ${userId}:`, err));
    }

    let attempts = 0;
    const interval = setInterval(() => {
        if (sessions[sessionId] && sessions[sessionId].qr) {
            clearInterval(interval);
            console.log(`Sending QR code to client for ${userId}`);
            res.json({ success: true, qr: sessions[sessionId].qr });
        } else if (sessions[sessionId] && sessions[sessionId].ready) {
            clearInterval(interval);
            console.log(`Informing client that session is ready for ${userId}`);
            res.json({ success: true, message: "Client is already connected!" });
        } else if (attempts > 30) {
            clearInterval(interval);
            console.log(`QR code generation timed out for ${userId}`);
            res.status(500).json({ success: false, error: 'QR code generation timed out.' });
             if (sessions[sessionId]) {
                sessions[sessionId].client.destroy();
                delete sessions[sessionId];
            }
        }
        attempts++;
    }, 1000);
});

app.post('/send-message', async (req, res) => {
    const { userId, number, message } = req.body;
    if (!userId || !number || !message) {
        return res.status(400).json({ error: 'userId, number and message are required' });
    }

    const sessionId = `session-${userId}`;
    const session = sessions[sessionId];

    if (session && session.ready) {
        try {
            const chatId = `${number}@c.us`;
            await session.client.sendMessage(chatId, message);
            res.json({ success: true, message: 'Message sent successfully.' });
        } catch (error) {
            console.error('Failed to send message:', error);
            res.status(500).json({ success: false, error: 'Failed to send message.' });
        }
    } else {
        res.status(404).json({ success: false, error: 'Session not found or not ready.' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
