# Piloto Hering — Guia de Compras com Imagem Fidedigna
### F0 executada em 2026-07-12 · contexto completo: memória `hering-pilot` + `.spec/backlog.md` § Piloto Hering

**A dor (Rafael Passos, dir. digital, call 09/07):** ciclo invertido → showroom antecipado 4 meses;
o guia de compras precisa de imagem fidedigna de produto que ainda não existe fisicamente
(só foto simples no cabide + ficha técnica). Depois: manequim fantasma, troca de modelo (A/B),
close — em escala, API no futuro.

---

## F0.1 ✅ — o "errinho" da call

O erro que o Danilo viu ao abrir a área de referências era **chunk morto pós-deploy**
(páginas lazy + deploy novo com aba antiga = `Failed to fetch dynamically imported module`).
Corrigido no `ErrorBoundary`: erro de chunk agora **recarrega a página sozinho**
(guarda anti-loop 30s), com tela "Atualizando o app…". Beneficia todo cliente, em todo deploy.

## F0.2 ✅ — o mapa de modelos de fidelidade (fal.ai)

| Papel no guia | Modelo (fal) | Custo/imagem | Por quê |
|---|---|---|---|
| **Troca de modelo (try-on)** ⭐ | `fal-ai/fashn/tryon/v1.6` | **$0,075** | ESPECIALIZADO: veste a peça REAL num modelo — aceita foto flat-lay/cabide E on-model; "renderiza texto e padrões com precisão" (o teste da jaqueta de zodíaco); 864×1296. Determinístico ≫ prompt genérico |
| **Still fiel / ghost mannequin / close** | `fal-ai/gemini-25-flash-image/edit` (Nano Banana) | **$0,039** | edição localizada por instrução, JÁ integrado (é o nosso default); barato p/ lote |
| **Still fiel premium (texto/cor críticos)** | `openai/gpt-image-2/edit` | $0,07–0,19 (médio) · até $0,41 4K | melhor render de texto e fidelidade de cor do mercado; edit sempre processa a referência em alta fidelidade. JÁ integrado |
| Alternativas no catálogo | `seedream/v4.5/edit` · `flux-2-pro` | ~$0,03–0,08 | duelo de fidelidade quando houver peças reais |

**Custo por PRODUTO no guia (4 saídas: still + fantasma + modelo + close):**
≈ **$0,19–0,35** ≈ **R$1,10–2,00** (câmbio 5,7) — contra R$50–300/peça de foto de estúdio
tradicional. Mesmo com margem de créditos ×3, o argumento de venda é esmagador.
(Mercado confirma a ordem: ferramentas de ghost mannequin cobram <$1/imagem vs $5–25 do manual.)

~~Nota de integração~~ ✅ 2026-07-12 — FASHN integrado: catálogo (grupo Especializados),
schema próprio no `_image.js` (1ª referência = modelo, 2ª = peça), nó Gerar dispensa Prompt
no try-on. **Teste real:** jaqueta de zodíaco vestida num modelo neutro, ~90% de fidelidade
(texto da barra perdido por oclusão; escorpião levemente reposicionado) por $0,075.
**Juiz de fidelidade** ✅: `art-review` com `modo: 'fidelidade'` + `reference_url` compara
gerada vs original (texto letra a letra, estampa, cores) ignorando a estética do workspace —
validado: apontou exatamente as divergências da análise humana. Fluxo pronto:
"Hering — Vestir Modelo (FASHN Try-On)" (portão em modo fidelidade com a peça como referência).

## F0.3 🔜 — o pilotinho (gatilho: Rafael marcar)

Protocolo do teste de fidelidade (fluxo "Piloto Hering" já montado no Fluxos):
1. 3–5 peças reais (foto cabide + ficha técnica) fornecidas pela Hering;
2. Cada peça roda o still fiel em **3 modelos** (Nano Banana × GPT Image 2 × Seedream) —
   duelo de fidelidade com voto do time de marca deles;
3. Troca de modelo roda no **FASHN try-on** (a aposta especializada);
4. Critérios de aprovação (o que o juiz de fidelidade automatizará na F1): estampa idêntica ·
   texto legível letra por letra · cor exata · botões/costuras · caimento plausível;
5. Saída: matriz modelo × critério + custo/peça medido → vira a proposta comercial.

## F1 — próximo (depois do pilotinho)

Fluxo "Guia de Compras" com **juiz de fidelidade** = o nó Diretor de Arte (F2 ✅ entregue)
com `criterio` de fidelidade: *"compare com a foto original (referência); reprove se estampa,
texto, cor ou modelagem divergirem"* — o parâmetro `criterio` já existe no `art-review.js`.
Falta: o portão receber DUAS imagens (original + gerada) para comparação direta — evolução
pequena do art-review (aceitar `reference_url`).
