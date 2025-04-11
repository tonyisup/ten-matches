let img;
let matchTips = []; // Array to hold the coordinates of the match tips
let startTime; // Track when the animation started
const GROWTH_DURATION = 10; // Duration in seconds for flames to reach max size (2 minutes)

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

  // Set drawing properties for flames
  noStroke(); // No outlines for the flame shapes
  
  // Initialize start time
  startTime = millis();
}

function draw() {
  // Draw the background image each frame
  image(img, 0, 0);

  // Calculate elapsed time and handle reset
  let elapsedSeconds = (millis() - startTime) / 1000;
  if (elapsedSeconds >= GROWTH_DURATION) {
    startTime = millis();
    elapsedSeconds = 0;
  }

  // Draw a flame on each match tip
  for (let i = 0; i < matchTips.length; i++) {
    drawFlame(matchTips[i].x, matchTips[i].y, i, elapsedSeconds); // Pass elapsed time
  }

  // Optional: Display mouse coordinates to help find tip locations
  // fill(255);
  // textSize(12);
  // text(`X: ${mouseX} Y: ${mouseY}`, 10, 20);
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
}