// ════════════════════════════════════════════════════════════════════
// papeis.js — a leitura humana de papel + capacidades.
//
// O dado é `role` (owner|member) mais duas capacidades independentes. Aprovar
// PEÇA e aprovar APRENDIZADO não são níveis de uma escada: quem faz as duas
// coisas não deve obrigar a inventar um papel novo (e uma migration nova).
//
// Só que "member + pode_aprovar_pecas" não é frase que se mostre a um cliente.
// Daí os presets: a tela oferece nomes, o banco guarda a composição.
//
// A tabela é ESPELHO de PRESETS em netlify/functions/_papeis.js. Divergir aqui
// é oferecer na tela um papel que o servidor recusa — `tests/papeis.test.js`
// compara as duas e fica vermelho se alguém mexer só de um lado.
// ════════════════════════════════════════════════════════════════════

export const PRESETS = {
  dono: {
    label: 'Dono',
    descricao: 'Gerencia o time e os acessos. Aprova peças e aprendizado.',
    role: 'owner', pode_aprovar_pecas: true, pode_aprovar_aprendizado: true,
  },
  curador: {
    label: 'Curador da marca',
    descricao: 'Aprova peças e decide o que a marca aprende.',
    role: 'member', pode_aprovar_pecas: true, pode_aprovar_aprendizado: true,
  },
  aprovador: {
    label: 'Aprovador',
    descricao: 'Aprova peças e campanhas. Não altera o aprendizado da marca.',
    role: 'member', pode_aprovar_pecas: true, pode_aprovar_aprendizado: false,
  },
  criador: {
    label: 'Criador',
    descricao: 'Cria, escreve e roda fluxos. Sugere, mas não aprova.',
    role: 'member', pode_aprovar_pecas: false, pode_aprovar_aprendizado: false,
  },
}

export const ORDEM_PRESETS = ['dono', 'curador', 'aprovador', 'criador']

/** Do dado gravado para o nome do preset. Combinação fora da tabela = 'criador'
 *  com aviso na tela: melhor mostrar o menor privilégio do que inventar rótulo. */
export function presetDoMembro(m) {
  if (!m) return 'criador'
  const achado = ORDEM_PRESETS.find(k => {
    const p = PRESETS[k]
    return p.role === m.role
      && p.pode_aprovar_pecas === !!m.pode_aprovar_pecas
      && p.pode_aprovar_aprendizado === !!m.pode_aprovar_aprendizado
  })
  return achado || 'criador'
}

/** O que mandar ao servidor quando a pessoa escolhe um preset na tela. */
export function papelDoPreset(chave) {
  const p = PRESETS[chave] || PRESETS.criador
  return {
    role: p.role,
    pode_aprovar_pecas: p.pode_aprovar_pecas,
    pode_aprovar_aprendizado: p.pode_aprovar_aprendizado,
  }
}

export const rotuloDoMembro = (m) => PRESETS[presetDoMembro(m)].label
