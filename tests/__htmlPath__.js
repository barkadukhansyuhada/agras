const fs = require('fs');
const path = require('path');

function findCandidateHtmlFiles(startDir) {
  // Search a few common places for index.html files
  const candidates = [];
  const queue = [startDir];
  while (queue.length) {
    const dir = queue.shift();
    let entries = [];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { continue; }
    for (const entry of entries) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.git')) continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        queue.push(fullPath);
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.html')) {
        candidates.push(fullPath);
      }
    }
  }
  return candidates;
}

function pickHtmlFile() {
  // Preference order:
  // 1) Any HTML containing "Cashflow Dashboard - DRONE AGRASS"
  // 2) Any HTML containing "Utility functions" + "convertToObjects" markers
  // 3) Root-level index.html if present
  const root = process.cwd();

  const candidates = findCandidateHtmlFiles(root);
  const ranked = [];

  for (const file of candidates) {
    let content = '';
    try { content = fs.readFileSync(file, 'utf8'); } catch { continue; }
    const hasTitle = content.includes('Cashflow Dashboard - DRONE AGRASS');
    const hasUtils = content.includes('// Utility functions') && content.includes('convertToObjects');
    const hasTestChart = content.includes('const TestChart') || content.includes('<div id="root">');

    let score = 0;
    if (hasTitle) score += 3;
    if (hasUtils) score += 2;
    if (hasTestChart) score += 1;
    if (score > 0) ranked.push({ file, score });
  }

  ranked.sort((a, b) => b.score - a.score);
  if (ranked.length) return ranked[0].file;

  const rootIndex = path.join(root, 'index.html');
  if (fs.existsSync(rootIndex)) return rootIndex;

  // As a last resort, return the first HTML file if any exist
  const all = findCandidateHtmlFiles(root);
  return all.length ? all[0] : null;
}

module.exports = { pickHtmlFile };