// utils/googleIndexing.js
const { google } = require('googleapis');
const axios = require('axios');
const path = require('path');
// require('dotenv').config();
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });

// const KEY_FILE_PATH = path.join(__dirname, '../google-service-account.json');
const GOOGLE_PROJECT_ID = process.env.GOOGLE_PROJECT_ID;
const GOOGLE_CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL;
const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n");


async function submitToGoogle(url) {
    try {
        const auth = new google.auth.GoogleAuth({
            credentials: {
                project_id: GOOGLE_PROJECT_ID,
                client_email: GOOGLE_CLIENT_EMAIL,
                private_key: GOOGLE_PRIVATE_KEY,
            },
            scopes: ['https://www.googleapis.com/auth/indexing'],
        });
        const authClient = await auth.getClient();
        const requestBody = { url, type: 'URL_UPDATED' };

        const response = await axios.post(
            'https://indexing.googleapis.com/v3/urlnotifications:publish',
            requestBody,
            { headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authClient.credentials.access_token}` } }
        );

        if (response.status === 200 || response.status === 202) {
            console.log(`[Google API] Successfully submitted: ${url}`);
            return true;
        }
    } catch (err) {
        console.error(`[Google API Error] Failed: ${url} → ${err.message}`);
    }
    return false;
}

module.exports = { submitToGoogle };
