/**
 * Serenova — Route Handlers
 */

const { db, save, hashPassword, generateToken, uuid } = require('./db');

const VALID_CATEGORIES = ['food', 'ambiance', 'amenities', 'services'];

const handlers = {

  // ─── HEALTH ───────────────────────────────────────────────────────────────
  health(req, res, send) {
    send(res, 200, {
      status: 'ok',
      service: 'Serenova API',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      stats: {
        resorts: db.resorts.length,
        reviews: db.reviews.length,
        users: db.users.length,
      }
    });
  },

  // ─── AUTH ─────────────────────────────────────────────────────────────────
  register(req, res, send) {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return send(res, 400, { error: 'name, email and password are required' });
    }
    if (password.length < 6) {
      return send(res, 400, { error: 'Password must be at least 6 characters' });
    }
    if (db.users.find(u => u.email === email.toLowerCase())) {
      return send(res, 409, { error: 'An account with this email already exists' });
    }
    const user = {
      id: uuid(),
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash: hashPassword(password),
      createdAt: new Date().toISOString(),
    };
    db.users.push(user);
    const token = generateToken();
    db.sessions[token] = user.id;
    save();
    send(res, 201, {
      message: `Welcome to Serenova, ${user.name}!`,
      token,
      user: { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt }
    });
  },

  login(req, res, send) {
    const { email, password } = req.body;
    if (!email || !password) {
      return send(res, 400, { error: 'email and password are required' });
    }
    const user = db.users.find(u => u.email === email.toLowerCase().trim());
    if (!user || user.passwordHash !== hashPassword(password)) {
      return send(res, 401, { error: 'Invalid email or password' });
    }
    const token = generateToken();
    db.sessions[token] = user.id;
    send(res, 200, {
      message: `Welcome back, ${user.name}!`,
      token,
      user: { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt }
    });
  },

  logoutUser(req, res, send) {
    const authHeader = req.headers['authorization'] || '';
    const token = authHeader.replace('Bearer ', '').trim();
    delete db.sessions[token];
    send(res, 200, { message: 'Signed out successfully' });
  },

  me(req, res, send) {
    const u = req.user;
    const myReviews = db.reviews.filter(r => r.userId === u.id);
    send(res, 200, {
      id: u.id, name: u.name, email: u.email,
      createdAt: u.createdAt,
      reviewCount: myReviews.length,
    });
  },

  // ─── RESORTS ──────────────────────────────────────────────────────────────
  listResorts(req, res, send) {
    const { search, location } = req.query;
    let list = db.resorts;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(r =>
        r.name.toLowerCase().includes(q) || r.location.toLowerCase().includes(q)
      );
    }
    if (location) {
      list = list.filter(r => r.location.toLowerCase().includes(location.toLowerCase()));
    }
    // Augment with live review counts and avg ratings
    const enriched = list.map(r => {
      const reviews = db.reviews.filter(rv => rv.resortId === r.id);
      const avgRating = reviews.length
        ? (reviews.reduce((s, rv) => s + rv.rating, 0) / reviews.length).toFixed(2)
        : r.rating.toFixed(2);
      return { ...r, reviewCount: reviews.length, computedRating: parseFloat(avgRating) };
    });
    send(res, 200, { count: enriched.length, resorts: enriched });
  },

  getResort(req, res, send) {
    const resort = db.resorts.find(r => r.id === req.params.id);
    if (!resort) return send(res, 404, { error: 'Resort not found' });
    const reviews = db.reviews.filter(r => r.resortId === resort.id);
    const byCategory = {};
    for (const cat of VALID_CATEGORIES) {
      const catReviews = reviews.filter(r => r.category === cat);
      byCategory[cat] = {
        count: catReviews.length,
        avgRating: catReviews.length
          ? parseFloat((catReviews.reduce((s, r) => s + r.rating, 0) / catReviews.length).toFixed(2))
          : null,
      };
    }
    send(res, 200, {
      ...resort,
      reviewCount: reviews.length,
      categories: byCategory,
    });
  },

  // ─── REVIEWS ──────────────────────────────────────────────────────────────
  listReviews(req, res, send) {
    const resort = db.resorts.find(r => r.id === req.params.id);
    if (!resort) return send(res, 404, { error: 'Resort not found' });

    const { category, sort = 'date_desc', limit = '50', offset = '0' } = req.query;
    let reviews = db.reviews.filter(r => r.resortId === req.params.id);

    if (category) {
      if (!VALID_CATEGORIES.includes(category)) {
        return send(res, 400, { error: `category must be one of: ${VALID_CATEGORIES.join(', ')}` });
      }
      reviews = reviews.filter(r => r.category === category);
    }

    // Sort
    if (sort === 'rating_desc') reviews.sort((a, b) => b.rating - a.rating);
    else if (sort === 'rating_asc') reviews.sort((a, b) => a.rating - b.rating);
    else reviews.sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));

    const total = reviews.length;
    const paginated = reviews.slice(parseInt(offset), parseInt(offset) + parseInt(limit));

    send(res, 200, {
      resortId: req.params.id,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset),
      reviews: paginated,
    });
  },

  listReviewsByCat(req, res, send) {
    const { id, category } = req.params;
    const resort = db.resorts.find(r => r.id === id);
    if (!resort) return send(res, 404, { error: 'Resort not found' });
    if (!VALID_CATEGORIES.includes(category)) {
      return send(res, 400, { error: `category must be one of: ${VALID_CATEGORIES.join(', ')}` });
    }
    const reviews = db.reviews.filter(r => r.resortId === id && r.category === category);
    send(res, 200, {
      resortId: id,
      resortName: resort.name,
      category,
      count: reviews.length,
      avgRating: reviews.length
        ? parseFloat((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(2))
        : null,
      reviews,
    });
  },

  createReview(req, res, send) {
    const resort = db.resorts.find(r => r.id === req.params.id);
    if (!resort) return send(res, 404, { error: 'Resort not found' });

    const { category, rating, text } = req.body;

    if (!category || !VALID_CATEGORIES.includes(category)) {
      return send(res, 400, { error: `category must be one of: ${VALID_CATEGORIES.join(', ')}` });
    }
    if (!rating || typeof rating !== 'number' || rating < 1 || rating > 5 || !Number.isInteger(rating)) {
      return send(res, 400, { error: 'rating must be an integer between 1 and 5' });
    }
    if (!text || text.trim().length < 10) {
      return send(res, 400, { error: 'text must be at least 10 characters' });
    }
    if (text.trim().length > 2000) {
      return send(res, 400, { error: 'text must be 2000 characters or fewer' });
    }

    const review = {
      id: uuid(),
      resortId: req.params.id,
      userId: req.user.id,
      user: req.user.name,
      category,
      rating,
      text: text.trim(),
      date: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      createdAt: new Date().toISOString(),
    };

    db.reviews.push(review);

    // Recalculate resort's aggregate rating
    const allResortReviews = db.reviews.filter(r => r.resortId === req.params.id);
    const newRating = allResortReviews.reduce((s, r) => s + r.rating, 0) / allResortReviews.length;
    const resortIndex = db.resorts.findIndex(r => r.id === req.params.id);
    if (resortIndex !== -1) db.resorts[resortIndex].rating = parseFloat(newRating.toFixed(1));

    save();
    send(res, 201, { message: 'Review submitted successfully', review });
  },

  deleteReview(req, res, send) {
    const idx = db.reviews.findIndex(r => r.id === req.params.reviewId);
    if (idx === -1) return send(res, 404, { error: 'Review not found' });

    const review = db.reviews[idx];
    if (review.userId !== req.userId) {
      return send(res, 403, { error: 'You can only delete your own reviews' });
    }

    db.reviews.splice(idx, 1);
    save();
    send(res, 200, { message: 'Review deleted successfully' });
  },

  // ─── STATS ────────────────────────────────────────────────────────────────
  resortStats(req, res, send) {
    const resort = db.resorts.find(r => r.id === req.params.id);
    if (!resort) return send(res, 404, { error: 'Resort not found' });

    const reviews = db.reviews.filter(r => r.resortId === req.params.id);
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach(r => distribution[r.rating]++);

    const byCategory = {};
    for (const cat of VALID_CATEGORIES) {
      const catR = reviews.filter(r => r.category === cat);
      byCategory[cat] = {
        count: catR.length,
        avgRating: catR.length
          ? parseFloat((catR.reduce((s, r) => s + r.rating, 0) / catR.length).toFixed(2))
          : null,
      };
    }

    send(res, 200, {
      resortId: resort.id,
      resortName: resort.name,
      totalReviews: reviews.length,
      overallRating: reviews.length
        ? parseFloat((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(2))
        : resort.rating,
      ratingDistribution: distribution,
      byCategory,
    });
  },
};

module.exports = { handlers };
