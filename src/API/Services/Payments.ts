import { IPayment } from '../External/CraftingstoreAPI';

const removeAccents = (str: string) =>
  str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export const validatePayment = (
  payment: IPayment | undefined,
  product: string,
): boolean => {
  if (payment == undefined) return false;
  const packageName = removeAccents(payment.packageName).toUpperCase();
  if (
    !product.trim() ||
    !packageName.includes(removeAccents(product).toUpperCase())
  )
    return false;
  if (!['PAID', 'COMPLETE'].includes(payment.status)) return false;
  const age = Date.now() - payment.timestamp * 1000;
  if (!Number.isFinite(age) || age < 0 || age > 86400000) return false;
  return true;
};
