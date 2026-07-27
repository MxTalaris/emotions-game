# Emotions Game

A browser-based emotions card game built with **Phaser 3** and **TypeScript**. Drag emotion cards from your hand onto life-event circles to progress through a branching event tree.

**Emotional DAMAGE** — manage feelings in everyday situations and unlock new events as you complete them.

## Features

- Emotion cards in hand (drag-and-drop)
- Life events as drop targets with energy / progress
- Event chaining via triggers (tree layout with connectors)
- Content admin UI for cards, personalities, and events
- Background music toggle

## Tech stack

| Technology | Role |
|---|---|
| [Phaser 3](https://phaser.io/) | Game engine |
| [TypeScript](https://www.typescriptlang.org/) | Source language |
| [Webpack 5](https://webpack.js.org/) | Bundler & dev server |
| ts-loader | TypeScript compilation |
| Copy Webpack Plugin | Static assets |

## Requirements

- [Node.js](https://nodejs.org/) 18+ (LTS recommended)
- npm (comes with Node.js)

## Install

```bash
git clone git@github.com:MxTalaris/emotions-game.git
cd emotions-game
npm install
```

## Run

### Development

Starts webpack-dev-server with hot reload:

```bash
npm run dev
```

Then open:

- **Game:** [http://localhost:8080](http://localhost:8080)
- **Admin:** [http://localhost:8080/admin.html](http://localhost:8080/admin.html)

### Production build

```bash
npm run build
```

Output is written to `dist/`. Serve that folder with any static file server.

## Project structure

```
src/
  main.ts              # Game entry (Phaser bootstrap)
  scenes/              # StartScene, GameScene
  entities/            # Cards, events, UI sprites
  systems/             # Turns, events, feelings, rewards
  data/                # Cards, personalities, event templates
  admin/               # Content admin editors
  config/              # Game constants
  types/               # Shared TypeScript types
assets/                # Audio and other static assets
dev/                   # Dev-only data API for the admin panel
```

## License

MIT — see [LICENSE](LICENSE).
