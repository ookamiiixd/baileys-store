import type { BaileysEventEmitter, SocketConfig } from '@adiwajshing/baileys';
import type { PrismaClient } from '@prisma/client';
import { setEventEmitter, setLogger, setPrisma } from './shared';
import * as handlers from './handlers';

type initStoreOptions = {
  /** Prisma client instance */
  prisma: PrismaClient;
  /** Baileys event emitter */
  eventEmitter: BaileysEventEmitter;
  /** Baileys pino logger */
  logger?: SocketConfig['logger'];
};

/** Initialize shared instances that will be consumed by the Store instance */
export function initStore({ prisma, eventEmitter, logger }: initStoreOptions) {
  setPrisma(prisma);
  setEventEmitter(eventEmitter);
  setLogger(logger);
}

export class Store {
  private readonly chatHandler;
  private readonly messageHandler;
  private readonly contactHandler;
  private readonly groupMetadataHandler;

  constructor(sessionId: string) {
    this.chatHandler = handlers.chatHandler(sessionId);
    this.messageHandler = handlers.messageHandler(sessionId);
    this.contactHandler = handlers.contactHandler(sessionId);
    this.groupMetadataHandler = handlers.groupMetadataHandler(sessionId);
    this.listen();
  }

  /** Start listening to the events */
  public listen() {
    this.chatHandler.listen();
    this.messageHandler.listen();
    this.contactHandler.listen();
    this.groupMetadataHandler.listen();
  }

  /** Stop listening to the events */
  public unlisten() {
    this.chatHandler.unlisten();
    this.messageHandler.unlisten();
    this.contactHandler.unlisten();
    this.groupMetadataHandler.unlisten();
  }
}
