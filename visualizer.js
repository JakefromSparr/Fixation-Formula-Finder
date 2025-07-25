const canvas = document.getElementById('visualization');
const ctx = canvas.getContext('2d');
const hexRadius = 30; // Consistent with your current Finder repo's visualizer.js

// Use these defined variables for hex dimensions
const hexWidth = hexRadius * Math.sqrt(3); // flat-top hex width
const hexHeight = hexRadius * 2;           // flat-top hex height (point-to-point)

const centerX = canvas.width / 2;
const centerY = canvas.height / 2;

// Hex to Pixel conversion for FLAT-TOP orientation
// q-axis is horizontal, r-axis is diagonal (up-right)
function hexToPixel(q, r) {
  const x = hexWidth * (q + r/2); // Use hexWidth here
  const y = hexHeight * (3/4) * r; // Use hexHeight here
  return { x: centerX + x, y: centerY + y };
}
function drawHex(x, y, label, color = '#ccc') {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
        const angle = Math.PI / 3 * i + Math.PI / 6; // flat-topped hex orientation
        const px = x + hexRadius * Math.cos(angle);
        const py = y + hexRadius * Math.sin(angle);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.strokeStyle = '#333';
    ctx.fillStyle = color;
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#000';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x, y);
}


function drawBond(x1, y1, x2, y2) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = 'red';
  ctx.lineWidth = 3;
  ctx.stroke();
}

function drawFormula(tiles) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const positions = new Map();

  tiles.forEach(tile => {
    const { x, y } = hexToPixel(tile.q, tile.r);
    positions.set(tile.id, { x, y });
    drawHex(x, y, tile.pips.toString());
  });

  tiles.forEach(tile => {
    const { x: x1, y: y1 } = positions.get(tile.id);
    tile.connections.forEach(conn => {
      if (tile.id < conn.targetId) {
        const { x: x2, y: y2 } = positions.get(conn.targetId);
        drawBond(x1, y1, x2, y2);
      }
    });
  });
}

window.drawFormula = drawFormula;

function drawHighlightedSpaces(spaces) {
  ctx.save();
  ctx.strokeStyle = "blue";
  ctx.lineWidth = 3;
  spaces.forEach(({ q, r }) => {
    const { x, y } = hexToPixel(q, r);
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = Math.PI / 180 * (60 * i);
      const px = x + hexRadius * Math.cos(angle);
      const py = y + hexRadius * Math.sin(angle);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();
  });
  ctx.restore();
}

window.drawHighlightedSpaces = drawHighlightedSpaces;


