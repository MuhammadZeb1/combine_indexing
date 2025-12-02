// utils/sitemapGenerator.js
const Campaign = require("../models/campaignModel");

/**
 * Generates an XML sitemap string from an array of URLs.
 * Replaces any localhost URLs with the production baseDomain.
 * @param {string[]} urls - Array of URLs to include in the sitemap.
 * @param {string} campaignId - The campaign ID for logging/context.
 * @param {string} baseDomain - The production BASE_DOMAIN to use.
 * @returns {string} - A complete XML sitemap string.
 */
function generateSitemapXml(urls, campaignId, baseDomain) {
    if (!urls || urls.length === 0) {
        return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>`;
    }

    const lastModDate = new Date().toISOString().split("T")[0];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

    urls.forEach((url) => {
        if (url) {
            // Replace any localhost URLs with the production domain
            const fixedUrl = url.replace(/http:\/\/localhost:\d+/i, baseDomain);
            xml += `
    <url>
        <loc>${fixedUrl}</loc>
        <lastmod>${lastModDate}</lastmod>
        <changefreq>daily</changefreq>
        <priority>0.8</priority>
    </url>`;
        }
    });

    xml += `
</urlset>`;

    console.log(
        `[Sitemap Generator] Successfully generated sitemap XML for campaign ${campaignId} with ${urls.length} URLs.`
    );
    return xml;
}

/**
 * Factory function to create an Express route handler with injected BASE_DOMAIN.
 * Usage: app.get('/api/sitemap/:campaignId', serveSitemap(BASE_DOMAIN));
 * @param {string} baseDomain
 * @returns {function} Express route handler
 */
function serveSitemap(baseDomain) {
    return async (req, res) => {
        const { campaignId } = req.params;
        if (!campaignId) return res.status(400).send("Campaign ID required");

        try {
            const campaign = await Campaign.findById(campaignId, "sitemapUrls").exec();
            if (!campaign) return res.status(404).send("Campaign not found");

            const sitemapXml = generateSitemapXml(campaign.sitemapUrls, campaignId, baseDomain);

            res.set("Content-Type", "application/xml");
            res.send(sitemapXml);
        } catch (error) {
            console.error("[Sitemap Error]", error);
            res.status(500).send("Internal server error while generating sitemap.");
        }
    };
}

/**
 * Utility to generate a combined sitemap XML for all campaigns
 * @param {string} baseDomain
 * @returns {Promise<string>} sitemap XML string
 */
async function updateSitemap(baseDomain) {
    const campaigns = await Campaign.find({}, "urls").exec();
    const lastModDate = new Date().toISOString().split("T")[0];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

    campaigns.forEach((c) => {
        c.urls.forEach((url) => {
            const fixedUrl = url.replace(/http:\/\/localhost:\d+/i, baseDomain);
            xml += `
    <url>
        <loc>${fixedUrl}</loc>
        <lastmod>${lastModDate}</lastmod>
        <changefreq>daily</changefreq>
        <priority>0.8</priority>
    </url>`;
        });
    });

    xml += `</urlset>`;
    console.log("[Sitemap] Combined sitemap XML generated for all campaigns");
    return xml;
}

module.exports = {
    serveSitemap,
    generateSitemapXml,
    updateSitemap,
};
