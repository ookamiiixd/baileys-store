import type { AuthenticationCreds, BaileysEventMap } from '@adiwajshing/baileys';
import type Long from 'long';

export type BaileysEventHandler<T extends keyof BaileysEventMap<AuthenticationCreds>> = (
  args: BaileysEventMap<AuthenticationCreds>[T]
) => void;

type TransformPrisma<T, TransformObject> = T extends Long
  ? number
  : T extends Uint8Array
  ? Buffer
  : T extends null
  ? never
  : T extends object
  ? TransformObject extends true
    ? object
    : T
  : T;

/** Transform unsupported types into supported Prisma types */
export type MakePrismable<T extends Record<string, any>, TransformObject extends boolean = true> = {
  [K in keyof T]: TransformPrisma<T[K], TransformObject>;
};
