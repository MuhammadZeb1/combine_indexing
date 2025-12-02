require("../config/db"); // Ensure MongoDB is connected
const path = require("path");

require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

console.log(
  "GOOGLE_PRIVATE_KEY exists?",
  process.env.GOOGLE_PRIVATE_KEY ? "Yes" : "No"
);

const { Worker } = require("bullmq");
const mongoose = require("mongoose");
const axios = require("axios");
const { google } = require("googleapis");
// const path = require("path");
const Campaign = require("../models/campaignModel");

// // --- CONFIGURATION ---
console.log("first");
console.log(
  "DOTENV VARIABLES:",
  process.env.GOOGLE_PROJECT_ID,
  process.env.GOOGLE_CLIENT_EMAIL,
  process.env.GOOGLE_PRIVATE_KEY ? "OK" : "MISSING"
);

// const connection = { host: '127.0.0.1', port: 6379 };
const connection = {
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT),
  password: process.env.REDIS_PASSWORD,
  tls: true, // Because Upstash uses TLS
};
// const BING_API_KEY = process.env.BING_API_KEY || 'YOUR_BING_API_KEY';
// const VERIFIED_DOMAINS = ['orung.com', 'sub.orung.com'];
// const KEY_FILE_PATH = path.join(__dirname, '../google-service-account.json');

// --- CONFIGURATION ---const BING_API_KEY = process.env.BING_API_KEY;
const VERIFIED_DOMAINS = process.env.VERIFIED_DOMAINS.split(",");
const GOOGLE_PROJECT_ID = process.env.GOOGLE_PROJECT_ID;
// console.log("khan",process.env.GOOGLE_CLIENT_EMAIL)
const GOOGLE_CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL;
// console.log("khan",process.env.GOOGLE_PRIVATE_KEY)
const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n");
console.log("goole private key", GOOGLE_PRIVATE_KEY);

// --- HELPER FUNCTIONS ---

// Check if URL belongs to your verified domain
function isOwnedDomain(url) {
  try {
    const hostname = new URL(url).hostname;
    return VERIFIED_DOMAINS.some((domain) => hostname.endsWith(domain));
  } catch {
    return false;
  }
}

// Submit URL to Bing API
async function callPingService(url) {
  try {
    await axios.post(
      "https://ssl.bing.com/webmaster/api.svc/json/SubmitUrlBatch",
      { siteUrl: "https://yourdomain.com", urlList: [url] },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${BING_API_KEY}`,
        },
      }
    );
    console.log(`[Bing API] Submitted: ${url}`);
    return true;
  } catch (err) {
    console.error(`[Bing API Error] Failed: ${url} → ${err.message}`);
    return false;
  }
}

// Submit URL to Google Indexing API
async function submitToGoogle(url) {
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        project_id: GOOGLE_PROJECT_ID,
        client_email: GOOGLE_CLIENT_EMAIL,
        private_key: GOOGLE_PRIVATE_KEY,
      },
      scopes: ["https://www.googleapis.com/auth/indexing"],
    });
    const authClient = await auth.getClient();
    const requestBody = { url, type: "URL_UPDATED" };

    const response = await axios.post(
      "https://indexing.googleapis.com/v3/urlnotifications:publish",
      requestBody,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authClient.credentials.access_token}`,
        },
      }
    );

    if (response.status === 200 || response.status === 202) {
      console.log(`[Google API] Submitted: ${url}`);
      return true;
    }
    console.error(`[Google API Warning] Status ${response.status} for ${url}`);
    return false;
  } catch (err) {
    console.error(`[Google API Error] Failed: ${url} → ${err.message}`);
    return false;
  }
}

// Add URL to campaign sitemap
async function callSitemapInjection(url, campaignId) {
  try {
    await Campaign.updateOne(
      { _id: campaignId },
      { $push: { sitemapUrls: url } }
    );
    console.log(`[Sitemap] Added to campaign ${campaignId}: ${url}`);
    return true;
  } catch (err) {
    console.error(
      `[Sitemap Error] Failed for campaign ${campaignId}: ${err.message}`
    );
    return false;
  }
}

// --- BULLMQ WORKER ---
const worker = new Worker(
  "indexingQueue",
  async (job) => {
    const { campaignId, urls } = job.data;

    await Campaign.updateOne(
      { _id: campaignId },
      { $set: { status: "Processing" } }
    );
    let successfulSubmissions = 0;

    for (const url of urls) {
      let isSuccess = false;

      if (isOwnedDomain(url)) {
        // Automatically submit verified domain URLs to Google
        isSuccess = await submitToGoogle(url);
      } else {
        // Third-party URLs → Bing + Sitemap
        const pingSuccess = await callPingService(url);
        const sitemapSuccess = await callSitemapInjection(url, campaignId);
        isSuccess = pingSuccess || sitemapSuccess;
      }

      if (isSuccess) {
        successfulSubmissions++;
        await Campaign.updateOne(
          { _id: campaignId },
          { $inc: { indexedCount: 1 } }
        );
      }

      // Rate-limit to avoid hitting API quotas
      await new Promise((res) => setTimeout(res, 500));
    }

    // Mark campaign as complete
    await Campaign.updateOne(
      { _id: campaignId },
      { $set: { status: "Complete" } }
    );
    console.log(
      `Campaign ${campaignId} finished: ${successfulSubmissions}/${urls.length} URLs indexed.`
    );
  },
  { connection }
);

// Handle failed jobs
worker.on("failed", async (job, err) => {
  console.error(`Job ${job.id} failed →`, err);
  const campaignId = job.data?.campaignId;
  if (campaignId) {
    await Campaign.updateOne(
      { _id: campaignId },
      { $set: { status: "Failed", lastError: `Worker failed: ${err.message}` } }
    ).catch((dbErr) =>
      console.error("Failed to update campaign status:", dbErr)
    );
  }
});

console.log("Indexing Worker running in production mode...");
