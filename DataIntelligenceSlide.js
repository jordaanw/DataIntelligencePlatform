const pptxgen = require("pptxgenjs");
const fs = require("fs");
const path = require("path");

// Colours
const C = {
  // Platform & UI
  purple:      "5D35B1",   // Marionete purple - main platform
  purpleDark:  "7030A0",   // NGHC purple - lakehouse bar
  purpleDeep:  "2D1B69",   // deep purple - section headers
  purplePale:  "EDE8F9",   // pale purple - fill backgrounds

  // Source inputs - teal green
  srcHeader:   "1A7A5E",   // green header for source boxes
  srcBody:     "E8F5F0",   // very light green body fill

  // Neutrals
  white:       "FFFFFF",
  dark:        "1A1A1A",
  darkNav:     "2D1B69",   // replaces pure black - deep purple instead
  gray:        "F2F2F2",
  grayBorder:  "CCCCCC",
  grayMid:     "E4E4E4",
  grayDark:    "888888",
};


// Prefer local, stable logo mapping for reproducible builds.
const choicesPath = fs.existsSync("./logoChoices.local.json")
  ? "./logoChoices.local.json"
  : "./logoChoices.json";
const choices = JSON.parse(fs.readFileSync(choicesPath, "utf8"));

function logo(name) {
  const filePath = choices[name];
  if (!filePath) {
    console.warn(`  ⚠️  No choice found for: ${name}`);
    return null;
  }
  if (!fs.existsSync(filePath)) {
    console.warn(`  ⚠️  File not found: ${filePath}`);
    return null;
  }
  const ext = path.extname(filePath).toLowerCase();
  const data = fs.readFileSync(filePath).toString('base64');
  const mime = ext === '.svg' ? 'image/svg+xml' : 
               ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 
               'image/png';
  return `${mime};base64,${data}`;
}

// Helper to add an image if it exists, else skip
function addLogo(slide, name, x, y, w, h) {
  const data = logo(name);
  if (data) slide.addImage({ data, x, y, w, h });
}

function sectionHeader(slide, x, y, w, h, label, opts = {}) {
  slide.addShape("rect", { x, y, w, h, fill: { color: opts.fill || C.darkNav }, line: { color: opts.fill || C.darkNav, width: 0 } });
  slide.addText(label, { x, y, w, h, fontSize: opts.fontSize || 8, color: C.white, bold: true, align: "center", valign: "middle" });
}

function container(slide, x, y, w, h, opts = {}) {
  slide.addShape("rect", {
    x, y, w, h,
    fill: { color: opts.fill || C.white },
    line: { color: opts.borderColor || C.grayBorder, width: opts.lineW || 0.75, dashType: opts.dash || "solid" },
  });
}

function pill(slide, x, y, w, h, label, opts = {}) {
  slide.addShape("rect", { x, y, w, h, fill: { color: opts.fill || C.purple }, line: { color: opts.fill || C.purple, width: 0 }, rectRadius: 0.08 });
  slide.addText(label, { x, y, w, h, fontSize: opts.fontSize || 6.5, color: opts.textColor || C.white, bold: true, align: "center", valign: "middle", wrap: true, margin: 1 });
}

function arrowRight(slide, x, y, w) {
  slide.addShape("line", { x, y, w, h: 0, line: { color: C.dark, width: 1.2, endArrowType: "arrow" } });
}

(async () => {
  const pres = new pptxgen();
  pres.layout = "LAYOUT_WIDE"; // 13.3" x 7.5"
  const slide = pres.addSlide();
  slide.background = { color: C.white };

  // Title
  slide.addText("Data Intelligence Platform", {
    x: 0.15, y: 0.08, w: 13, h: 0.32,
    fontSize: 14, color: C.purple, bold: true,
  });

  // ══════════════════════════════════════════
  // LEFT COLUMN — Source boxes
  // ══════════════════════════════════════════
  const srcX = 0.08, srcW = 2.1;

  // Helper: source box — icons only if logo available, text fallback
  // Layout: 3 columns, big icons
  function sourceBox(title, yStart, boxH, rows) {
    const COLS = 3;
    const ICON_SIZE = 0.38;       // icon display size in inches
    const CELL_H = 0.46;          // height per cell
    const HEADER_H = 0.25;
    const colW = (srcW - 0.1) / COLS;

    sectionHeader(slide, srcX, yStart, srcW, HEADER_H, title, { fontSize: 7.5, fill: C.srcHeader });
    container(slide, srcX, yStart + HEADER_H, srcW, boxH - HEADER_H, {
      fill: C.srcBody, borderColor: C.srcHeader
    });

    rows.forEach((row, i) => {
      const col    = i % COLS;
      const rowNum = Math.floor(i / COLS);
      const rx     = srcX + 0.05 + col * colW;
      const ry     = yStart + HEADER_H + 0.06 + rowNum * CELL_H;
      const d      = row.logo ? logo(row.logo) : null;

      if (d) {
        // Icon only — centred, no text
        slide.addImage({
          data: d,
          x: rx + (colW - ICON_SIZE) / 2,
          y: ry + (CELL_H - ICON_SIZE) / 2,
          w: ICON_SIZE,
          h: ICON_SIZE,
        });
      } else if (row.label) {
        // Text only fallback
        slide.addText(row.label, {
          x: rx, y: ry, w: colW, h: CELL_H,
          fontSize: 5.8, color: C.dark,
          align: "center", valign: "middle", wrap: true,
        });
      }
    });
  }

  // Message Store
  sourceBox("Message Store", 0.48, 1.73, [
    { logo: "kafka",     label: "Kafka" },
    { logo: "confluent", label: "Confluent" },
    { label: "Pulsar" },
    { label: "Amazon MSK" },
    { label: "Kinesis" },
    { label: "Azure\nEvent Hubs" },
    { label: "GCP\nPub/Sub" },
  ]);

  // Legacy Databases
  sourceBox("Legacy Databases", 2.27, 1.27, [
    { label: "SQL Server" },
    { logo: "mysql",      label: "MySQL" },
    { label: "IBM DB2" },
    { logo: "postgresql", label: "PostgreSQL" },
    { logo: "mongodb",    label: "MongoDB" },
    { label: "Oracle DB" },
  ]);

  // Cloud Databases
  sourceBox("Cloud Databases", 3.60, 1.27, [
    { label: "Azure SQL" },
    { label: "AWS RDS" },
    { logo: "snowflake",  label: "Snowflake" },
    { label: "BigQuery" },
    { label: "Redshift" },
    { label: "DynamoDB" },
  ]);

  // Enterprise Applications
  sourceBox("Enterprise Applications", 4.93, 1.73, [
    { logo: "salesforce", label: "Salesforce" },
    { label: "Workday" },
    { label: "Google\nAnalytics" },
    { label: "Oracle\nNetSuite" },
    { label: "ServiceNow" },
    { label: "Google Ads" },
    { label: "MS Dynamics 365" },
    { label: "SharePoint" },
  ]);

  // Arrows — midpoints of each source box
  [1.34, 2.91, 4.24, 5.80].forEach(ay => arrowRight(slide, srcX + srcW, ay, 0.22));

  // ══════════════════════════════════════════
  // MAIN PLATFORM BOX
  // ══════════════════════════════════════════
  const platX = 2.42, platY = 0.48, platW = 6.59, platH = 4.62;

  slide.addShape("rect", { x: platX, y: platY, w: platW, h: platH, fill: { color: "FAFAFE" }, line: { color: C.purple, width: 2.5 } });
  slide.addShape("rect", { x: platX, y: platY, w: platW, h: 0.3, fill: { color: C.purple }, line: { color: C.purple, width: 0 } });

  // Marionete logo in platform title bar
  addLogo(slide, "Marionete_logo", platX + 0.1, platY + 0.03, 0.6, 0.24);
  slide.addText("Data Intelligence Platform", { x: platX + 0.75, y: platY, w: platW - 0.85, h: 0.3, fontSize: 11, color: C.white, bold: true, align: "center", valign: "middle" });

  // Orchestration bar
  sectionHeader(slide, platX + 0.08, platY + 0.34, platW - 0.16, 0.26, "Orchestration", { fontSize: 8 });

  // ── DATA INGESTION ──
  const ingX = platX + 0.08, ingY = platY + 0.66, ingW = 1.55, ingH = 2.88;
  slide.addShape("rect", { x: ingX, y: ingY, w: ingW, h: ingH, fill: { color: C.purplePale }, line: { color: C.purple, width: 1.5, dashType: "dash" } });
  slide.addText("Data Ingestion", { x: ingX, y: ingY + 0.04, w: ingW, h: 0.22, fontSize: 8, color: C.purple, bold: true, align: "center" });

  const ingItems = [
    { num: "1", label: "Batch\nIngestion" },
    { num: "2", label: "CDC\nIngestion" },
    { num: "3", label: "Streaming\nIngestion" },
  ];
  ingItems.forEach((item, i) => {
    const iy = ingY + 0.3 + i * 0.84;
    slide.addShape("ellipse", { x: ingX + 0.18, y: iy + 0.04, w: 0.28, h: 0.28, fill: { color: C.purple }, line: { color: C.purple, width: 0 } });
    slide.addText(item.num, { x: ingX + 0.18, y: iy + 0.04, w: 0.28, h: 0.28, fontSize: 7, color: C.white, bold: true, align: "center", valign: "middle" });
    slide.addShape("ellipse", { x: ingX + 0.38, y: iy + 0.08, w: 0.52, h: 0.52, fill: { color: C.white }, line: { color: C.purple, width: 1.2 } });
    slide.addText(item.label, { x: ingX + 0.1, y: iy + 0.62, w: ingW - 0.2, h: 0.34, fontSize: 7, color: C.dark, bold: true, align: "center" });
  });

  // ── ETL ──
  const etlX = ingX + ingW + 0.14, etlY = platY + 0.66, etlW = 2.4, etlH = 1.36;
  sectionHeader(slide, etlX, etlY, etlW, 0.25, "ETL", { fontSize: 8 });
  container(slide, etlX, etlY + 0.25, etlW, etlH - 0.25, { fill: C.gray, borderColor: C.grayBorder });

  const dbY = etlY + 0.46, dbW = 0.52, dbH = 0.44;
  [{ label: "RAW", x: etlX + 0.12 }, { label: "ODS", x: etlX + 0.92 }, { label: "Facts", x: etlX + 1.76 }].forEach(db => {
    slide.addShape("rect", { x: db.x, y: dbY, w: dbW, h: dbH, fill: { color: C.purplePale }, line: { color: C.purple, width: 0.8 }, rectRadius: 0.05 });
    slide.addText(db.label, { x: db.x, y: dbY + dbH - 0.18, w: dbW, h: 0.2, fontSize: 6.5, color: C.purple, bold: true, align: "center" });
  });
  slide.addShape("line", { x: etlX + 0.66, y: dbY + 0.22, w: 0.26, h: 0, line: { color: C.grayDark, width: 1, dashType: "dash", endArrowType: "arrow" } });
  slide.addShape("line", { x: etlX + 1.48, y: dbY + 0.18, w: 0.28, h: 0.1, line: { color: C.grayDark, width: 1, dashType: "dash", endArrowType: "arrow" } });
  slide.addShape("line", { x: etlX + etlW / 2, y: etlY + etlH, w: 0, h: 0.22, line: { color: C.dark, width: 1.2, endArrowType: "arrow" } });

  // dbt logo in ETL section
  addLogo(slide, "dbt", etlX + etlW - 0.6, etlY + 0.28, 0.5, 0.18);

  // ── DATA WAREHOUSE ──
  const dwX = etlX, dwY = etlY + etlH + 0.22, dwW = etlW, dwH = 0.82;
  sectionHeader(slide, dwX, dwY, dwW, 0.26, "Data Warehouse", { fontSize: 8 });
  container(slide, dwX, dwY + 0.26, dwW, dwH - 0.26, { fill: C.gray, borderColor: C.grayBorder });

  // Databricks SQL pill with logo
  slide.addShape("rect", { x: dwX + 0.14, y: dwY + 0.32, w: dwW - 0.28, h: 0.3, fill: { color: C.purple }, line: { color: C.purple, width: 0 }, rectRadius: 0.06 });
  addLogo(slide, "databricks", dwX + 0.22, dwY + 0.35, 0.2, 0.2);
  slide.addText("Databricks SQL", { x: dwX + 0.46, y: dwY + 0.32, w: dwW - 0.7, h: 0.3, fontSize: 7.5, color: C.white, bold: true, valign: "middle" });
  slide.addText("Best-in-class DW performance", { x: dwX + 0.1, y: dwY + 0.65, w: dwW - 0.2, h: 0.14, fontSize: 5.5, color: C.grayDark, align: "center", italic: true });

  // ── AI AGENT SYSTEMS ──
  const aiX = etlX, aiY = dwY + dwH + 0.14, aiW = etlW, aiH = 1.32;
  sectionHeader(slide, aiX, aiY, aiW, 0.26, "AI Agent Systems", { fontSize: 8 });
  container(slide, aiX, aiY + 0.26, aiW, aiH - 0.26, { fill: C.gray, borderColor: C.grayBorder, dash: "dash" });

  // AI/ML icon in the section
  addLogo(slide, "ai_ml", aiX + aiW - 0.52, aiY + 0.3, 0.44, 0.36);

  const agentPills = [
    { label: "Prepare data",    x: aiX + 0.08, y: aiY + 0.34 },
    { label: "Build agents",    x: aiX + 1.44, y: aiY + 0.34 },
    { label: "Evaluate agents", x: aiX + 0.08, y: aiY + 0.64 },
    { label: "Deploy agents",   x: aiX + 1.44, y: aiY + 0.64 },
    { label: "Govern agents",   x: aiX + 0.76, y: aiY + 0.94 },
  ];
  agentPills.forEach(p => pill(slide, p.x, p.y, 0.86, 0.24, p.label, { fontSize: 5.5 }));

  // ── RIGHT PANEL SECTIONS ──
  const rightX = etlX + etlW + 0.14;
  const rightW = 2.0;  // narrower — placeholder sections to be updated
  const rightSectionH = 0.72, rightGap = 0.06;

  const rightSections = [
    { title: "Streaming Analytics",      icon: "📊" },
    { title: "BI & Reporting",           icon: "📈" },
    { title: "Data Sharing & Marketplace", icon: "🔗" },
    { title: "AI Applications",          icon: "🤖", logoName: null },
    { title: "Apps",                     icon: "⚙️", logoName: null },
  ];

  rightSections.forEach((sec, i) => {
    const ry = platY + 0.66 + i * (rightSectionH + rightGap);
    sectionHeader(slide, rightX, ry, rightW, 0.26, sec.title, { fontSize: 7 });
    container(slide, rightX, ry + 0.26, rightW, rightSectionH - 0.26, { fill: C.gray, borderColor: C.grayBorder });
    if (sec.logoName) {
      addLogo(slide, sec.logoName, rightX + 0.1, ry + 0.32, 0.5, 0.34);
    } else if (sec.icon) {
      slide.addShape("rect", { x: rightX + 0.1, y: ry + 0.32, w: 0.42, h: 0.36, fill: { color: C.purplePale }, line: { color: C.purple, width: 0.5 }, rectRadius: 0.04 });
      slide.addText(sec.icon, { x: rightX + 0.1, y: ry + 0.32, w: 0.42, h: 0.36, fontSize: 13, align: "center", valign: "middle" });
    }
  });

  // ── Arrows ingestion → centre ──
  arrowRight(slide, ingX + ingW, ingY + 0.46, 0.14);
  arrowRight(slide, ingX + ingW, dwY + 0.42, 0.14);
  arrowRight(slide, ingX + ingW, aiY + 0.6, 0.14);

  // Arrows centre → right panel
  for (let i = 0; i < 5; i++) {
    const ay = platY + 0.66 + i * (rightSectionH + rightGap) + rightSectionH / 2;
    arrowRight(slide, etlX + etlW, ay, 0.14);
  }

  // ══════════════════════════════════════════
  // LAKEHOUSE BOTTOM BAR
  // ══════════════════════════════════════════
  const lhY = platY + platH + 0.1, lhH = 1.0;
  slide.addShape("rect", { x: platX, y: lhY, w: platW, h: lhH, fill: { color: C.purpleDark }, line: { color: C.purpleDark, width: 0 } });
  slide.addText("Unified, Open and Scalable Lakehouse", { x: platX, y: lhY + 0.04, w: platW, h: 0.24, fontSize: 9, color: C.white, bold: true, align: "center" });

  // Left: Unity Catalog box
  slide.addShape("rect", { x: platX + 0.1, y: lhY + 0.3, w: platW / 2 - 0.18, h: 0.62, fill: { color: "FFFFFF" }, line: { color: "FFFFFF", width: 0 }, rectRadius: 0.05 });
  slide.addText("Governance, Security, Observability, Interoperability, Sharing", { x: platX + 0.12, y: lhY + 0.3, w: platW / 2 - 0.22, h: 0.18, fontSize: 5.5, color: C.dark, align: "center" });
  // Unity Catalog - databricks logo + text
  addLogo(slide, "databricks", platX + platW / 4 - 0.44, lhY + 0.5, 0.22, 0.22);
  slide.addText("Unity Catalog", { x: platX + platW / 4 - 0.18, y: lhY + 0.48, w: platW / 2 - 0.6, h: 0.28, fontSize: 10, color: C.purple, bold: true, valign: "middle" });

  // Right: Storage box
  slide.addShape("rect", { x: platX + platW / 2 + 0.08, y: lhY + 0.3, w: platW / 2 - 0.18, h: 0.62, fill: { color: "FFFFFF" }, line: { color: "FFFFFF", width: 0 }, rectRadius: 0.05 });
  slide.addText("Universal, Open Storage", { x: platX + platW / 2 + 0.1, y: lhY + 0.3, w: platW / 2 - 0.22, h: 0.18, fontSize: 5.5, color: C.dark, align: "center" });
  ["Delta Lake", "Parquet", "Iceberg"].forEach((t, i) => {
    pill(slide, platX + platW / 2 + 0.18 + i * 1.42, lhY + 0.52, 1.28, 0.3, t, { fontSize: 8 });
  });

  // ══════════════════════════════════════════
  // FAR RIGHT — Use case outputs
  // ══════════════════════════════════════════
  const outX = platX + platW + 0.2;
  const outW = 13.1 - outX;
  const outputs = [
    "Use Case 1",
    "Use Case 2",
    "Use Case 3",
    "Use Case 4",
    "Use Case 5",
  ];
  outputs.forEach((label, i) => {
    const secH = 0.72, secGap = 0.06;
    const oy = platY + 0.66 + i * (secH + secGap) + (secH - 0.46) / 2;
    arrowRight(slide, platX + platW + 0.05, oy + 0.23, 0.15);
    slide.addShape("rect", { x: outX, y: oy, w: outW, h: 0.46, fill: { color: C.gray }, line: { color: C.grayBorder, width: 0.5 }, rectRadius: 0.04 });
    slide.addText(label, { x: outX + 0.08, y: oy, w: outW - 0.1, h: 0.46, fontSize: 6.5, color: C.dark, bold: true, align: "left", valign: "middle" });
  });

  // Footer
  slide.addText("© 2026 Marionete", { x: 0.12, y: 7.2, w: 2.5, h: 0.2, fontSize: 6, color: C.grayDark });
  slide.addText("14", { x: 6.4, y: 7.2, w: 0.5, h: 0.2, fontSize: 8, color: C.purple, bold: true, align: "center" });

  await pres.writeFile({ fileName: "DataIntelligencePlatform.pptx" });
  console.log("Done!");
})();
