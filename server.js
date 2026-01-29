/**
 * Plivo IVR Demo Server
 * 
 * Main entry point for the Plivo-based IVR system.
 * Handles outbound call initiation and multi-level IVR flow.
 * 
 * Author: Plivo Forward Deployed Engineer
 */

require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const CONFIG = require('./ivrConfig');
const callRoutes = require('./routes/call');
const ivrRoutes = require('./routes/ivr');
const plivo = require('plivo');

const app = express();
const PORT = process.env.PORT || 3000;

// Validation: Ensure BASE_URL is set for Webhooks
if (!CONFIG.BASE_URL) {
  console.error('❌ CRITICAL ERROR: BASE_URL is not defined in .env');
  console.error('   Plivo needs a public URL to reach your webhooks.');
  console.error('   Please run ngrok/localtunnel and set BASE_URL=https://... in your .env file.');
  process.exit(1);
}

// Validation: Ensure BASE_URL starts with http/https
if (!/^https?:\/\//.test(CONFIG.BASE_URL)) {
  console.error('❌ CRITICAL ERROR: BASE_URL must start with http:// or https://');
  process.exit(1);
}

const fetch = require('node-fetch');
const path = require('path');
const fs = require('fs');

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/audio', express.static('public'));

// Signature Validation Middleware
const validatePlivoSignature = (req, res, next) => {
    // Only validate IVR routes
    if (!req.path.startsWith('/ivr')) {
        return next();
    }
    
    // Skip if explicitly disabled
    if (process.env.SKIP_SIGNATURE_VALIDATION === 'true') {
        return next();
    }

    console.log(`[Security] Validating signature for ${req.method} ${req.url}`);

    const signature = req.headers['x-plivo-signature-v3'];
    const nonce = req.headers['x-plivo-signature-v3-nonce'];
    // Plivo signs the URL it sends the request to.
    // Construct the full URL using the configured BASE_URL.
    const url = CONFIG.BASE_URL + req.originalUrl;
    const body = req.body || {};
    const authToken = process.env.PLIVO_AUTH_TOKEN;

    if (!authToken) {
        console.error("  ❌ Critical: PLIVO_AUTH_TOKEN missing for validation");
        return res.status(500).send("Server Configuration Error");
    }

    // validateV3Signature(method, url, nonce, auth_token, params)
    const valid = plivo.validateV3Signature(
        req.method,
        url,
        nonce,
        authToken,
        body
    );

    if (valid) {
        // console.log("  ✅ Signature verified");
        next();
    } else {
        console.warn(`  ❌ Signature Invalid!`);
        console.warn(`     Expected URL: ${url}`);
        console.warn(`     Nonce: ${nonce}`);
        res.status(403).send("Forbidden: Invalid Plivo Signature");
    }
};

app.use(validatePlivoSignature);

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('Body:', req.body);
  }
  next();
});

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'running',
    message: 'Plivo IVR Demo Server',
    endpoints: {
      'POST /call': 'Initiate outbound call',
      'GET /ivr/level1': 'IVR Level 1 - Language Selection',
      'POST /ivr/level1': 'Process Level 1 input',
      'GET /ivr/level2/english': 'IVR Level 2 - English Menu',
      'POST /ivr/level2/english': 'Process English menu input',
      'GET /ivr/level2/spanish': 'IVR Level 2 - Spanish Menu',
      'POST /ivr/level2/spanish': 'Process Spanish menu input'
    }
  });
});

// Route handlers
app.use('/call', callRoutes);
app.use('/ivr', ivrRoutes);

// Audio and Config Validation
const validateStartup = async () => {
    console.log('\n🔍 Running Pre-flight Checks...');

    // 1. Validate Audio URLs
    const urls = [
        { lang: 'English', url: CONFIG.english?.audio_url },
        { lang: 'Spanish', url: CONFIG.spanish?.audio_url }
    ].filter(i => i.url);

    for (const item of urls) {
        // Check if it's a local file served via BASE_URL
        if (item.url.startsWith(CONFIG.BASE_URL)) {
             try {
                 const relativePath = item.url.replace(CONFIG.BASE_URL, '');
                 // Assume public folder is served at root or specific path
                 // server.js has: app.use('/audio', express.static('public'));
                 // So URL .../audio/Trumpet.mp3 -> local public/Trumpet.mp3
                 
                 let localPath;
                 if (relativePath.startsWith('/audio/')) {
                     localPath = path.join(__dirname, 'public', relativePath.replace('/audio/', ''));
                 } else {
                     localPath = path.join(__dirname, 'public', relativePath);
                 }

                 if (fs.existsSync(localPath)) {
                     console.log(`  ✅ [${item.lang}] Audio file found locally: ${localPath}`);
                 } else {
                     console.warn(`  ⚠️  [${item.lang}] Audio file MISSING locally: ${localPath}`);
                 }
             } catch (e) {
                 console.warn(`  ⚠️  [${item.lang}] Could not verify local audio path: ${e.message}`);
             }
        } else {
            // External URL check
            try {
                const res = await fetch(item.url, { method: 'HEAD', timeout: 5000 });
                if (res.ok) {
                    console.log(`  ✅ [${item.lang}] Remote audio accessible: ${res.status}`);
                } else {
                    console.warn(`  ⚠️  [${item.lang}] Remote audio check failed: ${res.status}`);
                }
            } catch (err) {
                 console.warn(`  ⚠️  [${item.lang}] External audio unreachable: ${err.message}`);
            }
        }
    }
    
    // 2. Validate Test Numbers
    const testEnglish = process.env.TEST_NUMBER_ENGLISH;
    const testSpanish = process.env.TEST_NUMBER_SPANISH;
    
    if (!testEnglish || !testSpanish) {
        console.warn('  ⚠️  WARNING: TEST_NUMBER_ENGLISH or TEST_NUMBER_SPANISH not set. Dialing will fail.');
    } else {
        console.log(`  ✅ Test Numbers Configured`);
    }
    console.log('=================================\n');
};

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.method} ${req.path} not found`
  });
});

// Start server
app.listen(PORT, async () => {
  console.log('=================================');
  console.log('Plivo IVR Demo Server Started');
  console.log('=================================');
  console.log(`Server running on port ${PORT}`);
  console.log(`Base URL: ${CONFIG.BASE_URL}`);
  console.log('');
  console.log('Webhook Endpoints:');
  console.log(`- Answer URL: ${CONFIG.BASE_URL}/ivr/level1`);
  console.log(`- Hangup URL: ${CONFIG.BASE_URL}/ivr/hangup`);
  
  await validateStartup();
});

module.exports = app;
