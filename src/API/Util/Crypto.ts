import crypto from 'crypto';
import { config } from '../..';

export function encrypt(message: string){
    const iv = crypto.randomBytes(16).toString("hex").slice(0, 16);
    const encrypter = crypto.createCipheriv("aes-128-ofb", config.KEY, iv);

    let encryptedMsg = encrypter.update(message, "utf-8", "hex");
    encryptedMsg += encrypter.final("hex");
    return {
        token: encryptedMsg,
        iv: iv
    }
}

export function decrypt(token: string, iv: string) : string {
    const decrypter = crypto.createDecipheriv("aes-128-ofb", config.KEY, iv);
    let decryptedMsg = decrypter.update(token, "hex", "utf8");
    decryptedMsg += decrypter.final("utf8");

    return decryptedMsg;
}