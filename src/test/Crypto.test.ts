import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { encrypt, decrypt, decryptStored } from '../API/Util/Crypto';

const key = '0123456789abcdef';
describe('stored credentials', () => {
  it('round trips Unicode and generates a unique IV', () => {
    const first = encrypt('contraseña 🔑', key);
    const second = encrypt('contraseña 🔑', key);
    assert.equal(decrypt(first.token, first.iv, key), 'contraseña 🔑');
    assert.notEqual(first.iv, second.iv);
  });
  it('rejects modified ciphertext and incorrect keys', () => {
    const { token, iv } = encrypt('store-secret', key);
    const changed = token.slice(0, -2) + (token.endsWith('00') ? '01' : '00');
    assert.throws(() => decrypt(changed, iv, key));
    assert.throws(() => decrypt(token + ':extra', iv, key));
    assert.throws(() => decrypt(token, iv, 'fedcba9876543210'));
  });
  it('reads existing OFB rows without rewriting them', () => {
    const iv = '0123456789abcdef';
    const legacy = crypto.createCipheriv('aes-128-ofb', key, iv);
    const token =
      legacy.update('old-store-token', 'utf8', 'hex') + legacy.final('hex');
    assert.equal(decrypt(token, iv, key), 'old-store-token');
  });
  it('rejects keys with invalid byte lengths', () => {
    assert.throws(() => encrypt('token', 'short'));
    assert.throws(() => encrypt('token', 'é'.repeat(16)));
  });
});

it('rotates both legacy and authenticated tokens using a previous key', () => {
  const old = '0123456789abcdef',
    current = 'fedcba9876543210',
    iv = '0123456789abcdef';
  const cipher = crypto.createCipheriv('aes-128-ofb', old, iv);
  const legacy =
    cipher.update('store-secret', 'utf8', 'hex') + cipher.final('hex');
  assert.equal(decryptStored(legacy, iv, current, old), 'store-secret');
  const authenticated = encrypt('store-secret', old);
  assert.equal(
    decryptStored(authenticated.token, authenticated.iv, current, old),
    'store-secret',
  );
  const updated = encrypt(decryptStored(legacy, iv, current, old), current);
  assert.equal(decrypt(updated.token, updated.iv, current), 'store-secret');
});
