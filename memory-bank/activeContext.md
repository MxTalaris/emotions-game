# Active Context

## Estado atual

MVP implementado e compilando. Jogo jogável com drag-and-drop funcional.

## Última sessão

- Eventos dispostos em árvore vertical (raízes embaixo, cresce para cima)
- Encadeamento via `triggers` com `EventManager` + `eventTreeLayout`

## Foco imediato (próximos passos sugeridos)

1. Sistema de turnos
2. Lógica de `duration` / expiração de cartas e `fadedEmotion`
3. Implementar `rules` em `onEventComplete`
4. Respeitar `cardsPerTurn`, `cardsRequired`, `autoComplete`
5. Sprites reais para cartas (`image` paths)
6. Offset visual para múltiplas cartas no mesmo evento
7. Animação ao spawnar novos eventos

## Decisões tomadas

- TypeScript + Webpack (preferência do usuário, não Vite)
- Grid fixo para posicionamento de eventos (não aleatório)
- 5 cartas iniciais na mão (`INITIAL_HAND_SIZE = 5`)
- `GameEvent` como nome da entidade evento

## Pontos de extensão

- `GameScene.onEventComplete()` — hook vazio, loga no console
- `triggers?: number[]` e `rules?: unknown[]` nos tipos de evento
- `createCardInstance()` factory para instanciar cartas com `remainingDuration`
