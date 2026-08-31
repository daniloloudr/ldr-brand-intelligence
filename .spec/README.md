# .spec — Documentação do brandcode (LOUDR)
### O mapa: um documento por assunto, zero papel espalhado · organizado 2026-07-12

| Documento | O que é | Quando abrir |
|---|---|---|
| **[backlog.md](backlog.md)** | ⭐ **CANÔNICO** — todas as tarefas, por horizonte (H1 provar → H2 rede → H3 categoria), com tamanho, gatilho e decisões | toda decisão de "o que fazer agora" |
| **[visao.md](visao.md)** | Visão, tese de negócio e arquitetura conceitual (north star, dois cérebros, flywheel, estratégia de modelo RAG→SLM, fundamentos não-negociáveis) | pitch, onboarding de sócio/dev, decisão de rumo |
| **[produto.md](produto.md)** | A spec master do produto + **changelog** de tudo que foi construído (a história técnica, versão a versão) | entender como algo foi feito e por quê |
| **[precificacao.md](precificacao.md)** | Modelo de créditos, planos, margem, break-even (custos de insumos em [`custos.csv`](custos.csv)) | pricing, proposta comercial |
| **[pitch-deck.md](pitch-deck.md)** | Deck master de negócio (16 slides) | montar apresentação de venda/captação |
| **[pitch-tecnologia.md](pitch-tecnologia.md)** | Deck de tecnologia: diagrama de camadas, flywheel, embeddings/RAG, dataset, rota SLM, infra | slide técnico, diligência de investidor |
| **[pitch-futuro.md](pitch-futuro.md)** | O discurso do modelo de futuro: arco Hoje → Em breve → Futuro, cada claim ancorado no que já existe | slide de roadmap/visão, captação |
| **[deck-retail.md](deck-retail.md)** | Deck de VENDA retail (15 slides + apêndice): master p/ Hering e Worten, com variantes [HERING]/[WORTEN] e notas de apresentação | apresentar p/ Hering (Rafael) e pitch Worten vs modelo agência |
| **[nucleo-ia.md](nucleo-ia.md)** | ⚠️ **As regras do núcleo de inteligência** — os 11 arquivos onde um descuido vira afirmação falsa sobre a marca de um cliente, as quatro leis com o defeito que originou cada uma, e o processo (`npm run guarda`, hook de pre-commit, avaliação ao vivo) | **antes de tocar qualquer arquivo com LLM plugada** |
| **[compliance.md](compliance.md)** | Dossiê de compliance & confiança (frente Fullsix 1): cadeia de provedores verificada, isolamento, certidão do asset, IP, LGPD + pendências internas (§7) | procurement/jurídico de cliente · pré-pitch Worten |

## features/ — specs de implementação

| Spec | Cobre |
|---|---|
| [brand-intelligence.md](features/brand-intelligence.md) | O cérebro: sinais, destilação, modelo vivo, dataset, RAG |
| [estudio.md](features/estudio.md) | ⭐ **v2 (31/08/2026) — canônica.** O Estúdio: peça/versão, execução, juiz, fluxos versionados, agentes e o Copiloto como camada. Substitui a v1, que desceu para `arquivo/studio-v1-2026-08-31.md` |
| [nova-arquitetura.md](features/nova-arquitetura.md) | Árvore Strategy·Intelligence·Studio·Copilot — de-para e decisões |
| [diagnostico.md](features/diagnostico.md) | Diagnóstico de marca (próprio e de concorrentes) |
| [mcp-cerebro.md](features/mcp-cerebro.md) | Plano MCP (Figma/Canva) — aprovado, aguardando "vai" |
| [piloto-hering.md](features/piloto-hering.md) | Piloto Hering: F0 (fix + mapa de modelos de fidelidade + custos) e protocolo do pilotinho |

## arquivo/ — histórico (não apagar, não atualizar)

- [plano-de-melhoria-2026-07-06.md](arquivo/plano-de-melhoria-2026-07-06.md) — o plano P1–P5 pós-VHITA (executado; partes vivas absorvidas na visao.md §10–11)
- [prompt-agente-loudr-os-v4.md](arquivo/prompt-agente-loudr-os-v4.md) — prompt de sessão v4.3 (era "LOUDR OS", pré-cérebro — peça de museu)

---

**Regras da casa:**
1. Tarefa nova → `backlog.md`. Decisão de produto → `backlog.md` (seção do tema) ou spec da feature. História do que foi entregue → changelog do `produto.md`.
2. Antes de criar documento novo, pergunte: isso não é uma seção de um dos seis acima?
3. Documento que virou histórico desce para `arquivo/` com data no nome — nunca se apaga contexto.
