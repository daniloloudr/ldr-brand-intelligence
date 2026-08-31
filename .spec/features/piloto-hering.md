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

## F0.6 ✅ 2026-08-21 — O PROCESSO, em 4 etapas

Fechado pelo Danilo depois de três dias no KH6V. Cada etapa nasceu de um defeito
que custou rodada — é receita de produção, não teoria.

| # | Etapa | Entradas | Modelo | Por que assim |
|---|---|---|---|---|
| **0** | **Base de casting limpa** — 3 versões da modelo sem os adereços de roupa dela, em malha colada ao corpo (segunda pele) | casting aprovado | **nano banana 2.5** | foca em pessoa/casting; é o que impede a roupa do casting de vazar na peça |
| **1** | **Primeira imagem inteira** — corpo inteiro com acessórios e a peça em caimento real; depois N versões fiéis | base limpa + still + acessórios | **Seedream 5.0** | fidelidade de peça |
| **2** | **Poses diferentes** — só muda o ângulo fotográfico | **referência de POSE** + **as imagens já aprovadas da modelo com a peça** + referência do produto | Seedream 5.0 | a saída aprovada vira entrada: qualidade compõe |
| **3** | **Costas** | versão da modelo de costas + still de costas | Seedream 5.0 | — |
| **4** | **Fotos livres** | as fotos que **deram certo** + novas poses + a peça | Seedream 5.0 | — |

**A regra que vale em TODAS as etapas** — a divisão de trabalho entre os nós:

> **CONTEXTO** = o que é constante: **visão de câmera e ângulo** + **descrição da
> peça**. · **PROMPT** = específico por foto.

**Dois princípios que valem além da Hering:**
1. **Modelo diferente para trabalho diferente.** Nano banana para pessoa,
   Seedream 5 para fidelidade de peça. Não existe "o melhor modelo" — existe o
   melhor para a etapa.
2. **A saída aprovada vira entrada da etapa seguinte** (etapas 2 e 4). É o mesmo
   mecanismo que a Worten pediu como "estrela / cânone" — aqui ele aparece por
   necessidade de produção, não por pedido de cliente.

**Distância entre o processo e o fluxo de hoje** (o que falta construir):
- [ ] etapa 0 não usa nano banana: as bases limpas atuais saíram de outros modelos
- [ ] etapa 2 **não tem referência de pose** nem consome as imagens aprovadas —
      hoje vai direto de base + still, e a pose vem só do texto
- [ ] etapa 4 não existe no fluxo
- [ ] o contexto ainda não traz **visão de câmera e ângulo** de forma sistemática
      (entrou por prompt, caso a caso)

## F1 — próximo (depois do pilotinho)

Fluxo "Guia de Compras" com **juiz de fidelidade** = o nó Diretor de Arte (F2 ✅ entregue)
com `criterio` de fidelidade: *"compare com a foto original (referência); reprove se estampa,
texto, cor ou modelagem divergirem"* — o parâmetro `criterio` já existe no `art-review.js`.
Falta: o portão receber DUAS imagens (original + gerada) para comparação direta — evolução
pequena do art-review (aceitar `reference_url`).

---

## F4 — os 7 ajustes da reunião (31/ago/2026)

Lista trazida pelo Danilo depois da reunião com a Hering, triada contra o código
no mesmo dia. A fila e os tamanhos estão no `backlog.md` § Piloto Hering; aqui
fica o que se mediu, para não se remedir.

### 4 + 6 são o mesmo defeito — e o 6 é o instrumento que teria mostrado o 4

O pedido 4 ("o sapato não pegou") e o pedido 6 ("ver o que entra em cada nó")
chegaram como coisas diferentes. São o mesmo lugar:

```js
// src/pages/app/studioNodes.jsx:513
const MAX_REF = 5

// src/pages/app/StudioCanvas.jsx:469
const references = imageUpstreamsOf(g.id).flatMap(u => toUrls(outputs[u.id])).slice(0, MAX_REF)
```

O `.slice(0, MAX_REF)` **não avisa**. Passou de cinco, o excedente some entre o
canvas e o fal, e a geração acontece normalmente — sem erro, sem tarja, sem nada
no nó. A conta do brief do KH6V já fecha o teto: base de casting + still frente +
still costas + bolsa + calçado = **5**. O processo de 4 etapas (F0.6) soma
referência de pose e a imagem já aprovada da modelo: **7**.

E a ordem das referências é a **ordem das conexões** (`imageUpstreamsOf`, corrigido
em 14/jul justamente porque antes era a ordem do array de nós). Ordem de conexão é
histórico de edição: não aparece em lugar nenhum da tela. Então o acessório
conectado por último é o primeiro a cair, e é invisível que caiu.

O nó Imagem hoje mostra **modelo, custo em créditos e a saída** (`GenerateNode`,
`studioNodes.jsx:156`). Não mostra: quais referências entraram, em que ordem,
se a marca está ligada, o que o nó Contexto acrescentou, nem o prompt que foi
realmente enviado — ele é composto no servidor (`studio-generate.js`: prefixo do
cérebro + `[PEDIDO]` + `[CONTEXTO ADICIONAL]` + `[FORMATO]`), gravado em
`studio_generations.prompt_final` e **nunca devolvido à tela**.

> A lição é a mesma da auditoria da escuta: *o dado existia e ninguém estava
> olhando para ele*. `prompt_final` e a lista de referências já estão gravados por
> geração. O trabalho do 6 é mostrar, não coletar.

**O limite é NOSSO, e é inventado.** `MAX_REF = 5` é constante nossa, aplicada
igual para todo modelo. Não existe teto por modelo em lugar nenhum do código: o
catálogo (`src/lib/studioModels.js`) só sabe `refs: true|false` — se o modelo
aceita referência, não quantas. Hoje impomos o mesmo 5 ao Seedream, ao Nano
Banana e ao GPT Image 2, que têm tetos diferentes e maiores.

⚠️ **Mas subir a constante não é o conserto sozinho.** Os tetos reais precisam ser
conferidos na doc do fal, modelo a modelo, e virar dado do catálogo (`maxRefs` por
linha) — senão troca-se truncamento silencioso por 422 do provedor. E, com teto
certo ou errado, **o excedente tem que virar aviso no nó**: o que mordeu a Hering
não foi o número 5, foi o silêncio.

### 5 — o delete que não deleta: uma prop, e ela é de teclado

**Meu primeiro diagnóstico estava errado, e vale registrar por quê.** Ao ler
"delete de contexto" fui procurar exclusão de contexto de marca, achei que
`BrandIntelligence.jsx` não tem nenhum caminho de exclusão, e reportei isso. O
Danilo corrigiu com o que a cliente de fato fez: **clicou num nó, tentou apagar a
linha que liga dois nós, e não conseguiu — no Windows.**

Achado é outro, e é de uma linha:

```jsx
// src/pages/app/StudioCanvas.jsx:927 — a prop deleteKeyCode nunca é passada
<ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} ... fitView />
```

Sem a prop, vale o default do `@xyflow/react@12.11.1`: **`deleteKeyCode = 'Backspace'`**,
e só ele. Daí a assimetria exata do relato:

| | tecla que o usuário aperta | o que ela emite | resultado |
|---|---|---|---|
| Mac (Danilo) | a tecla grande, **rotulada `delete`** | `Backspace` | ✅ apaga |
| Windows (a cliente) | a tecla **`Delete`**, que é separada | `Delete` | ❌ nada |

No Mac a tecla que diz "delete" emite Backspace, então funciona por coincidência
de rótulo. No Windows existem as duas teclas, e a que diz `Delete` é a que a
pessoa aperta primeiro.

**E não há saída pelo mouse.** Nó tem botão de excluir no `NodeToolbar`
(`studioNodes.jsx:53`); **conexão não tem nada** — sem `onEdgeClick`, sem
`onEdgeContextMenu`, sem botão na aresta. Então no Windows não existe caminho
nenhum para apagar uma linha: nem teclado, nem mouse. Não é "complicado de
achar", é ausente.

O conserto é `deleteKeyCode={['Backspace', 'Delete']}`. A afordância de mouse na
aresta é a pergunta seguinte, e é maior — mas o desbloqueio da cliente é a prop.

> **O que fica de aprendizado:** um relato de cliente chega traduzido, e a
> tradução ("delete de contexto") apontou para o lugar errado. O que localizou o
> defeito não foi ler mais código — foi a frase *"ela usa Windows, pra mim
> funciona"*. Assimetria de ambiente entre quem relata e quem testa é o dado mais
> informativo do relato, e foi o que eu não pedi.

**A outra coisa segue aberta, e não é esta.** `brand_intelligence` realmente não
tem caminho de exclusão na interface — é o § "o que a limpeza NÃO desfaz" do
`nucleo-ia.md`, decisão aberta desde 24/ago. Continua valendo; só não é o que a
Hering pediu.

### 2 + 3 — cor e detalhe construtivo: uma hipótese a medir antes de mexer

O processo de 21/ago já responde boa parte por **escolha de modelo** (Seedream 5
Pro leu a peça com fidelidade que 4.5, nano banana e flux não tiveram). O que o
código acrescenta, e ainda não foi medido:

Com foto de produto conectada, `use_brand` **continua ligado por padrão**
(`studio-generate.js`: `body.use_brand !== false`) e a faceta visual injeta a
paleta e a estética da marca no prompt, à frente do pedido. É instrução de paleta
de marca competindo com a cor real da peça que está na referência.

**Isto é hipótese, não achado.** O ensaio que decide é barato: mesma peça, mesmo
modelo, mesmas referências, `use_brand` ligado × desligado — e comparar contra a
foto original com o `art-review` em `modo: 'fidelidade'`, que já existe e já foi
validado. Se confirmar, a regra provável é *referência de produto conectada ⇒ a
faceta visual sai do prompt*, e não uma frase nova mandando obedecer a cor.

Vale lembrar o que o KH6V já ensinou e vale igual aqui: **modelo de imagem não
obedece negação.** "Não altere a cor" injeta o conceito de alterar cor. Se o
conserto for por prompt, é por remoção de instrução concorrente, não por adição.

### 7 — linha infantil: o portão vem antes do produto

Eu tinha escrito que este era o item estrutural — falta de dimensão de linha no
cérebro. **Isso é verdade e continua verdade, mas é o segundo problema.** O
Danilo levantou o primeiro (31/ago): geração de imagem de criança pode estar
barrada antes de ser feature, por dois motivos que não se resolvem com código.

**(a) Política de provedor.** Provedores de imagem tratam pessoa menor de idade
como categoria sensível, e a política é do provedor **e** de cada modelo por
baixo dele — não é uma só. O nosso catálogo é aberto (`_image.js`: "o model id
vem por request"), então a resposta pode ser diferente por modelo do seletor. Um
modelo que recusa é o caso bom; o caso ruim é o que **não recusa e degrada** —
gera algo com proporção de adulto reduzida, que é exatamente o defeito que a
Hering relatou, e que a gente leria como bug de fidelidade em vez de limite de
política.

**(b) Publicidade infantil.** Peça de linha infantil é publicidade dirigida a
criança, e isso é território regulado no Brasil — com regra própria de
autorregulamentação publicitária, e mais atrito ainda quando a imagem da criança
é **sintética**. Não é matéria que eu resolva lendo código, e não é detalhe de
implementação: muda se o produto pode gerar, o que precisa estar declarado, e de
quem é a responsabilidade pela peça.

**Portão antes de qualquer código — três respostas:**

1. o que a política do fal e a de cada modelo do nosso catálogo dizem sobre
   geração de menores (e qual o comportamento real: recusa ou degrada);
2. o que a regulação de publicidade infantil exige de peça com criança, inclusive
   sintética — pergunta de jurídico, não de engenharia;
3. o que a **Hering já pratica hoje** na linha infantil: eles usam modelo
   infantil real, ilustração, só still de produto? A resposta deles pode dispensar
   a pergunta inteira — still de peça infantil sem criança na imagem não tem nada
   disso.

**Só depois disso** o problema volta a ser o que eu tinha achado: não existe
dimensão de categoria de produto no modelo de dados. `brands` tem `setor` e
`porte` (`005_setup_completo.sql`); `resolveBrandIntelligence` corta o contexto
por **faceta** (`verbal` / `visual`), nunca por linha. O cérebro aprende de toda
peça aprovada do workspace e devolve a mesma memória para adulto e infantil, e
por isso "não aplicar padrões aprendidos com peças adultas" não tem hoje por onde
ser dito — não é regra faltando no prompt, é coluna faltando no aprendizado. Isso
vale para toda marca com mais de uma linha, não só a Hering.

**A ordem importa:** se o portão (3) disser "still de produto, sem criança", o
item encolhe para a dimensão de linha no cérebro e perde o risco todo. Medir a
pergunta certa antes de construir é o mesmo aprendizado da auditoria da escuta.
