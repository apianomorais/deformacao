/* ===================================================================
   widgets.js: simuladores e calculadoras interativas
   Uso nas páginas: <div data-widget="nome"></div>
   Da kalimba à viga / LFCA–URCA
   =================================================================== */

(function () {
  'use strict';

  /* ---------- utilitários de DOM ---------- */
  function el(tag, attrs, filhos) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'class') n.className = attrs[k];
      else if (k === 'html') n.innerHTML = attrs[k];
      else if (k === 'texto') n.textContent = attrs[k];
      else n.setAttribute(k, attrs[k]);
    });
    (filhos || []).forEach(function (c) { n.appendChild(c); });
    return n;
  }

  function moldura(raiz, titulo) {
    raiz.classList.add('widget');
    raiz.appendChild(el('div', { class: 'widget-cabeca', texto: titulo }));
    var corpo = el('div', { class: 'widget-corpo' });
    raiz.appendChild(corpo);
    return corpo;
  }

  /* Devolve o <input type=range>, para que o chamador possa movê-lo por código. */
  function deslizante(pai, rot, min, max, passo, inicial, aoMudar, formata) {
    var campo = el('div', { class: 'campo' });
    var lab = el('label');
    var val = el('span', { class: 'valor' });
    var inp = el('input', { type: 'range', min: min, max: max, step: passo, value: inicial });
    function mostrar() {
      val.innerHTML = formata ? formata(Number(inp.value)) : String(inp.value).replace('.', ',');
    }
    lab.innerHTML = rot + ' ';
    lab.appendChild(val);
    campo.appendChild(lab);
    campo.appendChild(inp);
    pai.appendChild(campo);
    inp.addEventListener('input', function () { mostrar(); aoMudar(Number(inp.value)); });
    mostrar();
    return inp;
  }

  /* Botões mutuamente exclusivos. Devolve uma função que troca a seleção. */
  function opcoes(pai, lista, inicial, aoMudar) {
    var cx = el('div', { class: 'botoes' });
    var bs = lista.map(function (o, i) {
      var b = el('button', { type: 'button', texto: o.rot });
      if (i !== inicial) b.classList.add('sec');
      b.addEventListener('click', function () {
        bs.forEach(function (x) { x.classList.add('sec'); });
        b.classList.remove('sec');
        aoMudar(o.v, o);
      });
      cx.appendChild(b);
      return b;
    });
    pai.appendChild(cx);
    return function (i) { bs[i].click(); };
  }

  function cartoes(pai, lista) {
    var g = el('div', { class: 'grade-num' });
    lista.forEach(function (c) {
      g.appendChild(el('div', { class: 'cartao-num', html:
        '<span class="rot">' + c.rot + '</span><span class="val" data-k="' + c.k + '">·</span>' }));
    });
    pai.appendChild(g);
    return function (vals) {
      Object.keys(vals).forEach(function (k) {
        var n = g.querySelector('[data-k="' + k + '"]');
        if (n) n.innerHTML = vals[k];
      });
    };
  }

  function tipografar(no) {
    if (window.MathJax && window.MathJax.typesetPromise) {
      window.MathJax.typesetPromise([no]).catch(function () {});
    }
  }

  var REGISTRO = {};


  /* Seta com ponta, usada por quase todo widget de cinemática. */
  function seta(ct, xa, ya, xb, yb, cor, esp, tracejado) {
    var dx = xb - xa, dy = yb - ya, r = Math.sqrt(dx * dx + dy * dy);
    if (r < 1.5) return;
    var ux = dx / r, uy = dy / r, p = Math.min(8, r * 0.42);
    ct.save();
    ct.strokeStyle = cor; ct.fillStyle = cor;
    ct.lineWidth = esp || 2; ct.lineCap = 'round'; ct.lineJoin = 'round';
    if (tracejado) ct.setLineDash(tracejado);
    ct.beginPath(); ct.moveTo(xa, ya); ct.lineTo(xb - ux * p * 0.8, yb - uy * p * 0.8);
    ct.stroke();
    ct.setLineDash([]);
    ct.beginPath();
    ct.moveTo(xb, yb);
    ct.lineTo(xb - ux * p - uy * p * 0.46, yb - uy * p + ux * p * 0.46);
    ct.lineTo(xb - ux * p + uy * p * 0.46, yb - uy * p - ux * p * 0.46);
    ct.closePath(); ct.fill();
    ct.restore();
  }

  /* Rótulo com halo branco, legível por cima de qualquer desenho. */
  function rotulo(ct, texto, x, y, cor, al, bl, fonte, corHalo) {
    ct.save();
    ct.font = fonte || '600 11px system-ui, sans-serif';
    ct.textAlign = al || 'center'; ct.textBaseline = bl || 'middle';
    ct.lineJoin = 'round'; ct.lineWidth = 3.5; ct.strokeStyle = corHalo || '#fff';
    ct.strokeText(texto, x, y);
    ct.fillStyle = cor; ct.fillText(texto, x, y);
    ct.restore();
  }

  /* =================================================================
     1. Campo de velocidades de um corpo rígido
     Três coisas que o texto afirma e que só convencem desenhadas: que
     a velocidade varia de ponto para ponto enquanto ω não varia; que a
     separação em translação mais rotação depende do ponto escolhido
     mas a soma não; e que a aceleração tem uma parte tangencial e uma
     centrípeta mesmo quando o ponto de apoio não acelera.
     ================================================================= */

  /* ---------- elementos finitos de viga, usado pelos widgets 3 e 4 ----------
     Matrizes de Hermite, montagem, engaste, Cholesky de M e Jacobi para o
     problema de autovalores generalizado. Conferido contra a solução
     analítica: para a lamela de aço de 40 mm, f1 = 509,61 Hz com 30
     elementos contra 509,61 Hz da fórmula fechada. */
  function matrizesElemento(EI, rhoA, l) {
    var K = [[12, 6*l, -12, 6*l],
             [6*l, 4*l*l, -6*l, 2*l*l],
             [-12, -6*l, 12, -6*l],
             [6*l, 2*l*l, -6*l, 4*l*l]].map(r => r.map(v => v * EI / (l*l*l)));
    var M = [[156, 22*l, 54, -13*l],
             [22*l, 4*l*l, 13*l, -3*l*l],
             [54, 13*l, 156, -22*l],
             [-13*l, -3*l*l, -22*l, 4*l*l]].map(r => r.map(v => v * rhoA * l / 420));
    return [K, M];
  }
  function monta(ne, L, EI, rhoA) {
    var l = L / ne, n = 2 * (ne + 1);
    var K = [], M = [];
    for (var i = 0; i < n; i++) { K.push(new Array(n).fill(0)); M.push(new Array(n).fill(0)); }
    var e = matrizesElemento(EI, rhoA, l);
    for (var el = 0; el < ne; el++) {
      var g = [2*el, 2*el+1, 2*el+2, 2*el+3];
      for (var a = 0; a < 4; a++) for (var b = 0; b < 4; b++) {
        K[g[a]][g[b]] += e[0][a][b];
        M[g[a]][g[b]] += e[1][a][b];
      }
    }
    return [K.slice(2).map(r => r.slice(2)), M.slice(2).map(r => r.slice(2))];
  }
  function cholesky(A) {
    var n = A.length, Lm = A.map(r => r.map(() => 0));
    for (var i = 0; i < n; i++) for (var j = 0; j <= i; j++) {
      var s = A[i][j];
      for (var k = 0; k < j; k++) s -= Lm[i][k] * Lm[j][k];
      if (i === j) Lm[i][j] = Math.sqrt(Math.max(s, 1e-300));
      else Lm[i][j] = s / Lm[j][j];
    }
    return Lm;
  }
  function inversaInferior(Lm) {
    var n = Lm.length, X = Lm.map(r => r.map(() => 0));
    for (var i = 0; i < n; i++) {
      X[i][i] = 1 / Lm[i][i];
      for (var j = 0; j < i; j++) {
        var s = 0;
        for (var k = j; k < i; k++) s += Lm[i][k] * X[k][j];
        X[i][j] = -s / Lm[i][i];
      }
    }
    return X;
  }
  function mult(A, B) {
    var n = A.length, m = B[0].length, p = B.length, C = [];
    for (var i = 0; i < n; i++) { C.push(new Array(m).fill(0));
      for (var k = 0; k < p; k++) { var a = A[i][k]; if (!a) continue;
        for (var j = 0; j < m; j++) C[i][j] += a * B[k][j]; } }
    return C;
  }
  function transposta(A) { return A[0].map((_, j) => A.map(r => r[j])); }
  function jacobi(Ain, iter) {
    var A = Ain.map(r => r.slice()), n = A.length;
    for (var s = 0; s < (iter || 100); s++) {
      var off = 0;
      for (var i = 0; i < n; i++) for (var j = i+1; j < n; j++) off += A[i][j]*A[i][j];
      if (off < 1e-22) break;
      for (i = 0; i < n; i++) for (j = i+1; j < n; j++) {
        if (Math.abs(A[i][j]) < 1e-18) continue;
        var theta = (A[j][j] - A[i][i]) / (2 * A[i][j]);
        var t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta*theta + 1));
        var c = 1 / Math.sqrt(t*t + 1), sn = t * c;
        for (var k = 0; k < n; k++) {
          var aik = A[i][k], ajk = A[j][k];
          A[i][k] = c*aik - sn*ajk; A[j][k] = sn*aik + c*ajk;
        }
        for (k = 0; k < n; k++) {
          var aki = A[k][i], akj = A[k][j];
          A[k][i] = c*aki - sn*akj; A[k][j] = sn*aki + c*akj;
        }
      }
    }
    return A.map((r, i) => r[i]).sort((a,b) => a-b);
  }
  function frequencias(ne, L, EI, rhoA, quantas) {
    var KM = monta(ne, L, EI, rhoA);
    var Lm = cholesky(KM[1]);
    var Li = inversaInferior(Lm);
    var A = mult(mult(Li, KM[0]), transposta(Li));
    var lam = jacobi(A, 60);
    return lam.slice(0, quantas).map(v => Math.sqrt(Math.max(v, 0)) / (2 * Math.PI));
  }

  /* ---------- síntese de som, para ouvir a diferença ---------- */
  var AUDIO = null;
  function toca(f1, razoes, dur) {
    try {
      if (!AUDIO) AUDIO = new (window.AudioContext || window.webkitAudioContext)();
      var ctx = AUDIO, agora = ctx.currentTime;
      razoes.forEach(function (r, i) {
        var osc = ctx.createOscillator(), g = ctx.createGain();
        osc.frequency.value = f1 * r;
        osc.type = 'sine';
        var amp = 0.22 / (i + 1);
        g.gain.setValueAtTime(0, agora);
        g.gain.linearRampToValueAtTime(amp, agora + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0008, agora + dur);
        osc.connect(g); g.connect(ctx.destination);
        osc.start(agora); osc.stop(agora + dur + 0.05);
      });
      return true;
    } catch (e) { return false; }
  }

  /* =================================================================
     1. Corda contra barra: dispersão, sobretons e som
     As duas equações diferem só na ordem da derivada espacial, e o
     widget mostra as três consequências de uma vez: a curva de
     dispersão, as razões de sobretons e, pelo alto-falante, o timbre.
     ================================================================= */
  REGISTRO.cordabarra = function (raiz) {
    var corpo = moldura(raiz, 'A diferença que se ouve');
    var cv = el('canvas');
    corpo.appendChild(cv);

    var f1 = 440, qual = 0;   /* 0 corda, 1 barra engastada, 2 barra livre */

    opcoes(corpo, [{ rot: 'Corda', v: 0 }, { rot: 'Barra engastada', v: 1 },
                   { rot: 'Barra livre', v: 2 }], 0,
      function (v) { qual = v; desenhar(); });
    deslizante(corpo, 'Fundamental \\(f_1\\) (Hz):', 110, 880, 1, f1,
      function (v) { f1 = v; desenhar(); }, function (v) { return v.toFixed(0); });

    var bot = el('div', { class: 'botoes' });
    var bOuvir = el('button', { type: 'button', texto: 'Ouvir esta série' });
    var bPar = el('button', { type: 'button', class: 'sec',
                              texto: 'Ouvir corda e barra em seguida' });
    bot.appendChild(bOuvir); bot.appendChild(bPar);
    corpo.appendChild(bot);

    var mostrar = cartoes(corpo, [
      { rot: 'Razões dos sobretons', k: 'raz' },
      { rot: 'Dispersão', k: 'dis' },
      { rot: 'Lei de escala', k: 'lei' }
    ]);
    var saida = el('div', { class: 'saida' });
    corpo.appendChild(saida);

    var SERIES = [
      { nome: 'corda', r: [1, 2, 3, 4, 5], dis: 'ω = c k', lei: 'f ∝ 1/L' },
      { nome: 'barra engastada', r: [1, 6.267, 17.55, 34.39],
        dis: 'ω ∝ k²', lei: 'f ∝ 1/L²' },
      { nome: 'barra livre', r: [1, 2.757, 5.404, 8.933],
        dis: 'ω ∝ k²', lei: 'f ∝ 1/L²' }
    ];

    bOuvir.addEventListener('click', function () {
      if (!toca(f1, SERIES[qual].r, 2.2)) {
        saida.innerHTML = 'O navegador não deixou tocar o som. Clique de novo depois de '
          + 'interagir com a página.';
      }
    });
    bPar.addEventListener('click', function () {
      toca(f1, SERIES[0].r, 1.8);
      setTimeout(function () { toca(f1, SERIES[1].r, 1.8); }, 2100);
    });

    function desenhar() {
      var p = G.preparar(cv, Math.min(300, Math.max(230, cv.clientWidth * 0.45)));
      var ct = p.ct;
      var s = SERIES[qual];

      /* o espectro, como raias verticais */
      var x0 = p.L * 0.08, larg = p.L * 0.86, base = p.A * 0.82;
      var fmax = f1 * 36;
      ct.strokeStyle = '#dde3e8'; ct.lineWidth = 1;
      ct.beginPath(); ct.moveTo(x0, base); ct.lineTo(x0 + larg, base); ct.stroke();

      SERIES[0].r.concat([6, 7, 8]).forEach(function (r) {
        var x = x0 + larg * (f1 * r) / fmax;
        if (x > x0 + larg) return;
        ct.strokeStyle = '#e0e6ea'; ct.lineWidth = 1;
        ct.beginPath(); ct.moveTo(x, base); ct.lineTo(x, base - p.A * 0.52); ct.stroke();
      });

      s.r.forEach(function (r, i) {
        var x = x0 + larg * (f1 * r) / fmax;
        if (x > x0 + larg) return;
        var h = p.A * 0.52 / (i + 1);
        ct.strokeStyle = G.COR.mestra; ct.lineWidth = 3;
        ct.beginPath(); ct.moveTo(x, base); ct.lineTo(x, base - h); ct.stroke();
        rotulo(ct, F.fmt(f1 * r, 0) + ' Hz', x, base - h - 12, G.COR.mestra);
      });
      rotulo(ct, 'as linhas claras são os harmônicos inteiros', x0 + 4, base + 16,
             '#9aa6b1', 'left');
      rotulo(ct, 'frequência →', x0 + larg, base + 16, '#9aa6b1', 'right');

      mostrar({
        raz: s.r.map(function (r) { return F.fmt(r, 2); }).join(' : '),
        dis: s.dis, lei: s.lei
      });

      saida.innerHTML = qual === 0
        ? 'Na corda os sobretons caem exatamente sobre os múltiplos inteiros da '
          + 'fundamental, e é por isso que o ouvido junta tudo numa nota só. As razões '
          + '2:1, 3:2 e 4:3 dessa série são a oitava, a quinta e a quarta da música '
          + 'ocidental.'
        : 'Na barra os sobretons caem fora das linhas claras: nenhum deles é múltiplo '
          + 'inteiro da fundamental. O ouvido não consegue fundir tudo numa nota, e o '
          + 'resultado é o "ping" metálico da kalimba. Use o segundo botão para ouvir as '
          + 'duas séries em seguida, com a mesma fundamental.';
      tipografar(saida);
      tipografar(raiz);
    }

    registrarRedesenho(desenhar);
  };

  /* =================================================================
     2. A kalimba: do comprimento à nota
     A lei f ∝ 1/L² é a que o construtor usa de trás para frente. Aqui
     o aluno escolhe a nota e o widget devolve o comprimento livre da
     lamela, com a escala inteira desenhada.
     ================================================================= */
  REGISTRO.kalimba = function (raiz) {
    var corpo = moldura(raiz, 'Que comprimento dá cada nota');
    var cv = el('canvas');
    corpo.appendChild(cv);

    var h = 1.0, material = 0, nota = 0;
    var MAT = [{ rot: 'Aço', E: 200e9, rho: 7850 },
               { rot: 'Alumínio', E: 69e9, rho: 2700 },
               { rot: 'Latão', E: 100e9, rho: 8500 },
               { rot: 'Acrílico', E: 3e9, rho: 1190 }];
    /* escala pentatônica de dó, como numa kalimba de 9 lamelas */
    var NOTAS = ['C4', 'D4', 'E4', 'G4', 'A4', 'C5', 'D5', 'E5', 'G5'];
    var FREQ = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25, 783.99];

    opcoes(corpo, MAT.map(function (m, i) { return { rot: m.rot, v: i }; }), 0,
      function (v) { material = v; desenhar(); });
    deslizante(corpo, 'Espessura \\(h\\) (mm):', 0.3, 3, 0.05, h,
      function (v) { h = v; desenhar(); }, function (v) { return F.fmt(v, 2); });
    deslizante(corpo, 'Lamela destacada:', 0, 8, 1, nota,
      function (v) { nota = v; desenhar(); },
      function (v) { return NOTAS[v]; });

    var mostrar = cartoes(corpo, [
      { rot: 'Comprimento livre', k: 'L' },
      { rot: 'Se cortar \\(L\\) pela metade', k: 'met' },
      { rot: '\\(\\sqrt{E/\\rho}\\)', k: 'vel' }
    ]);
    var saida = el('div', { class: 'saida' });
    corpo.appendChild(saida);

    /* L a partir de f: f = (1,8751)²/(2π L²) · (h/√12) · √(E/ρ) */
    function comprimento(f) {
      var m = MAT[material];
      var c = Math.sqrt(m.E / m.rho);
      return Math.sqrt(Math.pow(1.8751041, 2) / (2 * Math.PI * f)
                       * (h * 1e-3 / Math.sqrt(12)) * c);
    }

    function desenhar() {
      var p = G.preparar(cv, Math.min(290, Math.max(220, cv.clientWidth * 0.44)));
      var ct = p.ct;
      var Ls = FREQ.map(comprimento);
      var Lmax = Math.max.apply(null, Ls);
      var x0 = p.L * 0.12, larg = p.L * 0.8;
      var topo = p.A * 0.16, passo = (p.A * 0.66) / NOTAS.length;

      NOTAS.forEach(function (nm, i) {
        var y = topo + i * passo;
        var comp = larg * Ls[i] / Lmax;
        ct.fillStyle = i === nota ? G.COR.mestra : 'rgba(138,90,36,.35)';
        ct.fillRect(x0, y, comp, passo * 0.55);
        rotulo(ct, nm, x0 - 10, y + passo * 0.28, '#4a5560', 'right');
        rotulo(ct, F.fmt(Ls[i] * 1000, 1) + ' mm', x0 + comp + 8, y + passo * 0.28,
               i === nota ? G.COR.mestra : '#9aa6b1', 'left');
      });
      /* a barra do engaste */
      ct.fillStyle = '#6b7682';
      ct.fillRect(x0 - 8, topo - 6, 8, NOTAS.length * passo + 6);

      var m = MAT[material];
      mostrar({
        L: F.fmt(Ls[nota] * 1000, 1) + ' mm',
        met: F.fmt(FREQ[nota] * 4, 0) + ' Hz (duas oitavas acima)',
        vel: F.fmt(Math.sqrt(m.E / m.rho), 0) + ' m/s'
      });

      saida.innerHTML = 'Para ' + NOTAS[nota] + ' (' + F.fmt(FREQ[nota], 1)
        + ' Hz) numa lamela de ' + MAT[material].rot.toLowerCase() + ' com '
        + F.fmt(h, 2) + ' mm de espessura, o comprimento livre é '
        + F.fmt(Ls[nota] * 1000, 1) + ' mm. Troque o material: aço e alumínio dão '
        + 'comprimentos quase iguais, porque o que entra na fórmula é '
        + '\\(\\sqrt{E/\\rho}\\), e os dois têm praticamente o mesmo valor. O acrílico, '
        + 'muito mais mole, exige lamelas bem mais curtas para a mesma nota.';
      tipografar(saida);
      tipografar(raiz);
    }

    registrarRedesenho(desenhar);
  };

  /* =================================================================
     3. A viga engastada: frequências e modos
     A fórmula fechada do bloco 2, com os três primeiros modos
     desenhados e os nós marcados. Os deslizantes mostram de que cada
     coisa depende, e de que não depende.
     ================================================================= */
  REGISTRO.vigaengastada = function (raiz) {
    var corpo = moldura(raiz, 'A fórmula vista por dentro');
    var cv = el('canvas');
    corpo.appendChild(cv);

    var L = 40, h = 1.0, b = 10, material = 0, t = 0, animando = true;
    var MAT = [{ rot: 'Aço', E: 200e9, rho: 7850 },
               { rot: 'Alumínio', E: 69e9, rho: 2700 },
               { rot: 'Latão', E: 100e9, rho: 8500 },
               { rot: 'Acrílico', E: 3e9, rho: 1190 }];
    var BL = [1.8751041, 4.6940911, 7.8547574];

    opcoes(corpo, MAT.map(function (m, i) { return { rot: m.rot, v: i }; }), 0,
      function (v) { material = v; });
    deslizante(corpo, 'Comprimento livre \\(L\\) (mm):', 10, 120, 1, L,
      function (v) { L = v; }, function (v) { return v.toFixed(0); });
    deslizante(corpo, 'Espessura \\(h\\) (mm):', 0.3, 3, 0.05, h,
      function (v) { h = v; }, function (v) { return F.fmt(v, 2); });
    deslizante(corpo, 'Largura \\(b\\) (mm):', 3, 30, 1, b,
      function (v) { b = v; }, function (v) { return v.toFixed(0); });

    var bot = el('div', { class: 'botoes' });
    var bAnim = el('button', { type: 'button', texto: 'Parar' });
    bot.appendChild(bAnim); corpo.appendChild(bot);
    bAnim.addEventListener('click', function () {
      animando = !animando; bAnim.textContent = animando ? 'Parar' : 'Animar';
      if (animando) laco();
    });

    var mostrar = cartoes(corpo, [
      { rot: '\\(f_1\\)', k: 'f1' }, { rot: '\\(f_2\\)', k: 'f2' },
      { rot: '\\(f_3\\)', k: 'f3' }, { rot: '\\(f_2/f_1\\)', k: 'rz' }
    ]);
    var saida = el('div', { class: 'saida' });
    corpo.appendChild(saida);

    function freq(n) {
      var m = MAT[material];
      var Lm = L * 1e-3, hm = h * 1e-3;
      return Math.pow(BL[n], 2) / (2 * Math.PI * Lm * Lm)
             * (hm / Math.sqrt(12)) * Math.sqrt(m.E / m.rho);
    }

    function forma(x, n) {
      var bl = BL[n];
      var s = (Math.cos(bl) + Math.cosh(bl)) / (Math.sin(bl) + Math.sinh(bl));
      return Math.cosh(bl * x) - Math.cos(bl * x)
             - s * (Math.sinh(bl * x) - Math.sin(bl * x));
    }

    function desenhar() {
      var p = G.preparar(cv, Math.min(300, Math.max(230, cv.clientWidth * 0.45)));
      var ct = p.ct;
      var x0 = p.L * 0.12, larg = p.L * 0.78;

      [0, 1, 2].forEach(function (n) {
        var cy = p.A * (0.22 + 0.28 * n);
        var mx = 0;
        for (var i = 0; i <= 100; i++) mx = Math.max(mx, Math.abs(forma(i / 100, n)));
        ct.fillStyle = '#6b7682';
        ct.fillRect(x0 - 10, cy - 16, 10, 32);
        ct.beginPath();
        for (i = 0; i <= 200; i++) {
          var x = i / 200;
          var y = cy - p.A * 0.1 * forma(x, n) / mx * Math.cos(t * (n ? 1.6 : 1));
          var px = x0 + larg * x;
          if (i === 0) ct.moveTo(px, y); else ct.lineTo(px, y);
        }
        ct.strokeStyle = G.COR.mestra; ct.lineWidth = 3; ct.lineCap = 'round';
        ct.stroke(); ct.lineCap = 'butt';
        rotulo(ct, 'modo ' + (n + 1) + ': ' + F.fmt(freq(n), 0) + ' Hz',
               x0 + larg + 10, cy, '#4a5560', 'left');
        /* nós */
        var ant = forma(0.001, n);
        for (i = 1; i <= 200; i++) {
          var xx = i / 200, at = forma(xx, n);
          if (ant * at < 0) {
            ct.beginPath(); ct.arc(x0 + larg * xx, cy, 3.5, 0, 2 * Math.PI);
            ct.fillStyle = G.COR.vinho; ct.fill();
          }
          ant = at;
        }
      });

      mostrar({ f1: F.fmt(freq(0), 1) + ' Hz', f2: F.fmt(freq(1), 0) + ' Hz',
                f3: F.fmt(freq(2), 0) + ' Hz',
                rz: F.fmt(freq(1) / freq(0), 2) });

      saida.innerHTML = 'Mexa na largura \\(b\\): <strong>nada muda</strong>. Uma barra '
        + 'mais larga é mais rígida e mais pesada na mesma proporção, e os dois efeitos se '
        + 'cancelam. Dobrar a espessura dobra a frequência; dobrar o comprimento a divide '
        + 'por quatro. A razão \\(f_2/f_1\\) fica presa em 6,27 qualquer que seja a '
        + 'geometria, porque ela só depende das raízes da equação característica.';
      tipografar(saida);
      tipografar(raiz);
    }

    function laco() { if (!animando) return; t += 0.09; desenhar(); requestAnimationFrame(laco); }
    registrarRedesenho(desenhar);
    laco();
  };

  /* =================================================================
     4. Convergência do MEF
     O mesmo código do bloco 4, rodando no navegador: monta, impõe o
     engaste e resolve o problema de autovalores. O gráfico mostra o
     erro caindo e, principalmente, que cada modo exige a sua malha.
     ================================================================= */
  REGISTRO.convergenciamef = function (raiz) {
    var corpo = moldura(raiz, 'Quantos elementos são suficientes');
    var cv = el('canvas');
    corpo.appendChild(cv);

    var neMax = 16;

    deslizante(corpo, 'Elementos na malha:', 1, 24, 1, neMax,
      function (v) { neMax = v; desenhar(); }, function (v) { return v.toFixed(0); });

    var mostrar = cartoes(corpo, [
      { rot: 'Erro em \\(f_1\\)', k: 'e1' }, { rot: 'Erro em \\(f_2\\)', k: 'e2' },
      { rot: 'Erro em \\(f_3\\)', k: 'e3' }
    ]);
    var saida = el('div', { class: 'saida' });
    corpo.appendChild(saida);

    /* lamela de aço de 40 mm, a mesma do exemplo da apostila */
    var E = 200e9, rho = 7850, Lv = 0.040, hv = 0.001, bv = 0.010;
    var Iv = bv * hv * hv * hv / 12, Av = bv * hv;
    var EI = E * Iv, rhoA = rho * Av;
    var BL = [1.8751041, 4.6940911, 7.8547574];
    var exato = BL.map(function (x) {
      return x * x / (2 * Math.PI * Lv * Lv) * Math.sqrt(EI / rhoA);
    });

    var cache = {};
    function erros(ne) {
      if (cache[ne]) return cache[ne];
      var f = frequencias(ne, Lv, EI, rhoA, 3);
      var e = [0, 1, 2].map(function (i) {
        return f.length > i ? Math.abs(f[i] - exato[i]) / exato[i] : NaN;
      });
      cache[ne] = e;
      return e;
    }

    function desenhar() {
      var g = G.eixos(cv, {
        xmin: 0, xmax: 24, ymin: 0, ymax: 1, divY: 6,
        altura: Math.min(300, Math.max(220, cv.clientWidth * 0.42)),
        rotX: 'número de elementos', rotY: 'erro relativo',
        marcasX: G.marcasInteiras(0, 24, 8),
        formataY: function () { return ''; }
      });
      var ct = g.ct;
      function Ylog(v) {
        var e = Math.max(-7, Math.log10(Math.max(v, 1e-12)));
        return g.y1 - (e + 7) / 7 * (g.y1 - g.y0);
      }
      ct.strokeStyle = '#eceff2'; ct.fillStyle = '#5b6773';
      ct.font = '11px system-ui, sans-serif';
      ct.textAlign = 'right'; ct.textBaseline = 'middle';
      var nomes = ['10⁻⁷', '10⁻⁶', '10⁻⁵', '10⁻⁴', '10⁻³', '1%', '10%', '100%'];
      for (var e2 = -7; e2 <= 0; e2++) {
        var y = Ylog(Math.pow(10, e2));
        ct.beginPath(); ct.moveTo(g.x0, y); ct.lineTo(g.x1, y); ct.stroke();
        ct.fillText(nomes[e2 + 7], g.x0 - 6, y);
      }

      var cores = [G.COR.mestra, G.COR.azul, G.COR.vinho];
      [0, 1, 2].forEach(function (modo) {
        var pts = [];
        for (var ne = 1; ne <= neMax; ne++) {
          var er = erros(ne)[modo];
          if (!isNaN(er)) pts.push([g.X(ne), Ylog(er)]);
        }
        ct.beginPath();
        pts.forEach(function (q, i) {
          if (i === 0) ct.moveTo(q[0], q[1]); else ct.lineTo(q[0], q[1]);
        });
        ct.strokeStyle = cores[modo]; ct.lineWidth = 1.8; ct.stroke();
        pts.forEach(function (q) {
          ct.beginPath(); ct.arc(q[0], q[1], 3, 0, 2 * Math.PI);
          ct.fillStyle = cores[modo]; ct.fill();
        });
      });
      G.legenda(g, [{ texto: 'modo 1', cor: cores[0] }, { texto: 'modo 2', cor: cores[1] },
                    { texto: 'modo 3', cor: cores[2] }]);

      var e = erros(neMax);
      mostrar({ e1: F.pct(e[0], 3), e2: isNaN(e[1]) ? '—' : F.pct(e[1], 3),
                e3: isNaN(e[2]) ? '—' : F.pct(e[2], 3) });

      saida.innerHTML = neMax <= 2
        ? 'Com dois elementos o primeiro modo já erra menos de 0,1 %, e o terceiro erra '
          + 'mais de 20 %. A razão é simples: cada elemento só sabe representar uma '
          + 'cúbica, e o terceiro modo tem muito mais curvatura que o primeiro.'
        : 'O erro cai depressa, e cada modo parte de um patamar diferente. A regra prática '
          + 'é esta: quanto mais alto o modo, mais malha ele exige. Numa peça furada, a '
          + 'mesma regra aparece como a necessidade de refinar a malha em volta dos '
          + 'furos.';
      tipografar(saida);
      tipografar(raiz);
    }

    registrarRedesenho(desenhar);
  };

  /* ---------- polinômios, para o Rayleigh-Ritz de placa ---------- */
  /* Um polinômio é um vetor de coeficientes: p[k] multiplica s^k. */
  function polMul(a, b) {
    var c = new Array(a.length + b.length - 1).fill(0);
    for (var i = 0; i < a.length; i++)
      for (var j = 0; j < b.length; j++) c[i + j] += a[i] * b[j];
    return c;
  }
  function polDer(a) {
    return a.length < 2 ? [0] : a.slice(1).map((v, i) => v * (i + 1));
  }
  function polVal(a, s) {
    var v = 0;
    for (var i = a.length - 1; i >= 0; i--) v = v * s + a[i];
    return v;
  }
  function polPot(a, n) {
    var r = [1];
    for (var i = 0; i < n; i++) r = polMul(r, a);
    return r;
  }
  /* Legendre deslocado para [0,1], pela recorrência de Bonnet em t = 2s-1. */
  function legendre(n) {
    var P = [[1], [-1, 2]];
    for (var k = 2; k <= n; k++) {
      var t = polMul([-1, 2], P[k - 1]).map(v => v * (2 * k - 1) / k);
      var u = P[k - 2].map(v => -v * (k - 1) / k);
      var c = t.slice();
      for (var i = 0; i < u.length; i++) c[i] += u[i];
      P.push(c);
    }
    return P[n];
  }
  var EXPO = { S: 1, C: 2, F: 0 };
  function familiaPol(c0, c1, n) {
    var fator = polMul(polPot([0, 1], EXPO[c0]), polPot([1, -1], EXPO[c1]));
    var saida = [];
    for (var k = 0; k < n; k++) saida.push(polMul(fator, legendre(k)));
    return saida;
  }

  /* Jacobi que devolve autovalores E autovetores, em ordem crescente. */
  function jacobiCompleto(Ain, iter) {
    var A = Ain.map(r => r.slice()), n = A.length;
    var V = A.map((_, i) => A.map((__, j) => (i === j ? 1 : 0)));
    for (var s = 0; s < (iter || 120); s++) {
      var off = 0, i, j, k;
      for (i = 0; i < n; i++) for (j = i + 1; j < n; j++) off += A[i][j] * A[i][j];
      if (off < 1e-20) break;
      for (i = 0; i < n; i++) for (j = i + 1; j < n; j++) {
        if (Math.abs(A[i][j]) < 1e-16) continue;
        var th = (A[j][j] - A[i][i]) / (2 * A[i][j]);
        var t = Math.sign(th || 1) / (Math.abs(th) + Math.sqrt(th * th + 1));
        var c = 1 / Math.sqrt(t * t + 1), sn = t * c;
        for (k = 0; k < n; k++) {
          var aik = A[i][k], ajk = A[j][k];
          A[i][k] = c * aik - sn * ajk; A[j][k] = sn * aik + c * ajk;
        }
        for (k = 0; k < n; k++) {
          var aki = A[k][i], akj = A[k][j];
          A[k][i] = c * aki - sn * akj; A[k][j] = sn * aki + c * akj;
          var vki = V[k][i], vkj = V[k][j];
          V[k][i] = c * vki - sn * vkj; V[k][j] = sn * vki + c * vkj;
        }
      }
    }
    var ord = A.map((r, i) => [r[i], i]).sort((a, b) => a[0] - b[0]);
    return { val: ord.map(o => o[0]), vet: ord.map(o => V.map(r => r[o[1]])) };
  }

  /* Rayleigh-Ritz da placa de Kirchhoff. Devolve lambdas e autovetores. */
  function ritzPlaca(bcx, bcy, n, nu, razao) {
    var fx = familiaPol(bcx[0], bcx[1], n);
    var fy = familiaPol(bcy[0], bcy[1], n);
    /* Simpson com 480 intervalos: os integrandos são polinômios suaves. */
    var NG = 480, s = [], w = [];
    for (var q = 0; q <= NG; q++) {
      s.push(q / NG);
      w.push((q === 0 || q === NG ? 1 : (q % 2 ? 4 : 2)) / (3 * NG));
    }
    function amostra(fs) {
      var V = fs.map(p => s.map(x => polVal(p, x)));
      var D1 = fs.map(p => s.map(x => polVal(polDer(p), x)));
      var D2 = fs.map(p => s.map(x => polVal(polDer(polDer(p)), x)));
      return [V, D1, D2];
    }
    var X = amostra(fx), Y = amostra(fy);
    function I(A, B) {
      var m = A.length, R = [];
      for (var i = 0; i < m; i++) {
        R.push([]);
        for (var j = 0; j < m; j++) {
          var t = 0;
          for (var q2 = 0; q2 <= NG; q2++) t += A[i][q2] * B[j][q2] * w[q2];
          R[i].push(t);
        }
      }
      return R;
    }
    var x00 = I(X[0], X[0]), x22 = I(X[2], X[2]),
        x02 = I(X[2], X[0]), x11 = I(X[1], X[1]);
    var y00 = I(Y[0], Y[0]), y22 = I(Y[2], Y[2]),
        y02 = I(Y[2], Y[0]), y11 = I(Y[1], Y[1]);
    var r = razao, N = n * n, K = [], M = [];
    for (var a = 0; a < N; a++) {
      K.push(new Array(N).fill(0));
      M.push(new Array(N).fill(0));
      var i1 = Math.floor(a / n), j1 = a % n;
      for (var b = 0; b < N; b++) {
        var k1 = Math.floor(b / n), l1 = b % n;
        K[a][b] = x22[i1][k1] * y00[j1][l1]
                + Math.pow(r, 4) * x00[i1][k1] * y22[j1][l1]
                + nu * r * r * (x02[i1][k1] * y02[l1][j1] + x02[k1][i1] * y02[j1][l1])
                + 2 * (1 - nu) * r * r * x11[i1][k1] * y11[j1][l1];
        M[a][b] = x00[i1][k1] * y00[j1][l1];
      }
    }
    var Lm = cholesky(M);
    var Li = inversaInferior(Lm);
    var Ared = mult(mult(Li, K), transposta(Li));
    var e = jacobiCompleto(Ared, 160);
    /* desfaz a transformação: v = L^{-T} y  (resolvido por substituição) */
    var vets = e.vet.map(function (y) {
      var v = new Array(N).fill(0);
      for (var i = N - 1; i >= 0; i--) {
        var t = y[i];
        for (var k = i + 1; k < N; k++) t -= Lm[k][i] * v[k];
        v[i] = t / Lm[i][i];
      }
      return v;
    });
    return { lam: e.val.map(v => Math.sqrt(Math.max(v, 0))), vet: vets,
             fx: fx, fy: fy, n: n };
  }

  /* Campo w(x,y) de um modo, numa grade nx por ny. */
  function campoModo(sol, idx, nx, ny) {
    var n = sol.n, c = sol.vet[idx], G2 = [], max = 0;
    var VX = [], VY = [];
    for (var i = 0; i < n; i++) {
      VX.push([]); VY.push([]);
      for (var p = 0; p < nx; p++) VX[i].push(polVal(sol.fx[i], p / (nx - 1)));
      for (var q = 0; q < ny; q++) VY[i].push(polVal(sol.fy[i], q / (ny - 1)));
    }
    for (p = 0; p < nx; p++) {
      G2.push([]);
      for (q = 0; q < ny; q++) {
        var v = 0;
        for (i = 0; i < n; i++)
          for (var j = 0; j < n; j++) v += c[i * n + j] * VX[i][p] * VY[j][q];
        G2[p].push(v);
        if (Math.abs(v) > max) max = Math.abs(v);
      }
    }
    return { W: G2, max: max || 1 };
  }

  /* Desenha um campo como mapa de cores, com a linha nodal destacada. */
  function desenhaCampo(ct, W, max, x0, y0, larg, alt, areia) {
    var nx = W.length, ny = W[0].length;
    var dx = larg / nx, dy = alt / ny;
    for (var p = 0; p < nx; p++) {
      for (var q = 0; q < ny; q++) {
        var v = W[p][q] / max;
        if (areia) {
          var g = Math.min(1, Math.abs(v) * 13);
          ct.fillStyle = 'rgb(' + Math.round(40 + 200 * g) + ','
                       + Math.round(30 + 190 * g) + ',' + Math.round(25 + 180 * g) + ')';
        } else {
          /* cores opacas: com alfa, as bordas das células se somam e
             aparece uma malha que não existe no campo */
          var m2 = Math.min(1, Math.abs(v));
          var cor = v >= 0 ? [138, 90, 36] : [44, 95, 141];
          ct.fillStyle = 'rgb(' + Math.round(255 + (cor[0] - 255) * m2) + ','
                       + Math.round(255 + (cor[1] - 255) * m2) + ','
                       + Math.round(255 + (cor[2] - 255) * m2) + ')';
        }
        ct.fillRect(x0 + p * dx, y0 + alt - (q + 1) * dy, dx + 0.6, dy + 0.6);
      }
    }
    ct.strokeStyle = '#1b1f24';
    ct.lineWidth = 1.2;
    ct.strokeRect(x0, y0, larg, alt);
  }


  REGISTRO.placamodos = function (raiz) {
    var corpo = moldura(raiz, 'Os modos de uma placa retangular');
    var cv = el('canvas');
    corpo.appendChild(cv);

    var CASOS = [
      { rot: 'SSSS', bcx: 'SS', bcy: 'SS', ref: 19.739 },
      { rot: 'SCSC', bcx: 'SS', bcy: 'CC', ref: 28.951 },
      { rot: 'CCCC', bcx: 'CC', bcy: 'CC', ref: 35.99 },
      { rot: 'SFSF', bcx: 'SS', bcy: 'FF', ref: 9.631 },
      { rot: 'Balanço', bcx: 'CF', bcy: 'FF', ref: 3.472 }
    ];
    var caso = CASOS[0], modo = 0, razao = 1.0, nu = 0.3;

    opcoes(corpo, CASOS.map(c => ({ rot: c.rot, v: c })), 0,
      function (v) { caso = v; modo = 0; desenhar(); });
    var botModo = opcoes(corpo, [1, 2, 3, 4].map(i => ({ rot: 'modo ' + i, v: i - 1 })), 0,
      function (v) { modo = v; desenhar(); });
    deslizante(corpo, 'Razão de lados \\(a/b\\):', 0.5, 3, 0.05, 1,
      function (v) { razao = v; desenhar(); }, v => F.fmt(v, 2));

    var mostrar = cartoes(corpo, [
      { rot: '\\(\\lambda\\) do modo', k: 'lam' },
      { rot: 'Tipo', k: 'tipo' },
      { rot: '\\(\\lambda_1\\) na referência', k: 'ref' }
    ]);
    var saida = el('div', { class: 'saida' });
    corpo.appendChild(saida);

    function desenhar() {
      var p = G.preparar(cv, Math.min(330, Math.max(240, cv.clientWidth * 0.5)));
      var ct = p.ct;
      var sol = ritzPlaca(caso.bcx, caso.bcy, 5, nu, razao);
      /* a placa livre-livre tem modos de corpo rígido: saltam-se os nulos */
      var base = 0;
      while (base < sol.lam.length && sol.lam[base] < 1e-6) base++;
      var idx = base + modo;
      var c = campoModo(sol, idx, 64, 64);

      var alt = Math.min(p.A - 30, p.L * 0.42);
      var larg = alt * Math.max(1, razao) / Math.max(1, 1);
      larg = Math.min(p.L * 0.8, alt * razao);
      var hh = larg / razao;
      if (hh > p.A - 30) { hh = p.A - 30; larg = hh * razao; }
      desenhaCampo(ct, c.W, c.max, (p.L - larg) / 2, (p.A - hh) / 2 - 4, larg, hh, false);
      rotulo(ct, 'x', (p.L + larg) / 2 + 10, p.A / 2 - 4, '#5b6773');
      rotulo(ct, 'y', (p.L - larg) / 2 - 10, (p.A - hh) / 2 - 14, '#5b6773');

      /* flexão ou torção: paridade em y */
      var par = 0, imp = 0;
      for (var i = 0; i < 64; i++) for (var j = 0; j < 64; j++) {
        var d = c.W[i][j] - c.W[i][63 - j], e2 = c.W[i][j] + c.W[i][63 - j];
        par += d * d; imp += e2 * e2;
      }
      var tipo = par < imp ? 'flexão' : 'torção';
      mostrar({ lam: F.fmt(sol.lam[idx], 3), tipo: tipo,
                ref: F.fmt(sol.lam[base], 3) + ' (tabela: ' + F.fmt(caso.ref, 3) + ')' });

      saida.innerHTML = caso.rot === 'Balanço'
        ? 'Na placa em balanço os modos se alternam entre flexão, em que a placa inteira '
          + 'sobe e desce, e torção, em que um lado sobe enquanto o outro desce. O modo 2 '
          + 'é o primeiro de torção, e é dele que se extrai o módulo de cisalhamento.'
        : 'As cores são o deslocamento: um sinal em bronze e o outro em azul. As fronteiras '
          + 'entre as cores são as linhas nodais, onde a areia se acumularia. O valor de '
          + '\\(\\lambda\\) vale para qualquer material e qualquer espessura: toda a física '
          + 'do problema está em \\(\\lambda=\\omega a^2\\sqrt{\\rho h/D}\\).';
      tipografar(saida);
      tipografar(raiz);
    }

    registrarRedesenho(desenhar);
  };


  REGISTRO.chladni = function (raiz) {
    var corpo = moldura(raiz, 'As figuras de Chladni e a degenerescência');
    var cv = el('canvas');
    corpo.appendChild(cv);

    var pares = [[1, 2], [1, 3], [2, 3], [1, 4]];
    var par = pares[0], ang = 0;

    opcoes(corpo, pares.map(p => ({ rot: '(' + p[0] + ',' + p[1] + ')', v: p })), 0,
      function (v) { par = v; desenhar(); });
    deslizante(corpo, 'Mistura \\(\\theta\\):', 0, 180, 1, 0,
      function (v) { ang = v; desenhar(); }, v => F.fmt(v, 0) + '°');

    var mostrar = cartoes(corpo, [
      { rot: '\\(\\lambda\\) do par', k: 'lam' },
      { rot: 'Combinação', k: 'comb' }
    ]);
    var saida = el('div', { class: 'saida' });
    corpo.appendChild(saida);

    function desenhar() {
      var p = G.preparar(cv, Math.min(340, Math.max(250, cv.clientWidth * 0.5)));
      var ct = p.ct;
      var m = par[0], n = par[1];
      var th = ang * Math.PI / 180, c1 = Math.cos(th), c2 = Math.sin(th);
      var NX = 96, W = [], max = 0;
      for (var i = 0; i < NX; i++) {
        W.push([]);
        for (var j = 0; j < NX; j++) {
          var x = i / (NX - 1), y = j / (NX - 1);
          var v = c1 * Math.sin(m * Math.PI * x) * Math.sin(n * Math.PI * y)
                + c2 * Math.sin(n * Math.PI * x) * Math.sin(m * Math.PI * y);
          W[i].push(v);
          if (Math.abs(v) > max) max = Math.abs(v);
        }
      }
      var lado = Math.min(p.A - 20, p.L * 0.46);
      desenhaCampo(ct, W, max, p.L * 0.06, (p.A - lado) / 2, lado, lado, false);
      desenhaCampo(ct, W, max, p.L - lado - p.L * 0.06, (p.A - lado) / 2, lado, lado, true);
      rotulo(ct, 'deslocamento', p.L * 0.06 + lado / 2, (p.A - lado) / 2 - 10, '#5b6773');
      rotulo(ct, 'a areia', p.L - lado / 2 - p.L * 0.06, (p.A - lado) / 2 - 10, '#5b6773');

      var lam = Math.PI * Math.PI * (m * m + n * n);
      var nome = ang === 0 ? '\\(W_{' + m + n + '}\\) puro'
               : ang === 90 ? '\\(W_{' + n + m + '}\\) puro'
               : ang === 45 ? 'soma: nó na diagonal'
               : ang === 135 ? 'diferença: nó na outra diagonal'
               : 'mistura qualquer';
      mostrar({ lam: F.fmt(lam, 3), comb: nome });

      saida.innerHTML = 'Os modos \\(('+m+','+n+')\\) e \\(('+n+','+m+')\\) têm a mesma '
        + 'frequência, \\(\\lambda=\\pi^2('+(m*m)+'+'+(n*n)+')='+F.fmt(lam, 2)+'\\), '
        + 'porque girar a placa quadrada de 90° leva um no outro. Qualquer mistura dos dois '
        + 'é também um modo, com a mesma frequência e linhas nodais diferentes. Quem escolhe '
        + 'a mistura, no experimento, é o ponto em que a placa é presa: sobrevive o modo que '
        + 'tem um nó ali. É por isso que a mesma placa, na mesma frequência, mostra figuras '
        + 'diferentes.';
      tipografar(saida);
      tipografar(raiz);
    }

    registrarRedesenho(desenhar);
  };


  /* ---------- inicialização ---------- */
  document.addEventListener('DOMContentLoaded', function () {
    Array.prototype.forEach.call(document.querySelectorAll('[data-widget]'), function (n) {
      var f = REGISTRO[n.getAttribute('data-widget')];
      if (f) {
        try { f(n); }
        catch (e) {
          n.innerHTML = '<div class="saida">Não foi possível carregar este componente.</div>';
          if (window.console) console.error(e);
        }
      }
    });
  });
})();
