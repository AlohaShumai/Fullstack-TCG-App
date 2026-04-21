-- Run this SQL in your database BEFORE applying the new schema
-- This migrates existing collection data to the new format

-- Step 1: Create the new CollectionCard table
CREATE TABLE IF NOT EXISTS "CollectionCard" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "collectionId" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1
);

-- Step 2: Create a temporary table to hold new collections
CREATE TABLE IF NOT EXISTS "Collection_new" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Step 3: For each user with existing cards, create a "My Collection" and migrate cards
INSERT INTO "Collection_new" ("id", "name", "description", "isPublic", "userId", "createdAt", "updatedAt")
SELECT 
    gen_random_uuid()::TEXT,
    'My Collection',
    'Migrated from original collection',
    false,
    "userId",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "Collection"
GROUP BY "userId";

-- Step 4: Migrate cards to CollectionCard table
INSERT INTO "CollectionCard" ("id", "collectionId", "cardId", "quantity")
SELECT 
    gen_random_uuid()::TEXT,
    cn."id",
    c."cardId",
    c."quantity"
FROM "Collection" c
JOIN "Collection_new" cn ON cn."userId" = c."userId";

-- Step 5: Drop old Collection table and rename new one
DROP TABLE "Collection";
ALTER TABLE "Collection_new" RENAME TO "Collection";

-- Step 6: Add foreign keys
ALTER TABLE "Collection" ADD CONSTRAINT "Collection_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CollectionCard" ADD CONSTRAINT "CollectionCard_collectionId_fkey" 
    FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CollectionCard" ADD CONSTRAINT "CollectionCard_cardId_fkey" 
    FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 7: Add unique constraint
CREATE UNIQUE INDEX "CollectionCard_collectionId_cardId_key" ON "CollectionCard"("collectionId", "cardId");