<p align="center">
  <img src="images/banner.svg" alt="Smart Kitchen: cook from what's already in your fridge" width="100%"/>
</p>

<p align="center">
  <a href="https://github.com/KovyD20/receptor/actions/workflows/ci.yml"><img src="https://github.com/KovyD20/receptor/actions/workflows/ci.yml/badge.svg" alt="CI"/></a>
  <img src="https://img.shields.io/badge/React-19-20232A?logo=react&logoColor=61DAFB" alt="React 19"/>
  <img src="https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white" alt="Express 5"/>
  <img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white" alt="PostgreSQL 16"/>
  <img src="https://img.shields.io/badge/Firestore-FFCA28?logo=firebase&logoColor=black" alt="Firestore"/>
  <img src="https://img.shields.io/badge/Gemini-4285F4?logo=google&logoColor=white" alt="Gemini"/>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT license"/></a>
</p>

**An AI kitchen assistant** that tracks your fridge, scales recipes, builds the shopping
list and asks Gemini what to cook from what you already have.

<!-- Hero GIF (15–20 s): fridge → "what should I cook?" → Gemini recipe → missing items to the list → "Hűtőbe rak".
<p align="center"><img src="images/demo.gif" alt="Smart Kitchen demo" width="100%"/></p>
-->

## Features

One responsive layout: a top tab bar and multi-column cards on desktop, a bottom tab bar
and a single column below 768 px.

<p align="center">
  <img src="images/showcase-desktop-recipe.png" alt="Desktop (Windows): recipe view with ingredients, steps and what's already in the fridge side by side" width="100%"/>
</p>

<p align="center">
  <img src="images/showcase-desktop-shopping.png" alt="Desktop (Windows): shopping list grouped by pantry category" width="100%"/>
</p>

<p align="center">
  <img src="images/showcase-mobile.png" alt="Mobile (Android): fridge, recipe and shopping list with the bottom tab bar" width="100%"/>
</p>

<details>
<summary>Desktop fridge view</summary>

<p align="center">
  <img src="images/showcase-desktop-fridge.png" alt="Desktop (Windows): fridge grouped by pantry category" width="100%"/>
</p>

</details>

- **Fridge** – items grouped into pantry categories automatically, with amount/unit steppers.
- **Recipes and cook mode** – amounts rescale with the serving count; cook mode reads step by step from across the kitchen.
- **Shopping list** – "2 dl" added to "1 l" merges instead of duplicating; one action moves the whole list into the fridge.
- **AI recipes** – by dish name, from your fridge contents, or imported from any recipe URL (schema.org JSON-LD first, page text as fallback).
- **Keyboard and images** – every view is keyboard-navigable; recipe photos upload to Firebase Storage as 1200 px WebP.

## Architecture

```mermaid
flowchart LR
    U([User<br/>phone / desktop]) --> SPA

    subgraph Browser["Browser · Vercel"]
        SPA[React SPA<br/>Vite · Firebase SDK]
        Auth[Firebase Auth<br/>ID token]
        FS[(Cloud Firestore<br/>per-user, real-time)]
        SPA --> Auth
        SPA --> FS
    end

    subgraph Server["Server · Render / Neon"]
        API[Express API<br/>token check · rate limit]
        AI[Google Gemini<br/>API key only here]
        PG[(PostgreSQL<br/>pantry catalog)]
        API --> AI
        API --> PG
    end

    SPA -->|Bearer ID token| API
```

The browser talks to Firestore **directly**: that is what makes real-time sync work, and
Firestore security rules scope access per user. The Express service exists for the two
things a browser must not do: hold the Gemini API key, and query PostgreSQL.

| Data | Store | Why |
|---|---|---|
| Fridge, recipes, shopping list | **Cloud Firestore** | private per user, real-time push (`onSnapshot`), user-scoped rules |
| Pantry catalog (categories, items, aliases) | **PostgreSQL** | global, shared, relational, unique normalized keys |

The catalog's `normalized_key` columns are computed at seed time by
[`backend/lib/normalize.js`](backend/lib/normalize.js). The browser runs a copy of the same
function, because the two workspaces cannot import from each other; both test suites walk
the shared cases in [`shared/normalizeCatalogText.cases.json`](shared/normalizeCatalogText.cases.json),
so a drift between the two fails CI.

## Engineering highlights

| | |
|---|---|
| **2** | databases, split on purpose: Firestore for per-user data, PostgreSQL for the shared catalog |
| **4** | AI endpoints, input and model output validated with `zod`, rate limited per user |
| **CI** | Vitest on both sides, frontend lint and build, on every push and pull request |

## How I built this

I specified the features and the data split myself and used AI assistants for much of the
implementation, reviewing and refactoring what they produced. The AI layer was rebuilt
once on `@google/genai` with retries and typed errors, so the UI can say which quota ran
out instead of failing silently. Recipe import tries the page's schema.org JSON-LD first
and only falls back to raw page text, and the prompt forbids inventing ingredients that
are not on the page. The backend and the browser normalize catalog text with twin
functions pinned by one shared set of test cases. The pantry seed upserts by default, and the truncating reset
is a separate command that prints the target database before it writes.

<details>
<summary><b>Built with</b></summary>

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 7, Three.js background ([Light Pillar](https://reactbits.dev) from React Bits), Firebase JS SDK |
| Backend | Node.js 22, Express 5, `pg`, `zod`, `helmet`, `express-rate-limit`, `firebase-admin` |
| Databases | PostgreSQL 16 (pantry catalog), Cloud Firestore (per-user data) |
| Auth and files | Firebase Authentication, Firebase Storage |
| AI | Google Gemini (`AI_MODEL`, default `gemini-3.6-flash`) via `@google/genai` |
| Tests / CI | Vitest, GitHub Actions |

Icons are inlined Font Awesome Free SVG paths; no icon webfont is shipped.

</details>

<details>
<summary><b>Getting started</b></summary>

The app runs as **two processes**: the Express API and the Vite dev server. You also need
a PostgreSQL instance and a Firebase project.

### Prerequisites

- **Node.js 22** (or 20+)
- **PostgreSQL 16**: local, a Docker container, or a free managed instance
  ([Neon](https://neon.tech/) / [Supabase](https://supabase.com/))
- A **Google Gemini API key**, free at [Google AI Studio](https://aistudio.google.com/app/apikey)
- A **Firebase project** from the [Firebase Console](https://console.firebase.google.com/) with
  - **Authentication**: *Email/Password* and *Google* enabled
  - **Firestore** and **Storage** created, restricted to the signed-in owner (rules below the list)
  - **Project Settings → Service accounts → Generate new private key**, so the backend can verify ID tokens

The security rules live in [`firestore.rules`](firestore.rules) and
[`storage.rules`](storage.rules): every document and image is readable and writable only
by its owner, and uploads are capped at 2 MB of `image/*`. Paste them into the console, or
deploy them with `firebase deploy --only firestore:rules,storage`.

### Installation

**1. Clone and install**

```bash
git clone https://github.com/KovyD20/receptor.git
cd receptor
(cd backend && npm install)
(cd frontend && npm install)
```

**2. Configure the backend**

```bash
cp backend/.env.example backend/.env
```

Fill in the PostgreSQL connection, `GEMINI_API_KEY`, and the three `FIREBASE_*` values from
the service-account JSON. Every variable is documented inline in the example file.

> The Gemini key lives **only** here. The frontend bundle is public, so a key there could be
> lifted and your quota burned. This is the main reason a separate backend exists at all.

**3. Configure the frontend**

```bash
cp frontend/.env.local.example frontend/.env.local
```

Fill in the `VITE_FIREBASE_*` values from Firebase Console → Project Settings → Your apps.
Without `VITE_FIREBASE_STORAGE_BUCKET` the app runs but every image upload fails. Leave
`VITE_API_BASE_URL` **empty** locally: Vite's dev proxy forwards `/api` to `localhost:3000`.

**4. Create and seed the pantry catalog**

```bash
cd backend
npm run db:setup     # applies db/schema.sql, then seeds the catalog
```

`npm run migrate` and `npm run seed` can also run separately and are safe to re-apply: the
schema is idempotent and seeding **upserts**. `npm run seed:reset` **truncates the catalog
tables** first, to match the seed data exactly. Both modes print the target host, port and
database before writing, so check that line: they write to whatever `DB_*` points at.

### Running the app

```bash
# Terminal 1: API on :3000
cd backend && npm run dev

# Terminal 2: SPA on :5173
cd frontend && npm run dev
```

Open **http://localhost:5173**, sign in, and use the five tabs: **Receptek** (browse),
**Recept** (selected recipe, servings, cook mode), **Bevásárlólista**, **Hűtő** and
**Új recept** (by hand, by AI, or from a URL). The header search covers recipes and list
items and is accent-insensitive: `turos` finds *Túrós csusza*.

</details>

<details>
<summary><b>API endpoints</b></summary>

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/health` | – | Liveness probe; returns `INSTANCE_NAME`, no DB access |
| `GET` | `/api/db/health` | – | Readiness probe; confirms PostgreSQL connectivity |
| `GET` | `/api/pantry/catalog` | – | Full pantry catalog (categories → items → aliases) |
| `POST` | `/api/ai/recipe-by-name` | Bearer | Generate a recipe from a dish name |
| `POST` | `/api/ai/suggest-from-fridge` | Bearer | Suggest dish ideas from fridge contents |
| `POST` | `/api/ai/recipe-from-fridge` | Bearer | Generate a full recipe restricted to fridge contents |
| `POST` | `/api/ai/recipe-from-url` | Bearer | Import a recipe from a web page (JSON-LD, else page text) |

`Bearer` means a Firebase ID token in `Authorization: Bearer <token>`. These routes are
rate limited to **20 requests per 15 minutes per user**, and request bodies are validated
with `zod`. Recipe, fridge and shopping-list CRUD is **not** here: the client does that
against Firestore directly. `restclient-test.http` has ready-made requests for the VS Code
REST Client extension.

</details>

<details>
<summary><b>Testing</b></summary>

```bash
cd backend  && npm test
cd frontend && npm test
cd frontend && npm run lint
```

Coverage focuses on the real business logic (unit conversion and merging, catalog
normalization and alias resolution, recipe import, Gemini error and JSON handling)
rather than a coverage percentage. [GitHub Actions](https://github.com/KovyD20/receptor/actions/workflows/ci.yml)
runs the backend tests and the frontend lint, tests and build on every push and pull
request to `master`.

</details>

<details>
<summary><b>Deployment</b></summary>

All free tier, all auto-deploy on push:

| Part | Host | Config in repo |
|---|---|---|
| Frontend (React build) | **Vercel** | [`frontend/vercel.json`](frontend/vercel.json) |
| Backend (Express) | **Render** | [`render.yaml`](render.yaml) blueprint |
| PostgreSQL (pantry catalog) | **Neon** | connection string → `DB_*` vars |
| Auth, per-user data, images | **Firebase** | free tier |

Point Render at the repo and it creates the service from `render.yaml`, prompting once for
the values marked `sync: false`, so no secret is committed.

Render's free tier spins the service down after 15 idle minutes and takes 30–60 s to wake.
That only delays the catalog fetch and the first AI call; sign-in and your own data go
straight to Firebase. A 10-minute keep-warm ping to `/health` removes the delay.

</details>

<details>
<summary><b>Local Docker demo (archived)</b></summary>

An earlier iteration ran the whole stack in Docker Compose: Nginx as reverse proxy and
round-robin load balancer over **two** backend replicas, plus a PostgreSQL container. It is
kept in [`archive/`](archive/) as a self-contained infrastructure demo:

```
archive/
├── docker-compose.yml           # nginx + backend1 + backend2 + postgres
├── backend/Dockerfile
├── infra/nginx/nginx.conf       # reverse proxy + upstream load balancing
├── infra/postgres/init.sql      # superseded by backend/db/schema.sql
└── scripts/                     # logs, restart, in-container helpers
```

Both replicas report their own `INSTANCE_NAME` from `/api/db/health`, so hitting it
repeatedly shows Nginx round-robining between them. **This is not the current way to run
the app**: it predates the Firestore/PostgreSQL split, so the compose files need updating
before they run again.

</details>

## Roadmap

The project grew in objectives; each row links the commits that closed it.

| | Objective | When | Commits |
|---|---|---|---|
| ✅ | **Recipe app core**: React + Express, recipe CRUD, tags and filters, fridge and shopping-list CRUD | Jan–Feb 2026 | [`18a89bf`](https://github.com/KovyD20/receptor/commit/18a89bf) [`7b368f3`](https://github.com/KovyD20/receptor/commit/7b368f3) |
| ✅ | **AI and accounts**: Gemini recipe generation, Firebase sign-in, per-user data, unit conversion | Feb 2026 | [`85dd445`](https://github.com/KovyD20/receptor/commit/85dd445) [`32169d4`](https://github.com/KovyD20/receptor/commit/32169d4) |
| ✅ | **Container demo**: Docker Compose, Nginx load balancing over two backend replicas | Feb 2026 | [`7dd8603`](https://github.com/KovyD20/receptor/commit/7dd8603) |
| ✅ | **Production backend**: pantry catalog in PostgreSQL, token auth, per-user rate limit, `zod` validation | Jul 2026 | [`7ff91cc`](https://github.com/KovyD20/receptor/commit/7ff91cc) [`171d476`](https://github.com/KovyD20/receptor/commit/171d476) |
| ✅ | **Tests and CI**: Vitest suites, GitHub Actions on every push | Jul 2026 | [`a92b105`](https://github.com/KovyD20/receptor/commit/a92b105) [`edbc4f3`](https://github.com/KovyD20/receptor/commit/edbc4f3) |
| ✅ | **Responsive redesign and deployment**: single-view tab shell, Vercel + Render + Neon | Jul 2026 | [`e4b3923`](https://github.com/KovyD20/receptor/commit/e4b3923) [`aa8bc37`](https://github.com/KovyD20/receptor/commit/aa8bc37) |
| ✅ | **Everyday use**: favourites, category colours, thumbnails, recipe photos, resilient AI layer | Aug 2026 | [`6d0a8c1`](https://github.com/KovyD20/receptor/commit/6d0a8c1) [`4f245e7`](https://github.com/KovyD20/receptor/commit/4f245e7) [`6ed7efb`](https://github.com/KovyD20/receptor/commit/6ed7efb) |
| ✅ | **Keyboard access**: every view and dialog usable without a mouse | Aug–Sep 2026 | [`e6975c5`](https://github.com/KovyD20/receptor/commit/e6975c5) [`ed1b718`](https://github.com/KovyD20/receptor/commit/ed1b718) |
| ✅ | **Recipe import from URL**: schema.org JSON-LD first, page text as fallback | Sep 2026 | [`b66d677`](https://github.com/KovyD20/receptor/commit/b66d677) [`d9b2235`](https://github.com/KovyD20/receptor/commit/d9b2235) [`8554183`](https://github.com/KovyD20/receptor/commit/8554183) |
| ✅ | **Shopping-list accuracy**: whole shop packages, unit aliases, catalog autocomplete | Aug–Sep 2026 | [`19006ea`](https://github.com/KovyD20/receptor/commit/19006ea) [`b0664be`](https://github.com/KovyD20/receptor/commit/b0664be) [`a31c9d6`](https://github.com/KovyD20/receptor/commit/a31c9d6) |

**Next**

- [ ] **Profiles and social**: public profiles, sharing recipes, comments and direct messages
- [ ] **Expiry dates**: an automatic expected expiry per product, editable by hand
- [ ] Live public demo
- [ ] Backend route tests for validation, auth and error codes

## License

[MIT](LICENSE)

## Contact

Kövy Dániel - (Daniel Koevy)

GitHub: https://github.com/KovyD20

LinkedIn: <https://www.linkedin.com/in/danielkovy>

E-mail: kovy.d20@gmail.com
