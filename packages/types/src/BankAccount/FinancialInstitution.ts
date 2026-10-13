import { z } from "zod";

export const FinancialInstitutionIdSchema = z.enum([
  "inter",
  "itau",
  "nubank",
  "banco-do-brasil",
  "caixa",
  "bradesco",
  "santander",
  "c6",
  "btg-pactual",
  "safra",
  "sicredi",
  "sicoob",
  "banrisul",
  "banco-pan",
  "banco-bv",
  "bmg",
  "neon",
  "picpay",
  "mercado-pago",
  "pagbank",
  "xp"
]);

export type FinancialInstitutionId = z.infer<
  typeof FinancialInstitutionIdSchema
>;

export const FINANCIAL_INSTITUTIONS: ReadonlyArray<{
  id: FinancialInstitutionId;
  name: string;
}> = [
  { id: "inter", name: "Inter" },
  { id: "itau", name: "Itaú" },
  { id: "nubank", name: "Nubank" },
  { id: "banco-do-brasil", name: "Banco do Brasil" },
  { id: "caixa", name: "Caixa Econômica Federal" },
  { id: "bradesco", name: "Bradesco" },
  { id: "santander", name: "Santander" },
  { id: "c6", name: "C6 Bank" },
  { id: "btg-pactual", name: "BTG Pactual" },
  { id: "safra", name: "Safra" },
  { id: "sicredi", name: "Sicredi" },
  { id: "sicoob", name: "Sicoob" },
  { id: "banrisul", name: "Banrisul" },
  { id: "banco-pan", name: "Banco PAN" },
  { id: "banco-bv", name: "Banco BV" },
  { id: "bmg", name: "BMG" },
  { id: "neon", name: "Neon" },
  { id: "picpay", name: "PicPay" },
  { id: "mercado-pago", name: "Mercado Pago" },
  { id: "pagbank", name: "PagBank" },
  { id: "xp", name: "XP" }
];

const INSTITUTION_ALIASES: ReadonlyArray<{
  id: FinancialInstitutionId;
  aliases: readonly string[];
}> = [
  { id: "inter", aliases: ["inter"] },
  { id: "itau", aliases: ["itau"] },
  { id: "nubank", aliases: ["nubank", "nu bank"] },
  { id: "banco-do-brasil", aliases: ["banco do brasil", "bb"] },
  { id: "caixa", aliases: ["caixa", "cef"] },
  { id: "bradesco", aliases: ["bradesco"] },
  { id: "santander", aliases: ["santander"] },
  { id: "c6", aliases: ["c6", "c 6"] },
  { id: "btg-pactual", aliases: ["btg", "btg pactual"] },
  { id: "safra", aliases: ["safra"] },
  { id: "sicredi", aliases: ["sicredi"] },
  { id: "sicoob", aliases: ["sicoob"] },
  { id: "banrisul", aliases: ["banrisul"] },
  { id: "banco-pan", aliases: ["pan"] },
  { id: "banco-bv", aliases: ["bv", "banco votorantim"] },
  { id: "bmg", aliases: ["bmg"] },
  { id: "neon", aliases: ["neon"] },
  { id: "picpay", aliases: ["picpay", "pic pay"] },
  { id: "mercado-pago", aliases: ["mercado pago", "mercadopago"] },
  { id: "pagbank", aliases: ["pagbank", "pag bank", "pagseguro"] },
  { id: "xp", aliases: ["xp"] }
];

/** Suggestions for older clients and legacy accounts; explicit choices win. */
export function inferFinancialInstitutionId(
  name: string
): FinancialInstitutionId | null {
  const normalized = ` ${name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()} `;
  const matches = INSTITUTION_ALIASES.filter(({ aliases }) =>
    aliases.some((alias) => normalized.includes(` ${alias} `))
  );
  return matches.length === 1 ? matches[0]!.id : null;
}
