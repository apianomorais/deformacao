# -*- coding: utf-8 -*-
"""Gera os sons do site em assets/sons/.

Nenhum deles é gravação: são todos sintetizados com a mesma função nota() do
corda.py do bloco 1, uma soma de senos com envoltória exponencial. Mudam só as
razões entre as frequências, que são o assunto do curso:

    corda                 1, 2, 3, 4, ...              (bloco 1)
    barra livre-livre     1; 2,757; 5,404; 8,933       (bloco 2)
    viga engastada-livre  1; 6,267; 17,55; 34,39       (bloco 3)
    membrana circular     1; 1,593; 2,136; 2,295       (bloco 7)

Uso:  python3 ferramentas/sons.py   (a partir da raiz do site)
Rodar de novo reescreve os mesmos arquivos, idênticos byte a byte.
"""
import os
import wave

import numpy as np

FS = 44100
DESTINO = os.path.join('assets', 'sons')

HARM = np.arange(1, 9)                                   # corda: 1, 2, 3, ... 8
LIVRE = np.array([1.000, 2.757, 5.404, 8.933])           # barra livre-livre
ENGAST = np.array([1.0, 6.267, 17.55, 34.39])            # viga engastada-livre
MEMBRANA = np.array([1.000, 1.593, 2.136, 2.295])        # membrana circular


def nota(razoes, amplitudes, f1, t, tau=0.8):
    """Soma de senos com envoltória exponencial, normalizada (a do corda.py)."""
    y = np.zeros_like(t)
    for r, a in zip(razoes, amplitudes):
        y += a * np.sin(2 * np.pi * f1 * r * t)
    return y / np.abs(y).max() * np.exp(-t / tau)


def dedilhada(f1, x0, multiplo=1, nmax=16, dur=2.5, tau=1.2):
    """Corda dedilhada em x0 (fração de L), com os pesos de Fourier
    sen(n pi x0)/n^2 do bloco 1. Com multiplo > 1 sobram só os modos que têm
    nó no ponto tocado: é o harmônico tirado com o dedo leve."""
    t = np.arange(0, dur, 1 / FS)
    n = np.arange(1, nmax + 1)
    A = np.sin(n * np.pi * x0) / n ** 2
    A[n % multiplo != 0] = 0.0
    return nota(n, A, f1, t, tau)


def diapasao(f=440.0, dur=2.5):
    """Fundamental longa e sobretom em 6,267 f que morre em décimos de segundo."""
    t = np.arange(0, dur, 1 / FS)
    y = (np.sin(2 * np.pi * f * t) * np.exp(-t / 2.0)
         + 0.6 * np.sin(2 * np.pi * 6.267 * f * t) * np.exp(-t / 0.08))
    return y / np.abs(y).max()


def salva(nome, y, pico=0.8):
    y16 = (np.clip(y, -1, 1) * pico * 32767).astype(np.int16)
    with wave.open(os.path.join(DESTINO, nome + '.wav'), 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(FS)
        w.writeframes(y16.tobytes())


def main():
    os.makedirs(DESTINO, exist_ok=True)
    t = np.arange(0, 2.0, 1 / FS)
    a_c, a_b = 1.0 / HARM ** 2, 1.0 / np.arange(1, 5) ** 2
    sons = {
        # bloco 1: corda e barra na mesma fundamental, e os harmônicos da guitarra
        'corda_220': nota(HARM, a_c, 220.0, t),
        'barra_220': nota(LIVRE, a_b, 220.0, t),
        'solta_110': dedilhada(110.0, 1 / 8),
        'harm12_110': dedilhada(110.0, 1 / 8, 2),
        'harm7_110': dedilhada(110.0, 1 / 8, 3),
        'harm5_110': dedilhada(110.0, 1 / 8, 4),
        # bloco 2: metade do comprimento, e o diapasão
        'corda_440': nota(HARM, a_c, 440.0, t),
        'barra_880': nota(LIVRE, a_b, 880.0, t),
        'diapasao_440': diapasao(),
        # bloco 3: a lamela de 40 mm, com engaste perfeito e com engaste que cede 1 mm
        'lamela_510': nota(ENGAST, a_b, 509.6, t),
        'lamela_485': nota(ENGAST, a_b, 485.0, t),
        # bloco 7: membrana, com decaimento curto, como uma batida
        'membrana_220': nota(MEMBRANA, np.array([1.0, 0.7, 0.5, 0.4]), 220.0, t, tau=0.35),
    }
    for nome, y in sons.items():
        salva(nome, y)
        print('escrito: %s/%s.wav' % (DESTINO, nome))


if __name__ == '__main__':
    main()
