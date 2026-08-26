# BACKLOG — brandcode (único e canônico)

> **North star:** *"Revolucionar a indústria criativa com IA — a marca no meio da operação."* (Danilo, jul/2026)
> Todo item abaixo se justifica por essa frase: ou coloca a marca mais para dentro da operação, ou sustenta quem coloca.
>
> **Nomes:** o produto é o **brandcode** (`br4ndcode.com`); **LOUDR é a empresa**. Doc renomeado em 17/ago — textos antigos citando "s1ngulr" foram atualizados para o nome atual.
>
> **Organização:** o topo é a **semana corrente** (o que está na mão agora); abaixo, os horizontes da visão (H0 saúde → H1 provar → H2 rede de cérebros → H3 categoria). Cada item tem tamanho (🟢 dias · 🟡 ~1 semana · 🔴 semanas+) e gatilho quando não é "já".
> Estratégia: `arquivo/plano-de-melhoria-2026-07-06.md` · Visão: `visao.md` · História do entregue: `produto.md` (changelog v8.1)
> Atualizado: 2026-08-26

---

## 🩺 BLOCO 1 — RISCO VIVO (levantado 24/ago, com os números reais)

> Cinco itens que o Danilo mandou fechar. Três terminaram em **descoberta**, não em código: dois já estavam entregues e um é muito maior do que estava escrito.

| # | Item | O que se descobriu ao medir |
|---|---|---|
| **1.1** | **Duas identidades + MFA** (S1/S2) | 🔴 **Tem pré-requisito que ninguém sabia.** Sete tabelas de cliente **não têm o bypass do operador**: `concorrente_clipping`, `consumer_insights`, `diagnosticos_concorrentes`, `market_sinteses`, `pecas_escritas`, `tendencias` e `ai_usage`. Se o operador sair das participações hoje, a impersonação abre **vazia** nessas telas. Estender o bypass a elas vira o **S0** da release do super admin |
| **1.2** | **Opt-out de treino na Voyage** | ✅ **FEITO pelo Danilo, 24/ago.** Aberto desde 14/jul |
| **1.3** | **Escuta contaminada** | ✅ **LIMPO 24/ago** — 52 snapshots e 6 sinais não-consumidos apagados; 24 consumidos preservados (inertes). `auditoria:escuta` devolve limpo. **Fica aberto** o que a limpeza não desfaz: a percepção que já virou memória em `brand_intelligence` — decisão de produto, detalhe abaixo |
| **1.4** | **C7 — isolamento entre tenants** | ✅ **ENTREGUE** — `npm run guarda:isolamento` |
| **1.5** | **B3 — extração de manual (413)** | ✅ **JÁ ESTAVA ENTREGUE** — o backlog estava velho. A function migrou para a **Files API** (teto de 500 MB, `TETO_MB` 400, guarda de 50 MB no front); o caso da PES (100 pág / 36,5 MB) está documentado no cabeçalho como causa raiz, e o erro de limite de páginas é humanizado |

### 1.3 · o estrago da escuta, medido

`npm run auditoria:escuta` — somente leitura, roda quando quiser. O invariante: um snapshot é agregado dos eventos do ciclo e **nunca** pode declarar mais menções do que existem eventos com URL naquele dia.

| marca | snapshots contaminados | menções fantasma | sinais já consumidos |
|---|---|---|---|
| PES English | 16 (todos de 18/08) | 34 | **15** |
| Escola da Inteligência | 16 | 105 | 4 |
| LOUDR | 15 | 76 | 4 |
| Hering | 4 (21/07) | 10 | 1 |
| scolex | 1 | 6 | 0 |

**Worten e Pixel Retail estão limpas.** Todo snapshot de 24/08 é consistente — a correção de 18/08 funciona; o que sobrou é passivo.

**Por que não é um DELETE e pronto:** a destilação lê *versão atual + sinais novos*, então a versão seguinte é construída EM CIMA da anterior. Os 24 sinais consumidos já viraram memória da marca em PES, Escola, LOUDR e Hering. Limpar de verdade exige decidir o que fazer com as versões de `brand_intelligence` dessas marcas — e isso é decisão de produto, não de banco. **Aguarda o Danilo.**

---

## 🔑 RELEASE — SEPARAÇÃO DO SUPER ADMIN (próxima)

> **Regra de release (Danilo, 24/ago):** objetivo declarado → testes → quality gate (`npm run guarda`) → security gate (`/security-review`) → só então aprovada. Deploy em prod **sempre no fim do dia, fora do horário comercial**. Migration que toca RLS passa também por `npm run guarda:rls`.

**Objetivo:** que o comprometimento de uma conta deixe de valer a plataforma inteira. Hoje uma credencial concentra super admin + participação nos workspaces dos clientes.

**Gatilho:** pergunta do Danilo (24/ago) — *"o meu usuário de super admin precisa ser diferente; separar /admin de /app em subdomínio deixa mais seguro?"*

### O diagnóstico (levantado no código, 24/ago)

**O subdomínio separado já existe — e não é ele que protege.** `/admin` roda no domínio de sistema (`app.br4ndcode.com`, `systemDomain = !getTenantSlug()`), os clientes em `<slug>.br4ndcode.com`. Origens diferentes ⇒ localStorage diferente ⇒ a sessão do admin já não é legível por código do subdomínio de um cliente. E `ADMIN_ROUTES` + `isAdmin` já separam as rotas — mas essa guarda é **client-side**: decide o que renderizar, não o que o banco entrega.

**O risco real é o bypass permanente.** A migration `007` deu ao `platform_admin` `for all using (is_platform_admin())` em **13 tabelas** (`workspaces`, `workspace_members`, `brands`, `brand_books`, `brand_book_history`, `conversations`, `messages`, `campaigns`, `alertas`, `listening_events`, `sentiment_snapshots`, `concorrentes`, `identity_gap_snapshots`), mais `listening_terms` e `content_hub_analyses` inline nas 010–013. **27 functions** aceitam `platform_admin` como passe.

Não é "pode impersonar": é acesso direto, permanente, com a sessão normal, sem cerimônia. `is_platform_admin()` responde "sim" para sempre — não existe estado de "agora estou operando" versus "agora não estou". E a mesma conta é membro (dona, depois da 052) dos workspaces dos clientes. Phishing nela entrega Hering, Worten e Pixel de uma vez.

### As frentes, em ordem de retorno

| # | O quê | Por quê / Tamanho |
|---|---|---|
| **S0 🔴** | **PRÉ-REQUISITO do S1, achado em 24/ago:** sete tabelas de cliente **não têm o bypass do operador** — `concorrente_clipping`, `consumer_insights`, `diagnosticos_concorrentes`, `market_sinteses`, `pecas_escritas`, `tendencias`, `ai_usage`. Hoje o operador só as enxerga porque é MEMBRO. Tirá-lo das participações sem estender o bypass abre a impersonação **vazia** em Tendências, Insights, Mercado, Clipping de concorrente, Diagnósticos de concorrentes e Peças. Achado por `npm run guarda:isolamento` | 🟢 · **antes do S1** |
| **S1** | **Duas identidades para a mesma pessoa** — conta de operação (membro dos tenants) ≠ conta de super admin (só `platform_admins`, **nunca** membro de workspace). O operador sai da lista de membros e passa a enxergar só pelo bypass — que cobre `workspaces`/`workspace_members` (provado em `guarda:rls`), mas **ainda não cobre as sete do S0** | zero código · **depois do S0** |
| ~~**S2**~~ ✅ **24/ago** | **MFA (TOTP) no operador** — TOTP habilitado no projeto pelo Danilo, **mais o que o console não entrega**: `MfaGate` (o `/admin` não monta sem aal2; inscrição por QR na primeira vez) e `_mfa.js` (os 5 endpoints de operador conferem a claim `aal` do token, depois de validar a assinatura). Gate de tela não protege contra token roubado — quem tem o token chama a function direto. **MFA é OPCIONAL para o cliente** (decisão do Danilo, 24/ago): ele liga em Minha conta se quiser, e quem liga passa a ser verificado no login — sem isso o "Limit duration of AAL1 sessions" derrubaria a sessão dele a cada 15 min. Obrigatório só na conta de operador. **Fator inscrito e validado ponta a ponta em 24/ago** (localhost): login com código funciona, e `admin-list-members` — que agora exige aal2 — respondeu 200. Isso prova a claim `aal` chegando ao servidor no formato esperado; era o maior risco de integração da camada. ⚠️ *"Limit duration of AAL1 sessions" está ON no console: depois da primeira inscrição, confirmar que não derruba usuário SEM fator — senão todo cliente cai a cada 15 min* | ✅ |
| **S3 🔴** | **Bypass com validade, não permanente** — `platform_admin_sessions(user_id, workspace_id, expira_em, motivo)`; `is_platform_admin()` passa a exigir sessão aberta **para aquele workspace**. Fora dela o operador não enxerga dado de cliente nenhum. Transforma "acesso permanente a tudo" em "acesso declarado, por tenant, por tempo". **É o item que muda o risco de verdade.** Toca as 13 policies + as inline + as 27 functions | 🟡 · o maior |
| S4 | **Trilha de auditoria** — quem entrou em qual tenant, quando, com que motivo. Pergunta de due diligence da Worten (GDPR), não higiene só nossa. Nasce de graça junto do S3: a sessão de suporte JÁ é o registro | 🟢 · junto do S3 |
| S5 | **`admin.br4ndcode.com` dedicado** — o admin deixa de ser servido no mesmo host do `/app` de impersonação; vira lugar limpo para CSP mais dura, allowlist de IP e exigência de MFA. É **embalagem** do S1–S4, não substituto | 🟢 · depois |

### Decisões já tomadas

- **O subdomínio não vem primeiro.** Ele não mexe no JWT nem nas policies; entra no fim, embalando o que realmente protege.
- **S3 é o coração.** Se só um item for feito depois do MFA, é esse.
- **Não entrou na release de 24/ago** (gestão de usuários por tenant): abrir o modelo de super admin na véspera do deploy obrigaria a refazer os três portões com risco muito maior.

### Cuidados registrados

- A 052 tornou o operador **dono** dos workspaces onde ele era `admin` — fiel ao que já era. O S1 desfaz isso saindo da lista de membros; conferir antes que o bypass cobre tudo que a tela de impersonação precisa (o `guarda:rls` já mostra que sim para `workspaces`/`workspace_members`).
- `is_platform_admin()` é `SECURITY DEFINER` com `search_path` fixo — ao reescrever para o S3, **manter as duas propriedades**.
- O ensaio `tests/guarda/rls/052-retrato.sql` reproduz o bypass do 007. Qualquer mudança no S3 tem que ser exercitada lá antes de encostar em produção.

---

## 👥 RELEASE — GESTÃO DE USUÁRIOS POR TENANT (24/ago/2026)

> ### ✅ FECHADA — aprovada para deploy na janela fora do horário comercial
>
> | Portão | Resultado |
> |---|---|
> | Testes | **443 passando**, 3 skipped, 28 arquivos |
> | Quality gate (`npm run guarda`) | **54/54** defeitos reintroduzidos detectados |
> | RLS gate (`npm run guarda:rls`) | **15/15** em Postgres local descartável |
> | Build | `dist` íntegro, 45 assets, fallback do SPA presente |
> | Security gate (`/security-review`) | **0 High · 0 Medium** · 1 Low residual documentado |
>
> **Telas validadas em localhost contra o banco AINDA SEM a 052** — que é o estado em que a produção recebe o código: Minha conta, Gestão de time, Criar acesso, Editar acesso, Admin → Membros, Redefinir senha.
>
> **Falta só:** autorização do Danilo para aplicar a `052` na janela. Depois de aplicar: conferir a contagem de papéis em produção e revalidar as telas com o esquema novo.
>
> **Pendência de transição:** convites emitidos ANTES deste deploy não têm `app_metadata.convite_workspace_id` e darão 403 no aceite. Conferir se há convite pendente; se houver, gravar o campo ou reenviar.

**Gatilho:** os acessos do time da Hering. Criar o primeiro acesso expôs que o tenant não gerencia o próprio time, e que quem entra manda em todo mundo.

**O levantamento (24/ago, sobre o código real):**

| Achado | Evidência |
|---|---|
| **O papel é decorativo** | `role` não aparece em **nenhuma** policy de RLS. As ~40 policies gateiam por participação (`workspace_id in (select … where user_id = auth.uid())`). `admin` vs `member` só muda a cor de um Chip em `WorkspacePage.jsx:209` |
| 🔴 **Qualquer membro manda em todos** | `005_setup_completo.sql:283` — `create policy "membro acessa workspace_members" … for all using (workspace_id in …)`. `for all` inclui UPDATE e DELETE: qualquer pessoa do tenant se promove a owner, rebaixa o dono ou remove quem quiser. A tela `/app/time` já escreve direto pelo client, sem passar por function |
| **Não existe página da pessoa** | `/app/conta` ("Configurações da conta") renderiza `TabEmpresa` — nome/domínio/setor/porte **da empresa**. Trocar o próprio nome ou senha só na tela forçada de 1º acesso (`ForcePassword`, via `must_change_password`); depois disso não há caminho. É por isso que a senha temporária viaja em texto |
| **`role` sem CHECK** | `workspace_members.role text default 'member'` aceita qualquer string; os valores válidos moram em dois lugares (`AppInterno.jsx` e `WorkspacePage.jsx:27`) |
| **Aprovar aprendizado não existe** | 17 pontos inserem em `brand_signals` direto; o cron destila ao juntar 5 (`BRAND_DISTILL_THRESHOLD`). Não há revisão entre o sinal e o cérebro |

**Decisões do Danilo (24/ago):**
1. **Papel + capacidades**, não escada de papéis — aprovar peça e aprovar aprendizado são independentes. `role` (`owner`|`membro`) + `pode_aprovar_pecas` + `pode_aprovar_aprendizado`. A UI mostra presets nomeados (Dono · Curador · Aprovador · Criador · Leitor); o dado compõe, então ser as duas coisas não inventa papel novo.
2. **O owner do tenant cria acesso com senha temporária** (espelha o que o admin faz hoje; `must_change_password` força a troca). O convite por e-mail fica como evolução — ver B4.
3. **Escopo da manhã = F1 completa.** Os gates de aprovação (F2) vêm depois: trigger novo em produção sem uso real observado pode barrar aprovação legítima no dia 1 da Hering.

**Onde o gate mora (doutrina):** aprovação hoje é escrita direta do browser. Regra só na UI é a mutação "guarda que existe mas não bloqueia" que a suíte da casa já reprova. O gate vai de **trigger no Postgres** — vale para browser, function e cron, e não se contorna trocando o fetch. Service key (`auth.uid() is null`) passa direto, que é o que o cron precisa.

### F1 · a release da manhã 🟢

| # | O quê |
|---|---|
| U1 | **Migration `052`** — CHECK no `role` (`owner`\|`membro`), colunas `pode_aprovar_pecas` / `pode_aprovar_aprendizado`, backfill: quem é `admin` hoje nasce owner com as duas capacidades |
| U2 | 🔴 **Fechar a policy de `workspace_members`** — leitura para todo membro; INSERT/UPDATE/DELETE só para owner. É o buraco de segurança, e vai para cliente enterprise |
| U3 | **Minha conta** — página da pessoa (nome, e-mail, trocar senha via `supabase.auth.updateUser`, sair). Hoje `/app/conta` é da empresa; separar os dois |
| U4 | **Gestão de time** (`/app/time`) com os presets reais + quem pode o quê, exclusiva do owner |
| U5 | **Owner cria acesso** dentro do tenant (senha temporária + `must_change_password`), reusando `admin-create-user` com porteiro de owner |
| U6 | **Testes + mutação** — papel inválido barrado, membro comum não promove ninguém nem se auto-promove, owner não fica órfão |
| U7 | **Redefinir senha no `/admin`** (pedido do Danilo, 24/ago) — `admin-reset-password.js`, botão por membro, sem precisar da senha antiga. **Vira ação com nome próprio** porque a capacidade já existia escondida: o `admin-create-user` redefine a senha quando o e-mail já existe, então um caractere a mais num endereço real trocava a credencial de alguém sem intenção e sem aviso. Limites: só `platform_admins`; **não** redefine a senha de outro operador (takeover lateral — esse caso vai pelo console do Supabase); `must_change_password` deixa a senha transitória. **Sem trilha ainda** → S4 da release do super admin |
| U8 | **Gerador de senha criptográfico** — era `Math.floor(Math.random() * n)` em duas cópias (admin e Gestão de time). `Math.random()` é PRNG previsível: observando saídas dá para prever as próximas. Virou `novaSenha()` em `helpers.js`, com `crypto.getRandomValues`, num lugar só |

### F2 · os gates de aprovação 🟢 *(depois de observar o uso real)*

- trigger em `generations.feedback` e `studio_campaigns.status` → só quem tem `pode_aprovar_pecas`
- trigger em `brand_signals` para os tipos de aprendizado (`image_vote`, `assistant_correction`, `reference_upload`) → só quem tem `pode_aprovar_aprendizado`
- quem não tem a capacidade **sugere** em vez de aprovar; a fila do Approvals ganha "aguardando curadoria"
- **mutação para cada gate** — senão é teatro

### F3 · a trilha 🟡

`quem aprovou / quando` visível na certidão do asset e na versão do cérebro. É o que a Worten pede em due diligence e o que fecha o argumento contra a Fullsix (frente 1, pacote de confiança).

**Puxados para esta release:** **C7** (isolamento entre tenants com teste explícito — mesmo perímetro, os testes nascem juntos) · **B4** (convite + 1º acesso ponta a ponta — é o caminho que aposenta a senha em texto) · **C1/C2** (porteiro das background functions, já na bancada — mesma doutrina de gate server-side) · **H0.1** (cobertura). **Fora:** A4 (hexes/reskin), i18n (só garantir que string nova nasce via `t()`), **H0.6** (rate limiting — par natural, fica anotado).

---

## 🚀 SEMANA DO RELANÇAMENTO — brandcode (17–23/ago/2026)

**Contexto:** o time de criação lança o produto como **brandcode** em `br4ndcode.com` e reconstrói o layout do zero; **Hering e Worten entram esta semana**. Ordem declarada pelo Danilo (17/ago): **dois dias de layout + setup + segurança → depois melhoria de código, gaps de segurança e performance.**

**Regra da semana:** o bloco de layout do time chega em cima de uma base já renomeada e já no domínio novo. Por isso a virada de domínio vem ANTES do layout — não se re-testa layout e domínio ao mesmo tempo.

### D1–D2 · Bloco A — Marca, domínio e layout

| # | O quê | Tamanho / dono |
|---|---|---|
| ~~A1~~ ✅ 17/ago | **Rename no código** — `PRODUCT_NAME`/`ROOT_DOMAIN` como fonte única (`helpers.js`), lockup `MARCA.brandcode`, `Wordmark.jsx`, rota `/app/inteligencia` (+shim), LOUDR fora das telas logadas, docs do `.spec` atualizados | ✅ |
| **A2 🔴** | **VIRADA DE DOMÍNIO** — roteiro completo em [`features/dominio-brandcode.md`](features/dominio-brandcode.md): DNS no Netlify → aliases → env (`ROOT_DOMAIN`/`VITE_ROOT_DOMAIN`/`VITE_APP_URL`) → **Supabase Auth redirect URLs** → validação. Corte seco: `s1ngulr.com` morre | **Danilo** (ação em prod) · bloqueia A3/B |
| A3 🟢 | **Reprovisionar subdomínios das marcas existentes** — `node scripts/provision-subdomains.mjs --apply` (dry-run rodado: 5 workspaces ativos, 5 aliases faltando no domínio novo, 3 aliases antigos a remover) | 🟢 · depois de A2 |
| A4 🟡 | **Receber o bloco de layout** — o que precisa estar limpo do nosso lado: (a) tokens num lugar só (`theme.js` + `DS` em `constants.js`); (b) **hexes hardcoded** espalhados (follow-up da v8.0, ainda aberto) — enquanto existirem, reskin do time não pega tudo; (c) `Wordmark.jsx` esperando o SVG definitivo; (d) botões do admin ainda em `DS.green` teal | 🟡 · com o time |
| A5 🟢 | **Favicon / OG / meta** — `index.html` já tem title+description do brandcode; falta `favicon.ico` novo e imagem de compartilhamento | 🟢 · junto do layout |
| A6 ⏸️ | **Decisão de fronteira:** relatório público de diagnóstico, PDF, `PublicHeader/Footer`, página de metodologia e os SYSTEM_PROMPTs do Smart Branding seguem assinados **LOUDR** (entregável e metodologia da agência). Confirmar ou virar para brandcode no bloco de layout — é posicionamento, não código | decisão do Danilo |

### D1–D2 · Bloco B — Setup Hering + Worten

| # | O quê | Tamanho / gatilho |
|---|---|---|
| B1 🟢 | **Criar os dois workspaces** no admin (créditos/mês + valor + slug); o alias do subdomínio nasce automático se A2 estiver de pé | 🟢 · depois de A2 |
| B2 🟡 | **Onboarding "Preparar ambiente"** nos dois: manual PDF → diagnóstico → concorrentes → mineração (clipping/tendências/escuta) → sínteses → destilação. Acompanhar pelo painel de progresso antes de liberar acesso | 🟡 |
| **B3 ⚠️ RISCO** | **Extração de manual em 3 camadas** — o gatilho ("fechar cliente novo") **disparou**. Hoje é Opus + PDF em base64: ~$3–5/manual e **erro 413 acima de ~24 MB** (caso real PES: 100 pág/36,5 MB, 3× 413 em prod). Se o manual da Hering ou da Worten for pesado/rasterizado, **trava o onboarding**. Detalhe do redesenho no H1 abaixo. *Workaround imediato: comprimir no Preview para ≤20 MB* | 🟡 · **checar o tamanho dos manuais no D1** |
| B4 🟢 | **Convites + fluxo de primeiro acesso** — testar ponta a ponta DEPOIS da virada (o convite passa por `app.*` antes de mandar o usuário ao subdomínio da marca; é o trecho mais frágil) | 🟢 · depois de A2 |
| B5 🟢 | **Protocolo de calibração** (frente 3 Fullsix) — o 1º lote mede a taxa real de aprovação/retoque e **define o tier/preço do contrato**. Vale para os dois; a métrica de convergência (regens até aprovar) já é a telemetria disso | 🟢 |
| B6 🟡 | **Worten = mesmo caso do Hering** (visual de produto fidedigno em escala, retail). Reaproveitar o fluxo "Duelo de Fidelidade" já montado; disputa direta com o Fullsix/Havas | 🟡 |

### D1–D2 · Bloco C — Segurança para receber cliente

> Levantado em 17/ago sobre o código real. Worten é conta europeia (Sonae) — **GDPR entra na conversa**, não só LGPD.

| # | Gap | Evidência | Tamanho |
|---|---|---|---|
| **C1 🔴** | **Background functions sem autenticação** | 13 functions com `SUPABASE_SERVICE_KEY` e **nenhuma checagem de auth** (`clipping-workspace-background`, `trends-workspace-background`, `brand-distill-background`, `diagnostico-concorrentes-workspace-background`, `studio-poll-background`, crons…). São endpoints HTTP públicos: qualquer um que saiba o caminho dispara trabalho pago no nosso provedor. O próprio código já anota "sem JWT — hardening = backlog". **Fix:** segredo compartilhado (`INTERNAL_SECRET`) no header, validado no worker | 🟢 ~1 dia |
| **C2 🟠** | **Webhook do Studio com segredo opcional** | `studio-webhook.js`: `if (secret && ...)` — se `STUDIO_WEBHOOK_SECRET` não estiver no env, **a checagem simplesmente não acontece**. Soft-fail vira porta aberta. **Fix:** exigir o segredo (sem env = 500, não 200) | 🟢 horas |
| C3 🟠 | **Zero headers de segurança** | `netlify.toml` não tem `[[headers]]`: sem HSTS, CSP, `X-Frame-Options`, `Referrer-Policy`, `X-Content-Type-Options`. App de cliente enterprise leva isso em due diligence | 🟢 |
| C4 🟡 | **CORS `*` em 18 functions** | com o domínio próprio por tenant, dá para restringir a `*.br4ndcode.com` em vez de liberar geral | 🟢-🟡 |
| C5 🟡 | **Compliance §7 — pendências desde 14/jul** | **opt-out de treino na conta VOYAGE** (o padrão deles PERMITE treinar com o que enviamos — é o mais urgente), confirmar tier da fal, **região do Supabase/R2** (hoje `us-west-2`; com Worten europeia, a pergunta "onde moram os dados" vira contratual) | 🟢 cada · dossiê em [`compliance.md`](compliance.md) |
| **C6 🟡** | **LGPD/ToS/Privacidade (Gap 3)** | inexistentes no repo. Pré-requisito do 1º envio de material a cliente grande — e a Worten puxa GDPR junto | 🟡 (+ jurídico) |
| C7 🟢 | **Isolamento entre tenants — teste explícito** | o RLS por `workspace_id` é o perímetro real (subdomínio é só resolução). Falta um teste que PROVE: usuário da marca A tentando ler dado da marca B tem que falhar. Vira material de due diligence | 🟢 |

### Em seguida · H0 — Código, segurança profunda e performance

> Bloco declarado pelo Danilo para depois dos dois dias. Ordem sugerida: o que protege o cliente novo primeiro, o que acelera depois.

| # | O quê | Notas | Tamanho |
|---|---|---|---|
| H0.1 | **Cobertura de teste (Gap 2)** | hoje: 25 testes em 4 arquivos (smoke das functions críticas + paridade de crédito). Falta: `_brain`, `studio-generate`, isolamento de tenant (C7), parsers. Diligência de investidor olha | 🟡 |
| H0.2 | **Performance do bundle** | `pdf` 628 kB, `charts` 350 kB, `mui` 342 kB — `manualChunks` já separou vendors, falta carregar pdf/charts sob demanda de verdade | 🟢-🟡 |
| H0.3 | **Mobile não auditado** (Gap 7) | desktop-first; nunca passou por auditoria responsiva | 🟡 |
| H0.4 | **Custo por workspace visível** | `ai_usage` grava desde 12/jul; falta o painel admin somando fal + LLM + fixos. Sem isso, a fórmula de manutenção do contrato é estimativa. Junto: hook do Voyage e captura de usage no `streamAI` (hoje cegos) | 🟢 |
| H0.5 | **Dívidas nomeadas** | (a) `/campaigns` legado sem porta (deprecado — candidato a "diretor de arte de TEXTO"); (b) varredura de i18n nas strings antigas; (c) hexes hardcoded (ver A4); (d) `.spec/pitch-futuro.md` está com byte inválido de UTF-8 (pré-existente); (e) exemplo "o que a LOUDR faria" ainda no schema do prompt em `constants.js`, contrariando o reframe de território da v5.9 | 🟢 cada |
| H0.6 | **Rate limiting / abuso** | nenhuma function tem limite por IP ou por workspace; com endpoints que gastam crédito, é o par natural do C1 | 🟡 |

---

> **v8.0 (20–21/jul) — GO-LIVE HERING:** entregues → identidade **brandcode = Vercel light** (monocromático, fundo branco; reskin só nos tokens + login split); **multitenant por subdomínio LIVE** (`nomedamarca.br4ndcode.com`, br4ndcode.com no Netlify DNS, auto-provisionamento via API); **cobrança por-workspace** (fim dos tiers, migration 045); **URLs limpas** (History API, fim do `/#/`); **onboarding "Preparar ambiente"** (migration 046 + `workspace-onboard.js` — marca do manual PDF + marca nasce junto do workspace); **backup ligado**. Pendências: trial/PicPay, auto-onboarding service-key, follow-ups do reskin (hexes hardcoded). Detalhe no changelog v8.0 do `produto.md`.

---

## 🏁 META OPERACIONAL 2026: 30 MARCAS (declarada 13/jul) — e o plano de INFRA

Maior preocupação do Danilo: a infra aguentar 30 tenants. Gargalos JÁ MAPEADOS (2026-07-13):

**🚨 AUDITORIA DE SEGUNDA 13/jul (prod, crons antigos):** a teoria confirmou na prática — **scheduled functions têm teto SÍNCRONO (segundos), não 15 min**. Evidências: clipping coletou por só 38s (11 itens, 1 workspace, 0 sínteses — morreu no meio); tendências cobriu 1 de 2 workspaces; diagnósticos de concorrentes = 0 (9 dias de staleness); destilação = 0 com 53 sinais pendentes na LOUDR (recuperação manual disparada 13/jul ~manhã — confirmar v6). **Os fixes (família fan-out, itens 1/2/2b) estão em DEV — o "sobe" é o item mais urgente da semana.**

| # | Gargalo | Evidência | Fix | Quando |
|---|---|---|---|---|
| ~~1~~ ✅ 13/jul | ~~Cron de clipping: teto GLOBAL de 8~~ | resolvido: `clipping-workspace-background` (worker por workspace: coleta TODOS os concorrentes + síntese própria, 15 min cada, jitter 0-45s); cron = despachante puro | — |
| ~~2~~ ✅ 13/jul | ~~trends/sínteses seriais~~ | resolvido: `trends-workspace-background` (worker por workspace) + síntese movida pro worker de clipping; crons = despachantes | — |
| ~~2b~~ ✅ 13/jul | ~~diagnosticar-cron inline~~ | resolvido: `diagnostico-concorrentes-workspace-background` (pendentes staleDays 7, cap 4/ciclo, jitter); cron = despachante | — |
| ~~3~~ ✅ 14/jul | ~~**Observabilidade zero**~~ | **RESOLVIDO:** watchdog completo (migration 041 `cron_runs`/`cron_alerts` + `withHeartbeat()` nos 6 scheduled + `cron-watchdog` horário — silêncio/morte/erro, dedup 24h, graça na estreia) + **Sentry PLUGADO** (`SENTRY_DSN` no env, evento de teste aceito, store API sem SDK). Opcional futuro: `ALERT_WEBHOOK_URL` p/ alerta no celular; painel admin lendo `cron_alerts` | — | — |
| 4 🟠 | **Tenant hardening** | backup/versionamento por cérebro; hoje uma instância única sem export por tenant | Gap 6 do H2 | ~10 marcas |
| 5 🟡 | **Custo por workspace invisível** | `ai_usage` grava desde 12/jul; falta o painel admin somando fal+LLM+fixos | pendência do pivô de créditos | ~5 marcas |
| 6 🟡 | Rate limits Anthropic (destilação ×30 às 7h) | fan-out do distill dispara N simultâneos | jitter JÁ implementado nos workers de clipping/trends; falta no distill-background (parâmetro `jitter` do cron) | ~15 marcas |
| 7 🟡 | Bundle 2MB sem code-splitting · mobile não auditado | plano-de-melhoria §3 (vivo) | React.lazy já parcial; manualChunks + auditoria | pré-go-live |

Custo projetado da meta: 30 × (consumo×R$0,33 + fair-use R$50–150 + infra fixa) → validar com o `ai_usage` real em ~2 semanas.

## 🎯 Em cima da mesa agora

> ⬆️ **A semana corrente está na seção do relançamento, acima.** Esta seção guarda as jogadas de médio prazo — o GTM (item 2) foi absorvido pelo lançamento do brandcode, e Hering/Worten (itens 5 e 6) viraram o Bloco B.

O código está à frente do comercial — as próximas jogadas não são features:

1. **Nova arquitetura (Strategy·Intelligence·Studio·Copilot)** — árvore entregue pelo time 2026-07-10; de-para + decisões em [`features/nova-arquitetura.md`](features/nova-arquitetura.md). ~~**Onda 1 (navegação)**~~ ✅ 2026-07-10 — sidebar nos 4 grupos, IA LOUDR movida p/ Intelligence, Copilot renomeado, rótulos via i18n; rotas/schema intactos. ~~**Onda 2**~~ ✅ 2026-07-10 — coluna `strategy` (migration 035) + 4 seções novas no hub (Essência, Negócio c/ Personas+Goals, Experiência, Personalidade c/ território aprendido da IA + Storytelling/Seasons), campos existentes reagrupados sem de-para no banco; cérebro atualizado aditivamente (contexto de geração ganha personas+narrativa; Writing Room idem; RAG embeda as seções strategy). Pendente da onda: extração de manual (F11) aprender o schema novo — junto da Onda 3. **Onda 3 (parcial)** ✅ 2026-07-10 — árvore COMPLETA na nav (3 níveis c/ subtítulos Culture/Business/Communication); Intelligence com 8 páginas (Market Intelligence ✅ real = feed do clipping; Competitors ✅ real-lite = scores por concorrente; Consumer Insights/Trends/Reports = em construção honesto); Studio com Brand Assets ✅ (tabs por tipo; Templates/Brand Kit em construção) e Approvals ✅ real (fila de peças sem julgamento + campanhas p/ aprovar — cada decisão vira sinal); Copilot com 10 modos (prompt pré-carregado por modo via ?m=). ~~Consumer Insights real~~ ✅ 2026-07-10 (v2 no mesmo dia — decisão: Escuta = coleta bruta · Insights = leitura; vizinhas no menu, cross-links; migration 037 `consumer_insights` + `insights-gerar-background`: o cérebro destila a escuta em insights NOMEADOS — elogio/atrito/oportunidade/tema/alerta, com ação no tom da marca e persona; menções brutas saíram da página); ~~Trends real~~ ✅ 2026-07-10 (radar por setor: migration 036, coleta semanal seg 10h + on-demand, cada tendência com 'como a sua marca surfa isso' no tom aprendido; sinal `trend` alimenta o cérebro). ~~Inteligência de Mercado fase 1~~ ✅ 2026-07-10 (pulso 7d, SÍNTESE DO CICLO pelo cérebro — migration 038 + `_market.js`, on-demand + automática no cron do clipping —, share of voice 30d, feed com filtros); ~~Concorrentes fase 1~~ ✅ 2026-07-10 (dossiê expandível por rival: frase, territórios reivindicados c/ alerta de colisão vs território aprendido, forças/fraquezas, momento, fatos do cérebro, movimentos; comparativo lado a lado c/ deltas por ciclo). **Fase 2 anotada:** coleta setorial no Mercado (além dos concorrentes); Concorrentes: presença digital, tom/estética comparável, oferta/preço, vagas abertas, ads da Meta (junto do E2). **Falta da Onda 3:** Relatórios próprios (hoje = Posicionamento ressignificado), Templates/Brand Kit, Agents, extração de manual (F11) no schema novo, split fino do Posicionamento (números→Reports).
1b. **i18n completo (pt/en/es)** — fundação criada (`src/lib/i18n.js`, nav trilíngue); falta: varredura das strings do app + seletor de idioma (workspace/usuário) + conteúdo gerado no idioma do workspace. Decisão: foco PT, sistema configurável p/ expansão. 🔴 (progressivo — toda string nova já nasce via `t()`)
2. **GTM:** marca do produto + site. Dogfooding máximo — usar o próprio LOUDR (diagnóstico, Writing Room, Studio) para construí-la: vira case e demo. Depois: **rodada de investimento**.
3. **Operar e observar:** cron autônomo de destilação (consertado 08/07 — conferir os primeiros ciclos), clipping de segunda (inclui Pupila), usar o produto e votar (cada uso calibra o cérebro e ensaia a demo).
4. **Roteiro de demo do flywheel** (~5 min de telas contando a história) — eu monto quando o Danilo pedir. 🟢
5. **🔥 PILOTO HERING — prioridade de produto (decisão 2026-07-10):** o caso-âncora do H1 puxa a fila; atividades detalhadas na seção [Piloto Hering](#-piloto-hering-rafael-passos-dir-digital--call-2026-07-09) abaixo. F0 começa já (bug das referências + mapa de modelos de fidelidade).
6. **🥊 CONTA WORTEN — disputa direta com a Fullsix/Havas (2026-07-14):** primeiro deal onde enfrentamos o AI Creative Engine deles de frente (PDFs do pitch em `.spec/competitors/`). Preparação = as [Frentes Fullsix](#-frentes-fullsix-absorver-os-diferenciais-do-concorrente--2026-07-14) abaixo (pacote de confiança + preço por asset aprovado + protocolo de calibração são os pré-requisitos do pitch); nossas vantagens mapeadas na memória `project_concorrente_fullsix`. Retail = mesmo caso de uso do Hering (visual de produto fidedigno em escala) — um pilotinho calibrado serve aos dois.

---

## H1 — PROVAR (agora → ~3 meses) · *marca no mercado, ~10 clientes com case*

> ### 🔴 ESTA SEMANA (18–24/ago/2026) — SETUP DE TRÊS CLIENTES
> **Worten** (Portugal · reunião 19/08 + setup) · **Hering** (piloto Rafael Passos) · **Pixel Retail** (retail media).
>
> É a primeira vez que a plataforma recebe clientes reais em sequência, e a primeira com marca **fora do Brasil**.
> O dia 18/08 foi gasto endurecendo o núcleo por causa disso (changelog v8.2 em `produto.md`).
>
> **Checklist por setup:** ① país correto no cadastro (Worten = PT — define mercado, praças de reputação e idioma)
> · ② domínio preenchido, porque a guarda de identidade depende dele e sem ele o diagnóstico passa "não verificado"
> · ③ conferir o diagnóstico ANTES de mostrar ao cliente (`_identidade` grava `ok`/`verificado` em `diagnosticos.data`)
> · ④ concorrentes cadastrados com domínio, e os errados **desativados** (desativar já basta: a leitura passou a respeitar)
> · ⑤ rodar clipping na mão depois de cadastrar concorrente — o cron só roda segunda
> · ⑥ olhar `/admin` → **Saúde** depois de cada setup.
>
> **Pendências que afetam os três:** o `cron-monitor` está morrendo desde 10/08 (regenera diagnóstico de todas as
> marcas toda segunda — investigar antes que os três estejam dentro) e o header de Diagnósticos segue quebrado.


| Item | O quê | Tamanho / gatilho |
|---|---|---|
| ~~**⭐ Duelo de Modelos**~~ ✅ 14/jul | **ENTREGUE (imagem):** modo ⚔️ na página Imagem — 2–3 modelos, mesma peça, arena lado a lado, voto único → sinal `model_duel` (peso 2, vencedor+perdedores) + `image_vote` na vencedora; destilador entende preferência pareada como a evidência mais forte do win_rate. Validado ponta a ponta. **Falta (fase 2):** duelo de TEXTO (gatilho: conector OpenRouter) e usar a arena no pilotinho Hering | ✅ · texto: pós-OpenRouter |
| **Conector OpenRouter no `_ai.js`** | passo 2 do módulo de IA (decisão 2026-07-12): OpenRouter como 2º conector = GPT/DeepSeek/Sonar(Perplexity) atrás de uma API — destrava Duelo de Modelos p/ TEXTO (preferência pareada de escrita → voz aprendida). Regra: Anthropic segue DIRETA no núcleo (prompt caching + web search nativos, que gateway não repassa intacto); OpenRouter é amplitude, não substituição. Custo: ~5% + 1 hop. LiteLLM anotado p/ fase enterprise/self-host | 🟢 ~1 dia |
| ~~**Gap 1 — Observabilidade**~~ ✅ 14/jul COMPLETO | Watchdog de crons (migration 041 + `_watchdog.js` + `cron-watchdog` horário — heartbeat nos 6 scheduled, alerta silêncio/morte/erro com dedup e graça) + Sentry plugado (`SENTRY_DSN` no env, teste de ponta a ponta ok). Nota: o antigo `cron-monitor.js` NÃO monitora crons — é o cron de diagnóstico semanal (nome herdado) | ✅ |
| **Extração de manual em 3 camadas (barata + sem 413)** | Redesenho da `brand-manual-extract-background` (hoje: Opus + PDF base64 ≈ $3–5/manual, teto real ~24 MB — base64 infla 33% sobre o limite de 32 MB da API). **Camada 1:** `pdf-parse` local (grátis) → se PDF tem texto embutido (≥~200 chars/pág), extrai com **Haiku** só-texto (~$0,02). **Camada 2:** PDF rasterizado → **Files API** da Anthropic (file_id, sem base64 = mata o 413) + visão com Haiku/Sonnet (~$0,25–0,80). **Camada 3:** guarda pré-flight (>100 pág ou arquivo grande → mensagem clara, não "Claude 413" cru). Caso real que motivou (2026-08-03): manual PES English, 100 pág/36,5 MB, rasterizado (17 chars/pág — validado com pdf-parse), 3× erro 413 em prod; workaround = comprimir no Preview p/ ≤20 MB. Bônus do mesmo dia: ANTHROPIC_KEY de prod zerou créditos ~19h30 (alerta de billing funcionou?) | 🟡 · **GATILHO DISPAROU (17/ago — Hering/Worten): virou o item B3 do relançamento** |
| **Copiloto — estender `salvar_estrategia` aos campos tipados do brand book** | Hoje (2026-08-08) o Copiloto persiste **personas** e **objetivos/KPIs** em `strategy` (tool `salvar_estrategia`) + qualquer texto na Biblioteca (`salvar_peca_escrita`, destino padrão). Estender a tool aos demais campos tipados pra caírem no lugar estruturado (UI + cérebro) em vez da Biblioteca: posicionamento, proposta de valor, missão/visão/propósito, valores, brand meaning, business model, portfolio, **brand architecture**, stakeholders, storytelling. Regra de honestidade já no system prompt (todo "salvar" → chamada de tool; nunca alegar salvar sem salvar). Contexto: bug de 08/08 — assistente prometia salvar personas e não tinha ferramenta; corrigido + 5 personas da LOUDR recuperadas do log e gravadas | 🟢 |
| **Gap 2 — Testes** | CI básico: smoke das functions críticas (_brain, studio-generate, distill) + parses. Diligência de investidor olha | 🟡 |
| **Gap 3 — LGPD/ToS/Privacidade** | inexistentes no repo; pré-requisito p/ clientes maiores e captação | 🟡 (+ jurídico) |
| **Propriedade intelectual (INPI)** | (a) **marcas**: LOUDR + nome do produto + "Smart Branding" (classes 9/35/42); (b) **registro de programa de computador** (barato, rápido, prova anterioridade do código); (c) **segredo industrial** p/ cérebro/dataset/prompts (NDA + contratos + ToS — mais valioso que patente); patente de software é via estreita no BR. Fazer ANTES do site/marketing público | 🟢 (+ advogado de PI) |
| **Stripe live + recarga avulsa** | código validado em test mode | 🟢 · gatilho: venda deixar de ser manual |
| **E2 — Loop criativo integrado com Meta** | motor de desdobramento (criativo vencedor → N variações on-brand) + Meta Marketing API (vencedores automáticos; performance real vira sinal `ad_performance`) | 🔴 · **gatilho: deal VHITA fechar** → registrar app na Meta NO MESMO DIA (App Review = semanas) |
| Sustentação: cron enterprise diário · tela de workspace inativo | pequenos, sem gatilho | 🟢 cada |

**Narrativa sem código (usar no site/pitch):** "usuários ilimitados — pague pelo que cria, não por cadeira" (créditos ≠ assentos) · "O Tess te dá todas as IAs; o LOUDR faz as IAs conhecerem a SUA marca" · "Não competimos com Canva/Figma — somos a memória de marca que eles não têm" · "A Fullsix aluga uma fábrica com humanos dentro de cada entrega; o brandcode entrega a fábrica com o cérebro da marca dentro — que julga sozinho e aprende a cada peça".

---

### 🥊 Frentes Fullsix (absorver os diferenciais do concorrente — 2026-07-14)

Origem: decks do AI Creative Engine (Fullsix/Havas CX) em `.spec/competitors/` — concorrente DIRETO na conta Worten. Regra de leitura: eles vendem fábrica-com-humanos por €95–210/visual aprovado; cada frente abaixo transforma um diferencial deles em feature/embalagem nossa. O que NÃO copiar: QA humano como núcleo do modelo (é o gargalo deles; nosso juiz é a vantagem) e o portfólio full-service do AI Lab (formação/audit/experiências — moat de holding, dilui a meta 30 marcas).

| # | Frente | O quê | Tamanho / gatilho |
|---|---|---|---|
| ~~1~~ ✅ 14/jul | ~~**Pacote de confiança enterprise**~~ | **ENTREGUE:** (a) dossiê em [`compliance.md`](compliance.md) — cadeia de provedores verificada nas fontes públicas, isolamento, certidão, IP, LGPD; (b) **certidão do asset** na Biblioteca (modelo · prompt final · versão do cérebro · julgamentos · IDs) — portões agora carimbam generation_id no parecer. **🚨 PENDÊNCIAS §7 do dossiê (Danilo):** opt-out de treino na conta VOYAGE (padrão deles PERMITE treinar — fazer HOJE), confirmar tier fal, região Supabase/R2; ToS/Privacidade (Gap 3) antes do 1º envio a cliente | ✅ (código) · §7 pendente |
| 2 | **Preço por asset APROVADO (camada comercial)** | sobre o repasse de créditos, oferta enterprise: preço por imagem aprovada com bandas de volume (benchmark Fullsix: €95–210/KV, €14.280/mês por 120 KVs). Detalhe em `precificacao.md` §Benchmark | 🟢 (comercial, sem código) · deal enterprise na mesa |
| 3 | **Protocolo de calibração no piloto** | ideia deles (esperta): o 1º lote mede a taxa real de aprovação/retoque da marca e DEFINE o tier/preço do contrato — transforma incerteza do cliente em protocolo. Encaixa direto no F0.3 Hering e num pilotinho Worten; a métrica de convergência (regens até aprovação) já é a telemetria disso | 🟢 · junto do F0.3 |
| 4 | **Garantia de julgamento + tier curadoria** | vender o juiz como garantia formal: "nenhuma peça sai sem passar pelo julgamento da marca" (auto-julgamento + artGate já existem — é embalagem). Tier opcional com curadoria humana LOUDR por cima do juiz p/ contratos grandes (o juiz faz 90%, margem de serviço no resto) | 🟡 · contrato enterprise pedir sign-off humano |
| 5 | **Motor de adaptação de formatos** | o gap REAL de produto vs eles: 1 master aprovado → N formatos de canal (leaderboard/quadrado/story/mobile/email), mudança propaga em todas as versões. Onde mora o volume recorrente (eles cobram €30–250/formato). Começa por recomposição/resize inteligente, NÃO por tipografia (≠ output 7 Canva-lite, que segue futuro). **1º tijolo ✅ 14/jul: nó Recortar (crop sharp 0 crédito) + template "1 peça → 6 formatos"** | 🔴→🟡 · **gatilho: deal retail (Worten/Hering) fechar** |

---

### 🌊 Frentes Riverflow (5º arquétipo — análise do Danilo 2026-08-25)

Dossiê: [`competitors/riverflow.md`](competitors/riverflow.md). Gerador de imagem de produto para varejo, self-serve a partir de US$ 39, nº 1 em benchmark de edição. **É o primeiro concorrente que produz bem, barato e sozinho** — e aparece na mesma demo que a gente na Worten.

**A conferência muda a leitura.** Metade da lista já existe aqui; a lacuna real não é falta de feature, é que **três coisas nossas estão pela metade ou no lugar errado**: a URL não alimenta a identidade visual, o lote não tem portão, e o catálogo não entra.

**Regra de admissão** (vale para toda frente daqui): *isso reforça o cérebro, ou só aumenta a superfície de produção?* URL onboarding reforça. Mais um modelo de vídeo não.

| # | Frente | O quê · nosso estado real | Tamanho / gatilho |
|---|---|---|---|
| **R1 ⭐** | **URL como fonte da identidade** | 🟡 PARCIAL — a INTELIGÊNCIA já nasce só do domínio (`admin-create-workspace` dispara diagnóstico e mineração sem manual; a marca fica em `waiting`). Falta a **identidade declarada** vir do site: logo, cores, tipografia. É a mesma máquina da extração de manual apontada para outro lugar. **Resolve uma contradição do pitch:** prometemos "setup €0, o cérebro nasce em dias" e o fluxo pede PDF. Com URL, a promessa vira demonstrável na frente do cliente — o momento mágico passa a ser *"colamos sua URL e o cérebro já leu sua marca"* | 🟡 · **sprint** |
| **R2 ⭐** | **O juiz no portão do LOTE** | 🟡 O juiz EXISTE (`art-review`), a POSIÇÃO não: ele roda no nó de portão do fluxo e no Assistente, não no ponto de exportação em volume. Copiar a **posição**, não a feature — é onde o volume dói. A diferença que já é nossa: cada decisão ali **treina** | 🟡 · **sprint** |
| R3 | **Importação de catálogo (Shopify/VTEX)** | 🔴 Ausente. ⬇️ **DESCEU da sprint (Danilo, 25/ago: "é o que menos me preocupa").** A leitura: catálogo é conveniência de entrada, não vantagem — quem tem 174 produtos importados e nenhum cérebro produz mais rápido a peça errada. Volta à fila quando o volume de um cliente tornar a digitação o gargalo | 🟡 · sem gatilho |
| R4 | **Lote de formatos com preview e aprovação** | 🟡 PARCIAL — nó Recortar (0 crédito) + template "1 peça → 6 formatos" já existem. Falta o lote com preview e aprovação. **Pedido da Worten** (GIF + formatos produzidos). Primo do motor de adaptação (Fullsix 5) | 🟢 |
| R5 | **Scenes / Styles como entidade** | 🔴 Ausente. **Torção:** deles é preset salvo; nosso é **cânone** — a cena que produziu peça estrelada vira referência da marca | 🟡 |
| R6 | **Characters = elenco da marca** | 🔴 Ausente; caminho mapeado (Kling custom elements, 3º da varredura fal). **Pedido da Worten.** Torção: elenco **aprovado**, que entra no cânone pela estrela + argumento RGPD (pessoa sintética, zero direito de imagem) | 🟡 |
| R7 | **Galeria de prompts** | 🔴 Ausente (o *prompt enhance* já existe: "Melhorar prompt"). Padrão de categoria, pedido pela Worten | 🟢 |
| R8 | **Confirmar fundo transparente e teto de 4K** | ✅ Os apps existem (`removebg`, `upscale`) — **falta CONFERIR** transparência real (alfa) e resolução máxima. Table stakes de varejo: se falhar, aparece em teste técnico | 🟢 · **checar antes da demo** |
| R9 | **Trust Centre como página** | 🟡 O dossiê existe (`compliance.md`); falta virar **página pública**. Começo da resposta de procurement enquanto certificação real não vem. Par natural do C6 | 🟢 |

---

### 🧭 PONTO DE EVOLUÇÃO — entrada por INTENÇÃO, não por ferramenta

> Promovido de "lição do concorrente" a item próprio em 25/ago. Não é feature: é a forma do produto.

**O que eles viram.** O usuário chega com duas intenções incompatíveis — *"tenho um produto e preciso dele num cenário"* e *"tenho uma ideia e quero ver"* — e o Riverflow separou os fluxos (Photoshoots × Images) em vez de fazer um formulário universal.

**Por que isso nos interessa mais do que a eles.** Nós já tínhamos chegado no mesmo lugar por outro caminho, e deixamos anotado sem resolver:

> *"o usuário de campanha NÃO deveria ver o canvas — brief → fluxo roda sozinho → peças no dossiê (canvas = bastidores opcional)"*
> — decisão em observação, 13/jul: *"não sei se estou convencido — por enquanto deixamos ali"*

São a mesma percepção. A diferença é que eles agiram e nós registramos a dúvida. **O concorrente não trouxe a ideia: trouxe a confirmação de que a dúvida tinha resposta.**

**O que muda na prática.** Hoje a porta do Estúdio é a FERRAMENTA (Imagem · Vídeo · Fluxos · Redação) — o usuário precisa saber qual ferramenta resolve o problema dele antes de começar. A evolução é a porta ser a INTENÇÃO:

| Intenção | O que acontece |
|---|---|
| *"tenho um produto e preciso dele em cenário"* | entrada por produto + cena → o fluxo certo roda por baixo |
| *"tenho uma ideia e quero ver"* | entrada livre, exploração |
| *"tenho uma campanha e preciso das peças"* | brief → fluxo → dossiê (o A3, que já está no roadmap) |

O canvas não morre — vira **bastidor**, para quem quer abrir. É exatamente o que a nota de 13/jul propunha como hipótese de síntese.

**Por que é ponto de evolução e não sprint.** Ele reordena a navegação inteira do Estúdio e toca o A3/agentes. Não se faz correndo, e não se faz antes de o uso real dar veredito — que é o que o piloto Hering e o setup da Worten estão produzindo agora. **Gatilho: quando o A3 existir, ou quando o uso real de Hering/Worten disser qual porta as pessoas procuram.**

Nota de coerência: essa evolução passa na régua nova sem esforço — ela **reforça o cérebro** (a intenção declarada é contexto que o cérebro usa) em vez de aumentar a superfície de produção.

---

**NÃO copiar:** planos self-serve baixos (US$ 39 puxa a conversa para preço por imagem, onde perdemos — contradiz o pivô de 12/jul) · suíte horizontal de geração (mais feature de gerador = mais comparável) · benchmark de modelo (a nossa régua é convergência, não fidelidade de pixel).

---

### 🎧 EVOLUÇÃO DA ESCUTA — rota real por rede social (estruturado 2026-08-26)

> **Decisão do Danilo:** incrementar a nossa arquitetura, **não refazer**. O documento "Brand Pulse" que ele desenhou entrou como insumo — aproveitamos cinco itens e descartamos o resto. **Estruturado, execução adiada.**

**O achado que justifica a frente:** ~40% do orçamento de busca é desperdício estrutural. `montarQueries` monta ~15 consultas por rodada, **6 delas `site:` de rede social**, todas disputando um teto duro de 12 buscas — e todas vão para o índice da Anthropic, **que não tem o conteúdo dessas plataformas** (está escrito no comentário do próprio arquivo). Como o modelo escolhe quais 12 executar, as consultas mortas ainda podem expulsar as que rendem. A escuta não é fraca em rede social por falta de modelo melhor: manda a pergunta certa para a porta errada.

**Decisão de arquitetura — duas naturezas de rota.** Não cabe uma interface só:

```
buscar(consulta)           →  X (xAI) · web · reputação
   sem credencial do cliente · por consulta · imediato
sincronizar(conta, cursor) →  Instagram · Facebook · Threads
   token do cliente · incremental · escopo = ativos da marca
```

**Meta NÃO é rota de busca — é rota de conta conectada** (conferido 26/08): busca de post público por palavra-chave não existe no Facebook desde a v1 da Graph API, nem no Instagram. Existe: IG `mentioned_media`/`mentioned_comment`, comentários nos posts da marca, Hashtag Search (**teto de 30 hashtags únicas / 7 dias**); FB comentários e avaliações da Página, `/tagged`. Isso vira passo de onboarding (o cliente conecta), fila de App Review + Business Verification (semanas) e credencial por workspace.

| # | O quê | Depende de | Tamanho |
|---|---|---|---|
| **E0** | Tirar as 6 consultas `site:` de rede social da rodada padrão | nós | 🟢 horas |
| **E1** | **Run persistido + custo e rendimento por rota** — a régua. **Vem antes das rotas**, senão adicionamos rota no escuro. Também dá ao onboarding sinal de conclusão de verdade, em vez de inferir vida pela contagem de linhas (a forma da falha da Zétona) | nós | 🟢 1 dia |
| **E2** | **Rota X via xAI** — onde a cobertura hoje é zero. Conector novo = doutrina do [`nucleo-ia.md`](nucleo-ia.md): commit separado, guarda de mutação, avaliação ao vivo. ⚠️ **Confirmar preço na conta antes de dimensionar:** US$5/1.000 chamadas (X Search) × US$25/1.000 fontes (Live Search) — 5× de diferença muda a cadência | nós | 🟡 ~1 dia |
| **E3** | **Rotas de reputação** — Reclame Aqui, Portal da Queixa, Google Reviews, Glassdoor. Web indexada, provedor que já temos, pergunta e periodicidade próprias. Maior densidade de sentimento por item | nós | 🟢 1 dia |
| **E4** | **Registro do app na Meta + Business Verification + App Review** — **começa primeiro: é o único relógio de terceiro.** O MESMO app serve ao conector de Meta Ads (D3/E2) | Meta (semanas) | 🟢 ~nada de código |
| **E5** | **Conector Meta conectado** — OAuth por workspace, token/refresh, cursor; IG menções e comentários, FB comentários e avaliações | cliente conectar | 🟡 ~2 dias |
| **E6** | Threads — confirmar keyword search | — | 🟢 |

**Aproveitar do doc:** run persistido · custo por item único por rota · degraus 2-3 da dedup (URL canônica, plataforma+autor+texto normalizado) · honestidade de volume ("informações públicas analisadas", nunca "menções") · teto de custo por rodada.
**Descartar:** BrandContext como extração nova (derivar do cérebro + `brand_book.strategy` + `listening_terms`) · provider da Meta como busca · renames de tabela · **a remoção do portão de relevância** — tirar a relevância traz de volta o defeito do homônimo (caso Pixel).

**Duas ressalvas registradas:** (a) `zero_results` **não** dispara cadeia de fallback — a marca quieta dispararia todas e custaria 3× para descobrir que continua quieta; (b) com Meta conectada, a tela mistura **conversa pública** (X/web/reputação) com **interação nos canais próprios** — somar as duas numa porcentagem só é a mesma desonestidade do snapshot que mentiu em 18/08. Separar em duas famílias.

**Clipping e trends ficam para depois** (decisão do Danilo, 26/08), com intenção de simplificar e ser mais assertivo. Anotado para quando chegar a vez: os dois **nunca receberam a inversão de 18/08** — pedem `"url":"https://...ou null"` ao modelo e chamam `emitSignal`, ou seja, link possivelmente inventado entrando no cérebro com peso 0,5.

**A lacuna maior, para decidir junto com o item 1.3:** a escuta **não emite nenhum sinal**. `emitSignal` é chamado por diagnóstico, art-review, trends, clipping e studio — a voz real do consumidor é a única fonte de fora e a única desconectada do modelo vivo. Expansão em três camadas, quando for a hora: **L1** sinal `percepcao_publica` com evidência anexada · **L2** responder menção no tom da marca (output nº2 do brainstorm; fecha escuta→ação→aprendizado) · **L3** benchmark de categoria cross-tenant (= V1 do Valometry, sem painel pago).

---

### 📊 Frentes Valometry (Ana Couto — análise do Danilo 2026-07-15)

Fonte: [`competitors/valometry.md`](competitors/valometry.md) (análise completa: ficha, mapa de 2 eixos, munição de venda). O 4º arquétipo mapeado: dashboard de MEDIÇÃO forte que não cria nem aprende — o quadrante "mede+cria+aprende" segue exclusivamente nosso. Regra: **NÃO fazer** pesquisa primária com painel (contradiz "setup em minutos") nem mídia offline.

| # | Frente | O quê | Tamanho / gatilho |
|---|---|---|---|
| V1 | **Benchmark de categoria no diagnóstico** (P0) | scores comparados com a média do SETOR via dados cross-tenant (os diagnósticos que já temos substituem o survey deles) — "6/10 e a média do seu setor é 5,2". Vantagem estrutural: com 30 marcas vira ativo irreplicável sem painel pago. Amarra com o painel admin Cérebros | 🟡 · ~10 marcas p/ amostra digna (começar com faixas honestas antes) |
| V2 | **Acelerar integração de mídia** (P0) | = E2 do H1 (Meta API, deal VHITA). O Valometry adiciona o argumento: "criei — performou?" é a pergunta do CMO que só respondemos com performance real virando sinal. GA4/Google/LinkedIn depois da Meta | 🔴 · gatilho E2 (VHITA) — prioridade subiu |
| V3 | **"Disaster Check" — nomear o juiz** (P1) | naming + tela/relatório sobre o que o artGate/diretor de arte JÁ faz: "eles testam pontualmente antes de grandes investimentos; o nosso roda em TODA peça, automático". Candidato a nome próprio no pitch | 🟢 (naming + embalagem) |
| V4 | **Painel de reputação consolidado** (P1) | Google/ReclameAqui/App Store/Play Store numa visão única — agregação do que o listening já coleta | 🟡 |
| V5 | **Estudos setoriais publicados** (P2) | equivalente ao "Branding Brasil" deles: o motor já existe (trends por setor 036 + diagnósticos cross-tenant); falta curadoria + publicação. Amarra com GTM e a colonização do termo "Smart Branding" | 🟡 · junto do GTM/site |

**Diferenciais PRÓPRIOS a amplificar (2026-07-15 — o que ninguém no mapa consegue copiar; exigem gerador+cérebro+flywheel):**

| # | Diferencial | O quê | Tamanho / gatilho |
|---|---|---|---|
| **D3 ⭐** | **CAMADA DE INPUTS EXTERNOS do cérebro** — O diferencial (decisão Danilo 15/07: "o mais importante é esse gatilho") | hoje o cérebro só come o que nasce DENTRO do produto; abrir pra QUALQUER input externo: **(a) conectores de performance** — Meta Ads (= E2/VHITA, o 1º), GA4, Google Ads, LinkedIn Ads → performance real vira sinal (`ad_performance`, `ga_metrics`) e o destilador aprende o que CONVERTE, não só o que agrada; **(b) uploads de medição** — pesquisa/BVS/relatório de tracking → extração (tubulação do manual PDF) → contexto+sinais. Fecha "criei — performou?" E transforma concorrente de medição em fornecedor. Absorve a V2. **⚡ GATILHO CRÍTICO: deal VHITA assinar → registrar o app na Meta NO MESMO DIA (App Review = semanas)** | 🔴 por conector, incremental · 1º = Meta (VHITA); GA4 em seguida (Data API, leitura simples) |
| D1 | "Do score à peça" (embalagem) | **prioridade BAIXA** (Danilo 15/07) — já coberto via Copiloto (tools de leitura+criação fazem "vi a fraqueza → gera as peças" na conversa); a embalagem (botão "resolver agora" no diagnóstico deep-linkando pro Copiloto com contexto) fica pra quando sobrar espaço | 🟢 baixa |
| D2 | Relatório de Evolução da Marca (export) | **prioridade BAIXA** (Danilo 15/07) — já coberto em forma viva (IA LOUDR + Copiloto); o exportável recorrente (PDF/link mensal) fica pra quando amarrar com o Brand Deck 1-clique (H2) | 🟢-🟡 baixa |

---

### Home adaptativa (estrutura aprovada 2026-07-10; v1 ✅ entregue)
- ~~**v1**~~ ✅ — pulso + feed "o que aconteceu" + recomendação por regras + atalhos por frequência (localStorage).
- ~~**v2**~~ ✅ 2026-07-10 — recomendação gerada pelo CÉREBRO (`home-recommendation`: whitelist de ações, tier fast, cache 12h no cliente, regras como fallback instantâneo, ✨ quando vem do cérebro) + continuar profundo (chip "Ver última peça criada") + tendências no feed 📡.
- **v3** 🟡 — blocos se reordenando pelo perfil de uso (a adaptação total da visão do Danilo).

### Novos outputs de geração (brainstorm aprovado 2026-07-10)
Critério de priorização: **usa o que o cérebro já sabe × devolve sinais novos × valor pro cliente.** Top 3 marcado.

| # | Output | O quê | Por quê / gancho |
|---|---|---|---|
| **1º** ⭐ | **Calendário editorial executável** | um mês de pauta por canal com copy pronta + sugestão de imagem por peça — junta keywords + temas do cérebro + tendências ("como surfar") + insights do consumidor | o output que transforma "gerador de peças" em "operação de conteúdo"; uso recorrente toda segunda; cada peça vira sinal |
| **2º** ⭐ | **Respostas da escuta (community mgmt)** | responder menção/comentário/review/Reclame Aqui no tom da marca, com o contexto da menção | fecha o ciclo escuta→ação; NENHUM concorrente tem (exige voz aprendida); diferencial de arquitetura |
| **3º** ⭐ | **Briefing gerador** | briefing pronto p/ agência/freela/gráfica: contexto, do/don't aprendidos, referências aprovadas | quase de graça (texto + cérebro); coloca o brandcode no meio da produção que acontece FORA dele (tese do MCP) |
| 4 | **Vídeo completo (não clipe)** | roteiro (cérebro) → cenas (fal) → narração TTS na voz da marca (ElevenLabs?) → legendas; reel pronto p/ postar | eleva o bloco Vídeo; abre a faceta IDENTIDADE SONORA no brand book |
| 5 | **Apresentações on-brand** | decks (proposta, resultado, institucional) com design.md + tom aprendido | a peça mais produzida e mais fora-de-marca do mundo corporativo; conversa com o "Brand Deck 1-clique" do H2 (pptxgenjs já é dep) |
| 6 | **E-mail/CRM** | sequências (boas-vindas, nutrição, carrinho) no tom da marca | formato de altíssimo volume nas empresas |
| 7 | **Peça final com texto (Canva-lite)** | editor visual: tipografia aplicada na imagem gerada | o mais caro; já anotado como futuro na regra "imagem sem texto"; NÃO começar por ele |

### 🎯 Piloto Hering (Rafael Passos, dir. digital — call 2026-07-09)
Dor: inversão do ciclo operacional → guia de compras precisa de **imagem fidedigna** de produto que ainda não existe (foto simples no cabide + ficha técnica); depois manequim fantasma, troca de modelo A/B, close — **em escala**, API depois. Rafael validou a tese: quer o cérebro no meio + subir referências como ensino (novo sinal `reference_upload`). Detalhe na memória (`project_hering_pilot`).
**Atividades (priorizado 2026-07-10 — o case puxa a fila do produto):**

*F0 — validar fidelidade (já):*
- [x] ~~F0.1~~ ✅ 2026-07-12 — o "errinho" era chunk morto pós-deploy (lazy import); ErrorBoundary agora recarrega sozinho
- [x] ~~F0.2~~ ✅ 2026-07-12 — mapa completo em [`features/piloto-hering.md`](features/piloto-hering.md): FASHN try-on $0,075 ⭐ (veste a peça REAL, aceita cabide/flat-lay) · Nano Banana $0,039 · GPT Image 2 edit $0,07-0,41; **custo por produto (4 saídas) ≈ R$1-2** vs R$50-300 do estúdio tradicional
- [~] F0.3 🟢 pilotinho: **FLUXO MONTADO + ENSAIO COMPLETO 14/jul** — template "Piloto Hering: Duelo de Fidelidade (por peça)" + instância "Peça 1" no Fluxos. Ensaio com a jaqueta placeholder: **3 stills APROVADOS pelo juiz** (Nano/GPT/Seedream) + **try-on julgado "Com ressalvas" citando texto letra a letra** (mesmo diagnóstico da análise humana de 12/jul). 3 bugs achados e corrigidos no ensaio: saldo fal esgotado (recarregado), prompt no FASHN (backend dispensa/ignora), **ordem das referências = ordem das CONEXÕES** (raiz do "1ª imagem precisa ser PESSOA"; era ordem do array de nós). Falta só: peças reais + fichas · *gatilho: Rafael marcar a conversa*
- [x] ~~**Alerta de saldo dos provedores**~~ ✅ 14/jul — `alertIfBalanceError` no `_watchdog.js` plugado nos 4 pontos (fal imagem ×2, fal vídeo, Anthropic call+stream): erro de saldo/billing → alerta ao Danilo (Sentry, dedup 24h) + usuário vê "instabilidade no sistema" (nunca o erro cru). Validado com os erros reais (403 fal, 400 Anthropic). Futuro opcional: checagem PROATIVA de saldo (endpoint de billing da fal) no cron-watchdog

- [x] ~~**F0.4 — teste de fluxo real (KH6V)**~~ ✅ 19/ago — brief real por e-mail (2 stills, 3 castings, 1920×2720, 350 KB). **Caminho aprovado = base de casting limpa + Seedream 5.0 Pro** (os dois juntos; nenhum sozinho resolveu). Detalhe, pendências de entrega e as 3 perguntas abertas com o cliente em [`features/piloto-hering.md`](features/piloto-hering.md) § F0.4
- ~~F0.5 — fechar a entrega do KH6V~~ **REMOVIDO 21/ago** (decisão do Danilo: "não é um problema"). Resolução/peso de arquivo e biblioteca de bases deixaram de ser bloqueio de entrega — **o time da Hering aprovou o resultado e vai testar**. O que sobrou de útil daqui (alvo de peso no Recortar, bases de casting reaproveitáveis) só volta à fila se o volume trouxer de volta.

*F1 — o processo (Fluxo "Guia de Compras"):* ⏸️ **FORA DA FILA — 24/ago** (decisão do Danilo: *"não precisa, já estamos em piloto na Hering"*). O processo real que está rodando é o de 4 etapas fechado em 21/ago (`project_processo_catalogo`), montado à mão nos Fluxos; formalizar em template só volta à fila se o volume pedir.
- [ ] ~~F1.1 entrada de produto no Fluxo: foto real + ficha técnica como contexto do nó~~
- [ ] ~~F1.2 template "Guia de Compras": still fiel → manequim fantasma → variação de modelo (teste A/B) → close~~
- [ ] ~~F1.3 juiz de fidelidade~~ — na prática já existe: `art-review` com `modo: 'fidelidade'` + `reference_url`, validado em 12/jul

*F2 — escala:* lote via planilha/CSV ou pasta do Drive → fila de gerações com progresso + **teto de créditos por lote** (guarda)
*F3 — integração:* API key por workspace (compartilha a F0 do plano MCP) + endpoint de entrada e endpoint de consulta + docs mínimos

**Fundações que o caso puxa (valem para TODAS as marcas — pedidos do Danilo 2026-07-10):**
- [ ] **Ativos como referência e aprendizado** 🟢 — a área de Ativos vira FONTE do cérebro: subir referência = ensino curatorial (novo sinal `reference_upload`, peso alto — "isto É a marca", mais forte que like em gerada); referências aprovadas entram nos hints visuais de toda geração (`brandVisualHints`); curadoria por pasta/tag (referência de estilo ≠ logo ≠ template). Exatamente o que o Rafael pediu na call.
- [ ] **Manual da marca (PDF) — área própria** 🟡 — marcas que JÁ têm manual: (a) upload do PDF salvo no storage + visualização embutida (a "casa" do manual dentro do produto, provável aba no Brand Kit dos Ativos ou na Expressão); (b) a raspagem de texto já existe (`brand-manual-extract-background` — pendência F11 de aprender o schema novo); (c) **NOVO: o VISUAL do manual popula o cérebro** — páginas renderizadas como imagens viram referências visuais (alimentam `reference_upload` + hints de geração). O manual ensina pelo texto E pela estética.

### ~~Regerar com motivo~~ ✅ 15/jul — ENTREGUE (com a convergência)
- ✅ **Motivo estruturado**: menu no botão de regen (canvas, Gerar+Vídeo): *Fora da marca · Não é fiel ao produto · Qualidade baixa · Composição ruim · Só regerar* → `motivo` no payload do `image_regen`; destilador instruído a agrupar aprendizado POR TIPO de falha ("não é fiel" pesa no win_rate do provider). Validado E2E (sinal com motivo no banco).
- ✅ **Métrica de convergência**: painel IA LOUDR ganhou a linha **Retrabalho por versão** no gráfico de evolução (% de peças da versão que foram regeneradas, mínimo 3 gerações por versão) — caindo = o cérebro acertando de primeira. O argumento de custo na venda.
- ✅ **Bônus — `reference_upload` ligado** (item "Ativos como referência" do piloto Hering, parte a): upload em Biblioteca > Referências da marca emite sinal peso 2.5 ("isto É a marca"); destilador trata como ensino curatorial de altíssimo peso p/ preferencias_visuais. **Falta (parte b):** referências aprovadas entrarem nos hints visuais da geração (brandVisualHints) — design pendente de qual geração recebe refs automáticas.

### 💰 Custos & créditos — pivô de modelo (2026-07-12)
Decisão: SEM SaaS self-service; crédito = REPASSE de custo (baliza **1 cr = R$0,33**; regra ×18 intacta, cobre câmbio até R$5,94). Ganho = contrato/inteligência. Entregue: página "Créditos & Consumo" (sem planos/upgrade), baliza visível, `ai_usage` (migration 039) rastreando LLM com tag por operação. **Pendências:**
- [ ] Painel admin "custo por workspace/mês" (fal + LLM + fixos) — os dados já gravam 🟢
- [ ] Hook do Voyage no ai_usage (embeddings ~$0,06/M — barato mas cego) 🟢
- [ ] streamAI sem rastreio (diagnóstico/chat usam stream — usage vem no SSE, capturar) 🟢
- [x] ~~Baliza~~ ✅ DECIDIDA 2026-07-13: **R$0,33/crédito** (mapas ×18 intactos; colchão cambial até R$5,94 — revisão obrigatória se o dólar passar disso)
- **📐 FÓRMULA DE MANUTENÇÃO POR CLIENTE (a régua do pricing):**
  `custo/mês = (créditos CONSUMIDOS × R$0,33) + fair-use de IA (~R$50–150/workspace, medir no ai_usage) + fatia de infra fixa`
  Regras de leitura: crédito liberado ≠ gasto (custo só no consumo real; teto = pool × 0,33); num contrato de R$5.000 c/ 5.000 créditos → pior caso ~1/3 de custo (margem ~65%), uso típico 15–25% (margem ~80–90%). O que se vende é o cérebro, não o crédito.
- [ ] Stripe: repensar papel (recarga a custo? só faturamento manual?) — era do modelo SaaS

### 🗂 Casa do Conteúdo (anotado 2026-07-12 — "ver com calma", mas PRÉ-REQUISITO do A3)
Problema nomeado pelo Danilo: conteúdo gerado não tem casa organizada — imagem/vídeo têm a Biblioteca, mas TEXTO criado não persiste em lugar nenhum (Redação gera e não salva por design; peças escritas do Copiloto vivem só na conversa), e a página de CAMPANHAS ficou ÓRFÃ da nova arquitetura (rotas existem — Campaigns/CampaignNew/CampaignDetail — mas nenhuma entrada de menu na árvore nova). Crítico para o A3: "pedir campanha no chat e ele gerar tudo" precisa aterrissar organizado.
- [x] ~~1. Peças escritas ganham casa~~ ✅ 2026-07-13 — migration 040 `pecas_escritas`; Redação salva (botão) e Copiloto salva (tool `salvar_peca_escrita`, auto).
- [x] ~~2. Biblioteca vira o HUB~~ ✅ 2026-07-13 — abas Mídia · Textos (dialog de leitura/copiar) · Campanhas.
- [x] ~~2b. Biblioteca vira REPOSITÓRIO estilo Drive~~ ✅ 2026-07-14 (pedido do Danilo) — home com 5 pastas-raiz (Imagens · Vídeos · Textos · **Referências da marca** · Campanhas), breadcrumb, subpastas, upload contextual, busca por root, tela cheia. Distinção nova de modelo: **Referências = o que DEFINE a marca** (uploads/curadoria; tipos de identidade + `metadata.reference`) vs peças produzidas. Textos ganharam pasta (migration 042). Gancho futuro: upload em Referências deve emitir o sinal `reference_upload` (item "Ativos como referência e aprendizado" do piloto Hering — a pasta já marca `reference: true`).
- ⚠️ **DECISÃO EM OBSERVAÇÃO (Danilo, 2026-07-13):** o redesenho campanha=dossiê+Fluxos foi entregue mas "não sei se estou convencido — por enquanto deixamos ali". Tensão nomeada: ganhou-se motor único/padrões, perdeu-se a simplicidade do 1-clique (criar campanha agora abre um canvas técnico; o dossiê é passivo). Hipótese de síntese p/ revisitar: o usuário de campanha NÃO deveria ver o canvas — brief → fluxo roda sozinho → peças no dossiê (canvas = bastidores opcional). Isso é o A3/agentes; revisar quando ele existir ou quando o uso real der veredito.
- 📌 Revisão 2026-07-13: descobertos DOIS sistemas de campanha; consolidado no **Studio Campanhas** (/studio/campanhas — menu, Biblioteca e deep-link ?c=). O legado `/campaigns` (aprovação de copy por IA, tabela `campaigns`, schema antigo) ficou SEM porta — deprecado; candidato a renascer como "diretor de arte de TEXTO" (avaliar copy externa contra o cérebro, par do de imagem). Arte de campanha agora respeita a regra imagem-limpa (NO_TEXT no prompt).
- [x] ~~3. Campanhas de volta ao mapa~~ ✅ 2026-07-13 — item 'Campanhas' no menu do Estúdio + aba na Biblioteca; rotas órfãs religadas (as 2 campanhas perdidas reapareceram).
- **4. A3 entrega NA casa** — quando o chat construir campanha completa, cada peça nasce já vinculada (campanha_id) e o card do chat aponta pra página da campanha.

### 🛍 Especialistas da fal para apropriar (varredura 2026-07-12 — "depois voltamos neles")
A tese borda-commodity em ação: o FASHN entrou em ~1h; cada especialista abaixo é encaixe, não reconstrução. Top 3 marcado.

| # | Modelo (fal) | O quê | Encaixe brandcode |
|---|---|---|---|
| **1º** ⭐ | **Recraft V3 vector** ($0,08/SVG) | ícones/padrões VETORIAIS na paleta | "Gerar ícone on-brand" na aba Ícones dos Ativos — ativo de marca permanente, não peça descartável. 🟢 horas |
| **2º** ⭐ | **Dia TTS** (clonagem de voz) + Sync-3/PixVerse lipsync | a marca grava 1 min e ganha a PRÓPRIA voz p/ narrar reels | destrava o "vídeo completo" (output 4) e abre a faceta IDENTIDADE SONORA no brand book. 🟡 ~1 dia |
| **3º** ⭐ | **Kling custom elements · Happy Horse 1.1** (9 refs → personagem consistente) | "modelo da casa": a MESMA modelo/mascote em todas as peças | faceta "elenco da marca" no brand book; p/ Hering: mesma modelo vestindo a coleção inteira do guia. 🟡 |
| 4 | Bria Extract Object | isola produto com transparência | o passo que falta do manequim fantasma real (linha Hering) |
| 5 | BiRefNet v2 · SeedVR upscale | fundo hi-res · upscaler novo | upgrades dos apps Remover fundo/Ampliar (duelo) |
| 6 | TRELLIS-2 (3D) · LTX-2.3 (video enhance) | produto 3D · restaurar/estender vídeo | horizonte: AR/e-commerce · pós de reels |

### Copiloto: diretor de arte + agentes (visão do Danilo, 2026-07-10)
Princípio: **o juiz é um módulo só, duas superfícies** — interativo no chat, automático no fluxo (mesmo padrão do `_brain.js`). Materializa o "Autopilot on-brand" do H2. Agentes moram DENTRO do Fluxos (decisão: sem área separada — fluxo com gatilho ligado = agente; aba "Agentes" lista os que rodam sozinhos).

**Copiloto com MÃOS — tool use (teste do Danilo 2026-07-12: pediu "construa post + carrossel + roteiro UGC" e levou Erro 504):**
| Fase | O quê | Notas |
|---|---|---|
| ~~**A0**~~ ✅ 2026-07-12 | **504 curado** — `anthropic.js` virou Functions 2.0 com pass-through do SSE (a antiga bufferizava com `await response.text()`) | validado via curl |
| ~~**A1**~~ ✅ 2026-07-12 | **Mãos de LEITURA** — 4 tools client-side via supabase (RLS = perímetro): mercado (síntese+clipping), tendências, insights, concorrentes; loop de tool use no stream (4 rodadas), status "Consultando…" na UI | catálogo espelha o MCP |
| ~~**A2**~~ ✅ 2026-07-12 | **Mãos de CRIAÇÃO com confirmação** — gerar_imagem (1 crédito, poll até pronta, imagem ENTREGUE no chat) e criar_fluxo (builder + link direto); card de confirmação com custo (crédito nunca roda sozinho); cancelou = modelo não insiste. Fix raiz: model:'auto' ia cru pro fal (502) | validado no browser: pedido → card → confirmar → imagem on-brand no balão |
| **A3** | **Encadeamento** — diretor de arte (F1/F2) julga o que o Copiloto produziu; pedido recorrente vira agente no Fluxos (F3) | fecha o elo com as fases abaixo |

**Regra da coerência juiz↔gerador (Danilo, 2026-07-12):** "não pode gerar o que não aprovaria — em TODOS os contextos." ✅ no chat: conceito confrontado com padrões reprovados antes de gerar + auto-julgamento (art-review) de toda peça antes da entrega (reprovada = entregue com parecer + oferta de regerar; nunca auto-retry que gasta crédito sem confirmação). 🟡 DECISÃO PENDENTE: estender o auto-julgamento às páginas Imagem/Vídeo e a todo nó Gerar dos fluxos — custo: +1 chamada de juiz por geração (~R$0,01-0,05); alternativa: portão opcional (já existe) vs. automático universal.

**Regra de marca (Danilo, 2026-07-12):** logo NUNCA entra em imagem gerada por padrão (modelo alucina); só quando o cliente SOLICITAR — e sempre o ARQUIVO REAL dos Ativos como referência i2i (`gerar_imagem.inserir_logo` ✅). Vale para toda superfície de geração futura.
**Refinamento 2026-07-14 (✅ codificado):** guideline ≠ logo — diretrizes visuais e elementos GRÁFICOS da identidade (quadrado rosa) podem ser construídos; **logotipo/wordmark/nome escrito NUNCA** (deforma sempre). Regra agora vive no `compileBrandContext` (_brain.js) = toda superfície com marca protegida (antes só campanha/writing tinham guard — a página Imagem gerava "LOUDR" torto).
**⏸️ DECISÃO EM ABERTO — Selo de marca:** composição determinística do SVG real por cima da peça gerada (editor de posição + nó de lote nos Fluxos; embrião do motor de formatos). Proposto 14/jul, Danilo: "vou pensar, nesse momento não adicione". Caminhos mapeados na conversa: A selo determinístico · B logo-na-cena com juiz de fidelidade obrigatório · C guarda de roteamento no prompt.

**Decisão de arquitetura:** as tools internas do Copiloto = as MESMAS que o MCP externo expõe (F1 do plano MCP). Um catálogo de ferramentas, duas superfícies — o chat por dentro, Figma/Canva por fora.

| Fase | O quê | Notas |
|---|---|---|
| ~~**F1**~~ ✅ 2026-07-12 | **Chat diretor de arte (imagem)** — anexo no chat → multimodal → parecer estruturado (VEREDITO·sustenta·foge·ajustes) → sinal `art_review` peso 0.8 via tool registrar_parecer | falta na fila: escolher peça DA BIBLIOTECA (hoje só upload) e "aplicar ajustes" regenerando |
| ~~**F2**~~ ✅ 2026-07-12 | **Portão do Diretor de Arte no Workflow** — art-review.js (juiz como serviço, mesmo do chat) + nó artGate (chip por veredito, ajustes no nó, reprovada corta o ramo); parecer = sinal art_review; param `criterio` por portão = gancho do juiz de fidelidade Hering | validado: reprovou peça real citando o brand book |
| **F3** | **Gatilhos + lote + aba Agentes** — nós de gatilho (agenda "toda seg 8h"; evento "tendência ≥8", "insight oportunidade"), nó de lote (para cada item da pauta → peça), aba Agentes em Fluxos (status, última execução, produzidas, barradas pelo juiz) | produção em massa estilo n8n criativo; caso-demo: "toda seg o agente lê síntese+tendências, gera 5 peças, juiz aprova 3, time chega com elas prontas". ⚠️ GUARDA: teto de créditos por execução/semana |
| F4 | Vídeo no chat (frames amostrados) | depois — mais caro |

## H2 — REDE DE CÉREBROS (3–12 meses) · *dezenas de marcas aprendendo; fase que a captação financia*

| Item | O quê | Tamanho / gatilho |
|---|---|---|
| **🚀 MCP do Cérebro (Figma primeiro)** | plano APROVADO e pronto em [`features/mcp-cerebro.md`](features/mcp-cerebro.md): F0 API keys → F1 server (6 tools sobre `_brain.js`) → F2 teste T1–T7 com Figma write-to-canvas → F3 produto. Candidato a demo de captação | 🟡 ~2 dias core · "em breve" (Danilo) · dependência: seat Full Figma |
| **Autopilot on-brand** | agente gera → avalia com o cérebro-juiz (`check_on_brand`) → refina em background → entrega top-3 com parecer. Autonomia julgada pela marca (vs. autonomia genérica do Tess) | 🟡 |
| **Brand Deck 1-clique** | apresentação da marca (identidade + território + aprendizados) em PPTX — `pptxgenjs` já é dep. Entregável do cliente (≠ export do painel, vetado) | 🟢 |
| **Gap 4 — Jornada do dia 1** | onboarding guiado: workspace novo → brand book → primeiro valor | 🟡 · dói a partir de ~10 contas |
| **Gap 6 — Tenant hardening** | backup/versionamento por cérebro, zero vazamento | 🟡 · gatilho: contas crescendo |
| ~~**Backup do banco**~~ ✅ LIGADO 2026-07-20 | dump diário (GitHub Actions → R2) + dump pré-migration (`scripts/migrate.sh`) + doc de restore ([`backup.md`](backup.md)). PITR adiado (plano Pro). Bucket R2 `dumps1ngulr` + 5 secrets do GitHub OK; **1º dump validado em prod** (2.3M no R2). Host da pooler = `aws-1-us-west-2` (direto é IPv6-only, falha no CI). Regra nova: `db push` só via migrate.sh (backup antes). **Falta só (local, p/ migrate.sh):** `brew install postgresql@17 awscli` | ✅ |
| ~~**Subdomínio por marca**~~ ✅ LIVE 2026-07-21 (reabriu 15/07 c/ o 1º cliente externo) | `nomedamarca.br4ndcode.com` no ar. `br4ndcode.com` (GoDaddy) → **Netlify DNS** (nsone). Resolução por hostname (`getTenantSlug`; RLS por workspace_id = perímetro; sessão isolada por subdomínio; `app.br4ndcode.com` = login/admin; dev via `?tenant=`). **Wildcard não é self-serve no Netlify** (UI+API rejeitam) → **auto-provisionamento** por subdomínio: `admin-create-workspace` adiciona `{slug}.br4ndcode.com` como alias via **API do Netlify** (DNS+cert automáticos; requer `NETLIFY_API_TOKEN`). migration 044 (slug). Escalar sem provisionar 1-a-1 = Netlify DNS wildcard / Cloudflare for SaaS (futuro) | ✅ |
| **Dataset → export JSONL (groundwork do SLM)** | JSONL por tenant do `brand_dataset` + dedup + filtro de qualidade + enquadramento por tarefa (juiz / copy / território). **Estado 2026-07-20: só 84 exemplos, 1 marca (LOUDR dogfooding); 177 sinais.** NÃO treina nada — prepara o terreno e vira material de captação. Combustível vem do onboarding das 30 marcas | 🟢 groundwork · 🟡 no volume |
| **Eval set por tarefa (groundwork do SLM)** | conjunto de avaliação fixo por tarefa (juiz on/off-brand, tom, território) pra medir qualquer fine-tune contra a Claude ANTES de trocar. Pré-requisito de qualquer treino sério | 🟢 · junto do export |
| **Cérebro como serviço próprio** | fila/estado durável fora do teto do Netlify (fronteira pronta no `_brain.js`) | 🔴 · gatilho: volume |
| **Contexto de campanha persistente** | brief salvo e reutilizável entre Writing/Studio/Workflow (camada sobre o cérebro) | 🟢 |
| Gap 7 — Responsividade mobile | não auditada; desktop-first hoje | 🟡 |

---

## H3 — A CATEGORIA (12+ meses) · *infraestrutura de memória de marca da indústria criativa*

- **API do Cérebro pública** (camada C consolidada) + registro no diretório MCP — agências e ferramentas plugando. O Tess como CANAL (agentes deles consumindo nossa camada de marca), não rival.
- **Plugins nativos** (Canva Apps · Figma Plugins · Adobe UXP) sobre a mesma camada — a marca dentro da ferramenta, sem sair dela.
- **🧠 SLM próprio: base + adapters por marca** (direção decidida, Danilo 2026-07-20) — **arquitetura:** *LOUDR-base* = 1 fine-tune sobre o `brand_dataset` cross-tenant AGREGADO (o moat — toda marca beneficia todas; a rede de cérebros virando peso de modelo) **+** *por marca = LoRA/adapter leve* sobre a base (NÃO modelo inteiro; serving = 1 base na memória + troca de adapters no inference). O contexto por marca de hoje (`_brain.js`) já é a versão barata do adapter — a evolução é um contínuo: contexto → vetor de preferência aprendido → LoRA, conforme o dado cresce. **Wedge = o JUIZ primeiro** (não geração): maior volume (roda em TODA geração; auto-julgamento universal no roadmap), tarefa mais estreita, rótulo mais limpo (aprovado/reprovado + motivo), e erro só sinaliza — não queima crédito. É onde a margem aparece (crédito = repasse → custo é o produto) e o loop se prova. Geração criativa pesada segue na Claude — **híbrido, não substituição**. **Gatilho triplo (nenhum bate hoje):** dataset com volume+limpeza **E** custo de API pesando na margem **E** tarefa estável. Combustível = a meta das 30 marcas (GTM e SLM puxam a mesma alavanca). Groundwork barato já no H2 (export JSONL + eval set). Risco: ops de treino é infra de verdade — não carregar antes do GTM justificar.
- **Stock assets com busca via cérebro** — Shutterstock/iStock como acervo, preferências visuais aprendidas viram query (referências on-brand automáticas). Avaliar licenciamento.
- **Editor de texto sobre imagem (estilo Canva)** — fechar a peça sem sair do LOUDR. Danilo: "não é o momento" (07/07); por ora texto = pós-produção guiada pelo bloco "Sugestão de imagem".
- **Trial self-service** — decisão de modelo comercial (Pupila tem; LOUDR é invite-only por escolha). Reavaliar com pricing validado.

- **Fallback de LLM em outra plataforma** (Danilo, 18/08/2026 — "depois; ter o fallback dentro da Anthropic já funciona"). O que já está de pé: `MODELS_RESERVA` faz sonnet-4-6 → sonnet-5 em 429/500/502/503/504/529/408, que cobre sobrecarga e instabilidade de modelo — a falha frequente. Falta a queda TOTAL da Anthropic, que é rara e curta. **Sugestão: OpenAI**, por três motivos — nuvem independente (Azure; a Anthropic roda em AWS/GCP, e o Gemini em GCP não separa o domínio de falha), busca web nativa madura devolvendo URL real, e Structured Outputs, que eliminaria o `extractJSON` raspando `{...}` do texto (foi essa raspagem que traduziu estouro de teto em "JSON não extraído"). Descartados: Gemini (URLs de redirect que expiram — ruim porque guardamos link para o flywheel), Grok (o acesso nativo ao X é valioso para a ESCUTA, não como reserva geral), Perplexity (camada fina de busca, não substitui o raciocínio). **Tamanho: ~1 dia, não 1 hora** — conector novo (mensagens, ferramentas e streaming são todos diferentes), `SYSTEM_PROMPT` adaptado e avaliado (foi afinado meses para o Claude; sem adaptar, o cliente recebe um diagnóstico visivelmente diferente no dia da queda) e entrada própria na avaliação ao vivo, porque **reserva não exercitada não funciona no dia em que precisa**. **Gatilho:** primeira indisponibilidade da Anthropic que passe de ~15 min em horário de cliente, ou volume que torne o risco caro.
- **Alerta de indisponibilidade da Anthropic** (barato, sai junto ou antes do item acima). O `_ai.js` tem `alertIfBalanceError` para saldo, mas 5xx/529 não disparam alerta nenhum — hoje você descobre a queda pelo cliente.

- **💸 Custo de geração do Studio não é gravado** (achado 19/08 ao tentar somar o gasto da Hering). `submitGeneration` grava provider, request_id e status mas NUNCA `custo_estimado` — as 146 gerações do piloto registraram US$ 0,00. E `if (!platformAdmin)` faz o admin não debitar crédito, então **quando o operador testa, nada é medido**. Consequência: a fórmula de manutenção por cliente continua sendo chute do lado do Studio, mesmo depois de a migration 050 ter resolvido o lado do LLM. **Conserto:** gravar `custo_estimado` no insert (a tabela de preço por modelo já existe em `_credits.js`) e decidir se admin deve ao menos REGISTRAR consumo sem debitar. **Tamanho: 1h.** Gatilho: antes de fechar contrato com preço por asset.

- **🎽 Piloto Hering — o que falta no KH6V** (19/08). ✅ Feito: bake-off escolheu seedream 4.5, FLUX VTO integrado (resolve fidelidade e continuidade de look), fluxo de 6 saídas com imagem-âncora, portões checando peça + modelo + anatomia + continuidade. ❌ Aberto: **(a)** o limite de **350 KB** do brief — o nó Recortar entrega os px exatos mas grava webp q92 sem alvo de peso, e não sai em JPG (~30 min de `sharp`); **(b)** a **gola** vem mais sutil que o still nas ressalvas dos portões — decidir com a Hering se compromete; **(c)** poses novas ainda dependem de geração, porque o VTO preserva a pose da foto — se a Hering mandar castings em mais poses, o VTO resolve tudo.

- **🖥️ Header de Diagnósticos no admin ainda quebrado** (Danilo, 18/08/2026 — "continua errado"). O que JÁ foi corrigido e não era isso, ou não era só isso: os filtros Setor/Porte em branco (faltava `SelectProps={{ displayEmpty: true }}` — o MUI não renderiza o rótulo do `<MenuItem value="">` sem ele) e o zebrado da lista (`background:` com token de tema dentro de ternário, que escapou da primeira varredura). **Falta caracterizar o defeito restante** — no print de 18/08 o título "Todos os diagnósticos" aparece cortado no topo, encostado na barra superior, o que sugere problema de layout do container (`PageHeader`/`AppLayout`) e não do conteúdo. Começar por aí, com o print em mãos. Fica no `/admin` → aba Diagnósticos.

- **🧪 Teste que RENDERIZA os componentes** — o buraco que explica os cinco defeitos visuais de 18/08. Todos passaram por `npm run build`, pela suíte inteira e pelo deploy sem um sinal, e todos foram achados pelo Danilo olhando a tela: espaçamento sub-pixel em 31 telas, modal transparente, aba Saúde em tela branca, filtros em branco, zebrado sumido. **A suíte não renderiza nada** — as varreduras que existem hoje cobrem os padrões JÁ conhecidos, e a próxima classe de erro visual passa igual. Instalar `jsdom` + `@testing-library/react` (2 pacotes de dev) e um teste de "monta sem explodir" por tela. Não precisa asserção de aparência: só isso teria pego a tela branca, o modal e provavelmente os filtros. **Tamanho: meio dia**, contando a calibragem dos mocks de Supabase. Gatilho: antes de qualquer sprint que mexa em UI em volume.

- **🔍 Varredura completa do commit d7852fb** ("identidade BR4NDCODE, reset do legado"). Commit grande e mecânico, de onde já saíram DUAS classes de erro que chegaram em produção: espaçamento (`gap: 1.25` → `'1.25px'`, 85 ocorrências em 31 arquivos) e cor (`background: 'background.paper'`, 20 ocorrências em 4 arquivos). Se tem duas, pode ter três. Ler o diff inteiro procurando outras conversões mecânicas — candidatos: `fontSize`, `borderRadius`, `boxShadow`, `zIndex`, valores de `sx` que viraram string literal, e imports do design system antigo substituídos por equivalentes com API diferente. **Tamanho: 2h de leitura de diff.**

---

## 🧊 Geladeira

- **Lockup do header — logos muito horizontais:** hoje o logo é dimensionado por ALTURA (36px, maxWidth 150). Se aparecer marca de cliente com logo muito horizontal ficando espremido, mudar a regra para dimensionar pela LARGURA máxima (decisão adiada 2026-07-10).
Nurturing emails (D+2…D+15) · F07b Search Listening (busca orgânica) · atualizar supabase CLI (aviso recorrente).

---

## ✅ Entregue (resumo — história completa no changelog v6.0 do specs.md)

**19/ago/2026, "o piloto na prática":** reunião Worten (setup + diagnóstico validado em `worten.pt`) · primeiro teste de fluxo real da Hering com o brief do KH6V · **método de bake-off** (mesmo alvo, N caminhos, mesmo juiz, repetição para medir consistência — `arquivo/hering-bakeoff.mjs`) que elegeu o **seedream 4.5** e desmentiu duas recomendações minhas em sequência · **FLUX Virtual Try-On integrado** (aceita prompt, o FASHN não — foi o que matou a fenda lateral que vazava do casting) · nó **"Imagem"** com prévia inline e `genId` consertado · diagnóstico passa a **LER o site** com `web_fetch` e a declarar `base_de_evidencia` em vez de desistir quando o material é escasso (caso costclarity.com) · `separarAlvo()` no campo único do admin. Custo do piloto medido: US$ 6,08 em 146 gerações.

**18/ago/2026, "o dia da integridade":** guarda de identidade nos 4 caminhos de diagnóstico (o modelo não define mais quem é o cliente — origem: relatório da "Pixel Agência Digital" entregue à Pixel Retail) · **`npm run guarda`** com varredura de mutação 21/21 e hook de pre-commit sobre os 11 arquivos do núcleo · avaliação ao vivo contra a API · **mercado por país** (`_mercado.js` + migration 051; Worten validada de verdade) · **custo por workspace** (migration 050; `streamAI` nunca registrara nada) · escuta sem depender do Google (`_busca.js`, adaptadores, cron semanal) · sonnet-4-6 principal com sonnet-5 de reserva, medido em A/B · **migration 049** fecha leitura anônima de 111 diagnósticos · e-mail do operador sai da Gestão de time · concorrente desativado para de alimentar a inteligência de mercado · aba **Saúde** no admin · limpezas com backup (diagnóstico errado, 6 sinais e 3 sínteses contaminadas, 131 eventos de escuta sem URL). 9 deploys. Doutrina do núcleo em [`nucleo-ia.md`](nucleo-ia.md).

**06–08/jul/2026, "a era do cérebro":** `_brain.js` (cérebro como módulo único) · flywheel completo (todas as superfícies leem+escrevem) · `brand_dataset` (exemplos julgados p/ fine-tune) · modelo vivo enriquecido (taxonomia por código, facetas territorio/conteudo, métricas por versão) · sinais `content_used`/`image_regen`/`writing_edit` · Writing Room (frameworks + blocos editáveis + compilador peça→workflow) · Biblioteca de assets · painel admin Cérebros + IA LOUDR como prova viva (narrativa + **rede neural viva**) · cron autônomo consertado · dogfooding Pupila · migrations 025–034 via CLI · docs v6.0. Concorrentes mapeados: Pupila (direto, DNA estático) e Tess (indireto, valida a tese borda-commodity).

---

**Regra de manutenção:** tarefa nova entra AQUI (não em outro doc), no horizonte certo, com tamanho e gatilho; ao concluir, vira uma linha no "Entregue" + changelog do specs.md. Toda entrada nova se testa contra o north star.
