import fs from 'fs';
const botVersion = require('../../package.json');

export const uncaughtException = (error: Error): void => {
    console.log(error)
    console.log('\x1b[31m%s\x1b[0m', `[v${botVersion.version}] If you need any support, please create a ticket in our discord server and provide the logs.txt file\n\n`)

    let errorMsg = `\n\n[${new Date().toLocaleString()}] [uncaughtException] [v${botVersion.version}]\n${error.stack}`;
    fs.appendFile("./logs.txt", errorMsg, (e) => {
        if (e) console.log(e);
    });
}

export const unhandledRejection = <T>(error: Error | any, promise: Promise<T>) : void => {
    console.log('Unhandled Rejection at:', promise, 'reason:', error);
    console.log('\x1b[31m%s\x1b[0m', `[v${botVersion.version}] If you need any support, please create a ticket in our discord server and provide the logs.txt file\n\n`)

    let errorMsg = `\n\n[${new Date().toLocaleString()}] [unhandledRejection] [v${botVersion.version}]\n${error.stack}`;
    fs.appendFile("./logs.txt", errorMsg, (e) => {
        if (e) console.log(e);
    });
}
