# Deep Research Web UI

This is a web UI for https://github.com/dzhng/deep-research.

> Note: The project is currently WIP, expect bugs.

<video src="https://github.com/user-attachments/assets/c3738551-b258-47c6-90a8-fd097e5165c8"></video>

Features:

- Stream AI responses for realtime feedback
- Viasualization of the research process using a tree structure
- Bring Your Own API Key: Everything (config, API requests, ...) happens in your browser

Available providers currently:
- AI: OpenAI compatible
- Web Search: Tavily (similar to Firecrawl, but with more free quota (1000 credits / month))

## Setup

Make sure to install dependencies:

```bash
# npm
npm install

# pnpm
pnpm install

# yarn
yarn install

# bun
bun install
```

## Development Server

Start the development server on `http://localhost:3000`:

```bash
# npm
npm run dev

# pnpm
pnpm dev

# yarn
yarn dev

# bun
bun run dev
```

## Production

Build the application for production:

```bash
# npm
npm run build

# pnpm
pnpm build

# yarn
yarn build

# bun
bun run build
```

Locally preview production build:

```bash
# npm
npm run preview

# pnpm
pnpm preview

# yarn
yarn preview

# bun
bun run preview
```

Check out the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.

## License

MIT
