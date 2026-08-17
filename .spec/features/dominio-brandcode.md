# Virada de domínio — s1ngulr.com → br4ndcode.com

> **Decisão (Danilo, 2026-08-17): CORTE SECO.** Sem convivência de domínios. Tudo que aponta para `s1ngulr.com` morre na virada: links salvos, convites já enviados, sessões abertas.
> **Nome:** o produto se escreve **brandcode**; o "4" existe só no domínio (`br4ndcode.com`).
> **O código já está pronto** (v8.1). O que falta é infraestrutura — e **tudo abaixo é ação em produção, portanto sua**. Nada aqui foi executado.

---

## 0. O que já foi feito no repo (nada em prod)

| Item | Onde |
|---|---|
| `PRODUCT_NAME = 'brandcode'` (fonte única do nome visível) | `src/lib/helpers.js` |
| `ROOT_DOMAIN` lê `VITE_ROOT_DOMAIN`, padrão `br4ndcode.com` | `src/lib/helpers.js` |
| Provisionamento de subdomínio usa `process.env.ROOT_DOMAIN` (padrão novo) | `netlify/functions/admin-create-workspace.js` |
| Wordmark do produto em um lugar só | `src/components/Wordmark.jsx` |
| Rota `/app/inteligencia` (+ shim aceitando `/app/ia-loudr`) | `src/lib/helpers.js` |
| Script de reprovisionamento dos aliases (dry-run por padrão) | `scripts/provision-subdomains.mjs` |

---

## 1. Sequência de execução (a ordem importa)

### Passo 1 — DNS do br4ndcode.com
- Registrar/apontar `br4ndcode.com` para o **Netlify DNS** (nameservers `nsone`), igual foi feito com o s1ngulr.com.
- Motivo de ser Netlify DNS e não externo: o auto-provisionamento de subdomínio por marca depende de o apex estar sob a zona do Netlify — é assim que DNS + certificado saem automáticos a cada workspace criado.
- ⏱ Propagação: contar algumas horas. **Faça isso primeiro**, na véspera do resto.

### Passo 2 — Domínios no site do Netlify
1. `br4ndcode.com` como **domínio principal** do site.
2. Adicionar alias `app.br4ndcode.com` (login + admin).
3. Adicionar um alias por marca ativa: `hering.br4ndcode.com`, `worten.br4ndcode.com`, … (o `provision-subdomains.mjs` faz isso em lote — ver §2).
4. Conferir que o certificado (Let's Encrypt) cobriu todos os hosts antes de anunciar a virada.

### Passo 3 — Variáveis de ambiente (Netlify → Site settings → Environment)
| Variável | Valor | Quem usa |
|---|---|---|
| `ROOT_DOMAIN` | `br4ndcode.com` | `admin-create-workspace` (alias do subdomínio) |
| `VITE_ROOT_DOMAIN` | `br4ndcode.com` | front (resolução de tenant) — sem ela o padrão do código já é o certo |
| `VITE_APP_URL` | `https://app.br4ndcode.com` | `admin-invite` (`redirectTo` do convite) |
| `NETLIFY_API_TOKEN` | (mantém) | auto-provisionamento |

⚠️ Alterar env no Netlify **não republica sozinho** — dispare um deploy depois (as `VITE_*` entram no bundle em build time).

### Passo 4 — Supabase Auth (o ponto que mais quebra)
`Authentication → URL Configuration`:
- **Site URL** → `https://app.br4ndcode.com`
- **Redirect URLs** → adicionar `https://app.br4ndcode.com/**` e `https://*.br4ndcode.com/**`
- Remover as entradas de `s1ngulr.com` **só depois** de validar um convite ponta a ponta.

Sem isso, o convite de novo usuário (Hering/Worten) chega com link que o Supabase recusa — e é exatamente o caminho de onboarding desta semana.

### Passo 5 — Validação antes de anunciar
- [ ] `app.br4ndcode.com` abre o login e o admin entra.
- [ ] `hering.br4ndcode.com` resolve o tenant certo e o RLS mantém o isolamento (entrar com um usuário da marca errada tem que negar).
- [ ] Convite novo: e-mail → definir senha → cai no workspace certo. **Testar com um endereço real**, porque o fluxo passa por `app.*` antes de mandar o usuário ao subdomínio da marca — é o trecho mais frágil da virada.
- [ ] Criar um workspace de teste no admin e confirmar que o alias `{slug}.br4ndcode.com` nasce sozinho (prova de que o Passo 1 ficou certo).
- [ ] Cron/watchdog rodando (o alerta agora assina "🚨 brandcode").

### Passo 6 — Desligar o antigo
- Remover os aliases `*.s1ngulr.com` do site no Netlify.
- Decidir o destino de `s1ngulr.com`: manter registrado e parado (recomendado — evita alguém pegar o domínio) ou redirecionar o apex para `br4ndcode.com`.

---

## 2. Reprovisionar os subdomínios das marcas existentes

O `admin-create-workspace` só provisiona no **momento da criação** — os workspaces que já existem não ganham alias no domínio novo sozinhos.

```bash
# 1) confere o que faria (não escreve nada)
node scripts/provision-subdomains.mjs

# 2) executa de fato (PATCH no site do Netlify)
node scripts/provision-subdomains.mjs --apply
```

Precisa de `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `NETLIFY_API_TOKEN` no ambiente (já estão no `.env`) e respeita `ROOT_DOMAIN`.

---

## 3. O que quebra no corte seco (esperado, não é bug)

| O quê | Efeito | Mitigação |
|---|---|---|
| Convites já enviados por e-mail | link morto | reenviar pelo admin depois do Passo 4 |
| Sessões abertas em `*.s1ngulr.com` | logout forçado | avisar quem estiver logado |
| Links salvos/favoritos dos clientes | 404 | mandar o link novo no anúncio |
| Deep-links `/app/ia-loudr` | **continuam funcionando** | shim de rota no `helpers.js` |

---

## 4. Fora do escopo desta virada (anotado para não esquecer)

- **Bucket R2 `dumps1ngulr`** — nome de infraestrutura, não é marca visível. Renomear é migração de bucket sem ganho; fica como está.
- **Relatório público de diagnóstico, PDF, página de metodologia e os prompts do Smart Branding** seguem assinados **LOUDR** (entregável e metodologia da agência). Se o time de criação quiser o relatório com a cara do brandcode, isso entra no bloco de layout — é decisão de posicionamento, não de código.
- **E-mail transacional** hoje sai pelo Supabase Auth (sem domínio próprio configurado). Quando houver remetente próprio (`@br4ndcode.com`), entra SPF/DKIM — item de entregabilidade, não da virada.
