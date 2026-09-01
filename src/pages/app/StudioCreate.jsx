import { lazy, Suspense, useState } from 'react'
import { Box, ToggleButton, ToggleButtonGroup, CircularProgress, Tooltip } from '@mui/material'
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined'
import MovieOutlinedIcon from '@mui/icons-material/MovieOutlined'
import NotesOutlinedIcon from '@mui/icons-material/NotesOutlined'
import GraphicEqOutlinedIcon from '@mui/icons-material/GraphicEqOutlined'
import { navigate } from '../../lib/helpers'
import { PageHeader } from '../../components/shell/PageHeader'
import { SeletorDeCaminho, EscolherProduto } from '../../components/estudio/CaminhoDeEntrada'

const StudioImage   = lazy(() => import('./StudioImage').then(m => ({ default: m.StudioImage })))
const StudioVideo   = lazy(() => import('./StudioVideo').then(m => ({ default: m.StudioVideo })))
const StudioWriting = lazy(() => import('./StudioWriting').then(m => ({ default: m.StudioWriting })))
const StudioWorkflows = lazy(() => import('./StudioWorkflows').then(m => ({ default: m.StudioWorkflows })))

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

// ⛔ §3.4 DESLIGADO (01/set/2026, decisão do Danilo depois de testar com pessoas):
// "não faz sentido agora pra operação". Os três caminhos de entrada não ajudaram
// quem usa — a bancada já resolve, e a faixa a mais só somava um passo.
//
// Desligado, NÃO apagado: o código do §3.4 continua inteiro em
// components/estudio/CaminhoDeEntrada.jsx, e religar é trocar este false por
// true. Apagar custaria reescrever quando o catálogo de produto existir (é ele
// que dá sentido ao caminho "Do produto", hoje reduzido).
//
// Com a faixa desligada, o caminho é sempre 'ideia' — que é o comportamento de
// sempre: prompt e gera.
const CAMINHOS_DE_ENTRADA = false

export function StudioCreate({ brandId, formato = 'imagem' }) {
  const atual = FORMATOS.find(f => f.id === formato) || FORMATOS[0]

  // §3.4 — por onde a pessoa começou. Não troca de tela: troca o que já vem
  // preenchido. `produto` some quando o formato não aceita referência de
  // imagem: escolher um produto para uma peça de TEXTO não quer dizer nada.
  const [caminho, setCaminho] = useState('ideia')
  const [produto, setProduto] = useState(null)
  const caminhoVale = atual.id === 'imagem' || caminho !== 'produto'
  const cam = CAMINHOS_DE_ENTRADA ? (caminhoVale ? caminho : 'ideia') : 'ideia'

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

      {CAMINHOS_DE_ENTRADA && (
      <Box sx={{ p: { xs: 2, md: 3 }, pb: 0, maxWidth: 1200, width: '100%', mx: 'auto' }}>
        <SeletorDeCaminho valor={cam} onEscolher={c => { setCaminho(c); setProduto(null) }} />
        {cam === 'produto' && !produto && (
          <EscolherProduto brandId={brandId} onEscolher={setProduto} />
        )}
      </Box>
      )}

      <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>}>
        {/* Do fluxo: a lista dos fluxos salvos, DENTRO de Criar — "já sei o
            jeito de fazer, quero rodar de novo" é um começo, não outro lugar. */}
        {cam === 'fluxo' ? (
          <StudioWorkflows brandId={brandId} cabecalho={false} />
        ) : cam === 'produto' && !produto ? null : (<>
          {/* `key` remonta a bancada quando o produto muda: a referência inicial
              é estado de partida, e sem isso o segundo produto não entraria. */}
          {atual.id === 'imagem' && <StudioImage key={produto?.id || 'sem-produto'} brandId={brandId} cabecalho={false} refsIniciais={produto ? [produto.valor] : undefined} />}
          {atual.id === 'video'  && <StudioVideo   brandId={brandId} cabecalho={false} />}
          {atual.id === 'texto'  && <StudioWriting brandId={brandId} cabecalho={false} />}
        </>)}
      </Suspense>
    </Box>
  )
}

export default StudioCreate
