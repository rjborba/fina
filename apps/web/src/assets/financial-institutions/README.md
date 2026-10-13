# Financial institution artwork

These locally bundled marks identify the bank or card issuer chosen by the user.
They are third-party trademarks owned by their respective institutions. Their
presence does not imply affiliation, endorsement, account connectivity, or
permission to reuse a mark outside that identification purpose. These assets
are not covered by an application-code license; check the institution's brand
guidelines before using them in marketing or other contexts.

The twenty vector marks below were fetched directly from institution-published URLs
on 2026-10-11. Source URLs were located through the public Open Finance Brazil
directory's `CustomerFriendlyLogoUri` metadata (with the
[logos-bancos-br provenance index](https://github.com/rzmt/logos-bancos-br)
used to discover the URLs). The official directory is
[public participant metadata](https://data.directory.openbankingbrasil.org.br/participants);
[Open Finance's documentation](https://openfinancebrasil.atlassian.net/wiki/spaces/OF/pages/17377913/Lista%2Bde%2BParticipantes)
describes this discovery mechanism.

No institution logo is fetched at runtime. The browser loads Vite-bundled assets
only, without sending account names or other customer data to an image service.
The original artwork paths, colors, gradients, and aspect ratios are retained.
Plain white background rectangles were removed from BV, Safra, Santander, and
Sicredi so the marks sit transparently on application surfaces. White foreground
logo details and clip paths remain intact, as do the institutions' branded
colored shapes. The shared component adds no background or outline; single-ink
C6/Safra marks use light ink in dark mode, and XP's black-and-white mark inverts
without losing its internal contrast.
Inter uses an unmodified publisher-provided WebP image rather than a redrawn
vector. All other institutions use SVG.
XML declarations/export comments were removed; XP's SVG had no `viewBox`, so
its intrinsic 512-by-512 coordinate system was made explicit to allow scaling.

| Asset                 | Institution-published source                                                                                                 |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `inter.webp`          | [Banco Inter's current publisher artwork](https://apps.apple.com/br/app/inter-conta-cart%C3%A3o-e-pix/id839711154)           |
| `itau.svg`            | [Itaú](https://www.itau.com.br/media/dam/m/4ee2c952e1fa91a2/original/Novo_itau.svg)                                          |
| `nubank.svg`          | [Nubank](https://nuapp.nubank.com.br/open-banking/logo.svg)                                                                  |
| `banco-do-brasil.svg` | [Banco do Brasil](https://www.bb.com.br/docs/pub/inst/img/LogoBB.svg)                                                        |
| `caixa.svg`           | [Caixa](https://consentimento.openbanking.caixa.gov.br/assets/images/logomarca_caixa.svg)                                    |
| `bradesco.svg`        | [Bradesco](https://banco.bradesco/open-finance/logo/icones_vetorial-pf.svg)                                                  |
| `santander.svg`       | [Santander](https://cms.santander.com.br/sites/WPS/imagem/santander_chama/23-10-31_194829_P_santander_chama.svg)             |
| `c6.svg`              | [C6 Bank](https://cdn.c6bank.com.br/open-banking/c6bank-logo.svg)                                                            |
| `btg-pactual.svg`     | [BTG Pactual](https://banking-public-prd.s3.sa-east-1.amazonaws.com/open-finance/logo/btginvestimentos/btginvestimentos.svg) |
| `safra.svg`           | [Safra](https://www.safra.com.br/shared/assets/img/safra-of.svg)                                                             |
| `sicredi.svg`         | [Sicredi](https://www.sicredi.com.br/openbanking/app/assets/images/shared/logo/logo_sicredi_512.svg)                         |
| `sicoob.svg`          | [Sicoob](https://sicoob-openbanking.s3.sa-east-1.amazonaws.com/icone-sicoob.svg)                                             |
| `banrisul.svg`        | [Banrisul](https://banrisul.com.br/bob/data/Simbolo-Banrisul.svg)                                                            |
| `banco-pan.svg`       | [Banco Pan](https://www.bancopan.com.br/content/dam/documentos/outros-produtos/open-banking/logo_pan_openbanking.svg)        |
| `banco-bv.svg`        | [BV](https://www.bv.com.br/ng15-open-base-recepcao-jornada/assets/images/logo-bv.svg)                                        |
| `bmg.svg`             | [BMG](https://www.bancobmg.com.br/data/files/8C/A2/7F/0A/FBA318104A94D208970BE9C2/bmg_open_finance.svg)                      |
| `neon.svg`            | [Neon](https://opbk-brasil.s3.sa-east-1.amazonaws.com/neon/logo.svg)                                                         |
| `picpay.svg`          | [PicPay](https://picpay.s3.sa-east-1.amazonaws.com/openbanking/picpay-logo-icon-pf.svg)                                      |
| `mercado-pago.svg`    | [Mercado Pago](https://http2.mlstatic.com/open-banking/assets/logo.svg)                                                      |
| `pagbank.svg`         | [PagBank](https://openfinance.api.pagseguro.uol.com.br/img/logo_pagbank.svg)                                                 |
| `xp.svg`              | [Banco XP](https://openbanking-redirect.xpi.com.br/assets/xpi.svg)                                                           |

## Inter

The live Open Finance directory still publishes
`https://marketing.bancointer.com.br/arquivos/images/app-icon.svg`, which returned
HTTP 403 on 2026-10-11. Its archived wordmark differs from the bank's current
publisher-provided App Store icon, so that historical SVG is not used.

`inter.webp` was downloaded unchanged on 2026-10-11 from the image published on
[Inter: Conta, Cartão e Pix](https://apps.apple.com/br/app/inter-conta-cart%C3%A3o-e-pix/id839711154),
whose verified developer is
[Banco Inter](https://apps.apple.com/br/developer/banco-inter/id648897084).
The original [publisher artwork URL](https://is1-ssl.mzstatic.com/image/thumb/PurpleSource221/v4/f0/c2/10/f0c21076-0130-6c10-23b8-336bebf22873/Placeholder.mill/400x400bb.webp)
returns a 400-by-400 WebP image (10,432 bytes). SHA-256:
`b71f073159b18985b67ebfca9bf4569caac7e1b0bece28c6003695b530f0c00b`.

## Updating

Fetch from the institution's own website, brand page, official Open Finance
publication, or verified app publisher. Verify the source and visually compare
the mark before replacing it. Keep this attribution up to date. Reject SVGs
containing scripts, foreign objects, external resources, or event handlers.
Never substitute generated or hand-drawn initials for a recognizable brand.
