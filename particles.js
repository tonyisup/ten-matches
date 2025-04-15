class AshParticle {
  constructor(x, y) {
    this.pos = createVector(x, y);
    this.vel = createVector(random(-0.4, 0.4), random(-0.8, -0.2));
    this.acc = createVector(0, -0.01);
    this.lifespan = 255;
    this.size = random(1.5, 3.5);
    this.baseGray = random(30, 60);
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
    noStroke();
    fill(this.baseGray, this.lifespan);
    ellipse(this.pos.x, this.pos.y, this.size);
  }

  isDead() {
    return this.lifespan < 0;
  }
}

class SmokeParticle {
  constructor(x, y) {
    this.pos = createVector(x + random(-5, 5), y + random(-10, 0));
    this.vel = createVector(random(-0.3, 0.3), random(-1.5, -0.8));
    this.acc = createVector(0, -0.02);
    this.lifespan = random(150, 220);
    this.size = random(4, 8);
    this.initialSize = this.size;
    this.gray = random(150, 200);
  }

  applyWind(wind) {
    this.acc.add(p5.Vector.mult(wind, 0.3));
  }

  update() {
    const gravityX = deviceAcceleration.x;
    const gravityY = deviceAcceleration.y;
    const gravityMag = sqrt(gravityX * gravityX + gravityY * gravityY);
    
    if (gravityMag > 0) {
      const gravityDir = createVector(gravityX / gravityMag, -gravityY / gravityMag);
      gravityDir.mult(0);
      this.acc.add(gravityDir);
    }

    this.pos.add(this.vel);
    this.lifespan -= 2.5;
    
    let lifeRatio = this.lifespan / 220;
    this.size = this.initialSize * (1 + (1 - lifeRatio) * 0.5);
    if (lifeRatio < 0.5) {
      this.size *= map(lifeRatio, 0.5, 0, 1, 0.5);
    }

    this.acc.mult(0);
    this.vel.limit(2.5);
  }

  display() {
    noStroke();
    let alpha = map(this.lifespan, 0, 220, 0, 80);
    fill(this.gray, alpha);
    ellipse(this.pos.x, this.pos.y, this.size);
  }

  isDead() {
    return this.lifespan < 0;
  }
} 