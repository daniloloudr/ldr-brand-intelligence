# s1ngulr — O Discurso do Modelo de Futuro
### De onde viemos, o que já é real, e o que estamos construindo · atualizado 2026-07-12
*Par do [`pitch-tecnologia.md`](pitch-tecnologia.md) (o desenho técnico) — este é o **arco narrativo**: cada afirmação de futuro ancorada em algo que já existe hoje. É o slide de roadmap/visão.*

---

## A frase que organiza tudo

> **"Revolucionar a indústria criativa com IA — a marca no meio da operação."**
> A indústria separa a marca (PDF, guideline, agência) da operação (produção diária).
> Nós fundimos as duas: a inteligência da marca vive DENTRO do fluxo, aprende de cada peça
> e guia a próxima. O futuro inteiro do produto é essa frase ganhando raio de alcance.

---

## O arco em uma linha do tempo

```
      HOJE (provado)              EM BREVE (6 meses)              O FUTURO (12+ meses)
  ────────●──────────────────────────●───────────────────────────────●────────────▶
  O cérebro que aprende      A marca que OPERA               A INFRAESTRUTURA de
  com cada uso               (julga, produz em massa,        marca da indústria
  ✅ em produção             reage ao mercado)               criativa
                             🔜 gatilhos definidos           🔭 rota pavimentada
```

**A tese do arco:** não são três produtos — é o mesmo cérebro ganhando alcance.
Hoje ele aprende. Em breve ele opera. Depois ele vira a camada padrão.
E o ponto decisivo para investidor: **os dados que o futuro exige estão sendo
capturados hoje** — quem começar depois não alcança.

---

## ATO 1 · HOJE — o que já é real (não é slide, é produção)

**O cérebro existe e o flywheel roda 100% autônomo:**
- **1 cérebro por marca**, versionado (v1→vN), com 7 facetas e confiança por faceta.
- **11 tipos de sinal** capturados automaticamente (votos, regenerações, copy reescrita,
  correções, diagnósticos, escuta, clipping, tendências…) — triggers no banco + destilação diária.
- **Dataset proprietário por tenant** (contexto → output → avaliação) acumulando sozinho.
- **A prova em métrica:** taxa de aprovação das peças medida POR VERSÃO do cérebro —
  a evolução é auditável, não narrada.

**O produto completo em volta dele:**
- **Estratégia** (brand book vivo) · **Inteligência** (mercado com briefing semanal pelo cérebro,
  insights nomeados da escuta, dossiê de concorrentes com alerta de território, radar de tendências
  com "como a sua marca surfa isso") · **Estúdio** (imagem, vídeo, redação, fluxos nodais multi-modelo)
  · **Copiloto** (chat que ensina a marca) · **Home adaptativa** (recomendação gerada pelo cérebro).
- **White-label-ish**: cada cliente vê a própria marca no produto (`{MARCA}.s1ngulr`).
- Multi-tenant por RLS, créditos como unidade econômica, custo medido por modelo de IA.

**Validação externa (compradores nomeando o valor):**
- VHITA (Raquel): *"guardar o aprendizado é um dos principais valores"* — o cliente nomeou o moat.
- Hering (Rafael, dir. digital): pediu exatamente o que a arquitetura já desenha —
  o cérebro no meio + referências como ensino + escala via API. Piloto em desenho.

---

## ATO 2 · EM BREVE — a marca que opera (cada item com gatilho, não com esperança)

**1. O Copiloto vira DIRETOR DE ARTE.** Sobe uma peça (feita aqui ou FORA — agência, freela)
e o cérebro julga: aprova, reprova, diz o porquê e ajusta. Cada parecer vira aprendizado.
*Âncora: o juiz é o mesmo `resolveBrandIntelligence` que já governa toda geração.*

**2. Agentes de produção em massa — n8n criativo com a marca no controle.** Fluxos ganham
gatilho (toda segunda 8h; "tendência relevância ≥8 chegou"), lote (para cada item da pauta → peça)
e o portão do diretor de arte (só passa o que é on-brand).
*O caso-demo: "segunda de manhã o agente leu o mercado, gerou 5 peças, o juiz aprovou 3,
o time chegou com elas prontas."*

**3. Outputs que fecham loops:** calendário editorial executável (pauta do mês por canal,
juntando keywords + temas aprendidos + tendências + insights) · respostas da escuta no tom
da marca (community management que NENHUM concorrente tem) · briefing gerador para produção externa.

**4. Operação B2B em escala (piloto Hering):** imagem fidedigna de produto a partir de foto +
ficha técnica, variações de cor, manequim fantasma — em lote, depois via API.
*Gatilho: pilotinho com o time de marca deles.*

**5. Performance real como sinal (E2/Meta):** o criativo vencedor em mídia vira o sinal mais
valioso do dataset; o cérebro desdobra vencedores em variações on-brand.
*Gatilho: deal VHITA.*

**6. Duelo de modelos:** mesma peça em 2–3 geradores + voto = preferência pareada —
o dado de ouro para win-rate e para o fine-tune que vem no Ato 3.

**7. Pré-produção comercial:** observabilidade, Stripe live, LGPD, marca própria + site
(dogfooding: o s1ngulr construindo a própria marca), registro INPI.

---

## ATO 3 · O FUTURO — a infraestrutura (rota pavimentada, não aposta)

**1. O cérebro sai do produto: MCP + API.** A inteligência da marca dentro do Figma, Canva,
Photoshop — e de qualquer sistema via API (o endpoint que a Hering pediu). O s1ngulr deixa
de competir com ferramentas de criação e vira **a camada de marca que todas elas não têm**.
*Âncora: o plano MCP está aprovado e especificado; o `_brain.js` já é a porta única — é exposição, não reconstrução.*

**2. O modelo próprio de cada marca (SLM).** A rota em 5 estágios — prompt-layer aprendida ✅,
RAG re-derivado ✅, dataset por tenant ✅, fine-tune leve (adapters) 📋, SLM dedicado 🔭.
**Os 3 primeiros já estão em produção**: quando o fine-tune vier, o dataset já existe, limpo,
julgado e proprietário. *O moat não é o modelo; é a série temporal de julgamentos de cada marca.*

**3. A rede de cérebros.** Dezenas de marcas aprendendo em paralelo (o painel cross-tenant já
existe como embrião): benchmarks anônimos por setor, inteligência de categoria, aprendizado
que compõe entre contas sem vazar entre tenants.

**4. A categoria: Smart Branding.** Marca viva que aprende com o próprio uso vs. guideline
congelado. Quem define a categoria cobra o prêmio dela — e o território está desocupado
(verificado pela nossa própria inteligência de mercado).

---

## Por que acreditar (o anti-risco do discurso)

1. **Cada estágio se paga.** Nada no Ato 2 ou 3 exige apostar a empresa: cada entrega tem
   valor de venda próprio e financia a seguinte.
2. **O futuro depende de dados que já estamos capturando.** O dataset por tenant acumula
   desde já — o concorrente que começar em 2027 não reconstrói a série de julgamentos.
3. **A borda é trocável por desenho.** Cada avanço das IAs (novos geradores, modelos mais
   baratos) nos fortalece em vez de ameaçar: absorvemos a borda, o núcleo é nosso.
4. **Compradores reais já nomearam o valor** antes de qualquer campanha — o discurso do
   futuro nasceu de dores ditas em call, não de whiteboard.

---

## O slide-frase (fechamento)

> **Hoje**, cada clique do time ensina a marca.
> **Em breve**, a marca julga, produz em massa e reage ao mercado sozinha.
> **Depois**, ela vai junto para toda ferramenta onde a criação acontecer.
> O mesmo cérebro — cada vez mais longe. **A marca no meio da operação.**
