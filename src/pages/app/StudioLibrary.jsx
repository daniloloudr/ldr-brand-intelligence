import { useState, useEffect, useMemo } from 'react'
import {
  Box, Button, Typography, TextField, Paper, Stack, CircularProgress, Chip,
  IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, Autocomplete,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import { Tabs, Tab } from '@mui/material'
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import CampaignOutlinedIcon from '@mui/icons-material/CampaignOutlined'
import AddIcon from '@mui/icons-material/Add'
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined'
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined'
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined'
import VerifiedOutlinedIcon from '@mui/icons-material/VerifiedOutlined'
import { supabase } from '../../lib/supabase'
import { PageHeader } from '../../components/shell/PageHeader'

const TEAL = '#0D9E7A'

// Assets de MÍDIA/arquivo (cor e tipografia são valores de identidade — ficam no Brand Book)
const TIPOS_BIBLIOTECA = ['logo', 'foto', 'video', 'icone', 'padrao', 'documento', 'outro']

const isUrl   = v => /^https?:\/\//i.test(v || '')
const isVideo = a => a.tipo === 'video' || (a.mime_type || '').startsWith('video/')

function AssetPreview({ a }) {
  if (isUrl(a.valor)) {
    if (isVideo(a)) return <Box component="video" src={a.valor} muted loop playsInline
      onMouseOver={e => e.currentTarget.play().catch(() => {})} onMouseOut={e => e.currentTarget.pause()}
      sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
    if ((a.mime_type || 'image/').startsWith('image/')) return <Box component="img" src={a.valor} alt="" loading="lazy"
      sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
  }
  // logo SVG inline (valor = markup, com ou sem prólogo <?xml) ou arquivo sem preview
  if ((a.valor || '').includes('<svg')) return (
    <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2,
      '& svg': { maxWidth: '100%', maxHeight: '100%' } }} dangerouslySetInnerHTML={{ __html: a.valor.slice(a.valor.indexOf('<svg')) }} />
  )
  return <InsertDriveFileOutlinedIcon sx={{ fontSize: 34, color: 'text.disabled' }} />
}

export function StudioLibrary({ brandId }) {
  const [assets, setAssets]   = useState([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca]     = useState('')
  const [pasta, setPasta]     = useState('__all')     // __all | __none | nome da pasta
  const [tag, setTag]         = useState(null)
  const [org, setOrg]         = useState(null)        // asset em organização (dialog)
  const [orgPasta, setOrgPasta] = useState('')
  const [orgTags, setOrgTags]   = useState([])
  const [savingOrg, setSavingOrg] = useState(false)
  // Casa do Conteúdo: a Biblioteca é o HUB — Mídia · Textos · Campanhas
  const [aba, setAba] = useState(0)
  const [textos, setTextos] = useState(null)
  const [campanhas, setCampanhas] = useState(null)
  const [textoAberto, setTextoAberto] = useState(null)
  const [copiado, setCopiado] = useState(false)
  // Certidão do asset: trilha auditável da peça (compliance.md §4)
  const [cert, setCert] = useState(null)          // asset em exibição
  const [certGen, setCertGen] = useState(null)    // studio_generations da peça
  const [certSignals, setCertSignals] = useState([])
  const [certLoading, setCertLoading] = useState(false)

  useEffect(() => { if (brandId) load() }, [brandId])

  async function load() {
    setLoading(true)
    const [{ data }, { data: pecas }, { data: camps }] = await Promise.all([
      supabase.from('brand_assets').select('*')
        .eq('brand_id', brandId).in('tipo', TIPOS_BIBLIOTECA)
        .order('created_at', { ascending: false }),
      supabase.from('pecas_escritas').select('*')
        .eq('brand_id', brandId).order('created_at', { ascending: false }).limit(100),
      supabase.from('studio_campaigns').select('id, nome, conceito, status, created_at')
        .eq('brand_id', brandId).order('created_at', { ascending: false }).limit(50),
    ])
    setAssets(data || [])
    setTextos(pecas || [])
    setCampanhas(camps || [])
    setLoading(false)
  }

  async function excluirTexto(t) {
    if (!window.confirm(`Excluir "${t.titulo}"?`)) return
    const { error } = await supabase.from('pecas_escritas').delete().eq('id', t.id)
    if (!error) setTextos(prev => prev.filter(x => x.id !== t.id))
  }

  function copiarTexto(t) {
    navigator.clipboard.writeText(t.conteudo || '')
    setCopiado(true); setTimeout(() => setCopiado(false), 1500)
  }

  const pastas = useMemo(() => [...new Set(assets.map(a => a.pasta).filter(Boolean))].sort(), [assets])
  const tags   = useMemo(() => [...new Set(assets.flatMap(a => a.tags || []))].sort(), [assets])

  const filtered = assets.filter(a => {
    if (pasta === '__none' && a.pasta) return false
    if (pasta !== '__all' && pasta !== '__none' && a.pasta !== pasta) return false
    if (tag && !(a.tags || []).includes(tag)) return false
    if (busca.trim()) {
      const q = busca.trim().toLowerCase()
      const alvo = `${a.nome || ''} ${a.descricao || ''} ${(a.tags || []).join(' ')} ${a.pasta || ''}`.toLowerCase()
      if (!alvo.includes(q)) return false
    }
    return true
  })

  function abrirOrg(a) { setOrg(a); setOrgPasta(a.pasta || ''); setOrgTags(a.tags || []) }

  // A certidão junta a geração (origem/modelo/prompt/versão do cérebro) com os
  // julgamentos ligados a ela (art_review do diretor de arte + voto humano),
  // todos por ref_id = generation_id. RLS = perímetro.
  async function abrirCert(a) {
    const genId = a.metadata?.generation_id
    if (!genId) return
    setCert(a); setCertGen(null); setCertSignals([]); setCertLoading(true)
    const [{ data: gen }, { data: porRef }, { data: porUrl }] = await Promise.all([
      supabase.from('studio_generations')
        .select('id, created_at, provider, provider_request_id, formato, prompt_final, brand_context, media_type, status')
        .eq('id', genId).maybeSingle(),
      supabase.from('brand_signals')
        .select('id, tipo, payload, created_at')
        .eq('ref_id', genId).in('tipo', ['image_vote', 'art_review'])
        .order('created_at', { ascending: true }),
      // pareceres antigos sem ref_id: casa pela própria imagem
      supabase.from('brand_signals')
        .select('id, tipo, payload, created_at')
        .eq('tipo', 'art_review').eq('payload->>image_url', a.valor)
        .order('created_at', { ascending: true }),
    ])
    const vistos = new Set()
    const sigs = [...(porRef || []), ...(porUrl || [])]
      .filter(s => !vistos.has(s.id) && vistos.add(s.id))
      .sort((x, y) => new Date(x.created_at) - new Date(y.created_at))
    setCertGen(gen || null); setCertSignals(sigs); setCertLoading(false)
  }

  async function salvarOrg() {
    if (!org) return
    setSavingOrg(true)
    const pastaFinal = (orgPasta || '').trim() || null
    const tagsFinal  = [...new Set(orgTags.map(t => (t || '').trim()).filter(Boolean))]
    const { error } = await supabase.from('brand_assets')
      .update({ pasta: pastaFinal, tags: tagsFinal }).eq('id', org.id)
    setSavingOrg(false)
    if (!error) {
      setAssets(prev => prev.map(a => a.id === org.id ? { ...a, pasta: pastaFinal, tags: tagsFinal } : a))
      setOrg(null)
    }
  }

  async function excluir(a) {
    if (!window.confirm(`Excluir "${a.nome}" da biblioteca?`)) return
    const { error } = await supabase.from('brand_assets').delete().eq('id', a.id)
    if (!error) setAssets(prev => prev.filter(x => x.id !== a.id))
  }

  function baixar(a) {
    if (!isUrl(a.valor)) return
    const link = document.createElement('a')
    link.href = a.valor
    link.download = a.nome || 'asset'
    link.target = '_blank'
    link.click()
  }

  const chipSx = on => ({ fontWeight: 700, fontSize: 12, bgcolor: on ? TEAL : 'transparent',
    color: on ? '#fff' : 'text.secondary', border: '1px solid', borderColor: on ? TEAL : 'divider',
    '&:hover': { bgcolor: on ? '#0B8567' : 'action.hover' } })

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 56px)', overflow: 'auto' }}>
      <PageHeader title="Estúdio" subtitle="Biblioteca — as peças e arquivos da marca, organizados" />

      <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1200, width: '100%', mx: 'auto' }}>
        <Tabs value={aba} onChange={(_, v) => setAba(v)} sx={{ mb: 2.5, minHeight: 38, '& .MuiTab-root': { minHeight: 38, fontWeight: 800, fontSize: 13, textTransform: 'none' } }}>
          <Tab label={`Mídia${assets.length ? ` · ${assets.length}` : ''}`} />
          <Tab label={`Textos${textos?.length ? ` · ${textos.length}` : ''}`} />
          <Tab label={`Campanhas${campanhas?.length ? ` · ${campanhas.length}` : ''}`} />
        </Tabs>

        {aba === 0 && (<>
        {/* Busca + pastas + tags */}
        <Stack spacing={1.5} mb={2.5}>
          <TextField size="small" fullWidth placeholder="Buscar por nome, descrição, tag ou pasta…"
            value={busca} onChange={e => setBusca(e.target.value)}
            InputProps={{ startAdornment: <SearchIcon sx={{ fontSize: 18, mr: 1, color: 'text.disabled' }} /> }} />
          <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap alignItems="center">
            <FolderOutlinedIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
            <Chip label={`Todas (${assets.length})`} size="small" onClick={() => setPasta('__all')} sx={chipSx(pasta === '__all')} />
            <Chip label={`Sem pasta (${assets.filter(a => !a.pasta).length})`} size="small" onClick={() => setPasta('__none')} sx={chipSx(pasta === '__none')} />
            {pastas.map(p => (
              <Chip key={p} label={`${p} (${assets.filter(a => a.pasta === p).length})`} size="small"
                onClick={() => setPasta(pasta === p ? '__all' : p)} sx={chipSx(pasta === p)} />
            ))}
          </Stack>
          {tags.length > 0 && (
            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
              {tags.map(t => (
                <Chip key={t} label={`#${t}`} size="small" variant={tag === t ? 'filled' : 'outlined'}
                  onClick={() => setTag(tag === t ? null : t)}
                  sx={{ fontSize: 11, fontWeight: 700, ...(tag === t ? { bgcolor: TEAL, color: '#fff' } : {}) }} />
              ))}
            </Stack>
          )}
        </Stack>

        {loading ? (
          <Stack alignItems="center" py={8}><CircularProgress size={22} sx={{ color: TEAL }} /></Stack>
        ) : filtered.length === 0 ? (
          <Paper variant="outlined" sx={{ p: 5, borderRadius: 2, textAlign: 'center' }}>
            <Typography fontSize={13.5} fontWeight={800} mb={0.5}>
              {assets.length === 0 ? 'A biblioteca ainda está vazia' : 'Nada encontrado com esses filtros'}
            </Typography>
            <Typography fontSize={12} color="text.secondary">
              {assets.length === 0
                ? 'Salve peças do Studio (ícone de bookmark) ou envie arquivos pelo Brand Book → Identidade Visual → Assets.'
                : 'Ajuste a busca, a pasta ou a tag.'}
            </Typography>
          </Paper>
        ) : (
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 1.5 }}>
            {filtered.map(a => (
              <Paper key={a.id} variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
                <Box sx={{ aspectRatio: '1 / 1', bgcolor: 'background.default', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AssetPreview a={a} />
                </Box>
                <Box sx={{ px: 1.25, pt: 0.75 }}>
                  <Typography fontSize={12} fontWeight={800} noWrap>{a.nome}</Typography>
                  <Stack direction="row" spacing={0.5} alignItems="center" sx={{ minHeight: 20, flexWrap: 'wrap' }}>
                    {a.pasta && <Typography fontSize={10} color="text.secondary" noWrap>📁 {a.pasta}</Typography>}
                    {(a.tags || []).slice(0, 3).map(t => (
                      <Typography key={t} fontSize={10} sx={{ color: TEAL, fontWeight: 700 }}>#{t}</Typography>
                    ))}
                  </Stack>
                </Box>
                <Box sx={{ px: 0.5, pb: 0.5, display: 'flex', alignItems: 'center' }}>
                  <Tooltip title="Organizar (pasta e tags)">
                    <IconButton size="small" onClick={() => abrirOrg(a)}><TuneOutlinedIcon sx={{ fontSize: 16 }} /></IconButton>
                  </Tooltip>
                  {a.metadata?.generation_id && (
                    <Tooltip title="Certidão do asset — trilha completa da peça">
                      <IconButton size="small" onClick={() => abrirCert(a)}><VerifiedOutlinedIcon sx={{ fontSize: 16, color: TEAL }} /></IconButton>
                    </Tooltip>
                  )}
                  <Box sx={{ flex: 1 }} />
                  {isUrl(a.valor) && (
                    <Tooltip title="Baixar"><IconButton size="small" onClick={() => baixar(a)}><DownloadOutlinedIcon sx={{ fontSize: 16 }} /></IconButton></Tooltip>
                  )}
                  <Tooltip title="Excluir"><IconButton size="small" onClick={() => excluir(a)}><DeleteOutlineIcon sx={{ fontSize: 16 }} /></IconButton></Tooltip>
                </Box>
              </Paper>
            ))}
          </Box>
        )}
        </>)}

        {/* ── Textos: a casa das peças escritas (Redação + Copiloto) ── */}
        {aba === 1 && (
          textos === null ? <Stack alignItems="center" py={8}><CircularProgress size={22} sx={{ color: TEAL }} /></Stack>
          : textos.length === 0 ? (
            <Paper variant="outlined" sx={{ p: 5, borderRadius: 2, textAlign: 'center' }}>
              <ArticleOutlinedIcon sx={{ fontSize: 34, color: 'text.disabled', mb: 1 }} />
              <Typography fontSize={13.5} fontWeight={800} mb={0.5}>Nenhum texto salvo ainda</Typography>
              <Typography fontSize={12} color="text.secondary">Salve peças na Redação ("Salvar na Biblioteca") ou peça ao Copiloto — tudo que a marca escreve mora aqui.</Typography>
            </Paper>
          ) : (
            <Stack spacing={1}>
              {textos.map(t => (
                <Paper key={t.id} variant="outlined" sx={{ p: 1.75, borderRadius: 2, cursor: 'pointer', '&:hover': { borderColor: TEAL } }}
                  onClick={() => setTextoAberto(t)}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <ArticleOutlinedIcon sx={{ fontSize: 18, color: TEAL }} />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography fontSize={13.5} fontWeight={800} noWrap>{t.titulo}</Typography>
                      <Typography fontSize={11} color="text.secondary">
                        {[t.formato, t.origem === 'copiloto' ? 'Copiloto' : t.origem === 'redacao' ? 'Redação' : t.origem].filter(Boolean).join(' · ')} · {new Date(t.created_at).toLocaleDateString('pt-BR')}
                      </Typography>
                    </Box>
                    <Tooltip title="Copiar conteúdo"><IconButton size="small" onClick={e => { e.stopPropagation(); copiarTexto(t) }}><ContentCopyIcon sx={{ fontSize: 15 }} /></IconButton></Tooltip>
                    <Tooltip title="Excluir"><IconButton size="small" onClick={e => { e.stopPropagation(); excluirTexto(t) }}><DeleteOutlineIcon sx={{ fontSize: 15 }} /></IconButton></Tooltip>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          )
        )}

        {/* ── Campanhas: de volta ao mapa (rotas religadas) ── */}
        {aba === 2 && (
          campanhas === null ? <Stack alignItems="center" py={8}><CircularProgress size={22} sx={{ color: TEAL }} /></Stack>
          : (<>
            <Stack direction="row" justifyContent="flex-end" mb={1.5}>
              <Button size="small" variant="contained" disableElevation startIcon={<AddIcon />}
                onClick={() => { window.location.hash = `#/app/brands/${brandId}/studio/campanhas` }}
                sx={{ bgcolor: TEAL, '&:hover': { bgcolor: '#0B8567' }, fontWeight: 800 }}>Nova campanha</Button>
            </Stack>
            {campanhas.length === 0 ? (
              <Paper variant="outlined" sx={{ p: 5, borderRadius: 2, textAlign: 'center' }}>
                <CampaignOutlinedIcon sx={{ fontSize: 34, color: 'text.disabled', mb: 1 }} />
                <Typography fontSize={13.5} fontWeight={800} mb={0.5}>Nenhuma campanha ainda</Typography>
                <Typography fontSize={12} color="text.secondary">A campanha agrupa as peças de um mesmo conceito — crie a primeira.</Typography>
              </Paper>
            ) : (
              <Stack spacing={1}>
                {campanhas.map(c => (
                  <Paper key={c.id} variant="outlined" sx={{ p: 1.75, borderRadius: 2, cursor: 'pointer', '&:hover': { borderColor: TEAL } }}
                    onClick={() => { window.location.hash = `#/app/brands/${brandId}/studio/campanhas?c=${c.id}` }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <CampaignOutlinedIcon sx={{ fontSize: 18, color: TEAL }} />
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography fontSize={13.5} fontWeight={800} noWrap>{c.nome}</Typography>
                        <Typography fontSize={11} color="text.secondary" noWrap>{(c.conceito || '').slice(0, 120)}</Typography>
                      </Box>
                      <Chip label={c.status} size="small" variant="outlined" sx={{ fontSize: 10.5, fontWeight: 700 }} />
                      <Typography fontSize={11} color="text.disabled">{new Date(c.created_at).toLocaleDateString('pt-BR')}</Typography>
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            )}
          </>)
        )}
      </Box>

      {/* Dialog de leitura do texto */}
      <Dialog open={!!textoAberto} onClose={() => setTextoAberto(null)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontSize: 15, fontWeight: 900 }}>{textoAberto?.titulo}</DialogTitle>
        <DialogContent>
          <Typography component="pre" sx={{ fontSize: 13.5, lineHeight: 1.65, whiteSpace: 'pre-wrap', fontFamily: 'inherit', m: 0 }}>
            {textoAberto?.conteudo}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => copiarTexto(textoAberto)} startIcon={<ContentCopyIcon sx={{ fontSize: 15 }} />} sx={{ fontWeight: 700 }}>
            {copiado ? 'Copiado!' : 'Copiar'}
          </Button>
          <Button onClick={() => setTextoAberto(null)} sx={{ fontWeight: 700 }}>Fechar</Button>
        </DialogActions>
      </Dialog>

      {/* Certidão do asset — a trilha auditável da peça (modelo · prompt · versão do cérebro · julgamentos) */}
      <Dialog open={!!cert} onClose={() => setCert(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontSize: 15, fontWeight: 900, display: 'flex', alignItems: 'center', gap: 1 }}>
          <VerifiedOutlinedIcon sx={{ fontSize: 20, color: TEAL }} /> Certidão do asset
        </DialogTitle>
        <DialogContent>
          {certLoading ? (
            <Stack alignItems="center" py={4}><CircularProgress size={20} sx={{ color: TEAL }} /></Stack>
          ) : !certGen ? (
            <Typography fontSize={12.5} color="text.secondary">Trilha de geração não encontrada para esta peça.</Typography>
          ) : (
            <Stack spacing={1.75} mt={0.5}>
              <Stack direction="row" spacing={1.5} alignItems="flex-start">
                {isUrl(cert?.valor) && !isVideo(cert || {}) && (
                  <Box component="img" src={cert.valor} alt="" sx={{ width: 84, height: 84, objectFit: 'cover', borderRadius: 1.5, border: '1px solid', borderColor: 'divider' }} />
                )}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  {[
                    ['Gerada em', new Date(certGen.created_at).toLocaleString('pt-BR')],
                    ['Modelo', certGen.provider || '—'],
                    ['Formato', [certGen.formato, certGen.media_type].filter(Boolean).join(' · ') || '—'],
                    ['Cérebro da marca', certGen.brand_context?.intelligence_versao ? `v${certGen.brand_context.intelligence_versao} na época da geração` : 'contexto base (sem versão destilada)'],
                  ].map(([k, v]) => (
                    <Stack key={k} direction="row" spacing={1} sx={{ py: 0.25 }}>
                      <Typography fontSize={11.5} color="text.secondary" sx={{ width: 120, flexShrink: 0 }}>{k}</Typography>
                      <Typography fontSize={11.5} fontWeight={700} sx={{ wordBreak: 'break-word' }}>{v}</Typography>
                    </Stack>
                  ))}
                </Box>
              </Stack>

              <Box>
                <Typography fontSize={11} fontWeight={800} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.4, mb: 0.5 }}>
                  Julgamentos ({certSignals.length})
                </Typography>
                {certSignals.length === 0 ? (
                  <Typography fontSize={12} color="text.secondary">Nenhum julgamento registrado para esta peça ainda.</Typography>
                ) : (
                  <Stack spacing={0.75}>
                    {certSignals.map((s, i) => {
                      const p = s.payload || {}
                      const humano = s.tipo === 'image_vote'
                      const aprovado = humano ? p.voto === 'like' : (p.veredito || '').toLowerCase().includes('aprov')
                      return (
                        <Paper key={i} variant="outlined" sx={{ p: 1.25, borderRadius: 1.5 }}>
                          <Stack direction="row" spacing={1} alignItems="center" mb={p.resumo || p.ajustes?.length ? 0.5 : 0}>
                            <Chip size="small" label={humano ? (aprovado ? 'Aprovada pelo time' : 'Reprovada pelo time') : `Diretor de Arte · ${p.veredito || 'parecer'}${p.modo === 'fidelidade' ? ' · fidelidade' : ''}`}
                              sx={{ fontSize: 10.5, fontWeight: 800, bgcolor: aprovado ? '#E5F5EF' : '#FDECEA', color: aprovado ? '#0B8567' : '#B3261E' }} />
                            <Typography fontSize={10.5} color="text.disabled">{new Date(s.created_at).toLocaleString('pt-BR')}</Typography>
                          </Stack>
                          {p.resumo && <Typography fontSize={11.5} sx={{ lineHeight: 1.5 }}>{p.resumo}</Typography>}
                          {Array.isArray(p.ajustes) && p.ajustes.length > 0 && (
                            <Typography fontSize={11} color="text.secondary" sx={{ mt: 0.25 }}>Ajustes: {p.ajustes.join(' · ')}</Typography>
                          )}
                        </Paper>
                      )
                    })}
                  </Stack>
                )}
              </Box>

              <Box>
                <Typography fontSize={11} fontWeight={800} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.4, mb: 0.5 }}>
                  Prompt final enviado
                </Typography>
                <Paper variant="outlined" sx={{ p: 1.25, borderRadius: 1.5, maxHeight: 160, overflow: 'auto', bgcolor: 'background.default' }}>
                  <Typography component="pre" sx={{ fontSize: 10.5, fontFamily: 'ui-monospace, monospace', whiteSpace: 'pre-wrap', m: 0, lineHeight: 1.5 }}>
                    {certGen.prompt_final || '—'}
                  </Typography>
                </Paper>
              </Box>

              <Typography fontSize={10} color="text.disabled" sx={{ fontFamily: 'ui-monospace, monospace' }}>
                geração {certGen.id}{certGen.provider_request_id ? ` · job ${certGen.provider_request_id}` : ''} — trilha auditável (compliance §4)
              </Typography>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCert(null)} sx={{ fontWeight: 700 }}>Fechar</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Organizar: pasta (free-solo) + tags (free-solo múltiplas) */}
      <Dialog open={!!org} onClose={() => setOrg(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontSize: 15, fontWeight: 900 }}>Organizar "{org?.nome}"</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={0.5}>
            <Autocomplete freeSolo options={pastas} value={orgPasta}
              onInputChange={(_, v) => setOrgPasta(v)}
              renderInput={params => <TextField {...params} size="small" label="Pasta" placeholder="Escolha ou crie uma pasta…" />} />
            <Autocomplete freeSolo multiple options={tags} value={orgTags}
              onChange={(_, v) => setOrgTags(v)}
              renderTags={(value, getTagProps) => value.map((option, index) => (
                <Chip label={`#${option}`} size="small" {...getTagProps({ index })} key={option} />
              ))}
              renderInput={params => <TextField {...params} size="small" label="Tags" placeholder="Digite e Enter para adicionar…" />} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button size="small" onClick={() => setOrg(null)} sx={{ color: 'text.secondary', fontWeight: 700 }}>Cancelar</Button>
          <Button size="small" variant="contained" disabled={savingOrg} onClick={salvarOrg}
            sx={{ fontWeight: 800, bgcolor: TEAL, '&:hover': { bgcolor: '#0B8567' } }}>
            {savingOrg ? 'Salvando…' : 'Salvar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
