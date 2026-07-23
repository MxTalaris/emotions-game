# Progress

## Implementado

- [x] Setup Phaser 3 + TypeScript + Webpack
- [x] Tipos `CardDefinition` / `CardInstance`
- [x] Tipos `GameEventDefinition` / `GameEventInstance`
- [x] Catálogo de 6 emoções básicas (`src/data/cards.ts`)
- [x] 6 templates de eventos (`src/data/eventTemplates.ts`)
- [x] Progressão vertical em árvore (`eventTreeLayout`)
- [x] Conectores visuais entre evento pai e filhos
- [x] `CardSprite` — retângulo vertical draggable, cor por suit
- [x] `EventCircle` — círculo com label e progresso
- [x] `GameScene` — mão de cartas, eventos, drag-and-drop
- [x] Carta encolhe ao ser colocada no evento
- [x] Evento completa quando progress >= energyAmount
- [x] Encadeamento de eventos via `triggers` (`EventManager`)
- [x] Apenas 2 eventos base no início da partida

## Pendente

- [ ] Sistema de turnos
- [ ] Expiração de cartas (`duration`, `fadedEmotion`)
- [ ] Regras de turno (`autoComplete`, `cardsPerTurn`, `cardsRequired`)
- [ ] Regras de conclusão (`rules`)
- [ ] Sprites e assets visuais
- [ ] Sons e animações
- [ ] Offset para cartas empilhadas no mesmo evento

## Problemas conhecidos

- Múltiplas cartas no mesmo evento ficam sobrepostas (aceitável no MVP)
- Bundle grande (~1.15 MiB) — Phaser completo; considerar code splitting no futuro

## Como testar

```bash
npm run dev
```

1. Abrir http://localhost:8080
2. Ver 5 cartas na parte inferior
3. Ver 2 círculos na base da tela (raízes da árvore)
4. Arrastar carta para círculo → carta encolhe dentro
5. Completar evento → filho aparece **acima** com linha conectando
6. Cadeias sobem: Conversa → Conflito → Reunião / Calma → Parque → Prova
