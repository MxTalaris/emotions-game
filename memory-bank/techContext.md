# Tech Context

## Stack

| Tecnologia | Versão | Uso |
|------------|--------|-----|
| Phaser | 3.87 | Engine do jogo |
| TypeScript | 5.7 | Tipos e código fonte |
| Webpack | 5 | Bundler |
| ts-loader | 9.5 | Compilação TS |
| webpack-dev-server | 5.2 | Dev server |

## Comandos

```bash
npm run dev    # http://localhost:8080
npm run build  # gera dist/
```

## Configuração

- **Resolução:** 800×600 (`GAME_WIDTH`, `GAME_HEIGHT`)
- **Grid de eventos:** `EVENT_TREE` em gameConfig (baseY, levelSpacing, branchSpacing)
- **Mão:** Y = 460, spacing 90px entre cartas
- **Carta:** 80×120px

## Arquivos de config

- `webpack.config.js` — entry `src/main.ts`, output `dist/`, porta 8080
- `tsconfig.json` — strict, ES2020, rootDir `src/`
- `index.html` — template para HtmlWebpackPlugin

## Repositório

- Path: `/Applications/MAMP/htdocs/emotions-game`
- Remote: `git@github.com:MxTalaris/emotions-game.git`
- Branch: `initial`

## Assets

- Pasta `assets/` copiada para `dist/assets/` via CopyWebpackPlugin (vazia por ora)
- Cartas usam cor por `suit`; `image` string vazia no MVP
