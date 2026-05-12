# Girls Trip 2026 — Travel Planner

Mediterranean luxury travel planner for **Alicyn, Felicia & Sabrina** — June 15–28, 2026.

## Running locally

```bash
npm install
npm run dev          # opens http://localhost:5173
```

---

## Firebase setup (required for real-time shared sync)

Without Firebase the app runs in **local mode** — data is only saved in your browser and not shared with the other travelers. Follow these steps once to unlock live sync across all devices.

### Step 1 — Create a Firebase project

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Click **Add project** → name it (e.g. `girls-trip-2026`) → Continue
3. Disable Google Analytics (not needed) → **Create project**

### Step 2 — Create a Realtime Database

1. In the left sidebar: **Build → Realtime Database**
2. Click **Create Database**
3. Choose the region closest to you
4. Select **Start in test mode** → **Enable**

### Step 3 — Get your config

1. Click the ⚙️ gear → **Project settings**
2. Scroll to **Your apps** → click `</>` (Web) → register app (any name)
3. Copy the `firebaseConfig` object values

### Step 4 — Create your .env file

```bash
cp .env.example .env
```

Fill in your values:

```
VITE_FB_API_KEY=AIza...
VITE_FB_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FB_DATABASE_URL=https://your-project-default-rtdb.firebaseio.com
VITE_FB_PROJECT_ID=your-project
VITE_FB_STORAGE_BUCKET=your-project.appspot.com
VITE_FB_MESSAGING_SENDER_ID=123456789
VITE_FB_APP_ID=1:123...
```

Restart `npm run dev` — the yellow banner disappears and the header shows "🔄 synced".

---

## Deploying to Vercel (shareable URL for all three of you)

### First-time deploy

```bash
npm install -g vercel
vercel login
vercel --prod
```

Accept all defaults. Vercel prints a URL like `https://girls-trip-2026.vercel.app`.

### Add your Firebase env vars to Vercel

1. Go to [vercel.com](https://vercel.com) → your project → **Settings → Environment Variables**
2. Add each `VITE_FB_*` key from your `.env` file (all three environments)
3. **Save** → **Deployments → Redeploy**

Send the URL to Felicia and Sabrina — any edit any of you makes appears on everyone's screen in real time.

---

## Database rules (after 30-day test window expires)

In Firebase console → Realtime Database → Rules:

```json
{
  "rules": {
    "girlstrip2026_v1": {
      ".read": true,
      ".write": true
    }
  }
}
```
