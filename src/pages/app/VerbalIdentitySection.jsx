import { Box, Typography, TextField, IconButton, Button, Paper, Stack, Divider } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import { FieldLabel, SectionDivider, ChipInput, ArquetipoSelector } from './BrandSection'

const tfText = { '& .MuiInputBase-input': { fontSize: 14 } }
const tfArea = { '& .MuiInputBase-input': { fontSize: 14 } }

function Grid2({ children }) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
      {children}
    </Box>
  )
}

function ItemList({ label, items, onChange, fields, addLabel = 'Adicionar', emptyMsg }) {
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
            <Stack spacing={1.25}>
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
                  InputProps={{ sx: { fontSize: 14 } }}
                  InputLabelProps={{ sx: { fontSize: 14 } }}
                />
              ))}
            </Stack>
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

export function VerbalIdentitySection({ data, onChange }) {
  const d = data || {}
  function up(field, val) {
    onChange({ ...d, [field]: val })
  }

  return (
    <Box sx={{ maxWidth: 920 }}>

      {/* ── Essência ── */}
      <SectionDivider label="Essência" color="#0D9E7A" />
      <Grid2>
        <Box>
          <FieldLabel>Tagline</FieldLabel>
          <TextField value={d.tagline || ''} onChange={e => up('tagline', e.target.value)}
            fullWidth placeholder="Frase curta que sintetiza a marca" sx={tfText} />
        </Box>
        <Box>
          <FieldLabel>Propósito</FieldLabel>
          <TextField value={d.proposito || ''} onChange={e => up('proposito', e.target.value)}
            fullWidth placeholder="Razão maior de existir, além de vender produto" sx={tfText} />
        </Box>
      </Grid2>

      <Box sx={{ mt: 3 }}>
        <FieldLabel>Manifesto</FieldLabel>
        <TextField value={d.manifesto || ''} onChange={e => up('manifesto', e.target.value)}
          fullWidth multiline minRows={4}
          placeholder="Declaração inspiradora — o que a marca defende, por que ela existe"
          sx={tfArea} />
      </Box>

      {/* ── Missão, Visão, Valores ── */}
      <SectionDivider label="Missão, Visão & Valores" color="#0D9E7A" />
      <Grid2>
        <Box>
          <FieldLabel>Missão</FieldLabel>
          <TextField value={d.missao || ''} onChange={e => up('missao', e.target.value)}
            fullWidth multiline minRows={3}
            placeholder="Por que a marca existe?" sx={tfArea} />
        </Box>
        <Box>
          <FieldLabel>Visão</FieldLabel>
          <TextField value={d.visao || ''} onChange={e => up('visao', e.target.value)}
            fullWidth multiline minRows={3}
            placeholder="Onde a marca quer chegar?" sx={tfArea} />
        </Box>
      </Grid2>

      <Box sx={{ mt: 3 }}>
        <ChipInput label="Valores" values={d.valores}
          onChange={v => up('valores', v)}
          placeholder="Ex: Inovação — pressione Enter" />
      </Box>

      {/* ── Arquétipo & Personalidade ── */}
      <SectionDivider label="Arquétipo & Personalidade" color="#0D9E7A" />
      <ArquetipoSelector value={d.arquetipo || ''} onChange={v => up('arquetipo', v)} />

      <Box sx={{ mt: 3 }}>
        <ChipInput label="Traços de personalidade" values={d.personalidade}
          onChange={v => up('personalidade', v)}
          placeholder="Ex: corajosa, calorosa, técnica…" />
      </Box>

      {/* ── Tom de voz ── */}
      <SectionDivider label="Tom de voz" color="#0D9E7A" />
      <Box>
        <FieldLabel>Descrição do tom</FieldLabel>
        <TextField value={d.tom_voz || ''} onChange={e => up('tom_voz', e.target.value)}
          fullWidth multiline minRows={3}
          placeholder="Como a marca fala? Direta, inspiradora, técnica…" sx={tfArea} />
      </Box>

      <Box sx={{ mt: 3 }}>
        <ChipInput label="Atributos do tom" values={d.tom_atributos}
          onChange={v => up('tom_atributos', v)}
          placeholder="Ex: direto / não burocrático — Enter" />
      </Box>

      <Box sx={{ mt: 3 }}>
        <FieldLabel>Como NÃO falar</FieldLabel>
        <TextField value={d.tom_evitar || ''} onChange={e => up('tom_evitar', e.target.value)}
          fullWidth multiline minRows={2}
          placeholder="Ex: evitar superlativos vazios, evitar jargão corporativo…" sx={tfArea} />
      </Box>

      {/* ── Storytelling ── */}
      <SectionDivider label="Storytelling" color="#0D9E7A" />
      <Box>
        <FieldLabel>Narrativa de origem</FieldLabel>
        <TextField value={d.narrativa_origem || ''} onChange={e => up('narrativa_origem', e.target.value)}
          fullWidth multiline minRows={4}
          placeholder="Como a marca nasceu, qual problema viu, o que a fez começar"
          sx={tfArea} />
      </Box>

      <Box sx={{ mt: 3 }}>
        <FieldLabel>Boilerplate (descrição padrão)</FieldLabel>
        <TextField value={d.boilerplate || ''} onChange={e => up('boilerplate', e.target.value)}
          fullWidth multiline minRows={3}
          placeholder="Texto curto que pode ser colado em release/sobre nós — 2 a 3 frases"
          sx={tfArea} />
      </Box>

      <Box sx={{ mt: 3 }}>
        <ItemList
          label="Marcos da história"
          items={d.marcos}
          onChange={v => up('marcos', v)}
          addLabel="Adicionar marco"
          emptyMsg="Sem marcos cadastrados."
          fields={[
            { key: 'ano',  label: 'Ano',         placeholder: 'Ex: 2024' },
            { key: 'titulo', label: 'Título',    placeholder: 'Ex: lançamento da plataforma' },
            { key: 'descricao', label: 'Descrição', placeholder: 'Contexto do marco', multiline: true, rows: 2 },
          ]}
        />
      </Box>

      {/* ── Posicionamento ── */}
      <SectionDivider label="Posicionamento" color="#7F77DD" />
      <Box>
        <FieldLabel>Posicionamento principal</FieldLabel>
        <TextField value={d.posicionamento || ''} onChange={e => up('posicionamento', e.target.value)}
          fullWidth multiline minRows={3}
          placeholder="Como a marca se posiciona no mercado?" sx={tfArea} />
      </Box>

      <Box sx={{ mt: 3 }}>
        <Grid2>
          <Box>
            <FieldLabel>Proposta de valor única</FieldLabel>
            <TextField value={d.proposta_valor || ''} onChange={e => up('proposta_valor', e.target.value)}
              fullWidth multiline minRows={3}
              placeholder="O que só esta marca entrega?" sx={tfArea} />
          </Box>
          <Box>
            <FieldLabel>Mensagem central</FieldLabel>
            <TextField value={d.mensagem_central || ''} onChange={e => up('mensagem_central', e.target.value)}
              fullWidth multiline minRows={3}
              placeholder="A frase que resume tudo" sx={tfArea} />
          </Box>
        </Grid2>
      </Box>

      {/* ── Público & Personas ── */}
      <SectionDivider label="Público & Personas" color="#7F77DD" />
      <Box>
        <FieldLabel>Público-alvo (descrição)</FieldLabel>
        <TextField value={d.publico_alvo || ''} onChange={e => up('publico_alvo', e.target.value)}
          fullWidth multiline minRows={3}
          placeholder="Quem é o cliente ideal?" sx={tfArea} />
      </Box>

      <Box sx={{ mt: 3 }}>
        <ItemList
          label="Personas detalhadas"
          items={d.personas}
          onChange={v => up('personas', v)}
          addLabel="Adicionar persona"
          emptyMsg="Sem personas cadastradas."
          fields={[
            { key: 'nome',       label: 'Nome',         placeholder: 'Ex: Marina, Head de Marketing' },
            { key: 'demografia', label: 'Demografia',   placeholder: 'Idade, cargo, setor, localização' },
            { key: 'dor',        label: 'Dor / problema', placeholder: 'O que tira o sono dela?', multiline: true, rows: 2 },
            { key: 'motivacao',  label: 'Motivação / ganho', placeholder: 'O que ela quer alcançar?', multiline: true, rows: 2 },
            { key: 'objecoes',   label: 'Objeções comuns', placeholder: 'Resistências típicas', multiline: true, rows: 2 },
          ]}
        />
      </Box>

      {/* ── Vocabulário ── */}
      <SectionDivider label="Vocabulário" color="#EF9F27" />
      <Grid2>
        <ChipInput label="Vocabulário aprovado" values={d.vocabulario_aprovado}
          onChange={v => up('vocabulario_aprovado', v)}
          placeholder="Palavras a usar — Enter" />
        <ChipInput label="Termos próprios / jargão da marca" values={d.termos_proprios}
          onChange={v => up('termos_proprios', v)}
          placeholder="Termos únicos da marca — Enter" />
      </Grid2>

      <Box sx={{ mt: 3 }}>
        <ChipInput label="Vocabulário proibido" values={d.vocabulario_proibido}
          onChange={v => up('vocabulario_proibido', v)}
          placeholder="Palavras a evitar — Enter"
          color="#E8185A" />
      </Box>

      {/* ── Exemplos de escrita ── */}
      <SectionDivider label="Exemplos de escrita" color="#EF9F27" />
      <ItemList
        label="Headlines de referência"
        items={d.exemplos_headlines}
        onChange={v => up('exemplos_headlines', v)}
        addLabel="Adicionar headline"
        emptyMsg="Sem exemplos."
        fields={[
          { key: 'titulo',  label: 'Headline',  placeholder: 'O título de impacto', multiline: true, rows: 2 },
          { key: 'contexto', label: 'Contexto / canal', placeholder: 'Ex: banner home, anúncio LinkedIn' },
        ]}
      />

      <Box sx={{ mt: 3 }}>
        <ItemList
          label="Exemplos de posts / e-mails"
          items={d.exemplos_posts}
          onChange={v => up('exemplos_posts', v)}
          addLabel="Adicionar exemplo"
          emptyMsg="Sem exemplos."
          fields={[
            { key: 'canal',    label: 'Canal',    placeholder: 'Ex: Instagram, newsletter, blog' },
            { key: 'objetivo', label: 'Objetivo', placeholder: 'Engajar, educar, vender…' },
            { key: 'texto',    label: 'Texto',    placeholder: 'Cole o exemplo de copy aqui', multiline: true, rows: 4 },
          ]}
        />
      </Box>

      <Box sx={{ mt: 3 }}>
        <ItemList
          label="CTAs preferidos"
          items={d.exemplos_ctas}
          onChange={v => up('exemplos_ctas', v)}
          addLabel="Adicionar CTA"
          emptyMsg="Sem CTAs cadastrados."
          fields={[
            { key: 'cta',      label: 'CTA',       placeholder: 'Ex: "Comece agora →"' },
            { key: 'contexto', label: 'Quando usar', placeholder: 'Ex: topo de funil, página de produto' },
          ]}
        />
      </Box>

      {/* ── Como falar em situações ── */}
      <SectionDivider label="Como falar em situações específicas" color="#EF9F27" />
      <ItemList
        label="Cenários e respostas-modelo"
        items={d.situacoes}
        onChange={v => up('situacoes', v)}
        addLabel="Adicionar situação"
        emptyMsg='Ex: "Como anunciar uma queda de serviço", "Como receber uma reclamação pública"…'
        fields={[
          { key: 'situacao',    label: 'Situação',    placeholder: 'Ex: lançamento, crise, erro de cobrança' },
          { key: 'como_falar',  label: 'Como falar',  placeholder: 'Diretriz e exemplo de fala', multiline: true, rows: 4 },
          { key: 'evitar',      label: 'O que evitar', placeholder: 'O que NÃO dizer nesta situação', multiline: true, rows: 2 },
        ]}
      />

      {/* ── Exemplos livres de texto ── */}
      <SectionDivider label="Exemplos livres de texto" color="#EF9F27" />
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Cole textos completos que representam a marca. Quanto mais exemplos longos, mais o RAG
        consegue replicar a voz em campanhas, e-mails, posts e artigos.
      </Typography>
      <ItemList
        label="Textos de referência"
        items={d.textos_referencia}
        onChange={v => up('textos_referencia', v)}
        addLabel="Adicionar texto de referência"
        emptyMsg="Adicione e-mails, posts de LinkedIn, artigos de blog, newsletters, anúncios…"
        fields={[
          { key: 'tipo',     label: 'Tipo',     placeholder: 'Ex: e-mail / blog post / LinkedIn / newsletter / anúncio / pitch / press release' },
          { key: 'titulo',   label: 'Título ou assunto', placeholder: 'Ex: assunto do e-mail, título do post' },
          { key: 'publico',  label: 'Público / canal', placeholder: 'Pra quem foi escrito / onde foi publicado' },
          { key: 'texto',    label: 'Texto completo',   placeholder: 'Cole o texto integral aqui', multiline: true, rows: 8, span: 'full' },
          { key: 'notas',    label: 'Por que é referência', placeholder: 'O que esse texto exemplifica bem: tom, estrutura, vocabulário…', multiline: true, rows: 2, span: 'full' },
        ]}
        columns={2}
      />

      <Divider sx={{ mt: 5 }} />
      <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 2 }}>
        Tudo o que for preenchido aqui vira contexto para os agentes (Brand Assistant, aprovação de campanhas, geração de conteúdo).
      </Typography>
    </Box>
  )
}
