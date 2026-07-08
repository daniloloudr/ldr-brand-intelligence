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
   - **E1.3 — Fase 3: atalho de geração inline p/ casos simples + edições humanas de bloco viram sinal (ensino de voz).**
3. *(E2 — loop de criativo com Meta: **movido para "Depois", CONDICIONADO ao fechamento do deal VHITA** — decisão 2026-07-07.)*

## 🟠 Próximo — fortalece produto e pitch

4. ~~**E3 — Edit & Enhance na galeria**~~ ✅ **JÁ EXISTIA** (constatado 2026-07-07) — a página Imagem já expõe Ampliar/Remover fundo/Variação inline em cada item da galeria (`APP_ACTIONS` → `studio-edit`), além do canvas. O gap-analysis da Pupila marcou "parcial" por engano. Só padronizado o rótulo Upscale→Ampliar.
5. ~~**E4 — Biblioteca de assets**~~ ✅ (2026-07-07) — página **Biblioteca** no Brand Studio (`/studio/biblioteca`, `StudioLibrary.jsx`): grid de mídia/arquivos (peças salvas do Studio + uploads; cor/tipografia ficam no Brand Book), **pastas** (chips + contagem, free-solo), **tags** (#filtros) e **busca** (nome/descrição/tag/pasta). Dialog "Organizar" por asset; preview de imagem/vídeo (hover-play)/SVG inline; baixar/excluir. Migration `032` (pasta + tags[]) aplicada. Validado no browser. *(Evolução: ver "Stock assets" em Ideias.)*
6. ~~**P4 — painel de memória como material comercial**~~ ✅ (2026-07-07) — IA LOUDR ganhou: banner-narrativa com números reais (desde {data}, N evidências → M versões → aprendizados ativos → confiança início→hoje), delta de confiança desde a v1 (▲/▼ pts), "última janela" de aprovação (metricas por versão) e contagem de aprendizados ativos. **Sem export PDF por decisão do Danilo — prova viva é na tela.**
7. **Dogfooding competitiva** — cadastrar a **Pupila** como concorrente no Posicionamento do workspace LOUDR (diagnóstico + clipping + cérebro). ~10 min.

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
- **Editor de texto sobre imagem (estilo Canva)** — overlay de tipografia na plataforma para fechar a peça sem sair do LOUDR. Danilo: "não é o momento ainda" (2026-07-07). Por ora, texto = pós-produção do time criativo guiada pelo bloco "Sugestão de imagem".
- **Nurturing emails** (D+2, D+5, D+10, D+15) — jornada de ativação por e-mail.
- **F07b — Search Listening** — análise de busca orgânica (além do social).

## 🧹 Higiene técnica

- **Sinais órfãos** — 14 sinais `diagnostic` com `brand_id NULL` (workspaces sem marca) nunca serão consumidos: limpar + guard no trigger (`if v_brand is not null`).
- **supabase CLI** — atualizar 2.106 → 2.109 (aviso recorrente).

---

**Regra de manutenção:** tarefa nova entra aqui (não em outro doc); ao concluir, marcar ✅ com data e mover contexto relevante para a spec da feature. Os demais docs (`plano-de-melhoria`, `specs/*`) são estratégia e especificação — não listas de tarefas.
