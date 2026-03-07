const fs = require("fs");
const path = require("path");

const LOGOS_DROPBOX =
  "/Users/wynand.jordaan/Marionete Dropbox/Marionete Dropbox/Company/Marketing/LOGOS";
const LOGOS_LOCAL = "./logos";
const INPUT_CHOICES = "./logoChoices.json";
const OUTPUT_CHOICES = "./logoChoices.local.json";

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
  const results = [];
  try {
    const resolved = fs.realpathSync(dir);
    if (visited.has(resolved)) return results;
    visited.add(resolved);

    for (const item of fs.readdirSync(dir)) {
      if (item.startsWith(".")) continue;
      const full = path.join(dir, item);
      let stat;
      try {
        stat = fs.statSync(full);
      } catch {
        continue;
      }
      if (stat.isDirectory()) {
        results.push(...getAllImages(full, visited));
      } else if (/\.(png|svg|jpg|jpeg|webp)$/i.test(item)) {
        results.push({ file: item, fullPath: full });
      }
    }
  } catch {
    return results;
  }
  return results;
}

function scoreMatch(img, name) {
  const fileLower = img.file.toLowerCase();
  const fullLower = img.fullPath.toLowerCase();
  const baseName = fileLower.replace(/\.(png|svg|jpg|jpeg|webp)$/, "");
  const searchName = name.toLowerCase().replace(/\.(png|svg|jpg|jpeg|webp)$/, "");
  const ext = path.extname(fileLower);

  const parts = searchName.split("_").filter((t) => t.length > 1);
  const allPartsMatch = parts.every((p) => baseName.includes(p));
  if (!allPartsMatch) return -999;

  let score = 0;
  if (fullLower.includes(path.resolve(LOGOS_LOCAL).toLowerCase())) score += 500;
  if (baseName === searchName) score += 200;
  const normalised = baseName.replace(/[-_\s]/g, "");
  const normName = searchName.replace(/[-_\s]/g, "");
  if (normalised === normName) score += 100;

  if (ext === ".svg") score += 110;
  if (/\b(removebg|transparent|nobg|no-bg|alpha)\b/i.test(fileLower)) score += 80;

  if (/\b(icon|badge|banner|stacked|horizontal|vertical)\b/i.test(fileLower)) score -= 20;
  if (/\b(white|black|dark|light)\b/i.test(fileLower) && !searchName.includes("white")) score -= 35;

  score -= baseName.length * 0.35;
  return score;
}

function findBestMatch(name, allImages) {
  const terms = name.split("_").filter((t) => t.length > 1);
  const pattern = new RegExp(terms.join("|"), "i");
  const matches = allImages
    .filter((img) => pattern.test(img.file))
    .map((img) => ({ ...img, score: scoreMatch(img, name) }))
    .filter((img) => img.score > -999)
    .sort((a, b) => b.score - a.score);
  return matches[0] || null;
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function copyToLocal(name, srcPath) {
  const ext = path.extname(srcPath).toLowerCase() || ".png";
  const targetName = `${name}${ext}`;
  const targetPath = path.resolve(LOGOS_LOCAL, targetName);
  if (path.resolve(srcPath) !== targetPath) fs.copyFileSync(srcPath, targetPath);
  return path.relative(process.cwd(), targetPath).replace(/\\/g, "/");
}

function readInputChoices() {
  if (!fs.existsSync(INPUT_CHOICES)) return {};
  try {
    return JSON.parse(fs.readFileSync(INPUT_CHOICES, "utf8"));
  } catch {
    return {};
  }
}

function main() {
  ensureDir(LOGOS_LOCAL);
  const allImages = [...getAllImages(LOGOS_LOCAL), ...getAllImages(LOGOS_DROPBOX)];
  const inputChoices = readInputChoices();

  const selected = {};
  const missing = [];
  const autoPicked = [];

  for (const name of expected) {
    let sourcePath = inputChoices[name];
    if (sourcePath && !fs.existsSync(sourcePath)) sourcePath = null;

    if (!sourcePath) {
      const best = findBestMatch(name, allImages);
      if (best) {
        sourcePath = best.fullPath;
        autoPicked.push({ name, path: sourcePath, score: best.score });
      }
    }

    if (!sourcePath) {
      missing.push(name);
      continue;
    }

    selected[name] = copyToLocal(name, sourcePath);
  }

  fs.writeFileSync(OUTPUT_CHOICES, JSON.stringify(selected, null, 2));

  console.log(`Wrote ${OUTPUT_CHOICES} (${Object.keys(selected).length} logos).`);
  if (autoPicked.length) {
    console.log("\nAuto-picked:");
    for (const row of autoPicked) {
      console.log(`  - ${row.name} -> ${row.path} (score ${row.score.toFixed(0)})`);
    }
  }
  if (missing.length) {
    console.log("\nMissing:");
    for (const name of missing) console.log(`  - ${name}`);
  }
}

main();
