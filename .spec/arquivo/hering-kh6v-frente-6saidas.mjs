import { createClient } from '@supabase/supabase-js'
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const WS = '5fa1a03e-2c07-4bb4-a12f-1a83e0bd0f5a'   // preenchido abaixo
const B = 'https://uoaeegvpksaummjvmwxg.supabase.co/storage/v1/object/public/brand-assets/09f3d65b-07d9-46c9-b6e7-f878377dd7c2/workflow'
const A = {
  modelo1: `${B}/1787161228142-azfq-imagem_1_modelo.jpg`,
  modelo2: `${B}/1787161396886-ppgt-imagem_2_modelo.jpg`,
  still:   `${B}/1787160605941-x3im-KH6V_still_frente.jpg`,
  bolsa:   `${B}/1787160653584-8k02-KMD6N10SI-C3.jpg`,
  calcado: `${B}/1787160662122-qr4x-AR1A1ASN-C2.jpg`,
}
const SEEDREAM = 'fal-ai/bytedance/seedream/v4.5/text-to-image'

const P = (x, y) => ({ x, y })
const nota = (id,x,y,t,w=400,h=340)=>({id,type:'note',data:{text:t},style:{width:w,height:h},position:P(x,y)})
const entrada=(id,x,y,url)=>({id,type:'imageInput',data:{urls:[url]},style:{width:250,height:250},position:P(x,y)})
const prompt=(id,x,y,t)=>({id,type:'prompt',data:{text:t},style:{width:250,height:250},position:P(x,y)})
const contexto=(id,x,y,t)=>({id,type:'context',data:{text:t},style:{width:280,height:260},position:P(x,y)})
const formato=(id,x,y)=>({id,type:'formato',data:{formato:'custom',width:1920,height:2720},style:{width:250,height:140},position:P(x,y)})
const gerar=(id,x,y)=>({id,type:'generate',data:{status:'idle',model:SEEDREAM},style:{width:250,height:140},position:P(x,y)})
const portao=(id,x,y,c)=>({id,type:'artGate',data:{status:'idle',modo:'fidelidade',criterio:c},style:{width:250,height:200},position:P(x,y)})
const recorte=(id,x,y)=>({id,type:'app',data:{op:'crop',label:'Recortar',status:'idle',width:1920,height:2720,focal:'attention'},style:{width:250,height:160},position:P(x,y)})
const previa=(id,x,y)=>({id,type:'preview',data:{imageUrl:null},style:{width:250,height:250},position:P(x,y)})
const liga=(a,b)=>({id:`e-${a}-${b}`,source:a,target:b})

// ── CONTEXTO ÚNICO ──────────────────────────────────────────────────────
const CTX = `PRODUÇÃO DE CATÁLOGO — HERING · produto KH6V · MODELO DE FRENTE

A PEÇA VEM DO STILL, E SÓ DELE: camiseta manga curta, base off-white canelada,
listras horizontais finas azul-marinho, GOLA ALTA canelada bem marcada. Estampa,
cor, modelagem, gola, mangas e comprimento saem IDÊNTICOS ao still. Não
reinterprete, não "melhore", não ajuste caimento.

⚠️ A FOTO DE CASTING É REFERÊNCIA DE PESSOA, NUNCA DE ROUPA. Nela a modelo veste
outra peça — ignore-a por completo. Dela aproveite rosto, tom de pele, cabelo,
biotipo e pose.

ITENS NOVOS que compõem o look: a camiseta KH6V, a bolsa e o calçado das
referências. Nada além disso vem do casting.

VESTIDA POR COMPLETO: camiseta em cima, calça jeans reta de lavado médio embaixo,
mais o calçado. Nunca pernas nuas, nunca a camiseta como vestido.

ANATOMIA: proporções humanas corretas — cabeça, tronco, braços e pernas em escala
real, mãos com cinco dedos, articulações plausíveis. Pose natural, peso
distribuído, ombros soltos. Nada de corpo alongado ou postura rígida.

Fundo cinza claro neutro sólido #F2F2F2, sem gradiente nem sombra dura. Luz de
estúdio suave e difusa, sem estourar os brancos da peça.

SEM NENHUM TEXTO, letra, número, etiqueta legível, logotipo ou marca d'água.`

const CRIT = (extra='') =>
`PEÇA: camiseta MANGA CURTA, base OFF-WHITE/CREME com LISTRAS FINAS AZUL-MARINHO horizontais (marinière: fundo claro, listras escuras), GOLA ALTA canelada bem marcada. Regata, alça fina, decote em V ou fundo escuro = reprovada.
MODELO: a MESMA PESSOA da foto de casting — mulher negra, cabelo escuro longo e ondulado. Pessoa diferente = reprovada.
ANATOMIA: proporções humanas corretas (cabeça/tronco/pernas em escala real, mãos íntegras), pose natural. Corpo desproporcional, membro deformado ou pose rígida = REPROVADA.
COMPOSIÇÃO: vestida por completo (camiseta + calça jeans + calçado), de FRENTE. Pernas nuas ou camiseta como vestido = reprovada.${extra}
Nenhum texto, etiqueta ou logotipo na imagem.`

const CONT = `\nCONTINUIDADE: calça (mesmo lavado e corte), calçado, bolsa e cabelo precisam ser os MESMOS da imagem-base desta sequência. Qualquer troca = reprovada.`

const nodes = [
  nota('nota', -460, -560,
`KH6V · FLUXO DE FRENTE — 6 SAÍDAS

Estrutura (desenho do Danilo):
Duas fotos de casting de frente. De CADA uma sai:
  ① MESMA POSE, só com os itens novos (camiseta + bolsa + calçado)
  ② e ③ duas poses novas, herdando o look da ①

Por que assim: a ① é a ÂNCORA do ramo. Ela fixa jeans, calçado, bolsa e cabelo,
e as poses novas recebem a ① como referência. Foi a falta disso que fez a calça
mudar entre as fotos no t01.

⚠️ ORDEM: rode as ① primeiro. As poses dependem delas.

Contexto ÚNICO para as 6 (fica num nó só — repetir é convite a divergirem).
Modelo: seedream 4.5, escolhido em bake-off de 6 caminhos × 3 rodadas.
Entrega: 1920×2720, fundo #F2F2F2.
⚠️ 350 KB ainda não é garantido pelo nó Recortar.`),

  entrada('in_modelo1', -460, -160, A.modelo1),
  entrada('in_modelo2', -460,  120, A.modelo2),
  entrada('in_still',   -460,  400, A.still),
  entrada('in_bolsa',   -460,  680, A.bolsa),
  entrada('in_calcado', -460,  960, A.calcado),
  contexto('ctx', -140, -520, CTX),
  formato('fmt', -140, -240),
]

const POSES = [
  { sufixo: 'p1', titulo: 'passo à frente',
    txt: `Nova pose, MESMO look: a modelo dando um passo à frente, uma perna adiantada,
peso na perna de trás, tronco levemente girado em três quartos mas rosto para a câmera.
Braço da bolsa relaxado ao lado do corpo. Movimento sutil de catálogo, sem exagero.` },
  { sufixo: 'p2', titulo: 'mão no bolso',
    txt: `Nova pose, MESMO look: a modelo de frente, uma mão no bolso da calça e a outra
segurando a alça da bolsa no ombro. Quadril levemente deslocado, ombros soltos.
Olhar direto para a câmera, expressão neutra e confiante.` },
]

const RAMOS = [
  { id: 'A', entrada: 'in_modelo1', y: -240, rotulo: 'casting 1' },
  { id: 'B', entrada: 'in_modelo2', y: 1240, rotulo: 'casting 2' },
]

const edges = []
for (const r of RAMOS) {
  const base = `g${r.id}_base`
  nodes.push(prompt(`pr${r.id}`, 180, r.y,
`MESMA POSE da foto de casting ${r.rotulo}: reproduza exatamente o enquadramento, o ângulo
de câmera, a postura, a posição dos braços e a direção do olhar da referência da modelo.

O QUE MUDA: ela agora veste os ITENS NOVOS — a camiseta KH6V do still, com a bolsa e o
calçado das referências, sobre calça jeans reta de lavado médio.

Corpo inteiro, da cabeça aos pés, com folga acima e abaixo.`))
  nodes.push(gerar(base, 500, r.y))
  nodes.push(portao(`gate${r.id}`, 820, r.y, CRIT()))
  nodes.push(recorte(`crop${r.id}`, 1140, r.y))
  nodes.push(previa(`pv${r.id}`, 1460, r.y))
  edges.push(
    liga('in_still', base), liga(r.entrada, base), liga('in_bolsa', base), liga('in_calcado', base),
    liga(`pr${r.id}`, base), liga('ctx', base), liga('fmt', base),
    liga(base, `gate${r.id}`), liga('in_still', `gate${r.id}`),
    liga(`gate${r.id}`, `crop${r.id}`), liga(`crop${r.id}`, `pv${r.id}`),
  )

  POSES.forEach((pose, i) => {
    const g = `g${r.id}_${pose.sufixo}`, yy = r.y + 300 + i * 300
    nodes.push(prompt(`pr${r.id}${pose.sufixo}`, 180, yy, pose.txt))
    nodes.push(gerar(g, 500, yy))
    nodes.push(portao(`gate${r.id}${pose.sufixo}`, 820, yy, CRIT(CONT)))
    nodes.push(recorte(`crop${r.id}${pose.sufixo}`, 1140, yy))
    nodes.push(previa(`pv${r.id}${pose.sufixo}`, 1460, yy))
    edges.push(
      // a ÂNCORA primeiro: é ela que carrega o look inteiro
      liga(base, g), liga('in_still', g), liga(r.entrada, g),
      liga(`pr${r.id}${pose.sufixo}`, g), liga('ctx', g), liga('fmt', g),
      liga(g, `gate${r.id}${pose.sufixo}`), liga('in_still', `gate${r.id}${pose.sufixo}`),
      liga(`gate${r.id}${pose.sufixo}`, `crop${r.id}${pose.sufixo}`),
      liga(`crop${r.id}${pose.sufixo}`, `pv${r.id}${pose.sufixo}`),
    )
  })
}

const { data: ws } = await sb.from('workspaces').select('id').ilike('nome','hering').single()
const { data, error } = await sb.from('studio_workflows').insert({
  workspace_id: ws.id, brand_id: '09f3d65b-07d9-46c9-b6e7-f878377dd7c2', is_template: false,
  nome: 'Hering · KH6V — FRENTE · 6 saídas (2 castings × 3 poses)', nodes, edges,
}).select('id').single()
if (error) { console.error('ERRO:', error.message); process.exit(1) }

const imgUrls=d=>d?.urls?.length?d.urls:(d?.url?[d.url]:[])
const PRODUZ=new Set(['generate','app','imageInput','preview','artGate'])
const id2=Object.fromEntries(nodes.map(n=>[n.id,n])); const saida={}
for (const n of nodes.filter(n=>n.type==='imageInput')) saida[n.id]=imgUrls(n.data)
console.log('workflow criado:', data.id)
console.log('url:', `/app/brands/09f3d65b-07d9-46c9-b6e7-f878377dd7c2/studio/workflow/${data.id}`)
console.log('nós:', nodes.length, '| ligações:', edges.length, '| saídas:', nodes.filter(n=>n.type==='preview').length)
console.log('\n=== referências por geração (teto 5) ===')
for (const g of nodes.filter(n=>n.type==='generate')) {
  const ups=[...new Set(edges.filter(e=>e.target===g.id).map(e=>e.source))].map(i=>id2[i]).filter(n=>n&&PRODUZ.has(n.type))
  const refs=ups.flatMap(u=>saida[u.id]||['<gerada>'])
  console.log(' ', g.id.padEnd(10), refs.length+'/5', refs.length>5?'⚠️ CORTA':'ok', '→', ups.map(u=>u.id).join(' , '))
}
