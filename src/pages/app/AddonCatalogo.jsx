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
  Tabs, Tab, TextField, MenuItem,
} from '@mui/material'
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined'
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined'
import { supabase } from '../../lib/supabase'
import { PageHeader } from '../../components/shell/PageHeader'
import { lerCSV, preflight, vistasDoFluxo, PAPEIS, COLUNAS_OBRIGATORIAS, NIVEIS, CONTEXTO_MIN } from '../../lib/loteCatalogo'
import { creditsForImage } from '../../lib/credits'
import { pedidosDaPeca } from '../../lib/loteExecucao'
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
  const [peca, setPeca] = useState(vazia)
  const [arquivos, setArquivos] = useState({})      // col → [{ nome, url }] · N vistas por papel
  const [subindo, setSubindo] = useState('')
  const [novas, setNovas] = useState([])       // castings subidos agora — ainda sem base conferida
  const [jobs, setJobs] = useState([])         // { vista, sku, genId, status, url, error }
  const [rodando, setRodando] = useState(false)

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
    setCarregando(false)
  }, [brandId])
  useEffect(() => { load() }, [load])

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
    return preflight({ linhas, cabecalho, elenco, acervo, modelo, vistas, creditoPorImagem: creditsForImage(modelo) })
  }, [linhas, cabecalho, elenco, acervo, modelo, vistas])

  const escolhidas = String(peca.saidas || '').split(';').map(v => v.trim()).filter(Boolean)
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

  // ── A CORRIDA ───────────────────────────────────────────────────
  // Não monta pedido: pede ao `loteExecucao` — que injeta as URLs no GRAFO e
  // deixa o grafo decidir ordem, formato e prompt. O teste de fidelidade prova
  // que o pedido daqui é idêntico ao que o canvas faria.
  async function rodar() {
    if (!relatorio?.podeRodar || rodando) return
    setRodando(true); setErro(''); setJobs([])

    const { data: { session } } = await supabase.auth.getSession()
    const auth = { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` }

    // Nome na Biblioteca → URL. URL passa direto.
    const porNome = new Map(acervoBruto.map(a => [String(a.nome || '').toLowerCase(), a.valor]))
    const resolver = (v) => /^https?:\/\//i.test(v) ? v : (porNome.get(String(v).toLowerCase()) || null)

    const prontas = relatorio.linhas.filter(l => !l.problemas.some(p => p.nivel === NIVEIS.GRAVE))
    const novosJobs = []
    for (const l of prontas) {
      const escolhidasDaLinha = String(l.saidas_lista || l.saidas || '').length
        ? String(l.saidas || '').split(';').map(v => v.trim()).filter(Boolean)
        : vistas.map(v => v.nome)
      const pedidos = pedidosDaPeca({
        nodes: fluxo.nodes, edges: fluxo.edges, vistas,
        escolhidas: escolhidasDaLinha, linha: l,
        brandId, workflowId: fluxo.id, resolver,
        contextoDaPeca: montarContexto({ etapa: '', aPeca: l.contexto, linha: l }),
      })
      for (const { vista, pedido } of pedidos) {
        try {
          const res = await fetch('/.netlify/functions/studio-generate',
            { method: 'POST', headers: auth, body: JSON.stringify(pedido) })
          const j = await res.json()
          if (!res.ok) throw new Error(j.error || `Erro ${res.status}`)
          novosJobs.push({ sku: l.sku, vista, genId: j.generation_id, status: 'running' })
        } catch (e) {
          novosJobs.push({ sku: l.sku, vista, genId: null, status: 'error', error: e.message })
        }
        setJobs([...novosJobs])
      }
    }
    if (!novosJobs.some(j => j.genId)) setRodando(false)
  }

  // Acompanha exatamente como o canvas: lendo `studio_generations` por id.
  useEffect(() => {
    const vivos = jobs.filter(j => j.genId && j.status === 'running').map(j => j.genId)
    if (!vivos.length) { if (rodando && jobs.length) setRodando(false); return }
    const t = setInterval(async () => {
      const { data } = await supabase.from('studio_generations')
        .select('id, status, image_url, error').in('id', vivos)
      if (!data?.length) return
      setJobs(js => js.map(j => {
        const r = data.find(x => x.id === j.genId)
        if (!r || r.status === 'running' || r.status === 'queued') return j
        return { ...j, status: r.status === 'done' ? 'done' : 'error', url: r.image_url, error: r.error }
      }))
    }, 3000)
    return () => clearInterval(t)
  }, [jobs, rodando])

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

  return (
    <Box>
      <PageHeader title="Lote de Catálogo" subtitle="Imagem de catálogo em massa, no processo aprovado desta marca." />

      {erro && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErro('')}>{erro}</Alert>}

      <Stack spacing={2}>
        {/* O produto roda UM processo, fixo. Quando ele está configurado, a
            tela não fala disso — "fluxo" e "receita" não são palavras de quem
            está fazendo catálogo. Só aparece algo aqui quando falta algo. */}
        {semProcesso && (
          <Alert severity="warning">
            <b>Este lote ainda não está configurado para esta marca.</b> Fale com a gente antes de subir as peças.
          </Alert>
        )}

        <Paper variant="outlined">
          <Tabs value={aba} onChange={(_, v) => setAba(v)} sx={{ px: 2, borderBottom: 1, borderColor: 'divider' }}>
            <Tab label="Uma peça" />
            <Tab label="Em massa" />
          </Tabs>

          {/* ── uma peça ── */}
          {aba === 0 && (
            <Box sx={{ p: 2.5 }}>
              <Stack spacing={2}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <TextField label="SKU" size="small" sx={{ maxWidth: 220 }}
                    value={peca.sku} onChange={e => setPeca(p => ({ ...p, sku: e.target.value }))} />
                  <Stack direction="row" spacing={1} alignItems="flex-start">
                    <TextField label="Modelo" size="small" select sx={{ minWidth: 200 }}
                      value={peca.elenco} onChange={e => setPeca(p => ({ ...p, elenco: e.target.value }))}
                      disabled={!elenco.length}
                      helperText={elenco.length
                        ? 'modelos já aprovadas'
                        : 'nenhuma modelo cadastrada ainda — suba uma ao lado'}>
                      {elenco.map(n => (
                        <MenuItem key={n} value={n}>
                          {n}{novas.includes(n) ? ' · nova' : ''}
                        </MenuItem>
                      ))}
                    </TextField>
                    <Button component="label" size="small" color="inherit" sx={{ mt: .5 }}
                      disabled={subindo === 'elenco'}
                      startIcon={subindo === 'elenco' ? <CircularProgress size={14} /> : <UploadFileOutlinedIcon />}>
                      Subir modelo
                      <input hidden type="file" accept="image/*"
                        onChange={e => { subirCasting(e.target.files?.[0]); e.target.value = '' }} />
                    </Button>
                  </Stack>
                </Stack>

                <TextField label="A peça — descrição para fidelidade" multiline minRows={6}
                  value={peca.contexto} onChange={e => setPeca(p => ({ ...p, contexto: e.target.value }))}
                  helperText={`Modelagem, comprimento, manga, textura, gola, barra — e o erro que o modelo costuma cometer. ${peca.contexto.length}/${CONTEXTO_MIN} mínimo recomendado.`} />

                {novas.includes(peca.elenco) && (
                  <Alert severity="info" sx={{ py: .25 }}>
                    <b>{peca.elenco}</b> é nova: antes de entrar na produção, a gente gera a base
                    limpa dela e alguém confere contra a foto original. Isso acontece uma vez —
                    nas próximas peças com essa modelo, a etapa é pulada.
                  </Alert>
                )}

                <Box>
                  <Typography variant="overline" color="text.secondary">As referências</Typography>
                  <Typography variant="caption" color="text.disabled" display="block" sx={{ mb: 1 }}>
                    Cada item aceita mais de uma vista — frente, lado, de cima.
                  </Typography>
                  <Stack spacing={1}>
                    {PAPEIS.filter(p => !p.doElenco).map(p => {
                      const vistas = arquivos[p.col] || []
                      return (
                        <Stack key={p.col} direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                          <Button component="label" size="small"
                            variant={vistas.length ? 'outlined' : 'text'} color="inherit"
                            disabled={subindo === p.col} sx={{ minWidth: 190, justifyContent: 'flex-start' }}
                            startIcon={subindo === p.col ? <CircularProgress size={14} /> : <UploadFileOutlinedIcon />}>
                            {p.papel}{vistas.length ? ` · ${vistas.length}` : ''}
                            <input hidden type="file" accept="image/*" multiple
                              onChange={e => { subirArquivos(p.col, e.target.files); e.target.value = '' }} />
                          </Button>
                          {vistas.map((v, i) => (
                            <Chip key={i} size="small" variant="outlined" label={v.nome}
                              onDelete={() => tirarVista(p.col, i)} />
                          ))}
                        </Stack>
                      )
                    })}
                  </Stack>
                </Box>

                <Box>
                  <Stack direction="row" spacing={1} alignItems="baseline" flexWrap="wrap" useFlexGap>
                    <Typography variant="overline" color="text.secondary">As vistas</Typography>
                    <Typography variant="caption" color="text.disabled">
                      {vistas.length
                        ? `${escolhidas.length} de ${vistas.length} escolhidas`
                        : 'este lote não declara vistas'}
                    </Typography>
                    {vistas.length > 0 && (
                      <Button size="small" color="inherit"
                        onClick={() => setPeca(p => ({ ...p,
                          saidas: escolhidas.length === vistas.length ? '' : vistas.map(v => v.nome).join(';') }))}>
                        {escolhidas.length === vistas.length ? 'limpar' : 'todas'}
                      </Button>
                    )}
                  </Stack>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                    {vistas.map(v => (
                      <Chip key={v.id} label={v.nome} size="small" title={v.instrucao}
                        variant={escolhidas.includes(v.nome) ? 'filled' : 'outlined'}
                        color={escolhidas.includes(v.nome) ? 'primary' : 'default'}
                        onClick={() => alternarVista(v.nome)} />
                    ))}
                  </Stack>
                </Box>

                <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
                  <Button variant="contained" disableElevation onClick={conferirPeca}
                    disabled={semProcesso || !peca.sku.trim() || !escolhidas.length}>
                    Conferir esta peça
                  </Button>
                  {/* Botão desabilitado sem explicação faz a pessoa achar que a
                      tela quebrou. Aqui ele diz o que falta. */}
                  {(semProcesso || !peca.sku.trim() || !escolhidas.length) && (
                    <Typography variant="caption" color="text.disabled">
                      {semProcesso ? 'este lote ainda não está configurado para esta marca'
                        : !peca.sku.trim() ? 'preencha o SKU para conferir'
                        : 'escolha ao menos uma vista'}
                    </Typography>
                  )}
                  <Button color="inherit" onClick={() => { setPeca(vazia); setArquivos({}); setLinhas(null); setOrigem('') }}>
                    Limpar
                  </Button>
                </Stack>
              </Stack>
            </Box>
          )}

          {/* ── em massa ── */}
          {aba === 1 && (
            <Box sx={{ p: 2.5 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
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
              <Typography variant="caption" color="text.disabled" display="block" sx={{ mt: 1.5 }}>
                Obrigatórias: <b>{COLUNAS_OBRIGATORIAS.join(' · ')}</b>.
                {' '}Opcionais: {COLUNAS.filter(c => !COLUNAS_OBRIGATORIAS.includes(c)).join(' · ')}.
                {' '}Cada arquivo pode ser um nome já na Biblioteca ou uma URL.
              </Typography>
            </Box>
          )}
        </Paper>

        {/* ── o portão, um só para as duas portas ── */}
        {relatorio && (
          <Paper variant="outlined" sx={{ p: 2.5 }}>
            <Typography variant="overline" color="text.secondary">Antes de gastar · {origem}</Typography>

            <Stack direction="row" spacing={1} sx={{ mt: 1.5, mb: 2 }} flexWrap="wrap" useFlexGap>
              <Chip label={`${relatorio.prontas} pronta${relatorio.prontas !== 1 ? 's' : ''}`}
                color={relatorio.prontas ? 'success' : 'default'} variant="outlined" />
              {relatorio.bloqueadas > 0 && <Chip label={`${relatorio.bloqueadas} bloqueada${relatorio.bloqueadas !== 1 ? 's' : ''}`} color="error" variant="outlined" />}
              {relatorio.avisos > 0 && <Chip label={`${relatorio.avisos} aviso${relatorio.avisos !== 1 ? 's' : ''}`} color="warning" variant="outlined" />}
              <Chip label={`${relatorio.imagens} imagens`} variant="outlined" />
              <Chip label={`≈ ${relatorio.creditos} créditos`} variant="outlined" />
            </Stack>

            {relatorio.problemas.length > 0 && (
              <Alert severity="error" sx={{ mb: 2 }}>
                <b>Faltam colunas na planilha.</b>
                <ul style={{ margin: '6px 0 0', paddingLeft: '1.1em' }}>
                  {relatorio.problemas.map((p, i) => <li key={i}>{p.texto}</li>)}
                </ul>
              </Alert>
            )}

            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Linha</TableCell><TableCell>SKU</TableCell>
                    <TableCell>Refs</TableCell><TableCell>Saídas</TableCell>
                    <TableCell>O que precisa de você</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {relatorio.linhas.map(l => (
                    <TableRow key={l._linha}>
                      <TableCell>{l._linha}</TableCell>
                      <TableCell><b>{l.sku || '—'}</b></TableCell>
                      <TableCell>{l.refs}</TableCell>
                      <TableCell>{l.saidas}</TableCell>
                      <TableCell>
                        {l.problemas.length === 0
                          ? <Typography variant="body2" color="success.main">pronta</Typography>
                          : (
                            <Stack spacing={.5}>
                              {l.problemas.map((p, i) => (
                                <Typography key={i} variant="body2"
                                  color={p.nivel === NIVEIS.GRAVE ? 'error.main' : 'warning.main'}>
                                  <b>{p.campo}</b> — {p.texto}
                                </Typography>
                              ))}
                            </Stack>
                          )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 2.5 }}>
              <Button variant="contained" disableElevation
                disabled={!relatorio.podeRodar || rodando} onClick={rodar}
                startIcon={rodando ? <CircularProgress size={15} color="inherit" /> : null}>
                {rodando ? 'Gerando…' : `Rodar (${relatorio.imagens} imagens · ≈${relatorio.creditos} créditos)`}
              </Button>
              <Typography variant="caption" color="text.disabled">
                {relatorio.podeRodar
                  ? 'A execução é a próxima peça a construir.'
                  : 'Resolva os bloqueios acima antes de rodar.'}
              </Typography>
            </Stack>
          </Paper>
        )}
      </Stack>

      {/* ── o resultado ── */}
      {jobs.length > 0 && (
        <Paper variant="outlined" sx={{ p: 2.5, mt: 2 }}>
          <Stack direction="row" spacing={1} alignItems="baseline" sx={{ mb: 2 }}>
            <Typography variant="overline" color="text.secondary">O que saiu</Typography>
            <Typography variant="caption" color="text.disabled">
              {jobs.filter(j => j.status === 'done').length} de {jobs.length} prontas
              {jobs.some(j => j.status === 'error') && ` · ${jobs.filter(j => j.status === 'error').length} com erro`}
            </Typography>
          </Stack>
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
            {jobs.map((j, i) => (
              <Box key={i}>
                <Box sx={{ aspectRatio: '1720/2432', bgcolor: 'action.hover', borderRadius: 1,
                           display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  {j.status === 'done' && j.url
                    ? <Box component="img" src={j.url} alt={`${j.sku} · ${j.vista}`}
                        sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : j.status === 'error'
                      ? <Typography variant="caption" color="error.main" sx={{ p: 1, textAlign: 'center' }}>{j.error || 'falhou'}</Typography>
                      : <CircularProgress size={22} />}
                </Box>
                <Typography variant="caption" display="block" sx={{ mt: .5 }} noWrap title={`${j.sku} · ${j.vista}`}>
                  <b>{j.vista}</b>
                </Typography>
                <Typography variant="caption" color="text.disabled" noWrap>{j.sku}</Typography>
              </Box>
            ))}
          </Box>
        </Paper>
      )}
    </Box>
  )
}
