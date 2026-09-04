// A LOJA — a tela do cliente (§13.10).
//
// Nenhum addon vem ligado. Aqui a pessoa vê o que existe, pede, e acompanha.
// Quem libera é o br4ndcode, na fila do painel interno — a RLS da 059 garante
// que nenhum papel de workspace consiga se auto-liberar, então esta tela não
// precisa esconder botão para estar segura: ela esconde por clareza.
import { useState, useEffect, useCallback } from 'react'
import {
  Box, Paper, Stack, Typography, Button, Chip, CircularProgress, Alert,
} from '@mui/material'
import ExtensionOutlinedIcon from '@mui/icons-material/ExtensionOutlined'
import { supabase } from '../../lib/supabase'
import { useWorkspace } from '../../lib/WorkspaceContext'
import { PageHeader } from '../../components/shell/PageHeader'
import { ADDONS, ROTULO_ESTADO } from '../../lib/addons'

export function Addons() {
  const { workspace } = useWorkspace()
  const [instalacoes, setInstalacoes] = useState([])
  const [loading, setLoading] = useState(true)
  const [agindo, setAgindo] = useState(null)   // slug em ação
  const [erro, setErro] = useState('')

  const load = useCallback(async () => {
    if (!workspace?.id) return
    setLoading(true)
    const { data, error } = await supabase
      .from('addon_instalacao')
      .select('id, addon, estado, motivo, pedido_em, decidido_em')
      .eq('workspace_id', workspace.id)
    if (error) setErro(error.message)
    setInstalacoes(data || [])
    setLoading(false)
  }, [workspace?.id])

  useEffect(() => { load() }, [load])

  const instDe = (slug) => instalacoes.find((i) => i.addon === slug) || null

  async function solicitar(slug) {
    setAgindo(slug); setErro('')
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('addon_instalacao').insert({
      workspace_id: workspace.id,
      addon: slug,
      estado: 'pedido',            // a RLS recusa qualquer outro valor
      pedido_por: user?.id || null,
    })
    if (error) setErro(error.message)
    setAgindo(null)
    load()
  }

  // Cancelar serve a dois casos: desistir de um pedido em aberto, e limpar um
  // recusado para poder pedir de novo — o índice único bloqueia a segunda
  // linha, e o cliente não tem update.
  async function cancelar(inst) {
    setAgindo(inst.addon); setErro('')
    const { error } = await supabase.from('addon_instalacao').delete().eq('id', inst.id)
    if (error) setErro(error.message)
    setAgindo(null)
    load()
  }

  if (loading) {
    return (
      <Box>
        <PageHeader title="Addons" subtitle="Ferramentas que o seu time pode pedir" />
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress size={28} /></Box>
      </Box>
    )
  }

  return (
    <Box>
      <PageHeader
        title="Addons"
        subtitle="Ferramentas construídas sobre os seus fluxos. Nenhuma vem ligada — você pede, a gente libera."
      />

      {erro && <Alert severity="error" sx={{ mb: 2 }}>{erro}</Alert>}

      <Stack spacing={2}>
        {ADDONS.map((a) => {
          const inst = instDe(a.slug)
          const rot = inst ? ROTULO_ESTADO[inst.estado] : null
          const ocupado = agindo === a.slug

          return (
            <Paper key={a.slug} variant="outlined" sx={{ p: 2.5 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'flex-start' }}>
                <ExtensionOutlinedIcon sx={{ color: 'text.disabled', mt: .3 }} />

                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ mb: .5 }}>
                    <Typography variant="subtitle1" fontWeight={650}>{a.nome}</Typography>
                    {rot && <Chip size="small" label={rot.texto} color={rot.cor} variant="outlined" />}
                    {a.estado === 'em_construcao' && (
                      <Chip size="small" label="em construção" variant="outlined" />
                    )}
                  </Stack>

                  <Typography variant="body2" color="text.secondary">{a.resumo}</Typography>
                  <Typography variant="caption" color="text.disabled" display="block" sx={{ mt: .75 }}>
                    {a.paraQuem} · {a.fluxo}
                  </Typography>

                  {inst?.estado === 'recusado' && inst.motivo && (
                    <Alert severity="info" sx={{ mt: 1.5, py: .25 }}>
                      {inst.motivo}
                    </Alert>
                  )}
                  {a.estado === 'em_construcao' && !inst && (
                    <Typography variant="caption" color="text.disabled" display="block" sx={{ mt: .75 }}>
                      Ainda não está pronto — mas pedir agora conta: é assim que sabemos o que construir primeiro.
                    </Typography>
                  )}
                </Box>

                <Box sx={{ flexShrink: 0 }}>
                  {!inst && (
                    <Button variant="contained" disableElevation disabled={ocupado}
                            onClick={() => solicitar(a.slug)}>
                      Solicitar
                    </Button>
                  )}
                  {inst?.estado === 'pedido' && (
                    <Button variant="outlined" color="inherit" disabled={ocupado}
                            onClick={() => cancelar(inst)}>
                      Cancelar pedido
                    </Button>
                  )}
                  {inst?.estado === 'recusado' && (
                    <Button variant="outlined" color="inherit" disabled={ocupado}
                            onClick={() => cancelar(inst)}>
                      Pedir de novo
                    </Button>
                  )}
                  {inst?.estado === 'ativo' && (
                    <Typography variant="caption" color="text.disabled">
                      no menu do Estúdio
                    </Typography>
                  )}
                  {inst?.estado === 'suspenso' && (
                    <Typography variant="caption" color="text.disabled">
                      fale com a gente
                    </Typography>
                  )}
                </Box>
              </Stack>
            </Paper>
          )
        })}
      </Stack>
    </Box>
  )
}
