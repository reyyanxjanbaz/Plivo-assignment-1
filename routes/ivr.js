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

// ============================================
// CONFIGURATION
// ============================================

const MAX_RETRIES = 3;

const CONFIG = {
  english: {
    language: 'en-US',
    voice: 'WOMAN',
    redirect_msg: 'English selected.',
    menu_prompt: 'English menu. Press 1 to hear a message. Press 2 to talk to an associate.',
    no_input: 'We did not receive your input.',
    invalid_input: "Invalid selection.",
    audio_msg: 'Playing sample audio in English.',
    audio_url: process.env.AUDIO_URL_ENGLISH || 'https://s3.amazonaws.com/plivocloud/Trumpet.mp3',
    dial_msg: 'Connecting you to a representative. Please hold.',
    dial_num: process.env.TEST_NUMBER_ENGLISH || '14692463987',
    dial_thanks: 'Thank you for calling. Goodbye.',
    dial_fail: 'The representative is not available. Please try again later.',
    goodbye: 'Thank you for calling. Goodbye.',
    retry_exceeded: 'Maximum attempts exceeded. Goodbye.'
  },
  spanish: {
    language: 'es-ES',
    voice: 'WOMAN',
    redirect_msg: 'Español seleccionado.',
    menu_prompt: 'Menú en español. Presione 1 para escuchar un mensaje. Presione 2 para hablar con un agente.',
    no_input: 'No recibimos su entrada.',
    invalid_input: 'Selección inválida.',
    audio_msg: 'Reproduciendo audio de muestra en español.',
    audio_url: process.env.AUDIO_URL_SPANISH || 'https://s3.amazonaws.com/plivocloud/Music.mp3',
    dial_msg: 'Conectándole con un representante. Por favor espere.',
    dial_num: process.env.TEST_NUMBER_SPANISH || '14692463990',
    dial_thanks: 'Gracias por llamar. Adiós.',
    dial_fail: 'El representante no está disponible. Por favor intente más tarde.',
    goodbye: 'Gracias por llamar. Adiós.',
    retry_exceeded: 'Número máximo de intentos excedido. Adiós.'
  }
};

const BASE_URL = process.env.BASE_URL;

/**
 * Helper: Extract failure count from query params
 */
const getFailCount = (req) => {
  const fails = parseInt(req.query.fails, 10);
  return isNaN(fails) ? 0 : fails;
};

// ============================================
// LEVEL 1: LANGUAGE SELECTION
// ============================================

router.get('/level1', (req, res) => {
  const fails = getFailCount(req);
  const response = new plivo.Response();

  console.log(`IVR Level 1: Language Selection (Attempt ${fails + 1})`);

  // Max Retry Check
  if (fails >= MAX_RETRIES) {
    console.log('  → Max retries exceeded. Hanging up.');
    response.addSpeak("Maximum attempts exceeded. Goodbye.");
    response.addHangup();
    res.set('Content-Type', 'text/xml');
    return res.send(response.toXML());
  }

  const actionUrl = `${BASE_URL}/ivr/level1?fails=${fails}`;
  
  const getDigits = response.addGetDigits({
    action: actionUrl,
    method: 'POST',
    timeout: 7, 
    numDigits: 1,
    retries: 1,
    redirect: 'false'
  });
  
  // Prompt only plays if this is the first time or a clean retry
  const prompt = fails === 0 
    ? 'Welcome to the Plivo I V R Demo. Press 1 for English. Press 2 for Spanish.'
    : 'Welcome. Press 1 for English. Press 2 for Spanish.';
    
  getDigits.addSpeak(prompt);
  
  // Timeout Handler:
  // If we reach here, GetDigits timed out (after its internal retries).
  // We treat this as a failure and loop back.
  response.addSpeak('We did not receive your input. Please try again.');
  response.addRedirect(`${BASE_URL}/ivr/level1?fails=${fails + 1}`);
  
  res.set('Content-Type', 'text/xml');
  res.send(response.toXML());
});

router.post('/level1', (req, res) => {
  const fails = getFailCount(req);
  const digit = req.body.Digits;
  const response = new plivo.Response();
  
  console.log('IVR Level 1: Received digit:', digit);
  
  // If digit is missing/undefined, treat as invalid
  if (!digit) {
      console.log('  → No digit received in POST');
      response.addRedirect(`${BASE_URL}/ivr/level1?fails=${fails + 1}`);
      res.set('Content-Type', 'text/xml');
      return res.send(response.toXML());
  }

  switch (digit) {
    case '1':
      console.log('  → English selected');
      response.addSpeak(CONFIG.english.redirect_msg, { language: CONFIG.english.language });
      // Reset fails for next level
      response.addRedirect(`${BASE_URL}/ivr/level2/english`);
      break;
    case '2':
      console.log('  → Spanish selected');
      response.addSpeak(CONFIG.spanish.redirect_msg, { language: CONFIG.spanish.language });
      response.addRedirect(`${BASE_URL}/ivr/level2/spanish`);
      break;
    default:
      console.log('  → Invalid input');
      response.addSpeak("Invalid selection. Let's try again.");
      response.addRedirect(`${BASE_URL}/ivr/level1?fails=${fails + 1}`);
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

  if (!config) return res.status(404).send('Language not supported');

  console.log(`IVR Level 2: ${lang} Menu (Attempt ${fails + 1})`);
  
  const response = new plivo.Response();
  const speakOpts = { language: config.language, voice: config.voice };

  // Max Retry Check
  if (fails >= MAX_RETRIES) {
    console.log('  → Max retries exceeded. Hanging up.');
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
    numDigits: 1,
    retries: 1,
    redirect: 'false'
  });
  
  getDigits.addSpeak(config.menu_prompt, speakOpts);
  
  // Timeout Handler
  response.addSpeak(config.no_input + ' ' + config.invalid_input, speakOpts);
  response.addRedirect(`${BASE_URL}/ivr/level2/${lang}?fails=${fails + 1}`);
  
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

  console.log(`IVR Level 2 ${lang}: Received digit:`, digit);

  switch (digit) {
    case '1': // Play Audio
      console.log('  → Playing audio');
      response.addSpeak(config.audio_msg, speakOpts);
      response.addPlay(config.audio_url);
      response.addSpeak(config.goodbye, speakOpts);
      response.addHangup();
      break;

    case '2': // Forward Call (Dial)
      console.log('  → Forwarding call');
      response.addSpeak(config.dial_msg, speakOpts);
      
      /**
       * CRITICAL FIX: Dial Action Handling
       * Instead of proceeding linearly to failure message, we specify an 'action' URL.
       * Plivo will make a POST request to this URL when the dialed call ends or fails.
       */
      const dial = response.addDial({
          action: `${BASE_URL}/ivr/dial-status/${lang}`,
          method: 'POST'
      });
      dial.addNumber(config.dial_num);
      
      // If Dial fails immediately (e.g. bad number formats) and doesn't trigger action, 
      // we can have a fallback here, but 'action' is safer for end-of-call logic.
      break;

    default: // Invalid Input
      console.log('  → Invalid input');
      response.addSpeak(config.invalid_input, speakOpts);
      response.addRedirect(`${BASE_URL}/ivr/level2/${lang}?fails=${fails + 1}`);
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
 * Checks 'DialStatus' to determine the appropriate message.
 */
router.post('/dial-status/:lang', (req, res) => {
    const { lang } = req.params;
    const config = CONFIG[lang] || CONFIG.english;
    const status = req.body.DialStatus; // e.g., completed, busy, no-answer, failed, timeout
    const speakOpts = { language: config.language, voice: config.voice };
    
    console.log(`Dial Status Report (${lang}): ${status}`);
    
    const response = new plivo.Response();

    if (status === 'completed' || status === 'answered') {
        // The call connected successfully and has now finished.
        response.addSpeak(config.dial_thanks, speakOpts);
    } else {
        // The call failed to connect (busy, no answer, etc).
        console.log('  → Dial was not completed. Playing failure message.');
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
