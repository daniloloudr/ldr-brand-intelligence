import { SYSTEM_PROMPT, RATE_LIMIT_WAIT, MAX_RETRIES } from "./constants";
import { tryParseJSON } from "./helpers";

function buildListeningPrompt(nome, dominio) {
  return `Pesquise menções recentes da marca "${nome}"${dominio ? ` (${dominio})` : ''}: reviews, redes sociais, notícias, reclamações.

Retorne APENAS este JSON:
{"events":[{"titulo":"<80chars>","conteudo":"<400chars>","fonte":"LinkedIn|Instagram|Twitter/X|Google Reviews|Reclame Aqui|Glassdoor|News|Blog","sentiment":"positivo|neutro|negativo","score_impacto":1,"url":"https://...ou null"}],"summary":{"positivo_pct":0,"neutro_pct":0,"negativo_pct":0,"total":0}}`
}

function parseListeningJSON(txt) {
  if (!txt) return null
  let s = txt.replace(/^```[a-z]*\n?/im, '').replace(/\n?```$/im, '').trim()
  try { const r = JSON.parse(s); if (Array.isArray(r.events)) return r } catch {}
  const j0 = s.indexOf('{'), j1 = s.lastIndexOf('}')
  if (j0 >= 0 && j1 > j0) {
    try { const r = JSON.parse(s.slice(j0, j1 + 1)); if (Array.isArray(r.events)) return r } catch {}
  }
  return null
}

const API_URL = '/.netlify/functions/anthropic';

export async function runStream({ empresa, contexto, onSearchStep, onText, onDone, onError, onRateLimit }) {
  let attempt = 0;

  while (attempt < MAX_RETRIES) {
    attempt++;
    try {
      const headers = { "Content-Type": "application/json" };

      const res = await fetch(API_URL, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: "claude-sonnet-4-5",
          max_tokens: 5500,
          stream: true,
          system: SYSTEM_PROMPT,
          tools: [{ type: "web_search_20250305", name: "web_search" }],
          messages: [{ role: "user", content: `Diagnóstico Smart Branding para: "${empresa}".${contexto ? `\nContexto: ${contexto}` : ""}\nGere o JSON completo.` }],
        }),
      });

      if (res.status === 429 || res.status === 529) {
        if (attempt >= MAX_RETRIES) { onError("Limite de uso da API atingido. Aguarde alguns minutos e tente novamente."); return; }
        const wait = res.status === 529 ? Math.min(RATE_LIMIT_WAIT * attempt, 120) : RATE_LIMIT_WAIT;
        if (onRateLimit) {
          for (let s = wait; s > 0; s--) {
            onRateLimit(s, attempt);
            await new Promise(r => setTimeout(r, 1000));
          }
          onRateLimit(0, attempt);
        } else {
          await new Promise(r => setTimeout(r, wait * 1000));
        }
        continue;
      }

      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.error?.message || `Erro ${res.status}`); }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "", fullText = "", searchCount = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop();
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") continue;
          let evt; try { evt = JSON.parse(data); } catch { continue; }
          if (evt.type === "content_block_start" && evt.content_block?.type === "tool_use") {
            searchCount++;
            onSearchStep(searchCount, evt.content_block?.input?.query || "");
          }
          if (evt.type === "content_block_delta" && evt.delta?.type === "text_delta") {
            fullText += evt.delta.text || "";
            onText(fullText);
            try { localStorage.setItem("loudr_stream", JSON.stringify({ text: fullText, ts: Date.now() })); } catch {}
          }
          if (evt.type === "message_stop") {
            const parsed = tryParseJSON(fullText);
            if (parsed) { localStorage.removeItem("loudr_stream"); onDone(parsed); }
            else onError("Não foi possível extrair o diagnóstico. Tente novamente.");
          }
        }
      }
      return;
    } catch (e) { onError(e.message || "Erro desconhecido."); return; }
  }
}

export async function coletarListening({ workspaceId, token }) {
  const res = await fetch('/.netlify/functions/listening-coletar', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ workspace_id: workspaceId }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = data?.error || (data?.errorType === 'TimeoutError' ? 'O listening demorou mais que o limite local. Tente em produção.' : `Erro ${res.status}`)
    throw new Error(msg)
  }
  return data
}

export async function gerarDiagnosticoServidor({ workspaceId, contexto, token }) {
  const res = await fetch('/.netlify/functions/diagnostico-gerar', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ workspace_id: workspaceId, contexto: contexto || null }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = data?.error || (data?.errorType === 'TimeoutError' ? 'O diagnóstico demorou mais que o limite local. Tente novamente ou use o ambiente de produção.' : `Erro ${res.status}`)
    throw new Error(msg)
  }
  return data.diagnostico
}

export async function runListening({ workspace, onSearchStep, onDone, onError }) {
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 2048,
        stream: true,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{ role: 'user', content: buildListeningPrompt(workspace.nome, workspace.dominio) }],
      }),
    })

    if (res.status === 429 || res.status === 529) {
      throw new Error('Limite de uso da API atingido. Aguarde 1 minuto e tente novamente.')
    }

    if (!res.ok) {
      const e = await res.json().catch(() => ({}))
      throw new Error(e?.error?.message || `Erro ${res.status}`)
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = '', fullText = '', searchCount = 0

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop()
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const data = line.slice(6).trim()
        if (data === '[DONE]') continue
        let evt; try { evt = JSON.parse(data) } catch { continue }
        if (evt.type === 'content_block_start' && evt.content_block?.type === 'tool_use') {
          searchCount++
          onSearchStep?.(searchCount, evt.content_block?.input?.query || '')
        }
        if (evt.type === 'content_block_delta' && evt.delta?.type === 'text_delta') {
          fullText += evt.delta.text || ''
        }
        if (evt.type === 'message_stop') {
          const parsed = parseListeningJSON(fullText)
          if (parsed) onDone(parsed)
          else onError('Não foi possível extrair os dados de listening.')
        }
      }
    }
  } catch (e) {
    onError(e.message || 'Erro desconhecido.')
  }
}
