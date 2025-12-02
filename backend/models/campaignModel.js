// const mongoose = require('mongoose');

// const CampaignSchema = new mongoose.Schema({
//     token: { 
//         type: String, 
//         required: true, 
//         index: true // Key for fetching user's campaign history
//     }, 
//     name: { 
//         type: String, 
//         required: true 
//     },
//     urls: [{ // Stores the full list of submitted URLs
//         type: String 
//     }], 
//     totalUrls: { 
//         type: Number, 
//         required: true 
//     },
//     indexedCount: { // Updated by the worker for progress tracking
//         type: Number, 
//         default: 0 
//     },
//     status: { 
//         type: String, 
//         default: 'Pending', 
//         enum: ['Pending', 'Processing', 'Complete', 'Failed'] 
//     }
// }, { timestamps: true });

// module.exports = mongoose.model('Campaign', CampaignSchema);
const mongoose = require('mongoose');

const campaignSchema = new mongoose.Schema({
    token: { type: String, required: true, index: true }, // Optional if you want token for user
    userId: { type: String, required: true }, // For identifying the user
    name: { type: String, required: true },
    urls: [{ type: String }], // All submitted URLs
    sitemapUrls: { type: [String], default: [] }, // For third-party automation
    totalUrls: { type: Number, required: true },
    indexedCount: { type: Number, default: 0 },
    status: { type: String, enum: ['Pending','Processing','Complete','Failed'], default: 'Pending' }
}, { timestamps: true });

module.exports = mongoose.models.Campaign || mongoose.model('Campaign', campaignSchema);
