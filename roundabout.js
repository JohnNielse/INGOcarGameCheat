App.MAX_FPS = 50;
App.debugMode = false;



/*
VARIABLES & CONSTANTS
--------------------------------------------------------------------------------
*/

var UNIT = 5, // Size of each square in the map
  WIGGLE = 1, // Room between Driver and the wall,
  LAPS_NUM = 0;

var preloadables = ['roundabout/assets/img/brick_transparent.png', 'roundabout/assets/img/player_transparent.png', 'roundabout/assets/img/car_transparent.png'];
var player;
var playerAngle = 0;
var playerRadius;
var carProperties = {};
var carRadius;
var cx, cy;
var lowPlayerSpeed = 80;
var highPlayerSpeed = 230;
var originalPlayerSpeed = 150;
var currentPlayerSpeed = originalPlayerSpeed;
var playerSize;
var laneInner = 0.50;
var laneOuter = 0.85;
var laps = 9;
var newLapReady = true;
var newLapTime = 0;
var carColideReady = true;
var boostReady = true;
var changeLaneAngleDiff = 0;
var finishLine;
var timer;
var boostBtnTimeout;
var styles = {};
var changeLaneDirection = 'outer';
var laneIntervalRadius;
var changeLaneReady = true;
var boostTimeout;







/*
UPDATE
--------------------------------------------------------------------------------
*/
function update() {

  if (userAttempt.state == 'playing') {

    var delta = App.physicsDelta
    var d2 = delta / 2;

    playerAngle += (getPlayerSpeed() * Math.PI / 180) * d2;

    // Set player coordinates
    player.x = (cx + playerRadius * Math.cos(-playerAngle));
    player.y = (cy + playerRadius * Math.sin(-playerAngle));

    // Angle at which to draw the car
    player.radians = -(playerAngle + changeLaneAngleDiff);

    // Finish line
    if (player.overlaps(finishLine) && newLapReady && isNewLapValid()) {
      player.increaseLaps();
    }

    // Stop game if time is more than 120 seconds
    if (timer.elapsedTime > 120) {
      gameover(timer.elapsedTime);
    }

    player.changeLane();

    // cars
    cars.forEach(function (car) {

      if (timer.elapsedTime > carProperties[car.carNum].time) {

        if (carProperties[car.carNum].visible != true) {

          addUserEvent(10, timer.elapsedTime);

          carProperties[car.carNum].angle = (playerAngle + 180) % 360;

          carProperties[car.carNum].visible = true;

        }

        var speed = carProperties[car.carNum].speed;
        var lane = carProperties[car.carNum].lane;

        carProperties[car.carNum].angle += (speed * Math.PI / 180) * d2;

        var carX = cx + calcCarRadius(lane) * Math.cos(-carProperties[car.carNum].angle);
        var carY = cy + calcCarRadius(lane) * Math.sin(-carProperties[car.carNum].angle);

        car.x = carX;
        car.y = carY;

        car.radians = -carProperties[car.carNum].angle;

      } else {

        car.x = -100;
        car.y = -100;

      }

      var collision = player.collides(car);

      if (collision && player.readyToCollide) {

        addUserEvent(1, timer.elapsedTime);

        timer.elapsedTime += 0.1;

        if (currentPlayerSpeed < speed) {

          car.reduceSpeed(car.carNum);

        }

        if (currentPlayerSpeed > speed) {

          player.reduceSpeed();

        }

        if (changeLaneDirection != false) {

          stopLaneChange();

        }

      }

    });

  }

}










/*
DRAWING
--------------------------------------------------------------------------------
*/

function draw() {
  finishLine.draw();
  player.draw();
  cars.draw();
}









/*
CARS
--------------------------------------------------------------------------------
*/
var Car = Actor.extend({

  init: function () {
    this.DEFAULT_WIDTH = playerSize;
    this.DEFAULT_HEIGHT = (playerSize * 1.8);

    this._super.apply(this, arguments);

    this.carNum = carNum++;
    this.angle = 0;

    this.src = 'roundabout/assets/img/car_transparent.png';

  },

  reduceSpeed: function (carNum) {

    player.readyToCollide = false;

    var orgSpeed = carProperties[carNum].speed;

    carProperties[carNum].speed = 0;

    setTimeout(function () {
      player.readyToCollide = true;
    }, 250);

    setTimeout(function () {

      carProperties[carNum].speed = orgSpeed;

    }, 3000);

  },
});

function carShowTime(min, max) {

  var time = Math.random() * (max - min) + min;

  return time;
}

function getCarProperties() {
  return {
    0: {
      speed: 100,
      time: carShowTime(2, 4),
      lane: 'inner',
      angle: 0,
      visible: false
    },

    1: {
      speed: 140,
      time: carShowTime(6, 9),
      lane: 'outer',
      angle: 0,
      visible: false
    }
  }
}








/*
PLAYER
--------------------------------------------------------------------------------
*/

var Driver = Player.extend({

  init: function () {

    this.DEFAULT_WIDTH = playerSize;
    this.DEFAULT_HEIGHT = (playerSize * 1.8);

    this.src = 'roundabout/assets/img/player_transparent.png';

    this._super.apply(this, arguments);
    this.angle = 0;

    this.readyToCollide = true;

  },

  increaseLaps: function () {

    laps -= 1;

    if (laps == 8) {

      timer.start();

      var boostShowTime = carShowTime(0.2, 0.4) * 1000;

      setTimeout(function () {
        showBoostBtn();
      }, boostShowTime);

      $('.pause').show();
    }

    $('.laps').html(laps);

    var lapsAnimateTop = 0.029 * canvas.width;;
    var lapsAnimateLeft = (0.53 * canvas.width);

    $('.header').append('<div class="laps-animate" style="top: ' + lapsAnimateTop + 'px; left: ' + lapsAnimateLeft + 'px;">' + laps + '</div>');

    setTimeout(function () {
      $('.laps-animate').remove();
    }, 2000);

    addUserEvent(2, timer.elapsedTime);

    if (laps == LAPS_NUM) {
      player.finish();
    }

  },

  boostSpeed: function () {

    if (boostReady) {

      addUserEvent(9, timer.elapsedTime);

      boostReady = false;

      changeLaneReady = false;

      currentPlayerSpeed = highPlayerSpeed;

      hideBoostBtn();

      var boostTime = carShowTime(5, 5.6) * 1000;

      boostTimeout = new BoostTimer(function () {

        boostReady = true;

        currentPlayerSpeed = originalPlayerSpeed;

        showBoostBtn();

      }, boostTime);

      setTimeout(function () {
        changeLaneReady = true;
      }, 500);

    }

  },

  reduceSpeed: function () {

    player.readyToCollide = false;

    currentPlayerSpeed = 0;

    var aj = 1;

    hideBoostBtn();

    setTimeout(function () {
      player.readyToCollide = true;
    }, 250);

    setTimeout(function () {
      currentPlayerSpeed = lowPlayerSpeed;
    }, 1000);

    setTimeout(function () {
      currentPlayerSpeed = originalPlayerSpeed;
    }, 2000);

    setTimeout(function () {
      if (boostReady && timer.elapsedTime > 0) {
        showBoostBtn();
      }
    }, 3000);

  },

  finish: function () {

    var time = timer.elapsedTime;

    addUserEvent(3, timer.elapsedTime);

    addUserEvent(8, App.MAX_FPS);

    addUserEvent(11, timer.elapsedTime, window.innerWidth + "x" + window.innerHeight);

    addUserEvent(12, timer.elapsedTime, lowPlayerSpeed + ", " + highPlayerSpeed + ", " + originalPlayerSpeed + ", " + currentPlayerSpeed);

    gameover(time);

    timer.stop();
    stopAnimating();
    player.destroy();
    App.reset();

    clearTimeout(boostBtnTimeout);

    $('#gameover-img').html('<img src="' + INGO.gameUrl + '/assets/img/gameover.png?v=2">');

    var responseText;

    if (time > 20) {
      responseText = translate('roundaboutGameover1');

    }
    if (time > 25) {
      responseText = translate('roundaboutGameover2');

    }
    if (time > 30) {
      responseText = translate('roundaboutGameover3');

    }
    if (time > 35) {
      responseText = translate('roundaboutGameover4');

    }
    if (time > 40) {
      responseText = translate('roundaboutGameover5');
    }

    $('#gameover-response').html(responseText);

  },

  changeLane: function () {

    if ((changeLaneDirection == 'inner' || changeLaneDirection == 'outer') && changeLaneReady) {

      if (changeLaneDirection == 'inner') {

        changeLaneAngleDiff = 0.7;

        if (playerRadius > (laneInner * (canvas.width / 2))) {

          playerRadius -= laneIntervalRadius;

        } else {

          changeLaneAngleDiff = 0;
          player.lane = changeLaneDirection;
          changeLaneDirection = false;

        }

      } else if (changeLaneDirection == 'outer') {

        changeLaneAngleDiff = (-0.7);

        if (playerRadius < (laneOuter * (canvas.width / 2))) {

          playerRadius += laneIntervalRadius;

        } else {

          changeLaneAngleDiff = 0;
          player.lane = changeLaneDirection;
          changeLaneDirection = false;

        }

      }

    }

  }

});

function isNewLapValid() {

  newLapReady = false;
  var diff = timer.getElapsedTime() - newLapTime;
  var oldLapTime = newLapTime;

  console.table({
    diff: diff,
    oldLapTime: oldLapTime,
    newLapTime: newLapTime,
    elapsedTime: timer.getElapsedTime()
  });

  setTimeout(function () {
    newLapReady = true;
  }, 2000);

  if (newLapTime == 0 || diff > 2) {

    newLapTime = timer.getElapsedTime();

    return true;

  }

}


function hideAndShowBoostBtn(time) {

  var bottomVisible = 0.15 * window.innerWidth;
  var bottomHidden = 0.09 * window.innerWidth;

  $('.boost').animate({ bottom: bottomHidden + 'px', opacity: 0 }, 100, function () {
    $('.boost').hide();
  });

  clearTimeout(boostBtnTimeout);

  boostBtnTimeout = setTimeout(function () {

    $('.boost').show(0, function () {
      $('.boost').animate({ bottom: bottomVisible + 'px', opacity: 1 }, 100);
    });

  }, time);

}

function hideBoostBtn() {

  var bottomHidden = 0.09 * window.innerWidth;

  $('.boost').animate({ bottom: bottomHidden + 'px', opacity: 0 }, 100, function () {
    $('.boost').hide();
  });

}

function showBoostBtn() {

  var bottomVisible = 0.15 * window.innerWidth;

  $('.boost').show(0, function () {
    $('.boost').animate({ bottom: bottomVisible + 'px', opacity: 1 }, 100);
  });

}

function calcCarRadius(lane) {

  if (lane == 'inner') {
    return laneOuter * (canvas.width / 2);
  } else {
    return laneInner * (canvas.width / 2);
  }

}

function getPlayerSpeed() {

  /*
  This function returns the players speed,
  depending on whether the car is in the outer or inner lane
  */

  if (player.lane == 'inner') {
    return currentPlayerSpeed + (0.2 * currentPlayerSpeed);
  } else {
    return currentPlayerSpeed;
  }

}

function stopLaneChange() {

  if (changeLaneDirection == 'inner') {

    changeLaneDirection = 'outer'

  } else if (changeLaneDirection == 'outer') {

    changeLaneDirection = 'inner'

  }

}

function resumeGame() {
  timer.elapsedTime += 0.25;
  timer.start();

  if (boostTimeout) {
    boostTimeout.resume();
  }

  addUserEvent(14, timer.elapsedTime);

  startAnimating();
}

function pauseGame() {
  timer.stop();

  if (boostTimeout) {
    boostTimeout.pause();
  }

  addUserEvent(13, timer.elapsedTime);

  stopAnimating();
}

function startGame() {
  currentPlayerSpeed = originalPlayerSpeed;
  carColideReady = true;
  startAnimating();
  roundTime();
}

function resetGame() {

  if (boostTimeout) {
    boostTimeout.reset();
  }

  stopAnimating();

  timer = new Timer(false);
  playerAngle = 0;
  playerRadius = (laneOuter * (canvas.width / 2));
  laps = 9;
  newLapTime = 0;
  attemptData = [];
  carProperties = getCarProperties();
  boostReady = true;

  $('.laps').html(8);

  hideBoostBtn();

  $('.pause').hide();


}

function roundTime() {
  setInterval(function () {
    $('.timer').html(Math.round(timer.getElapsedTime() * 10) / 10);
  }, 100);
}

function BoostTimer(callback, delay) {

  var timerId, start, remaining = delay;

  this.pause = function () {
    window.clearTimeout(timerId);
    remaining -= new Date() - start;
  };

  this.resume = function () {
    start = new Date();
    window.clearTimeout(timerId);
    timerId = window.setTimeout(callback, remaining);
  };

  this.reset = function () {
    window.clearTimeout(timerId);
  }

  this.resume();
}











/*
SETUP
--------------------------------------------------------------------------------
*/

function setup(first) {

  $('.header').remove();

  canvas.width = window.innerWidth;
  canvas.height = window.innerWidth;
  world.width = canvas.width;
  world.height = canvas.height;

  $('.canvas-wrapper').css({
    'margin-top': '-' + canvas.height / 2 + 'px',
    'margin-left': '-' + canvas.width / 2 + 'px',
  });

  // Player radius, starting at outer lane
  playerRadius = laneOuter * (canvas.width / 2);

  // Player size
  playerSize = 0.08 * canvas.width;

  // Cordinates of the center of the circle around which player and enemies are moving
  cx = (0.5 * canvas.width) - (playerSize / 2);
  cy = (0.5 * canvas.width) - ((playerSize * 1.8) / 2);

  var circleX = canvas.width / 2;
  var circleY = canvas.width / 2;

  laneIntervalRadius = (0.007 * canvas.width);

  // CARS
  carRadius = laneOuter * (canvas.width / 2);

  // Finish line
  var finishLineX = canvas.width / 2;
  var finishLineHeight = 0.284 * canvas.width;
  finishLine = new Box(finishLineX, 0, 1, finishLineHeight);
  finishLine.src = 'roundabout/assets/img/brick_transparent.png';

  // Initialize timer
  timer = new Timer(false);

  // Initialize the player.
  player = new Driver();

  // Initialize cars
  carNum = 0;
  cars = new Collection();

  carProperties = getCarProperties();

  for (var key in carProperties) {
    cars.add(new Car(0, 0));
  }

  var windowWidth = $window.innerWidth();
  var windowHeight = $window.innerHeight();
  var headerHeight = 0.19 * windowWidth;
  var headerPadding = 0.05 * windowWidth;
  var avatarSize = headerHeight;
  var avatarTop = 0.15 * avatarSize;
  var pauseSize = 0.14 * windowWidth;
  var pauseTop = 0.2 * headerHeight;
  var pauseLeft = (windowWidth / 2) + 80;
  var pauseRight = (windowWidth / 2) + 80;

  $('.game-container').css({
    'height': windowHeight + 'px',
    'width': windowWidth + 'px'
  })

  $('.game-container').append(
    '<div class="header" style="height: ' + headerHeight + 'px">' +
    '<div class="avatar" style="height: ' + avatarSize + 'px; top: ' + avatarTop + 'px; left: ' + headerPadding + 'px;"><img src="assets/img/avatar.png?v=2"></div>' +
    '<div class="pause btn-animate" style="display: none; width:' + pauseSize + 'px; height:' + pauseSize + 'px; border-radius:' + pauseSize + 'px; top: ' + pauseTop + 'px; right: ' + headerPadding + 'px;"></div>' +
    '</div>'
  );

  var lapsTop = 0.029 * canvas.width;;
  var lapsLeft = (0.53 * canvas.width);
  var lapsHtml = '<div class="laps" style="top: ' + lapsTop + 'px; left: ' + lapsLeft + 'px;">8</div>';
  $('.header').append(lapsHtml);

  // Timer
  timer = new Timer(false);
  var timerTop = (canvas.height / 2);
  var timerLeft = (0.3 * canvas.width);
  var timerHtml = '<div class="timer" style="top: ' + lapsTop + 'px; left: ' + timerLeft + 'px;"></div>';
  $('.header').append(timerHtml);

  $('.game-container').on('touchstart', function (event) {
    event.stopPropagation();
    if ((event.type == 'mousedown' || event.type == 'touchstart') && (event.target.id == 'canvas' || event.target.id == 'game-container')) {

      if (player.lane == 'inner') {
        changeLaneDirection = 'outer';
      } else {
        changeLaneDirection = 'inner';
      }

      addUserEvent(4, timer.elapsedTime);

    }

  });

  // Boost
  var boostHeight = 0.1 * canvas.height;
  var boostBtnWidth = 0.44 * canvas.width;
  var boostBtnBottom = 0.15 * canvas.width;
  var boostBtnPadding = 0.05 * canvas.width;
  var boostBtnOuter = boostBtnWidth + (boostBtnPadding * 2);
  var boostBtnLeft = (canvas.width - boostBtnOuter) / 2;

  var boostHtml = $(
    '<div class="boost active btn-animate" style="padding: ' + boostBtnPadding + '; width: ' + boostBtnWidth + 'px; bottom: ' + boostBtnBottom + 'px; left: ' + boostBtnLeft + 'px;">' +
    '<img src="roundabout/assets/img/boost.svg?v=190109-01320">' +
    '</div>'
  );

  $('.game-container').append(boostHtml);

  $('.boost').on('click touchstart', function (event) {
    event.preventDefault();
    player.boostSpeed();
  });

}







/*
INIT
--------------------------------------------------------------------------------
*/

function initGame() {

  $('<link>')
    .appendTo('head')
    .attr({
      type: 'text/css',
      rel: 'stylesheet',
      href: HOME_URL + 'roundabout/assets/css/roundabout.css?' + (new Date()).getTime()
    });

  App.beforeSetup();
}
