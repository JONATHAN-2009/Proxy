
// api/proxy.js

/**
 * Vercel Serverless Function to proxy web requests (using CommonJS module syntax).
 * It fetches the URL provided in the `url` query parameter and returns its content.
 */
module.exports = async (req, res) => {
  // Allow requests from any origin for the API
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight requests for CORS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  const targetUrl = req.query.url;

  if (!targetUrl) {
    return res.status(400).send('Error: The `url` query parameter is required.');
  }

  let urlObject;
  try {
    urlObject = new URL(targetUrl);
  } catch (error) {
    return res.status(400).send('Error: Invalid URL provided.');
  }

  // Security: Prevent requests to internal/local network addresses
  const { hostname } = urlObject;
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.startsWith('192.168.') ||
    hostname.startsWith('10.') ||
    hostname.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./)
  ) {
    return res.status(403).send('Error: Requests to local network addresses are not allowed.');
  }

  try {
    const response = await fetch(urlObject.toString(), {
      headers: {
        'User-Agent': req.headers['user-agent'] || 'Vercel-Proxy/1.0',
        'Accept': req.headers['accept'] || '*/*',
        'Accept-Language': req.headers['accept-language'] || 'en-US,en;q=0.5',
        'Referer': new URL(targetUrl).origin,
      },
      redirect: 'follow',
    });

    // Exclude headers that are controlled by the browser or can cause issues.
    const excludedHeaders = [
      'content-encoding',
      'transfer-encoding',
      'connection',
      'strict-transport-security',
      'content-security-policy',
      'content-security-policy-report-only',
      'x-frame-options',
      'x-content-type-options',
      'x-xss-protection',
    ];

    response.headers.forEach((value, name) => {
      if (!excludedHeaders.includes(name.toLowerCase())) {
        res.setHeader(name, value);
      }
    });

    res.status(response.status);

    const bodyBuffer = await response.arrayBuffer();
    // Use res.end(), which is more fundamental and robust in Node.js environments
    // than the Express-like res.send(). This can prevent invocation failures.
    res.end(Buffer.from(bodyBuffer));
    
  } catch (error) {
    console.error('Proxy Error:', error);
    res.status(502).send('Bad Gateway: The proxy server could not fetch the requested URL.');
  }
};
