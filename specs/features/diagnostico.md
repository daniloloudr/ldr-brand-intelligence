# LOUDR — Diagnóstico de Marca (Posicionamento)
**Versão:** 2.0 · Julho 2026 · **Status:** ✅ em produção
**Owner:** Danilo Silva · LOUDR
**Relação:** produtor de sinal da [Camada de Inteligência](./brand-intelligence.md); é a leitura externa da marca via dados públicos.

---

## O que é
Diagnóstico Smart Branding gerado por IA a partir de **dados públicos** (site, LinkedIn, reputação/Reclame Aqui, redes, concorrentes). Lê a marca, mede scores (singularidade, consistência, posicionamento), identifica o gap declarado × percebido e aponta **territórios possíveis de atuação**.

**Serve dois lugares** — e ambos renderizam pelo **mesmo componente** `src/components/RelatorioCompleto.jsx`:
- **Interno** (app): `Posicionamento.jsx` / `Diagnostico.jsx`.
- **Público** (link compartilhável): `RelatorioPublico.jsx` (rota `#/relatorio/:id`).

Exportações: `src/lib/pdf.js` e `src/lib/pptx.js`. Card de gap na Home (`Home.jsx`, "Territórios para explorar").

---

## Arquitetura
- **Geração:** `netlify/functions/diagnostico-gerar-background.js` (background + polling) com `aiConfig('premium')` (Sonnet 4.6 + **web search sempre** — sem busca o modelo alucina dados públicos). Prompt em `netlify/functions/_prompt.js` (`SYSTEM_PROMPT`).
- **Armazenamento:** tabela `diagnosticos` — o JSON completo vive em `diagnosticos.data` (jsonb); alguns campos promovidos a colunas (`score_*`, `frase_diagnostico`, `status`, `publico`). Fluxo de geração: cria linha pendente → `UPDATE` com `data` + `status='done'`.
- **Renderização única:** `RelatorioCompleto.jsx` recebe `{ ...row, ...row.data }`, então lê tudo de `data`. Um só ponto de mudança cobre interno + público.
- **Resiliência (jul/2026):** a geração tenta **até 3 vezes** (falha de API/timeout ou JSON inválido; backoff 4s/8s) antes de gravar `status='error'`. Um **reaper** agendado (`diagnostico-reaper.js`, cron `*/15`) marca como `error` qualquer diagnóstico preso em `running` há mais de **15 min** — cobre jobs órfãos (background interrompida: dev server morto, timeout duro, crash sem catch), que antes ficavam "em andamento" pra sempre.
- **Timeout da chamada de IA (bug prod × localhost):** a chamada não-streaming com `web_search` podia **enrolar/pendurar** por minutos. No localhost (`netlify dev`, sem teto) completava; em prod estourava o teto de 15 min da background function → o reaper marcava `error`. Fix em `_ai.js`: `callAI` ganhou **`timeoutMs`** (AbortController cobrindo fetch + leitura do corpo → converte hang em `AIError 408` retentável) e o tool `web_search` ganhou **`max_uses: 8`** (bounda o loop de busca). Diagnóstico usa `timeoutMs: 240000` (4 min/tentativa × 3 cabe nos 15 min).

---

## Reframe de território (v2 — jul/2026)

**Origem:** feedback real de prospect (Vhita / Rogério Cruz, engenheiro sofisticado em marketing). Validou a **precisão** ("interpretou 100% da marca") e a **cunha comercial** ("golaço — chega provando entendimento"), mas apontou **excesso de prescrição genérica**: o diagnóstico "batia" que devia consolidar um território ("longevidade") que era genérico, não diferenciava e não conversava com o público. Causa **estrutural**: o schema antigo OBRIGAVA `territorio_inexplorado` + 3 `oportunidades` sempre → o modelo fabricava quando faltava lastro.

**O que mudou no schema (`_prompt.js`):** `territorio_inexplorado` (1 frase) + `oportunidades` (3 forçadas, "o que a LOUDR faria") → **`territorios_possiveis`** (1–3, **sem contagem fixa**):

```json
{ "nome": "", "tese": "por que ESTA marca pode reivindicar — específico, nunca genérico",
  "sustenta": "evidência concreta do material (cite fonte/canal)",
  "diferencia": "por que diferencia vs. concorrentes citados",
  "fit_publico": "como conversa com o público REAL",
  "tensao": "trade-off honesto / tensão com premissas atuais",
  "confianca": "alta | media | hipotese",
  "exploracao": "o que explorar — aberto, convida a co-construir; NUNCA 'a LOUDR fará X'" }
```

**Princípios (regras no prompt):**
1. **Não-genérico:** todo território passa por dois testes — (1) diferencia de verdade? (2) cabe no público real? Falhou em um, não propõe. Territórios amplos ("longevidade", "inovação") só valem se ancorados em evidência específica.
2. **Sem contagem forçada:** 1 território afiado > 3 genéricos. Pode entregar menos.
3. **Confiança calibrada:** `hipotese` permitido; linguagem de hipótese onde é inferência; `tensao` sempre honesta.
4. **Tom de parceiro** revelando espaço, não fornecedor empurrando serviço. Agência da LOUDR sutil e subordinada ao território. Labels: "O que a LOUDR faria" → **"Caminho a explorar"**; "Porta de entrada LOUDR" → **"Por onde começar a explorar"**.

**Backward-compat:** o renderizador e os exports fazem *fallback* para os campos legados (`territorio_inexplorado`, `oportunidades`) — diagnósticos já salvos e links públicos existentes não quebram.

---

## Captura na Camada de Inteligência
Migration **027** redefine o trigger `emit_signal_diagnostic`:
- Passa a capturar os **territórios** (`nome`, `tese`, `confianca`) no payload do sinal `diagnostic`, além dos scores.
- Passa a emitir **na conclusão** (`status='done'`), não só no insert — cobrindo o fluxo de geração (insert pendente → update done). Guard de idempotência: emite uma vez, na transição para `done`.

O destilador (`brand-distill-background.js` → `fmtSignal`) surfaceia os territórios (com confiança) para o modelo vivo aprender. Territórios marcados `hipotese` recebem peso menor pela calibração do destilador. Ver [brand-intelligence.md](./brand-intelligence.md).

---

## Fora de escopo / próximos
- **Gaps mensurados em R$:** deliberadamente **fora do material** — vira alavanca de negociação **pessoal** do Danilo, não impresso no diagnóstico (evita ser incisivo demais / risco de credibilidade).
- **v2 por-canal + consistência:** analisar cada canal sob rubrica + passo dedicado de consistência cruzada, com evidência **com fonte** (mata o "cara de Claude"). Próximo grande salto de profundidade.
- **Loop de correção:** botão "corrigir/refinar diagnóstico" → sinal vivo, para a 2ª rodada não repetir o erro.
- Opcional: camada de personas + JTBD.
