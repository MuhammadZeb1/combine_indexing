const express = require('express');
const bodyParser = require('body-parser');
require('dotenv').config(); // Load .env first
const cors = require('cors');
require('./config/db'); // Initialize MongoDB connection
const Campaign = require('./models/campaignModel');
const path = require('path');

const { serveSitemap } = require('./utlis/sitemapGenerator.js');

// const { serveSitemap, generateSitemapXml, updateSitemap } = require('../utils/sitemapGenerator.js');

const submissionController = require('./controllers/submissionController');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// Set BASE_DOMAIN dynamically for Railway deployment
const HARDCODED_RAILWAY_URL = "https://backend-url-indexing-production-b44f.up.railway.app";
const BASE_DOMAIN = process.env.RAILWAY_STATIC_URL
  ? `https://${process.env.RAILWAY_STATIC_URL}`
  : process.env.RAILWAY_URL
  ? process.env.RAILWAY_URL
  : HARDCODED_RAILWAY_URL;

console.log(`Base domain is: ${BASE_DOMAIN}`);

const app = express();
const PORT = 5000;

const _dirname = path.resolve();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(_dirname, 'public')));

// API Routes
app.post('/api/submit', submissionController.submitCampaign);
app.get('/api/credits', submissionController.getCredits);
app.get('/api/campaigns', submissionController.getCampaigns);

// ✅ Serve individual campaign sitemaps dynamically
app.get('/api/sitemap/:campaignId', serveSitemap(BASE_DOMAIN));

// 🔹 Sitemap Index Route
app.get('/sitemap-index.xml', async (req, res) => {
  try {
    const campaigns = await Campaign.find({}, '_id').exec();
    const lastModDate = new Date().toISOString().split('T')[0];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

    campaigns.forEach(campaign => {
      xml += `
  <sitemap>
    <loc>${BASE_DOMAIN}/api/sitemap/${campaign._id}</loc>
    <lastmod>${lastModDate}</lastmod>
  </sitemap>`;
    });

    xml += `</sitemapindex>`;
    res.set('Content-Type', 'application/xml');
    res.send(xml);
  } catch (err) {
    console.error('[Sitemap Index Error]', err);
    res.status(500).send('Internal server error');
  }
});

// 🔹 Robots.txt Route
app.get('/robots.txt', async (req, res) => {
  try {
    let robotsTxt = `User-agent: *\nDisallow: /admin/\n`;
    robotsTxt += `Sitemap: ${BASE_DOMAIN}/sitemap-index.xml\n`;

    res.type('text/plain');
    res.send(robotsTxt);
  } catch (err) {
    console.error('[Robots.txt Error]', err);
    res.status(500).send('Internal server error');
  }
});
app.use(express.static(path.join(_dirname, "frontend/dist")));
// This is correct for a catch-all/SPA route
app.all('/:path', (req, res) => {
    console.log("khan",path.join(_dirname, 'frontend',"dist", 'index.html'));
    res.sendFile(path.join(_dirname, 'frontend',"dist", 'index.html'));
});
// Start Server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
