import { command as setup } from './setup';
import { command as search } from './search';
import { command as help } from './help';
import { command as giftcard } from './giftcard';
import { command as ban } from './ban';
import { command as payments } from './payments';
import { createCommand } from './perm';
import { config } from '../config';
import Command from '../structures/Command';

export async function loadCommands(): Promise<Command[]> {
  const commands = [setup, search, help, giftcard, ban, payments];
  if (config.Commands.perm.enabled)
    commands.push((await createCommand()).command);
  return commands.filter((command) => command.getEnabled());
}
