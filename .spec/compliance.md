# s1ngulr — Dossiê de Compliance & Confiança
### Rascunho-mestre p/ procurement e jurídico de clientes · criado 2026-07-14 (frente Fullsix 1)
> **Status: RASCUNHO** — fatos de provedores verificados nas fontes públicas em 14/07/2026;
> itens marcados **[A VALIDAR]** exigem confirmação do Danilo/jurídico ANTES de enviar a cliente.
> Versão-cliente: exportar as seções 1–6 (sem a seção 7) como PDF de ~2 páginas.
> Linguagem-referência do mercado (deck Fullsix): *IP-safe models · full traceability · audit-ready*.

---

## 1. Resumo executivo

O s1ngulr é a plataforma onde a marca opera a própria criação com IA. Três garantias estruturais:

1. **Seus dados são seus** — assets, briefings e conhecimento da marca ficam isolados por
   workspace e **não treinam modelos externos** (política contratada com cada provedor; detalhe §2).
2. **Rastreabilidade total** — toda peça gerada tem trilha auditável: que modelo, que prompt,
   sob qual versão do cérebro da marca, que julgamentos passou (a "certidão do asset", §4).
3. **Nada sai sem julgamento** — todo output passa pelo diretor de arte da marca
   (auto-julgamento + portões de fidelidade) antes de chegar a uma pessoa.

## 2. Cadeia de fornecedores de IA

| Provedor | Uso no s1ngulr | Treina com dados do cliente? | Retenção | Fonte |
|---|---|---|---|---|
| **Anthropic** (Claude) | inteligência da marca, julgamentos, redação | **Não** (padrão dos termos comerciais/API) | ~30 dias (ZDR disponível sob acordo) | privacy.claude.com · platform.claude.com/docs |
| **fal.ai** (geração de imagem/vídeo) | Studio: imagem, vídeo, try-on | **Não treina LLMs com dados de clientes enterprise**; inputs processados só p/ prestar o serviço · **[A VALIDAR: tier da conta LOUDR]** | conforme ToS | fal.ai/terms · trust.fal.ai |
| **OpenAI via fal** (GPT Image 2) | modelo de imagem no catálogo | roteado pela fal (mesma política acima) | idem | fal.ai/terms |
| **Voyage AI** (embeddings) | busca semântica do brand book | **⚠️ POR PADRÃO SIM — exige OPT-OUT na conta** (após opt-out: retenção zero) · **[AÇÃO PENDENTE §7]** | zero-day após opt-out | voyageai.com/tos |
| **Supabase** (banco/auth/storage) | dados da plataforma | n/a (infra) | enquanto contrato ativo | SOC 2 Type 2 · supabase.com/security |
| **Cloudflare R2** | mídia gerada | n/a (infra) | enquanto contrato ativo | cloudflare.com |
| **Netlify** | aplicação e functions | n/a (infra) | logs operacionais | netlify.com |

> Regra de casa: modelo novo só entra no catálogo depois de conferida a política de dados
> e licença comercial. O catálogo é aberto por request, mas curado.

## 3. Isolamento e residência de dados

- **Isolamento por workspace**: toda tabela tem Row Level Security por `workspace_id` — um
  cliente jamais lê dados de outro (política checada em migration, sem exceção).
- **Um workspace = uma marca**: sem cruzamento de conhecimento entre marcas; o cérebro de
  cada marca aprende apenas com os dados dela.
- **Residência**: banco na região do projeto Supabase **[A VALIDAR: região exata no dashboard]**;
  mídia no R2 **[A VALIDAR: jurisdição do bucket]**.
- **Acesso interno**: administração da plataforma restrita (`platform_admins`), com trilha.

## 4. Rastreabilidade — a certidão do asset

Cada peça gerada carrega, de forma consultável na plataforma:

- **Origem**: modelo/provider exato, prompt final, referências usadas, data/hora, formato
  (`studio_generations`)
- **Contexto de marca**: qual versão do cérebro da marca vigorava na geração (snapshot)
- **Julgamentos**: pareceres do diretor de arte (veredito, o que sustenta, o que foge,
  ajustes) e decisões humanas (aprovar/reprovar), com data (`brand_signals` / `brand_dataset`)
- **Custo**: créditos consumidos por operação (`ai_usage` + extrato de créditos)

Auditável a qualquer momento; exportável sob pedido.

## 5. Propriedade intelectual

- **Inputs do cliente** (fotos de produto, manuais, briefings): seguem do cliente — o s1ngulr
  recebe licença apenas para operar o serviço.
- **Outputs**: uso comercial pelo cliente garantido em contrato **[A VALIDAR: cláusula-modelo
  com advogado — item PI/INPI do backlog]**; os provedores de geração não reivindicam
  propriedade sobre outputs.
- **Conhecimento aprendido** (cérebro da marca): pertence à marca; portabilidade tratada em contrato.

## 6. LGPD

- Dados pessoais tratados: contas de usuário (nome, e-mail) e conteúdo que o cliente traz.
- Bases legais: execução de contrato (operação da plataforma) e legítimo interesse (segurança/observabilidade).
- Direitos do titular: acesso, correção e exclusão via suporte; exclusão de workspace remove
  os dados do cliente **[A VALIDAR: rotina de purge completa — item Tenant hardening do backlog]**.
- Incidentes: monitoramento ativo (Sentry + watchdog); comunicação a afetados conforme LGPD.
- **[PENDENTE: ToS + Política de Privacidade públicas — Gap 3 do backlog, pré-requisito p/ enviar este dossiê]**

## 7. 🚨 Pendências internas (NÃO enviar a cliente antes de fechar)

| # | Ação | Dono | Urgência |
|---|---|---|---|
| 1 | **OPT-OUT de treino na conta Voyage** (dashboard, exige admin + payment method). Hoje o padrão deles PERMITE treinar com nosso conteúdo — contradiz a garantia §1.1 | Danilo | 🚨 HOJE |
| 2 | Confirmar tier/termos da conta fal (claim "never trains" é do enterprise) — se standard, avaliar upgrade ou ajustar o claim | Danilo | alta |
| 3 | Confirmar região do projeto Supabase e jurisdição do bucket R2 | Danilo/Claude | alta |
| 4 | ToS + Privacidade públicas (Gap 3) e cláusula de IP em contrato (item PI/INPI) | jurídico | antes do 1º envio |
| 5 | Anthropic ZDR: avaliar solicitar p/ contratos enterprise (Worten/Hering) | Danilo | quando o deal pedir |
