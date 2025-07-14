const neighborDirs = [
  { q: 1, r: 0 },
  { q: 0, r: 1 },
  { q: -1, r: 1 },
  { q: -1, r: 0 },
  { q: 0, r: -1 },
  { q: 1, r: -1 }
];

let knownFormulas = [];
let generated = [];
let currentIndex = 0;

async function loadKnownFormulas() {
  const res = await fetch('data/knownFormulas.json');
  knownFormulas = await res.json();
}

function labelKnown(result) {
  const match = knownFormulas.find(f =>
    f.valenceCode === result.pipDistribution &&
    f.shapeType === result.shapeType
  );
  if (match) result.name = match.name;
}

function generateFormulas(valenceArray) {
  if (valenceArray.length === 0) return [];
  const results = [];
  const startTile = { id: 1, q: 0, r: 0, pips: valenceArray[0], connections: [] };
  recurse([startTile], new Set(['0,0']), valenceArray.slice(1), results);
  return results;
}

function recurse(current, occupied, remaining, results) {
  if (remaining.length === 0) {
    results.push(JSON.parse(JSON.stringify(current)));
    return;
  }
  const nextPip = remaining[0];
  const rest = remaining.slice(1);
  const nextId = current.length + 1;
  for (const tile of current) {
    for (const dir of neighborDirs) {
      const nq = tile.q + dir.q;
      const nr = tile.r + dir.r;
      const key = `${nq},${nr}`;
      if (occupied.has(key)) continue;
      const newTile = { id: nextId, q: nq, r: nr, pips: nextPip, connections: [{ targetId: tile.id }] };
      tile.connections.push({ targetId: nextId });
      current.push(newTile);
      occupied.add(key);
      recurse(current, occupied, rest, results);
      current.pop();
      occupied.delete(key);
      tile.connections.pop();
    }
  }
}

function showCurrent() {
  if (!generated.length) return;
  const item = generated[currentIndex];
  document.getElementById('output').textContent = JSON.stringify(item.result, null, 2);
  drawFormula(item.config);
}

document.getElementById('runTest').onclick = async () => {
  await loadKnownFormulas();
  const configs = generateFormulas([1, 1]);
  generated = configs.map(cfg => ({ config: cfg, result: (() => { const r = validateFormula(cfg); labelKnown(r); return r; })() }));
  currentIndex = 0;
  showCurrent();
};

document.getElementById('prevVis').onclick = () => {
  if (!generated.length) return;
  currentIndex = (currentIndex - 1 + generated.length) % generated.length;
  showCurrent();
};

document.getElementById('nextVis').onclick = () => {
  if (!generated.length) return;
  currentIndex = (currentIndex + 1) % generated.length;
  showCurrent();
};
