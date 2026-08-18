// CamposDaMarca.jsx — desenha uma lista de campos do mapa (campos.js).
//
// As telas de Estratégia eram escritas à mão, campo a campo, e foi assim que
// dez deles acabaram em duas telas ao mesmo tempo. Aqui a tela é uma função da
// declaração: se o campo não está no mapa, não existe na interface — e não tem
// como existir duas vezes.
//
// De brinde, toda âncora (`data-campo`) sai automática. É por ela que uma
// pendência do sininho aterrissa no campo exato em vez de no topo da página.
import { Box, Typography, TextField, IconButton, Paper, Stack, Chip } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import { FieldLabel, SectionDivider, ChipInput, ArquetipoSelector } from './BrandSection'

const tf = { '& .MuiInputBase-input': { fontSize: 14 } }

function ListaDeItens({ items, onChange, fields, addLabel, vazio }) {
  const lista = items || []
  const add = () => onChange([...lista, Object.fromEntries(fields.map(f => [f.key, '']))])
  const edit = (i, key, val) => onChange(lista.map((it, j) => j === i ? { ...it, [key]: val } : it))
  const remove = (i) => onChange(lista.filter((_, j) => j !== i))

  return (
    <Stack spacing={1.5}>
      {lista.length === 0 && vazio && (
        <Typography variant="caption" color="text.disabled">{vazio}</Typography>
      )}
      {lista.map((it, i) => (
        <Paper key={i} variant="outlined" sx={{ p: 2, position: 'relative', borderRadius: 2 }}>
          <Stack spacing={1.25}>
            {fields.map(f => (
              <TextField key={f.key} label={f.label} value={it[f.key] || ''} placeholder={f.ph}
                onChange={e => edit(i, f.key, e.target.value)}
                multiline={f.multiline} rows={f.multiline ? 3 : undefined}
                size="small" fullWidth sx={tf} />
            ))}
          </Stack>
          <IconButton size="small" onClick={() => remove(i)}
            sx={{ position: 'absolute', top: 6, right: 6 }}>
            <DeleteOutlineIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Paper>
      ))}
      <Chip icon={<AddIcon />} label={addLabel} onClick={add} variant="outlined"
        sx={{ alignSelf: 'flex-start', fontWeight: 700 }} />
    </Stack>
  )
}

function Campo({ def, valor, onChange }) {
  const conteudo = () => {
    switch (def.tipo) {
      case 'chips':
        return <ChipInput label={def.label} values={valor} onChange={onChange} placeholder={def.ph} />
      case 'arquetipo':
        return <>
          <FieldLabel>{def.label}</FieldLabel>
          <ArquetipoSelector value={valor} onChange={onChange} />
        </>
      case 'itens':
        return <>
          <FieldLabel>{def.label}</FieldLabel>
          <ListaDeItens items={valor} onChange={onChange} fields={def.fields}
            addLabel={def.addLabel} vazio={def.vazio} />
        </>
      case 'texto':
        return <>
          <FieldLabel>{def.label}</FieldLabel>
          <TextField value={valor || ''} onChange={e => onChange(e.target.value)}
            placeholder={def.ph} fullWidth sx={tf} />
        </>
      default:
        return <>
          <FieldLabel>{def.label}</FieldLabel>
          <TextField value={valor || ''} onChange={e => onChange(e.target.value)}
            placeholder={def.ph} fullWidth multiline rows={def.rows || 3} sx={tf} />
        </>
    }
  }
  // A âncora é o par coluna.chave — o mesmo endereço que o smartbrand usa para
  // nomear a lacuna. É isso que faz "Visão não está declarado" achar a Visão.
  return <Box data-campo={`${def.col}.${def.k}`}>{conteudo()}</Box>
}

/**
 * @param {Array}  mapa    lista vinda de campos.js
 * @param {object} dados   { verbal_identity: {...}, strategy: {...} }
 * @param {func}   onChange(coluna, chave, valor)
 */
export function CamposDaMarca({ mapa, dados, onChange, extras = {} }) {
  const blocos = []
  let atual = null

  for (const def of mapa) {
    if (def.grupo) {
      atual = { grupo: def.grupo, campos: [] }
      blocos.push(atual)
      continue
    }
    if (!atual) { atual = { grupo: null, campos: [] }; blocos.push(atual) }
    atual.campos.push(def)
  }

  return (
    <Stack spacing={4}>
      {blocos.map((b, i) => (
        <Stack key={i} spacing={3}>
          {b.grupo && <SectionDivider>{b.grupo}</SectionDivider>}
          {extras[b.grupo]}
          {/* Campos marcados como `meia` andam em par; o resto ocupa a largura. */}
          {agrupar(b.campos).map((linha, j) => linha.length === 2 ? (
            <Box key={j} sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
              {linha.map(def => (
                <Campo key={def.k} def={def} valor={dados[def.col]?.[def.k]}
                  onChange={val => onChange(def.col, def.k, val)} />
              ))}
            </Box>
          ) : (
            <Campo key={linha[0].k} def={linha[0]} valor={dados[linha[0].col]?.[linha[0].k]}
              onChange={val => onChange(linha[0].col, linha[0].k, val)} />
          ))}
        </Stack>
      ))}
    </Stack>
  )
}

// Junta campos `meia` consecutivos em pares; os demais ficam sozinhos.
function agrupar(campos) {
  const linhas = []
  for (let i = 0; i < campos.length; i++) {
    if (campos[i].meia && campos[i + 1]?.meia) { linhas.push([campos[i], campos[i + 1]]); i++ }
    else linhas.push([campos[i]])
  }
  return linhas
}
