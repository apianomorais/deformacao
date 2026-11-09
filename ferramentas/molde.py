# -*- coding: utf-8 -*-
"""Escreve as páginas do minicurso a partir do conteúdo de cada bloco.

A navegação sai da lista BLOCOS: mudando a ordem aqui, o menu do topo e
as setas de rodapé de todas as páginas se reorganizam sozinhos.
"""
import io
import pathlib

RAIZ = pathlib.Path(__file__).resolve().parent.parent

# (arquivo, rótulo curto do menu, título da página, subtítulo)
BLOCOS = [
    ('index.html', 'Início', 'Da kalimba à viga', ''),
    ('bloco1.html', '1', 'Bloco 1: duas equações',
     'Corda e barra obedecem a equações diferentes, e é dessa diferença que vêm '
     'o timbre, a lei de escala e tudo o mais que o minicurso vai usar.'),
    ('bloco2.html', '2', 'Bloco 2: a viga engastada',
     'A lamela da kalimba é uma viga presa numa ponta e livre na outra. Este bloco '
     'resolve esse problema por completo, no papel.'),
    ('bloco3.html', '3', 'Bloco 3: o método dos elementos finitos',
     'A fórmula do bloco anterior é exata e frágil. O MEF é a saída geral, e a ideia '
     'dele cabe em quatro passos.'),
    ('bloco4.html', '4', 'Bloco 4: mão na massa',
     'Agora é com você: montar as matrizes, impor o engaste, resolver o problema de '
     'autovalores e conferir contra a solução analítica.'),
    ('bloco5.html', '5', 'Bloco 5: para onde isso vai',
     'Do 1D ao 3D, a pesquisa do grupo em placas perfuradas e onde essa mesma conta '
     'aparece fora do laboratório.'),
    ('apendices.html', 'Apêndices', 'Apêndices',
     'As duas deduções passo a passo, a folha de apoio com tudo em uma página e o '
     'preparo do computador.'),
]

CABECA = '''<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{titulo} | Da kalimba à viga</title>
<link rel="icon" type="image/png" href="assets/img/favicon.png">
<link rel="stylesheet" href="assets/css/estilo.css">
<script src="assets/js/comum.js"></script>
<script src="assets/js/codigo.js"></script>
<script id="MathJax-script" async src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js"></script>
</head>
<body>

<header class="topo">
  <div class="topo-interno">
    <a class="marca" href="index.html">Da kalimba à viga <span>· LFCA/URCA</span></a>
    <nav class="menu">
{menu}
    </nav>
  </div>
</header>

<div class="envoltorio">
{lateral}
<main class="conteudo">

{chapeu}
  <h1>{h1}</h1>
{subtitulo}
{corpo}

  <nav class="nav-aulas">
{nav}
  </nav>

</main>
</div>

<footer class="rodape">
  <img class="logo-rodape" src="assets/img/logo-lfca.png" alt="LFCA | URCA">
  <p><strong>Prof. Apiano Morais</strong> · <a href="mailto:apiano.morais@urca.br">apiano.morais@urca.br</a><br>
  Laboratório de Física Computacional Aplicada (LFCA) · Universidade Regional do Cariri</p>
</footer>

<script src="assets/js/widgets.js"></script>
</body>
</html>
'''


def menu(atual):
    partes = []
    for arq, curto, _t, _s in BLOCOS:
        if curto == 'Início':
            partes.append('      <a href="%s"%s>Início</a>'
                          % (arq, ' class="ativo"' if arq == atual else ''))
        elif curto == 'Apêndices':
            partes.append('      <a href="%s"%s>Apêndices</a>'
                          % (arq, ' class="ativo"' if arq == atual else ''))
        else:
            if curto == '1':
                partes.append('      <span class="grupo">Blocos</span>')
            cls = 'num ativo' if arq == atual else 'num'
            partes.append('      <a href="%s" class="%s" title="%s">%s</a>'
                          % (arq, cls, _t, curto))
    return '\n'.join(partes)


def navegacao(atual):
    i = [b[0] for b in BLOCOS].index(atual)
    saida = []
    if i > 0:
        saida.append('    <a href="%s"><small>Anterior</small>← %s</a>'
                     % (BLOCOS[i - 1][0], BLOCOS[i - 1][2]))
    if i < len(BLOCOS) - 1:
        saida.append('    <a class="prox" href="%s"><small>Próximo</small>%s →</a>'
                     % (BLOCOS[i + 1][0], BLOCOS[i + 1][2]))
    return '\n'.join(saida)


def escreve(arquivo, corpo, secoes=None, chapeu=None, titulo_proprio=False):
    i = [b[0] for b in BLOCOS].index(arquivo)
    _a, _c, titulo, sub = BLOCOS[i]
    lateral = ''
    if secoes:
        itens = '\n'.join('    <li><a href="#s%d">%d. %s</a></li>' % (j + 1, j + 1, t)
                          for j, t in enumerate(secoes))
        lateral = ('\n<aside class="lateral">\n  <h4>Neste bloco</h4>\n  <ol>\n%s\n'
                   '  </ol>\n</aside>\n' % itens)
    # uma página que já traz o seu próprio cabeçalho (o herói da capa) não
    # recebe o h1 do molde, senão o título aparece duas vezes
    pag = CABECA.format(
        titulo=titulo, h1=titulo, menu=menu(arquivo), lateral=lateral,
        chapeu='  <p class="chapeu">%s</p>' % chapeu if chapeu else '',
        subtitulo='  <p class="subtitulo">%s</p>' % sub if sub else '',
        corpo=corpo, nav=navegacao(arquivo))
    if titulo_proprio:
        pag = pag.replace('  <h1>%s</h1>\n' % titulo, '', 1)
    (RAIZ / arquivo).write_text(pag, encoding='utf-8')
    print('%s escrito (%d caracteres)' % (arquivo, len(pag)))


def secoes_html(secoes):
    """secoes: lista de (titulo, html). Recua o HTML para encaixar no molde,
    deixando intactos os blocos <pre>: ali todo espaço conta, e recuar as
    linhas desalinha a indentação do Python."""
    saida = []
    for i, (titulo, html) in enumerate(secoes):
        saida.append('  <!-- ============================================== -->')
        saida.append('  <h2 id="s%d">%d. %s</h2>\n' % (i + 1, i + 1, titulo))
        dentro = False
        for linha in html.strip('\n').split('\n'):
            if '<pre' in linha:
                dentro = True
            saida.append(linha if dentro or not linha.strip() else '  ' + linha)
            if '</pre>' in linha:
                dentro = False
        saida.append('')
    return '\n'.join(saida)
