import { SYSTEM_PROMPT, RATE_LIMIT_WAIT, MAX_RETRIES } from "./constants";
import { tryParseJSON } from "./helpers";

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
