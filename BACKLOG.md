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

1. **Nova arquitetura (Strategy·Intelligence·Studio·Copilot)** — árvore entregue pelo time 2026-07-10; de-para + decisões em [`specs/features/nova-arquitetura.md`](specs/features/nova-arquitetura.md). ~~**Onda 1 (navegação)**~~ ✅ 2026-07-10 — sidebar nos 4 grupos, IA LOUDR movida p/ Intelligence, Copilot renomeado, rótulos via i18n; rotas/schema intactos. ~~**Onda 2**~~ ✅ 2026-07-10 — coluna `strategy` (migration 035) + 4 seções novas no hub (Essência, Negócio c/ Personas+Goals, Experiência, Personalidade c/ território aprendido da IA + Storytelling/Seasons), campos existentes reagrupados sem de-para no banco; cérebro atualizado aditivamente (contexto de geração ganha personas+narrativa; Writing Room idem; RAG embeda as seções strategy). Pendente da onda: extração de manual (F11) aprender o schema novo — junto da Onda 3. **Onda 3** 🟢–🔴: Copilot-modos + Review Content → Approvals (TUDO, com sinal) → Reports → Trends → Brand Kit → Consumer Insights.
1b. **i18n completo (pt/en/es)** — fundação criada (`src/lib/i18n.js`, nav trilíngue); falta: varredura das strings do app + seletor de idioma (workspace/usuário) + conteúdo gerado no idioma do workspace. Decisão: foco PT, sistema configurável p/ expansão. 🔴 (progressivo — toda string nova já nasce via `t()`)
2. **GTM:** marca do produto + site. Dogfooding máximo — usar o próprio LOUDR (diagnóstico, Writing Room, Studio) para construí-la: vira case e demo. Depois: **rodada de investimento**.
3. **Operar e observar:** cron autônomo de destilação (consertado 08/07 — conferir os primeiros ciclos), clipping de segunda (inclui Pupila), usar o produto e votar (cada uso calibra o cérebro e ensaia a demo).
4. **Roteiro de demo do flywheel** (~5 min de telas contando a história) — eu monto quando o Danilo pedir. 🟢

---

## H1 — PROVAR (agora → ~3 meses) · *marca no mercado, ~10 clientes com case*

| Item | O quê | Tamanho / gatilho |
|---|---|---|
| **⭐ Duelo de Modelos** | mesma peça em 2–3 providers lado a lado + voto do vencedor. Gera **preferência pareada** (ouro p/ win-rate do cérebro e p/ dataset de fine-tune). Inspiração Tess passada pelo cérebro | 🟢 dias |
| **Gap 1 — Observabilidade** | Sentry + alerta "cron não destilou em Xh" (o bug do cron ficou 2 dias invisível) | 🟢 ~1 dia |
| **Gap 2 — Testes** | CI básico: smoke das functions críticas (_brain, studio-generate, distill) + parses. Diligência de investidor olha | 🟡 |
| **Gap 3 — LGPD/ToS/Privacidade** | inexistentes no repo; pré-requisito p/ clientes maiores e captação | 🟡 (+ jurídico) |
| **Propriedade intelectual (INPI)** | (a) **marcas**: LOUDR + nome do produto + "Smart Branding" (classes 9/35/42); (b) **registro de programa de computador** (barato, rápido, prova anterioridade do código); (c) **segredo industrial** p/ cérebro/dataset/prompts (NDA + contratos + ToS — mais valioso que patente); patente de software é via estreita no BR. Fazer ANTES do site/marketing público | 🟢 (+ advogado de PI) |
| **Stripe live + recarga avulsa** | código validado em test mode | 🟢 · gatilho: venda deixar de ser manual |
| **E2 — Loop criativo integrado com Meta** | motor de desdobramento (criativo vencedor → N variações on-brand) + Meta Marketing API (vencedores automáticos; performance real vira sinal `ad_performance`) | 🔴 · **gatilho: deal VHITA fechar** → registrar app na Meta NO MESMO DIA (App Review = semanas) |
| Sustentação: cron enterprise diário · tela de workspace inativo | pequenos, sem gatilho | 🟢 cada |

**Narrativa sem código (usar no site/pitch):** "usuários ilimitados — pague pelo que cria, não por cadeira" (créditos ≠ assentos) · "O Tess te dá todas as IAs; o LOUDR faz as IAs conhecerem a SUA marca" · "Não competimos com Canva/Figma — somos a memória de marca que eles não têm".

---

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

Nurturing emails (D+2…D+15) · F07b Search Listening (busca orgânica) · atualizar supabase CLI (aviso recorrente).

---

## ✅ Entregue (resumo — história completa no changelog v6.0 do specs.md)

**06–08/jul/2026, "a era do cérebro":** `_brain.js` (cérebro como módulo único) · flywheel completo (todas as superfícies leem+escrevem) · `brand_dataset` (exemplos julgados p/ fine-tune) · modelo vivo enriquecido (taxonomia por código, facetas territorio/conteudo, métricas por versão) · sinais `content_used`/`image_regen`/`writing_edit` · Writing Room (frameworks + blocos editáveis + compilador peça→workflow) · Biblioteca de assets · painel admin Cérebros + IA LOUDR como prova viva (narrativa + **rede neural viva**) · cron autônomo consertado · dogfooding Pupila · migrations 025–034 via CLI · docs v6.0. Concorrentes mapeados: Pupila (direto, DNA estático) e Tess (indireto, valida a tese borda-commodity).

---

**Regra de manutenção:** tarefa nova entra AQUI (não em outro doc), no horizonte certo, com tamanho e gatilho; ao concluir, vira uma linha no "Entregue" + changelog do specs.md. Toda entrada nova se testa contra o north star.
