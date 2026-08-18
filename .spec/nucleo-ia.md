# O núcleo de inteligência — regras de manutenção

> Escrito em 18/08/2026, depois de um relatório de outra empresa ser entregue a
> um cliente. Os primeiros clientes entram esta semana. Este é o pedaço do
> produto que não pode errar em silêncio.

## O que é o núcleo

Os arquivos onde uma alteração descuidada vira afirmação falsa sobre a marca de
um cliente:

| arquivo | papel |
|---|---|
| `_ai.js` | toda chamada de LLM passa aqui — modelos, tiers, leitura da resposta |
| `_identidade.js` | quem está sendo analisado; a guarda |
| `_prompt.js` | o system prompt do diagnóstico |
| `_diagnostico.js` | geração compartilhada (própria marca + concorrentes) |
| `diagnostico-gerar-background.js`, `diagnostico-gerar.js`, `cron-monitor.js` | os três caminhos que gravam diagnóstico |
| `listening-coletar-background.js`, `_google.js` | a coleta de percepção |
| `_brain.js` | a destilação — o que entra aqui é permanente |

## As quatro leis

Saíram de defeitos reais, cada um com nome e data. Não são preferências.

### 1. Quem é o sujeito é ENTRADA, nunca saída do modelo

O diagnóstico recebia `ws.nome || ws.dominio` e mandava só `"Pixel"` ao modelo.
O domínio `pixelretail.com.br` era carregado na linha seguinte e nunca chegava ao
prompt. "Pixel" é nome de dezenas de agências: o modelo pesquisou, pegou a Pixel
Agência Digital (`agenciapx.com`) e diagnosticou ela. Depois o registro gravou
`empresa: parsed.empresa` — **a resposta sobrescreveu quem era o cliente**, e não
sobrou no dado nenhum vestígio de que era para ser outra empresa.

O relatório ainda escreveu que *"o nome Pixel é compartilhado por múltiplas
agências no Brasil"*. O modelo percebeu a ambiguidade, escolheu errado assim
mesmo, e vendeu o erro como achado.

- O domínio vai SEMPRE ao modelo (`alvoDoDiagnostico` + `instrucaoDeIdentidade`).
- A identidade gravada vem da entrada (`identidadeParaGravar`).
- `conferirIdentidade` roda antes de gravar. Recusou, não grava.

Note a inversão deliberada em relação à escuta: para **achar menção** procura-se
pelo NOME (ninguém escreve URL num post); para **identificar qual empresa**, só o
DOMÍNIO é não-ambíguo. Consertar um lado sem olhar o outro foi como este bug
sobreviveu.

### 2. A resposta do modelo é lida inteira

`callAI` fazia `content.find(b => b.type === 'text')` — **um** bloco. Com busca
web ligada a Anthropic pica a resposta em um bloco por trecho citado: medido, 37
blocos, 30+ de texto. O chamador recebia o primeiro fragmento como resposta
inteira. Só mordia em produção, porque em dev o tier `standard` desliga a busca e
a resposta volta em bloco único.

### 3. Coletor sem acesso ao mundo não coleta — alucina

A escuta rodava com o tier que desliga busca em dev. Modelo sem como pesquisar
não recusa: descreve o que uma marca daquele ramo *costuma* receber. A PES ganhou
9 queixas de cancelamento que ninguém escreveu, gravadas como inteligência de
marca. 122 eventos inventados ainda estão no banco de outras marcas.

**Não existe modo degradado aceitável num coletor.** Sem chave, para e alerta.
Falha de busca nunca vira "a marca não teve barulho esta semana".

### 4. A URL vem do índice, nunca do modelo

Pedir o link ao modelo é pedir um link plausível. A URL sai do bloco
`web_search_tool_result`; o trecho sai da `citation` verbatim. Quem classifica
roda **sem ferramenta de busca** — não pode trazer o que a busca não trouxe.

## Escolha de modelo — medida, não achada

A/B de 4 rodadas no caso difícil (Pixel, nome ambíguo), 18/08/2026:

| | identidade | tempo | pensou | US$/diagnóstico |
|---|---|---|---|---|
| sonnet-4-6 (×2) | ✅ ✅ | 254s / 299s | 0 | **0,454 / 0,501** |
| sonnet-5 (×2) | ✅ ✅ | 267s / 337s | 9.429 / 12.427 | **1,287 / 1,142** |

Os dois acertam a empresa — quem resolveu a Pixel foi a guarda de identidade,
não o modelo. O 5 custa 2,6× por fazer raciocínio adaptativo, e é mais
consistente entre rodadas (as duas convergiram no mesmo enquadramento; as do 4-6
divergiram). Por isso: **4-6 principal, 5 como reserva** — a reserva é melhor,
não pior, e só é cara quando é usada.

Ressalva registrada: n=2 por modelo é indício, não prova.

`MODELS_RESERVA` mapeia principal → reserva. `valeTentarReserva(status)` limita
a troca a 429/500/502/503/504/529/408 — capacidade, indisponibilidade e timeout.
400 e 401 ficam de fora: pedido malformado e chave errada falham igual no outro
modelo, e repetir mascara o erro real.

**Reserva não ligada é reserva que não existe.** Os chamadores precisam repassar
`modeloReserva`; há teste e mutação para isso, porque a primeira versão do teste
passou despercebida por casar com a linha da desestruturação em vez da chamada.

## O processo — quem pode mexer, e como

> "Não dá pra todas as operações atuarem nos arquivos que tem LLM plugada."
> — Danilo, 18/08/2026

Em um único dia, mudanças feitas de passagem em arquivos com LLM plugada
produziram: um relatório da empresa errada entregue a um cliente, o `callAI`
devolvendo um fragmento como resposta inteira, o diagnóstico estourando o teto
sem escrever nada, e a busca perdendo as citações. **Nenhuma foi imprudente
isoladamente — todas foram "só um ajuste".**

Por isso o núcleo tem porteiro, não só documentação:

```
npm run guarda:instalar   # uma vez por clone — instala o hook de pre-commit
npm run nucleo            # lista o que é protegido e se o hook está ativo
```

Ao commitar qualquer um dos 11 arquivos do núcleo, o hook roda a suíte e a
varredura de mutação e **bloqueia se algo reprovar**. Depois lembra, na tela, de
rodar a avaliação ao vivo antes do deploy.

**As regras:**

1. **Mudança no núcleo é sempre mudança deliberada.** Não entra de carona em
   commit de outra coisa. Se um refactor amplo precisa tocar o núcleo, separe em
   dois commits — o do núcleo com a justificativa por escrito.
2. **Todo defeito que escapar vira mutação.** Em `tests/guarda/mutacao.mjs`,
   junto com o teste que o pega. A lista só cresce; ela é a memória do que já
   deu errado.
3. **Teste do núcleo se ancora no ponto exato, nunca no arquivo inteiro.**
   Um teste que casa `/alvoDoDiagnostico\(alvo\)/` no arquivo apodrece sozinho
   no dia em que outra linha passa a usar a mesma expressão — foi o que
   aconteceu quando o rastreio de custo entrou, e a varredura pegou.
4. **Antes de subir: `npm run guarda:ao-vivo`.** A suíte prova o arredor; só a
   avaliação ao vivo diz se o modelo está alucinando.
5. **`--no-verify` existe, mas fica no histórico.** Se pulou a guarda, diga por
   quê no commit.

## Antes de qualquer deploy que toque o núcleo

```
npm run guarda            # suíte + varredura de mutação (obrigatório)
npm run guarda:ao-vivo    # chama a API de verdade (~US$ 0,20, minutos)
```

`npm run guarda` reintroduz cada defeito conhecido e verifica se a suíte fica
vermelha. **Qualquer "PASSOU DESPERCEBIDA" bloqueia o deploy.**

Isso não é cerimônia. Foi a varredura de mutação que reprovou o primeiro teste
da guarda de identidade: trocando `if (!conferencia.ok)` por `if (false)`, a
suíte seguia verde — o teste verificava que a guarda EXISTIA, não que ela
BLOQUEIA. Virou `tests/ia-diagnostico-handler.test.js`, que roda o handler
dublado e afere o efeito.

**Regra permanente: todo defeito que escapar para produção entra em
`tests/guarda/mutacao.mjs` como mutação, junto com o teste que o pega. A lista
só cresce.**

## Como escrever teste que vale

- Teste que só faz `grep` no fonte é trava de regressão, não prova de
  comportamento. Serve para "ninguém pode reintroduzir este padrão".
- Onde dá para executar a função, execute. Onde dá para rodar o handler com
  dublês, rode — e afira o EFEITO (o que foi gravado), não a forma do código.
- Fixture vem de produção, não da imaginação. Os testes de identidade usam o
  JSON literal do diagnóstico `61a699d9`, o que foi entregue errado.
- Todo teste novo do núcleo precisa passar pela mutação correspondente.

## O que ainda está aberto

- 122 eventos de escuta sem URL em outras marcas (75% da Escola da
  Inteligência, 29% da Hering) ainda alimentando a destilação.
- 13 `sentiment_snapshots` da PES derivados de eventos apagados.
- `ALERT_WEBHOOK_URL` ausente em produção — alertas só chegam ao Sentry.
- O diagnóstico usa `streamAI`, que **não registra em `ai_usage`**: o rastreio
  de custo tem um ponto cego justamente na operação mais cara.
