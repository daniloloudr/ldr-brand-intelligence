import { DS, F } from "../lib/constants";

export function GlobalStyle() {
  return (
    <style>{`
      *, *::before, *::after { box-sizing: border-box !important; }
      @keyframes spin { to { transform: rotate(360deg); } }
      @keyframes fu { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
      @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
      @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
      .a0{animation:fu .38s ease both} .a1{animation:fu .38s .06s ease both} .a2{animation:fu .38s .12s ease both}
      .a3{animation:fu .38s .18s ease both} .a4{animation:fu .38s .24s ease both} .a5{animation:fu .38s .30s ease both}
      .a6{animation:fu .38s .36s ease both} .a7{animation:fu .38s .42s ease both} .a8{animation:fu .38s .48s ease both}
      input:focus, textarea:focus, select:focus { outline:none !important; border-color:${DS.green} !important; box-shadow:0 0 0 3px ${DS.greenPale} !important; }
      input, textarea, select, button { font-family: ${F}; }
    `}</style>
  );
}
