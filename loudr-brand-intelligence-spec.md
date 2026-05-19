# LOUDR Brand Intelligence — Especificação de Negócio
**Versão:** 2.0  
**Data:** Maio 2026  
**Status:** Em desenvolvimento ativo  

---

## Visão do Produto

O LOUDR Brand Intelligence é uma plataforma SaaS B2B de inteligência de marca que combina diagnóstico estratégico, monitoramento contínuo e inteligência competitiva num único sistema operacional de marca.

**Proposta de valor central:** transformar percepção de marca em dado mensurável, acompanhar sua evolução ao longo do tempo e antecipar movimentos competitivos — tudo baseado em fontes públicas reais, sem depender de pesquisa primária.

**Posicionamento:** a única plataforma que aplica o framework Smart Branding da LOUDR em escala, tornando inteligência estratégica de marca acessível para CMOs e times de marketing de médio e grande porte.

---

## Contexto — MVP (Fase 1) Concluído

### O que existe hoje
- Página pública de captura de leads com formulário completo
- Área interna com autenticação via Supabase
- Fila de solicitações com aprovação manual
- Geração de diagnóstico via Anthropic API com streaming SSE em tempo real
- Relatório completo com 4 práticas Smart Branding, scores, gaps e oportunidades
- Link público compartilhável por diagnóstico
- Histórico de diagnósticos com busca e filtros
- Retry automático de rate limit com countdown visual
- Cooldown de 120s entre aprovações

### Stack atual
| Camada | Tecnologia |
|--------|-----------|
| Frontend | React (Create React App → migrando para Vite) |
| Auth + DB | Supabase (auth + postgres + RLS) |
| AI | Anthropic API — claude-sonnet-4-5 com web_search |
| Proxy dev | setupProxy.js (local apenas) |
| Deploy | GitHub Pages (frontend estático, API não funciona) |

### Limitação crítica do MVP
O proxy da API Anthropic só funciona em desenvolvimento local. A aplicação não está em produção real — o deploy no GitHub Pages não suporta server-side functions. **Este é o bloqueador número 1 da Fase 2.**

---

## Fase 2 — Fundação do SaaS
**Objetivo:** colocar o produto em produção real e estruturar a base técnica e comercial para crescimento.  
**Prazo estimado:** 0–90 dias  
**Critério de sucesso:** 10 diagnósticos entregues para leads reais, 1 contrato fechado.

### 2.1 Infraestrutura de Produção

#### Migração para Vite + React
- Substituir Create React App por Vite
- Atualizar variáveis de ambiente de `REACT_APP_*` para `VITE_*`
- Remover dependência do setupProxy.js

#### Deploy em Netlify
- Netlify Function como proxy seguro para a Anthropic API
- Variável `ANTHROPIC_KEY` server-side — nunca exposta no frontend
- `netlify.toml` com build config e redirect para SPA
- Deploy automático via GitHub

#### Banco de dados — tabelas necessárias
```sql
-- Já existe
solicitacoes (id, nome, email, empresa, site, setor, porte, contexto, status, created_at)
diagnosticos (id, user_id, empresa, dominio, setor, porte, scores, frase, data jsonb, created_at)

-- Fase 2 — adicionar
workspaces (id, nome, plano, stripe_customer_id, stripe_subscription_id, created_at)
workspace_members (id, workspace_id, user_id, role, created_at)
```

### 2.2 Automação do Funil de Conversão

#### Envio automático de e-mail ao aprovar diagnóstico
- Trigger: aprovação na fila interna
- Ação: e-mail para o lead com link do relatório público
- Stack: Supabase Edge Functions + Resend
- Template: branded LOUDR com scores em destaque e CTA para agendar call

#### Notificação interna de nova solicitação
- Trigger: prospect preenche formulário público
- Ação: e-mail para equipe LOUDR com dados do lead e score de qualificação
- Inclui: setor, porte, contexto, score automático de qualificação (1–10)

#### Score de qualificação automático de leads
Calculado no momento da solicitação:

| Critério | Peso |
|----------|------|
| Porte (Grande/Médio = maior score) | 30% |
| Setor estratégico (Tech, Finanças, Saúde) | 20% |
| Domínio corporativo no e-mail | 20% |
| Contexto preenchido (>100 chars) | 20% |
| Site informado | 10% |

#### Sequência de follow-up pós-diagnóstico
- **D+0:** relatório entregue por e-mail com link público
- **D+2:** e-mail "um achado do diagnóstico que merece atenção especial" — destaca o gap mais crítico com dado de mercado
- **D+5:** case de empresa do mesmo setor que resolveu gap similar
- **D+10:** "seu mercado está se movendo" — sinal competitivo público relevante
- **D+15:** convite para call de apresentação de insights (20 min)

### 2.3 Produto Intermediário — Brand Discovery Sprint

**O problema:** o funil está travado entre diagnóstico gratuito (R$0) e retainer mensal (compromisso alto). Falta um degrau de entrada.

**A solução:** Brand Discovery Sprint — produto pago, escopo fixo, entrega rápida.

| Atributo | Detalhe |
|----------|---------|
| Preço | R$ 8.000 – R$ 15.000 (escopo fixo) |
| Duração | 2 semanas |
| Entrega | Arquitetura de marca + roadmap de execução 90 dias |
| Objetivo comercial | Porta de entrada para o retainer mensal |

**Lógica de venda:**
1. Lead recebe diagnóstico gratuito
2. Call de apresentação de insights (20 min) — você apresenta os 3 achados principais e o custo da inércia
3. Proposta do Sprint na mesa — escopo claro, preço fixo, sem burocracia de procurement
4. Sprint termina com proposta natural de retainer

### 2.4 Botão de Agendamento no Relatório Público

- Após a seção "Próximo passo" no relatório, adicionar botão "Agendar apresentação de insights"
- Integração com Calendly ou Cal.com
- Lead quente agenda no momento de maior interesse, sem trocar e-mails

---

## Fase 3 — Monitor Contínuo
**Objetivo:** transformar diagnóstico pontual em assinatura recorrente.  
**Prazo estimado:** 90–180 dias  
**Critério de sucesso:** 10 clientes pagantes no plano Starter ou Pro.

### 3.1 Agendamento Automático de Diagnósticos

- Cron job via Supabase Edge Functions ou Netlify Scheduled Functions
- Frequência configurável por plano: semanal (Pro), mensal (Starter), diário (Enterprise)
- Gera diagnóstico automaticamente sem ação manual
- Compara com diagnóstico anterior e calcula delta de scores

### 3.2 Dashboard de Evolução de Scores

- Gráfico de linha: singularidade, consistência, posicionamento ao longo do tempo
- Marcadores de eventos: "campanha lançada", "novo produto", "mudança de CEO"
- Comparativo mês a mês com variação em pontos
- Insight automático: "seu score de consistência caiu 1.5 pontos — veja o que mudou"

### 3.3 Sistema de Alertas

**Tipos de alerta:**
- Score caiu mais de 1 ponto em qualquer prática
- Volume de reclamações no Reclame Aqui aumentou >20%
- Glassdoor score caiu abaixo de 3.5
- Novo concorrente detectado no segmento
- Menções negativas em alta nos últimos 7 dias

**Canais:** e-mail, notificação in-app, webhook para Slack/Teams

### 3.4 Feed de Sinais de Marca

Timeline de eventos relevantes capturados automaticamente:
- Novos anúncios ativos detectados
- Review negativo em destaque (Reclame Aqui / Google)
- Vaga estratégica aberta (Head of Brand, CMO, etc.)
- Menção em veículo de mídia
- Mudança significativa no site ou posicionamento

### 3.5 Relatório Mensal Automático

- Gerado no dia 1 de cada mês
- PDF formatado com identidade LOUDR
- Conteúdo: comparativo do mês anterior, alertas do período, top 3 recomendações
- Enviado automaticamente para todos os usuários do workspace

---

## Fase 4 — Inteligência Competitiva
**Objetivo:** tornar a plataforma indispensável para decisões estratégicas de marca.  
**Prazo estimado:** 180–365 dias  
**Critério de sucesso:** 30 clientes pagantes, MRR de R$ 50.000+.

### 4.1 Workspace Competitivo

- Cliente adiciona até 5 concorrentes para monitorar (conforme plano)
- Dashboard comparativo: scores lado a lado
- Histórico de evolução de cada concorrente
- Detecção de movimentos: "Boticário lançou 3 campanhas novas esta semana"

### 4.2 Mapa de Territórios de Mercado

Visualização estratégica do setor:
- Eixos: singularidade vs. consistência
- Posicionamento de cada player no quadrante
- Atualizado automaticamente a cada diagnóstico
- Identifica territórios vagos — oportunidades de posicionamento

### 4.3 Alertas Competitivos

- "Seu principal concorrente abriu 3 vagas de brand — sinal de investimento"
- "Natura lançou campanha nova no mesmo território que você reivindica"
- "O Boticário recebeu cobertura em 8 veículos esta semana"
- Frequência: diária (Enterprise), semanal (Pro)

### 4.4 Benchmarks por Setor

- Score médio do setor por prática
- Posição relativa do cliente no ranking
- Top 3 empresas de referência com scores anonimizados
- Atualizado a cada novo diagnóstico gerado na plataforma

---

## Modelo de Negócio

### Planos e Preços

| | Starter | Pro | Enterprise |
|--|---------|-----|-----------|
| **Preço** | R$ 490/mês | R$ 1.490/mês | R$ 3.990/mês |
| Diagnósticos/mês | 1 | 3 | Ilimitado |
| Monitor | Mensal | Semanal | Diário |
| Concorrentes | — | 2 | 5 |
| Usuários | 1 | 3 | Ilimitado |
| Relatório PDF | ✓ | ✓ | ✓ |
| Alertas | Básico | Avançado | Tempo real |
| Call com LOUDR | — | — | Mensal |
| Trial | 14 dias | 14 dias | 14 dias |

### Funil de Conversão

```
Diagnóstico gratuito (isca)
        ↓
Call de apresentação de insights (20 min)
        ↓
Brand Discovery Sprint (R$ 8–15k, escopo fixo)
        ↓
Plano Starter ou Pro (recorrência mensal)
        ↓
Plano Enterprise (retainer disfarçado de SaaS)
```

### Projeção de MRR

| Marco | Clientes | MRR estimado |
|-------|----------|-------------|
| Fase 2 concluída | 5 | R$ 7.450 |
| Fase 3 concluída | 20 | R$ 29.800 |
| Fase 4 concluída | 50 | R$ 74.500 |
| Maturidade | 100 | R$ 149.000+ |

### Posicionamento Competitivo

**Não existe concorrente direto no Brasil** que combine:
- Framework proprietário de brand strategy (Smart Branding)
- Dados públicos em tempo real
- Monitoramento contínuo de scores
- Inteligência competitiva de marca
- Entrega em 48h

Referências internacionais (Brandwatch, Sprinklr, Mention) focam em social listening e não em diagnóstico estratégico de marca. O LOUDR Brand Intelligence ocupa um território único.

---

## Ativo Estratégico de Longo Prazo

Com escala, a plataforma acumula o maior banco de dados de inteligência de marca do Brasil:

- Scores históricos de centenas de empresas por setor
- Benchmarks proprietários por vertical
- Correlações entre movimentos de marca e performance de negócio
- Dados que nenhum concorrente tem e que levam anos para construir

Este ativo transforma a LOUDR de agência em empresa de dados — e é defensável por natureza.

---

## Decisões Técnicas

### Stack confirmada
| Camada | Tecnologia |
|--------|-----------|
| Frontend | Vite + React |
| Backend | Netlify Functions |
| Auth + DB | Supabase |
| AI | Anthropic API (claude-sonnet-4-5) |
| E-mail | Resend |
| Billing | Stripe |
| Deploy | Netlify |

### Princípios de arquitetura
1. **Expandir, não reescrever** — o código atual é a base, não o problema
2. **Supabase como fonte de verdade** — auth, banco, edge functions, storage
3. **Netlify Functions para tudo server-side** — proxy API, webhooks, cron jobs
4. **RLS no Supabase** — isolamento de dados por workspace desde o início
5. **Sem dependências desnecessárias** — CSS inline, sem biblioteca de UI

---

## Próximos Passos Imediatos

1. **Migrar para Vite** — remover Create React App, configurar Vite
2. **Criar Netlify Function de proxy** — `netlify/functions/anthropic.js`
3. **Deploy no Netlify** — conectar repositório, configurar variáveis de ambiente
4. **Testar em produção** — gerar primeiro diagnóstico via URL pública
5. **Envio automático de e-mail** — Resend + Supabase Edge Function
6. **Estruturar Brand Discovery Sprint** — escopo, preço, deck de apresentação
7. **Calendly no relatório público** — botão de agendamento integrado

---

*Documento gerado pela LOUDR · Brand Intelligence · Maio 2026*  
*Próxima revisão: Agosto 2026*
