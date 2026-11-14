import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { encrypt, decrypt } from '../API/Util/Crypto';

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
  it('rejects keys with invalid byte lengths', () => {
    assert.throws(() => encrypt('token', 'short'));
    assert.throws(() => encrypt('token', 'é'.repeat(16)));
  });
});

it('rejects malformed encrypted tokens and IVs', () => {
  assert.throws(() => decrypt('invalid-format', '0123456789abcdef', key));
  assert.throws(() => decrypt('v2:invalid-tag:00', '0'.repeat(24), key));
  const encrypted = encrypt('token', key);
  assert.throws(() => decrypt(encrypted.token, 'invalid-iv', key));
});
