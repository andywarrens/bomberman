import Konva from "konva";
import { c_Blocks, c_Blocksize_px } from "./constants.js";
import {
  bombAnimation,
  brickSpriteInfo,
  fireAnimation,
  playerSpriteInfo,
} from "./animations.js";
import { Coordinates } from "./engine.js";
import { greenToAlpha } from "./draw/filters.js";

const c_Boardsize = c_Blocks * c_Blocksize_px;

/**
 * Functions to initialize Konva rendering system
 */
export interface RenderLayers {
  boardLayer: Konva.Layer;
  movementLayer: Konva.Layer;
}
export const initRenderingSystem = function (elementId: string): RenderLayers {
  const stage = new Konva.Stage({
    container: elementId,
    width: c_Boardsize,
    height: c_Boardsize,
  });
  const boardLayer = new Konva.Layer();
  const movementLayer = new Konva.Layer();
  // debugLayer = new Konva.Layer();
  stage.add(boardLayer);
  stage.add(movementLayer);
  return { boardLayer, movementLayer };
};

/**
 * Functions to load image assets
 */
const loadImage = async function (src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = src;
    img.onload = () => {
      resolve(img);
    };
    img.onerror = (err) => {
      reject(new Error(err as string));
    };
  });
};

let images: null | {
  player: Konva.Image;
  bomb: Konva.Image;
  brick: Konva.Image;
  snes: Konva.Image;
} = null;
export const loadImages = async function () {
  const loadedImages = await Promise.all([
    loadImage("img/sprites.png"),
    loadImage("img/sprites2.png"),
    loadImage("img/block.png"),
    loadImage("img/snes.png"),
  ]);
  const [player, bomb, brick, snes] = loadedImages.map(
    (img) => new Konva.Image({ image: img })
  );
  images = { player, bomb, brick, snes };
};

/*
 * Functions that create Konva.Rect
 */
export function createBlockImg({ x, y }: Coordinates): Konva.Rect {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const block = images!.brick.clone() as Konva.Image;
  block.x(x).y(y).width(c_Blocksize_px).height(c_Blocksize_px).crop({
    x: 0,
    y: 0,
    width: 32,
    height: 32,
  });
  return block;
}

export function createFloorRect({ x, y }: Coordinates): Konva.Rect {
  return new Konva.Rect({
    x,
    y,
    width: c_Blocksize_px,
    height: c_Blocksize_px,
    fill: "white",
  });
}

export function createBrickImg({ x, y }: Coordinates): Konva.Rect {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const brick = images!.snes.clone() as Konva.Image;
  brick.x(x).y(y).width(c_Blocksize_px).height(c_Blocksize_px).crop(brickSpriteInfo);

  brick.filters([greenToAlpha(50)]);
  brick.cache();

  return brick;
}

// bombs have slightly different dimensions than other actors
// due to the sprite
// so we scale it down until the height = c_blocksize, and
// the width is now a bit < c_Blocksize
const bombWidth =
  c_Blocksize_px *
  (bombAnimation.idleBombKeyframes[0][2] /
    bombAnimation.idleBombKeyframes[0][3]);
const offsetX = (c_Blocksize_px - bombWidth) * 0.5;
export function createBombImg({ x, y }: Coordinates): Konva.Rect {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const bomb = images!.bomb.clone() as Konva.Image;
  const sprite = bombAnimation.idleBombKeyframes[0];
  bomb.x(x+offsetX).y(y).width(bombWidth).height(c_Blocksize_px).crop({
    x: sprite[0],
    y: sprite[1],
    width: sprite[2],
    height: sprite[3],
  });

  bomb.filters([greenToAlpha(50)]);
  bomb.cache();

  return bomb;
}

const playerHeight = c_Blocksize_px * 0.9;
const playerWidth =
  playerHeight * (playerSpriteInfo.width / playerSpriteInfo.height);
export const playerSizing = {
  height: playerHeight,
  width: playerWidth,
};
export function createPlayerImg({ x, y }: Coordinates): Konva.Rect {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const player = images!.player.clone() as Konva.Image;
  player
    .x(x)
    .y(y)
    .width(playerWidth)
    .height(playerHeight)
    .crop(playerSpriteInfo);

  return player;
}

export function createFireImg(
  { x, y }: Coordinates,
  fireDirection: keyof typeof fireAnimation
): Konva.Rect {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const fire = images!.bomb.clone() as Konva.Image;
  const _sprite = fireAnimation[fireDirection][0];
  const sprite = {
    x: _sprite[0],
    y: _sprite[1],
    width: _sprite[2],
    height: _sprite[3],
  };

  // apply dynamic margin because not every sprite has same width
  // e.g. fire end vertical frame 0 sprite is smaller than the rest, so we want to center it
  //      so it fits on the vertical fire below
  const isVertical = ["vertical", "up", "down"].includes(fireDirection);
  const isHorizontal = ["horizontal", "left", "right"].includes(fireDirection);

  const margin = {
    x: isVertical ? (c_Blocksize_px - sprite.width) * 0.5 : 0,
    y: isHorizontal ? (c_Blocksize_px - sprite.height) * 0.5 : 0,
  };

  const width = isVertical ? sprite.width : c_Blocksize_px + 1;
  const height = isHorizontal ? sprite.height : c_Blocksize_px + 1;

  fire
    .x(x + margin.x)
    .y(y + margin.y)
    .width(width)
    .height(height)
    .crop(sprite);

  fire.filters([greenToAlpha(50)]);
  fire.cache();

  return fire;
}
