// Catálogo curado de UX dos modelos de vídeo (fonte única do seletor).
// `key` casa com VIDEO_MODELS em netlify/functions/_video.js (roteamento/params).
// modes: 't2v' (texto→vídeo) | 'i2v' (imagem→vídeo). durations = valores EXATOS
// aceitos pelo modelo (já no formato do fal). aspects = null → enquadramento vem
// da imagem (não há seletor de formato).
export const VIDEO_MODELS = [
  // ── Premium ──
  { key: 'veo3',          label: 'Google Veo 3',        group: 'Premium',  modes: ['t2v'],        durations: ['4s', '6s', '8s'], defaultDuration: '8s', aspects: ['16:9', '9:16'], nota: 'Topo de qualidade, áudio nativo — o mais caro' },
  { key: 'veo3-fast',     label: 'Veo 3 Fast',          group: 'Premium',  modes: ['t2v'],        durations: ['4s', '6s', '8s'], defaultDuration: '6s', aspects: ['16:9', '9:16'], nota: 'Veo 3 mais rápido e barato' },
  // ── Popular ──
  { key: 'kling-25-turbo', label: 'Kling 2.5 Turbo Pro', group: 'Popular', modes: ['i2v'],        durations: ['5', '10'], defaultDuration: '5', aspects: null, endFrame: true, nota: 'Imagem→vídeo de alta qualidade · suporta frame final' },
  { key: 'hailuo-02',     label: 'Hailuo 02',           group: 'Popular',  modes: ['t2v', 'i2v'], durations: ['6', '10'], defaultDuration: '6', aspects: null, endFrame: true, nota: 'Movimento expressivo, bom custo · suporta frame final' },
  // ── Versátil ──
  { key: 'seedance-1-pro', label: 'Seedance 1.0 Pro',   group: 'Versátil', modes: ['t2v', 'i2v'], durations: ['5', '10'], defaultDuration: '5', aspects: ['16:9', '9:16', '1:1'], endFrame: true, nota: 'Rápido e econômico · suporta frame final' },
  { key: 'wan-22',        label: 'Wan 2.2',             group: 'Versátil', modes: ['t2v', 'i2v'], durations: null, defaultDuration: null, aspects: ['16:9', '9:16', '1:1'], nota: 'Open, duração padrão (~5s)' },
]

export const VIDEO_MODEL_GROUPS = ['Premium', 'Popular', 'Versátil']
export const DEFAULT_VIDEO_MODEL = 'seedance-1-pro'   // equilíbrio custo/qualidade, t2v+i2v

export const videoModelByKey = k => VIDEO_MODELS.find(m => m.key === k)
export const durLabel = d => (String(d).endsWith('s') ? String(d) : `${d}s`)

// Rótulo do modo de funcionamento do modelo (para o usuário saber o que aceita).
export const modeLabel = m => {
  const i2v = m?.modes?.includes('i2v'), t2v = m?.modes?.includes('t2v')
  return i2v && t2v ? 'texto + imagem' : i2v ? 'só imagem' : 'só texto'
}
