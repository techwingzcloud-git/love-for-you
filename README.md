# 💕 Love For You — Private Romantic Couple Website

A **secure, high-performance, two-user private romantic website** built with React + Vite (frontend) and Express + MongoDB + Socket.IO (backend).

---

## ✨ Features

- 🔐 **JWT Authentication** — Only 2 predefined accounts (Admin & User)
- 💬 **Real-Time Private Messaging** — Instagram-style DM with Socket.IO
- ✉️ **Love Letter** — Hidden inside the Surprise section with typewriter effect
- 📸 **Gallery** — Photo masonry with lightbox
- 🌸 **Memories** — Timeline of special moments
- 💌 **Our Story** — Expandable love story blocks
- 🎉 **Surprise** — Confetti celebration with embedded love letter
- 🎵 **Background Music** — Floating music player
- 📱 **Fully Responsive** — Mobile, tablet, desktop
- ♿ **WCAG Accessible** — ARIA labels, semantic HTML
- 🛡️ **Secure** — Helmet, rate limiting, input sanitization, encrypted passwords

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** v18+
- **MongoDB** (local or [MongoDB Atlas](https://cloud.mongodb.com) — free tier)

### 1. Install Dependencies

```bash
# Frontend
npm install

# Backend
cd server
npm install
```

### 2. Configure Environment

Edit `server/.env` with your credentials:

```env
secured 
```

### 3. Start MongoDB

```bash
# Local MongoDB
mongod

# Or use MongoDB Atlas (update MONGO_URI in .env)
```

### 4. Seed Users

```bash
cd server
npm run seed
```

### 5. Start Both Servers

```bash
# Terminal 1 — Backend
cd server
npm run dev

# Terminal 2 — Frontend
npm run dev
```

### 6. Login

Open `http://localhost:5173` and login with:
- **Admin:** `secured`
- **User:** `secured`

---

## 📁 Project Structure

```
love-for-you/
├── index.html
├── package.json
├── vite.config.js
├── src/
│   ├── main.jsx
│   ├── App.jsx              ← Routes + Auth protection
│   ├── context/
│   │   └── AuthContext.jsx   ← JWT auth state
│   ├── api/
│   │   └── messageApi.js     ← Axios + JWT interceptors
│   ├── components/
│   │   ├── Navbar.jsx/css    ← Nav with auth + scroll
│   │   ├── Footer.jsx/css
│   │   ├── MusicPlayer.jsx/css
│   │   └── HeartAnimation.jsx/css
│   ├── pages/
│   │   ├── Login.jsx/css     ← Auth login page
│   │   ├── Home.jsx/css      ← Landing + feature cards
│   │   ├── About.jsx/css     ← Love story
│   │   ├── Gallery.jsx/css   ← Photo gallery
│   │   ├── Memories.jsx/css  ← Timeline
│   │   ├── Surprise.jsx/css  ← Celebration + Love Letter
│   │   └── Messages.jsx/css  ← Private DM page
│   └── styles/
│       └── global.css         ← Design system
├── server/
│   ├── .env
│   ├── server.js             ← Express + Socket.IO
│   ├── config/db.js          ← MongoDB connection
│   ├── middleware/
│   │   ├── auth.js           ← JWT + RBAC
│   │   └── sanitize.js       ← XSS prevention
│   ├── models/
│   │   ├── User.js           ← User schema (2 max)
│   │   └── Message.js        ← Message schema
│   ├── routes/
│   │   ├── authRoutes.js     ← Login / me / partner
│   │   └── messageRoutes.js  ← CRUD messages
│   └── scripts/
│       └── seed.js           ← Create 2 users
```

---

## 🔐 Security Implementation

| Protection | Implementation |
|---|---|
| Password hashing | bcrypt (12 salt rounds) |
| Authentication | JWT tokens (7-day expiry) |
| User limit | Max 2 users enforced at DB level |
| No public signup | Login only, users are seeded |
| Input sanitization | HTML entity escaping on all inputs |
| Rate limiting | 200 req/15min (20 for auth) |
| Security headers | Helmet middleware |
| CORS | Whitelist origin-based |
| XSS prevention | Input sanitization + output escaping |

---

## ⚡ Performance Optimizations

- **Lazy loading** — All page components loaded on demand
- **Image optimization** — Lazy-loaded images with `loading="lazy"`
- **Code splitting** — React.lazy + Suspense per page
- **Efficient re-renders** — useMemo for memoized data
- **Socket.IO** — WebSocket-first transport (polling fallback)
- **DB indexing** — Compound indexes on messages

---

## 🎨 Design System

- **Fonts:** Pacifico (headings), Poppins (body), Dancing Script (accents)
- **Colors:** Pink-lavender gradient palette with CSS variables
- **Effects:** Glassmorphism, floating hearts, sparkles, typewriter
- **Animations:** Framer Motion spring/fade/scale transitions

---

## 📋 Deployment

### Frontend (Vercel / Netlify)
```bash
npm run build
# Deploy `dist/` folder
```

### Backend (Railway / Render)
```bash
cd server
npm start
```

Update `CLIENT_URL` in server `.env` and API base URL in `src/api/messageApi.js`.

---

Made with ❤️ and infinite love
