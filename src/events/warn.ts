import Event from "../structures/Event";
import fs from 'fs';
const botVersion = require('../../package.json');

const event = new Event('warn', async (message: string): Promise<void> => {
    console.log(message);
    let errorMsg = `\n\n[${new Date().toLocaleString()}] [WARN] [v${botVersion.version}]\n${message}`;
    fs.appendFile("./logs.txt", errorMsg, (e : NodeJS.ErrnoException | null): void => { 
        if(e) console.log(e);
      });
})

export {event};