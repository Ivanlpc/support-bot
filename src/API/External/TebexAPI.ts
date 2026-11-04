import { z } from 'zod';
import { request } from '../Requests';
import { config } from '../../config';
import * as schema from './Schemas';

const headers = (token: string) => ({ 'X-Tebex-Secret': token });
async function call<T extends z.ZodType>(
  token: string,
  path: string,
  response: T,
  init: RequestInit = {},
): Promise<z.output<T>> {
  return schema.parseResponse(
    response,
    await request(config.TEBEX_URL + path, {
      ...init,
      headers: headers(token),
    }),
    'Tebex ' + (init.method ?? 'GET') + ' ' + path.split('/')[1],
  );
}
function giftBody(
  amount: number,
  id: string,
  name: string,
  link?: string,
): FormData {
  if (!Number.isFinite(amount) || amount <= 0)
    throw new Error('Giftcard amount must be positive');
  const body = new FormData();
  body.append('amount', String(amount));
  body.append(
    'note',
    (link ? 'LINKED:' + link + ': ' : '') +
      'Created with Discord bot by ' +
      name +
      ' (' +
      id +
      ')',
  );
  return body;
}
export const TebexAPI = {
  getPaymentFromId: async (
    token: string,
    transaction: string,
  ): Promise<IPaymentFromID | []> => {
    const result = await call(
      token,
      '/payments/' + encodeURIComponent(transaction),
      z.union([schema.tebexPayment, z.array(z.never())]),
    );
    return Array.isArray(result) ? [] : result;
  },
  createGiftcard: (
    token: string,
    amount: number,
    id: string,
    name: string,
    link?: string,
  ) =>
    call(token, '/gift-cards', schema.tebexGiftResult, {
      method: 'POST',
      body: giftBody(amount, id, name, link),
    }),
  deleteGiftcard: (token: string, id: string) =>
    call(
      token,
      '/gift-cards/' + encodeURIComponent(id),
      schema.tebexGiftResult,
      { method: 'DELETE' },
    ),
  createBan: (token: string, user: string, reason: string, ip?: string) => {
    const body = new FormData();
    body.append('reason', reason);
    body.append('user', user);
    if (ip) body.append('ip', ip);
    return call(token, '/bans', schema.tebexBan, { method: 'POST', body });
  },
  getPaymentsFromUser: (token: string, user: string) =>
    call(
      token,
      '/user/' + encodeURIComponent(user),
      z.union([schema.apiError, schema.tebexUser]),
    ),
  recoverGiftcard: async (token: string, user: string) => {
    const result = await call(
      token,
      '/gift-cards',
      z.union([schema.apiError, schema.tebexGiftcards]),
    );
    if ('error_code' in result) return result;
    const cards = result.data.filter(
      (card) => !card.void && card.note.startsWith('LINKED:' + user + ':'),
    );
    return cards.length
      ? cards
      : {
          error_code: 422,
          error_message: 'No active giftcards linked to this account',
        };
  },
  getLastPaymentFromUser: async (token: string, user: string) => {
    const payments = await TebexAPI.getPaymentsFromUser(token, user);
    if ('error_code' in payments || payments.payments.length === 0) return null;
    const payment = await TebexAPI.getPaymentFromId(
      token,
      payments.payments[0].txn_id,
    );
    return Array.isArray(payment) ? null : payment.packages;
  },
};
export type IPaymentFromID = z.output<typeof schema.tebexPayment>;
export type IPayments = z.output<typeof schema.tebexUser>;
