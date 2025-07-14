const neighborDirs = [
    {q: 1, r: 0}, {q: -1, r: 0}, {q: 0, r: 1}, {q: 0, r: -1}, {q: 1, r: -1}, {q: -1, r: 1}
];

function getDistance(a, b) {
    return Math.max(Math.abs(a.q - b.q), Math.abs(a.r - b.r), Math.abs(-a.q-a.r + b.q+b.r));
}

function isNeighbor(a, b) {
    return getDistance(a, b) === 1;
}

function validateFormula(tiles) {
    const result = {
        totalTiles: tiles.length,
        isComplete: true,
        shapeType: null,
        tilesValidated: [],
    };

    tiles.forEach(tile => {
        let usedPips = tile.edges.length;
        let maxPips = parseInt(tile.tile[2]);

        result.tilesValidated.push({
            tileId: tile.tile,
            position: [tile.q, tile.r],
            valency: maxPips,
            bondsUsed: usedPips,
            valid: usedPips === maxPips
        });

        if (usedPips !== maxPips) result.isComplete = false;
    });

    result.shapeType = classifyShape(tiles);
    return result;
}

function classifyShape(tiles) {
    if (tiles.length === 3 && tiles.every(t => t.edges.length === 2)) {
        return "Triangle";
    }
    // More shapes added as needed
    return "Unknown";
}
