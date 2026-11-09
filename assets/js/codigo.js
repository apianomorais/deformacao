/* ===================================================================
   codigo.js: realce de sintaxe e botão de copiar nos blocos de programa
   Da kalimba à viga / LFCA-URCA

   Sem dependências e sem etapa de construção: o realce é feito por um
   percorrimento simples do texto, que reconhece comentário, texto entre
   aspas, número, palavra reservada e função embutida. É o suficiente
   para Python, que é a linguagem do curso, e não tenta ser um analisador
   de verdade.
   =================================================================== */
(function () {
  'use strict';

  var PALAVRAS = ('False None True and as assert async await break class continue '
    + 'def del elif else except finally for from global if import in is lambda '
    + 'nonlocal not or pass raise return try while with yield match case').split(' ');
  var EMBUTIDAS = ('abs all any bool dict enumerate float format input int len list '
    + 'map max min open print range reversed round set sorted str sum tuple type zip '
    + 'isinstance super object help dir').split(' ');

  function esc(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function realca(txt) {
    var saida = '', i = 0, n = txt.length;
    while (i < n) {
      var c = txt[i];
      /* comentário até o fim da linha */
      if (c === '#') {
        var fim = txt.indexOf('\n', i);
        if (fim < 0) fim = n;
        saida += '<span class="com">' + esc(txt.slice(i, fim)) + '</span>';
        i = fim;
        continue;
      }
      /* texto entre aspas, inclusive triplas */
      if (c === '"' || c === "'") {
        var tripla = txt.substr(i, 3) === c + c + c;
        var marca = tripla ? c + c + c : c;
        var j = i + marca.length;
        while (j < n) {
          if (txt[j] === '\\') { j += 2; continue; }
          if (txt.substr(j, marca.length) === marca) { j += marca.length; break; }
          if (!tripla && txt[j] === '\n') break;
          j++;
        }
        saida += '<span class="str">' + esc(txt.slice(i, Math.min(j, n))) + '</span>';
        i = j;
        continue;
      }
      /* número */
      if (/[0-9]/.test(c) && !/[A-Za-z_0-9]/.test(txt[i - 1] || ' ')) {
        var k = i;
        while (k < n && /[0-9a-fA-FxXoObB_.eE+\-jJ]/.test(txt[k])) {
          if (/[eE+\-]/.test(txt[k]) && !/[0-9eE]/.test(txt[k - 1] || '')) break;
          if (/[+\-]/.test(txt[k]) && !/[eE]/.test(txt[k - 1] || '')) break;
          k++;
        }
        saida += '<span class="num">' + esc(txt.slice(i, k)) + '</span>';
        i = k;
        continue;
      }
      /* identificador */
      if (/[A-Za-z_]/.test(c)) {
        var p = i;
        while (p < n && /[A-Za-z_0-9]/.test(txt[p])) p++;
        var palavra = txt.slice(i, p);
        var depois = txt.slice(p).match(/^\s*\(/);
        if (PALAVRAS.indexOf(palavra) >= 0) {
          saida += '<span class="pal">' + palavra + '</span>';
        } else if (EMBUTIDAS.indexOf(palavra) >= 0 && depois) {
          saida += '<span class="bui">' + palavra + '</span>';
        } else if (/(?:def|class)\s+$/.test(txt.slice(Math.max(0, i - 8), i))) {
          saida += '<span class="dec">' + palavra + '</span>';
        } else {
          saida += esc(palavra);
        }
        i = p;
        continue;
      }
      /* decorador */
      if (c === '@' && /[A-Za-z_]/.test(txt[i + 1] || '')) {
        var q = i + 1;
        while (q < n && /[A-Za-z_0-9.]/.test(txt[q])) q++;
        saida += '<span class="dec">' + esc(txt.slice(i, q)) + '</span>';
        i = q;
        continue;
      }
      saida += esc(c);
      i++;
    }
    return saida;
  }

  function copiar(bloco, botao) {
    var texto = bloco.querySelector('code').textContent;
    function avisar() {
      botao.textContent = 'copiado';
      botao.classList.add('feito');
      setTimeout(function () {
        botao.textContent = 'copiar';
        botao.classList.remove('feito');
      }, 1400);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(texto).then(avisar, function () { manual(texto, avisar); });
    } else {
      manual(texto, avisar);
    }
  }

  /* reserva para navegadores sem a área de transferência moderna */
  function manual(texto, aoFim) {
    var ta = document.createElement('textarea');
    ta.value = texto;
    ta.setAttribute('readonly', '');
    ta.style.position = 'absolute';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); aoFim(); } catch (e) { /* desiste em silêncio */ }
    document.body.removeChild(ta);
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.codigo').forEach(function (bloco) {
      var code = bloco.querySelector('code');
      if (!code) return;
      var lingua = bloco.getAttribute('data-lingua') || 'Python';
      if (lingua.toLowerCase() === 'python') code.innerHTML = realca(code.textContent);
      var barra = document.createElement('div');
      barra.className = 'codigo-barra';
      var nome = document.createElement('span');
      nome.textContent = lingua;
      var bt = document.createElement('button');
      bt.type = 'button';
      bt.textContent = 'copiar';
      bt.addEventListener('click', function () { copiar(bloco, bt); });
      barra.appendChild(nome);
      barra.appendChild(bt);
      bloco.insertBefore(barra, bloco.firstChild);
    });
  });
})();
