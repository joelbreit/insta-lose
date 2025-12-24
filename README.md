# Insta-Lose

A web-app based card game for playing with my family. It is free and does not require any sign-up or login. The game is partially hosted on a device and partailly through serverless web services. The game is an elimination game where players are eliminated by drawing insta-lose cards.

A host machine starts the game and shows plays the state of the game.

Players can then join on other devices.

## Local Development

> For full setup, run the scripts in the `scripts` folder, then copy from the output folder to `VITE_API_URL` and `VITE_WS_URL` in `.env`. These values also needed added in the Amplify Console for the frontend to work.

1. Install dependencies

```bash
npm install
```

2. Run the development server

```bash
npm run dev
```

3. Open the browser and navigate to http://localhost:5173

## Update Lambda Functions

Run `./scripts/deploy-lambdas.sh` to update the Lambda functions.