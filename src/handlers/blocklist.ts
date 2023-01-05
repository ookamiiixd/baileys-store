import type { BaileysEventEmitter } from '@adiwajshing/baileys';
import { useLogger, usePrisma } from '../shared';
import type { BaileysEventHandler } from '../types';

export default function contactHandler(sessionId: string, event: BaileysEventEmitter) {
  const model = usePrisma().blocklist;
  const logger = useLogger();
  let listening = false;

  const set: BaileysEventHandler<'blocklist.set'> = async ({ blocklist }) => {
    try {
      await model.createMany({
        data: blocklist.map((id) => ({ id, sessionId })),
        skipDuplicates: true,
      });
    } catch (e) {
      logger.error(e, 'An error occured during blocklist set');
    }
  };

  const update: BaileysEventHandler<'blocklist.update'> = async ({ blocklist, type }) => {
    try {
      if (type === 'add') {
        await model.createMany({
          data: blocklist.map((id) => ({ id, sessionId })),
          skipDuplicates: true,
        });
      } else {
        await model.deleteMany({
          where: { id: { in: blocklist }, sessionId },
        });
      }
    } catch (e) {
      logger.error(e, 'An error occured during blocklist update');
    }
  };

  const listen = () => {
    if (listening) return;

    event.on('blocklist.set', set);
    event.on('blocklist.update', update);
    listening = true;
  };

  const unlisten = () => {
    if (!listening) return;

    event.off('blocklist.set', set);
    event.off('blocklist.update', update);
    listening = false;
  };

  return { listen, unlisten };
}
