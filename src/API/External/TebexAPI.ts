import config from "../../config.json";

import { request } from "../Requests";

/**
 * Build Headers to make a request
 * @param token Token of your Craftingstore shop
 * @returns Header with the token
 */
const buildHeaders = (token: string): Headers => {
    var header = new Headers();
    header.append("X-Tebex-Secret", token);
    return header;
}

export const TebexAPI = {

    /**
     * Get a payment with the ID provided
     * @param token Token of your Tebex store
     * @param transaction_id ID of the payment you want to get
     * @returns IPaymentFromID | []
     */
    getPaymentFromId: async <T>(token: string, transaction_id: string): Promise<IPaymentFromID | Array<T>> => {
        const url = `${config.TEBEX_URL}/payments/${transaction_id}`;
        var requestOptions = {
            method: 'GET',
            headers: buildHeaders(token)
        };
        const res: IPaymentFromID | Array<T> = await request<Array<T> | IPaymentFromID>(url, requestOptions);

        return res;

    },

    /**
     * Create a giftcard 
     * @param token Token of your Tebex Store
     * @param amount Amount of the giftcard to create
     * @param id ID of the discord account that creates the giftcard
     * @param name Name of the discord account that creates the giftcard
     * @param link Optional. Discord ID of the username to link the giftcard 
     * @returns IManageGiftcard | IError
     */
    createGiftcard: async (token: string, amount: number, id: string, name: string, link?: string): Promise<IManageGiftcard | IError> => {
        const url = `${config.TEBEX_URL}/gift-cards`;
        const body = new FormData()
        body.append('amount', amount.toString())
        body.append('note', 'LINKED:' + link + ': Created with Discord bot from ' + name + ' with id: ' + id)
        var requestOptions = {
            method: 'POST',
            headers: buildHeaders(token),
            body: body
        }
        const res = await request<IManageGiftcard | IError>(url, requestOptions);
        return res;
    },

    /**
     * Delete a Giftcard from your Tebex store
     * @param token Token of your Tebex store
     * @param id ID of the Giftcard you want to delete
     * @returns IManageGiftcard | IError
     */
    deleteGiftcard: async (token: string, id: string): Promise<IManageGiftcard | IError> => {
        const url = `${config.TEBEX_URL}/gift-cards/${id}`;
        var requestOptions = {
            method: 'DELETE',
            headers: buildHeaders(token)
        }
        const res = await request<IManageGiftcard | IError>(url, requestOptions);
        return res;
    },

    /**
     * Ban a user from buying in your Tebex store
     * @param token Token of your Tebex store
     * @param user Name of the user you want to ban
     * @param reason Reason of the ban
     * @param ip Optional. IP of the user you want to ban
     * @returns IBan
     */
    createBan: async (token: string, user: string, reason: string, ip?: string): Promise<IBan> => {
        const url = `${config.TEBEX_URL}/bans`;
        const body = new FormData()
        body.append('reason', reason);
        body.append('user', user);
        if (ip) {
            body.append('ip', ip);
        }
        var requestOptions = {
            method: 'POST',
            headers: buildHeaders(token),
            body: body
        }
        const res = await request<IBan>(url, requestOptions);
        return res;
    },

    /**
     * Get all payments made by the username provided
     * @param token Token of your Tebex store
     * @param user Name of the user you want to get the payments
     * @returns IPayments | IError
     */
    getPaymentsFromUser: async (token: string, user: string): Promise<IPayments | IError> => {
        const url = `${config.TEBEX_URL}/user/${user}`;
        var requestOptions = {
            method: 'GET',
            headers: buildHeaders(token)
        }
        const res = await request<IPayments | IError>(url, requestOptions);
        return res;
    },

    /**
     * Get all giftcards linked to the provided username
     * @param token Token of your Tebex store
     * @param user Name of the user
     * @returns IGiftcard[] | IError
     */
    recoverGiftcard: async (token: string, user: string) => {
        const url = `${config.TEBEX_URL}/gift-cards`;
        var requestOptions = {
            method: 'GET',
            headers: buildHeaders(token)
        };
        const res = await request<IAllGiftcards | IError>(url, requestOptions);
        if ('error_code' in res) return res;
        let giftcard = res.data.filter(elem => elem.note.split(':')[1] === user)
        if (giftcard.length > 0) return giftcard;
        else return {
            error_code: 422,
            error_message: 'Giftcards not found with the username ' + user
        }

    }

}
interface IError {
    error_code: number,
    error_message: string
}
interface IAllGiftcards {
    data: Array<IGifcard>
}
interface IManageGiftcard {
    data: IGifcard
}
interface IGifcard {
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


export interface IPaymentFromID {
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



export interface IPayments {

    player: {
        id: string,
        username: string,
        meta: string,
        plugin_username_id: string
    },
    banCount: number,
    chargebackRate: number,
    payments: Array<{
        txn_id: string,
        time: number,
        price: number,
        currency: string,
        status: number
    }>
    purchaseTotals: {
        USD?: number,
        GBP?: number
    }
}
