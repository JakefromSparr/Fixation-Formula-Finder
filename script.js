// script.js
let knownFormulas = [];
let generatedFormulas = [];
let currentIndex = 0;
const MAX_FORMULA_TILES = 6; // Limit formula size (e.g., for 6-tile rings)
const MAX_PIPS_PER_TYPE = 3; // Max 3 of each pip type per player (total 6 for both players combined in a formula)

// Global set to track all unique canonical forms found across all starting points/branches
window.globalSeenConfigs = new Set();

// DOM Elements
const runGenerationBtn = document.getElementById('runGeneration');
const prevVisBtn = document.getElementById('prevVis');
const nextVisBtn = document.getElementById('nextVis');
const outputDisplay = document.getElementById('output');
const discoveredFormulasList = document.getElementById('discoveredFormulasList');
const knownFormulasList = document.getElementById('knownFormulasList');
const copyDiscoveredFormulasBtn = document.getElementById('copyDiscoveredFormulas');
const discoveredJsonOutput = document.getElementById('discoveredJsonOutput');

// --- Initialization and Data Loading ---

async function loadKnownFormulas() {
  try {
    const res = await fetch('data/knownFormulas.json');
    knownFormulas = await res.json();
    displayKnownFormulas(); // Display them once loaded
  } catch (error) {
    console.error("Error loading known formulas:", error);
    knownFormulasList.innerHTML = `<p>Error loading known formulas. Check data/knownFormulas.json</p>`;
  }
}

// --- Formula Processing and Generation ---

// Processes a complete, valid formula found by the generator.
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
      if (match) result.name = match.name; // Assign known name if found

      generatedFormulas.push({ config: configCopy, result: result });
      addDiscoveredFormulaToList({ config: configCopy, result: result }); // Add to discovered list
    }
  }
}

// Main DFS Generator function
function generateFormulasDFS() {
  generatedFormulas = []; // Clear previous results
  window.globalSeenConfigs.clear(); // Clear global uniqueness tracker
  for (const key in summary) delete summary[key]; // Clear validator's summary

  discoveredFormulasList.innerHTML = '<p>Generating...</p>'; // Indicate generation in progress

  // Initial call loop: Start with a single tile at (0,0) for each possible pip type.
  for (let startPip = 1; startPip <= 3; startPip++) {
    const initialConfig = [{
      id: 0,
      q: 0, r: 0,
      pips: startPip,
      connections: [],
      currentBonds: 0
    }];

    const initialAvailablePips = { 1: MAX_PIPS_PER_TYPE, 2: MAX_PIPS_PER_TYPE, 3: MAX_PIPS_PER_TYPE };
    initialAvailablePips[startPip]--;

    if (initialAvailablePips[startPip] >= 0) {
      recurseGenerate(initialConfig, initialAvailablePips, null);
    }
  }

  // After generation, update UI
  if (generatedFormulas.length === 0) {
      discoveredFormulasList.innerHTML = '<p>No formulas found with current settings.</p>';
      outputDisplay.textContent = "No formulas generated.";
      drawFormula([]);
  } else {
      currentIndex = 0;
      showCurrentGeneratedFormula();
      // Update discovered list message if it was "Generating..."
      if (generatedFormulas.length > 0 && discoveredFormulasList.querySelector('p')?.textContent === 'Generating...') {
          discoveredFormulasList.innerHTML = ''; // Clear placeholder
      }
  }

  // Final summary to console
  console.log("\n--- Aggregated Shape Summary ---");
  window.printSummary(); // Call the function from validator.js
}

// Recursive function to build formulas following game rules (as previously defined)
function recurseGenerate(currentConfig, availablePips, lastPlacedTileId) {
    const configCopy = JSON.parse(JSON.stringify(currentConfig));
    const availablePipsCopy = { ...availablePips };

    const bondedConfig = attemptAllPossibleBonds(configCopy);

    if (bondedConfig === null) {
        return;
    }
    configCopy.splice(0, configCopy.length, ...bondedConfig);

    const isFormulaComplete = configCopy.every(t => t.currentBonds === t.pips);
    const isValidFinalForm = isFormulaComplete && isValidPipSum(configCopy) && isGeometricallyValid(configCopy);

    if (isValidFinalForm) {
        processFoundFormula(configCopy);
        return;
    }

    if (configCopy.length >= MAX_FORMULA_TILES) {
        return;
    }

    const totalAvailablePipsCount = Object.values(availablePipsCopy).reduce((sum, count) => sum + count, 0);
    const totalUnsatisfiedPipsInConfig = configCopy.reduce((sum, tile) => sum + (tile.pips - tile.currentBonds), 0);

    if (totalAvailablePipsCount === 0 && totalUnsatisfiedPipsInConfig > 0) {
        return;
    }
    if ((totalUnsatisfiedPipsInConfig + totalAvailablePipsCount) % 2 !== 0) {
        return;
    }

    const potentialNextPipsToPlace = [];
    for (let p = 1; p <= 3; p++) {
        if (availablePipsCopy[p] > 0) {
            potentialNextPipsToPlace.push(p);
        }
    }

    if (potentialNextPipsToPlace.length === 0 && !isValidFinalForm) {
        return;
    }

    const potentialPlacementSpots = calculateViablePlacementSpots(configCopy); // Empty spots around existing tiles

    for (const nextPipValue of potentialNextPipsToPlace) {
        const dummySelectedTile = { pips: nextPipValue, remainingPips: nextPipValue };

        for (const spot of potentialPlacementSpots) {
            const isSpotViableInGameLogic = checkIfSpotMeetsGamePlacementRules(
                configCopy,
                spot.q, spot.r,
                dummySelectedTile
            );

            if (!isSpotViableInGameLogic) {
                continue;
            }

            const newTile = {
                id: configCopy.length,
                q: spot.q, r: spot.r,
                pips: nextPipValue,
                connections: [],
                currentBonds: 0
            };

            const nextConfig = JSON.parse(JSON.stringify(configCopy));
            const nextAvailablePips = { ...availablePipsCopy };

            nextConfig.push(newTile);
            nextAvailablePips[nextPipValue]--;

            recurseGenerate(nextConfig, nextAvailablePips, newTile.id);
        }
    }
}


// --- UI Display Functions ---

// Displays the currently selected generated formula
function showCurrentGeneratedFormula() {
    if (!generatedFormulas.length) {
        outputDisplay.textContent = "No formulas generated yet. Adjust settings or run generation.";
        drawFormula([]);
        return;
    }
    const item = generatedFormulas[currentIndex];
    outputDisplay.textContent = JSON.stringify(item.result, null, 2);
    drawFormula(item.config);
}

// Populates the "Known Formulas" list from knownFormulas.json
function displayKnownFormulas() {
    knownFormulasList.innerHTML = ''; // Clear previous list
    if (knownFormulas.length === 0) {
        knownFormulasList.innerHTML = '<p>No known formulas loaded.</p>';
        return;
    }
    knownFormulas.forEach(formulaData => {
        const li = document.createElement('li');
        li.textContent = `${formulaData.name || formulaData.shapeType} (${formulaData.valenceCode})`;
        li.title = formulaData.description || ''; // Add description as tooltip
        li.dataset.valenceCode = formulaData.valenceCode;
        li.dataset.shapeType = formulaData.shapeType;
        li.addEventListener('click', () => {
            const matchingFormula = generatedFormulas.find(gen => 
                gen.result.pipDistribution === formulaData.valenceCode &&
                gen.result.shapeType === formulaData.shapeType &&
                gen.result.name === formulaData.name
            );

            if (matchingFormula) {
                currentIndex = generatedFormulas.indexOf(matchingFormula);
                showCurrentGeneratedFormula();
            } else {
                alert(`Configuration for "${formulaData.name}" not found in generated formulas. It might not have been generated yet or its exact shape is different.`);
            }
        });
        knownFormulasList.appendChild(li);
    });
}

// Adds a newly discovered formula to the "Discovered Formulas" list
function addDiscoveredFormulaToList(item) {
    if (discoveredFormulasList.querySelector('p')?.textContent === 'Generating...') {
        discoveredFormulasList.innerHTML = '';
    }
    const li = document.createElement('li');
    li.textContent = `${item.result.name || item.result.shapeType} (${item.result.pipDistribution})`;
    li.title = item.result.name ? `Known: ${item.result.name}` : 'Newly Discovered';
    if (!item.result.name) {
        li.style.fontWeight = 'bold';
        li.style.backgroundColor = '#d4edda';
    } else {
        li.style.backgroundColor = '#f8f9fa';
    }

    li.addEventListener('click', () => {
        currentIndex = generatedFormulas.indexOf(item);
        showCurrentGeneratedFormula();
    });
    discoveredFormulasList.appendChild(li);
}

// --- Event Listeners ---

runGenerationBtn.addEventListener('click', async () => {
    await loadKnownFormulas();
    generateFormulasDFS();
});

prevVisBtn.addEventListener('click', () => {
    if (!generatedFormulas.length) return;
    currentIndex = (currentIndex - 1 + generatedFormulas.length) % generatedFormulas.length;
    showCurrentGeneratedFormula();
});

nextVisBtn.addEventListener('click', () => {
    if (!generatedFormulas.length) return;
    currentIndex = (currentIndex + 1) % generatedFormulas.length;
    showCurrentGeneratedFormula();
});

copyDiscoveredFormulasBtn.addEventListener('click', () => {
    const formulasToCopy = generatedFormulas.map(item => ({
        name: item.result.name || null,
        valenceCode: item.result.pipDistribution,
        shapeType: item.result.shapeType,
        description: `Discovered formula (${item.result.shapeType}) with pip distribution ${item.result.pipDistribution}.`
    }));
    discoveredJsonOutput.value = JSON.stringify(formulasToCopy, null, 2);
    discoveredJsonOutput.style.display = 'block';
    discoveredJsonOutput.select();
    document.execCommand('copy');
    alert('Discovered formulas copied to clipboard! Paste into data/knownFormulas.json');
});


// Initial load of known formulas when the page loads
loadKnownFormulas();
