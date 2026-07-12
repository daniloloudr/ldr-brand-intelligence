# MCP do Cérebro — Plano de Execução (Figma primeiro)

> **Objetivo do teste:** um agente (Claude) cria uma peça **dentro do Figma** usando a inteligência da marca servida pelo LOUDR — e o uso volta como sinal para o cérebro. É a materialização do north star ("a marca no meio da operação") fora da plataforma, e a demo mais forte possível para a captação.
>
> Plano montado em 2026-07-08. Contexto estratégico: backlog.md § MCP do Cérebro (arquitetura em 3 camadas).

---

## Por que agora é barato

- O cérebro já é módulo único (`_brain.js`): as tools do MCP são wrappers das operações existentes.
- O **MCP oficial do Figma** (remote) ganhou *write to canvas*: agentes criam/modificam frames, componentes e variáveis direto no arquivo — sem bridge da comunidade. Beta gratuito; exige seat Full em plano pago para escrever fora de drafts.
- O **Netlify hospeda MCP servers oficialmente**: function com `@modelcontextprotocol/sdk` + `StreamableHTTPServerTransport` (stateless).
- Claude Code/Desktop conecta múltiplos MCPs — ele é a ponte: lê a marca no nosso, executa no do Figma.

## Arquitetura do teste

```
Claude (agente)
 ├── MCP LOUDR  (https://app.loudr.com.br/mcp · Bearer <API key do workspace>)
 │     └── _brain.js: contexto · busca · assets · copy · validação · sinal
 └── MCP Figma  (oficial, remote, write-to-canvas beta)
       └── cria o frame/peça no arquivo Figma
```

Direção do valor: **a inteligência é nossa, a mão é do Figma.** E `report_usage` fecha o ciclo — o que for criado lá fora vira evidência no cérebro (fonte `mcp`).

---

## Fases

### F0 — Fundação de autenticação (~meio dia)
- **Migration 035 `workspace_api_keys`:** `id, workspace_id, nome, key_hash (sha256), prefixo (8 chars p/ exibição), ativo, created_at, last_used_at`. Escrita só via service role; a key em claro aparece UMA vez na criação.
- **`netlify/functions/_apiAuth.js`:** resolve `{ workspace, brand }` a partir do `Authorization: Bearer lk_...` (hash lookup + `ativo` + touch `last_used_at`). Workspace = marca única (modelo do produto).
- Primeira key gerada por script (UI de gestão fica na F3).

### F1 — MCP server v1 (~1 dia)
- Dep: `@modelcontextprotocol/sdk`. Function `netlify/functions/mcp.js` (streamable HTTP, stateless) + redirect `public/_redirects`: `/mcp → /.netlify/functions/mcp`.
- **Tools v1 (todas escopadas à marca da key):**

| Tool | Entrega | Fonte |
|---|---|---|
| `get_brand_context` | voz, personalidade, posicionamento, território, do/don'ts, aprendizados + **paleta em hex** e tipografia (para o Figma aplicar literalmente) | `resolveBrandIntelligence` + `visual_identity` crua |
| `search_brand_knowledge(query)` | resposta semântica (declarado + aprendido) | `searchBrandKnowledge` |
| `list_brand_assets({pasta?, tag?, tipo?})` | nome, tipo, URL (logos/peças para importar no design) | Biblioteca (`brand_assets`) |
| `write_on_brand(framework, campos)` | copy pronta no tom da marca (legenda, carrossel, reel, anúncio, e-mail) | `writingFrameworks` + writer system (server-side) |
| `check_on_brand(texto)` | parecer curto + score 0–10 + ajustes | cérebro como juiz (Sonnet + contexto) |
| `report_usage({descricao, canal, avaliacao?})` | emite sinal (`content_used`, fonte `mcp`) → dataset | `emitSignal` |

- Teste local: MCP Inspector + `claude mcp add --transport http loudr http://localhost:8888/mcp -H "Authorization: Bearer …"`.

### F2 — O TESTE ESTRUTURADO com Figma (~meio dia + validação do Danilo)
**Setup:** Claude Code/Desktop com os 2 MCPs conectados; conta Figma com seat Full (plano pago) e write-to-canvas habilitado; arquivo de teste "LOUDR · MCP Test".

**Roteiro de casos:**

| # | Caso | Aceite |
|---|---|---|
| T1 | `get_brand_context` da LOUDR | retorna voz "provocadora/ousada/direta" + hex reais da paleta |
| T2 | `search_brand_knowledge("qual território reivindicar?")` | responde Smart Branding (aprendido, não só digitado) |
| T3 | `write_on_brand(legenda, tema X)` | copy no tom, estrutura do framework |
| T4 | **A DEMO** — prompt único: *"Crie no Figma um post 1080×1080 do lançamento do Writing Room usando a marca do MCP LOUDR: fundo na cor primária, headline na voz da marca, espaço para o logo"* | frame criado no Figma com ≥2 elementos vindos do cérebro (cor + copy); zero informação de marca digitada no prompt |
| T5 | `check_on_brand` com texto propositalmente off-brand | aponta os desvios certos |
| T6 | `report_usage` da peça criada | sinal no banco (fonte `mcp`) + visível no painel Cérebros; **rede neural acende a evidência** |
| T7 | key inválida/inativa | 401; nunca vaza dado de outro workspace |

**Critérios de sucesso do teste:** T4 completo sem intervenção manual; latência das tools de leitura < 2s (write_on_brand pode levar ~10s); T6 prova o ciclo de volta.

### F3 — Produto (pós-teste, quando fizer sentido)
- UI de API keys no Workspace (criar/revogar/renomear, prefixo visível).
- Rate limit por key · docs de conexão para clientes · demo em GIF/vídeo para o pitch · registro no diretório MCP.
- Canva e Adobe pelo mesmo padrão (camada C é a mesma).

---

## Riscos e decisões
- **Figma write-to-canvas é beta** e pode virar pago/mudar API — o teste valida cedo justamente por isso. Dependência externa: seat Full pago na conta Figma da LOUDR (ação do Danilo).
- **Timeout Netlify (síncrono ~10–26s):** tools de leitura são queries rápidas; `write_on_brand`/`check_on_brand` chamam Sonnet — cabem, mas monitorar.
- **Spec MCP 2026-07-28 (RC)** muda headers do transporte — fixar versão do SDK e revisitar após GA.
- **Segurança:** a key dá leitura da marca + emissão de sinal, nada mais (sem escrita em brand book/assets na v1); escopo sempre 1 workspace.

## Fora de escopo da v1
Escrita no brand book via MCP · múltiplas marcas por key · OAuth (key simples primeiro) · plugins nativos (camada B) · MCP Apps/UI.
