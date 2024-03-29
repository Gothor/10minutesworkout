const activityDuration = 60000;
const pauseDuration = 5000;
let pompes;
let muscu;
let cardio;
let rope;
let pause;
let playButton;
let paused = false;
let pauseSource = null;
let activities;
let order;
let current;
let t, d;
let started;
let nextBip;
let logo;
let shade;
let music;
let timeSize;
let clickToStartSize;
let logoW;
let logoH;
const clickToStart = "Cliquez pour commencer l'entraînement";
let offsetX = 0;
let logoTilt = 0;
let points;
let offsetXQueue = 0;
let Time;
let userInteraction = false;
let activityWidth;

function computeAllSizes() {
  activityWidth = Math.min(width / 2, height / 2, 500);

  offsetXQueue = 0;
  for (let i = 1; i <= current; i++) {
    offsetXQueue -= (order[i-1].w + order[i].w) * activityWidth / 2 + 32 + 10;
  }

  clickToStartSize = 32;
  textSize(clickToStartSize);
  while(textWidth(clickToStart) > width - 20) {
    clickToStartSize--;
    textSize(clickToStartSize);
  }

  timeSize = Math.min(64, (height - activityWidth) / 2 - 20 - 20);

  logoW = logo.width / width;
  logoH = logo.height / (height - (clickToStartSize + 40) * 2);
  if (logoW >= logoH) {
    logoW = Math.min(logo.width, width);
    logoH = logoW * logo.height / logo.width;
  } else {
    logoH = Math.min(logo.height, height - (clickToStartSize + 40) * 2);
    logoW = logoH * logo.width / logo.height;
  }
}

class Activity {

  constructor(name, duration, sound, image, nbFrames) {
    this.name = name;
    this.duration = duration;
    this.remaining = duration;
    this.sound = sound;
    this.image = image;
    this.startedTime = Infinity;
    this.nbFrames = (nbFrames === undefined ? 1 : nbFrames);
    this.w = this.name === "Pause" ? 0.4 : 1;
    this.h = 1;
  }

  start() {
    this.startedTime = Time.current;
    if (this.sound) {
      music.setVolume(0.5);
      this.sound.play();
    }
  }

  update() {
    if (!this.sound.isPlaying()) {
      music.setVolume(1);
    }
    this.remaining -= Time.delta;
  }

  draw() {
    let w = this.w * activityWidth;
    let h = this.h * activityWidth;
    let borderWidth = activityWidth / 50;
    let progress = (Time.current - this.startedTime) / this.duration;
    progress = Math.min(this.progress, 1);

    noStroke();
    fill(255, 150);
    rect(-w / 2, -h / 2, w, h);
    fill(227, 111, 0);
    rect(-w / 2, -h / 2, w * progress, h);

    textSize(28);
    fill(0);
    if (this.image) {
      let t = Time.elapsed / 480;
      let i = Math.floor(t) % this.nbFrames;
      image(this.image, -w / 2, -h / 2, w, h, (this.image.width / this.nbFrames) * i, 0, this.image.width / this.nbFrames, this.image.height);
    } else {
      text(this.name.split(' ').join('\n'), 0, 0);
    }
    
    noFill();
    stroke(255);
    strokeWeight(borderWidth);
    rect(-w / 2 - borderWidth / 2, -h / 2 - borderWidth / 2, w + borderWidth, h + borderWidth, borderWidth * 2);
  }

  isDone() {
    return this.remaining <= 0;
  }

  clone() {
    return new Activity(this.name, this.duration, this.sound, this.image);
  }

  formatRemaining() {
    return (this.remaining / 1000).toFixed(2);
  }

}

Array.prototype.shuffle = function() {
  for (let i = 0; i < this.length; i++) {
    let j = Math.floor(Math.random() * this.length);
    let tmp = this[j];
    this[j] = this[i];
    this[i] = tmp;
  }
}

Array.prototype.alternateWith = function(item) {
  for (let i = this.length - 1; i > 0; i--) {
    this.splice(i, 0, item.clone());
  }
}

Array.prototype.pickRandom = function() {
  return this.splice(Math.floor(Math.random() * this.length), 1)[0];
}

function preload() {
  sounds = {};
  
  pompes = [
    new Activity("Pompes biceps", activityDuration, loadSound("sound/pompesbiceps.wav"), loadImage("img/pompesbiceps.png")),
    new Activity("Pompes triceps", activityDuration, loadSound("sound/pompestriceps.wav"), loadImage("img/pompestriceps.png")),
  ];
  muscu = [
    new Activity("Abdos", activityDuration, loadSound("sound/abdos.wav"), loadImage("img/abdos.png")),
    new Activity("Squats", activityDuration, loadSound("sound/squats.wav"), loadImage("img/squats.png")),
  ];
  cardio = [
    new Activity("Montées de genoux", activityDuration, loadSound("sound/monteesdegenoux.wav"), loadImage("img/monteesdegenoux.png")),
    new Activity("Jumping jacks", activityDuration, loadSound("sound/jumpingjacks.wav"), loadImage("img/jumpingjacks.png"), 2),
    new Activity("Talons-fesses", activityDuration, loadSound("sound/talonsfesses.wav"), loadImage("img/talonsfesses.png")),
  ];
  rope = new Activity("Corde à sauter", activityDuration, loadSound("sound/cordeasauter.wav"), null);
  pause = new Activity("Pause", pauseDuration, loadSound("sound/pause.wav"), loadImage("img/pause.png"));

  logo = loadImage("img/logo.png");
  shade = loadImage("img/shade.png");
  playButton = loadImage("img/playButton.png");
  music = loadSound("sound/Funky_Disco.mp3");
}

function setup() {
  createCanvas(innerWidth, innerHeight);

  let p = [...pompes];
  let m = [...muscu];
  let c = [...cardio];

  order = [];
  order.push(p.pickRandom()); // Pompes
  order.push(c.pickRandom()); // Cardio
  order.push(m.pickRandom()); // Muscu
  order.push(c.pickRandom()); // Cardio
  order.push(m.pickRandom()); // Muscu
  order.push(c.pickRandom()); // Cardio
  order.push(p.pickRandom()); // Pompes
  order.push(rope); // Corde à sauter
  order.alternateWith(pause);

  current = 0;
  started = false;

  computeAllSizes();

  window.addEventListener("blur", () => {
    if (paused) return;

    pauseSource = "blur";
    setPause();
  });
  window.addEventListener("focus", () => {
    if (pauseSource !== "blur") return;

    unsetPause();
  });
}

function togglePause(source) {
  if (!paused) {
    pauseSource = source;
    setPause();
  } else if(pauseSource === source) {
    pauseSource = null;
    unsetPause();
  }
}

function setPause() {
  paused = true;
  checkSound();
}

function unsetPause() {
  paused = false;
  pauseSource = null;
  updateTime();
  checkSound();
}

function checkSound() {
  let isPlaying = music.isPlaying();
  if (!paused && !isPlaying) {
    music.play();
  } else if (paused && isPlaying) {
    music.pause();
  }
}

function mobilecheck() {
  let check = false;
  (function (a) {
    if (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0, 4))) check = true;
  })(navigator.userAgent || navigator.vendor || window.opera);
  return check;
};

if (mobilecheck()) {
  document.addEventListener('touchend', clickHandler);
} else {
  document.addEventListener('mouseup', clickHandler);
}

function createTime() {
  let t = Date.now();
  Time = {
    start: t,
    elapsed: 0,
    current: t,
    delta: 0
  };
}

function updateTime() {
  if (!Time) {
    return createTime();
  }

  let t = Date.now();
  Time.delta = t - Time.current;
  Time.current = t;
  Time.elapsed = Time.current - Time.start;
}

function clickHandler(e) {
  if (e.touches && e.touches.length !== 0) return;

  if (!userInteraction) {
    userInteraction = true;
    return;
  }

  if (!started) {
    started = true;
    nextBip = order[current].duration - 3;
    order[current].start();
  } else if (mouseX >= width - 75 && mouseY < 75) {
    togglePause("pauseButton");
  }
}

function idle() {
  updateTime();
  
  checkSound();

  if (!started || paused) return;

  let activity = order[current];

  if (!activity) return;

  activity.update();
  if (current < order.length && activity.isDone()) {
    last = activity;
    activity = order[++current];
    if (activity) {
      offsetX = (last.w + activity.w) * activityWidth / 2 + 32 + 10;
      offsetXQueue -= offsetX;
      activity.start();
      activity.remaining += last.remaining;
    }
  }
  
  if (d > nextBip) {
    nextBip++;
  }
}

function draw() {
  if (!userInteraction) {
    background(255);

    noStroke();
    fill(31);
    textAlign(CENTER, CENTER);
    textSize(32);
    textStyle(NORMAL);
    text("Please click once", width / 2, height / 2);
    return;
  }

  idle();

  background(1, 177, 226);
    
  push();
  translate(width / 2, height / 2);
  rotate(-PI / 6);
  stroke(255, 100);
  strokeWeight(32);
  let diag = Math.sqrt(width * width + height * height);
  for (let y = 0; y < diag / 100; y++) {
    for (let x = -diag / 2; x < diag / 2; x += 100) {
      point(x + (y % 2 === 0 ? 1 : -1) * 0.2 * frameCount % 100, y * 100 - diag / 2);
    }
  }
  pop();

  // Started
  if (started) {
    offsetX *= 0.7;

    textStyle(NORMAL);
    textAlign(CENTER, CENTER);
    push();
    translate(width / 2 + offsetXQueue + offsetX, height / 2);
    let x = 0;
    for (let i = 0; i < order.length; i++) {
      let activity = order[i];
      push();
      translate(x, 0);
      activity.draw();
      pop();
      if (i + 1 < order.length) {
        x += (order[i].w + order[i + 1].w) * activityWidth / 2 + 32 + 10;
      }
    }
    pop();

    image(shade, 0, 0, width, height);

    textSize(timeSize);
    textStyle(BOLD);
    textAlign(CENTER, BOTTOM);
    if (current < order.length) {
      text(order[current].formatRemaining(), width / 2, height / 2 - order[0].h * activityWidth / 2 - 20);
    } else if (Math.floor(d * 2) % 2) {
      text((0).toFixed(2), width / 2, height / 5);
    }

    if (!paused)
      image(pause.image, width - 53, 0, 30, 75);
    else {
      image(playButton, width - 75, 0, 75, 75);
    }
  // Not started
  } else {
    image(shade, 0, 0, width, height);

    logoTilt = -Math.cos(frameCount / 300 * PI) / 30 - 0.1;
    
    let theScale = Time.elapsed % 500;
    theScale -= 450;
    theScale = Math.abs(theScale);
    if (theScale > 100) theScale = 1;
    else theScale = 1.1 - theScale / 100 * 0.1;

    push();
    translate(width / 2, height / 2);
    rotate(logoTilt);
    scale(theScale, theScale);
    image(logo, -logoW / 2, -logoH / 2, logoW, logoH);
    pop();

    textAlign(CENTER, BOTTOM);
    textSize(clickToStartSize);
    fill(255);
    text(clickToStart, width / 2, height - 20);
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  computeAllSizes();
}

function keyPressed() {
  if(!started) return;

  if (keyCode === 32) {
    togglePause("pauseButton");
  }
}