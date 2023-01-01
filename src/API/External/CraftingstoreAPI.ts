import { config } from "../..";
import { request } from "../Requests";


const buildHeaders = (token: string): Headers => {
    var header = new Headers();
    header.append("token", token);
    return header;
}
export const CraftingstoreAPI = {

    createGiftcard: async (token: string, amount: number,  name: string, id: string) => {
        const url = `${config.CRAFTINGSTORE_URL}/gift-cards`;
        const body = new FormData()
        body.append('amount', amount.toString())
        var requestOptions = {
            method: 'POST',
            headers: buildHeaders(token),
            body: body
        }
        const res : IGifcard = await request<IGifcard>(url, requestOptions);
        return res;
    },
    deleteGiftcard: async (token: string, id: string) => {
        const url = `${config.CRAFTINGSTORE_URL}/gift-cards/${id}`;
        var requestOptions = {
            method: 'DELETE',
            headers: buildHeaders(token)
        }
        const res : IRequest = await request<IRequest>(url, requestOptions);
        return res;
    },
    getPaymentByID: async (user: string, transaction_id: string, token: string, page: number) : Promise<IPayment | null> => {
        return new Promise(async (resolve, reject) => {
            let res = await requestPaymentByPage(user, token, page);
            if(!res.success) reject(null);
            for(let i = res.meta.currentPage; i <= res.meta.lastPage; i++){

                let index = res.data.findIndex(payment => payment.transactionId === transaction_id);
                if(index !== -1) {
                    resolve(res.data[index]);
                }else if(index === -1 && i === res.meta.lastPage){
                    resolve(null);
                }
                res = await requestPaymentByPage(user, token, i);
                if(!res.success){
                    reject(null);
                }
            }
        })
    },
    getUserPayments: async (token: string, user: string) => {
        const url = `${config.CRAFTINGSTORE_URL}/payments?player=${user}`;
        var requestOptions = {
            method: 'GET',
            headers: buildHeaders(token)
        }
        const res : IRequest = await request<IRequest>(url, requestOptions);
        if(res.meta.currentPage < res.meta.lastPage){
            const res2 = await requestPaymentByPage(user, token, 2);
            res.data.push(...res2.data.slice(0, 4))
        }
        return res;
    }
}

const requestPaymentByPage = async (user: string, token: string, page: number) => {
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
