# System Patterns

## Padrão Definition vs Instance

- **Definition** — catálogo estático (`CardDefinition`, `GameEventDefinition`)
- **Instance** — estado em runtime (`CardInstance`, `GameEventInstance`)

Permite adicionar atributos e ações sem refatorar a base.

## Arquitetura de pastas

```
src/
├── main.ts                    # Bootstrap Phaser
├── config/gameConfig.ts       # Dimensões, cores, EVENT_TREE
├── types/                     # Interfaces e factory (createCardInstance)
├── data/                      # Catálogos estáticos (cards, eventTemplates)
├── systems/
│   ├── eventTreeLayout.ts # Layout vertical em árvore (base → filhos acima)
│   └── EventManager.ts    # Base events + encadeamento via triggers
├── scenes/GameScene.ts        # Orquestra cena, drag-and-drop, onEventComplete
└── entities/
    ├── CardSprite.ts          # Visual + drag da carta
    └── EventCircle.ts         # Visual + drop zone do evento
```

## Fluxo de dados

```
eventTemplates → EventManager → GameEventInstance[] → EventCircle
cards → createCardInstance() → CardInstance[] → CardSprite
CardSprite --drag & drop--> EventCircle
EventCircle.addCard() → progress++ → completed
GameScene.onEventComplete() → resolveTriggers() → filhos acima do pai + linha conectora
```

## Árvore de eventos (progressão vertical)

```
        [Reunião]     [Prova]
            |            |
      [Conflito]    [Parque]
            |            |
    [Conversa]      [Calma]    ← raízes (isBase) na base
```

- **Raízes:** 2 eventos base na parte inferior (`baseY`), lado a lado
- **Filhos:** aparecem **acima** do evento pai (`y - levelSpacing`)
- **Ramificações:** múltiplos `triggers` se espalham horizontalmente acima do pai
- **Conectores:** linhas desenhadas entre pai e filho ao spawnar
- Instâncias têm `depth` (nível na árvore) e `parentId`

## eventTreeLayout

- `layoutBaseEvents(count)` — posiciona raízes na base
- `layoutChildEvents(parent, childCount)` — posiciona filhos acima do pai
- `createEventInstance(template, position, parentId?)` — cria instância runtime

## EventManager

- `generateInitialEvents()` — spawna os 2 eventos base (raízes)
- `resolveTriggers(completedEvent)` — spawna filhos acima do nó completado
- Rastreia `spawnedIds` e posições em `eventNodes`

## Drag-and-drop (Phaser)

- `CardSprite.setInteractive({ draggable: true })`
- `scene.input.setDraggable(card)` por carta
- Eventos de cena: `dragstart`, `drag`, `dragend`
- Drop detectado via distância ao centro do círculo (`EventCircle.containsPoint`)
- Carta colocada: escala 0.4, `disableInteractive`, removida da mão

## Convenções

- `GameEvent` (não `Event`) — evita conflito com DOM Event
- Cores por `suit` em `SUIT_COLORS` (gameConfig)
- `onEventComplete` em GameScene spawna filhos e desenha conectores
