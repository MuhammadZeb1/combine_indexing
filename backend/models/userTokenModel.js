const mongoose = require('mongoose');

const UserTokenSchema = new mongoose.Schema({
    token: { 
        type: String, 
        required: true, 
        unique: true,
        index: true 
    }, 
    remainingCredits: { 
        type: Number, 
        default: 500 
    }, 
    // This array is often used to quickly link campaigns to the user, but 
    // linking via the 'token' field in the Campaign model is sufficient.
    // campaigns: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Campaign' }] 
}, { timestamps: true });

module.exports = mongoose.model('UserToken', UserTokenSchema);