module Update(update) where

import Game

moveBall :: Float -> BombermanGame -> BombermanGame
moveBall seconds game = game {ballLoc = (x', y')}
  where
    -- Old locations and velocities.
    (x, y) = ballLoc game
    (vx, vy) = ballVel game

    -- New locations.
    x' = x + vx * seconds
    y' = y + vy * seconds


update :: Float -> BombermanGame -> BombermanGame
update seconds prevState = newState
  where
    newState = moveBall seconds prevState
