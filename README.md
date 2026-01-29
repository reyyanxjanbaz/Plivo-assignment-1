# Plivo IVR Demo Project

This project demonstrates a multi-level IVR (Interactive Voice Response) system built using the Plivo Voice API and Node.js. It features dynamic routing, language localization (English/Spanish), and robust error handling.

## Features

- **Dynamic Routing**: Multi-level IVR with state tracking.
- **Localization**: Full English and Spanish support.
- **Security**: Verifies `X-Plivo-Signature-V3` to prevent spoofing.
- **Robust Error Handling**: Retries, timeouts, and user feedback.
- **Breadcrumbs**: "Press 0" to return to main menu from any sub-menu.

## Prerequisites

- Node.js (v14+)
- A generic tunneling tool (like ngrok) to expose your local server to Plivo.
- A **Plivo Account** with:
  - Auth ID & Auth Token
  - A purchase phone number (source number)

## Setup Instructions

1.  **Clone the repository**
    ```bash
    git clone <repository-url>
    cd Plivo-assignment-1
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Environment Configuration**
    Create a `.env` file in the root directory:
    ```bash
    touch .env
    ```
    Add the following variables (replacing placeholders):
    ```env
    # Server Config
    PORT=3000
    # Your public URL (e.g., from ngrok) - NO trailing slash
    BASE_URL=https://your-tunnel-url.ngrok.io

    # Plivo Credentials
    PLIVO_AUTH_ID=your_auth_id
    PLIVO_AUTH_TOKEN=your_auth_token
    PLIVO_PHONE_NUMBER=15555555555  # Your Plivo source number

    # Optional: Custom Configuration
    # TEST_NUMBER_ENGLISH=15551234567
    # TEST_NUMBER_SPANISH=15559876543
    ```

## Running the Server

1.  **Start your tunnel** (if running locally)
    ```bash
    ngrok http 3000
    ```
    *Update `BASE_URL` in `.env` with the HTTPS URL provided by ngrok.*

2.  **Start the application**
    ```bash
    npm start
    ```
    *Output:* `Plivo IVR Demo Server Started on port 3000`

## How to Demo

### 1. Trigger an Outbound Call
Use `curl` or Postman to initiate a call to your mobile number.

```bash
curl -X POST http://localhost:3000/call \
  -H "Content-Type: application/json" \
  -d '{
    "to": "14695551234",
    "from": "15551234567"
  }'
```
*(Note: `from` is optional if `PLIVO_PHONE_NUMBER` is set in .env)*

### 2. IVR Flow Experience

**Level 1 (Main Menu)**
- Answer the call.
- Prompt: *"Welcome... Press 1 for English, Press 2 for Spanish."*
- **Action**: Press `1` or `2`.
  - *Invalid Input*: Replays menu.
  - *Timeout*: Replays menu.

**Level 2 (Sub-menu)**
- **If English (1)**:
  - Prompt: *"English menu. Press 1 for audio, 2 for associate, 0 for Main Menu."*
  - **Press 1**: Plays "Trumpet" audio clip -> Hangup.
  - **Press 2**: Dials the English representative number.
  - **Press 0**: Returns to Level 1.
- **If Spanish (2)**:
  - Prompt: *"Menú en español..."*
  - **Press 1**: Plays Spanish audio sample.
  - **Press 2**: Dials the Spanish representative number.
  - **Press 0**: Returns to Level 1.

### 3. Security Note
This application validates requests using `X-Plivo-Signature-V3`.
- Ensure `BASE_URL` in `.env` exactly matches the URL Plivo uses to reach your server.
- To disable for local testing, set `SKIP_SIGNATURE_VALIDATION=true` (Not recommended for production).

## Project Structure

```
.
├── server.js           # Server entry point & middleware (Express)
├── ivrConfig.js        # Centralized configurations & localized text
├── routes/
│   ├── call.js         # Outbound call initiation logic (REST API)
│   └── ivr.js          # Dynamic IVR logic & XML generation
├── public/             # Static audio assets (.mp3)
├── package.json        # Project dependencies & scripts
└── README.md           # Documentation
```
