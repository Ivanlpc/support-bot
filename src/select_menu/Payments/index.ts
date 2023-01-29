import { Client, StringSelectMenuInteraction, InteractionResponse } from "discord.js";
import SelectMenu from "../../structures/SelectMenu";
import { Embeds } from "../../API/Util/Embeds";
import { getServerInformation } from "../../API/Services/Guilds";
import { TebexAPI } from "../../API/External/TebexAPI";
import { CraftingstoreAPI } from "../../API/External/CraftingstoreAPI";

const messages = require("../../messages.json");

const name = 'payments'

const execute = async (client: Client, interaction: StringSelectMenuInteraction): Promise<void | InteractionResponse<boolean> | undefined> => {
    
    if (!interaction.guildId) return;
    if (interaction.customId === 'payments;CS') {
        interaction.deferUpdate();
        const serverInfo = await getServerInformation(interaction.guildId);
        if (serverInfo.setup === 0) {
            interaction.reply({ content: messages[serverInfo.lang].setup_not_done, ephemeral: true })
            return;
        }
        let id = interaction.values[interaction.values.length - 1];
        let data = id.split(';')
        const request = await CraftingstoreAPI.getPaymentByID(data[0], data[1], serverInfo.token, 1);
        if (request === null) {
            await interaction.message.edit({ content: messages[serverInfo.lang].payment_not_found, embeds: [], components: [...interaction.message.components] })
        } else {
            await interaction.message.edit({ content: '', embeds: [Embeds.transaction_craftingstore_embed(request)], components: [...interaction.message.components] })
        }
    } else if (interaction.customId === 'payments;TB') {
        interaction.deferUpdate();
        const serverInfo = await getServerInformation(interaction.guildId);
        if (serverInfo.setup === 0) {
            interaction.reply({ content: messages[serverInfo.lang].setup_not_done, ephemeral: true })
            return;
        }
        let id = interaction.values[interaction.values.length - 1];
        const request = await TebexAPI.getPaymentFromId(serverInfo.token, id);

        if (Array.isArray(request)) {
            await interaction.message.edit({ content: messages[serverInfo.lang].payment_not_found, embeds: [], components: [...interaction.message.components] })
        } else {
            await interaction.message.edit({ content: '', embeds: [Embeds.transaction_tebex_embed(request)], components: [...interaction.message.components] })
        }
    }

}

const select_menu = new SelectMenu(name, execute);
export { select_menu };