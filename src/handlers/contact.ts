import { useEventEmitter, useLogger, usePrisma } from '../shared';
import type { BaileysEventHandler } from '../types';
import { transformPrisma } from '../utils';

export default function contactHandler(sessionId: string) {
  const model = usePrisma().contact;
  const logger = useLogger();
  const event = useEventEmitter();
  let listening = false;

  const set: BaileysEventHandler<'messaging-history.set'> = async ({ contacts }) => {
    try {
      const contactIds = contacts.map((c) => c.id);
      const deletedOldContactIds = (
        await model.findMany({
          select: { id: true },
          where: { id: { notIn: contactIds }, sessionId },
        })
      ).map((c) => c.id);

      const promises: Promise<any>[] = [];
      for (const contact of contacts) {
        const data = transformPrisma(contact);
        promises.push(
          model.upsert({
            create: { ...data, sessionId },
            update: data,
            where: { sessionId_id: { id: contact.id, sessionId } },
          })
        );
      }

      await Promise.all([
        Promise.all(promises),
        model.deleteMany({ where: { id: { in: deletedOldContactIds }, sessionId } }),
      ]);
      logger.info(
        { deletedContacts: deletedOldContactIds.length, newContacts: contacts.length },
        'Synced contacts'
      );
    } catch (e) {
      logger.error(e, 'An error occured during contacts set');
    }
  };

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

    event.on('messaging-history.set', set);
    event.on('contacts.update', update);
    listening = true;
  };

  const unlisten = () => {
    if (!listening) return;

    event.off('messaging-history.set', set);
    event.off('contacts.update', update);
    listening = false;
  };

  return { listen, unlisten };
}
