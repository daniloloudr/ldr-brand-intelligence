// ════════════════════════════════════════════════════════════════════
// A RECEITA DO ADDON DE CATÁLOGO — o processo de 4 etapas, em código.
//
// GERADO a partir do fluxo que originou o addon ("Catálogo em 4 etapas"),
// e SANEADO: o que era da Hering ficou para trás.
//
// O que NÃO viaja, e por quê:
//   · `imageInput.urls`  — eram as fotos do KH6V. A entrada de cada SKU vem da
//                          PLANILHA, não do grafo. O `rotulo` fica: ele é o
//                          PAPEL ("Still · frente"), e papel é receita.
//   · `generate.genId`/`outputUrl`/`status` — resultado de uma rodada da
//                          Hering. Template nasce `idle`.
//   · ids de workspace e de marca — vinham colados no estado dos nós.
//
// ⚠️ Os textos foram revistos À MÃO depois da geração. As notas do canvas
// citavam o cliente ("Pedido da Hering, e-mail 21/08") — num template instalado
// noutro tenant, isso mostra o nome de um cliente para outro. Saneamento
// mecânico não pega isso: máquina não julga frase.
//
// Para regerar: NÃO regere. Este arquivo é a fonte agora. O fluxo da Hering
// seguiu a vida dele e já divergiu.
// ════════════════════════════════════════════════════════════════════

export const RECEITA_CATALOGO = {
  "nodes": [
    {
      "id": "nota_geral",
      "type": "note",
      "position": {
        "x": -1780,
        "y": -420
      },
      "data": {
        "text": "PROCESSO DE CATÁLOGO — 4 ETAPAS\nA receita da casa. Vale para qualquer peça, em qualquer marca.\n\nCada etapa come a saída da anterior. Rode na ordem, aprove, siga.\n\nA REGRA DOS DOIS NÓS:\n· CONTEXTO = o constante — câmera/ângulo + a descrição da peça.\n· PROMPT = específico daquela foto.\n\nA PEÇA ESTÁ ESCRITA UMA VEZ e repetida em todos os contextos. Para trocar de\nproduto, troque esse bloco, os stills e o look — o resto do grafo serve.\n\nTETO DE 5 REFERÊNCIAS por gerador. Aqui nenhum passa de 3, de propósito: o que\nexcede é descartado em silêncio, e foi assim que um gerador ficou desenhando a\ncamiseta sem nunca ter visto o still."
      }
    },
    {
      "id": "e0_nota",
      "type": "note",
      "position": {
        "x": -1780,
        "y": 0
      },
      "data": {
        "text": "ETAPA 0 — BASE DE CASTING LIMPA (TURNAROUND)\n\nCinco vistas da modelo SEM os adereços de roupa dela, numa malha colada ao corpo:\n0° frente · 45° três quartos · 90° perfil · 135° três quartos de costas · 180° costas.\nGerado com nano banana 2.5, que foca melhor em pessoa e casting.\n\nPOR QUE CINCO: a roupa do casting vaza na peça gerada, e contaminação visual não\nse resolve no prompt — se resolve tirando o dado da referência. E porque sem\ncostas e sem perfil as etapas seguintes têm que INVENTAR a modelo por trás: era\no que acontecia, e é onde a identidade escapava.\n\nPARA ONDE VAI CADA UMA:\n· 0° FRENTE → etapa 1 (é a âncora; sai daqui o resto da série).\n· 180° COSTAS → etapa 3, automático. Não precisa mais subir nada à mão.\n· 45°, 90° e 135° → base para as poses da etapa 2 e as livres da etapa 4.\n\nAs cinco precisam casar entre si. Se uma sair com outro cabelo ou outra escala,\nregere SÓ ela — o contexto já trava o que tem que ser igual."
      }
    },
    {
      "id": "e0_in_casting",
      "type": "imageInput",
      "position": {
        "x": -1340,
        "y": 0
      },
      "data": {
        "rotulo": "Casting aprovado",
        "urls": []
      }
    },
    {
      "id": "e0_ctx",
      "type": "context",
      "position": {
        "x": -960,
        "y": 0
      },
      "data": {
        "text": "BASE DE CASTING LIMPA — as cinco vistas da modelo\n\nA imagem de entrada serve exclusivamente para preservar a IDENTIDADE da modelo:\nrosto, tom de pele, cabelo e sua textura, biotipo, proporções corporais e\nexpressão. Nada da roupa que ela veste deve ser preservado. remova os sapatos.\n\nRemova completamente a roupa original — modelagem, gola, alças, mangas,\ncosturas, barras, recortes, fendas, textura, estampa e caimento. Vista a modelo\ncom uma SEGUNDA PELE neutra: colada ao corpo, lisa, sem costura aparente, sem\ntextura, sem recorte, sem detalhe construtivo, sem transparência e sem volume.\nCor neutra próxima ao tom da pele ou cinza-claro uniforme, sem contraste.\nEla não deve sugerir NENHUMA categoria de produto — só cobrir o torso.\n\nA malha precisa sair LISA e UNIFORME: sem ponto, sem relevo, sem trama visível.\n(Na primeira tentativa saiu com piquê sutil, e modelo que copia textura copia\nisso também.)\n\n═══ TURNAROUND — AS CINCO VISTAS SÃO A MESMA FOTO, GIRADA ═══\nEstas saídas não são cinco fotos parecidas: são UMA sessão vista de cinco\nângulos. O que precisa ser idêntico em todas, porque é o que permite usá-las\ncomo base uma da outra:\n• A MESMA malha: mesma cor, mesmo caimento, mesma altura de gola e de barra.\n• O MESMO cabelo: mesmo corte, mesmo comprimento, mesmo volume, mesma repartição.\n• A MESMA escala no quadro: topo da cabeça e solado dos pés na mesma altura em\n  todas as cinco. A modelo não chega mais perto nem mais longe.\n• A MESMA luz e o MESMO fundo, com a sombra caindo do mesmo lado.\n• A MESMA postura neutra: em pé, ereta, braços soltos, pés paralelos. O corpo\n  não muda de pose entre as vistas — só a posição da câmera muda.\n\n═══ VISÃO DE CÂMERA E ÂNGULO ═══\nCorpo inteiro, da cabeça aos pés, com folga acima e abaixo, enquadramento\nvertical. Câmera na altura do peito, lente de retrato (equivalente a 85 mm), sem\ndistorção de lente e sem inclinação. Modelo centralizada, à mesma distância em\ntodas as vistas.\n\nO GIRO — o quanto o corpo está voltado para a câmera — é a única coisa que muda\nentre as saídas, e está escrito no prompt de cada uma.\n\nFundo cinza claro neutro sólido #F2F2F2. Luz de estúdio suave e difusa.\nImagem limpa: sem texto, sem etiqueta, sem logotipo, sem marca d'água."
      }
    },
    {
      "id": "e0_fmt",
      "type": "formato",
      "position": {
        "x": -960,
        "y": 300
      },
      "data": {
        "width": 1720,
        "height": 2432,
        "formato": "custom"
      }
    },
    {
      "id": "e0_p1",
      "type": "prompt",
      "position": {
        "x": -600,
        "y": 0
      },
      "data": {
        "text": "VISTA 0° · FRENTE\n\nModelo DE FRENTE para a câmera (0°), corpo inteiro, em pé, peso\ndistribuído igualmente nos dois pés, braços soltos ao lado do corpo, mãos\nrelaxadas, ombros nivelados, olhar direto para a lente.\n\nEsta é a VISTA-ÂNCORA do turnaround: as outras quatro precisam parecer a mesma\npessoa, no mesmo lugar, no mesmo instante — só a câmera anda em volta."
      }
    },
    {
      "id": "e0_g1",
      "type": "generate",
      "position": {
        "x": -260,
        "y": 0
      },
      "data": {
        "model": "fal-ai/gemini-25-flash-image",
        "regenMenu": true,
        "status": "idle",
        "genId": null,
        "outputUrl": null,
        "error": null
      }
    },
    {
      "id": "e0_p2",
      "type": "prompt",
      "position": {
        "x": -600,
        "y": 380
      },
      "data": {
        "text": "VISTA 45° · TRÊS QUARTOS\n\nA modelo girada 45° em relação à câmera (três quartos),\nombro esquerdo mais próximo da lente, ombros em diagonal, rosto voltado para a\ncâmera. Pés no mesmo ponto do chão, peso ainda distribuído, braços soltos.\n\nMesma escala e mesmo enquadramento da vista 0°: a cabeça e os pés na mesma\naltura do quadro. O que mudou foi o ângulo, não a distância."
      }
    },
    {
      "id": "e0_g2",
      "type": "generate",
      "position": {
        "x": -260,
        "y": 380
      },
      "data": {
        "model": "fal-ai/gemini-25-flash-image",
        "regenMenu": true,
        "status": "idle",
        "genId": null,
        "outputUrl": null,
        "error": null
      }
    },
    {
      "id": "e0_p3",
      "type": "prompt",
      "position": {
        "x": -600,
        "y": 760
      },
      "data": {
        "text": "VISTA 90° · PERFIL\n\nPERFIL EXATO (90°): a modelo de lado para a câmera, ombros\nalinhados um atrás do outro, rosto de perfil com o olhar à frente — NÃO para a\ncâmera. Braços soltos, o braço da frente rente ao corpo, sem cobrir a silhueta.\n\nÉ a vista que informa a linha do ombro, a curva das costas, a projeção do\nquadril e o comprimento real do tronco. A silhueta lateral precisa sair limpa e\nlegível contra o fundo."
      }
    },
    {
      "id": "e0_g3",
      "type": "generate",
      "position": {
        "x": -260,
        "y": 760
      },
      "data": {
        "model": "fal-ai/gemini-25-flash-image",
        "regenMenu": true,
        "status": "idle",
        "genId": null,
        "outputUrl": null,
        "error": null
      }
    },
    {
      "id": "e1_nota",
      "type": "note",
      "position": {
        "x": -1780,
        "y": 2240
      },
      "data": {
        "text": "ETAPA 1 — PRIMEIRA IMAGEM INTEIRA\n\nCorpo inteiro com acessórios e a peça em CAIMENTO REAL. Gerado com Seedream 5.0,\nque foi o que leu a peça com fidelidade no bake-off.\n\nReferências: base limpa escolhida (identidade) · still (a peça) · look\n(calça, calçado e bolsa). Três — o teto é cinco, e a folga é proposital.\n\nA imagem aprovada aqui alimenta as etapas 2 e 4."
      }
    },
    {
      "id": "e1_in_still",
      "type": "imageInput",
      "position": {
        "x": -1340,
        "y": 2240
      },
      "data": {
        "rotulo": "Still · frente",
        "urls": []
      }
    },
    {
      "id": "e1_in_look",
      "type": "imageInput",
      "position": {
        "x": -1340,
        "y": 2530
      },
      "data": {
        "rotulo": "Calça (só a peça)",
        "urls": []
      }
    },
    {
      "id": "e1_ctx",
      "type": "context",
      "position": {
        "x": -960,
        "y": 2240
      },
      "data": {
        "text": "PRODUÇÃO DE CATÁLOGO — PRIMEIRA IMAGEM INTEIRA\n\n═══ A PEÇA — FIDELIDADE É O CRITÉRIO PRINCIPAL ═══\nCamiseta feminina de manga curta em RIBANA (poliamida + elastano): malha\ncanelada fina, off-white quente de creme, com listras horizontais finas em\nazul-marinho de fio tinto.\n\nMODELAGEM — SLIM, RENTE AO CORPO. É o ponto que mais erra, leia com atenção:\nno still a peça está DEITADA sobre a mesa, e ribana relaxada parece larga. Ela\nNÃO é larga. O tamanho P mede 39 cm de largura deitada, ou seja 78 cm de\ncircunferência, contra um busto de cerca de 86 cm — a peça é MENOR que o corpo\ne a malha veste ESTICADA. O canelado abre sobre o busto e a silhueta aparece.\nSem folga nas laterais, sem volume, nunca oversized.\n\nCOMPRIMENTO — 54,5 cm no P: a barra termina na ALTURA DO OSSO DO QUADRIL,\ncobrindo o cós da calça e nada além. Não é cropped e não passa do quadril.\nA peça é mais alta que larga (proporção aproximada de 1,4 para 1).\n\nMANGA — 18,5 cm: termina no MEIO DO BÍCEPS, bem acima do cotovelo, rente ao\nbraço e acompanhando o contorno. Não é ampla nem solta.\n\nTEXTURA — o canelado é a assinatura e cobre a peça INTEIRA: frente, costas,\nmangas, ombros, barra e gola. Nervuras verticais finas, muito próximas, de\nrelevo baixo. As listras NÃO interrompem o canelado: a nervura continua\nvisível por baixo do azul. Ler como microcanelado vertical contínuo COM\nlistras horizontais por cima — nunca como jersey liso com linhas pintadas.\n\nLISTRAS DA MANGA — detalhe distintivo, não erre: na manga as listras correm\nAO LONGO DO BRAÇO, perpendiculares às listras horizontais do corpo, e ficam\nmais próximas entre si. O canelado da manga cruza essas listras.\n\nGOLA — alta e canelada (mock neck), curta, com uma listra azul-marinho\ncontornando a base. Vista por trás tem costura central. Sem colarinho.\n\nBARRA — RETA e no mesmo nível em toda a volta, acabada com uma faixa contínua\ne uma listra correndo rente a ela. A costura lateral é fechada de ponta a\nponta e a barra dobra o canto sem interrupção: NÃO HÁ fenda, abertura nem\nracho lateral em nenhum dos lados.\n\nOMBRO — costura visível descendo do pescoço para o braço; a listra acompanha.\nSEM bolso, recorte decorativo, aplicação, bordado ou logotipo.\n\n═══ O LOOK — DE ONDE VEM CADA PARTE ═══\nCada item vem da SUA PRÓPRIA referência de produto. Reproduza fielmente cor,\nmaterial, formato e acabamento de cada uma — não substitua por item parecido.\n• PARTE DE CIMA: a camiseta, 100% do still. É o produto principal.\n• CALÇA: da referência de calça — jeans de algodão em AZUL MÉDIO, lavagem\n  uniforme com desbotado suave nas coxas e joelhos, cintura alta, cinco bolsos,\n  perna larga e reta caindo solta até o tornozelo, barra reta e acabada.\n• CALÇADO: da referência de calçado — SAPATILHA PRETA, rasteira\n  (sem salto), em camurça preta com recorte em couro liso preto na lateral e no\n  calcanhar, e abertura em V no peito do pé. Preta por inteiro, sola fina.\n• BOLSA: da referência de bolsa — TOTE PRETA em camurça/nobuck, estruturada, de\n  corpo trapezoidal com base larga; duas alças curtas de ombro e uma alça longa\n  transversal ajustável com fivela DOURADA (o único metal, e é discreto).\n  Preta por inteiro, sem vivo em cor contrastante.\n• IDENTIDADE (rosto, pele, cabelo, biotipo): da referência de casting.\n\n═══ VISÃO DE CÂMERA E ÂNGULO ═══\nCorpo inteiro, da cabeça aos pés, com folga acima e abaixo. Câmera na\naltura do peito, lente de retrato (equivalente a 85 mm), sem distorção nas\nextremidades. Modelo centralizada. A silhueta inteira precisa ser legível —\nsobretudo o comprimento na altura do quadril e a linha reta e fechada da barra.\n\n═══ ACABAMENTO ═══\nProporções humanas corretas, mãos íntegras, pose natural de catálogo de moda.\nRosto nítido e sem deformação: traços limpos, pele uniforme, sem manchas, sem\nborrão, sem assimetria. Foco preciso nos olhos.\nFundo cinza claro neutro sólido #F2F2F2. Luz de estúdio suave e difusa, que\nrevele o relevo do canelado sem estourar o off-white.\nImagem limpa: sem texto, sem etiqueta, sem logotipo, sem marca d'água."
      }
    },
    {
      "id": "e1_fmt",
      "type": "formato",
      "position": {
        "x": -960,
        "y": 2540
      },
      "data": {
        "width": 1720,
        "height": 2432,
        "formato": "custom"
      }
    },
    {
      "id": "e1_p1",
      "type": "prompt",
      "position": {
        "x": -600,
        "y": 2240
      },
      "data": {
        "text": "FRONTAL\n\nDe frente, em pé, peso distribuído, braços soltos. A leitura mais neutra e completa da peça — é a imagem-âncora da série."
      }
    },
    {
      "id": "e1_g1",
      "type": "generate",
      "position": {
        "x": -260,
        "y": 2240
      },
      "data": {
        "model": "bytedance/seedream/v5/pro/text-to-image",
        "regenMenu": true,
        "status": "idle",
        "genId": null,
        "outputUrl": null,
        "error": null
      }
    },
    {
      "id": "e1_p2",
      "type": "prompt",
      "position": {
        "x": -600,
        "y": 2620
      },
      "data": {
        "text": "PESO NUMA PERNA\n\nDe frente, peso numa perna, quadril deslocado, uma das mãos segurando a alça da bolsa. Postura relaxada de catálogo."
      }
    },
    {
      "id": "e1_g2",
      "type": "generate",
      "position": {
        "x": -260,
        "y": 2620
      },
      "data": {
        "model": "bytedance/seedream/v5/pro/text-to-image",
        "regenMenu": true,
        "status": "idle",
        "genId": null,
        "outputUrl": null,
        "error": null
      }
    },
    {
      "id": "e1_p3",
      "type": "prompt",
      "position": {
        "x": -600,
        "y": 3000
      },
      "data": {
        "text": "TRÊS QUARTOS\n\nCorpo girado a três quartos, ombros em diagonal, rosto para a câmera. Mostra como a peça acompanha o corpo de lado."
      }
    },
    {
      "id": "e1_g3",
      "type": "generate",
      "position": {
        "x": -260,
        "y": 3000
      },
      "data": {
        "model": "bytedance/seedream/v5/pro/text-to-image",
        "regenMenu": true,
        "status": "idle",
        "genId": null,
        "outputUrl": null,
        "error": null
      }
    },
    {
      "id": "e2_nota",
      "type": "note",
      "position": {
        "x": -1780,
        "y": 3720
      },
      "data": {
        "text": "ETAPA 2 — POSES DIFERENTES\n\nO casting entra como referência da MODELO, não como pose a copiar. O objetivo é\ndinamismo sem que as imagens fiquem parecidas demais entre si na vitrine — foi\no pedido que originou esta etapa, e vale para qualquer catálogo.\n\nAqui muda SÓ O ÂNGULO FOTOGRÁFICO. A identidade e a peça vêm prontas da etapa 1.\n\n⚠️ SUBA UMA REFERÊNCIA DE POSE no nó vazio — é a entrada que faz esta etapa\nfuncionar. Sem ela a pose vem só do texto, e o resultado converge para poses\nparecidas."
      }
    },
    {
      "id": "e2_in_pose",
      "type": "imageInput",
      "position": {
        "x": -1340,
        "y": 3720
      },
      "data": {
        "rotulo": "Referência de POSE ← suba aqui",
        "urls": []
      }
    },
    {
      "id": "e2_in_still",
      "type": "imageInput",
      "position": {
        "x": -1340,
        "y": 4010
      },
      "data": {
        "rotulo": "Still · frente",
        "urls": []
      }
    },
    {
      "id": "e2_ctx",
      "type": "context",
      "position": {
        "x": -960,
        "y": 3720
      },
      "data": {
        "text": "PRODUÇÃO DE CATÁLOGO — POSES\n\nO QUE TRAVA E O QUE VARIA:\n• TRAVA: a IDENTIDADE da modelo e o LOOK COMPLETO, que vêm da imagem aprovada\n  da etapa 1 — mesma pessoa, mesma camiseta, mesma calça, mesmo calçado.\n• TRAVA: a peça, com a fidelidade descrita abaixo.\n• TRAVA: fundo cinza claro neutro #F2F2F2 e luz de estúdio suave.\n• VARIA: pose, gesto, ângulo do corpo, direção do olhar e altura da câmera.\n  Cada saída precisa ser visivelmente diferente das outras — duas imagens\n  parecidas são falha, não acerto.\n\nA REFERÊNCIA DE POSE mostra a POSTURA a reproduzir: dela vem só a pose e o\nenquadramento. Pessoa, roupa, luz e fundo dela devem ser ignorados por completo.\n\n═══ A PEÇA — FIDELIDADE É O CRITÉRIO PRINCIPAL ═══\nCamiseta feminina de manga curta em RIBANA (poliamida + elastano): malha\ncanelada fina, off-white quente de creme, com listras horizontais finas em\nazul-marinho de fio tinto.\n\nMODELAGEM — SLIM, RENTE AO CORPO. É o ponto que mais erra, leia com atenção:\nno still a peça está DEITADA sobre a mesa, e ribana relaxada parece larga. Ela\nNÃO é larga. O tamanho P mede 39 cm de largura deitada, ou seja 78 cm de\ncircunferência, contra um busto de cerca de 86 cm — a peça é MENOR que o corpo\ne a malha veste ESTICADA. O canelado abre sobre o busto e a silhueta aparece.\nSem folga nas laterais, sem volume, nunca oversized.\n\nCOMPRIMENTO — 54,5 cm no P: a barra termina na ALTURA DO OSSO DO QUADRIL,\ncobrindo o cós da calça e nada além. Não é cropped e não passa do quadril.\nA peça é mais alta que larga (proporção aproximada de 1,4 para 1).\n\nMANGA — 18,5 cm: termina no MEIO DO BÍCEPS, bem acima do cotovelo, rente ao\nbraço e acompanhando o contorno. Não é ampla nem solta.\n\nTEXTURA — o canelado é a assinatura e cobre a peça INTEIRA: frente, costas,\nmangas, ombros, barra e gola. Nervuras verticais finas, muito próximas, de\nrelevo baixo. As listras NÃO interrompem o canelado: a nervura continua\nvisível por baixo do azul. Ler como microcanelado vertical contínuo COM\nlistras horizontais por cima — nunca como jersey liso com linhas pintadas.\n\nLISTRAS DA MANGA — detalhe distintivo, não erre: na manga as listras correm\nAO LONGO DO BRAÇO, perpendiculares às listras horizontais do corpo, e ficam\nmais próximas entre si. O canelado da manga cruza essas listras.\n\nGOLA — alta e canelada (mock neck), curta, com uma listra azul-marinho\ncontornando a base. Vista por trás tem costura central. Sem colarinho.\n\nBARRA — RETA e no mesmo nível em toda a volta, acabada com uma faixa contínua\ne uma listra correndo rente a ela. A costura lateral é fechada de ponta a\nponta e a barra dobra o canto sem interrupção: NÃO HÁ fenda, abertura nem\nracho lateral em nenhum dos lados.\n\nOMBRO — costura visível descendo do pescoço para o braço; a listra acompanha.\nSEM bolso, recorte decorativo, aplicação, bordado ou logotipo.\n\n═══ VISÃO DE CÂMERA E ÂNGULO ═══\nVaria por saída — está escrito no prompt de cada uma. Lente de retrato\n(equivalente a 85 mm) em todas, sem distorção. Quando a câmera baixa, ela baixa\nde verdade: contra-plongée suave, não recorte da mesma foto.\n\n═══ ACABAMENTO ═══\nProporções humanas corretas, mãos íntegras, pose natural de catálogo de moda.\nRosto nítido e sem deformação: traços limpos, pele uniforme, sem manchas, sem\nborrão, sem assimetria. Foco preciso nos olhos.\nFundo cinza claro neutro sólido #F2F2F2. Luz de estúdio suave e difusa, que\nrevele o relevo do canelado sem estourar o off-white.\nImagem limpa: sem texto, sem etiqueta, sem logotipo, sem marca d'água."
      }
    },
    {
      "id": "e2_fmt",
      "type": "formato",
      "position": {
        "x": -960,
        "y": 4020
      },
      "data": {
        "width": 1720,
        "height": 2432,
        "formato": "custom"
      }
    },
    {
      "id": "e2_p1",
      "type": "prompt",
      "position": {
        "x": -600,
        "y": 3720
      },
      "data": {
        "text": "CAMINHANDO\n\nA modelo CAMINHANDO em direção à câmera: uma perna adiantada em meio passo, peso na perna de trás, braços em movimento natural e assimétrico. Câmera na altura do peito."
      }
    },
    {
      "id": "e2_g1",
      "type": "generate",
      "position": {
        "x": -260,
        "y": 3720
      },
      "data": {
        "model": "bytedance/seedream/v5/pro/text-to-image",
        "regenMenu": true,
        "status": "idle",
        "genId": null,
        "outputUrl": null,
        "error": null
      }
    },
    {
      "id": "e2_p2",
      "type": "prompt",
      "position": {
        "x": -600,
        "y": 4100
      },
      "data": {
        "text": "CONTRA-PLONGÉE\n\nDe frente, peso numa perna, quadril deslocado. Câmera BAIXA, na altura da cintura, apontando levemente para cima — alonga a silhueta e muda a leitura do comprimento."
      }
    },
    {
      "id": "e2_g2",
      "type": "generate",
      "position": {
        "x": -260,
        "y": 4100
      },
      "data": {
        "model": "bytedance/seedream/v5/pro/text-to-image",
        "regenMenu": true,
        "status": "idle",
        "genId": null,
        "outputUrl": null,
        "error": null
      }
    },
    {
      "id": "e2_p3",
      "type": "prompt",
      "position": {
        "x": -600,
        "y": 4480
      },
      "data": {
        "text": "OMBRO\n\nTrês quartos DE COSTAS. Mostra a lateral da peça e o alinhamento das listras na costura lateral. Câmera na altura do peito."
      }
    },
    {
      "id": "e2_g3",
      "type": "generate",
      "position": {
        "x": -260,
        "y": 4483.3775559800015
      },
      "data": {
        "model": "bytedance/seedream/v5/pro/text-to-image",
        "regenMenu": true,
        "status": "idle",
        "genId": null,
        "outputUrl": null,
        "error": null
      }
    },
    {
      "id": "e2_p4",
      "type": "prompt",
      "position": {
        "x": -600,
        "y": 4860
      },
      "data": {
        "text": "APROXIMADA\n\nMEIO CORPO, do topo da cabeça até o quadril. O assunto é o TECIDO: canelado, cruzamento com as listras, gola e arremate das mangas legíveis em escala real. Foco nítido na superfície, fundo levemente desfocado."
      }
    },
    {
      "id": "e2_g4",
      "type": "generate",
      "position": {
        "x": -260,
        "y": 4860
      },
      "data": {
        "model": "bytedance/seedream/v5/pro/text-to-image",
        "regenMenu": true,
        "status": "idle",
        "genId": null,
        "outputUrl": null,
        "error": null
      }
    },
    {
      "id": "e3_nota",
      "type": "note",
      "position": {
        "x": -1780,
        "y": 5580
      },
      "data": {
        "text": "ETAPA 3 — COSTAS\n\nVersão da modelo de costas + still da peça de costas.\n\n⚠️ SUBA A VERSÃO DE COSTAS da modelo no nó vazio (base limpa de costas, gerada\nna etapa 0 com prompt de costas).\n\n⚠️ É a vista que mais reprova em primeira rodada, e quase sempre pela MESMA\ncausa: a descrição da peça no contexto contradiz a ficha técnica. Uma peça slim\ndescrita como \"solta\" sai oversized — o modelo obedece ao texto, não ao still.\nConfira a modelagem no contexto antes de rodar."
      }
    },
    {
      "id": "e3_in_still",
      "type": "imageInput",
      "position": {
        "x": -1340,
        "y": 5870
      },
      "data": {
        "rotulo": "Still · costas",
        "urls": []
      }
    },
    {
      "id": "e3_ctx",
      "type": "context",
      "position": {
        "x": -960,
        "y": 5580
      },
      "data": {
        "text": "PRODUÇÃO DE CATÁLOGO — COSTAS\n\n═══ A PEÇA — FIDELIDADE É O CRITÉRIO PRINCIPAL ═══\nCamiseta feminina de manga curta em RIBANA (poliamida + elastano): malha\ncanelada fina, off-white quente de creme, com listras horizontais finas em\nazul-marinho de fio tinto.\n\nMODELAGEM — SLIM, RENTE AO CORPO. É o ponto que mais erra, leia com atenção:\nno still a peça está DEITADA sobre a mesa, e ribana relaxada parece larga. Ela\nNÃO é larga. O tamanho P mede 39 cm de largura deitada, ou seja 78 cm de\ncircunferência, contra um busto de cerca de 86 cm — a peça é MENOR que o corpo\ne a malha veste ESTICADA. O canelado abre sobre o busto e a silhueta aparece.\nSem folga nas laterais, sem volume, nunca oversized.\n\nCOMPRIMENTO — 54,5 cm no P: a barra termina na ALTURA DO OSSO DO QUADRIL,\ncobrindo o cós da calça e nada além. Não é cropped e não passa do quadril.\nA peça é mais alta que larga (proporção aproximada de 1,4 para 1).\n\nMANGA — 18,5 cm: termina no MEIO DO BÍCEPS, bem acima do cotovelo, rente ao\nbraço e acompanhando o contorno. Não é ampla nem solta.\n\nTEXTURA — o canelado é a assinatura e cobre a peça INTEIRA: frente, costas,\nmangas, ombros, barra e gola. Nervuras verticais finas, muito próximas, de\nrelevo baixo. As listras NÃO interrompem o canelado: a nervura continua\nvisível por baixo do azul. Ler como microcanelado vertical contínuo COM\nlistras horizontais por cima — nunca como jersey liso com linhas pintadas.\n\nLISTRAS DA MANGA — detalhe distintivo, não erre: na manga as listras correm\nAO LONGO DO BRAÇO, perpendiculares às listras horizontais do corpo, e ficam\nmais próximas entre si. O canelado da manga cruza essas listras.\n\nGOLA — alta e canelada (mock neck), curta, com uma listra azul-marinho\ncontornando a base. Vista por trás tem costura central. Sem colarinho.\n\nBARRA — RETA e no mesmo nível em toda a volta, acabada com uma faixa contínua\ne uma listra correndo rente a ela. A costura lateral é fechada de ponta a\nponta e a barra dobra o canto sem interrupção: NÃO HÁ fenda, abertura nem\nracho lateral em nenhum dos lados.\n\nOMBRO — costura visível descendo do pescoço para o braço; a listra acompanha.\nSEM bolso, recorte decorativo, aplicação, bordado ou logotipo.\n\n═══ COMO A PEÇA SE LÊ POR TRÁS ═══\nAs costas são contínuas, com as listras horizontais atravessando de lateral a\nlateral e ALINHANDO com as listras da frente. A gola alta canelada aparece por\ntrás com costura central e a listra contornando a base. A costura lateral é\nvisível, corre reta da cava até a barra e é FECHADA em toda a extensão — a barra\ndobra o canto sem interrupção, sem fenda e sem abertura.\nVestida, a peça é rente às costas: a malha estica e acompanha o corpo.\n\n═══ O LOOK — DE ONDE VEM CADA PARTE ═══\nCada item vem da SUA PRÓPRIA referência de produto. Reproduza fielmente cor,\nmaterial, formato e acabamento de cada uma — não substitua por item parecido.\n• PARTE DE CIMA: a camiseta, 100% do still. É o produto principal.\n• CALÇA: da referência de calça — jeans de algodão em AZUL MÉDIO, lavagem\n  uniforme com desbotado suave nas coxas e joelhos, cintura alta, cinco bolsos,\n  perna larga e reta caindo solta até o tornozelo, barra reta e acabada.\n• CALÇADO: da referência de calçado — SAPATILHA PRETA\n• IDENTIDADE (rosto, pele, cabelo, biotipo): da referência de casting.\n\n═══ VISÃO DE CÂMERA E ÂNGULO ═══\nCorpo inteiro, modelo DE COSTAS para a câmera, câmera na altura do peito,\nlente de retrato sem distorção. Evidencia o caimento rente nas costas, a gola\npor trás, a barra reta e fechada e o comprimento no quadril.\n\n═══ ACABAMENTO ═══\nProporções humanas corretas, mãos íntegras, pose natural de catálogo de moda.\nRosto nítido e sem deformação: traços limpos, pele uniforme, sem manchas, sem\nborrão, sem assimetria. Foco preciso nos olhos.\nFundo cinza claro neutro sólido #F2F2F2. Luz de estúdio suave e difusa, que\nrevele o relevo do canelado sem estourar o off-white.\nImagem limpa: sem texto, sem etiqueta, sem logotipo, sem marca d'água."
      }
    },
    {
      "id": "e3_fmt",
      "type": "formato",
      "position": {
        "x": -960,
        "y": 5880
      },
      "data": {
        "width": 1720,
        "height": 2432,
        "formato": "custom"
      }
    },
    {
      "id": "e3_p1",
      "type": "prompt",
      "position": {
        "x": -600,
        "y": 5580
      },
      "data": {
        "text": "COSTAS\n\nDe costas para a câmera, corpo inteiro, em pé, braços soltos ao lado do corpo. Leitura limpa e completa das costas da peça. O comprimento da peça termina no início do bolso, e não na metade."
      }
    },
    {
      "id": "e3_g1",
      "type": "generate",
      "position": {
        "x": -277.1663131975986,
        "y": 5567.798905451726
      },
      "data": {
        "model": "bytedance/seedream/v5/pro/text-to-image",
        "regenMenu": true,
        "status": "idle",
        "genId": null,
        "outputUrl": null,
        "error": null
      }
    },
    {
      "id": "e3_p2",
      "type": "prompt",
      "position": {
        "x": -600,
        "y": 5960
      },
      "data": {
        "text": "COSTAS · TRÊS QUARTOS\n\nTrês quartos de costas, corpo levemente girado, mostrando ao mesmo tempo as costas e a lateral com a costura fechada."
      }
    },
    {
      "id": "e3_g2",
      "type": "generate",
      "position": {
        "x": -260,
        "y": 5960
      },
      "data": {
        "model": "bytedance/seedream/v5/pro/text-to-image",
        "regenMenu": true,
        "status": "idle",
        "genId": null,
        "outputUrl": null,
        "error": null
      }
    },
    {
      "id": "e4_nota",
      "type": "note",
      "position": {
        "x": -1780,
        "y": 6680
      },
      "data": {
        "text": "ETAPA 4 — FOTOS LIVRES\n\nAqui as referências são as fotos QUE DERAM CERTO — as aprovadas das etapas 1 e 2.\nSobre elas, poses novas.\n\nÉ onde a qualidade compõe: em vez de recomeçar do zero, cada imagem nova parte\ndo melhor que já saiu. É o mesmo mecanismo que a Worten pediu como estrela/cânone."
      }
    },
    {
      "id": "e4_in_still",
      "type": "imageInput",
      "position": {
        "x": -1340,
        "y": 6680
      },
      "data": {
        "rotulo": "Still · frente",
        "urls": []
      }
    },
    {
      "id": "e4_ctx",
      "type": "context",
      "position": {
        "x": -960,
        "y": 6680
      },
      "data": {
        "text": "PRODUÇÃO DE CATÁLOGO — FOTOS LIVRES\n\nAs referências são imagens JÁ APROVADAS desta mesma série: delas vêm a\nidentidade da modelo, o look completo e o padrão de luz e cor. Mantenha tudo —\na única coisa que muda é a pose, escrita no prompt de cada saída.\n\n═══ A PEÇA — FIDELIDADE É O CRITÉRIO PRINCIPAL ═══\nCamiseta feminina de manga curta em RIBANA (poliamida + elastano): malha\ncanelada fina, off-white quente de creme, com listras horizontais finas em\nazul-marinho de fio tinto.\n\nMODELAGEM — SLIM, RENTE AO CORPO. É o ponto que mais erra, leia com atenção:\nno still a peça está DEITADA sobre a mesa, e ribana relaxada parece larga. Ela\nNÃO é larga. O tamanho P mede 39 cm de largura deitada, ou seja 78 cm de\ncircunferência, contra um busto de cerca de 86 cm — a peça é MENOR que o corpo\ne a malha veste ESTICADA. O canelado abre sobre o busto e a silhueta aparece.\nSem folga nas laterais, sem volume, nunca oversized.\n\nCOMPRIMENTO — 54,5 cm no P: a barra termina na ALTURA DO OSSO DO QUADRIL,\ncobrindo o cós da calça e nada além. Não é cropped e não passa do quadril.\nA peça é mais alta que larga (proporção aproximada de 1,4 para 1).\n\nMANGA — 18,5 cm: termina no MEIO DO BÍCEPS, bem acima do cotovelo, rente ao\nbraço e acompanhando o contorno. Não é ampla nem solta.\n\nTEXTURA — o canelado é a assinatura e cobre a peça INTEIRA: frente, costas,\nmangas, ombros, barra e gola. Nervuras verticais finas, muito próximas, de\nrelevo baixo. As listras NÃO interrompem o canelado: a nervura continua\nvisível por baixo do azul. Ler como microcanelado vertical contínuo COM\nlistras horizontais por cima — nunca como jersey liso com linhas pintadas.\n\nLISTRAS DA MANGA — detalhe distintivo, não erre: na manga as listras correm\nAO LONGO DO BRAÇO, perpendiculares às listras horizontais do corpo, e ficam\nmais próximas entre si. O canelado da manga cruza essas listras.\n\nGOLA — alta e canelada (mock neck), curta, com uma listra azul-marinho\ncontornando a base. Vista por trás tem costura central. Sem colarinho.\n\nBARRA — RETA e no mesmo nível em toda a volta, acabada com uma faixa contínua\ne uma listra correndo rente a ela. A costura lateral é fechada de ponta a\nponta e a barra dobra o canto sem interrupção: NÃO HÁ fenda, abertura nem\nracho lateral em nenhum dos lados.\n\nOMBRO — costura visível descendo do pescoço para o braço; a listra acompanha.\nSEM bolso, recorte decorativo, aplicação, bordado ou logotipo.\n\n═══ VISÃO DE CÂMERA E ÂNGULO ═══\nVaria por saída — está escrito no prompt de cada uma. Lente de retrato\n(equivalente a 85 mm) em todas. Mesma luz e mesmo fundo das imagens aprovadas.\n\n═══ ACABAMENTO ═══\nProporções humanas corretas, mãos íntegras, pose natural de catálogo de moda.\nRosto nítido e sem deformação: traços limpos, pele uniforme, sem manchas, sem\nborrão, sem assimetria. Foco preciso nos olhos.\nFundo cinza claro neutro sólido #F2F2F2. Luz de estúdio suave e difusa, que\nrevele o relevo do canelado sem estourar o off-white.\nImagem limpa: sem texto, sem etiqueta, sem logotipo, sem marca d'água."
      }
    },
    {
      "id": "e4_fmt",
      "type": "formato",
      "position": {
        "x": -960,
        "y": 6980
      },
      "data": {
        "width": 1720,
        "height": 2432,
        "formato": "custom"
      }
    },
    {
      "id": "e4_p1",
      "type": "prompt",
      "position": {
        "x": -600,
        "y": 6680
      },
      "data": {
        "text": "SENTADA\n\nSENTADA num cubo neutro cinza claro, pernas cruzadas, tronco ereto levemente inclinado à frente, mãos apoiadas na perna. Mostra como a peça se comporta sentada. Câmera na altura do rosto dela, sentada."
      }
    },
    {
      "id": "e4_g1",
      "type": "generate",
      "position": {
        "x": -260,
        "y": 6680
      },
      "data": {
        "model": "bytedance/seedream/v5/pro/text-to-image",
        "regenMenu": true,
        "status": "idle",
        "genId": null,
        "outputUrl": null,
        "error": null
      }
    },
    {
      "id": "e4_p2",
      "type": "prompt",
      "position": {
        "x": -600,
        "y": 7060
      },
      "data": {
        "text": "BRAÇOS CRUZADOS\n\nDe frente, braços cruzados na altura da cintura, peso numa perna, quadril deslocado. O cruzamento deixa ver as mangas e as listras que correm ao longo do braço."
      }
    },
    {
      "id": "e4_g2",
      "type": "generate",
      "position": {
        "x": -260,
        "y": 7060
      },
      "data": {
        "model": "bytedance/seedream/v5/pro/text-to-image",
        "regenMenu": true,
        "status": "idle",
        "genId": null,
        "outputUrl": null,
        "error": null
      }
    },
    {
      "id": "e4_p3",
      "type": "prompt",
      "position": {
        "x": -600,
        "y": 7440
      },
      "data": {
        "text": "MOVIMENTO\n\nGesto natural, como num intervalo entre poses: uma das mãos passando pelo cabelo, rosto levemente virado e olhar FORA da câmera. Enquadramento de meio corpo."
      }
    },
    {
      "id": "e4_g3",
      "type": "generate",
      "position": {
        "x": -260,
        "y": 7440
      },
      "data": {
        "model": "bytedance/seedream/v5/pro/text-to-image",
        "regenMenu": true,
        "status": "idle",
        "genId": null,
        "outputUrl": null,
        "error": null
      }
    },
    {
      "id": "e1_in_bolsa",
      "type": "imageInput",
      "position": {
        "x": -1340,
        "y": 2820
      },
      "data": {
        "rotulo": "Bolsa",
        "urls": []
      }
    },
    {
      "id": "e1_in_calcado",
      "type": "imageInput",
      "position": {
        "x": -1340,
        "y": 3110
      },
      "data": {
        "rotulo": "Calçado",
        "urls": []
      }
    },
    {
      "id": "e3_in_calca",
      "type": "imageInput",
      "position": {
        "x": -1340,
        "y": 6160
      },
      "data": {
        "rotulo": "Calça (só a peça)",
        "urls": []
      }
    },
    {
      "id": "e3_in_calcado",
      "type": "imageInput",
      "position": {
        "x": -1340,
        "y": 6450
      },
      "data": {
        "rotulo": "Calçado",
        "urls": []
      }
    },
    {
      "id": "e0_p4",
      "type": "prompt",
      "position": {
        "x": -600,
        "y": 1140
      },
      "data": {
        "text": "VISTA 135° · TRÊS QUARTOS DE COSTAS\n\nA modelo girada 135°, quase de costas, ombro\ndireito mais próximo da lente, rosto NÃO voltado para a câmera — vê-se no\nmáximo o contorno da bochecha e a linha da mandíbula. Braços soltos.\n\nMostra ao mesmo tempo as costas e a lateral: é a vista que a etapa 2 usa para a\npose por cima do ombro, e a que revela a costura lateral em diagonal."
      }
    },
    {
      "id": "e0_g4",
      "type": "generate",
      "position": {
        "x": -260,
        "y": 1140
      },
      "data": {
        "model": "fal-ai/gemini-25-flash-image",
        "regenMenu": true,
        "status": "idle",
        "genId": null,
        "outputUrl": null,
        "error": null
      }
    },
    {
      "id": "e0_p5",
      "type": "prompt",
      "position": {
        "x": -600,
        "y": 1520
      },
      "data": {
        "text": "VISTA 180° · COSTAS\n\nModelo DE COSTAS para a câmera (180°), corpo inteiro, em pé,\npeso distribuído nos dois pés, braços soltos ao lado do corpo, cabeça ereta e\nolhar à frente. O rosto não aparece.\n\nO CABELO é a informação crítica desta vista: mesmo comprimento, mesmo volume e\nmesmo penteado das outras quatro, caindo naturalmente nas costas como cairia na\npessoa real — sem mudar de corte, sem prender, sem encurtar. A nuca, a linha\ndos ombros e a largura das costas precisam ser as MESMAS da vista 135°."
      }
    },
    {
      "id": "e0_g5",
      "type": "generate",
      "position": {
        "x": -260,
        "y": 1520
      },
      "data": {
        "model": "fal-ai/gemini-25-flash-image",
        "regenMenu": true,
        "status": "idle",
        "genId": null,
        "outputUrl": null,
        "error": null
      }
    }
  ],
  "edges": [
    {
      "id": "e-e0_in_casting-e0_g1",
      "source": "e0_in_casting",
      "target": "e0_g1"
    },
    {
      "id": "e-e0_p1-e0_g1",
      "source": "e0_p1",
      "target": "e0_g1"
    },
    {
      "id": "e-e0_ctx-e0_g1",
      "source": "e0_ctx",
      "target": "e0_g1"
    },
    {
      "id": "e-e0_fmt-e0_g1",
      "source": "e0_fmt",
      "target": "e0_g1"
    },
    {
      "id": "e-e0_in_casting-e0_g2",
      "source": "e0_in_casting",
      "target": "e0_g2"
    },
    {
      "id": "e-e0_p2-e0_g2",
      "source": "e0_p2",
      "target": "e0_g2"
    },
    {
      "id": "e-e0_ctx-e0_g2",
      "source": "e0_ctx",
      "target": "e0_g2"
    },
    {
      "id": "e-e0_fmt-e0_g2",
      "source": "e0_fmt",
      "target": "e0_g2"
    },
    {
      "id": "e-e0_in_casting-e0_g3",
      "source": "e0_in_casting",
      "target": "e0_g3"
    },
    {
      "id": "e-e0_p3-e0_g3",
      "source": "e0_p3",
      "target": "e0_g3"
    },
    {
      "id": "e-e0_ctx-e0_g3",
      "source": "e0_ctx",
      "target": "e0_g3"
    },
    {
      "id": "e-e0_fmt-e0_g3",
      "source": "e0_fmt",
      "target": "e0_g3"
    },
    {
      "id": "e-e0_g1-e1_g1",
      "source": "e0_g1",
      "target": "e1_g1"
    },
    {
      "id": "e-e1_in_still-e1_g1",
      "source": "e1_in_still",
      "target": "e1_g1"
    },
    {
      "id": "e-e1_in_look-e1_g1",
      "source": "e1_in_look",
      "target": "e1_g1"
    },
    {
      "id": "e-e1_p1-e1_g1",
      "source": "e1_p1",
      "target": "e1_g1"
    },
    {
      "id": "e-e1_ctx-e1_g1",
      "source": "e1_ctx",
      "target": "e1_g1"
    },
    {
      "id": "e-e1_fmt-e1_g1",
      "source": "e1_fmt",
      "target": "e1_g1"
    },
    {
      "id": "e-e0_g1-e1_g2",
      "source": "e0_g1",
      "target": "e1_g2"
    },
    {
      "id": "e-e1_in_still-e1_g2",
      "source": "e1_in_still",
      "target": "e1_g2"
    },
    {
      "id": "e-e1_in_look-e1_g2",
      "source": "e1_in_look",
      "target": "e1_g2"
    },
    {
      "id": "e-e1_p2-e1_g2",
      "source": "e1_p2",
      "target": "e1_g2"
    },
    {
      "id": "e-e1_ctx-e1_g2",
      "source": "e1_ctx",
      "target": "e1_g2"
    },
    {
      "id": "e-e1_fmt-e1_g2",
      "source": "e1_fmt",
      "target": "e1_g2"
    },
    {
      "id": "e-e0_g1-e1_g3",
      "source": "e0_g1",
      "target": "e1_g3"
    },
    {
      "id": "e-e1_in_still-e1_g3",
      "source": "e1_in_still",
      "target": "e1_g3"
    },
    {
      "id": "e-e1_in_look-e1_g3",
      "source": "e1_in_look",
      "target": "e1_g3"
    },
    {
      "id": "e-e1_p3-e1_g3",
      "source": "e1_p3",
      "target": "e1_g3"
    },
    {
      "id": "e-e1_ctx-e1_g3",
      "source": "e1_ctx",
      "target": "e1_g3"
    },
    {
      "id": "e-e1_fmt-e1_g3",
      "source": "e1_fmt",
      "target": "e1_g3"
    },
    {
      "id": "e-e1_g1-e2_g1",
      "source": "e1_g1",
      "target": "e2_g1"
    },
    {
      "id": "e-e2_in_pose-e2_g1",
      "source": "e2_in_pose",
      "target": "e2_g1"
    },
    {
      "id": "e-e2_in_still-e2_g1",
      "source": "e2_in_still",
      "target": "e2_g1"
    },
    {
      "id": "e-e2_p1-e2_g1",
      "source": "e2_p1",
      "target": "e2_g1"
    },
    {
      "id": "e-e2_ctx-e2_g1",
      "source": "e2_ctx",
      "target": "e2_g1"
    },
    {
      "id": "e-e2_fmt-e2_g1",
      "source": "e2_fmt",
      "target": "e2_g1"
    },
    {
      "id": "e-e1_g1-e2_g2",
      "source": "e1_g1",
      "target": "e2_g2"
    },
    {
      "id": "e-e2_in_pose-e2_g2",
      "source": "e2_in_pose",
      "target": "e2_g2"
    },
    {
      "id": "e-e2_in_still-e2_g2",
      "source": "e2_in_still",
      "target": "e2_g2"
    },
    {
      "id": "e-e2_p2-e2_g2",
      "source": "e2_p2",
      "target": "e2_g2"
    },
    {
      "id": "e-e2_ctx-e2_g2",
      "source": "e2_ctx",
      "target": "e2_g2"
    },
    {
      "id": "e-e2_fmt-e2_g2",
      "source": "e2_fmt",
      "target": "e2_g2"
    },
    {
      "id": "e-e1_g1-e2_g3",
      "source": "e1_g1",
      "target": "e2_g3"
    },
    {
      "id": "e-e2_in_pose-e2_g3",
      "source": "e2_in_pose",
      "target": "e2_g3"
    },
    {
      "id": "e-e2_in_still-e2_g3",
      "source": "e2_in_still",
      "target": "e2_g3"
    },
    {
      "id": "e-e2_p3-e2_g3",
      "source": "e2_p3",
      "target": "e2_g3"
    },
    {
      "id": "e-e2_ctx-e2_g3",
      "source": "e2_ctx",
      "target": "e2_g3"
    },
    {
      "id": "e-e2_fmt-e2_g3",
      "source": "e2_fmt",
      "target": "e2_g3"
    },
    {
      "id": "e-e1_g1-e2_g4",
      "source": "e1_g1",
      "target": "e2_g4"
    },
    {
      "id": "e-e2_in_pose-e2_g4",
      "source": "e2_in_pose",
      "target": "e2_g4"
    },
    {
      "id": "e-e2_in_still-e2_g4",
      "source": "e2_in_still",
      "target": "e2_g4"
    },
    {
      "id": "e-e2_p4-e2_g4",
      "source": "e2_p4",
      "target": "e2_g4"
    },
    {
      "id": "e-e2_ctx-e2_g4",
      "source": "e2_ctx",
      "target": "e2_g4"
    },
    {
      "id": "e-e2_fmt-e2_g4",
      "source": "e2_fmt",
      "target": "e2_g4"
    },
    {
      "id": "e-e1_g1-e4_g1",
      "source": "e1_g1",
      "target": "e4_g1"
    },
    {
      "id": "e-e2_g1-e4_g1",
      "source": "e2_g1",
      "target": "e4_g1"
    },
    {
      "id": "e-e4_in_still-e4_g1",
      "source": "e4_in_still",
      "target": "e4_g1"
    },
    {
      "id": "e-e4_p1-e4_g1",
      "source": "e4_p1",
      "target": "e4_g1"
    },
    {
      "id": "e-e4_ctx-e4_g1",
      "source": "e4_ctx",
      "target": "e4_g1"
    },
    {
      "id": "e-e4_fmt-e4_g1",
      "source": "e4_fmt",
      "target": "e4_g1"
    },
    {
      "id": "e-e1_g1-e4_g2",
      "source": "e1_g1",
      "target": "e4_g2"
    },
    {
      "id": "e-e2_g1-e4_g2",
      "source": "e2_g1",
      "target": "e4_g2"
    },
    {
      "id": "e-e4_in_still-e4_g2",
      "source": "e4_in_still",
      "target": "e4_g2"
    },
    {
      "id": "e-e4_p2-e4_g2",
      "source": "e4_p2",
      "target": "e4_g2"
    },
    {
      "id": "e-e4_ctx-e4_g2",
      "source": "e4_ctx",
      "target": "e4_g2"
    },
    {
      "id": "e-e4_fmt-e4_g2",
      "source": "e4_fmt",
      "target": "e4_g2"
    },
    {
      "id": "e-e1_g1-e4_g3",
      "source": "e1_g1",
      "target": "e4_g3"
    },
    {
      "id": "e-e2_g1-e4_g3",
      "source": "e2_g1",
      "target": "e4_g3"
    },
    {
      "id": "e-e4_in_still-e4_g3",
      "source": "e4_in_still",
      "target": "e4_g3"
    },
    {
      "id": "e-e4_p3-e4_g3",
      "source": "e4_p3",
      "target": "e4_g3"
    },
    {
      "id": "e-e4_ctx-e4_g3",
      "source": "e4_ctx",
      "target": "e4_g3"
    },
    {
      "id": "e-e4_fmt-e4_g3",
      "source": "e4_fmt",
      "target": "e4_g3"
    },
    {
      "id": "e-e1_in_calcado-e1_g1",
      "source": "e1_in_calcado",
      "target": "e1_g1"
    },
    {
      "id": "e-e1_in_bolsa-e1_g2",
      "source": "e1_in_bolsa",
      "target": "e1_g2"
    },
    {
      "id": "e-e1_in_calcado-e1_g2",
      "source": "e1_in_calcado",
      "target": "e1_g2"
    },
    {
      "id": "e-e1_in_bolsa-e1_g3",
      "source": "e1_in_bolsa",
      "target": "e1_g3"
    },
    {
      "id": "e-e1_in_calcado-e1_g3",
      "source": "e1_in_calcado",
      "target": "e1_g3"
    },
    {
      "id": "xy-edge__e1_in_bolsa-e1_g1",
      "source": "e1_in_bolsa",
      "target": "e1_g1"
    },
    {
      "id": "e-e0_in_casting-e0_g4",
      "source": "e0_in_casting",
      "target": "e0_g4"
    },
    {
      "id": "e-e0_p4-e0_g4",
      "source": "e0_p4",
      "target": "e0_g4"
    },
    {
      "id": "e-e0_ctx-e0_g4",
      "source": "e0_ctx",
      "target": "e0_g4"
    },
    {
      "id": "e-e0_fmt-e0_g4",
      "source": "e0_fmt",
      "target": "e0_g4"
    },
    {
      "id": "e-e0_in_casting-e0_g5",
      "source": "e0_in_casting",
      "target": "e0_g5"
    },
    {
      "id": "e-e0_p5-e0_g5",
      "source": "e0_p5",
      "target": "e0_g5"
    },
    {
      "id": "e-e0_ctx-e0_g5",
      "source": "e0_ctx",
      "target": "e0_g5"
    },
    {
      "id": "e-e0_fmt-e0_g5",
      "source": "e0_fmt",
      "target": "e0_g5"
    },
    {
      "id": "e-e0_g5-e3_g1",
      "source": "e0_g5",
      "target": "e3_g1"
    },
    {
      "id": "e-e3_in_still-e3_g1",
      "source": "e3_in_still",
      "target": "e3_g1"
    },
    {
      "id": "e-e3_p1-e3_g1",
      "source": "e3_p1",
      "target": "e3_g1"
    },
    {
      "id": "e-e3_ctx-e3_g1",
      "source": "e3_ctx",
      "target": "e3_g1"
    },
    {
      "id": "e-e3_fmt-e3_g1",
      "source": "e3_fmt",
      "target": "e3_g1"
    },
    {
      "id": "e-e3_in_calca-e3_g1",
      "source": "e3_in_calca",
      "target": "e3_g1"
    },
    {
      "id": "e-e3_in_calcado-e3_g1",
      "source": "e3_in_calcado",
      "target": "e3_g1"
    },
    {
      "id": "e-e0_g5-e3_g2",
      "source": "e0_g5",
      "target": "e3_g2"
    },
    {
      "id": "e-e3_in_still-e3_g2",
      "source": "e3_in_still",
      "target": "e3_g2"
    },
    {
      "id": "e-e3_p2-e3_g2",
      "source": "e3_p2",
      "target": "e3_g2"
    },
    {
      "id": "e-e3_ctx-e3_g2",
      "source": "e3_ctx",
      "target": "e3_g2"
    },
    {
      "id": "e-e3_fmt-e3_g2",
      "source": "e3_fmt",
      "target": "e3_g2"
    },
    {
      "id": "e-e3_in_calca-e3_g2",
      "source": "e3_in_calca",
      "target": "e3_g2"
    },
    {
      "id": "e-e3_in_calcado-e3_g2",
      "source": "e3_in_calcado",
      "target": "e3_g2"
    }
  ]
}
