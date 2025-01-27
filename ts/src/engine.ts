import * as R from "rambda";
import { playerSizing, RenderLayers } from "./draw.js";
import { Actor, BombermanState } from "./game.js";
import { c_Blocksize_px } from "./constants.js";
import Konva from "konva";

export interface Coordinates {
  x: number;
  y: number;
}
export interface Rect extends Coordinates {
  width: number;
  height: number;
}

export interface Animatable {
  dt: number;
  currentSprite_ix: number;
  keyFrames: number[][];
}

// helpers
export const rectCollision = function (r1: Rect, r2: Rect): boolean {
  const horizontalOut = r1.x + r1.width < r2.x || r1.x >= r2.x + r2.width;
  const verticalOut = r1.y + r1.height < r2.y || r1.y >= r2.y + r2.height;
  if (horizontalOut) return false;
  else return !verticalOut;
};
export const calcRect = {
  player: function ({ x, y }: Coordinates): Rect {
    return { x, y, width: playerSizing.width, height: playerSizing.height };
  },
  default: function ({ x, y }: Coordinates): Rect {
    return {
      x: x * c_Blocksize_px,
      y: y * c_Blocksize_px,
      width: c_Blocksize_px,
      height: c_Blocksize_px,
    };
  },
};
export const toBoardIndices = function ({ x, y }: Coordinates): Coordinates {
  return {
    x: Math.floor(x / c_Blocksize_px),
    y: Math.floor(y / c_Blocksize_px),
  };
};

// controller config
const c_KeyList = [
  // player 1
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "AltRight",
  // player 2
  "KeyA",
  "KeyD",
  "KeyW",
  "KeyS",
  "KeyF",
  // debug
  "KeyP",
  "KeyD",
] as const;

export interface ControllerKeyMap {
  left: AcceptedKey;
  right: AcceptedKey;
  up: AcceptedKey;
  down: AcceptedKey;
  bomb: AcceptedKey;
}
export const playerControlsKeyMap: {
  player1: ControllerKeyMap;
  player2: ControllerKeyMap;
} = {
  player1: {
    left: c_KeyList[0],
    right: c_KeyList[1],
    up: c_KeyList[2],
    down: c_KeyList[3],
    bomb: c_KeyList[4],
  },
  player2: {
    left: c_KeyList[5],
    right: c_KeyList[6],
    up: c_KeyList[7],
    down: c_KeyList[8],
    bomb: c_KeyList[9],
  },
};

type AcceptedKey = (typeof c_KeyList)[number];
interface KeyboardInput {
  keysPressed: Record<AcceptedKey, boolean>; // this map allows to handle multikey press, active when "keydown"
  flagsKeys: { pause: boolean; debug: boolean }; //this map holds flag which are only sets when "keyup", the handlers can set these back to false
}
export type KeysPressed = KeyboardInput["keysPressed"];
export const flagsKeys = {
  pause: false,
  debug: false,
};
export const initializeKeysPressedListener = function () {
  const keysPressed = {} as KeysPressed;
  window.addEventListener(
    "keydown",
    function (event) {
      const keyName = event.code as AcceptedKey;
      keysPressed[keyName] = true;

      // prevent scrolling
      if (c_KeyList.includes(keyName)) {
        event.preventDefault();
      }
    },
    false
  );

  window.addEventListener(
    "keyup",
    function (event) {
      const keyName = event.code as AcceptedKey;
      keysPressed[keyName] = false;

      // for toggles, we need to register it as a single Event
      if (keyName === "KeyP") flagsKeys.pause = true;
      if (keyName === "KeyD") flagsKeys.debug = true;
    },
    false
  );

  return { keysPressed, flagsKeys };
};
// game state
export type GameState = "playing" | "paused";

// game loop
export type UpdateGameStateFn<T> = (
  dt: number,
  prevGameState: T,
  keysInput: KeyboardInput
) => T;
type GameLoop<T> = (
  time: number,
  prevGame: T,
  gameLoopFn: UpdateGameStateFn<T>,
  layer: RenderLayers,
  keyboardInput: KeyboardInput
) => void;

let lastloop: number | null = null;
const gameloop: GameLoop<BombermanState> = (
  time,
  prevGame,
  gameLoopFn,
  layers,
  keyboardInput
) => {
  const dt = lastloop !== null ? time - lastloop : 16.6;
  lastloop = time;

  const { flagsKeys } = keyboardInput;
  // pause requested?
  const newGameState = flagsKeys.pause
    ? prevGame.state === "playing"
      ? "paused"
      : "playing"
    : prevGame.state;
  flagsKeys.pause = false;

  // update
  const game: BombermanState =
    newGameState === "playing"
      ? {
          ...gameLoopFn(dt, prevGame, keyboardInput),
          state: newGameState,
        }
      : { ...prevGame, state: "paused" };

  // debug
  if (flagsKeys.debug) {
    game.isDebugging = !game.isDebugging;
    debugger;
    console.log("Debug:", game.isDebugging);
    flagsKeys.debug = false;
  }

  // render
  if (newGameState === "playing") {
    // add new actors
    const newActors = game.movableActors.filter((x) => !x.konva.isAddedToLayer);
    for (const el of newActors) {
      layers.movementLayer.add(el.konva.konvaObject);
      el.konva.isAddedToLayer = true;
    }
    // TODO: does this separation (board/movable) still makes sense?
    // update animation of relevant actors
    const animatableActors = R.concat(
      game.boardActors.filter((x) => x.type === "brick" && x.isDestroyed) as (Actor & { animation: Animatable })[],
      game.movableActors as (Actor & { animation: Animatable })[],
    )
    for (const el of animatableActors) {
      (el.konva.konvaObject as Konva.Image)
        .crop({
          x: el.animation.keyFrames[el.animation.currentSprite_ix][0],
          y: el.animation.keyFrames[el.animation.currentSprite_ix][1],
          width: el.animation.keyFrames[el.animation.currentSprite_ix][2],
          height: el.animation.keyFrames[el.animation.currentSprite_ix][3],
        })
        .cache();
    }
  }

  window.requestAnimationFrame((time) => {
    gameloop(time, game, gameLoopFn, layers, keyboardInput);
  });
};

export const startGameloop = (
  gameLoopFn: UpdateGameStateFn<BombermanState>,
  initialGameState: BombermanState,
  layers: RenderLayers,
  keyboardInput: KeyboardInput
) => {
  // initialize layers (only needs to draw this once)
  for (const el of initialGameState.boardActors) {
    layers.boardLayer.add(el.konva.konvaObject);
    el.konva.isAddedToLayer = true;
  }
  layers.boardLayer.draw();
  layers.movementLayer.draw();

  // start loop
  window.requestAnimationFrame((time) => {
    gameloop(time, initialGameState, gameLoopFn, layers, keyboardInput);
  });
};
