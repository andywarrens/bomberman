module Main where

import Graphics.Gloss

import Game
import qualified Update

width, height, offset :: Int
width = 300
height = 300
offset = 100

window :: Display
window = InWindow "Pong" (width, height) (offset, offset)

background :: Color
background = black

drawing :: Picture
drawing =
  pictures
    [ translate (-20) (-100) $ color ballColor $ circleSolid 30,
      translate 30 50 $ color paddleColor $ rectangleSolid 10 50
    ]
  where
    ballColor = dark red
    paddleColor = light (light blue)

-- main :: IO ()
-- main = display window background drawing
fps = 30

initialState :: BombermanGame
initialState =
  Game
    { ballLoc = (-10, 30),
      ballVel = (1, -3),
      player1 = 40,
      player2 = -80
    }

-- | Convert a game state into a picture.
render ::
  -- | The game state to render.
  BombermanGame ->
  -- | A picture of this game state.
  Picture
render game =
  pictures
    [ ball,
      walls,
      mkPaddle rose 120 $ player1 game,
      mkPaddle orange (-120) $ player2 game
    ]
  where
    --  The pong ball.
    ball = uncurry translate (ballLoc game) $ color ballColor $ circleSolid 10
    ballColor = dark red

    --  The bottom and top walls.
    wall :: Float -> Picture
    wall offset =
      translate 0 offset $
        color wallColor $
          rectangleSolid 270 10

    wallColor = greyN 0.5
    walls = pictures [wall 150, wall (-150)]

    --  Make a paddle of a given border and vertical offset.
    mkPaddle :: Color -> Float -> Float -> Picture
    mkPaddle col x y =
      pictures
        [ translate x y $ color col $ rectangleSolid 26 86,
          translate x y $ color paddleColor $ rectangleSolid 20 80
        ]

    paddleColor = light (light blue)

main :: IO ()
main = animate window background frame
  where
    frame :: Float -> Picture
    frame seconds = render $ Update.update seconds initialState
