class MatchAnimation {
  constructor(canvasId, state, p) {
    this.canvasId = canvasId;
    this.state = state; // 'burned', 'burning', or 'unburned'
    this.p = p; // p5 instance
    this.img = null;
    this.matchTips = [];
    this.startTime = 0;
    this.GROWTH_DURATION_factor = 1; //pretty much unused
    this.MATCH_WIDTH = 5;
    this.SPARK_DURATION = 0.5;
    this.WIND_RADIUS = 150;
    this.WIND_STRENGTH = 10;
    this.ACCELEROMETER_SENSITIVITY = 0.5;
    this.FLICKER_DURATION = 1.0;

    // Track mouse movement for wind direction
    this.mouseVelocity = { x: 0, y: 0 };
    this.lastMousePos = { x: 0, y: 0 };
    this.deviceAcceleration = { x: 0, y: 0 };
    this.flickerStartTime = 0;
    this.isFlickering = false;
    this.lastOrientation = screen.orientation?.angle || 0;

    // Particle systems
    this.ashParticles = [];
    this.smokeParticles = [];
    this.sparks = [];
    this.charredMatches = [];

    this.startPoints = [
      // Left Group
      { x: 20, y: 60 },
      { x: 35, y: 60 },
      { x: 49, y: 60 },
      { x: 64, y: 60 },
      { x: 80, y: 50 },

      // Right Group
      { x: 140, y: 60 },
      { x: 155, y: 60 },
      { x: 169, y: 60 },
      { x: 184, y: 60 },
      { x: 200, y: 50 },
    ];

    this.flameEndPoints = [
      // Left Group
      { x: 20, y: 10 },
      { x: 35, y: 10 },
      { x: 49, y: 10 },
      { x: 64, y: 10 },
      { x: 10, y: 20 },

      // Right Group
      { x: 140, y: 10 },
      { x: 155, y: 10 },
      { x: 169, y: 10 },
      { x: 184, y: 10 },
      { x: 130, y: 20 },
    ];
  }

  preload() {
    this.img = this.p.loadImage('tally_marks.png');
  }

  setup() {
    const canvas = this.p.createCanvas(this.img.width, this.img.height);
    canvas.parent(this.canvasId);
    this.matchTips = this.startPoints;
    this.charredMatches = new Array(this.matchTips.length).fill(this.state === 'burned' ? 1 : 0);
    this.p.noStroke();
    this.startTime = this.p.millis();
    this.lastMousePos = { x: this.p.mouseX, y: this.p.mouseY };

    if (this.state === 'burning') {
      // Request permission for device motion
      if (typeof DeviceMotionEvent.requestPermission === 'function') {
        DeviceMotionEvent.requestPermission()
          .then(permissionState => {
            if (permissionState === 'granted') {
              window.addEventListener('devicemotion', this.handleDeviceMotion.bind(this));
              window.addEventListener('deviceorientation', this.handleDeviceOrientation.bind(this));
            }
          })
          .catch(console.error);
      } else {
        window.addEventListener('devicemotion', this.handleDeviceMotion.bind(this));
        window.addEventListener('deviceorientation', this.handleDeviceOrientation.bind(this));
      }
    }
  }

  handleDeviceMotion(event) {
    this.deviceAcceleration.x = event.accelerationIncludingGravity.x * this.ACCELEROMETER_SENSITIVITY;
    this.deviceAcceleration.y = event.accelerationIncludingGravity.y * this.ACCELEROMETER_SENSITIVITY;
  }

  handleDeviceOrientation(event) {
    const currentOrientation = screen.orientation?.angle || 0;
    if (currentOrientation !== this.lastOrientation) {
      this.flickerStartTime = this.p.millis();
      this.isFlickering = true;
      this.lastOrientation = currentOrientation;
    }
  }

  getCurrentDayProgress() {
    const targetDate = new Date('2025-05-05');
    const now = new Date();
    const timeDiff = targetDate - now;
    const daysLeft = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
    
    // Calculate which match should be burning based on canvas ID and days left
    let matchIndex;
    if (this.canvasId === 'canvas1') {
      // Days 20-11 (10 matches)
      matchIndex = Math.max(0, Math.min(9, 20 - daysLeft));
    } else if (this.canvasId === 'canvas2') {
      // Days 10-1 (10 matches)
      matchIndex = Math.max(0, Math.min(9, 10 - daysLeft));
    } else {
      // Days 0-9 (10 matches)
      matchIndex = Math.max(0, Math.min(9, daysLeft));
    }
    
    // Calculate progress within the current day
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();
    const dayProgress = (hours * 3600 + minutes * 60 + seconds) / (24 * 3600);
    
    return {
      matchIndex,
      dayProgress
    };
  }

  draw() {
    this.p.image(this.img, 0, 0);

    if (this.state === 'burned') {
      // Draw all matches as fully charred
      for (let i = 0; i < this.matchTips.length; i++) {
        this.drawCharredMatch(this.startPoints[i], this.flameEndPoints[i], 1, i, this.flameEndPoints[i].x, this.flameEndPoints[i].y);
      }
    } else if (this.state === 'burning') {
      const { matchIndex, dayProgress } = this.getCurrentDayProgress();
      const matchProgress = dayProgress;

      for (let i = 0; i < this.matchTips.length; i++) {
        if (i < matchIndex) {
          this.drawCharredMatch(this.startPoints[i], this.flameEndPoints[i], 1, i, this.flameEndPoints[i].x, this.flameEndPoints[i].y);
        } else if (i === matchIndex) {
          const currentBaseX = this.p.lerp(this.startPoints[i].x, this.flameEndPoints[i].x, matchProgress);
          const currentBaseY = this.p.lerp(this.startPoints[i].y, this.flameEndPoints[i].y, matchProgress);
          
          this.drawCharredMatch(this.startPoints[i], this.flameEndPoints[i], matchProgress, i, currentBaseX, currentBaseY);
          
          if (matchProgress > 0) {
            const flameTipPos = this.drawFlame(currentBaseX, currentBaseY, i, matchProgress * this.GROWTH_DURATION_factor);
            
            if (this.p.random() < 0.15) {
              this.ashParticles.push(new AshParticle(currentBaseX + this.p.random(-this.MATCH_WIDTH / 2, this.MATCH_WIDTH / 2), currentBaseY + 5, this.p));
            }
            if (this.p.random() < 0.4) {
              this.smokeParticles.push(new SmokeParticle(flameTipPos.x, flameTipPos.y, this.p, this.deviceAcceleration));
            }
          }
        } else {
          //do nothing
        }
      }

      this.updateParticles();
    } else if (this.state === 'unburned') {
      //do nothing
    }
  }

  updateParticles() {
    // Update and draw ash particles
    for (let i = this.ashParticles.length - 1; i >= 0; i--) {
      this.ashParticles[i].update();
      this.ashParticles[i].display();
      if (this.ashParticles[i].isDead()) {
        this.ashParticles.splice(i, 1);
      }
    }

    // Update and draw smoke particles
    for (let i = this.smokeParticles.length - 1; i >= 0; i--) {
      this.smokeParticles[i].update();
      this.smokeParticles[i].display();
      if (this.smokeParticles[i].isDead()) {
        this.smokeParticles.splice(i, 1);
      }
    }
  }

  drawCharredMatch(startPoint, endPoint, progress, index, currentFlameX, currentFlameY) {
    this.p.push();

    const charEndX = this.p.lerp(startPoint.x, endPoint.x, progress);
    const charEndY = this.p.lerp(startPoint.y, endPoint.y, progress);

    const noiseOffset = index * 1000 + this.p.frameCount * 0.015;
    const wiggle = (this.p.noise(noiseOffset) - 0.5) * 2.5;

    this.p.strokeWeight(this.MATCH_WIDTH);
    this.p.stroke(30, 30, 30, 220);
    this.p.line(startPoint.x + wiggle, startPoint.y, charEndX + wiggle, charEndY);

    this.p.noStroke();
    const numFlecks = 5 * progress;
    for (let j = 0; j < numFlecks; j++) {
      const t = this.p.random(0, progress);
      const x = this.p.lerp(startPoint.x, endPoint.x, t) + wiggle + this.p.random(-1, 1);
      const y = this.p.lerp(startPoint.y, endPoint.y, t) + this.p.random(-1, 1);
      const size = this.p.random(1, this.MATCH_WIDTH * 0.8);
      this.p.fill(15 + this.p.random(15), 15 + this.p.random(15), 15 + this.p.random(15), this.p.random(100, 200));
      this.p.ellipse(x, y, size);
    }

    const isCurrentMatch = this.p.floor(((this.p.millis() - this.startTime) / 1000) / this.GROWTH_DURATION_factor) === index;
    if (progress > 0.01 && progress < 1 && isCurrentMatch) {
      const glowSize = this.MATCH_WIDTH * 1.8;
      const glowAlpha = this.p.map(this.p.sin(this.p.frameCount * 0.1 + index * 5), -1, 1, 30, 80);
      this.p.fill(255, 100, 0, glowAlpha);
      this.p.ellipse(currentFlameX + wiggle, currentFlameY, glowSize, glowSize);
    }

    this.p.pop();
  }

  drawFlame(x, y, index, elapsedSeconds, opacity = 1) {
    this.p.push();
    this.p.translate(x, y);

    const progress = this.p.min(1, elapsedSeconds / this.GROWTH_DURATION_factor);
    const growthFactor = this.p.pow(progress, 0.5);

    let flickerOpacity = 1;
    if (this.isFlickering) {
      const flickerElapsed = (this.p.millis() - this.flickerStartTime) / 1000;
      if (flickerElapsed >= this.FLICKER_DURATION) {
        this.isFlickering = false;
      } else {
        flickerOpacity = 0.7 + 0.3 * this.p.noise(this.p.frameCount * 0.1 + index);
      }
    }

    let baseWidth = 4 + 8 * growthFactor;
    let baseHeight = 15 + 30 * growthFactor;

    let timeNoise = this.p.frameCount * 0.08 + index * 10;
    let shapeNoiseSeed = index * 500;

    let avgFlameWorldX = x;
    let avgFlameWorldY = y - baseHeight / 2;
    const wind = this.getWindInfluence(avgFlameWorldX, avgFlameWorldY);

    // Heat Haze
    const hazeSegments = 5;
    const hazeMaxOffset = 5 + 10 * growthFactor;
    const hazeHeight = baseHeight * 1.2;
    this.p.noFill();
    this.p.strokeWeight(1.5);
    for (let i = 0; i < 3; i++) {
      let hazeNoise = timeNoise * 0.5 + i * 100 + shapeNoiseSeed + 50;
      let hazeAlpha = this.p.map(growthFactor, 0, 1, 0, 30) * opacity * (1 - i * 0.2);
      let currentWindEffect = this.p.createVector(wind.x, wind.y).mult(0.5 + i * 0.2);

      this.p.stroke(200, 200, 255, hazeAlpha);
      this.p.beginShape();
      this.p.curveVertex(currentWindEffect.x, 0);
      this.p.curveVertex(currentWindEffect.x, 0);

      for (let j = 0; j <= hazeSegments; j++) {
        let t = j / hazeSegments;
        let noiseX = (this.p.noise(hazeNoise + j * 0.5) - 0.5) * hazeMaxOffset * t;
        let noiseY = (this.p.noise(hazeNoise + j * 0.5 + 10) - 0.5) * 5 * t;
        let windX = currentWindEffect.x * t * 1.5;
        let windY = currentWindEffect.y * t;

        this.p.curveVertex(noiseX + windX, -hazeHeight * t + noiseY + windY);
      }
      this.p.curveVertex(currentWindEffect.x * 1.5, -hazeHeight + currentWindEffect.y);
      this.p.curveVertex(currentWindEffect.x * 1.5, -hazeHeight + currentWindEffect.y);
      this.p.endShape();
    }

    // Flame Body
    const segments = 20;
    this.p.noStroke();

    const outerColor = this.p.color(255, 100 + this.p.noise(timeNoise + 10) * 120, 0, 180 * opacity * flickerOpacity);
    const midColor = this.p.color(255, 200 + this.p.noise(timeNoise + 20) * 55, 50, 210 * opacity * flickerOpacity);
    const innerColor = this.p.color(255, 255, 200 + this.p.noise(timeNoise + 30) * 55, 240 * opacity * flickerOpacity);

    this.drawFlameLayer(segments, baseHeight, baseWidth, timeNoise, shapeNoiseSeed, wind, outerColor, 1.0);
    this.drawFlameLayer(segments, baseHeight * 0.85, baseWidth * 0.7, timeNoise, shapeNoiseSeed + 100, wind, midColor, 0.8);
    this.drawFlameLayer(segments, baseHeight * 0.5, baseWidth * 0.4, timeNoise, shapeNoiseSeed + 200, wind, innerColor, 0.5);

    this.p.pop();

    let tipNoiseX = (this.p.noise(timeNoise + segments * 0.3 + 300) - 0.5) * baseWidth * 0.8;
    let tipWindX = wind.x * 1.5;
    let tipWindY = wind.y;
    return { x: x + tipNoiseX + tipWindX, y: y - baseHeight + tipWindY };
  }

  drawFlameLayer(segments, height, width, timeNoise, shapeNoiseSeed, wind, fillColor, widthScaleFactor = 1.0) {
    this.p.fill(fillColor);
    this.p.beginShape();

    let points = [];
    for (let i = 0; i <= segments; i++) {
      let t = i / segments;
      let currentBaseWidth = width * (1 - this.p.pow(t, 0.8)) * widthScaleFactor * ((i + 1) * 1/this.p.sqrt(i + 1));
      let noiseX = (this.p.noise(timeNoise + i * 0.3 + shapeNoiseSeed) - 0.5) * currentBaseWidth * 0.4 * (1 + t);
      let noiseY = (this.p.noise(timeNoise * 1.1 + i * 0.3 + shapeNoiseSeed + 50) - 0.5) * 5 * t;
      let windEffectX = wind.x * this.p.pow(t, 1.2) * 1.5;
      let windEffectY = wind.y * this.p.pow(t, 1.0);

      points.push({
        x: noiseX + windEffectX,
        y: -height * t + noiseY + windEffectY,
        w: currentBaseWidth
      });
    }

    const controlPointOffset = 3;

    this.p.curveVertex(points[0].x, points[0].y + controlPointOffset);
    this.p.curveVertex(points[0].x - points[0].w / 2, points[0].y);
    this.p.curveVertex(points[0].x + points[0].w / 2, points[0].y);

    for (let i = 1; i <= segments; i++) {
      this.p.curveVertex(points[i].x + points[i].w / 2, points[i].y);
    }

    this.p.curveVertex(points[segments].x, points[segments].y);
    this.p.curveVertex(points[segments].x, points[segments].y);

    this.p.curveVertex(points[segments].x, points[segments].y);
    for (let i = segments; i >= 1; i--) {
      this.p.curveVertex(points[i].x - points[i].w / 2, points[i].y);
    }

    this.p.curveVertex(points[0].x - points[0].w / 2, points[0].y);
    this.p.curveVertex(points[0].x, points[0].y + controlPointOffset);

    this.p.endShape();

    this.p.fill(fillColor);
    this.p.ellipse(points[0].x, points[0].y, points[0].w * 0.8, 5);
  }

  getWindInfluence(x, y) {
    let combinedWind = this.p.createVector(0, 0);
    
    const mouseDist = this.p.dist(x, y, this.p.mouseX, this.p.mouseY);
    if (mouseDist <= this.WIND_RADIUS && (this.mouseVelocity.x !== 0 || this.mouseVelocity.y !== 0)) {
      const strength = this.p.map(mouseDist, 0, this.WIND_RADIUS, this.WIND_STRENGTH, 0);
      let mouseWind = this.p.createVector(this.mouseVelocity.x, this.mouseVelocity.y);
      mouseWind.normalize();
      mouseWind.mult(strength);
      combinedWind.add(mouseWind);
    }
    
    let deviceWind = this.p.createVector(this.deviceAcceleration.x, this.deviceAcceleration.y);
    deviceWind.mult(this.WIND_STRENGTH);
    combinedWind.add(deviceWind);
    
    if (combinedWind.mag() > this.WIND_STRENGTH) {
      combinedWind.normalize();
      combinedWind.mult(this.WIND_STRENGTH);
    }
    
    return combinedWind;
  }
} 