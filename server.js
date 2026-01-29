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
const callRoutes = require('./routes/call');
const ivrRoutes = require('./routes/ivr');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

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
app.listen(PORT, () => {
  console.log('=================================');
  console.log('Plivo IVR Demo Server Started');
  console.log('=================================');
  console.log(`Server running on port ${PORT}`);
  console.log(`Base URL: ${process.env.BASE_URL || `http://localhost:${PORT}`}`);
  console.log('');
  console.log('Make sure to:');
  console.log('1. Set up your .env file with Plivo credentials');
  console.log('2. Use ngrok or similar tunnel for local development');
  console.log('3. Update BASE_URL in .env with your public URL');
  console.log('=================================');
});

module.exports = app;
