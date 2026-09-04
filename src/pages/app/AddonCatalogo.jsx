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
import { lerCSV, preflight, PAPEIS, COLUNAS_OBRIGATORIAS, NIVEIS, CONTEXTO_MIN } from '../../lib/loteCatalogo'
import { creditsForImage } from '../../lib/credits'

const COLUNAS = ['sku', 'contexto', ...PAPEIS.map(p => p.col), 'saidas']
const SAIDAS = ['inteiro', 'aproximada', 'costas']

function csvModelo() {
  const exemplo = {
    sku: 'KH6V',
    contexto: 'Camiseta feminina de manga curta em RIBANA (poliamida + elastano): malha canelada fina, off-white. MODELAGEM — SLIM, RENTE AO CORPO: é o ponto que mais erra. No still a peça está DEITADA e a ribana relaxada parece larga. Ela NÃO é larga. COMPRIMENTO — 54,5 cm no P, barra na altura do osso do quadril. (…descreva também manga, textura, gola, barra, ombro — e o erro que o modelo costuma cometer.)',
    peca_frente: 'kh6v_frente.jpg', peca_costas: 'kh6v_costas.jpg',
    calca: 'jeans_azul.jpg', calcado: 'sapatilha_preta.jpg', bolsa: 'tote_preta.jpg',
    elenco: 'Marina', saidas: 'inteiro;aproximada;costas',
  }
  const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`
  return '﻿' + [COLUNAS.join(';'), COLUNAS.map(c => esc(exemplo[c])).join(';')].join('\n')
}

export function AddonCatalogo({ brandId }) {
  const [instalacao, setInstalacao] = useState(null)
  const [fluxo, setFluxo] = useState(null)
  const [elenco, setElenco] = useState([])
  const [acervo, setAcervo] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [aba, setAba] = useState(0)                 // 0 = uma peça · 1 = em massa
  const [linhas, setLinhas] = useState(null)        // as linhas a conferir
  const [cabecalho, setCabecalho] = useState(COLUNAS)
  const [origem, setOrigem] = useState('')
  const [erro, setErro] = useState('')

  // ── uma peça ──
  const vazia = { sku: '', contexto: '', elenco: '', saidas: SAIDAS.join(';') }
  const [peca, setPeca] = useState(vazia)
  const [arquivos, setArquivos] = useState({})      // col → { nome, url }
  const [subindo, setSubindo] = useState('')

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
        ? supabase.from('studio_workflows').select('id, nome, nodes').eq('id', inst.workflow_id).maybeSingle()
        : Promise.resolve({ data: null }),
      supabase.from('brand_assets').select('nome, pasta, valor').eq('brand_id', brandId),
    ])
    setFluxo(wf || null)
    setElenco((assets || []).filter(a => (a.pasta || '').toLowerCase() === 'elenco').map(a => a.nome))
    setAcervo((assets || []).map(a => a.nome))
    setCarregando(false)
  }, [brandId])
  useEffect(() => { load() }, [load])

  // O modelo vem do processo fixo do produto — nunca de um seletor na tela.
  const modelo = useMemo(() => {
    const nodes = Array.isArray(fluxo?.nodes) ? fluxo.nodes : []
    return nodes.map(n => n?.data?.model).find(Boolean) || null
  }, [fluxo])

  const relatorio = useMemo(() => {
    if (!linhas?.length) return null
    return preflight({ linhas, cabecalho, elenco, acervo, modelo, creditoPorImagem: creditsForImage(modelo) })
  }, [linhas, cabecalho, elenco, acervo, modelo])

  async function subirArquivo(col, file) {
    if (!file) return
    setSubindo(col); setErro('')
    const path = `${brandId}/lote/${Date.now()}-${(file.name || 'arq').replace(/[^\w.\-]/g, '_')}`
    const { error } = await supabase.storage.from('brand-assets').upload(path, file, { upsert: true })
    if (error) { setErro(`falha ao subir ${file.name}: ${error.message}`); setSubindo(''); return }
    const url = supabase.storage.from('brand-assets').getPublicUrl(path).data.publicUrl
    setArquivos(a => ({ ...a, [col]: { nome: file.name, url } }))
    setSubindo('')
  }

  // A peça vira UMA LINHA — igualzinha à que a planilha produziria.
  function conferirPeca() {
    const linha = { _linha: 2, ...peca }
    for (const p of PAPEIS) if (arquivos[p.col]) linha[p.col] = arquivos[p.col].url
    if (peca.elenco) linha.elenco = peca.elenco
    setCabecalho(COLUNAS); setLinhas([linha]); setOrigem(peca.sku || 'a peça')
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
                  <TextField label="Elenco" size="small" select sx={{ minWidth: 200 }}
                    value={peca.elenco} onChange={e => setPeca(p => ({ ...p, elenco: e.target.value }))}
                    helperText={elenco.length ? 'castings aprovados na Biblioteca' : 'nenhum casting na pasta “elenco”'}>
                    {elenco.map(n => <MenuItem key={n} value={n}>{n}</MenuItem>)}
                  </TextField>
                </Stack>

                <TextField label="A peça — descrição para fidelidade" multiline minRows={6}
                  value={peca.contexto} onChange={e => setPeca(p => ({ ...p, contexto: e.target.value }))}
                  helperText={`Modelagem, comprimento, manga, textura, gola, barra — e o erro que o modelo costuma cometer. ${peca.contexto.length}/${CONTEXTO_MIN} mínimo recomendado.`} />

                <Box>
                  <Typography variant="overline" color="text.secondary">As referências</Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                    {PAPEIS.filter(p => !p.doElenco).map(p => (
                      <Button key={p.col} component="label" size="small"
                        variant={arquivos[p.col] ? 'outlined' : 'text'} color="inherit"
                        disabled={subindo === p.col}
                        startIcon={subindo === p.col ? <CircularProgress size={14} /> : <UploadFileOutlinedIcon />}>
                        {p.papel}{arquivos[p.col] ? ' ✓' : ''}
                        <input hidden type="file" accept="image/*"
                          onChange={e => { subirArquivo(p.col, e.target.files?.[0]); e.target.value = '' }} />
                      </Button>
                    ))}
                  </Stack>
                </Box>

                <TextField label="Saídas" size="small" select sx={{ maxWidth: 320 }}
                  value={peca.saidas} onChange={e => setPeca(p => ({ ...p, saidas: e.target.value }))}>
                  <MenuItem value={SAIDAS.join(';')}>as três (inteiro · aproximada · costas)</MenuItem>
                  {SAIDAS.map(s => <MenuItem key={s} value={s}>só {s}</MenuItem>)}
                </TextField>

                <Stack direction="row" spacing={1.5}>
                  <Button variant="contained" disableElevation onClick={conferirPeca}
                    disabled={semProcesso || !peca.sku.trim()}>
                    Conferir esta peça
                  </Button>
                  <Button color="inherit" onClick={() => { setPeca(vazia); setArquivos({}); setLinhas(null) }}>
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
              <Button variant="contained" disableElevation disabled>Rodar</Button>
              <Typography variant="caption" color="text.disabled">
                {relatorio.podeRodar
                  ? 'A execução é a próxima peça — este é o portão que a antecede.'
                  : 'Resolva os bloqueios acima antes de rodar.'}
              </Typography>
            </Stack>
          </Paper>
        )}
      </Stack>
    </Box>
  )
}
