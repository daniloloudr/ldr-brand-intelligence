import { useState, useRef } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Box, Typography, CircularProgress, Alert, LinearProgress,
} from '@mui/material'
import UploadFileIcon  from '@mui/icons-material/UploadFile'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import { supabase } from '../../lib/supabase'
import { useWorkspace } from '../../lib/WorkspaceContext'
import { PALETTE } from '../../lib/theme'
import { checarTamanhoManual, MANUAL_MAX_MB } from '../../lib/helpers'

const STEPS = [
  'Fazendo upload do PDF...',
  'Lendo o brand manual...',
  'Extraindo identidade da marca...',
  'Mapeando design system...',
  'Identificando assets e tokens...',
  'Salvando no brand book...',
]

export function BrandManualImport({ brandId, open, onClose, onSuccess }) {
  const { workspace } = useWorkspace()
  const [file, setFile]           = useState(null)
  const [step, setStep]           = useState(0)
  const [importing, setImporting] = useState(false)
  const [error, setError]         = useState('')
  const [done, setDone]           = useState(false)
  const fileRef = useRef()
  const intervalRef = useRef(null)

  function handleFileChange(e) {
    const f = e.target.files?.[0]
    if (!f) return
    if (f.type !== 'application/pdf') { setError('Selecione um arquivo PDF.'); return }
    const grande = checarTamanhoManual(f)
    if (grande) { setError(grande); return }
    setError('')
    setFile(f)
  }

  const fileSizeMB = file ? file.size / 1024 / 1024 : 0
  // Medido: o manual da PES (44,7 MB, 313 páginas) levou ~9 min em sete
  // leituras do mesmo documento. Faixas, não promessa — o que manda é o
  // número de páginas, e o tamanho do arquivo é o proxy que temos na mão.
  const estimativa = fileSizeMB > 30 ? 'Manuais deste tamanho levam de 8 a 15 minutos'
                   : fileSizeMB > 10 ? 'Deve levar de 4 a 8 minutos'
                   : 'Deve levar de 2 a 4 minutos'
  // Só avisa perto do teto do bucket. Abaixo disso o tamanho não é problema:
  // o PDF sobe pela Files API e páginas em alta resolução são o insumo da
  // leitura visual, não um estorvo.
  const isLarge    = fileSizeMB > MANUAL_MAX_MB * 0.8

  function advanceStep() {
    setStep(s => Math.min(s + 1, STEPS.length - 1))
  }

  async function handleImport() {
    if (!file) return
    setImporting(true)
    setError('')
    setStep(0)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Sessão expirada.')

      // Upload to Supabase Storage
      const filePath = `${session.user.id}/${brandId}/${Date.now()}.pdf`
      const { error: uploadErr } = await supabase.storage
        .from('brand-manuals')
        .upload(filePath, file, { contentType: 'application/pdf', upsert: true })

      if (uploadErr) throw new Error(`Upload falhou: ${uploadErr.message}`)
      setStep(1)

      // Create job record
      const { data: job, error: jobErr } = await supabase
        .from('brand_manual_jobs')
        .insert({ brand_id: brandId, file_path: filePath, status: 'processing' })
        .select().single()

      if (jobErr) throw new Error(`Erro ao criar job: ${jobErr.message}`)

      // Trigger background function
      const res = await fetch('/.netlify/functions/brand-manual-extract-background', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body:    JSON.stringify({ brand_id: brandId, file_path: filePath, job_id: job.id }),
      })
      if (!res.ok && res.status !== 202) throw new Error(`Erro ${res.status} ao iniciar extração.`)

      // Avisa o onboarding: a trilha da marca estava esperando este arquivo —
      // possivelmente há dias. Mandamos o `job_id` porque a extração JÁ foi
      // despachada acima; sem isso o servidor criaria um segundo job e a
      // extração (que é paga) rodaria duas vezes.
      // Best-effort: se o workspace não tem ambiente preparado, não há trilha
      // para destravar e a importação segue normalmente.
      if (workspace?.id) {
        fetch('/.netlify/functions/workspace-onboard', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ action: 'manual', workspace_id: workspace.id, manual_path: filePath, job_id: job.id }),
        }).catch(() => { /* a extração não depende disso */ })
      }

      // Animate steps while polling
      setStep(2)
      const stepTimer = setInterval(advanceStep, 12000)
      intervalRef.current = stepTimer

      // Poll for job completion.
      // Eram 4 min — menos que o trabalho do servidor. A extração da PES leva
      // ~9 min, e a tela desistia no meio de uma rodada que estava indo bem,
      // dizendo "tente novamente": o cliente dispararia uma segunda extração
      // paga por cima da primeira. O teto agora acompanha o do servidor (15 min
      // de background function) com margem.
      const MAX_WAIT = 18 * 60_000
      const start = Date.now()
      await new Promise((resolve, reject) => {
        const check = async () => {
          if (Date.now() - start > MAX_WAIT) {
            // Não é erro: o job segue no servidor e grava sozinho quando
            // terminar. Pedir "tente novamente" aqui custaria uma extração.
            reject(new Error('A leitura continua rodando no servidor — pode fechar esta janela. '
              + 'O resultado aparece no Brand Book quando terminar.'))
            return
          }
          const { data: jobData } = await supabase
            .from('brand_manual_jobs').select('status, error')
            .eq('id', job.id).single()

          if (jobData?.status === 'done')  { resolve(); return }
          if (jobData?.status === 'error') { reject(new Error(jobData.error || 'Erro na extração.')); return }
          setTimeout(check, 4000)
        }
        setTimeout(check, 4000)
      })

      clearInterval(stepTimer)
      setDone(true)
      onSuccess?.()
    } catch (e) {
      if (intervalRef.current) clearInterval(intervalRef.current)
      setError(e.message)
    } finally {
      setImporting(false)
    }
  }

  function handleClose() {
    if (importing) return
    setFile(null)
    setStep(0)
    setError('')
    setDone(false)
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { bgcolor: 'background.paper' } }}>
      <DialogTitle sx={{ fontWeight: 900, letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', gap: 1 }}>
        <AutoAwesomeIcon sx={{ color: PALETTE.data.neutro, fontSize: 20 }} />
        Importar Brand Manual
      </DialogTitle>

      <DialogContent>
        {done ? (
          <Box sx={{ py: 3, textAlign: 'center' }}>
            <CheckCircleIcon sx={{ fontSize: 48, color: PALETTE.data.positivo, mb: 2 }} />
            <Typography variant="h6" mb={1}>
              Brand manual importado!
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Identidade, posicionamento, design system, assets e tokens foram preenchidos automaticamente.
              Revise cada seção e ajuste se necessário.
            </Typography>
          </Box>
        ) : importing ? (
          <Box sx={{ py: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: '1.5px', mb: 3 }}>
              <CircularProgress size={18} color="primary" />
              <Typography variant="subtitle1">{STEPS[step]}</Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={((step + 1) / STEPS.length) * 100}
              sx={{ borderRadius: 1, mb: 1 }}
            />
            <Typography variant="caption" color="text.disabled">
              {estimativa} · a leitura roda no servidor, você pode fechar esta janela.
            </Typography>
          </Box>
        ) : (
          <Box>
            <Typography variant="body2" color="text.secondary" mb={3}>
              Faça upload do PDF do brand manual. A IA extrai automaticamente identidade, posicionamento,
              design system, assets e tokens de design.
            </Typography>

            <Box
              onClick={() => fileRef.current?.click()}
              sx={{
                border: '2px dashed', borderColor: file ? 'primary.main' : 'divider',
                borderRadius: 2, p: 4, textAlign: 'center', cursor: 'pointer',
                transition: 'all 0.15s',
                bgcolor: file ? 'rgba(13,158,122,0.04)' : 'transparent',
                '&:hover': { borderColor: 'primary.main', bgcolor: 'rgba(13,158,122,0.04)' },
              }}
            >
              <UploadFileIcon sx={{ fontSize: 36, color: file ? 'primary.main' : 'text.disabled', mb: 1 }} />
              {file ? (
                <>
                  <Typography fontWeight={800} color="primary.main">{file.name}</Typography>
                  <Typography variant="caption" color="text.disabled">
                    {(file.size / 1024 / 1024).toFixed(1)} MB · Clique para trocar
                  </Typography>
                </>
              ) : (
                <>
                  <Typography fontWeight={700} color="text.secondary">Clique para selecionar o PDF</Typography>
                  <Typography variant="caption" color="text.disabled">Máximo 50MB</Typography>
                </>
              )}
            </Box>

            <input ref={fileRef} type="file" accept="application/pdf" style={{ display: 'none' }}
              onChange={handleFileChange} />

            {isLarge && !error && (
              <Alert severity="warning" sx={{ mt: 2 }} icon={false}>
                <Typography sx={{ fontSize: 12, fontWeight: 700, mb: 0.5 }}>
                  Arquivo grande ({fileSizeMB.toFixed(1)} MB de {MANUAL_MAX_MB} MB) — a leitura vai demorar mais
                </Typography>
                <Typography sx={{ fontSize: 11, color: 'text.secondary', lineHeight: 1.6 }}>
                  Pode importar assim mesmo. Se passar do limite, divida o manual em partes
                  e suba uma de cada vez — <b>não comprima</b>: a extração lê as páginas,
                  e é delas que saem logo, paleta e tipografia.
                </Typography>
              </Alert>
            )}
            {error && <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError('')}>{error}</Alert>}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        {done ? (
          <Button variant="contained" onClick={handleClose} sx={{ fontWeight: 800 }}>
            Ver brand book
          </Button>
        ) : (
          <>
            <Button onClick={handleClose} disabled={importing} sx={{ fontWeight: 700, color: 'text.secondary' }}>
              Cancelar
            </Button>
            <Button
              variant="contained"
              onClick={handleImport}
              disabled={!file || importing}
              startIcon={importing ? <CircularProgress size={14} color="inherit" /> : <AutoAwesomeIcon />}
              sx={{ fontWeight: 800 }}
            >
              {importing ? 'Extraindo...' : 'Extrair e importar'}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  )
}
