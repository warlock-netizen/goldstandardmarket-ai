const https = require('https');

/**
 * Vercel Serverless Function: DerivWS REST Proxy
 * Bypasses potential browser CORS blocks when fetching accounts or OTP
 * by proxying requests server-to-server to api.derivws.com.
 */
module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Deriv-App-ID');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
        const { path, method = 'GET', headers = {} } = body;

        if (!path) {
            return res.status(400).json({ error: 'Missing path' });
        }

        const cleanPath = path.startsWith('/') ? path : `/${path}`;
        const targetPath = cleanPath.startsWith('/trading/v1') ? cleanPath : `/trading/v1${cleanPath}`;

        const reqHeaders = {
            Accept: 'application/json',
            'User-Agent': 'GoldStandardMarket-Backend/1.0',
        };

        if (headers.Authorization || headers.authorization) {
            reqHeaders.Authorization = headers.Authorization || headers.authorization;
        }
        if (headers['Deriv-App-ID'] || headers['deriv-app-id']) {
            reqHeaders['Deriv-App-ID'] = headers['Deriv-App-ID'] || headers['deriv-app-id'];
        }

        const result = await new Promise((resolve, reject) => {
            const request = https.request(
                {
                    hostname: 'api.derivws.com',
                    path: targetPath,
                    method: method.toUpperCase(),
                    headers: reqHeaders,
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
                reject(new Error('DerivWS request timed out after 15s'));
            });
            request.end();
        });

        return res.status(result.status || 200).json(result.data);
    } catch (err) {
        console.error('[API derivws proxy] Error:', err);
        return res.status(500).json({
            error: 'server_error',
            error_description: err.message || String(err),
        });
    }
};

