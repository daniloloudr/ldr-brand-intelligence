// ════════════════════════════════════════════════════════════════════
// LOTE DE CATÁLOGO — o primeiro addon (§7.5, §13)
//
// Geração de imagem de catálogo em MASSA, e nada além disso.
//
// Duas decisões do Danilo (04/set) moldam esta tela:
//
//  1. "não é pro usuário escolher. NÓS definimos. Esse é um produto com base
//     num fluxo específico e só vai fazer isso." — não existe seletor, e a
//     tela NÃO NOMEIA fluxo nem receita: não são palavras de quem faz
//     catálogo. O amarrado vive em `addon_instalacao.workflow_id` (060),
//     definido por quem LIBERA — a policy de update da 059 é só de
//     platform_admin, então o cliente não tem como trocar.
//
//  2. "duas opções: subir cada item e peça por aqui, ou subir em massa" — duas
//     PORTAS, um portão só. O modo de uma peça monta a mesma linha que a
//     planilha montaria, e as duas caem no MESMO preflight. Validação
//     duplicada seria duas verdades sobre o que é uma linha válida.
// ════════════════════════════════════════════════════════════════════
import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Box, Paper, Stack, Typography, Button, Chip, CircularProgress, Alert,
  Table, TableHead, TableBody, TableRow, TableCell, TableContainer,
  Tabs, Tab, TextField, MenuItem, Dialog, IconButton, Tooltip,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import RefreshIcon from '@mui/icons-material/Refresh'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import FolderOpenOutlinedIcon from '@mui/icons-material/FolderOpenOutlined'
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined'
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined'
import { supabase } from '../../lib/supabase'
import { PageHeader } from '../../components/shell/PageHeader'
import { lerCSV, preflight, vistasDoFluxo, PAPEIS, COLUNAS_OBRIGATORIAS, NIVEIS, CONTEXTO_MIN } from '../../lib/loteCatalogo'
import { creditsForImage } from '../../lib/credits'
import { montarZip } from '../../lib/zip'
import { navigate } from '../../lib/helpers'
import { roteiroDaPeca, lerEstado, erroLegivel, creditosDoRoteiro } from '../../lib/loteExecucao'
import { montarContexto } from '../../lib/loteCatalogo'

const COLUNAS = ['sku', 'contexto', ...PAPEIS.map(p => p.col), 'saidas']

function csvModelo() {
  const exemplo = {
    sku: 'KH6V',
    contexto: 'Camiseta feminina de manga curta em RIBANA (poliamida + elastano): malha canelada fina, off-white. MODELAGEM — SLIM, RENTE AO CORPO: é o ponto que mais erra. No still a peça está DEITADA e a ribana relaxada parece larga. Ela NÃO é larga. COMPRIMENTO — 54,5 cm no P, barra na altura do osso do quadril. (…descreva também manga, textura, gola, barra, ombro — e o erro que o modelo costuma cometer.)',
    peca_frente: 'kh6v_frente.jpg', peca_costas: 'kh6v_costas.jpg',
    calca: 'jeans_azul.jpg', calcado: 'sapatilha_preta.jpg', bolsa: 'tote_preta.jpg',
    elenco: 'Marina', saidas: 'FRONTAL;TRÊS QUARTOS;COSTAS',
  }
  const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`
  return '﻿' + [COLUNAS.join(';'), COLUNAS.map(c => esc(exemplo[c])).join(';')].join('\n')
}

export function AddonCatalogo({ brandId }) {
  const [instalacao, setInstalacao] = useState(null)
  const [fluxo, setFluxo] = useState(null)
  const [elenco, setElenco] = useState([])
  const [acervo, setAcervo] = useState([])
  const [acervoBruto, setAcervoBruto] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [aba, setAba] = useState(0)                 // 0 = uma peça · 1 = em massa
  const [linhas, setLinhas] = useState(null)        // as linhas a conferir
  const [cabecalho, setCabecalho] = useState(COLUNAS)
  const [origem, setOrigem] = useState('')
  const [erro, setErro] = useState('')

  // ── uma peça ──
  const vazia = { sku: '', contexto: '', elenco: '', saidas: '' }
  const [extras, setExtras] = useState([])       // posições escritas na hora
  const [peca, setPeca] = useState(vazia)
  const [arquivos, setArquivos] = useState({})      // col → [{ nome, url }] · N vistas por papel
  const [subindo, setSubindo] = useState('')
  const [novas, setNovas] = useState([])       // castings subidos agora — ainda sem base conferida
  const [jobs, setJobs] = useState([])         // { vista, sku, genId, status, url, error }
  const [rodando, setRodando] = useState(false)
  const [progresso, setProgresso] = useState(null)   // { onda, ondas, sku }
  const [aberta, setAberta] = useState(null)         // índice da imagem no modal
  const [baixando, setBaixando] = useState(false)
  const [ultima, setUltima] = useState(null)   // { roteiro, saidas, auth } da rodada, p/ regerar
  const [regerando, setRegerando] = useState(null)
  const [lotes, setLotes] = useState([])          // histórico, do banco
  const [contextoAberto, setContextoAberto] = useState(true)
  const [detalheLote, setDetalheLote] = useState(false)

  // Declarada aqui, acima de todo efeito que a usa: um `const` referenciado
  // antes da linha em que é declarado estoura na montagem do componente
  // ("Cannot access before initialization") e a tela inteira cai.
  const prontasParaVer = jobs.filter(j => j.status === 'done' && j.url)

  const load = useCallback(async () => {
    if (!brandId) return
    setCarregando(true)
    const { data: b } = await supabase.from('brands').select('id, workspace_id').eq('id', brandId).single()
    if (!b) { setCarregando(false); return }

    const { data: inst } = await supabase.from('addon_instalacao')
      .select('id, estado, workflow_id')
      .eq('workspace_id', b.workspace_id).eq('addon', 'catalogo').eq('estado', 'ativo')
      .or(`brand_id.eq.${brandId},brand_id.is.null`).maybeSingle()
    setInstalacao(inst || null)

    const [{ data: wf }, { data: assets }] = await Promise.all([
      inst?.workflow_id
        ? supabase.from('studio_workflows').select('id, nome, nodes, edges').eq('id', inst.workflow_id).maybeSingle()
        : Promise.resolve({ data: null }),
      supabase.from('brand_assets').select('nome, pasta, valor').eq('brand_id', brandId),
    ])
    setFluxo(wf || null)
    setElenco((assets || []).filter(a => (a.pasta || '').toLowerCase() === 'elenco').map(a => a.nome))
    setAcervo((assets || []).map(a => a.nome))
    setAcervoBruto(assets || [])
    const { data: hist } = await supabase.from('lote_peca')
      .select('id, pasta, sku, linha, extras, created_at, workflow_id')
      .eq('brand_id', brandId).order('created_at', { ascending: false }).limit(60)
    setLotes(hist || [])
    setCarregando(false)
  }, [brandId])
  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (aberta === null) return
    const tecla = (e) => {
      if (e.key === 'Escape') setAberta(null)
      if (e.key === 'ArrowRight') setAberta(i => Math.min(prontasParaVer.length - 1, i + 1))
      if (e.key === 'ArrowLeft')  setAberta(i => Math.max(0, i - 1))
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [aberta, prontasParaVer.length])

  // O modelo vem do processo fixo do produto — nunca de um seletor na tela.
  const modelo = useMemo(() => {
    const nodes = Array.isArray(fluxo?.nodes) ? fluxo.nodes : []
    return nodes.map(n => n?.data?.model).find(Boolean) || null
  }, [fluxo])

  // As vistas são os nós de prompt do fluxo — "FRONTAL", "SENTADA",
  // "APROXIMADA". Nunca uma lista no código: pose nova no canvas tem que
  // aparecer aqui sozinha, senão a tela e o grafo divergem calados.
  // Só as vistas de CATÁLOGO viram chip. As da etapa 0 são os ângulos da base
  // da modelo (nano banana) — insumo, não entrega; oferecê-las cobraria do
  // cliente por imagem que não é peça.
  const vistas = useMemo(
    () => vistasDoFluxo(fluxo?.nodes, fluxo?.edges).filter(v => v.deCatalogo),
    [fluxo])

  const relatorio = useMemo(() => {
    if (!linhas?.length) return null
    return preflight({ linhas, cabecalho, elenco, acervo, modelo, vistas, extras,
                       creditoPorImagem: creditsForImage(modelo) })
  }, [linhas, cabecalho, elenco, acervo, modelo, vistas, extras])

  const escolhidas = String(peca.saidas || '').split(';').map(v => v.trim()).filter(Boolean)

  // Um roteiro por LINHA — é o que permite dizer, por SKU, quantas gerações
  // vão acontecer e quanto custa. Puro; não dispara nada.
  const roteiroDe = useCallback((l) => {
    if (!l || !fluxo || !vistas.length) return null
    const porNome = new Map(acervoBruto.map(a => [String(a.nome || '').toLowerCase(), a.valor]))
    const resolver = (v) => /^https?:\/\//i.test(v) ? v : (porNome.get(String(v).toLowerCase()) || v)
    return roteiroDaPeca({
      nodes: fluxo.nodes, edges: fluxo.edges, vistas,
      escolhidas: l.vistasPedidas || [], linha: l,
      brandId, workflowId: fluxo.id, resolver,
      contextoDaPeca: montarContexto({ aPeca: l.contexto }), extras,
    })
  }, [fluxo, vistas, acervoBruto, brandId, extras])

  // O roteiro da PRIMEIRA linha pronta, só para mostrar. Não dispara nada.
  const roteiroPrevia = useMemo(() => {
    const l = relatorio?.linhas?.find(x => !x.problemas.some(p => p.nivel === NIVEIS.GRAVE))
    if (!l || !fluxo || !vistas.length) return null
    const porNome = new Map(acervoBruto.map(a => [String(a.nome || '').toLowerCase(), a.valor]))
    const resolver = (v) => /^https?:\/\//i.test(v) ? v : (porNome.get(String(v).toLowerCase()) || v)
    return roteiroDaPeca({
      nodes: fluxo.nodes, edges: fluxo.edges, vistas,
      escolhidas: l.vistasPedidas || [],
      linha: l, brandId, workflowId: fluxo.id, resolver,
      contextoDaPeca: montarContexto({ aPeca: l.contexto }), extras,
    })
  }, [relatorio, fluxo, vistas, acervoBruto, brandId, extras])
  const alternarVista = (nome) => setPeca(p => {
    const atuais = String(p.saidas || '').split(';').map(v => v.trim()).filter(Boolean)
    const novas = atuais.includes(nome) ? atuais.filter(v => v !== nome) : [...atuais, nome]
    return { ...p, saidas: novas.join(';') }
  })

  // Casting NOVO: sobe, é salvo na pasta `elenco` e já fica escolhível. Ele
  // nasce com `base_conferida: false` — é isso que faz o portão da etapa 0
  // existir para ele e NÃO existir para quem já está na base (decisão de
  // 04/set: "se usar o novo processamos e salvamos; se escolher um, pulamos o
  // portão").
  //
  // Não emite `reference_upload`: aquele sinal é ensino curatorial de MARCA
  // ("isto É a marca"), e um casting é insumo de produção. Misturar os dois
  // ensinaria ao cérebro que a marca "gosta" desta modelo.
  async function subirCasting(file) {
    if (!file) return
    const nome = window.prompt('Nome desta modelo (é como ela vai aparecer na lista):',
      (file.name || '').replace(/\.[^.]+$/, ''))?.trim()
    if (!nome) return
    if (elenco.some(e => e.toLowerCase() === nome.toLowerCase())) {
      setErro(`Já existe uma modelo chamada "${nome}".`); return
    }
    setSubindo('elenco'); setErro('')
    const path = `${brandId}/elenco/${Date.now()}-${(file.name || 'casting').replace(/[^\w.\-]/g, '_')}`
    const { error } = await supabase.storage.from('brand-assets').upload(path, file, { upsert: true })
    if (error) { setErro(`falha ao subir a modelo: ${error.message}`); setSubindo(''); return }
    const url = supabase.storage.from('brand-assets').getPublicUrl(path).data.publicUrl
    const { error: e2 } = await supabase.from('brand_assets').insert({
      brand_id: brandId, tipo: 'foto', nome, valor: url,
      mime_type: file.type || null, pasta: 'elenco',
      metadata: { source: 'upload', reference: true, elenco: true, base_conferida: false },
    })
    if (e2) { setErro(`falha ao cadastrar a modelo: ${e2.message}`); setSubindo(''); return }
    setElenco(l => [...l, nome])
    setAcervo(l => [...l, nome])
    setAcervoBruto(l => [...l, { nome, valor: url, pasta: 'elenco' }])
    setPeca(p => ({ ...p, elenco: nome }))
    setNovas(n => [...n, nome])
    setSubindo('')
  }

  // Um papel aceita VÁRIAS VISTAS do mesmo item — bolsa de frente e de lado,
  // calçado de perfil e de cima. Elas viram uma célula com `;`, exatamente como
  // na planilha, para que os dois modos produzam a MESMA linha.
  async function subirArquivos(col, files) {
    const lista = Array.from(files || [])
    if (!lista.length) return
    setSubindo(col); setErro('')
    const novos = []
    for (const file of lista) {
      const path = `${brandId}/lote/${Date.now()}-${Math.random().toString(36).slice(2, 6)}-${(file.name || 'arq').replace(/[^\w.\-]/g, '_')}`
      const { error } = await supabase.storage.from('brand-assets').upload(path, file, { upsert: true })
      if (error) { setErro(`falha ao subir ${file.name}: ${error.message}`); continue }
      novos.push({ nome: file.name, url: supabase.storage.from('brand-assets').getPublicUrl(path).data.publicUrl })
    }
    setArquivos(a => ({ ...a, [col]: [...(a[col] || []), ...novos] }))
    setSubindo('')
  }

  const tirarVista = (col, i) =>
    setArquivos(a => ({ ...a, [col]: (a[col] || []).filter((_, j) => j !== i) }))

  // A peça vira UMA LINHA — igualzinha à que a planilha produziria.
  function conferirPeca() {
    const linha = { _linha: 2, ...peca }
    for (const p of PAPEIS) {
      const vistas = arquivos[p.col] || []
      if (vistas.length) linha[p.col] = vistas.map(v => v.url).join(';')
    }
    if (peca.elenco) linha.elenco = peca.elenco
    setCabecalho(COLUNAS); setLinhas([linha]); setOrigem(peca.sku || 'a peça')
  }

  // A pasta é por SKU e por dia: dois lotes do mesmo produto em dias
  // diferentes não se misturam, e o nome é legível na Biblioteca.
  // Nome legível de uma referência: o arquivo, sem o caminho e sem o carimbo de
  // tempo que o upload prefixa.
  const nomeCurto = (u) => {
    const t = String(u || '')
    if (t.startsWith('‹')) return t          // "‹saída de FRONTAL›" não é caminho
    return t.split('?')[0].split('/').pop()
      .replace(/^\d{10,}-/, '').replace(/^[a-z0-9]{4}-/i, '') || t
  }

  const pastaDoLote = (sku) => `Lote ${sku} · ${new Date().toLocaleDateString('pt-BR')}`

  async function baixarTudo() {
    if (!prontasParaVer.length || baixando) return
    setBaixando(true); setErro('')
    try {
      // Passa pelo proxy: o R2 não devolve CORS, então `fetch` direto na URL
      // pública é bloqueado pelo navegador — a `<img>` funciona, o `fetch` não.
      const { data: { session } } = await supabase.auth.getSession()
      const auth = { Authorization: `Bearer ${session?.access_token}` }
      const arquivos = []
      for (const j of prontasParaVer) {
        const r = await fetch(`/.netlify/functions/studio-baixar?generation_id=${j.genId}`, { headers: auth })
        if (!r.ok) continue
        const buf = new Uint8Array(await r.arrayBuffer())
        const ext = (j.url.split('?')[0].match(/\.(jpe?g|png|webp)$/i) || [, 'jpg'])[1]
        arquivos.push({ nome: `${j.sku} - ${j.vista}.${ext}`, dados: buf })
      }
      if (!arquivos.length) { setErro('Nenhuma imagem pôde ser baixada.'); return }
      const url = URL.createObjectURL(new Blob([montarZip(arquivos)], { type: 'application/zip' }))
      const a = document.createElement('a')
      a.href = url; a.download = `${pastaDoLote(prontasParaVer[0].sku)}.zip`; a.click()
      URL.revokeObjectURL(url)
    } catch (e) { setErro(`falha ao montar o zip: ${e.message}`) }
    setBaixando(false)
  }

  /**
   * Regera UMA peça, reaproveitando o que já saiu.
   *
   * Não roda a cadeia inteira: as etapas anteriores já produziram, e as saídas
   * delas estão guardadas. Refazer tudo custaria crédito para reconstruir
   * exatamente o mesmo insumo — e ainda arriscaria uma base diferente, que é o
   * que a F0.4 chama de deriva de identidade.
   *
   * `regen: true` diz ao backend que isto é uma REGENERAÇÃO: ele emite o sinal
   * `image_regen`, que o cérebro lê como reprovação implícita da anterior.
   */
  async function regerar(job) {
    if (!ultima || regerando) return
    const passo = ultima.roteiro.passos.find(p => p.genId === job.__no)
    if (!passo) { setErro('não consigo regerar: o roteiro desta rodada se perdeu. Rode de novo.'); return }
    setRegerando(job.genId); setErro('')
    try {
      const pedido = { ...passo.montar(ultima.saidas), regen: true, regen_of: job.genId }
      const res = await fetch('/.netlify/functions/studio-generate',
        { method: 'POST', headers: ultima.auth, body: JSON.stringify(pedido) })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || `Erro ${res.status}`)
      setJobs(js => js.map(x => x.genId === job.genId
        ? { ...x, genId: j.generation_id, status: 'running', url: null, error: null } : x))
      // acompanha só esta
      const inicio = Date.now()
      while (Date.now() - inicio < 300_000) {
        await new Promise(r => setTimeout(r, 3000))
        const { data } = await supabase.from('studio_generations')
          .select('id, status, image_url, error').eq('id', j.generation_id).maybeSingle()
        const e = lerEstado(data)
        if (e.estado === 'em_voo') continue
        setJobs(js => js.map(x => x.genId === j.generation_id
          ? { ...x, status: e.estado === 'pronta' ? 'done' : 'error', url: e.url, error: e.erro } : x))
        if (e.estado === 'pronta') {
          ultima.saidas[job.__no] = e.url
          if (job.pasta) supabase.from('studio_generations').update({ pasta: job.pasta }).eq('id', j.generation_id).then(() => {})
        }
        break
      }
    } catch (e) { setErro(`falha ao regerar: ${e.message}`) }
    setRegerando(null)
  }

  // Reabre um lote gravado: repõe a linha e busca as imagens que ele produziu.
  async function abrirLote(lote) {
    setErro(''); setAba(0)
    setPeca({ sku: lote.sku, contexto: lote.linha?.contexto || '',
              elenco: lote.linha?.elenco || '', saidas: (lote.linha?.vistasPedidas || []).join(';') })
    setExtras(Array.isArray(lote.extras) ? lote.extras : [])
    setArquivos({}); setContextoAberto(false)
    setCabecalho(COLUNAS); setLinhas([{ ...lote.linha, _linha: 2 }]); setOrigem(lote.sku)

    const { data: gens } = await supabase.from('studio_generations')
      .select('id, status, image_url, node_id, error, created_at')
      .eq('brand_id', brandId).eq('pasta', lote.pasta).order('created_at')
    const vistaDoNo = (no) => vistas.find(v => v.generateNodeId === no)?.nome || no
    setJobs((gens || []).map(g => ({
      sku: lote.sku, vista: vistaDoNo(g.node_id), __no: g.node_id, pasta: lote.pasta,
      entrega: true, genId: g.id, url: g.image_url,
      status: g.status === 'done' ? 'done' : g.status === 'error' ? 'error' : 'running',
      error: g.error,
    })))
  }

  // ── A CORRIDA, EM ONDAS ─────────────────────────────────────────
  // O roteiro decide o que roda e em que ordem: escolher SENTADA arrasta a base
  // da modelo, a FRONTAL e a CAMINHANDO junto, porque a etapa 4 come a 2, que
  // come a 1, que come a base. Rodar só o alvo produziria uma peça SEM base — e
  // a falta não daria erro, só uma imagem plausível e infiel.
  async function rodar() {
    if (!relatorio?.podeRodar || rodando) return
    setRodando(true); setErro(''); setJobs([])

    const { data: { session } } = await supabase.auth.getSession()
    const auth = { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` }
    const porNome = new Map(acervoBruto.map(a => [String(a.nome || '').toLowerCase(), a.valor]))
    const resolver = (v) => /^https?:\/\//i.test(v) ? v : (porNome.get(String(v).toLowerCase()) || null)

    const prontas = relatorio.linhas.filter(l => !l.problemas.some(p => p.nivel === NIVEIS.GRAVE))
    const todos = []

    for (const l of prontas) {
      const escolhidasDaLinha = l.vistasPedidas || []
      const roteiro = roteiroDaPeca({
        nodes: fluxo.nodes, edges: fluxo.edges, vistas, escolhidas: escolhidasDaLinha, linha: l,
        brandId, workflowId: fluxo.id, resolver,
        contextoDaPeca: montarContexto({ aPeca: l.contexto }), extras,
      })
      const saidas = {}
      setUltima({ roteiro, saidas, auth })

      // ⭐ O pedido é gravado ANTES de gerar. Se a página cair, o navegador
      // fechar ou a rodada falhar no meio, ele continua lá — e é dele que sai o
      // "regerar esta peça" dias depois, quando o time do cliente reprovar uma.
      const { data: b2 } = await supabase.from('brands').select('workspace_id').eq('id', brandId).single()
      if (b2) {
        supabase.from('lote_peca').upsert({
          workspace_id: b2.workspace_id, brand_id: brandId, workflow_id: fluxo.id,
          pasta: pastaDoLote(l.sku), sku: l.sku,
          linha: { ...l, problemas: undefined }, extras,
        }, { onConflict: 'brand_id,pasta,sku' }).then(({ error }) => {
          if (error) console.warn('[lote] não gravou o pedido:', error.message)
        })
      }

      for (const [iOnda, onda] of roteiro.ondas.entries()) {
        setProgresso({ onda: iOnda + 1, ondas: roteiro.ondas.length, sku: l.sku })
        const daOnda = []
        for (const genId of onda) {
          const passo = roteiro.passos.find(p => p.genId === genId)
          const pedido = passo.montar(saidas)
          try {
            const res = await fetch('/.netlify/functions/studio-generate',
              { method: 'POST', headers: auth, body: JSON.stringify(pedido) })
            const j = await res.json()
            if (!res.ok) throw new Error(j.error || `Erro ${res.status}`)
            const job = { sku: l.sku, vista: passo.nome, etapa: passo.etapa, __no: genId,
                          pasta: pastaDoLote(l.sku),
                          entrega: passo.entrega, genId: j.generation_id, status: 'running' }
            todos.push(job); daOnda.push(job)
          } catch (e) {
            todos.push({ sku: l.sku, vista: passo.nome, etapa: passo.etapa,
                         entrega: passo.entrega, genId: null, status: 'error', error: e.message })
          }
          setJobs([...todos])
        }
        // Espera a onda inteira: a próxima depende do que esta produziu.
        const ids = daOnda.map(j => j.genId).filter(Boolean)
        if (!ids.length) break
        const ok = await esperarOnda(ids, saidas, todos, setJobs)
        if (!ok) { setErro('Uma etapa falhou — as seguintes dependiam dela e não foram disparadas.'); break }
      }

      // ⚠️ As posições extras NÃO estão nas ondas: ondas vêm do grafo, e uma
      // pose escrita na hora não existe nele. Rodam depois de a cadeia inteira
      // terminar, porque é da saída dela que elas partem.
      const extrasDoRoteiro = roteiro.passos.filter(p => p.extra)
      if (extrasDoRoteiro.length) {
        setProgresso({ onda: roteiro.ondas.length + 1, ondas: roteiro.ondas.length + 1, sku: l.sku })
        const daExtra = []
        for (const passo of extrasDoRoteiro) {
          const pedido = passo.montar(saidas)
          try {
            const res = await fetch('/.netlify/functions/studio-generate',
              { method: 'POST', headers: auth, body: JSON.stringify(pedido) })
            const j = await res.json()
            if (!res.ok) throw new Error(j.error || `Erro ${res.status}`)
            const job = { sku: l.sku, vista: passo.nome, etapa: passo.etapa, __no: passo.genId,
                          pasta: pastaDoLote(l.sku), entrega: true, extra: true,
                          genId: j.generation_id, status: 'running' }
            todos.push(job); daExtra.push(job)
          } catch (e) {
            todos.push({ sku: l.sku, vista: passo.nome, entrega: true, extra: true,
                         genId: null, status: 'error', error: e.message })
          }
          setJobs([...todos])
        }
        const ids = daExtra.map(j => j.genId).filter(Boolean)
        if (ids.length) await esperarOnda(ids, saidas, todos, setJobs)
      }
    }
    setProgresso(null)
    setRodando(false)
  }

  // Aguarda um conjunto de gerações e recolhe as URLs — é o `outputs` do canvas.
  async function esperarOnda(ids, saidas, todos, aplicar) {
    const inicio = Date.now()
    while (Date.now() - inicio < 600_000) {
      await new Promise(r => setTimeout(r, 3000))
      const { data } = await supabase.from('studio_generations')
        .select('id, status, image_url, error').in('id', ids)
      let vivos = 0
      for (const id of ids) {
        const job = todos.find(j => j.genId === id)
        const e = lerEstado((data || []).find(x => x.id === id))
        if (e.estado === 'em_voo') { vivos++; continue }
        if (e.estado === 'pronta') {
          job.status = 'done'; job.url = e.url; saidas[job.__no] = e.url
          // Carimba a pasta do lote: é o que faz a Biblioteca agrupar as peças
          // em vez de despejá-las soltas na raiz de Imagens.
          if (job.pasta) supabase.from('studio_generations').update({ pasta: job.pasta }).eq('id', id).then(() => {})
        }
        else { job.status = 'error'; job.error = e.erro }
      }
      aplicar([...todos])
      if (!vivos) return todos.filter(j => ids.includes(j.genId)).every(j => j.status === 'done')
    }
    return false
  }

  async function escolherPlanilha(file) {
    setErro('')
    if (!file) return
    if (!/\.csv$/i.test(file.name)) {
      setErro('Por enquanto só CSV. No Excel: Arquivo → Salvar como → CSV (separado por ponto e vírgula).')
      return
    }
    const lido = lerCSV(await file.text())
    if (!lido.linhas.length) { setErro('A planilha não tem nenhuma linha de dado.'); return }
    setCabecalho(lido.cabecalho); setLinhas(lido.linhas); setOrigem(file.name)
  }

  function baixarModelo() {
    const url = URL.createObjectURL(new Blob([csvModelo()], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url; a.download = 'lote-catalogo-modelo.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  if (carregando) return (
    <Box><PageHeader title="Lote de Catálogo" subtitle="Imagem de catálogo, em massa" />
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress size={28} /></Box></Box>
  )

  // Liberado sem processo definido: a tela recusa em vez de improvisar.
  const semProcesso = !instalacao?.workflow_id || !fluxo

  // ── A VISTA ─────────────────────────────────────────────────────
  //
  // Três passos com estado, não quatro caixas empilhadas. A ordem é a do
  // trabalho — descrever a peça, escolher o que gerar, conferir e rodar — e o
  // passo diz sozinho se está resolvido.
  //
  // Duas decisões que vêm do uso real de hoje:
  //  · o CONTEXTO recolhe depois de escrito. São ~4 KB; aberto, ele empurrava
  //    vistas e botões para baixo da dobra e obrigava a rolar em toda rodada.
  //  · o RODAR fica numa barra FIXA. É a única ação que gasta dinheiro, e era
  //    justamente a que sumia da vista.
  const passo1Ok = !!peca.sku.trim() && peca.contexto.trim().length >= CONTEXTO_MIN && !!peca.elenco
  const passo2Ok = !!arquivos.peca_principal?.length && (escolhidas.length > 0 || extras.some(t => t.trim()))
  const podeConferir = !semProcesso && !!peca.sku.trim() && (escolhidas.length > 0 || extras.some(t => t.trim()))
  // Soma TODAS as linhas prontas, e cada etapa com o custo do modelo DELA.
  const creditos = (relatorio?.linhas || [])
    .filter(l => !l.problemas.some(p => p.nivel === NIVEIS.GRAVE))
    .reduce((n, l) => n + creditosDoRoteiro(roteiroDe(l), creditsForImage), 0)

  const Passo = ({ n, titulo, ok, children, acao }) => (
    <Box component="section" sx={{ display: 'grid', gridTemplateColumns: { xs: '28px 1fr', sm: '34px 1fr' },
      gap: { xs: 1.5, sm: 2.5 }, mb: 4 }}>
      <Box sx={{ width: { xs: 28, sm: 34 }, height: { xs: 28, sm: 34 }, borderRadius: '50%',
        border: 1, borderColor: ok ? 'success.main' : 'divider', color: ok ? 'success.main' : 'text.disabled',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 800, fontSize: 13, flexShrink: 0 }}>
        {ok ? '✓' : n}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Stack direction="row" spacing={1.5} alignItems="baseline" sx={{ mb: 1.5 }} flexWrap="wrap" useFlexGap>
          <Typography variant="subtitle1" fontWeight={700}>{titulo}</Typography>
          <Box sx={{ flex: 1 }} />
          {acao}
        </Stack>
        {children}
      </Box>
    </Box>
  )

  // ── O RESUMO ────────────────────────────────────────────────────
  // Em massa, listar as referências etapa por etapa repete os mesmos nomes
  // dezenas de vezes: oito chips por etapa, cinco etapas, um SKU por linha.
  // Ninguém lê. O que se quer saber antes de gastar é: quantas peças, o que
  // entra em cada uma, quantas imagens saem e quanto custa.
  const Resumo = ({ detalhe, aoAlternar }) => {
    const linhas = relatorio.linhas.map(l => {
      const r = roteiroDe(l)
      const bloqueada = l.problemas.some(p => p.nivel === NIVEIS.GRAVE)
      return { l, bloqueada,
        entradas: l.refs, saidas: r?.entregas ?? l.nSaidas,
        geracoes: r?.total ?? l.nSaidas, creditos: creditosDoRoteiro(r, creditsForImage),
        ctx: String(l.contexto || '').length }
    })
    const soma = (f) => linhas.filter(x => !x.bloqueada).reduce((n, x) => n + f(x), 0)
    const prontas = linhas.filter(x => !x.bloqueada).length
    const geracoes = soma(x => x.geracoes)
    const entregas = soma(x => x.saidas)

    // ⚠️ As gerações são SEQUENCIAIS: cada etapa espera a anterior, e as peças
    // rodam uma após a outra. Num lote de 150 isso deixa de ser detalhe e vira
    // a informação principal — por isso o tempo aparece junto do custo.
    const minutos = Math.round(geracoes * 25 / 60)
    const tempo = minutos < 60 ? `${minutos} min`
      : `${Math.floor(minutos / 60)}h${String(minutos % 60).padStart(2, '0')}`

    const Numero = ({ valor, rotulo, cor }) => (
      <Box sx={{ minWidth: 92 }}>
        <Typography variant="h5" fontWeight={800} color={cor} sx={{ lineHeight: 1.1 }}>
          {typeof valor === 'number' ? valor.toLocaleString('pt-BR') : valor}
        </Typography>
        <Typography variant="caption" color="text.disabled">{rotulo}</Typography>
      </Box>
    )

    return (
    <Box>
      <Paper variant="outlined" sx={{ p: 2.5, mb: 2 }}>
        <Stack direction="row" spacing={4} flexWrap="wrap" useFlexGap>
          <Numero valor={prontas} rotulo={`peça${prontas !== 1 ? 's' : ''} pronta${prontas !== 1 ? 's' : ''}`} />
          <Numero valor={entregas} rotulo="imagens de entrega" />
          <Numero valor={geracoes} rotulo={`gerações no total${geracoes > entregas ? ` · ${geracoes - entregas} de insumo` : ''}`} />
          <Numero valor={soma(x => x.creditos)} rotulo="créditos" cor="primary.main" />
          <Numero valor={`~${tempo}`} rotulo="sequencial, uma etapa por vez" />
        </Stack>
        {linhas.some(x => x.bloqueada) && (
          <Typography variant="body2" color="error.main" sx={{ mt: 2 }}>
            <b>{linhas.filter(x => x.bloqueada).length} peça(s) bloqueada(s)</b> — não entram na conta acima.
          </Typography>
        )}
        <Button size="small" color="inherit" sx={{ mt: 1.5, ml: -1 }} onClick={aoAlternar}>
          {detalhe ? 'esconder o detalhe' : `ver as ${linhas.length} linhas`}
        </Button>
      </Paper>

      {detalhe && (
      <TableContainer sx={{ overflowX: 'auto', border: 1, borderColor: 'divider', borderRadius: 1 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Peça</TableCell>
              <TableCell align="right">Contexto</TableCell>
              <TableCell align="right">Entradas</TableCell>
              <TableCell align="right">Saídas</TableCell>
              <TableCell align="right">Gerações</TableCell>
              <TableCell align="right">Créditos</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {linhas.map(({ l, bloqueada, entradas, saidas, geracoes, creditos, ctx }) => (
              <TableRow key={l._linha} sx={bloqueada ? { opacity: .5 } : undefined}>
                <TableCell>
                  <Typography variant="body2" fontWeight={650}>{l.sku || `linha ${l._linha}`}</Typography>
                  {bloqueada && <Typography variant="caption" color="error.main">bloqueada</Typography>}
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" color={ctx < CONTEXTO_MIN ? 'warning.main' : 'text.primary'}>
                    {ctx.toLocaleString('pt-BR')} ch
                  </Typography>
                </TableCell>
                <TableCell align="right">{entradas}</TableCell>
                <TableCell align="right"><b>{bloqueada ? '—' : saidas}</b></TableCell>
                <TableCell align="right">
                  {bloqueada ? '—' : geracoes}
                  {!bloqueada && geracoes > saidas && (
                    <Typography component="span" variant="caption" color="text.disabled">
                      {' '}(+{geracoes - saidas} insumo)
                    </Typography>
                  )}
                </TableCell>
                <TableCell align="right">{bloqueada ? '—' : creditos}</TableCell>
              </TableRow>
            ))}
            <TableRow sx={{ '& td': { borderTop: 2, borderColor: 'divider', fontWeight: 700 } }}>
              <TableCell>{linhas.filter(x => !x.bloqueada).length} peça(s)</TableCell>
              <TableCell />
              <TableCell align="right">{soma(x => x.entradas)}</TableCell>
              <TableCell align="right">{soma(x => x.saidas)}</TableCell>
              <TableCell align="right">{soma(x => x.geracoes)}</TableCell>
              <TableCell align="right">{soma(x => x.creditos)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
      )}
    </Box>
    )
  }

  // A conferência: o que falta por linha, e o que cada etapa vai receber.
  // A prévia virou TABELA — antes era um <ol> de URLs truncadas por etapa, e
  // ninguém conseguia ler justamente o que existe para ser conferido.
  const Conferencia = () => (
    <Box>
      {relatorio.problemas.length > 0 && (
        <Alert severity="error" sx={{ mb: 2 }}>
          <b>Faltam colunas na planilha.</b>
          <Box component="ul" sx={{ m: '6px 0 0', pl: 2.5 }}>
            {relatorio.problemas.map((p, i) => <li key={i}>{p.texto}</li>)}
          </Box>
        </Alert>
      )}

      {relatorio.linhas.some(l => l.problemas.length > 0) && (
        <Box sx={{ mb: 3 }}>
          <Rotulo>O que precisa de você</Rotulo>
          <Stack spacing={.75}>
            {relatorio.linhas.flatMap(l => l.problemas.map((p, j) => (
              <Typography key={`${l._linha}-${j}`} variant="body2"
                color={p.nivel === NIVEIS.GRAVE ? 'error.main' : 'warning.main'}>
                {relatorio.linhas.length > 1 ? <b>{l.sku || `linha ${l._linha}`} · </b> : null}
                <b>{p.campo}</b> — {p.texto}
              </Typography>
            )))}
          </Stack>
        </Box>
      )}

      {relatorio.linhas.length > 1 && (
        <Box sx={{ mb: 3 }}>
          <Rotulo hint="o que vai acontecer quando você clicar em gerar">Resumo</Rotulo>
          <Resumo detalhe={detalheLote} aoAlternar={() => setDetalheLote(v => !v)} />
        </Box>
      )}

      {relatorio.linhas.length === 1 && roteiroPrevia?.passos?.length > 0 && (
        <Box>
          <Rotulo hint="na ordem em que o modelo vai receber">O que cada etapa recebe</Rotulo>
          <TableContainer sx={{ overflowX: 'auto', border: 1, borderColor: 'divider', borderRadius: 1 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: 190 }}>Etapa</TableCell>
                  <TableCell>Referências, em ordem</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {roteiroPrevia.passos.map((p, i) => {
                  const ped = p.montar(Object.fromEntries(
                    roteiroPrevia.passos.slice(0, i).map(x => [x.genId, `‹saída de ${x.nome}›`])))
                  const refs = ped?.references || []
                  return (
                    <TableRow key={`${p.genId}-${i}`}>
                      <TableCell sx={{ verticalAlign: 'top' }}>
                        <Typography variant="body2" fontWeight={650} noWrap>{p.nome}</Typography>
                        <Typography variant="caption" color="text.disabled">
                          {p.entrega ? 'entrega' : 'insumo'}{ped?.model ? ` · ${ped.model.split('/').pop()}` : ''}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {refs.length
                          ? <Stack direction="row" spacing={.5} flexWrap="wrap" useFlexGap>
                              {refs.map((r, j) => (
                                <Chip key={j} size="small" variant="outlined" label={`${j + 1}. ${nomeCurto(r)}`}
                                  title={String(r)} sx={{ maxWidth: 230 }} />
                              ))}
                            </Stack>
                          : <Typography variant="caption" color="error.main">
                              nenhuma referência — a peça sairia sem base
                            </Typography>}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}
    </Box>
  )

  const Rotulo = ({ children, hint }) => (
    <Stack direction="row" spacing={1} alignItems="baseline" sx={{ mb: .75 }} flexWrap="wrap" useFlexGap>
      <Typography variant="overline" color="text.secondary" sx={{ lineHeight: 1.4 }}>{children}</Typography>
      {hint && <Typography variant="caption" color="text.disabled">{hint}</Typography>}
    </Stack>
  )

  return (
    <Box sx={{ pb: relatorio ? 11 : 0 }}>
      <PageHeader title="Lote de Catálogo"
        subtitle="Imagem de catálogo em massa, no processo aprovado desta marca." />

      {erro && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErro('')}>{erro}</Alert>}
      {semProcesso && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <b>Este lote ainda não está configurado para esta marca.</b> Fale com a gente antes de subir as peças.
        </Alert>
      )}

      <Tabs value={aba} onChange={(_, v) => setAba(v)} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
        <Tab label="Uma peça" />
        <Tab label="Em massa" />
        <Tab label={`Lotes${lotes.length ? ` · ${lotes.length}` : ''}`} />
      </Tabs>

      {/* ═══ UMA PEÇA ═══ */}
      {aba === 0 && (
        <Box sx={{ maxWidth: 880 }}>

          <Passo n="1" titulo="A peça" ok={passo1Ok}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2.5 }}>
              <TextField label="SKU" size="small" sx={{ maxWidth: { sm: 200 } }}
                value={peca.sku} onChange={e => setPeca(p => ({ ...p, sku: e.target.value }))} />
              <TextField label="Modelo" size="small" select sx={{ minWidth: 200, flex: 1 }}
                value={peca.elenco} onChange={e => setPeca(p => ({ ...p, elenco: e.target.value }))}
                disabled={!elenco.length}
                helperText={elenco.length ? ' ' : 'nenhuma cadastrada — suba ao lado'}>
                {elenco.map(n => <MenuItem key={n} value={n}>{n}{novas.includes(n) ? ' · nova' : ''}</MenuItem>)}
              </TextField>
              <Button component="label" size="small" color="inherit" sx={{ alignSelf: 'flex-start', mt: .5 }}
                disabled={subindo === 'elenco'}
                startIcon={subindo === 'elenco' ? <CircularProgress size={14} /> : <UploadFileOutlinedIcon />}>
                Subir modelo
                <input hidden type="file" accept="image/*"
                  onChange={e => { subirCasting(e.target.files?.[0]); e.target.value = '' }} />
              </Button>
            </Stack>

            {novas.includes(peca.elenco) && (
              <Alert severity="info" sx={{ mb: 2, py: .25 }}>
                <b>{peca.elenco}</b> é nova: a base limpa dela é gerada e conferida uma vez.
                Nas próximas peças com essa modelo, a etapa é pulada.
              </Alert>
            )}

            <Rotulo hint={`${peca.contexto.length} caracteres · o gabarito em uso tem ~4000`}>
              Descrição da peça
            </Rotulo>
            {contextoAberto || peca.contexto.length < CONTEXTO_MIN ? (
              <TextField fullWidth multiline minRows={8} maxRows={20} value={peca.contexto}
                onChange={e => setPeca(p => ({ ...p, contexto: e.target.value }))}
                placeholder="Modelagem, comprimento, manga, textura, gola, barra — e o erro que o modelo costuma cometer."
                InputProps={{ sx: { fontSize: 13.5, lineHeight: 1.5 } }} />
            ) : (
              <Paper variant="outlined" sx={{ p: 1.5, cursor: 'pointer', bgcolor: 'action.hover' }}
                onClick={() => setContextoAberto(true)}>
                <Typography variant="body2" color="text.secondary"
                  sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {peca.contexto}
                </Typography>
                <Typography variant="caption" color="primary" sx={{ mt: .5, display: 'block' }}>editar</Typography>
              </Paper>
            )}
            {contextoAberto && peca.contexto.length >= CONTEXTO_MIN && (
              <Button size="small" color="inherit" sx={{ mt: 1 }} onClick={() => setContextoAberto(false)}>
                recolher
              </Button>
            )}
          </Passo>

          <Passo n="2" titulo="O que gerar" ok={passo2Ok}>
            <Rotulo hint="a vista 1 é a âncora; cada item aceita mais de uma vista">Referências</Rotulo>
            <Stack spacing={1} sx={{ mb: 3 }}>
              {PAPEIS.filter(p => !p.doElenco).map(p => {
                const vs = arquivos[p.col] || []
                return (
                  <Stack key={p.col} direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                    <Button component="label" size="small" color="inherit"
                      variant={vs.length ? 'outlined' : 'text'} disabled={subindo === p.col}
                      sx={{ minWidth: 210, justifyContent: 'flex-start', fontWeight: p.principal ? 700 : 400 }}
                      startIcon={subindo === p.col ? <CircularProgress size={13} /> : <UploadFileOutlinedIcon />}>
                      {p.papel}{vs.length ? ` · ${vs.length}` : ''}
                      <input hidden type="file" accept="image/*" multiple
                        onChange={e => { subirArquivos(p.col, e.target.files); e.target.value = '' }} />
                    </Button>
                    {vs.map((v, i) => (
                      <Chip key={i} size="small" variant="outlined" label={v.nome}
                        onDelete={() => tirarVista(p.col, i)} />
                    ))}
                  </Stack>
                )
              })}
            </Stack>

            <Rotulo hint={vistas.length ? `${escolhidas.length} de ${vistas.length}` : 'este lote não declara vistas'}>
              Vistas
            </Rotulo>
            <Stack direction="row" spacing={.75} flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
              {vistas.map(v => (
                <Chip key={v.id} label={v.nome} size="small" title={v.instrucao}
                  variant={escolhidas.includes(v.nome) ? 'filled' : 'outlined'}
                  color={escolhidas.includes(v.nome) ? 'primary' : 'default'}
                  onClick={() => alternarVista(v.nome)} />
              ))}
            </Stack>
            {vistas.length > 0 && (
              <Button size="small" color="inherit" sx={{ mb: 3, ml: -1 }}
                onClick={() => setPeca(p => ({ ...p,
                  saidas: escolhidas.length === vistas.length ? '' : vistas.map(v => v.nome).join(';') }))}>
                {escolhidas.length === vistas.length ? 'limpar seleção' : 'selecionar todas'}
              </Button>
            )}

            <Rotulo hint="herda a câmera e o modelo da primeira vista escolhida">Posições extras</Rotulo>
            <Stack spacing={1}>
              {extras.map((t, i) => (
                <Stack key={i} direction="row" spacing={1} alignItems="flex-start">
                  <TextField size="small" fullWidth multiline maxRows={3} value={t}
                    placeholder="ex.: closeup da manga direita, meio corpo"
                    onChange={e => setExtras(l => l.map((x, j) => j === i ? e.target.value : x))} />
                  <IconButton size="small" onClick={() => setExtras(l => l.filter((_, j) => j !== i))}>
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Stack>
              ))}
              <Box><Button size="small" color="inherit" sx={{ ml: -1 }}
                onClick={() => setExtras(l => [...l, ''])}>+ posição</Button></Box>
            </Stack>
          </Passo>

          <Passo n="3" titulo="Conferir e gerar" ok={!!relatorio?.podeRodar}
            acao={
              <Stack direction="row" spacing={1} alignItems="center">
                {!podeConferir && (
                  <Typography variant="caption" color="text.disabled">
                    {semProcesso ? 'lote não configurado'
                      : !peca.sku.trim() ? 'falta o SKU' : 'escolha ao menos uma vista'}
                  </Typography>
                )}
                <Button variant="outlined" color="inherit" size="small"
                  onClick={conferirPeca} disabled={!podeConferir}>Conferir</Button>
                <Button size="small" color="inherit" onClick={() => {
                  setPeca(vazia); setArquivos({}); setLinhas(null); setOrigem(''); setExtras([])
                }}>Limpar</Button>
              </Stack>
            }>
            {!relatorio
              ? <Typography variant="body2" color="text.disabled">
                  Confira antes de gerar: o que está faltando, o que cada etapa vai receber, e quanto custa.
                </Typography>
              : <Conferencia />}
          </Passo>
        </Box>
      )}

      {/* ═══ EM MASSA ═══ */}
      {aba === 1 && (
        <Box sx={{ maxWidth: 880 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }} sx={{ mb: 2 }}>
            <Button component="label" variant="contained" disableElevation
              disabled={semProcesso} startIcon={<UploadFileOutlinedIcon />}>
              Escolher planilha
              <input hidden type="file" accept=".csv,text/csv"
                onChange={e => { escolherPlanilha(e.target.files?.[0]); e.target.value = '' }} />
            </Button>
            <Button color="inherit" startIcon={<DownloadOutlinedIcon />} onClick={baixarModelo}>
              Baixar o modelo
            </Button>
          </Stack>
          <Typography variant="caption" color="text.disabled" display="block" sx={{ mb: 3 }}>
            Obrigatórias: <b>{COLUNAS_OBRIGATORIAS.join(' · ')}</b>. Opcionais:{' '}
            {COLUNAS.filter(c => !COLUNAS_OBRIGATORIAS.includes(c)).join(' · ')}.
            Cada arquivo pode ser um nome já na Biblioteca ou uma URL.
          </Typography>
          {relatorio && <Conferencia />}
        </Box>
      )}

      {/* ═══ LOTES ═══ */}
      {aba === 2 && (
        <Box sx={{ maxWidth: 880 }}>
          {!lotes.length
            ? <Typography variant="body2" color="text.disabled">Nenhum lote rodado ainda nesta marca.</Typography>
            : (
              <Stack spacing={1}>
                {lotes.map(l => (
                  <Paper key={l.id} variant="outlined"
                    sx={{ p: 1.75, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                    <Box sx={{ flex: 1, minWidth: 200 }}>
                      <Typography variant="body2" fontWeight={650}>{l.sku}</Typography>
                      <Typography variant="caption" color="text.disabled">
                        {l.pasta} · {(l.linha?.vistasPedidas || []).length} vista(s)
                        {Array.isArray(l.extras) && l.extras.filter(Boolean).length
                          ? ` · ${l.extras.filter(Boolean).length} extra(s)` : ''}
                      </Typography>
                    </Box>
                    <Button size="small" variant="outlined" color="inherit"
                      onClick={() => abrirLote(l)}>Abrir</Button>
                  </Paper>
                ))}
              </Stack>
            )}
        </Box>
      )}

      {/* ═══ O QUE SAIU ═══ */}
      {jobs.length > 0 && (
        <Box sx={{ mt: 5, maxWidth: 1100 }}>
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
            <Typography variant="subtitle1" fontWeight={700}>O que saiu</Typography>
            <Typography variant="caption" color="text.disabled">
              {jobs.filter(j => j.status === 'done').length} de {jobs.length}
              {rodando && progresso ? ` · etapa ${progresso.onda} de ${progresso.ondas}` : ''}
              {jobs.some(j => j.status === 'error')
                ? ` · ${jobs.filter(j => j.status === 'error').length} com erro` : ''}
            </Typography>
            {rodando && <CircularProgress size={15} />}
            <Box sx={{ flex: 1 }} />
            {prontasParaVer.length > 0 && (
              <Button size="small" variant="outlined" color="inherit"
                onClick={baixarTudo} disabled={baixando}
                startIcon={baixando ? <CircularProgress size={14} /> : <DownloadOutlinedIcon />}>
                {baixando ? 'Montando o zip…' : `Baixar tudo (${prontasParaVer.length})`}
              </Button>
            )}
          </Stack>

          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
            {jobs.map((j, i) => (
              <Box key={i}>
                <Box onClick={() => { if (j.status === 'done' && j.url) setAberta(prontasParaVer.findIndex(x => x.genId === j.genId)) }}
                  sx={{ aspectRatio: '1720/2432', bgcolor: 'action.hover', borderRadius: 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                    cursor: j.status === 'done' && j.url ? 'zoom-in' : 'default',
                    transition: 'opacity .15s', '&:hover': { opacity: j.url ? .88 : 1 } }}>
                  {j.status === 'done' && j.url
                    ? <Box component="img" src={j.url} alt={`${j.sku} · ${j.vista}`}
                        sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : j.status === 'error'
                      ? <Stack spacing={1} alignItems="center" sx={{ p: 1.5 }} title={j.error || ''}>
                          <Typography variant="caption" color="error.main" sx={{ textAlign: 'center' }}>
                            {erroLegivel(j.error).texto}
                          </Typography>
                          {ultima && (
                            <Button size="small" variant="outlined" color="inherit" disabled={!!regerando}
                              onClick={() => regerar(j)}
                              startIcon={regerando === j.genId ? <CircularProgress size={13} /> : <RefreshIcon sx={{ fontSize: 15 }} />}>
                              Gerar de novo
                            </Button>
                          )}
                        </Stack>
                      : <Stack alignItems="center" spacing={1}>
                          <CircularProgress size={20} />
                          <Typography variant="caption" color="text.disabled">gerando</Typography>
                        </Stack>}
                </Box>
                <Stack direction="row" spacing={.5} alignItems="center" sx={{ mt: .75 }}>
                  <Typography variant="caption" fontWeight={700} noWrap sx={{ flex: 1 }} title={j.vista}>
                    {j.vista}
                  </Typography>
                  {(j.status === 'done' || j.status === 'error') && ultima && (
                    <Tooltip title={`gerar de novo a ${j.vista}`}>
                      <span>
                        <IconButton size="small" disabled={!!regerando} onClick={() => regerar(j)}>
                          {regerando === j.genId
                            ? <CircularProgress size={13} />
                            : <RefreshIcon sx={{ fontSize: 15 }} />}
                        </IconButton>
                      </span>
                    </Tooltip>
                  )}
                </Stack>
                <Tooltip title="abrir a pasta deste lote na Biblioteca">
                  <Typography variant="caption" color="text.disabled" noWrap
                    onClick={() => navigate(`#/app/brands/${brandId}/studio/biblioteca?pasta=${encodeURIComponent(pastaDoLote(j.sku))}`)}
                    sx={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: .4,
                      '&:hover': { color: 'text.primary', textDecoration: 'underline' } }}>
                    <FolderOpenOutlinedIcon sx={{ fontSize: 13 }} />
                    {j.sku}{j.entrega ? '' : ' · insumo'}
                  </Typography>
                </Tooltip>
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {/* ═══ A BARRA FIXA — é a única ação que gasta dinheiro ═══ */}
      {relatorio && (
        <Paper elevation={8} sx={{ position: 'sticky', bottom: 0, mt: 4, p: 1.75,
          display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap',
          borderTop: 2, borderColor: relatorio.podeRodar ? 'success.main' : 'error.main' }}>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ flex: 1 }}>
            <Chip size="small" variant="outlined" color={relatorio.prontas ? 'success' : 'default'}
              label={`${relatorio.prontas} pronta${relatorio.prontas !== 1 ? 's' : ''}`} />
            {relatorio.bloqueadas > 0 &&
              <Chip size="small" variant="outlined" color="error" label={`${relatorio.bloqueadas} bloqueada(s)`} />}
            {relatorio.avisos > 0 &&
              <Chip size="small" variant="outlined" color="warning" label={`${relatorio.avisos} aviso(s)`} />}
            <Chip size="small" variant="outlined" label={`${relatorio.imagens} entregas`} />
            {roteiroPrevia && roteiroPrevia.total > relatorio.imagens &&
              <Chip size="small" variant="outlined" label={`+${roteiroPrevia.total - relatorio.imagens} insumo(s)`} />}
          </Stack>
          <Typography variant="body2" fontWeight={700}>≈ {creditos} créditos</Typography>
          <Button variant="contained" disableElevation size="large"
            disabled={!relatorio.podeRodar || rodando} onClick={rodar}
            startIcon={rodando ? <CircularProgress size={16} color="inherit" /> : null}>
            {rodando ? 'Gerando…' : 'Gerar imagens de catálogo'}
          </Button>
        </Paper>
      )}

      {/* ═══ A IMAGEM GRANDE ═══ */}
      <Dialog open={aberta !== null} onClose={() => setAberta(null)} maxWidth="lg"
        slotProps={{ paper: { sx: { bgcolor: 'transparent', boxShadow: 'none', overflow: 'visible' } } }}>
        {aberta !== null && prontasParaVer[aberta] && (
          <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton onClick={() => setAberta(i => Math.max(0, i - 1))} disabled={aberta === 0}
              sx={{ bgcolor: 'background.paper', '&:hover': { bgcolor: 'background.paper' } }}>
              <ChevronLeftIcon />
            </IconButton>
            <Box sx={{ position: 'relative' }}>
              <Box component="img" src={prontasParaVer[aberta].url}
                alt={`${prontasParaVer[aberta].sku} · ${prontasParaVer[aberta].vista}`}
                sx={{ display: 'block', maxWidth: '78vw', maxHeight: '82vh', borderRadius: 1 }} />
              <Stack direction="row" spacing={1} alignItems="center"
                sx={{ position: 'absolute', left: 0, right: 0, bottom: 0, p: 1.5,
                  background: 'linear-gradient(transparent, rgba(0,0,0,.66))', borderRadius: '0 0 4px 4px' }}>
                <Typography variant="body2" sx={{ color: '#fff', fontWeight: 650 }}>
                  {prontasParaVer[aberta].vista}
                </Typography>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,.7)' }}>
                  {prontasParaVer[aberta].sku} · {aberta + 1} de {prontasParaVer.length}
                </Typography>
                <Box sx={{ flex: 1 }} />
                <Button size="small" variant="contained" disableElevation
                  href={prontasParaVer[aberta].url} download
                  startIcon={<DownloadOutlinedIcon />}>Baixar</Button>
              </Stack>
              <IconButton onClick={() => setAberta(null)} size="small"
                sx={{ position: 'absolute', top: 8, right: 8, bgcolor: 'rgba(0,0,0,.45)', color: '#fff',
                  '&:hover': { bgcolor: 'rgba(0,0,0,.66)' } }}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
            <IconButton onClick={() => setAberta(i => Math.min(prontasParaVer.length - 1, i + 1))}
              disabled={aberta === prontasParaVer.length - 1}
              sx={{ bgcolor: 'background.paper', '&:hover': { bgcolor: 'background.paper' } }}>
              <ChevronRightIcon />
            </IconButton>
          </Box>
        )}
      </Dialog>
    </Box>
  )
}
