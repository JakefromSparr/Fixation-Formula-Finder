document.getElementById("runTest").onclick = () => {
  const testConfig = [
    {player: "Black", tile: "B2.1", q:0, r:0, edges:[2,3]},
    {player: "White", tile: "W2.1", q:0, r:1, edges:[0,1]},
    {player: "Black", tile: "B2.2", q:1, r:1, edges:[4,5]}
  ];

  const result = validateFormula(testConfig);
  document.getElementById("output").textContent = JSON.stringify(result, null, 2);

  drawFormula(testConfig);
};
