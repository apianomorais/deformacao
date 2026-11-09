/* ===================================================================
   comum.js — configuração do MathJax, navegação e utilitários gráficos
   Da kalimba à viga / LFCA / URCA
   =================================================================== */

/* ---------- MathJax ---------- */
window.MathJax = {
  tex: {
    inlineMath: [['\\(', '\\)'], ['$', '$']],
    displayMath: [['\\[', '\\]'], ['$$', '$$']],
    processEscapes: true,
    macros: {
      med: ['\\langle #1 \\rangle', 1],
      /* notação brasileira: sen, tg, cotg, arcsen.
         Redefinimos \sin e \tan para que qualquer fórmula escrita no padrão
         internacional também apareça na notação usada em sala. */
      sen: '\\operatorname{sen}',
      sin: '\\operatorname{sen}',
      tg: '\\operatorname{tg}',
      tan: '\\operatorname{tg}',
      cotg: '\\operatorname{cotg}',
      cot: '\\operatorname{cotg}',
      arcsen: '\\operatorname{arcsen}',
      arcsin: '\\operatorname{arcsen}',
      arctg: '\\operatorname{arctg}',
      arctan: '\\operatorname{arctg}',
      senh: '\\operatorname{senh}',
      sinh: '\\operatorname{senh}',
      tgh: '\\operatorname{tgh}',
      tanh: '\\operatorname{tgh}',
      /* mecânica clássica: vetores com seta, versores com chapéu,
         tensores em sem-serifa. A hamiltoniana fica com o H reto e a
         lagrangiana com o L caligráfico, como em Goldstein. */
      vet: ['\\vec{#1}', 1],
      vers: ['\\hat{#1}', 1],
      Ten: ['\\mathsf{#1}', 1],
      Lag: '\\mathcal{L}',
      Acao: '\\mathcal{S}',
      der: ['\\frac{d #1}{d #2}', 2],
      dder: ['\\frac{d^2 #1}{d #2^2}', 2],
      pder: ['\\frac{\\partial #1}{\\partial #2}', 2],
      dpar: ['\\left(\\frac{\\partial #1}{\\partial #2}\\right)_{#3}', 3],
      med: ['\\left\\langle #1 \\right\\rangle', 1],
      kB: 'k_B',
      Tr: '\\operatorname{Tr}',
      cruz: '\\times',
      R: '\\mathbb{R}',
      N: '\\mathbb{N}'
    }
  },
  options: { skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code'] },
  svg: { fontCache: 'global' }
};

/* ---------- Índice lateral ativo durante a rolagem ---------- */
document.addEventListener('DOMContentLoaded', function () {
  var links = Array.prototype.slice.call(document.querySelectorAll('.lateral a[href^="#"]'));
  if (!links.length) return;
  var alvos = links.map(function (a) {
    return document.getElementById(a.getAttribute('href').slice(1));
  }).filter(Boolean);

  function atualizar() {
    var y = window.scrollY + 110, atual = null;
    alvos.forEach(function (el) { if (el.offsetTop <= y) atual = el; });
    links.forEach(function (a) {
      a.classList.toggle('ativo', atual && a.getAttribute('href') === '#' + atual.id);
    });
  }
  var pendente = false;
  window.addEventListener('scroll', function () {
    if (pendente) return;
    pendente = true;
    window.requestAnimationFrame(function () { atualizar(); pendente = false; });
  }, { passive: true });
  atualizar();
});
/* ===================================================================
   F — utilitários de física estatística
   =================================================================== */
var F = (function () {

  /* Constantes no SI. kB e R em unidades práticas de laboratório. */
  var C = {
    kB: 1.380649e-23,      // J/K
    h: 6.62607015e-34,     // J·s
    hbar: 1.054571817e-34, // J·s
    c: 299792458,          // m/s
    NA: 6.02214076e23,     // 1/mol
    R: 8.314462618,        // J/(mol·K)
    e: 1.602176634e-19,    // C
    me: 9.1093837015e-31,  // kg
    muB: 9.2740100783e-24, // J/T
    sigmaSB: 5.670374419e-8,
    u: 1.66053906660e-27   // kg
  };

  /* ---------- combinatória com logaritmos ---------- */
  var _lnf = [0, 0];
  function lnFatorial(n) {
    if (n < 0) return NaN;
    if (n < 2) return 0;
    if (n < 180) {
      for (var i = _lnf.length; i <= n; i++) _lnf[i] = _lnf[i - 1] + Math.log(i);
      return _lnf[n];
    }
    // Stirling com as duas primeiras correções: erro < 1e-10 já em n = 180
    return (n + 0.5) * Math.log(n) - n + 0.5 * Math.log(2 * Math.PI)
           + 1 / (12 * n) - 1 / (360 * n * n * n);
  }

  /* Stirling cru, o que se usa nas deduções: ln N! ≈ N ln N − N */
  function stirling(n) { return n <= 0 ? 0 : n * Math.log(n) - n; }

  function lnBinom(n, k) {
    return (k < 0 || k > n) ? -Infinity
      : lnFatorial(n) - lnFatorial(k) - lnFatorial(n - k);
  }
  function binom(n, k) { return Math.exp(lnBinom(n, k)); }

  /* ---------- distribuições ---------- */
  function pBinomial(n, k, p) {
    if (k < 0 || k > n) return 0;
    if (p <= 0) return k === 0 ? 1 : 0;
    if (p >= 1) return k === n ? 1 : 0;
    return Math.exp(lnBinom(n, k) + k * Math.log(p) + (n - k) * Math.log(1 - p));
  }

  function dNormal(x, mu, s) {
    var z = (x - mu) / s;
    return Math.exp(-0.5 * z * z) / (s * Math.sqrt(2 * Math.PI));
  }

  /* Maxwell–Boltzmann para o módulo da velocidade, massa m e temperatura T */
  function maxwell(v, m, T) {
    var a = m / (2 * C.kB * T);
    return 4 * Math.PI * v * v * Math.pow(a / Math.PI, 1.5) * Math.exp(-a * v * v);
  }
  function vProvavel(m, T) { return Math.sqrt(2 * C.kB * T / m); }
  function vMedia(m, T) { return Math.sqrt(8 * C.kB * T / (Math.PI * m)); }
  function vQuadratica(m, T) { return Math.sqrt(3 * C.kB * T / m); }

  /* Ocupação média de um estado de energia e, com potencial químico mu.
     tipo: -1 Bose, +1 Fermi, 0 Maxwell–Boltzmann */
  function ocupacao(e, mu, T, tipo) {
    var x = (e - mu) / (C.kB * T);
    if (tipo === 0) return Math.exp(-x);
    if (x > 700) return 0;
    var d = Math.exp(x) + tipo;
    return d <= 0 ? Infinity : 1 / d;
  }
  function fermi(e, mu, T) { return ocupacao(e, mu, T, 1); }
  function bose(e, mu, T) { return ocupacao(e, mu, T, -1); }

  /* Lei de Planck: densidade espectral por comprimento de onda (W/m³) */
  function planck(lam, T) {
    var a = 2 * Math.PI * C.h * C.c * C.c / Math.pow(lam, 5);
    var x = C.h * C.c / (lam * C.kB * T);
    return x > 700 ? 0 : a / (Math.exp(x) - 1);
  }
  function wien(T) { return 2.897771955e-3 / T; }   // λ do máximo

  /* ---------- funções de magnetismo ---------- */
  function langevin(x) {
    if (Math.abs(x) < 1e-4) return x / 3 - x * x * x / 45;
    return 1 / Math.tanh(x) - 1 / x;
  }
  /* Brillouin para spin J */
  function brillouin(J, x) {
    if (Math.abs(x) < 1e-6) return (J + 1) / (3 * J) * x;
    var a = (2 * J + 1) / (2 * J), b = 1 / (2 * J);
    return a / Math.tanh(a * x) - b / Math.tanh(b * x);
  }

  /* Campo médio de Ising: resolve m = tgh((zJm + h)/kT) por iteração amortecida.
     t é a temperatura em unidades de Tc = zJ/kB; h em unidades de zJ. */
  function isingCampoMedio(t, h) {
    if (t <= 0) return h >= 0 ? 1 : -1;
    var m = (t < 1 ? Math.sqrt(Math.max(0, 3 * (1 - t))) : 0) + (h > 0 ? 0.1 : h < 0 ? -0.1 : 0);
    if (m === 0 && h === 0) return 0;
    for (var i = 0; i < 500; i++) {
      var novo = Math.tanh((m + h) / t);
      if (Math.abs(novo - m) < 1e-12) return novo;
      m = m + 0.5 * (novo - m);
    }
    return m;
  }

  /* ---------- calores específicos ---------- */
  /* Einstein: c/(3NkB) para x = T/θE */
  function cEinstein(T, thetaE) {
    if (T <= 0) return 0;
    var x = thetaE / T;
    if (x > 700) return 0;
    var ex = Math.exp(x);
    return x * x * ex / ((ex - 1) * (ex - 1));
  }
  /* Debye: c/(3NkB) para x = T/θD, com a integral feita por Simpson */
  function cDebye(T, thetaD) {
    if (T <= 0) return 0;
    var xm = thetaD / T;
    var f = function (x) {
      if (x < 1e-8) return 0;
      if (x > 700) return 0;
      var ex = Math.exp(x);
      return x * x * x * x * ex / ((ex - 1) * (ex - 1));
    };
    return 3 / (xm * xm * xm) * simpson(f, 1e-9, xm, 400);
  }
  /* Sistema de dois níveis: anomalia de Schottky, c/(NkB) */
  function schottky(T, delta) {
    if (T <= 0) return 0;
    var x = delta / T;
    if (x > 700) return 0;
    var ex = Math.exp(x);
    return x * x * ex / ((1 + ex) * (1 + ex));
  }

  /* ---------- numérico ---------- */
  function simpson(f, a, b, n) {
    n = n || 200;
    if (n % 2) n++;
    var h = (b - a) / n, s = f(a) + f(b);
    for (var i = 1; i < n; i++) s += f(a + i * h) * (i % 2 ? 4 : 2);
    return s * h / 3;
  }

  /* Função de Bessel modificada de segunda espécie, pela representação
     integral  K_a(x) = ∫₀^∞ e^{-x cosh t} cosh(at) dt.  O que se devolve é
     e^x K_a(x), porque para x grande K_a sozinho estoura o ponto flutuante
     e, nas razões em que ela aparece, o fator e^x cancela de qualquer modo.
     O integrando é estreito para x grande (largura ~1/√x) e largo para x
     pequeno, e o corte acompanha os dois casos.
     Confere com scipy.special.kve em onze dígitos para a = 0…4 e
     x entre 0,01 e 10⁴. */
  function besselKe(a, x) {
    if (!(x > 0)) return Infinity;
    var f = function (t) {
      var y = x * (Math.cosh(t) - 1);
      return y > 700 ? 0 : Math.exp(-y) * Math.cosh(a * t);
    };
    var t1 = Math.acosh(1 + 60 / x);
    return simpson(f, 0, t1, 2000) + simpson(f, t1, t1 + 10, 1500);
  }

  /* Raiz de f no intervalo [a,b] por bisseção; devolve null se não houver troca de sinal */
  function bissecao(f, a, b, tol) {
    var fa = f(a), fb = f(b);
    if (fa * fb > 0) return null;
    tol = tol || 1e-12;
    for (var i = 0; i < 200; i++) {
      var m = 0.5 * (a + b), fm = f(m);
      if (b - a < tol || fm === 0) return m;
      if (fa * fm <= 0) { b = m; fb = fm; } else { a = m; fa = fm; }
    }
    return 0.5 * (a + b);
  }

  /* Normal padrão por Box–Muller, para caminhante e movimento browniano */
  var reserva = null;
  function normalAleatoria() {
    if (reserva !== null) { var v = reserva; reserva = null; return v; }
    var u1 = Math.random() || 1e-12, u2 = Math.random();
    var r = Math.sqrt(-2 * Math.log(u1)), th = 2 * Math.PI * u2;
    reserva = r * Math.sin(th);
    return r * Math.cos(th);
  }

  /* ---------- formatação em padrão brasileiro ---------- */
  function fmt(x, casas) {
    if (!isFinite(x)) return '—';
    if (casas === undefined) casas = 4;
    if (x !== 0 && Math.abs(x) < 1e-4) {
      var e = x.toExponential(3).split('e');
      return e[0].replace('.', ',') + '×10<sup>' + Number(e[1]) + '</sup>';
    }
    if (Math.abs(x) >= 1e7) {
      var f = x.toExponential(3).split('e');
      return f[0].replace('.', ',') + '×10<sup>' + Number(f[1]) + '</sup>';
    }
    return x.toFixed(casas).replace('.', ',');
  }
  function pct(x, casas) { return fmt(100 * x, casas === undefined ? 2 : casas) + '%'; }

  return {
    C: C,
    lnFatorial: lnFatorial, stirling: stirling, lnBinom: lnBinom, binom: binom,
    pBinomial: pBinomial, dNormal: dNormal,
    maxwell: maxwell, vProvavel: vProvavel, vMedia: vMedia, vQuadratica: vQuadratica,
    ocupacao: ocupacao, fermi: fermi, bose: bose,
    planck: planck, wien: wien,
    langevin: langevin, brillouin: brillouin, isingCampoMedio: isingCampoMedio,
    cEinstein: cEinstein, cDebye: cDebye, schottky: schottky,
    simpson: simpson, bissecao: bissecao, besselKe: besselKe,
    normalAleatoria: normalAleatoria, fmt: fmt, pct: pct
  };
})();
/* ===================================================================
   Desenho em canvas — eixos, barras e curvas
   =================================================================== */
var G = (function () {

  /* A cor mestra do site é o índigo, para a disciplina não se confundir
     com Mecânica Clássica II, que é verde-petróleo, nem com Física
     Estatística, que é azul-marinho. As demais são
     as cores de série dos gráficos, escolhidas para se distinguirem
     também em preto e branco e para quem não enxerga cor vermelha. */
  var COR = {
    tinta: '#1b1f24', suave: '#5b6773', grade: '#e7e7f0',
    mestra: '#8a5a24', clara: '#d2a86a', vinho: '#8c2f39',
    bronze: '#a8601f', ambar: '#b5831f', roxo: '#6b4e8f',
    azul: '#2c5f8d', fundo: '#ffffff'
  };

  /* Prepara o canvas para telas de alta densidade */
  /* naoLimpar serve para desenhar um segundo painel sobre a mesma tela:
     mexer em cv.width apaga o conteudo, de modo que so redimensionamos
     quando a medida realmente muda. */
  function preparar(cv, altura, naoLimpar) {
    var larg = cv.clientWidth || cv.parentNode.clientWidth || 600;
    var alt = altura || Math.round(larg * 0.56);
    var dpr = window.devicePixelRatio || 1;
    var w = Math.round(larg * dpr), h = Math.round(alt * dpr);
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
    cv.style.height = alt + 'px';
    var ct = cv.getContext('2d');
    ct.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!naoLimpar) {
      ct.clearRect(0, 0, larg, alt);
      ct.fillStyle = COR.fundo;
      ct.fillRect(0, 0, larg, alt);
    }
    return { ct: ct, L: larg, A: alt };
  }

  /* Cria um sistema de eixos. op: {xmin,xmax,ymin,ymax,rotX,rotY,formataX,formataY} */
  function eixos(cv, op) {
    var p = preparar(cv, op.altura, op.limpar === false);
    var ct = p.ct;
    var m = op.margem || { e: 60, d: 16, c: 14, b: 40 };
    var x0 = m.e, x1 = p.L - m.d, y0 = m.c, y1 = p.A - m.b;
    var xmin = op.xmin, xmax = op.xmax, ymin = op.ymin || 0, ymax = op.ymax;

    function X(v) { return x0 + (v - xmin) / (xmax - xmin) * (x1 - x0); }
    function Y(v) { return y1 - (v - ymin) / (ymax - ymin) * (y1 - y0); }

    ct.font = '11px system-ui, sans-serif';
    ct.textBaseline = 'middle';

    // grade horizontal + rótulos y
    var nY = op.divY || 5;
    ct.strokeStyle = COR.grade; ct.lineWidth = 1;
    ct.fillStyle = COR.suave; ct.textAlign = 'right';
    for (var i = 0; i <= nY; i++) {
      var v = ymin + (ymax - ymin) * i / nY, y = Math.round(Y(v)) + 0.5;
      ct.beginPath(); ct.moveTo(x0, y); ct.lineTo(x1, y); ct.stroke();
      var rot = op.formataY ? op.formataY(v) : (Math.abs(v) < 1e-9 ? '0' : v.toPrecision(2));
      ct.fillText(rot, x0 - 7, y);
    }

    // marcas x
    if (op.marcasX) {
      ct.textAlign = 'center'; ct.textBaseline = 'top';
      op.marcasX.forEach(function (t) {
        var x = X(t.v);
        if (x < x0 - 1 || x > x1 + 1) return;
        ct.strokeStyle = COR.grade;
        ct.beginPath(); ct.moveTo(x, y1); ct.lineTo(x, y1 + 4); ct.stroke();
        ct.fillStyle = COR.suave;
        ct.fillText(t.r, x, y1 + 7);
      });
    }

    // eixos
    ct.strokeStyle = COR.suave; ct.lineWidth = 1.2;
    ct.beginPath();
    ct.moveTo(x0, y0); ct.lineTo(x0, y1); ct.lineTo(x1, y1);
    ct.stroke();

    // títulos
    ct.fillStyle = COR.suave; ct.font = '600 11px system-ui, sans-serif';
    if (op.rotX) { ct.textAlign = 'center'; ct.textBaseline = 'bottom';
      ct.fillText(op.rotX, (x0 + x1) / 2, p.A - 2); }
    if (op.rotY) {
      /* o titulo do eixo y fica colado a margem esquerda do proprio painel,
         e nao do canvas, para que dois paineis lado a lado nao se sobreponham */
      ct.save(); ct.translate(Math.max(11, m.e - 49), (y0 + y1) / 2);
      ct.rotate(-Math.PI / 2);
      ct.textAlign = 'center'; ct.textBaseline = 'top'; ct.fillText(op.rotY, 0, 0); ct.restore();
    }

    return { ct: ct, X: X, Y: Y, x0: x0, x1: x1, y0: y0, y1: y1, L: p.L, A: p.A,
             xmin: xmin, xmax: xmax, ymin: ymin, ymax: ymax };
  }

  /* Barras discretas. dados = [{x,y}] */
  function barras(g, dados, cor, larguraRel) {
    var ct = g.ct, n = dados.length;
    if (!n) return;
    var passo = (g.x1 - g.x0) / (g.xmax - g.xmin);
    var w = Math.max(1.5, passo * (larguraRel === undefined ? 0.74 : larguraRel));
    ct.fillStyle = cor || COR.mestra;
    dados.forEach(function (d) {
      var x = g.X(d.x), y = g.Y(d.y), h = g.y1 - y;
      if (h <= 0) return;
      ct.fillRect(x - w / 2, y, w, h);
    });
  }

  /* Curva contínua a partir de f(x) */
  function curva(g, f, cor, espessura, tracejado) {
    var ct = g.ct, passos = 420;
    ct.save();
    ct.strokeStyle = cor || COR.vinho;
    ct.lineWidth = espessura || 2;
    if (tracejado) ct.setLineDash(tracejado);
    ct.beginPath();
    for (var i = 0; i <= passos; i++) {
      var x = g.xmin + (g.xmax - g.xmin) * i / passos, y = f(x);
      if (!isFinite(y)) continue;
      var px = g.X(x), py = g.Y(Math.max(g.ymin, Math.min(g.ymax, y)));
      if (i === 0) ct.moveTo(px, py); else ct.lineTo(px, py);
    }
    ct.stroke();
    ct.restore();
  }

  /* Área sob f(x) entre a e b */
  function area(g, f, a, b, cor) {
    var ct = g.ct, passos = 240;
    a = Math.max(a, g.xmin); b = Math.min(b, g.xmax);
    if (b <= a) return;
    ct.save();
    ct.fillStyle = cor || 'rgba(44,95,141,.26)';
    ct.beginPath();
    ct.moveTo(g.X(a), g.y1);
    for (var i = 0; i <= passos; i++) {
      var x = a + (b - a) * i / passos;
      ct.lineTo(g.X(x), g.Y(Math.max(g.ymin, Math.min(g.ymax, f(x)))));
    }
    ct.lineTo(g.X(b), g.y1);
    ct.closePath(); ct.fill();
    ct.restore();
  }

  /* Linha vertical marcada */
  function vertical(g, x, cor, rotulo, tracejado) {
    var ct = g.ct, px = g.X(x);
    if (px < g.x0 || px > g.x1) return;
    ct.save();
    ct.strokeStyle = cor || COR.vinho; ct.lineWidth = 1.6;
    ct.setLineDash(tracejado === false ? [] : [5, 4]);
    ct.beginPath(); ct.moveTo(px, g.y0); ct.lineTo(px, g.y1); ct.stroke();
    if (rotulo) {
      ct.setLineDash([]);
      ct.fillStyle = cor || COR.vinho;
      ct.font = '600 11px system-ui, sans-serif';
      ct.textAlign = 'center'; ct.textBaseline = 'top';
      ct.fillText(rotulo, px, g.y0 + 1);
    }
    ct.restore();
  }

  /* Legenda simples no canto superior direito */
  function legenda(g, itens) {
    var ct = g.ct, x = g.x1 - 8, y = g.y0 + 10;
    ct.save();
    ct.font = '11px system-ui, sans-serif';
    ct.textAlign = 'right'; ct.textBaseline = 'middle';
    itens.forEach(function (it, i) {
      var yy = y + i * 16;
      ct.fillStyle = COR.tinta;
      ct.fillText(it.texto, x - 16, yy);
      ct.fillStyle = it.cor;
      ct.fillRect(x - 12, yy - 4, 11, 8);
    });
    ct.restore();
  }

  /* Marcas inteiras espaçadas automaticamente */
  function marcasInteiras(min, max, maximoRotulos) {
    var n = max - min + 1, passo = Math.max(1, Math.ceil(n / (maximoRotulos || 12))), m = [];
    for (var v = min; v <= max; v += passo) m.push({ v: v, r: String(v) });
    return m;
  }

  function marcasLineares(min, max, qtd, casas) {
    var m = [];
    for (var i = 0; i <= qtd; i++) {
      var v = min + (max - min) * i / qtd;
      m.push({ v: v, r: v.toFixed(casas === undefined ? 1 : casas).replace('.', ',') });
    }
    return m;
  }

  return { COR: COR, preparar: preparar, eixos: eixos, barras: barras, curva: curva,
           area: area, vertical: vertical, legenda: legenda,
           marcasInteiras: marcasInteiras, marcasLineares: marcasLineares };
})();

/* Redesenha os widgets quando a janela muda de tamanho */
var _redesenhos = [];
function registrarRedesenho(f) { _redesenhos.push(f); f(); }
window.addEventListener('resize', (function () {
  var t;
  return function () {
    clearTimeout(t);
    t = setTimeout(function () { _redesenhos.forEach(function (f) { f(); }); }, 160);
  };
})());
