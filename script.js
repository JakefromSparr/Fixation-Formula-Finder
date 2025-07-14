// script.js
let knownFormulas = [];
let generatedFormulas = []; // Renamed from 'generated' for clarity
let currentIndex = 0;
const MAX_FORMULA_TILES = 6; // Max tiles for formulas (e.g., 6 for a ring)
const MAX_PIPS_PER_TYPE = 3; // Max 3 of each pip type per player (total 6 of each type for both players).
                             // If a formula can use up to 6 of a single pip type, this is the correct limit.
                             // Example: [1,1,1,1,1,1] means 6 x 1-pip tiles.

async function loadKnownFormulas() {
  const res = await fetch('data/knownFormulas.json');
  knownFormulas = await res.json();
}

// This function will be called by the generator for each *completed* valid formula.
function processFoundFormula(config) {
    // Deep copy config to ensure it's immutable for storage
    const configCopy = JSON.parse(JSON.stringify(config));
    
    // Validate and classify using the validator.js functions
    const result = validateFormula(configCopy); // validateFormula internally clears seenConfigs and summary for THIS run
                                               // We'll manage uniqueness more robustly for overall generation later.

    if (result.isValid && result.isComplete) {
        // Tag with known formula name if it matches
        const match = knownFormulas.find(f =>
            f.valenceCode === result.pipDistribution &&
            f.shapeType === result.shapeType
        );
        if (match) result.name = match.name;

        // Check if this specific canonical form has already been found across ALL generation
        // (This needs to be outside validateFormula, as validateFormula is per-call)
        const canonicalForm = getCanonicalForm(configCopy); // Get canonical form of the whole configuration
        if (!window.globalSeenConfigs.has(canonicalForm)) { // Use a global tracker
            window.globalSeenConfigs.add(canonicalForm);
            generatedFormulas.push({ config: configCopy, result: result });
            // console.log("Found UNIQUE Formula:", result.shapeType, result.pipDistribution, "ID:", configCopy.map(t => t.id).join('-'));
        }
    }
}

// Global set to track all unique canonical forms found across all starting points/branches
// This needs to be available to script.js and validator.js.
// Since validator.js sets `seenConfigs` internally for *its* run, we need a separate one here for global.
window.globalSeenConfigs = new Set();


// DFS Generator
function generateFormulasDFS() {
    generatedFormulas = []; // Clear previous results
    window.globalSeenConfigs.clear(); // Clear global uniqueness tracker
    for (const key in summary) delete summary[key]; // Clear summary (from validator.js)

    // Try starting with each pip type at (0,0)
    // We limit max tiles to 5 for now to prevent excessive computation.
    // Max 6 for ring: [2,2,2,2,2,2]
    for (let startPip = 1; startPip <= 3; startPip++) {
        // Create initial config for this starting pip
        const startConfig = [{
            id: 0, // Start IDs from 0 for consistency
            q: 0, r: 0,
            pips: startPip,
            connections: [],
            remainingPips: startPip
        }];
        const initialAvailablePips = { 1: MAX_PIPS_PER_TYPE, 2: MAX_PIPS_PER_TYPE, 3: MAX_PIPS_PER_TYPE };
        initialAvailablePips[startPip]--; // Decrement the starting tile's pip count

        // Only proceed if starting tile is available (e.g., if MAX_PIPS_PER_TYPE was 0 for some reason)
        if (initialAvailablePips[startPip] >= 0) {
            recurseGenerate(startConfig, initialAvailablePips);
        }
    }
}

// Recursive function to build formulas
function recurseGenerate(currentConfig, availablePips) {
    // Pruning 1: If current config has too many tiles, stop this branch.
    if (currentConfig.length > MAX_FORMULA_TILES) {
        return;
    }

    // Attempt to bond any and all open pips on newly added tiles or existing tiles.
    // This is crucial. We try to form ALL possible bonds at each step.
    const configAfterBondingAttempts = tryAllPossibleBonds(currentConfig);

    // If bonding led to an invalid state (e.g., negative pips), prune this branch
    if (configAfterBondingAttempts === null) {
        return;
    }

    // Check if the current config is valid and complete (all pips satisfied)
    // AND passes all validator checks before processing
    if (configAfterBondingAttempts.every(t => t.remainingPips === 0)) {
        // This is a candidate for a completed formula
        processFoundFormula(configAfterBondingAttempts);
        // Important: Do NOT return here if you want to explore larger formulas
        // that contain smaller completed ones as subgraphs.
        // However, for typical "formula finding", you want the smallest complete instance.
        // If you return, it will find the smallest version of a chain first, then stop.
        // If you don't return, a 1-1 chain (complete) will lead to 1-1-X (incomplete) etc.
        // For distinct formula finding, returning is usually desired once a complete one is found.
        // Let's keep `return` for now to find minimal formulas.
        // If you want to find "max-length chains" or "rings that might have internal branches",
        // then the return logic needs to be revisited.
        return;
    }

    // Pruning 2: If no pips are left to connect (total available pips is 0) but not all tiles are satisfied
    const totalRemainingPips = Object.values(availablePips).reduce((sum, count) => sum + count, 0) +
                               currentConfig.reduce((sum, tile) => sum + tile.remainingPips, 0);
    if (totalRemainingPips === 0 && currentConfig.some(t => t.remainingPips > 0)) {
        return; // No more pips left to satisfy current tiles. Dead end.
    }


    // --- Explore expanding the configuration ---

    // Option 1: Add a new tile to an existing one
    // Iterate over existing tiles to find spots to place new tiles next to them.
    // The `calculateViablePlacementSpots` helps prune impossible locations early.
    const potentialPlacementSpots = calculateViablePlacementSpots(currentConfig, 1); // Pass selectedTilePips=1 for now as a generic placeholder
                                                                                    // It's mostly checking for empty neighbors

    for (const spot of potentialPlacementSpots) {
        // Try placing each available pip type (1, 2, 3) at this spot
        for (let newPipValue = 1; newPipValue <= 3; newPipValue++) {
            if (availablePips[newPipValue] > 0) { // If this pip type is available
                // Create a new tile for this attempt
                const newTile = {
                    id: currentConfig.length, // Assign unique ID based on array index
                    q: spot.q, r: spot.r,
                    pips: newPipValue,
                    connections: [],
                    remainingPips: newPipValue
                };

                // Create deep copies for the next recursive call
                const nextConfig = JSON.parse(JSON.stringify(configAfterBondingAttempts)); // Use the state *after* initial bonds
                const nextAvailablePips = { ...availablePips };
                nextAvailablePips[newPipValue]--;

                nextConfig.push(newTile); // Add the new tile

                // Recurse with the new state (bonds will be attempted in the next `tryAllPossibleBonds` call)
                recurseGenerate(nextConfig, nextAvailablePips);
            }
        }
    }
}

// This helper attempts to form *all possible* direct bonds
// between adjacent tiles in the current configuration until no more can be made.
// It returns a new config state or null if an invalid bond is attempted.
function tryAllPossibleBonds(config) {
    const workingConfig = JSON.parse(JSON.stringify(config));
    const tileMap = new Map(workingConfig.map(t => [t.id, t]));

    let bondsMadeInIteration;
    do {
        bondsMadeInIteration = false;
        // Iterate over all pairs of tiles
        for (let i = 0; i < workingConfig.length; i++) {
            const tile1 = workingConfig[i];
            if (tile1.remainingPips <= 0) continue;

            for (let j = i + 1; j < workingConfig.length; j++) { // Only check pairs once
                const tile2 = workingConfig[j];
                if (tile2.remainingPips <= 0) continue;

                // Check if they are adjacent and not already connected
                if (getDistance(tile1, tile2) === 1 &&
                    !tile1.connections.some(conn => conn.targetId === tile2.id)) {

                    // If both have remaining pips, form a bond
                    if (tile1.remainingPips > 0 && tile2.remainingPips > 0) {
                        tile1.connections.push({ targetId: tile2.id });
                        tile1.remainingPips--;

                        tile2.connections.push({ targetId: tile1.id });
                        tile2.remainingPips--;

                        bondsMadeInIteration = true;

                        // Pruning: If any tile goes negative pips, this path is invalid
                        if (tile1.remainingPips < 0 || tile2.remainingPips < 0) {
                            return null;
                        }
                    }
                }
            }
        }
    } while (bondsMadeInIteration); // Keep trying until no more bonds can be made in an iteration

    return workingConfig;
}


function showCurrentGeneratedFormula() {
    if (!generatedFormulas.length) {
        document.getElementById('output').textContent = "No formulas generated yet. Try increasing MAX_FORMULA_TILES.";
        drawFormula([]);
        return;
    }
    const item = generatedFormulas[currentIndex];
    document.getElementById('output').textContent = JSON.stringify(item.result, null, 2);
    drawFormula(item.config);

    // Optionally, draw viable spaces for the CURRENT formula's state (for debug/visualization)
    // For a *completed* formula, there are no viable spaces left to highlight.
    // This is more useful for visualizing *in-progress* formula building.
    // But to draw them, we'd need to simulate a partial config and call drawHighlightedSpaces.
    // Example (conceptual, for debugging the generator):
    // const partialConfig = item.config.slice(0, item.config.length - 1); // Remove last tile
    // const viableSpots = calculateViablePlacementSpots(partialConfig, item.config[item.config.length-1].pips);
    // drawHighlightedSpaces(viableSpots, partialConfig);
}


document.getElementById('runTest').onclick = async () => {
    await loadKnownFormulas(); // Load known formulas from JSON
    
    // Start the generation process
    // This will populate `generatedFormulas` with unique, valid, and complete formulas
    generateFormulasDFS();

    // After generation, reset current index and display the first generated formula
    currentIndex = 0;
    showCurrentGeneratedFormula();

    // Print the aggregated summary from validator.js after all generation is done
    console.log("\n--- Aggregated Shape Summary ---");
    // `window.summary` is managed internally by validateFormula.
    // The `printSummary` function from validator.js should be called here.
    window.printSummary(); // Call the function from validator.js
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

// Initial load of known formulas when the page loads
loadKnownFormulas();
