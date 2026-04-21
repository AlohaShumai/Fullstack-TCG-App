-- IMPORTANT: Before running this migration, check for duplicate email prefixes in Neon SQL Editor:
--
-- SELECT split_part(email, '@', 1) AS username_candidate, COUNT(*)
-- FROM "User"
-- GROUP BY split_part(email, '@', 1)
-- HAVING COUNT(*) > 1;
--
-- If any rows come back, manually UPDATE those users' usernames to unique values before proceeding.

-- Step 1: Add username as nullable (required when backfilling existing rows)
ALTER TABLE "User" ADD COLUMN "username" TEXT;

-- Step 2: Backfill existing users from email prefix
UPDATE "User" SET "username" = split_part(email, '@', 1);

-- Step 3: Apply NOT NULL constraint and unique index
ALTER TABLE "User" ALTER COLUMN "username" SET NOT NULL;
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
