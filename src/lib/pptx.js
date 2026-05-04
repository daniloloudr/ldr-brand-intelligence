import pptxgen from "pptxgenjs";

// LAYOUT_WIDE = 13.33" × 7.5"
const W = 13.33;
const H = 7.5;

const C = {
  navy:      "0D1B2A",
  navyMid:   "162840",
  navyLight: "1E3550",
  green:     "0D9E7A",
  pink:      "E8185A",
  purple:    "7F77DD",
  amber:     "EF9F27",
  white:     "FFFFFF",
  offwhite:  "F7F9F8",
  gray:      "8A9AB0",
  textMid:   "4A5A6A",
  border:    "E2EBE8",
  lightBlue: "C9D8E8",
};

const PRATICAS = [
  { key: "inteligencia_singularidade", label: "Inteligência & Singularidade", sub: "Posicionamento · Arquitetura · Cultura", color: C.green },
  { key: "experiencia_expressao",      label: "Experiência & Expressão",      sub: "Identidade · Design · Storytelling",  color: C.pink  },
  { key: "plataformas_ecossistemas",   label: "Plataformas & Ecossistemas",   sub: "Produto · Digital · Engenharia",      color: C.purple },
  { key: "futuro_escala",              label: "Futuro & Escala",              sub: "Data · AI · Growth · Performance",    color: C.amber },
];

const PRATICA_COLOR = Object.fromEntries(PRATICAS.map(p => [p.key, p.color]));

function scoreLabel(s) {
  if (s >= 9) return "Referência";
  if (s >= 7) return "Sólido";
  if (s >= 4) return "Em desenvolvimento";
  return "Crítico";
}

function scoreColor(s) {
  if (s >= 7) return C.green;
  if (s >= 4) return C.amber;
  return C.pink;
}

function cut(str, max) {
  if (!str) return "—";
  return str.length > max ? str.slice(0, max - 1) + "…" : str;
}

function lbl(slide, text, x, y, color = C.green) {
  slide.addText(text, { x, y, w: 10, h: 0.22, fontSize: 7.5, bold: true, color, fontFace: "Arial", charSpacing: 3 });
}

function scoreBar(slide, prs, score, x, y, w, color) {
  slide.addShape(prs.ShapeType.rect, { x, y, w, h: 0.1, fill: { color: C.border }, line: { type: "none" } });
  if (score > 0) {
    slide.addShape(prs.ShapeType.rect, { x, y, w: (score / 10) * w, h: 0.1, fill: { color }, line: { type: "none" } });
  }
}

function navyAccentLeft(slide, prs) {
  slide.background = { fill: C.navy };
  slide.addShape(prs.ShapeType.rect, { x: 0, y: 0, w: 0.32, h: H, fill: { color: C.green }, line: { type: "none" } });
}

function whiteHeader(slide, prs, title) {
  slide.background = { fill: C.white };
  slide.addShape(prs.ShapeType.rect, { x: 0, y: 0, w: W, h: 1.0, fill: { color: C.navy }, line: { type: "none" } });
  lbl(slide, title, 0.5, 0.38);
}

export async function gerarPPT(data, meta) {
  const prs = new pptxgen();
  prs.layout = "LAYOUT_WIDE";

  const dateStr = meta?.created_at
    ? new Date(meta.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })
    : new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

  // ─── Slide 1: Capa ───────────────────────────────────────────────
  {
    const s = prs.addSlide();
    navyAccentLeft(s, prs);

    s.addText("LOUDR", {
      x: 0.55, y: 0.42, w: 5, h: 0.32,
      fontSize: 12, bold: true, color: C.green, fontFace: "Arial", charSpacing: 5,
    });
    s.addText("Brand Intelligence", {
      x: 0.55, y: 0.74, w: 5, h: 0.22,
      fontSize: 9, color: C.gray, fontFace: "Arial",
    });

    s.addText(data.empresa, {
      x: 0.55, y: 1.9, w: 11.5, h: 1.6,
      fontSize: 52, bold: true, color: C.white, fontFace: "Arial", autoFit: true,
    });

    const metaLine = [data.setor, data.porte, data.dominio].filter(Boolean).join("  ·  ");
    s.addText(metaLine, {
      x: 0.55, y: 3.65, w: 11.5, h: 0.3,
      fontSize: 12, color: C.gray, fontFace: "Arial",
    });

    s.addText("Diagnóstico Smart Branding", {
      x: 0.55, y: 4.1, w: 8, h: 0.35,
      fontSize: 14, bold: true, color: C.green, fontFace: "Arial",
    });

    s.addShape(prs.ShapeType.rect, { x: 0.55, y: 6.5, w: 12.5, h: 0.02, fill: { color: C.navyLight }, line: { type: "none" } });
    s.addText(dateStr, {
      x: 0.55, y: 6.65, w: 6, h: 0.22,
      fontSize: 9, color: C.gray, fontFace: "Arial",
    });
    s.addText("Confidencial · uso exclusivo do cliente", {
      x: 0.55, y: 6.9, w: 12, h: 0.22,
      fontSize: 8, color: "2A3A4A", fontFace: "Arial",
    });
  }

  // ─── Slide 2: Resumo Executivo ───────────────────────────────────
  {
    const s = prs.addSlide();
    navyAccentLeft(s, prs);

    lbl(s, "DIAGNÓSTICO EXECUTIVO", 0.55, 0.38);

    if (data.frase_diagnostico) {
      s.addShape(prs.ShapeType.rect, { x: 0.55, y: 0.85, w: 0.04, h: 1.4, fill: { color: C.green }, line: { type: "none" } });
      s.addText(`"${data.frase_diagnostico}"`, {
        x: 0.77, y: 0.88, w: 12.2, h: 1.35,
        fontSize: 18, italic: true, color: C.lightBlue, fontFace: "Arial",
        lineSpacingMultiple: 1.4, valign: "top", breakLine: true,
      });
    }

    s.addText(cut(data.resumo_executivo, 600), {
      x: 0.55, y: 2.45, w: 12.4, h: 2.8,
      fontSize: 13, color: C.gray, fontFace: "Arial",
      lineSpacingMultiple: 1.55, valign: "top", breakLine: true,
    });

    if (data.momento_atual) {
      s.addText(cut(data.momento_atual, 200), {
        x: 0.55, y: 5.8, w: 12.4, h: 0.5,
        fontSize: 10, color: "5A7A8A", fontFace: "Arial", italic: true,
      });
    }
  }

  // ─── Slide 3: Identidade ─────────────────────────────────────────
  {
    const s = prs.addSlide();
    whiteHeader(s, prs, "ANÁLISE DE IDENTIDADE DE MARCA");

    const cols = [
      { label: "Identidade Declarada", text: data.identidade_declarada, x: 0.4,  color: C.green  },
      { label: "Identidade Percebida", text: data.identidade_percebida, x: 4.7,  color: C.amber  },
      { label: "Gap Identificado",     text: data.gap_identidade,       x: 9.0,  color: C.pink   },
    ];

    cols.forEach(col => {
      s.addShape(prs.ShapeType.rect, { x: col.x, y: 1.1, w: 3.9, h: 0.07, fill: { color: col.color }, line: { type: "none" } });
      s.addText(col.label.toUpperCase(), {
        x: col.x, y: 1.28, w: 3.9, h: 0.28,
        fontSize: 9, bold: true, color: C.navy, fontFace: "Arial", charSpacing: 1,
      });
      s.addText(cut(col.text, 400), {
        x: col.x, y: 1.65, w: 3.9, h: 5.5,
        fontSize: 11, color: C.textMid, fontFace: "Arial",
        lineSpacingMultiple: 1.45, valign: "top", breakLine: true,
      });
    });
  }

  // ─── Slides 4–7: 4 Práticas LOUDR ───────────────────────────────
  PRATICAS.forEach(p => {
    const pr = data.praticas_loudr?.[p.key];
    if (!pr) return;

    const s = prs.addSlide();
    s.background = { fill: C.white };

    // Color top stripe
    s.addShape(prs.ShapeType.rect, { x: 0, y: 0, w: W, h: 0.15, fill: { color: p.color }, line: { type: "none" } });
    // Navy header
    s.addShape(prs.ShapeType.rect, { x: 0, y: 0.15, w: W, h: 1.1, fill: { color: C.navy }, line: { type: "none" } });

    s.addText(p.label.toUpperCase(), {
      x: 0.5, y: 0.28, w: 10, h: 0.38,
      fontSize: 15, bold: true, color: C.white, fontFace: "Arial",
    });
    s.addText(p.sub, {
      x: 0.5, y: 0.66, w: 9, h: 0.25,
      fontSize: 9, color: C.gray, fontFace: "Arial",
    });

    // Score
    s.addText(String(pr.score), {
      x: 11.0, y: 0.22, w: 2.0, h: 0.75,
      fontSize: 40, bold: true, color: p.color, fontFace: "Arial", align: "right",
    });
    s.addText(`/10 · ${scoreLabel(pr.score)}`, {
      x: 11.0, y: 0.92, w: 2.1, h: 0.2,
      fontSize: 8, color: C.gray, fontFace: "Arial", align: "right",
    });

    // Score bar full width
    scoreBar(s, prs, pr.score, 0.5, 1.42, W - 1, p.color);

    // 3 columns
    const cols = [
      { label: "Diagnóstico",       text: pr.diagnostico,  x: 0.4 },
      { label: "Evidências",         text: pr.evidencias,   x: 4.7 },
      { label: "Oportunidade LOUDR", text: pr.oportunidade, x: 9.0 },
    ];

    cols.forEach(col => {
      lbl(s, col.label.toUpperCase(), col.x, 1.7, p.color);
      s.addText(cut(col.text, 380), {
        x: col.x, y: 2.05, w: 3.9, h: 5.1,
        fontSize: 11, color: C.textMid, fontFace: "Arial",
        lineSpacingMultiple: 1.45, valign: "top", breakLine: true,
      });
    });
  });

  // ─── Slide 8: Scores Gerais ──────────────────────────────────────
  {
    const s = prs.addSlide();
    whiteHeader(s, prs, "SCORES DE MARCA");

    const scores = [
      { label: "Singularidade",  val: data.score_singularidade  },
      { label: "Consistência",   val: data.score_consistencia   },
      { label: "Posicionamento", val: data.score_posicionamento },
    ];

    scores.forEach((sc, i) => {
      const x = 0.5 + i * 4.25;
      const color = scoreColor(sc.val);
      const cardW = 4.0;

      s.addShape(prs.ShapeType.rect, { x, y: 1.2, w: cardW, h: 4.5, fill: { color: C.offwhite }, line: { color: C.border, pt: 1 } });
      s.addShape(prs.ShapeType.rect, { x, y: 1.2, w: cardW, h: 0.1, fill: { color }, line: { type: "none" } });

      s.addText(String(sc.val ?? "—"), {
        x, y: 1.5, w: cardW, h: 1.3,
        fontSize: 60, bold: true, color, fontFace: "Arial", align: "center",
      });
      s.addText("/10", {
        x, y: 2.8, w: cardW, h: 0.28,
        fontSize: 12, color: C.gray, fontFace: "Arial", align: "center",
      });
      s.addText(sc.label.toUpperCase(), {
        x, y: 3.2, w: cardW, h: 0.28,
        fontSize: 9, bold: true, color: C.navy, fontFace: "Arial", align: "center", charSpacing: 2,
      });
      s.addText(scoreLabel(sc.val), {
        x, y: 3.55, w: cardW, h: 0.25,
        fontSize: 10, color, fontFace: "Arial", align: "center",
      });
      scoreBar(s, prs, sc.val, x + 0.3, 4.2, cardW - 0.6, color);
    });

    if (data.justificativa_scores) {
      s.addText(cut(data.justificativa_scores, 320), {
        x: 0.5, y: 6.0, w: 12.3, h: 1.1,
        fontSize: 10, color: C.textMid, fontFace: "Arial",
        lineSpacingMultiple: 1.4, italic: true, breakLine: true,
      });
    }
  }

  // ─── Slide 9: Sinais Estratégicos ────────────────────────────────
  {
    const s = prs.addSlide();
    navyAccentLeft(s, prs);
    lbl(s, "SINAIS ESTRATÉGICOS", 0.55, 0.38);

    const signals = [
      { label: "Cultura & Pessoas",      text: data.sinais_cultura },
      { label: "Direção do Investimento", text: data.sinais_investimento },
      { label: "Evolução de Marca",       text: data.evolucao_marca },
      { label: "Território Inexplorado",  text: data.territorio_inexplorado },
    ];

    signals.forEach((sig, i) => {
      const y = 0.95 + i * 1.55;
      s.addShape(prs.ShapeType.rect, { x: 0.55, y, w: 0.04, h: 1.1, fill: { color: C.green }, line: { type: "none" } });
      s.addText(sig.label.toUpperCase(), {
        x: 0.77, y: y + 0.04, w: 12.2, h: 0.22,
        fontSize: 7.5, bold: true, color: C.green, fontFace: "Arial", charSpacing: 2,
      });
      s.addText(cut(sig.text, 220), {
        x: 0.77, y: y + 0.3, w: 12.2, h: 0.8,
        fontSize: 11, color: C.lightBlue, fontFace: "Arial",
        lineSpacingMultiple: 1.35, valign: "top", breakLine: true,
      });
    });
  }

  // ─── Slide 10: Concorrentes ──────────────────────────────────────
  if (data.concorrentes?.length) {
    const s = prs.addSlide();
    whiteHeader(s, prs, "MAPA DE CONCORRENTES");

    const colW = [2.2, 4.8, 1.5, 4.6];
    const headers = ["Concorrente", "Diferencial", "Ameaça", "Sinal Recente"];
    let hx = 0.4;
    headers.forEach((h, i) => {
      s.addShape(prs.ShapeType.rect, { x: hx, y: 1.1, w: colW[i], h: 0.38, fill: { color: C.navyLight }, line: { type: "none" } });
      s.addText(h.toUpperCase(), {
        x: hx + 0.1, y: 1.17, w: colW[i] - 0.15, h: 0.25,
        fontSize: 8, bold: true, color: C.green, fontFace: "Arial", charSpacing: 1,
      });
      hx += colW[i];
    });

    data.concorrentes.slice(0, 5).forEach((c, row) => {
      const y = 1.58 + row * 0.88;
      const rowBg = row % 2 === 0 ? C.offwhite : C.white;
      let cx = 0.4;
      [c.nome, c.diferencial, c.ameaca, c.sinal].forEach((v, ci) => {
        s.addShape(prs.ShapeType.rect, { x: cx, y, w: colW[ci], h: 0.78, fill: { color: rowBg }, line: { color: C.border, pt: 0.5 } });
        const isAmeaca = ci === 2;
        const ameacaColor = v === "alta" ? C.pink : v === "media" ? C.amber : C.green;
        s.addText(cut(v, 90), {
          x: cx + 0.1, y: y + 0.1, w: colW[ci] - 0.2, h: 0.6,
          fontSize: 10, color: isAmeaca ? ameacaColor : C.textMid, bold: isAmeaca,
          fontFace: "Arial", valign: "top", breakLine: true,
        });
        cx += colW[ci];
      });
    });
  }

  // ─── Slide 11: Oportunidades ─────────────────────────────────────
  if (data.oportunidades?.length) {
    const s = prs.addSlide();
    whiteHeader(s, prs, "OPORTUNIDADES ESTRATÉGICAS");

    data.oportunidades.slice(0, 3).forEach((op, i) => {
      const x = 0.4 + i * 4.28;
      const color = PRATICA_COLOR[op.pratica_loudr] || C.green;
      const cardW = 4.05;

      s.addShape(prs.ShapeType.rect, { x, y: 1.12, w: cardW, h: 5.9, fill: { color: C.offwhite }, line: { color: C.border, pt: 1 } });
      s.addShape(prs.ShapeType.rect, { x, y: 1.12, w: cardW, h: 0.1, fill: { color }, line: { type: "none" } });

      const impactColor = op.impacto === "alto" ? C.green : op.impacto === "medio" ? C.amber : C.gray;
      s.addText(`${(op.impacto || "—").toUpperCase()}  ·  ${op.prazo || "—"}`, {
        x: x + 0.2, y: 1.32, w: cardW - 0.3, h: 0.25,
        fontSize: 8, bold: true, color: impactColor, fontFace: "Arial", charSpacing: 1,
      });
      s.addText(op.titulo || "", {
        x: x + 0.2, y: 1.65, w: cardW - 0.3, h: 0.85,
        fontSize: 14, bold: true, color: C.navy, fontFace: "Arial", breakLine: true,
      });
      s.addText(cut(op.descricao, 380), {
        x: x + 0.2, y: 2.58, w: cardW - 0.3, h: 4.1,
        fontSize: 11, color: C.textMid, fontFace: "Arial",
        lineSpacingMultiple: 1.45, valign: "top", breakLine: true,
      });
    });
  }

  // ─── Slide 12: Quick Wins ────────────────────────────────────────
  if (data.quick_wins?.length) {
    const s = prs.addSlide();
    navyAccentLeft(s, prs);

    lbl(s, "QUICK WINS", 0.55, 0.38);
    s.addText("Ações de impacto imediato", {
      x: 0.55, y: 0.73, w: 10, h: 0.45,
      fontSize: 20, bold: true, color: C.white, fontFace: "Arial",
    });

    data.quick_wins.slice(0, 6).forEach((qw, i) => {
      const y = 1.45 + i * 0.98;
      s.addShape(prs.ShapeType.rect, { x: 0.55, y, w: 0.5, h: 0.5, fill: { color: C.green }, line: { type: "none" } });
      s.addText(String(i + 1), {
        x: 0.55, y, w: 0.5, h: 0.5,
        fontSize: 13, bold: true, color: C.white, fontFace: "Arial", align: "center", valign: "middle",
      });
      s.addText(cut(qw, 160), {
        x: 1.22, y: y + 0.04, w: 11.7, h: 0.44,
        fontSize: 12, color: C.lightBlue, fontFace: "Arial", breakLine: true,
      });
    });
  }

  // ─── Slide 13: Porta de Entrada / CTA ───────────────────────────
  {
    const s = prs.addSlide();
    navyAccentLeft(s, prs);

    lbl(s, "PRÓXIMO PASSO", 0.55, 0.38);
    s.addText("Porta de entrada com a LOUDR", {
      x: 0.55, y: 0.73, w: 11, h: 0.5,
      fontSize: 22, bold: true, color: C.white, fontFace: "Arial",
    });

    if (data.porta_entrada_loudr) {
      s.addShape(prs.ShapeType.rect, { x: 0.55, y: 1.45, w: 0.04, h: 2.6, fill: { color: C.green }, line: { type: "none" } });
      s.addText(data.porta_entrada_loudr, {
        x: 0.77, y: 1.48, w: 12.1, h: 2.6,
        fontSize: 14, color: C.lightBlue, fontFace: "Arial",
        lineSpacingMultiple: 1.6, valign: "top", breakLine: true,
      });
    }

    if (data.pergunta_provocativa) {
      s.addShape(prs.ShapeType.rect, { x: 0.55, y: 4.35, w: 12.3, h: 0.02, fill: { color: C.navyLight }, line: { type: "none" } });
      s.addText(`"${cut(data.pergunta_provocativa, 220)}"`, {
        x: 0.55, y: 4.55, w: 12.3, h: 1.0,
        fontSize: 13, italic: true, color: "4A6A7A", fontFace: "Arial",
        lineSpacingMultiple: 1.4, breakLine: true,
      });
    }

    s.addShape(prs.ShapeType.rect, { x: 0.55, y: 6.55, w: 12.3, h: 0.02, fill: { color: C.navyLight }, line: { type: "none" } });
    s.addText("LOUDR  ·  Smart Branding", {
      x: 0.55, y: 6.72, w: 6, h: 0.28,
      fontSize: 11, bold: true, color: C.green, fontFace: "Arial",
    });
    s.addText("Estratégia · Design · Tecnologia", {
      x: 0.55, y: 6.72, w: 12.3, h: 0.28,
      fontSize: 10, color: C.gray, fontFace: "Arial", align: "right",
    });
  }

  const fileName = `LOUDR_BrandIntelligence_${(data.empresa || "empresa").replace(/[\s/\\:*?"<>|]+/g, "_")}.pptx`;
  await prs.writeFile({ fileName });
}
