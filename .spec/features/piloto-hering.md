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

## F0.4 ✅ 2026-08-19 — o teste de fluxo real (KH6V) e o caminho que fechou

**O brief (e-mail do time da Hering):** camiseta KH6V — 2 stills (frente/costas), 3 castings de
modelo IA aprovados pelo Marketing, referências de bolsa e calçado, **3 imagens** (plano inteiro ·
aproximada · costas), **1920×2720**, fundo **#F2F2F2**, **até 350 KB**.

**O CAMINHO APROVADO — os dois juntos, nenhum sozinho:**

1. **Base de casting limpa** (ideia do Danilo). O casting aprovado traz a modelo vestindo OUTRA
   peça, e detalhes dela vazam para a geração — no KH6V foi a fenda lateral da regata, que
   reaparecia numa camiseta de barra reta. Nenhuma instrução resolveu: **modelo de imagem não
   obedece negação** ("sem corte lateral" injeta o conceito). A solução é remover o dado, não
   negá-lo: gerar uma base neutra da mesma modelo — mesma pose, mesma calça, mesmo calçado,
   mesma bolsa, top liso — e usar ESSA como referência de pessoa. Medido: 3/3 fiéis, barra reta,
   identidade preservada. Reforço de prompt necessário: *"malha lisa e uniforme, sem ponto, sem
   relevo, sem trama visível"* (a primeira base saiu com piquê sutil).
2. **Seedream 5.0 Pro** como modelo de geração (`bytedance/seedream/v5/pro/text-to-image`).
   Leu a peça com fidelidade que 4.5, nano banana e flux não tiveram.

⚠️ **A base é gerada, então tem risco de deriva de identidade.** Conferir cada base contra a foto
original ANTES de usar — erro ali contamina tudo a jusante. Mesmo raciocínio da imagem-âncora.

**PENDÊNCIAS DA ENTREGA (não do método):**

| item | situação |
|---|---|
| **1920×2720** | o Seedream 5 Pro tem teto de ~4,19 MP e devolve **1720×2432 sem avisar**. Fecha com um nó **Ampliar** antes do Recortar (só 12% — trivial para upscaler) |
| **350 KB** | ✗ sem garantia. O nó Recortar grava webp q92 **sem alvo de peso**; a geração de referência saiu com 359 KB, já estourando, e o upscale aumenta. Hoje é conferência manual |
| biblioteca de bases neutras | não construída — vira pré-requisito se o volume for alto |

**PERGUNTAS ABERTAS COM O CLIENTE** (levantadas 19/08, mudam o que se constrói):
1. **A base de casting regerada continua aprovada?** O Marketing aprovou 3 fotos específicas; a
   base é uma imagem nova da mesma modelo. Se cada base precisar de aprovação, vira passo do
   processo; se aprovarem a modelo como *personagem*, não vira.
2. **1920×2720 e 350 KB são rígidos?** Os dois brigam entre si nessa resolução. Serve 1720×2432
   nativo? O peso é limite de CMS ou hábito? JPG é aceito?
3. **Volume, cadência e poses.** 3 imagens de piloto e 200/semana pedem coisas diferentes — com
   volume, biblioteca de bases e alvo de peso deixam de ser refinamento.

## F1 — próximo (depois do pilotinho)

Fluxo "Guia de Compras" com **juiz de fidelidade** = o nó Diretor de Arte (F2 ✅ entregue)
com `criterio` de fidelidade: *"compare com a foto original (referência); reprove se estampa,
texto, cor ou modelagem divergirem"* — o parâmetro `criterio` já existe no `art-review.js`.
Falta: o portão receber DUAS imagens (original + gerada) para comparação direta — evolução
pequena do art-review (aceitar `reference_url`).
