-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Image" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guildId" TEXT,
    "memberId" TEXT NOT NULL,
    "image" TEXT NOT NULL
);
INSERT INTO "new_Image" ("guildId", "id", "image", "memberId") SELECT "guildId", "id", "image", "memberId" FROM "Image";
DROP TABLE "Image";
ALTER TABLE "new_Image" RENAME TO "Image";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
