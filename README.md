# Plivo IVR Demo System

A production-grade demonstration of Plivo Voice API capabilities, showcasing outbound calling and multi-level IVR (Interactive Voice Response) functionality.

## 🎯 Overview

This application demonstrates:
- **Outbound Call Initiation** using Plivo REST API
- **Multi-level IVR** using DTMF (Dual-Tone Multi-Frequency) input
- **Language Selection** (English & Spanish)
- **Audio Playback** via Plivo's `<Play>` element
- **Call Forwarding** using Plivo's `<Dial>` element
- **Graceful Error Handling** for invalid inputs

Built with **Node.js**, **Express**, and the **Plivo Node SDK**, this demo uses **Plivo XML** for call flow orchestration.

---

## 🏗️ Architecture

```
┌─────────────────┐
│  Outbound Call  │
│   POST /call    │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│    IVR Level 1          │
│  Language Selection     │
│  GET /ivr/level1        │
│                         │
│  Press 1: English       │
│  Press 2: Spanish       │
└──────────┬──────────────┘
           │
    ┌──────┴──────┐
    │             │
    ▼             ▼
┌─────────────┐ ┌─────────────┐
│ IVR Level 2 │ │ IVR Level 2 │
│  (English)  │ │  (Spanish)  │
│             │ │             │
│ Press 1:    │ │ Press 1:    │
│ Play Audio  │ │ Play Audio  │
│             │ │             │
│ Press 2:    │ │ Press 2:    │
│ Forward Call│ │ Forward Call│
└─────────────┘ └─────────────┘
```

---

## 📋 Prerequisites

- **Node.js** (v14 or higher)
- **Plivo Account** with:
  - Auth ID
  - Auth Token
  - At least one Plivo phone number
- **ngrok** or similar tunneling service (for local development)

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit `.env` with your Plivo credentials:

```env
# Plivo API Credentials
PLIVO_AUTH_ID=MANZJJOGRLNZK0ZMZIMM
PLIVO_AUTH_TOKEN=NmU2ZmRhMjYtOTE1OS00YWRiLWJlNmEtNTIxYzUy

# Plivo Phone Number (for making outbound calls)
PLIVO_PHONE_NUMBER=your_plivo_number_here

# Server Configuration
PORT=3000

# Base URL for webhooks (use ngrok for local development)
BASE_URL=http://your-ngrok-url.ngrok.io
```

### 3. Set Up Public URL (Local Development)

Plivo needs a public URL to send webhooks. Use **ngrok**:

```bash
# Install ngrok (if not already installed)
brew install ngrok  # macOS
# or download from https://ngrok.com/download

# Start ngrok tunnel
ngrok http 3000
```

Copy the **https** URL (e.g., `https://abc123.ngrok.io`) and update `BASE_URL` in your `.env` file:

```env
BASE_URL=https://abc123.ngrok.io
```

### 4. Start the Server

```bash
npm start
```

You should see:

```
=================================
Plivo IVR Demo Server Started
=================================
Server running on port 3000
Base URL: https://abc123.ngrok.io
...
```

---

## 📞 Making an Outbound Call

### Using curl

```bash
curl -X POST http://localhost:3000/call \
  -H "Content-Type: application/json" \
  -d '{
    "to": "14692463987"
  }'
```

### Response

```json
{
  "success": true,
  "call_uuid": "12345678-1234-1234-1234-123456789012",
  "message": "Call initiated successfully",
  "to": "14692463987",
  "from": "your_plivo_number",
  "answer_url": "https://abc123.ngrok.io/ivr/level1"
}
```

### Using Postman

- **Method**: `POST`
- **URL**: `http://localhost:3000/call`
- **Headers**: `Content-Type: application/json`
- **Body** (raw JSON):
  ```json
  {
    "to": "14692463987"
  }
  ```

---

## 🎙️ IVR Flow Details

### Level 1: Language Selection

When the call is answered:

```
"Welcome to the Plivo IVR Demo.
Press 1 for English.
Press 2 for Spanish."
```

**User Actions:**
- Press `1` → Proceeds to English menu
- Press `2` → Proceeds to Spanish menu
- Press any other key → "Invalid selection. Let's try again." → Replays Level 1
- No input (5s timeout) → "We did not receive your input." → Replays Level 1

---

### Level 2: English Menu

```
"English menu.
Press 1 to play a sample audio.
Press 2 to speak with a representative."
```

**User Actions:**
- Press `1` → Plays sample English audio, then hangs up
- Press `2` → Forwards call to a representative (placeholder: `14692463987`)
- Press any other key → "Invalid selection. Let's try again." → Replays Level 2
- No input → Replays Level 2

---

### Level 2: Spanish Menu

```
"Menú en español.
Presione 1 para escuchar un audio de muestra.
Presione 2 para hablar con un representante."
```

**User Actions:**
- Press `1` → Plays sample Spanish audio, then hangs up
- Press `2` → Forwards call to a representative (placeholder: `14692463990`)
- Press any other key → Replays Level 2 (in Spanish)
- No input → Replays Level 2

---

## 🛠️ API Endpoints

### 1. Health Check

```
GET /
```

Returns server status and available endpoints.

### 2. Initiate Outbound Call

```
POST /call
```

**Request Body:**
```json
{
  "to": "14692463987",
  "from": "optional_override_number"
}
```

**Response:**
```json
{
  "success": true,
  "call_uuid": "uuid",
  "message": "Call initiated successfully"
}
```

### 3. Check Call Status

```
GET /call/status/:call_uuid
```

Returns the current status of a specific call.

### 4. IVR Endpoints (Webhooks)

These are called automatically by Plivo during the call:

- `GET /ivr/level1` - Language selection menu
- `POST /ivr/level1` - Process language selection
- `GET /ivr/level2-english` - English menu
- `POST /ivr/level2-english` - Process English menu input
- `GET /ivr/level2-spanish` - Spanish menu
- `POST /ivr/level2-spanish` - Process Spanish menu input
- `POST /ivr/hangup` - Hangup callback (logging)

---

## 📁 Project Structure

```
plivo-ivr-demo/
├── server.js                 # Main application entry point
├── routes/
│   ├── call.js              # Outbound call routes
│   └── ivr.js               # IVR logic (generates Plivo XML)
├── plivo/
│   ├── level1.xml           # Reference: Level 1 XML structure
│   ├── level2-english.xml   # Reference: English menu XML
│   └── level2-spanish.xml   # Reference: Spanish menu XML
├── package.json             # Dependencies
├── .env.example             # Environment variables template
├── .gitignore
└── README.md
```

---

## 🔧 Configuration

### Audio Files

The demo uses sample audio from Plivo's S3 bucket. To use custom audio:

1. Upload your audio files (MP3, WAV) to a publicly accessible URL
2. Update the `AUDIO_FILES` object in `routes/ivr.js`:

```javascript
const AUDIO_FILES = {
  english: 'https://your-domain.com/audio/english-message.mp3',
  spanish: 'https://your-domain.com/audio/spanish-message.mp3'
};
```

### Forward Numbers

Update the `FORWARD_NUMBERS` object in `routes/ivr.js` with real phone numbers:

```javascript
const FORWARD_NUMBERS = {
  english: '14155551234',  // Your English support number
  spanish: '14155555678'   // Your Spanish support number
};
```

---

## 🔍 Testing the IVR

### Test Workflow

1. **Start the server** with ngrok running
2. **Make an outbound call** to your personal phone number
3. **Answer the call** and follow the prompts:
   - Press `1` for English or `2` for Spanish
   - In the language menu, press `1` to hear audio or `2` to forward
4. **Test invalid inputs** by pressing other keys (e.g., `3`, `4`)
5. **Test timeouts** by not pressing any key within 5 seconds

### Expected Behavior

✅ Language selection works correctly  
✅ Audio plays successfully  
✅ Call forwarding connects to the specified number  
✅ Invalid inputs replay the current menu  
✅ Timeouts replay the current menu  
✅ Graceful hangup after audio completion

---

## 🐛 Troubleshooting

### Issue: "No source number available"

**Solution:** Set `PLIVO_PHONE_NUMBER` in your `.env` file with a verified Plivo number.

### Issue: "Failed to initiate call"

**Solution:** 
- Verify your Plivo credentials in `.env`
- Check that your Plivo account has sufficient balance
- Ensure the destination number is in E.164 format (e.g., `+14692463987`)

### Issue: "Webhooks not received"

**Solution:**
- Verify ngrok is running: `ngrok http 3000`
- Update `BASE_URL` in `.env` with the ngrok URL
- Restart the server after updating `.env`
- Check ngrok web interface at http://127.0.0.1:4040 for incoming requests

### Issue: "Invalid XML response"

**Solution:**
- Check server logs for errors
- Verify all routes in `routes/ivr.js` return valid XML
- Test XML structure using the reference files in `plivo/` directory

---

## 📚 Plivo XML Reference

### Key Elements Used

| Element | Purpose | Example |
|---------|---------|---------|
| `<Speak>` | Text-to-speech | `<Speak>Hello World</Speak>` |
| `<GetDigits>` | Capture DTMF input | `<GetDigits numDigits="1">...</GetDigits>` |
| `<Play>` | Play audio file | `<Play>https://example.com/audio.mp3</Play>` |
| `<Dial>` | Forward call | `<Dial><Number>14155551234</Number></Dial>` |
| `<Redirect>` | Navigate to another URL | `<Redirect>http://example.com/ivr</Redirect>` |
| `<Hangup>` | End the call | `<Hangup/>` |

### Documentation

- [Plivo XML Reference](https://www.plivo.com/docs/voice/xml/)
- [Plivo Node SDK](https://www.plivo.com/docs/sdk/node/)
- [Plivo Voice API](https://www.plivo.com/docs/voice/api/)

---

## 🎓 Notes for Plivo Engineers

This demo showcases:

1. **Clean Architecture**: Separation of concerns (routes, XML generation, error handling)
2. **Plivo Best Practices**: 
   - Using POST for DTMF input processing
   - Proper XML structure with `<Response>` root
   - Timeout and retry handling in `<GetDigits>`
3. **Production Readiness**:
   - Environment variable configuration
   - Comprehensive logging
   - Error handling and validation
   - Graceful fallback for invalid inputs
4. **Scalability**: Easy to extend with additional IVR levels or languages

---

## 📝 License

MIT

---

## 👤 Author

Plivo Forward Deployed Engineer

---

## 🤝 Support

For Plivo-specific questions:
- [Plivo Documentation](https://www.plivo.com/docs/)
- [Plivo Support](https://support.plivo.com/)

For this demo:
- Check server logs for detailed error messages
- Review the XML reference files in `plivo/` directory
- Test webhooks using ngrok's web interface (http://127.0.0.1:4040)
