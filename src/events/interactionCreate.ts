import Event from '../structures/Event';
import { client, config } from "..";
import { BaseInteraction } from 'discord.js';

const event = new Event('interactionCreate', async (interaction : BaseInteraction): Promise<void> => {

    if (interaction.isChatInputCommand()) {
        let command = client.getCommand(interaction.commandName)
        if (!command) return
        try {
            await command.execute(client, interaction)
        } catch (e) {
            console.log(e)
            interaction.reply({
                content: config.Locale.command_error,
                ephemeral: true
            })
            
        }
    }
})
export { event }