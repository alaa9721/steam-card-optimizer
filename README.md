# SteamCardOptimizer
Local: npm install && npm run dev  (http://localhost:3000)
Deploy: push to GitHub, import in Vercel, set env var SESSION_SECRET to a long random string
(e.g. `openssl rand -hex 32`). Steam login needs no API key.
Prices: Steam Community Market (per-card), cached 10 min, paced 1.5s per game.
