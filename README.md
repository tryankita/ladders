# Snakes and Ladders

I tried to build a simple digital version of the classic Snakes and Ladders game. The idea was to keep it familiar and playable in the browser without any setup.

You can try it here:  
https://snakes-and-ladders-one.vercel.app/

## What it does

- Basic Snakes and Ladders gameplay  
- Dice rolling and player movement  
- Clean and simple UI  
- Multiplayer support using websockets  

## About multiplayer

I did add multiplayer so you can play with friends, but It uses websockets, and that does not really work on Vercel directly. I did not have a separate backend server to host it properly, so multiplayer may not work as expected on the deployed version.

If you want to try multiplayer, you will need to run the project locally with the backend.

## Tech used

- Frontend: JavaScript, HTML, CSS  
- Backend: WebSockets  

## Running locally

Clone the repo:

```bash
git clone https://github.com/tryankita/ladders.git
cd ladders

npm install
npm run dev

```
Then you can access the game at localhost:3000
