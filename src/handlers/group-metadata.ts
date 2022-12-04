import { useEventEmitter, useLogger, usePrisma } from '../shared';
import type { BaileysEventHandler } from '../types';
import { transformPrisma } from '../utils';

export default function groupMetadataHandler(sessionId: string) {
  const model = usePrisma().groupMetadata;
  const logger = useLogger();
  const event = useEventEmitter();
  let listening = false;

  const update: BaileysEventHandler<'groups.update'> = async (updates) => {
    for (const update of updates) {
      try {
        await model.update({
          select: { pkId: true },
          data: transformPrisma(update),
          where: { sessionId_id: { id: update.id!, sessionId } },
        });
      } catch (e) {
        logger.error(e, 'An error occured during group metadata update');
      }
    }
  };

  const updateParticipant: BaileysEventHandler<'group-participants.update'> = async ({
    id,
    action,
    participants,
  }) => {
    try {
      const metadata = ((await model.findFirst({
        select: { participants: true },
        where: { id, sessionId },
      })) || []) as { participants: any[] } | null;

      if (!metadata) {
        return logger.info(
          { update: { id, action, participants } },
          'Got participants update for non existent group'
        );
      }

      switch (action) {
        case 'add':
          metadata.participants.push(
            participants.map((id) => ({ id, isAdmin: false, isSuperAdmin: false }))
          );
          break;
        case 'demote':
        case 'promote':
          for (const participant of metadata.participants) {
            if (participants.includes(participant.id)) {
              participant.isAdmin = action === 'promote';
            }
          }
          break;
        case 'remove':
          metadata.participants = metadata.participants.filter((p) => !participants.includes(p.id));
          break;
      }

      await model.update({
        select: { pkId: true },
        data: transformPrisma({ participants: metadata.participants }),
        where: { sessionId_id: { id, sessionId } },
      });
    } catch (e) {
      logger.error(e, 'An error occured during group participants update');
    }
  };

  const listen = () => {
    if (listening) return;

    event.on('groups.update', update);
    event.on('group-participants.update', updateParticipant);
    listening = true;
  };

  const unlisten = () => {
    if (!listening) return;

    event.off('groups.update', update);
    event.off('group-participants.update', updateParticipant);
    listening = false;
  };

  return { listen, unlisten };
}
