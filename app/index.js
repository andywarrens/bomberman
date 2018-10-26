const c_Playing = 0, c_Paused = 1; // game state
const c_Player = 0, c_Block = 1, c_Bomb = 2; // actor types
const c_Boardsize = 400, c_Blocksize = c_Boardsize/15;
const c_Speed = 0.1, c_MaxSpeed = 2;
const c_KeyList = [ 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown' ];
var buildInitialBoard = function() {
	var board = [];
	//should be defined in XML
	var blocks = [ 0,0, 0,9, 1,0, 1,9, 2,0, 2,9, 3,0, 3,9, 4,0, 4,9, 5,0, 5,9, 6,0, 6,9, 7,0, 7,9, 8,0, 8,9, 9,0, 9,9, 0,0, 9,0, 0,1, 9,1, 0,2, 9,2, 0,3, 9,3, 0,4, 9,4, 0,5, 9,5, 0,6, 9,6, 0,7, 9,7, 0,8, 9,8, 0,9, 9,9, 2,2, 7,2, 2,3, 7,3, 2,4, 7,4, 2,5, 7,5, 2,6, 7,6, 2,7, 7,7,
				   4,2, 5,2, 4,3, 5,3, 4,6, 5,6, 4,7, 5,7 ] 
	for (var i=0, n=blocks.length; i<n; i+=2) {
		var x = blocks[i], y = blocks[i+1];
		board.push(block(x, y));
	}
	return board;
}

// Model
var actor = function(type, x, y) {
	   return {
	   	 type : type
	   	,pos  : {x:x*c_Blocksize
			    ,y:y*c_Blocksize}
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
	   var img = new Image();
	   img.onload = function() {
		   p.imgLoaded = true;
		   p.img = new Konva.Image({
			x: p.pos.x, y: p.pos.y,
			width: scaledW, height: scaledH,
			crop: {
				x: 6, y: 70,
				width: 18, height: 26,
			},
			image: img
		  }); };
	   img.src = "img/sprites.png";
	   return p; }
   ,calcDxDy = function(player) {
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
	  return [ dx, dy ]; }
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
	   var x1 = oldPos[0], x2 = x1+newPos[0]
	      ,y1 = oldPos[1], y2 = y1+newPos[1];
	   // going up/down
	   if (Math.abs(x1-x2) < 1) 
		   return y1 > y2 ? c_Up : c_Down;
	   else
		   return x1 > x2 ? c_Left : c_Right; }
   ,block = function(x, y) {
	   var b = actor(c_Block, x, y);
	   b.img = "img/block.png";
	   var rect = new Konva.Rect({
			  x: b.pos.x, y: b.pos.y,
			  width: c_Blocksize, height: c_Blocksize,
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
		switch (board[i].type) {
		  case c_Block : 
			if (board[i].isDrawn === false) {
				var rect = board[i].render();
				layer.add(rect);
			    board[i].isDrawn = true;
			}
			break;
		  default :
			console.log('unknown type in board', board[i]);
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
}, false);
document.addEventListener('keyup', function(event) {
  const keyName = event.key;
  keysDown[keyName] = false;
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
	  //var newPos = calcDxDy(game.player);
	  var newPos = getDebugPlayerPos(game.player.img.getX()
								   ,game.player.img.getY())
	  game.player.direction = calcDirection(
		  [game.player.img.getX(), game.player.img.getY()]
		 ,newPos);
	  game.player.img.setX(game.player.img.getX() + newPos[0]);
	  game.player.img.setY(game.player.img.getY() + newPos[1]);
  }

  // draw player
  game.player = updateBombman(dt, game.player);
  renderBombman(stage, playerLayer, game.player);


  demoCtr += dt;
  //if (demoCtr > demoTime) game.state = c_Paused;

  if (game.state == c_Playing) {
    window.requestAnimationFrame(update);
  }
  lastloop = timestamp
}

// Debug
const playerAnimDebug = [ c_Blocksize, 8*c_Blocksize
					    , 8*c_Blocksize, 8*c_Blocksize ];
var animCtr = 0;
var getDebugPlayerPos = function(x, y) {
	var toX = playerAnimDebug[animCtr],
		toY = playerAnimDebug[animCtr+1],
		diff = function(x1, x2) { return Math.abs(x1-x2); }
	const c_err = 1;
	if (animCtr > playerAnimDebug.length-1)
		return [0, 0];
	else if (diff(x, toX) < c_err && diff(y, toY) < c_err) {
		animCtr += 2;
		return [ 0, 0 ];
	}
	else {
		return [ diff(x,toX) < c_err ? 0 : c_MaxSpeed,
			     diff(y,toY) < c_err ? 0 : c_MaxSpeed ]
	}
}
// Start
window.requestAnimationFrame(update);
