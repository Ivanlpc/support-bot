import { EmbedBuilder, ColorResolvable } from 'discord.js';
import { IPaymentFromID } from '../External/TebexAPI';
import { IPayment } from '../External/CraftingstoreAPI';
import { config } from '../../config';
import { messages } from '../../messages';
export function text(value: unknown, limit = 1024): string {
  const result = String(value ?? '').trim() || 'None';
  return result.length <= limit
    ? result
    : result.slice(0, limit - 1).replace(/[\uD800-\uDBFF]$/, '') + '…';
}
function embed(
  title: string,
  fields: { name: string; value: unknown }[],
  footer: string,
  color: ColorResolvable,
) {
  const safeTitle = text(title, 256),
    safeFooter = text(footer, 256);
  const selected = fields.slice(0, 25);
  const names = selected.map((field) => text(field.name, 128));
  const available =
    6000 -
    safeTitle.length -
    safeFooter.length -
    names.reduce((sum, name) => sum + name.length, 0);
  const perField = Math.min(
    1024,
    Math.floor(available / Math.max(1, selected.length)),
  );
  return new EmbedBuilder()
    .setTitle(safeTitle)
    .setFooter({ text: safeFooter })
    .setColor(color)
    .addFields(
      selected.map((field, index) => ({
        name: names[index],
        value: text(field.value, perField),
      })),
    );
}
export const Embeds = {
  select_store_embed: () =>
    new EmbedBuilder()
      .setTitle('Select your store type')
      .setDescription(
        'Choose the provider whose API the bot will use for this server.',
      )
      .setColor('#b2ffff'),
  accepting_terms_embed: () =>
    new EmbedBuilder()
      .setTitle('Store token storage')
      .setDescription(
        'The store token will be encrypted in the database. Removing the bot deletes the server record. Revoke the token in your store dashboard to disable API access.',
      )
      .setColor('Green'),
  transaction_tebex_embed: (payment: IPaymentFromID, lang = 'EN') => {
    const m = messages[lang] ?? messages.EN;
    return embed(
      m.transaction + ': ' + payment.id,
      [
        { name: m.player, value: payment.player.name },
        { name: m.uuid, value: payment.player.uuid },
        {
          name: m.packages,
          value: payment.packages.map((item) => item.name).join(', '),
        },
        {
          name: m.price,
          value: payment.amount + ' ' + payment.currency.symbol,
        },
        { name: m.status, value: payment.status },
      ],
      'Tebex API',
      payment.status === 'Complete' ? 'Green' : 'Red',
    ).setThumbnail(
      config.TRANSACTION_AVATAR_URL + encodeURIComponent(payment.player.name),
    );
  },
  transaction_craftingstore_embed: (payment: IPayment, lang = 'EN') => {
    const m = messages[lang] ?? messages.EN;
    return embed(
      m.transaction + ': ' + payment.transactionId,
      [
        { name: m.player, value: payment.inGameName },
        { name: m.uuid, value: payment.uuid },
        { name: m.email, value: payment.email },
        { name: m.packages, value: payment.packageName },
        { name: m.price, value: payment.price },
        { name: m.gateway, value: payment.gateway },
        { name: m.status, value: payment.status },
        {
          name: m.date,
          value: new Date(payment.timestamp * 1000).toLocaleDateString(),
        },
      ],
      'CraftingStore API',
      ['PAID', 'COMPLETE'].includes(payment.status) ? 'Green' : 'Red',
    ).setThumbnail(
      config.TRANSACTION_AVATAR_URL + encodeURIComponent(payment.inGameName),
    );
  },
  help_embed: (lang = 'EN') => {
    const m = messages[lang] ?? messages.EN;
    const entries = [
      config.Commands.setup,
      config.Commands.search_transaction,
      config.Commands.perm,
      config.Commands.giftcard,
      config.Commands.payments,
      config.Commands.ban,
      config.Commands.lang,
    ].filter((command) => command.enabled);
    return embed(
      m.showing_help,
      entries.map((command) => ({
        name: '/' + command.command_name,
        value: command.command_description,
      })),
      m.footer,
      'Grey',
    );
  },
  giftcard_embed: (
    code: string,
    amount: string,
    id: string,
    lang = 'EN',
    user?: string,
    currency?: string,
  ) => {
    const m = messages[lang] ?? messages.EN;
    return embed(
      m.giftcard_created + ': ' + id,
      [
        { name: m.code, value: code },
        { name: m.amount, value: amount + ' ' + (currency ?? '') },
      ],
      m.footer,
      'Green',
    );
  },
  ban_embed: (
    user: string,
    reason: string,
    id: string,
    lang = 'EN',
    ip?: string,
  ) => {
    const m = messages[lang] ?? messages.EN;
    return embed(
      m.ban_created + ': ' + id,
      [
        { name: m.username, value: user },
        { name: m.reason, value: reason },
        ...(ip ? [{ name: m.ip, value: ip }] : []),
      ],
      m.footer,
      'Red',
    ).setTimestamp();
  },
};
