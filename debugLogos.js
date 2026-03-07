const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const LOGOS_DROPBOX = '/Users/wynand.jordaan/Marionete Dropbox/Marionete Dropbox/Company/Marketing/LOGOS';
const LOGOS_LOCAL   = './logos';  // local cache — always wins
const OUTPUT_HTML = './logoChooser.html';
const OUTPUT_JSON = './logoChoices.json';

const expected = [
  "confluent",
  "databricks",
  "databricks_notebooks",
  "dbt",
  "git",
  "grpc",
  "kafka",
  "ai_ml",
  "delta_lake",
  "parquet",
  "iceberg",
  "mlflow",
  "mongodb",
  "snowflake",
  "salesforce",
  "mysql",
  "postgresql",
  "Marionete_logo", 
];

function getAllImages(dir, visited = new Set()) {
  let results = [];
  try {
    // Resolve symlinks to avoid infinite loops
    const resolved = fs.realpathSync(dir);
    if (visited.has(resolved)) return results;
    visited.add(resolved);

    fs.readdirSync(dir).forEach(item => {
      if (item.startsWith('.')) return;
      const full = path.join(dir, item);
      try {
        const stat = fs.statSync(full); // statSync follows symlinks
        if (stat.isDirectory()) {
          results = results.concat(getAllImages(full, visited));
        } else if (/\.(png|svg|jpg|jpeg|webp)$/i.test(item)) {
          results.push({ file: item, fullPath: full });
        }
      } catch(e) {} // skip broken symlinks
    });
  } catch (e) {}
  return results;
}

function scoreMatch(img, name) {
  const fileLower = img.file.toLowerCase();
  const fullLower = img.fullPath.toLowerCase();
  const baseName  = fileLower.replace(/\.(png|svg|jpg|jpeg|webp)$/, '');
  const searchName = name.toLowerCase().replace(/\.(png|svg|jpg|jpeg|webp)$/, '');
    let score = 0;
    // If the search name contains an underscore and looks like a filename,
    // require the base filename to contain ALL parts
    const parts = searchName.split('_').filter(t => t.length > 1);
    const allPartsMatch = parts.every(p => baseName.includes(p));
    if (!allPartsMatch) return -999;  // disqualify immediately
  // Local cache always wins
  if (fullLower.includes(LOGOS_LOCAL.replace('./', ''))) score += 500;

  // Exact filename match
  if (baseName === searchName) score += 200;
  const normalised = baseName.replace(/[-_]/g, '');
  const normName = name.replace(/[-_]/g, '').toLowerCase();
  if (normalised === normName) score += 80;
  score -= baseName.length * 0.5;
  if (fileLower.includes('removebg')) score += 30;
  if (fullLower.includes('tech')) score += 20;
  ['notebook', 'icon', 'badge', 'banner', 'stacked', 'horizontal', 'vertical', 'white', 'black', 'dark', 'light', 'logo']
    .forEach(w => { if (fileLower.includes(w) && !name.toLowerCase().includes(w)) score -= 25; });

  return score;
}

// Build matches data
const allImages = [
  ...getAllImages(LOGOS_LOCAL),
  ...getAllImages(LOGOS_DROPBOX),
];
// DEBUG — log Marionete file path and generated URL
const mariFiles = allImages.filter(f => f.file.toLowerCase().includes('marionete'));
if (mariFiles.length === 0) {
  console.log('⚠️  No Marionete files found in either folder');
} else {
  mariFiles.forEach(f => {
    console.log('✅ Found:', f.fullPath);
    console.log('   URL:  ', 'file://' + encodeURI(f.fullPath));
  });
}

const logoData = expected.map(name => {
  const terms = name.split('_').filter(t => t.length > 1);
  const pattern = new RegExp(terms.join('|'), 'i');
  const matches = allImages
    .filter(img => pattern.test(img.file))
    .map(img => ({ ...img, score: scoreMatch(img, name) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
  return { name, matches };
});

// Generate HTML
const cards = logoData.map(({ name, matches }) => {
  if (matches.length === 0) {
    return `
      <div class="card no-match">
        <h3>${name}</h3>
        <p class="none">❌ No matches found</p>
      </div>`;
  }

  const options = matches.map((m, i) => {
    // Convert to file:// URL for local display
    const fileUrl = 'file://' + encodeURI(path.resolve(m.fullPath));
    const isSvg = m.file.toLowerCase().endsWith('.svg');
    const imgTag = `<img src="${fileUrl}" alt="${m.file}" onerror="this.parentElement.classList.add('broken')" />`;
    
    return `
      <div class="option ${i === 0 ? 'recommended' : ''}" 
           onclick="selectLogo('${name}', '${m.fullPath.replace(/'/g, "\\'")}', this)"
           title="${m.fullPath}">
        ${i === 0 ? '<span class="crown">👑</span>' : ''}
        <div class="img-wrap">${imgTag}</div>
        <div class="filename">${m.file}</div>
        <div class="filepath" onclick="event.stopPropagation()">${m.fullPath}</div>
        <div class="score">score: ${m.score.toFixed(0)}</div>
      </div>`;
  }).join('');

  return `
    <div class="card" id="card-${name}">
      <h3>${name}</h3>
      <div class="options">${options}</div>
      <div class="selected-path" id="selected-${name}"></div>
    </div>`;
}).join('');

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Logo Chooser</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #0f0f13;
      color: #e0e0e0;
      padding: 30px;
    }
    h1 { color: #a78bfa; margin-bottom: 8px; font-size: 24px; }
    .subtitle { color: #888; margin-bottom: 30px; font-size: 14px; }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(420px, 1fr));
      gap: 16px;
    }

    .card {
      background: #1a1a24;
      border: 1px solid #2a2a3a;
      border-radius: 10px;
      padding: 16px;
      transition: border-color 0.2s;
    }
    .card.done { border-color: #4ade80; }
    .card.no-match { opacity: 0.5; }
    .card h3 {
      font-size: 13px;
      font-weight: 600;
      color: #a78bfa;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 12px;
    }

    .options { display: flex; gap: 10px; }

    .option {
      flex: 1;
      background: #12121a;
      border: 2px solid #2a2a3a;
      border-radius: 8px;
      padding: 10px 8px;
      cursor: pointer;
      text-align: center;
      position: relative;
      transition: all 0.15s;
    }
    .option:hover { border-color: #7c3aed; background: #1e1e2e; }
    .option.selected { border-color: #4ade80; background: #0f2a1a; }
    .option.recommended { border-color: #4c1d95; }
    .option.broken { opacity: 0.4; }

    .crown {
      position: absolute;
      top: 4px; right: 6px;
      font-size: 12px;
    }

    .img-wrap {
      height: 60px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 8px;
    }
    .img-wrap img {
      max-width: 100%;
      max-height: 60px;
      object-fit: contain;
    }

    .filename {
      font-size: 10px;
      color: #888;
      word-break: break-all;
      line-height: 1.3;
    }
    .filepath {
      font-size: 9px;
      color: #3a3a5a;
      word-break: break-all;
      line-height: 1.4;
      margin-top: 4px;
      text-align: left;
      cursor: text;
      user-select: all;
      padding: 3px 4px;
      border-radius: 3px;
      transition: color 0.15s, background 0.15s;
    }
    .filepath:hover {
      color: #a78bfa;
      background: #1e1e2e;
    }
    .score {
      font-size: 10px;
      color: #555;
      margin-top: 4px;
    }

    .selected-path {
      margin-top: 10px;
      font-size: 11px;
      color: #4ade80;
      min-height: 16px;
      word-break: break-all;
    }

    .none { color: #555; font-size: 13px; }

    .footer {
      margin-top: 30px;
      display: flex;
      gap: 12px;
      align-items: center;
    }
    button {
      background: #5d35b1;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }
    button:hover { background: #7c3aed; }
    button.secondary { background: #2a2a3a; }
    button.secondary:hover { background: #3a3a4a; }
    #status { font-size: 13px; color: #888; }
  </style>
</head>
<body>
  <h1>🎨 Logo Chooser</h1>
  <p class="subtitle">Click to select the best logo for each component. 👑 = recommended match.</p>

  <div class="grid">${cards}</div>

  <div class="footer">
    <button onclick="saveChoices()">💾 Save Choices → logoChoices.json</button>
    <button class="secondary" onclick="autoSelectAll()">👑 Auto-select all recommended</button>
    <span id="status"></span>
  </div>

  <script>
    const choices = {};

    function selectLogo(name, fullPath, el) {
      // Deselect others in same card
      el.closest('.card').querySelectorAll('.option').forEach(o => o.classList.remove('selected'));
      el.classList.add('selected');
      el.closest('.card').classList.add('done');
      choices[name] = fullPath;
      document.getElementById('selected-' + name).textContent = '✅ ' + fullPath.split('/').pop();
      updateStatus();
    }

    function autoSelectAll() {
      document.querySelectorAll('.option.recommended').forEach(el => {
        const card = el.closest('.card');
        const name = card.id.replace('card-', '');
        const path = el.getAttribute('onclick').match(/'([^']+)',\\s*this/)[1];
        selectLogo(name, path, el);
      });
    }

    function updateStatus() {
      const total = document.querySelectorAll('.card:not(.no-match)').length;
      const done = Object.keys(choices).length;
      document.getElementById('status').textContent = done + ' / ' + total + ' selected';
    }

    function saveChoices() {
      const json = JSON.stringify(choices, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'logoChoices.json';
      a.click();
      document.getElementById('status').textContent = '✅ Saved to logoChoices.json — move it to your repo folder!';
    }

    // Auto-select on load
    window.onload = () => autoSelectAll();
  </script>
</body>
</html>`;

fs.writeFileSync(OUTPUT_HTML, html);
console.log(`\n✅ Generated ${OUTPUT_HTML}`);
console.log(`   Opening in browser...\n`);

// Open in default browser
execSync(`open ${OUTPUT_HTML}`);