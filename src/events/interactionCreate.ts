import Event from '../structures/Event';
import { client, config } from "..";
import { BaseInteraction } from 'discord.js';
import { CraftingstoreAPI } from '../API/External/CraftingstoreAPI';
import { getServerInformation } from '../API/Services/Guilds';
import { Embeds } from '../API/Util/Embeds';
import { TebexAPI } from '../API/External/TebexAPI';

const cooldown = new Set();


const event = new Event('interactionCreate', async (interaction: BaseInteraction): Promise<void> => {

    if (interaction.isChatInputCommand()) {
        let command = client.getCommand(interaction.commandName)
        if (!command) return;
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
    if (interaction.isStringSelectMenu() && interaction.guildId) {
        if (cooldown.has(interaction.user.id)) {
            interaction.reply
        }
        if (interaction.customId === 'paymentsCS') {
            interaction.deferUpdate();
            const serverInfo = await getServerInformation(interaction.guildId);
            if (serverInfo.setup === 0) {
                interaction.reply({ content: config.Locale.setup_not_done, ephemeral: true })
                return;
            }
            let id = interaction.values[interaction.values.length - 1];
            let data = id.split(';')
            const request = await CraftingstoreAPI.getPaymentByID(data[0], data[1], serverInfo.token, 1);
            if (request === null) {
                await interaction.message.edit({ content: config.Locale.payment_not_found, embeds: [], components: [...interaction.message.components] })
            } else {
                await interaction.message.edit({ content: '', embeds: [Embeds.transaction_craftingstore_embed(request)], components: [...interaction.message.components] })
            }
        } else if (interaction.customId === 'paymentsTB') {
            interaction.deferUpdate();
            const serverInfo = await getServerInformation(interaction.guildId);
            if (serverInfo.setup === 0) {
                interaction.reply({ content: config.Locale.setup_not_done, ephemeral: true })
                return;
            }
            let id = interaction.values[interaction.values.length - 1];
            const request = await TebexAPI.getPaymentFromId(serverInfo.token, id);

            if (Array.isArray(request)) {
                await interaction.message.edit({ content: config.Locale.payment_not_found, embeds: [], components: [...interaction.message.components] })
            } else {
                await interaction.message.edit({ content: '', embeds: [Embeds.transaction_tebex_embed(request)], components: [...interaction.message.components] })
            }
        }
    }
    else if (interaction.isButton() && interaction.guildId) {
        if (interaction.customId === 'close') {
            await interaction.message.edit({ content: 'Closed!', components: [] })
        }
    }
})
export { event }