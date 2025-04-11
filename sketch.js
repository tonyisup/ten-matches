let img;
let matchTips = []; // Array to hold the coordinates of the match tips
let startTime; // Track when the animation started
const GROWTH_DURATION = 10; // Duration in seconds for flames to reach max size
const MATCH_WIDTH = 5; // Width of the matchstick in pixels
const SPARK_DURATION = 0.5; // Duration of spark effect in seconds
const WIND_RADIUS = 150; // Radius of wind influence
const WIND_STRENGTH = 10; // Maximum wind strength (increased slightly)
const ACCELEROMETER_SENSITIVITY = 0.5; // Adjust this to control how sensitive the wind is to device movement
const FLICKER_DURATION = 1.0; // Duration of flicker effect in seconds

// Track mouse movement for wind direction
let mouseVelocity = { x: 0, y: 0 };
let lastMousePos = { x: 0, y: 0 };
let deviceAcceleration = { x: 0, y: 0 }; // Track device acceleration
let flickerStartTime = 0; // Track when flicker effect started
let isFlickering = false; // Track if we're currently flickering
let lastOrientation = screen.orientation?.angle || 0; // Track last device orientation

// Particle systems
let ashParticles = [];
let smokeParticles = []; // New system for smoke
let sparks = []; // Track active sparks
let charredMatches = []; // Track which matches have been charred and their progress

// --- IMPORTANT: Adjust these coordinates! ---
// Use the mouseX, mouseY coordinates displayed by p5.js (or an image editor)
// to find the precise tip locations in YOUR image file.

const startPoints = [
  // Left Group (Approximate)
  { x: 253, y: 360 },
  { x: 268, y: 360 },
  { x: 282, y: 360 },
  { x: 297, y: 360 },
  { x: 313, y: 350 }, // Diagonal one - slightly higher

  // Right Group (Approximate)
  { x: 373, y: 360 },
  { x: 388, y: 360 },
  { x: 402, y: 360 },
  { x: 417, y: 360 },
  { x: 433, y: 350 }, // Diagonal one - slightly higher
];

// Define end points for each flame (47 pixels above start)
const flameEndPoints = [
  // Left Group (Approximate)
  { x: 253, y: 320 },
  { x: 268, y: 320 },
  { x: 282, y: 320 },
  { x: 297, y: 320 },
  { x: 243, y: 320 }, // Diagonal one - slightly higher

  // Right Group (Approximate)
  { x: 373, y: 320 },
  { x: 388, y: 320 },
  { x: 402, y: 320 },
  { x: 417, y: 320 },
  { x: 360, y: 320 }, // Diagonal one - slightly higher
];
// --- End of Coordinate Adjustment Section ---


class AshParticle {
  constructor(x, y) {
    this.pos = createVector(x, y);
    this.vel = createVector(random(-0.4, 0.4), random(-0.8, -0.2)); // Slower rise
    this.acc = createVector(0, -0.01); // Gentle upward lift initially
    this.lifespan = 255;
    this.size = random(1.5, 3.5);
    this.baseGray = random(30, 60);
  }

  applyWind(wind) {
    this.acc.add(p5.Vector.mult(wind, 0.5)); // Wind affects acceleration
  }

  update() {
    this.vel.add(this.acc);
    this.pos.add(this.vel);
    this.lifespan -= 1.5; // Fade slower
    this.acc.mult(0); // Reset acceleration each frame before applying wind
    this.vel.limit(1.5); // Limit speed
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

// New Smoke Particle class
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
    // Get gravity direction from accelerometer
    const gravityX = deviceAcceleration.x;
    const gravityY = deviceAcceleration.y;
    const gravityMag = sqrt(gravityX * gravityX + gravityY * gravityY);
    
    if (gravityMag > 0) {
      // Normalize gravity vector and scale it for smoke movement
      // Invert the direction to make smoke rise against gravity
      const gravityDir = createVector(gravityX / gravityMag, gravityY / gravityMag);
      gravityDir.mult(0.2); // Adjust this value to control smoke rise speed
      this.acc.add(gravityDir);
    }

    this.vel.add(this.acc);
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
    // More transparent as it fades
    let alpha = map(this.lifespan, 0, 220, 0, 80); // Max alpha is lower for smoke
    fill(this.gray, alpha);
    ellipse(this.pos.x, this.pos.y, this.size);
  }

  isDead() {
    return this.lifespan < 0;
  }
}


class Spark {
  constructor(x, y, index) {
    this.pos = createVector(x, y);
    this.vel = createVector(random(-2.5, 2.5), random(-5, -2)); // More energetic
    this.acc = createVector(0, 0.15); // Slightly stronger gravity
    this.lifespan = 255;
    this.size = random(1, 3.5);
    this.brightness = random(200, 255);
  }

  applyWind(wind) {
    this.acc.add(p5.Vector.mult(wind, 0.5)); // Sparks affected by wind
  }

  update() {
    this.vel.add(this.acc);
    this.pos.add(this.vel);
    this.lifespan -= 10; // Fade slightly faster
    this.acc.mult(0); // Reset acceleration
    this.acc.add(0, 0.15); // Re-apply gravity
  }

  display() {
    noStroke();
    // Brighter, maybe slightly orange shift as it fades
    let G = map(this.lifespan, 255, 0, this.brightness, 150);
    fill(255, G, 0, this.lifespan);
    ellipse(this.pos.x, this.pos.y, this.size);
  }

  isDead() {
    return this.lifespan < 0;
  }
}

function preload() {
  img = loadImage('tally_marks.png'); // Make sure this path is correct!
}

function setup() {
  createCanvas(img.width, img.height);
  matchTips = startPoints;
  charredMatches = new Array(matchTips.length).fill(0);
  noStroke();
  startTime = millis();
  lastMousePos = { x: mouseX, y: mouseY };
  
  // Request permission for device motion
  if (typeof DeviceMotionEvent.requestPermission === 'function') {
    DeviceMotionEvent.requestPermission()
      .then(permissionState => {
        if (permissionState === 'granted') {
          window.addEventListener('devicemotion', handleDeviceMotion);
          window.addEventListener('deviceorientation', handleDeviceOrientation);
        }
      })
      .catch(console.error);
  } else {
    // Handle regular non-iOS 13+ devices
    window.addEventListener('devicemotion', handleDeviceMotion);
    window.addEventListener('deviceorientation', handleDeviceOrientation);
  }
}

function handleDeviceMotion(event) {
  // Update device acceleration with sensitivity adjustment
  deviceAcceleration.x = event.accelerationIncludingGravity.x * ACCELEROMETER_SENSITIVITY;
  deviceAcceleration.y = event.accelerationIncludingGravity.y * ACCELEROMETER_SENSITIVITY;
}

function handleDeviceOrientation(event) {
  const currentOrientation = screen.orientation?.angle || 0;
  if (currentOrientation !== lastOrientation) {
    // Orientation changed, start flicker effect
    flickerStartTime = millis();
    isFlickering = true;
    lastOrientation = currentOrientation;
  }
}

function draw() {
  // Update mouse velocity
  const currentMousePos = { x: mouseX, y: mouseY };
  mouseVelocity = {
    x: (currentMousePos.x - lastMousePos.x) * 0.1,
    y: (currentMousePos.y - lastMousePos.y) * 0.1
  };
  lastMousePos = currentMousePos;

  // Draw background
  image(img, 0, 0);

  const totalElapsedSeconds = (millis() - startTime) / 1000;
  const totalSequenceDuration = GROWTH_DURATION * matchTips.length;

  // --- Reset Logic ---
  if (totalElapsedSeconds >= totalSequenceDuration) {
    startTime = millis();
    ashParticles = [];
    smokeParticles = [];
    charredMatches = new Array(matchTips.length).fill(0);
    sparks = [];
  }

  // --- Update and Display Particles ---
  // Sparks
  for (let i = sparks.length - 1; i >= 0; i--) {
    const wind = getWindInfluence(sparks[i].pos.x, sparks[i].pos.y);
    sparks[i].applyWind(wind);
    sparks[i].update();
    sparks[i].display();
    if (sparks[i].isDead()) {
      sparks.splice(i, 1);
    }
  }

  // Ash
  for (let i = ashParticles.length - 1; i >= 0; i--) {
    const wind = getWindInfluence(ashParticles[i].pos.x, ashParticles[i].pos.y);
    ashParticles[i].applyWind(wind);
    ashParticles[i].update();
    ashParticles[i].display();
    if (ashParticles[i].isDead()) {
      ashParticles.splice(i, 1);
    }
  }

  // Smoke
  for (let i = smokeParticles.length - 1; i >= 0; i--) {
    const wind = getWindInfluence(smokeParticles[i].pos.x, smokeParticles[i].pos.y);
    smokeParticles[i].applyWind(wind);
    smokeParticles[i].update();
    smokeParticles[i].display();
    if (smokeParticles[i].isDead()) {
      smokeParticles.splice(i, 1);
    }
  }


  // --- Draw Matches and Flames ---
  for (let i = 0; i < matchTips.length; i++) {
    const matchStartTime = i * GROWTH_DURATION;
    const matchElapsedSeconds = max(0, totalElapsedSeconds - matchStartTime);
    const progress = min(1, matchElapsedSeconds / GROWTH_DURATION);

    // Calculate current flame base position (moves from start to end point)
    const currentBaseX = lerp(startPoints[i].x, flameEndPoints[i].x, progress);
    const currentBaseY = lerp(startPoints[i].y, flameEndPoints[i].y, progress);

    // Draw charred match first (so flame is on top)
    if (progress > 0) {
      drawCharredMatch(startPoints[i], flameEndPoints[i], progress, i, currentBaseX, currentBaseY);
    }

    // Only animate the flame for the *current* match
    const isCurrentMatch = floor(totalElapsedSeconds / GROWTH_DURATION) === i;
    if (isCurrentMatch && matchElapsedSeconds < GROWTH_DURATION) {

      // Create sparks at the start
      if (matchElapsedSeconds < SPARK_DURATION) {
        if (random() < 0.6) { // Slightly more sparks
          sparks.push(new Spark(currentBaseX, currentBaseY, i));
        }
      }

      // Draw the main flame
      const flameOpacity = matchElapsedSeconds < SPARK_DURATION ?
        map(matchElapsedSeconds, 0, SPARK_DURATION, 0.2, 1) : 1; // Start slightly visible

      // Add flicker effect if rotating
      let flickerOpacity = 1;
      if (isFlickering) {
        const flickerElapsed = (millis() - flickerStartTime) / 1000;
        if (flickerElapsed >= FLICKER_DURATION) {
          isFlickering = false;
        } else {
          // Create a random flicker pattern during rotation
          flickerOpacity = 0.7 + 0.3 * noise(frameCount * 0.1 + i);
        }
      }

      const flameTipPos = drawFlame(currentBaseX, currentBaseY, i, matchElapsedSeconds, flameOpacity * flickerOpacity); // Pass current base

      // Update charred progress (now handled by overall progress)
      charredMatches[i] = progress;

      // Spawn particles (only after spark phase for ash/smoke)
      if (matchElapsedSeconds >= SPARK_DURATION) {
        // Spawn Ash
        if (random() < 0.15) { // Reduced rate
          ashParticles.push(new AshParticle(currentBaseX + random(-MATCH_WIDTH / 2, MATCH_WIDTH / 2), currentBaseY + 5)); // Spawn near the base
        }
        // Spawn Smoke
        if (random() < 0.4) { // More smoke than ash
          smokeParticles.push(new SmokeParticle(flameTipPos.x, flameTipPos.y)); // Spawn near the tip
        }
      }
    }
  }

  // Optional: Display mouse coordinates
  // fill(255); textSize(12); text(`X: ${mouseX} Y: ${mouseY}`, 10, 20);
}


function drawCharredMatch(startPoint, endPoint, progress, index, currentFlameX, currentFlameY) {
  push();

  // Calculate the end position of the charred section based on progress
  const charEndX = lerp(startPoint.x, endPoint.x, progress);
  const charEndY = lerp(startPoint.y, endPoint.y, progress);

  // Add subtle wiggle based on noise
  const noiseOffset = index * 1000 + frameCount * 0.015; // Slower wiggle
  const wiggle = (noise(noiseOffset) - 0.5) * 2.5;

  // Draw main charred line
  strokeWeight(MATCH_WIDTH);
  stroke(30, 30, 30, 220); // Slightly darker, more opaque
  line(startPoint.x + wiggle, startPoint.y, charEndX + wiggle, charEndY);

  // Add textured flecks
  noStroke();
  const numFlecks = 5 * progress; // More flecks as it burns
  for (let j = 0; j < numFlecks; j++) {
    const t = random(0, progress); // Place flecks along the *charred* length
    const x = lerp(startPoint.x, endPoint.x, t) + wiggle + random(-1, 1);
    const y = lerp(startPoint.y, endPoint.y, t) + random(-1, 1);
    const size = random(1, MATCH_WIDTH * 0.8);
    fill(15 + random(15), 15 + random(15), 15 + random(15), random(100, 200));
    ellipse(x, y, size);
  }

  // Add subtle ember glow at the current burning tip
  const isCurrentMatch = floor(((millis() - startTime) / 1000) / GROWTH_DURATION) === index;
  if (progress > 0.01 && progress < 1 && isCurrentMatch) {
    const glowSize = MATCH_WIDTH * 1.8;
    const glowAlpha = map(sin(frameCount * 0.1 + index * 5), -1, 1, 30, 80); // Pulsing alpha
    fill(255, 100, 0, glowAlpha);
    ellipse(currentFlameX + wiggle, currentFlameY, glowSize, glowSize); // Position at flame base
  }


  pop();
}


// Calculate wind influence at a point
function getWindInfluence(x, y) {
  // Combine mouse and device motion for wind
  let combinedWind = createVector(0, 0);
  
  // Add mouse-based wind if mouse is moving
  const mouseDist = dist(x, y, mouseX, mouseY);
  if (mouseDist <= WIND_RADIUS && (mouseVelocity.x !== 0 || mouseVelocity.y !== 0)) {
    const strength = map(mouseDist, 0, WIND_RADIUS, WIND_STRENGTH, 0);
    let mouseWind = createVector(mouseVelocity.x, mouseVelocity.y);
    mouseWind.normalize();
    mouseWind.mult(strength);
    combinedWind.add(mouseWind);
  }
  
  // Add device motion-based wind
  let deviceWind = createVector(deviceAcceleration.x, deviceAcceleration.y);
  deviceWind.mult(WIND_STRENGTH);
  combinedWind.add(deviceWind);
  
  // Limit the maximum wind strength
  if (combinedWind.mag() > WIND_STRENGTH) {
    combinedWind.normalize();
    combinedWind.mult(WIND_STRENGTH);
  }
  
  return combinedWind;
}


// Function to draw a more realistic flame
function drawFlame(x, y, index, elapsedSeconds, opacity = 1) {
  push();
  translate(x, y); // Move origin to the match tip

  const progress = min(1, elapsedSeconds / GROWTH_DURATION);
  const growthFactor = pow(progress, 0.5); // Non-linear growth, starts faster

  // Add flicker effect if rotating
  let flickerOpacity = 1;
  if (isFlickering) {
    const flickerElapsed = (millis() - flickerStartTime) / 1000;
    if (flickerElapsed >= FLICKER_DURATION) {
      isFlickering = false;
    } else {
      // Create a random flicker pattern during rotation
      flickerOpacity = 0.7 + 0.3 * noise(frameCount * 0.1 + index);
    }
  }

  // Base flame dimensions (adjust as needed)
  let baseWidth = 4 + 8 * growthFactor;
  let baseHeight = 15 + 30 * growthFactor;

  // Noise parameters for more complex movement
  let timeNoise = frameCount * 0.08 + index * 10; // Base time variation + unique offset
  let shapeNoiseSeed = index * 500;

  // Get wind influence AT THE FLAME'S APPROXIMATE AVERAGE POSITION
  // (Translate back to world coords temporarily for wind calc)
  let avgFlameWorldX = x; // Base x
  let avgFlameWorldY = y - baseHeight / 2; // Mid-point y
  const wind = getWindInfluence(avgFlameWorldX, avgFlameWorldY);

  // --- Heat Haze (Draw Behind Flame) ---
  const hazeSegments = 5;
  const hazeMaxOffset = 5 + 10 * growthFactor;
  const hazeHeight = baseHeight * 1.2;
  noFill();
  strokeWeight(1.5);
  for (let i = 0; i < 3; i++) { // Draw a few haze layers
    let hazeNoise = timeNoise * 0.5 + i * 100 + shapeNoiseSeed + 50; // Slower noise for haze
    let hazeAlpha = map(growthFactor, 0, 1, 0, 30) * opacity * (1 - i * 0.2); // Fade outer layers
    let currentWindEffect = p5.Vector.mult(wind, 0.5 + i * 0.2); // Haze affected by wind too

    stroke(200, 200, 255, hazeAlpha); // Very faint bluish white
    beginShape();
    curveVertex(currentWindEffect.x, 0); // Anchor point
    curveVertex(currentWindEffect.x, 0); // Anchor point

    for (let j = 0; j <= hazeSegments; j++) {
      let t = j / hazeSegments;
      let noiseX = (noise(hazeNoise + j * 0.5) - 0.5) * hazeMaxOffset * t; // Wideness varies with noise and height
      let noiseY = (noise(hazeNoise + j * 0.5 + 10) - 0.5) * 5 * t; // Slight vertical wiggle
      let windX = currentWindEffect.x * t * 1.5; // Wind pushes haze more at top
      let windY = currentWindEffect.y * t;

      curveVertex(noiseX + windX, -hazeHeight * t + noiseY + windY);
    }
    curveVertex(currentWindEffect.x * 1.5, -hazeHeight + currentWindEffect.y); // Tip influenced by wind
    curveVertex(currentWindEffect.x * 1.5, -hazeHeight + currentWindEffect.y); // Tip influenced by wind
    endShape();
  }


  // --- Flame Body ---
  const segments = 20; // More segments for smoother curveVertex shape
  noStroke(); // Flame itself has no stroke

  // Define colors
  const outerColor = color(255, 100 + noise(timeNoise + 10) * 120, 0, 180 * opacity * flickerOpacity); // Orange/Red, slightly varying hue
  const midColor = color(255, 200 + noise(timeNoise + 20) * 55, 50, 210 * opacity * flickerOpacity); // Yellow/Orange
  const innerColor = color(255, 255, 200 + noise(timeNoise + 30) * 55, 240 * opacity * flickerOpacity); // Bright Yellow/White core

  // Draw layers from back to front (outer to inner)
  drawFlameLayer(segments, baseHeight, baseWidth, timeNoise, shapeNoiseSeed, wind, outerColor, 1.0); // Outer layer (widest)
  drawFlameLayer(segments, baseHeight * 0.85, baseWidth * 0.7, timeNoise, shapeNoiseSeed + 100, wind, midColor, 0.8); // Mid layer
  drawFlameLayer(segments, baseHeight * 0.5, baseWidth * 0.4, timeNoise, shapeNoiseSeed + 200, wind, innerColor, 0.5); // Inner core (narrowest)

  pop(); // Restore previous drawing state

  // Return the approximate tip position for smoke spawning
  // Add wind influence to the base position + calculated tip offset
  let tipNoiseX = (noise(timeNoise + segments * 0.3 + 300) - 0.5) * baseWidth * 0.8;
  let tipWindX = wind.x * 1.5; // Strong wind effect at tip
  let tipWindY = wind.y;
  return { x: x + tipNoiseX + tipWindX, y: y - baseHeight + tipWindY };

}

// Helper function to draw a single flame layer using curveVertex
function drawFlameLayer(segments, height, width, timeNoise, shapeNoiseSeed, wind, fillColor, widthScaleFactor = 1.0) {
  fill(fillColor);
  beginShape();

  // Define points along the flame centerline and offset them
  let points = [];
  for (let i = 0; i <= segments; i++) {
    let t = i / segments; // Normalized position along the flame height (0=base, 1=tip)

    // Calculate base width at this height (tapers towards tip)
    let currentBaseWidth = width * (1 - pow(t, 0.8)) * widthScaleFactor * ((i + 1) * 1/sqrt(i + 1));

    // Noise for horizontal flickering/shape variation
    // More noise effect towards the tip
    let noiseX = (noise(timeNoise + i * 0.3 + shapeNoiseSeed) - 0.5) * currentBaseWidth * 0.4 * (1 + t);

    // Noise for subtle vertical variation (less pronounced)
    let noiseY = (noise(timeNoise * 1.1 + i * 0.3 + shapeNoiseSeed + 50) - 0.5) * 5 * t;

    // Apply wind - stronger effect towards the tip
    let windEffectX = wind.x * pow(t, 1.2) * 1.5; // Wind pushes tip more horizontally
    let windEffectY = wind.y * pow(t, 1.0);      // Wind lifts/pushes tip vertically

    points.push({
      x: noiseX + windEffectX,
      y: -height * t + noiseY + windEffectY, // Negative Y is up
      w: currentBaseWidth // Store the width at this segment
    });
  }
  // --- Define Curve Vertices ---
  const controlPointOffset = 3; // How far below the base the control points sit - adjust if needed

  // Start control point (Below the actual base)
  curveVertex(points[0].x, points[0].y + controlPointOffset);

  // Base points (Left and Right) - slightly above the absolute base for a rounder start
  curveVertex(points[0].x - points[0].w / 2, points[0].y);
  curveVertex(points[0].x + points[0].w / 2, points[0].y);

  // Right side vertices (Iterate from base upwards)
  for (let i = 1; i <= segments; i++) { // Start from i=1 since base (i=0) is handled
    curveVertex(points[i].x + points[i].w / 2, points[i].y);
  }

  // Tip control point (Duplicate the last point for curveVertex)
  curveVertex(points[segments].x, points[segments].y);
  curveVertex(points[segments].x, points[segments].y); // Need to duplicate for the curve math

  // Left side vertices (Iterate from tip downwards)
  // Start with the tip again to anchor the left side curve correctly
  curveVertex(points[segments].x, points[segments].y);
  for (let i = segments; i >= 1; i--) { // Go down to i=1
    curveVertex(points[i].x - points[i].w / 2, points[i].y);
  }

  // Connect back to the base points
  curveVertex(points[0].x - points[0].w / 2, points[0].y); // Left base point again

  // End control point (Below the actual base)
  curveVertex(points[0].x, points[0].y + controlPointOffset);

  endShape(); // Using endShape() without CLOSE might look slightly better here

  // Optional: Add a small solid ellipse at the very base to ensure connection
  fill(fillColor); // Use the same layer color
  ellipse(points[0].x, points[0].y, points[0].w * 0.8, 5); // Small ellipse at base
}