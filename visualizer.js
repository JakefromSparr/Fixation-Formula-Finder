const canvas = document.getElementById('visualization');
const ctx = canvas.getContext('2d');
const hexRadius = 30; // Matches your initial
const hexWidth = Math.sqrt(3) * hexRadius;
const hexHeight = 2 * hexRadius;

// Adjust offsets to center the drawing more effectively
const centerX = canvas.width / 2;
const centerY = canvas.height / 2;

// Converts axial coordinates (q, r) to pixel coordinates (x, y)
// This is using the "pointy top" hex orientation for standard calculation (q = x-axis, r = diagonal)
// Your validator uses a "flat top" like orientation (q = horiz, r = diag).
// Let's adjust hexToPixel to match common flat-top derivation if q is horizontal, r is diagonal.
// If q is horizontal, r is diagonal:
// x = hexWidth * (q + r / 2)
// y = hexHeight * (3/4) * r
// This is consistent with what you had.
function hexToPixel(q, r) {
    // For flat-top hexes (which your q,r often implies if q is horizontal axis):
    const x = hexRadius * (3/2 * q);
    const y = hexRadius * (Math.sqrt(3)/2 * q + Math.sqrt(3) * r);
    return {x: centerX + x, y: centerY + y};
}

// Draws a single hexagon
function drawHex(x, y, label, color = "#ccc") {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
        const angle = Math.PI / 3 * i + Math.PI / 6; // Add PI/6 for flat-top orientation
        const px = x + hexRadius * Math.cos(angle);
        const py = y + hexRadius * Math.sin(angle);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.strokeStyle = "#333"; // Hex border
    ctx.fillStyle = color; // Hex fill
    ctx.fill();
    ctx.stroke();

    // Draw label (pip count)
    ctx.fillStyle = "#000";
    ctx.font = "14px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, x, y);
}

// Draws a line representing a bond between two tiles
function drawBond(tile1Px, tile1Py, tile2Px, tile2Py) {
    ctx.beginPath();
    ctx.moveTo(tile1Px, tile1Py);
    ctx.lineTo(tile2Px, tile2Py);
    ctx.strokeStyle = "red"; // Bond color
    ctx.lineWidth = 3;
    ctx.stroke();
}

// Main function to draw a formula configuration
function drawFormula(tiles) {
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear previous drawing

    // Store pixel positions for drawing bonds
    const pixelPositions = new Map();

    // First pass: Draw all hexes and store their pixel positions
    tiles.forEach(tile => {
        const {x, y} = hexToPixel(tile.q, tile.r);
        pixelPositions.set(tile.id, {x, y});
        drawHex(x, y, tile.pips.toString()); // Display pip count
    });

    // Second pass: Draw all connections (bonds)
    tiles.forEach(tile => {
        const {x: t1x, y: t1y} = pixelPositions.get(tile.id);
        tile.connections.forEach(conn => {
            // Only draw bond once per pair (e.g., if A-B is drawn, don't draw B-A)
            if (tile.id < conn.targetId) { // Ensures each bond drawn only once
                const {x: t2x, y: t2y} = pixelPositions.get(conn.targetId);
                drawBond(t1x, t1y, t2x, t2y);
            }
        });
    });
}

// Expose drawFormula to the global scope for script.js
window.drawFormula = drawFormula;
