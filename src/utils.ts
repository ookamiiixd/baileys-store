import { toNumber } from '@adiwajshing/baileys';
import Long from 'long';
import type { MakePrismable } from './types';

/** Transform object props value into Prisma-supported types */
export function transformPrisma<T extends Record<string, any>>(
  data: T,
  removeNullable = true
): MakePrismable<T> {
  const obj = { ...data } as any;

  for (const [key, val] of Object.entries(obj)) {
    if (val instanceof Uint8Array) {
      obj[key] = Buffer.from(val);
    } else if (typeof val === 'number' || val instanceof Long) {
      obj[key] = toNumber(val);
    } else if (removeNullable && (typeof val === 'undefined' || val === null)) {
      delete obj[key];
    }
  }

  return obj;
}
