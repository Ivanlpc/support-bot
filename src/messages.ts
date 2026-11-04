type Catalog = typeof import('../messages.json');
export type Translation = Catalog['EN'];
const source: Catalog = require('../messages.json');
export const messages: Record<string, Translation> = Object.fromEntries(
  Object.entries(source).map(([lang, entries]) => [
    lang,
    { ...source.EN, ...entries },
  ]),
);
