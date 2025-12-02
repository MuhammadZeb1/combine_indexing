const UserToken = require("../models/userTokenModel");
const Campaign = require("../models/campaignModel");
const { indexingQueue } = require("../queue/queueService");
const { v4: uuidv4 } = require("uuid");
const { updateSitemap } = require("../utlis/sitemapGenerator");

const DEFAULT_CREDITS = 500;

exports.submitCampaign = async (req, res) => {
  const { campaignName, urls, clientToken } = req.body;
  console.log("Received submission:", {
    campaignName,
    urls,
    urlCount: urls.length,
    clientToken,
  });
  const urlCount = urls.length;
  const requiredCredits = urlCount;

  if (!campaignName || urlCount === 0 || urlCount > 200) {
    return res
      .status(400)
      .json({ message: "Invalid submission data. Must be 1-200 URLs." });
  }

  let sessionToken = clientToken;

  // --- 1. Find or Create UserToken (Anonymous Authentication) ---
  let user;
  try {
    if (sessionToken) {
      user = await UserToken.findOne({ token: sessionToken });
    }

    // If token invalid/not provided, create a new user/token
    if (!user) {
      sessionToken = uuidv4();
      user = new UserToken({
        token: sessionToken,
        remainingCredits: DEFAULT_CREDITS,
      });
    }
  } catch (err) {
    return res.status(500).json({ message: "Error retrieving user state." });
  }

  // --- 2. Credit Check ---
  if (user.remainingCredits < requiredCredits) {
    // Return the token so the client can display the current state
    return res.status(402).json({
      message: `Insufficient credits. Need ${requiredCredits}, have ${user.remainingCredits}.`,
      newCampaignToken: sessionToken,
    });
  }

  // --- 3. Deduct Credits & Save Campaign ---
  try {
    user.remainingCredits -= requiredCredits;
    const newCampaign = new Campaign({
      userId: sessionToken,
      token: sessionToken,
      name: campaignName,
      urls: urls,
      totalUrls: urlCount,
    });

    // Use Promise.all to save both simultaneously (Requires MongoDB Transactions for true safety!)
    await Promise.all([user.save(), newCampaign.save()]);
    // 🔥 UPDATE SITEMAP AFTER NEW CAMPAIGN IS SAVED
    await updateSitemap();
    // --- 4. Delegate Task to Background Queue ---
    await indexingQueue.add(
      "index-urls",
      { campaignId: newCampaign._id.toString(), urls: urls },
      {
        removeOnComplete: true,
        removeOnFail: false,
      }
    );

    return res.status(201).json({
      message: "Campaign submitted successfully!",
      newCampaignToken: sessionToken, // Return the token for the client to store
      remainingCredits: user.remainingCredits,
    });
  } catch (error) {
    console.error("Submission transaction failed:", error);
    return res
      .status(500)
      .json({ message: "Server error during submission process." });
  }
};

exports.getCredits = async (req, res) => {
  const { token } = req.query;
  try {
    const user = await UserToken.findOne({ token });
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }
    res.json({ remainingCredits: user.remainingCredits });
  } catch (error) {
    res.status(500).json({ message: "Error fetching credits." });
  }
};

exports.getCampaigns = async (req, res) => {
  const { token } = req.query;

  try {
    // Sort by creation date descending (latest first)
    const campaigns = await Campaign.find({ token }).sort({ createdAt: -1 });

    // Only return the necessary display data, not the full URL list
    const campaignData = campaigns.map((c) => ({
      _id: c._id,
      name: c.name,
      totalUrls: c.totalUrls,
      indexedCount: c.indexedCount,
      status: c.status,
    }));
    // console.log("staus", campaignData);
    res.json({ campaigns: campaignData });
  } catch (error) {
    res.status(500).json({ message: "Error fetching campaigns." });
  }
};
