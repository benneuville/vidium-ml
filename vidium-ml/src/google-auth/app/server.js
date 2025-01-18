import express from 'express';
import fs from 'fs';
import path from 'path';
import {google} from 'googleapis';
import {OAuth2Client} from 'google-auth-library';
import readline from 'readline/promises';

const app = express();
const port = 3000; // You can change this

const SCOPES = ['https://www.googleapis.com/auth/youtube.upload'];
const SECRET_PATH = path.resolve('./client_secrets.json');

const { OAuth2 } = google.auth;

app.get('/', (req, res) => {
    const { code } = req.query;

    if (!code) {
        return res.status(400).send('No verification code provided.');
    }

    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Verification Code</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    text-align: center;
                    padding: 20px;
                }
                .code-box {
                    font-size: 18px;
                    margin: 20px 0;
                    padding: 10px;
                    border: 1px solid #ccc;
                    background-color: #f9f9f9;
                    display: inline-block;
                    border-radius: 4px;
                }
                button {
                    padding: 10px 15px;
                    font-size: 16px;
                    cursor: pointer;
                    background-color: #007BFF;
                    color: white;
                    border: none;
                    border-radius: 4px;
                }
                button:hover {
                    background-color: #0056b3;
                }
            </style>
        </head>
        <body>
            <h1>Google OAuth Verification Code</h1>
            <p>Copy this verification code for your application:</p>
            <div class="code-box" id="code">${code}</div>
            <button onclick="copyCode()">Copy to Clipboard</button>

            <script>
                function copyCode() {
                    const codeElement = document.getElementById('code');
                    const range = document.createRange();
                    range.selectNode(codeElement);
                    window.getSelection().removeAllRanges();
                    window.getSelection().addRange(range);
                    document.execCommand('copy');
                    window.getSelection().removeAllRanges();
                    alert('Code copied to clipboard!');
                }
            </script>
        </body>
        </html>
    `);
});

app.get('/generate-token', async (req, res) => {
    try {
        const content = fs.readFileSync(SECRET_PATH, 'utf8');
        const credentials = JSON.parse(content);
        const oauth2Client = new OAuth2(credentials.web.client_id, credentials.web.client_secret, credentials.web.redirect_uris[0]);

        // Generate the auth URL
        const authUrl = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: SCOPES,
        });

        res.json({ authUrl }); // Send the URL to the client for authorization
    } catch (err) {
        console.error('Error generating token:', err);
        res.status(500).send('Error generating token.');
    }
});


app.get('/auth/callback', async (req, res) => {
    try {
        const { code } = req.query;

        const content = fs.readFileSync(SECRET_PATH, 'utf8');
        const credentials = JSON.parse(content);
        const oauth2Client = new OAuth2(credentials.web.client_id, credentials.web.client_secret, credentials.web.redirect_uris[0]);

        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);

        res.json({ tokens });
    } catch (err) {
        console.error('Error in OAuth2 callback:', err);
        res.status(500).send('Error during OAuth2 callback.');
    }
});

app.post('/refresh-token', async (req, res) => {
    try {
        const { refresh_token } = req.body;

        const content = fs.readFileSync(SECRET_PATH, 'utf8');
        const credentials = JSON.parse(content);
        const oauth2Client = new OAuth2(credentials.web.client_id, credentials.web.client_secret, credentials.web.redirect_uris[0]);

        oauth2Client.setCredentials({ refresh_token });

        // Get a new access token
        const { credentials: newTokens } = await oauth2Client.refreshAccessToken();
        console.log('New access token:', newTokens);

        // Send the new access token to the client
        res.json({ access_token: newTokens.access_token });
    } catch (err) {
        console.error('Error refreshing token:', err);
        res.status(500).send('Error refreshing token.');
    }
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
