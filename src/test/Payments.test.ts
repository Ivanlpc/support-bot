import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { IPayment } from '../API/External/CraftingstoreAPI';
import { validatePayment } from '../API/Services/Payments';

describe('validatePayment', () => {
  it('Return false when payment is undefined', () => {
    const res = validatePayment(undefined, 'Product');
    assert.equal(res, false);
  });

  it('Returns false when packageName does not include the product', () => {
    const payment = {
      packageName: '1x VIP',
      status: 'COMPLETE',
      timestamp: Date.now() / 1000,
    };
    const res = validatePayment(payment as IPayment, 'TEST');
    assert.equal(res, false);
  });

  it('Returns false when payment is older than 24 hours', () => {
    const payment = {
      packageName: '1x VIP',
      status: 'COMPLETE',
      timestamp: Date.now() / 1000 - 86401,
    };
    const res = validatePayment(payment as IPayment, 'vip'.toLocaleUpperCase());
    assert.equal(res, false);
  });
  it('Returns false when payment is CHARGEBACK', () => {
    const payment = {
      packageName: '1x VIP',
      status: 'CHARGEBACK',
      timestamp: Date.now() / 1000,
    };
    const res = validatePayment(payment as IPayment, 'vip'.toLocaleUpperCase());
    assert.equal(res, false);
  });
  it('Return true when payment is valid', () => {
    const payment = {
      packageName: '1x VIP',
      status: 'COMPLETE',
      timestamp: Date.now() / 1000,
    };
    const res = validatePayment(payment as IPayment, 'vip'.toLocaleUpperCase());
    assert.equal(res, true);
  });
});
for (const status of ['PENDING', 'REFUNDED', 'FAILED']) {
  it('rejects non-paid status ' + status, () => {
    assert.equal(
      validatePayment(
        {
          packageName: 'VIP',
          status,
          timestamp: Date.now() / 1000,
        } as IPayment,
        'vip',
      ),
      false,
    );
  });
}
it('normalizes case and accents for paid purchases', () => {
  assert.equal(
    validatePayment(
      {
        packageName: '1x Suscripción',
        status: 'PAID',
        timestamp: Date.now() / 1000,
      } as IPayment,
      'suscripcion',
    ),
    true,
  );
});
it('rejects empty products and invalid timestamps', () => {
  for (const timestamp of [NaN, Infinity, Date.now() / 1000 + 60]) {
    assert.equal(
      validatePayment(
        { packageName: 'VIP', status: 'PAID', timestamp } as IPayment,
        'VIP',
      ),
      false,
    );
  }
  assert.equal(
    validatePayment(
      {
        packageName: 'VIP',
        status: 'PAID',
        timestamp: Date.now() / 1000,
      } as IPayment,
      '',
    ),
    false,
  );
});
