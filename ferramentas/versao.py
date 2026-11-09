#!/usr/bin/env python3
"""Carimba uma versao nova nos arquivos CSS e JS de todas as paginas.

O navegador guarda em cache arquivos como estilo.css e widgets.js. Quando
atualizamos o site, o aluno continua vendo a versao antiga ate limpar o
cache. Acrescentar ?v=<numero> ao endereco faz o navegador tratar cada
versao como um arquivo diferente, e a atualizacao chega na hora.

Uso:  python3 ferramentas/versao.py
Roda a partir da raiz do site. Use sempre antes de um commit que mexa em
CSS ou JavaScript.
"""
import datetime
import glob
import re

ALVOS = ('assets/css/estilo.css', 'assets/js/comum.js', 'assets/js/widgets.js')


def main():
    versao = datetime.datetime.now().strftime('%Y%m%d%H%M')
    total = 0

    for pagina in sorted(glob.glob('*.html')):
        texto = io_ler(pagina)
        original = texto
        for alvo in ALVOS:
            # casa o caminho com ou sem ?v=... ja presente
            padrao = re.compile(re.escape(alvo) + r'(\?v=\d+)?')
            texto = padrao.sub(alvo + '?v=' + versao, texto)
        if texto != original:
            io_escrever(pagina, texto)
            total += 1
            print('carimbado:', pagina)

    print('\nversao %s aplicada a %d pagina(s).' % (versao, total))
    print('Agora faca o commit e o push normalmente.')


def io_ler(caminho):
    with open(caminho, encoding='utf-8') as f:
        return f.read()


def io_escrever(caminho, texto):
    with open(caminho, 'w', encoding='utf-8') as f:
        f.write(texto)


if __name__ == '__main__':
    main()
