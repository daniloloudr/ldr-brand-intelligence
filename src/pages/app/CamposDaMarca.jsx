// CamposDaMarca.jsx — a marca lida como documento, editada no ponto.
//
// Antes, 36 campos eram 36 caixas de formulário empilhadas: um campo vazio e um
// com três parágrafos tinham o mesmo peso visual, e ler a marca inteira exigia
// atravessar formulário. O pedido do Danilo foi "algo estilo markdown" — a
// FORMA de documento, não texto livre.
//
// Por que não markdown de verdade: a extração escreve campo a campo, o Juiz
// aplica regra por campo (`vocabulario_proibido` é lista que ele consulta, não
// parágrafo), e a pendência aponta um endereço (`verbal_identity.visao`). Texto
// livre apaga esse endereço — e é justamente ele que faz a notificação
// aterrissar no lugar certo.
//
// Então: lê como documento, edita como campo. Clicar num trecho abre a edição
// ali e só ali; sair fecha. O vazio aparece como "— em branco —", igual ao
// smartbrand, para a lacuna ser visível sem precisar de indicador inventado.
import { useState } from 'react'
import { Box, Typography, TextField, IconButton, Paper, Stack, Chip, Divider } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import CheckIcon from '@mui/icons-material/Check'
import { ArquetipoSelector } from './BrandSection'

const LEITURA = 74   // ch — largura de prosa confortável

const Rotulo = ({ children }) => (
  <Typography component="h4" sx={{
    fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase',
    color: 'text.disabled', mb: .75,
  }}>{children}</Typography>
)

const Vazio = () => (
  <Typography sx={{ fontSize: 15, color: 'text.disabled', fontStyle: 'italic' }}>
    — em branco —
  </Typography>
)

const Prosa = ({ children }) => (
  <Typography sx={{ fontSize: 15, lineHeight: 1.75, whiteSpace: 'pre-wrap', maxWidth: `${LEITURA}ch` }}>
    {children}
  </Typography>
)

const vazio = (v) => v === null || v === undefined || v === ''
  || (Array.isArray(v) && v.filter(x => x && (typeof x !== 'object' || Object.values(x).some(Boolean))).length === 0)

// ── Leitura de cada tipo ─────────────────────────────────────────────
function Lido({ def, valor }) {
  if (vazio(valor)) return <Vazio />

  if (def.tipo === 'chips') {
    return (
      <Stack direction="row" flexWrap="wrap" gap={.75} sx={{ maxWidth: `${LEITURA}ch` }}>
        {(valor || []).filter(Boolean).map((t, i) => (
          <Chip key={i} label={t} size="small" variant="outlined" sx={{ fontWeight: 600 }} />
        ))}
      </Stack>
    )
  }

  if (def.tipo === 'itens') {
    return (
      <Stack spacing={2} sx={{ maxWidth: `${LEITURA}ch` }}>
        {(valor || []).filter(it => it && Object.values(it).some(Boolean)).map((it, i) => (
          <Box key={i} sx={{ borderLeft: '2px solid', borderColor: 'divider', pl: 2 }}>
            {def.fields.map(f => vazio(it[f.key]) ? null : (
              <Typography key={f.key} sx={{ fontSize: 14.5, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                <Box component="span" sx={{ color: 'text.secondary', fontWeight: 600 }}>{f.label}: </Box>
                {it[f.key]}
              </Typography>
            ))}
          </Box>
        ))}
      </Stack>
    )
  }

  return <Prosa>{valor}</Prosa>
}

// ── Edição de cada tipo ──────────────────────────────────────────────
const tf = { '& .MuiInputBase-input': { fontSize: 15, lineHeight: 1.7 } }

function ChipsEditor({ valor, onChange, ph }) {
  const [texto, setTexto] = useState('')
  const lista = valor || []
  const add = () => { const t = texto.trim(); if (!t) return; onChange([...lista, t]); setTexto('') }
  return (
    <Box sx={{ maxWidth: `${LEITURA}ch` }}>
      <Stack direction="row" flexWrap="wrap" gap={.75} sx={{ mb: 1 }}>
        {lista.map((t, i) => (
          <Chip key={i} label={t} size="small" onDelete={() => onChange(lista.filter((_, j) => j !== i))} />
        ))}
      </Stack>
      <TextField value={texto} onChange={e => setTexto(e.target.value)} placeholder={ph}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
        size="small" fullWidth autoFocus sx={tf} />
    </Box>
  )
}

function ItensEditor({ valor, onChange, def }) {
  const lista = valor || []
  const edit = (i, k, v) => onChange(lista.map((it, j) => j === i ? { ...it, [k]: v } : it))
  return (
    <Stack spacing={1.5} sx={{ maxWidth: `${LEITURA}ch` }}>
      {lista.map((it, i) => (
        <Paper key={i} variant="outlined" sx={{ p: 2, position: 'relative', borderRadius: 2 }}>
          <Stack spacing={1.25}>
            {def.fields.map(f => (
              <TextField key={f.key} label={f.label} value={it[f.key] || ''} placeholder={f.ph}
                onChange={e => edit(i, f.key, e.target.value)}
                multiline={f.multiline} rows={f.multiline ? 3 : undefined}
                size="small" fullWidth sx={tf} />
            ))}
          </Stack>
          <IconButton size="small" onClick={() => onChange(lista.filter((_, j) => j !== i))}
            sx={{ position: 'absolute', top: 6, right: 6 }}>
            <DeleteOutlineIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Paper>
      ))}
      <Chip icon={<AddIcon />} label={def.addLabel} variant="outlined" sx={{ alignSelf: 'flex-start', fontWeight: 700 }}
        onClick={() => onChange([...lista, Object.fromEntries(def.fields.map(f => [f.key, '']))])} />
    </Stack>
  )
}

function Editor({ def, valor, onChange, fechar }) {
  if (def.tipo === 'chips')     return <ChipsEditor valor={valor} onChange={onChange} ph={def.ph} />
  if (def.tipo === 'itens')     return <ItensEditor valor={valor} onChange={onChange} def={def} />
  if (def.tipo === 'arquetipo') return <ArquetipoSelector value={valor} onChange={onChange} />
  return (
    <TextField value={valor || ''} onChange={e => onChange(e.target.value)} placeholder={def.ph}
      multiline={def.tipo !== 'texto'} rows={def.tipo === 'texto' ? undefined : (def.rows || 3)}
      fullWidth autoFocus sx={{ ...tf, maxWidth: `${LEITURA}ch` }}
      onBlur={def.tipo === 'texto' || def.tipo === 'area' || !def.tipo ? fechar : undefined} />
  )
}

// ── Um campo: lê, e abre quando clicado ──────────────────────────────
function Campo({ def, valor, onChange, aberto, abrir, fechar }) {
  // Tipos compostos (lista, chips, arquétipo) não fecham no blur: sair de um
  // input para clicar em "adicionar" ainda é estar editando.
  const composto = ['chips', 'itens', 'arquetipo'].includes(def.tipo)

  return (
    <Box data-campo={`${def.col}.${def.k}`}
      onClick={aberto ? undefined : abrir}
      sx={{
        py: 1.5, cursor: aberto ? 'default' : 'pointer', borderRadius: 1,
        transition: 'background-color .12s',
        ...(aberto ? {} : { '&:hover': { bgcolor: 'action.hover' }, '&:hover .lapis': { opacity: 1 } }),
      }}>
      <Stack direction="row" alignItems="center" spacing={.75} sx={{ mb: .25 }}>
        <Rotulo>{def.label}</Rotulo>
        {!aberto && (
          <EditOutlinedIcon className="lapis"
            sx={{ fontSize: 13, color: 'text.disabled', opacity: 0, transition: 'opacity .12s', mb: .75 }} />
        )}
      </Stack>

      {aberto ? (
        <Box onClick={e => e.stopPropagation()}>
          <Editor def={def} valor={valor} onChange={onChange} fechar={fechar} />
          {composto && (
            <Chip icon={<CheckIcon />} label="concluir" size="small" onClick={fechar}
              sx={{ mt: 1.5, fontWeight: 700 }} />
          )}
        </Box>
      ) : (
        <Lido def={def} valor={valor} />
      )}
    </Box>
  )
}

/**
 * @param {Array}  mapa    lista vinda de campos.js
 * @param {object} dados   { verbal_identity: {...}, strategy: {...} }
 * @param {func}   onChange(coluna, chave, valor)
 * @param {object} extras  nós avulsos por grupo (ex.: o território aprendido)
 */
export function CamposDaMarca({ mapa, dados, onChange, extras = {} }) {
  const [editando, setEditando] = useState(null)

  const blocos = []
  let atual = null
  for (const def of mapa) {
    if (def.grupo) { atual = { grupo: def.grupo, campos: [] }; blocos.push(atual); continue }
    if (!atual) { atual = { grupo: null, campos: [] }; blocos.push(atual) }
    atual.campos.push(def)
  }

  return (
    <Box sx={{ maxWidth: 860 }}>
      {blocos.map((b, i) => (
        <Box key={i} sx={{ mb: 6 }}>
          {b.grupo && (
            <>
              <Typography component="h3" sx={{
                fontSize: 20, fontWeight: 700, letterSpacing: '-.015em', mb: .5,
              }}>{b.grupo}</Typography>
              <Divider sx={{ mb: 2.5 }} />
            </>
          )}
          {extras[b.grupo] && <Box sx={{ mb: 2.5 }}>{extras[b.grupo]}</Box>}

          <Stack divider={<Divider light />}>
            {b.campos.map(def => (
              <Campo key={def.k} def={def}
                valor={dados[def.col]?.[def.k]}
                onChange={val => onChange(def.col, def.k, val)}
                aberto={editando === `${def.col}.${def.k}`}
                abrir={() => setEditando(`${def.col}.${def.k}`)}
                fechar={() => setEditando(null)} />
            ))}
          </Stack>
        </Box>
      ))}
    </Box>
  )
}
