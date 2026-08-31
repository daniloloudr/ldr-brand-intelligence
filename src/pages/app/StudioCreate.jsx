import { lazy, Suspense } from 'react'
import { Box, ToggleButton, ToggleButtonGroup, CircularProgress, Tooltip } from '@mui/material'
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined'
import MovieOutlinedIcon from '@mui/icons-material/MovieOutlined'
import NotesOutlinedIcon from '@mui/icons-material/NotesOutlined'
import GraphicEqOutlinedIcon from '@mui/icons-material/GraphicEqOutlined'
import { navigate } from '../../lib/helpers'
import { PageHeader } from '../../components/shell/PageHeader'

const StudioImage   = lazy(() => import('./StudioImage').then(m => ({ default: m.StudioImage })))
const StudioVideo   = lazy(() => import('./StudioVideo').then(m => ({ default: m.StudioVideo })))
const StudioWriting = lazy(() => import('./StudioWriting').then(m => ({ default: m.StudioWriting })))

// ════════════════════════════════════════════════════════════════════
// Criar — a bancada. §3.4 da spec do Estúdio, e o D10: "formato é escolha
// dentro de Criar, não item de menu".
//
// A decisão que este arquivo materializa: Imagem, Vídeo e Redação deixam de ser
// TRÊS DESTINOS e viram UM destino com três formatos. O motivo do documento é
// que formato como menu daria oito itens de topo e replicaria a mesma lógica de
// julgamento quatro vezes.
//
// Por que o formato continua na URL, e não em estado local: deep link antigo
// (/studio/video) segue valendo, o formato é compartilhável, e o Copiloto
// continua sabendo dizer "Criar · vídeo" em vez de só "Criar" — o contexto dele
// é derivado da rota (ver src/lib/copiloto.js).
//
// ⚠️ ÁUDIO é o quarto formato no §3.2 e NÃO existe aqui: não há gerador de
// áudio no produto. Aba morta ensina o usuário a não clicar; entra quando o
// gerador entrar.
// ════════════════════════════════════════════════════════════════════

const FORMATOS = [
  { id: 'imagem', rotulo: 'Imagem', icone: ImageOutlinedIcon, caminho: '/studio',         legenda: 'Geração de imagem' },
  { id: 'video',  rotulo: 'Vídeo',  icone: MovieOutlinedIcon, caminho: '/studio/video',   legenda: 'Geração de vídeo' },
  { id: 'texto',  rotulo: 'Texto',  icone: NotesOutlinedIcon, caminho: '/studio/writing', legenda: 'Copy no tom da marca' },
]

export function StudioCreate({ brandId, formato = 'imagem' }) {
  const atual = FORMATOS.find(f => f.id === formato) || FORMATOS[0]

  const trocar = (_, novo) => {
    if (!novo || novo === atual.id) return   // ToggleButtonGroup devolve null ao reclicar
    const destino = FORMATOS.find(f => f.id === novo)
    if (destino) navigate(`#/app/brands/${brandId}${destino.caminho}`)
  }

  return (
    <Box>
      <PageHeader
        title="Criar"
        subtitle={atual.legenda}
        action={
          <ToggleButtonGroup exclusive size="small" value={atual.id} onChange={trocar} aria-label="Formato da peça">
            {FORMATOS.map(f => (
              <ToggleButton key={f.id} value={f.id} sx={{ px: 1.75, fontWeight: 700, fontSize: 12, gap: 0.75 }}>
                <f.icone sx={{ fontSize: 16 }} />{f.rotulo}
              </ToggleButton>
            ))}
            {/* Áudio aparece desligado, e o tooltip diz por quê: some da tela é
                pior — o §3.2 promete quatro formatos e o usuário procura. */}
            <Tooltip title="Áudio ainda não tem gerador no produto">
              <span>
                <ToggleButton value="audio" disabled sx={{ px: 1.75, fontWeight: 700, fontSize: 12, gap: 0.75 }}>
                  <GraphicEqOutlinedIcon sx={{ fontSize: 16 }} />Áudio
                </ToggleButton>
              </span>
            </Tooltip>
          </ToggleButtonGroup>
        }
      />

      <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>}>
        {atual.id === 'imagem' && <StudioImage   brandId={brandId} cabecalho={false} />}
        {atual.id === 'video'  && <StudioVideo   brandId={brandId} cabecalho={false} />}
        {atual.id === 'texto'  && <StudioWriting brandId={brandId} cabecalho={false} />}
      </Suspense>
    </Box>
  )
}

export default StudioCreate
