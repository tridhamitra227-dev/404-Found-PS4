// server.js — Marriott Review Intelligence · Full Backend
// Features: Real MongoDB auth, Spam Detection, WhatsApp/SMS Alerts (Twilio)
const express   = require('express');
const mongoose  = require('mongoose');
const cors      = require('cors');
const bcrypt    = require('bcryptjs');
const jwt       = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'marriott_jwt_secret_change_in_prod';

// ── MongoDB ───────────────────────────────────────────────────────
mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/marriott_reviews')
  .then(() => console.log('✅  MongoDB connected → marriott_reviews'))
  .catch(err => { console.error('❌  MongoDB error:', err); process.exit(1); });

// ── Schemas ───────────────────────────────────────────────────────
const userSchema = new mongoose.Schema({
  username:  { type: String, required: true, unique: true, trim: true },
  email:     { type: String, required: true, unique: true, trim: true, lowercase: true },
  name:      { type: String, required: true },
  password:  { type: String, required: true },
  role:      { type: String, enum: ['Admin','Manager','Analyst'], default: 'Analyst' },
  phone:     { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
});

const hotelSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: String, city: String, location: String,
  rating: Number, reviewCount: Number, imageIndex: Number,
});

const reviewSchema = new mongoose.Schema({
  hotelId:       { type: String, index: true },
  hotelName:     String,
  author:        String,
  authorPhone:   String,
  rating:        Number,
  text:          String,
  source:        { type: String, index: true },
  sentiment:     { type: String, enum: ['positive','neutral','negative'], index: true },
  categories:    [String],
  urgency:       { type: String, default: null },
  urgencyReason: String,
  festivalTag:   String,
  requiresAction:Boolean,
  isSpam:        { type: Boolean, default: false },
  spamReasons:   [String],
  alertSent:     { type: Boolean, default: false },
  alertSentAt:   Date,
  date:          { type: Date, default: Date.now },
});

const User   = mongoose.model('User',   userSchema);
const Hotel  = mongoose.model('Hotel',  hotelSchema);
const Review = mongoose.model('Review', reviewSchema);

// ── Auth Middleware ───────────────────────────────────────────────
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch { res.status(401).json({ error: 'Invalid token' }); }
}

// ── SPAM DETECTION ────────────────────────────────────────────────
const SPAM_PATTERNS = [
  { regex: /\b(viagra|cialis|casino|lottery|win \$|click here|free money|earn \$\d+|work from home|diet pill)\b/i, reason: 'Commercial spam keywords' },
  { regex: /https?:\/\/[^\s]{15,}/i, reason: 'Suspicious URL in review' },
  { regex: /(.)\1{6,}/i,             reason: 'Repeated character spam' },
  { regex: /[A-Z\s]{40,}/,           reason: 'Excessive caps' },
  { regex: /(\b\w+\b)(?:\s+\1){3,}/i,reason: 'Repeated word pattern' },
];
const SUSPICIOUS_PHRASES = ['call me at','contact me on','whatsapp me','dm me','follow me','check my profile','visit my website','this is a test','testing 123','lorem ipsum'];

function detectSpam(text, rating) {
  const reasons = [];
  if (!text || text.trim().length < 10) reasons.push('Review text too short');
  for (const p of SPAM_PATTERNS) if (p.regex.test(text)) reasons.push(p.reason);
  for (const ph of SUSPICIOUS_PHRASES) if (text.toLowerCase().includes(ph)) reasons.push('Suspicious phrase: "' + ph + '"');
  const pos = (text.match(/\b(excellent|amazing|wonderful|fantastic|perfect|love|great|best|outstanding|superb)\b/gi)||[]).length;
  const neg = (text.match(/\b(terrible|awful|horrible|worst|disgusting|filthy|rude|disaster|pathetic|useless)\b/gi)||[]).length;
  if (rating === 5 && neg > 3 && pos === 0) reasons.push('Rating-sentiment mismatch: 5 stars with very negative text');
  if (rating === 1 && pos > 3 && neg === 0) reasons.push('Rating-sentiment mismatch: 1 star with very positive text');
  return { isSpam: reasons.length > 0, reasons };
}

// ── WHATSAPP / SMS ALERTS ─────────────────────────────────────────
async function sendGuestAlert({ guestPhone, guestName, hotelName, rating }) {
  const stars = '★'.repeat(rating) + '☆'.repeat(5 - rating);
  const message = `Dear ${guestName || 'Valued Guest'},\n\nThank you for your feedback about ${hotelName} (${stars}).\n\nWe sincerely apologize your experience did not meet our standards. Our management team is personally reviewing your case and will reach out within 24 hours.\n\nImmediate support:\n📞 1800-123-4567 (toll-free)\n✉️ guestrelations@marriott.com\n\nThank you for helping us improve.\n\n— Marriott Guest Relations`;

  const sid   = process.env.TWILIO_SID;
  const auth  = process.env.TWILIO_AUTH;
  const from  = process.env.TWILIO_FROM;
  const waFrom= process.env.TWILIO_WA_FROM;

  if (sid && auth && guestPhone) {
    const twilio = require('twilio')(sid, auth);
    const to = guestPhone.startsWith('+') ? guestPhone : '+91' + guestPhone;
    const results = [];
    if (waFrom) {
      try { const m = await twilio.messages.create({ from:'whatsapp:'+waFrom, to:'whatsapp:'+to, body:message }); results.push({ channel:'whatsapp', sid:m.sid, status:'sent' }); console.log('📱 WhatsApp sent →', to); }
      catch(e) { results.push({ channel:'whatsapp', status:'failed', error:e.message }); }
    }
    if (from) {
      try { const m = await twilio.messages.create({ from, to, body:message }); results.push({ channel:'sms', sid:m.sid, status:'sent' }); console.log('💬 SMS sent →', to); }
      catch(e) { results.push({ channel:'sms', status:'failed', error:e.message }); }
    }
    return results;
  } else {
    console.log('\n═══ DEMO ALERT (Twilio not configured) ═══');
    console.log('To:', guestPhone || 'No phone'); console.log('Hotel:', hotelName); console.log('Rating:', stars);
    console.log(message.substring(0,150)+'...\n');
    return [{ channel:'demo', status:'logged' }];
  }
}

function shouldAlert(r) { return r.rating <= 2 || r.sentiment === 'negative' || r.urgency === 'critical' || r.urgency === 'high'; }

// ══════════════════════════════════════════════════════════════════
//  AUTH ROUTES
// ══════════════════════════════════════════════════════════════════
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, name, password, role, phone } = req.body;
    if (!username || !email || !name || !password) return res.status(400).json({ error: 'username, email, name and password required' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
    const existing = await User.findOne({ $or: [{ username: username.toLowerCase() }, { email: email.toLowerCase() }] });
    if (existing) return res.status(409).json({ error: existing.username === username.toLowerCase() ? 'Username already taken' : 'Email already registered' });
    const hash = await bcrypt.hash(password, 12);
    const user = await User.create({ username: username.toLowerCase(), email: email.toLowerCase(), name, password: hash, role: role || 'Analyst', phone: phone || '' });
    const token = jwt.sign({ id: user._id, username: user.username, name: user.name, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: { username: user.username, name: user.name, role: user.role, email: user.email } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
    const user = await User.findOne({ $or: [{ username: username.toLowerCase() }, { email: username.toLowerCase() }] });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: user._id, username: user.username, name: user.name, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { username: user.username, name: user.name, role: user.role, email: user.email } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ $or: [{ username: username.toLowerCase() }, { email: username.toLowerCase() }] });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: user._id, username: user.username, name: user.name, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { username: user.username, name: user.name, role: user.role, email: user.email } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/auth/me', authMiddleware, async (req, res) => {
  try { const user = await User.findById(req.user.id).select('-password'); res.json(user); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// ══════════════════════════════════════════════════════════════════
//  HOTEL ROUTES
// ══════════════════════════════════════════════════════════════════
app.get('/api/hotels/search', async (req, res) => {
  try {
    const q = req.query.q || '';
    const filter = q ? { $or: [{ name:{$regex:q,$options:'i'} }, { location:{$regex:q,$options:'i'} }, { city:{$regex:q,$options:'i'} }] } : {};
    res.json(await Hotel.find(filter).sort({ name:1 }).lean());
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/hotels/:id/reviews', async (req, res) => {
  try {
    const { id } = req.params;
    const { source, sentiment, category } = req.query;
    const filter = { hotelId: id, isSpam: { $ne: true } };
    if (source && source !== 'all') filter.source = source;
    if (sentiment && sentiment !== 'all') filter.sentiment = sentiment;
    if (category && category !== 'all') filter.categories = category;
    const [hotel, reviews, allReviews] = await Promise.all([
      Hotel.findOne({ id }).lean(),
      Review.find(filter).sort({ date:-1 }).lean(),
      Review.find({ hotelId: id }).lean(),
    ]);
    if (!hotel) return res.status(404).json({ error: 'Hotel not found' });
    const sourceCounts = {};
    allReviews.filter(r=>!r.isSpam).forEach(r => { sourceCounts[r.source]=(sourceCounts[r.source]||0)+1; });
    res.json({ hotel, reviews, stats: computeStats(allReviews.filter(r=>!r.isSpam)), sourceCounts });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ══════════════════════════════════════════════════════════════════
//  REVIEW SUBMISSION (with spam check + auto alert)
// ══════════════════════════════════════════════════════════════════
app.post('/api/reviews/submit', async (req, res) => {
  try {
    const { hotelId, hotelName, author, authorPhone, rating, text, source, categories } = req.body;
    if (!hotelId || !text || !rating) return res.status(400).json({ error: 'hotelId, text and rating required' });
    const spamResult = detectSpam(text, parseInt(rating));
    const sentiment = rating >= 4 ? 'positive' : rating <= 2 ? 'negative' : 'neutral';
    const review = await Review.create({
      hotelId, hotelName: hotelName||'',
      author: author||'Anonymous', authorPhone: authorPhone||'',
      rating: parseInt(rating), text, source: source||'internal',
      sentiment, categories: categories||['service'],
      isSpam: spamResult.isSpam, spamReasons: spamResult.reasons,
      requiresAction: !spamResult.isSpam && (parseInt(rating)<=2||sentiment==='negative'),
    });
    let alertResult = null;
    if (!spamResult.isSpam && shouldAlert(review) && authorPhone) {
      const hotel = await Hotel.findOne({ id: hotelId });
      alertResult = await sendGuestAlert({ guestPhone:authorPhone, guestName:author, hotelName:hotel?.name||hotelId, rating:parseInt(rating) });
      await Review.findByIdAndUpdate(review._id, { alertSent:true, alertSentAt:new Date() });
    }
    res.status(201).json({ review, spamDetected: spamResult.isSpam, spamReasons: spamResult.reasons, alertSent: !!alertResult });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ══════════════════════════════════════════════════════════════════
//  SPAM ROUTES
// ══════════════════════════════════════════════════════════════════
app.post('/api/reviews/:id/report-spam', authMiddleware, async (req, res) => {
  try {
    const review = await Review.findByIdAndUpdate(req.params.id, { isSpam:true, spamReasons:['Manually reported by '+req.user.name] }, { new:true });
    if (!review) return res.status(404).json({ error: 'Review not found' });
    res.json({ success:true, review });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/reviews/:id/unmark-spam', authMiddleware, async (req, res) => {
  try {
    const review = await Review.findByIdAndUpdate(req.params.id, { isSpam:false, spamReasons:[] }, { new:true });
    res.json({ success:true, review });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/spam', authMiddleware, async (req, res) => {
  try { res.json(await Review.find({ isSpam:true }).sort({ date:-1 }).lean()); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// ══════════════════════════════════════════════════════════════════
//  ALERT ROUTES
// ══════════════════════════════════════════════════════════════════
app.get('/api/alerts', async (req, res) => {
  try { res.json(await Review.find({ urgency:{$in:['critical','high']}, isSpam:{$ne:true} }).sort({ urgency:-1, date:-1 }).lean()); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/alerts/send', authMiddleware, async (req, res) => {
  try {
    const { reviewId, guestPhone, guestName } = req.body;
    const review = await Review.findById(reviewId);
    if (!review) return res.status(404).json({ error: 'Review not found' });
    const hotel = await Hotel.findOne({ id: review.hotelId });
    const result = await sendGuestAlert({ guestPhone: guestPhone||review.authorPhone, guestName: guestName||review.author, hotelName: hotel?.name||review.hotelId, rating: review.rating });
    await Review.findByIdAndUpdate(reviewId, { alertSent:true, alertSentAt:new Date() });
    res.json({ success:true, result });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ══════════════════════════════════════════════════════════════════
//  DASHBOARD
// ══════════════════════════════════════════════════════════════════
app.get('/api/dashboard', async (req, res) => {
  try {
    const [hotels, allReviews, spamCount, alertCount] = await Promise.all([
      Hotel.find().lean(),
      Review.find({ isSpam:{$ne:true} }).lean(),
      Review.countDocuments({ isSpam:true }),
      Review.countDocuments({ alertSent:true }),
    ]);
    const stats = computeStats(allReviews);
    res.json({ hotelCount: hotels.length, stats, criticalCount: allReviews.filter(r=>r.urgency==='critical'||r.urgency==='high').length, spamCount, alertCount });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

function computeStats(reviews) {
  const bySource = {};
  reviews.forEach(r => { bySource[r.source]=(bySource[r.source]||0)+1; });
  return { totalReviews:reviews.length, avgRating: reviews.length?(reviews.reduce((s,r)=>s+r.rating,0)/reviews.length).toFixed(1):'0.0', sentiment:{ positive:reviews.filter(r=>r.sentiment==='positive').length, neutral:reviews.filter(r=>r.sentiment==='neutral').length, negative:reviews.filter(r=>r.sentiment==='negative').length }, bySource };
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n🚀  Marriott Review API → http://localhost:${PORT}`);
  console.log(`   Twilio: ${process.env.TWILIO_SID ? '✅ configured' : '⚠️  demo mode (logs to console)'}`);
});
