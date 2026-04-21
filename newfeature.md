I want to add a price tracking feature to my TCG app. This lets users see current market prices, historical price charts per card, and a portfolio chart showing total collection value over time.
Data source: pokemontcg.io API (free, no approval needed). Each card response includes a tcgplayer.prices object with market/low/mid/high values and a tcgplayer.url linking to the product page.
Important scope notes:

Only TCGplayer market prices (NM condition)
Skip condition variants (LP, MP, HP, DMG) — display "NM market price" consistently
Skip graded pricing entirely
No eBay integration — add a "View on eBay" button that opens a pre-filled eBay search URL for the card name (no API)

Phase 1: Database + sync
Add two new Prisma models:
model CardPrice {
  id            String   @id @default(uuid())
  cardId        String   @unique
  marketPrice   Float?
  lowPrice      Float?
  midPrice      Float?
  highPrice     Float?
  tcgplayerUrl  String?
  updatedAt     DateTime @updatedAt
  card          Card     @relation(fields: [cardId], references: [id], onDelete: Cascade)
}

model PriceSnapshot {
  id            String   @id @default(uuid())
  cardId        String
  marketPrice   Float?
  capturedAt    DateTime @default(now())
  card          Card     @relation(fields: [cardId], references: [id], onDelete: Cascade)
  @@index([cardId, capturedAt])
}
Add prices CardPrice? and priceHistory PriceSnapshot[] to the Card model.
Create migration. Handle production safely — the tables will be empty initially.
Create PricesModule with PricesService and PricesController:

PricesService.syncAllPrices() — fetches price data from pokemontcg.io for every card in the database, upserts into CardPrice, and creates a PriceSnapshot for history tracking. Rate limit 100ms between calls like the existing TCGdex sync. Match cards by name + setId (pokemontcg.io uses similar IDs to TCGdex but not identical — handle mismatches gracefully by skipping and logging warnings).
PricesService.syncCardPrice(cardId) — syncs a single card.
@Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT) triggers syncAllPrices() — add to PricesService the same way CardsService.handleDailySync() works.
POST /prices/sync — admin-only (stack JwtAuthGuard and AdminGuard). Triggers full sync manually.
POST /prices/sync/:cardId — admin-only. Syncs a single card.

Phase 2: Card-level price display
Update CardsService.getCardById() to include price data (join CardPrice).
Frontend changes to Cards.tsx card detail modal:

New "Market Price" section showing current market price prominently, with low/mid/high below
"Last updated" timestamp
"View on TCGplayer" button (uses tcgplayerUrl if present)
"View on eBay" button — constructs URL: https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(card.name + ' ' + card.setName)}&LH_Sold=1&LH_Complete=1
Price history chart using Recharts (add recharts to frontend dependencies)

Fetch from new endpoint GET /cards/:id/price-history (returns array of { date, price } from PriceSnapshot table, last 90 days)
Use <LineChart> with <XAxis> for date, <YAxis> for price, <Tooltip> to show exact values on hover
If no history exists (new card), show "Price history will appear after prices are tracked for a few days"



Phase 3: Portfolio tracking
Backend:

GET /collections/:id/portfolio — returns { currentValue: number, history: [{ date, value }] } for a collection

currentValue — sum of (card quantity × current market price) for all cards in the collection
history — iterate daily for last 30 days, for each day calculate what the collection would have been worth using PriceSnapshot data


GET /users/me/portfolio — same shape but aggregated across all user's collections

Frontend:

New "Portfolio Value" card on the Dashboard showing:

Current total value (big number with "$" prefix)
30-day change with arrow (▲ or ▼) and percent change colored green/red
Line chart showing value over last 30 days using Recharts


Add a similar chart to the Collection detail page showing that specific collection's portfolio value over time

Constraints:

Implement in 3 commits matching the 3 phases above. After Phase 1, tests should pass. After Phase 2, the card detail modal should show current prices even with no history. After Phase 3, the dashboard portfolio card should render.
Protect all mutation endpoints with JwtAuthGuard and AdminGuard where appropriate. Read endpoints (/price-history, /portfolio) just need JwtAuthGuard.
Handle pokemontcg.io API failures gracefully. Log errors, skip cards, never crash the whole sync.
If a card doesn't have price data from pokemontcg.io (common for old or obscure cards), store null for price fields. Frontend should display "Price not available" in that case.
Never display a chart if there are fewer than 2 data points — show "Building price history" message instead.
Add at least 2 tests to prices.service.spec.ts: one for successful price sync of a card, one for handling a missing card gracefully.

What NOT to do:

Don't scrape anything
Don't integrate with eBay or TCGplayer APIs — we're only using pokemontcg.io
Don't add condition-based pricing beyond NM market price
Don't touch the AI, RAG, or Auth modules

Please confirm the 3-phase breakdown and the Prisma schema changes before writing any code. Implement one phase per commit so changes are reviewable.
