# TCG App — Changelog

---

## Pre-Session History (Git Commits)

### Initial Commit — Full-stack Pokemon TCG App
- NestJS backend with PostgreSQL (via Prisma ORM)
- React + Vite frontend with TypeScript and Tailwind CSS
- User authentication with JWT (access + refresh tokens)
- Browse Cards page with search and filters
- Collection management (create, view, delete collections, add cards)
- Deck builder with card browser and quantity management
- Basic dashboard with stats

### Add README and card filters/modal
- Added README with setup instructions
- Card detail modal with attacks, abilities, legality info
- Additional card filters (type, supertype, set)

### Make all pages mobile responsive
- Responsive grid layouts across all pages
- Mobile-friendly nav, modals, and card grids

### Update .gitignore
- Excluded build artifacts, environment files, and IDE configs

### Add full Docker containerization
- `docker-compose.yml` with three services: PostgreSQL, backend, frontend
- Dockerfiles for both backend (NestJS) and frontend (Nginx)
- Healthcheck on PostgreSQL before backend starts
- Persistent volume for database data

### Add AI module, Tavily web search, fix gitignore, and clean up linting
- OpenAI GPT integration for the Deck Advisor chat
- Tavily web search tool so the AI can look up current meta/tournament info
- AI can search the web when asked about current meta, tier lists, new sets
- Linting fixes across the codebase

---

## Session Changes (VS Code — Unreleased)

### Dashboard — TCG News Overhaul

**News section redesign:**
- Replaced flat article grid with a single-article carousel (Prev/Next buttons)
- Auto-rotation every 4 seconds with a smooth CSS fade transition (opacity 0.25s)
- Pagination counter (`1 / 5`) pinned to the bottom of the card
- "View full article →" link opens the source URL in a new tab

**Tavily query improvements:**
- Updated news query: `"Pokemon TCG new set release 2026"`
- Updated events query: `"Pokemon TCG regionals championships April May 2026"`
- Added `searchDepth: 'advanced'`, `days: 30`, and domain whitelist (`pokemon.com`, `pokebeach.com`, `pokeguardian.com`) to both queries to filter out stale 2025 articles

**AI-powered news summaries (`dashboard.service.ts`):**
- After Tavily fetches articles, a single GPT-4o-mini call summarizes all 5 articles in one batch request
- Summaries are 2–3 clean sentences — no markdown, no cut-off text, no `#` headers
- Falls back to raw Tavily content if OpenAI call fails
- Summaries are cached alongside articles for 24 hours (one AI call per day)

---

### Dashboard — Visual Polish

**Stats bar:**
- Replaced rainbow-colored stat cards with a uniform indigo gradient background (`#1e1b4b → #16143a`)
- All 4 stats share the same indigo left border accent

**Section cards:**
- Added layered `box-shadow` (`0 4px 6px rgba(0,0,0,0.3)`) to all section cards for depth
- Section headers have a bottom border accent (`border-bottom: 2px solid #6366f1`)

**Featured Card:**
- White glow effect (`box-shadow: 0 0 20px rgba(255,255,255,0.3)`)
- Hover to enlarge: `scale(1.1)` with glow intensifying on hover
- Smooth 300ms transition

**Quick Actions:**
- Gradient backgrounds on all buttons (`indigo` for Browse/Decks, `violet` for AI)
- `translateY(-2px)` lift on hover with deeper shadow

**Page load animation:**
- Entire dashboard content fades in on mount (`opacity 0→1`, `translateY 10px→0`, 400ms)

---

### Full App Color Theme Redesign (60-30-10 Rule)

Applied a unified color system across all 8 UI files.

**Color palette:**
| Role | Color | Tailwind |
|---|---|---|
| Background | `#0f172a` | `slate-900` |
| Cards / sections | `#1e293b` | `slate-800` |
| Hover / inputs | `#334155` | `slate-700` |
| Primary text | `#f1f5f9` | `slate-100` |
| Muted text | `#94a3b8` | `slate-400` |
| Primary (indigo) | `#6366f1` | `indigo-600` |
| AI / special (violet) | `#8b5cf6` | `violet-600` |
| Success / add | `#22c55e` | `green-600` |
| Danger / delete | `#ef4444` | `red-600` |

**Files updated:** `Nav.tsx`, `Dashboard.tsx`, `Cards.tsx`, `Collection.tsx`, `Decks.tsx`, `DeckDetail.tsx`, `Advisor.tsx`, `FloatingChat.tsx`

**Key changes per area:**
- **Nav**: Removed per-link rainbow colors → all links `slate-400`, active link `indigo-400`
- **Buttons**: All primary actions → indigo; AI features → violet; Add → green; Delete → red
- **Legal badges**: Muted (`bg-green-900 text-green-300` / `bg-red-900 text-red-400`) instead of loud solid colors
- **Format badges**: Standard → `indigo-900/indigo-300`; Unlimited → `slate-700/slate-300`
- **Chat bubbles**: User → indigo; AI → `slate-700`; Loading dots → indigo
- **FloatingChat button**: Changed from blue to violet
- **All modals**: `slate-800` background, `slate-700` inputs, `indigo-500` focus ring

---

### Navigation — Sliding Pill Indicator

**New pill effect (`Nav.tsx`):**
- A single semi-transparent indigo pill (`rgba(99,102,241,0.25)`) sits behind the active nav link
- Pill slides smoothly between links on route change (`transition: left 0.3s ease, width 0.3s ease`)
- Subtle glow: `box-shadow: 0 0 12px rgba(99,102,241,0.4)`
- Inactive links: `#94a3b8` (muted); active link: `#f1f5f9` (near white)

**Dashboard added to nav:**
- Nav order: Dashboard → Browse Cards → Collection → Decks → Deck Advisor
- Dashboard highlights on `/` (exact match); all others use `startsWith`

**Animation correctness fixes:**
- `useLayoutEffect` used instead of `useEffect` — pill position is calculated before the browser paints, eliminating the "blink to position 0" bug
- `didMount` ref tracks first render — pill snaps instantly on mount (no animation), then enables smooth transitions via `requestAnimationFrame` for subsequent clicks

---

### Architecture — Persistent Layout

**Problem:** `Nav` was rendered inside each page component, causing it to unmount and remount on every navigation. This reset all animation state on every click.

**Fix (`App.tsx`):**
- Created `AppLayout` component that renders `<Nav />` once at the top and uses React Router's `<Outlet />` for page content
- All authenticated routes are nested under `AppLayout` — Nav now mounts once for the entire session
- Pages no longer import or render `Nav` themselves
- Removed redundant `min-h-screen bg-slate-900` wrappers from all page root divs (now provided by `AppLayout`)

---

### Page Transitions

**Smooth fade-in on navigation (`index.css` + `App.tsx`):**
- Added `@keyframes pageFadeIn` — `opacity: 0 → 1`, `translateY: 6px → 0`, 200ms ease-out
- `AppLayout` wraps `<Outlet />` in a `div` keyed on `location.pathname` — every route change replays the animation
- Hides layout shifts caused by async data loading

**Scrollbar fix (`index.css`):**
- `scrollbar-gutter: stable` — always reserves scrollbar space so the nav never shifts width between pages
- `color-scheme: dark` — browser uses dark defaults before CSS loads, eliminating the white scrollbar flash
- Custom scrollbar styling: track matches `slate-900` (invisible on short pages), thumb is `slate-700` (visible only when scrolling is possible)

---

### Collection Page — Layout Shift Fix

**Problem:** On page load, cards would briefly appear at the top of the page then snap down when stats loaded.

**Root cause:** `fetchCollections` called `selectCollection` without awaiting it, then immediately set `loading = false`. The page rendered before collection detail or stats were ready. Stats arrived last (sequential API calls), pushing the card grid down.

**Fix (`Collection.tsx`):**
- `selectCollection` now fetches collection detail and stats **in parallel** via `Promise.all` — both arrive together, no intermediate render without stats
- `fetchCollections` now **awaits** `selectCollection` before calling `setLoading(false)` — the loading spinner stays up until all data is ready, then the complete layout renders in one shot

---

## Files Changed This Session

| File | Changes |
|---|---|
| `backend/src/dashboard/dashboard.service.ts` | New file — dashboard stats, Tavily news/events, AI summarization |
| `backend/src/dashboard/dashboard.controller.ts` | New file — REST endpoints for stats, news, events |
| `backend/src/dashboard/dashboard.module.ts` | New file — NestJS module wiring |
| `backend/src/ai/ai.service.ts` | Added OpenAI client, batch summarization method |
| `backend/src/app.module.ts` | Registered DashboardModule |
| `frontend/src/App.tsx` | Added AppLayout, persistent Nav, page transition wrapper |
| `frontend/src/index.css` | Scrollbar styling, page fade-in animation |
| `frontend/src/components/Nav.tsx` | Sliding pill indicator, Dashboard link, useLayoutEffect fix |
| `frontend/src/components/FloatingChat.tsx` | Slate/indigo/violet color theme |
| `frontend/src/pages/Dashboard.tsx` | Full redesign — news carousel, AI summaries, visual polish, new theme |
| `frontend/src/pages/Cards.tsx` | New color theme |
| `frontend/src/pages/Collection.tsx` | New color theme, parallel data fetching fix |
| `frontend/src/pages/Decks.tsx` | New color theme |
| `frontend/src/pages/DeckDetail.tsx` | New color theme |
| `frontend/src/pages/Advisor.tsx` | New color theme |
