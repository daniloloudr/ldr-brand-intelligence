import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import { GlobalStyle } from "../components/GlobalStyle";
import logoNegativa from "../assets/negativa.svg";

const SETORES = ["Tecnologia","Saúde","Educação","Finanças","Varejo","Fashion","Indústria","Serviços","Alimentação","Imóveis","Logística","Mídia","Energia","Agronegócio","Outro"];
const PORTES  = ["Startup","PME","Médio porte","Grande empresa"];
const BOTICARIO_REPORT_URL = "/#/relatorio/81a4b269-0384-4fdb-b891-ea60637aa16f";

const CSS = `
  *, *::before, *::after { box-sizing: border-box; }

  :root {
    --navy:      #08111F;
    --navy-mid:  #0E1E30;
    --navy-surf: #122033;
    --navy-elev: #1B2F45;
    --border:    #1E3348;
    --pink:      #E8185A;
    --pink-dim:  #C01048;
    --pink-muted:rgba(232,24,90,0.12);
    --teal:      #0D9E7A;
    --teal-light:#3DD4A8;
    --teal-muted:rgba(13,158,122,0.12);
    --amber:     #EF9F27;
    --amber-muted:rgba(239,159,39,0.12);
    --violet:    #7F77DD;
    --white:     #FFFFFF;
    --gray-100:  #E8ECF0;
    --gray-300:  #B0BACB;
    --gray-500:  #7A8899;
    --gray-700:  #3D4E60;
    --F: 'Cairo', sans-serif;
  }

  html { scroll-behavior: smooth; }
  body { font-family:var(--F); color:#fff; background:var(--navy); overflow-x:hidden; }
  ::selection { background:var(--pink); color:#fff; }

  /* ─── NAV ─── */
  .pp-nav {
    position:fixed; top:0; left:0; right:0; z-index:100;
    height:72px; padding:0 64px;
    display:flex; align-items:center; justify-content:space-between;
    background:rgba(8,17,31,0.92);
    backdrop-filter:blur(14px);
    border-bottom:1px solid var(--border);
  }
  .pp-logo { display:flex; align-items:center; gap:12px; }
  .pp-logo-name { font-size:20px; font-weight:900; color:#fff; letter-spacing:-0.03em; text-transform:uppercase; font-family:var(--F); }
  .pp-logo-name span { color:var(--pink); }
  .pp-logo-div { width:1px; height:18px; background:var(--border); flex-shrink:0; }
  .pp-logo-sub { font-size:10px; font-weight:700; letter-spacing:0.18em; text-transform:uppercase; color:var(--gray-500); font-family:var(--F); }
  .pp-nav-cta {
    background:var(--pink); color:#fff; border:none;
    padding:12px 24px; font-size:11px; font-weight:700;
    letter-spacing:0.14em; text-transform:uppercase; font-family:var(--F);
    cursor:pointer; transition:background 0.2s;
  }
  .pp-nav-cta:hover { background:var(--pink-dim); }

  /* ─── HERO ─── */
  .pp-hero {
    min-height:100vh;
    display:grid; grid-template-columns:1.1fr 0.9fr;
    align-items:center;
    padding:120px 64px 80px; gap:64px;
    position:relative; overflow:hidden;
  }
  .pp-hero-bg {
    position:absolute; inset:0; pointer-events:none;
    background-image:
      linear-gradient(rgba(232,24,90,0.025) 1px, transparent 1px),
      linear-gradient(90deg, rgba(232,24,90,0.025) 1px, transparent 1px);
    background-size:60px 60px;
  }
  .pp-eyebrow {
    display:inline-flex; align-items:center; gap:12px;
    font-size:11px; font-weight:700; letter-spacing:0.22em; text-transform:uppercase;
    color:var(--pink); margin-bottom:28px; font-family:var(--F);
  }
  .pp-eyebrow::before { content:''; display:block; width:24px; height:2px; background:var(--pink); }
  .pp-eyebrow.teal { color:var(--teal); }
  .pp-eyebrow.teal::before { background:var(--teal); }
  .pp-h1 {
    font-size:clamp(40px,5.5vw,72px); font-weight:900; line-height:0.95;
    letter-spacing:-0.04em; text-transform:uppercase; color:#fff;
    margin-bottom:24px; font-family:var(--F);
  }
  .pp-h1 .accent { color:var(--pink); }
  .pp-sub {
    font-size:17px; color:var(--gray-300); line-height:1.65;
    max-width:520px; margin-bottom:40px; font-family:var(--F);
  }
  .pp-sub strong { color:#fff; font-weight:700; }
  .pp-cta-group { display:flex; gap:12px; align-items:center; flex-wrap:wrap; margin-bottom:56px; }
  .pp-btn-primary {
    background:var(--pink); color:#fff; border:none;
    padding:17px 36px; font-size:12px; font-weight:700;
    letter-spacing:0.14em; text-transform:uppercase; font-family:var(--F);
    cursor:pointer; display:inline-flex; align-items:center; gap:10px;
    transition:background 0.2s, transform 0.2s;
  }
  .pp-btn-primary:hover { background:var(--pink-dim); }
  .pp-btn-outline {
    background:transparent; color:#fff; border:1.5px solid var(--border);
    padding:16px 28px; font-size:12px; font-weight:700;
    letter-spacing:0.14em; text-transform:uppercase; font-family:var(--F);
    cursor:pointer; transition:border-color 0.2s, color 0.2s;
  }
  .pp-btn-outline:hover { border-color:var(--pink); color:var(--pink); }

  /* Stats bar */
  .pp-stats-bar {
    display:grid; grid-template-columns:repeat(4,1fr);
    border-top:1px solid var(--border); border-bottom:1px solid var(--border);
    max-width:560px;
  }
  .pp-stat-item {
    padding:18px 0; border-right:1px solid var(--border);
  }
  .pp-stat-item:last-child { border-right:none; }
  .pp-stat-item:not(:first-child) { padding-left:18px; }
  .pp-stat-num { font-size:26px; font-weight:900; color:#fff; letter-spacing:-0.03em; display:block; margin-bottom:5px; font-family:var(--F); }
  .pp-stat-num span { color:var(--pink); }
  .pp-stat-lbl { font-size:10px; font-weight:700; letter-spacing:0.14em; text-transform:uppercase; color:var(--gray-500); font-family:var(--F); }

  /* Hero scroll anchor */
  .pp-scroll-anchor {
    display:none;
  }

  /* Hero visual (right column) */
  .pp-hero-visual {
    position:relative; z-index:2; display:flex; align-items:center; justify-content:center;
  }
  .pp-hero-card-wrap {
    position:relative; width:100%; max-width:440px;
  }
  .pp-hero-sq-pink {
    position:absolute; width:120px; height:120px; background:var(--pink);
    bottom:-24px; right:-24px; z-index:0; opacity:0.9;
  }
  .pp-hero-sq-teal {
    position:absolute; width:64px; height:64px; background:var(--teal);
    top:-24px; left:-24px; z-index:0;
  }
  .pp-hero-card {
    position:relative; z-index:1;
    background:var(--navy-mid); border:1px solid var(--border);
  }
  .pp-hero-tag {
    position:absolute; bottom:20px; left:20px; z-index:2;
    padding:8px 14px; background:rgba(8,17,31,0.9);
    backdrop-filter:blur(8px); border:1px solid var(--border);
    font-size:10px; font-weight:700; letter-spacing:0.16em; text-transform:uppercase;
    color:#fff; display:flex; align-items:center; gap:8px; font-family:var(--F);
  }
  .pp-live-dot {
    width:7px; height:7px; background:var(--teal-light); border-radius:50%;
    animation:pulseDot 1.6s ease infinite;
  }
  @keyframes pulseDot {
    0%,100%{opacity:1; box-shadow:0 0 0 0 rgba(61,212,168,0.6);}
    50%{opacity:0.5; box-shadow:0 0 0 8px rgba(61,212,168,0);}
  }

  /* Mock inside hero */
  .pp-hm-header {
    background:var(--navy); padding:14px 18px;
    border-bottom:1px solid var(--border);
    display:flex; align-items:center; justify-content:space-between;
  }
  .pp-hm-header-left { display:flex; align-items:center; gap:8px; }
  .pp-hm-sq { width:8px; height:8px; background:var(--pink); }
  .pp-hm-title { font-size:10px; font-weight:700; letter-spacing:0.16em; text-transform:uppercase; color:#fff; font-family:var(--F); }
  .pp-hm-status { font-size:9px; font-weight:700; letter-spacing:0.16em; text-transform:uppercase; color:var(--teal-light); display:flex; align-items:center; gap:6px; font-family:var(--F); }
  .pp-hm-body { padding:20px 18px; }
  .pp-hm-meta { font-size:9px; font-weight:700; letter-spacing:0.2em; color:var(--gray-700); text-transform:uppercase; margin-bottom:6px; font-family:var(--F); }
  .pp-hm-company { font-size:22px; font-weight:900; color:#fff; margin-bottom:3px; text-transform:uppercase; letter-spacing:-0.02em; line-height:1; font-family:var(--F); }
  .pp-hm-submeta { font-size:11px; color:var(--gray-500); margin-bottom:18px; font-family:var(--F); }
  .pp-hm-quote { border-left:3px solid var(--pink); padding:4px 0 4px 14px; font-size:12px; color:var(--gray-100); line-height:1.55; margin-bottom:18px; font-weight:500; font-family:var(--F); }
  .pp-hm-scores { display:grid; grid-template-columns:repeat(3,1fr); gap:2px; background:var(--border); margin-bottom:14px; border:1px solid var(--border); }
  .pp-hm-score { background:var(--navy); padding:12px 12px; }
  .pp-hm-score-label { font-size:9px; font-weight:700; letter-spacing:0.14em; text-transform:uppercase; color:var(--gray-500); margin-bottom:7px; font-family:var(--F); }
  .pp-hm-score-bar { height:3px; background:rgba(255,255,255,0.08); overflow:hidden; margin-bottom:5px; }
  .pp-hm-score-fill { height:100%; }
  .pp-hm-score-num { font-size:16px; font-weight:900; letter-spacing:-0.02em; font-family:var(--F); }
  .pp-hm-score-num span { font-size:10px; color:var(--gray-700); font-weight:700; }
  .pp-hm-tags { display:flex; flex-wrap:wrap; gap:4px; }
  .pp-hm-tag { font-size:9px; font-weight:700; padding:4px 8px; letter-spacing:0.1em; text-transform:uppercase; font-family:var(--F); }

  @media (max-width:980px) {
    .pp-hero { grid-template-columns:1fr; padding:100px 24px 60px; gap:48px; }
    .pp-hero-visual { display:none; }
    .pp-stats-bar { grid-template-columns:repeat(2,1fr); max-width:100%; }
    .pp-stat-item:nth-child(2) { border-right:none; }
    .pp-stat-item:nth-child(3) { padding-left:0; border-bottom:none; }
    .pp-stat-item:nth-child(3), .pp-stat-item:nth-child(4) { border-top:1px solid var(--border); }
  }

  /* ─── SECTION COMMONS ─── */
  .pp-section-inner { max-width:1200px; margin:0 auto; }
  .pp-section-eyebrow {
    display:inline-flex; align-items:center; gap:12px;
    font-size:11px; font-weight:700; letter-spacing:0.22em; text-transform:uppercase;
    color:var(--pink); margin-bottom:20px; font-family:var(--F);
  }
  .pp-section-eyebrow::before { content:''; display:block; width:24px; height:2px; background:var(--pink); }
  .pp-section-eyebrow.teal { color:var(--teal); }
  .pp-section-eyebrow.teal::before { background:var(--teal); }
  .pp-section-eyebrow.center { justify-content:center; }

  /* ─── PAIN ─── */
  .pp-pain { background:var(--navy-mid); padding:120px 64px; position:relative; }
  .pp-pain-head {
    display:grid; grid-template-columns:1.4fr 1fr;
    gap:64px; align-items:end; margin-bottom:64px;
  }
  .pp-pain-headline {
    font-size:clamp(32px,4.4vw,56px); font-weight:900; color:#fff;
    line-height:1; letter-spacing:-0.03em; text-transform:uppercase; font-family:var(--F);
  }
  .pp-pain-headline span { color:var(--pink); }
  .pp-pain-sub {
    font-size:16px; color:var(--gray-300); line-height:1.65;
    border-left:2px solid var(--pink); padding-left:20px; font-family:var(--F);
  }
  .pp-pain-cards {
    display:grid; grid-template-columns:repeat(3,1fr);
    gap:2px; background:var(--border); border:1px solid var(--border);
  }
  .pp-pain-card {
    background:var(--navy); padding:32px 28px;
    position:relative; overflow:hidden; transition:background 0.25s;
  }
  .pp-pain-card:hover { background:var(--navy-surf); }
  .pp-pain-card::before {
    content:''; position:absolute; top:0; left:0; width:100%; height:3px;
    background:var(--pink); transform:scaleX(0); transform-origin:left; transition:transform 0.4s ease;
  }
  .pp-pain-card:hover::before { transform:scaleX(1); }
  .pp-pain-num {
    font-size:11px; font-weight:700; letter-spacing:0.2em; color:var(--gray-700);
    margin-bottom:24px; display:flex; align-items:center; gap:10px; font-family:var(--F);
    text-transform:uppercase;
  }
  .pp-pain-num::before { content:''; width:8px; height:8px; background:var(--pink); flex-shrink:0; }
  .pp-pain-card:hover .pp-pain-num { color:var(--gray-300); }
  .pp-pain-title {
    font-size:17px; font-weight:800; color:#fff; margin-bottom:12px;
    line-height:1.15; text-transform:uppercase; letter-spacing:-0.01em; font-family:var(--F);
  }
  .pp-pain-text { font-size:13px; color:var(--gray-500); line-height:1.65; font-family:var(--F); }

  @media (max-width:980px) {
    .pp-pain { padding:80px 24px; }
    .pp-pain-head { grid-template-columns:1fr; gap:24px; }
    .pp-pain-cards { grid-template-columns:repeat(2,1fr); }
  }
  @media (max-width:560px) { .pp-pain-cards { grid-template-columns:1fr; } }

  /* ─── HOW ─── */
  .pp-how { background:var(--navy); padding:120px 64px; }
  .pp-how-grid {
    display:grid; grid-template-columns:1fr 1fr;
    gap:80px; align-items:center; max-width:1200px; margin:0 auto;
  }
  .pp-how-headline {
    font-size:clamp(32px,3.6vw,48px); font-weight:900; color:#fff;
    text-transform:uppercase; letter-spacing:-0.03em; line-height:1;
    margin-bottom:20px; font-family:var(--F);
  }
  .pp-how-headline span { color:var(--pink); }
  .pp-how-sub { font-size:16px; color:var(--gray-300); line-height:1.7; margin-bottom:48px; max-width:480px; font-family:var(--F); }
  .pp-pratica-list { display:flex; flex-direction:column; gap:0; border-top:1px solid var(--border); }
  .pp-pratica-item {
    display:grid; grid-template-columns:32px 1fr 28px;
    gap:20px; align-items:center;
    padding:22px 4px; border-bottom:1px solid var(--border);
    transition:padding 0.25s, background 0.25s; cursor:default;
  }
  .pp-pratica-item:hover { padding-left:16px; background:linear-gradient(90deg,rgba(232,24,90,0.05),transparent 60%); }
  .pp-pratica-num { font-size:10px; font-weight:700; letter-spacing:0.2em; color:var(--gray-700); font-family:var(--F); font-variant-numeric:tabular-nums; }
  .pp-pratica-name { font-size:14px; font-weight:800; color:#fff; text-transform:uppercase; letter-spacing:0.01em; margin-bottom:4px; font-family:var(--F); }
  .pp-pratica-desc { font-size:13px; color:var(--gray-500); line-height:1.55; font-family:var(--F); }
  .pp-pratica-sq { width:28px; height:28px; flex-shrink:0; }

  /* Mock report */
  .pp-report-mock { background:var(--navy-mid); border:1px solid var(--border); position:relative; }
  .pp-report-mock::before {
    content:''; position:absolute; top:-8px; left:-8px;
    width:48px; height:48px; background:var(--pink); z-index:0;
  }
  .pp-report-mock-inner {
    position:relative; z-index:1; background:var(--navy-mid);
    margin:14px; border:1px solid var(--border);
  }
  .pp-mock-header {
    background:var(--navy); padding:14px 18px;
    border-bottom:1px solid var(--border);
    display:flex; align-items:center; justify-content:space-between;
  }
  .pp-mock-header-left { display:flex; align-items:center; gap:8px; }
  .pp-mock-sq-tiny { width:8px; height:8px; background:var(--pink); }
  .pp-mock-header-title { font-size:10px; font-weight:700; letter-spacing:0.16em; text-transform:uppercase; color:#fff; font-family:var(--F); }
  .pp-mock-status { font-size:9px; font-weight:700; letter-spacing:0.16em; text-transform:uppercase; color:var(--teal-light); display:flex; align-items:center; gap:6px; font-family:var(--F); }
  .pp-mock-body { padding:20px 18px; }
  .pp-mock-meta-row { font-size:9px; font-weight:700; letter-spacing:0.2em; color:var(--gray-700); text-transform:uppercase; margin-bottom:6px; font-family:var(--F); }
  .pp-mock-company { font-size:22px; font-weight:900; color:#fff; margin-bottom:3px; text-transform:uppercase; letter-spacing:-0.02em; line-height:1; font-family:var(--F); }
  .pp-mock-meta { font-size:11px; color:var(--gray-500); margin-bottom:18px; font-family:var(--F); }
  .pp-mock-quote { border-left:3px solid var(--pink); padding:4px 0 4px 14px; font-size:12px; color:var(--gray-100); line-height:1.55; margin-bottom:18px; font-weight:500; font-family:var(--F); }
  .pp-mock-scores { display:grid; grid-template-columns:repeat(3,1fr); gap:2px; background:var(--border); margin-bottom:14px; border:1px solid var(--border); }
  .pp-mock-score { background:var(--navy); padding:12px 12px; }
  .pp-mock-score-label { font-size:9px; font-weight:700; letter-spacing:0.14em; text-transform:uppercase; color:var(--gray-500); margin-bottom:7px; font-family:var(--F); }
  .pp-mock-score-bar { height:3px; background:rgba(255,255,255,0.08); overflow:hidden; margin-bottom:5px; }
  .pp-mock-score-fill { height:100%; }
  .pp-mock-score-num { font-size:16px; font-weight:900; letter-spacing:-0.02em; font-family:var(--F); }
  .pp-mock-score-num span { font-size:10px; color:var(--gray-700); font-weight:700; }
  .pp-mock-tags { display:flex; flex-wrap:wrap; gap:4px; margin-bottom:16px; }
  .pp-mock-tag { font-size:9px; font-weight:700; padding:4px 8px; letter-spacing:0.1em; text-transform:uppercase; font-family:var(--F); }
  .pp-mock-qw-label { font-size:9px; font-weight:700; letter-spacing:0.2em; text-transform:uppercase; color:var(--pink); margin-bottom:10px; font-family:var(--F); border-top:1px solid var(--border); padding-top:16px; }
  .pp-mock-win { font-size:12px; color:var(--gray-100); margin-bottom:7px; display:flex; gap:10px; align-items:flex-start; line-height:1.45; font-family:var(--F); }
  .pp-mock-win-num { font-size:9px; font-weight:700; color:var(--pink); letter-spacing:0.1em; padding-top:2px; flex-shrink:0; }

  @media (max-width:980px) {
    .pp-how { padding:80px 24px; }
    .pp-how-grid { grid-template-columns:1fr; gap:48px; }
  }

  /* ─── PROOF ─── */
  .pp-proof { background:var(--navy-mid); padding:120px 64px; }
  .pp-proof-head { text-align:center; max-width:720px; margin:0 auto 64px; }
  .pp-proof-headline {
    font-size:clamp(28px,3.6vw,48px); font-weight:900; color:#fff;
    text-transform:uppercase; letter-spacing:-0.03em; line-height:1;
    margin-bottom:20px; font-family:var(--F);
  }
  .pp-proof-headline span { color:var(--pink); }
  .pp-proof-sub { font-size:16px; color:var(--gray-300); line-height:1.65; max-width:520px; margin:0 auto; font-family:var(--F); }
  .pp-proof-items {
    display:grid; grid-template-columns:repeat(4,1fr);
    gap:2px; background:var(--border); border:1px solid var(--border);
    max-width:1200px; margin:0 auto;
  }
  .pp-proof-item {
    background:var(--navy); padding:32px 24px;
    position:relative; transition:background 0.25s;
  }
  .pp-proof-item:hover { background:var(--navy-surf); }
  .pp-proof-icon-wrap {
    width:44px; height:44px; display:flex; align-items:center;
    justify-content:center; margin-bottom:22px; position:relative;
  }
  .pp-proof-icon-wrap::before {
    content:''; position:absolute; top:0; left:0;
    width:12px; height:12px; background:var(--pink);
  }
  .pp-proof-icon-svg { width:30px; height:30px; color:#fff; position:relative; z-index:1; margin-top:8px; margin-left:8px; }
  .pp-proof-title { font-size:13px; font-weight:800; color:#fff; text-transform:uppercase; letter-spacing:0.02em; margin-bottom:10px; line-height:1.2; font-family:var(--F); }
  .pp-proof-text { font-size:13px; color:var(--gray-500); line-height:1.6; font-family:var(--F); }
  .pp-proof-sources { margin-top:10px; font-size:11px; font-family:var(--F); line-height:1.8; }

  @media (max-width:980px) {
    .pp-proof { padding:80px 24px; }
    .pp-proof-items { grid-template-columns:repeat(2,1fr); }
  }
  @media (max-width:560px) { .pp-proof-items { grid-template-columns:1fr; } }

  /* ─── SOCIAL PROOF ─── */
  .pp-social-proof { background:var(--navy); padding:56px 64px; border-top:1px solid var(--border); border-bottom:1px solid var(--border); }
  .pp-social-inner { max-width:1200px; margin:0 auto; display:flex; align-items:center; gap:0; }
  .pp-social-label { font-size:10px; font-weight:700; letter-spacing:0.2em; text-transform:uppercase; color:var(--pink); font-family:var(--F); margin-right:48px; flex-shrink:0; }
  .pp-social-stats { display:flex; gap:0; flex:1; border-left:1px solid var(--border); }
  .pp-social-stat { padding:0 32px; border-right:1px solid var(--border); }
  .pp-social-stat:last-child { border-right:none; }
  .pp-social-num { font-size:32px; font-weight:900; color:#fff; letter-spacing:-0.03em; display:block; margin-bottom:4px; font-family:var(--F); }
  .pp-social-lbl { font-size:11px; color:var(--gray-500); font-family:var(--F); }

  @media (max-width:768px) {
    .pp-social-proof { padding:40px 24px; }
    .pp-social-inner { flex-direction:column; align-items:flex-start; gap:24px; }
    .pp-social-label { margin-right:0; }
    .pp-social-stats { border-left:none; padding-left:0; gap:32px; flex-wrap:wrap; }
    .pp-social-stat { padding:0; border-right:none; }
  }

  /* ─── EXAMPLE ─── */
  .pp-example { background:var(--navy-mid); padding:80px 64px; position:relative; }
  .pp-example-inner { max-width:680px; margin:0 auto; text-align:center; }
  .pp-example-headline {
    font-size:clamp(26px,4vw,40px); font-weight:900; color:#fff;
    text-transform:uppercase; letter-spacing:-0.03em; line-height:1.05;
    margin-bottom:14px; font-family:var(--F);
  }
  .pp-example-sub { font-size:16px; color:var(--gray-300); line-height:1.65; margin-bottom:36px; font-family:var(--F); }
  .pp-example-card {
    background:var(--navy); border:1px solid var(--border);
    padding:28px; text-align:left; position:relative; overflow:hidden;
  }
  .pp-example-card::before {
    content:''; position:absolute; top:0; left:0; right:0;
    height:3px; background:var(--teal);
  }
  .pp-example-label { font-size:10px; font-weight:700; letter-spacing:0.18em; text-transform:uppercase; color:var(--teal); margin-bottom:14px; display:flex; align-items:center; gap:8px; font-family:var(--F); }
  .pp-example-label::before { content:''; width:6px; height:6px; background:var(--teal); flex-shrink:0; }
  .pp-example-company { font-size:22px; font-weight:900; color:#fff; margin-bottom:3px; text-transform:uppercase; letter-spacing:-0.02em; font-family:var(--F); }
  .pp-example-meta { font-size:13px; color:var(--gray-500); margin-bottom:18px; font-family:var(--F); }
  .pp-example-quote { border-left:3px solid var(--teal); padding-left:16px; font-size:14px; color:var(--gray-100); font-style:italic; line-height:1.65; margin-bottom:22px; font-family:var(--F); }
  .pp-example-scores { display:grid; grid-template-columns:1fr 1fr; gap:2px; background:var(--border); margin-bottom:22px; border:1px solid var(--border); }
  .pp-example-score { background:var(--navy-mid); padding:14px 14px; }
  .pp-example-score-label { font-size:9px; font-weight:700; letter-spacing:0.14em; text-transform:uppercase; color:var(--gray-500); margin-bottom:7px; font-family:var(--F); }
  .pp-example-score-bar { height:3px; background:rgba(255,255,255,0.08); overflow:hidden; margin-bottom:5px; }
  .pp-example-score-fill { height:100%; }
  .pp-example-score-num { font-size:16px; font-weight:900; letter-spacing:-0.02em; font-family:var(--F); }
  .pp-example-btn {
    display:inline-flex; align-items:center; gap:10px;
    background:var(--teal); color:#fff; padding:12px 22px;
    font-size:12px; font-weight:700; letter-spacing:0.12em; text-transform:uppercase;
    font-family:var(--F); text-decoration:none; transition:background 0.2s;
  }
  .pp-example-btn:hover { background:var(--teal); opacity:0.85; }
  .pp-example-disclaimer { font-size:11px; color:var(--gray-500); margin-top:10px; line-height:1.5; font-family:var(--F); }

  @media (max-width:768px) { .pp-example { padding:60px 24px; } }

  /* ─── FORM ─── */
  .pp-form-section {
    background:var(--navy); padding:120px 64px;
    position:relative; overflow:hidden;
  }
  .pp-form-section::before {
    content:''; position:absolute; top:0; right:0;
    width:200px; height:200px; background:var(--pink); opacity:0.08;
  }
  .pp-form-section::after {
    content:''; position:absolute; bottom:0; left:0;
    width:140px; height:140px; background:var(--teal); opacity:0.08;
  }
  .pp-form-inner { max-width:720px; margin:0 auto; position:relative; z-index:2; }
  .pp-form-head { text-align:center; margin-bottom:56px; }
  .pp-form-headline {
    font-size:clamp(32px,4vw,56px); font-weight:900; color:#fff;
    text-transform:uppercase; letter-spacing:-0.03em; line-height:1;
    margin-bottom:18px; font-family:var(--F);
  }
  .pp-form-headline span { color:var(--pink); }
  .pp-form-sub { font-size:16px; color:var(--gray-300); line-height:1.65; max-width:480px; margin:0 auto; font-family:var(--F); }
  .pp-form-box {
    background:var(--navy-mid); border:1px solid var(--border);
    padding:48px 48px 40px; position:relative;
  }
  .pp-form-box::before {
    content:''; position:absolute; top:-1px; left:-1px;
    width:28px; height:28px; background:var(--pink);
  }
  .pp-form-row { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
  .pp-field { margin-bottom:18px; }
  .pp-field label {
    display:block; font-size:10px; font-weight:700; letter-spacing:0.16em;
    text-transform:uppercase; color:var(--gray-500); margin-bottom:8px; font-family:var(--F);
  }
  .pp-field label .opt { font-weight:400; text-transform:none; font-size:10px; letter-spacing:0; color:var(--gray-700); }
  .pp-field input,
  .pp-field select,
  .pp-field textarea {
    width:100%; padding:13px 16px; font-size:14px; font-family:var(--F);
    background:var(--navy); border:1.5px solid var(--border);
    color:#fff; outline:none; border-radius:0;
    transition:border-color 0.2s, background 0.2s; appearance:none;
  }
  .pp-field select {
    background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8' fill='none'><path d='M1 1.5L6 6.5L11 1.5' stroke='%237A8899' stroke-width='1.5' stroke-linecap='round'/></svg>");
    background-repeat:no-repeat; background-position:right 14px center; padding-right:40px;
  }
  .pp-field input::placeholder, .pp-field textarea::placeholder { color:var(--gray-700); }
  .pp-field input:focus, .pp-field select:focus, .pp-field textarea:focus {
    border-color:var(--pink); background:var(--navy-mid);
  }
  .pp-field select option { background:var(--navy-mid); color:#fff; }
  .pp-field textarea { resize:vertical; min-height:110px; line-height:1.55; }
  .pp-form-urgency { font-size:13px; color:var(--amber); margin-bottom:16px; line-height:1.55; font-family:var(--F); }
  .pp-form-submit {
    width:100%; background:var(--pink); color:#fff; border:none;
    padding:18px; font-size:13px; font-weight:700;
    letter-spacing:0.16em; text-transform:uppercase; font-family:var(--F);
    cursor:pointer; margin-top:4px; transition:background 0.2s, transform 0.2s;
    display:flex; align-items:center; justify-content:center; gap:12px;
  }
  .pp-form-submit:hover { background:var(--pink-dim); }
  .pp-form-submit:active { transform:scale(0.99); }
  .pp-form-submit:disabled { background:var(--navy-elev); cursor:not-allowed; color:var(--gray-500); }
  .pp-form-disclaimer { text-align:center; font-size:11px; color:var(--gray-500); margin-top:16px; line-height:1.6; letter-spacing:0.02em; font-family:var(--F); }
  .pp-form-error {
    background:rgba(232,24,90,0.1); border:1px solid rgba(232,24,90,0.3);
    padding:10px 14px; margin-bottom:16px; font-size:13px; color:#F4819A; font-family:var(--F);
  }

  /* Success */
  .pp-success { text-align:center; padding:32px 8px; }
  .pp-success-icon-wrap { position:relative; width:72px; height:72px; margin:0 auto 28px; }
  .pp-success-icon {
    position:absolute; inset:0; background:var(--pink);
    display:flex; align-items:center; justify-content:center; color:#fff;
  }
  .pp-success-icon-wrap::before {
    content:''; position:absolute; top:-8px; left:-8px;
    width:22px; height:22px; background:var(--teal);
  }
  .pp-success-title { font-size:26px; font-weight:900; color:#fff; margin-bottom:12px; text-transform:uppercase; letter-spacing:-0.02em; font-family:var(--F); }
  .pp-success-sub { font-size:15px; color:var(--gray-300); line-height:1.6; max-width:400px; margin:0 auto 24px; font-family:var(--F); }
  .pp-next-steps { padding:22px; background:var(--navy); border:1px solid var(--border); text-align:left; }
  .pp-next-steps-label {
    font-size:10px; font-weight:700; letter-spacing:0.18em; text-transform:uppercase;
    color:var(--pink); margin-bottom:14px; display:flex; align-items:center; gap:10px; font-family:var(--F);
  }
  .pp-next-steps-label::before { content:''; width:12px; height:12px; background:var(--pink); }
  .pp-next-step { font-size:13px; color:var(--gray-300); margin-bottom:8px; display:flex; gap:14px; align-items:flex-start; line-height:1.5; font-family:var(--F); }
  .pp-next-step:last-child { margin-bottom:0; }
  .pp-next-step-num { font-size:11px; font-weight:700; letter-spacing:0.1em; color:var(--pink); flex-shrink:0; padding-top:2px; font-variant-numeric:tabular-nums; }

  @media (max-width:768px) {
    .pp-form-section { padding:80px 24px; }
    .pp-form-box { padding:28px 20px; }
    .pp-form-row { grid-template-columns:1fr; }
  }

  /* ─── FAQ ─── */
  .pp-faq { background:var(--navy-mid); padding:80px 64px; border-top:1px solid var(--border); }
  .pp-faq-inner { max-width:640px; margin:0 auto; }
  .pp-faq-headline { font-size:clamp(22px,3vw,32px); font-weight:900; color:#fff; letter-spacing:-0.02em; text-transform:uppercase; margin-bottom:28px; font-family:var(--F); }
  .pp-faq-item { background:var(--navy); border:1px solid var(--border); padding:22px 24px; margin-bottom:2px; }
  .pp-faq-q { font-size:14px; font-weight:800; color:#fff; margin-bottom:8px; line-height:1.3; font-family:var(--F); display:flex; gap:12px; align-items:flex-start; text-transform:uppercase; letter-spacing:0.01em; }
  .pp-faq-q-arrow { color:var(--pink); flex-shrink:0; font-weight:900; }
  .pp-faq-a { font-size:14px; color:var(--gray-300); line-height:1.65; font-family:var(--F); padding-left:22px; }
  .pp-faq-cta {
    display:block; width:100%; margin-top:24px;
    background:var(--pink); color:#fff; border:none;
    padding:18px; font-size:13px; font-weight:700;
    letter-spacing:0.16em; text-transform:uppercase; font-family:var(--F);
    cursor:pointer; transition:background 0.2s;
    display:flex; align-items:center; justify-content:center; gap:12px;
  }
  .pp-faq-cta:hover { background:var(--pink-dim); }

  @media (max-width:768px) { .pp-faq { padding:60px 24px; } }

  /* ─── FOOTER ─── */
  .pp-footer {
    background:#060D17; padding:40px 64px;
    border-top:1px solid var(--border);
    display:flex; align-items:center; justify-content:space-between;
    flex-wrap:wrap; gap:20px;
  }
  .pp-footer-logo { display:flex; align-items:center; gap:12px; }
  .pp-footer-logo-name { font-size:16px; font-weight:900; text-transform:uppercase; letter-spacing:-0.02em; color:#fff; font-family:var(--F); }
  .pp-footer-logo-name span { color:var(--pink); }
  .pp-footer-logo-sub { font-size:9px; font-weight:700; letter-spacing:0.18em; text-transform:uppercase; color:var(--gray-500); font-family:var(--F); }
  .pp-footer-text { font-size:11px; color:var(--gray-700); letter-spacing:0.04em; font-family:var(--F); }
  .pp-footer-link {
    font-size:11px; font-weight:700; letter-spacing:0.14em; text-transform:uppercase;
    color:var(--gray-500); background:none; border:none; cursor:pointer;
    font-family:var(--F); transition:color 0.2s;
  }
  .pp-footer-link:hover { color:var(--pink); }

  @media (max-width:768px) {
    .pp-nav { padding:0 24px; height:64px; }
    .pp-footer { padding:28px 24px; flex-direction:column; text-align:center; }
  }

  @keyframes bounceDown {
    0%,100%{transform:translateY(0);opacity:0.4}
    50%{transform:translateY(6px);opacity:1}
  }

  /* ─── SCROLL PROGRESS ─── */
  .pp-progress {
    position:fixed; top:0; left:0; right:0; height:2px;
    z-index:9999; transform-origin:left; transform:scaleX(0);
    background:linear-gradient(90deg,var(--pink),var(--teal));
    pointer-events:none;
  }

  /* ─── CURSOR GLOW ─── */
  .pp-cursor-glow {
    position:fixed; pointer-events:none; z-index:0;
    width:560px; height:560px; border-radius:50%;
    background:radial-gradient(circle,rgba(232,24,90,0.048) 0%,transparent 65%);
    transform:translate(-50%,-50%);
    will-change:left,top;
    transition:left 0.5s ease,top 0.5s ease;
  }

  /* ─── GRAIN ─── */
  @keyframes grain {
    0%,100%{transform:translate(0,0)}
    20%{transform:translate(-2%,-3%)}
    40%{transform:translate(3%,2%)}
    60%{transform:translate(-1%,4%)}
    80%{transform:translate(4%,-2%)}
  }
  .pp-grain {
    position:fixed; inset:-50%; width:200%; height:200%;
    pointer-events:none; z-index:9998; opacity:0.032;
    animation:grain 8s steps(10) infinite;
    background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.72' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  }

  /* ─── SCROLL REVEAL ─── */
  .reveal {
    opacity:0; will-change:opacity,transform;
  }
  .reveal.up    { transform:translateY(52px); }
  .reveal.left  { transform:translateX(-52px); }
  .reveal.right { transform:translateX(52px); }
  .reveal.scale { transform:scale(0.88); }
  .reveal.in {
    opacity:1; transform:none;
    transition:opacity 0.9s cubic-bezier(0.16,1,0.3,1),
               transform 0.9s cubic-bezier(0.16,1,0.3,1);
  }

  /* ─── HERO ENTRANCE ─── */
  @keyframes hFadeUp {
    from{opacity:0;transform:translateY(36px)}
    to{opacity:1;transform:translateY(0)}
  }
  .h-enter { animation:hFadeUp 0.9s cubic-bezier(0.16,1,0.3,1) both; }

  /* ─── HERO CARD FLOAT ─── */
  @keyframes floatY {
    0%,100%{transform:translateY(0)}
    50%{transform:translateY(-12px)}
  }
  .pp-hero-card-wrap { animation:floatY 5s ease-in-out infinite; }

  /* ─── DECORATION ORBITS ─── */
  @keyframes orbitA {
    0%,100%{transform:translate(0,0) rotate(0deg)}
    30%{transform:translate(6px,-10px) rotate(3deg)}
    70%{transform:translate(-4px,-6px) rotate(-2deg)}
  }
  @keyframes orbitB {
    0%,100%{transform:translate(0,0) rotate(0deg)}
    40%{transform:translate(-7px,9px) rotate(-3deg)}
    75%{transform:translate(5px,5px) rotate(2deg)}
  }
  .pp-hero-sq-pink { animation:orbitA 9s ease-in-out infinite; }
  .pp-hero-sq-teal { animation:orbitB 11s ease-in-out infinite; }

  /* ─── CTA GLOW ─── */
  @keyframes ctaGlow {
    0%,100%{box-shadow:0 0 0 0 rgba(232,24,90,0.4),0 6px 28px rgba(232,24,90,0.22)}
    50%{box-shadow:0 0 0 10px rgba(232,24,90,0),0 6px 28px rgba(232,24,90,0.42)}
  }
  .pp-btn-primary { animation:ctaGlow 2.8s ease-in-out infinite; }

  /* ─── ACCENT LINE ─── */
  @keyframes lineGrow {
    from{transform:scaleX(0);transform-origin:left}
    to{transform:scaleX(1);transform-origin:left}
  }
  .pp-section-eyebrow.in::before,
  .pp-eyebrow.in::before {
    animation:lineGrow 0.6s 0.2s cubic-bezier(0.16,1,0.3,1) both;
  }

  /* ─── NAV SHRINK ON SCROLL ─── */
  .pp-nav.scrolled {
    height:56px;
    background:rgba(8,17,31,0.97);
    transition:height 0.3s ease,background 0.3s ease;
  }
`;

// SVG icons for proof section
const IconSearch = () => (
  <svg className="pp-proof-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square">
    <circle cx="11" cy="11" r="7"/><path d="M21 21L16 16"/>
  </svg>
);
const IconGrid = () => (
  <svg className="pp-proof-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square">
    <path d="M3 3H21V21H3z"/><path d="M3 9H21M9 3V21"/>
  </svg>
);
const IconMirror = () => (
  <svg className="pp-proof-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square">
    <path d="M12 2v20M2 12h20"/><circle cx="12" cy="12" r="5"/>
  </svg>
);
const IconTarget = () => (
  <svg className="pp-proof-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square">
    <circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/>
    <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/>
  </svg>
);
const IconBolt = () => (
  <svg className="pp-proof-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square" strokeLinejoin="miter">
    <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z"/>
  </svg>
);
const IconBar = () => (
  <svg className="pp-proof-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square">
    <path d="M3 20V8M9 20V4M15 20V12M21 20V16"/>
  </svg>
);
const IconUsers = () => (
  <svg className="pp-proof-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);

const IconAction = () => (
  <svg className="pp-proof-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square">
    <path d="M9 11L12 14L22 4"/><path d="M20 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h10"/>
  </svg>
);

const ArrowRight = () => (
  <svg width="14" height="10" viewBox="0 0 14 10" fill="none">
    <path d="M9 1L13 5L9 9M13 5H1" stroke="currentColor" strokeWidth="2" strokeLinecap="square"/>
  </svg>
);

export function PaginaPublica() {
  const [form, setForm]       = useState({ nome:"", email:"", empresa:"", site:"", cargo:"", setor:"", porte:"", contexto:"" });
  const [loading, setLoading] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [error, setError]     = useState("");
  const formRef      = useRef(null);
  const howRef       = useRef(null);
  const progressRef  = useRef(null);
  const cursorRef    = useRef(null);
  const heroBgRef    = useRef(null);
  const heroVisRef   = useRef(null);
  const navRef       = useRef(null);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const scrollToForm = () => formRef.current?.scrollIntoView({ behavior:"smooth" });
  const scrollToHow  = () => howRef.current?.scrollIntoView({ behavior:"smooth" });

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.nome || !form.email || !form.site) { setError("Preencha os campos obrigatórios."); return; }
    setLoading(true); setError("");
    const { error: dbErr } = await supabase.from("solicitacoes").insert({
      nome:form.nome, email:form.email, empresa:form.empresa,
      site:form.site, cargo:form.cargo, setor:form.setor, porte:form.porte,
      contexto:form.contexto, status:"pendente",
    });
    setLoading(false);
    if (dbErr) { setError("Erro ao enviar solicitação. Tente novamente."); return; }
    setSucesso(true);
  }

  useEffect(() => {
    /* ── Scroll: progress bar + parallax + nav shrink ── */
    const onScroll = () => {
      const y   = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (progressRef.current)
        progressRef.current.style.transform = `scaleX(${y / max})`;
      if (heroBgRef.current)
        heroBgRef.current.style.transform = `translateY(${y * 0.22}px)`;
      if (heroVisRef.current)
        heroVisRef.current.style.transform = `translateY(${y * -0.07}px)`;
      if (navRef.current)
        navRef.current.classList.toggle("scrolled", y > 60);
    };
    window.addEventListener("scroll", onScroll, { passive:true });

    /* ── Cursor glow ── */
    const onMove = e => {
      if (cursorRef.current) {
        cursorRef.current.style.left = e.clientX + "px";
        cursorRef.current.style.top  = e.clientY + "px";
      }
    };
    window.addEventListener("mousemove", onMove);

    /* ── Scroll reveal ── */
    const observer = new IntersectionObserver(
      entries => entries.forEach(entry => {
        if (entry.isIntersecting) entry.target.classList.add("in");
      }),
      { threshold:0.08, rootMargin:"0px 0px -36px 0px" }
    );
    document.querySelectorAll(".reveal").forEach(el => observer.observe(el));

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("mousemove", onMove);
      observer.disconnect();
    };
  }, []);

  const PROOF_ITEMS = [
    { Icon:IconSearch, t:"Dados 100% Públicos",             d:"O agente pesquisa seu site, LinkedIn, Instagram, Google Reviews, Reclame Aqui, vagas abertas e anúncios ativos. Nada inventado — tudo verificável.", sources:["site oficial","LinkedIn","Google Reviews","Reclame Aqui","Glassdoor","Ads ativos","Sentiment Analysis via IA"] },
    { Icon:IconGrid,   t:"Framework Proprietário",          d:"Os scores seguem critérios objetivos do Smart Branding: 1–3 crítico, 4–6 em desenvolvimento, 7–8 sólido, 9–10 referência de mercado." },
    { Icon:IconMirror, t:"Identidade vs. Percepção",        d:"O diagnóstico confronta o que você diz com o que o mercado encontra. O gap entre os dois é onde mora o problema real de conversão." },
    { Icon:IconTarget, t:"Inteligência Competitiva",        d:"Cada diagnóstico mapeia concorrentes — diferencial, nível de ameaça e sinais de movimento. Você sai sabendo onde está em relação ao mercado." },
    { Icon:IconBolt,   t:"Cada Análise é Única",            d:"O agente não usa template. Pesquisa, cruza fontes e gera um relatório específico para a sua empresa neste momento." },
    { Icon:IconUsers,  t:"Entregue por Quem Constrói",      d:"O diagnóstico é gerado por tecnologia, mas revisado por uma equipe que executa estratégia de marca. Ponto de partida de uma conversa real." },
    { Icon:IconBar,    t:"Pronto para o Board",             d:"Os scores e o relatório são estruturados para apresentação executiva. Você recebe o diagnóstico, não um dump de dados." },
    { Icon:IconAction, t:"Resultado Pronto para Ação",      d:"Cada relatório termina com quick wins priorizados e uma porta de entrada recomendada. Você sai da leitura sabendo exatamente o que fazer primeiro." },
  ];

  return (
    <>
      <GlobalStyle />
      <style>{CSS}</style>
      <div className="pp-grain" />
      <div className="pp-progress" ref={progressRef} />
      <div className="pp-cursor-glow" ref={cursorRef} />

      {/* ── NAV ── */}
      <nav className="pp-nav" ref={navRef}>
        <div className="pp-logo">
          <img src={logoNegativa} alt="LOUDR" style={{ height:46, display:"block" }} />
          <span className="pp-logo-div" />
          <span className="pp-logo-sub">Brand Intelligence</span>
        </div>
        <button className="pp-nav-cta" onClick={scrollToForm}>Solicitar Diagnóstico</button>
      </nav>

      {/* ── HERO ── */}
      <section className="pp-hero">
        <div className="pp-hero-bg" ref={heroBgRef} />

        {/* Left column */}
        <div style={{ position:"relative", zIndex:2 }}>
          <div className="pp-eyebrow h-enter" style={{ animationDelay:"0.05s" }}>Smart Branding · Framework Proprietário</div>
          <h1 className="pp-h1">
            <span className="h-enter" style={{ display:"block", animationDelay:"0.18s" }}>Você aprova budget</span>
            <span className="h-enter" style={{ display:"block", animationDelay:"0.28s" }}>de marca todo ano.</span>
            <span className="h-enter" style={{ display:"block", animationDelay:"0.38s" }}>Mas consegue mostrar</span>
            <span className="accent h-enter" style={{ display:"block", animationDelay:"0.48s" }}>o que está construindo?</span>
          </h1>
          <p className="pp-sub h-enter" style={{ animationDelay:"0.6s" }}>
            Na próxima reunião de planejamento, você vai defender brand com intuição ou com dado?{" "}
            <strong>O diagnóstico LOUDR transforma percepção em evidência — em 48 horas.</strong>
          </p>
          <div className="pp-cta-group h-enter" style={{ animationDelay:"0.72s" }}>
            <button className="pp-btn-primary" onClick={scrollToForm}>
              Quero meu diagnóstico <ArrowRight />
            </button>
            <button className="pp-btn-outline" onClick={scrollToHow}>Como funciona</button>
          </div>
          <div className="pp-stats-bar h-enter" style={{ animationDelay:"0.86s" }}>
            {[
              { n:"04",    l:"Práticas analisadas" },
              { n:"48h",   l:"Tempo de entrega"    },
              { n:"100%",  l:"Dados públicos"      },
              { n:<>R$<span>0</span></>, l:"Custo para você" },
            ].map((s,i) => (
              <div key={i} className="pp-stat-item">
                <span className="pp-stat-num">{s.n}</span>
                <span className="pp-stat-lbl">{s.l}</span>
              </div>
            ))}
          </div>
          <div
            onClick={scrollToHow}
            style={{ marginTop:40, cursor:"pointer", display:"inline-flex", flexDirection:"column", alignItems:"center", gap:8, color:"rgba(255,255,255,0.4)", fontSize:10, letterSpacing:"0.14em", textTransform:"uppercase", fontFamily:"var(--F)", userSelect:"none" }}
          >
            role para ver
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ animation:"bounceDown 1.6s ease infinite" }}>
              <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>

        {/* Right column — Hero visual */}
        <div className="pp-hero-visual" ref={heroVisRef}>
          <div className="pp-hero-card-wrap">
            <div className="pp-hero-sq-teal" />
            <div className="pp-hero-card">
              <div className="pp-hm-header">
                <div className="pp-hm-header-left">
                  <div className="pp-hm-sq" />
                  <span className="pp-hm-title">Brand Intelligence Report · LOUDR</span>
                </div>
                <div className="pp-hm-status">
                  <span className="pp-live-dot" /> Gerado
                </div>
              </div>
              <div className="pp-hm-body">
                <div className="pp-hm-meta">Cliente · 2026</div>
                <div className="pp-hm-company">Sua Empresa</div>
                <div className="pp-hm-submeta">Setor · Porte · dominio.com.br</div>
                <div className="pp-hm-quote">"A marca declara liderança mas o mercado percebe comodidade. Esse gap é a raiz de todos os problemas de conversão."</div>
                <div className="pp-hm-scores">
                  {[
                    { l:"Singularidade", w:"60%", c:"#EF9F27", v:"06" },
                    { l:"Consistência",  w:"40%", c:"#E8185A", v:"04" },
                    { l:"Posicionam.",   w:"80%", c:"#0D9E7A", v:"08" },
                  ].map(s => (
                    <div key={s.l} className="pp-hm-score">
                      <div className="pp-hm-score-label">{s.l}</div>
                      <div className="pp-hm-score-bar"><div className="pp-hm-score-fill" style={{ width:s.w, background:s.c }} /></div>
                      <div className="pp-hm-score-num" style={{ color:s.c }}>{s.v}<span>/10</span></div>
                    </div>
                  ))}
                </div>
                <div className="pp-hm-tags">
                  <span className="pp-hm-tag" style={{ background:"rgba(232,24,90,0.12)", color:"#E8185A" }}>Gap de identidade</span>
                  <span className="pp-hm-tag" style={{ background:"rgba(13,158,122,0.12)", color:"#3DD4A8" }}>Território aberto</span>
                  <span className="pp-hm-tag" style={{ background:"rgba(239,159,39,0.12)", color:"#EF9F27" }}>3 oportunidades</span>
                </div>
              </div>
            </div>
            <div className="pp-hero-sq-pink" />
            <div className="pp-hero-tag">
              <span className="pp-live-dot" /> Diagnóstico ao vivo
            </div>
          </div>
        </div>
      </section>

      {/* ── PAIN ── */}
      <section className="pp-pain">
        <div className="pp-section-inner">
          <div className="pp-section-eyebrow reveal left">O problema que ninguém fala em reunião</div>
          <div className="pp-pain-head">
            <h2 className="pp-pain-headline reveal left" style={{ transitionDelay:"0.1s" }}>
              Todo CMO sente que<br />
              tem problema de marca.<br />
              Quase nenhum tem<br />
              <span>dados para provar.</span>
            </h2>
            <p className="pp-pain-sub reveal right" style={{ transitionDelay:"0.2s" }}>
              Reconhecer o problema é fácil. O difícil é chegar na reunião com evidência.
            </p>
          </div>
          <div className="pp-pain-cards">
            {[
              { n:"Problema 01", t:"Sua mensagem não chega",          d:"O que você diz sobre a marca no site é diferente do que o mercado percebe. Esse gap custa clientes sem que você saiba." },
              { n:"Problema 02", t:"Você se parece com todo mundo",   d:"Quando o prospect compara você com o concorrente, não encontra uma razão clara para escolher. E aí ele escolhe pelo preço." },
              { n:"Problema 03", t:"Você não tem evidência",          d:"Na reunião com o CEO, você defende brand com intuição. Com dados, a conversa muda completamente." },
              { n:"Problema 04", t:"A marca não acompanha",           d:"O produto evoluiu, o time cresceu, o revenue subiu. Mas a identidade ficou no passado — e isso trava o próximo ciclo." },
              { n:"Problema 05", t:"Budget de marca sem ROI",         d:"Você investe em branding mas não consegue mostrar o retorno. Sem dados, cada planejamento é uma briga para manter o orçamento." },
              { n:"Problema 06", t:"Você opera no escuro",            d:"Enquanto você toma decisões sem dado, os concorrentes sinalizam movimentos em vagas, anúncios e tom de voz. Esses sinais são públicos." },
            ].map((c,i) => (
              <div key={c.n} className="pp-pain-card reveal up" style={{ transitionDelay:`${i*0.07}s` }}>
                <div className="pp-pain-num">{c.n}</div>
                <div className="pp-pain-title">{c.t}</div>
                <div className="pp-pain-text">{c.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW ── */}
      <section className="pp-how" ref={howRef}>
        <div className="pp-how-grid">
          <div>
            <div className="pp-section-eyebrow reveal left" style={{ transitionDelay:"0.05s" }}>Como funciona</div>
            <h2 className="pp-how-headline reveal left" style={{ transitionDelay:"0.15s" }}>
              Um raio-x completo<br />
              da sua marca<br />
              <span>em dados.</span>
            </h2>
            <p className="pp-how-sub reveal left" style={{ transitionDelay:"0.22s" }}>
              Nosso agente de inteligência pesquisa sua empresa em fontes públicas — site, LinkedIn, redes sociais, reviews, vagas, concorrentes — e analisa tudo pelo framework Smart Branding.
            </p>
            <div className="pp-pratica-list">
              {[
                { n:"01", name:"Inteligência & Singularidade", desc:"Você tem um território único? Ou está perdido no ruído do mercado?",    color:"#E8185A" },
                { n:"02", name:"Experiência & Expressão",      desc:"Sua identidade é consistente em todos os canais ou fragmentada?",      color:"#0D9E7A" },
                { n:"03", name:"Plataformas & Ecossistemas",   desc:"Seu produto digital entrega a promessa que a marca faz?",              color:"#7F77DD" },
                { n:"04", name:"Futuro & Escala",              desc:"Você está construindo uma marca que vai durar ou só gerando barulho?", color:"#EF9F27" },
              ].map((p,i) => (
                <div key={p.n} className="pp-pratica-item reveal up" style={{ transitionDelay:`${0.1+i*0.1}s` }}>
                  <div className="pp-pratica-num">{p.n}</div>
                  <div>
                    <div className="pp-pratica-name">{p.name}</div>
                    <div className="pp-pratica-desc">{p.desc}</div>
                  </div>
                  <div className="pp-pratica-sq" style={{ background:p.color }} />
                </div>
              ))}
            </div>
          </div>

          {/* Mock report */}
          <div className="pp-report-mock reveal right" style={{ transitionDelay:"0.2s" }}>
            <div className="pp-report-mock-inner">
              <div className="pp-mock-header">
                <div className="pp-mock-header-left">
                  <div className="pp-mock-sq-tiny" />
                  <span className="pp-mock-header-title">Brand Intelligence Report · LOUDR</span>
                </div>
                <div className="pp-mock-status"><span className="pp-live-dot" />Gerado</div>
              </div>
              <div className="pp-mock-body">
                <div className="pp-mock-meta-row">Cliente · 2026</div>
                <div className="pp-mock-company">Sua Empresa</div>
                <div className="pp-mock-meta">Setor · Porte · dominio.com.br</div>
                <div className="pp-mock-quote">"A marca declara liderança mas o mercado percebe comodidade. Esse gap é a raiz de todos os problemas de conversão."</div>
                <div className="pp-mock-scores">
                  {[
                    { l:"Singularidade", w:"60%", c:"#EF9F27", v:"06" },
                    { l:"Consistência",  w:"40%", c:"#E8185A", v:"04" },
                    { l:"Posicionam.",   w:"80%", c:"#0D9E7A", v:"08" },
                  ].map(s => (
                    <div key={s.l} className="pp-mock-score">
                      <div className="pp-mock-score-label">{s.l}</div>
                      <div className="pp-mock-score-bar"><div className="pp-mock-score-fill" style={{ width:s.w, background:s.c }} /></div>
                      <div className="pp-mock-score-num" style={{ color:s.c }}>{s.v}<span>/10</span></div>
                    </div>
                  ))}
                </div>
                <div className="pp-mock-tags">
                  <span className="pp-mock-tag" style={{ background:"rgba(232,24,90,0.12)", color:"#E8185A" }}>Gap de identidade</span>
                  <span className="pp-mock-tag" style={{ background:"rgba(13,158,122,0.12)", color:"#3DD4A8" }}>Território aberto</span>
                  <span className="pp-mock-tag" style={{ background:"rgba(239,159,39,0.12)", color:"#EF9F27" }}>3 oportunidades</span>
                </div>
                <div className="pp-mock-qw-label">Quick wins identificados</div>
                {[
                  "Reposicionar tagline para reivindicar território único.",
                  "Alinhar tom de voz entre LinkedIn e site.",
                  "Revisar arquitetura de produto à promessa de marca.",
                ].map((w,i) => (
                  <div key={i} className="pp-mock-win">
                    <span className="pp-mock-win-num">0{i+1}</span>
                    <span>{w}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PROOF ── */}
      <section className="pp-proof">
        <div className="pp-proof-head reveal up">
          <div className="pp-section-eyebrow center">Por que confiar no diagnóstico</div>
          <h2 className="pp-proof-headline">
            Não é opinião.<br />É <span>inteligência</span> em dados.
          </h2>
          <p className="pp-proof-sub">Cada score, cada insight, cada oportunidade tem evidência concreta por trás.</p>
        </div>
        <div className="pp-proof-items">
          {PROOF_ITEMS.map((p,i) => (
            <div key={p.t} className="pp-proof-item reveal up" style={{ transitionDelay:`${i*0.07}s` }}>
              <div className="pp-proof-icon-wrap"><p.Icon /></div>
              <div className="pp-proof-title">{p.t}</div>
              <div className="pp-proof-text">{p.d}</div>
              {p.sources && (
                <div className="pp-proof-sources">
                  <span style={{ color:"var(--gray-500)" }}>Cruzamos: </span>
                  <span style={{ color:"var(--teal)" }}>{p.sources.join(" · ")}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── SOCIAL PROOF ── */}
      <section className="pp-social-proof">
        <div className="pp-social-inner reveal up">
          <div className="pp-social-label">Diagnósticos gerados</div>
          <div className="pp-social-stats">
            {[
              { n:"+200", l:"fontes por diagnóstico" },
              { n:"8",    l:"setores analisados"     },
              { n:"48h",  l:"tempo de entrega"       },
            ].map((s,i) => (
              <div key={i} className="pp-social-stat">
                <span className="pp-social-num">{s.n}</span>
                <span className="pp-social-lbl">{s.l}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── EXAMPLE ── */}
      <section className="pp-example">
        <div className="pp-example-inner">
          <div className="pp-section-eyebrow teal center">Veja na prática</div>
          <h2 className="pp-example-headline">Veja como funciona na prática</h2>
          <p className="pp-example-sub">Rodamos um diagnóstico completo d'O Boticário para mostrar a profundidade da análise. É exatamente isso que você vai receber.</p>

          <div className="pp-example-card reveal scale" style={{ transitionDelay:"0.15s" }}>
            <div className="pp-example-label">Exemplo de Diagnóstico</div>
            <div className="pp-example-company">O Boticário</div>
            <div className="pp-example-meta">Cosméticos, Perfumaria e Beleza · Grande · boticario.com.br</div>
            <div className="pp-example-quote">"A marca mais amada do Brasil ainda vende promoção — não propósito."</div>
            <div className="pp-example-scores">
              {[
                { l:"Singularidade",           w:"60%", c:"#EF9F27", v:6 },
                { l:"Consistência",            w:"50%", c:"#E8185A", v:5 },
                { l:"Posicionamento",          w:"60%", c:"#EF9F27", v:6 },
                { l:"Plataformas & Ecossist.", w:"70%", c:"#0D9E7A", v:7 },
              ].map(s => (
                <div key={s.l} className="pp-example-score">
                  <div className="pp-example-score-label">{s.l}</div>
                  <div className="pp-example-score-bar"><div className="pp-example-score-fill" style={{ width:s.w, background:s.c }} /></div>
                  <div className="pp-example-score-num" style={{ color:s.c }}>{s.v}</div>
                </div>
              ))}
            </div>
            <a className="pp-example-btn" href={BOTICARIO_REPORT_URL} target="_blank" rel="noopener noreferrer">
              Ver relatório completo <ArrowRight />
            </a>
            <p className="pp-example-disclaimer">Este é um diagnóstico de exemplo gerado pela LOUDR. O Boticário não é cliente da agência.</p>
          </div>
        </div>
      </section>

      {/* ── FORM ── */}
      <section className="pp-form-section" ref={formRef}>
        <div className="pp-form-inner">
          <div className="pp-form-head">
            <div className="pp-section-eyebrow center">Diagnóstico Gratuito</div>
            <h2 className="pp-form-headline">
              Descubra o score de<br /><span>singularidade</span><br />da sua marca.
            </h2>
            <p className="pp-form-sub">Preencha o formulário. Nossa equipe analisa e envia o relatório completo em até 48 horas. Sem custo, sem compromisso.</p>
          </div>

          <div className="pp-form-box reveal up" style={{ transitionDelay:"0.15s" }}>
            {sucesso ? (
              <div className="pp-success">
                <div className="pp-success-icon-wrap">
                  <div className="pp-success-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square" width="32" height="32"><path d="M5 12L10 17L20 7"/></svg>
                  </div>
                </div>
                <div className="pp-success-title">Solicitação Enviada</div>
                <p className="pp-success-sub">Recebemos seu pedido. Nossa equipe vai analisar e entrar em contato com o diagnóstico completo em até 48 horas.</p>
                <div className="pp-next-steps">
                  <div className="pp-next-steps-label">O que acontece agora</div>
                  {["Nossa equipe revisa sua solicitação.","Rodamos o diagnóstico de marca.","Você recebe o relatório completo por e-mail."].map((s,i) => (
                    <div key={i} className="pp-next-step">
                      <span className="pp-next-step-num">0{i+1}</span><span>{s}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                {error && <div className="pp-form-error">{error}</div>}
                <div className="pp-form-row">
                  <div className="pp-field"><label>Seu nome *</label><input type="text" value={form.nome} onChange={set("nome")} placeholder="João Silva" required /></div>
                  <div className="pp-field"><label>E-mail corporativo *</label><input type="email" value={form.email} onChange={set("email")} placeholder="joao@empresa.com.br" required /></div>
                </div>
                <div className="pp-form-row">
                  <div className="pp-field"><label>Empresa</label><input type="text" value={form.empresa} onChange={set("empresa")} placeholder="Nome da empresa" /></div>
                  <div className="pp-field"><label>Site *</label><input type="text" value={form.site} onChange={set("site")} placeholder="www.empresa.com.br" required /></div>
                </div>
                <div className="pp-form-row">
                  <div className="pp-field">
                    <label>Seu cargo</label>
                    <select value={form.cargo} onChange={set("cargo")}>
                      <option value="">Selecione...</option>
                      {["CMO","Diretor de Marketing","VP Marketing","CEO","Outro"].map(o => <option key={o}>{o}</option>)}
                    </select>
                  </div>
                  <div className="pp-field">
                    <label>Setor</label>
                    <select value={form.setor} onChange={set("setor")}>
                      <option value="">Selecione...</option>
                      {SETORES.map(o => <option key={o}>{o}</option>)}
                    </select>
                  </div>
                </div>
                <div className="pp-field">
                  <label>Contexto do negócio <span className="opt">(opcional — quanto mais detalhe, melhor o diagnóstico)</span></label>
                  <textarea value={form.contexto} onChange={set("contexto")}
                    placeholder="Ex: Somos uma empresa B2B, lançamos rebranding em 2023 e não sabemos se a nova identidade está chegando ao mercado."
                    rows={4} />
                </div>
                <p className="pp-form-urgency">
                  O budget de brand que não tem dado é o primeiro a ser cortado no próximo planejamento. Você tem 48 horas para mudar isso.
                </p>
                <button type="submit" className="pp-form-submit" disabled={loading}>
                  <span>{loading ? "Enviando..." : "Solicitar Diagnóstico Gratuito"}</span>
                  {!loading && <ArrowRight />}
                </button>
                <p className="pp-form-disclaimer">
                  Nossa equipe revisa cada solicitação antes de rodar o diagnóstico.<br />
                  Você receberá o relatório completo por e-mail em até 48 horas.
                </p>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="pp-faq">
        <div className="pp-faq-inner">
          <div className="pp-section-eyebrow reveal left">Dúvidas comuns</div>
          <h2 className="pp-faq-headline reveal left" style={{ transitionDelay:"0.1s" }}>Perguntas frequentes</h2>
          {[
            { q:"Quanto tempo da minha equipe isso vai tomar?",   a:"Zero. Você preenche o formulário em 3 minutos. Nossa equipe faz o resto." },
            { q:"Meus dados internos estão seguros?",             a:"O diagnóstico usa exclusivamente dados públicos — nada que sua empresa não tenha publicado voluntariamente." },
            { q:"O que acontece depois do diagnóstico?",          a:"Você recebe o relatório completo por e-mail. Se fizer sentido conversar, oferecemos uma call de 15 minutos para apresentar os insights e discutir próximos passos. Sem pressão." },
          ].map((f,i) => (
            <div key={f.q} className="pp-faq-item reveal up" style={{ transitionDelay:`${i*0.1}s` }}>
              <div className="pp-faq-q"><span className="pp-faq-q-arrow">→</span><span>{f.q}</span></div>
              <div className="pp-faq-a">{f.a}</div>
            </div>
          ))}
          <button className="pp-faq-cta" onClick={scrollToForm}>
            Solicitar diagnóstico <ArrowRight />
          </button>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="pp-footer">
        <div className="pp-footer-logo">
          <img src={logoNegativa} alt="LOUDR" style={{ height:38, display:"block" }} />
          <span className="pp-footer-logo-sub">Smart Branding</span>
        </div>
        <span className="pp-footer-text">© 2026 LOUDR — Todos os direitos reservados</span>
        <button className="pp-footer-link" onClick={() => window.location.hash = "#/login"}>Área interna →</button>
      </footer>
    </>
  );
}
