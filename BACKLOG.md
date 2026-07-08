# BACKLOG — LOUDR (único e canônico)

> **Este é o documento de tarefas.** Ordenado por importância ao negócio, de cima para baixo.
> Contexto/estratégia: `plano-de-melhoria.md` · Visão: `specs/visao-loudr.md` · Spec completa: `specs/specs.md` · Camada de Inteligência: `specs/features/brand-intelligence.md`
> Atualizado: 2026-07-06

---

## 🔴 Agora — valor direto de venda

1. ~~**Deploy: merge `dev → main`**~~ ✅ (2026-07-07) — cérebro completo + Writing Room em produção (deploy ready no Netlify).
2. ~~**E1 — Writing Room on-brand**~~ ✅ (2026-07-06) — `#/app/brands/:id/studio/writing` (nav Brand Studio): 5 frameworks guiados (legenda, carrossel, reel, anúncio, e-mail — `writingFrameworks.js`), system prompt = identidade verbal + `compileIntel` (cérebro), streaming Sonnet via proxy, "Copiar peça" emite `content_used` (fonte `writing_room`) → destilador + dataset.
   - ~~**E1.1 — Fase 1 do Writing→Mídia: blocos editáveis**~~ ✅ (2026-07-07) — peça parseada em seções (`## `); cada bloco com **editar na mão** e **refazer só esta seção** (IA vê a peça inteira, reescreve só o bloco); "Refazer tudo"; cópia/sinal usam a peça montada dos blocos; edição reabre a adoção. Validado real (carrossel 5 slides, redo do slide 2 sem tocar o resto).
   - ~~**E1.2 — Fase 2: "Criar workflow com as peças"**~~ ✅ (2026-07-07) — compilador peça→canvas (`writingToWorkflow.js`): prompts visuais derivados por LLM (1/post, 1/slide, 2-4 cenas/reel, 1/variação), peça inteira no nó Contexto, caminhos prompt→generate→preview (Reel: →videoGen **Seedance 2**), visual da marca + formato compartilhados. Nada gera sozinho — revisão no canvas. PromptNode ganhou o aviso "Confira o prompt antes de gerar" (regra). Validado real: legenda→workflow no canvas.
   - ~~**E1.3 — edições de bloco viram sinal**~~ ✅ (2026-07-08) — editar seção no Writing Room emite `writing_edit` (peso 2.5, original→edição): ensino direto de voz. Destilador + dataset (migration 033) + painel + rede neural. *(Atalho de geração inline: descartado por ora — o caminho workflow cobre.)*
3. *(E2 — loop de criativo com Meta: **movido para "Depois", CONDICIONADO ao fechamento do deal VHITA** — decisão 2026-07-07.)*

## 🟠 Próximo — fortalece produto e pitch

4. ~~**E3 — Edit & Enhance na galeria**~~ ✅ **JÁ EXISTIA** (constatado 2026-07-07) — a página Imagem já expõe Ampliar/Remover fundo/Variação inline em cada item da galeria (`APP_ACTIONS` → `studio-edit`), além do canvas. O gap-analysis da Pupila marcou "parcial" por engano. Só padronizado o rótulo Upscale→Ampliar.
5. ~~**E4 — Biblioteca de assets**~~ ✅ (2026-07-07) — página **Biblioteca** no Brand Studio (`/studio/biblioteca`, `StudioLibrary.jsx`): grid de mídia/arquivos (peças salvas do Studio + uploads; cor/tipografia ficam no Brand Book), **pastas** (chips + contagem, free-solo), **tags** (#filtros) e **busca** (nome/descrição/tag/pasta). Dialog "Organizar" por asset; preview de imagem/vídeo (hover-play)/SVG inline; baixar/excluir. Migration `032` (pasta + tags[]) aplicada. Validado no browser. *(Evolução: ver "Stock assets" em Ideias.)*
6. ~~**P4 — painel de memória como material comercial**~~ ✅ (2026-07-07) — IA LOUDR ganhou: banner-narrativa com números reais (desde {data}, N evidências → M versões → aprendizados ativos → confiança início→hoje), delta de confiança desde a v1 (▲/▼ pts), "última janela" de aprovação (metricas por versão) e contagem de aprendizados ativos. **Sem export PDF por decisão do Danilo — prova viva é na tela.**
7. ~~**Dogfooding competitiva**~~ ✅ (2026-07-08) — Pupila cadastrada (campos corrigidos: nome/domínio estavam invertidos), diagnóstico premium rodado (5/5/5, "a marca não conta a história que o produto vive", território "Brand Operations") e sinal `competitive` no cérebro. Clipping entra no cron de segunda.

## 🔴 Frentes novas (direção do Danilo, 2026-07-08)

- **🚀 MCP do Cérebro — PLANEJADO, fazer em breve (decisão 2026-07-08: Figma primeiro; Danilo aprovou o plano).** Plano completo e pronto para executar em [`specs/features/mcp-cerebro.md`](specs/features/mcp-cerebro.md): F0 auth por API key (migration 035) → F1 MCP server no Netlify (6 tools sobre o `_brain.js`) → F2 teste estruturado T1–T7 com o MCP oficial do Figma (write-to-canvas) → F3 produto. ~2 dias de execução. Dependência do Danilo p/ o T4: seat Full pago no Figma.

- **Revisão de taxonomia + layout do Brand Book (time de criação).** ⚠️ Mapa técnico antes de mudar: a taxonomia atual (`verbal_identity`/`visual_identity` e suas chaves — tom_voz, personalidade, paleta, foto_mood etc.) é consumida por `compileBrandContext` (_brain.js, toda geração), `buildWriterSystem` (Writing Room), `compileIntel`/RAG (`brand-book-embed`), extração de manual (F11) e o destilador (grounding). Quando o time definir a taxonomia nova, fazer o de-para campo a campo e migrar os consumidores juntos — mudar só a UI quebra o cérebro silenciosamente.
- **Go-to-market: marca do produto + apresentação ao mercado.** Criar a marca do produto (naming/identidade) e o material de venda. Dogfooding máximo: usar o próprio LOUDR para construir essa marca (brand book próprio, diagnóstico, Writing Room para a copy de lançamento) — vira case e demo ao mesmo tempo. Ativos prontos para o pitch: rede neural viva, narrativa "N evidências → M versões", diagnóstico competitivo com clipping.

## 🟡 Depois — fundação e escala

7b. **E2 — P1: loop de criativo on-brand INTEGRADO COM META** *(killer app — **GATILHO: deal VHITA fechado**, decisão 2026-07-07: só constrói com a conta real dela para integrar)* — visão da Raquel: **integrado com a Meta** (não é extensão, é o coração). (a) **Motor de desdobramento:** criativo vencedor → visão/LLM entende a lógica → N variações on-brand via cérebro. (b) **Integração Meta Marketing API:** conecta a conta de anúncios do workspace (OAuth), identifica vencedores AUTOMATICAMENTE (CTR/conversão/spend), performance real vira sinal (`ad_performance`) no cérebro + dataset. ⚠️ Ao disparar o gatilho, **registrar o app na Meta IMEDIATAMENTE** (App Review `ads_read` + business verification = semanas); o motor (a) pode nascer standalone Meta-ready enquanto o acesso não sai.

8. **Dataset: export de fine-tune** — JSONL por tenant a partir de `brand_dataset` + critérios de qualidade/dedup. Gatilho: volume de exemplos crescendo.
9. **Isolamento por tenant** — backup/versionamento por cérebro, zero vazamento entre marcas. Gatilho: contas crescendo.
10. **Cérebro como serviço próprio** — fila/estado durável fora do teto do Netlify (fronteira já pronta no `_brain.js`). Gatilho: volume.
11. **Stripe live + recarga avulsa de créditos** — cobrança real (test mode já validado).
12. **Cron enterprise diário** — `cron-monitor` roda só segunda 8h; enterprise pede diário (agendamentos por plano).
13. **AppShell: tela de workspace inativo** — quando `workspace.ativo=false`, mostrar tela de inativo em vez do app.

## 🔵 Ideias anotadas — decisão futura (não correr agora)

- **Trial self-service** — Pupila tem; LOUDR é invite-only por decisão. Reavaliar quando modelo comercial/pricing estiver validado. *(Anotado 2026-07-06 a pedido do Danilo.)*
- **Stock assets como base de referências** — incorporar Shutterstock/iStock (ou similar) como acervo, com o **cérebro buscando tipos de referência on-brand** (preferências visuais aprendidas → query na API de stock → referências para o Studio/i2v). Avaliar licenciamento e custo por asset. *(Ideia do Danilo, 2026-07-06.)*
- **⭐ MCP do Cérebro — a marca dentro de QUALQUER ferramenta de criação** (visão do Danilo, 2026-07-08, fecho da visão de futuro). Um servidor MCP expondo o cérebro para Canva, Figma, Claude, agentes e qualquer ferramenta AI-enabled: **leitura** (`resolveBrandIntelligence`, `searchBrandKnowledge`, assets da Biblioteca, paleta/voz/território) e **escrita** (peças criadas lá fora viram sinal/dataset — o cérebro aprende até do que acontece fora da plataforma). Tecnicamente barato: o `_brain.js` já é a porta única — o MCP é um wrapper fino + auth por workspace (API key). Estrategicamente enorme: o LOUDR deixa de competir com as ferramentas de criação e vira a CAMADA DE MARCA delas — distribuição + moat + a materialização literal de "a marca no meio da operação". É o embrião do H3 (API do cérebro / infraestrutura). Gatilho: pós-GTM, forte candidato a destaque na narrativa da captação.
  **Arquitetura em 3 camadas (desenho 2026-07-08):** (C) **API do Cérebro** — camada base autenticada por API key de workspace sobre o `_brain.js`: `get_brand_context`, `search_brand_knowledge`, `list_brand_assets`, `write_on_brand`, `check_on_brand`, `report_usage` (a volta: uso externo vira sinal). (A) **MCP server** sobre a C — agentes (Claude/ChatGPT/etc.) leem a marca no nosso MCP e executam nos MCPs/APIs de Figma/Canva/Adobe; o agente é a ponte, a inteligência é nossa. Primeiro a construir: fino e surfa a onda dos agentes. (B) **Plugins nativos** (Canva Apps / Figma Plugins / Adobe UXP) sobre a mesma C — painel da marca dentro da ferramenta; vem depois do A provar demanda (fricção de marketplace). Direção do valor SEMPRE: eles usam a nossa inteligência; a ferramenta é commodity, a memória é nossa.
- **Editor de texto sobre imagem (estilo Canva)** — overlay de tipografia na plataforma para fechar a peça sem sair do LOUDR. Danilo: "não é o momento ainda" (2026-07-07). Por ora, texto = pós-produção do time criativo guiada pelo bloco "Sugestão de imagem".
- **Nurturing emails** (D+2, D+5, D+10, D+15) — jornada de ativação por e-mail.
- **F07b — Search Listening** — análise de busca orgânica (além do social).

## 🟠 Gaps de vendabilidade/escala (auditoria 2026-07-08 — revisar antes da expansão)

> Nenhum bloqueia venda consultiva hoje; todos viram pré-requisito conforme contas/equipe crescem. Ordem sugerida pela dor.

1. **Observabilidade** — Sentry (ou similar) + alerta "cron não destilou em Xh". O bug do cron ficou 2 dias invisível; é o gap que JÁ doeu. ~1 dia.
2. **Testes automatizados** — zero cobertura (o `App.test.js` é resquício sem runner). O bug do cron e o da coluna `version` cairiam num CI básico. Começar por: smoke das functions críticas (_brain, studio-generate, distill) + parse de writingFrameworks. Diligência de investidor olha isso.
3. **LGPD / ToS / Privacidade** — inexistentes no repo. Necessário para clientes maiores e para a captação.
4. **Jornada do dia 1** — workspace novo → brand book vazio → primeiro valor: precisa ser guiada (wizard/checklist). Dói ao passar de ~10 contas.
5. **Billing live** — Stripe validado em test mode; ativar quando a venda deixar de ser manual.
6. **Backup por cérebro / tenant hardening** — já listado em Depois (gatilho: contas crescendo).
7. **Responsividade mobile** — não auditada (painéis e Studio são desktop-first).

## 🧹 Higiene técnica

- ~~**Sinais órfãos**~~ ✅ (2026-07-08, migration 033) — órfãos removidos + guard nos triggers de diagnostic/listening.
- **supabase CLI** — atualizar 2.106 → 2.109 (aviso recorrente).

---

**Regra de manutenção:** tarefa nova entra aqui (não em outro doc); ao concluir, marcar ✅ com data e mover contexto relevante para a spec da feature. Os demais docs (`plano-de-melhoria`, `specs/*`) são estratégia e especificação — não listas de tarefas.
