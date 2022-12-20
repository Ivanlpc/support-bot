import { Client, Collection, GatewayIntentBits, Partials } from "discord.js";
import Command from "./Command";

export default class Bot extends Client {
    private RestCommands: Array<Command>;
    private commands: Collection<string, Command>;

    constructor() {
        super({intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages], partials: [Partials.Channel, Partials.Message]});
        this.RestCommands = new Array();
        this.commands = new Collection();
    }
    public getRestCommands(): Array<Command> {
        return this.RestCommands
    }
    public pushCommand(key: string, value: Command): void {
        this.commands.set(key, value);
    }

    public pushRestCommand(command: Command): void {
        this.RestCommands.push(command);
    }

    public getCommand(commandName: string): Command | undefined{
        return this.commands.get(commandName);
    }


}