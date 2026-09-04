// ════════════════════════════════════════════════════════════════════
// LOTE DE CATÁLOGO — o primeiro addon (§7.5, §13)
//
// A pessoa sobe UMA planilha. Nada de canvas, nada de nó — decisão do Danilo
// (04/set): "subir apenas a planilha com as infos, reduzir ao máximo o acesso
// dele". O canvas continua existindo, como bastidor, num link.
//
// Esta tela NÃO gera. Ela lê a receita, confere a planilha contra o acervo e
// mostra a conta ANTES de qualquer crédito. Rodar é a próxima peça.
// ════════════════════════════════════════════════════════════════════
import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Box, Paper, Stack, Typography, Button, Chip, CircularProgress, Alert,
  Table, TableHead, TableBody, TableRow, TableCell, TableContainer,
  Select, MenuItem, FormControl, InputLabel, Link as MLink,
} from '@mui/material'
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined'
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined'
import { supabase } from '../../lib/supabase'
import { useWorkspace } from '../../lib/WorkspaceContext'
import { PageHeader } from '../../components/shell/PageHeader'
import { navigate } from '../../lib/helpers'
import { lerCSV, preflight, PAPEIS, COLUNAS_OBRIGATORIAS, NIVEIS } from '../../lib/loteCatalogo'
import { creditsForImage } from '../../lib/credits'

const COLUNAS = ['sku', 'contexto', ...PAPEIS.map(p => p.col), 'saidas']

// A planilha-modelo sai daqui, com uma linha de exemplo — é o que faz "só subir
// a planilha" ser instrução completa em vez de adivinhação.
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
  const { workspace } = useWorkspace()
  const [fluxos, setFluxos] = useState([])
  const [fluxoId, setFluxoId] = useState('')
  const [elenco, setElenco] = useState([])
  const [acervo, setAcervo] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [planilha, setPlanilha] = useState(null)     // { nome, cabecalho, linhas }
  const [erro, setErro] = useState('')

  const load = useCallback(async () => {
    if (!brandId) return
    setCarregando(true)
    const [{ data: wf }, { data: assets }] = await Promise.all([
      supabase.from('studio_workflows').select('id, nome, nodes, updated_at')
        .eq('brand_id', brandId).order('updated_at', { ascending: false, nullsFirst: false }),
      supabase.from('brand_assets').select('nome, pasta, metadata').eq('brand_id', brandId),
    ])
    setFluxos(wf || [])
    setElenco((assets || []).filter(a => (a.pasta || '').toLowerCase() === 'elenco').map(a => a.nome))
    setAcervo((assets || []).map(a => a.nome))
    setCarregando(false)
  }, [brandId])
  useEffect(() => { load() }, [load])

  const fluxo = fluxos.find(f => f.id === fluxoId) || null

  // O modelo vem da RECEITA, não de um seletor: o addon lê o fluxo, a pessoa
  // não escolhe modelo. Primeiro nó que declara um.
  const modelo = useMemo(() => {
    const nodes = Array.isArray(fluxo?.nodes) ? fluxo.nodes : []
    return nodes.map(n => n?.data?.model).find(Boolean) || null
  }, [fluxo])

  const relatorio = useMemo(() => {
    if (!planilha) return null
    return preflight({
      linhas: planilha.linhas, cabecalho: planilha.cabecalho,
      elenco, acervo, modelo,
      creditoPorImagem: creditsForImage(modelo),
    })
  }, [planilha, elenco, acervo, modelo])

  async function escolherArquivo(file) {
    setErro('')
    if (!file) return
    if (!/\.csv$/i.test(file.name)) {
      setErro('Por enquanto só CSV. No Excel: Arquivo → Salvar como → CSV (separado por ponto e vírgula).')
      return
    }
    const { cabecalho, linhas } = lerCSV(await file.text())
    if (!linhas.length) { setErro('A planilha não tem nenhuma linha de dado.'); return }
    setPlanilha({ nome: file.name, cabecalho, linhas })
  }

  function baixarModelo() {
    const url = URL.createObjectURL(new Blob([csvModelo()], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url; a.download = 'lote-catalogo-modelo.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  if (carregando) return (
    <Box><PageHeader title="Lote de Catálogo" subtitle="Uma planilha vira peças por SKU" />
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress size={28} /></Box></Box>
  )

  return (
    <Box>
      <PageHeader
        title="Lote de Catálogo"
        subtitle="Uma planilha vira peças por SKU. O juiz filtra, e a rodada para para você bater o martelo."
      />

      {erro && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErro('')}>{erro}</Alert>}

      <Stack spacing={2}>
        {/* 1 · a receita */}
        <Paper variant="outlined" sx={{ p: 2.5 }}>
          <Typography variant="overline" color="text.secondary">1 · A receita</Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }} sx={{ mt: 1 }}>
            <FormControl size="small" sx={{ minWidth: 300, flex: 1 }}>
              <InputLabel>Fluxo</InputLabel>
              <Select label="Fluxo" value={fluxoId} onChange={e => setFluxoId(e.target.value)}>
                {fluxos.map(f => <MenuItem key={f.id} value={f.id}>{f.nome}</MenuItem>)}
              </Select>
            </FormControl>
            {fluxo && (
              <Stack direction="row" spacing={1} alignItems="center">
                <Chip size="small" variant="outlined" label={modelo ? `modelo: ${modelo.split('/').pop()}` : 'sem modelo declarado'} />
                <MLink component="button" variant="caption" underline="hover" color="text.secondary"
                  onClick={() => navigate(`#/app/brands/${brandId}/studio/workflow/${fluxo.id}`)}>
                  ver os bastidores
                </MLink>
              </Stack>
            )}
          </Stack>
          <Typography variant="caption" color="text.disabled" display="block" sx={{ mt: 1.5 }}>
            O modelo e as constantes de câmera e acabamento vêm do fluxo — você não escolhe aqui.
            O canvas continua sendo onde a receita se desenha.
          </Typography>
        </Paper>

        {/* 2 · a planilha */}
        <Paper variant="outlined" sx={{ p: 2.5 }}>
          <Typography variant="overline" color="text.secondary">2 · A planilha</Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 1.5 }} alignItems={{ sm: 'center' }}>
            <Button component="label" variant="contained" disableElevation startIcon={<UploadFileOutlinedIcon />}>
              {planilha ? 'Trocar planilha' : 'Escolher planilha'}
              <input hidden type="file" accept=".csv,text/csv"
                onChange={e => { escolherArquivo(e.target.files?.[0]); e.target.value = '' }} />
            </Button>
            <Button color="inherit" startIcon={<DownloadOutlinedIcon />} onClick={baixarModelo}>
              Baixar o modelo
            </Button>
            {planilha && (
              <Typography variant="body2" color="text.secondary">
                {planilha.nome} · {planilha.linhas.length} linha{planilha.linhas.length !== 1 ? 's' : ''}
              </Typography>
            )}
          </Stack>
          <Typography variant="caption" color="text.disabled" display="block" sx={{ mt: 1.5 }}>
            Colunas: <b>{COLUNAS_OBRIGATORIAS.join(' · ')}</b> obrigatórias;
            {' '}{COLUNAS.filter(c => !COLUNAS_OBRIGATORIAS.includes(c)).join(' · ')} opcionais.
            Você escreve só a descrição da peça — o resto do contexto o addon monta.
          </Typography>
        </Paper>

        {/* 3 · o preflight */}
        {relatorio && (
          <Paper variant="outlined" sx={{ p: 2.5 }}>
            <Typography variant="overline" color="text.secondary">3 · Antes de gastar</Typography>

            <Stack direction="row" spacing={1} sx={{ mt: 1.5, mb: 2 }} flexWrap="wrap" useFlexGap>
              <Chip label={`${relatorio.prontas} prontas`} color={relatorio.prontas ? 'success' : 'default'} variant="outlined" />
              {relatorio.bloqueadas > 0 && <Chip label={`${relatorio.bloqueadas} bloqueadas`} color="error" variant="outlined" />}
              {relatorio.avisos > 0 && <Chip label={`${relatorio.avisos} avisos`} color="warning" variant="outlined" />}
              <Chip label={`${relatorio.imagens} imagens`} variant="outlined" />
              <Chip label={`≈ ${relatorio.creditos} créditos`} variant="outlined" />
            </Stack>

            {relatorio.problemas.length > 0 && (
              <Alert severity="error" sx={{ mb: 2 }}>
                <b>A planilha não tem as colunas necessárias.</b>
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
                  {relatorio.linhas.map(l => {
                    const grave = l.problemas.some(p => p.nivel === NIVEIS.GRAVE)
                    return (
                      <TableRow key={l._linha} sx={grave ? { bgcolor: 'action.hover' } : undefined}>
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
                    )
                  })}
                </TableBody>
              </Table>
            </TableContainer>

            <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 2.5 }}>
              <Button variant="contained" disableElevation disabled title="a execução é a próxima peça">
                Rodar o lote
              </Button>
              <Typography variant="caption" color="text.disabled">
                {relatorio.podeRodar && fluxo
                  ? 'A execução ainda não foi construída — este é o portão que a antecede.'
                  : 'Resolva os bloqueios e escolha um fluxo antes de rodar.'}
              </Typography>
            </Stack>
          </Paper>
        )}
      </Stack>
    </Box>
  )
}
