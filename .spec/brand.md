# brand.md · BR4NDCODE

> Fonte da verdade da marca. Derivado integralmente do BC_One_Page_Brand (LOUDR).
> Este arquivo contém apenas o que está definido no documento de marca. O que não está aqui, não está definido.

**Versão:** 1.0 · agosto 2026
**Fonte:** BC_One_Page_Brand.pdf

---

## 01 · Assinaturas

A marca possui duas assinaturas:

1. **Primária (por extenso):** BR4NDCODE. Deve ser usada sempre que possível.
2. **Símbolo (versão resumida):** deve ser usada apenas em áreas espacialmente restritas, e também como ilustração. Como ilustração, deve ser acompanhada da assinatura primária.

**Modo ilustrativo:** o símbolo pode aparecer em modo ilustrativo (ex.: estampa de camiseta), mas sempre que possível deve ser acompanhado do próprio logotipo.

---

## 02 · Cores

| Cor | Hex | Papel |
|---|---|---|
| Branco | `#FFFFFF` | Primária |
| Preto | `#000000` | Primária |
| Verde 1 | `#00FF55` | Apoio e destaque. Deve ser usado combinado com o **Preto**. |
| Verde 2 | `#00DD55` | Apoio e destaque. Combina com o **Branco**. |

**Regras**
1. Os verdes não devem ser usados para textos corridos. Podem ser usados para grandes títulos.
2. Verde não deve ser usado como background regular. Pode ser usado como background especial, aparecendo eventualmente.
3. **Cheiro verde:** elementos em verde não devem ocupar mais do que **10% da área** de uma peça.

---

## 03 · Assinaturas e fundos

- Aplicação sobre fundos lisos e fotográficos deve considerar o maior contraste entre figura e fundo.
- Sobre backgrounds verdes, logo **sempre em preto**.

---

## 04 · Assets (elementos de apoio)

- **Bordas e corners:** elementos de interface devem privilegiar o uso de linhas (aconselhável 1px de espessura) e bordas arredondadas com progressão lógica.
- **Pixel Glass:** fotografias podem receber intervenções pixeladas combinadas com efeito de vidro.

---

## 05 · Tipografia

**Saira**, em todas as suas variações de corpo e peso.

| Variação | Uso |
|---|---|
| Saira (default) | Textos corridos e grandes manchas gráficas |
| Saira Condensed / Expanded | Títulos e textos ilustrativos |

---

## 06 · Tokens (consumo por agentes)

```yaml
brand: BR4NDCODE
signatures:
  primary: wordmark          # uso preferencial, sempre que possível
  symbol: restricted-or-illustration   # ilustração acompanha a primária
colors:
  primary: ["#FFFFFF", "#000000"]
  accent:
    green1: { hex: "#00FF55", pair: "#000000" }
    green2: { hex: "#00DD55", pair: "#FFFFFF" }
  rules:
    accent_max_area: 0.10
    accent_body_text: false
    accent_large_titles: true
    accent_background: special_only
    logo_on_green: "#000000"
    contrast: maximize-figure-ground
typography:
  family: Saira
  body: [default]
  display: [condensed, expanded]
ui:
  stroke: 1px
  corners: rounded-progressive
effects:
  pixel_glass: photography
```

---

## 07 · Como isto vive no código (aplicado em 2026-08-17)

Tudo abaixo sai de `src/lib/theme.js`, o arquivo único de cor e forma do produto.

| Regra da marca | Onde está no tema |
|---|---|
| Preto/branco como primárias | `palette.primary` = preto no modo claro, branco no escuro |
| Verde é apoio, não base | `palette.secondary` — Verde 2 (`#00DD55`) no claro, Verde 1 (`#00FF55`) no escuro, respeitando o par de cada um |
| Verde não em texto corrido | nenhuma variante de `body*` usa verde; o accent só entra por `color="secondary"` deliberado |
| Verde não como background regular | nenhum `background.*` usa verde |
| Cheiro verde ≤ 10% | não é imponível por código — é regra de composição, vale para quem monta a tela |
| Linhas de 1px | `MuiDivider`, `MuiCard` e `MuiPaper` com borda de 1px |
| Corners com progressão lógica | `shape.borderRadius = 8` como base; a escala do MUI (`borderRadius: 1/2/3`) dá 8/16/24 |
| Saira | `typography.fontFamily`; a fonte variável carrega os eixos de peso e largura |
| Condensed/Expanded em títulos | variantes `h1`–`h4` usam `wdth` reduzido via `fontVariationSettings` |

**Não definido pelo documento de marca** (e portanto decidido por engenharia, sujeito a revisão do time de criação):
- cores de DADO (score, sentimento, séries de gráfico) — seguem as paletas semânticas do MUI, porque precisam de leitura funcional e a marca não define paleta de dados;
- o efeito **Pixel Glass** ainda não tem aplicação no produto.
