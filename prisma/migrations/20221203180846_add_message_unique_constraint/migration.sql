/*
  Warnings:

  - A unique constraint covering the columns `[sessionId,remoteJid,id]` on the table `Message` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `id` to the `Message` table without a default value. This is not possible if the table is not empty.
  - Added the required column `remoteJid` to the `Message` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX `unique_session_id` ON `message`;

-- AlterTable
ALTER TABLE `message` ADD COLUMN `id` VARCHAR(128) NOT NULL,
    ADD COLUMN `remoteJid` VARCHAR(128) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `unique_message_key_per_session_id` ON `Message`(`sessionId`, `remoteJid`, `id`);
