import type { BaileysEventEmitter } from '@adiwajshing/baileys';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime';
import { useLogger, usePrisma } from '../shared';
import type { BaileysEventHandler } from '../types';
import { transformPrisma } from '../utils';

export default function chatHandler(sessionId: string, event: BaileysEventEmitter) {
  const prisma = usePrisma();
  const logger = useLogger();
  let listening = false;

  const set: BaileysEventHandler<'messaging-history.set'> = async ({ chats, isLatest }) => {
    try {
      await prisma.$transaction(async (tx) => {
        if (isLatest) {
          await tx.chat.deleteMany({ where: { sessionId } });
        }

        const existingIds = (
          await tx.chat.findMany({
            select: { id: true },
            where: { id: { in: chats.map((c) => c.id) }, sessionId },
          })
        ).map((i) => i.id);
        const chatsAdded = (
          await tx.chat.createMany({
            data: chats
              .filter((c) => !existingIds.includes(c.id))
              .map((c) => ({ ...transformPrisma(c), sessionId })),
          })
        ).count;

        logger.info({ chatsAdded }, 'Synced chats');
      });
    } catch (e) {
      logger.error(e, 'An error occured during chats set');
    }
  };

  const upsert: BaileysEventHandler<'chats.upsert'> = async (chats) => {
    try {
      await prisma.$transaction(
        chats
          .map((c) => transformPrisma(c))
          .map((data) =>
            prisma.chat.upsert({
              select: { pkId: true },
              create: { ...data, sessionId },
              update: data,
              where: { sessionId_id: { id: data.id, sessionId } },
            })
          )
      );
    } catch (e) {
      logger.error(e, 'An error occured during chats upsert');
    }
  };

  const update: BaileysEventHandler<'chats.update'> = async (updates) => {
    for (const update of updates) {
      try {
        await prisma.$transaction(async (tx) => {
          const chat = await tx.chat.findFirst({
            select: { unreadCount: true },
            where: { id: update.id!, sessionId },
          });

          if (!chat) {
            return logger.info({ update }, 'Got update for non existent chat');
          }

          const data = transformPrisma(update);
          await tx.chat.update({
            select: { pkId: true },
            data: {
              ...data,
              unreadCount: {
                set:
                  data.unreadCount && data.unreadCount > 0
                    ? (chat?.unreadCount ?? 0) + data.unreadCount
                    : data.unreadCount,
              },
            },
            where: { sessionId_id: { id: update.id!, sessionId } },
          });
        });
      } catch (e) {
        if (e instanceof PrismaClientKnownRequestError && e.code === 'P2025') {
          return logger.info({ update }, 'Got update for non existent chat');
        }
        logger.error(e, 'An error occured during chat update');
      }
    }
  };

  const del: BaileysEventHandler<'chats.delete'> = async (ids) => {
    try {
      await prisma.chat.deleteMany({
        where: { id: { in: ids } },
      });
    } catch (e) {
      logger.error(e, 'An error occured during chats delete');
    }
  };

  const listen = () => {
    if (listening) return;

    event.on('messaging-history.set', set);
    event.on('chats.upsert', upsert);
    event.on('chats.update', update);
    event.on('chats.delete', del);
    listening = true;
  };

  const unlisten = () => {
    if (!listening) return;

    event.off('messaging-history.set', set);
    event.off('chats.upsert', upsert);
    event.off('chats.update', update);
    event.off('chats.delete', del);
    listening = false;
  };

  return { listen, unlisten };
}
