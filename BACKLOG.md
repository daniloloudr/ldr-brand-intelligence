# BACKLOG — LOUDR (único e canônico)

> **Este é o documento de tarefas.** Ordenado por importância ao negócio, de cima para baixo.
> Contexto/estratégia: `plano-de-melhoria.md` · Visão: `specs/visao-loudr.md` · Spec completa: `specs/specs.md` · Camada de Inteligência: `specs/features/brand-intelligence.md`
> Atualizado: 2026-07-06

---

## 🔴 Agora — valor direto de venda

1. **Deploy: merge `dev → main`** — 11 commits validados (cérebro como camada completa: `_brain.js`, flywheel, dataset, painel Cérebros, enriquecimento). Validar na UI antes: `#/admin` → Cérebros · IA LOUDR (série de aprovação + território) · Content Hub on-brand.
2. **E1 — Writing Room on-brand** *(porta do P1)* — superfície de copy de marketing (legenda, headline, carrossel, roteiro de reel, copy de anúncio) injetando o cérebro (voz aprendida + território + temas) e emitindo sinal de adoção. **Com FRAMEWORKS prontos por formato** — estruturas guiadas em vez de prompt em branco (insight BrandsDecoded: o que vende é o framework, não o gerador). Consumidor E produtor de inteligência.
3. **E2 — P1: loop de criativo on-brand** *(killer app)* — "criativo vencedor → entende a lógica → N variações on-brand" com o cérebro como referência. **Extensão creative testing:** performance real (Meta Ads / biblioteca de ads — pedido da Raquel/VHITA) como o sinal mais valioso do dataset.

## 🟠 Próximo — fortalece produto e pitch

4. **E3 — Edit & Enhance na galeria** — apps Ampliar/Remover fundo/Variação já existem (nós do Workflow); expor com 1 clique na página Imagem/galeria. Neutraliza a demo da Pupila.
5. **E4 — Biblioteca de assets** — `brand_assets` já grava (canvas/campanhas, upload no Brand Book); falta organização: pastas, tags, busca. *(Evolução: ver "Stock assets" em Ideias.)*
6. **P4 — painel de memória como material comercial** — afiar IA LOUDR como prova viva (a série de aprovação por versão já é argumento de venda).
7. **Dogfooding competitiva** — cadastrar a **Pupila** como concorrente no Posicionamento do workspace LOUDR (diagnóstico + clipping + cérebro). ~10 min.

## 🟡 Depois — fundação e escala

8. **Dataset: export de fine-tune** — JSONL por tenant a partir de `brand_dataset` + critérios de qualidade/dedup. Gatilho: volume de exemplos crescendo.
9. **Isolamento por tenant** — backup/versionamento por cérebro, zero vazamento entre marcas. Gatilho: contas crescendo.
10. **Cérebro como serviço próprio** — fila/estado durável fora do teto do Netlify (fronteira já pronta no `_brain.js`). Gatilho: volume.
11. **Stripe live + recarga avulsa de créditos** — cobrança real (test mode já validado).
12. **Cron enterprise diário** — `cron-monitor` roda só segunda 8h; enterprise pede diário (agendamentos por plano).
13. **AppShell: tela de workspace inativo** — quando `workspace.ativo=false`, mostrar tela de inativo em vez do app.

## 🔵 Ideias anotadas — decisão futura (não correr agora)

- **Trial self-service** — Pupila tem; LOUDR é invite-only por decisão. Reavaliar quando modelo comercial/pricing estiver validado. *(Anotado 2026-07-06 a pedido do Danilo.)*
- **Stock assets como base de referências** — incorporar Shutterstock/iStock (ou similar) como acervo, com o **cérebro buscando tipos de referência on-brand** (preferências visuais aprendidas → query na API de stock → referências para o Studio/i2v). Avaliar licenciamento e custo por asset. *(Ideia do Danilo, 2026-07-06.)*
- **Nurturing emails** (D+2, D+5, D+10, D+15) — jornada de ativação por e-mail.
- **F07b — Search Listening** — análise de busca orgânica (além do social).

## 🧹 Higiene técnica

- **Sinais órfãos** — 14 sinais `diagnostic` com `brand_id NULL` (workspaces sem marca) nunca serão consumidos: limpar + guard no trigger (`if v_brand is not null`).
- **supabase CLI** — atualizar 2.106 → 2.109 (aviso recorrente).

---

**Regra de manutenção:** tarefa nova entra aqui (não em outro doc); ao concluir, marcar ✅ com data e mover contexto relevante para a spec da feature. Os demais docs (`plano-de-melhoria`, `specs/*`) são estratégia e especificação — não listas de tarefas.
