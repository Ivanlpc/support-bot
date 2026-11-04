import { z } from 'zod';

const money = z
  .union([z.number(), z.string().regex(/^\d+(?:\.\d+)?$/)])
  .transform(Number)
  .pipe(z.number().finite().nonnegative());
const moneyText = money.transform(String);
const id = z
  .union([z.string().min(1).max(100), z.number().int().nonnegative()])
  .transform(String);
export const apiError = z.object({
  error_code: z.number().int(),
  error_message: z.string(),
});
export const tebexPayment = z.object({
  id,
  amount: money,
  status: z.string(),
  date: z.string(),
  currency: z.object({ iso_4217: z.string(), symbol: z.string() }),
  player: z.object({
    name: z.string().min(1),
    uuid: z
      .string()
      .nullish()
      .transform((value) => value ?? 'None'),
  }),
  packages: z.array(z.object({ id, name: z.string() })),
  error_code: z.undefined().optional(),
  error_message: z.undefined().optional(),
});
export const tebexUser = z.object({
  payments: z.array(
    z.object({
      txn_id: z.string().min(1).max(100),
      time: z.number().finite(),
      price: money,
      currency: z.string(),
      status: z.number().int(),
    }),
  ),
});
export const tebexGiftcard = z.object({
  id,
  code: z.string().min(1),
  balance: z.object({
    starting: moneyText,
    remaining: moneyText,
    currency: z.string(),
  }),
  note: z
    .string()
    .nullish()
    .transform((value) => value ?? ''),
  void: z.boolean(),
});
export const tebexGiftcards = z.object({ data: z.array(tebexGiftcard) });
export const tebexGiftResult = z.union([
  apiError,
  z.object({ data: tebexGiftcard }),
]);
export const tebexBan = z.union([
  apiError,
  z.object({
    error_code: z.undefined().optional(),
    error_message: z.undefined().optional(),
    data: z.object({
      id,
      reason: z.string(),
      user: z.object({ ign: z.string() }),
    }),
  }),
]);
export const craftingPayment = z.object({
  id: z.number().int(),
  transactionId: z.string().min(1).max(100),
  externalTransactionId: z
    .string()
    .nullish()
    .transform((value) => value ?? ''),
  price: money,
  packageName: z.string(),
  inGameName: z.string().min(1),
  uuid: z.string().nullable(),
  email: z
    .string()
    .nullish()
    .transform((value) => value ?? ''),
  notes: z.string().nullable().optional(),
  gateway: z.string(),
  status: z.string(),
  timestamp: z.number().finite().nonnegative(),
});
export const craftingPayments = z.discriminatedUnion('success', [
  z.object({
    success: z.literal(false),
    message: z.string().nullable().optional(),
  }),
  z.object({
    success: z.literal(true),
    message: z.string().nullable().optional(),
    data: z.array(craftingPayment),
    meta: z.object({
      currentPage: z.number().int().positive(),
      lastPage: z.number().int().nonnegative(),
      perPage: z.number().int().nonnegative().optional(),
    }),
  }),
]);
export const craftingGiftcard = z.discriminatedUnion('success', [
  z.object({
    success: z.literal(false),
    message: z.string().nullable().optional(),
  }),
  z.object({
    success: z.literal(true),
    data: z.object({
      id,
      code: z.string().min(1),
      amount: moneyText,
      amountRemaining: moneyText,
    }),
  }),
]);

export function parseResponse<T extends z.ZodType>(
  schema: T,
  value: unknown,
  operation: string,
): z.output<T> {
  const result = schema.safeParse(value);
  if (!result.success) {
    const fields = result.error.issues
      .map((issue) => issue.path.join('.'))
      .join(', ');
    throw new Error(`Invalid ${operation} response at: ${fields}`);
  }
  return result.data;
}
