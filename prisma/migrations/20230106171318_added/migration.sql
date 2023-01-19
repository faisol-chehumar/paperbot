-- CreateTable
CREATE TABLE "SDConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guildId" TEXT,
    "memberId" TEXT NOT NULL,
    "config" TEXT NOT NULL DEFAULT '{}'
);
