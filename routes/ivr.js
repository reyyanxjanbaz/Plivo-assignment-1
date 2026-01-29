/**
 * IVR Routes
 * 
 * Multi-level IVR system using Plivo XML.
 * Refactored to use dynamic routing and configuration for languages.
 */

const express = require('express');
const plivo = require('plivo');
const router = express.Router();

// ============================================
// CONFIGURATION
// ============================================

const CONFIG = {
  english: {
    language: 'en-US',
    voice: 'WOMAN',
    redirect_msg: 'English selected.',
    menu_prompt: 'English menu. Press 1 to hear a message. Press 2 to talk to an associate.',
    no_input: 'We did not receive your input. Please try again.',
    invalid_input: "Invalid selection. Let's try again.",
    audio_msg: 'Playing sample audio in English.',
    audio_url: process.env.AUDIO_URL_ENGLISH || 'https://s3.amazonaws.com/plivocloud/Trumpet.mp3',
    dial_msg: 'Connecting you to a representative. Please hold.',
    dial_num: process.env.TEST_NUMBER_ENGLISH || '14692463987',
    dial_fail: 'The representative is not available. Goodbye.',
    goodbye: 'Thank you for calling. Goodbye.'
  },
  spanish: {
    language: 'es-ES',
    voice: 'WOMAN',
    redirect_msg: 'Español seleccionado.',
    menu_prompt: 'Menú en español. Presione 1 para escuchar un mensaje. Presione 2 para hablar con un agente.',
    no_input: 'No recibimos su entrada. Por favor intente de nuevo.',
    invalid_input: 'Selección inválida. Intentemos de nuevo.',
    audio_msg: 'Reproduciendo audio de muestra en español.',
    audio_url: process.env.AUDIO_URL_SPANISH || 'https://s3.amazonaws.com/plivocloud/Music.mp3',
    dial_msg: 'Conectándole con un representante. Por favor espere.',
    dial_num: process.env.TEST_NUMBER_SPANISH || '14692463990',
    dial_fail: 'El representante no está disponible. Adiós.',
    goodbye: 'Gracias por llamar. Adiós.'
  }
};

const BASE_URL = process.env.BASE_URL;

// ============================================
// LEVEL 1: LANGUAGE SELECTION
// ============================================

router.get('/level1', (req, res) => {
  console.log('IVR Level 1: Language Selection');
  const response = new plivo.Response();
  const actionUrl = `${BASE_URL}/ivr/level1`;
  
  /**
   * GetDigits Configuration:
   * - timeout: 7s gives users enough time to react.
   * - retries: 1 allows the system to repeat the prompt once locally 
   *   before falling back to the Redirect instruction (preventing instant failures).
   * - redirect: 'false' ensures we fall through to the XML below on timeout 
   *   instead of submitting an empty request to the POST handler.
   */
  const getDigits = response.addGetDigits({
    action: actionUrl,
    method: 'POST',
    timeout: 7, 
    numDigits: 1,
    retries: 1,
    redirect: 'false'
  });
  
  getDigits.addSpeak('Welcome to the Plivo I V R Demo. Press 1 for English. Press 2 for Spanish.');
  
  // Timeout Handler:
  // If the user doesn't press anything after retries, we prompt and restart the loop.
  // This ensures the call doesn't just hang up silently.
  response.addSpeak('We did not receive your input. Please try again.');
  response.addRedirect(actionUrl);
  
  res.set('Content-Type', 'text/xml');
  res.send(response.toXML());
});

router.post('/level1', (req, res) => {
  // Safe extraction of Digits
  const digit = req.body.Digits;
  const response = new plivo.Response();
  
  console.log('IVR Level 1: Received digit:', digit);
  
  switch (digit) {
    case '1':
      console.log('  → English selected');
      response.addSpeak(CONFIG.english.redirect_msg, { language: CONFIG.english.language });
      response.addRedirect(`${BASE_URL}/ivr/level2/english`);
      break;
    case '2':
      console.log('  → Spanish selected');
      response.addSpeak(CONFIG.spanish.redirect_msg, { language: CONFIG.spanish.language });
      response.addRedirect(`${BASE_URL}/ivr/level2/spanish`);
      break;
    default:
      // Invalid logic handler:
      // The user entered something, but it wasn't 1 or 2.
      // We explicitly tell them it was invalid and Reload Level 1.
      // This prevents the "invalid DTMF" -> "disconnected" bad experience.
      console.log('  → Invalid input');
      response.addSpeak("Invalid selection. Let's try again.");
      response.addRedirect(`${BASE_URL}/ivr/level1`);
  }
  
  res.set('Content-Type', 'text/xml');
  res.send(response.toXML());
});

// ============================================
// LEVEL 2: DYNAMIC LANGUAGE MENU
// ============================================

/**
 * GET /ivr/level2/:lang
 * Generic Level 2 Menu (English or Spanish)
 */
router.get('/level2/:lang', (req, res) => {
  const { lang } = req.params;
  const config = CONFIG[lang];

  // Fail gracefully if someone hits a bad URL manually
  if (!config) {
    console.error(`IVR Level 2: Unsupported language ${lang}`);
    return res.status(404).send('Language not supported');
  }

  console.log(`IVR Level 2: ${lang} Menu`);
  
  const response = new plivo.Response();
  const actionUrl = `${BASE_URL}/ivr/level2/${lang}`;
  
  /**
   * GetDigits Configuration:
   * - Using same robust timeout/retry strategy as Level 1.
   * - Keeps the user in the language context they selected.
   */
  const getDigits = response.addGetDigits({
    action: actionUrl,
    method: 'POST',
    timeout: 7, 
    numDigits: 1,
    retries: 1,
    redirect: 'false'
  });
  
  getDigits.addSpeak(config.menu_prompt, { language: config.language, voice: config.voice });
  
  // Timeout Handler:
  // Re-loop this specific language menu.
  response.addSpeak(config.no_input, { language: config.language, voice: config.voice });
  response.addRedirect(actionUrl);
  
  res.set('Content-Type', 'text/xml');
  res.send(response.toXML());
});

/**
 * POST /ivr/level2/:lang
 * Process Level 2 Menu Input
 */
router.post('/level2/:lang', (req, res) => {
  const { lang } = req.params;
  const config = CONFIG[lang];
  const digit = req.body.Digits;

  if (!config) {
    return res.status(404).send('Language not supported');
  }

  const response = new plivo.Response();
  console.log(`IVR Level 2 ${lang}: Received digit:`, digit);
  
  const speakOpts = { language: config.language, voice: config.voice };

  switch (digit) {
    case '1': // Play Audio
      console.log('  → Playing audio');
      response.addSpeak(config.audio_msg, speakOpts);
      response.addPlay(config.audio_url);
      response.addSpeak(config.goodbye, speakOpts);
      response.addHangup();
      break;

    case '2': // Forward Call
      console.log('  → Forwarding call');
      response.addSpeak(config.dial_msg, speakOpts);
      const dial = response.addDial();
      dial.addNumber(config.dial_num);
      
      // Dial Fallback:
      // If the representative doesn't pick up or is busy.
      response.addSpeak(config.dial_fail, speakOpts);
      response.addHangup();
      break;

    default: // Invalid Input
      // User entered a digit not in the menu (e.g. 5, 9).
      // Catch this specifically and replay the menu in the correct language.
      console.log('  → Invalid input');
      response.addSpeak(config.invalid_input, speakOpts);
      response.addRedirect(`${BASE_URL}/ivr/level2/${lang}`);
  }
  
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
