import { useEventEmitter, useLogger, usePrisma } from '../shared';
import type { BaileysEventHandler } from '../types';
import { transformPrisma } from '../utils';

export default function chatHandler(sessionId: string) {
  const model = usePrisma().chat;
  const logger = useLogger();
  const event = useEventEmitter();
  let listening = false;

  const set: BaileysEventHandler<'messaging-history.set'> = async ({ chats, isLatest }) => {
    try {
      if (isLatest) {
        await model.deleteMany({ where: { sessionId } });
      }

      const existingIds = (
        await model.findMany({
          select: { id: true },
          where: { id: { in: chats.map((c) => c.id) }, sessionId },
        })
      ).map((i) => i.id);

      const chatsAdded = (
        await model.createMany({
          data: chats
            .filter((c) => !existingIds.includes(c.id))
            .map((c) => ({ ...transformPrisma(c), sessionId })),
        })
      ).count;
      logger.info({ chatsAdded }, 'Synced chats');
    } catch (e) {
      logger.error(e, 'An error occured during chats set');
    }
  };

  const upsert: BaileysEventHandler<'chats.upsert'> = async (chats) => {
    const promises: Promise<any>[] = [];

    for (const chat of chats) {
      const data = transformPrisma(chat);
      promises.push(
        model.upsert({
          select: { pkId: true },
          create: { ...data, sessionId },
          update: data,
          where: { sessionId_id: { id: chat.id, sessionId } },
        })
      );
    }

    try {
      await Promise.all(promises);
    } catch (e) {
      logger.error(e, 'An error occured during chats upsert');
    }
  };

  const update: BaileysEventHandler<'chats.update'> = async (updates) => {
    for (const update of updates) {
      try {
        const chat = await model.findFirst({
          select: { unreadCount: true },
          where: { id: update.id!, sessionId },
        });

        if (!chat) {
          return logger.info({ update }, 'Got update for non existent chat');
        }

        const data = transformPrisma(update);
        await model.update({
          select: { pkId: true },
          data: {
            ...data,
            unreadCount:
              data.unreadCount && data.unreadCount > 0
                ? (chat?.unreadCount ?? 0) + data.unreadCount
                : undefined,
          },
          where: { sessionId_id: { id: update.id!, sessionId } },
        });
      } catch (e) {
        logger.error(e, 'An error occured during chat update');
      }
    }
  };

  const del: BaileysEventHandler<'chats.delete'> = async (ids) => {
    try {
      await model.deleteMany({
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
