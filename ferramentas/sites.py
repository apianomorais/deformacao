# -*- coding: utf-8 -*-
"""Liga entre si os sites do Prof. Apiano Morais (LFCA/URCA).

O QUE FAZ
    1. Escreve, na página inicial deste site, um bloco com os outros sites,
       entre os marcadores <!--SITES--> e <!--/SITES-->.
    2. Acrescenta, no rodapé de TODAS as páginas, uma linha apontando para o
       portal, entre os marcadores <!--PORTAL--> e <!--/PORTAL-->.

USO
    python3 ferramentas/sites.py          (a partir da raiz do site)

    Rodar de novo não duplica nada: o conteúdo entre os marcadores é
    substituído, e não acrescentado. Para mudar a lista, mude SITES aqui e
    copie este arquivo para os outros repositórios; ele é o mesmo em todos, e
    descobre sozinho em qual site está.

POR QUE ASSIM
    Os oito sites são gerados de maneiras diferentes: dois têm molde próprio e
    seis são páginas escritas à mão com um script que só atualiza menu e
    navegação. Um injetor que trabalha sobre o HTML pronto funciona nos dois
    casos, e os marcadores deixam a operação reversível e repetível.

Prof. Apiano Morais - LFCA/URCA
"""
import glob
import os
import re
import subprocess

PORTAL = 'https://apianomorais.github.io/'
BASE = 'https://apianomorais.github.io/%s/'

# (chave do repositório, grupo, título, etiqueta, uma linha de descrição)
SITES = [
    ('mecanica-classica-i', 'disciplina', 'Mecânica Clássica I',
     'DF005',
     'Das leis de Newton às órbitas de Kepler, passando pelas oscilações e '
     'pelo ponto em que o determinismo deixa de ser previsão.'),
    ('eletromagnetismo', 'disciplina', 'Eletromagnetismo',
     'DF032 · DF033 · DF053',
     'Doze capítulos, do cálculo vetorial à radiação, com exercícios '
     'resolvidos e programas em Python que conferem cada conta.'),
    ('fisica-estatistica', 'disciplina', 'Física Estatística',
     'Dez módulos',
     'De Boltzmann aos gases quânticos e à supercondutividade, com widgets '
     'interativos em cada módulo.'),
    ('mecanica-classica-ii', 'disciplina', 'Mecânica Clássica II',
     'DF006',
     'Corpo rígido, referenciais em rotação, cálculo variacional, Lagrange, '
     'Hamilton e o espaço de fase.'),
    ('mecanica-classica-iii', 'disciplina', 'Mecânica Clássica III',
     'DF007',
     'Tensor de inércia, equações de Euler, o pião simétrico, modos normais '
     'e a equação de onda.'),
    ('fenomenos-transporte', 'disciplina', 'Fenômenos de Transporte',
     'DF065',
     'Calor, massa e momento transportados pela mesma equação, de '
     'Navier-Stokes à lei de Fick.'),
    ('probabilidade-estatistica', 'disciplina', 'Probabilidade e Estatística',
     'Licenciatura EAD',
     'Erros de medida, propagação de incertezas, mínimos quadrados e testes '
     'de hipóteses.'),
    ('informatica-fisica', 'disciplina', 'Informática para Física',
     'DF050',
     'Planilha, LaTeX e Python num fluxo de trabalho único, da tabela de '
     'medidas ao relatório final.'),
    ('deformacao', 'disciplina', 'Da kalimba à viga',
     'Minicurso',
     'Vibração, frequências naturais e elementos finitos em Python, na '
     'Semana Universitária da URCA.'),
    ('urbanicity-gradient-index-ugi', 'pesquisa',
     'IGU · Índice de Gradiente de Urbanicidade',
     'Pesquisa',
     'Calculadora aberta do índice publicado em Frontiers of Urban and Rural '
     'Planning 4, 18 (2026), com a metodologia e os dados do artigo.'),
    ('reticulado', 'pesquisa',
     'Dinâmica em potenciais de rede',
     'Pesquisa',
     'Geometria, caos e transporte em potenciais periódicos: reticulados, '
     'anisotropia, forma normal e difusão, com os programas do projeto.'),
    ('jaguarete', 'divulgacao', 'Jaguaretê',
     'Jogo',
     'Jogo de estratégia sobre pecuária e grandes felinos no Pantanal, na '
     'Amazônia, no Cerrado, na Caatinga e na Chapada do Araripe, com dinâmica '
     'de presa e predador.'),
]

LINHA_RODAPE = (
    '<!--PORTAL--><p><small><a href="%s">Todas as disciplinas e a pesquisa '
    'em apianomorais.github.io</a></small></p><!--/PORTAL-->' % PORTAL)


def daqui():
    """Descobre a chave deste site, pelo remoto do git ou pela pasta."""
    try:
        url = subprocess.check_output(
            ['git', 'config', '--get', 'remote.origin.url'],
            stderr=subprocess.DEVNULL).decode().strip()
        nome = url.rstrip('/').split('/')[-1]
        if nome.endswith('.git'):
            nome = nome[:-4]
        if nome in [s[0] for s in SITES]:
            return nome
    except Exception:
        pass
    return os.path.basename(os.path.abspath('.'))


def cartao(s):
    _chave, _grupo, titulo, etiqueta, desc = s
    return ('''    <article class="cartao">
      <h3><a href="%s">%s</a></h3>
      <p><small>%s</small></p>
      <p>%s</p>
    </article>''' % (BASE % _chave, titulo, etiqueta, desc))


def bloco(aqui=None, titulo=True, marcadores=True):
    """O HTML do bloco de outros sites, sem o site atual.

    titulo=False serve para os sites cujo molde já põe o <h2> da seção.
    """
    aqui = aqui or daqui()
    grupos = [[s for s in SITES if s[1] == g and s[0] != aqui]
              for g in ('disciplina', 'pesquisa', 'divulgacao')]
    partes = []
    if marcadores:
        partes.append('<!--SITES-->')
    if titulo:
        partes += ['  <h2>Outros sites</h2>', '']
    partes += ['  <p>As demais disciplinas que ministro na URCA, e a pesquisa '
              'do laboratório. Tudo reunido em '
              '<a href="%s">apianomorais.github.io</a>.</p>' % PORTAL, '']
    for grupo in grupos:
        if not grupo:
            continue
        partes.append('  <div class="cartoes">')
        partes += [cartao(s) for s in grupo]
        partes += ['  </div>', '']
    if marcadores:
        partes.append('<!--/SITES-->')
    return '\n'.join(partes)


def _troca(texto, abre, fecha, novo):
    """Substitui o que está entre os marcadores. Devolve (texto, achou)."""
    padrao = re.compile(re.escape(abre) + '.*?' + re.escape(fecha), re.S)
    if padrao.search(texto):
        return padrao.sub(lambda _: novo, texto, count=1), True
    return texto, False


def aplica_rodape(caminho):
    """Põe a linha do portal no rodapé da página, se ainda não estiver lá."""
    h = open(caminho, encoding='utf-8').read()
    novo, achou = _troca(h, '<!--PORTAL-->', '<!--/PORTAL-->', LINHA_RODAPE)
    if not achou:
        if '</footer>' not in h:
            return False
        novo = h.replace('</footer>', '  %s\n</footer>' % LINHA_RODAPE, 1)
    if novo == h:
        return False
    open(caminho, 'w', encoding='utf-8').write(novo)
    return True


def aplica_index(caminho='index.html', aqui=None):
    """Escreve o bloco de outros sites na página inicial."""
    if not os.path.exists(caminho):
        return False
    h = open(caminho, encoding='utf-8').read()
    novo, achou = _troca(h, '<!--SITES-->', '<!--/SITES-->', bloco(aqui))
    if not achou:
        alvo = '</main>' if '</main>' in h else '<footer'
        novo = h.replace(alvo, '%s\n\n%s' % (bloco(aqui), alvo), 1)
    if novo == h:
        return False
    open(caminho, 'w', encoding='utf-8').write(novo)
    return True


def main():
    aqui = daqui()
    print('site atual: %s' % aqui)
    if aplica_index(aqui=aqui):
        print('  index.html: bloco de outros sites escrito')
    else:
        print('  index.html: sem mudança')
    n = 0
    for pg in sorted(glob.glob('*.html')):
        if aplica_rodape(pg):
            n += 1
    print('  rodapé do portal em %d página(s)' % n)


if __name__ == '__main__':
    main()
