import crypto from 'node:crypto';
import { registerSecret } from './Log';
import { config } from '../../config';

function keyBytes(key: string): Buffer {
  const bytes = Buffer.from(key, 'utf8');
  if (bytes.length !== 16)
    throw new Error('Encryption key must contain exactly 16 UTF-8 bytes');
  return bytes;
}

export function encrypt(message: string, key: string = config.KEY) {
  registerSecret(message);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-128-gcm', keyBytes(key), iv);
  const ciphertext = Buffer.concat([
    cipher.update(message, 'utf8'),
    cipher.final(),
  ]);
  return {
    token:
      'v2:' +
      cipher.getAuthTag().toString('hex') +
      ':' +
      ciphertext.toString('hex'),
    iv: iv.toString('hex'),
  };
}

export function decrypt(
  token: string,
  iv: string,
  key: string = config.KEY,
): string {
  if (token.startsWith('v2:')) {
    const parts = token.split(':');
    if (parts.length !== 3) throw new Error('Invalid encrypted token');
    const [, tag, ciphertext] = parts;
    if (
      !/^[a-f0-9]{32}$/.test(tag ?? '') ||
      !/^[a-f0-9]{24}$/.test(iv) ||
      !/^(?:[a-f0-9]{2})*$/.test(ciphertext ?? '')
    ) {
      throw new Error('Invalid encrypted token');
    }
    const cipher = crypto.createDecipheriv(
      'aes-128-gcm',
      keyBytes(key),
      Buffer.from(iv, 'hex'),
    );
    cipher.setAuthTag(Buffer.from(tag, 'hex'));
    return Buffer.concat([
      cipher.update(Buffer.from(ciphertext, 'hex')),
      cipher.final(),
    ]).toString('utf8');
  }
  // Existing database rows use the old ASCII IV and must remain readable.
  if (iv.length !== 16 || !/^(?:[a-f0-9]{2})+$/.test(token))
    throw new Error('Invalid legacy token');
  const cipher = crypto.createDecipheriv('aes-128-ofb', keyBytes(key), iv);
  return cipher.update(token, 'hex', 'utf8') + cipher.final('utf8');
}

export function decryptStored(
  token: string,
  iv: string,
  currentKey = config.KEY,
  previousKey = config.PREVIOUS_ENCRYPTION_KEY,
): string {
  let plaintext: string;
  try {
    plaintext = decrypt(
      token,
      iv,
      !token.startsWith('v2:') && previousKey ? previousKey : currentKey,
    );
  } catch (error) {
    if (!previousKey) throw error;
    plaintext = decrypt(token, iv, previousKey);
  }
  registerSecret(plaintext);
  return plaintext;
}
