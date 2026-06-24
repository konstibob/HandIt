# Hand It 🤝

A social assassination party game — think real-life tag. Players join a lobby
with a room code, each is secretly assigned a target (the targets form one big
loop, so everyone is hunting someone and hunted by someone), and you score by
"handing it" to your mark in real life. Last one standing wins.

It's **web-first**: everyone just opens the game in a browser on their phone or
laptop and joins the same room code — no app install, no accounts.

## Tech stack

- **[Expo](https://docs.expo.dev/) SDK 56** + **Expo Router** — file-based routing, rendered to web via `react-native-web`.
- **[Convex](https://convex.dev)** — real-time backend. Lobby state and game state sync live over a WebSocket, so every player's screen updates instantly.
- No auth: a player is identified by their Convex id, stored in the browser's `localStorage`.

## Project layout

```
convex/            Backend — schema + game logic (lobby.ts), runs on Convex
src/
  app/             Screens & routing
    index.tsx      Home: create or join a room
    lobby/[code]   Lobby + in-game + end screen (branches on game phase)
  lobby/           Lobby hooks & components (mutations, live state, player rows)
  game/            In-game and end-of-game screens
  components/ui/   Design-system widgets (sticker buttons, inputs, avatars)
  constants/       Design tokens (colors, fonts, spacing)
  lib/             Helpers (room-code generation, localStorage session)
scripts/           Dev tooling (e.g. the multi-player test launcher)
```

## Running it locally

You need **two servers running at once** (use two terminals):

```bash
# Terminal 1 — the Convex backend (pushes schema + functions, watches for changes)
npx convex dev

# Terminal 2 — the Expo web dev server
npm run web          # serves at http://localhost:8081
```

Then open http://localhost:8081 in a browser to play.

> First-time setup: `npm install` once to pull dependencies.

## Testing with multiple players

A party game needs several players at once. Instead of juggling Chrome,
Firefox, and your phone, there's a launcher that opens several **isolated**
browser windows — each one is a separate session, so the backend treats them as
different players.

```bash
# Terminal 3 — with the two servers above already running
npm run players              # opens 4 player windows, tiled on screen
npm run players 6            # open 6 instead
npm run players 3 http://localhost:8082   # custom count + URL (if Expo picked another port)
```

It only opens the windows — you create the lobby in one and join from the rest
by hand. Press `Ctrl+C` in that terminal to close them all.

> If `npm run web` reports a port other than `8081`, pass it as the second
> argument to `npm run players` (e.g. `npm run players 4 http://localhost:8082`).

## All scripts

| Command | What it does |
| --- | --- |
| `npm run web` | Start the Expo **web** dev server (main way you run the game) |
| `npx convex dev` | Start/sync the Convex backend — must be running alongside the web server |
| `npm run players` | Open several isolated browser windows for multi-player testing |
| `npm run android` / `npm run ios` | Start the dev server for a native device/emulator |
| `npm test` | Run the Convex backend tests (Vitest) once |
| `npm run test:watch` | Run the tests in watch mode |
| `npm run lint` | Lint the project |

## Convex notes

When changing anything under `convex/`, **read
`convex/_generated/ai/guidelines.md` first** — it has rules that override
general Convex knowledge. The Convex project is `lovable-kangaroo-347`
(eu-west-1).
