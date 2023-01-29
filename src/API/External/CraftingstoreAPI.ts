import config from "../../config.json";

import { request } from "../Requests";

/**
 * Build Headers to make a request
 * @param token Token of your Craftingstore shop
 * @returns Header with the token
 */
const buildHeaders = (token: string): Headers => {
    var header = new Headers();
    header.append("token", token);
    return header;
}
export const CraftingstoreAPI = {

    /**
     * Create a giftcard in Craftingstore
     * @param token Token of your Craftingstore shop
     * @param amount Amount of the giftcard you want to create
     * @returns IGiftcard
     */
    createGiftcard: async (token: string, amount: number): Promise<IGifcard> => {
        const url = `${config.CRAFTINGSTORE_URL}/gift-cards`;
        const body = new FormData()
        body.append('amount', amount.toString())
        var requestOptions = {
            method: 'POST',
            headers: buildHeaders(token),
            body: body
        }
        const res: IGifcard = await request<IGifcard>(url, requestOptions);
        return res;
    },

    /**
     * Delete a giftcard from Craftingstore shop
     * @param token Token of your Craftingstore shop
     * @param id ID of the giftcard you want to delete
     * @returns IRequest
     */
    deleteGiftcard: async (token: string, id: string) => {
        const url = `${config.CRAFTINGSTORE_URL}/gift-cards/${id}`;
        var requestOptions = {
            method: 'DELETE',
            headers: buildHeaders(token)
        }
        const res: IRequest = await request<IRequest>(url, requestOptions);
        return res;
    },

    /**
     * Get a Payment by the ID provided
     * @param user Name of the user who made the payment
     * @param transaction_id ID of the payment
     * @param token Token of your Craftingstore shop
     * @param page Starting at 1, page of the payment
     * @returns null or IPayment
     */
    getPaymentByID: async (user: string, transaction_id: string, token: string, page: number): Promise<IPayment | null> => {
        return new Promise(async (resolve, reject) => {
            let res = await requestPaymentByPage(user, token, page);
            if (!res.success) reject(null);
            for (let i = page; i <= res.meta.lastPage; i++) {

                let index = res.data.findIndex(payment => payment.transactionId === transaction_id);
                if (index !== -1) {
                    resolve(res.data[index]);
                } else if (index === -1 && i === res.meta.lastPage) {
                    resolve(null);
                }
                if (i + 1 <= res.meta.lastPage) {
                    res = await requestPaymentByPage(user, token, i + 1);
                    if (!res.success) {
                        reject(null);
                    }
                }
            }
        })
    },

    /**
     * Get all payments made by the username provided
     * @param token Token of your Craftingstore shop
     * @param user Name of the user who made the payments
     * @returns IRequest
     */

    getUserPayments: async (token: string, user: string): Promise<IRequest> => {
        const url = `${config.CRAFTINGSTORE_URL}/payments?player=${user}`;
        var requestOptions = {
            method: 'GET',
            headers: buildHeaders(token)
        }
        const res: IRequest = await request<IRequest>(url, requestOptions);
        if (res.meta.currentPage < res.meta.lastPage) {
            const res2 = await requestPaymentByPage(user, token, 2);
            res.data.push(...res2.data.slice(0, 4))
        }
        return res;
    }
}

/**
 * Request payment by page
 * @param user Name of the user who made the payments
 * @param token Token of your Craftingstore shop
 * @param page Starting at 1, page of the payment
 * @returns IRequest
 */

const requestPaymentByPage = async (user: string, token: string, page: number): Promise<IRequest> => {
    const url = `${config.CRAFTINGSTORE_URL}/payments?player=${user}&page=${page}`;
    var requestOptions = {
        method: 'GET',
        headers: buildHeaders(token)
    }
    const res: IRequest = await request<IRequest>(url, requestOptions);
    return res;
}


interface IGifcard {
    success: boolean,
    message: null,
    data: {
        id: number,
        code: string,
        amount: string,
        amountRemaining: string
    },
    meta: []
}

interface IRequest {
    success: boolean,
    message: string | null,
    data: Array<IPayment>,
    meta: {
        currentPage: number,
        lastPage: number,
        perPage: number
    }
}
export interface IPayment {
    id: number,
    transactionId: string,
    externalTransactionId: string,
    price: number,
    packageName: string,
    inGameName: string,
    uuid: string | null
    email: string,
    notes: string
    gateway: string
    status: string
    timestamp: number
}
