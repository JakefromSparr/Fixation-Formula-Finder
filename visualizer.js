const canvas = document.getElementById('visualization');
const ctx = canvas.getContext('2d');
const hexRadius = 30;
const hexWidth = Math.sqrt(3) * hexRadius;
const hexHeight = 2 * hexRadius;

function hexToPixel(q, r) {
    const x = hexWidth * (q + r/2);
    const y = hexHeight * (3/4) * r;
    return {x: canvas.width/2 + x, y: canvas.height/2 + y};
}

function drawHex(x, y, label) {
    ctx.beginPath();
    for (let i = 0; i <= 6; i++) {
        const angle = Math.PI / 3 * i;
        const px = x + hexRadius * Math.cos(angle);
        const py = y + hexRadius * Math.sin(angle);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.fillText(label, x-8, y+5);
}

function drawFormula(tiles) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = "12px Arial";
    tiles.forEach(tile => {
        const {x, y} = hexToPixel(tile.q, tile.r);
        drawHex(x, y, tile.tile);
    });
}
