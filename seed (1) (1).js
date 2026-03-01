// seed.js — Marriott Review Intelligence · Full Dataset
// Run: node seed.js
// Seeds 10 hotels × ~150 reviews each = ~1500 total reviews
// Sources: google, tripadvisor, makemytrip, booking.com, agoda, internal

const mongoose = require('mongoose');

mongoose.connect('mongodb://127.0.0.1:27017/marriott_reviews')
  .then(() => console.log('✅  MongoDB connected'))
  .catch(err => { console.error(err); process.exit(1); });

// ── Schemas (must match server.js) ───────────────────────────────
const hotelSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: String, city: String, location: String,
  rating: Number, reviewCount: Number, imageIndex: Number,
});
const reviewSchema = new mongoose.Schema({
  hotelId: String, hotelName: String, author: String,
  rating: Number, text: String, source: String,
  sentiment: String, categories: [String],
  urgency: { type: String, default: null },
  urgencyReason: String, festivalTag: String,
  requiresAction: Boolean, date: Date,
});
const Hotel  = mongoose.model('Hotel',  hotelSchema);
const Review = mongoose.model('Review', reviewSchema);

// ── Hotels ────────────────────────────────────────────────────────
const HOTELS = [
  { id:'mh001', name:'W Marriott Juhu',           city:'Mumbai',      location:'Mumbai, Maharashtra',    rating:4.7, reviewCount:3842, imageIndex:0 },
  { id:'mh002', name:'Marriott Marquis Mumbai',   city:'Mumbai',      location:'Mumbai, Maharashtra',    rating:4.5, reviewCount:2156, imageIndex:1 },
  { id:'mh003', name:'JW Marriott Bangalore',     city:'Bangalore',   location:'Bengaluru, Karnataka',   rating:4.6, reviewCount:2984, imageIndex:2 },
  { id:'mh004', name:'Marriott Hotel New Delhi',  city:'New Delhi',   location:'New Delhi, Delhi',       rating:4.4, reviewCount:1923, imageIndex:3 },
  { id:'mh005', name:'Marriott Pune',             city:'Pune',        location:'Pune, Maharashtra',      rating:4.3, reviewCount:1567, imageIndex:4 },
  { id:'mh006', name:'JW Marriott Kolkata',       city:'Kolkata',     location:'Kolkata, West Bengal',   rating:4.5, reviewCount:2201, imageIndex:5 },
  { id:'mh007', name:'Marriott Hotel Chandigarh', city:'Chandigarh',  location:'Chandigarh, Punjab',     rating:4.3, reviewCount:987,  imageIndex:6 },
  { id:'mh008', name:'Sheraton Grand Bangalore',  city:'Bangalore',   location:'Bengaluru, Karnataka',   rating:4.4, reviewCount:1876, imageIndex:7 },
  { id:'mh009', name:'W Mumbai',                  city:'Mumbai',      location:'Mumbai, Maharashtra',    rating:4.6, reviewCount:2543, imageIndex:8 },
  { id:'mh010', name:'Marriott Hyderabad',        city:'Hyderabad',   location:'Hyderabad, Telangana',   rating:4.5, reviewCount:1654, imageIndex:9 },
];

// ── Indian Names ──────────────────────────────────────────────────
const NAMES = [
  'Arjun Mehta','Priya Nair','Rohit Sharma','Sneha Iyer','Vikram Kapoor',
  'Kavya Reddy','Aditya Kumar','Meera Joshi','Dhruv Malhotra','Ananya Singh',
  'Siddharth Rao','Tanvi Desai','Karan Shah','Ishaan Gupta','Pooja Verma',
  'Rajesh Pillai','Deepa Nambiar','Suresh Krishnan','Lakshmi Venkat','Mohan Iyer',
  'Chetan Bhatt','Ritu Agarwal','Nikhil Bose','Swati Pandey','Gaurav Chawla',
  'Nisha Patel','Abhishek Tiwari','Shruti Menon','Varun Bhatia','Divya Shetty',
  'Harish Murthy','Neha Jain','Pranav Kulkarni','Sunita Rao','Amit Mishra',
  'Pallavi Nair','Manish Dubey','Kritika Singh','Samir Khanna','Anjali Kapoor',
  'Raghav Pillai','Shreya Ghosh','Vivek Thakur','Namrata Shah','Kunal Bajaj',
  'Preeti Chauhan','Rishabh Verma','Sonam Agarwal','Tarun Banerjee','Reena Misra',
  'Vishal Tiwari','Madhu Krishnamurthy','Arun Nambiar','Geeta Bhatnagar','Sanjay Kulkarni',
  'Bindu Srivastava','Prakash Venkatesh','Hema Reddy','Naveen Sharma','Divyanka Gupta',
];

// ── Review Text Templates (per platform tone) ─────────────────────
const TEMPLATES = {
  food: {
    positive: [
      'Breakfast buffet was phenomenal — fresh ingredients, great variety. Worth every rupee.',
      'Fine dining at its absolute best. The signature restaurant exceeded all expectations.',
      'Best hotel breakfast anywhere in India. The chef takes immense pride in every dish.',
      'Room service arrived promptly, everything was delicious. The truffle risotto is unmissable.',
      'Sunday brunch spread was world-class — live counters, fresh seafood, exquisite desserts.',
      'Butter chicken and dal makhani at the restaurant were extraordinary. Tasted like home.',
      'Poolside grill was excellent. Grilled fish with herb butter — absolutely outstanding.',
      'Afternoon tea with finger sandwiches and freshly baked scones was a memorable experience.',
      "Chef's Table tasting menu with wine pairings was flawlessly executed across seven courses.",
      'The Japanese restaurant is a hidden gem. Sushi quality rivalled any top Tokyo restaurant.',
      'Local Indian breakfast counter — idli, dosa, poha — all made fresh and piping hot.',
      'Thin-crust wood-fired pizzas from all-day dining were surprisingly authentic and well-made.',
    ],
    negative: [
      'Breakfast was cold and the selection very limited for a property of this calibre.',
      'Room service took 90 minutes. Everything was lukewarm when it finally arrived.',
      'Restaurant overpriced for mediocre quality. Expected significantly better from Marriott.',
      'Dietary restrictions ignored despite informing staff twice at check-in.',
      'Coffee at breakfast was undrinkably bitter. Had to use the Nespresso in my room.',
      'Mini bar not restocked for two consecutive days despite multiple requests.',
      'All-day dining menu has not changed in over a year. Very stale for repeat guests.',
      'Found a hair in my soup. No apology, no replacement offered by the waiter.',
      'Restaurant took 40 minutes to acknowledge us despite a confirmed reservation.',
    ],
    neutral: [
      'Food was decent — standard hotel fare. Nothing extraordinary but satisfactory.',
      'Breakfast was adequate but I expected more variety at this price point.',
      'Room service was fine. Average taste, decent presentation, reasonable speed.',
      'Restaurant is good for a quick meal but not a dining destination in itself.',
      'Menu variety is acceptable. Would be nice to see more regional Indian options.',
    ],
  },
  ambiance: {
    positive: [
      'Lobby design is stunning. Architecture alone makes it worth a visit.',
      'Rooftop bar has the most spectacular city views I have seen from any hotel.',
      'Interior design is exquisite — every corner thoughtfully and beautifully curated.',
      'Golden hour view from the pool deck is breathtaking. Stayed longer than planned.',
      'Heritage wing restored with incredible care and attention to architectural detail.',
      'Mood lighting throughout is perfectly calibrated — warm, luxurious, never garish.',
      'Lobby garden atrium is a serene oasis in the middle of a chaotic city.',
      'Art installations curated beautifully. Feels more like a gallery than a hotel corridor.',
      'The spa relaxation lounge is the most tranquil space I have encountered anywhere.',
      'Bar live jazz creates the perfect atmosphere for a late evening drink.',
    ],
    negative: [
      'Lobby extremely noisy. Construction outside made relaxation completely impossible.',
      'My room faced the parking lot. For this price, a decent view should be guaranteed.',
      'Renovation left common areas unfinished. Scaffolding in the lobby is unacceptable.',
      'Hallways on floors 4–6 smell musty — likely a ventilation issue needing urgent attention.',
      'Bar lighting so dim that reading the menu is genuinely difficult. Style over function.',
      'Pool area sandwiched between two noisy function halls. Not the retreat advertised.',
    ],
    neutral: [
      'Pleasant atmosphere — standard for a hotel in this category.',
      'Tasteful decor, nothing that sets it apart from competitors.',
      'Design is safe and inoffensive. Not inspiring but not unpleasant.',
      'Common areas well maintained. No complaints, nothing remarkable.',
    ],
  },
  amenities: {
    positive: [
      'Spa experience was world-class. Hot stone massage was one of the best I have had.',
      'State-of-the-art fitness center with every machine needed. Open 24/7.',
      'Heated infinity pool, impeccable towel service, Molton Brown toiletries — pure luxury.',
      'Business centre fully equipped and private. Perfect for back-to-back work calls.',
      'Club lounge access was excellent value. Evening cocktails and canapés were quality.',
      'Pillow menu is a thoughtful touch. Memory foam option gave me the best hotel sleep.',
      'Complimentary pressing service for suits handled perfectly — came back immaculate.',
      'Concierge arranged a private car and tour better than any travel agency could.',
      "Kids' club kept my children entertained all day. Well-supervised, creative activities.",
      'In-room technology seamless — tablet control, blackout blinds, sound system all perfect.',
    ],
    negative: [
      'Several gym machines out of order for my entire three-day stay. No alternative offered.',
      'Pool closed without prior notice. Found out only after arriving with family in swimwear.',
      'WiFi dropped constantly during work calls. Completely unacceptable for a business hotel.',
      'Sauna had a broken temperature control. Staff aware but no timeline given for repair.',
      'Spa fully booked my entire stay. No one mentioned this at check-in.',
      'Club lounge overcrowded in the evening. Drinks ran out before 7pm, no seats available.',
      'Elevator wait times excessive — over 8 minutes at peak hours. Needs urgent attention.',
      'Pool towels ran out by 11am on weekends. Completely inadequate stock for guest numbers.',
    ],
    neutral: [
      'Standard amenities — adequate gym, functional pool. Nothing stands out.',
      'WiFi workable, not fast. Pool area could use more loungers.',
      'Spa offers a reasonable range of treatments. Pricing on the higher side.',
      'Business facilities functional. Meeting room clean and well-lit.',
      'Club lounge decent. Selection good but not exceptional.',
    ],
  },
  service: {
    positive: [
      'Concierge went above and beyond to arrange a last-minute anniversary dinner. Extraordinary.',
      'Staff remembered my name and coffee preference from day one throughout my entire stay.',
      'Housekeeping thoughtful and thorough. Handwritten note and chocolates each evening.',
      'Check-in seamless — room ready 3 hours early, escorted personally by the duty manager.',
      'Front desk proactively upgraded my room on arrival. No request needed. Outstanding.',
      'Bell staff helped navigate a missed connecting flight — well beyond their job description.',
      'The GM personally called to wish me on my birthday. Exceptional personalised attention.',
      'Maintenance came within 12 minutes and fixed the AC issue completely. Zero disruption.',
      'Butler service in the suite flawless — attentive without being intrusive.',
      'Order was wrong but correction arrived in 15 minutes with a complimentary dessert.',
      'Hostess at breakfast remembered my dietary preferences from the previous day.',
      'Security handled a floor disturbance with complete discretion and professionalism.',
    ],
    negative: [
      'Waited 45 minutes at check-in despite no visible queue. Staff completely disorganised.',
      'Front desk cold and dismissive when I raised a concern. Contrary to Marriott standards.',
      'Housekeeping entered without knocking despite a Do Not Disturb sign clearly displayed.',
      'Wake-up call missed. Caused me to be late for a crucial business meeting.',
      'Concierge gave wrong directions and refused to accept responsibility.',
      'Hypoallergenic pillow requested at check-in and again at 9pm — never arrived.',
      'Pool bar staff ignored us for 20 minutes despite repeated eye contact.',
      'Valet returned my car with a new scratch. Management initially disputed it.',
      'Night manager dismissive about loud party on my floor at 2am.',
      'Check-out bill had three extra charges. Took 40 minutes of back-and-forth to reverse.',
      'Loyalty benefits not applied despite Bonvoy number given at booking.',
    ],
    neutral: [
      'Service professional but felt automated, lacking genuine warmth.',
      'Staff helpful enough but interactions felt transactional.',
      'Check-in efficient if not particularly warm. Got everything needed without delay.',
      'Service levels consistent — no highs or lows to report.',
      'Team competent and well-trained. Would benefit from more personalisation.',
    ],
  },
};

// ── Platform-specific tone wrappers ──────────────────────────────
// Each platform has slightly different phrasing to feel authentic
const PLATFORM_PREFIXES = {
  google:       ['', 'Great stay — ', 'Visited last month — ', 'Came here for work — ', '5 stars — ', 'Highly recommend — '],
  tripadvisor:  ['Reviewed after my stay: ', 'TripAdvisor review — ', 'Traveled with family — ', 'Solo business trip — ', 'Anniversary stay — ', 'Weekend getaway — '],
  makemytrip:   ['Booked via MakeMyTrip — ', 'MMT booking — ', 'Verified stay — ', 'MakeMyTrip guest — ', 'Booked for holiday — ', ''],
  'booking.com':['Booking.com verified guest — ', 'Stayed for ', 'Booked for business — ', 'Family trip — ', '', 'Long weekend — '],
  agoda:        ['Agoda guest — ', 'Booked via Agoda — ', 'Verified review — ', 'Stayed here via Agoda — ', '', 'Quick trip — '],
  internal:     ['[In-house QR review] ', '[Direct feedback] ', '[Front desk form] ', '[Bonvoy member feedback] ', ''],
};

// ── Festival / Occasion Reviews (5 per hotel) ────────────────────
const FESTIVAL_REVIEWS = [
  {
    text: 'Celebrated Diwali here with the whole family — 12 of us! The lobby was lit with diyas and marigold garlands. The special Diwali thali dinner was outstanding, and they arranged a small fireworks display from the terrace. Truly a Diwali to remember. This will be our annual tradition from now on.',
    category: 'ambiance', sentiment: 'positive', festivalTag: '🪔 Diwali Stay', rating: 5,
  },
  {
    text: 'Stayed during Navratri and was blown away by the Garba night in the banquet hall. Dhol players were excellent, staff joined in the dancing, and the Gujarati thali was the best I have had outside Ahmedabad. Even the corridors had dandiya decorations. Absolutely brilliant effort by the events team.',
    category: 'food', sentiment: 'positive', festivalTag: '🎶 Navratri Night', rating: 5,
  },
  {
    text: 'Brought my parents for Eid. The hotel had a special Eid brunch — sewaiyan, biryani, and live qawwali in the evening. Staff wished us warmly, and the room had a small gift basket. These thoughtful touches mean the world during a festival. Highly recommended for family occasions.',
    category: 'food', sentiment: 'positive', festivalTag: '🌙 Eid Celebration', rating: 5,
  },
  {
    text: 'Holi weekend here was the most joyful festival experience I have had at any hotel. Organic colours, a massive lawn party, live dhol, chilled thandai, and gujiya platters everywhere. Staff were fully participative and nothing was too much trouble. Already booked for next year.',
    category: 'ambiance', sentiment: 'positive', festivalTag: '🎨 Holi Weekend', rating: 5,
  },
  {
    text: 'Checked in for Dussehra and was surprised by the Ramlila performance in the courtyard. The kids were completely mesmerised. The hotel also left motichoor laddoos in our room and decorated with flowers. Small gesture, massive impact. The spirit of the festival was alive here.',
    category: 'ambiance', sentiment: 'positive', festivalTag: '✨ Dussehra Stay', rating: 5,
  },
];

// ── Urgent / Critical Reviews (injected across hotels) ───────────
const URGENT_REVIEWS = [
  { text: 'Found cockroaches in the bathroom on two consecutive nights. Completely unacceptable. Filing a formal complaint with the health authorities.', category: 'amenities', sentiment: 'negative', urgency: 'critical', urgencyReason: 'Health & Hygiene Violation', rating: 1 },
  { text: 'Fire alarm went off at 3am with no clear staff evacuation protocol. Guests stood confused for over 15 minutes. A serious safety failure.', category: 'service', sentiment: 'negative', urgency: 'critical', urgencyReason: 'Safety Risk', rating: 1 },
  { text: 'Mould visible on bathroom ceiling and around shower tiles. My children stayed in this room. Demanding immediate response and full refund.', category: 'amenities', sentiment: 'negative', urgency: 'critical', urgencyReason: 'Health & Hygiene Violation', rating: 1 },
  { text: 'AC leaked water overnight, I slipped and nearly fell. Called front desk three times, no one came. Completely unacceptable.', category: 'amenities', sentiment: 'negative', urgency: 'critical', urgencyReason: 'Safety Risk', rating: 1 },
  { text: 'Family member had an allergic reaction after a dish marked nut-free contained nuts. No manager came to speak with us. Escalating to FSSAI.', category: 'food', sentiment: 'negative', urgency: 'critical', urgencyReason: 'Health & Safety — Allergen Failure', rating: 1 },
  { text: 'Platinum Bonvoy member — no upgrade, no welcome amenity, 45-minute check-in. Will be requesting a full audit and escalating to Marriott corporate.', category: 'service', sentiment: 'negative', urgency: 'high', urgencyReason: 'Loyalty Program Escalation', rating: 2 },
  { text: 'Posted photos of my filthy room on Instagram — already 8,000 views. Stained carpet, unemptied bin, used towel from previous guest still present.', category: 'amenities', sentiment: 'negative', urgency: 'high', urgencyReason: 'Social Media Exposure Risk', rating: 2 },
  { text: 'Wallet went missing from the room. Security team was unhelpful and dismissive. A police report has been filed.', category: 'service', sentiment: 'negative', urgency: 'critical', urgencyReason: 'Security Incident', rating: 1 },
  { text: 'Booked a suite for my wedding night — given a standard room. Manager refused to rectify. This ruined a once-in-a-lifetime occasion. Demanding full refund.', category: 'service', sentiment: 'negative', urgency: 'high', urgencyReason: 'Major Service Failure', rating: 2 },
  { text: 'Elevator stuck 25 minutes with my elderly mother inside. Emergency phone was non-functional. Completely unacceptable maintenance failure.', category: 'amenities', sentiment: 'negative', urgency: 'critical', urgencyReason: 'Safety — Equipment Failure', rating: 1 },
];

const SOURCES = ['google', 'tripadvisor', 'makemytrip', 'booking.com', 'agoda', 'internal'];
const CATS    = ['food', 'ambiance', 'amenities', 'service'];
const SENT_W  = ['positive','positive','positive','positive','neutral','neutral','negative'];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function daysAgo(n) { return new Date(Date.now() - n * 86400000); }

// ── Seed ─────────────────────────────────────────────────────────
async function seed() {
  try {
    await Hotel.deleteMany({});
    await Review.deleteMany({});
    console.log('🗑   Cleared existing data\n');

    for (const hotel of HOTELS) {
      await Hotel.create(hotel);
      console.log(`🏨  Seeding: ${hotel.name}`);

      const reviews = [];
      let dayOffset = 1;

      // ── 5 Festival reviews ────────────────────────────────────
      for (const fest of FESTIVAL_REVIEWS) {
        reviews.push({
          hotelId:   hotel.id,
          hotelName: hotel.name,
          author:    pick(NAMES),
          rating:    fest.rating,
          text:      fest.text,
          source:    pick(['google','tripadvisor','makemytrip']),
          sentiment: fest.sentiment,
          categories:[fest.category],
          festivalTag: fest.festivalTag,
          requiresAction: false,
          date: daysAgo(dayOffset++),
        });
      }

      // ── Urgent reviews (2 per hotel, cycling through URGENT_REVIEWS) ──
      for (let u = 0; u < 2; u++) {
        const urg = URGENT_REVIEWS[(HOTELS.indexOf(hotel) * 2 + u) % URGENT_REVIEWS.length];
        reviews.push({
          hotelId:   hotel.id,
          hotelName: hotel.name,
          author:    pick(NAMES),
          rating:    urg.rating,
          text:      urg.text,
          source:    pick(SOURCES),
          sentiment: urg.sentiment,
          categories:[urg.category],
          urgency:   urg.urgency,
          urgencyReason: urg.urgencyReason,
          requiresAction: true,
          date: daysAgo(dayOffset++),
        });
      }

      // ── Regular reviews: ~145 reviews evenly across sources ───
      const perSource = 24; // ~24 per source × 6 sources = 144 + 7 above = 151 total
      for (const source of SOURCES) {
        const prefixes = PLATFORM_PREFIXES[source];
        for (let i = 0; i < perSource; i++) {
          const cat    = CATS[i % CATS.length];
          const sent   = SENT_W[i % SENT_W.length];
          const pool   = TEMPLATES[cat][sent];
          const prefix = pick(prefixes);
          const rawText = pool[i % pool.length];
          const text   = prefix ? prefix + rawText.charAt(0).toLowerCase() + rawText.slice(1) : rawText;

          const isHighImp = sent === 'negative' && i % 9 === 0;

          reviews.push({
            hotelId:   hotel.id,
            hotelName: hotel.name,
            author:    pick(NAMES),
            rating:    sent === 'positive' ? (Math.random() > 0.3 ? 5 : 4)
                     : sent === 'negative' ? (Math.random() > 0.4 ? 1 : 2)
                     : 3,
            text,
            source,
            sentiment: sent,
            categories:[cat],
            urgency:   isHighImp ? 'high' : null,
            urgencyReason: isHighImp ? 'Repeated Negative Pattern' : null,
            requiresAction: isHighImp,
            date: daysAgo(dayOffset + i + randInt(0, 3)),
          });
        }
        dayOffset += perSource;
      }

      await Review.insertMany(reviews);
      console.log(`   ✓ ${reviews.length} reviews inserted (${SOURCES.map(s => s + ':' + reviews.filter(r => r.source === s).length).join(', ')})`);
    }

    const total = await Review.countDocuments();
    console.log(`\n✅  Seeding complete — ${total} total reviews across ${HOTELS.length} hotels`);
    mongoose.disconnect();
  } catch (err) {
    console.error('❌  Seed error:', err);
    mongoose.disconnect();
  }
}

seed();
