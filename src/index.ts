import path from 'path';
import fs from 'fs';
import Bot from "./structures/Bot";
import { unhandledRejection, uncaughtException } from './API/Proccess';

const config = require("../config.json");
const TOKEN: string = config.TOKEN;

export const client = new Bot();

process.on('unhandledRejection', unhandledRejection);
process.on('uncaughtException', uncaughtException);

//Import events
const eventsPath: string = path.join(__dirname, 'events');
const eventsFile: string[] = fs.readdirSync(eventsPath);
for (const file of eventsFile) {
	let filePath = path.join(eventsPath, file);
	let { event } = require(filePath);
	client.on(event.getName(), event.execute);
	console.log("\u001b[32m", `[✔] Loaded ${event.getName()} Event`, "\u001b[0m")
}

//Import commands
const commandsPath: string = path.join(__dirname, 'commands');
const commandsFile: string[] = fs.readdirSync(commandsPath);
if (commandsFile.length > 0) {
	for (const file of commandsFile) {
		let filePath = path.join(commandsPath, file);
		(async () => {
			let { command } = await require(filePath);
			if (command.getEnabled()) {
				client.pushCommand(command.getData().name, command)
				client.pushRestCommand(command.getData().toJSON());
				console.log("\u001b[32m", `[✔] Loaded /${command.getData().name} command`, "\u001b[0m")
			} else {
				console.log("\x1b[31m", `[X] Disabled /${command.getData().name} command`, "\u001b[0m")
			}
		})();
	}
}

//Import select menus
const menusPath: string = path.join(__dirname, 'select_menu');
const menusFile: string[] = fs.readdirSync(menusPath)
for(const file of menusFile){
	let filePath = path.join(menusPath, file);
	let { select_menu } = require(filePath);
	if(select_menu){
		client.pushSelectmenu(select_menu.customId, select_menu);
		console.log("\u001b[32m", `[✔] Loaded ${select_menu.customId} Select-Menu`, "\u001b[0m")
	}
}

client.login(TOKEN)