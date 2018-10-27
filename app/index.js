const c_Playing = 0, c_Paused = 1; // game state
const c_Player = 0, c_Block = 1, c_Bomb = 2; // actor types
const c_Blocks = 15, c_Blocksize = 26, c_Boardsize = c_Blocks * c_Blocksize;
const c_Speed = 0.1, c_MaxSpeed = 2;
const c_KeyList = [ 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown' ];
var buildInitialBoard = function() {
	// init array
    const board = new Array(c_Blocks);
	for (var i=0, n=c_Blocks; i<n; i++) {
		board[i] = new Array(c_Blocks);
		for (var j=0, n2=c_Blocks; j<n; j++) 
		  board[i][j] = { type: 'empty' }
	}

	//map design: should be defined in XML
	var blocks = [ 0,0, 0,9, 1,0, 1,9, 2,0, 2,9, 3,0, 3,9, 4,0, 4,9, 5,0, 5,9, 6,0, 6,9, 7,0, 7,9, 8,0, 8,9, 9,0, 9,9, 0,0, 9,0, 0,1, 9,1, 0,2, 9,2, 0,3, 9,3, 0,4, 9,4, 0,5, 9,5, 0,6, 9,6, 0,7, 9,7, 0,8, 9,8, 0,9, 9,9, 2,2, 7,2, 2,3, 7,3, 2,4, 7,4, 2,5, 7,5, 2,6, 7,6, 2,7, 7,7,
				   4,2, 5,2, 4,3, 5,3, 4,6, 5,6, 4,7, 5,7 ] 
	for (var i=0, n=blocks.length; i<n; i+=2) {
		var col = blocks[i], row = blocks[i+1];
		board[row][col] = block(col, row);
	}
	return board;
}

// Model
var actor = function(type, x, y) {
	   return {
	   	 type : type
	   	,x:x*c_Blocksize
		,y:y*c_Blocksize
	    ,isDrawn : false }}
   ,player = function(x, y) {
	   var p = actor(c_Player, x, y);
	   p.speed = 0;
	   p.time = 0;
	   p.moveAnimSpeed = 1000/15;
	   p.sprite = 0; 
	   p.img = null;
	   p.imgLoaded = false;
	   var offsetX = 6, offsetY = 70, next = 20
	       ,width = 18, height = 26
		   ,scaledH = c_Blocksize
		   ,scaledW = scaledH * (width/height);
	   p.width = scaledW;
	   p.height = scaledH;
	   var img = new Image();
	   img.onload = function() {
		   p.imgLoaded = true;
		   p.img = new Konva.Image({
			x: p.x, y: p.y,
			width: p.width, height: p.height,
			crop: {
				x: 6, y: 70,
				width: 18, height: 26,
			},
			image: img
		  }); };
	   img.src = "img/sprites.png";
	   return p; }
   ,calcMovement = function(player) {
	  var dx = 0, dy = 0;
	  var valueH = keysDown[c_KeyList[0]] === true ? -1 : 1
		 ,valueV = keysDown[c_KeyList[2]] === true ? -1 : 1;
	  if (keysDown[c_KeyList[0]] === true
	     || keysDown[c_KeyList[1]] === true) {
		dx = valueH*player.speed; 
	  } 
	  if (keysDown[c_KeyList[2]] === true
	     || keysDown[c_KeyList[3]] === true) {
		dy = valueV*player.speed; 
	  }
	  return { x: dx, y: dy }; }
   ,calcSpeed = function(player) {
		var anyKeyDown = keysDown[c_KeyList[0]] 
		   || keysDown[c_KeyList[1]] 
		   || keysDown[c_KeyList[2]] 
		   || keysDown[c_KeyList[3]]
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
	   const tl = { x: Math.floor(newPos.x / c_Blocksize)
				   ,y: Math.floor(newPos.y / c_Blocksize) }
	        ,tr = { x: Math.floor((newPos.x+player.width) / c_Blocksize)
				   ,y: tl.y }
	        ,bl = { x: tl.x
				   ,y: Math.floor((newPos.y+player.height) / c_Blocksize) }
	        ,br = { x: tr.x
				   ,y: bl.y }
	   var blocks = [
		   board[tl.y][tl.x],
		   board[tr.y][tr.x],
		   board[bl.y][bl.x],
		   board[br.y][br.x] ]

	   // if theres collision with the adjacent block 
	   // then return oldPos
	   const middlePlayer = {
			   x: newPos.x + (0.5*player.width)
			  ,y: newPos.y + (0.5*player.height)  }
	        ,playerRect = {
			   x: middlePlayer.x - 0.5*player.width
			  ,y: middlePlayer.y - 0.5*player.height +2
			  ,width: player.width 
			  ,height: player.height -4 }

	   var i=0, n=blocks.length;
	   while (i<n && 
		   (blocks[i].type !== c_Block || rectCollision(blocks[i], playerRect) === false))
		   i++;

	   blocks.push(playerRect);
	   return (i!==n) ? [oldPos, blocks] : [newPos, blocks];
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
	;

const ev_KeyPressed = 0;
const c_Left=0, c_Right=1, c_Up=2, c_Down=3;
const eventManager = (function() {
  var my = {}
     ,observers = [];
  my.subscribe = function(event, observerFn) {
	  observers.push({ event: event,
					   notify: observerFn });
  };
  my.key = function(direction, value) {
	  for (var i=0, n=observers.length; i<n; i++)
		  if (observers[i].event === ev_KeyPressed)
			  observers[i].notify(direction, value);
	  };
  return my;
})();
   
var game = {
	 state  : c_Playing
	,player : player(1,1) 
	,board  : buildInitialBoard() }


// View
var renderBombman = function(stage, layer, bombman) {
  if (bombman.imgLoaded === true) {
	if (bombman.isDrawn === false) { 
	  layer.add(bombman.img);
	  bombman.isDrawn == true;
	}
	if (bombman.speed > 0) {
		var newStyle = animBombman(bombman.sprite, bombman.direction);
		bombman.img.crop({
			x: newStyle[0], y: newStyle[1], 
			width: newStyle[2], height: newStyle[3] })
	}

	layer.draw();
  }
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
			  case c_Block : 
				if (board[i][j].isDrawn === false) {
					var rect = board[i][j].render();
					layer.add(rect);
					board[i][j].isDrawn = true;
				}
				break;
			  case 'empty': break;
			  default :
				console.log('unknown type in board', board[i][j]);
			}
		}
	}
	layer.draw();
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

//  - events
var keysDown = {}; //this map allows to handle multikey press
window.addEventListener('keydown', function(event) {
  const keyName = event.key;
  keysDown[keyName] = true;
  if (keysDown[c_KeyList[0]] === true) 
    eventManager.key(c_Left, -1);
  if (keysDown[c_KeyList[1]] === true) 
    eventManager.key(c_Right, 1);
  if (keysDown[c_KeyList[2]] === true) 
    eventManager.key(c_Up, -1);
  if (keysDown[c_KeyList[3]] === true) 
    eventManager.key(c_Down, 1);

	// prevent scrolling
  if([32, 37, 38, 39, 40].indexOf(event.keyCode) > -1) {
  	event.preventDefault();
  }	
}, false);
document.addEventListener('keyup', function(event) {
  const keyName = event.key;
  keysDown[keyName] = false;

  //Debug
  switch (event.code) {
    case 'KeyP': game.state = c_Paused; break;
  }

}, false);

var  lastloop = null;

const demoTime = 5*1000; //ms
var demoCtr = 0;

var elBombman = document.getElementById('bomberman');
const stage = new Konva.Stage({
		 container : 'container'
		,width     : c_Boardsize
		,height    : c_Boardsize })
     ,boardLayer = new Konva.Layer()
	 ,playerLayer = new Konva.Layer();
stage.add(boardLayer, playerLayer);

var update = function(timestamp) {
  dt = timestamp - lastloop;

  // draw board
  renderBoard(stage, boardLayer, game.board);
	
  // update player pos
  if (game.player.imgLoaded === true) {
	  game.player.speed = calcSpeed(game.player);
	  const oldPos = {
		   x: game.player.img.getX()
	      ,y: game.player.img.getY() }
	    ,movement = calcMovement(game.player)
	    //,movement = getDebugMovement(oldPos.x, oldPos.y)
	    ,newPos = {
		   x: oldPos.x + movement.x
		  ,y: oldPos.y + movement.y }
	    ,validPosObj = getValidPos(game.board, game.player, oldPos, newPos);
	  const validPos = validPosObj[0]
	       ,debugRects = validPosObj[1];
	  renderDebugCollision(debugRects);
	  game.player.direction = calcDirection(oldPos, validPos);
	  game.player.img.setX(validPos.x);
	  game.player.img.setY(validPos.y);
  }

  // draw player
  game.player = updateBombman(dt, game.player);
  renderBombman(stage, playerLayer, game.player);


  demoCtr += dt;
  //if (demoCtr > demoTime) game.state = c_Paused;

  if (game.state == c_Playing) {
    window.requestAnimationFrame(update);
  }
  else console.log('game is paused');

  lastloop = timestamp
}

// Debug
const playerAnimDebug = [ c_Blocksize, 9*c_Blocksize //coll
						, c_Blocksize, c_Blocksize
						, 2*c_Blocksize, c_Blocksize 
						, 2*c_Blocksize, 9*c_Blocksize //coll
						, 3*c_Blocksize, c_Blocksize
					    , 3*c_Blocksize, 9*c_Blocksize  //coll
					    , 8*c_Blocksize, 8*c_Blocksize ]; 
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
const debugLayer = new Konva.Layer()
     ,toKonvaRect = function(rect) { return new Konva.Rect({
			  x: rect.x, y: rect.y,
			  width: rect.width, height: rect.height,
			  fill: 'rgba(0,0,0,0)',
			  stroke: 'red',
			  strokeWidth: 1
	 })};
stage.add(debugLayer);
const renderDebugCollision = function(rects) {
	debugLayer.destroyChildren();
	for (var i=0, n=rects.length; i<n; i++)
		if (rects[i].type !== "empty")
			debugLayer.add(toKonvaRect(rects[i]));
	debugLayer.draw();
}
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
// Start
window.requestAnimationFrame(update);
