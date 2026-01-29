/**
 * IVR Routes
 * 
 * Multi-level IVR system using Plivo XML.
 * 
 * Flow:
 * Level 1: Language selection (English or Spanish)
 * Level 2: Language-specific menu (Play audio or Forward call)
 * 
 * All responses use Plivo XML format generated via Plivo Node SDK.
 */

const express = require('express');
const plivo = require('plivo');
const router = express.Router();

// Sample audio URLs (public domain or Plivo sample audio)
const AUDIO_FILES = {
  english: process.env.AUDIO_URL_ENGLISH || 'https://s3.amazonaws.com/plivocloud/Trumpet.mp3',
  spanish: process.env.AUDIO_URL_SPANISH || 'https://s3.amazonaws.com/plivocloud/Music.mp3'
};

// Forwarding numbers
const FORWARD_NUMBERS = {
  english: process.env.TEST_NUMBER_ENGLISH || '14692463987',
  spanish: process.env.TEST_NUMBER_SPANISH || '14692463990'
};

// ============================================
// LEVEL 1: LANGUAGE SELECTION
// ============================================

router.get('/level1', (req, res) => {
  console.log('IVR Level 1: Language Selection');
  const response = new plivo.Response();
  const actionUrl = `${process.env.BASE_URL}/ivr/level1`;
  
  const getDigits = response.addGetDigits({
    action: actionUrl,
    method: 'POST',
    timeout: 5,
    numDigits: 1,
    retries: 1,
    redirect: 'false'
  });
  
  getDigits.addSpeak('Welcome to the Plivo I V R Demo. Press 1 for English. Press 2 for Spanish.');
  
  response.addSpeak('We did not receive your input. Please try again.');
  response.addRedirect(actionUrl);
  
  res.set('Content-Type', 'text/xml');
  res.send(response.toXML());
});

router.post('/level1', (req, res) => {
  const digit = req.body.Digits;
  const response = new plivo.Response();
  
  console.log('IVR Level 1: Received digit:', digit);
  
  if (digit === '1') {
    console.log('  → English selected, redirecting to Level 2 English');
    response.addSpeak('English selected.');
    response.addRedirect(`${process.env.BASE_URL}/ivr/level2/english`);
    
  } else if (digit === '2') {
    console.log('  → Spanish selected, redirecting to Level 2 Spanish');
    response.addSpeak('Español seleccionado.', { language: 'es-ES' });
    response.addRedirect(`${process.env.BASE_URL}/ivr/level2/spanish`);
    
  } else {
    console.log('  → Invalid input, replaying Level 1');
    response.addSpeak("Invalid selection. Let's try again.");
    response.addRedirect(`${process.env.BASE_URL}/ivr/level1`);
  }
  
  res.set('Content-Type', 'text/xml');
  res.send(response.toXML());
});

// ============================================
// LEVEL 2: ENGLISH
// ============================================

/**
 * GET /ivr/level2/english
 * English Menu
 */
router.get('/level2/english', (req, res) => {
  console.log('IVR Level 2: English Menu');
  const response = new plivo.Response();
  const actionUrl = `${process.env.BASE_URL}/ivr/level2/english`;
  
  const getDigits = response.addGetDigits({
    action: actionUrl,
    method: 'POST',
    timeout: 5,
    numDigits: 1,
    retries: 1,
    redirect: 'false'
  });
  
  getDigits.addSpeak('English menu. Press 1 to hear a message. Press 2 to talk to an associate.');
  
  response.addSpeak('We did not receive your input. Please try again.');
  response.addRedirect(actionUrl);
  
  res.set('Content-Type', 'text/xml');
  res.send(response.toXML());
});

/**
 * POST /ivr/level2/english
 * Process English Menu
 */
router.post('/level2/english', (req, res) => {
  const digit = req.body.Digits;
  const response = new plivo.Response();
  
  console.log('IVR Level 2 English: Received digit:', digit);
  
  if (digit === '1') {
    console.log('  → Playing English audio');
    response.addSpeak('Playing sample audio in English.');
    response.addPlay(AUDIO_FILES.english);
    response.addSpeak('Thank you for calling. Goodbye.');
    response.addHangup();
    
  } else if (digit === '2') {
    console.log('  → Forwarding to English representative');
    response.addSpeak('Connecting you to a representative. Please hold.');
    const dial = response.addDial();
    dial.addNumber(FORWARD_NUMBERS.english);
    response.addSpeak('The representative is not available. Goodbye.');
    response.addHangup();
    
  } else {
    console.log('  → Invalid input, replaying Level 2 English');
    response.addSpeak("Invalid selection. Let's try again.");
    response.addRedirect(`${process.env.BASE_URL}/ivr/level2/english`);
  }
  
  res.set('Content-Type', 'text/xml');
  res.send(response.toXML());
});

// ============================================
// LEVEL 2: SPANISH
// ============================================

/**
 * GET /ivr/level2/spanish
 * Spanish Menu
 */
router.get('/level2/spanish', (req, res) => {
  console.log('IVR Level 2: Spanish Menu');
  const response = new plivo.Response();
  const actionUrl = `${process.env.BASE_URL}/ivr/level2/spanish`;
  
  const getDigits = response.addGetDigits({
    action: actionUrl,
    method: 'POST',
    timeout: 5,
    numDigits: 1,
    retries: 1,
    redirect: 'false'
  });
  
  getDigits.addSpeak('Presione 1 para escuchar un mensaje. Presione 2 para hablar con un agente.', { language: 'es-ES' });
  
  response.addSpeak('No recibimos su entrada. Por favor intente de nuevo.', { language: 'es-ES' });
  response.addRedirect(actionUrl);
  
/**
 * POST /ivr/level2/spanish
 * Process Spanish Menu
 */
  res.set('Content-Type', 'text/xml');
  res.send(response.toXML());
});

router.post('/level2/spanish', (req, res) => {
  const digit = req.body.Digits;
  const response = new plivo.Response();
  
  console.log('IVR Level 2 Spanish: Received digit:', digit);
  
  if (digit === '1') {
    response.addSpeak('Reproduciendo audio de muestra en español.', { language: 'es-ES' });
    response.addPlay(AUDIO_FILES.spanish);
    response.addSpeak('Gracias por llamar. Adiós.', { language: 'es-ES' });
    response.addHangup();
  } else if (digit === '2') {
    response.addSpeak('Conectándole con un representante. Por favor espere.', { language: 'es-ES' });
    const dial = response.addDial();
    dial.addNumber(FORWARD_NUMBERS.spanish);
    response.addSpeak('El representante no está disponible. Adiós.', { language: 'es-ES' });
    response.addHangup();
  } else {
    response.addSpeak('Selección inválida. Intentemos de nuevo.', { language: 'es-ES' });
    response.addRedirect(`${process.env.BASE_URL}/ivr/level2/spanish`);
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
