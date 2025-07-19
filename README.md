# Fixation Formula Finder

This project visualizes and validates tile-based formulas built on a hexagonal grid. Open `index.html` in a modern browser to try it out. The main JavaScript logic lives in `validator.js`, while `visualizer.js` handles drawing the board.

Fixation Formula Finder: Functionality Summary
This tool helps systematically discover, classify, and catalog all possible unique tile configurations (Formulas) for the game Fixation, adhering to its specific bonding rules and tile limitations. It offers both an automated generation mode and an interactive building mode, with persistent storage of your discovered catalog.

Key Features:

Persistent Catalog (using localStorage):

Automatic Saving/Loading: All formulas you classify are automatically saved to your browser's local storage and reloaded when you revisit the page. No manual file editing is needed.

Seed Data: Initially loads a set of "Known" formulas from data/knownFormulas.json as a starting point if your local catalog is empty.


Global Uniqueness Tracking: Uses a robust canonicalization algorithm to ensure that topologically identical formulas (even if rotated or reflected) are recognized as the same, preventing duplicates in your catalog.

Chirality Map: `validator.js` exposes `getChiralityForTile()` which converts a tile's connection pattern into a canonical bitstring. Known bitstrings are mapped to short labels like `A`, `AB`, or `ACE`. This aids in instantly spotting rotational or reflection duplicates during generation.

Interactive Formula Builder:

Guided Placement: Start with an empty board and select the pip value (1, 2, or 3) for the next tile. The tool will automatically place it in the first valid adjacent spot.

Real-time Validation: As you place tiles, the current configuration is instantly validated against game rules (pip sum, valency satisfaction, geometric validity, no overlaps) and displayed.

Undo Functionality: Correct mistakes or explore alternative paths by undoing the last tile placement.

Game Rule Adherence: Placement logic strictly follows Fixation's rules, ensuring new tiles bond correctly and respect pip limits.

Automated Formula Generation (Constrained DFS):

Targeted Search: You can specify the Max Tiles (e.g., up to 6 tiles) for the generator to find formulas within a defined size.

Efficient Discovery: Utilizes a constrained Depth-First Search (DFS) algorithm that explores only valid tile placements and bonding sequences according to Fixation's rules.

Queued for Classification: Formulas newly discovered by the generator (that are not yet in your catalog) are added to a queue for your review.

Guided Classification Workflow:

Review Generated Formulas: Browse through the queue of generated formulas using "Prev" and "Next" buttons.

User-Defined Status: For each complete and valid formula, you can classify it with a specific status:

UNIQUE: A new, fundamental geometric shape (e.g., "Chain", "Triangle", "Star"). You provide a custom name for it.

DERIVATIVE: A variation or extension of an existing unique shape (e.g., a longer chain, a triangle with different pips). You can optionally name it.

ECHO: An exact topological duplicate of a formula already in your catalog (e.g., the same shape, but generated via a different placement order or rotation). These are logged once and then skipped.

Visual Confirmation: Each formula is visually rendered on a hexagonal grid, making it easy to confirm its shape and uniqueness.

Catalog Management & Display:

Dynamic List: The "Cataloged Formulas" list on the right panel instantly updates with your classified formulas from localStorage.

Categorized Summary: Provides a quick overview of how many Unique, Derivative, Echo, and Known (seed) formulas you've cataloged.

Interactive Viewing: Click on any formula in the "Cataloged Formulas" list to instantly view its details and visual representation.

How to Use:

Build Interactively: Click "Start New Interactive Formula", select a pip value, and click "Place Tile". Continue building your formula step-by-step. Use "Undo Last Move" if needed.

Generate Automatically: Choose a "Max Tiles" value and click "Generate Formulas". The tool will then present you with a queue of newly discovered formulas.

Classify: For each formula presented from the generated queue, examine it and click "Classify as UNIQUE", "Classify as DERIVATIVE", or "Classify as ECHO" based on your game's rules and your visual assessment.

Browse Catalog: The "Cataloged Formulas" list on the right will grow with your classifications. Click any entry to review its details and visualize it.

This script.js orchestrates a comprehensive and intuitive experience for defining and managing your Fixation game's unique tile configurations.
