import { Client, StringSelectMenuInteraction, InteractionResponse } from "discord.js";
import SelectMenu from "../../structures/SelectMenu";
import { Embeds } from "../../API/Util/Embeds";

const name = 'giftcard'

const execute = async (client: Client, interaction: StringSelectMenuInteraction): Promise<void | InteractionResponse<boolean> | undefined> => {
    if (!interaction.guildId) return;
    if (interaction.customId === 'giftcard;recover') {

        let data = interaction.values[interaction.values.length - 1].split(';');
        await interaction.reply({
            embeds: [Embeds.giftcard_embed(data[2], data[1], data[0], data[3], interaction.user.tag)],
            components: [...interaction.message.components],
            ephemeral: true
        });
    }
}

const select_menu = new SelectMenu(name, execute);
export { select_menu };