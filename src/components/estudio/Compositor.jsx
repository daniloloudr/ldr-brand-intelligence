import { Box, Paper, Stack, Typography, Divider } from '@mui/material'

// ════════════════════════════════════════════════════════════════════
// Compositor — a bancada de Criar, uma anatomia só para os três formatos.
//
// O problema que resolve: imagem e vídeo tinham o mesmo card; texto tinha um
// grid de duas colunas com sete cards empilhados. Eram três telas que não
// pareciam o mesmo produto, e a diferença não vinha do formato — vinha de
// ninguém ter escrito o esqueleto uma vez.
//
// O esqueleto, de cima para baixo, é a ordem em que a pessoa decide:
//
//   ATALHOS   o jeito rápido de começar (templates, frameworks)
//   PEDIDO    o que ela quer — o campo grande, ou os campos do framework
//   INSUMOS   com o quê (referências, frames de origem)
//   AJUSTES   como (modelo, formato, quantidade, duração)
//   ─────────
//   AÇÃO      o que a marca põe nisto · o custo · o botão
//
// O que faz UMA anatomia servir a TRÊS formatos: faixa sem conteúdo não
// aparece. Texto usa atalhos + pedido + ação; imagem usa as cinco. A tela muda
// de tamanho, não de gramática — e é por isso que ela segue parecendo a mesma.
//
// A faixa de ação é a única com divisor acima: é o ponto de compromisso, onde
// se gasta crédito. As outras separam por espaço e rótulo, que já bastam.
// ════════════════════════════════════════════════════════════════════

// O rótulo de faixa — o mesmo em toda a bancada, para que o olho encontre a
// mesma coisa no mesmo lugar ao trocar de formato.
export const rotuloFaixa = {
  fontSize: 11, fontWeight: 800, letterSpacing: '0.08em',
  textTransform: 'uppercase', color: 'text.secondary',
}

// Uma faixa: rótulo à esquerda, ação opcional à direita (ex.: "Melhorar o
// prompt"), conteúdo abaixo. Devolve null sem conteúdo — é o que permite o
// mesmo componente servir formatos que não têm insumo nem ajuste.
export function Faixa({ rotulo, acao, children, sx }) {
  if (!children) return null
  return (
    <Box sx={{ mb: 2, ...sx }}>
      {(rotulo || acao) && (
        <Stack direction="row" alignItems="center" sx={{ mb: 0.75, minHeight: 28 }}>
          {rotulo && <Typography sx={rotuloFaixa}>{rotulo}</Typography>}
          <Box sx={{ flex: 1 }} />
          {acao}
        </Stack>
      )}
      {children}
    </Box>
  )
}

/**
 * A bancada. Cada formato preenche os espaços que tem; o resto some.
 *
 * @param assinatura  o que a MARCA põe nesta peça (inteligência, referências).
 *                    Fica na faixa de ação de propósito: é a diferença entre
 *                    isto e um gerador genérico, e precisa estar visível na
 *                    hora de apertar o botão, não escondida no topo.
 */
export function Compositor({ atalhos, pedido, insumos, ajustes, assinatura, aviso, medidor, acao }) {
  return (
    <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, mb: 3 }}>
      {atalhos}
      {pedido}
      {insumos}
      {ajustes}

      <Divider sx={{ mb: 2 }} />

      <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
        {assinatura}
        <Box sx={{ flex: 1, minWidth: 8 }} />
        {aviso}
        {medidor}
        {acao}
      </Stack>
    </Paper>
  )
}

export default Compositor
