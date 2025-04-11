let img;
let matchTips = []; // Array to hold the coordinates of the match tips
let startTime; // Track when the animation started
const GROWTH_DURATION = 10; // Duration in seconds for flames to reach max size (2 minutes)
const MATCH_WIDTH = 5; // Width of the matchstick in pixels

// Ash particle system
let ashParticles = [];
let charredMatches = []; // Track which matches have been charred and their progress

class AshParticle {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.velocity = createVector(random(-0.5, 0.5), random(0.5, 1.5)); // Slight horizontal drift
    this.lifespan = 255; // Start fully opaque
    this.size = random(2, 4);
  }

  update() {
    this.x += this.velocity.x;
    this.y += this.velocity.y;
    this.lifespan -= 2; // Fade out over time
  }

  display() {
    noStroke();
    fill(50, 50, 50, this.lifespan); // Gray color with transparency
    ellipse(this.x, this.y, this.size);
  }

  isDead() {
    return this.lifespan < 0;
  }
}

// --- IMPORTANT: Adjust these coordinates! ---
// These are ESTIMATED coordinates based on the image appearance.
// You WILL likely need to adjust the x and y values below
// until the flames sit perfectly on the match tips in your image.
// Use the mouseX, mouseY coordinates displayed by p5.js (or an image editor)
// to find the precise tip locations in YOUR image file.

// Estimated coordinates assuming the image is loaded at full size.
// Format: { x: pixelX, y: pixelY }
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


function preload() {
  // Load the image before the sketch starts
  // Replace 'tally_marks.png' with the actual filename/path of your image
  img = loadImage('tally_marks.png');
}

function setup() {
  // Create a canvas the same size as the loaded image
  createCanvas(img.width, img.height);

  // Copy the estimated coordinates into our working array
  matchTips = startPoints;
  charredMatches = new Array(matchTips.length).fill(0); // Store progress instead of boolean

  // Set drawing properties for flames
  noStroke(); // No outlines for the flame shapes
  
  // Initialize start time
  startTime = millis();
}

function draw() {
  // Draw the background image each frame
  image(img, 0, 0);

  // Calculate total elapsed time
  const totalElapsedSeconds = (millis() - startTime) / 1000;
  
  // Reset everything when the full sequence is complete
  const totalSequenceDuration = GROWTH_DURATION * matchTips.length;
  if (totalElapsedSeconds >= totalSequenceDuration) {
    startTime = millis();
    ashParticles = [];
    charredMatches = new Array(matchTips.length).fill(0);
  }

  // Update and display ash particles
  for (let i = ashParticles.length - 1; i >= 0; i--) {
    ashParticles[i].update();
    ashParticles[i].display();
    if (ashParticles[i].isDead()) {
      ashParticles.splice(i, 1);
    }
  }

  // Draw flames, charred matches, and spawn ash particles
  for (let i = 0; i < matchTips.length; i++) {
    // Calculate individual match elapsed time
    const matchStartTime = i * GROWTH_DURATION;
    const matchElapsedSeconds = max(0, totalElapsedSeconds - matchStartTime);
    
    // Draw charred match if it has been lit
    if (charredMatches[i] > 0) {
      drawCharredMatch(matchTips[i], flameEndPoints[i], charredMatches[i], i);
    }
    
    // Only animate if this match's time has started and hasn't completed
    if (matchElapsedSeconds >= 0 && matchElapsedSeconds < GROWTH_DURATION) {
      // Only show the flame if it's the current active match
      const isCurrentMatch = floor(totalElapsedSeconds / GROWTH_DURATION) === i;
      if (isCurrentMatch) {
        const flamePos = drawFlame(matchTips[i].x, matchTips[i].y, i, matchElapsedSeconds);
        
        // Update charred progress
        charredMatches[i] = min(1, matchElapsedSeconds / GROWTH_DURATION);
        
        // Spawn new ash particles at the flame's position
        if (random() < 0.3) { // 30% chance each frame
          ashParticles.push(new AshParticle(flamePos.x, flamePos.y));
        }
      }
    }
  }

  // Optional: Display mouse coordinates to help find tip locations
  // fill(255);
  // textSize(12);
  // text(`X: ${mouseX} Y: ${mouseY}`, 10, 20);
}

function drawCharredMatch(startPoint, endPoint, progress, index) {
  push();
  
  // Calculate current end position
  const currentEndX = startPoint.x - (startPoint.x - endPoint.x) * progress;
  const currentEndY = startPoint.y - (startPoint.y - endPoint.y) * progress;
  
  // Add some subtle variation to the charred line
  const noiseOffset = index * 1000 + frameCount * 0.02;
  const wiggle = (noise(noiseOffset) - 0.5) * 2; // -1 to 1
  
  // Draw the charred match
  strokeWeight(MATCH_WIDTH);
  stroke(30, 30, 30, 200); // Dark gray, slightly transparent
  line(
    startPoint.x + wiggle,
    startPoint.y,
    currentEndX + wiggle,
    currentEndY
  );
  
  // Add some texture to the charred part
  noStroke();
  for (let i = 0; i < 3; i++) {
    const t = random(0, 1);
    const x = lerp(startPoint.x, currentEndX, t) + wiggle;
    const y = lerp(startPoint.y, currentEndY, t);
    const size = random(1, MATCH_WIDTH);
    fill(20, 20, 20, random(100, 200));
    ellipse(x, y, size);
  }
  
  pop();
}

// Function to draw an animated flame at a specific location
function drawFlame(x, y, index, elapsedSeconds) {
  push(); // Isolate transformations and styles for this flame

  // Calculate current position based on progress
  const progress = min(1, elapsedSeconds / GROWTH_DURATION);
  const currentX = x - (x - flameEndPoints[index].x) * progress;
  const currentY = y - (y - flameEndPoints[index].y) * progress;
  
  // Move the origin to the current position
  translate(currentX, currentY);

  // Calculate time-based growth factor (0 to 1)
  const growthFactor = progress;
  
  // Use Perlin noise for smoother, more natural flickering
  let noiseFactor = frameCount * 0.05; // Controls flicker speed
  let uniqueNoise = index * 100; // Offset noise for each flame

  // Base flame properties with growth
  let baseWidth = 5 * (1 + growthFactor); // Will grow from 5 to 10
  let baseHeight = 15 * (1 + growthFactor); // Will grow from 15 to 30

  // Calculate flickering dimensions
  let flameWidth = baseWidth + noise(noiseFactor + uniqueNoise) * 5 - 2.5; // Vary width
  let flameHeight = baseHeight + noise(noiseFactor + uniqueNoise + 50) * 10 - 5; // Vary height
  let wiggleX = noise(noiseFactor + uniqueNoise + 100) * 4 - 2; // Slight horizontal movement

  // Ensure minimum size
  flameWidth = max(1, flameWidth);
  flameHeight = max(3, flameHeight);

  // Draw outer flame with increased brightness over time
  const baseBrightness = 100;
  const maxBrightness = 200;
  const currentBrightness = baseBrightness + (maxBrightness - baseBrightness) * growthFactor;
  fill(255, currentBrightness + noise(noiseFactor + uniqueNoise + 150) * 100, 0, 200); // Orange-ish, semi-transparent
  // Draw slightly above the tip (y is negative) using an ellipse
  ellipse(wiggleX, -flameHeight / 2, flameWidth, flameHeight);

  // Draw inner core flame with increased brightness
  let coreHeight = flameHeight * 0.6;
  let coreWidth = flameWidth * 0.6;
  const coreBrightness = 150 + (255 - 150) * growthFactor;
  fill(255, 255, coreBrightness + noise(noiseFactor + uniqueNoise + 200) * 105, 230); // Yellow-ish, less transparent
  ellipse(wiggleX, -coreHeight / 1.8, coreWidth, coreHeight); // Position slightly higher within outer flame

  pop(); // Restore previous drawing state

  // Return the current flame position for ash particle spawning
  return { x: currentX, y: currentY };
}