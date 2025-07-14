const canvas = document.getElementById('visualization');
const ctx = canvas.getContext('2d');
const hexRadius = 30;

const centerX = canvas.width / 2;
const centerY = canvas.height / 2;

function hexToPixel(q, r) {
  const x = hexRadius * 1.5 * q;
  const y = hexRadius * Math.sqrt(3) * (r + q / 2);
  return { x: centerX + x, y: centerY + y };
}

function drawHex(x, y, label, color = '#ccc') {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = Math.PI / 3 * i; // flat-top orientation
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
  const pixelPositions = new Map();
  tiles.forEach(tile => {
    const { x, y } = hexToPixel(tile.q, tile.r);
    pixelPositions.set(tile.id, { x, y });
    drawHex(x, y, tile.pips.toString());
  });
  tiles.forEach(tile => {
    const { x: t1x, y: t1y } = pixelPositions.get(tile.id);
    tile.connections.forEach(conn => {
      if (tile.id < conn.targetId) {
        const { x: t2x, y: t2y } = pixelPositions.get(conn.targetId);
        drawBond(t1x, t1y, t2x, t2y);
      }
    });
  });
}

window.drawFormula = drawFormula;
