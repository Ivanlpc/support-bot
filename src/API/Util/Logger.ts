import fs from "fs";

export default class Logger {

    static info(...msg: string[]) {
        console.info(msg.join(' '));
        let message = `\n[${new Date().toLocaleString()}] [INFO]: ${msg}`;
        fs.appendFile("./logs.txt", message, (e) => {
            if (e) console.log(e);
        });

    }
    static error(...msg: string[] | Error[] | unknown[]) {
        console.error(msg);
        let message = `\n[${new Date().toLocaleString()}] [ERROR]: ${msg}`;
        fs.appendFile("./errors.txt", message, (e) => {
            if (e) console.log(e);
        });
    }

}