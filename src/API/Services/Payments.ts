import { IPayment } from "../External/CraftingstoreAPI";

const removeAccents = ( str : string) =>
  str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');


export const validatePayment = (payment: IPayment | undefined, product: string): boolean => {
    if (payment == undefined) return false;
    const packageName = removeAccents(payment.packageName);
    if(!packageName.includes(product.toLocaleUpperCase())) return false;
    if(payment.status === "CHARGEBACK") return false;
    if (new Date().getTime() - (payment.timestamp * 1000)  > 86400000) return false;
    return true;
}
