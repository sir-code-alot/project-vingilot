import { createGame, runGameLoop } from "./game.js";

const canvas = document.getElementById("game-canvas");
if (!(canvas instanceof HTMLCanvasElement)) {
  throw new Error("Canvas element #game-canvas not found");
}

const game = createGame(canvas);
runGameLoop(game);
