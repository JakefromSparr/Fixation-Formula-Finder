// --- Global Constants and Helper Maps ---

// Corrected neighborDirs (standard axial hex neighbors)
const neighborDirs = [
  {q: 1, r: 0},   // Right
  {q: 0, r: 1},   // Lower-Right
  {q: -1, r: 1},  // Lower-Left
  {q: -1, r: 0},  // Left
  {q: 0, r: -1},  // Upper-Left
  {q: 1, r: -1}   // Upper-Right
];

// Map neighbor deltas to hex edge indices (0-5 clockwise from 'right' edge)
const hexDeltaToEdgeIndex = {
  "1,0": 0, "0,1": 1, "-1,1": 2, "-1,0": 3, "0,-1": 4, "1,-1": 5
};
function calculateViablePlacementSpots(config) {
    const occupied = new Set(config.map(t => `${t.q},${t.r}`));
    const spots = [];

    // If no tiles are placed yet, the only viable spot is the origin (0,0)
    if (config.length === 0) {
        return [{ q: 0, r: 0 }];
    }

    // Iterate through existing tiles to find their empty neighbors
    for (const tile of config) {
        for (const dir of neighborDirs) {
            const q = tile.q + dir.q;
            const r = tile.r + dir.r;
            const key = `${q},${r}`;
            
            // Add spot if it's empty and not already in our list of spots
            if (!occupied.has(key) && !spots.some(s => s.q === q && s.r === r)) {
                spots.push({ q, r });
            }
        }
    }
    return spots;
}

// Ensure window.calculateViablePlacementSpots is exposed globally
window.calculateViablePlacementSpots = calculateViablePlacementSpots;


// Map canonical bit string to Chirality Labels (A, AB, AC, etc.)
const chiralityMap = {
  "000001": "A",
  "000011": "AB",
  "000101": "AC",
  "001001": "AD",
  "000111": "ABC",
  "001011": "ABD",
  "010101": "ACE",
  // Add more as needed if you discover them, or a 'CUSTOM' fallback
};

// --- Chirality helpers --------------------------------------------------+
// Returns "A", "AB", "ACE", … for a single tile.
function getChiralityForTile(tile, config) {
  const edgeBits = Array(6).fill("0");
  (tile.connections || []).forEach(c => {
    const tgt = config.find(t => t.id === c.targetId);
    if (!tgt) return;                            // safety
    const e = getRelativeDirection(tile, tgt);   // 0-5
    edgeBits[e] = "1";
  });

  const raw = edgeBits.join("");

  // Generate all rotations of raw and its mirror image
  const rots = [];
  for (let i = 0; i < 6; i++) {
    rots.push(raw.slice(i) + raw.slice(0, i));              // rotation
  }
  const rev = raw.split("").reverse().join("");
  for (let i = 0; i < 6; i++) {
    rots.push(rev.slice(i) + rev.slice(0, i));              // reflection+rotation
  }

  // Choose lexicographically smallest to be the canonical bitstring
  const canonicalBits = rots.sort()[0];
  return chiralityMap[canonicalBits] || canonicalBits;       // fallback = bitstring
}

// make it available everywhere
window.getChiralityForTile = getChiralityForTile;

// Each `transform` takes (q, r) and returns new {q, r}.
const hexTransforms = [
    (q, r) => ({ q, r }),                  // Identity (0 degrees rotation)
    (q, r) => ({ q: r, r: -q - r }),       // +60 degrees rotation
    (q, r) => ({ q: -q - r, r: q }),       // +120 degrees rotation
    (q, r) => ({ q: -q, r: -r }),          // +180 degrees rotation
    (q, r) => ({ q: -r, r: q + r }),       // +240 degrees rotation
    (q, r) => ({ q: q + r, r: -q }),       // +300 degrees rotation
    (q, r) => ({ q: r, r: q }),            // Axial reflection (across main diagonal)
    (q, r) => ({ q: q, r: -q - r }),       // Axial reflection (across secondary diagonal)
    (q, r) => ({ q: -q - r, r: -r }),      // Axial reflection (across third diagonal)
    (q, r) => ({ q: -r, r: -q }),          // Diagonal reflection (across 'q' axis)
    (q, r) => ({ q: q + r, r: r }),        // Diagonal reflection (across 'r' axis)
    (q, r) => ({ q: -q, r: q + r })        // Diagonal reflection (across 's' axis, where s=-q-r)
];

// Generates all 12 rotational and reflectional symmetries of the given configuration.
function generateAllSymmetries(config) {
    return hexTransforms.map(transform => {
        const transformedConfig = config.map(tile => {
            const { q, r } = transform(tile.q, tile.r);
            // Re-map connections to new IDs based on their transformed (q,r) coordinates.
            // This is complex. For now, we'll keep connections as-is and rely on spatial string.
            // A perfect graph isomorphism canonicalization would re-map IDs.
            // For this level of canonical form, we primarily care about the spatial layout and pips.
            return {
                id: tile.id, // Keep original ID, but it's not used in final string conversion
                q,
                r,
                pips: tile.pips,
                connections: tile.connections // Connections are topological, not spatial
            };
        });
        return normalizeCoordinates(transformedConfig);
    });
}

// Normalizes a configuration by shifting its coordinates so the
// tile with the lowest q (then lowest r) is at (0,0).
function normalizeCoordinates(config) {
    if (config.length === 0) return [];
    
    let minQ = Infinity;
    let minR = Infinity;

    for (const tile of config) {
        if (tile.q < minQ) minQ = tile.q;
        if (tile.r < minR) minR = tile.r;
    }

    // After finding minQ and minR, adjust for a specific "lowest corner" canonicalization
    // For axial, it's typically just minQ and minR.
    // If you have a specific desired "anchor" for your canonicalization (e.g., topmost-leftmost),
    // this logic might need adjustment. For now, simple min q, min r shift.

    return config.map(tile => ({
        ...tile, // Keep other properties like pips, connections, currentBonds
        q: tile.q - minQ,
        r: tile.r - minR,
    }));
}

// Calculates the axial distance between two hexes.
function getDistance(hexA, hexB) {
  const dq = hexA.q - hexB.q;
  const dr = hexA.r - hexB.r;
  return (Math.abs(dq) + Math.abs(dq + dr) + Math.abs(dr)) / 2;
}

// Determines the relative direction (edge index) from fromHex to toHex for adjacent hexes.
function getRelativeDirection(fromHex, toHex) {
  const deltaQ = toHex.q - fromHex.q;
  const deltaR = toHex.r - fromHex.r;
  const key = `${deltaQ},${deltaR}`;
  return hexDeltaToEdgeIndex[key];
}

// Helper: Get degrees (number of connections) for all nodes in a config
function getNodeDegrees(config) {
  const degrees = new Map();
  for (const tile of config) {
    degrees.set(tile.id, tile.connections.length);
  }
  return Array.from(degrees.values()); // Return array of degrees
}

// Helper: Check if a graph has cycles (Uses DFS to detect cycles)
// Assumes config is a connected graph.
function hasCycle(config) {
  if (config.length < 3) return false;
  const adj = new Map(config.map(t => [t.id, []]));
  for (const tile of config) {
    for (const conn of tile.connections) {
      adj.get(tile.id).push(conn.targetId);
    }
  }

  const visited = new Set();
  const recursionStack = new Set();

  function dfs(u, parent) {
    visited.add(u);
    recursionStack.add(u);

    for (const v of adj.get(u)) {
      if (!visited.has(v)) {
        if (dfs(v, u)) return true;
      } else if (recursionStack.has(v) && v !== parent) {
        return true; // Cycle detected
      }
    }
    recursionStack.delete(u);
    return false;
  }

  // Start DFS from the first node.
  return dfs(config[0].id, null);
}

// --- Validation Functions ---

// Checks if the sum of all pips (degrees) in the configuration is even (Handshake Lemma).
function isValidPipSum(config) {
  const totalPips = config.reduce((sum, tile) => sum + tile.pips, 0);
  return totalPips % 2 === 0;
}

// Checks if each tile's pips are fully satisfied by connections, and connections are valid.
function isValencySatisfied(config) {
  const tileMap = new Map(config.map(t => [t.id, t]));

  for (const tile of config) {
    // Check if the number of connections matches the tile's pip count
    if (tile.connections.length !== tile.pips) {
      return false; // Not fully complete or exceeds capacity
    }

    const bondedNeighbors = new Set(); // To check for double edges to same tile

    for (const conn of tile.connections) {
      const targetTile = tileMap.get(conn.targetId);
      if (!targetTile) {
        return false; // Connection to a tile not in the config (shouldn't happen in a well-formed config)
      }

      // Check if they are actual neighbors on the hex grid
      if (getDistance(tile, targetTile) !== 1) {
        return false; // Not adjacent
      }

      // Check if already bonded to this specific neighbor
      if (bondedNeighbors.has(targetTile.id)) {
        return false; // Double edge to same tile
      }
      bondedNeighbors.add(targetTile.id);

      // Verify mutual connection (important for graph consistency)
      const reciprocalConnection = targetTile.connections.some(
        tConn => tConn.targetId === tile.id
      );
      if (!reciprocalConnection) {
        return false; // One-sided connection
      }
    }
  }
  return true;
}

// Checks for overlapping tiles and ensures connections align with hex grid geometry.
function isGeometricallyValid(config) {
  const occupiedSpaces = new Set();
  for (const tile of config) {
    const key = `${tile.q},${tile.r}`;
    if (occupiedSpaces.has(key)) {
      return false; // Overlapping tiles
    }
    occupiedSpaces.add(key);
  }

  // Ensure connections are physically consistent on the hex grid.
  for (const tile of config) {
    const actualBondedEdges = new Set();
    for (const conn of tile.connections) {
      const targetTile = config.find(t => t.id === conn.targetId);
      if (!targetTile) continue; // Should be caught by isValencySatisfied

      const edgeIndex = getRelativeDirection(tile, targetTile);
      if (edgeIndex === undefined) {
         return false; // Connected tile is not a direct neighbor (already checked by getDistance)
      }
      // Ensure no two connections use the same hex edge for a single tile.
      // E.g., if a tile at (0,0) connects to (1,0) and another connection
      // also implies the (1,0) direction, that's invalid for distinct bonds.
      if (actualBondedEdges.has(edgeIndex)) {
          return false; // Duplicate edge usage for a single tile
      }
      actualBondedEdges.add(edgeIndex);
    }
    // Ensures that the number of distinct edges used equals the number of connections expected.
    if (actualBondedEdges.size !== tile.connections.length) {
        return false; // Should logically be covered, but good defensive check.
    }
  }
  return true;
}

// --- Chirality Functions ---

// Gets the indices of the edges a tile is bonded on.
function getBondedEdgeIndices(tile, config) {
  const bondedEdges = [];
  const tileMap = new Map(config.map(t => [t.id, t]));

  for (const conn of tile.connections) {
    const targetTile = tileMap.get(conn.targetId);
    if (targetTile) {
      const deltaQ = targetTile.q - tile.q;
      const deltaR = targetTile.r - tile.r;
      const edgeIndex = hexDeltaToEdgeIndex[`${deltaQ},${deltaR}`];
      if (edgeIndex !== undefined) { // Should always be defined if isGeometricallyValid passes
        bondedEdges.push(edgeIndex);
      }
    }
  }
  return bondedEdges.sort((a, b) => a - b); // Sort for consistency before canonicalization
}

// Determines the canonical chirality string for a set of bonded edge indices.
function getCanonicalChiralityString(edges) {
  if (edges.length === 0) return "NONE";
  if (edges.length > 6) return "INVALID";

  let minBinaryString = Array.from({length: 6}, (_, i) => edges.includes(i) ? '1' : '0').join('');

  // Rotations
  for (let i = 1; i < 6; i++) {
    const rotatedEdges = edges.map(e => (e + i) % 6);
    const currentBinaryString = Array.from({length: 6}, (_, idx) => rotatedEdges.includes(idx) ? '1' : '0').join('');
    if (currentBinaryString < minBinaryString) {
      minBinaryString = currentBinaryString;
    }
  }

  // Reflections (mirroring across axis 0-3) - for hex, reflecting and then rotating covers all symmetries
  // New edge = (6 - old_edge) % 6 (e.g., 0->0, 1->5, 2->4, 3->3)
  const reflectedEdges = edges.map(e => (6 - e) % 6).sort((a, b) => a - b);
  let reflectedBinaryString = Array.from({length: 6}, (_, i) => reflectedEdges.includes(i) ? '1' : '0').join('');

  // Check rotations of reflected string
  for (let i = 0; i < 6; i++) {
    const currentBinaryString = Array.from({length: 6}, (_, idx) => reflectedEdges.includes((idx + i) % 6) ? '1' : '0').join('');
    if (currentBinaryString < minBinaryString) {
      minBinaryString = currentBinaryString;
    }
  }
  return minBinaryString;
}

// Gets the named chirality type (A, AB, AC etc.) for a tile within a config.
// --- Shape Classification Functions ---

// Shape definitions based on your plan
function isChain(config) {
  if (hasCycle(config)) return false;

  const degrees = getNodeDegrees(config);
  const degree1Count = degrees.filter(d => d === 1).length;
  const degree2Count = degrees.filter(d => d === 2).length;

  return degree1Count === 2 && (degree1Count + degree2Count === config.length);
}

function isTriangle(config) {
  if (config.length !== 3) return false;
  const degrees = getNodeDegrees(config);
  return degrees.every(d => d === 2) && hasCycle(config);
}

function isRing(config) {
  if (config.length < 4) return false; // Minimum 4 nodes for a ring.
  const degrees = getNodeDegrees(config);
  return degrees.every(d => d === 2) && hasCycle(config);
}

function isStar(config) {
  if (config.length < 4) return false;

  const degrees = getNodeDegrees(config);
  const centralNodeCandidates = degrees.filter(d => d >= 3);
  const leafNodeCount = degrees.filter(d => d === 1).length;

  // A star has exactly one central node with degree >=3, and the rest are leaves (degree 1).
  if (centralNodeCandidates.length === 1 && leafNodeCount === (config.length - 1)) {
    const centralTile = config.find(t => t.connections.length >= 3);
    if (!centralTile) return false; // Should not happen

    // Ensure the central tile is connected to all other (leaf) tiles
    const connectedToAllOthers = config.every(t =>
      t.id === centralTile.id || centralTile.connections.some(conn => conn.targetId === t.id)
    );
    return connectedToAllOthers;
  }
  return false;
}

function isSquare(config) {
    if (config.length !== 4) return false;
    const degrees = getNodeDegrees(config);

    // A common "Square" (rhombus) on a hex grid usually has all 4 tiles with degree 2.
    // If it's a 4-node ring, distinguish from other rings.
    // E.g., for 2:2:2:2, all degrees are 2.
    if (degrees.every(d => d === 2) && hasCycle(config)) {
        // More specific check: for a hex rhombus (square), the distance between opposite corners is 2.
        // And there should be exactly two such pairs.
        // This is a more geometric check. For simplicity, we'll assume a 4-node cycle of degree 2 tiles is a 'Square' for now.
        return true; // For now, any 4-cycle where all are degree 2.
    }

    // You mentioned 2:3:3:2 for Square (Conjunction).
    const degree2Count = degrees.filter(d => d === 2).length;
    const degree3Count = degrees.filter(d => d === 3).length;
    if (degree2Count === 2 && degree3Count === 2 && hasCycle(config)) {
        // This confirms the degree sequence. Further geometric check would be needed for absolute certainty
        // that it forms the specific "square" shape rather than another complex 4-cycle.
        return true;
    }
    return false;
}

function isYShape(config) {
  const degrees = getNodeDegrees(config);
  // Y-Shape: Central node (degree 3) with exactly three branches of varying length, no cycles.
  const degree1Count = degrees.filter(d => d === 1).length; // 3 leaf nodes
  const degree3Count = degrees.filter(d => d === 3).length; // 1 central node

  return degree1Count === 3 && degree3Count === 1 && !hasCycle(config);
}

function isArch(config) {
  // Arch: Curved open-ended structure (not linear chain, typically has two ends).
  // It's a path graph (acyclic).
  if (hasCycle(config)) return false;

  const degrees = getNodeDegrees(config);
  const degree1Count = degrees.filter(d => d === 1).length;
  const degree2PlusCount = degrees.filter(d => d >= 2).length; // All others must be >= 2

  // An arch should have exactly two ends (degree 1)
  if (degree1Count === 2 && (degree1Count + degree2PlusCount === config.length)) {
    // If it's a path graph (degree1Count === 2, others >= 2) AND it's not a strict chain, it's an arch.
    // We classify based on `isChain` first, so if it reaches here, it's not a chain.
    return true;
  }
  return false;
}

function isCluster(config) {
  // Cluster (Blob): Irregular shape, fallback for complex structures.
  // Rule: If it's not any of the other defined shapes and has more than 4 tiles.
  // (We use > 3 since triangle is 3, and isYShape/isStar can be 4).
  if (config.length <= 3) return false; // Too small for complex cluster
  // Fallback if none of the more specific classifiers match
  return !isChain(config) &&
         !isTriangle(config) &&
         !isRing(config) &&
         !isStar(config) &&
         !isSquare(config) &&
         !isYShape(config) &&
         !isArch(config);
}


// Main shape classification function
function classifyShape(config) {
  if (isTriangle(config)) return "Triangle";
  if (isChain(config)) return "Chain";
  if (isRing(config)) return "Ring";
  if (isStar(config)) return "Star";
  if (isSquare(config)) return "Square";
  if (isYShape(config)) return "Y-Shape";
  if (isArch(config)) return "Arch";
  if (isCluster(config)) return "Cluster";
  return "Unknown"; // Fallback if none match
}

// --- Uniqueness and Derivative Tracking ---

// Stores canonical forms of unique configurations.
const seenConfigs = new Set();
// Store summary data for output
const summary = {};

// Generates a canonical string representation of a configuration for uniqueness checks.
// Generates the true canonical form for a configuration by considering all symmetries.
function getCanonicalForm(config) {
    if (config.length === 0) return "";

    const allSymmetries = hexTransforms.map(transform => {
        // Apply transformation to each tile's coordinates
        const transformedConfig = config.map(tile => {
            const { q, r } = transform(tile.q, tile.r);
            return {
                id: tile.id, // Keep original ID
                q, r,
                pips: tile.pips,
                connections: tile.connections // Connections are topological, not spatial
            };
        });

        // Normalize coordinates for this transformed variant: shift so lowest q (then lowest r) is at (0,0)
        let minQ = Infinity;
        let minR = Infinity;
        for (const tile of transformedConfig) {
            if (tile.q < minQ) minQ = tile.q;
            if (tile.r < minR) minR = tile.r;
        }

        const normalizedVariant = transformedConfig.map(tile => ({
            ...tile,
            q: tile.q - minQ,
            r: tile.r - minR,
        }));

        // Generate string for this normalized variant
        return normalizedVariant
            .map(tile => {
                // Include chirality of individual tiles (calculated from ORIGINAL config) for richer uniqueness
                const originalTile = config.find(t => t.id === tile.id);
                // Ensure originalTile is found before getting chirality to prevent errors
                const chirality = originalTile ? getChiralityForTile(originalTile, config) : "N/A";
                return `${tile.q},${tile.r},${tile.pips},${chirality}`;
            })
            .sort() // Sort the strings of individual tile canonical representations
            .join("|");
    });

    // Sort all generated canonical form strings lexicographically and pick the smallest
    allSymmetries.sort();
    return allSymmetries[0]; // The lexicographically smallest is the true canonical form
}

// Determines if a configuration is a derivative based on its canonical form.
function isDerivative(config) {
  const canonicalForm = getCanonicalForm(config);
  if (seenConfigs.has(canonicalForm)) {
    return true;
  }
  seenConfigs.add(canonicalForm);
  return false;
}

// --- Main Validation and Processing Function ---

// Entry point for validating a given configuration.
function validateFormula(config) {
  // Clear summary for each run (or manage globally if running many tests)
  // For single test on button click, clearing is fine.
  // If running a batch of tests, clear once before the batch.
  seenConfigs.clear();
  for (const key in summary) delete summary[key];

  const result = {
    totalTiles: config.length,
    isValid: true, // Overall validity (valency, geometry, pip sum)
    isComplete: true, // All pips satisfied
    shapeType: "Unknown",
    pipDistribution: config.map(t => t.pips).sort().join(":"),
    isDerivative: false, // Will be set by processConfiguration
    tilesDetails: [], // Detailed validation for each tile
    validationErrors: [] // Collect specific errors
  };

  // Step 1: Basic structural validations
  if (!isValidPipSum(config)) {
    result.isValid = false;
    result.validationErrors.push("Invalid Pip Sum: Total pips must be even.");
  }
  if (!isGeometricallyValid(config)) {
    result.isValid = false;
    result.validationErrors.push("Invalid Geometry: Tiles overlap or connections are invalid.");
  }
  if (!isValencySatisfied(config)) {
    result.isValid = false;
    result.validationErrors.push("Valency Not Satisfied: Not all pips are used correctly or connections are invalid.");
  }

  // Step 2: Detailed tile validation and chirality
  config.forEach(tile => {
    const tileValency = tile.pips; // Pips define max connections
    const actualBonds = tile.connections ? tile.connections.length : 0;
    const isTileValid = actualBonds === tileValency;
    const tileChirality = getChiralityForTile(tile, config);

    result.tilesDetails.push({
      id: tile.id,
      position: [tile.q, tile.r],
      pips: tile.pips,
      bondsUsed: actualBonds,
      isValid: isTileValid, // If tile's pips are correctly matched by bonds
      chirality: tileChirality
    });

    if (!isTileValid) {
      result.isComplete = false; // A single invalid tile makes the whole formula incomplete
    }
  });

  // Step 3: Shape classification and uniqueness
  if (result.isValid && result.isComplete) { // Only classify valid and complete formulas
    result.shapeType = classifyShape(config);
    result.isDerivative = isDerivative(config); // Check against seen canonical forms
  } else {
      result.isComplete = false; // Explicitly set if any validation failed
  }

  // Update global summary (useful if validateFormula is called in a loop for multiple configs)
  if (result.isValid && result.isComplete) {
      const shape = result.shapeType;
      if (!summary[shape]) summary[shape] = { unique: 0, derivative: 0 };
      summary[shape][result.isDerivative ? 'derivative' : 'unique']++;
  }

  return result;
}

// Logs the summary of unique and derivative shapes found during validation.
function printSummary() {
  console.log('Shape Summary:');
  for (const [shape, counts] of Object.entries(summary)) {
    console.log(`${shape} - unique: ${counts.unique}, derivative: ${counts.derivative}`);
  }
}

// Expose functions to the global scope for use in script.js (if not using modules)
// For cleaner separation, in a real app, you'd use ES6 modules.
// For CodePen/simple file structure, this makes them accessible.
window.validateFormula = validateFormula;
window.getCanonicalForm = getCanonicalForm; // For debugging/display if needed
window.summary = summary; // For accessing the summary outside
window.printSummary = printSummary;
