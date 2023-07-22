import mysql from "mysql";
import path from 'path';
import fs from 'fs';
import Logger from "../../API/Util/Logger";
import { cmd } from "../../API/Services/User";

const MySQLEvents = require('@rodrigogs/mysql-events');
const eventsPath: string = path.join(__dirname, 'Events');
const eventsFile: string[] = fs.readdirSync(eventsPath)

const config = require("../../../config.json");

const SQLEvents = async () => {
    const connection = mysql.createPool({
        host: config.Database.HydraBot.host,
        user: config.Database.HydraBot.user,
        password: config.Database.HydraBot.password
    });
    const instance = new MySQLEvents(connection, {
        startAtEnd: true,
        excludedSchemas: {
            mysql: true,
        },
    });
    await instance.start();

    for (const file of eventsFile) {
        let filePath = path.join(eventsPath, file);
        let { MySQLTrigger } = require(filePath);
        instance.addTrigger(MySQLTrigger);
    }
    
     instance.on(MySQLEvents.EVENTS.CONNECTION_ERROR, Logger.error);
     instance.on(MySQLEvents.EVENTS.ZONGJI_ERROR, cmd);
};

export default SQLEvents;
