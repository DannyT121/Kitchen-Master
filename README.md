# Kitchen Master

Snap a photo of your ingredients and get recipes you can cook with them. Search any recipe with AI.
Built with React Native, Expo (SDK 53) and Expo Router. AI by Anthropic Claude.

## Quick start

```bash
npm install
npx expo install --fix          # aligns package versions with your Expo SDK
cp .env.example .env            # then add your Anthropic API key
npx expo start                  # scan the QR code with Expo Go
```

Full documentation (features, architecture, AI prompts, security, troubleshooting) is in the
Kitchen Master documentation doc shared alongside this project.

## Scripts

| Command | What it does |
| --- | --- |
| `npm start` | Start the Expo dev server |
| `npm run android` / `npm run ios` | Open on an emulator or simulator |
| `npm run proxy` | Start the optional API proxy (needs `ANTHROPIC_API_KEY`) |
| `npm run typecheck` | TypeScript check |

> The direct-key mode (`EXPO_PUBLIC_ANTHROPIC_API_KEY`) is for development only. Use the proxy before publishing.
