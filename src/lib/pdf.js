import { jsPDF } from "jspdf";

// ── Design tokens ────────────────────────────────────────────────────────────
const C = {
  navy:    [8,   17,  31 ],
  navyMid: [14,  30,  48 ],
  pink:    [232, 24,  90 ],
  teal:    [13,  158, 122],
  amber:   [239, 159, 39 ],
  violet:  [127, 119, 221],
  white:   [255, 255, 255],
  offWhite:[242, 244, 247],
  gray100: [232, 236, 240],
  gray300: [176, 186, 203],
  gray500: [122, 136, 153],
  gray700: [61,  78,  96 ],
  border:  [226, 232, 240],
  pinkPale:[255, 240, 246],
  tealPale:[235, 249, 245],
  amberPale:[255, 251, 235],
};

const ML = 16;   // left margin
const MR = 194;  // right edge (210 - 16)
const CW = 178;  // content width

// ── Low-level helpers ────────────────────────────────────────────────────────
function fill(doc, c) { doc.setFillColor(...c); }
function clr(doc, c)  { doc.setTextColor(...c); }
function strk(doc, c) { doc.setDrawColor(...c); }
function box(doc, x, y, w, h, c) { fill(doc, c); doc.rect(x, y, w, h, "F"); }

function scoreColor(s) {
  return s >= 7 ? C.teal : s >= 4 ? C.amber : C.pink;
}

function scoreBar(doc, x, y, w, score) {
  box(doc, x, y, w, 3, C.gray100);
  box(doc, x, y, (score / 10) * w, 3, scoreColor(score));
}

function hline(doc, y, x1 = ML, x2 = MR) {
  strk(doc, C.border);
  doc.setLineWidth(0.3);
  doc.line(x1, y, x2, y);
}

function wrapText(doc, txt, x, y, maxW, lh = 4.8) {
  if (!txt) return y;
  const lines = doc.splitTextToSize(txt, maxW);
  doc.text(lines, x, y);
  return y + lines.length * lh;
}

function microLabel(doc, x, y, txt, c = C.gray500) {
  clr(doc, c);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.text(txt.toUpperCase(), x, y);
}

// ── Page chrome (top stripe + footer) ────────────────────────────────────────
function chrome(doc, empresa, pageNum, total) {
  // 2px pink top stripe
  box(doc, 0, 0, 210, 2, C.pink);
  // footer divider + text
  hline(doc, 284);
  clr(doc, C.gray500);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text(`BR4NDCODE  ·  ${empresa.toUpperCase()}`, ML, 289);
  doc.text(`${pageNum} / ${total}`, MR, 289, { align: "right" });
}

// ── Section heading (bold label + subtle divider) ─────────────────────────────
function section(doc, y, title, c = C.navy) {
  clr(doc, c);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(title, ML, y);
  return y + 7;
}

// ── Left-border highlight block ───────────────────────────────────────────────
function borderBlock(doc, y, accent, bgColor, labelTxt, bodyTxt, maxH = 20) {
  const lineCount = doc.splitTextToSize(bodyTxt || "", CW - 7).length;
  const h = Math.max(maxH, lineCount * 4.8 + 10);
  if (bgColor) box(doc, ML, y, CW, h, bgColor);
  box(doc, ML, y, 2, h, accent);
  microLabel(doc, ML + 5, y + 5, labelTxt);
  clr(doc, C.gray700);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const endY = wrapText(doc, bodyTxt || "", ML + 5, y + 10, CW - 7);
  return Math.max(y + h, endY) + 4;
}

// ── Main export ───────────────────────────────────────────────────────────────
export async function gerarPDF(data, meta) {
  const doc  = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const emp  = data.empresa || "Empresa";
  const TOTAL = 4;

  // ── PAGE 1 — Capa ──────────────────────────────────────────────────────────
  // Dark cover
  box(doc, 0, 0, 210, 297, C.navy);
  // Pink top bar
  box(doc, 0, 0, 210, 3, C.pink);

  // wordmark BR4NDCODE
  clr(doc, C.white);
  doc.setFont("helvetica", "black");
  doc.setFontSize(28);
  doc.text("BR4NDCODE", ML, 36);
  clr(doc, C.pink);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(28);
  doc.text(".", ML + 40, 36);
  clr(doc, C.gray500);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("BRAND INTELLIGENCE", ML, 43);

  // Thin divider
  strk(doc, C.navyMid);
  doc.setLineWidth(0.4);
  doc.line(ML, 50, MR, 50);

  // Company name
  clr(doc, C.white);
  doc.setFont("helvetica", "black");
  doc.setFontSize(26);
  const nameLines = doc.splitTextToSize(emp.toUpperCase(), 160);
  doc.text(nameLines, ML, 65);
  const afterName = 65 + nameLines.length * 9.5;

  // Sector + domain
  const metaStr = [data.setor, data.dominio].filter(Boolean).join("  ·  ");
  if (metaStr) {
    clr(doc, C.gray500);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(metaStr, ML, afterName + 4);
  }

  // Diagnostic phrase
  if (data.frase_diagnostico) {
    const qy = afterName + 16;
    box(doc, ML, qy, 3, 20, C.pink);
    clr(doc, C.gray300);
    doc.setFont("helvetica", "bolditalic");
    doc.setFontSize(11);
    const fLines = doc.splitTextToSize(`"${data.frase_diagnostico}"`, 165);
    doc.text(fLines, ML + 8, qy + 7);
  }

  // Score strip near bottom
  const scores = [
    { l: "Singularidade",  v: data.score_singularidade  },
    { l: "Consistência",   v: data.score_consistencia   },
    { l: "Posicionamento", v: data.score_posicionamento },
  ].filter(s => s.v != null);

  if (scores.length) {
    const sy = 228;
    strk(doc, C.navyMid);
    doc.setLineWidth(0.3);
    doc.line(ML, sy - 4, MR, sy - 4);
    const colW = CW / scores.length;
    scores.forEach((s, i) => {
      const x = ML + i * colW;
      const col = scoreColor(s.v);
      clr(doc, col);
      doc.setFont("helvetica", "black");
      doc.setFontSize(20);
      doc.text(`${s.v}`, x, sy + 8);
      clr(doc, C.gray500);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.text("/10", x + 13, sy + 8);
      doc.text(s.l, x, sy + 14);
      // bar
      box(doc, x, sy + 17, colW - 10, 2.5, C.navyMid);
      box(doc, x, sy + 17, (s.v / 10) * (colW - 10), 2.5, col);
    });
  }

  // Date footer
  const dateStr = meta?.created_at
    ? new Date(meta.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })
    : new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  clr(doc, C.gray500);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text(`Diagnóstico gerado em ${dateStr}  ·  loudr.com.br`, ML, 286);

  // ── PAGE 2 — Resumo + Identidade ──────────────────────────────────────────
  doc.addPage();
  box(doc, 0, 0, 210, 297, C.white);
  chrome(doc, emp, 2, TOTAL);

  let y = 12;

  // Executive summary
  y = section(doc, y, "Resumo executivo");
  if (data.resumo_executivo) {
    clr(doc, C.gray700);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    y = wrapText(doc, data.resumo_executivo, ML, y, CW, 5);
  }

  if (data.momento_atual) {
    y += 4;
    hline(doc, y); y += 7;
    y = section(doc, y, "Momento atual");
    clr(doc, C.gray700);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    y = wrapText(doc, data.momento_atual, ML, y, CW, 5);
  }

  y += 6; hline(doc, y); y += 7;
  y = section(doc, y, "Análise de identidade");

  if (data.identidade_declarada) {
    y = borderBlock(doc, y, C.teal, null, "Identidade declarada", data.identidade_declarada);
  }
  if (data.identidade_percebida) {
    y = borderBlock(doc, y, C.pink, null, "Identidade percebida", data.identidade_percebida);
  }
  if (data.gap_identidade) {
    y = borderBlock(doc, y, C.amber, C.amberPale, "Gap de identidade", data.gap_identidade);
  }
  if (data.territorios_possiveis?.length) {
    data.territorios_possiveis.forEach(t => {
      const body = [
        t.tese,
        t.sustenta && `Sustenta: ${t.sustenta}`,
        t.diferencia && `Diferencia: ${t.diferencia}`,
        t.fit_publico && `Fit com o público: ${t.fit_publico}`,
        t.tensao && `Tensão: ${t.tensao}`,
        t.exploracao && `A explorar: ${t.exploracao}`,
      ].filter(Boolean).join("  ·  ");
      const conf = t.confianca ? `  (${t.confianca})` : "";
      y = borderBlock(doc, y, C.teal, C.tealPale, `Território possível — ${t.nome || ""}${conf}`, body);
    });
  } else if (data.territorio_inexplorado) {
    y = borderBlock(doc, y, C.teal, C.tealPale, "Território inexplorado", data.territorio_inexplorado);
  }
  if (data.pergunta_provocativa) {
    y = borderBlock(doc, y, C.pink, C.pinkPale, "Se essa marca sumisse amanhã...", data.pergunta_provocativa);
  }

  // ── PAGE 3 — 4 Práticas Smart Branding ────────────────────────────────────
  doc.addPage();
  box(doc, 0, 0, 210, 297, C.white);
  chrome(doc, emp, 3, TOTAL);

  y = 12;
  y = section(doc, y, "Análise por prática — Smart Branding");

  const praticasDefs = [
    { key: "inteligencia_singularidade", label: "Inteligência & Singularidade", color: C.teal   },
    { key: "experiencia_expressao",      label: "Experiência & Expressão",      color: C.pink   },
    { key: "plataformas_ecossistemas",   label: "Plataformas & Ecossistemas",   color: C.violet },
    { key: "futuro_escala",              label: "Futuro & Escala",              color: C.amber  },
  ];

  praticasDefs.forEach(p => {
    const d = data.praticas_loudr?.[p.key];
    if (!d) return;

    // Practice title + score on the same line
    clr(doc, p.color);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.text(p.label, ML, y);

    if (d.score != null) {
      const col = scoreColor(d.score);
      clr(doc, col);
      doc.setFont("helvetica", "black");
      doc.setFontSize(11);
      doc.text(`${d.score}/10`, MR, y, { align: "right" });
      scoreBar(doc, ML, y + 2, CW, d.score);
      y += 9;
    } else {
      y += 6;
    }

    if (d.diagnostico) {
      clr(doc, C.gray700);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      y = wrapText(doc, d.diagnostico, ML, y, CW, 4.8);
    }

    if (d.oportunidade) {
      y += 2;
      box(doc, ML, y, 2, 10, C.teal);
      microLabel(doc, ML + 5, y + 4, "Caminho a explorar");
      clr(doc, C.gray700);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8.5);
      y = wrapText(doc, d.oportunidade, ML + 5, y + 8, CW - 5, 4.5);
    }

    y += 4;
    hline(doc, y - 1);
    y += 5;
  });

  // ── PAGE 4 — Oportunidades + Concorrentes + Quick Wins ────────────────────
  doc.addPage();
  box(doc, 0, 0, 210, 297, C.white);
  chrome(doc, emp, 4, TOTAL);

  y = 12;

  if (data.oportunidades?.length) {
    y = section(doc, y, "Oportunidades estratégicas");
    data.oportunidades.forEach((o, i) => {
      // Number dot
      fill(doc, C.teal);
      doc.circle(ML + 3, y + 3.5, 3, "F");
      clr(doc, C.white);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.5);
      doc.text(`${i + 1}`, ML + 3, y + 5, { align: "center" });

      clr(doc, C.navy);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.text(o.titulo || "", ML + 9, y + 5);
      y += 9;

      if (o.descricao) {
        clr(doc, C.gray700);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        y = wrapText(doc, o.descricao, ML + 9, y, CW - 9, 4.8);
      }
      y += 3;
    });
    hline(doc, y); y += 7;
  }

  if (data.concorrentes?.length) {
    y = section(doc, y, "Contexto competitivo");
    data.concorrentes.forEach((c, i) => {
      if (i > 0) { hline(doc, y - 1); }
      const ameacaCol = c.ameaca === "alta" ? C.pink : c.ameaca === "media" ? C.amber : C.teal;
      clr(doc, C.navy);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text(c.nome || "-", ML, y + 5);
      clr(doc, ameacaCol);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.text((c.ameaca || "").toUpperCase(), MR, y + 5, { align: "right" });
      y += 8;
      clr(doc, C.gray500);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      y = wrapText(doc, c.diferencial || "", ML, y, CW, 4.5);
      if (c.sinal) {
        clr(doc, C.gray500);
        doc.setFont("helvetica", "italic");
        doc.setFontSize(8);
        y = wrapText(doc, `> ${c.sinal}`, ML + 3, y + 1, CW - 3, 4.5);
      }
      y += 3;
    });
    hline(doc, y); y += 7;
  }

  if (data.quick_wins?.length) {
    y = section(doc, y, "Quick wins");
    data.quick_wins.forEach(w => {
      clr(doc, C.teal);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text(">", ML, y + 4);
      clr(doc, C.gray700);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      y = wrapText(doc, w, ML + 7, y + 4, CW - 7, 4.8);
      y += 2;
    });
    y += 4;
  }

  if (data.porta_entrada_loudr) {
    y = borderBlock(doc, y, C.teal, C.tealPale, "Por onde começar a explorar", data.porta_entrada_loudr);
  }

  // CTA block (pinned near bottom)
  const ctaY = 258;
  box(doc, ML, ctaY, CW, 18, C.navy);
  box(doc, ML, ctaY, 3, 18, C.pink);
  clr(doc, C.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.text("Pronto para transformar esses insights em ação?", ML + 8, ctaY + 7);
  clr(doc, C.gray300);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("br4ndcode.com  ·  Diagnóstico gerado por BR4NDCODE", ML + 8, ctaY + 13);

  // ── Save ──────────────────────────────────────────────────────────────────
  const slug = emp.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  doc.save(`loudr-${slug}.pdf`);
}
