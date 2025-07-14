## Project: Fixation Formula Finder
This is an interactive tool for generating, validating, and visualizing valid configurations (formulas) for the board game *Fixation* by Sparr Games. The tool explores tile bonding patterns, verifies completion conditions, and renders hex-based diagrams using canvas.
---
## File/Folder Overview
- `index.html` – UI with canvas rendering + control buttons.
- `script.js` – Main logic: generation, validation, rendering, UI controls.
- `validator.js` – Handles validation logic for completed formulas.
- `knownFormulas.json` – Seed list of canonical formulas (pip-distribution + shape-type).
- `style.css` – Canvas and layout styling.
- `data/` – Holds known formulas and potentially saved generated ones.
- `src/` – (Optional) For any modularized tools as project expands.
---
## Agent Instructions
Codex, when running in this repo:
1. Start in `script.js` unless otherwise specified.
2. Use `MAX_FORMULA_TILES = 6` and `MAX_PIPS_PER_TYPE = 3` as constraints unless overridden in prompt.
3. Run generation via the `generateFormulasDFS()` function.
4. Validate formulas with `validateFormula()` (from `validator.js`) before logging or rendering them.
5. Output results in both:
   - JSON object (summary, pipDistribution, isComplete, etc.)
   - Visual board layout using `drawFormula()`.
---
## How to Validate Changes
> Run these before submitting a PR or asking Codex to verify changes.
```bash
# Install JavaScript dev dependencies (if any added later)
pnpm install
# Run linter (if configured)
pnpm lint
# Run tests (if added)
pnpm test
