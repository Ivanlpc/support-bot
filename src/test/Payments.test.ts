import { IPayment } from '../API/External/CraftingstoreAPI';
import { validatePayment } from '../API/Services/Payments';



describe("validatePayment", () => {
    it("Return false when payment is undefined", () => {
        const res = validatePayment(undefined, "Product");
        expect(res).toBe(false);
    })

    it("Returns false when packageName does not include the product", () => {
        const payment = {
            "packageName": "1x VIP",
            "status": "COMPLETE",
            "timestamp": Date.now() / 1000
        }
        const res = validatePayment(payment as IPayment, "TEST");
        expect(res).toBe(false)
    })

    it("Returns false when payment is older than 24 hours", () => {
        const payment = {
            "packageName": "1x VIP",
            "status": "COMPLETE",
            "timestamp": (Date.now() / 1000) - (86401)
        }
        const res = validatePayment(payment as IPayment, "vip".toLocaleUpperCase());
        expect(res).toBe(false);
    })
    it("Returns false when payment is CHARGEBACK", () => {
        const payment = {
            "packageName": "1x VIP",
            "status": "CHARGEBACK",
            "timestamp": Date.now() / 1000
        }
        const res = validatePayment(payment as IPayment, "vip".toLocaleUpperCase());
        expect(res).toBe(false);
    })
    it("Return true when payment is valid", () => {
        const payment = {
            "packageName": "1x VIP",
            "status": "COMPLETE",
            "timestamp": Date.now() / 1000
        }
        const res = validatePayment(payment as IPayment, "vip".toLocaleUpperCase());
        expect(res).toBe(true);
    })
})