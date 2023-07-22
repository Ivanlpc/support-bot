import { encrypt, decrypt } from "../API/Util/Crypto";

describe("Encrypt and Decrypt test", () => {

    it("The encrypted object must have token and iv", () => {
        const str = "STRING TEST";
        const encryption = encrypt(str);
        expect(encryption).toHaveProperty("token");
        expect(encryption).toHaveProperty("iv");
        expect(typeof encryption.token).toBe("string");
        expect(typeof encryption.iv).toBe("string");

    })

    it("The string must be the same when its encrypted and decrypted", () => {
        const str = "STRING DECRYPT TEST";
        const encryption = encrypt(str);
        const decryption = decrypt(encryption.token, encryption.iv);

        expect(decryption).toBe(str);
    })
})