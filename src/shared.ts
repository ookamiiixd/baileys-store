import type { PrismaClient } from '@prisma/client';
import type { BaileysEventEmitter, SocketConfig } from '@adiwajshing/baileys';
import { DEFAULT_CONNECTION_CONFIG } from '@adiwajshing/baileys';
import invariant from 'tiny-invariant';

let prisma: PrismaClient | null = null;
let eventEmitter: BaileysEventEmitter | null = null;
let logger: SocketConfig['logger'] | null = null;

export function setPrisma(prismaClient: PrismaClient) {
  prisma = prismaClient;
}

export function setEventEmitter(emitter: BaileysEventEmitter) {
  eventEmitter = emitter;
}

export function setLogger(pinoLogger?: SocketConfig['logger']) {
  logger = pinoLogger || DEFAULT_CONNECTION_CONFIG.logger;
}

export function usePrisma() {
  invariant(prisma, 'Prisma client cannot be used before initialization');
  return prisma;
}

export function useEventEmitter() {
  invariant(eventEmitter, 'Event emitter cannot be used before initialization');
  return eventEmitter;
}

export function useLogger() {
  invariant(logger, 'Pino logger cannot be used before initialization');
  return logger;
}
