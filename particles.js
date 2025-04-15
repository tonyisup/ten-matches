class AshParticle {
  constructor(x, y, p) {
    this.p = p;
    this.pos = p.createVector(x, y);
    this.vel = p.createVector(p.random(-0.4, 0.4), p.random(-0.8, -0.2));
    this.acc = p.createVector(0, -0.01);
    this.lifespan = 255;
    this.size = p.random(1.5, 3.5);
    this.baseGray = p.random(30, 60);
  }

  applyWind(wind) {
    this.acc.add(p5.Vector.mult(wind, 0.5));
  }

  update() {
    this.vel.add(this.acc);
    this.pos.add(this.vel);
    this.lifespan -= 1.5;
    this.acc.mult(0);
    this.vel.limit(1.5);
  }

  display() {
    this.p.noStroke();
    this.p.fill(this.baseGray, this.lifespan);
    this.p.ellipse(this.pos.x, this.pos.y, this.size);
  }

  isDead() {
    return this.lifespan < 0;
  }
}

class SmokeParticle {
  constructor(x, y, p, deviceAcceleration) {
    this.p = p;
    this.deviceAcceleration = deviceAcceleration;
    this.pos = p.createVector(x + p.random(-5, 5), y + p.random(-10, 0));
    this.vel = p.createVector(p.random(-0.3, 0.3), p.random(-1.5, -0.8));
    this.acc = p.createVector(0, -0.02);
    this.lifespan = p.random(150, 220);
    this.size = p.random(4, 8);
    this.initialSize = this.size;
    this.gray = p.random(150, 200);
  }

  applyWind(wind) {
    this.acc.add(p5.Vector.mult(wind, 0.3));
  }

  update() {
    const gravityX = this.deviceAcceleration.x;
    const gravityY = this.deviceAcceleration.y;
    const gravityMag = this.p.sqrt(gravityX * gravityX + gravityY * gravityY);
    
    if (gravityMag > 0) {
      const gravityDir = this.p.createVector(gravityX / gravityMag, -gravityY / gravityMag);
      gravityDir.mult(0);
      this.acc.add(gravityDir);
    }

    this.pos.add(this.vel);
    this.lifespan -= 2.5;
    
    let lifeRatio = this.lifespan / 220;
    this.size = this.initialSize * (1 + (1 - lifeRatio) * 0.5);
    if (lifeRatio < 0.5) {
      this.size *= this.p.map(lifeRatio, 0.5, 0, 1, 0.5);
    }

    this.acc.mult(0);
    this.vel.limit(2.5);
  }

  display() {
    this.p.noStroke();
    let alpha = this.p.map(this.lifespan, 0, 220, 0, 80);
    this.p.fill(this.gray, alpha);
    this.p.ellipse(this.pos.x, this.pos.y, this.size);
  }

  isDead() {
    return this.lifespan < 0;
  }
}

class Spark {
  constructor(x, y, index, p) {
    this.p = p;
    this.pos = p.createVector(x, y);
    this.vel = p.createVector(p.random(-2.5, 2.5), p.random(-5, -2));
    this.acc = p.createVector(0, 0);
    this.lifespan = 255;
    this.size = p.random(1, 3.5);
    this.brightness = p.random(200, 255);
  }

  applyWind(wind) {
    this.acc.add(p5.Vector.mult(wind, 0.5));
  }

  update() {
    this.pos.add(this.vel);
    this.lifespan -= 10;
    this.acc.mult(0);
  }

  display() {
    this.p.noStroke();
    let G = this.p.map(this.lifespan, 255, 0, this.brightness, 150);
    this.p.fill(255, G, 0, this.lifespan);
    this.p.ellipse(this.pos.x, this.pos.y, this.size);
  }

  isDead() {
    return this.lifespan < 0;
  }
} 