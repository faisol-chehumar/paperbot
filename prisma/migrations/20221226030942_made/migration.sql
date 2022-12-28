-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Conversation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guildId" TEXT NOT NULL,
    "memberId" TEXT
);
INSERT INTO "new_Conversation" ("guildId", "id", "memberId") SELECT "guildId", "id", "memberId" FROM "Conversation";
DROP TABLE "Conversation";
ALTER TABLE "new_Conversation" RENAME TO "Conversation";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
