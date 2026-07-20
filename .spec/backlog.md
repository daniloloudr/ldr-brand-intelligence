# BACKLOG — LOUDR (único e canônico)

> **North star:** *"Revolucionar a indústria criativa com IA — a marca no meio da operação."* (Danilo, jul/2026)
> Todo item abaixo se justifica por essa frase: ou coloca a marca mais para dentro da operação, ou sustenta quem coloca.
>
> **Organização:** por horizonte da visão (H1 provar → H2 rede de cérebros → H3 categoria), construível **aos poucos** — cada item tem tamanho (🟢 dias · 🟡 ~1 semana · 🔴 semanas+) e gatilho quando não é "já".
> Estratégia: `arquivo/plano-de-melhoria-2026-07-06.md` · Visão: `visao.md` · História do entregue: `produto.md` (changelog v6.0)
> Atualizado: 2026-07-14

---

## 🏁 META OPERACIONAL 2026: 30 MARCAS (declarada 13/jul) — e o plano de INFRA

Maior preocupação do Danilo: a infra aguentar 30 tenants. Gargalos JÁ MAPEADOS (2026-07-13):

**🚨 AUDITORIA DE SEGUNDA 13/jul (prod, crons antigos):** a teoria confirmou na prática — **scheduled functions têm teto SÍNCRONO (segundos), não 15 min**. Evidências: clipping coletou por só 38s (11 itens, 1 workspace, 0 sínteses — morreu no meio); tendências cobriu 1 de 2 workspaces; diagnósticos de concorrentes = 0 (9 dias de staleness); destilação = 0 com 53 sinais pendentes na LOUDR (recuperação manual disparada 13/jul ~manhã — confirmar v6). **Os fixes (família fan-out, itens 1/2/2b) estão em DEV — o "sobe" é o item mais urgente da semana.**

| # | Gargalo | Evidência | Fix | Quando |
|---|---|---|---|---|
| ~~1~~ ✅ 13/jul | ~~Cron de clipping: teto GLOBAL de 8~~ | resolvido: `clipping-workspace-background` (worker por workspace: coleta TODOS os concorrentes + síntese própria, 15 min cada, jitter 0-45s); cron = despachante puro | — |
| ~~2~~ ✅ 13/jul | ~~trends/sínteses seriais~~ | resolvido: `trends-workspace-background` (worker por workspace) + síntese movida pro worker de clipping; crons = despachantes | — |
| ~~2b~~ ✅ 13/jul | ~~diagnosticar-cron inline~~ | resolvido: `diagnostico-concorrentes-workspace-background` (pendentes staleDays 7, cap 4/ciclo, jitter); cron = despachante | — |
| ~~3~~ ✅ 14/jul | ~~**Observabilidade zero**~~ | **RESOLVIDO:** watchdog completo (migration 041 `cron_runs`/`cron_alerts` + `withHeartbeat()` nos 6 scheduled + `cron-watchdog` horário — silêncio/morte/erro, dedup 24h, graça na estreia) + **Sentry PLUGADO** (`SENTRY_DSN` no env, evento de teste aceito, store API sem SDK). Opcional futuro: `ALERT_WEBHOOK_URL` p/ alerta no celular; painel admin lendo `cron_alerts` | — | — |
| 4 🟠 | **Tenant hardening** | backup/versionamento por cérebro; hoje uma instância única sem export por tenant | Gap 6 do H2 | ~10 marcas |
| 5 🟡 | **Custo por workspace invisível** | `ai_usage` grava desde 12/jul; falta o painel admin somando fal+LLM+fixos | pendência do pivô de créditos | ~5 marcas |
| 6 🟡 | Rate limits Anthropic (destilação ×30 às 7h) | fan-out do distill dispara N simultâneos | jitter JÁ implementado nos workers de clipping/trends; falta no distill-background (parâmetro `jitter` do cron) | ~15 marcas |
| 7 🟡 | Bundle 2MB sem code-splitting · mobile não auditado | plano-de-melhoria §3 (vivo) | React.lazy já parcial; manualChunks + auditoria | pré-go-live |

Custo projetado da meta: 30 × (consumo×R$0,33 + fair-use R$50–150 + infra fixa) → validar com o `ai_usage` real em ~2 semanas.

## 🎯 Em cima da mesa agora

O código está à frente do comercial — as próximas jogadas não são features:

1. **Nova arquitetura (Strategy·Intelligence·Studio·Copilot)** — árvore entregue pelo time 2026-07-10; de-para + decisões em [`features/nova-arquitetura.md`](features/nova-arquitetura.md). ~~**Onda 1 (navegação)**~~ ✅ 2026-07-10 — sidebar nos 4 grupos, IA LOUDR movida p/ Intelligence, Copilot renomeado, rótulos via i18n; rotas/schema intactos. ~~**Onda 2**~~ ✅ 2026-07-10 — coluna `strategy` (migration 035) + 4 seções novas no hub (Essência, Negócio c/ Personas+Goals, Experiência, Personalidade c/ território aprendido da IA + Storytelling/Seasons), campos existentes reagrupados sem de-para no banco; cérebro atualizado aditivamente (contexto de geração ganha personas+narrativa; Writing Room idem; RAG embeda as seções strategy). Pendente da onda: extração de manual (F11) aprender o schema novo — junto da Onda 3. **Onda 3 (parcial)** ✅ 2026-07-10 — árvore COMPLETA na nav (3 níveis c/ subtítulos Culture/Business/Communication); Intelligence com 8 páginas (Market Intelligence ✅ real = feed do clipping; Competitors ✅ real-lite = scores por concorrente; Consumer Insights/Trends/Reports = em construção honesto); Studio com Brand Assets ✅ (tabs por tipo; Templates/Brand Kit em construção) e Approvals ✅ real (fila de peças sem julgamento + campanhas p/ aprovar — cada decisão vira sinal); Copilot com 10 modos (prompt pré-carregado por modo via ?m=). ~~Consumer Insights real~~ ✅ 2026-07-10 (v2 no mesmo dia — decisão: Escuta = coleta bruta · Insights = leitura; vizinhas no menu, cross-links; migration 037 `consumer_insights` + `insights-gerar-background`: o cérebro destila a escuta em insights NOMEADOS — elogio/atrito/oportunidade/tema/alerta, com ação no tom da marca e persona; menções brutas saíram da página); ~~Trends real~~ ✅ 2026-07-10 (radar por setor: migration 036, coleta semanal seg 10h + on-demand, cada tendência com 'como a sua marca surfa isso' no tom aprendido; sinal `trend` alimenta o cérebro). ~~Inteligência de Mercado fase 1~~ ✅ 2026-07-10 (pulso 7d, SÍNTESE DO CICLO pelo cérebro — migration 038 + `_market.js`, on-demand + automática no cron do clipping —, share of voice 30d, feed com filtros); ~~Concorrentes fase 1~~ ✅ 2026-07-10 (dossiê expandível por rival: frase, territórios reivindicados c/ alerta de colisão vs território aprendido, forças/fraquezas, momento, fatos do cérebro, movimentos; comparativo lado a lado c/ deltas por ciclo). **Fase 2 anotada:** coleta setorial no Mercado (além dos concorrentes); Concorrentes: presença digital, tom/estética comparável, oferta/preço, vagas abertas, ads da Meta (junto do E2). **Falta da Onda 3:** Relatórios próprios (hoje = Posicionamento ressignificado), Templates/Brand Kit, Agents, extração de manual (F11) no schema novo, split fino do Posicionamento (números→Reports).
1b. **i18n completo (pt/en/es)** — fundação criada (`src/lib/i18n.js`, nav trilíngue); falta: varredura das strings do app + seletor de idioma (workspace/usuário) + conteúdo gerado no idioma do workspace. Decisão: foco PT, sistema configurável p/ expansão. 🔴 (progressivo — toda string nova já nasce via `t()`)
2. **GTM:** marca do produto + site. Dogfooding máximo — usar o próprio LOUDR (diagnóstico, Writing Room, Studio) para construí-la: vira case e demo. Depois: **rodada de investimento**.
3. **Operar e observar:** cron autônomo de destilação (consertado 08/07 — conferir os primeiros ciclos), clipping de segunda (inclui Pupila), usar o produto e votar (cada uso calibra o cérebro e ensaia a demo).
4. **Roteiro de demo do flywheel** (~5 min de telas contando a história) — eu monto quando o Danilo pedir. 🟢
5. **🔥 PILOTO HERING — prioridade de produto (decisão 2026-07-10):** o caso-âncora do H1 puxa a fila; atividades detalhadas na seção [Piloto Hering](#-piloto-hering-rafael-passos-dir-digital--call-2026-07-09) abaixo. F0 começa já (bug das referências + mapa de modelos de fidelidade).
6. **🥊 CONTA WORTEN — disputa direta com a Fullsix/Havas (2026-07-14):** primeiro deal onde enfrentamos o AI Creative Engine deles de frente (PDFs do pitch em `.spec/competitors/`). Preparação = as [Frentes Fullsix](#-frentes-fullsix-absorver-os-diferenciais-do-concorrente--2026-07-14) abaixo (pacote de confiança + preço por asset aprovado + protocolo de calibração são os pré-requisitos do pitch); nossas vantagens mapeadas na memória `project_concorrente_fullsix`. Retail = mesmo caso de uso do Hering (visual de produto fidedigno em escala) — um pilotinho calibrado serve aos dois.

---

## H1 — PROVAR (agora → ~3 meses) · *marca no mercado, ~10 clientes com case*

| Item | O quê | Tamanho / gatilho |
|---|---|---|
| ~~**⭐ Duelo de Modelos**~~ ✅ 14/jul | **ENTREGUE (imagem):** modo ⚔️ na página Imagem — 2–3 modelos, mesma peça, arena lado a lado, voto único → sinal `model_duel` (peso 2, vencedor+perdedores) + `image_vote` na vencedora; destilador entende preferência pareada como a evidência mais forte do win_rate. Validado ponta a ponta. **Falta (fase 2):** duelo de TEXTO (gatilho: conector OpenRouter) e usar a arena no pilotinho Hering | ✅ · texto: pós-OpenRouter |
| **Conector OpenRouter no `_ai.js`** | passo 2 do módulo de IA (decisão 2026-07-12): OpenRouter como 2º conector = GPT/DeepSeek/Sonar(Perplexity) atrás de uma API — destrava Duelo de Modelos p/ TEXTO (preferência pareada de escrita → voz aprendida). Regra: Anthropic segue DIRETA no núcleo (prompt caching + web search nativos, que gateway não repassa intacto); OpenRouter é amplitude, não substituição. Custo: ~5% + 1 hop. LiteLLM anotado p/ fase enterprise/self-host | 🟢 ~1 dia |
| ~~**Gap 1 — Observabilidade**~~ ✅ 14/jul COMPLETO | Watchdog de crons (migration 041 + `_watchdog.js` + `cron-watchdog` horário — heartbeat nos 6 scheduled, alerta silêncio/morte/erro com dedup e graça) + Sentry plugado (`SENTRY_DSN` no env, teste de ponta a ponta ok). Nota: o antigo `cron-monitor.js` NÃO monitora crons — é o cron de diagnóstico semanal (nome herdado) | ✅ |
| **Gap 2 — Testes** | CI básico: smoke das functions críticas (_brain, studio-generate, distill) + parses. Diligência de investidor olha | 🟡 |
| **Gap 3 — LGPD/ToS/Privacidade** | inexistentes no repo; pré-requisito p/ clientes maiores e captação | 🟡 (+ jurídico) |
| **Propriedade intelectual (INPI)** | (a) **marcas**: LOUDR + nome do produto + "Smart Branding" (classes 9/35/42); (b) **registro de programa de computador** (barato, rápido, prova anterioridade do código); (c) **segredo industrial** p/ cérebro/dataset/prompts (NDA + contratos + ToS — mais valioso que patente); patente de software é via estreita no BR. Fazer ANTES do site/marketing público | 🟢 (+ advogado de PI) |
| **Stripe live + recarga avulsa** | código validado em test mode | 🟢 · gatilho: venda deixar de ser manual |
| **E2 — Loop criativo integrado com Meta** | motor de desdobramento (criativo vencedor → N variações on-brand) + Meta Marketing API (vencedores automáticos; performance real vira sinal `ad_performance`) | 🔴 · **gatilho: deal VHITA fechar** → registrar app na Meta NO MESMO DIA (App Review = semanas) |
| Sustentação: cron enterprise diário · tela de workspace inativo | pequenos, sem gatilho | 🟢 cada |

**Narrativa sem código (usar no site/pitch):** "usuários ilimitados — pague pelo que cria, não por cadeira" (créditos ≠ assentos) · "O Tess te dá todas as IAs; o LOUDR faz as IAs conhecerem a SUA marca" · "Não competimos com Canva/Figma — somos a memória de marca que eles não têm" · "A Fullsix aluga uma fábrica com humanos dentro de cada entrega; o s1ngulr entrega a fábrica com o cérebro da marca dentro — que julga sozinho e aprende a cada peça".

---

### 🥊 Frentes Fullsix (absorver os diferenciais do concorrente — 2026-07-14)

Origem: decks do AI Creative Engine (Fullsix/Havas CX) em `.spec/competitors/` — concorrente DIRETO na conta Worten. Regra de leitura: eles vendem fábrica-com-humanos por €95–210/visual aprovado; cada frente abaixo transforma um diferencial deles em feature/embalagem nossa. O que NÃO copiar: QA humano como núcleo do modelo (é o gargalo deles; nosso juiz é a vantagem) e o portfólio full-service do AI Lab (formação/audit/experiências — moat de holding, dilui a meta 30 marcas).

| # | Frente | O quê | Tamanho / gatilho |
|---|---|---|---|
| ~~1~~ ✅ 14/jul | ~~**Pacote de confiança enterprise**~~ | **ENTREGUE:** (a) dossiê em [`compliance.md`](compliance.md) — cadeia de provedores verificada nas fontes públicas, isolamento, certidão, IP, LGPD; (b) **certidão do asset** na Biblioteca (modelo · prompt final · versão do cérebro · julgamentos · IDs) — portões agora carimbam generation_id no parecer. **🚨 PENDÊNCIAS §7 do dossiê (Danilo):** opt-out de treino na conta VOYAGE (padrão deles PERMITE treinar — fazer HOJE), confirmar tier fal, região Supabase/R2; ToS/Privacidade (Gap 3) antes do 1º envio a cliente | ✅ (código) · §7 pendente |
| 2 | **Preço por asset APROVADO (camada comercial)** | sobre o repasse de créditos, oferta enterprise: preço por imagem aprovada com bandas de volume (benchmark Fullsix: €95–210/KV, €14.280/mês por 120 KVs). Detalhe em `precificacao.md` §Benchmark | 🟢 (comercial, sem código) · deal enterprise na mesa |
| 3 | **Protocolo de calibração no piloto** | ideia deles (esperta): o 1º lote mede a taxa real de aprovação/retoque da marca e DEFINE o tier/preço do contrato — transforma incerteza do cliente em protocolo. Encaixa direto no F0.3 Hering e num pilotinho Worten; a métrica de convergência (regens até aprovação) já é a telemetria disso | 🟢 · junto do F0.3 |
| 4 | **Garantia de julgamento + tier curadoria** | vender o juiz como garantia formal: "nenhuma peça sai sem passar pelo julgamento da marca" (auto-julgamento + artGate já existem — é embalagem). Tier opcional com curadoria humana LOUDR por cima do juiz p/ contratos grandes (o juiz faz 90%, margem de serviço no resto) | 🟡 · contrato enterprise pedir sign-off humano |
| 5 | **Motor de adaptação de formatos** | o gap REAL de produto vs eles: 1 master aprovado → N formatos de canal (leaderboard/quadrado/story/mobile/email), mudança propaga em todas as versões. Onde mora o volume recorrente (eles cobram €30–250/formato). Começa por recomposição/resize inteligente, NÃO por tipografia (≠ output 7 Canva-lite, que segue futuro). **1º tijolo ✅ 14/jul: nó Recortar (crop sharp 0 crédito) + template "1 peça → 6 formatos"** | 🔴→🟡 · **gatilho: deal retail (Worten/Hering) fechar** |

---

### 📊 Frentes Valometry (Ana Couto — análise do Danilo 2026-07-15)

Fonte: [`competitors/valometry.md`](competitors/valometry.md) (análise completa: ficha, mapa de 2 eixos, munição de venda). O 4º arquétipo mapeado: dashboard de MEDIÇÃO forte que não cria nem aprende — o quadrante "mede+cria+aprende" segue exclusivamente nosso. Regra: **NÃO fazer** pesquisa primária com painel (contradiz "setup em minutos") nem mídia offline.

| # | Frente | O quê | Tamanho / gatilho |
|---|---|---|---|
| V1 | **Benchmark de categoria no diagnóstico** (P0) | scores comparados com a média do SETOR via dados cross-tenant (os diagnósticos que já temos substituem o survey deles) — "6/10 e a média do seu setor é 5,2". Vantagem estrutural: com 30 marcas vira ativo irreplicável sem painel pago. Amarra com o painel admin Cérebros | 🟡 · ~10 marcas p/ amostra digna (começar com faixas honestas antes) |
| V2 | **Acelerar integração de mídia** (P0) | = E2 do H1 (Meta API, deal VHITA). O Valometry adiciona o argumento: "criei — performou?" é a pergunta do CMO que só respondemos com performance real virando sinal. GA4/Google/LinkedIn depois da Meta | 🔴 · gatilho E2 (VHITA) — prioridade subiu |
| V3 | **"Disaster Check" — nomear o juiz** (P1) | naming + tela/relatório sobre o que o artGate/diretor de arte JÁ faz: "eles testam pontualmente antes de grandes investimentos; o nosso roda em TODA peça, automático". Candidato a nome próprio no pitch | 🟢 (naming + embalagem) |
| V4 | **Painel de reputação consolidado** (P1) | Google/ReclameAqui/App Store/Play Store numa visão única — agregação do que o listening já coleta | 🟡 |
| V5 | **Estudos setoriais publicados** (P2) | equivalente ao "Branding Brasil" deles: o motor já existe (trends por setor 036 + diagnósticos cross-tenant); falta curadoria + publicação. Amarra com GTM e a colonização do termo "Smart Branding" | 🟡 · junto do GTM/site |

**Diferenciais PRÓPRIOS a amplificar (2026-07-15 — o que ninguém no mapa consegue copiar; exigem gerador+cérebro+flywheel):**

| # | Diferencial | O quê | Tamanho / gatilho |
|---|---|---|---|
| **D3 ⭐** | **CAMADA DE INPUTS EXTERNOS do cérebro** — O diferencial (decisão Danilo 15/07: "o mais importante é esse gatilho") | hoje o cérebro só come o que nasce DENTRO do produto; abrir pra QUALQUER input externo: **(a) conectores de performance** — Meta Ads (= E2/VHITA, o 1º), GA4, Google Ads, LinkedIn Ads → performance real vira sinal (`ad_performance`, `ga_metrics`) e o destilador aprende o que CONVERTE, não só o que agrada; **(b) uploads de medição** — pesquisa/BVS/relatório de tracking → extração (tubulação do manual PDF) → contexto+sinais. Fecha "criei — performou?" E transforma concorrente de medição em fornecedor. Absorve a V2. **⚡ GATILHO CRÍTICO: deal VHITA assinar → registrar o app na Meta NO MESMO DIA (App Review = semanas)** | 🔴 por conector, incremental · 1º = Meta (VHITA); GA4 em seguida (Data API, leitura simples) |
| D1 | "Do score à peça" (embalagem) | **prioridade BAIXA** (Danilo 15/07) — já coberto via Copiloto (tools de leitura+criação fazem "vi a fraqueza → gera as peças" na conversa); a embalagem (botão "resolver agora" no diagnóstico deep-linkando pro Copiloto com contexto) fica pra quando sobrar espaço | 🟢 baixa |
| D2 | Relatório de Evolução da Marca (export) | **prioridade BAIXA** (Danilo 15/07) — já coberto em forma viva (IA LOUDR + Copiloto); o exportável recorrente (PDF/link mensal) fica pra quando amarrar com o Brand Deck 1-clique (H2) | 🟢-🟡 baixa |

---

### Home adaptativa (estrutura aprovada 2026-07-10; v1 ✅ entregue)
- ~~**v1**~~ ✅ — pulso + feed "o que aconteceu" + recomendação por regras + atalhos por frequência (localStorage).
- ~~**v2**~~ ✅ 2026-07-10 — recomendação gerada pelo CÉREBRO (`home-recommendation`: whitelist de ações, tier fast, cache 12h no cliente, regras como fallback instantâneo, ✨ quando vem do cérebro) + continuar profundo (chip "Ver última peça criada") + tendências no feed 📡.
- **v3** 🟡 — blocos se reordenando pelo perfil de uso (a adaptação total da visão do Danilo).

### Novos outputs de geração (brainstorm aprovado 2026-07-10)
Critério de priorização: **usa o que o cérebro já sabe × devolve sinais novos × valor pro cliente.** Top 3 marcado.

| # | Output | O quê | Por quê / gancho |
|---|---|---|---|
| **1º** ⭐ | **Calendário editorial executável** | um mês de pauta por canal com copy pronta + sugestão de imagem por peça — junta keywords + temas do cérebro + tendências ("como surfar") + insights do consumidor | o output que transforma "gerador de peças" em "operação de conteúdo"; uso recorrente toda segunda; cada peça vira sinal |
| **2º** ⭐ | **Respostas da escuta (community mgmt)** | responder menção/comentário/review/Reclame Aqui no tom da marca, com o contexto da menção | fecha o ciclo escuta→ação; NENHUM concorrente tem (exige voz aprendida); diferencial de arquitetura |
| **3º** ⭐ | **Briefing gerador** | briefing pronto p/ agência/freela/gráfica: contexto, do/don't aprendidos, referências aprovadas | quase de graça (texto + cérebro); coloca o s1ngulr no meio da produção que acontece FORA dele (tese do MCP) |
| 4 | **Vídeo completo (não clipe)** | roteiro (cérebro) → cenas (fal) → narração TTS na voz da marca (ElevenLabs?) → legendas; reel pronto p/ postar | eleva o bloco Vídeo; abre a faceta IDENTIDADE SONORA no brand book |
| 5 | **Apresentações on-brand** | decks (proposta, resultado, institucional) com design.md + tom aprendido | a peça mais produzida e mais fora-de-marca do mundo corporativo; conversa com o "Brand Deck 1-clique" do H2 (pptxgenjs já é dep) |
| 6 | **E-mail/CRM** | sequências (boas-vindas, nutrição, carrinho) no tom da marca | formato de altíssimo volume nas empresas |
| 7 | **Peça final com texto (Canva-lite)** | editor visual: tipografia aplicada na imagem gerada | o mais caro; já anotado como futuro na regra "imagem sem texto"; NÃO começar por ele |

### 🎯 Piloto Hering (Rafael Passos, dir. digital — call 2026-07-09)
Dor: inversão do ciclo operacional → guia de compras precisa de **imagem fidedigna** de produto que ainda não existe (foto simples no cabide + ficha técnica); depois manequim fantasma, troca de modelo A/B, close — **em escala**, API depois. Rafael validou a tese: quer o cérebro no meio + subir referências como ensino (novo sinal `reference_upload`). Detalhe na memória (`project_hering_pilot`).
**Atividades (priorizado 2026-07-10 — o case puxa a fila do produto):**

*F0 — validar fidelidade (já):*
- [x] ~~F0.1~~ ✅ 2026-07-12 — o "errinho" era chunk morto pós-deploy (lazy import); ErrorBoundary agora recarrega sozinho
- [x] ~~F0.2~~ ✅ 2026-07-12 — mapa completo em [`features/piloto-hering.md`](features/piloto-hering.md): FASHN try-on $0,075 ⭐ (veste a peça REAL, aceita cabide/flat-lay) · Nano Banana $0,039 · GPT Image 2 edit $0,07-0,41; **custo por produto (4 saídas) ≈ R$1-2** vs R$50-300 do estúdio tradicional
- [~] F0.3 🟢 pilotinho: **FLUXO MONTADO + ENSAIO COMPLETO 14/jul** — template "Piloto Hering: Duelo de Fidelidade (por peça)" + instância "Peça 1" no Fluxos. Ensaio com a jaqueta placeholder: **3 stills APROVADOS pelo juiz** (Nano/GPT/Seedream) + **try-on julgado "Com ressalvas" citando texto letra a letra** (mesmo diagnóstico da análise humana de 12/jul). 3 bugs achados e corrigidos no ensaio: saldo fal esgotado (recarregado), prompt no FASHN (backend dispensa/ignora), **ordem das referências = ordem das CONEXÕES** (raiz do "1ª imagem precisa ser PESSOA"; era ordem do array de nós). Falta só: peças reais + fichas · *gatilho: Rafael marcar a conversa*
- [x] ~~**Alerta de saldo dos provedores**~~ ✅ 14/jul — `alertIfBalanceError` no `_watchdog.js` plugado nos 4 pontos (fal imagem ×2, fal vídeo, Anthropic call+stream): erro de saldo/billing → alerta ao Danilo (Sentry, dedup 24h) + usuário vê "instabilidade no sistema" (nunca o erro cru). Validado com os erros reais (403 fal, 400 Anthropic). Futuro opcional: checagem PROATIVA de saldo (endpoint de billing da fal) no cron-watchdog

*F1 — o processo (Fluxo "Guia de Compras"):*
- [ ] F1.1 entrada de produto no Fluxo: foto real + ficha técnica como contexto do nó
- [ ] F1.2 template "Guia de Compras": still fiel → manequim fantasma → variação de modelo (teste A/B) → close
- [ ] F1.3 **juiz de fidelidade** (gerada vs foto original — reprova alucinação de estampa/cor) = primeira encarnação do diretor de arte (F1/F2 da seção Copiloto)

*F2 — escala:* lote via planilha/CSV ou pasta do Drive → fila de gerações com progresso + **teto de créditos por lote** (guarda)
*F3 — integração:* API key por workspace (compartilha a F0 do plano MCP) + endpoint de entrada e endpoint de consulta + docs mínimos

**Fundações que o caso puxa (valem para TODAS as marcas — pedidos do Danilo 2026-07-10):**
- [ ] **Ativos como referência e aprendizado** 🟢 — a área de Ativos vira FONTE do cérebro: subir referência = ensino curatorial (novo sinal `reference_upload`, peso alto — "isto É a marca", mais forte que like em gerada); referências aprovadas entram nos hints visuais de toda geração (`brandVisualHints`); curadoria por pasta/tag (referência de estilo ≠ logo ≠ template). Exatamente o que o Rafael pediu na call.
- [ ] **Manual da marca (PDF) — área própria** 🟡 — marcas que JÁ têm manual: (a) upload do PDF salvo no storage + visualização embutida (a "casa" do manual dentro do produto, provável aba no Brand Kit dos Ativos ou na Expressão); (b) a raspagem de texto já existe (`brand-manual-extract-background` — pendência F11 de aprender o schema novo); (c) **NOVO: o VISUAL do manual popula o cérebro** — páginas renderizadas como imagens viram referências visuais (alimentam `reference_upload` + hints de geração). O manual ensina pelo texto E pela estética.

### ~~Regerar com motivo~~ ✅ 15/jul — ENTREGUE (com a convergência)
- ✅ **Motivo estruturado**: menu no botão de regen (canvas, Gerar+Vídeo): *Fora da marca · Não é fiel ao produto · Qualidade baixa · Composição ruim · Só regerar* → `motivo` no payload do `image_regen`; destilador instruído a agrupar aprendizado POR TIPO de falha ("não é fiel" pesa no win_rate do provider). Validado E2E (sinal com motivo no banco).
- ✅ **Métrica de convergência**: painel IA LOUDR ganhou a linha **Retrabalho por versão** no gráfico de evolução (% de peças da versão que foram regeneradas, mínimo 3 gerações por versão) — caindo = o cérebro acertando de primeira. O argumento de custo na venda.
- ✅ **Bônus — `reference_upload` ligado** (item "Ativos como referência" do piloto Hering, parte a): upload em Biblioteca > Referências da marca emite sinal peso 2.5 ("isto É a marca"); destilador trata como ensino curatorial de altíssimo peso p/ preferencias_visuais. **Falta (parte b):** referências aprovadas entrarem nos hints visuais da geração (brandVisualHints) — design pendente de qual geração recebe refs automáticas.

### 💰 Custos & créditos — pivô de modelo (2026-07-12)
Decisão: SEM SaaS self-service; crédito = REPASSE de custo (baliza **1 cr = R$0,33**; regra ×18 intacta, cobre câmbio até R$5,94). Ganho = contrato/inteligência. Entregue: página "Créditos & Consumo" (sem planos/upgrade), baliza visível, `ai_usage` (migration 039) rastreando LLM com tag por operação. **Pendências:**
- [ ] Painel admin "custo por workspace/mês" (fal + LLM + fixos) — os dados já gravam 🟢
- [ ] Hook do Voyage no ai_usage (embeddings ~$0,06/M — barato mas cego) 🟢
- [ ] streamAI sem rastreio (diagnóstico/chat usam stream — usage vem no SSE, capturar) 🟢
- [x] ~~Baliza~~ ✅ DECIDIDA 2026-07-13: **R$0,33/crédito** (mapas ×18 intactos; colchão cambial até R$5,94 — revisão obrigatória se o dólar passar disso)
- **📐 FÓRMULA DE MANUTENÇÃO POR CLIENTE (a régua do pricing):**
  `custo/mês = (créditos CONSUMIDOS × R$0,33) + fair-use de IA (~R$50–150/workspace, medir no ai_usage) + fatia de infra fixa`
  Regras de leitura: crédito liberado ≠ gasto (custo só no consumo real; teto = pool × 0,33); num contrato de R$5.000 c/ 5.000 créditos → pior caso ~1/3 de custo (margem ~65%), uso típico 15–25% (margem ~80–90%). O que se vende é o cérebro, não o crédito.
- [ ] Stripe: repensar papel (recarga a custo? só faturamento manual?) — era do modelo SaaS

### 🗂 Casa do Conteúdo (anotado 2026-07-12 — "ver com calma", mas PRÉ-REQUISITO do A3)
Problema nomeado pelo Danilo: conteúdo gerado não tem casa organizada — imagem/vídeo têm a Biblioteca, mas TEXTO criado não persiste em lugar nenhum (Redação gera e não salva por design; peças escritas do Copiloto vivem só na conversa), e a página de CAMPANHAS ficou ÓRFÃ da nova arquitetura (rotas existem — Campaigns/CampaignNew/CampaignDetail — mas nenhuma entrada de menu na árvore nova). Crítico para o A3: "pedir campanha no chat e ele gerar tudo" precisa aterrissar organizado.
- [x] ~~1. Peças escritas ganham casa~~ ✅ 2026-07-13 — migration 040 `pecas_escritas`; Redação salva (botão) e Copiloto salva (tool `salvar_peca_escrita`, auto).
- [x] ~~2. Biblioteca vira o HUB~~ ✅ 2026-07-13 — abas Mídia · Textos (dialog de leitura/copiar) · Campanhas.
- [x] ~~2b. Biblioteca vira REPOSITÓRIO estilo Drive~~ ✅ 2026-07-14 (pedido do Danilo) — home com 5 pastas-raiz (Imagens · Vídeos · Textos · **Referências da marca** · Campanhas), breadcrumb, subpastas, upload contextual, busca por root, tela cheia. Distinção nova de modelo: **Referências = o que DEFINE a marca** (uploads/curadoria; tipos de identidade + `metadata.reference`) vs peças produzidas. Textos ganharam pasta (migration 042). Gancho futuro: upload em Referências deve emitir o sinal `reference_upload` (item "Ativos como referência e aprendizado" do piloto Hering — a pasta já marca `reference: true`).
- ⚠️ **DECISÃO EM OBSERVAÇÃO (Danilo, 2026-07-13):** o redesenho campanha=dossiê+Fluxos foi entregue mas "não sei se estou convencido — por enquanto deixamos ali". Tensão nomeada: ganhou-se motor único/padrões, perdeu-se a simplicidade do 1-clique (criar campanha agora abre um canvas técnico; o dossiê é passivo). Hipótese de síntese p/ revisitar: o usuário de campanha NÃO deveria ver o canvas — brief → fluxo roda sozinho → peças no dossiê (canvas = bastidores opcional). Isso é o A3/agentes; revisar quando ele existir ou quando o uso real der veredito.
- 📌 Revisão 2026-07-13: descobertos DOIS sistemas de campanha; consolidado no **Studio Campanhas** (/studio/campanhas — menu, Biblioteca e deep-link ?c=). O legado `/campaigns` (aprovação de copy por IA, tabela `campaigns`, schema antigo) ficou SEM porta — deprecado; candidato a renascer como "diretor de arte de TEXTO" (avaliar copy externa contra o cérebro, par do de imagem). Arte de campanha agora respeita a regra imagem-limpa (NO_TEXT no prompt).
- [x] ~~3. Campanhas de volta ao mapa~~ ✅ 2026-07-13 — item 'Campanhas' no menu do Estúdio + aba na Biblioteca; rotas órfãs religadas (as 2 campanhas perdidas reapareceram).
- **4. A3 entrega NA casa** — quando o chat construir campanha completa, cada peça nasce já vinculada (campanha_id) e o card do chat aponta pra página da campanha.

### 🛍 Especialistas da fal para apropriar (varredura 2026-07-12 — "depois voltamos neles")
A tese borda-commodity em ação: o FASHN entrou em ~1h; cada especialista abaixo é encaixe, não reconstrução. Top 3 marcado.

| # | Modelo (fal) | O quê | Encaixe s1ngulr |
|---|---|---|---|
| **1º** ⭐ | **Recraft V3 vector** ($0,08/SVG) | ícones/padrões VETORIAIS na paleta | "Gerar ícone on-brand" na aba Ícones dos Ativos — ativo de marca permanente, não peça descartável. 🟢 horas |
| **2º** ⭐ | **Dia TTS** (clonagem de voz) + Sync-3/PixVerse lipsync | a marca grava 1 min e ganha a PRÓPRIA voz p/ narrar reels | destrava o "vídeo completo" (output 4) e abre a faceta IDENTIDADE SONORA no brand book. 🟡 ~1 dia |
| **3º** ⭐ | **Kling custom elements · Happy Horse 1.1** (9 refs → personagem consistente) | "modelo da casa": a MESMA modelo/mascote em todas as peças | faceta "elenco da marca" no brand book; p/ Hering: mesma modelo vestindo a coleção inteira do guia. 🟡 |
| 4 | Bria Extract Object | isola produto com transparência | o passo que falta do manequim fantasma real (linha Hering) |
| 5 | BiRefNet v2 · SeedVR upscale | fundo hi-res · upscaler novo | upgrades dos apps Remover fundo/Ampliar (duelo) |
| 6 | TRELLIS-2 (3D) · LTX-2.3 (video enhance) | produto 3D · restaurar/estender vídeo | horizonte: AR/e-commerce · pós de reels |

### Copiloto: diretor de arte + agentes (visão do Danilo, 2026-07-10)
Princípio: **o juiz é um módulo só, duas superfícies** — interativo no chat, automático no fluxo (mesmo padrão do `_brain.js`). Materializa o "Autopilot on-brand" do H2. Agentes moram DENTRO do Fluxos (decisão: sem área separada — fluxo com gatilho ligado = agente; aba "Agentes" lista os que rodam sozinhos).

**Copiloto com MÃOS — tool use (teste do Danilo 2026-07-12: pediu "construa post + carrossel + roteiro UGC" e levou Erro 504):**
| Fase | O quê | Notas |
|---|---|---|
| ~~**A0**~~ ✅ 2026-07-12 | **504 curado** — `anthropic.js` virou Functions 2.0 com pass-through do SSE (a antiga bufferizava com `await response.text()`) | validado via curl |
| ~~**A1**~~ ✅ 2026-07-12 | **Mãos de LEITURA** — 4 tools client-side via supabase (RLS = perímetro): mercado (síntese+clipping), tendências, insights, concorrentes; loop de tool use no stream (4 rodadas), status "Consultando…" na UI | catálogo espelha o MCP |
| ~~**A2**~~ ✅ 2026-07-12 | **Mãos de CRIAÇÃO com confirmação** — gerar_imagem (1 crédito, poll até pronta, imagem ENTREGUE no chat) e criar_fluxo (builder + link direto); card de confirmação com custo (crédito nunca roda sozinho); cancelou = modelo não insiste. Fix raiz: model:'auto' ia cru pro fal (502) | validado no browser: pedido → card → confirmar → imagem on-brand no balão |
| **A3** | **Encadeamento** — diretor de arte (F1/F2) julga o que o Copiloto produziu; pedido recorrente vira agente no Fluxos (F3) | fecha o elo com as fases abaixo |

**Regra da coerência juiz↔gerador (Danilo, 2026-07-12):** "não pode gerar o que não aprovaria — em TODOS os contextos." ✅ no chat: conceito confrontado com padrões reprovados antes de gerar + auto-julgamento (art-review) de toda peça antes da entrega (reprovada = entregue com parecer + oferta de regerar; nunca auto-retry que gasta crédito sem confirmação). 🟡 DECISÃO PENDENTE: estender o auto-julgamento às páginas Imagem/Vídeo e a todo nó Gerar dos fluxos — custo: +1 chamada de juiz por geração (~R$0,01-0,05); alternativa: portão opcional (já existe) vs. automático universal.

**Regra de marca (Danilo, 2026-07-12):** logo NUNCA entra em imagem gerada por padrão (modelo alucina); só quando o cliente SOLICITAR — e sempre o ARQUIVO REAL dos Ativos como referência i2i (`gerar_imagem.inserir_logo` ✅). Vale para toda superfície de geração futura.
**Refinamento 2026-07-14 (✅ codificado):** guideline ≠ logo — diretrizes visuais e elementos GRÁFICOS da identidade (quadrado rosa) podem ser construídos; **logotipo/wordmark/nome escrito NUNCA** (deforma sempre). Regra agora vive no `compileBrandContext` (_brain.js) = toda superfície com marca protegida (antes só campanha/writing tinham guard — a página Imagem gerava "LOUDR" torto).
**⏸️ DECISÃO EM ABERTO — Selo de marca:** composição determinística do SVG real por cima da peça gerada (editor de posição + nó de lote nos Fluxos; embrião do motor de formatos). Proposto 14/jul, Danilo: "vou pensar, nesse momento não adicione". Caminhos mapeados na conversa: A selo determinístico · B logo-na-cena com juiz de fidelidade obrigatório · C guarda de roteamento no prompt.

**Decisão de arquitetura:** as tools internas do Copiloto = as MESMAS que o MCP externo expõe (F1 do plano MCP). Um catálogo de ferramentas, duas superfícies — o chat por dentro, Figma/Canva por fora.

| Fase | O quê | Notas |
|---|---|---|
| ~~**F1**~~ ✅ 2026-07-12 | **Chat diretor de arte (imagem)** — anexo no chat → multimodal → parecer estruturado (VEREDITO·sustenta·foge·ajustes) → sinal `art_review` peso 0.8 via tool registrar_parecer | falta na fila: escolher peça DA BIBLIOTECA (hoje só upload) e "aplicar ajustes" regenerando |
| ~~**F2**~~ ✅ 2026-07-12 | **Portão do Diretor de Arte no Workflow** — art-review.js (juiz como serviço, mesmo do chat) + nó artGate (chip por veredito, ajustes no nó, reprovada corta o ramo); parecer = sinal art_review; param `criterio` por portão = gancho do juiz de fidelidade Hering | validado: reprovou peça real citando o brand book |
| **F3** | **Gatilhos + lote + aba Agentes** — nós de gatilho (agenda "toda seg 8h"; evento "tendência ≥8", "insight oportunidade"), nó de lote (para cada item da pauta → peça), aba Agentes em Fluxos (status, última execução, produzidas, barradas pelo juiz) | produção em massa estilo n8n criativo; caso-demo: "toda seg o agente lê síntese+tendências, gera 5 peças, juiz aprova 3, time chega com elas prontas". ⚠️ GUARDA: teto de créditos por execução/semana |
| F4 | Vídeo no chat (frames amostrados) | depois — mais caro |

## H2 — REDE DE CÉREBROS (3–12 meses) · *dezenas de marcas aprendendo; fase que a captação financia*

| Item | O quê | Tamanho / gatilho |
|---|---|---|
| **🚀 MCP do Cérebro (Figma primeiro)** | plano APROVADO e pronto em [`features/mcp-cerebro.md`](features/mcp-cerebro.md): F0 API keys → F1 server (6 tools sobre `_brain.js`) → F2 teste T1–T7 com Figma write-to-canvas → F3 produto. Candidato a demo de captação | 🟡 ~2 dias core · "em breve" (Danilo) · dependência: seat Full Figma |
| **Autopilot on-brand** | agente gera → avalia com o cérebro-juiz (`check_on_brand`) → refina em background → entrega top-3 com parecer. Autonomia julgada pela marca (vs. autonomia genérica do Tess) | 🟡 |
| **Brand Deck 1-clique** | apresentação da marca (identidade + território + aprendizados) em PPTX — `pptxgenjs` já é dep. Entregável do cliente (≠ export do painel, vetado) | 🟢 |
| **Gap 4 — Jornada do dia 1** | onboarding guiado: workspace novo → brand book → primeiro valor | 🟡 · dói a partir de ~10 contas |
| **Gap 6 — Tenant hardening** | backup/versionamento por cérebro, zero vazamento | 🟡 · gatilho: contas crescendo |
| ~~**Backup do banco**~~ ✅ LIGADO 2026-07-20 | dump diário (GitHub Actions → R2) + dump pré-migration (`scripts/migrate.sh`) + doc de restore ([`backup.md`](backup.md)). PITR adiado (plano Pro). Bucket R2 `dumps1ngulr` + 5 secrets do GitHub OK; **1º dump validado em prod** (2.3M no R2). Host da pooler = `aws-1-us-west-2` (direto é IPv6-only, falha no CI). Regra nova: `db push` só via migrate.sh (backup antes). **Falta só (local, p/ migrate.sh):** `brew install postgresql@17 awscli` | ✅ |
| **Subdomínio por marca** (nomedamarca.s1ngulr.com) | ⏸️ DECISÃO 2026-07-15 (Danilo): **manter modelo atual** (login + RLS por workspace_id + impersonation admin) e usar internamente. Subdomínio é branding, não isolamento — o RLS já é o perímetro real. Terreno preparado: `workspaces.slug` já existe + backfill (migration 044). Reabrir quando virar experiência de cliente externo — exige wildcard DNS + SSL `*.s1ngulr.com` (custo de infra) + camada de resolução por hostname (fallback pro modelo atual, testável em localhost via ?tenant=) | 🔴 · gatilho: cliente externo / GTM |
| **Dataset → export de fine-tune** | JSONL por tenant do `brand_dataset` + critérios de qualidade/dedup | 🟡 · gatilho: volume de exemplos |
| **Cérebro como serviço próprio** | fila/estado durável fora do teto do Netlify (fronteira pronta no `_brain.js`) | 🔴 · gatilho: volume |
| **Contexto de campanha persistente** | brief salvo e reutilizável entre Writing/Studio/Workflow (camada sobre o cérebro) | 🟢 |
| Gap 7 — Responsividade mobile | não auditada; desktop-first hoje | 🟡 |

---

## H3 — A CATEGORIA (12+ meses) · *infraestrutura de memória de marca da indústria criativa*

- **API do Cérebro pública** (camada C consolidada) + registro no diretório MCP — agências e ferramentas plugando. O Tess como CANAL (agentes deles consumindo nossa camada de marca), não rival.
- **Plugins nativos** (Canva Apps · Figma Plugins · Adobe UXP) sobre a mesma camada — a marca dentro da ferramenta, sem sair dela.
- **Per-tenant NLP / fine-tune** — gatilhos: volume alto + custo de API pesando + dataset limpo + tarefa estreita. O dataset de hoje já nasce no formato certo.
- **Stock assets com busca via cérebro** — Shutterstock/iStock como acervo, preferências visuais aprendidas viram query (referências on-brand automáticas). Avaliar licenciamento.
- **Editor de texto sobre imagem (estilo Canva)** — fechar a peça sem sair do LOUDR. Danilo: "não é o momento" (07/07); por ora texto = pós-produção guiada pelo bloco "Sugestão de imagem".
- **Trial self-service** — decisão de modelo comercial (Pupila tem; LOUDR é invite-only por escolha). Reavaliar com pricing validado.

---

## 🧊 Geladeira

- **Lockup do header — logos muito horizontais:** hoje o logo é dimensionado por ALTURA (36px, maxWidth 150). Se aparecer marca de cliente com logo muito horizontal ficando espremido, mudar a regra para dimensionar pela LARGURA máxima (decisão adiada 2026-07-10).
Nurturing emails (D+2…D+15) · F07b Search Listening (busca orgânica) · atualizar supabase CLI (aviso recorrente).

---

## ✅ Entregue (resumo — história completa no changelog v6.0 do specs.md)

**06–08/jul/2026, "a era do cérebro":** `_brain.js` (cérebro como módulo único) · flywheel completo (todas as superfícies leem+escrevem) · `brand_dataset` (exemplos julgados p/ fine-tune) · modelo vivo enriquecido (taxonomia por código, facetas territorio/conteudo, métricas por versão) · sinais `content_used`/`image_regen`/`writing_edit` · Writing Room (frameworks + blocos editáveis + compilador peça→workflow) · Biblioteca de assets · painel admin Cérebros + IA LOUDR como prova viva (narrativa + **rede neural viva**) · cron autônomo consertado · dogfooding Pupila · migrations 025–034 via CLI · docs v6.0. Concorrentes mapeados: Pupila (direto, DNA estático) e Tess (indireto, valida a tese borda-commodity).

---

**Regra de manutenção:** tarefa nova entra AQUI (não em outro doc), no horizonte certo, com tamanho e gatilho; ao concluir, vira uma linha no "Entregue" + changelog do specs.md. Toda entrada nova se testa contra o north star.
