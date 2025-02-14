import Event from '../structures/Event';
import Logger from '../API/Util/Logger';
import { client } from "..";
import { BaseInteraction } from 'discord.js';

const messages = require("../../messages.json");


const event = new Event('interactionCreate', async (interaction: BaseInteraction): Promise<void> => {

    if (interaction.isChatInputCommand()) {
        let command = client.getCommand(interaction.commandName)
        if (!command) return;
        try {
            await command.execute(client, interaction);
        } catch (e) {

            let data = command.getData() as any;
            Logger.error("Error while executing chat command: ", data.name, e)

            interaction.reply({
                content: messages.EN.command_error,
                ephemeral: true
            })
        }
    }

    if (interaction.isStringSelectMenu() && interaction.guildId) {
        let select_menu = client.getSelectMenu(interaction.customId.split(';')[0]);
        if (!select_menu) return;
        try {
            await select_menu.execute(client, interaction);
        } catch (e) {
            Logger.error(e)
            interaction.reply({
                content: messages.EN.command_error,
                ephemeral: true
            })
        }
    }
    else if (interaction.isButton() && interaction.guildId) {
        if (interaction.customId === 'close') {
            await interaction.message.edit({ content: '❌', components: [] })
        }
    }
})
export { event }