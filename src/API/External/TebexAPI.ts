import { config } from "../..";
import { request } from "../Requests";

const buildHeaders = (token: string): Headers => {
    var header = new Headers();
    header.append("X-Tebex-Secret", token);
    return header;
}
export const TebexAPI = {
    getPaymentFromId : async <T>(token: string, transaction_id: string) => {
        const url = `${config.TEBEX_URL}/payments/${transaction_id}`;
        var requestOptions = {
            method: 'GET',
            headers: buildHeaders(token)
        };
        const res: IPaymentFromID | Array<T>  = await request< Array<T> | IPaymentFromID>(url, requestOptions);
        
        return res;
           
    },
    createGiftcard: async (token: string, amount: number, id: string, name: string) => {
        const url = `${config.TEBEX_URL}/gift-cards`;
        const body = new FormData()
        body.append('amount', amount.toString())
        body.append('note', 'Created with Discord bot from ' + name + ' with id: '+ id)
        var requestOptions = {
            method: 'POST',
            headers: buildHeaders(token),
            body: body
        }
        const res : IGifcard = await request<IGifcard>(url, requestOptions);
        return res;
    },
    deleteGiftcard: async (token: string, id: string) => {
        const url = `${config.TEBEX_URL}/gift-cards/${id}`;
        var requestOptions = {
            method: 'DELETE',
            headers: buildHeaders(token)
        }
        const res: IGifcard = await request<IGifcard>(url, requestOptions);
        return res;
    },
    getPaymentsFromUser: async (token: string, username: string) => {
        const url = `${config.TEBEX_URL}/user/${username}`;
        var requestOptions = {
            method: 'GET',
            headers: buildHeaders(token)
        };
        const res = await request<ITransaction>(url, requestOptions);
        return res;
    
    },
    createBan: async(token: string, user: string, reason: string, ip?: string ) : Promise<IBan> => {
        const url = `${config.TEBEX_URL}/bans`;
        const body = new FormData()
        body.append('reason', reason);
        body.append('user', user);
        if(ip){
            body.append('ip', ip);
        }
        var requestOptions = {
            method: 'POST',
            headers: buildHeaders(token),
            body: body
        }
        const res = await request<IBan>(url, requestOptions);
        return res;
    }

}

interface IGifcard {
    error_code: number | undefined,
    error_message: string | undefined,
    data: {
        id: number,
        code: string,
        balance: {
            starting: string,
            remaining: string,
            currency: string
        },
    note: string,
    void: boolean
    }
}

interface IBan {
    error_code: number | undefined,
    error_message: string | undefined
    data: {
        id: number,
        time: string,
        ip: string,
        payment_email: string,
        reason: string,
        user: {
            ign: string,
            uuid: string
        }
    }
}


export interface IPaymentFromID{
    error_code: number | undefined,
    error_message: string | undefined,
    id: number,
    amount: number,
    status: string
    date: string
    currency: {
        iso_4217: string,
        symbol: string
    },
    player: {
        id: number
        name: string
        uuid: string
    },
    packages: Array<IPackage>
    notes: Array<INote>
    creator_code: string
}
interface INote {
    created_at: string
    note: string
}
interface IPackage {
    id: string
    name: string
}


export interface ITransaction {
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