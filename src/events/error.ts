import Event from "../structures/Event";
import fs from 'fs';

const botVersion = require('../../package.json');

const event = new Event('error', async (error: Error) => {
  console.log(error);
  console.log('\x1b[31m%s\x1b[0m', `[v${botVersion.version}] If you need any support, please create a ticket in our discord server and provide the logs.txt file\n\n`);

  let errorMsg = `\n\n[${new Date().toLocaleString()}] [ERROR] [v${botVersion.version}]\n${error.stack}`;
  fs.appendFile("./logs.txt", errorMsg, (e: NodeJS.ErrnoException | null): void => {
    if (e) console.log(e);
  });
});

export { event };