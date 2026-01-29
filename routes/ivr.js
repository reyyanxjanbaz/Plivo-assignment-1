/**
 * IVR Routes
 * 
 * Multi-level IVR system using Plivo XML.
 * Features:
 * - Dynamic routing
 * - Localization (English/Spanish)
 * - Robust error handling (Max retries)
 * - Dial status reporting
 */

const express = require('express');
const plivo = require('plivo');
const router = express.Router();
const CONFIG = require('../ivrConfig');

// ============================================
// CONFIGURATION
// ============================================

const MAX_RETRIES = CONFIG.MAX_RETRIES;
const BASE_URL = CONFIG.BASE_URL;

// CONFIG object moved to ../ivrConfig.js for better separation of concerns

/**
 * Helper: Extract failure count from query params
 */
const getFailCount = (req) => {
  const fails = parseInt(req.query.fails || req.body.fails, 10);
  return isNaN(fails) ? 0 : fails;
};

// ============================================
// LEVEL 1: LANGUAGE SELECTION
// ============================================

router.get('/level1', (req, res) => {
  const fails = getFailCount(req);
  const response = new plivo.Response();

  console.log(`[IVR] Level 1: Language Selection (Attempt ${fails + 1})`);

  // Max Retry Check
  if (fails >= MAX_RETRIES) {
    console.log('  → Max retries exceeded. Hanging up.');
    response.addSpeak(CONFIG.english.retry_exceeded);
    response.addHangup();
    res.set('Content-Type', 'text/xml');
    return res.send(response.toXML());
  }

  const actionUrl = `${BASE_URL}/ivr/level1?fails=${fails}`;
  
  const getDigits = response.addGetDigits({
    action: actionUrl,
    method: 'POST',
    timeout: 7, 
    numDigits: 1
  });
  
  // Prompt only plays if this is the first time or a clean retry
  const prompt = fails === 0 
    ? CONFIG.english.welcome_prompt
    : CONFIG.english.welcome_prompt_retry;
    
  getDigits.addSpeak(prompt);
  
  // Timeout Handler:
  // If we reach here, GetDigits timed out.
  response.addSpeak(CONFIG.english.no_input);
  response.addRedirect(`${BASE_URL}/ivr/level1?fails=${fails + 1}`, { method: 'GET' });
  
  res.set('Content-Type', 'text/xml');
  res.send(response.toXML());
});

router.post('/level1', (req, res) => {
  const fails = getFailCount(req);
  const digit = req.body.Digits;
  const response = new plivo.Response();
  
  console.log(`[IVR] Level 1 POST: Received digit: ${digit || 'NONE'}`);
  
  // If digit is missing/undefined, treat as invalid
  if (!digit) {
      console.log('  → No digit received. Redirecting to menu.');
      response.addRedirect(`${BASE_URL}/ivr/level1?fails=${fails + 1}`, { method: 'GET' });
      res.set('Content-Type', 'text/xml');
      return res.send(response.toXML());
  }

  switch (digit) {
    case '1':
      console.log('  → English selected');
      response.addSpeak(CONFIG.english.redirect_msg, { language: CONFIG.english.language });
      response.addRedirect(`${BASE_URL}/ivr/level2/english`, { method: 'GET' });
      break;
    case '2':
      console.log('  → Spanish selected');
      response.addSpeak(CONFIG.spanish.redirect_msg, { language: CONFIG.spanish.language });
      response.addRedirect(`${BASE_URL}/ivr/level2/spanish`, { method: 'GET' });
      break;
    default:
      console.log(`  → Invalid input: ${digit}`);
      response.addSpeak(CONFIG.english.invalid_input);
      response.addRedirect(`${BASE_URL}/ivr/level1?fails=${fails + 1}`, { method: 'GET' });
  }
  
  res.set('Content-Type', 'text/xml');
  res.send(response.toXML());
});

// ============================================
// LEVEL 2: DYNAMIC LANGUAGE MENU
// ============================================

router.get('/level2/:lang', (req, res) => {
  const { lang } = req.params;
  const fails = getFailCount(req);
  const config = CONFIG[lang];

  if (!config) {
    console.error(`[IVR] Error: Unsupported language: ${lang}`);
    return res.status(404).send('Language not supported');
  }

  console.log(`[IVR] Level 2: ${lang} Menu (Attempt ${fails + 1})`);
  
  const response = new plivo.Response();
  const speakOpts = { language: config.language, voice: config.voice };

  // Max Retry Check
  if (fails >= MAX_RETRIES) {
    console.log('  → Max retries exceeded.');
    response.addSpeak(config.retry_exceeded, speakOpts);
    response.addHangup();
    res.set('Content-Type', 'text/xml');
    return res.send(response.toXML());
  }

  const actionUrl = `${BASE_URL}/ivr/level2/${lang}?fails=${fails}`;
  
  const getDigits = response.addGetDigits({
    action: actionUrl,
    method: 'POST',
    timeout: 7, 
    numDigits: 1
  });
  
  getDigits.addSpeak(config.menu_prompt, speakOpts);
  
  // Timeout Handler
  response.addSpeak(config.no_input, speakOpts);
  response.addRedirect(`${BASE_URL}/ivr/level2/${lang}?fails=${fails + 1}`, { method: 'GET' });
  
  res.set('Content-Type', 'text/xml');
  res.send(response.toXML());
});

router.post('/level2/:lang', (req, res) => {
  const { lang } = req.params;
  const fails = getFailCount(req);
  const config = CONFIG[lang];
  const digit = req.body.Digits;

  if (!config) return res.status(404).send('Language not supported');

  const response = new plivo.Response();
  const speakOpts = { language: config.language, voice: config.voice };

  console.log(`[IVR] Level 2 ${lang} POST: Received digit: ${digit || 'NONE'}`);

  if (!digit) {
      response.addRedirect(`${BASE_URL}/ivr/level2/${lang}?fails=${fails + 1}`, { method: 'GET' });
      res.set('Content-Type', 'text/xml');
      return res.send(response.toXML());
  }

  switch (digit) {
    case '1': // Play Audio
      console.log('  → Choice 1: Playing audio');
      response.addSpeak(config.audio_msg, speakOpts);
      response.addPlay(config.audio_url);
      response.addSpeak(config.goodbye, speakOpts);
      response.addHangup();
      break;

    case '2': // Forward Call (Dial)
      console.log('  → Choice 2: Forwarding call');
      response.addSpeak(config.dial_msg, speakOpts);
      
      const dial = response.addDial({
          action: `${BASE_URL}/ivr/dial-status/${lang}`,
          method: 'POST',
          timeout: 30, // Default to 30s timeout
          hangupOnStar: true, // Allow user to cancel
      });
      const dialNum = config.dial_num;
      // Ensure number has '+' if it's meant to be international but missing
      const formattedNum = dialNum.startsWith('+') ? dialNum : `+${dialNum}`;
      dial.addNumber(formattedNum);
      break;

    case '0': // Validated Breadcrumb: Return to Main Menu
      console.log('  → Choice 0: Return to Main Menu');
      response.addRedirect(`${BASE_URL}/ivr/level1`, { method: 'GET' });
      break;

    default: // Invalid Input
      console.log(`  → Invalid input: ${digit}`);
      response.addSpeak(config.invalid_input, speakOpts);
      response.addRedirect(`${BASE_URL}/ivr/level2/${lang}?fails=${fails + 1}`, { method: 'GET' });
  }
  
  res.set('Content-Type', 'text/xml');
  res.send(response.toXML());
});

// ============================================
// DIAL STATUS HANDLER
// ============================================

/**
 * POST /ivr/dial-status/:lang
 * Handle the callback after a Dial attempt finishes.
 */
router.post('/dial-status/:lang', (req, res) => {
    const { lang } = req.params;
    const config = CONFIG[lang] || CONFIG.english;
    const status = req.body.DialStatus; 
    const speakOpts = { language: config.language, voice: config.voice };
    
    console.log(`[IVR] Dial Status Report (${lang}): ${status}`);
    
    const response = new plivo.Response();

    if (status === 'completed' || status === 'answered') {
        response.addSpeak(config.dial_thanks, speakOpts);
    } else {
        console.log(`  → Call was not answered (Status: ${status}).`);
        response.addSpeak(config.dial_fail, speakOpts);
    }
    
    response.addHangup();
    
    res.set('Content-Type', 'text/xml');
    res.send(response.toXML());
});

// ============================================
// UTILITY ENDPOINTS
// ============================================

router.post('/hangup', (req, res) => {
  console.log('Call ended');
  if (req.body.Duration) console.log('Duration:', req.body.Duration, 'seconds');
  res.sendStatus(200);
});

module.exports = router;
