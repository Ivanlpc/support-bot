import path from 'path';
import fs from 'fs';
import YAML from 'yaml';
import Bot from "./structures/Bot";
import { unhandledRejection, uncaughtException } from './Resources/Proccess';


const configDir = __dirname + "/config.yml";
export const config = YAML.parse(fs.readFileSync(configDir, 'utf-8'));
const TOKEN: string = config.TOKEN;
const eventsPath: string = path.join(__dirname, 'events');
const eventsFile: string[] = fs.readdirSync(eventsPath)
const commandsPath: string = path.join(__dirname, 'commands');
const commandsFile: string[] = fs.readdirSync(commandsPath);
export const client = new Bot();

process.on('unhandledRejection', unhandledRejection);
process.on('uncaughtException', uncaughtException);

//Import events
for (const file of eventsFile) {
	let filePath = path.join(eventsPath, file);
	let {event} = require(filePath);
	client.on(event.getName(), event.execute);
	console.log("\u001b[32m", `[✔] Loaded ${event.getName()} Event`, "\u001b[0m")
}


//Import commands
if (commandsFile.length > 0) {
	for (const file of commandsFile) {
		let filePath = path.join(commandsPath, file);
		let {command} = require(filePath);
		if (command.getEnabled()) {
			client.pushCommand(command.getData().name, command)
			client.pushRestCommand(command.getData().toJSON());
			console.log("\u001b[32m", `[✔] Loaded /${command.getData().name} command`, "\u001b[0m")
		} else {
			console.log("\x1b[31m", `[X] Disabled /${command.getData().name} command`, "\u001b[0m")
		}
	}
}

client.login(TOKEN)