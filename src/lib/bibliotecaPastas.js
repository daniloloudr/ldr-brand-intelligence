// ════════════════════════════════════════════════════════════════════
// bibliotecaPastas.js — a pasta é CAMINHO: "Catálogo/49FP/20260904" é uma
// árvore, e o `/` significa nível.
//
// Estas regras moravam dentro da StudioLibrary e o teste as provava numa
// CÓPIA colada — a varredura de mutação mostrou que dava para quebrar a
// página sem nenhum teste ficar vermelho. Aqui elas têm um endereço só,
// e a página e o teste importam o mesmo código.
// ════════════════════════════════════════════════════════════════════

// `caminho` está dentro de `atual`? O `+ '/'` é a regra inteira: sem ele,
// "Catálogo2" viraria filho de "Catálogo" por semelhança de prefixo.
export const dentroDe = (caminho, atual) => {
  if (!caminho) return false
  if (!atual) return true
  return caminho === atual || caminho.startsWith(atual + '/')
}

// O próximo segmento de `caminho` a partir de `atual` — null se for o fim.
export const proximoNivel = (caminho, atual) => {
  const resto = atual ? caminho.slice(atual.length + 1) : caminho
  if (!resto) return null
  const seg = resto.split('/')[0]
  return atual ? `${atual}/${seg}` : seg
}

// As subpastas imediatas de `atual`, únicas e ordenadas.
export const filhosDe = (caminhos, atual) => [...new Set((caminhos || [])
  .filter(c => dentroDe(c, atual) && c !== atual)
  .map(c => proximoNivel(c, atual))
  .filter(Boolean))].sort()
