import * as R from "rambda";
import Konva from "konva";
import {
  c_Blocksize_px,
  c_Blocks,
  c_Default_bomb_idle_time,
} from "./constants.js";
import {
  ControllerKeyMap,
  GameState,
  playerControlsKeyMap,
  Coordinates,
  Animatable,
} from "./engine.js";
import {
  createBlockImg,
  createBombImg,
  createBrickImg,
  createFireImg,
  createFloorRect,
  createPlayerImg,
  playerSizing,
} from "./draw.js";
import {
  bombAnimation,
  brickBreakAnimation,
  fireAnimation,
  playerAnimations,
} from "./animations.js";
import { level1 } from "./levels.js";

export type BoardActors = (Floor | Block | Brick)[];
export type MovableActors = (Player | Bomb | Fire)[];

export interface BombermanState {
  state: GameState;
  isDebugging: boolean;

  board: SimpleBoardState; // must be kept in sync with boardActors & movableActors
  explosionCountBoard: BoardExplosionCountState;
  boardActors: BoardActors;
  movableActors: MovableActors;

  layersDrawn: boolean;
}

export interface Actor extends Coordinates {
  type: "player" | "block" | "bomb" | "fire" | "floor" | "brick";
  konva: {
    isAddedToLayer: boolean;
    konvaObject: Konva.Rect | Konva.Image;
  };
}

export type Direction = "up" | "down" | "left" | "right";
export interface Player extends Actor {
  type: "player";
  controls: ControllerKeyMap;
  animation: Animatable;
  stats: {
    isAlive: boolean;
    lives: number;
    score: number;
  };
  bombs: {
    strength: number;
    active: number;
    maxLimit: number;
  };
  moving: {
    movementFacing: { x: -1 | 0 | 1; y: -1 | 0 | 1 };
    isStillOnDroppedBomb: boolean; // when dropping a bomb, player must be able to move off this (see collision detection)
  };
}

export interface Block extends Actor {
  type: "block";
}

export interface Brick extends Actor {
  type: "brick";
  isDestroyed: boolean;
  animation: Animatable;
}
export interface Floor extends Actor {
  type: "floor";
}

export interface Bomb extends Actor {
  type: "bomb";
  owner: Player;
  state: "idle" | "exploding" | "exploded";
  animation: Animatable;
}

export interface Fire extends Actor {
  type: "fire";
  animation: Animatable;
}

export enum SimpleBoardStateEnum {
  floor = 0,
  block = 1,
  brick = 2,
  bomb = 3,
  fire = 4,
  player1 = 10,
  player2 = 11,
}
export type SimpleBoardState = SimpleBoardStateEnum[][];
type BoardExplosionCountState = number[][]; // keeps track of how much fire PER square (e.g. bomb 1 and bomb 2 both have their fire explosion go over square x)

export function initializeGameState(): BombermanState {
  const { board, movableActors } = createLevel(level1);

  return {
    state: "playing",
    isDebugging: false,
    board: level1,
    explosionCountBoard: [...level1].map((row) => row.map(() => 0)),
    boardActors: board,
    movableActors,
    layersDrawn: false,
  };
}

const createActor: (
  position: Coordinates,
  type: Extract<Actor["type"], "brick" | "block" | "floor">
) => Pick<Actor, "konva"> & Coordinates = (position, type) => {
  const posScaled = {
    x: position.x * c_Blocksize_px,
    y: position.y * c_Blocksize_px,
  };
  return {
    ...posScaled,
    konva: {
      isAddedToLayer: false,
      konvaObject:
        type === "brick"
          ? createBrickImg(posScaled)
          : type === "block"
          ? createBlockImg(posScaled)
          : createFloorRect(posScaled),
    },
  };
};

export const createBomb: (x_ix: number, y_ix: number, owner: Player) => Bomb = (
  x_ix,
  y_ix,
  owner
) => {
  const pos = {
    x: x_ix * c_Blocksize_px,
    y: y_ix * c_Blocksize_px,
  };
  return {
    type: "bomb",
    ...pos,
    state: "idle",
    owner,
    konva: {
      isAddedToLayer: false,
      konvaObject: createBombImg(pos),
    },
    animation: {
      dt: 0,
      maxDt: c_Default_bomb_idle_time,
      currentSprite_ix: 0,
      keyFrames: bombAnimation.idleBombKeyframes,
    },
  };
};

// player sizing: a player doesnt fill the whole block of course, otherwise he
// couldnt move around properly
const createPlayer: (
  x: number,
  y: number,
  controlKeys: ControllerKeyMap
) => Player = (i_x, i_y, controls) => {
  // place player in middle of starting block
  const offset = {
    x: (c_Blocksize_px - playerSizing.width) * 0.5,
    y: (c_Blocksize_px - playerSizing.height) * 0.5,
  };
  const pos = {
    x: i_x * c_Blocksize_px + offset.x,
    y: i_y * c_Blocksize_px + offset.y,
  };
  const p: Player = {
    type: "player",
    ...pos,
    controls,
    stats: {
      isAlive: true,
      lives: 3,
      score: 0,
    },
    bombs: {
      strength: 3,
      maxLimit: 3,
      active: 0,
    },
    moving: {
      movementFacing: { x: pos.x < c_Blocks / 2 ? 1 : -1, y: 0 },
      isStillOnDroppedBomb: false,
    },
    konva: {
      isAddedToLayer: false,
      konvaObject: createPlayerImg(pos),
    },
    animation: {
      dt: 0,
      currentSprite_ix: 0,
      keyFrames: playerAnimations.walking.down,
    },
  };
  return p;
};

function createFire(
  pos: Coordinates,
  fireDirection: keyof typeof fireAnimation
): Fire {
  return {
    type: "fire",
    ...pos,
    konva: {
      isAddedToLayer: false,
      konvaObject: createFireImg(pos, fireDirection),
    },
    animation: {
      dt: 0,
      currentSprite_ix: 0,
      keyFrames: fireAnimation[fireDirection],
    },
  };
}

export const createFireExplosion = function (
  gameState: BombermanState,
  { x: x_ix, y: y_ix }: Coordinates, // bomb position
  bombStrength: number
) {
  // cross
  gameState.board[y_ix][x_ix] = SimpleBoardStateEnum.fire;
  gameState.explosionCountBoard[y_ix][x_ix]++;
  gameState.movableActors.push(
    createFire({ x: x_ix * c_Blocksize_px, y: y_ix * c_Blocksize_px }, "cross")
  );

  // get all player positions
  const playersCenter_ix = R.pipe(
    R.filter((a: Actor) => a.type === "player"),
    R.map(p => ({
      p,
      x: Math.floor((p.x + playerSizing.width / 2) / c_Blocksize_px),
      y: Math.floor((p.y + playerSizing.height / 2) / c_Blocksize_px),
    })),
  )(gameState.movableActors);
  if (gameState.isDebugging) debugger;

  const createFireStreak = function (
    middle: "horizontal" | "vertical",
    fireend: Direction
  ) {
    let i = 1;

    const colInc = middle === "vertical" ? 0 : fireend === "left" ? -1 : 1;
    const rowInc = middle === "horizontal" ? 0 : fireend === "up" ? -1 : 1;

    // keep going until we find something that will stop the fire (brick, block, bomb)
    while (
      i < bombStrength &&
      ![
        SimpleBoardStateEnum.block,
        SimpleBoardStateEnum.bomb,
        SimpleBoardStateEnum.brick,
      ].includes(gameState.board[y_ix + rowInc * i][x_ix + colInc * i])
    ) {
      const row = y_ix + rowInc * i;
      const col = x_ix + colInc * i;
      gameState.board[row][col] =
        SimpleBoardStateEnum.fire;
      gameState.explosionCountBoard[row][col]++;
      gameState.movableActors.push(
        createFire(
          {
            x: col * c_Blocksize_px,
            y: row * c_Blocksize_px,
          },
          colInc === 0 ? "vertical" : "horizontal"
        )
      );

      // check if player was hit
      playersCenter_ix
        .filter(( { x: x_ix, y: y_ix } ) => x_ix === col && y_ix === row)
        .forEach(({ p }) => {
          (p as Player).stats.isAlive = false;
          (p as Player).animation.dt = 0;
        });

      i++;
    }

    // if the fire encountered a brick, break it
    if (
      gameState.board[y_ix + rowInc * i][x_ix + colInc * i] ===
      SimpleBoardStateEnum.brick
    ) {
      const boardPos_ix = { x: x_ix + colInc * i, y: y_ix + rowInc * i };
      const el = gameState.boardActors.find(
        ({ x, y }) =>
          x === boardPos_ix.x * c_Blocksize_px &&
          y === boardPos_ix.y * c_Blocksize_px
      );
      console.assert(!!el && el.type === "brick");
      (el as Brick).isDestroyed = true;
    }
    // if a bomb: explode it
    else if (
      gameState.board[y_ix + rowInc * i][x_ix + colInc * i] ===
      SimpleBoardStateEnum.bomb
    ) {
      const boardPos_ix = { x: x_ix + colInc * i, y: y_ix + rowInc * i };
      const el = gameState.movableActors.find(
        (a) =>
          a.type === "bomb" &&
          a.x === boardPos_ix.x * c_Blocksize_px &&
          a.y === boardPos_ix.y * c_Blocksize_px
      );
      console.assert(!!el && el.type === "bomb");
      (el as Bomb).animation.dt = Math.max(
        c_Default_bomb_idle_time * 0.9,
        (el as Bomb).animation.dt
      ); // fast forward the bomb to 'exploding'
    }
    // else, if it also didn't end on a Block then it was a full explosion
    else if (
      i === bombStrength &&
      gameState.board[y_ix + rowInc * i][x_ix + colInc * i] !==
        SimpleBoardStateEnum.block
    ) {
      const row = y_ix + rowInc * i;
      const col = x_ix + colInc * i;
      //  give the last block an 'end' image
      gameState.board[row][col] =
        SimpleBoardStateEnum.fire;
      gameState.explosionCountBoard[row][col]++;
      gameState.movableActors.push(
        createFire(
          {
            x: col * c_Blocksize_px,
            y: row * c_Blocksize_px,
          },
          fireend
        )
      );

      // check if player was hit on this last square
      playersCenter_ix
        .filter(( { x: x_ix, y: y_ix } ) => x_ix === col && y_ix === row)
        .forEach(({ p }) => {
          (p as Player).stats.isAlive = false;
          (p as Player).animation.dt = 0;
        });
    }
  };

  createFireStreak("horizontal", "left");
  createFireStreak("horizontal", "right");
  createFireStreak("vertical", "up");
  createFireStreak("vertical", "down");
};

const createFloor = function (x: number, y: number): Floor {
  return { ...createActor({ x, y }, "floor"), type: "floor" };
};
const createBlock = function (x: number, y: number): Block {
  return {
    ...createActor({ x, y }, "block"),
    type: "block",
  };
};

const createBrick = function (x_ix: number, y_ix: number): Brick {
  return {
    ...createActor({ x: x_ix, y: y_ix }, "brick"),
    type: "brick",
    isDestroyed: false,
    animation: {
      dt: 0,
      currentSprite_ix: 0,
      keyFrames: brickBreakAnimation,
    },
  };
};

function createLevel(rawMap: SimpleBoardState): {
  board: BoardActors;
  movableActors: MovableActors;
} {
  const player1 = createPlayer(2, 1, playerControlsKeyMap.player1);
  console.assert(rawMap.length === c_Blocks);
  console.assert(rawMap[0].length === c_Blocks);
  const movableActors: (Bomb | Player)[] = rawMap.flatMap((row, row_ix) => {
    return row
      .map((cell, cell_ix) => {
        if (
          ![
            SimpleBoardStateEnum.bomb,
            SimpleBoardStateEnum.player1,
            SimpleBoardStateEnum.player2,
          ].includes(cell)
        )
          return null;

        if (
          [SimpleBoardStateEnum.player1, SimpleBoardStateEnum.player2].includes(
            cell
          )
        )
          rawMap[row_ix][cell_ix] = SimpleBoardStateEnum.floor;

        if (cell === SimpleBoardStateEnum.bomb) player1.bombs.active++;

        return cell === SimpleBoardStateEnum.bomb
          ? createBomb(cell_ix, row_ix, player1)
          : cell === SimpleBoardStateEnum.player1
          ? player1
          : createPlayer(cell_ix, row_ix, playerControlsKeyMap.player2);
      })
      .filter((cell) => cell !== null);
  });

  const boardActors: BoardActors = rawMap.flatMap((row, row_ix) => {
    return row
      .map((cell, cell_ix) => {
        if (
          ![
            SimpleBoardStateEnum.floor,
            SimpleBoardStateEnum.block,
            SimpleBoardStateEnum.brick,
          ].includes(cell)
        )
          return null;
        const x = cell_ix;
        const y = row_ix;
        return cell === SimpleBoardStateEnum.floor
          ? createFloor(x, y)
          : cell === SimpleBoardStateEnum.block
          ? createBlock(x, y)
          : createBrick(x, y);
      })
      .filter((cell) => cell !== null);
  });

  console.assert(
    movableActors.length + boardActors.length === c_Blocks * c_Blocks + 2 // 2 because the matrix of the board with bombs etc, + 2 players
  );

  return { board: boardActors, movableActors };
}
