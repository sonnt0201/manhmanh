/*
   * Settings
   */

var settings = {
    particles: {
      length: 2000, // maximum amount of particles
      duration: 2, // particle duration in sec
      velocity: 150, // particle velocity in pixels/sec
      effect: -1.3, // play with this for a nice effect
      size: 15, // particle size in pixels
    },
  };
  /*
   * RequestAnimationFrame polyfill by Erik Möller
   */
  // (function(){var b=0;var c=["ms","moz","webkit","o"];for(var a=0;a<c.length&&!window.requestAnimationFrame;++a){window.requestAnimationFrame=window[c[a]+"RequestAnimationFrame"];window.cancelAnimationFrame=window[c[a]+"CancelAnimationFrame"]||window[c[a]+"CancelRequestAnimationFrame"]}if(!window.requestAnimationFrame){window.requestAnimationFrame=function(h,e){var d=new Date().getTime();var f=Math.max(0,16-(d-b));var g=window.setTimeout(function(){h(d+f)},f);b=d+f;return g}}if(!window.cancelAnimationFrame){window.cancelAnimationFrame=function(d){clearTimeout(d)}}}());
  /*
   * Point class
   */
  var Point = (function () {
    function Point(x, y) {
      this.x = (typeof x !== 'undefined') ? x : 0;
      this.y = (typeof y !== 'undefined') ? y : 0;
    }
    Point.prototype.clone = function () {
      return new Point(this.x, this.y);
    };
    Point.prototype.length = function (length) {
      if (typeof length == 'undefined')
        return Math.sqrt(this.x * this.x + this.y * this.y);
      this.normalize();
      this.x *= length;
      this.y *= length;
      return this;
    };
    Point.prototype.normalize = function () {
      var length = this.length();
      this.x /= length;
      this.y /= length;
      return this;
    };
    return Point;
  })();
  /*
   * Particle class
   */
  var Particle = (function () {
    function Particle() {
      this.position = new Point();
      this.velocity = new Point();
      this.acceleration = new Point();
      this.age = 0;
    }
    Particle.prototype.initialize = function (x, y, dx, dy) {
      this.position.x = x;
      this.position.y = y;
      this.velocity.x = dx;
      this.velocity.y = dy;
      this.acceleration.x = dx * settings.particles.effect;
      this.acceleration.y = dy * settings.particles.effect;
      this.age = 0;
    };
    Particle.prototype.update = function (deltaTime) {
      this.position.x += this.velocity.x * deltaTime;
      this.position.y += this.velocity.y * deltaTime;
      this.velocity.x += this.acceleration.x * deltaTime;
      this.velocity.y += this.acceleration.y * deltaTime;
      this.age += deltaTime;
    };
    Particle.prototype.draw = function (context, image) {
      function ease(t) {
        return (--t) * t * t + 1;
      }
      var size = image.width * ease(this.age / settings.particles.duration);
      context.globalAlpha = 1 - this.age / settings.particles.duration;
      context.drawImage(image, this.position.x - size / 2, this.position.y - size / 2, size, size);
    };
    return Particle;
  })();
  /*
   * ParticlePool class
   */
  var ParticlePool = (function () {
    var particles,
      firstActive = 0,
      firstFree = 0,
      duration = settings.particles.duration;

    function ParticlePool(length) {
      // create and populate particle pool
      particles = new Array(length);
      for (var i = 0; i < particles.length; i++)
        particles[i] = new Particle();
    }
    ParticlePool.prototype.add = function (x, y, dx, dy) {
      particles[firstFree].initialize(x, y, dx, dy);

      // handle circular queue
      firstFree++;
      if (firstFree == particles.length) firstFree = 0;
      if (firstActive == firstFree) firstActive++;
      if (firstActive == particles.length) firstActive = 0;
    };
    ParticlePool.prototype.update = function (deltaTime) {
      var i;

      // update active particles
      if (firstActive < firstFree) {
        for (i = firstActive; i < firstFree; i++)
          particles[i].update(deltaTime);
      }
      if (firstFree < firstActive) {
        for (i = firstActive; i < particles.length; i++)
          particles[i].update(deltaTime);
        for (i = 0; i < firstFree; i++)
          particles[i].update(deltaTime);
      }

      // remove inactive particles
      while (particles[firstActive].age >= duration && firstActive != firstFree) {
        firstActive++;
        if (firstActive == particles.length) firstActive = 0;
      }


    };
    ParticlePool.prototype.draw = function (context, image) {
      // draw active particles
      if (firstActive < firstFree) {
        for (i = firstActive; i < firstFree; i++)
          particles[i].draw(context, image);
      }
      if (firstFree < firstActive) {
        for (i = firstActive; i < particles.length; i++)
          particles[i].draw(context, image);
        for (i = 0; i < firstFree; i++)
          particles[i].draw(context, image);
      }
    };
    return ParticlePool;
  })();
  /*
   * Putting it all together
   */
  (function (canvas) {
    var context = canvas.getContext('2d'),
      particles = new ParticlePool(settings.particles.length),
      particleRate = settings.particles.length / settings.particles.duration, // particles/sec
      time;

    // get point on heart with -PI <= t <= PI
    function pointOnHeart(t) {
      return new Point(
        160 * Math.pow(Math.sin(t), 3),
        130 * Math.cos(t) - 50 * Math.cos(2 * t) - 20 * Math.cos(3 * t) - 10 * Math.cos(4 * t) + 25
      );
    }

    // creating the particle image using a dummy canvas
    var image = (function () {
      var canvas = document.createElement('canvas'),
        context = canvas.getContext('2d');
      canvas.width = settings.particles.size;
      canvas.height = settings.particles.size;
      // helper function to create the path
      function to(t) {
        var point = pointOnHeart(t);
        point.x = settings.particles.size / 2 + point.x * settings.particles.size / 350;
        point.y = settings.particles.size / 2 - point.y * settings.particles.size / 350;
        return point;
      }
      // create the path
      context.beginPath();
      var t = -Math.PI;
      var point = to(t);
      context.moveTo(point.x, point.y);
      while (t < Math.PI) {
        t += 0.01; // baby steps!
        point = to(t);
        context.lineTo(point.x, point.y);
      }
      context.closePath();
      // create the fill
      var colors = new Array('#82CD47', '#54B435', '#E0144C', '#ABC9FF', '#CDDEFF', '#FF87B2'); // colours of the hearts

      context.fillStyle = colors[Math.floor(Math.random() * colors.length)];
      context.fill();
      // create the image
      var image = new Image();
      image.src = canvas.toDataURL();
      return image;
    })();

    // render that thing!
    function render() {
      // next animation frame
      requestAnimationFrame(render);

      // update time
      var newTime = new Date().getTime() / 1000,
        deltaTime = newTime - (time || newTime);
      time = newTime;

      // clear canvas
      context.clearRect(0, 0, canvas.width, canvas.height);

      // create new particles
      var amount = particleRate * deltaTime;
      for (var i = 0; i < amount; i++) {
        var pos = pointOnHeart(Math.PI - 2 * Math.PI * Math.random());
        var dir = pos.clone().length(settings.particles.velocity);
        particles.add(canvas.width / 2 + pos.x, canvas.height / 2 - pos.y, dir.x, -dir.y);
      }

      // update and draw particles
      particles.update(deltaTime);
      particles.draw(context, image);
    }

    // handle (re-)sizing of the canvas
    function onResize() {
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
    }
    window.onresize = onResize;

    // delay rendering bootstrap
    setTimeout(function () {
      onResize();
      render();
    }, 10);
  })(document.getElementById('pinkboard'));
  var colours = new Array('#82CD47', '#54B435', '#E0144C', '#ABC9FF', '#CDDEFF', '#FF87B2'); // colours of the hearts

  var minisize = 20; // smallest size of hearts in pixels

  var maxisize = 35; // biggest size of hearts in pixels

  var hearts = 150; // maximum number of hearts on screen

  var over_or_under = "over"; // set to "over" for hearts to always be on top, or "under" to allow them to float behind other objects
  var x = ox = 400;
  var y = oy = 300;
  var swide = 800;
  var shigh = 600;
  var sleft = sdown = 0;
  var herz = new Array();
  var herzx = new Array();
  var herzy = new Array();
  var herzs = new Array();
  var kiss = false;

  if (typeof ('addRVLoadEvent') != 'function') function addRVLoadEvent(funky) {
    var oldonload = window.onload;
    if (typeof (oldonload) != 'function') window.onload = funky;
    else window.onload = function () {
      if (oldonload) oldonload();
      funky();
    }
  }

  addRVLoadEvent(mwah);
  function mwah() {
    if (document.getElementById) {
      var i, heart;
      for (i = 0; i < hearts; i++) {
        heart = createDiv("auto", "auto");
        heart.style.visibility = "hidden";
        heart.style.zIndex = (over_or_under == "over") ? "1001" : "0";
        heart.style.color = colours[i % colours.length];
        heart.style.pointerEvents = "none";
        if (navigator.appName == "Microsoft Internet Explorer") heart.style.filter = "alpha(opacity=75)";
        else heart.style.opacity = 0.45;
        heart.appendChild(document.createTextNode(String.fromCharCode(9829)));
        document.body.appendChild(heart);
        herz[i] = heart;
        herzy[i] = false;
      }
      set_scroll();
      set_width();
      herzle();
    }
  }

  function herzle() {
    var c;

    if (Math.abs(x - ox) > 1 || Math.abs(y - oy) > 1) {
      ox = x;
      oy = y;
      for (c = 0; c < hearts; c++) if (herzy[c] === false) {
        herz[c].firstChild.nodeValue = String.fromCharCode(9829);
        herz[c].style.left = (herzx[c] = x - minisize / 2) + "px";
        herz[c].style.top = (herzy[c] = y - minisize) + "px";
        herz[c].style.fontSize = minisize + "px";
        herz[c].style.fontWeight = 'normal';
        herz[c].style.visibility = 'visible';
        herzs[c] = minisize;
        break;
      }

    }

    for (c = 0; c < hearts; c++) if (herzy[c] !== false) blow_me_a_kiss(c);
    setTimeout("herzle()", 30);

  }


  document.onmousedown = pucker;
  document.onmouseup = function () { clearTimeout(kiss); };
  function pucker() {
    ox = -1;
    oy = -1;
    kiss = setTimeout('pucker()', 100);
  }


  function blow_me_a_kiss(i) {

    herzy[i] -= herzs[i] / minisize + i % 2;

    herzx[i] += (i % 5 - 2) / 5;
    if (herzy[i] < sdown - herzs[i] || herzx[i] < sleft - herzs[i] || herzx[i] > sleft + swide - herzs[i]) {
      herz[i].style.visibility = "hidden";
      herzy[i] = false;
    }

    else if (herzs[i] > minisize + 1 && Math.random() < 2.5 / hearts) break_my_heart(i);

    else {

      if (Math.random() < maxisize / herzy[i] && herzs[i] < maxisize) herz[i].style.fontSize = (++herzs[i]) + "px";

      herz[i].style.top = herzy[i] + "px";

      herz[i].style.left = herzx[i] + "px";

    }

  }


  function break_my_heart(i) {

    var t;

    herz[i].firstChild.nodeValue = String.fromCharCode(9676);

    herz[i].style.fontWeight = 'bold';

    herzy[i] = false;

    for (t = herzs[i]; t <= maxisize; t++) setTimeout('herz[' + i + '].style.fontSize="' + t + 'px"', 60 * (t - herzs[i]));

    setTimeout('herz[' + i + '].style.visibility="hidden";', 60 * (t - herzs[i]));

  }


  document.onmousemove = mouse;

  function mouse(e) {

    if (e) {

      y = e.pageY;

      x = e.pageX;

    }

    else {

      set_scroll();

      y = event.y + sdown;

      x = event.x + sleft;

    }

  }


  window.onresize = set_width;

  function set_width() {

    var sw_min = 999999;

    var sh_min = 999999;

    if (document.documentElement && document.documentElement.clientWidth) {

      if (document.documentElement.clientWidth > 0) sw_min = document.documentElement.clientWidth;

      if (document.documentElement.clientHeight > 0) sh_min = document.documentElement.clientHeight;

    }
    if (typeof (self.innerWidth) == 'number' && self.innerWidth) {

      if (self.innerWidth > 0 && self.innerWidth < sw_min) sw_min = self.innerWidth;

      if (self.innerHeight > 0 && self.innerHeight < sh_min) sh_min = self.innerHeight;

    }

    if (document.body.clientWidth) {

      if (document.body.clientWidth > 0 && document.body.clientWidth < sw_min) sw_min = document.body.clientWidth;

      if (document.body.clientHeight > 0 && document.body.clientHeight < sh_min) sh_min = document.body.clientHeight;

    }
    if (sw_min == 999999 || sh_min == 999999) {

      sw_min = 800;

      sh_min = 600;

    }

    swide = sw_min;

    shigh = sh_min;

  }


  window.onscroll = set_scroll;

  function set_scroll() {

    if (typeof (self.pageYOffset) == 'number') {

      sdown = self.pageYOffset;

      sleft = self.pageXOffset;

    }

    else if (document.body && (document.body.scrollTop || document.body.scrollLeft)) {

      sdown = document.body.scrollTop;

      sleft = document.body.scrollLeft;

    }

    else if (document.documentElement && (document.documentElement.scrollTop || document.documentElement.scrollLeft)) {

      sleft = document.documentElement.scrollLeft;

      sdown = document.documentElement.scrollTop;

    }

    else {
      sdown = 0;
      sleft = 0;
    }

  }
  function createDiv(height, width) {

    var div = document.createElement("div");

    div.style.position = "absolute";

    div.style.height = height;

    div.style.width = width;

    div.style.overflow = "hidden";

    div.style.backgroundColor = "transparent";

    return (div);

  }
  // F12 block
 
      // ]]>