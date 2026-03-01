# Marriott Review Intelligence — Setup Guide

## Prerequisites
- Node.js (v18+)
- MongoDB running locally on port 27017

## Quick Start

### 1. Install dependencies
```bash
cd marriott-backend
npm install
```

### 2. Seed the database
```bash
node seed.js
```

### 3. Configure environment (optional — for Twilio alerts)
```bash
cp .env.example .env
# Edit .env with your Twilio credentials
```

### 4. Start the backend
```bash
node server.js
```
API runs on http://localhost:3001

### 5. Open index.html in your browser

---

## Feature 1 — Real User Authentication
- Any user can **Sign Up** with name, username, email, password, role, and phone
- Passwords are **bcrypt hashed** in MongoDB — no plain text
- JWT tokens stored in localStorage — session persists across refreshes
- Login via username OR email
- Roles: Admin, Manager, Analyst

## Feature 2 — Spam Detection (Automatic)
Every new review submitted via `/api/reviews/submit` is automatically scanned by 7 rules:
| Rule | What it catches |
|------|----------------|
| Spam Keywords | casino, lottery, earn $500, etc. |
| Suspicious URLs | Long external links in review text |
| Character Flooding | "aaaaaaaaaa" repeated chars |
| Excessive Caps | ALL CAPS SHOUTING |
| Repeated Words | "great great great great" loops |
| Suspicious Phrases | "call me at", "click here", etc. |
| Rating Mismatch | 5★ with very negative text |

Team members can also manually report any review as spam via the 🚫 Spam button on each review card.
View all spam in the **Spam Reports** nav section.

## Feature 3 — WhatsApp / SMS Alerts (Twilio)
Triggers automatically when:
- Rating ≤ 2 stars
- Sentiment is negative
- Urgency is critical or high

### Configure Twilio
1. Create account at https://console.twilio.com
2. Get a phone number and WhatsApp sandbox
3. Add to `.env`:
```
TWILIO_SID=ACxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH=your_auth_token
TWILIO_FROM=+1234567890        # SMS
TWILIO_WA_FROM=+14155238886    # WhatsApp
```

**Without Twilio**: alerts are logged to the server console in demo mode.

You can also manually trigger alerts:
- Click **📱 Send Alert** on any negative review card
- Click **📱 Send Alert** in the Alerts page
- Enter the guest's phone number when prompted

---

## API Reference
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/auth/register | — | Create account |
| POST | /api/auth/login | — | Sign in |
| GET | /api/auth/me | JWT | Current user |
| GET | /api/hotels/search?q= | — | Search hotels |
| GET | /api/hotels/:id/reviews | — | Get reviews |
| POST | /api/reviews/submit | — | Submit review (auto spam + alert) |
| POST | /api/reviews/:id/report-spam | JWT | Flag as spam |
| POST | /api/reviews/:id/unmark-spam | JWT | Remove spam flag |
| GET | /api/spam | JWT | List all spam |
| GET | /api/alerts | — | Critical reviews |
| POST | /api/alerts/send | JWT | Send WhatsApp/SMS manually |
| GET | /api/dashboard | — | Portfolio stats |
