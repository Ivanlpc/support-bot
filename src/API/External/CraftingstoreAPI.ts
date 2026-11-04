import { z } from 'zod';
import { request } from '../Requests';
import { config } from '../../config';
import * as schema from './Schemas';

export class SearchLimitError extends Error {
  constructor() {
    super(
      'Search reached 100 pages. Use a more recent transaction or the store dashboard.',
    );
  }
}
export async function requestPaymentByPage(
  user: string,
  token: string,
  page: number,
) {
  if (!Number.isInteger(page) || page < 1)
    throw new Error('Invalid payment page');
  const url =
    config.CRAFTINGSTORE_URL +
    '/payments?player=' +
    encodeURIComponent(user) +
    '&page=' +
    page;
  return schema.parseResponse(
    schema.craftingPayments,
    await request(url, { headers: { token } }),
    'CraftingStore payments',
  );
}
export const CraftingstoreAPI = {
  createGiftcard: async (token: string, amount: number) => {
    if (!Number.isFinite(amount) || amount <= 0)
      throw new Error('Giftcard amount must be positive');
    const body = new FormData();
    body.append('amount', String(amount));
    return schema.parseResponse(
      schema.craftingGiftcard,
      await request(config.CRAFTINGSTORE_URL + '/gift-cards', {
        method: 'POST',
        headers: { token },
        body,
      }),
      'CraftingStore giftcard',
    );
  },
  getPaymentByID: async (
    user: string,
    transaction: string,
    token: string,
    page: number,
  ): Promise<IPayment | null> => {
    for (let offset = 0; offset < 100; offset++) {
      const current = page + offset;
      const result = await requestPaymentByPage(user, token, current);
      if (!result.success)
        throw new Error('CraftingStore payment lookup failed');
      const payment = result.data.find(
        (payment) => payment.transactionId === transaction,
      );
      if (payment) return payment;
      if (current >= result.meta.lastPage) return null;
    }
    throw new SearchLimitError();
  },
  getUserPayments: (token: string, user: string) =>
    requestPaymentByPage(user, token, 1),
};
export type IPayment = z.output<typeof schema.craftingPayment>;
