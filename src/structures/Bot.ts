import { Client, Collection, GatewayIntentBits, Partials } from "discord.js";
import Command from "./Command";
import SelectMenu from "./SelectMenu";

export default class Bot extends Client {
    private RestCommands: Array<Command>;
    private commands: Collection<string, Command>;
    private select_menu: Collection<string, SelectMenu>;

    constructor() {
        super({intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages], partials: [Partials.Channel, Partials.Message]});
        this.RestCommands = new Array();
        this.commands = new Collection();
        this.select_menu = new Collection();
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
    public pushSelectmenu(key: string, value: SelectMenu): void {
        this.select_menu.set(key, value);
    }
    public getCommand(commandName: string): Command | undefined{
        return this.commands.get(commandName);
    }

    public getSelectMenu(select_menu: string): SelectMenu | undefined {
        return this.select_menu.get(select_menu);
    }

}