# BACKLOG — LOUDR (único e canônico)

> **North star:** *"Revolucionar a indústria criativa com IA — a marca no meio da operação."* (Danilo, jul/2026)
> Todo item abaixo se justifica por essa frase: ou coloca a marca mais para dentro da operação, ou sustenta quem coloca.
>
> **Organização:** por horizonte da visão (H1 provar → H2 rede de cérebros → H3 categoria), construível **aos poucos** — cada item tem tamanho (🟢 dias · 🟡 ~1 semana · 🔴 semanas+) e gatilho quando não é "já".
> Estratégia: `plano-de-melhoria.md` · Visão: `specs/visao-loudr.md` · História do entregue: `specs/specs.md` (changelog v6.0)
> Atualizado: 2026-07-09

---

## 🎯 Em cima da mesa agora

O código está à frente do comercial — as próximas jogadas não são features:

1. **Nova arquitetura (Strategy·Intelligence·Studio·Copilot)** — árvore entregue pelo time 2026-07-10; de-para + decisões em [`specs/features/nova-arquitetura.md`](specs/features/nova-arquitetura.md). ~~**Onda 1 (navegação)**~~ ✅ 2026-07-10 — sidebar nos 4 grupos, IA LOUDR movida p/ Intelligence, Copilot renomeado, rótulos via i18n; rotas/schema intactos. ~~**Onda 2**~~ ✅ 2026-07-10 — coluna `strategy` (migration 035) + 4 seções novas no hub (Essência, Negócio c/ Personas+Goals, Experiência, Personalidade c/ território aprendido da IA + Storytelling/Seasons), campos existentes reagrupados sem de-para no banco; cérebro atualizado aditivamente (contexto de geração ganha personas+narrativa; Writing Room idem; RAG embeda as seções strategy). Pendente da onda: extração de manual (F11) aprender o schema novo — junto da Onda 3. **Onda 3 (parcial)** ✅ 2026-07-10 — árvore COMPLETA na nav (3 níveis c/ subtítulos Culture/Business/Communication); Intelligence com 8 páginas (Market Intelligence ✅ real = feed do clipping; Competitors ✅ real-lite = scores por concorrente; Consumer Insights/Trends/Reports = em construção honesto); Studio com Brand Assets ✅ (tabs por tipo; Templates/Brand Kit em construção) e Approvals ✅ real (fila de peças sem julgamento + campanhas p/ aprovar — cada decisão vira sinal); Copilot com 10 modos (prompt pré-carregado por modo via ?m=). ~~Consumer Insights real~~ ✅ 2026-07-10 (v2 no mesmo dia — decisão: Escuta = coleta bruta · Insights = leitura; vizinhas no menu, cross-links; migration 037 `consumer_insights` + `insights-gerar-background`: o cérebro destila a escuta em insights NOMEADOS — elogio/atrito/oportunidade/tema/alerta, com ação no tom da marca e persona; menções brutas saíram da página); ~~Trends real~~ ✅ 2026-07-10 (radar por setor: migration 036, coleta semanal seg 10h + on-demand, cada tendência com 'como a sua marca surfa isso' no tom aprendido; sinal `trend` alimenta o cérebro). ~~Inteligência de Mercado fase 1~~ ✅ 2026-07-10 (pulso 7d, SÍNTESE DO CICLO pelo cérebro — migration 038 + `_market.js`, on-demand + automática no cron do clipping —, share of voice 30d, feed com filtros); ~~Concorrentes fase 1~~ ✅ 2026-07-10 (dossiê expandível por rival: frase, territórios reivindicados c/ alerta de colisão vs território aprendido, forças/fraquezas, momento, fatos do cérebro, movimentos; comparativo lado a lado c/ deltas por ciclo). **Fase 2 anotada:** coleta setorial no Mercado (além dos concorrentes); Concorrentes: presença digital, tom/estética comparável, oferta/preço, vagas abertas, ads da Meta (junto do E2). **Falta da Onda 3:** Relatórios próprios (hoje = Posicionamento ressignificado), Templates/Brand Kit, Agents, extração de manual (F11) no schema novo, split fino do Posicionamento (números→Reports).
1b. **i18n completo (pt/en/es)** — fundação criada (`src/lib/i18n.js`, nav trilíngue); falta: varredura das strings do app + seletor de idioma (workspace/usuário) + conteúdo gerado no idioma do workspace. Decisão: foco PT, sistema configurável p/ expansão. 🔴 (progressivo — toda string nova já nasce via `t()`)
2. **GTM:** marca do produto + site. Dogfooding máximo — usar o próprio LOUDR (diagnóstico, Writing Room, Studio) para construí-la: vira case e demo. Depois: **rodada de investimento**.
3. **Operar e observar:** cron autônomo de destilação (consertado 08/07 — conferir os primeiros ciclos), clipping de segunda (inclui Pupila), usar o produto e votar (cada uso calibra o cérebro e ensaia a demo).
4. **Roteiro de demo do flywheel** (~5 min de telas contando a história) — eu monto quando o Danilo pedir. 🟢

---

## H1 — PROVAR (agora → ~3 meses) · *marca no mercado, ~10 clientes com case*

| Item | O quê | Tamanho / gatilho |
|---|---|---|
| **⭐ Duelo de Modelos** | mesma peça em 2–3 providers lado a lado + voto do vencedor. Gera **preferência pareada** (ouro p/ win-rate do cérebro e p/ dataset de fine-tune). Inspiração Tess passada pelo cérebro | 🟢 dias |
| **Gap 1 — Observabilidade** | Sentry + alerta "cron não destilou em Xh" (o bug do cron ficou 2 dias invisível). **Decisão 2026-07-10: entra na PRÉ-PRODUÇÃO** (antes do go-live comercial) | 🟢 ~1 dia |
| **Gap 2 — Testes** | CI básico: smoke das functions críticas (_brain, studio-generate, distill) + parses. Diligência de investidor olha | 🟡 |
| **Gap 3 — LGPD/ToS/Privacidade** | inexistentes no repo; pré-requisito p/ clientes maiores e captação | 🟡 (+ jurídico) |
| **Propriedade intelectual (INPI)** | (a) **marcas**: LOUDR + nome do produto + "Smart Branding" (classes 9/35/42); (b) **registro de programa de computador** (barato, rápido, prova anterioridade do código); (c) **segredo industrial** p/ cérebro/dataset/prompts (NDA + contratos + ToS — mais valioso que patente); patente de software é via estreita no BR. Fazer ANTES do site/marketing público | 🟢 (+ advogado de PI) |
| **Stripe live + recarga avulsa** | código validado em test mode | 🟢 · gatilho: venda deixar de ser manual |
| **E2 — Loop criativo integrado com Meta** | motor de desdobramento (criativo vencedor → N variações on-brand) + Meta Marketing API (vencedores automáticos; performance real vira sinal `ad_performance`) | 🔴 · **gatilho: deal VHITA fechar** → registrar app na Meta NO MESMO DIA (App Review = semanas) |
| Sustentação: cron enterprise diário · tela de workspace inativo | pequenos, sem gatilho | 🟢 cada |

**Narrativa sem código (usar no site/pitch):** "usuários ilimitados — pague pelo que cria, não por cadeira" (créditos ≠ assentos) · "O Tess te dá todas as IAs; o LOUDR faz as IAs conhecerem a SUA marca" · "Não competimos com Canva/Figma — somos a memória de marca que eles não têm".

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
- **F0** 🟢 — corrigir bug da área de referências (visto na call) + testar fidelidade com 3-5 peças reais ANTES de prometer escala (make-or-break: alucinação de estampa/cor = pedido errado). Verificar modelos especializados da fal (try-on, ghost mannequin).
- **F1** — template de Fluxo "Guia de Compras" (foto+ficha → still fiel, manequim fantasma, variação de modelo, close) com **juiz de fidelidade** (= diretor de arte F1/F2 abaixo).
- **F2** — lote via planilha/Drive (puxa a F3 dos agentes). **F3** — API in/out (puxa a F0 do MCP).

### Copiloto: diretor de arte + agentes (visão do Danilo, 2026-07-10)
Princípio: **o juiz é um módulo só, duas superfícies** — interativo no chat, automático no fluxo (mesmo padrão do `_brain.js`). Materializa o "Autopilot on-brand" do H2. Agentes moram DENTRO do Fluxos (decisão: sem área separada — fluxo com gatilho ligado = agente; aba "Agentes" lista os que rodam sozinhos).

| Fase | O quê | Notas |
|---|---|---|
| **F1** | **Chat diretor de arte (imagem)** — upload OU peça da Biblioteca → parecer groundado no cérebro (veredito + porquês + ajustes concretos) → botão "aplicar ajustes" regenera | peça EXTERNA entrando p/ julgamento = "marca no meio da operação" sem MCP; parecer do AI = sinal de peso MENOR que humano; humano aceitar ajuste = ensino forte |
| **F2** | **Nó "portão do diretor de arte" no Workflow** — gate automático: só passa peça on-brand; reprovada volta com parecer p/ regenerar | mesmo juiz da F1 como nó |
| **F3** | **Gatilhos + lote + aba Agentes** — nós de gatilho (agenda "toda seg 8h"; evento "tendência ≥8", "insight oportunidade"), nó de lote (para cada item da pauta → peça), aba Agentes em Fluxos (status, última execução, produzidas, barradas pelo juiz) | produção em massa estilo n8n criativo; caso-demo: "toda seg o agente lê síntese+tendências, gera 5 peças, juiz aprova 3, time chega com elas prontas". ⚠️ GUARDA: teto de créditos por execução/semana |
| F4 | Vídeo no chat (frames amostrados) | depois — mais caro |

## H2 — REDE DE CÉREBROS (3–12 meses) · *dezenas de marcas aprendendo; fase que a captação financia*

| Item | O quê | Tamanho / gatilho |
|---|---|---|
| **🚀 MCP do Cérebro (Figma primeiro)** | plano APROVADO e pronto em [`specs/features/mcp-cerebro.md`](specs/features/mcp-cerebro.md): F0 API keys → F1 server (6 tools sobre `_brain.js`) → F2 teste T1–T7 com Figma write-to-canvas → F3 produto. Candidato a demo de captação | 🟡 ~2 dias core · "em breve" (Danilo) · dependência: seat Full Figma |
| **Autopilot on-brand** | agente gera → avalia com o cérebro-juiz (`check_on_brand`) → refina em background → entrega top-3 com parecer. Autonomia julgada pela marca (vs. autonomia genérica do Tess) | 🟡 |
| **Brand Deck 1-clique** | apresentação da marca (identidade + território + aprendizados) em PPTX — `pptxgenjs` já é dep. Entregável do cliente (≠ export do painel, vetado) | 🟢 |
| **Gap 4 — Jornada do dia 1** | onboarding guiado: workspace novo → brand book → primeiro valor | 🟡 · dói a partir de ~10 contas |
| **Gap 6 — Tenant hardening** | backup/versionamento por cérebro, zero vazamento | 🟡 · gatilho: contas crescendo |
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
