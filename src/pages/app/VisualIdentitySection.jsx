import { useState } from 'react'
import { Box, Tabs, Tab, Typography, TextField, IconButton, Button, Paper, Stack, Divider } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import { BrandAssetsSection } from './BrandAssetsSection'
import { FieldLabel, SectionDivider, ChipInput } from './BrandSection'

const tf = { '& .MuiInputBase-input': { fontSize: 14 } }

function Grid2({ children }) {
  return <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>{children}</Box>
}

function ItemList({ label, items, onChange, fields, addLabel = 'Adicionar', emptyMsg, columns = 1 }) {
  function add() {
    const blank = Object.fromEntries(fields.map(f => [f.key, '']))
    onChange([...(items || []), blank])
  }
  function update(idx, key, val) {
    onChange((items || []).map((it, i) => i === idx ? { ...it, [key]: val } : it))
  }
  function remove(idx) {
    onChange((items || []).filter((_, i) => i !== idx))
  }
  return (
    <Box>
      <FieldLabel>{label}</FieldLabel>
      <Stack spacing={1.5}>
        {(items || []).length === 0 && emptyMsg && (
          <Typography variant="caption" color="text.disabled">{emptyMsg}</Typography>
        )}
        {(items || []).map((it, idx) => (
          <Paper key={idx} variant="outlined" sx={{ p: 2, position: 'relative', borderRadius: 2 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: columns === 2 ? { xs: '1fr', md: '1fr 1fr' } : '1fr', gap: 1.25 }}>
              {fields.map(f => (
                <TextField
                  key={f.key}
                  label={f.label}
                  value={it[f.key] || ''}
                  onChange={e => update(idx, f.key, e.target.value)}
                  placeholder={f.placeholder}
                  fullWidth
                  multiline={f.multiline}
                  rows={f.rows || (f.multiline ? 2 : undefined)}
                  size="medium"
                  InputProps={{ sx: { fontSize: 14, ...(f.mono ? { fontFamily: 'monospace' } : {}) } }}
                  InputLabelProps={{ sx: { fontSize: 14 } }}
                  sx={f.span === 'full' ? { gridColumn: '1 / -1' } : {}}
                />
              ))}
            </Box>
            <IconButton size="small" onClick={() => remove(idx)}
              sx={{ position: 'absolute', top: 8, right: 8, color: 'text.disabled', '&:hover': { color: 'error.main' } }}>
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </Paper>
        ))}
      </Stack>
      <Button startIcon={<AddIcon />} onClick={add} sx={{ mt: 1.5, textTransform: 'none', fontWeight: 700 }}>
        {addLabel}
      </Button>
    </Box>
  )
}

function ColorSwatchRow({ item, onChange, onRemove }) {
  const hex = item.hex || ''
  const isValidHex = /^#[0-9A-Fa-f]{6}$/i.test(hex)
  return (
    <Paper variant="outlined" sx={{ p: 2, position: 'relative', borderRadius: 2 }}>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '90px 1fr 1fr 130px' }, gap: 1.25, alignItems: 'start' }}>
        <Box>
          <Box
            onClick={() => document.getElementById(`swatch-${item._key}`)?.click()}
            sx={{ width: '100%', height: 56, borderRadius: 1.25,
              bgcolor: isValidHex ? hex : 'background.default',
              border: '1px solid', borderColor: 'divider', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
            {!isValidHex && <Typography sx={{ fontSize: 10, color: 'text.disabled' }}>—</Typography>}
          </Box>
          <input id={`swatch-${item._key}`} type="color" value={isValidHex ? hex : '#000000'}
            onChange={e => onChange('hex', e.target.value)}
            style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 0, height: 0 }} />
        </Box>
        <TextField label="Nome" value={item.nome || ''} onChange={e => onChange('nome', e.target.value)}
          placeholder="Ex: LOUDR Green" fullWidth size="medium"
          InputProps={{ sx: { fontSize: 14 } }} InputLabelProps={{ sx: { fontSize: 14 } }} />
        <TextField label="Hex" value={hex} onChange={e => onChange('hex', e.target.value)}
          placeholder="#0D9E7A" fullWidth size="medium"
          InputProps={{ sx: { fontSize: 14, fontFamily: 'monospace' } }} InputLabelProps={{ sx: { fontSize: 14 } }} />
        <TextField label="Tipo" value={item.tipo || ''} onChange={e => onChange('tipo', e.target.value)}
          placeholder="primária / secundária / neutra / acento" fullWidth size="medium"
          InputProps={{ sx: { fontSize: 14 } }} InputLabelProps={{ sx: { fontSize: 14 } }} />
        <TextField label="Quando usar" value={item.uso || ''} onChange={e => onChange('uso', e.target.value)}
          placeholder="Contexto de aplicação" fullWidth multiline rows={2} size="medium"
          InputProps={{ sx: { fontSize: 14 } }} InputLabelProps={{ sx: { fontSize: 14 } }}
          sx={{ gridColumn: { xs: '1', md: '1 / -1' } }} />
      </Box>
      <IconButton size="small" onClick={onRemove}
        sx={{ position: 'absolute', top: 8, right: 8, color: 'text.disabled', '&:hover': { color: 'error.main' } }}>
        <DeleteOutlineIcon fontSize="small" />
      </IconButton>
    </Paper>
  )
}

function PaletaEditor({ label, items, onChange }) {
  function add() {
    onChange([...(items || []), { _key: Date.now(), nome: '', hex: '', tipo: '', uso: '' }])
  }
  function update(idx, key, val) {
    onChange((items || []).map((it, i) => i === idx ? { ...it, [key]: val } : it))
  }
  function remove(idx) {
    onChange((items || []).filter((_, i) => i !== idx))
  }
  // Garante _key estável pros inputs color
  const list = (items || []).map((it, i) => ({ ...it, _key: it._key || `c-${i}` }))
  return (
    <Box>
      <FieldLabel>{label}</FieldLabel>
      <Stack spacing={1.5}>
        {list.length === 0 && (
          <Typography variant="caption" color="text.disabled">Sem cores cadastradas.</Typography>
        )}
        {list.map((it, idx) => (
          <ColorSwatchRow key={idx} item={it}
            onChange={(k, v) => update(idx, k, v)}
            onRemove={() => remove(idx)} />
        ))}
      </Stack>
      <Button startIcon={<AddIcon />} onClick={add} sx={{ mt: 1.5, textTransform: 'none', fontWeight: 700 }}>
        Adicionar cor
      </Button>
    </Box>
  )
}

function Diretrizes({ data, onChange }) {
  const d = data || {}
  function up(field, val) { onChange({ ...d, [field]: val }) }

  return (
    <Box sx={{ maxWidth: 920 }}>

      {/* ── Logos ── */}
      <SectionDivider label="Logos" color="#7F77DD" />
      <ItemList
        label="Versões de logo"
        items={d.logos}
        onChange={v => up('logos', v)}
        addLabel="Adicionar versão"
        emptyMsg="Sem logos cadastrados. Adicione versões: principal, horizontal, símbolo, monocromática, negativa…"
        fields={[
          { key: 'versao',      label: 'Versão',      placeholder: 'Ex: Principal / Símbolo / Horizontal / Negativa' },
          { key: 'descricao',   label: 'Descrição',   placeholder: 'Quando usar essa versão', multiline: true, rows: 2 },
          { key: 'url',         label: 'URL / link',  placeholder: 'Link do arquivo (SVG, PNG)' },
          { key: 'regras_uso',  label: 'Regras de uso', placeholder: 'Fundos permitidos, restrições', multiline: true, rows: 2, span: 'full' },
        ]}
        columns={2}
      />

      <Box sx={{ mt: 4 }}>
        <Grid2>
          <Box>
            <FieldLabel>Área de proteção</FieldLabel>
            <TextField value={d.area_protecao || ''} onChange={e => up('area_protecao', e.target.value)}
              fullWidth multiline minRows={2} placeholder="Ex: largura do X do logotipo em todos os lados" sx={tf} />
          </Box>
          <Box>
            <FieldLabel>Tamanho mínimo</FieldLabel>
            <TextField value={d.tamanho_minimo || ''} onChange={e => up('tamanho_minimo', e.target.value)}
              fullWidth multiline minRows={2} placeholder="Ex: 24px de altura para web, 12mm para impressão" sx={tf} />
          </Box>
        </Grid2>
      </Box>

      <Box sx={{ mt: 3 }}>
        <ChipInput label="Usos proibidos" values={d.usos_proibidos}
          onChange={v => up('usos_proibidos', v)}
          placeholder="Ex: distorcer, mudar cor, aplicar sombra — Enter"
          color="#E8185A" />
      </Box>

      {/* ── Paleta de cores ── */}
      <SectionDivider label="Paleta de cores" color="#7F77DD" />
      <PaletaEditor label="Cores da marca" items={d.paleta} onChange={v => up('paleta', v)} />

      {/* ── Tipografia ── */}
      <SectionDivider label="Tipografia" color="#7F77DD" />
      <Grid2>
        <Box>
          <FieldLabel>Família principal</FieldLabel>
          <Stack spacing={1.25}>
            <TextField value={d.tipo_principal_nome || ''} onChange={e => up('tipo_principal_nome', e.target.value)}
              label="Nome" placeholder="Ex: Cairo" fullWidth InputProps={{ sx: { fontSize: 14 } }} InputLabelProps={{ sx: { fontSize: 14 } }} />
            <TextField value={d.tipo_principal_pesos || ''} onChange={e => up('tipo_principal_pesos', e.target.value)}
              label="Pesos" placeholder="Ex: 400, 700, 900" fullWidth InputProps={{ sx: { fontSize: 14 } }} InputLabelProps={{ sx: { fontSize: 14 } }} />
            <TextField value={d.tipo_principal_link || ''} onChange={e => up('tipo_principal_link', e.target.value)}
              label="Link / fonte" placeholder="Google Fonts / Adobe Fonts / arquivo" fullWidth InputProps={{ sx: { fontSize: 14 } }} InputLabelProps={{ sx: { fontSize: 14 } }} />
            <TextField value={d.tipo_principal_uso || ''} onChange={e => up('tipo_principal_uso', e.target.value)}
              label="Quando usar" placeholder="Títulos, headlines, web" fullWidth multiline rows={2} InputProps={{ sx: { fontSize: 14 } }} InputLabelProps={{ sx: { fontSize: 14 } }} />
          </Stack>
        </Box>
        <Box>
          <FieldLabel>Família secundária</FieldLabel>
          <Stack spacing={1.25}>
            <TextField value={d.tipo_secundario_nome || ''} onChange={e => up('tipo_secundario_nome', e.target.value)}
              label="Nome" placeholder="Ex: Inter" fullWidth InputProps={{ sx: { fontSize: 14 } }} InputLabelProps={{ sx: { fontSize: 14 } }} />
            <TextField value={d.tipo_secundario_pesos || ''} onChange={e => up('tipo_secundario_pesos', e.target.value)}
              label="Pesos" placeholder="Ex: 400, 500, 700" fullWidth InputProps={{ sx: { fontSize: 14 } }} InputLabelProps={{ sx: { fontSize: 14 } }} />
            <TextField value={d.tipo_secundario_link || ''} onChange={e => up('tipo_secundario_link', e.target.value)}
              label="Link / fonte" placeholder="Google Fonts / Adobe Fonts / arquivo" fullWidth InputProps={{ sx: { fontSize: 14 } }} InputLabelProps={{ sx: { fontSize: 14 } }} />
            <TextField value={d.tipo_secundario_uso || ''} onChange={e => up('tipo_secundario_uso', e.target.value)}
              label="Quando usar" placeholder="Corpo de texto, formulários" fullWidth multiline rows={2} InputProps={{ sx: { fontSize: 14 } }} InputLabelProps={{ sx: { fontSize: 14 } }} />
          </Stack>
        </Box>
      </Grid2>

      <Box sx={{ mt: 3 }}>
        <FieldLabel>Família display (opcional)</FieldLabel>
        <TextField value={d.tipo_display || ''} onChange={e => up('tipo_display', e.target.value)}
          fullWidth placeholder="Fonte de impacto para títulos grandes / hero" sx={tf} />
      </Box>

      <Box sx={{ mt: 3 }}>
        <ItemList
          label="Hierarquia tipográfica"
          items={d.tipo_hierarquia}
          onChange={v => up('tipo_hierarquia', v)}
          addLabel="Adicionar nível"
          emptyMsg="Adicione níveis: H1, H2, body, caption, etc."
          fields={[
            { key: 'nivel',    label: 'Nível',       placeholder: 'Ex: H1, body, caption' },
            { key: 'tamanho',  label: 'Tamanho',     placeholder: 'Ex: 48px / 3rem' },
            { key: 'peso',     label: 'Peso',        placeholder: 'Ex: 900' },
            { key: 'uso',      label: 'Uso',         placeholder: 'Quando aplicar' },
          ]}
          columns={2}
        />
      </Box>

      {/* ── Iconografia ── */}
      <SectionDivider label="Iconografia" color="#7F77DD" />
      <Grid2>
        <Box>
          <FieldLabel>Estilo</FieldLabel>
          <TextField value={d.icone_estilo || ''} onChange={e => up('icone_estilo', e.target.value)}
            fullWidth multiline minRows={2} placeholder="Outline, filled, duotone… traço fino/grosso, cantos arredondados" sx={tf} />
        </Box>
        <Box>
          <FieldLabel>Grid / construção</FieldLabel>
          <TextField value={d.icone_grid || ''} onChange={e => up('icone_grid', e.target.value)}
            fullWidth multiline minRows={2} placeholder="Ex: 24×24px, traço de 1.5px, raio 2px" sx={tf} />
        </Box>
      </Grid2>

      <Box sx={{ mt: 3 }}>
        <FieldLabel>Biblioteca / referência</FieldLabel>
        <TextField value={d.icone_biblioteca || ''} onChange={e => up('icone_biblioteca', e.target.value)}
          fullWidth placeholder="Ex: Phosphor, Lucide, biblioteca customizada" sx={tf} />
      </Box>

      <Box sx={{ mt: 3 }}>
        <ChipInput label="URLs de exemplos" values={d.icone_exemplos}
          onChange={v => up('icone_exemplos', v)}
          placeholder="Link de exemplo — Enter" />
      </Box>

      {/* ── Ilustração ── */}
      <SectionDivider label="Ilustração" color="#7F77DD" />
      <Grid2>
        <Box>
          <FieldLabel>Estilo</FieldLabel>
          <TextField value={d.ilustracao_estilo || ''} onChange={e => up('ilustracao_estilo', e.target.value)}
            fullWidth multiline minRows={3} placeholder="Geométrico, orgânico, isométrico, flat… nível de detalhe" sx={tf} />
        </Box>
        <Box>
          <FieldLabel>Paleta da ilustração</FieldLabel>
          <TextField value={d.ilustracao_paleta || ''} onChange={e => up('ilustracao_paleta', e.target.value)}
            fullWidth multiline minRows={3} placeholder="Cores principais usadas nas ilustrações" sx={tf} />
        </Box>
      </Grid2>

      <Box sx={{ mt: 3 }}>
        <ChipInput label="URLs de exemplos" values={d.ilustracao_exemplos}
          onChange={v => up('ilustracao_exemplos', v)}
          placeholder="Link de exemplo — Enter" />
      </Box>

      {/* ── Fotografia ── */}
      <SectionDivider label="Fotografia" color="#7F77DD" />
      <Box>
        <FieldLabel>Mood / atmosfera</FieldLabel>
        <TextField value={d.foto_mood || ''} onChange={e => up('foto_mood', e.target.value)}
          fullWidth multiline minRows={3} placeholder="Ex: luz natural, tons quentes, foco em pessoas reais, ambiente urbano" sx={tf} />
      </Box>

      <Box sx={{ mt: 3 }}>
        <Grid2>
          <Box>
            <FieldLabel>Regras de luz / edição</FieldLabel>
            <TextField value={d.foto_luz_edicao || ''} onChange={e => up('foto_luz_edicao', e.target.value)}
              fullWidth multiline minRows={3} placeholder="Como editar, contraste, saturação, filtros permitidos/proibidos" sx={tf} />
          </Box>
          <Box>
            <FieldLabel>Enquadramento e composição</FieldLabel>
            <TextField value={d.foto_enquadramento || ''} onChange={e => up('foto_enquadramento', e.target.value)}
              fullWidth multiline minRows={3} placeholder="Regras de composição, espaço vazio, ponto focal" sx={tf} />
          </Box>
        </Grid2>
      </Box>

      <Box sx={{ mt: 3 }}>
        <Grid2>
          <ChipInput label="Faça (DO)" values={d.foto_do}
            onChange={v => up('foto_do', v)}
            placeholder="Ex: pessoas reais — Enter" />
          <ChipInput label="Evite (DON'T)" values={d.foto_dont}
            onChange={v => up('foto_dont', v)}
            placeholder="Ex: stock genérico — Enter"
            color="#E8185A" />
        </Grid2>
      </Box>

      <Box sx={{ mt: 3 }}>
        <ChipInput label="URLs de exemplos" values={d.foto_exemplos}
          onChange={v => up('foto_exemplos', v)}
          placeholder="Link de exemplo — Enter" />
      </Box>

      {/* ── Vídeo & Motion ── */}
      <SectionDivider label="Vídeo & Motion" color="#7F77DD" />
      <Grid2>
        <Box>
          <FieldLabel>Estilo de vídeo</FieldLabel>
          <TextField value={d.video_estilo || ''} onChange={e => up('video_estilo', e.target.value)}
            fullWidth multiline minRows={3} placeholder="Documental, cinemático, motion graphics… ritmo, cortes" sx={tf} />
        </Box>
        <Box>
          <FieldLabel>Timing e transições</FieldLabel>
          <TextField value={d.video_timing || ''} onChange={e => up('video_timing', e.target.value)}
            fullWidth multiline minRows={3} placeholder="Duração média, transições padrão, easings" sx={tf} />
        </Box>
      </Grid2>

      <Box sx={{ mt: 3 }}>
        <Grid2>
          <Box>
            <FieldLabel>Abertura padrão</FieldLabel>
            <TextField value={d.video_abertura || ''} onChange={e => up('video_abertura', e.target.value)}
              fullWidth multiline minRows={2} placeholder="Logo, vinheta, regras do primeiro segundo" sx={tf} />
          </Box>
          <Box>
            <FieldLabel>Fechamento padrão</FieldLabel>
            <TextField value={d.video_fechamento || ''} onChange={e => up('video_fechamento', e.target.value)}
              fullWidth multiline minRows={2} placeholder="Logo final, CTA, créditos" sx={tf} />
          </Box>
        </Grid2>
      </Box>

      {/* ── Texturas & Padrões ── */}
      <SectionDivider label="Texturas & Padrões" color="#7F77DD" />
      <ItemList
        label="Padrões gráficos"
        items={d.padroes}
        onChange={v => up('padroes', v)}
        addLabel="Adicionar padrão"
        emptyMsg="Adicione padrões, texturas ou grafismos da marca."
        fields={[
          { key: 'nome',      label: 'Nome',      placeholder: 'Ex: Onda LOUDR' },
          { key: 'descricao', label: 'Descrição', placeholder: 'O que representa / quando usar', multiline: true, rows: 2 },
          { key: 'url',       label: 'URL',       placeholder: 'Link do arquivo' },
        ]}
        columns={2}
      />

      {/* ── Grids editoriais ── */}
      <SectionDivider label="Grids editoriais" color="#7F77DD" />
      <Box>
        <FieldLabel>Sistema de grid</FieldLabel>
        <TextField value={d.grid_descricao || ''} onChange={e => up('grid_descricao', e.target.value)}
          fullWidth multiline minRows={3} placeholder="Ex: 12 colunas, margens externas 80px, gutter 24px; mobile 4 colunas, margens 16px" sx={tf} />
      </Box>

      <Box sx={{ mt: 3 }}>
        <FieldLabel>Regras de layout</FieldLabel>
        <TextField value={d.grid_regras || ''} onChange={e => up('grid_regras', e.target.value)}
          fullWidth multiline minRows={3} placeholder="Hierarquia visual, respiros, alinhamento de elementos" sx={tf} />
      </Box>

      {/* ── Aplicações ── */}
      <SectionDivider label="Aplicações" color="#7F77DD" />
      <ItemList
        label="Aplicações da marca"
        items={d.aplicacoes}
        onChange={v => up('aplicacoes', v)}
        addLabel="Adicionar aplicação"
        emptyMsg="Ex: papelaria, social, OOH, web, brindes…"
        fields={[
          { key: 'tipo',        label: 'Tipo',        placeholder: 'Ex: Papelaria / Social / OOH / Web / Brinde' },
          { key: 'descricao',   label: 'Descrição',   placeholder: 'Como a marca se apresenta nesse canal', multiline: true, rows: 3 },
          { key: 'url',         label: 'URL de exemplo', placeholder: 'Link de referência' },
        ]}
        columns={2}
      />

      <Divider sx={{ mt: 5 }} />
      <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 2 }}>
        Quanto mais campos preenchidos, mais preciso fica o entendimento da marca pelos agentes (Brand Assistant, aprovação de campanhas).
      </Typography>
    </Box>
  )
}

export function VisualIdentitySection({ data, onChange, assets, brandId, onAssetSave, onAssetDelete }) {
  const [tab, setTab] = useState(0)

  return (
    <Box sx={{ maxWidth: 920 }}>
      <Tabs value={tab} onChange={(_, v) => setTab(v)}
        sx={{
          borderBottom: 1, borderColor: 'divider', mb: 3,
          '& .MuiTab-root': { textTransform: 'none', fontWeight: 700, fontSize: 13, minHeight: 40 },
        }}>
        <Tab label="Diretrizes" />
        <Tab label="Assets" />
      </Tabs>

      {tab === 0 && <Diretrizes data={data} onChange={onChange} />}
      {tab === 1 && (
        <BrandAssetsSection
          assets={assets}
          brandId={brandId}
          onSave={onAssetSave}
          onDelete={onAssetDelete}
        />
      )}
    </Box>
  )
}
