import { useEventEmitter, useLogger, usePrisma } from '../shared';
import type { BaileysEventHandler } from '../types';
import { transformPrisma } from '../utils';

export default function contactHandler(sessionId: string) {
  const model = usePrisma().contact;
  const logger = useLogger();
  const event = useEventEmitter();
  let listening = false;

  const update: BaileysEventHandler<'contacts.update'> = async (updates) => {
    for (const update of updates) {
      try {
        await model.update({
          select: { pkId: true },
          data: transformPrisma(update),
          where: { sessionId_id: { id: update.id!, sessionId } },
        });
      } catch (e) {
        logger.error(e, 'An error occured during contact update');
      }
    }
  };

  const listen = () => {
    if (listening) return;

    event.on('contacts.update', update);
    listening = true;
  };

  const unlisten = () => {
    if (!listening) return;

    event.off('contacts.update', update);
    listening = false;
  };

  return { listen, unlisten };
}
