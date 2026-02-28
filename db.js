/**
 * Serenova — In-memory database with persistence via JSON file
 * In production, replace with PostgreSQL / MongoDB
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_FILE = path.join(__dirname, 'data.json');

// ─── SEED DATA ───────────────────────────────────────────────────────────────
const SEED_RESORTS = [
  { id: '1', name: 'Aman Nusa Dua', location: 'Bali, Indonesia', rating: 4.8, emoji: '🌴', tag: 'Secluded beachfront luxury with temple ceremonies and rice paddy vistas.', badge: 'Top Rated' },
  { id: '2', name: 'Six Senses Zil Pasyon', location: 'Felicité Island, Seychelles', rating: 4.9, emoji: '🌊', tag: 'Private island sustainability paradise with unrivaled marine biodiversity.', badge: 'Eco Luxury' },
  { id: '3', name: 'The Brando', location: 'Tetiaroa, French Polynesia', rating: 4.7, emoji: '🏝', tag: "Marlon Brando's private atoll — raw Polynesian paradise meets carbon neutrality.", badge: null },
  { id: '4', name: 'Singita Grumeti', location: 'Serengeti, Tanzania', rating: 4.8, emoji: '🦁', tag: 'Witness the Great Migration from the most exclusive perch in Africa.', badge: 'Iconic' },
  { id: '5', name: 'Amanjiwo', location: 'Central Java, Indonesia', rating: 4.6, emoji: '🏛', tag: 'Overlooking the Borobudur temple — a sanctuary where spirituality is tangible.', badge: null },
  { id: '6', name: 'Nihi Sumba', location: 'Sumba Island, Indonesia', rating: 4.7, emoji: '🌺', tag: 'Africa meets the tropics — raw, wild, and heartbreaking in its beauty.', badge: null },
  { id: '7', name: 'Gili Lankanfushi', location: 'North Malé Atoll, Maldives', rating: 4.5, emoji: '🐠', tag: "Overwater villas and the world's first lagoon reserve — paradise preserved.", badge: null },
  { id: '8', name: 'Soneva Jani', location: 'Noonu Atoll, Maldives', rating: 4.6, emoji: '⭐', tag: 'Overwater magic with retractable roofs to sleep under the Milky Way.', badge: 'Most Romantic' },
];

const SEED_REVIEWS = [
  // Aman Nusa Dua
  { id: 'r1', resortId: '1', category: 'food', user: 'Priya M.', date: 'Jan 2025', rating: 5, text: 'The Indonesian tasting menu was a masterpiece — each dish told a story of local spice and tradition.' },
  { id: 'r2', resortId: '1', category: 'food', user: 'Thomas L.', date: 'Dec 2024', rating: 5, text: 'Private beach dining under the stars, with fresh seafood caught that morning.' },
  { id: 'r3', resortId: '1', category: 'ambiance', user: 'Elena R.', date: 'Feb 2025', rating: 5, text: 'Architecture in perfect harmony with nature. Every path leads somewhere breathtaking.' },
  { id: 'r4', resortId: '1', category: 'amenities', user: 'Sofia A.', date: 'Mar 2025', rating: 5, text: 'The infinity pool dissolving into the Indian Ocean is worth every penny.' },
  { id: 'r5', resortId: '1', category: 'services', user: 'Maria C.', date: 'Feb 2025', rating: 5, text: 'Staff remembered our names from day one and our preferences by day two.' },
  // Six Senses
  { id: 'r6', resortId: '2', category: 'food', user: 'Hannah W.', date: 'Feb 2025', rating: 5, text: "The resort's organic garden provides 40% of ingredients — you taste the difference." },
  { id: 'r7', resortId: '2', category: 'ambiance', user: 'Chloe T.', date: 'Mar 2025', rating: 5, text: 'Absolute paradise. The island has no cars, no roads — just granite boulders, jungle, and ocean.' },
  { id: 'r8', resortId: '2', category: 'amenities', user: 'Lisa V.', date: 'Feb 2025', rating: 5, text: 'Snorkeling directly from the villa is extraordinary — whale sharks have been spotted.' },
  // Singita
  { id: 'r9', resortId: '4', category: 'food', user: 'Victoria S.', date: 'Feb 2025', rating: 5, text: 'Bush dinners with a 360° view of the Serengeti — culinary theater at its finest.' },
  { id: 'r10', resortId: '4', category: 'services', user: 'Oscar W.', date: 'Feb 2025', rating: 5, text: 'The tracker-ranger duo were the finest guides I\'ve encountered in 30 years of safari.' },
];

// ─── DB STATE ─────────────────────────────────────────────────────────────────
const db = {
  users: [],
  resorts: [],
  reviews: [],
  sessions: {}, // token -> userId
};

function save() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ users: db.users, reviews: db.reviews }, null, 2));
  } catch (e) { /* non-fatal */ }
}

function load() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const saved = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      if (saved.users) db.users = saved.users;
      if (saved.reviews) db.reviews = saved.reviews;
    }
  } catch (e) { /* start fresh */ }
}

async function initDB() {
  load();
  db.resorts = SEED_RESORTS;
  // Merge seed reviews with any saved user reviews (avoid duplicates)
  const savedIds = new Set(db.reviews.map(r => r.id));
  for (const r of SEED_REVIEWS) {
    if (!savedIds.has(r.id)) db.reviews.push(r);
  }
  console.log(`✅  DB ready — ${db.resorts.length} resorts, ${db.reviews.length} reviews, ${db.users.length} users`);
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function hashPassword(pw) {
  return crypto.createHash('sha256').update(pw + 'serenova_salt').digest('hex');
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

function uuid() {
  return crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
}

// ─── EXPORTS ─────────────────────────────────────────────────────────────────
module.exports = { db, initDB, save, hashPassword, generateToken, uuid };
