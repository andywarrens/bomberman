import * as R from "rambda";
import {
  playerAnimations,
  PlayerDirection,
  updateBombAnimation,
  updateBrickAnimation,
  updateFireAnimation,
  updatePlayerAnimation,
} from "./animations";
import {
  c_Blocksize_px,
  c_BrickExplosion_time,
  c_Default_bomb_idle_time,
  c_FireExplosion_time,
  c_MaxSpeed,
} from "./constants";
import { playerSizing } from "./draw";
import {
  calcRect,
  KeysPressed,
  Coordinates,
  rectCollision,
  toBoardIndices,
} from "./engine";
import {
  BombermanState,
  Brick,
  createBomb,
  createFireExplosion,
  Player,
  SimpleBoardStateEnum,
} from "./game";

const calcMovementDirection = function (
  player: Player,
  keysDown: KeysPressed
): Player["moving"]["movementFacing"] {
  const { left, right, down, up } = player.controls;

  return {
    x: keysDown[left] ? -1 : keysDown[right] ? 1 : 0,
    y: keysDown[up] ? -1 : keysDown[down] ? 1 : 0,
  };
};

const calcSpeed = function (player: Player, movement: Coordinates) {
  let dx = 0,
    dy = 0;
  if (movement.x === player.moving.movementFacing.x) {
    dx = c_MaxSpeed;
  }
  if (movement.y === player.moving.movementFacing.y) {
    dy = c_MaxSpeed;
  }
  return { x: dx, y: dy };
};

const getBoardArrayIndicesOfSquaresUnderneath = function (
  newPos: Coordinates
): Coordinates[] {
  const tl = toBoardIndices(newPos),
    tr = {
      x: Math.floor((newPos.x + playerSizing.width) / c_Blocksize_px),
      y: tl.y,
    },
    bl = {
      x: tl.x,
      y: Math.floor((newPos.y + playerSizing.height) / c_Blocksize_px),
    },
    br = { x: tr.x, y: bl.y };
  return [
    { y: tl.y, x: tl.x },
    { y: tr.y, x: tr.x },
    { y: bl.y, x: bl.x },
    { y: br.y, x: br.x },
  ];
};

const allowedCollision = [
  SimpleBoardStateEnum.floor,
  SimpleBoardStateEnum.player1,
  SimpleBoardStateEnum.player2,
];
const getValidPos = function (
  gameState: BombermanState,
  player: Player,
  newPos: Coordinates
) {
  // determine on which blocks (max 4) the player will be standing
  let blocks = getBoardArrayIndicesOfSquaresUnderneath(newPos);

  // get board indices of player's own bombs
  // if there's 1 underneath the player: remove it from `blocks` for collision detection
  // so we can allow movement on this square
  let hasOwnBombsUnderPlayer = false;
  if (player.moving.isStillOnDroppedBomb) {
    const playerOwnBombs_ix = R.pipe(
      R.filter(
        (actor: (typeof gameState.movableActors)[0]) =>
          actor.type === "bomb" &&
          actor.owner === player &&
          actor.state !== "exploded"
      ),
      R.map(toBoardIndices)
    )(gameState.movableActors);

    console.assert(
      playerOwnBombs_ix.length === R.uniq(playerOwnBombs_ix).length,
      "Multiple bombs with the same coordinates shouldnt be possible: %o %o",
      gameState.movableActors,
      gameState.board
    );

    // compare ownBombs position with blocks underneath player
    const n = blocks.length;
    blocks = R.without(playerOwnBombs_ix, blocks);
    hasOwnBombsUnderPlayer = n > blocks.length;
  }

  // search for collision with any of the adjacent blocks
  const playerRect = calcRect.player(newPos);
  let i = 0;
  const n = blocks.length;
  let blockType =
    n > 0
      ? gameState.board[blocks[i].y][blocks[i].x]
      : SimpleBoardStateEnum.floor;

  while (
    i < n &&
    // it's ok to collide with floor, player
    (allowedCollision.includes(blockType) ||
      // can not collide with rest (brick, block, bomb, fire)
      !rectCollision(calcRect.default(blocks[i]), playerRect))
  ) {
    i++;
    if (i < n) blockType = gameState.board[blocks[i].y][blocks[i].x];
  }

  const noCollisionDetected = i === n;

  if (
    noCollisionDetected &&
    !hasOwnBombsUnderPlayer &&
    player.moving.isStillOnDroppedBomb
  ) {
    player.moving.isStillOnDroppedBomb = false;
  }

  // if theres collision with any of the adjacent block
  // then return oldPos
  return noCollisionDetected ? newPos : player;
};

export function updatePlayer(
  player: Player,
  gameState: BombermanState,
  dt: number,
  keysPressed: KeysPressed
): void {
  if (player.stats.isAlive) {
    const movement = calcMovementDirection(player, keysPressed),
      speed = calcSpeed(player, movement),
      target = {
        x: player.x + movement.x * speed.x,
        y: player.y + movement.y * speed.y,
      },
      validPos = getValidPos(gameState, player, target);

    player.x = validPos.x;
    player.y = validPos.y;
    player.konva.konvaObject.x(validPos.x).y(validPos.y); // TODO: we are saving x and y twice

    player.moving.movementFacing = movement;
    if (!(movement.x === 0 && movement.y === 0)) {
      const movingDirectionDpad: PlayerDirection =
        movement.y === -1
          ? movement.x === -1
            ? "up_left"
            : movement.x === 0
            ? "up"
            : "up_right"
          : movement.y === 0
          ? movement.x === -1
            ? "left"
            : "right"
          : movement.x === -1
          ? "down_left"
          : movement.x === 0
          ? "down"
          : "down_right";
      player.animation.keyFrames =
        playerAnimations.walking[movingDirectionDpad];
      updatePlayerAnimation(player, dt);
    }

    //check if player wants and can drop a bomb
    const { x, y, width, height } = calcRect.player(player);
    const playerCenter_ix = {
      x: Math.floor((x + width / 2) / c_Blocksize_px),
      y: Math.floor((y + height / 2) / c_Blocksize_px),
    };

    if (
      keysPressed[player.controls.bomb] &&
      gameState.board[playerCenter_ix.y][playerCenter_ix.x] ===
        SimpleBoardStateEnum.floor &&
      player.bombs.active < player.bombs.maxLimit
    ) {
      const playerOwnBombs_ix = R.pipe(
        R.filter(
          (actor: (typeof gameState.movableActors)[0]) =>
            actor.type === "bomb" && actor.owner === player
        ),
        R.map(toBoardIndices)
      )(gameState.movableActors);

      console.assert(
        playerOwnBombs_ix.find(
          ({ x, y }) => x === playerCenter_ix.x && y === playerCenter_ix.y
        ) === undefined,
        "Wait a minutes"
      );
      dropBomb(player, playerCenter_ix, gameState);
      console.debug("dropped a bomb", player.bombs.active);
    }
  } else {
    player.animation.keyFrames = playerAnimations.dead;
    updatePlayerAnimation(player, dt);
    if (player.animation.dt > playerAnimations.dead.length * 250) {
      player.konva.konvaObject.destroy();
      gameState.movableActors = R.without([player], gameState.movableActors);
    }
  }
}
const dropBomb = function (
  p: Player,
  playerCenter_ix: Coordinates,
  gameState: BombermanState
) {
  const myBomb = createBomb(playerCenter_ix.x, playerCenter_ix.y, p);
  gameState.board[playerCenter_ix.y][playerCenter_ix.x] =
    SimpleBoardStateEnum.bomb;
  console.debug("pushing bomb", myBomb.x, myBomb.y);
  gameState.movableActors.push(myBomb);
  p.bombs.active++;
  p.moving.isStillOnDroppedBomb = true;
};

export const updateBricks = function (
  gameState: BombermanState,
  dt: number
): void {
  const destroyedBricks = gameState.boardActors.filter(
    (b) => b.type === "brick" && b.isDestroyed
  ) as Brick[];
  const [exploded, active] = R.partition(
    (b) => b.animation.dt > c_BrickExplosion_time,
    destroyedBricks
  );

  active.forEach((b) => {
    updateBrickAnimation(b, dt);
  });

  exploded.forEach((el) => {
    const brickPos_ix = toBoardIndices(el);
    gameState.board[brickPos_ix.y][brickPos_ix.x] = SimpleBoardStateEnum.floor;
    el.konva.konvaObject.destroy();
  });

  gameState.boardActors = R.without(exploded, gameState.boardActors);
};

export function updateBombs(gameState: BombermanState, dt: number): void {
  const bombs = gameState.movableActors.filter((a) => a.type === "bomb");
  const [exploded, active] = R.partition((x) => x.state === "exploded", bombs);

  active.forEach((b) => {
    updateBombAnimation(b, dt);
    const prevState = b.state;
    b.state =
      b.state === "idle"
        ? b.animation.dt <= c_Default_bomb_idle_time
          ? "idle"
          : "exploding"
        : b.state === "exploding" &&
          b.animation.dt <= c_Default_bomb_idle_time + c_FireExplosion_time
        ? "exploding"
        : "exploded";
    if (prevState === "idle" && prevState !== b.state) {
      const pos_ix = toBoardIndices({ x: b.x, y: b.y });
      createFireExplosion(gameState, pos_ix, b.owner.bombs.strength);
    }
  });

  // Note: the ones that are set to "exploded" in the active.forEach will be cleaned up on the next updateBombs cycle
  exploded.forEach((b) => {
    b.owner.bombs.active--;
    console.debug("removed a bomb", b.owner.bombs.active);
    b.konva.konvaObject.destroy();
  });

  gameState.movableActors = R.without(exploded, gameState.movableActors);
}

export function updateFires(gameState: BombermanState, dt: number): void {
  const fires = gameState.movableActors.filter((a) => a.type === "fire");
  const [exploded, active] = R.partition(
    (f) => f.animation.dt > c_FireExplosion_time,
    fires
  );

  active.forEach((f) => {
    updateFireAnimation(f, dt);
  });

  exploded.forEach((f) => {
    const { x: x_ix, y: y_ix } = toBoardIndices(f);
    f.konva.konvaObject.destroy();
    gameState.explosionCountBoard[y_ix][x_ix]--;
    if (gameState.explosionCountBoard[y_ix][x_ix] === 0)
      gameState.board[y_ix][x_ix] = SimpleBoardStateEnum.floor;
  });

  gameState.movableActors = R.without(exploded, gameState.movableActors);
}
