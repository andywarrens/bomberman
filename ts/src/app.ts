import { BombermanState, initializeGameState } from "./game.js";
import {
  UpdateGameStateFn,
  initializeKeysPressedListener,
  startGameloop,
} from "./engine.js";
import { initRenderingSystem, loadImages } from "./draw.js";
import {
  updateBombs,
  updateBricks,
  updateFires,
  updatePlayer,
} from "./update.js";

// load assets
void loadImages().then(() => {
  // initialize actors
  const gameState = initializeGameState();

  // initialize canvas
  const drawLayers = initRenderingSystem("container");

  // we render at fixed FPS (60):
  // pros: we don't need to decouple update and render
  // https://gamedev.stackexchange.com/questions/132831/what-is-the-point-of-update-independent-rendering-in-a-game-loop
  const updateState: UpdateGameStateFn<BombermanState> = (
    dt,
    prevGameState,
    { keysPressed }
  ) => {
    prevGameState.movableActors
      .filter((actor) => actor.type === "player")
      .forEach((p) => {
        updatePlayer(p, prevGameState, dt, keysPressed);
      });

    updateBombs(prevGameState, dt);
    updateFires(prevGameState, dt);
    updateBricks(prevGameState, dt);

    return prevGameState;
  };

  const keyboard = initializeKeysPressedListener();

  startGameloop(updateState, gameState, drawLayers, keyboard);
});
