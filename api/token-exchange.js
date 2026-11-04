const https = require('https');

/**
 * Vercel Serverless Function: OAuth2 Token Exchange Proxy
 * Bypasses browser CORS restrictions by exchanging PKCE authorization code
 * with Deriv OAuth server (auth.deriv.com) server-to-server.
 */
module.exports = async function handler(req, res) {
    // Enable CORS for client-side fetches
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
        const { grant_type = 'authorization_code', code, client_id, redirect_uri, code_verifier, refresh_token } = body;

        if (!code && !refresh_token) {
            return res.status(400).json({
                error: 'invalid_request',
                error_description: 'Missing required code or refresh_token in request body',
            });
        }

        const params = new URLSearchParams();
        params.append('grant_type', grant_type);
        if (code) params.append('code', code);
        if (client_id) params.append('client_id', client_id);
        if (redirect_uri) params.append('redirect_uri', redirect_uri);
        if (code_verifier) params.append('code_verifier', code_verifier);
        if (refresh_token) params.append('refresh_token', refresh_token);

        const postData = params.toString();

        const result = await new Promise((resolve, reject) => {
            const request = https.request(
                {
                    hostname: 'auth.deriv.com',
                    path: '/oauth2/token',
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Content-Length': Buffer.byteLength(postData),
                        'User-Agent': 'GoldStandardMarket-Backend/1.0',
                    },
                },
                (response) => {
                    let data = '';
                    response.on('data', chunk => { data += chunk; });
                    response.on('end', () => {
                        try {
                            const parsed = JSON.parse(data);
                            resolve({ status: response.statusCode, data: parsed });
                        } catch (e) {
                            resolve({ status: response.statusCode, data: { raw: data } });
                        }
                    });
                }
            );

            request.on('error', reject);
            request.setTimeout(15000, () => {
                request.destroy();
                reject(new Error('Deriv OAuth token exchange timed out after 15s'));
            });
            request.write(postData);
            request.end();
        });

        return res.status(result.status || 200).json(result.data);
    } catch (err) {
        console.error('[API token-exchange] Error:', err);
        return res.status(500).json({
            error: 'server_error',
            error_description: err.message || String(err),
        });
    }
};

