# Stackwise

Stackwise is a financial management app for freelancers and small teams. It tracks software subscriptions, income, expenses, and client profitability in one place. It also forecasts cash flow, scores financial health, and produces tax reports with AI-assisted deduction scanning.

Built as a full-stack MERN project (course project for CSE 471).

## Features

- **Subscription management**: track recurring tools and their costs. Log usage, spot overlapping tools, and get cheaper-alternative recommendations.
- **Income & expenses**: record income (including recurring templates), categorise expenses, and import expenses from CSV. Receipts can be scanned for auto-fill (Cloudinary OCR).
- **Cash flow**: forecasts and insight cards over selectable periods.
- **Client profitability**: per-client/project income versus expenses.
- **Financial health score**: an overall score computed from your data.
- **Tax reports**: Bangladesh tax brackets and deductible-category rules, a Gemini-powered scan for missed deductions, and PDF report export.
- **Teams**: create or join multiple teams and switch the active one. Members file spending requests that admins approve.
- **Payments**: approved requests and subscriptions can be paid through SSLCOMMERZ hosted checkout. Payments are marked paid only after server-side validation.
- **Notifications**: in-app alerts plus email via the Gmail API, checked on a schedule.

## Tech stack

| Layer    | Technology |
| -------- | ---------- |
| Client   | React 19, Vite, React Router, Redux Toolkit, Tailwind CSS 4, Recharts, Axios, PapaParse |
| Server   | Node.js (ESM), Express 5, Mongoose, JWT (httpOnly cookie), Helmet, Multer, PDFKit |
| Database | MongoDB |
| Services | Cloudinary (receipt storage + OCR), Google Gemini (deduction scan), Gmail API (email), SSLCOMMERZ (payments) |
| Hosting  | Vercel (client and server are deployed as separate projects) |

## Project structure

```
Stackwise/
├── client/                 # React + Vite frontend
│   └── src/
│       ├── api/            # Axios wrappers per backend resource
│       ├── components/     # UI components (cashflow, expenses, team, ...)
│       ├── context/        # AuthContext
│       ├── pages/          # Route-level pages
│       ├── store/          # Redux store and slices
│       └── utils/
├── server/                 # Express API
│   ├── api/index.js        # Vercel serverless entry point
│   ├── scripts/            # seed-demo.js
│   ├── test/               # node:test suites
│   └── src/
│       ├── app.js          # Express app and route mounting
│       ├── server.js       # Local entry point
│       ├── controllers/  routes/  models/  services/
│       ├── jobs/           # Notification scheduler
│       ├── seeds/          # Tax rules and sample data seeders
│       └── middleware/  config/  utils/  data/
└── PAYMENT_AND_TEAMS_SETUP.md
```

## Getting started

### Prerequisites

- Node.js 20+ and npm
- A MongoDB database (local, or a free MongoDB Atlas cluster)
- Optional, for the matching features: Cloudinary, Gemini, Gmail API, and SSLCOMMERZ sandbox credentials

### 1. Install dependencies

```bash
git clone https://github.com/Sanjoyte/471_project.git
cd 471_project/Stackwise

npm install                  # root (concurrently)
npm install --prefix client
npm install --prefix server
```

### 2. Configure environment variables

```bash
cp server/.env.example server/.env
```

Edit `server/.env`. At minimum you need `MONGODB_URI` and `JWT_SECRET`. The app runs without the others, but the matching features are disabled.

| Variable | Purpose |
| -------- | ------- |
| `PORT`, `NODE_ENV`, `CLIENT_URL` | Server port, environment, and the allowed CORS origin (default `http://localhost:5173`) |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET`, `JWT_EXPIRES_IN`, `JWT_COOKIE_DAYS` | Auth token settings |
| `CLOUDINARY_*`, `OCR_*` | Receipt upload and OCR auto-fill (needs the Cloudinary OCR add-on) |
| `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN` | Email notifications (`gmail.send` scope) |
| `NOTIFICATION_CHECK_INTERVAL_MS` | Scheduler interval (default 6 hours, minimum 60000) |
| `SSLCOMMERZ_*`, `SERVER_PUBLIC_URL`, `PAYMENT_CUSTOMER_*` | Payments. See [PAYMENT_AND_TEAMS_SETUP.md](PAYMENT_AND_TEAMS_SETUP.md) |
| `GEMINI_API_KEY` | AI tax deduction scanning |

The client reads one optional variable, `VITE_API_URL`. It defaults to `http://localhost:5000/api`. Set it in `client/.env` when the API is hosted elsewhere.

### 3. Run

From the repository root, start the client and server together:

```bash
npm run dev
```

- Client: http://localhost:5173
- API: http://localhost:5000/api (health check at `/api/health`)

On startup the server connects to MongoDB and seeds the Bangladesh tax rules automatically.

To run them separately, use `npm run dev --prefix client` and `npm run dev --prefix server`.

### 4. (Optional) Load demo data

Sign up in the app first, then seed realistic clients, categories, income, and expenses for that account:

```bash
cd server
node scripts/seed-demo.js you@example.com
```

The script is safe to re-run. Existing demo clients with the same names are skipped.

## Scripts

| Location | Command | Description |
| -------- | ------- | ----------- |
| root | `npm run dev` | Run client and server concurrently |
| `client` | `npm run build` | Production build |
| `client` | `npm run lint` | ESLint |
| `client` | `npm run preview` | Preview the production build |
| `server` | `npm start` | Start the API with Node |
| `server` | `npm run dev` | Start the API with nodemon |
| `server` | `npm test` | Run tests (`node --test`) |

## API overview

All routes are prefixed with `/api` and, except auth, require the session cookie.

| Route prefix | Area |
| ------------ | ---- |
| `/auth` | Signup, login, logout, current user |
| `/subscriptions`, `/usage-analytics`, `/recommendations` | Subscriptions, usage, alternatives and overlap |
| `/incomes`, `/income-templates`, `/expenses`, `/expense-categories` | Income and expense tracking |
| `/clients`, `/profitability` | Client profitability |
| `/cash-flow`, `/financial-health` | Forecasts and health score |
| `/tax-reports` | Tax reports and AI deduction scans |
| `/teams`, `/team-requests`, `/payments` | Teams, spending requests, SSLCOMMERZ payments |
| `/notifications` | Alerts and preferences |

## Deployment

Both apps include a `vercel.json`. Deploy `client/` and `server/` as two Vercel projects.

- **Server**: `server/api/index.js` is the serverless entry. Set the environment variables from `.env.example` in the project settings, and set `CLIENT_URL` to the deployed client URL.
- **Client**: set `VITE_API_URL` to `https://<your-server-domain>/api`. `vercel.json` rewrites all non-asset paths to `index.html` for client-side routing.

## Further reading

- [PAYMENT_AND_TEAMS_SETUP.md](PAYMENT_AND_TEAMS_SETUP.md): SSLCOMMERZ setup, payment flow, and multi-team behaviour
