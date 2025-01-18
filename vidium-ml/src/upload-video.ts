import fs from 'fs';
import path from 'path';
import { google, youtube_v3 } from 'googleapis';
import axios from 'axios';
import readline from 'readline';


const VIDEO_PATH = path.resolve('./vid.mp4');
const THUMBNAIL_PATH = path.resolve('./thumbnail.png');
const API_BASE_URL = 'http://localhost:80'; // Assuming backend is running on localhost
const TOKEN_PATH = path.resolve('./client_oauth_token.json');

interface OAuthTokens {
    access_token: string;
    refresh_token: string;
    expiry_date: number;
}


export async function uploadVideo(title: string, description: string, tags: string[]): Promise<void> {
    // Verify required files exist
    verifyFileExists(VIDEO_PATH, 'Video file not found.');
    verifyFileExists(THUMBNAIL_PATH, 'Thumbnail file not found.');

    try {
        // Step 1: Get the OAuth2 token from the local storage (or request a refresh if expired)
        const tokens = await getOAuthTokens();

        // Step 2: Upload the video to YouTube using the access token
        await upload(tokens, title, description, tags);
    } catch (err) {
        console.error('Error uploading video:', err);
    }
}

function verifyFileExists(filePath: string, errorMessage: string): void {
    if (!fs.existsSync(filePath)) {
        throw new Error(errorMessage);
    }
}


async function getOAuthTokens(): Promise<OAuthTokens> {
    try {
        const tokens = getStoredTokens();

        if (isTokenExpired(tokens)) {
            console.log('Token expired, refreshing...');
            const refreshedTokens = await refreshAccessToken(tokens.refresh_token);
            tokens.access_token = refreshedTokens.access_token;
            storeTokens(tokens);
            return tokens;
        }

        return tokens;
    } catch (err) {
        console.log('No tokens found or invalid tokens, requesting new token...');
        // If no token is stored or invalid, request a new one from the server
        const newTokens = await requestNewTokenFromServer();
        storeTokens(newTokens); // Save the new tokens
        return newTokens;
    }
}

function getStoredTokens(): OAuthTokens {
    const content = fs.readFileSync(TOKEN_PATH, 'utf8');
    return JSON.parse(content);
}

function storeTokens(tokens: OAuthTokens): void {
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
}

function isTokenExpired(tokens: OAuthTokens): boolean {
    const expiryTime = tokens.expiry_date;
    return expiryTime && new Date(expiryTime) <= new Date();
}

async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string }> {
    const response = await axios.post(`${API_BASE_URL}/refresh-token`, {
        refresh_token: refreshToken,
    });
    return response.data; // Return the new access token
}

async function requestNewTokenFromServer(): Promise<OAuthTokens> {
    try {
        const response = await axios.get(`${API_BASE_URL}/generate-token`);
        const authUrl = response.data.authUrl;

        console.log('Please visit this URL to authorize the app:', authUrl);

        const code = await promptForCode();
        const tokensResponse = await axios.get(`${API_BASE_URL}/auth/callback?code=${code}`);
        return tokensResponse.data.tokens;
    } catch (err) {
        throw new Error('Failed to request new token from the server: ' + err.message);
    }
}

async function upload(tokens: OAuthTokens, title: string, description: string, tags: string[]): Promise<void> {
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials(tokens);

    const service = google.youtube('v3');

    try {
        const videoResponse = await service.videos.insert({
            auth: oauth2Client,
            part: ['snippet', 'status'],
            requestBody: {
                snippet: {
                    title,
                    description,
                    tags,
                    categoryId: '28', // Science and Technology
                    defaultLanguage: 'en',
                    defaultAudioLanguage: 'en',
                },
                status: {
                    privacyStatus: 'private',
                },
            },
            media: {
                body: fs.createReadStream(VIDEO_PATH),
            },
        });

        console.log('Video uploaded:', videoResponse.data);

    } catch (err) {
        console.error('Error uploading video:', err);
    }
}

function promptForCode(): Promise<string> {
    return new Promise((resolve) => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        rl.question('Please enter the authorization code: ', (code) => {
            rl.close();
            resolve(code);
        });
    });
}



async function uploadThumbnail(oauth2Client: any, videoId: string): Promise<void> {
    const service = google.youtube('v3');

    try {
        const thumbnailResponse = await service.thumbnails.set({
            auth: oauth2Client,
            videoId,
            media: {
                body: fs.createReadStream(THUMBNAIL_PATH),
            },
        });

        console.log('Thumbnail uploaded:', thumbnailResponse.data);
    } catch (err) {
        console.error('Error uploading thumbnail:', err);
    }
}

uploadVideo('Test Video2', 'This is a description2', ['tag2', 'tag4']);
