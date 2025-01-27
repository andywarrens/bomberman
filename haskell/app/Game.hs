module Game(BombermanGame(..)) where

data BombermanGame = Game
  { -- | Pong ball (x, y) location.
    ballLoc :: (Float, Float),
    -- | Pong ball (x, y) velocity.
    ballVel :: (Float, Float),
    -- | Left player paddle height.
    -- Zero is the middle of the screen.
    player1 :: Float,
    -- | Right player paddle height.
    player2 :: Float
  }
  deriving (Show)
