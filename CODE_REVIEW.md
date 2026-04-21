# TcgApp Code Review — April 15, 2026

This document is for use with Claude to learn from, discuss, and improve the codebase.
It covers real issues found in the current source. Nothing here is a dealbreaker — the app
works — but each point is a chance to write better code going forward.

---

## Purpose of this session

1. Walk through specific bad/useless patterns in the code and understand *why* they're problems
2. Learn what better alternatives look like
3. Use this as a basis for formulating a developer portfolio document or technical write-up

---

## Issues Found

### 1. `console.log` left in production code (`dashboard.service.ts` lines 228–236, 294–302)

```ts
console.log('[Dashboard] Tavily news results:', JSON.stringify(...));
```

**Why it's bad:** `console.log` is for debugging. In a NestJS service, the right tool is
`this.logger` (already imported). Logs like this will dump full API responses into your
server stdout in production. It's also a security leak — raw API response data, URLs, and
metadata get printed permanently.

**Fix:** Replace with `this.logger.debug(...)` or remove entirely.

---

### 2. In-memory cache on the service class (`dashboard.service.ts` lines 56–60)

```ts
private newsCache: { data: NewsArticle[]; fetchedAt: number } | null = null;
private eventsCache: { data: TournamentEvent[]; fetchedAt: number } | null = null;
```

**Why it's bad:** NestJS services are singletons per process, so this works in development.
But the moment you scale to more than one server instance (Docker replicas, Kubernetes pods),
each instance has its own cache — they diverge, and some users get stale data while others get fresh.
It also disappears on every restart.

**Fix for now:** It's acceptable for a solo project. Long-term: use Redis (`ioredis` + `@nestjs/cache-manager`).

---

### 3. AI called on every dashboard load — no per-user caching (`Dashboard.tsx` line 119–126)

```ts
api.post('/ai/chat', {
  message: 'Based on my collection, give me one short deck building tip...',
  history: [],
})
```

**Why it's bad:** Every time any user opens the dashboard, you pay for an OpenAI API call.
There's no caching on this specific call — only news/events are cached. This will get expensive
fast and slow down the page.

**Fix:** Cache the AI suggestion per-user in the backend (store last generated tip + timestamp
in the database or Redis, regenerate only if > 24 hours old).

---

### 4. Inline `onMouseEnter`/`onMouseLeave` for hover effects (repeated ~6 times in `Dashboard.tsx`)

```tsx
onMouseEnter={(e) => {
  (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
  (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 12px rgba(0,0,0,0.4)';
}}
onMouseLeave={(e) => {
  (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
  (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
}}
```

**Why it's bad:** This is duplicated in at least 3–4 places. It bypasses React's state model
(directly mutating the DOM via `.style`). It's also harder to maintain — if you want to change
the lift distance, you have to hunt down every copy.

**Fix:** Create a Tailwind class (`hover:scale-[1.02] hover:-translate-y-0.5 transition-all`) or
a small shared CSS class in `index.css`, or a tiny wrapper component `<HoverCard>`.

---

### 5. IIFE pattern for conditional rendering (`Dashboard.tsx` lines 197, 363)

```tsx
{(() => {
  const article = news[newsIndex];
  return ( <div>...</div> );
})()}
```

**Why it's bad:** Immediately-invoked function expressions inside JSX are a sign that logic
belongs in a separate component or above the return statement. It makes the template harder
to read and can confuse React's reconciler.

**Fix:** Extract into a `<NewsCard article={article} />` component, or compute `article` before
the `return` statement and use it inline.

---

### 6. `eslint-disable-next-line` suppressing a real warning (`Collection.tsx` line 71)

```ts
// eslint-disable-next-line react-hooks/exhaustive-deps
}, []);
```

**Why it's bad:** The `react-hooks/exhaustive-deps` warning exists because `fetchCollections`
calls `selectCollection` which isn't in the dependency array. Suppressing it with a comment
hides a potential stale-closure bug. The rule is almost always right.

**Fix:** Either include `selectCollection` in the dependency array (and wrap it in `useCallback`),
or restructure so `selectCollection` is called inside `fetchCollections` directly without the
indirection.

---

### 7. Stats query fetches ALL collection cards into memory (`dashboard.service.ts` lines 121–127)

```ts
this.prisma.collectionCard.findMany({
  where: { collection: { userId } },
  select: { cardId: true, quantity: true, card: { select: { supertype: true } } },
}),
```

**Why it's bad:** If a user has 10,000 cards, this loads 10,000 rows into Node.js memory just
to count and sum them. That's wasted RAM and a slow query.

**Fix:** Do the aggregation in the database:
```ts
this.prisma.collectionCard.groupBy({
  by: ['card.supertype'],
  where: { collection: { userId } },
  _sum: { quantity: true },
})
```
Or use a raw `$queryRaw` for the type breakdown.

---

### 8. Hardcoded year in search query (`dashboard.service.ts` line 215)

```ts
'Pokemon TCG new set release 2026'
```

**Why it's bad:** This will become stale every year with no code change needed. New Year 2027
and the search is silently returning nothing useful.

**Fix:**
```ts
`Pokemon TCG new set release ${new Date().getFullYear()}`
```

---

### 9. Duplicate interface definitions (frontend duplicates backend types)

`Dashboard.tsx` defines `FeaturedCard`, `DashboardStats`, `NewsArticle`, `TournamentEvent` —
the exact same shapes that exist in `dashboard.service.ts`.

**Why it's bad:** If you add a field to the backend, you have to remember to update the frontend
interface too. They will silently diverge.

**Fix for a solo project:** Not critical, but the proper solution is a shared types package
(a `packages/types` folder in a monorepo) or auto-generated types from an OpenAPI/Swagger spec.
NestJS has `@nestjs/swagger` that can generate this for you.

---

### 10. `<style>` tag injected inside JSX (`Dashboard.tsx` lines 575–578)

```tsx
<style>{`
  @keyframes modalFadeIn { ... }
  @keyframes modalSlideIn { ... }
`}</style>
```

**Why it's bad:** Every time the modal opens, React injects a `<style>` block into the DOM.
While browsers deduplicate identical rules, it's semantically wrong — styles belong in CSS
files, not conditionally rendered JSX.

**Fix:** Move these keyframes to `index.css` or `App.css` permanently.

---

## What's Done Well

- Parallel API calls with `Promise.all` in `getStats` — good pattern.
- Graceful fallback to cached data on Tavily errors — correct.
- Separate loading states per section (`statsLoading`, `newsLoading`, etc.) — good UX.
- The `AppLayout` pattern in `App.tsx` that keeps Nav mounted once is correct and intentional.
- Auth guards (`PrivateRoute`, `PublicRoute`) are clean and simple.

---

## Suggested topics to discuss with Claude

- How to extract a shared types package
- How to add Redis caching to the dashboard service
- How to set up Swagger/OpenAPI in NestJS for auto-typed frontend calls
- How to refactor the Dashboard into smaller sub-components
- Portfolio write-up: what problem this app solves, what tech stack it uses, what you'd do differently

---

## Changelog — April 15, 2026 Session

### Tests Added

**`backend/src/decks/decks.service.spec.ts`** — 6 tests for `DecksService.validateDeck()`
- Valid deck passes (returns result, not null)
- Rejects deck not belonging to the user (userId mismatch)
- Rejects deck with fewer than 60 cards
- Rejects deck with more than 4 copies of any non-basic card
- Allows more than 4 copies of Basic Pokémon (the one legal exception)
- Rejects a Standard-format deck containing cards from a non-legal set

**`backend/src/auth/auth.service.spec.ts`** — 8 tests for `AuthService`
- `register`: creates user, hashes password, returns tokens
- `register`: throws `ConflictException` if email already exists
- `login`: returns tokens on valid credentials
- `login`: throws `UnauthorizedException` if user not found
- `login`: throws `UnauthorizedException` if password is wrong
- `refresh`: returns new access token using refresh token
- `refresh`: throws `UnauthorizedException` if user not found
- `refresh`: throws `UnauthorizedException` if token is invalid

### Bugs Fixed

- **`FRONTENDD_URL` typo** (`backend/src/main.ts`) — was `FRONTENDD_URL`, now correctly reads `FRONTEND_URL` from `.env`. This silently broke CORS in production.
- **Missing collection CRUD DTOs** (`backend/src/collections/dto/collection.dto.ts`) — `CreateCollectionDto`, `PatchCollectionDto`, `AddToCollectionDto`, and `UpdateCollectionDto` were all missing. Controller endpoints accepted raw unvalidated bodies. Now all 4 DTOs are wired up with `class-validator` decorators.

### Code Cleanups Applied

**Shared `AuthRequest` type** (`backend/src/common/types.ts`)
- The `AuthRequest` interface was copy-pasted into `auth.controller.ts` and `ai.controller.ts` separately.
- Extracted into a shared `src/common/types.ts` file.
- Both controllers now `import type { AuthRequest } from '../common/types'`.
- Note: must use `import type` (not `import`) due to NestJS's `emitDecoratorMetadata` + `isolatedModules` constraint — regular interface imports in decorated files cause a TypeScript TS1272 compile error.

**Exported `ChatMessage` type** (`backend/src/ai/ai.service.ts` → `ai.controller.ts`)
- `ChatMessage` was defined in the service but the controller redefined its own copy inline.
- Added `export` to the service's interface and `import type { ChatMessage }` in the controller.

**Removed 12 empty boilerplate spec files**
- `app.controller.spec.ts`, `auth.controller.spec.ts`, `cards.controller.spec.ts`, `cards.service.spec.ts`, `collections.controller.spec.ts`, `collections.service.spec.ts`, `decks.controller.spec.ts`, `prisma.service.spec.ts`, `rag.controller.spec.ts`, `rag.service.spec.ts`, `users.service.spec.ts`, and the old empty `rag.service.spec.ts`
- These were generated by the NestJS CLI and never filled in — they just added noise to the test output.

**`console.log` → `this.logger.debug`** (`backend/src/dashboard/dashboard.service.ts`)
- Two `console.log('[Dashboard] Tavily ...')` calls replaced with `this.logger.debug(...)`.
- Logger was already imported; using it is consistent and lets log levels be controlled at runtime.

**`console.error` removed from frontend** (26 total across 5 files)
- `Cards.tsx` (6), `Collection.tsx` (7), `DeckDetail.tsx` (6), `Dashboard.tsx` (4), `Decks.tsx` (3)
- Silent background failures (price fetch, AI tip, etc.) → replaced with `() => {}` comments explaining why silence is intentional
- User-facing failures (load deck, delete card, etc.) → already had `showNotification` calls; the redundant `console.error` was just removed
- `Decks.tsx` had no notification system at all — added `notification`/`notifError` state, `showNotification()` helper, and the toast bubble JSX to match the other pages

**`<style>` JSX blocks removed** (`Dashboard.tsx`, `Cards.tsx`, `Collection.tsx`, `DeckDetail.tsx`)
- Each page had its own `<style>` block re-injecting the same `@keyframes bubblePop`, `modalFadeIn`, `modalSlideIn` definitions into the DOM on every render.
- All keyframe definitions moved to `frontend/src/index.css` once. The JSX `<style>` blocks were deleted.

**Inline hover handlers removed** (`Dashboard.tsx`)
- ~6 `onMouseEnter`/`onMouseLeave` handlers that directly mutated `e.currentTarget.style` were deleted.
- Replaced with Tailwind utility classes: `hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300`.

**Modern JSX transform** (`Cards.tsx`)
- `import React, { useState, useEffect }` → `import { useState, useEffect, type MouseEvent }`
- `React.MouseEvent` → `MouseEvent`
- With Vite's modern JSX transform, `React` doesn't need to be in scope just to use JSX.

### Commit

All changes committed as: `a497aca`
> Tests, bug fixes, and code cleanup: add 14 Jest tests, fix FRONTENDD_URL typo, add collection DTOs, remove console.errors, deduplicate keyframes and types
