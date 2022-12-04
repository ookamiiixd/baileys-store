import { useEventEmitter, useLogger, usePrisma } from '../shared';
import type { BaileysEventHandler } from '../types';
import { transformPrisma } from '../utils';

export default function chatHandler(sessionId: string) {
  const model = usePrisma().chat;
  const logger = useLogger();
  const event = useEventEmitter();
  let listening = false;

  const upsert: BaileysEventHandler<'chats.upsert'> = async (chats) => {
    const promises: Promise<any>[] = [];

    for (const chat of chats) {
      const data = transformPrisma(chat);
      promises.push(
        model.upsert({
          select: { pkId: true },
          create: { ...data, sessionId },
          update: data,
          where: { sessionId_id: { id: data.id, sessionId } },
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
        const { id, ...data } = transformPrisma(update);
        const chat = await model.findFirst({
          select: { unreadCount: true },
          where: { id, sessionId },
        });

        if (!chat) {
          return logger.info({ update }, 'Got update for non existent chat');
        }

        await model.update({
          select: { pkId: true },
          data: {
            ...data,
            unreadCount:
              data.unreadCount && data.unreadCount > 0
                ? (chat?.unreadCount ?? 0) + data.unreadCount
                : undefined,
          },
          where: { sessionId_id: { id: id!, sessionId } },
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

    event.on('chats.upsert', upsert);
    event.on('chats.update', update);
    event.on('chats.delete', del);
    listening = true;
  };

  const unlisten = () => {
    if (!listening) return;

    event.off('chats.upsert', upsert);
    event.off('chats.update', update);
    event.off('chats.delete', del);
    listening = false;
  };

  return { listen, unlisten };
}
