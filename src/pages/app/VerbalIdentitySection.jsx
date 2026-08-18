// VerbalIdentitySection.jsx — a EXPRESSÃO verbal: as palavras da marca.
//
// Esta tela tinha 27 campos e era a causa da confusão: dez deles (propósito,
// missão, visão, valores, posicionamento, proposta de valor, personalidade,
// atributos de tom, personas, público) também existiam nas telas de Essência,
// Função e Personalidade. A pessoa editava num lugar, abria o outro, via o
// mesmo dado com outro rótulo, e não sabia qual valia.
//
// Cada um foi para o seu lugar (ver campos.js). O que fica aqui é o que
// realmente pertence à Expressão: as palavras prontas — vocabulário, texto de
// referência e como falar em cada situação. É o material que o Estúdio consome
// direto; o resto é o que a marca É, e mora nas abas anteriores.
import { Box } from '@mui/material'
import { CamposDaMarca } from './CamposDaMarca'
import { EXPRESSAO_VERBAL } from './campos'

export function VerbalIdentitySection({ data, onChange }) {
  const d = data || {}
  return (
    <Box sx={{ maxWidth: 920 }}>
      <CamposDaMarca
        mapa={EXPRESSAO_VERBAL}
        dados={{ verbal_identity: d }}
        onChange={(_col, k, val) => onChange({ ...d, [k]: val })}
      />
    </Box>
  )
}
