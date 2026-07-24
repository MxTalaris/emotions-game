# Product Context

## Problema

Jogo sobre gestão de emoções em situações (eventos). O jogador escolhe quais emoções aplicar a cada evento da vida.

## Experiência do jogador

- Vê cartas de emoções na mão (parte inferior)
- Vê eventos como círculos na tela (grid 3×2)
- Arrasta uma carta para um círculo → carta encolhe e fica dentro
- Evento mostra progresso (ex: `2/3`)
- Ao completar, círculo fica verde

## Entidades

### Carta (Card)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | number | Identificador único |
| name | string | Nome da emoção |
| image | string | Path do sprite (vazio no MVP) |
| suit | string | positive / negative / neutral |
| duration | number | Turnos na mão antes de expirar |
| fadedEmotion | number \| null | ID da carta gerada ao expirar |

**Runtime:** `CardInstance` adiciona `remainingDuration` e `eventId?`

### Evento (GameEvent)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | number | Identificador único |
| label | string | Texto do círculo |
| energyAmount | number | Energia necessária para completar |
| cardsPerTurn | number | Cartas permitidas por turno |
| autoComplete | number | Auto-conclusão (não implementado) |
| cardsRequired | boolean | Exige cartas para completar |
| isBase? | boolean | Evento inicial na tela (apenas 2 no início) |
| triggers? | number[] | IDs de eventos a desencadear ao completar |
| rules? | unknown[] | Regras de conclusão (placeholder) |

**Runtime:** `GameEventInstance` adiciona `x`, `y`, `radius`, `placedCardIds`, `progress`, `completed`

## Catálogo inicial

**Cartas:** Alegria, Tristeza, Raiva, Medo, Surpresa, Nojo

**Eventos base (início):** Conversa difícil, Momento de calma

**Encadeamento:**
- Conversa difícil → Conflito no trabalho → Reunião de família
- Momento de calma → Passeio no parque → Prova importante
