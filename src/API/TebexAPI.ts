import { config } from "..";
import { request } from "./Requests";

const buildHeaders = (token: string): Headers => {
    var header = new Headers();
    header.append("X-Tebex-Secret", token);
    return header;
}

export const getPaymentFromId = async (token: string, transaction_id: string) => {
    const url = `${config.API_URL}/payments/${transaction_id}`;
    var requestOptions = {
        method: 'GET',
        headers: buildHeaders(token)
    };
    const res = await request(url, requestOptions);
       
}

export const createGiftCard = async (token: string, amount: number, id: number, name: string) => {
    const url = `${config.API_URL}/gift-cards`;
    var requestOptions = {
        method: 'POST',
        headers: buildHeaders(token),
        body: JSON.stringify({
            amount: amount,
            note: `Created using Tebex discord bot from ${name} with ID: ${id}`
        })
    }
    const res = await request(url, requestOptions);
 
}


export const getPaymentsFromUser = async (token: string, username: string) => {
    const url = `${config.API_URL}/user/${username}`;
    var requestOptions = {
        method: 'GET',
        headers: buildHeaders(token)
    };
    const res = await request<ITransaction>(url, requestOptions);
    return res;

}

interface ITransaction {
    player: IPlayer,
    banCount: number,
    chargebackRate: number,
    payments: Array<IPayment>,

}
interface IPayment {
    txn_id: string,
    time: number,
    price: number,
    currency: string,
    status: number
}
interface IPlayer {
    id: string,
    username: string,
    meta: string,
    plugin_username_id: number
}