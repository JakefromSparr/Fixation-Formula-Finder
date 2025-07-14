document.getElementById("runTest").onclick = () => {
  // Minimal sample configuration that matches the structure expected by the
  // validator and visualiser. Each tile has an id, axial coordinates (q,r), the
  // number of pips (valency) and explicit two way connection definitions.
  // This simple chain of two tiles is enough to exercise the validation logic
  // and render something on the canvas.
  const testConfig = [
    {
      id: 1,
      q: 0,
      r: 0,
      pips: 1,
      connections: [{ targetId: 2 }]
    },
    {
      id: 2,
      q: 0,
      r: 1,
      pips: 1,
      connections: [{ targetId: 1 }]
    }
  ];

  const result = validateFormula(testConfig);
  document.getElementById("output").textContent = JSON.stringify(result, null, 2);

  drawFormula(testConfig);
};
