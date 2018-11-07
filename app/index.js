// Helper
const diff = function(x1, x2) { return Math.abs(x1-x2); }
const rectCollision = function(r1, r2) {
   const horizontalOut = ((r1.x+r1.width) < r2.x)
					  || (r1.x >= (r2.x+r2.width))
   const verticalOut = ((r1.y+r1.height) < r2.y)
					 || (r1.y >= (r2.y+r2.height))
   if (horizontalOut) 
	   return false;
   else
	   return !verticalOut;
}
const loadImage = function(src) {
	var img = new Image();
    img.onload = function() { imgLoadCtr++; };
	img.src = src;
	return img;
}

// BOMBERMAN GAME
const c_Playing = 0, c_Paused = 1; // game state
const c_Player = 0, c_Block = 1, c_Bomb = 2, c_Fire = 3, c_Empty = 4, c_Brick = 5; // actor types
const renderEmptySquare = function(x,y) { return new Konva.Rect({
					     x: x, y: y
						,width: c_Blocksize, height: c_Blocksize
					    ,fill: 'white' }) };
const c_Blocks = 15, c_Blocksize = 26, c_Boardsize = c_Blocks * c_Blocksize;
const c_FireBegin = 0, c_FireMiddle = 1, c_FireEnd = 2;
const c_FireLeft = 0, c_FireRight = 1, c_FireUp = 2
	 ,c_FireDown = 3, c_FireMiddleH = 4, c_FireMiddleV = 5
	 ,c_FireCross = 6;
const c_Speed = 0.1, c_MaxSpeed = 2;
const c_KeyList = 
	[ 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown' ,'ControlRight'
	, 'KeyA', 'KeyD', 'KeyW', 'KeyS' ,'KeyF' ];
const c_Left=0, c_Right=1, c_Up=2, c_Down=3, c_BombKey=4;
const player1keys = new Array(5),
	  player2keys = new Array(5);
player1keys[c_Left] = c_KeyList[0];
player1keys[c_Right] = c_KeyList[1];
player1keys[c_Up] = c_KeyList[2];
player1keys[c_Down] = c_KeyList[3];
player1keys[c_BombKey] = c_KeyList[4];
player2keys[c_Left] = c_KeyList[5];
player2keys[c_Right] = c_KeyList[6];
player2keys[c_Up] = c_KeyList[7];
player2keys[c_Down] = c_KeyList[8];
player2keys[c_BombKey] = c_KeyList[9];

// time, offsetX, offsetY, width, height
const fireKeyframes = new Array(6); //7 possible fire animations, each 4 frames
fireKeyframes[c_FireLeft] = [ [ 0  , 91, 160, 18, 20 ]
						,[ 250,111, 160, 19, 20 ] 
						,[ 500,132, 160, 18, 20 ]
						,[ 750,154, 160, 18, 20 ] ]
fireKeyframes[c_FireRight]= [ [ 0  ,  3, 229, 19, 20 ]
						,[ 250, 23, 229, 19, 20 ] 
						,[ 500, 44, 229, 20, 20 ]
						,[ 750, 67, 229, 20, 20 ] ]
fireKeyframes[c_FireUp]   = [ [ 0  ,  1, 184, 16, 20 ]
						,[ 250, 15, 184, 17, 20 ] 
						,[ 500, 33, 184, 20, 20 ]
						,[ 750, 55, 184, 20, 20 ] ]
fireKeyframes[c_FireDown] = [ [ 0  ,  1, 204, 16, 20 ]
						     ,[ 250, 15, 204, 17, 20 ] 
						     ,[ 500, 33, 204, 20, 20 ]
						     ,[ 750, 55, 204, 20, 20 ] ]
fireKeyframes[c_FireMiddleH] = [ [ 0  , 77, 204, 20, 20 ]
						   ,[ 250, 99, 204, 20, 20 ] 
						   ,[ 500,121, 204, 20, 20 ]
						   ,[ 750,143, 204, 20, 20 ] ]
fireKeyframes[c_FireMiddleV]   = [ [ 0  , 86, 229, 17, 20 ]
						   ,[ 250,102, 229, 15, 20 ] 
						   ,[ 500,119, 229, 20, 20 ]
						   ,[ 750,141, 229, 20, 20 ] ]
fireKeyframes[c_FireCross]   = [ [ 0  ,  3, 159, 20, 20 ]
						   ,[ 250, 25, 159, 20, 20 ] 
						   ,[ 500, 47, 159, 20, 20 ]
						   ,[ 750, 69, 159, 20, 20 ] ]

// load first
var imgLoadCtr = 0;
const c_Images = [ loadImage("img/sprites.png")
				 , loadImage("img/sprites2.png") 
				 , loadImage("img/bricks.png") ]
     ,c_PlayerImg=0, c_BombImg=1, c_BrickImg=2;
var buildInitialBoard = function() {
	// init array
    const board = new Array(c_Blocks);
	for (var i=0, n=c_Blocks; i<n; i++) {
		board[i] = new Array(c_Blocks);
		for (var j=0; j<n; j++) 
		  board[i][j] = emptyBlock(j, i);
	}

	//map design: should be defined in XML
	var blocks = [ 0,0, 0,9, 1,0, 1,9, 2,0, 2,9, 3,0, 3,9, 4,0, 4,9, 5,0, 5,9, 6,0, 6,9, 7,0, 7,9, 8,0, 8,9, 9,0, 9,9, 0,0, 9,0, 0,1, 9,1, 0,2, 9,2, 0,3, 9,3, 0,4, 9,4, 0,5, 9,5, 0,6, 9,6, 0,7, 9,7, 0,8, 9,8, 0,9, 9,9, 2,2, 7,2, 2,3, 7,3, 2,4, 7,4, 2,5, 7,5, 2,6, 7,6, 2,7, 7,7,
				   4,2, 5,2, 4,3, 5,3, 4,6, 5,6, 4,7, 5,7 ] 
	for (var i=0, n=blocks.length; i<n; i+=2) {
		var col = blocks[i], row = blocks[i+1];
		board[row][col] = block(col, row);
	}

	//fire
	//board[1][3] = fire(3, 1, c_FireBegin, c_FireLeft);
	//board[1][4] = fire(4, 1, c_FireMiddle, c_FireMiddleH);
	//board[1][5] = fire(5, 1, c_FireEnd, c_FireRight);
	
	//bricks
	var bricks = [ 3,1, 3,2, 6,3, 5,4, 6,4, 6,5 ];
	for (var i=0, n=bricks.length; i<n; i+=2) {
		var col = bricks[i], row = bricks[i+1];
		board[row][col] = brick(col, row);
	}

	//bomb
	board[5][3] = bomb(3,5, 1500, function(){});

	return board;
}

// Model
var actor = function(type, x, y) {
	   return {
	   	 type : type
	   	,x:x*c_Blocksize
		,y:y*c_Blocksize
	    ,isDrawn : false }}
   ,player = function(x, y, keyConfig) {
	   var p = actor(c_Player, x, y);
	   p.keyConfig = keyConfig;
	   p.speed = 0;
	   p.time = 0;
	   p.moveAnimSpeed = 1000/15;
	   p.bombStrength = 2;
	   p.sprite = 0; 
	   p.img = null;
	   p.imgLoaded = false;
	   var offsetX = 6, offsetY = 70, next = 20
	       ,width = 18, height = 26
		   ,scaledH = c_Blocksize
		   ,scaledW = scaledH * (width/height);
	   p.width = scaledW;
	   p.height = scaledH;

	   // collision
	   p.isAlive = true;
	   p.getRect = function(pos) {
		   const middlePlayer = {
				   x: pos.x + (0.5*p.width)
				  ,y: pos.y + (0.5*p.height)  }
		   return playerRect = {
				   x: middlePlayer.x - 0.5*p.width
				  ,y: middlePlayer.y - 0.5*p.height +2
				  ,width: player.width 
				  ,height: player.height -4 }; }

	   // sprite
	   const margin = { x: (c_Blocksize - p.width)*0.5
	                  , y: (c_Blocksize - p.height)*0.5 }
	   var img = new Image();
	   img.onload = function() {
		   p.imgLoaded = true;
		   p.img = new Konva.Image({
			x: p.x + margin.x, y: p.y + margin.y,
			width: p.width, height: p.height,
			crop: {
				x: 6, y: 70,
				width: 18, height: 26,
			},
			image: img
		  }); };
	   img.src = "img/sprites.png";

	   // bomb
	   var maxBombs = 1
	      ,bombCtr = 0;
	   const explodeBomb = function(myBomb) { 
		   bombCtr--; 
		   myBomb.bombStrength = p.bombStrength;
	   }
	   p.dropBomb = function() {
	     if (bombCtr < maxBombs) {
			 const moPlayer = {
				 x: Math.floor((p.img.getX() + p.width/2) / c_Blocksize)
				,y: Math.floor((p.img.getY() + p.height/2) / c_Blocksize) }
			 var myBomb = bomb(moPlayer.x, moPlayer.y, 4000 ,explodeBomb);
			 game.board[moPlayer.y][moPlayer.x] = myBomb;
			 bombCtr++;
		 }
	   }
	   //eventManager.subscribe(ev_BombKey, dropBomb);

	   // animation
	   const deadKeyframe = [ [   0,  3, 75, 19, 26 ]
	                        , [ 250, 25, 75, 19, 26 ]
	                        , [ 500, 47, 75, 19, 26 ]
	                        , [ 750, 69, 75, 19, 24 ]
	                        , [1000, 91, 75, 19, 25 ]
	                        , [1250,113, 73, 19, 24 ]
	                        , [1500,135, 78, 19, 18 ] ];
	   var animTimer = 0
	      ,currentSprite = -1;
	   p.update = function(dt) {
		 animTimer += dt;
		 if (p.isAlive === false && animTimer < 1500) {
		   var newSprite = Math.floor(animTimer / 250)
			  ,keyframes = deadKeyframe;
		   if (newSprite !== currentSprite) {
			  p.img.image(c_Images[c_BombImg]); // bad name
			  p.img.crop({
			  	x: keyframes[newSprite][1],
			  	y: keyframes[newSprite][2], 
			  	width: keyframes[newSprite][3],
			  	height: keyframes[newSprite][4] });
			  currentSprite = newSprite;
		   }
	     }
	   }
	   return p; }
   ,calcMovement = function(player) {
	  const conf = player.keyConfig;
	  var dx = 0, dy = 0;
	  var valueH = keysDown[conf[c_Left]] === true ? -1 : 1
		 ,valueV = keysDown[conf[c_Up]] === true ? -1 : 1;
	  if (keysDown[conf[c_Left]] === true
	     || keysDown[conf[c_Right]] === true) {
		dx = valueH*player.speed; 
	  } 
	  if (keysDown[conf[c_Up]] === true
	     || keysDown[conf[c_Down]] === true) {
		dy = valueV*player.speed; 
	  }
	  return { x: dx, y: dy }; }
   ,calcSpeed = function(player) {
	    const conf = player.keyConfig;
		var anyKeyDown = keysDown[conf[c_Left]] 
		   || keysDown[conf[c_Right]] 
		   || keysDown[conf[c_Up]] 
		   || keysDown[conf[c_Down]]
	    var speed = 
		   anyKeyDown ? Math.min(player.speed + c_Speed
			                    ,c_MaxSpeed)
		              : 0;
		return speed; }
   ,calcDirection = function(oldPos, newPos) {
	   var x1 = oldPos.x, x2 = newPos.x
	      ,y1 = oldPos.y, y2 = newPos.y;
	   // going up/down
	   if (Math.abs(x1-x2) < 1) 
		   return y1 > y2 ? c_Up : c_Down;
	   else
		   return x1 > x2 ? c_Left : c_Right; }
   ,getValidPos = function(board, player, oldPos, newPos) {
	   // determine on which blocks (max 4) the player is
	   // e.g. standing in middle of horizontal row
	   // and trying to go up (=4), or left (=2)
	   const blocks = 
		   getBlocksUnderneathPlayer(board, newPos, player)

	   // if theres collision with the adjacent block 
	   // then return oldPos
	   const playerRect = player.getRect(newPos);
	   var i=0, n=blocks.length;
	   while (i<n && 
		   ( (blocks[i].type !== c_Block
			  && blocks[i].type !== c_Brick)
			|| rectCollision(blocks[i], playerRect) === false))
		   i++;

	   blocks.push(playerRect);
	   return (i!==n) ? oldPos : newPos;
	}
   ,emptyBlock = function(x, y) {
	   var b = actor(c_Empty, x, y);
	   b.width = b.height = c_Blocksize
	   b.render = function() { return renderEmptySquare(b.x, b.y); }
	   return b;
   }
   ,block = function(x, y) {
	   var b = actor(c_Block, x, y);
	   b.img = "img/block.png";
	   b.width = c_Blocksize;
	   b.height = c_Blocksize;
	   var rect = new Konva.Rect({
			  x: b.x, y: b.y,
			  width: b.width, height: b.height,
			  fill: 'green',
			  stroke: 'black',
			  strokeWidth: 1
			});
	   b.render = function() { return rect; }
	   return b; }
    ,brick = function(x, y) {
	   var b = actor(c_Brick, x, y);
	   b.img = "img/bricks.png";
	   b.isDestroyed = false;
	   // time, offsetX, offsetY, width, height
	   const keyframes = [ [   0, 63, 48, 15, 15 ]
	                              ,[   1, 79, 48, 15, 15 ] 
	                              ,[ 100, 94, 48, 15, 15 ] 
	                              ,[ 200,109, 48, 15, 15 ] 
	                              ,[ 300,124, 48, 15, 15 ] 
	                              ,[ 400,139, 48, 15, 15 ] 
	                              ,[ 500,154, 48, 15, 15 ] ]
	   const scaledH = c_Blocksize
		    ,scaledW = c_Blocksize;
	   b.width = scaledW;
	   b.height = scaledH;
	   b.img = new Konva.Image({
		x: b.x, y: b.y,
		width: b.width, height: b.height,
		image: c_Images[c_BrickImg],
		crop: {
			x: keyframes[0][1],
			y: keyframes[0][2],
			width: keyframes[0][3],
			height: keyframes[0][4]
		} });
	   b.render = function() { return b.img; };

	   // animate when a fire destroys the brick
	   b.break = function() { b.isDestroyed = true; }
	   var animTimer = 0
		  ,sprite = 0
		  ,nextFrameTime = keyframes[sprite+1][0];
	   b.update = function(dt) {
	     if (b.isDestroyed === false) return;
		 animTimer += dt;
		 if (animTimer < nextFrameTime) return;
		 if (sprite === keyframes.length) {
			 b.isFinished = true;
		 } else {
		   sprite++;
		   if (sprite === keyframes.length) {
			   nextFrameTime = 100; // leave last sprite 250ms
		   } else {
			   nextFrameTime = keyframes[sprite][0];
			   b.img.crop({
				 x: keyframes[sprite][1],
				 y: keyframes[sprite][2], 
				 width: keyframes[sprite][3],
				 height: keyframes[sprite][4] });
		  }
		 }
	   }
	   return b;
	}
    ,bomb = function(x, y, idle, onExplode) {
	   var b = actor(c_Bomb, x, y);
	   b.isExploded = false;
	   b.bombStrength = 3;
	   // sprite
	   var offsetX = 3, offsetY = 108, next = 20
	       ,width = 17, height = 19
		   ,scaledH = c_Blocksize
		   ,scaledW = scaledH * (width/height);
	   b.width = scaledW;
	   b.height = scaledH;
	   const margin = { x: (c_Blocksize - b.width)*0.5
	                  , y: (c_Blocksize - b.height)*0.5 }
	   b.render = function() { return b.img; };
	   b.img = new Konva.Image({
		x: b.x + margin.x, y: b.y + margin.y,
		width: b.width, height: b.height,
		image: c_Images[c_BombImg],
		crop: {
			x: offsetX, y: offsetY,
			width: width, height: height,
		} });
		// sprite anim
	    var bombTimer = 0,
			idleTime = idle - 1000
		    currentSprite = 0;
			// time, offsetX, offsetY, width, height
		const idleBombKeyframes = [ [ 0  ,  3, 108, 17, 19 ]
		                           ,[ 500, 23, 108, 17, 19 ] ]
			 ,explodeKeyframes  = [ [ 0  , 43, 107, 19, 19 ]
			                       ,[ 500, 65, 107, 19, 19 ]
			                       ,[ 750, 87, 108, 18, 17 ]
			                       ,[1000,108, 107, 17, 18 ] ]
		     ,endKeyframes      = [ [   0,130, 107, 17, 18 ] 
			                       ,[ 250,152, 107, 17, 18 ] 
			                       ,[ 500,174, 107, 17, 18 ] 
			                       ,[ 750,196, 107, 17, 18 ] ]
		b.update = function(dt) {
			bombTimer += dt;
			var newSprite;
			if (bombTimer < idleTime) { //bomb is idling
				newSprite = Math.floor(bombTimer / 500) % 2;
				keyframes = idleBombKeyframes;
			} else if (bombTimer <= idle) { //bomb is exploding
				newSprite = bombTimer < (idle-500) ? 0 :
							bombTimer < (idle-250) ? 1 :
							bombTimer < (idle)     ? 2 : 3;
				keyframes = explodeKeyframes;
				if (b.isExploded === false && newSprite===1) {
					onExplode(b);
					b.isExploded = true;
				}
			}
			if (bombTimer <= idle 
			    && newSprite !== currentSprite) {
			  b.img.crop({
			  	x: keyframes[newSprite][1],
			  	y: keyframes[newSprite][2], 
			  	width: keyframes[newSprite][3],
			  	height: keyframes[newSprite][4] });
			  currentSprite = newSprite;
			}
		}
									

		return b;
	}
   ,fire = function(x, y, fireDirection) {
	   var f = actor(c_Fire, x, y);

	   // sprite
	   const height = 20
	        ,width  = 20 //usually
		    ,scaledH = c_Blocksize
		    ,scaledW = scaledH * (width/height);
	   f.width = scaledW;
	   f.height = scaledH;
	   const margin = { x: (c_Blocksize - f.width)*0.5
	                  , y: (c_Blocksize - f.height)*0.5 }
	   f.img = new Konva.Image({
		x: f.x + margin.x, y: f.y + margin.y,
		width: f.width, height: f.height,
		image: c_Images[c_BombImg], // this is sprite2
		crop: {
			x: fireKeyframes[c_FireLeft][0][1]
		   ,y: fireKeyframes[c_FireLeft][0][2]
		   ,width: fireKeyframes[c_FireLeft][0][3]
		   ,height: fireKeyframes[c_FireLeft][0][4]
		} });
	   f.render = function() { return f.img; }

	   // sprite anim
	   var animTimer = 0,
		   currentSprite = -1;
		f.update = function(dt) {
			animTimer += dt;
			if (animTimer < 1050) {		
				var newSprite = 
					        animTimer < 150 ? 0 :
				            animTimer < 300  ? 1 :
							animTimer < 450  ? 2 : 
							animTimer < 600 ? 3 :
							animTimer < 750 ? 2 :
							animTimer < 900 ? 1 : 0;
				if (newSprite !== currentSprite)
					f.img.crop({
						x:      fireKeyframes[fireDirection][newSprite][1],
						y:      fireKeyframes[fireDirection][newSprite][2], 
						width:  fireKeyframes[fireDirection][newSprite][3],
						height: fireKeyframes[fireDirection][newSprite][4] });
				currentSprite = newSprite;
			} else { 
				f.isDestroyed = true;
			}

		}
	   return f;
    }
	;

const ev_KeyPressed = 0, ev_BombKey = 1;
const eventManager = (function() {
  var my = {}
     ,observers = [];
  my.subscribe = function(event, observerFn) {
	  observers.push({ event: event,
					   notify: observerFn });
  };
  my.raiseEvent = function(event, args) {
	  for (var i=0, n=observers.length; i<n; i++)
		  if (observers[i].event === event)
			  observers[i].notify(args);
  }
  return my;
})();
   
var game = {
	 state   : c_Playing
	,debug   : false
	,players : [ player(1, 1, player1keys)
			   , player(7, 1, player2keys) ]
	,board   : buildInitialBoard() }


// View
const renderPlayers = function(stage, layer, players) {
	for (var i=0, n=players.length; i<n; i++)
		renderBombman(stage, layer, players[i]);
}
var renderBombman = function(stage, layer, bombman) {
  if (bombman.isDrawn === false) { 
    layer.add(bombman.img);
    bombman.isDrawn == true;
  }
  if (bombman.isAlive && bombman.speed > 0) {
  	var newStyle = animBombman(bombman.sprite, bombman.direction);
  	bombman.img.crop({
  		x: newStyle[0], y: newStyle[1], 
  		width: newStyle[2], height: newStyle[3] })
  }
  
  layer.draw();
}
var animBombman = (function() {
	const width = 18, height = 26, next=20;
	var mapping = [];
	mapping[c_Down] = { x:6, y:70 }
	mapping[c_Up] = { x:6, y:98 }
	mapping[c_Right] = { x:6, y:126 }
	mapping[c_Left] = { x:6, y:154 }
	return function (n, direction) {
		var x = mapping[direction].x+n*next
		   ,y = mapping[direction].y;
		return [x, y, width, height];
	}
})();
var renderBoard = function(stage, layer, board) {
	for (var i=0, n=board.length; i<n; i++) {
		for (var j=0, n2=board[i].length; j<n2; j++) {
			switch (board[i][j].type) {
			  case c_Brick :
			  case c_Block :
			  case c_Bomb  :
			  case c_Fire  :
			  case c_Empty :
				if (board[i][j].isDrawn === false)
					drawBoardElement(layer, board[i][j]);
				break;
			  default :
				console.log('unknown type in board', board[i][j]);
			}
		}
	}
	layer.draw();
}
const drawBoardElement = function(layer, el) {
  if (el.isDrawn === false) {
  	var rect = el.render();
  	layer.add(rect);
  	el.isDrawn = true;
  } 
}

// Controller
//  - updates
var updateBombman = function (dt, bombman) {
	bombman.time = bombman.time + dt;
	if (bombman.time > bombman.moveAnimSpeed) {
		bombman.sprite = (bombman.sprite + 1) % 6
		bombman.time = 0;
	}
	return bombman;
}

const updatePlayer = function(player, board) {
  if (player.isAlive === true) {
	  player.speed = calcSpeed(player);
	  const oldPos = {
		   x: player.img.getX()
		  ,y: player.img.getY() }
		,movement = calcMovement(player)
		//,movement = getDebugMovement(oldPos.x, oldPos.y)
		,newPos = {
		   x: oldPos.x + movement.x
		  ,y: oldPos.y + movement.y }
		,validPos = getValidPos(board, player, oldPos, newPos);
	  player.direction = calcDirection(oldPos, validPos);
	  player.img.setX(validPos.x);
	  player.img.setY(validPos.y);
	  player = updateBombman(dt, player);

	  //check if player wants to drop a bomb
	  if (keysDown[player.keyConfig[c_BombKey]])
		  player.dropBomb();

	  // check if player is hit by fire
	  const pcol = Math.floor(validPos.x / c_Blocksize)
		   ,prow =  Math.floor(validPos.y / c_Blocksize)
		   ,blocks = getBlocksUnderneathPlayer(board, validPos, player)
		   ,playerRect = player.getRect(validPos);
	   var i=0, n=blocks.length;
	   while (i<n && blocks[i].type !== c_Fire)
		   i++;
	   if (i!==n)
		 player.isAlive = false;
  } else {
	  player.update(dt); // update dead animation
  } 
}

const getBlocksUnderneathPlayer = 
	function(board, pos, player) {
	   const tl = { x: Math.floor(pos.x / c_Blocksize)
				   ,y: Math.floor(pos.y / c_Blocksize) }
	        ,tr = { x: Math.floor((pos.x+player.width) / c_Blocksize)
				   ,y: tl.y }
	        ,bl = { x: tl.x
				   ,y: Math.floor((pos.y+player.height) / c_Blocksize) }
	        ,br = { x: tr.x
				   ,y: bl.y }
	   return  [ board[tl.y][tl.x],
		         board[tr.y][tr.x],
		         board[bl.y][bl.x],
		         board[br.y][br.x] ]; }
const updateBoard = function(board, dt) {
	for (var i=0, n=c_Blocks; i<n; i++) {
	  for (var j=0; j<n; j++) {
	    switch (board[i][j].type) {
		  case c_Bomb:
			var myBomb = board[i][j];
		    myBomb.update(dt);
			if (myBomb.isExploded) {
			   addExplosion(board, j, i, myBomb.bombStrength);
			}
			break;
		  case c_Fire:
			board[i][j].update(dt); 
			if (board[i][j].isDestroyed) {
			  board[i][j] = emptyBlock(j,i);
			}
			break;
		  case c_Brick:
		    board[i][j].update(dt);
			if (board[i][j].isFinished) {
			  board[i][j] = emptyBlock(j,i);
			}
			break;
		}
	  }
	}
}
const addExplosion = function(board, col, row, range) {
	const addFire = function(rowInc, colInc, firemiddle, fireend) {
		var i = 1;
		while (i<=range && 
			[c_Block, c_Brick].indexOf(
				board[row+rowInc*i][col+colInc*i].type)
			  === -1) {
		  board[row+rowInc*i][col+colInc*i] = 
			fire(col+i*colInc, row+i*rowInc, firemiddle);
		  i++;
		}
		// if the fire encountered a brick, break it
		if (i<=range) {
			var el = board[row+rowInc*i][col+colInc*i];
			if (el.type === c_Brick) {
			  board[row+rowInc*i][col+colInc*i].break();
			}
		}
		// if it was a full explosion
		//  give the last block an 'end' image
		if (i === range+1) {
			i--;
			var el = board[row+rowInc*i][col+colInc*i];
			if (el.type !== c_Block && el.type !== c_Brick)
			  board[row+rowInc*i][col+colInc*i] = 
				fire(col+i*colInc, row+i*rowInc, fireend);
		}
	}
	// go left
	addFire(0, -1, c_FireMiddleH, c_FireLeft);
	addFire(0, +1, c_FireMiddleH, c_FireRight);
	addFire(-1, 0, c_FireMiddleV, c_FireUp);
	addFire(+1, 0, c_FireMiddleV, c_FireDown);
	// cross
    board[row][col] = fire(col, row, c_FireCross);
}

//  - events
var keysDown = {}; //this map allows to handle multikey press
window.addEventListener('keydown', function(event) {
  const keyName = event.code;
  keysDown[keyName] = true;

  if (keysDown[c_KeyList[4]] === true) 
    eventManager.raiseEvent(ev_BombKey);

	// prevent scrolling
  if([32, 37, 38, 39, 40].indexOf(event.keyCode) > -1) {
  	event.preventDefault();
  }	
}, false);
document.addEventListener('keyup', function(event) {
  const keyName = event.code;
  keysDown[keyName] = false;

  //Debug
  switch (event.code) {
    case 'KeyP': 
		  game.state = (game.state === c_Playing) ? c_Paused : c_Playing;
		  console.log('Pause:', game.state === c_Paused);
		  if (game.state === c_Playing) 
			window.requestAnimationFrame(update);
		  break;
	case 'KeyD': 
		  game.debug = !game.debug; 
		  console.log('Debug:', game.debug);
		  break;
  }

}, false);

var  lastloop = null;

const demoTime = 20*1000; //ms
var demoCtr = 0;

var elBombman = document.getElementById('bomberman');
const stage = new Konva.Stage({
		 container : 'container'
		,width     : c_Boardsize
		,height    : c_Boardsize })
     ,boardLayer = new Konva.Layer()
	 ,playerLayer = new Konva.Layer()
     ,debugLayer = new Konva.Layer();
stage.add(boardLayer, playerLayer, debugLayer);

var update = function(timestamp) {
  dt = timestamp - lastloop;

  // DRAW
  renderBoard(stage, boardLayer, game.board);
  renderPlayers(stage, playerLayer, game.players);

  // UPDATE
  // update board
  updateBoard(game.board, dt);
	
  // update player pos
  for (var i=0, n=game.players.length; i<n; i++) {
	  updatePlayer(game.players[i], game.board);
  }


  //if (game.debug === true) 
	  //renderDebugCollision(blocks);
  if (demoCtr !== -1) {
	if (demoCtr > demoTime) {
	  game.state = c_Paused;
	  demoCtr = -1;
    } else
	  demoCtr += dt;
  }


  // debug
  if (dropBombsDebug.length > 0 && !(dropBombsDebug[0] > demoCtr)) {
	  dropBombsDebug.shift();
	  //eventManager.raiseEvent(ev_BombKey);
  }


  if (game.state === c_Playing) {
    window.requestAnimationFrame(update);
  }
  else console.log('game is paused');

  lastloop = timestamp
}

// Debug
const playerAnimDebug = [ c_Blocksize, 8*c_Blocksize 
						, c_Blocksize, c_Blocksize
						, 3*c_Blocksize, c_Blocksize 
					    , 3*c_Blocksize, 8*c_Blocksize  
					    , 8*c_Blocksize, 8*c_Blocksize ]; 
const dropBombsDebug = [ 0, 7000 ];
var animCtr = 0;
var getDebugMovement = function(x, y) {
	var toX = playerAnimDebug[animCtr],
		toY = playerAnimDebug[animCtr+1];

	const c_err = 1;
	if (animCtr > playerAnimDebug.length-1)
		return { x: 0, y: 0 };
	else if (diff(x, toX) < c_err && diff(y, toY) < c_err) {
		animCtr += 2;
		return { x: 0, y: 0 };
	}
	else {
		var dx = x < toX ? +1 : -1;
		var dy = y > toY ? -1 : +1;
		return { x: diff(x,toX) < c_err ? 0 : dx*c_MaxSpeed
			    ,y: diff(y,toY) < c_err ? 0 : dy*c_MaxSpeed }
	}
}
const toKonvaRect = function(rect) { return new Konva.Rect({
			  x: rect.x, y: rect.y,
			  width: rect.width, height: rect.height,
			  fill: 'rgba(99,99,99,0.5)',
			  stroke: 'red',
			  strokeWidth: 1
	 })};
const renderDebugCollision = function(rects) {
	debugLayer.destroyChildren();
	for (var i=0, n=rects.length; i<n; i++)
	  debugLayer.add(toKonvaRect(rects[i]));
	debugLayer.draw();
}

// Start
var waitWhileLoading = function() {
	if (imgLoadCtr < c_Images.length) {
		window.setTimeout(waitWhileLoading, 200);
	 } else {
		window.requestAnimationFrame(update);
//addExplosion(game.board, 3, 4, 5);
//addExplosion(game.board, 6, 7, 5);
//addExplosion(game.board, 4, 1, 5);
//updateBoard(game.board, 0);
//renderBoard(stage, boardLayer, game.board);
	 }
}
waitWhileLoading();
