import * as R from "rambda";
import { Actor, Bomb, Direction } from "./game";
import { c_FrameDuration } from "./constants";
import { Animatable } from "./engine.js";

type KeyFrames = number[][];
/*
 * Sprite info and animations
 */
export const bombAnimation = {
  // offsetX, offsetY, width, height
  idleBombKeyframes: [
    [3, 108, 17, 19],
    [3, 108, 17, 19],
    [23, 108, 17, 19],
    [23, 108, 17, 19],
  ],
  explodeKeyframes: [
    [43, 107, 19, 19],
    [43, 107, 19, 19],
    [65, 107, 19, 19],
    [87, 108, 18, 17],
    [108, 107, 17, 18],
  ],
};
export const fireAnimation: Record<
  Direction | "horizontal" | "vertical" | "cross",
  KeyFrames
> = {
  //7 possible fire animations, each 4 frames
  left: [
    [91, 160, 18, 20],
    [111, 160, 19, 20],
    [132, 160, 18, 20],
    [154, 160, 18, 20],
  ],
  right: [
    [3, 229, 19, 20],
    [23, 229, 19, 20],
    [44, 229, 20, 20],
    [67, 229, 20, 20],
  ],
  up: [
    [1, 184, 13, 20],
    [15, 184, 17, 20],
    [33, 184, 20, 20],
    [55, 184, 20, 20],
  ],
  down: [
    [1, 204, 13, 20],
    [15, 204, 17, 20],
    [33, 204, 20, 20],
    [55, 204, 20, 20],
  ],
  horizontal: [
    [77, 204, 19, 20],
    [99, 204, 19, 20],
    [121, 204, 19, 20],
    [143, 204, 19, 20],
  ],
  vertical: [
    [86, 229, 15, 20],
    [102, 229, 15, 20],
    [119, 229, 20, 20],
    [141, 229, 20, 20],
  ],
  cross: [
    [3, 159, 20, 20],
    [25, 159, 20, 20],
    [47, 159, 20, 20],
    [69, 159, 20, 20],
  ],
};

export const playerSpriteInfo = {
  x: 6,
  y: 70,
  width: 18,
  height: 26,
};
export type PlayerDirection =
  | Direction
  | "up_left"
  | "up_right"
  | "down_left"
  | "down_right";
const deadWidth = 19;
const deadHeight = 26;
const walkingWidth = 19;
const walkingHeight = 97 - 71;
const nWalkingSprites = 7;

const walkingAnims = R.map(
  (coords) =>
    R.repeat(0, nWalkingSprites).map((_, i) => [
      coords.x + i * (walkingWidth + 1),
      coords.y,
      walkingWidth,
      walkingHeight,
    ]),
  {
    down: { x: 6, y: 70 },
    up: { x: 6, y: 98 },
    right: { x: 6, y: 126 },
    left: { x: 6, y: 154 },
    up_right: { x: 6, y: 98 },
    up_left: { x: 6, y: 98 },
    down_left: { x: 6, y: 70 },
    down_right: { x: 6, y: 70 },
  }
) as Record<PlayerDirection, KeyFrames>;
export const playerAnimations = {
  walking: walkingAnims,
  dead: R.repeat(0, 5).map((_, i) => {
  return [
    6 + i * (deadWidth + 1),
    454,
    deadWidth,
    deadHeight,
  ];
})
};

export const brickSpriteInfo = {
  x: 312,
  y: 462,
  width: 14,
  height: 14,
};
// 6 frames
export const brickBreakAnimation = R.repeat(0, 6).map((_, i) => {
  return [
    brickSpriteInfo.x + (i - 2) * (brickSpriteInfo.width + 2),
    brickSpriteInfo.y + 6 * (brickSpriteInfo.height + 3),
    brickSpriteInfo.width,
    brickSpriteInfo.height,
  ];
});

/*
 * Update animation functions
 */
const calculateSpriteIxToShow = function (animation: Animatable): number {
  const { dt, keyFrames, currentSprite_ix } = animation;

  const newSprite_ix = Math.floor(
    (dt % (c_FrameDuration * keyFrames.length)) / c_FrameDuration
  );

  if (newSprite_ix !== currentSprite_ix) {
    return newSprite_ix;
  }
  return currentSprite_ix;
};

export const generalUpdateAnimation = function(a: Actor & { animation: Animatable }, dtGame: number) {
  a.animation.dt += dtGame;
  a.animation.currentSprite_ix = calculateSpriteIxToShow(a.animation);
}

/**
 * Bomb idle / exploding animation
 */
export const updateBombAnimation = function (b: Bomb, dtGame: number) {
  b.animation.keyFrames =
    b.state === "idle"
      ? bombAnimation.idleBombKeyframes
      : bombAnimation.explodeKeyframes;
  b.animation.dt += dtGame;
  b.animation.currentSprite_ix = calculateSpriteIxToShow(b.animation);
};
