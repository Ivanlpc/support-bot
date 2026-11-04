import { InteractionReplyOptions, RepliableInteraction } from 'discord.js';

export async function respond(
  interaction: RepliableInteraction,
  options: InteractionReplyOptions,
) {
  if (interaction.deferred) {
    const { ephemeral, flags, fetchReply, withResponse, ...editable } = options;
    return interaction.editReply(editable);
  }
  if (interaction.replied)
    return interaction.followUp({ ...options, ephemeral: true });
  return interaction.reply(options);
}
