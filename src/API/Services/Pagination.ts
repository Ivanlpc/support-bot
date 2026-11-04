import { randomUUID } from 'node:crypto';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  InteractionReplyOptions,
} from 'discord.js';

export type MenuOption = { label: string; value: string };
type Page = { options: MenuOption[]; totalPages: number };
type Session = {
  id: string;
  userId: string;
  guildId: string;
  kind: 'TB' | 'CS' | 'GC';
  player: string;
  expires: number;
  totalPages: number;
  load: (page: number) => Promise<Page>;
};
const sessions = new Map<string, Session>();
const timers = new Map<string, NodeJS.Timeout>();
export class ExpiredSessionError extends Error {
  constructor() {
    super('This menu has expired. Run the command again.');
  }
}
export function forgetSession(id: string): void {
  sessions.delete(id);
  clearTimeout(timers.get(id));
  timers.delete(id);
}
export function getSession(
  id: string,
  userId: string,
  guildId: string,
): Session {
  const session = sessions.get(id);
  if (
    !session ||
    session.expires < Date.now() ||
    session.userId !== userId ||
    session.guildId !== guildId
  )
    throw new ExpiredSessionError();
  return session;
}
export function arrayPages(
  options: MenuOption[],
): (page: number) => Promise<Page> {
  return async (page) => ({
    options: options.slice(page * 25, (page + 1) * 25),
    totalPages: Math.max(1, Math.ceil(options.length / 25)),
  });
}
export async function createPager(
  input: Omit<Session, 'id' | 'expires' | 'totalPages'>,
): Promise<InteractionReplyOptions> {
  if (sessions.size >= 1000) forgetSession(sessions.keys().next().value!);
  const session: Session = {
    ...input,
    id: randomUUID(),
    expires: Date.now() + 15 * 60_000,
    totalPages: 1,
  };
  sessions.set(session.id, session);
  timers.set(
    session.id,
    setTimeout(() => forgetSession(session.id), 15 * 60_000).unref(),
  );
  try {
    return await renderPage(session, 0);
  } catch (error) {
    forgetSession(session.id);
    throw error;
  }
}
export async function renderPage(
  session: Session,
  page: number,
): Promise<InteractionReplyOptions> {
  if (!Number.isInteger(page) || page < 0 || page >= session.totalPages)
    throw new Error('Invalid menu page');
  const result = await session.load(page);
  session.totalPages = Math.max(1, result.totalPages);
  const controls = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('page;' + session.id + ';' + (page - 1))
      .setLabel('Previous')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page === 0),
    new ButtonBuilder()
      .setCustomId('page;' + session.id + ';' + (page + 1))
      .setLabel('Next')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page + 1 >= session.totalPages),
    new ButtonBuilder()
      .setCustomId('close;' + session.id)
      .setLabel('Close')
      .setStyle(ButtonStyle.Secondary),
  );
  const components: (
    ActionRowBuilder<ButtonBuilder> | ActionRowBuilder<StringSelectMenuBuilder>
  )[] = [];
  if (result.options.length) {
    const customId =
      session.kind === 'GC'
        ? 'giftcard;recover;' + session.id
        : 'payments;' + session.kind + ';' + session.id + ';' + page;
    const menu = new StringSelectMenuBuilder()
      .setCustomId(customId)
      .setPlaceholder('Select an item')
      .addOptions(
        result.options.map((option) => ({
          label: option.label.slice(0, 100) || 'Item',
          value: option.value,
        })),
      );
    components.push(
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu),
    );
  }
  components.push(controls);
  return {
    content:
      'Page ' +
      (page + 1) +
      ' / ' +
      session.totalPages +
      '. Menu expires in 15 minutes.',
    embeds: [],
    components,
  };
}
