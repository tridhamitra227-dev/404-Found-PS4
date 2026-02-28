# 🌴 Serenova Backend API

Pure Node.js REST API for the Serenova resort reviews platform.  
**Zero external dependencies** — runs anywhere with Node.js 18+.

---

## Quick Start

```bash
node server.js
# Server starts at http://localhost:3000
```

---

## Authentication

### Register
```http
POST /api/auth/register
Content-Type: application/json

{ "name": "Alex Johnson", "email": "alex@example.com", "password": "secret123" }
```

### Login
```http
POST /api/auth/login
Content-Type: application/json

{ "email": "alex@example.com", "password": "secret123" }
```
Returns a `token`. Pass it as `Authorization: Bearer <token>` on protected routes.

---

## API Key

All `/api/resorts/:id/reviews` and `/api/resorts/:id/stats` endpoints require:
```http
X-API-Key: eca207d89b70b4a5fca6763c59d5577820bc0ec3
```
Or as a query param: `?api_key=eca207d89b70b4a5fca6763c59d5577820bc0ec3`

---

## Endpoints

| Method | Path | Auth | API Key | Description |
|--------|------|------|---------|-------------|
| GET | `/api/health` | — | — | Server health & stats |
| POST | `/api/auth/register` | — | — | Create account |
| POST | `/api/auth/login` | — | — | Sign in |
| POST | `/api/auth/logout` | ✅ | — | Sign out |
| GET | `/api/auth/me` | ✅ | — | Current user profile |
| GET | `/api/resorts` | — | — | List all resorts |
| GET | `/api/resorts/:id` | — | — | Get single resort |
| GET | `/api/resorts/:id/reviews` | — | ✅ | All reviews for resort |
| GET | `/api/resorts/:id/reviews/:category` | — | ✅ | Reviews by category |
| POST | `/api/resorts/:id/reviews` | ✅ | ✅ | Submit a review |
| DELETE | `/api/reviews/:reviewId` | ✅ | ✅ | Delete own review |
| GET | `/api/resorts/:id/stats` | — | ✅ | Rating stats & breakdown |

---

## Review Categories
`food` · `ambiance` · `amenities` · `services`

---

## Example: Submit a Review

```bash
# 1. Login to get token
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alex@example.com","password":"secret123"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

# 2. Submit review
curl -X POST http://localhost:3000/api/resorts/1/reviews \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-API-Key: eca207d89b70b4a5fca6763c59d5577820bc0ec3" \
  -d '{"category":"food","rating":5,"text":"The coconut sambal was life-changing."}'
```

---

## Query Params

**GET /api/resorts**
- `?search=bali` — filter by name or location
- `?location=maldives` — filter by location

**GET /api/resorts/:id/reviews**
- `?category=food` — filter by category
- `?sort=rating_desc` | `rating_asc` | `date_desc` (default)
- `?limit=10&offset=0` — pagination

---

## Data Persistence
Reviews and users are saved to `data.json` automatically on every write.  
Resorts are seeded in-memory on startup (add DB persistence in `db.js` for production).

---

## Production Upgrade Path
1. Replace `db.js` in-memory store with PostgreSQL (pg) or MongoDB (mongoose)
2. Replace `hashPassword` SHA-256 with `bcrypt`
3. Replace session tokens with JWT (`jsonwebtoken`)
4. Add rate limiting middleware
5. Add HTTPS via reverse proxy (nginx / Caddy)
