import Event from '../structures/Event';
import { clearPermissions } from '../API/Services/Permissions';
import Logger from '../API/Util/Logger';

export function createMemberRemoveEvent(clear = clearPermissions) {
  return new Event('guildMemberRemove', async (member) => {
    const guildId = member.guild.id;
    const userId = member.id;
    const removed = await clear(guildId, userId);
    Logger.info('Departed member permissions cleared', {
      guildId,
      userId,
      removed,
    });
  });
}

export const event = createMemberRemoveEvent();
