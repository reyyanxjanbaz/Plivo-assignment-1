/**
 * Outbound Call Routes
 * 
 * Handles outbound call initiation using Plivo REST API.
 * The call will be connected to the IVR system upon answer.
 */

const express = require('express');
const plivo = require('plivo');
const router = express.Router();

// Initialize Plivo client
const client = new plivo.Client(
  process.env.PLIVO_AUTH_ID,
  process.env.PLIVO_AUTH_TOKEN
);

/**
 * POST /call
 * Initiates an outbound call using Plivo REST API
 * 
 * Request Body:
 * {
 *   "to": "14692463987",  // Target phone number (E.164 format recommended)
 *   "from": "optional"     // Optional: Override default Plivo number
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "call_uuid": "uuid-from-plivo",
 *   "message": "Call initiated successfully"
 * }
 */
router.post('/', async (req, res) => {
  try {
    const { to, from } = req.body;

    // Validation
    if (!to) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: to'
      });
    }

    // Input Sanitization & Validation (Strict E.164 or digits only)
    const cleanTo = to.replace(/\D/g, ''); // Remove non-digits
    if (cleanTo.length < 10 || cleanTo.length > 15) {
      return res.status(400).json({
        success: false,
        error: 'Invalid phone number format. Please use E.164 or 10-15 digit format.'
      });
    }
    // Re-format with + if it was likely E.164 intended but stripped, or just use clean digits
    // Plivo accepts digits. E.164 usually starts with +. 
    // We will use the raw input if it validates, or the cleaned version. 
    // Let's stick to the cleaned digits to be safe, but add a '+' if it looks like a country code is needed? 
    // Safest is to rely on user sending correct format but validate length/content.
    
    // Use provided 'from' number or default from environment
    const fromNumber = from || process.env.PLIVO_PHONE_NUMBER;

    if (!fromNumber) {
      return res.status(400).json({
        success: false,
        error: 'No source number available. Set PLIVO_PHONE_NUMBER in .env or provide "from" parameter'
      });
    }

    // Construct the answer URL - points to IVR Level 1
    const answerUrl = `${process.env.BASE_URL}/ivr/level1`;
    const hangupUrl = `${process.env.BASE_URL}/ivr/hangup`;

    console.log('Initiating outbound call:');
    console.log(`  From: ${fromNumber}`);
    console.log(`  To: ${cleanTo}`); // Log the cleaned number
    console.log(`  Answer URL: ${answerUrl}`);

    // Make the call using Plivo SDK
    const response = await client.calls.create(
      fromNumber,  // from
      cleanTo,     // to - Use the sanitized version
      answerUrl,   // answer_url - IVR entry point
      {
        answerMethod: 'GET',
        hangupUrl: hangupUrl,
        hangupMethod: 'POST'
      }
    );

    console.log('Call initiated successfully');
    console.log('Call UUID:', response.callUuid);

    res.json({
      success: true,
      call_uuid: response.callUuid,
      message: 'Call initiated successfully',
      to: cleanTo,
      from: fromNumber,
      answer_url: answerUrl
    });

  } catch (error) {
    console.error('Error initiating call:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to initiate call',
      message: error.message,
      details: error.response?.data || null
    });
  }
});

/**
 * GET /call/status/:call_uuid
 * Check the status of a specific call
 */
router.get('/status/:call_uuid', async (req, res) => {
  try {
    const { call_uuid } = req.params;

    const call = await client.calls.get(call_uuid);

    res.json({
      success: true,
      call_uuid: call_uuid,
      status: call
    });

  } catch (error) {
    console.error('Error fetching call status:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to fetch call status',
      message: error.message
    });
  }
});

module.exports = router;
