# Nova Arquitetura de Produto — De-Para Técnico e Plano em Ondas

> Estrutura definida pelo Danilo + time de criação (2026-07-10): **Strategy · Intelligence · Studio · Copilot**.
> Este doc mapeia cada item da árvore nova contra o que EXISTE no código/banco, classifica (✅ existe / 🔀 move-renomeia / 🆕 novo) e propõe execução em ondas — sem quebrar o cérebro (a taxonomia atual é consumida por 5 sistemas: `compileBrandContext`, Writing Room, RAG/embed, extração de manual, grounding do destilador).

---

## Princípio da migração (o truque que torna isso barato)

**Onda 1 não muda schema — muda só a navegação.** Os campos atuais (`verbal_identity`/`visual_identity`) continuam sendo o storage canônico; a UI nova os REAGRUPA. O cérebro não percebe nada. Campos 🆕 entram na Onda 2 numa coluna nova (`strategy` jsonb), como ADIÇÃO — e o `compileBrandContext` passa a ler os dois. Nada é renomeado no banco; só a apresentação.

---

## De-Para completo

### STRATEGY

| Árvore nova | Hoje | Status |
|---|---|---|
| Culture → Brand Essence → Vision | `verbal_identity.visao` | ✅ move |
| Culture → Brand Essence → Purpose | `verbal_identity.proposito` (+ `missao`) | ✅ move |
| Culture → Brand Essence → Values | `verbal_identity.valores` | ✅ move |
| Culture → Brand Positioning | `verbal_identity.posicionamento` + diagnóstico/território | ✅ move (decidir a costura com o diagnóstico — Q3) |
| Culture → Brand Meaning | — | 🆕 campo |
| Business → Função → Value Proposition | `verbal_identity.proposta_valor` | ✅ move |
| Business → Função → Business Model | — | 🆕 campo |
| Business → Função → Portfolio | — | 🆕 campo |
| Business → Função → Brand Architecture | — | 🆕 campo |
| Business → Função → Stakeholders | — | 🆕 campo |
| Business → Função → Personas | parcial (`publico_alvo` vive no diagnóstico) | 🆕 estruturado |
| Business → Função → Goals & KPIs | — | 🆕 campo |
| Business → Experience → UX / UI / Customer Journey | — | 🆕 campos |
| Business → Experience → Design System | seção Design System do Brand Book | ✅ move |
| Communication → Personality → Attributes | `verbal_identity.personalidade` + `tom_atributos` | ✅ move |
| Communication → Personality → Territories | faceta `territorio` do cérebro + `territorios_possiveis` do diagnóstico | ✅ move — **vitrine do aprendido** (declarado + destilado juntos) |
| Communication → Personality → Storytelling (Overview/Seasons) | — | 🆕 (Seasons = campanhas/temporadas narrativas — conectar com `conteudo.temas` do cérebro) |
| Communication → Expression → Visual Identity | `visual_identity` (paleta, tipografia, foto etc.) | ✅ move |
| Communication → Expression → Verbal Identity | `verbal_identity` (tom_voz, tom_evitar, tagline…) | ✅ move |

### INTELLIGENCE

| Árvore nova | Hoje | Status |
|---|---|---|
| Market Intelligence | clipping + movimentos por ciclo (dentro do Posicionamento) | 🔀 extrai/agrupa |
| Consumer Insights | derivável do listening + fatos do cérebro | 🆕 leve (curadoria sobre dados existentes) |
| Competitors | Concorrentes (slots, diagnósticos, mapa de território, scatter) | ✅ move |
| Social Listening | página atual | ✅ move |
| Trends | — | 🆕 (web search recorrente por setor; mesma infra do clipping) |
| Reports | RelatorioPublico + PDF/PPTX do diagnóstico (parcial) | 🔀 agrupa + 🆕 relatórios periódicos |
| Content Hub | página atual | ✅ move |
| *(Q4)* Diagnóstico/scores + IA LOUDR (rede neural) | Posicionamento + painel IA LOUDR | decidir casa nova |

### STUDIO

| Árvore nova | Hoje | Status |
|---|---|---|
| Brand Assets → Logos/Images/Icons | `brand_assets` por `tipo` (logo/foto/icone) + BrandAssetsSection | ✅ reagrupa por tipo |
| Brand Assets → Templates | templates de workflow existem; templates de PEÇA | 🆕 |
| Brand Assets → Brand Kit | — | 🆕 (pacote público/download da identidade — bom p/ agências) |
| Writing Room | página atual | ✅ |
| Video Studio | página Vídeos | ✅ renomeia |
| Workflow | página atual | ✅ |
| Approvals | parcial: votos 👍/👎 + status de campanha | 🆕 fluxo (fila de aprovação por papel; **cada aprovação = sinal pro cérebro**) |
| Library | Biblioteca atual (pastas/tags/busca) | ✅ |
| **⚠️ Q1: geração de IMAGEM (página Imagem) não aparece na árvore** | página mais usada do Studio | decidir |

### COPILOT (evolução do Brand Assistant — de chat para modos)

| Modo novo | Hoje | Status |
|---|---|---|
| Chat | BrandAssistant | ✅ |
| Search Knowledge | RAG (`searchBrandKnowledge`) — já usado por dentro | 🔀 expõe como modo |
| Brand Q&A | o chat já faz | 🔀 modo curado |
| Generate Copy | Writing Room como serviço | 🔀 atalho p/ frameworks |
| Generate Campaign | CampaignNew/fan-out | 🔀 atalho |
| Review Content | `check_on_brand` (desenhado no MCP) | 🆕 barato — **o cérebro como revisor** |
| Analyze Brand | diagnóstico | 🔀 atalho |
| Create Brief | briefing do Content Hub | 🔀 atalho |
| Research | web search (infra do clipping/diagnóstico) | 🆕 leve |
| Agents | — | 🆕 (H2/H3 — conecta com MCP e autopilot) |

**Leitura do Copilot:** quase tudo é a MESMA infra com entradas curadas — um "command palette" de modos sobre o cérebro. Barato e com cara de produto grande.

---

## Impacto no cérebro (o mapa dos 5 consumidores)

| Consumidor | Onda 1 (só nav) | Onda 2 (campos novos) |
|---|---|---|
| `compileBrandContext` (_brain.js — toda geração) | zero mudança | passa a ler `strategy` (personas, value prop, storytelling) como contexto adicional |
| `buildWriterSystem` (Writing Room) | zero | ganha personas/storytelling p/ copy mais afiada |
| RAG (`brand-book-embed`) | zero | embeda as seções novas (chunks por seção) |
| Extração de manual (F11) | zero | prompt de extração aprende a preencher o schema novo |
| Destilador (grounding) | zero | grounding mais rico; facetas continuam as mesmas |

**Ganho estratégico da Onda 2:** Personas, Value Proposition e Storytelling entrando no contexto = as gerações e o Copilot ficam MUITO mais precisos — e são campos que nenhum concorrente estrutura.

---

## Execução em ondas (aos poucos, como pedido)

**Onda 1 — A navegação nova (🟡 ~3–5 dias · zero risco pro cérebro)**
Sidebar nova com os 4 grupos; páginas atuais remapeadas/renomeadas (rotas novas com redirect das antigas); Brand Book vira as telas de Strategy lendo/escrevendo OS MESMOS campos; Competitors/Listening/Content movem pra Intelligence; Vídeos→Video Studio; Assistant→Copilot (só o chat). Feature-flag ou branch de release pra virada limpa.

**Onda 2 — O schema Strategy (🟡 ~1 semana)**
Coluna `strategy` jsonb em `brand_books` (essence, business, experience, personality, storytelling) + UI de edição das seções novas + os 5 consumidores atualizados (aditivo) + extração de manual estendida. Migration com backfill de nada (campos novos começam vazios) — de-para dos existentes é só apresentação.

**Onda 3 — Features novas por valor (🟢–🔴 escolher a dedo)**
Ordem sugerida: (1) Copilot modos-atalho + Review Content 🟢 · (2) Approvals com sinal pro cérebro 🟡 · (3) Reports periódicos 🟡 · (4) Trends 🟡 · (5) Brand Kit/Templates 🟡 · (6) Consumer Insights 🟢 · (7) Agents 🔴 (H2, junto do MCP).

---

## Decisões (Danilo, 2026-07-10)

- **Q1 — Image Studio:** ✅ criar — a geração de imagem tinha passado batido na árvore; entra como página própria no Studio, irmã do Video Studio.
- **Q2 — Idioma:** foco em PORTUGUÊS, mas **todo o sistema deve ser configurável para PT/EN/ES** (expansão). → nasce a camada i18n (`src/lib/i18n.js`): Onda 1 já cria a fundação (rótulos da nav pelos 3 idiomas); a varredura completa de strings do app vira workstream próprio no BACKLOG.
- **Q3 — Diagnóstico:** ✅ aprovada a recomendação — números/evolução em Intelligence (Reports), território/tese em Strategy→Positioning. Onda 1 mantém a página Posicionamento inteira sob Strategy; a cirurgia de separação fica p/ Onda 2/3.
- **Q4 — Painel IA LOUDR:** ✅ move para o grupo Intelligence (sai do menu do usuário).
- **Q5 — Approvals:** **TUDO** — peças, campanhas e copy. Fluxo único de aprovação (Onda 3), com cada aprovação emitindo sinal pro cérebro.
