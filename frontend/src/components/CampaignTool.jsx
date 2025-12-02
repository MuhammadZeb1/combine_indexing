import React, { useState, useEffect } from 'react';
import axios from 'axios';

// Basic styles
const containerStyle = { maxWidth: '800px', margin: '20px auto', fontFamily: 'sans-serif' };
const creditStyle = { padding: '15px', background: '#e0f7fa', border: '1px solid #b2ebf2', marginBottom: '20px', textAlign: 'center', borderRadius: '5px' };
const tableStyle = { width: '100%', borderCollapse: 'collapse', marginTop: '20px' };

// Use Vercel URL for production
const BASE_URL = process.env.NODE_ENV === "production" 
    ? "https://backend-url-indexing-production-b44f.up.railway.app" 
    : "http://localhost:5000";

function CampaignTool() {
    const [token, setToken] = useState(localStorage.getItem('campaignToken') || '');
    const [credits, setCredits] = useState('...');
    const [campaigns, setCampaigns] = useState([]);
    const [campaignName, setCampaignName] = useState('');
    const [urlsText, setUrlsText] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Compute URL count for button display
    const currentUrlCount = urlsText
        .split('\n')
        .map(url => url.trim())
        .filter(url => url.length > 0)
        .length;

    const fetchData = async () => {
        if (!token) {
            setCredits('Not initialized');
            return;
        }

        try {
            const creditRes = await axios.get(`${BASE_URL}/api/credits?token=${token}`);
            setCredits(creditRes.data.remainingCredits);

            const campaignRes = await axios.get(`${BASE_URL}/api/campaigns?token=${token}`);
            setCampaigns(campaignRes.data.campaigns || []);
            setError('');
        } catch (err) {
            console.error('Error fetching data:', err);
            setError('Could not connect to service or token invalid.');
        }
    };

    useEffect(() => {
        fetchData();
        const intervalId = setInterval(fetchData, 5000); // Polling every 5s
        return () => clearInterval(intervalId);
    }, [token]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const urls = urlsText.split('\n').map(url => url.trim()).filter(url => url.length > 0);

        if (urls.length === 0 || urls.length > 200) {
            setError("Please submit between 1 and 200 URLs.");
            setLoading(false);
            return;
        }

        try {
            const res = await axios.post(`${BASE_URL}/api/submit`, { 
                campaignName, 
                urls, 
                clientToken: token 
            });

            if (res.data.newCampaignToken && res.data.newCampaignToken !== token) {
                localStorage.setItem('campaignToken', res.data.newCampaignToken);
                setToken(res.data.newCampaignToken);
            }

            setCampaignName('');
            setUrlsText('');
            setCredits(res.data.remainingCredits);
            fetchData();
        } catch (err) {
            const errorMessage = err.response?.data?.message || err.message || 'Network error or server unavailable.';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={containerStyle}>
            <h1>🔗 URL Indexing Campaign Tool</h1>

            <div style={creditStyle}>
                <h3>Current Credits: <span style={{ color: Number(credits) < 100 ? 'red' : 'green' }}>{credits}</span></h3>
            </div>

            {error && <p style={{ color: 'white', background: 'red', padding: '10px', borderRadius: '5px' }}>🚨 {error}</p>}

            <h2>Submit New Campaign</h2>
            <form onSubmit={handleSubmit}>
                <label style={{ display: 'block', margin: '10px 0 5px 0' }}>Campaign Name:</label>
                <input 
                    type="text" 
                    value={campaignName} 
                    onChange={(e) => setCampaignName(e.target.value)} 
                    required 
                    placeholder="e.g., May 2025 Backlinks" 
                    style={{ width: '100%', padding: '8px', marginBottom: '10px', border: '1px solid #ccc' }}
                />
                
                <label style={{ display: 'block', margin: '10px 0 5px 0' }}>URLs (One per line, Max 200):</label>
                <textarea 
                    value={urlsText} 
                    onChange={(e) => setUrlsText(e.target.value)} 
                    required 
                    placeholder="https://example.com/page-1&#10;https://example2.net/post-a&#10;..." 
                    style={{ width: '100%', height: '150px', marginBottom: '15px', border: '1px solid #ccc' }}
                ></textarea>
                
                <button type="submit" disabled={loading} style={{ padding: '10px 15px', background: loading ? '#ccc' : '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: loading ? 'not-allowed' : 'pointer' }}>
                    {loading ? 'Submitting...' : `Submit Campaign (${currentUrlCount} credits)`}
                </button>
            </form>

            <hr style={{ margin: '30px 0' }} />

            <h2>Campaign History & Progress</h2>
            <table style={tableStyle}>
                <thead>
                    <tr>
                        <th style={{ border: '1px solid #ddd', padding: '10px' }}>Name</th>
                        <th style={{ border: '1px solid #ddd', padding: '10px' }}>Total</th>
                        <th style={{ border: '1px solid #ddd', padding: '10px' }}>Status</th>
                        <th style={{ border: '1px solid #ddd', padding: '10px' }}>Progress</th>
                    </tr>
                </thead>
                <tbody>
                    {campaigns.length === 0 ? (
                        <tr>
                            <td colSpan="4" style={{ textAlign: 'center', border: '1px solid #ddd', padding: '10px' }}>No campaigns found. Submit one above!</td>
                        </tr>
                    ) : (
                        campaigns.map(campaign => {
                            const total = campaign.totalUrls || 0;
                            const indexed = campaign.indexedCount || 0;
                            const progressPercent = total > 0 ? Math.round((indexed / total) * 100) : 0;

                            return (
                                <tr key={campaign._id}>
                                    <td style={{ border: '1px solid #ddd', padding: '10px' }}>{campaign.name || 'Unnamed'}</td>
                                    <td style={{ border: '1px solid #ddd', padding: '10px' }}>{total}</td>
                                    <td style={{ border: '1px solid #ddd', padding: '10px', fontWeight: 'bold', color: campaign.status === 'Complete' ? 'green' : campaign.status === 'Failed' ? 'red' : 'orange' }}>
                                        {campaign.status || 'Pending'}
                                    </td>
                                    <td style={{ border: '1px solid #ddd', padding: '10px' }}>{indexed}/{total} ({progressPercent}%)</td>
                                </tr>
                            );
                        })
                    )}
                </tbody>
            </table>
        </div>
    );
}

export default CampaignTool;
