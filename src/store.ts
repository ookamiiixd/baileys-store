import type { BaileysEventEmitter, SocketConfig } from '@adiwajshing/baileys';
import type { PrismaClient } from '@prisma/client';
import { setLogger, setPrisma } from './shared';
import * as handlers from './handlers';

type initStoreOptions = {
  /** Prisma client instance */
  prisma: PrismaClient;
  /** Baileys pino logger */
  logger?: SocketConfig['logger'];
};

/** Initialize shared instances that will be consumed by the Store instance */
export function initStore({ prisma, logger }: initStoreOptions) {
  setPrisma(prisma);
  setLogger(logger);
}

export class Store {
  private readonly chatHandler;
  private readonly messageHandler;
  private readonly contactHandler;
  private readonly groupMetadataHandler;

  constructor(sessionId: string, event: BaileysEventEmitter) {
    this.chatHandler = handlers.chatHandler(sessionId, event);
    this.messageHandler = handlers.messageHandler(sessionId, event);
    this.contactHandler = handlers.contactHandler(sessionId, event);
    this.groupMetadataHandler = handlers.groupMetadataHandler(sessionId, event);
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
