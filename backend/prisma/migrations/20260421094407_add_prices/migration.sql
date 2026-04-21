-- CreateTable
CREATE TABLE "CardPrice" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "marketPrice" DOUBLE PRECISION,
    "lowPrice" DOUBLE PRECISION,
    "midPrice" DOUBLE PRECISION,
    "highPrice" DOUBLE PRECISION,
    "tcgplayerUrl" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CardPrice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceSnapshot" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "marketPrice" DOUBLE PRECISION,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CardPrice_cardId_key" ON "CardPrice"("cardId");

-- CreateIndex
CREATE INDEX "PriceSnapshot_cardId_capturedAt_idx" ON "PriceSnapshot"("cardId", "capturedAt");

-- AddForeignKey
ALTER TABLE "CardPrice" ADD CONSTRAINT "CardPrice_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceSnapshot" ADD CONSTRAINT "PriceSnapshot_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;
