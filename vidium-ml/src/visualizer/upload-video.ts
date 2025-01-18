import fs from 'fs';
import path from 'path';
import { google } from 'googleapis';
import axios from 'axios';


const API_BASE_URL = 'https://dorianbouchard.com'; //
const TOKEN_PATH = path.resolve('./client_oauth_token.json');

export interface OAuthTokens {
    access_token: string;
    refresh_token: string;
    expiry_date: number;
}


export async function uploadVideo(title: string, description: string, tags: string[], videoPath: string): Promise<void> {
    // Verify required files exist
    verifyFileExists(videoPath, 'Video file not found.');

    try {
        // Step 1: Get the OAuth2 token from the local storage (or request a refresh if expired)
        const tokens = getTokens();

        // Step 2: Upload the video to YouTube using the access token
        await upload(tokens, title, description, tags, videoPath);
    } catch (err) {
        console.error('Error uploading video:', err);
    }
}

function verifyFileExists(filePath: string, errorMessage: string): void {
    if (!fs.existsSync(filePath)) {
        throw new Error(errorMessage);
    }
}

function getTokens(): OAuthTokens {
    const content = fs.readFileSync(TOKEN_PATH, 'utf8');
    return JSON.parse(content);
}

export function storeTokens(tokens: OAuthTokens): void {
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
}

function isTokenExpired(tokens: OAuthTokens): boolean {
    const expiryTime = tokens.expiry_date;
    return !!expiryTime && (new Date(expiryTime) <= new Date());
}

export async function refreshAccessToken(refreshToken: string): Promise<void> {
    const response = await axios.post(`${API_BASE_URL}/refresh-token`, {
        refresh_token: refreshToken,
    });
    storeTokens(response.data);
}

async function upload(tokens: OAuthTokens, title: string, description: string, tags: string[], videoPath: string): Promise<void> {
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
                body: fs.createReadStream(videoPath),
            },
        });

        console.log('Video uploaded:', videoResponse.data);

    } catch (err) {
        console.error('Error uploading video:', err);
    }
}


export async function getAuthUrlFromServer(): Promise<string> {
    const response = await axios.get(`${API_BASE_URL}/generate-token`);
    return response.data.authUrl;
}

export async function exchangeCodeForTokens(code: string): Promise<OAuthTokens> {
    const response = await axios.get(`${API_BASE_URL}/auth/callback?code=${code}`);
    return response.data.tokens;
}

export function tokenExists(): boolean {
    return fs.existsSync(TOKEN_PATH);
}

export async function refreshIfExpired(): Promise<void> {
    const tokens = getTokens();
    if (isTokenExpired(tokens)) {
        await refreshAccessToken(tokens.refresh_token);
    }
}