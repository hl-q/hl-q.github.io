var stats = {};
stats.screenWidth = screen.width;
var detectionTime = new Date();
stats.nTilts = 0;
stats.nKeys = 0;
stats.nTouches = 0;

function KeyboardInputManager() {
  this.events = {};

  if (window.navigator.msPointerEnabled) {
    //Internet Explorer 10 style
    this.eventTouchstart    = "MSPointerDown";
    this.eventTouchmove     = "MSPointerMove";
    this.eventTouchend      = "MSPointerUp";
  } else {
    this.eventTouchstart    = "touchstart";
    this.eventTouchmove     = "touchmove";
    this.eventTouchend      = "touchend";
  }

  this.listen();
}

KeyboardInputManager.prototype.on = function (event, callback) {
  if (!this.events[event]) {
    this.events[event] = [];
  }
  this.events[event].push(callback);
};

KeyboardInputManager.prototype.emit = function (event, data) {
  var callbacks = this.events[event];
  if (callbacks) {
    callbacks.forEach(function (callback) {
      callback(data);
    });
  }
};

KeyboardInputManager.prototype.listen = function () {
  var self = this;

  var map = {
    38: 0, // Up
    39: 1, // Right
    40: 2, // Down
    37: 3, // Left
    75: 0, // Vim up
    76: 1, // Vim right
    74: 2, // Vim down
    72: 3, // Vim left
    87: 0, // W
    68: 1, // D
    83: 2, // S
    65: 3  // A
  };

  // Respond to direction keys
  document.addEventListener("keydown", function (event) {
    var modifiers = event.altKey || event.ctrlKey || event.metaKey ||
                    event.shiftKey;
    var mapped    = map[event.which];

    if (!modifiers) {
      if (mapped !== undefined) {
        event.preventDefault();
        self.emit("move", mapped);
        stats.nKeys++;
      }
    }

    // R key restarts the game
    if (!modifiers && event.which === 82) {
      self.restart.call(self, event);
    }
  });

  // Respond to button presses
  this.bindButtonPress(".retry-button", this.restart);
  this.bindButtonPress(".restart-button", this.restart);
  this.bindButtonPress(".keep-playing-button", this.keepPlaying);

  // Respond to swipe events
  var touchStartClientX, touchStartClientY;
  var gameContainer = document.getElementsByClassName("game-container")[0];

  gameContainer.addEventListener(this.eventTouchstart, function (event) {
    if ((!window.navigator.msPointerEnabled && event.touches.length > 1) ||
        event.targetTouches > 1) {
      return; // Ignore if touching with more than 1 finger
    }

    if (window.navigator.msPointerEnabled) {
      touchStartClientX = event.pageX;
      touchStartClientY = event.pageY;
    } else {
      touchStartClientX = event.touches[0].clientX;
      touchStartClientY = event.touches[0].clientY;
    }

    event.preventDefault();
  });

  gameContainer.addEventListener(this.eventTouchmove, function (event) {
    event.preventDefault();
  });

  gameContainer.addEventListener(this.eventTouchend, function (event) {
    if ((!window.navigator.msPointerEnabled && event.touches.length > 0) ||
        event.targetTouches > 0) {
      return; // Ignore if still touching with one or more fingers
    }

    var touchEndClientX, touchEndClientY;

    if (window.navigator.msPointerEnabled) {
      touchEndClientX = event.pageX;
      touchEndClientY = event.pageY;
    } else {
      touchEndClientX = event.changedTouches[0].clientX;
      touchEndClientY = event.changedTouches[0].clientY;
    }

    var dx = touchEndClientX - touchStartClientX;
    var absDx = Math.abs(dx);

    var dy = touchEndClientY - touchStartClientY;
    var absDy = Math.abs(dy);

    if (Math.max(absDx, absDy) > 10) {
      // (right : left) : (down : up)
      self.emit("move", absDx > absDy ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0));
      stats.nTouches++;
    }
  });


    Paprika.start(document.getElementById('videoFrame'));
    cardBundle = {};
    for (var i=0; i<=205; i++) {
        cardBundle[(4*i+0)] = {size: 33.3, keep:1, translation: [-33.3, -33.3, 0.]};
        cardBundle[(4*i+1)] = {size: 33.3, keep:1, translation: [ 33.3, -33.3, 0.]};
        cardBundle[(4*i+2)] = {size: 33.3, keep:1, translation: [ 33.3,  33.3, 0.]};
        cardBundle[(4*i+3)] = {size: 33.3, keep:1, translation: [-33.3,  33.3, 0.]};
    }
    Paprika.bundleTags({card: cardBundle});

    var tag_id = "card";
    var previousOrientation = 0;
    var game = document.getElementById('game-dom');
    Paprika.onTagUpdate(function(objects) {
        var endTime = new Date();
        stats.detectionTime = (endTime.getTime() - detectionTime.getTime())
        detectionTime = endTime;
        stats.tags = "";
        for (k in objects) stats.tags += k;
        if (tag_id in objects) {
            var transformation = new THREE.Matrix4();
            transformation.set.apply(transformation, objects[tag_id ]);

            var t = new THREE.Matrix4().multiply(transformation);

            var style = "matrix3d("
                + t.elements[0]  + ", " + t.elements[1]  + ", " +  t.elements[2]  + ", " + t.elements[3]  + ", " 
                + t.elements[4]  + ", " + t.elements[5]  + ", " +  t.elements[6]  + ", " + t.elements[7]  + ", " 
                + t.elements[8]  + ", " + t.elements[9]  + ", " +  t.elements[10] + ", " + t.elements[11] + ", " 
                + t.elements[12] + ", " + t.elements[13] + ", " +  t.elements[14] + ", " + t.elements[15] + ")";

            game.style['transform'] = style;
            game.style['webkit-transform'] = style;

            var eulerX = new THREE.Euler().setFromRotationMatrix(transformation);
            eulerX.reorder('XYZ');
            var eulerY = new THREE.Euler().setFromRotationMatrix(transformation);
            eulerY.reorder('YXZ');
            var TILTED_THRESHOLD = .5;
                 if (eulerX.x < -TILTED_THRESHOLD) orientation = 0;
            else if (eulerX.x >  TILTED_THRESHOLD) orientation = 2;
            else if (eulerY.y >  TILTED_THRESHOLD) orientation = 1;
            else if (eulerY.y < -TILTED_THRESHOLD) orientation = 3;
            else                                   orientation = -1;

            //console.log(orientation+"+"+previousOrientation);
            if (previousOrientation == -1 || orientation == -1) {
                previousOrientation = orientation;
                if (orientation != -1) {
                    //console.log(orientation)
                    self.emit("move", orientation);
                    stats.nTilts++;
                }
            }
        }
    });
};

KeyboardInputManager.prototype.restart = function (event) {
  event.preventDefault();
  this.emit("restart");
};

KeyboardInputManager.prototype.keepPlaying = function (event) {
  event.preventDefault();
  this.emit("keepPlaying");
};

KeyboardInputManager.prototype.bindButtonPress = function (selector, fn) {
  var button = document.querySelector(selector);
  button.addEventListener("click", fn.bind(this));
  button.addEventListener(this.eventTouchend, fn.bind(this));
};
