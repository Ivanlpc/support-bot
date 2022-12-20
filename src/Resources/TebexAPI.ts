import { config } from "..";

export default class TebexAPI{

    private API_URL : string = "https://plugin.tebex.io";
    private KEY : string = config.TEBEX_SECRET;

    
    private buildHeaders() : Headers {
        var header = new Headers();
        header.append("X-Tebex-Secret", this.KEY);
        return header;
    }

    public async getPaymentFromID(transaction_id : string){
        const url = `${this.API_URL}/payments/${transaction_id}`;
        var requestOptions = {
            method: 'GET',
            headers: this.buildHeaders()
          };
        const res = await fetch(url, requestOptions)
        .then(response => response.json())
        .then(result => console.log(result))
        .catch(error => console.log('error', error));
    }

    public async getPaymentsFromUser( username : string ){
        const url = `${this.API_URL}/user/${username}`;
        var requestOptions = {
            method: 'GET',
            headers: this.buildHeaders()
          };
        const res = await fetch(url, requestOptions)
        .then(response => response.json())
        .then(result => console.log(result))
        .catch(error => console.log('error', error));
    }

}