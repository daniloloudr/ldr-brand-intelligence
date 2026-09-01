import { useEffect, useState } from 'react'
import { Box, Paper, Stack, Typography, CircularProgress, Tooltip } from '@mui/material'
import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined'
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined'
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined'
import { supabase } from '../../lib/supabase'
import { rotuloFaixa } from './Compositor'

// ════════════════════════════════════════════════════════════════════
// Os três caminhos de entrada de Criar — §3.4 da spec do Estúdio.
//
// "Três caminhos de entrada, porque as intenções são incompatíveis e um
// formulário universal serve mal aos três."
//
// Não são três telas: são três MANEIRAS DE COMEÇAR a mesma bancada. Escolhido o
// caminho, o que muda é o que já vem preenchido — não o que dá para fazer.
//
// ⚠️ "DO PRODUTO" ESTÁ REDUZIDO, e de propósito. A §7.2 descreve as variáveis do
// produto como vindas do CATÁLOGO, preenchendo sozinhas por SKU (still,
// categoria, cor, material, dimensões). Nada disso existe hoje: não há catálogo
// no modelo de dados, `brand_assets.tipo` não tem `produto`, e a coluna
// `variaveis_produto` nasce no E1. Então este caminho parte do que existe — uma
// imagem de produto no acervo da marca — e o preenchimento por SKU entra quando
// o catálogo entrar. Prometer SKU numa tela que não tem catálogo seria mentir
// para o usuário na primeira vez que ele clicasse.
// ════════════════════════════════════════════════════════════════════

export const CAMINHOS = [
  { id: 'ideia',   rotulo: 'Da ideia',   icone: LightbulbOutlinedIcon,   diz: 'Tenho um conceito e quero ver' },
  { id: 'produto', rotulo: 'Do produto', icone: Inventory2OutlinedIcon,  diz: 'Tenho um produto e preciso dele em contexto' },
  { id: 'fluxo',   rotulo: 'Do fluxo',   icone: AccountTreeOutlinedIcon, diz: 'Já sei o jeito de fazer, quero rodar de novo' },
]

export function SeletorDeCaminho({ valor, onEscolher }) {
  return (
    <Box sx={{ mb: 2.5 }}>
      <Typography sx={{ ...rotuloFaixa, mb: 0.75, display: 'block' }}>Por onde começar</Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 1.25 }}>
        {CAMINHOS.map(c => {
          const on = valor === c.id
          return (
            <Paper
              key={c.id} variant="outlined" onClick={() => onEscolher(c.id)}
              role="button" tabIndex={0} aria-pressed={on}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onEscolher(c.id) } }}
              sx={{
                p: 1.5, borderRadius: 2, cursor: 'pointer', display: 'flex', gap: 1.25, alignItems: 'flex-start',
                borderColor: on ? 'primary.main' : 'divider',
                bgcolor: on ? 'action.selected' : 'background.paper',
                '&:hover': { borderColor: 'primary.main' },
                '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 2 },
              }}
            >
              <c.icone sx={{ fontSize: 18, mt: 0.2, color: on ? 'primary.main' : 'text.disabled' }} />
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontSize: 13, fontWeight: 800, lineHeight: 1.3 }}>{c.rotulo}</Typography>
                {/* A frase é a da spec, na primeira pessoa: o caminho se escolhe
                    pela INTENÇÃO de quem chegou, não pelo nome da ferramenta. */}
                <Typography sx={{ fontSize: 11.5, color: 'text.secondary', lineHeight: 1.35 }}>{c.diz}</Typography>
              </Box>
            </Paper>
          )
        })}
      </Box>
    </Box>
  )
}

/**
 * O acervo de imagens da marca, para o caminho "Do produto".
 * Escolher uma devolve a URL, que entra como referência da geração.
 */
export function EscolherProduto({ brandId, onEscolher }) {
  const [itens, setItens] = useState(null)

  useEffect(() => {
    if (!brandId) return
    let vivo = true
    supabase.from('brand_assets')
      .select('id, nome, valor, tipo, metadata')
      .eq('brand_id', brandId).in('tipo', ['foto', 'padrao'])
      .order('created_at', { ascending: false }).limit(60)
      .then(({ data }) => { if (vivo) setItens((data || []).filter(a => /^https?:\/\//.test(a.valor || ''))) })
    return () => { vivo = false }
  }, [brandId])

  if (itens === null) return <Stack alignItems="center" sx={{ py: 4 }}><CircularProgress size={20} /></Stack>

  // Vazio é convite, não aviso de erro: diz o que fazer e onde.
  if (!itens.length) return (
    <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, textAlign: 'center' }}>
      <Typography sx={{ fontWeight: 800, mb: 0.5 }}>Nenhuma imagem no acervo da marca</Typography>
      <Typography variant="body2" color="text.secondary">
        Suba as fotos de produto em Biblioteca → Referências da marca e elas aparecem aqui.
      </Typography>
    </Paper>
  )

  return (
    <Box sx={{ mb: 2.5 }}>
      <Typography sx={{ ...rotuloFaixa, mb: 0.75, display: 'block' }}>Escolha o produto</Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))', gap: 1 }}>
        {itens.map(a => (
          <Tooltip key={a.id} title={a.nome || 'sem nome'}>
            <Box
              onClick={() => onEscolher(a)}
              role="button" tabIndex={0}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onEscolher(a) } }}
              sx={{
                aspectRatio: '1 / 1', borderRadius: 1.5, overflow: 'hidden', cursor: 'pointer',
                border: '1px solid', borderColor: 'divider',
                '&:hover': { borderColor: 'primary.main' },
                '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 2 },
              }}
            >
              <Box component="img" src={a.valor} alt={a.nome || ''} loading="lazy"
                sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            </Box>
          </Tooltip>
        ))}
      </Box>
    </Box>
  )
}
