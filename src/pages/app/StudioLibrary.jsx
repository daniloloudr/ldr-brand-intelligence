import { useState, useEffect, useMemo, useRef } from 'react'
import { navigate } from '../../lib/helpers';
import {
  Box, Button, Typography, TextField, Paper, Stack, CircularProgress, Chip,
  IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, Autocomplete, Breadcrumbs, Link, Checkbox, Tabs, Tab,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import CampaignOutlinedIcon from '@mui/icons-material/CampaignOutlined'
import AddIcon from '@mui/icons-material/Add'
import FolderIcon from '@mui/icons-material/Folder'
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined'
import CreateNewFolderOutlinedIcon from '@mui/icons-material/CreateNewFolderOutlined'
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined'
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import DriveFileMoveOutlinedIcon from '@mui/icons-material/DriveFileMoveOutlined'
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined'
import VerifiedOutlinedIcon from '@mui/icons-material/VerifiedOutlined'
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined'
import MovieOutlinedIcon from '@mui/icons-material/MovieOutlined'
import CollectionsBookmarkOutlinedIcon from '@mui/icons-material/CollectionsBookmarkOutlined'
import CloseIcon from '@mui/icons-material/Close'
import StarIcon from '@mui/icons-material/Star'
import StarBorderIcon from '@mui/icons-material/StarBorder'
import Alert from '@mui/material/Alert'
import AlertTitle from '@mui/material/AlertTitle'
import { supabase } from '../../lib/supabase'
import { pendencias, resumoPendencias } from '../../lib/pendencias'
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined'
import OpenInNewOutlinedIcon from '@mui/icons-material/OpenInNewOutlined'
import { PageHeader } from '../../components/shell/PageHeader'
import { FocoPendencia } from '../../components/shell/FocoPendencia'
import { PALETTE } from '../../lib/theme'
import { normalizarVeredito, VEREDITO_ROTULO } from '../../lib/parecer'

const TEAL = PALETTE.data.positivo

// Assets de MÍDIA/arquivo (cor e tipografia são valores de identidade — ficam no Brand Book)
const TIPOS_BIBLIOTECA = ['logo', 'foto', 'video', 'icone', 'padrao', 'documento', 'outro']
// Tipos que nascem como REFERÊNCIA da marca (curadoria/identidade, não peça produzida)
const TIPOS_REFERENCIA = ['logo', 'icone', 'padrao', 'documento']

const isUrl   = v => /^https?:\/\//i.test(v || '')
// Baixável = tem URL pública OU mora num bucket privado (URL assinada na hora)
const baixavel = a => isUrl(a.full || a.valor) || !!(a.metadata?.bucket && a.file_path)
const isVideo = a => a.tipo === 'video' || (a.mime_type || '').startsWith('video/')
// Referência = o cliente subiu como identidade OU marcou como referência
const isReferencia = a => TIPOS_REFERENCIA.includes(a.tipo) || a.metadata?.reference === true

// Pastas-raiz do repositório (estilo Drive): tudo da marca mora aqui
const ROOTS = [
  { id: 'imagens',     label: 'Imagens',              Icon: ImageOutlinedIcon,               desc: 'peças e fotos produzidas' },
  { id: 'videos',      label: 'Vídeos',               Icon: MovieOutlinedIcon,               desc: 'vídeos gerados e enviados' },
  { id: 'textos',      label: 'Textos',               Icon: ArticleOutlinedIcon,             desc: 'peças escritas (Redação e Copiloto)' },
  { id: 'referencias', label: 'Referências da marca', Icon: CollectionsBookmarkOutlinedIcon, desc: 'o que É a marca — logos, padrões e referências curadas' },
  // Campanhas SAIU das pastas-raiz (2026-09-04, decisão do Danilo: "deixar
  // vazia, e do jeito que está; depois voltamos o olhar só pra ela"). Era a
  // última porta visível — o item do menu do Estúdio já tinha saído em 03/set.
  // NADA foi apagado: as 7 campanhas, as 5 gerações vinculadas e os 4 sinais
  // de veredicto continuam no banco, e a rota /studio/campanhas segue viva
  // para deep-link antigo. O branch `root === 'campanhas'` abaixo fica de pé
  // justamente por causa dela. Backlog: E5b, estacionado.
]

// O que falta, dito onde dá para resolver.
//
// Um Alert nativo por pendência, com a severidade fazendo o trabalho: ela já
// traz o ícone e a paleta certos, e `action` põe o botão à direita — é o padrão
// do MUI, não um painel desenhado à mão que imita alerta com bolinha colorida.
//
// Não é modal e não é toast: pendência não tem prazo e não bloqueia nada, então
// aparecer quando a pessoa abre a pasta é lembrete; interromper o que ela veio
// fazer seria cobrança. Dá para recolher, e o estado fica por marca.
const SEVERIDADE = { alta: 'error', media: 'warning', baixa: 'info' }

function PainelPendencias({ itens, brandId, onSubir }) {
  const chave = `pendencias_abertas_${brandId}`
  const [aberto, setAberto] = useState(() => localStorage.getItem(chave) !== 'nao')
  const alternar = () => {
    setAberto(v => { localStorage.setItem(chave, v ? 'nao' : 'sim'); return !v })
  }
  if (!itens.length) return null

  return (
    <Box sx={{ mb: 3 }}>
      <Stack direction="row" alignItems="center" sx={{ mb: 1 }}>
        <Typography sx={{ fontWeight: 700, fontSize: 14, flex: 1 }}>
          {resumoPendencias(itens)}
        </Typography>
        <Button size="small" onClick={alternar} sx={{ fontWeight: 700, fontSize: 11.5 }}>
          {aberto ? 'recolher' : 'ver'}
        </Button>
      </Stack>

      {aberto && (
        <Stack spacing={1.5}>
          {itens.map(p => (
            <Alert key={p.id} severity={SEVERIDADE[p.severidade] || 'info'}
              action={<Button color="inherit" size="small" onClick={onSubir} sx={{ fontWeight: 700 }}>{p.acao}</Button>}>
              <AlertTitle>{p.titulo}</AlertTitle>
              {p.porque}
            </Alert>
          ))}
        </Stack>
      )}
    </Box>
  )
}

function AssetPreview({ a }) {
  if (isUrl(a.valor)) {
    // preload="none" + poster: o grid não baixa nenhum byte de vídeo até o hover
    if (isVideo(a)) return <Box component="video" src={a.valor} muted loop playsInline preload="none" poster={a.poster || undefined}
      onMouseOver={e => e.currentTarget.play().catch(() => {})} onMouseOut={e => e.currentTarget.pause()}
      sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
    if ((a.mime_type || 'image/').startsWith('image/')) return <Box component="img" src={a.valor} alt="" loading="lazy"
      sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
  }
  if ((a.valor || '').includes('<svg')) return (
    <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2,
      '& svg': { maxWidth: '100%', maxHeight: '100%' } }} dangerouslySetInnerHTML={{ __html: a.valor.slice(a.valor.indexOf('<svg')) }} />
  )
  // Arquivo em bucket privado (o manual): não tem URL para miniatura, mas tem
  // identidade — mostra o que é e o peso, não um ícone anônimo.
  if (a.metadata?.bucket && a.file_path) return (
    <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 0.75, p: 2, textAlign: 'center' }}>
      <PictureAsPdfOutlinedIcon sx={{ fontSize: 34, color: 'error.main' }} />
      <Typography variant="caption" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
        {(a.mime_type || '').includes('pdf') ? 'PDF' : 'Arquivo'}
      </Typography>
      {a.size_bytes ? (
        <Typography variant="caption" color="text.secondary">
          {(a.size_bytes / 1048576).toFixed(1)} MB
        </Typography>
      ) : null}
    </Box>
  )

  // Asset que a extração criou é DESCRIÇÃO, não arquivo: o manual descreve o
  // logo, não entrega o arquivo dele. Mostrar a descrição diz mais que um
  // ícone de arquivo quebrado — e deixa explícito que não há imagem aqui.
  if (a.descricao || a.valor) return (
    <Box sx={{ width: '100%', height: '100%', p: 1.5, display: 'flex', alignItems: 'center',
      justifyContent: 'center', overflow: 'hidden' }}>
      <Typography variant="caption" color="text.secondary"
        sx={{ lineHeight: 1.45, display: '-webkit-box', WebkitLineClamp: 5,
          WebkitBoxOrient: 'vertical', overflow: 'hidden', textAlign: 'center' }}>
        {a.descricao || a.valor}
        {a.metadata?.pagina ? ` (p. ${a.metadata.pagina})` : ''}
      </Typography>
    </Box>
  )

  return <InsertDriveFileOutlinedIcon sx={{ fontSize: 34, color: 'text.disabled' }} />
}

export function StudioLibrary({ brandId }) {
  const [assets, setAssets]   = useState([])
  const [textos, setTextos] = useState(null)
  const [campanhas, setCampanhas] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busca, setBusca]     = useState('')
  // Navegação Drive-like: root (null = home) + pasta dentro do root.
  // Deep-link dos botões "Ver todas": handoff via sessionStorage (o router
  // normaliza o hash e derruba query params) — lê e limpa no mount.
  const [root, setRoot]   = useState(() => {
    if (new URLSearchParams(window.location.search).get('pasta')) return 'imagens'
    const r = sessionStorage.getItem('biblioteca_root')
    sessionStorage.removeItem('biblioteca_root')
    return ROOTS.some(x => x.id === r) ? r : null
  })
  // `?pasta=` abre direto a pasta pedida — é o que faz o link vindo do addon de
  // Lote aterrissar no lugar em vez de na raiz de Imagens.
  const [pasta, setPasta] = useState(() => {
    const p = new URLSearchParams(window.location.search).get('pasta')
    return p ? decodeURIComponent(p) : null
  })
  // Performance: paginação infinita de RENDER — o grid só materializa o que
  // está perto do viewport (o fetch já vem limitado; o peso é a mídia no DOM)
  const PAGE = 40
  const [renderLimit, setRenderLimit] = useState(PAGE)
  const sentinelRef = useRef(null)
  const [novasPastas, setNovasPastas] = useState({})  // root -> [nomes criados nesta sessão]
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef(null)
  // Seleção múltipla + drag-and-drop (estilo Drive)
  const [sel, setSel] = useState({})   // `${kind}:${id}` -> item
  const dragRef = useRef(null)         // itens em arrasto (a seleção inteira, se o arrastado estiver nela)
  // Dialogs
  const [org, setOrg] = useState(null)                // { kind: 'asset'|'texto', item }
  const [orgPasta, setOrgPasta] = useState('')
  const [orgTags, setOrgTags]   = useState([])
  const [savingOrg, setSavingOrg] = useState(false)
  const [textoAberto, setTextoAberto] = useState(null)
  const [copiado, setCopiado] = useState(false)
  const [lightbox, setLightbox] = useState(null)   // { url, video, nome } — peça em tamanho grande (full-res)
  const [cert, setCert] = useState(null)
  const [certGen, setCertGen] = useState(null)
  const [certSignals, setCertSignals] = useState([])
  const [certLoading, setCertLoading] = useState(false)
  // A certidão responde DUAS perguntas de públicos diferentes: "de onde veio e o
  // que foi processado" (procurement e jurídico — compliance §4/§6) e "a marca
  // aprovou?" (quem opera a marca). Empilhadas, uma esconde a outra: quem abre
  // para auditar rola por cima dos pareceres, e quem abre para ver o veredito
  // rola por cima do prompt. Abas separam sem esconder.
  const [certAba, setCertAba] = useState('procedencia')

  useEffect(() => { if (brandId) load() }, [brandId])

  const [gens, setGens] = useState([])

  async function load() {
    setLoading(true)
    const [{ data }, { data: geradas }, { data: pecas }, { data: camps }] = await Promise.all([
      supabase.from('brand_assets').select('*')
        .eq('brand_id', brandId).in('tipo', TIPOS_BIBLIOTECA)
        .order('created_at', { ascending: false }),
      // TUDO que foi gerado aparece aqui automaticamente (sem duplicar em assets)
      supabase.from('studio_generations')
        .select('id, created_at, image_url, thumbnail_url, media_type, formato, provider, pasta, prompt_final')
        .eq('brand_id', brandId).eq('status', 'done').not('image_url', 'is', null)
        .order('created_at', { ascending: false }).limit(400),
      supabase.from('pecas_escritas').select('*')
        .eq('brand_id', brandId).order('created_at', { ascending: false }).limit(200),
      supabase.from('studio_campaigns').select('id, nome, conceito, status, created_at')
        .eq('brand_id', brandId).order('created_at', { ascending: false }).limit(50),
    ])
    setAssets(data || [])
    setGens(geradas || [])
    setTextos(pecas || [])
    setCampanhas(camps || [])
    setLoading(false)
  }

  // ── Classificação: cada item mora numa pasta-raiz ──
  const porRoot = useMemo(() => {
    // geração já promovida a asset (bookmark) aparece pelo asset (que tem pasta/tags)
    const promovidas = new Set(assets.map(a => a.metadata?.generation_id).filter(Boolean))
    const genItems = gens.filter(g => !promovidas.has(g.id)).map(g => ({
      kind: 'gen', id: g.id, created_at: g.created_at,
      nome: `Studio · ${[g.formato, g.media_type === 'video' ? 'vídeo' : null].filter(Boolean).join(' · ') || 'peça'}`,
      descricao: (g.prompt_final || '').slice(0, 140),
      // grid usa o thumbnail (corta egress); full-res fica p/ download/certidão
      valor: g.media_type === 'video' ? g.image_url : (g.thumbnail_url || g.image_url),
      full: g.image_url, poster: g.thumbnail_url || null,
      mime_type: g.media_type === 'video' ? 'video/mp4' : 'image/png',
      tipo: g.media_type === 'video' ? 'video' : 'foto',
      pasta: g.pasta, tags: [], metadata: { generation_id: g.id, source: 'studio-auto' },
    }))
    const aItems = assets.map(a => ({ ...a, kind: 'asset' }))
    const byDate = (x, y) => new Date(y.created_at) - new Date(x.created_at)
    return {
      referencias: aItems.filter(isReferencia),
      videos:      [...aItems.filter(a => !isReferencia(a) && isVideo(a)), ...genItems.filter(isVideo)].sort(byDate),
      imagens:     [...aItems.filter(a => !isReferencia(a) && !isVideo(a)), ...genItems.filter(g => !isVideo(g))].sort(byDate),
      textos:      textos || [],
      campanhas:   campanhas || [],
    }
  }, [assets, gens, textos, campanhas])

  // Só em Referências: é a pasta onde tudo isto se resolve.
  // Cada tela mostra o que ELA resolve: aqui entram os arquivos; as lacunas de
  // texto pertencem ao Brand Book, e listá-las numa pasta de arquivos só faria
  // a lista crescer sem dar o que fazer. O sininho continua com tudo.
  const itensPendentes = useMemo(() => pendencias({
    assets,
    temManual: assets.some(a => a.metadata?.origem === 'manual'),
  }).filter(p => p.destino?.bibliotecaRoot), [assets])

  const escopo = root ? porRoot[root] : []
  const temPastas = root && root !== 'campanhas'

  // ⭐ Pasta aninhada: `Catálogo/49FP/2026-09-04` é uma ÁRVORE, não um nome.
  //
  // Antes `pasta` era texto plano e cada caminho virava uma pasta solta na
  // raiz — o addon de Lote grava a estrutura, e sem isto ela apareceria como
  // uma linha ilegível por SKU e por dia. Aqui o `/` volta a significar nível.
  //
  // `pasta` continua sendo o caminho COMPLETO no banco: a mudança é só de
  // leitura, e nada precisa ser migrado.
  const dentroDe = (caminho, atual) => {
    if (!caminho) return false
    if (!atual) return true
    return caminho === atual || caminho.startsWith(atual + '/')
  }
  // O próximo segmento de `caminho` a partir de `atual` — null se for o fim.
  const proximoNivel = (caminho, atual) => {
    const resto = atual ? caminho.slice(atual.length + 1) : caminho
    if (!resto) return null
    const seg = resto.split('/')[0]
    return atual ? `${atual}/${seg}` : seg
  }

  // Subpastas do nível atual (das existentes + criadas na sessão)
  const subpastas = useMemo(() => {
    if (!temPastas) return []
    const caminhos = [...new Set([
      ...escopo.map(i => i.pasta).filter(Boolean),
      ...(novasPastas[root] || []),
    ])]
    const filhos = caminhos
      .filter(c => dentroDe(c, pasta) && c !== pasta)
      .map(c => proximoNivel(c, pasta))
      .filter(Boolean)
    return [...new Set(filhos)].sort()
  }, [escopo, novasPastas, root, temPastas, pasta])

  // Itens visíveis: da pasta atual (null = raiz do root), filtrados pela busca
  const visiveis = useMemo(() => {
    let list = escopo
    // Só o que está NESTE nível — o que mora numa subpasta aparece ao entrar
    // nela, senão a raiz mostraria tudo e a árvore não serviria para nada.
    if (temPastas) list = list.filter(i => (pasta ? i.pasta === pasta : !i.pasta))
    const q = busca.trim().toLowerCase()
    if (q) list = (temPastas && !pasta ? escopo : list).filter(i => {
      const alvo = `${i.nome || i.titulo || ''} ${i.descricao || i.conceito || ''} ${(i.tags || []).join(' ')} ${i.pasta || ''}`.toLowerCase()
      return alvo.includes(q)
    })
    return list
  }, [escopo, pasta, busca, temPastas])

  function navegar(novoRoot, novaPasta = null) { setRoot(novoRoot); setPasta(novaPasta); setBusca(''); setRenderLimit(PAGE); setSel({}) }

  // ── Seleção múltipla ──
  const kindOf = i => i.kind || (i.titulo !== undefined ? 'texto' : 'asset')
  const selKey = i => `${kindOf(i)}:${i.id}`
  const selCount = Object.keys(sel).length
  function toggleSel(item) {
    setSel(prev => {
      const k = selKey(item); const n = { ...prev }
      if (n[k]) delete n[k]; else n[k] = item
      return n
    })
  }

  // ── Mover em lote (drag ou dialog) — kind-aware, uma query por tabela ──
  async function moveItems(items, pastaFinal) {
    const ids = k => items.filter(i => kindOf(i) === k).map(i => i.id)
    const [aIds, gIds, tIds] = [ids('asset'), ids('gen'), ids('texto')]
    await Promise.all([
      aIds.length ? supabase.from('brand_assets').update({ pasta: pastaFinal }).in('id', aIds) : null,
      gIds.length ? supabase.from('studio_generations').update({ pasta: pastaFinal }).in('id', gIds) : null,
      tIds.length ? supabase.from('pecas_escritas').update({ pasta: pastaFinal }).in('id', tIds) : null,
    ].filter(Boolean))
    if (aIds.length) setAssets(prev => prev.map(a => aIds.includes(a.id) ? { ...a, pasta: pastaFinal } : a))
    if (gIds.length) setGens(prev => prev.map(g => gIds.includes(g.id) ? { ...g, pasta: pastaFinal } : g))
    if (tIds.length) setTextos(prev => prev.map(t => tIds.includes(t.id) ? { ...t, pasta: pastaFinal } : t))
    setSel({})
  }

  async function excluirSelecionados() {
    const items = Object.values(sel)
    if (!items.length || !window.confirm(`Excluir ${items.length} item(ns) da biblioteca?`)) return
    const ids = k => items.filter(i => kindOf(i) === k).map(i => i.id)
    const [aIds, gIds, tIds] = [ids('asset'), ids('gen'), ids('texto')]
    await Promise.all([
      aIds.length ? supabase.from('brand_assets').delete().in('id', aIds) : null,
      gIds.length ? supabase.from('studio_generations').delete().in('id', gIds) : null,
      tIds.length ? supabase.from('pecas_escritas').delete().in('id', tIds) : null,
    ].filter(Boolean))
    if (aIds.length) setAssets(prev => prev.filter(a => !aIds.includes(a.id)))
    if (gIds.length) setGens(prev => prev.filter(g => !gIds.includes(g.id)))
    if (tIds.length) setTextos(prev => prev.filter(t => !tIds.includes(t.id)))
    setSel({})
  }

  // ── Apagar pasta criada (as raízes são do sistema): itens voltam pra raiz do root ──
  async function apagarPasta(p) {
    const itens = escopo.filter(i => i.pasta === p)
    const aviso = itens.length ? ` ${itens.length} item(ns) voltam para a raiz de ${rootDef?.label}.` : ''
    if (!window.confirm(`Apagar a pasta "${p}"?${aviso}`)) return
    if (itens.length) await moveItems(itens, null)
    setNovasPastas(prev => ({ ...prev, [root]: (prev[root] || []).filter(x => x !== p) }))
  }

  // ── Drag: arrasta o item (ou a seleção inteira, se ele estiver nela) ──
  function onDragItem(e, item) {
    dragRef.current = sel[selKey(item)] ? Object.values(sel) : [item]
    e.dataTransfer.effectAllowed = 'move'
  }
  const dropProps = destinoPasta => ({
    onDragOver: e => e.preventDefault(),
    onDrop: e => { e.preventDefault(); if (dragRef.current?.length) { moveItems(dragRef.current, destinoPasta); dragRef.current = null } },
  })

  // Sentinela do scroll infinito: chegou perto do fim → materializa mais uma página
  useEffect(() => { setRenderLimit(PAGE) }, [busca])
  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const obs = new IntersectionObserver(es => {
      if (es[0].isIntersecting) setRenderLimit(l => l + PAGE)
    }, { rootMargin: '600px' })
    obs.observe(el)
    return () => obs.disconnect()
  }, [root, pasta, busca, renderLimit, loading])

  function novaPasta() {
    const nome = window.prompt('Nome da nova pasta:')?.trim()
    if (!nome) return
    setNovasPastas(prev => ({ ...prev, [root]: [...new Set([...(prev[root] || []), nome])] }))
  }

  // ── Upload direto na pasta atual (Imagens/Vídeos/Referências) ──
  async function uploadAqui(fileList) {
    const files = Array.from(fileList || [])
    if (!files.length) return
    setUploading(true)
    const { data: brand } = await supabase.from('brands').select('workspace_id').eq('id', brandId).single()
    for (const file of files) {
      const path = `${brandId}/biblioteca/${Date.now()}-${Math.random().toString(36).slice(2, 6)}-${(file.name || 'arquivo').replace(/[^\w.\-]/g, '_')}`
      const { error } = await supabase.storage.from('brand-assets').upload(path, file, { upsert: true })
      if (error) continue
      const url = supabase.storage.from('brand-assets').getPublicUrl(path).data.publicUrl
      const video = (file.type || '').startsWith('video/')
      const { data: asset } = await supabase.from('brand_assets').insert({
        brand_id: brandId, tipo: video ? 'video' : 'foto', nome: file.name,
        valor: url, mime_type: file.type || null, pasta: pasta || null,
        metadata: { source: 'upload', ...(root === 'referencias' ? { reference: true } : {}) },
      }).select('id').single()
      // Referência subida = ENSINO curatorial ("isto É a marca") — sinal de peso
      // alto pro cérebro (pedido do Rafael/Hering; item Ativos-como-referência)
      if (root === 'referencias' && asset && brand?.workspace_id) {
        supabase.from('brand_signals').insert({
          brand_id: brandId, workspace_id: brand.workspace_id,
          tipo: 'reference_upload', fonte: 'biblioteca', ref_id: asset.id, peso: 2.5,
          payload: { nome: file.name, mime_type: file.type || null, url, pasta: pasta || null },
        }).then(({ error: e }) => { if (e) console.error('[biblioteca] sinal reference_upload falhou:', e.message) })
      }
    }
    setUploading(false)
    load()
  }

  // ── Mover/organizar (assets: pasta+tags · textos: pasta) ──
  function abrirOrg(kind, item) { setOrg({ kind, item }); setOrgPasta(item.pasta || ''); setOrgTags(item.tags || []) }

  async function salvarOrg() {
    if (!org) return
    setSavingOrg(true)
    const pastaFinal = (orgPasta || '').trim() || null
    if (org.kind === 'bulk') {   // mover a seleção inteira
      await moveItems(Object.values(sel), pastaFinal)
      setSavingOrg(false); setOrg(null)
      return
    }
    if (org.kind === 'texto') {
      const { error } = await supabase.from('pecas_escritas').update({ pasta: pastaFinal }).eq('id', org.item.id)
      if (!error) setTextos(prev => prev.map(t => t.id === org.item.id ? { ...t, pasta: pastaFinal } : t))
    } else if (org.kind === 'gen') {
      const { error } = await supabase.from('studio_generations').update({ pasta: pastaFinal }).eq('id', org.item.id)
      if (!error) setGens(prev => prev.map(g => g.id === org.item.id ? { ...g, pasta: pastaFinal } : g))
    } else {
      const tagsFinal = [...new Set(orgTags.map(t => (t || '').trim()).filter(Boolean))]
      const { error } = await supabase.from('brand_assets').update({ pasta: pastaFinal, tags: tagsFinal }).eq('id', org.item.id)
      if (!error) setAssets(prev => prev.map(a => a.id === org.item.id ? { ...a, pasta: pastaFinal, tags: tagsFinal } : a))
    }
    setSavingOrg(false); setOrg(null)
  }

  async function excluir(a) {
    if (!window.confirm(`Excluir "${a.nome}" da biblioteca?`)) return
    if (a.kind === 'gen') {
      const { error } = await supabase.from('studio_generations').delete().eq('id', a.id)
      if (!error) setGens(prev => prev.filter(x => x.id !== a.id))
      return
    }
    const { error } = await supabase.from('brand_assets').delete().eq('id', a.id)
    if (!error) setAssets(prev => prev.filter(x => x.id !== a.id))
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

  // Logo/imagem do header (lockup MARCA.BR4NDCODE) — funcionalidade herdada dos
  // Ativos: um asset com metadata.header=true; o AppShell ouve o evento e troca ao vivo.
  const headerId = assets.find(a => a.metadata?.header)?.id
    || assets.find(a => a.tipo === 'logo')?.id   // fallback: primeiro logo (comportamento padrão)

  async function usarNoHeader(a) {
    const atual = assets.find(x => x.metadata?.header)
    if (atual && atual.id !== a.id) {
      await supabase.from('brand_assets').update({ metadata: { ...(atual.metadata || {}), header: false } }).eq('id', atual.id)
    }
    const { error } = await supabase.from('brand_assets')
      .update({ metadata: { ...(a.metadata || {}), header: true } }).eq('id', a.id)
    if (!error) {
      setAssets(prev => prev.map(x => ({ ...x, metadata: { ...(x.metadata || {}), header: x.id === a.id } })))
      window.dispatchEvent(new Event('brand-lockup-refresh'))
    }
  }

  // O PDF completo abre no visualizador nativo — busca, zoom e navegação de
  // página de graça, sem carregar um renderizador no bundle.
  async function abrirArquivo(a) {
    if (!a.metadata?.bucket || !a.file_path) return
    const { data } = await supabase.storage
      .from(a.metadata.bucket).createSignedUrl(a.file_path, 300)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank', 'noopener')
  }

  async function baixar(a) {
    // Arquivo em bucket privado (o manual da marca) não tem URL pública: o
    // asset guarda o caminho e o bucket, e a URL é assinada na hora de abrir.
    let url = a.full || a.valor   // gerações: download sempre em full-res
    if (!isUrl(url) && a.metadata?.bucket && a.file_path) {
      const { data } = await supabase.storage
        .from(a.metadata.bucket).createSignedUrl(a.file_path, 60)
      url = data?.signedUrl
    }
    if (!isUrl(url)) return
    const link = document.createElement('a')
    link.href = url; link.download = a.nome || 'asset'; link.target = '_blank'; link.click()
  }

  // Certidão do asset: trilha auditável da peça (compliance.md §4)
  async function abrirCert(a) {
    setCertAba('procedencia')   // reabrir sempre começa pela trilha
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
      supabase.from('brand_signals')
        .select('id, tipo, payload, created_at')
        .eq('tipo', 'art_review').eq('payload->>image_url', a.full || a.valor)
        .order('created_at', { ascending: true }),
    ])
    const vistos = new Set()
    const sigs = [...(porRef || []), ...(porUrl || [])]
      .filter(s => !vistos.has(s.id) && vistos.add(s.id))
      .sort((x, y) => new Date(x.created_at) - new Date(y.created_at))
    setCertGen(gen || null); setCertSignals(sigs); setCertLoading(false)
  }

  const podeUpload = ['imagens', 'videos', 'referencias'].includes(root)
  const rootDef = ROOTS.find(r => r.id === root)

  return (
    <Box>
      <PageHeader title="Estúdio" subtitle="Biblioteca — o repositório da marca: tudo que ela cria e tudo que a define" />

      {/* Tela inteira (estilo Drive): sem maxWidth, padding lateral só */}
      <Box sx={{ p: { xs: 2, md: 3 }, width: '100%' }}>

        {/* Breadcrumb + ações contextuais */}
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
          <Breadcrumbs sx={{ '& .MuiBreadcrumbs-separator': { mx: 0.75 } }}>
            <Link underline={root ? 'hover' : 'none'} color={root ? 'inherit' : 'text.primary'}
              sx={{ fontSize: 13.5, fontWeight: 800, cursor: root ? 'pointer' : 'default' }}
              onClick={() => navegar(null)}>Biblioteca</Link>
            {root && (
              <Link underline={pasta ? 'hover' : 'none'} color={pasta ? 'inherit' : 'text.primary'}
                sx={{ fontSize: 13.5, fontWeight: 800, cursor: pasta ? 'pointer' : 'default' }}
                onClick={() => navegar(root)} {...(pasta ? dropProps(null) : {})}>{rootDef?.label}</Link>
            )}
            {/* Um nível por segmento, cada um clicável: com
                `Catálogo/49FP/20260904` a pessoa precisa poder voltar para o
                SKU sem sair para a raiz. */}
            {pasta && pasta.split('/').map((seg, i, todos) => {
              const ate = todos.slice(0, i + 1).join('/')
              const ultimo = i === todos.length - 1
              return ultimo
                ? <Typography key={ate} sx={{ fontSize: 13.5, fontWeight: 800 }}>📁 {seg}</Typography>
                : <Link key={ate} component="button" underline="hover" color="inherit"
                    sx={{ fontSize: 13.5 }} onClick={() => navegar(root, ate)}>{seg}</Link>
            })}
          </Breadcrumbs>
          <Box sx={{ flex: 1 }} />
          {root && (
            <TextField size="small" placeholder={`Buscar em ${rootDef?.label}…`} value={busca} onChange={e => setBusca(e.target.value)}
              sx={{ width: { xs: 160, md: 280 } }}
              InputProps={{ startAdornment: <SearchIcon sx={{ fontSize: 17, mr: 0.75, color: 'text.disabled' }} /> }} />
          )}
          {temPastas && !pasta && (
            <Button size="small" startIcon={<CreateNewFolderOutlinedIcon sx={{ fontSize: 17 }} />} onClick={novaPasta}
              sx={{ fontWeight: 700, color: 'text.secondary' }}>Nova pasta</Button>
          )}
          {podeUpload && (<>
            <input ref={fileRef} type="file" multiple hidden
              accept={root === 'videos' ? 'video/*' : 'image/*,video/*,application/pdf'}
              onChange={e => { uploadAqui(e.target.files); e.target.value = '' }} />
            <Button size="small" variant="contained" disableElevation disabled={uploading}
              startIcon={uploading ? <CircularProgress size={13} sx={{ color: '#fff' }} /> : <UploadFileOutlinedIcon sx={{ fontSize: 17 }} />}
              onClick={() => fileRef.current?.click()}
              sx={{ bgcolor: 'primary.main', '&:hover': { bgcolor: 'primary.dark' }, fontWeight: 800 }}>
              {uploading ? 'Enviando…' : 'Upload'}
            </Button>
          </>)}
          {root === 'campanhas' && (
            <Button size="small" variant="contained" disableElevation startIcon={<AddIcon />}
              onClick={() => { navigate(`#/app/brands/${brandId}/studio/campanhas`) }}
              sx={{ bgcolor: 'primary.main', '&:hover': { bgcolor: 'primary.dark' }, fontWeight: 800 }}>Nova campanha</Button>
          )}
        </Stack>

        {/* Barra de seleção múltipla — mover em lote, excluir em lote */}
        {selCount > 0 && (
          <Paper variant="outlined" sx={{ px: 1.5, py: 0.75, mb: 2, borderRadius: 2, display: 'flex', alignItems: 'center', gap: 1, borderColor: TEAL }}>
            <Typography variant="subtitle2">{selCount} selecionado{selCount > 1 ? 's' : ''}</Typography>
            <Typography variant="caption" color="text.disabled">arraste qualquer um deles para uma pasta, ou use as ações →</Typography>
            <Box sx={{ flex: 1 }} />
            <Button size="small" startIcon={<DriveFileMoveOutlinedIcon sx={{ fontSize: 15 }} />}
              onClick={() => { setOrg({ kind: 'bulk' }); setOrgPasta(''); setOrgTags([]) }} sx={{ fontWeight: 700 }}>Mover</Button>
            <Button size="small" color="error" startIcon={<DeleteOutlineIcon sx={{ fontSize: 15 }} />}
              onClick={excluirSelecionados} sx={{ fontWeight: 700 }}>Excluir</Button>
            <Button size="small" onClick={() => setSel({})} sx={{ fontWeight: 700, color: 'text.secondary' }}>Limpar</Button>
          </Paper>
        )}

        {loading ? (
          <Stack alignItems="center" py={10}><CircularProgress size={22} sx={{ color: 'primary.main' }} /></Stack>

        ) : !root ? (
          /* ── HOME: as pastas-raiz do repositório ── */
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 2 }}>
            {ROOTS.map(({ id, label, Icon, desc }) => (
              <Paper key={id} variant="outlined" onClick={() => navegar(id)}
                sx={{ p: 2.5, borderRadius: 2.5, cursor: 'pointer', '&:hover': { borderColor: TEAL, boxShadow: 1 } }}>
                <Stack direction="row" spacing={1.5} alignItems="center" mb={1}>
                  <Icon sx={{ fontSize: 26, color: TEAL }} />
                  <Typography variant="subtitle1">{label}</Typography>
                  <Box sx={{ flex: 1 }} />
                  <Chip size="small" label={porRoot[id].length} sx={{ fontWeight: 800, fontSize: 11 }} />
                </Stack>
                <Typography variant="caption" color="text.secondary">{desc}</Typography>
              </Paper>
            ))}
          </Box>

        ) : (
          <>
            {root === 'referencias' && !pasta && !busca.trim() && <FocoPendencia />}
            {root === 'referencias' && !pasta && !busca.trim() && (
              <PainelPendencias itens={itensPendentes} brandId={brandId}
                onSubir={() => fileRef.current?.click()} />
            )}

            {/* Subpastas (Drive: pastas primeiro) — some quando busca ativa ou dentro de pasta */}
            {temPastas && !pasta && !busca.trim() && subpastas.length > 0 && (
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 1.25, mb: 2.5 }}>
                {subpastas.map(p => {
                  // conta tudo que está DENTRO, inclusive nos níveis abaixo
                  const n = escopo.filter(i => dentroDe(i.pasta, p)).length
                  return (
                    <Paper key={p} variant="outlined" onClick={() => navegar(root, p)} {...dropProps(p)}
                      sx={{ px: 1.5, py: 1.25, borderRadius: 2, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 1,
                        '&:hover': { borderColor: TEAL }, '&:hover .del-pasta': { opacity: 1 } }}>
                      <FolderIcon sx={{ fontSize: 20, color: PALETTE.data.atencao }} />
                      {/* o cartão mostra o NOME da pasta, não o caminho inteiro */}
                      <Typography variant="subtitle2" noWrap sx={{ flex: 1 }}>{p.split('/').pop()}</Typography>
                      <Typography variant="caption" color="text.disabled">{n}</Typography>
                      <Tooltip title="Apagar pasta (itens voltam para a raiz)">
                        <IconButton className="del-pasta" size="small" onClick={e => { e.stopPropagation(); apagarPasta(p) }}
                          sx={{ opacity: 0, transition: 'opacity .15s', p: 0.25 }}>
                          <DeleteOutlineIcon sx={{ fontSize: 15 }} />
                        </IconButton>
                      </Tooltip>
                    </Paper>
                  )
                })}
              </Box>
            )}

            {visiveis.length === 0 ? (
              <Paper variant="outlined" sx={{ p: 6, borderRadius: 2, textAlign: 'center' }}>
                <Typography variant="subtitle2" mb={0.5}>
                  {busca.trim() ? 'Nada encontrado' : pasta ? 'Pasta vazia' : `Nada em ${rootDef?.label} ainda`}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {root === 'textos' ? 'Salve peças na Redação ou peça ao Copiloto — tudo que a marca escreve mora aqui.'
                    : root === 'referencias' ? 'Suba aqui o que DEFINE a marca: logos, padrões e imagens-referência que ensinam o cérebro.'
                    : root === 'campanhas' ? 'A campanha agrupa as peças de um mesmo conceito — crie a primeira.'
                    : podeUpload ? 'Use o Upload acima, ou salve peças do Studio (ícone de bookmark).' : ''}
                </Typography>
              </Paper>

            ) : root === 'textos' ? (
              <Stack spacing={1}>
                {visiveis.slice(0, renderLimit).map(t => (
                  <Paper key={t.id} variant="outlined" draggable onDragStart={e => onDragItem(e, { ...t, kind: 'texto' })}
                    sx={{ p: 1.75, borderRadius: 2, cursor: 'pointer', '&:hover': { borderColor: TEAL },
                      ...(sel[`texto:${t.id}`] && { borderColor: TEAL, borderWidth: 2 }) }}
                    onClick={() => setTextoAberto(t)}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Checkbox size="small" checked={!!sel[`texto:${t.id}`]}
                        onClick={e => e.stopPropagation()} onChange={() => toggleSel({ ...t, kind: 'texto' })}
                        sx={{ p: 0.25, '&.Mui-checked': { color: TEAL } }} />
                      <ArticleOutlinedIcon sx={{ fontSize: 18, color: TEAL }} />
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="subtitle2" noWrap>{t.titulo}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {[t.formato, t.origem === 'copiloto' ? 'Copiloto' : t.origem === 'redacao' ? 'Redação' : t.origem, t.pasta && `📁 ${t.pasta}`].filter(Boolean).join(' · ')} · {new Date(t.created_at).toLocaleDateString('pt-BR')}
                        </Typography>
                      </Box>
                      <Tooltip title="Mover para pasta"><IconButton size="small" onClick={e => { e.stopPropagation(); abrirOrg('texto', t) }}><DriveFileMoveOutlinedIcon sx={{ fontSize: 15 }} /></IconButton></Tooltip>
                      <Tooltip title="Copiar conteúdo"><IconButton size="small" onClick={e => { e.stopPropagation(); copiarTexto(t) }}><ContentCopyIcon sx={{ fontSize: 15 }} /></IconButton></Tooltip>
                      <Tooltip title="Excluir"><IconButton size="small" onClick={e => { e.stopPropagation(); excluirTexto(t) }}><DeleteOutlineIcon sx={{ fontSize: 15 }} /></IconButton></Tooltip>
                    </Stack>
                  </Paper>
                ))}
              </Stack>

            ) : root === 'campanhas' ? (
              <Stack spacing={1}>
                {visiveis.map(c => (
                  <Paper key={c.id} variant="outlined" sx={{ p: 1.75, borderRadius: 2, cursor: 'pointer', '&:hover': { borderColor: TEAL } }}
                    onClick={() => { navigate(`#/app/brands/${brandId}/studio/campanhas?c=${c.id}`) }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <CampaignOutlinedIcon sx={{ fontSize: 18, color: TEAL }} />
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="subtitle2" noWrap>{c.nome}</Typography>
                        <Typography variant="caption" color="text.secondary" noWrap>{(c.conceito || '').slice(0, 120)}</Typography>
                      </Box>
                      <Chip label={c.status} size="small" variant="outlined" sx={{ fontSize: 10.5, fontWeight: 700 }} />
                      <Typography variant="caption" color="text.disabled">{new Date(c.created_at).toLocaleDateString('pt-BR')}</Typography>
                    </Stack>
                  </Paper>
                ))}
              </Stack>

            ) : (
              /* Grid de mídia (Imagens/Vídeos/Referências) — tela cheia, render paginado */
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 1.5 }}>
                {visiveis.slice(0, renderLimit).map(a => (
                  <Paper key={a.id} variant="outlined" draggable onDragStart={e => onDragItem(e, a)}
                    sx={{ borderRadius: 2, overflow: 'hidden', position: 'relative',
                      ...(sel[selKey(a)] && { borderColor: TEAL, borderWidth: 2 }),
                      '&:hover .selbox': { opacity: 1 } }}>
                    <Checkbox className="selbox" size="small" checked={!!sel[selKey(a)]}
                      onClick={e => e.stopPropagation()} onChange={() => toggleSel(a)}
                      sx={{ position: 'absolute', top: 2, left: 2, zIndex: 1, p: 0.5, opacity: sel[selKey(a)] ? 1 : 0,
                        transition: 'opacity .15s', bgcolor: 'rgba(255,255,255,.85)', borderRadius: 1,
                        '&:hover': { bgcolor: 'rgba(255,255,255,.95)' }, '&.Mui-checked': { color: TEAL } }} />
                    <Box onClick={() => {
                      if (isUrl(a.full || a.valor)) setLightbox({ url: a.full || a.valor, video: isVideo(a), nome: a.nome })
                      else if (a.metadata?.bucket && a.file_path) abrirArquivo(a)
                    }}
                      sx={{ aspectRatio: '1 / 1', bgcolor: 'background.default', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: isUrl(a.full || a.valor) ? 'zoom-in' : (a.metadata?.bucket ? 'pointer' : 'default') }}>
                      <AssetPreview a={a} />
                    </Box>
                    <Box sx={{ px: 1.25, pt: 0.75 }}>
                      <Typography variant="caption" noWrap>{a.nome}</Typography>
                      <Stack direction="row" spacing={0.5} alignItems="center" sx={{ minHeight: 18, flexWrap: 'wrap' }}>
                        {busca.trim() && a.pasta && <Typography variant="caption" color="text.secondary" noWrap>📁 {a.pasta}</Typography>}
                        {(a.tags || []).slice(0, 3).map(t => (
                          <Typography variant="caption" key={t} sx={{ color: 'primary.main', fontWeight: 700 }}>#{t}</Typography>
                        ))}
                      </Stack>
                    </Box>
                    <Box sx={{ px: 0.5, pb: 0.5, display: 'flex', alignItems: 'center' }}>
                      <Tooltip title="Mover / organizar">
                        <IconButton size="small" onClick={() => abrirOrg(a.kind === 'gen' ? 'gen' : 'asset', a)}><DriveFileMoveOutlinedIcon sx={{ fontSize: 16 }} /></IconButton>
                      </Tooltip>
                      {a.metadata?.generation_id && (
                        <Tooltip title="Certidão do asset — trilha completa da peça">
                          <IconButton size="small" onClick={() => abrirCert(a)}><VerifiedOutlinedIcon sx={{ fontSize: 16, color: TEAL }} /></IconButton>
                        </Tooltip>
                      )}
                      {root === 'referencias' && a.kind === 'asset' && !isVideo(a) && (
                        <Tooltip title={headerId === a.id ? 'Aparece no header (antes do .BR4NDCODE)' : 'Usar no header'}>
                          <IconButton size="small" onClick={() => usarNoHeader(a)}>
                            {headerId === a.id
                              ? <StarIcon sx={{ fontSize: 16, color: PALETTE.data.critico }} />
                              : <StarBorderIcon sx={{ fontSize: 16 }} />}
                          </IconButton>
                        </Tooltip>
                      )}
                      <Box sx={{ flex: 1 }} />
                      {a.metadata?.bucket && a.file_path && (
                        <Tooltip title="Abrir no visualizador"><IconButton size="small" onClick={() => abrirArquivo(a)}><OpenInNewOutlinedIcon sx={{ fontSize: 16 }} /></IconButton></Tooltip>
                      )}
                      {baixavel(a) && (
                        <Tooltip title="Baixar"><IconButton size="small" onClick={() => baixar(a)}><DownloadOutlinedIcon sx={{ fontSize: 16 }} /></IconButton></Tooltip>
                      )}
                      <Tooltip title="Excluir"><IconButton size="small" onClick={() => excluir(a)}><DeleteOutlineIcon sx={{ fontSize: 16 }} /></IconButton></Tooltip>
                    </Box>
                  </Paper>
                ))}
              </Box>
            )}

            {/* Sentinela do scroll infinito + contador */}
            {visiveis.length > renderLimit && (
              <Stack ref={sentinelRef} alignItems="center" py={3}>
                <CircularProgress size={18} sx={{ color: 'primary.main' }} />
                <Typography variant="caption" color="text.disabled" mt={0.75}>
                  {Math.min(renderLimit, visiveis.length)} de {visiveis.length}
                </Typography>
              </Stack>
            )}
          </>
        )}
      </Box>

      {/* Lightbox — peça em tamanho grande (full-res do R2) */}
      <Dialog open={!!lightbox} onClose={() => setLightbox(null)} maxWidth="lg"
        slotProps={{ paper: { sx: { bgcolor: 'transparent', boxShadow: 'none', overflow: 'visible' } } }}>
        <Box sx={{ position: 'relative' }}>
          <IconButton onClick={() => setLightbox(null)}
            sx={{ position: 'absolute', top: -14, right: -14, bgcolor: 'rgba(0,0,0,.6)', color: '#fff', zIndex: 1, '&:hover': { bgcolor: 'rgba(0,0,0,.8)' } }}>
            <CloseIcon sx={{ fontSize: 18 }} />
          </IconButton>
          {lightbox && (lightbox.video
            ? <Box component="video" src={lightbox.url} controls autoPlay loop sx={{ display: 'block', maxWidth: '90vw', maxHeight: '85vh', borderRadius: 2 }} />
            : <Box component="img" src={lightbox.url} alt={lightbox.nome || ''} sx={{ display: 'block', maxWidth: '90vw', maxHeight: '85vh', borderRadius: 2 }} />)}
          {lightbox && (
            <Button startIcon={<DownloadOutlinedIcon />} onClick={() => baixar({ full: lightbox.url, nome: lightbox.nome })}
              sx={{ position: 'absolute', bottom: 12, right: 12, bgcolor: 'rgba(0,0,0,.6)', color: '#fff', fontWeight: 700, '&:hover': { bgcolor: 'rgba(0,0,0,.8)' } }}>
              Baixar
            </Button>
          )}
        </Box>
      </Dialog>

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

      {/* Certidão do asset — a trilha auditável da peça */}
      <Dialog open={!!cert} onClose={() => setCert(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontSize: 15, fontWeight: 900, display: 'flex', alignItems: 'center', gap: 1 }}>
          <VerifiedOutlinedIcon sx={{ fontSize: 20, color: TEAL }} /> Certidão do asset
        </DialogTitle>
        <DialogContent>
          {certLoading ? (
            <Stack alignItems="center" py={4}><CircularProgress size={20} sx={{ color: 'primary.main' }} /></Stack>
          ) : !certGen ? (
            <Typography variant="body2" color="text.secondary">Trilha de geração não encontrada para esta peça.</Typography>
          ) : (
            <Stack spacing={1.75} mt={0.5}>
              {/* DUAS AUDITORIAS, não auditoria e opinião. Uma responde a
                  jurídico/procurement (que dado saiu daqui, para qual fornecedor
                  de IA, quando); a outra responde a quem opera a marca (quem
                  julgou, o que decidiu). Públicos diferentes, perguntas
                  diferentes, e cada uma é o ruído da outra quando empilhadas. */}
              <Tabs value={certAba} onChange={(_, v) => setCertAba(v)} sx={{ minHeight: 36, mb: 0.5, borderBottom: 1, borderColor: 'divider' }}>
                <Tab value="procedencia" label="Auditoria de dados" sx={{ minHeight: 36, fontWeight: 800, fontSize: 12 }} />
                <Tab value="julgamento"  label={`Auditoria de marca${certSignals.length ? ` · ${certSignals.length}` : ''}`} sx={{ minHeight: 36, fontWeight: 800, fontSize: 12 }} />
              </Tabs>
              <Typography variant="caption" color="text.disabled">
                {certAba === 'procedencia'
                  ? 'Que dado saiu daqui, para qual fornecedor de IA e quando — compliance §4 (rastreabilidade) e §6 (LGPD).'
                  : 'Quem julgou esta peça e o que decidiu — parecer do juiz e voto humano.'}
              </Typography>

              {certAba === 'procedencia' && (<>
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
                      <Typography variant="caption" color="text.secondary" sx={{ width: 120, flexShrink: 0 }}>{k}</Typography>
                      <Typography variant="caption" sx={{ wordBreak: 'break-word' }}>{v}</Typography>
                    </Stack>
                  ))}
                </Box>
              </Stack>
              </>)}

              {certAba === 'julgamento' && (
              <Box>
                {certSignals.length === 0 ? (
                  <Typography variant="caption" color="text.secondary">Nenhum julgamento registrado para esta peça ainda.</Typography>
                ) : (
                  <Stack spacing={0.75}>
                    {certSignals.map((s, i) => {
                      const p = s.payload || {}
                      const humano = s.tipo === 'image_vote'
                      // Era `includes('aprov')` — e "aprovada_com_ressalvas"
                      // contém "aprov", então a certidão marcava como APROVADA
                      // uma peça que exigia olho humano. O de-para resolve os
                      // dois vocabulários e não confunde os dois estados.
                      const v = humano ? null : normalizarVeredito(p.veredito)
                      const aprovado = humano ? p.voto === 'like' || p.voto === 'up' : v === 'aprovado'
                      return (
                        <Paper key={i} variant="outlined" sx={{ p: 1.25, borderRadius: 1.5 }}>
                          <Stack direction="row" spacing={1} alignItems="center" mb={p.texto || p.resumo || p.ajustes?.length ? 0.5 : 0}>
                            <Chip size="small" label={humano ? (aprovado ? 'Aprovada pelo time' : 'Reprovada pelo time') : `Diretor de Arte · ${VEREDITO_ROTULO[v] || p.veredito || 'parecer'}${p.modo === 'fidelidade' ? ' · fidelidade' : ''}`}
                              sx={{ fontSize: 10.5, fontWeight: 800, bgcolor: aprovado ? PALETTE.neutral[0] : PALETTE.neutral[0], color: aprovado ? PALETTE.data.positivoDim : PALETTE.neutral[800] }} />
                            <Typography variant="caption" color="text.disabled">{new Date(s.created_at).toLocaleString('pt-BR')}</Typography>
                          </Stack>
                          {/* `texto` desde o E0b; `resumo` e `ajustes` seguem
                              exibidos porque a certidão é o acervo — sinal
                              gravado antes da troca não pode virar linha muda. */}
                          {(p.texto || p.resumo) && <Typography variant="caption" sx={{ lineHeight: 1.5 }}>{p.texto || p.resumo}</Typography>}
                          {Array.isArray(p.ajustes) && p.ajustes.length > 0 && (
                            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.25 }}>Ajustes: {p.ajustes.join(' · ')}</Typography>
                          )}
                        </Paper>
                      )
                    })}
                  </Stack>
                )}
              </Box>
              )}

              {certAba === 'procedencia' && (<>
              <Box>
                <Typography variant="overline" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.4, mb: 0.5 }}>
                  Prompt final enviado
                </Typography>
                <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mb: 0.5 }}>
                  O texto exato que saiu daqui para o fornecedor de IA.
                </Typography>
                <Paper variant="outlined" sx={{ p: 1.25, borderRadius: 1.5, maxHeight: 160, overflow: 'auto', bgcolor: 'background.default' }}>
                  <Typography component="pre" sx={{ fontSize: 10.5, fontFamily: 'ui-monospace, monospace', whiteSpace: 'pre-wrap', m: 0, lineHeight: 1.5 }}>
                    {certGen.prompt_final || '—'}
                  </Typography>
                </Paper>
              </Box>
              <Typography variant="caption" color="text.disabled" sx={{ fontFamily: 'ui-monospace, monospace' }}>
                geração {certGen.id}{certGen.provider_request_id ? ` · job ${certGen.provider_request_id}` : ''} — trilha auditável (compliance §4)
              </Typography>
              </>)}
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCert(null)} sx={{ fontWeight: 700 }}>Fechar</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Mover/Organizar: pasta (free-solo) + tags (só assets) */}
      <Dialog open={!!org} onClose={() => setOrg(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontSize: 15, fontWeight: 900 }}>
          {org?.kind === 'bulk' ? `Mover ${selCount} ${selCount > 1 ? 'itens' : 'item'}` : `Mover "${org?.item?.nome || org?.item?.titulo}"`}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={0.5}>
            <Autocomplete freeSolo options={subpastas} value={orgPasta}
              onInputChange={(_, v) => setOrgPasta(v)}
              renderInput={params => <TextField {...params} size="small" label="Pasta" placeholder="Escolha ou crie uma pasta…" />} />
            {org?.kind === 'asset' && (
              <Autocomplete freeSolo multiple options={[...new Set(assets.flatMap(a => a.tags || []))].sort()} value={orgTags}
                onChange={(_, v) => setOrgTags(v)}
                renderTags={(value, getTagProps) => value.map((option, index) => (
                  <Chip label={`#${option}`} size="small" {...getTagProps({ index })} key={option} />
                ))}
                renderInput={params => <TextField {...params} size="small" label="Tags" placeholder="Digite e Enter para adicionar…" />} />
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button size="small" onClick={() => setOrg(null)} sx={{ color: 'text.secondary', fontWeight: 700 }}>Cancelar</Button>
          <Button size="small" variant="contained" disabled={savingOrg} onClick={salvarOrg}
            sx={{ fontWeight: 800, bgcolor: 'primary.main', '&:hover': { bgcolor: 'primary.dark' } }}>
            {savingOrg ? 'Salvando…' : 'Salvar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
