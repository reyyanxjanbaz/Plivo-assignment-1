/**
 * IVR Configuration
 * 
 * Centralized configuration for IVR prompts, messages, and settings.
 * Pulls from environment variables where appropriate.
 */
require('dotenv').config();

const BASE_URL = process.env.BASE_URL ? process.env.BASE_URL.replace(/\/$/, '') : '';

module.exports = {
  BASE_URL,
  MAX_RETRIES: 3,
  english: {
    language: 'en-US',
    voice: 'WOMAN',
    redirect_msg: 'English selected.',
    menu_prompt: 'English menu. Press 1 to hear a message. Press 2 to talk to an associate.',
    no_input: 'We did not receive your input.',
    invalid_input: "Invalid selection.",
    audio_msg: 'Playing sample audio in English.',
    audio_url: process.env.AUDIO_URL_ENGLISH || `${BASE_URL}/audio/Trumpet.mp3`,
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
    audio_url: process.env.AUDIO_URL_SPANISH || `${BASE_URL}/audio/Music.mp3`,
    dial_msg: 'Conectándole con un representante. Por favor espere.',
    dial_num: process.env.TEST_NUMBER_SPANISH || '14692463990',
    dial_thanks: 'Gracias por llamar. Adiós.',
    dial_fail: 'El representante no está disponible. Por favor intente más tarde.',
    goodbye: 'Gracias por llamar. Adiós.',
    retry_exceeded: 'Número máximo de intentos excedido. Adiós.'
  }
};
