import React, { useState, useEffect } from "react";
import axios from "axios";

const BASE_URL =
  process.env.NODE_ENV === "production"
    ? "https://backend-url-indexing-production-b44f.up.railway.app"
    : "http://localhost:5000";

function CampaignTool() {
  const [token, setToken] = useState(localStorage.getItem("campaignToken") || "");
  const [credits, setCredits] = useState("...");
  const [campaigns, setCampaigns] = useState([]);
  const [campaignName, setCampaignName] = useState("");
  const [urlsText, setUrlsText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const currentUrlCount = urlsText
    .split("\n")
    .map((url) => url.trim())
    .filter((url) => url.length > 0).length;

  const fetchData = async () => {
    if (!token) return;
    try {
      const creditRes = await axios.get(`${BASE_URL}/api/credits?token=${token}`);
      setCredits(creditRes.data.remainingCredits);

      const campaignRes = await axios.get(`${BASE_URL}/api/campaigns?token=${token}`);
      setCampaigns(campaignRes.data.campaigns || []);
      setError("");
    } catch (err) {
      setError("Could not connect to service or token invalid.");
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const urls = urlsText.split("\n").map((u) => u.trim()).filter((u) => u.length > 0);
    if (urls.length === 0 || urls.length > 200) {
      setError("Please submit between 1 and 200 URLs.");
      setLoading(false);
      return;
    }

    try {
      const res = await axios.post(`${BASE_URL}/api/submit`, {
        campaignName,
        urls,
        clientToken: token,
      });

      if (res.data.newCampaignToken && res.data.newCampaignToken !== token) {
        localStorage.setItem("campaignToken", res.data.newCampaignToken);
        setToken(res.data.newCampaignToken);
      }

      setCampaignName("");
      setUrlsText("");
      setCredits(res.data.remainingCredits);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || "Server error.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-10 px-4 font-sans text-gray-800">
      <h1 className="text-3xl font-bold mb-6 text-center">🔗 URL Indexing Campaign Tool</h1>

      {/* Credits */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg text-center py-4 mb-6 font-semibold">
        Current Credits:{" "}
        <span className={Number(credits) < 100 ? "text-red-600" : "text-green-600"}>
          {credits}
        </span>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded mb-6">
          🚨 {error}
        </div>
      )}

      {/* Campaign Form */}
      <div className="bg-white shadow rounded-lg p-6 mb-8 border">
        <h2 className="text-xl font-bold mb-4">Submit New Campaign</h2>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block font-medium mb-1">Campaign Name</label>
            <input
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
              required
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              placeholder="e.g., May 2025 Backlinks"
            />
          </div>
          <div>
            <label className="block font-medium mb-1">URLs (One per line, Max 200)</label>
            <textarea
              className="w-full border border-gray-300 rounded px-3 py-2 h-40 focus:outline-none focus:ring-2 focus:ring-purple-500"
              value={urlsText}
              onChange={(e) => setUrlsText(e.target.value)}
              placeholder="https://example.com/page1"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2 px-4 rounded text-white font-semibold transition ${
              loading ? "bg-gray-400 cursor-not-allowed" : "bg-purple-600 hover:bg-purple-700"
            }`}
          >
            {loading ? "Submitting..." : `Submit Campaign (${currentUrlCount} credits)`}
          </button>
        </form>
      </div>

      {/* Campaign Table */}
      <h2 className="text-xl font-bold mb-4">Campaign History & Progress</h2>
      <div className="border rounded-lg overflow-hidden">
        <div
          className={`overflow-y-auto`}
          style={{ maxHeight: campaigns.length > 6 ? "360px" : "auto" }}
        >
          <table className="min-w-full table-auto">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 text-left border-b">Name</th>
                <th className="px-4 py-2 border-b">Total</th>
                <th className="px-4 py-2 border-b">Status</th>
                <th className="px-4 py-2 border-b">Progress</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.length === 0 ? (
                <tr>
                  <td colSpan="4" className="text-center py-4 text-gray-500 border-b">
                    No campaigns found. Submit one above!
                  </td>
                </tr>
              ) : (
                campaigns.map((c) => {
                  const percent = Math.round((c.indexedCount / c.totalUrls) * 100);
                  return (
                    <tr key={c._id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 border-b">{c.name}</td>
                      <td className="px-4 py-2 border-b">{c.totalUrls}</td>
                      <td
                        className={`px-4 py-2 border-b font-semibold ${
                          c.status === "Complete"
                            ? "text-green-600"
                            : c.status === "Failed"
                            ? "text-red-600"
                            : "text-orange-600"
                        }`}
                      >
                        {c.status}
                      </td>
                      <td className="px-4 py-2 border-b">
                        <div className="bg-gray-200 h-3 rounded mb-1">
                          <div
                            className="bg-purple-600 h-3 rounded"
                            style={{ width: `${percent}%` }}
                          ></div>
                        </div>
                        <div className="text-sm">{c.indexedCount}/{c.totalUrls} ({percent}%)</div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default CampaignTool;
