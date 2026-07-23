# Project Brief — Emotions Game

## Visão geral

Jogo de cartas de emoções construído com **Phaser 3**, **TypeScript** e **Webpack**. O jogador arrasta cartas (emoções) da mão para círculos (eventos) na tela para progredir.

## Objetivo do MVP

- Cartas retangulares verticais na parte inferior da tela, com texto das emoções básicas
- Círculos (eventos) na tela com texto, posicionados em grid fixo
- Drag-and-drop: carta arrastada para um círculo fica pequena dentro dele
- Estrutura extensível para adicionar atributos, ações e encadeamento de eventos

## Mecânicas centrais

1. **Cartas na mão** — retângulos verticais (~80×120px), coloridos por `suit`
2. **Eventos (círculos)** — zonas de drop com label e contador de progresso
3. **Conclusão de evento** — quando `progress >= energyAmount`, evento marca como completo
4. **Encadeamento (futuro)** — eventos completados disparam regras e novos eventos via `triggers`

## Fora do escopo do MVP (mas preparado nos tipos)

- Expiração de cartas (`duration`, `fadedEmotion`)
- Regras de turno (`autoComplete`, `cardsPerTurn`, `cardsRequired`)
- Encadeamento via `triggers` e `rules`
- Sistema de turnos
- Sprites reais, sons e animações
