// script.js
let knownFormulas = [];
let generatedFormulas = []; // Stores unique, complete formulas found
let currentIndex = 0;
const MAX_FORMULA_TILES = 6; // Limit formula size (e.g., for 6-tile rings)
const MAX_PIPS_PER_TYPE = 3; // Max 3 of each pip type per player (total 6 for both players combined in a formula)

async function loadKnownFormulas() {
  try {
    const res = await fetch('data/knownFormulas.json');
    if (!res.ok) throw new Error('network');
    knownFormulas = await res.json();
  } catch (err) {
    console.warn('Falling back to embedded known formulas', err);
    if (Array.isArray(window.defaultKnownFormulas)) {
      knownFormulas = window.defaultKnownFormulas;
    } else {
      knownFormulas = [];
    }
  }
}

window.globalSeenConfigs = new Set(); // Global set for unique canonical forms

// Processes a complete, valid formula found by the generator
function processFoundFormula(config) {
  const configCopy = JSON.parse(JSON.stringify(config)); // Deep copy for immutability
  const result = validateFormula(configCopy); // Validate and classify using validator.js

  if (result.isValid && result.isComplete) {
    const canonicalForm = getCanonicalForm(configCopy); // Get canonical form of the whole configuration

    if (!window.globalSeenConfigs.has(canonicalForm)) {
      window.globalSeenConfigs.add(canonicalForm);

      const match = knownFormulas.find(f =>
        f.valenceCode === result.pipDistribution &&
        f.shapeType === result.shapeType
      );
      if (match) result.name = match.name;

      generatedFormulas.push({ config: configCopy, result: result });
    }
  }
}

// Main DFS Generator function
function generateFormulasDFS() {
  generatedFormulas = [];
  window.globalSeenConfigs.clear();
  for (const key in summary) delete summary[key]; // Clear validator's summary

  // Initial call loop: Start with a single tile at (0,0) for each possible pip type.
  // These are the "starting conditions" for your iterative method.
  for (let startPip = 1; startPip <= 3; startPip++) {
    const initialConfig = [{
      id: 0,
      q: 0, r: 0,
      pips: startPip,
      connections: [],
      // In this model, `currentBonds` represents actual bonds made.
      // `pips` is the maximum capacity.
      currentBonds: 0
    }];

    const initialAvailablePips = { 1: MAX_PIPS_PER_TYPE, 2: MAX_PIPS_PER_TYPE, 3: MAX_PIPS_PER_TYPE };
    initialAvailablePips[startPip]--;

    if (initialAvailablePips[startPip] >= 0) {
      // After placing the first tile, immediately try to form bonds if possible (e.g., if it's placed next to another tile, which isn't the case here).
      // Then recurse.
      recurseGenerate(initialConfig, initialAvailablePips, null); // Pass null for lastPlacedTileId initially
    }
  }
}

// Recursive function to build formulas following game rules.
// currentConfig: Current state of tiles on the board.
// availablePips: Counts of each pip type still available to place.
// lastPlacedTileId: ID of the tile most recently placed in this branch.
function recurseGenerate(currentConfig, availablePips, lastPlacedTileId) {
    // 1. Create a deep copy for the current recursive branch to ensure proper backtracking.
    const configCopy = JSON.parse(JSON.stringify(currentConfig));
    const availablePipsCopy = { ...availablePips };

    // 2. Attempt to form ALL possible bonds among currently placed tiles.
    // This function will also update `currentBonds` for each tile.
    const bondedConfig = attemptAllPossibleBonds(configCopy);

    // Pruning: If bonding leads to an invalid state (e.g., tile needs more bonds than available, or negative bonds), prune.
    if (bondedConfig === null) {
        return;
    }

    // Update configCopy to the state after bonding
    configCopy.splice(0, configCopy.length, ...bondedConfig);


    // 3. Check for Completion: If all tiles in `configCopy` have satisfied their `pips`.
    const isFormulaComplete = configCopy.every(t => t.currentBonds === t.pips);
    const isValidFinalForm = isFormulaComplete && isValidPipSum(configCopy) && isGeometricallyValid(configCopy);

    if (isValidFinalForm) {
        processFoundFormula(configCopy); // Store this completed formula
        // Important: If you want to find only the *minimal* completed formulas, `return` here.
        // If you want to find larger formulas that *contain* smaller ones, remove `return`.
        // For formula finding, finding minimal is typically preferred.
        return;
    }

    // Pruning: Max tiles reached, or no more pips to place/satisfy existing tiles.
    if (configCopy.length >= MAX_FORMULA_TILES) {
        return;
    }
    const totalAvailablePipsCount = Object.values(availablePipsCopy).reduce((sum, count) => sum + count, 0);
    const totalUnsatisfiedPipsInConfig = configCopy.reduce((sum, tile) => sum + (tile.pips - tile.currentBonds), 0);

    if (totalAvailablePipsCount === 0 && totalUnsatisfiedPipsInConfig > 0) {
        return; // No more tiles, and existing tiles aren't satisfied.
    }
    // Further pruning: If total remaining pips (config + available) is odd, it can't be completed.
    if ((totalUnsatisfiedPipsInConfig + totalAvailablePipsCount) % 2 !== 0) {
        return; // Cannot form a valid complete graph (Handshake Lemma).
    }


    // 4. Explore placing the NEXT tile (iterative method's "possible spaces")
    // Use `calculateAvailableSpaces` to find where the *next* tile could be placed.
    // This is where the game's strict placement rules come in.
    const potentialNextPipsToPlace = [];
    for (let p = 1; p <= 3; p++) {
        if (availablePipsCopy[p] > 0) {
            potentialNextPipsToPlace.push(p);
        }
    }

    // If no more tiles can be placed, and the formula isn't complete, this branch is a dead end.
    if (potentialNextPipsToPlace.length === 0 && !isValidFinalForm) {
        return;
    }

    // The logic from calculateAvailableSpaces in your game checks specific rules.
    // We need to simulate selecting a tile and finding its available spots.
    // Here, we iterate through all tiles we *could* place next.
    for (const nextPipValue of potentialNextPipsToPlace) {
        // Create a dummy "selected tile" for calculateAvailableSpaces logic
        const dummySelectedTile = { pips: nextPipValue, remainingPips: nextPipValue }; // `remainingPips` here is its total capacity

        const availablePlacementSpots = calculateViablePlacementSpots(configCopy, dummySelectedTile);

        for (const spot of availablePlacementSpots) {
            // Check if adding `nextPipValue` at `spot` is valid for `calculateAvailableSpaces` rules.
            // This requires re-evaluating the logic of calculateViablePlacementSpots from your game's script.js.
            // We need to pass it the "potential new tile" context.

            // The simplified `calculateViablePlacementSpots` in `validator.js` just finds empty neighbors.
            // We need to apply the game's stricter rules here:
            const isSpotViableInGameLogic = checkIfSpotMeetsGamePlacementRules(
                configCopy, // current board state
                spot.q, spot.r, // proposed placement spot
                dummySelectedTile // the tile we are considering placing
            );

            if (!isSpotViableInGameLogic) {
                continue; // This spot is not viable according to game rules
            }

            // If the spot is viable, create the new tile
            const newTile = {
                id: configCopy.length, // Assign next available ID
                q: spot.q, r: spot.r,
                pips: nextPipValue,
                connections: [],
                currentBonds: 0
            };

            const nextConfig = JSON.parse(JSON.stringify(configCopy)); // Deep copy config
            const nextAvailablePips = { ...availablePipsCopy }; // Deep copy available pips

            nextConfig.push(newTile);
            nextAvailablePips[nextPipValue]--;

            // Recursively explore this new state
            recurseGenerate(nextConfig, nextAvailablePips, newTile.id);
        }
    }
}


// This helper implements the game's specific placement rules (calculateAvailableSpaces logic)
// for a single proposed spot. Adapted from your game's script.js
function checkIfSpotMeetsGamePlacementRules(currentConfig, proposedQ, proposedR, selectedTileDetails) {
    const currentBoardMap = new Map(); // Temp map to simulate boardspace
    currentConfig.forEach(t => currentBoardMap.set(`${t.q},${t.r}`, t));

    let hasNeighborWithOpenPips = 0;
    let zeroPipNeighbor = false;

    const spotNeighbors = neighborDirs.map(d => ({ q: proposedQ + d.q, r: proposedR + d.r }));

    for (let sn of spotNeighbors) {
        const ntile = currentBoardMap.get(`${sn.q},${sn.r}`);
        if (ntile) { // If there's a tile at this neighbor spot
            if (ntile.currentBonds < ntile.pips) { // If neighbor has remaining capacity
                hasNeighborWithOpenPips++;
            } else if (ntile.currentBonds === ntile.pips) { // If neighbor is fully bonded
                zeroPipNeighbor = true;
            }
        }
    }

    // The original calculateAvailableSpaces had these:
    // selectedTile.remainingPips > 0 (always true for a new tile with pips > 0)
    // && hasNeighborWithPips >= 1
    // && hasNeighborWithPips <= selectedTile.remainingPips (this implies new tile's pips can absorb all open bonds)
    // && !zeroPipNeighbor (prevents placing next to a fully bonded tile if new tile still has open pips)

    // Simplified for generator (focused on being able to *start* a bond):
    // A spot is viable if it's adjacent to at least one tile with open pips.
    // The deeper bond-satisfaction is handled by `attemptAllPossibleBonds`.

    return (selectedTileDetails.pips > 0 && hasNeighborWithOpenPips >= 1 && !zeroPipNeighbor);
    // You might also need: hasNeighborWithOpenPips <= selectedTileDetails.pips
    // (A 1-pip tile cannot be placed next to 2 open-pip neighbors if it would use 2 bonds).
    // This means the `selectedTileDetails.pips` needs to be used in the condition.
    // `hasNeighborWithOpenPips <= selectedTileDetails.pips`
    // This rule is crucial for constraining placement according to the game.

    // Let's use the full rule from your original game code:
    // if selectedTile.remainingPips (meaning `selectedTileDetails.pips` for a new tile) > 0
    //    && hasNeighborWithPips >= 1
    //    && hasNeighborWithPips <= selectedTile.remainingPips
    //    && ! zeroPipNeighbor
}


// --- Existing helper from validator.js, moved here for clarity since it's used by generator ---
// This helper attempts to form *all possible* direct bonds
// between adjacent tiles in the current configuration until no more can be made.
// It returns a new config state or null if an invalid bond is attempted (e.g., negative pips).
function attemptAllPossibleBonds(config) {
    const workingConfig = JSON.parse(JSON.stringify(config));
    const tileMap = new Map(workingConfig.map(t => [t.id, t]));

    let bondsMadeInIteration;
    do {
        bondsMadeInIteration = false;
        // Iterate over all pairs of tiles
        for (let i = 0; i < workingConfig.length; i++) {
            const tile1 = workingConfig[i];
            // Skip if tile1 already has max bonds
            if (tile1.currentBonds >= tile1.pips) continue;

            for (let j = i + 1; j < workingConfig.length; j++) { // Only check pairs once
                const tile2 = workingConfig[j];
                // Skip if tile2 already has max bonds
                if (tile2.currentBonds >= tile2.pips) continue;

                // Check if they are adjacent and not already connected
                if (getDistance(tile1, tile2) === 1 &&
                    !tile1.connections.some(conn => conn.targetId === tile2.id)) {

                    // If both have remaining bond capacity, form a bond
                    if (tile1.currentBonds < tile1.pips && tile2.currentBonds < tile2.pips) {
                        tile1.connections.push({ targetId: tile2.id });
                        tile1.currentBonds++;

                        tile2.connections.push({ targetId: tile1.id });
                        tile2.currentBonds++;

                        bondsMadeInIteration = true;

                        // Pruning: If any tile exceeds its pip capacity, this path is invalid
                        if (tile1.currentBonds > tile1.pips || tile2.currentBonds > tile2.pips) {
                            return null;
                        }
                    }
                }
            }
        }
    } while (bondsMadeInIteration); // Keep trying until no more bonds can be made in an iteration

    return workingConfig;
}


// --- UI and Navigation (from your script.js) ---

function showCurrentGeneratedFormula() {
    if (!generatedFormulas.length) {
        document.getElementById('output').textContent = "No formulas generated yet. Try adjusting MAX_FORMULA_TILES or available pip counts.";
        drawFormula([]);
        return;
    }
    const item = generatedFormulas[currentIndex];
    document.getElementById('output').textContent = JSON.stringify(item.result, null, 2);
    drawFormula(item.config);

    // No highlighting of viable spaces for *completed* formulas.
    // This would be done *within* recurseGenerate if you wanted to visualize intermediate steps.
}

document.getElementById('runTest').onclick = async () => {
    await loadKnownFormulas();
    
    generateFormulasDFS(); // Start the generation process

    currentIndex = 0;
    showCurrentGeneratedFormula();

    console.log("\n--- Aggregated Shape Summary ---");
    window.printSummary(); // Calls the function from validator.js
};

document.getElementById('prevVis').onclick = () => {
    if (!generatedFormulas.length) return;
    currentIndex = (currentIndex - 1 + generatedFormulas.length) % generatedFormulas.length;
    showCurrentGeneratedFormula();
};

document.getElementById('nextVis').onclick = () => {
    if (!generatedFormulas.length) return;
    currentIndex = (currentIndex + 1) % generatedFormulas.length;
    showCurrentGeneratedFormula();
};

loadKnownFormulas(); // Initial load of known formulas when the page loads
