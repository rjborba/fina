# Interface languages

`index.ts` initializes one bundled i18next instance with English fallback and
Brazilian Portuguese. React components subscribe using `useTranslation()`;
non-React presentation helpers use `translate()`. Importing the module also
initializes Day.js's language and the document's `lang` attribute.

The saved `fina-language` choice takes precedence over supported browser
languages. Only this preference is stored. Language changes do not remount the
app, clear query caches, or alter workspace/customer data.

Add application copy to both `locales/en.json` and `locales/pt-BR.json`. Readable
English message keys use `keySeparator: false` and `nsSeparator: false`, so
punctuation is literal. Translate at render time, including static option labels;
keep option IDs, enum values, storage keys, and Zod contracts language-neutral.
Use complete messages with named interpolation values. Counted messages use
`count` and `_zero`, `_one`, `_other`, and `_many` forms (Portuguese uses `many`
for whole millions). Catalog tests check matching keys and placeholders.

Use `formatCurrency`, `formatNumber`, `formatDate`, and `getLocale` for browser
presentation. BRL is still the product currency in both languages. Day.js month
labels and date-fns calendars follow the selected language. CSV parsing formats,
normalized preview dates, API dates, and formula decimal dots are explicit and
must not follow interface language. Do not translate user names, account/category
names, card labels, notes, transaction descriptions, filenames, or formula tokens.

`localizeMessage` handles known schema/parser/formula messages at their display
boundary without changing shared contracts. `errors.ts` maps stable API/Auth
codes and allowlisted public messages to application copy. Unknown diagnostics
use a localized fallback. Provider-hosted OAuth and emails are outside the
browser catalogs.

Run `pnpm --filter @fina/web test` while editing and `pnpm verify` plus
`pnpm test:e2e` before completion.
