const mainGrid = document.getElementById("mainGrid");
const resultsSection = document.getElementById("results");
const assessBtn = document.getElementById("assessBtn");
const resetBtn = document.getElementById("resetBtn");
const downloadReportBtn = document.getElementById("downloadReportBtn");

let latestResults = null;

function collectInputs() {
  return {
    buildingType: readText("buildingType"),
    state: readText("state"),
    city: readText("city"),
    areaSqm: readNumber("area"),
    energyKWh: readNumber("energy"),
    energyPeriod: readText("energyPeriod"),
    coolingTR: readNumber("acCapacity"),
    contractDemandKVA: readNumber("contractDemand"),
    dgSize: readNumber("dgSize"),
    renewableValue: readNumber("renewableValue"),
    renewablePeriod: readText("renewablePeriod"),
    acAreaPercentage: readNumber("acArea"),
    waterKL: readNumber("water"),
    waterPeriod: readText("waterPeriod"),
    occupants: readNumber("occupants")
  };
}

function setResultsVisibility(showResults) {
  if (!mainGrid || !resultsSection) return;

  mainGrid.classList.toggle("has-results", showResults);
  resultsSection.classList.toggle("hidden", !showResults);
}

function resetAssessmentForm() {
  const resetFields = [
    "area",
    "acArea",
    "occupants",
    "energy",
    "acCapacity",
    "contractDemand",
    "dgSize",
    "renewableValue",
    "water"
  ];

  resetFields.forEach(id => {
    const field = document.getElementById(id);
    if (field) field.value = "";
  });

  const buildingType = document.getElementById("buildingType");
  const state = document.getElementById("state");
  const city = document.getElementById("city");
  const energyPeriod = document.getElementById("energyPeriod");
  const renewablePeriod = document.getElementById("renewablePeriod");
  const waterPeriod = document.getElementById("waterPeriod");

  if (buildingType) buildingType.selectedIndex = 0;
  if (state) state.value = "";
  if (energyPeriod) energyPeriod.value = "annual";
  if (renewablePeriod) renewablePeriod.value = "annual";
  if (waterPeriod) waterPeriod.value = "annual";

  if (city) {
    city.innerHTML = `<option value="">Select City</option>`;
    city.disabled = true;
  }

  updateInputPlaceholders();
}

function updateInputPlaceholders() {
  const placeholderByField = {
    energy: {
      annual: "e.g. 15,00,000",
      monthly: "e.g. 1,25,000"
    },
    renewableValue: {
      annual: "e.g. 0",
      monthly: "e.g. 0"
    },
    water: {
      annual: "e.g. 10,000",
      monthly: "e.g. 800",
      daily: "e.g. 25"
    }
  };

  const bindings = [
    ["energy", "energyPeriod"],
    ["renewableValue", "renewablePeriod"],
    ["water", "waterPeriod"]
  ];

  bindings.forEach(([inputId, selectId]) => {
    const input = document.getElementById(inputId);
    const select = document.getElementById(selectId);
    const placeholder = placeholderByField[inputId]?.[select?.value];
    if (input && placeholder) input.placeholder = placeholder;
  });
}

function getElementText(id) {
  const el = document.getElementById(id);
  return el ? el.textContent.trim().replace(/\s+/g, " ") : "";
}

function formatMetricValue(value, digits = 1) {
  return Number.isFinite(value) ? value.toFixed(digits) : MISSING_RESULT_TEXT;
}

function formatEpiLabel(value) {
  if (!Number.isFinite(value)) return "-";
  if (value > 0 && value < 0.1) return value.toFixed(3);
  if (value < 1) return value.toFixed(2);
  return value < 10 ? value.toFixed(1) : String(Math.round(value));
}

function clampFloatingElement(element, container, pct, padding = 8) {
  if (!element || !container || !Number.isFinite(pct)) return;

  const containerWidth = container.clientWidth;
  const elementWidth = element.offsetWidth;
  const containerLeft = container.offsetLeft;

  if (!containerWidth || !elementWidth) return;

  const desiredCenter = (pct / 100) * containerWidth;
  const minCenter = (elementWidth / 2) + padding;
  const maxCenter = containerWidth - (elementWidth / 2) - padding;
  const clampedCenter = Math.min(Math.max(desiredCenter, minCenter), maxCenter);

  element.style.left = `${containerLeft + clampedCenter}px`;
}

function positionBubbleWithStem(bubble, container, pct, padding = 8, edgeBias = 0) {
  if (!bubble || !container || !Number.isFinite(pct)) return;

  const containerWidth = container.clientWidth;
  const bubbleWidth = bubble.offsetWidth;
  const containerLeft = container.offsetLeft;

  if (!containerWidth || !bubbleWidth) return;

  const desiredCenter = (pct / 100) * containerWidth;
  const maxCenter = containerWidth - (bubbleWidth / 2) - padding - edgeBias;
  const clampedCenter = Math.min(Math.max(desiredCenter, 0), maxCenter);
  const stemOffset = Math.min(
    Math.max(desiredCenter - (clampedCenter - (bubbleWidth / 2)), 4),
    bubbleWidth - 4
  );

  bubble.style.left = `${containerLeft + clampedCenter}px`;
  bubble.style.setProperty("--bubble-stem-left", `${stemOffset}px`);
}

function positionBubbleInFrame(bubble, frame, scale, pct, padding = 8) {
  if (!bubble || !frame || !scale || !Number.isFinite(pct)) return;

  const frameWidth = frame.clientWidth;
  const scaleWidth = scale.clientWidth;
  const scaleLeft = scale.offsetLeft;
  const bubbleWidth = bubble.offsetWidth;

  if (!frameWidth || !scaleWidth || !bubbleWidth) return;

  const desiredCenter = scaleLeft + ((pct / 100) * scaleWidth);
  const minCenter = (bubbleWidth / 2) + padding;
  const maxCenter = frameWidth - (bubbleWidth / 2) - padding;
  const clampedCenter = Math.min(Math.max(desiredCenter, minCenter), maxCenter);
  const stemOffset = Math.min(
    Math.max(desiredCenter - (clampedCenter - (bubbleWidth / 2)), 4),
    bubbleWidth - 4
  );

  bubble.style.left = `${clampedCenter}px`;
  bubble.style.setProperty("--bubble-stem-left", `${stemOffset}px`);

  return {
    desiredCenter,
    clampedCenter,
    stemOffset,
    stemAbsoluteLeft: clampedCenter - (bubbleWidth / 2) + stemOffset
  };
}

function downloadReport() {
  if (!latestResults) return;

  const inputs = collectInputs();
  const reportDate = new Date().toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  });
  const citySlug = (inputs.city || "project")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "project";

  const reportHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Building Health Report</title>
  <style>
    body { margin: 0; padding: 32px; background: #142347; color: #e8eefc; font-family: "Segoe UI", sans-serif; }
    .report { max-width: 920px; margin: 0 auto; }
    .hero, .panel { background: #223162; border: 1px solid rgba(232, 238, 252, 0.12); border-radius: 18px; padding: 24px; box-shadow: 0 18px 40px rgba(0, 0, 0, 0.18); }
    .hero { margin-bottom: 18px; }
    h1, h2 { margin: 0 0 12px; }
    p { margin: 0; line-height: 1.6; color: #dbe4ff; }
    .meta, .grid { display: grid; gap: 14px; }
    .meta { grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); margin-top: 18px; }
    .grid { grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); }
    .item { background: #1b2850; border-radius: 14px; padding: 16px; }
    .label { display: block; margin-bottom: 8px; font-size: 13px; letter-spacing: 0.04em; text-transform: uppercase; color: #9fb3ea; }
    .value { font-size: 20px; font-weight: 700; color: #ffffff; }
    .note { margin-top: 8px; font-size: 14px; color: #dbe4ff; }
  </style>
</head>
<body>
  <div class="report">
    <div class="hero">
      <h1>Building Health Report</h1>
      <p>Generated on ${reportDate}</p>
      <div class="meta">
        <div class="item"><span class="label">Building Type</span><div class="value">${inputs.buildingType || "Office"}</div></div>
        <div class="item"><span class="label">Location</span><div class="value">${inputs.city || "Not provided"}</div><div class="note">${inputs.state || ""}</div></div>
        <div class="item"><span class="label">Climate Zone</span><div class="value">${latestResults.climateZone || "Unknown"}</div></div>
      </div>
    </div>
    <div class="panel">
      <h2>Assessment Summary</h2>
      <div class="grid">
        <div class="item"><span class="label">BEE Star Rating</span><div class="value">${getElementText("outStarRating") || MISSING_RESULT_TEXT}</div></div>
        <div class="item"><span class="label">Energy Performance Index</span><div class="value">${formatMetricValue(latestResults.epi)} kWh/m²/yr</div><div class="note">${getElementText("epiMessage")}</div></div>
        <div class="item"><span class="label">Net Energy Status</span><div class="value">${latestResults.netEnergy > 0 ? "Net Positive" : latestResults.netEnergy < 0 ? "Net Negative" : "Net Zero"}</div><div class="note">${getElementText("netEnergyMsg")}</div></div>
        <div class="item"><span class="label">HVAC Capacity Factor</span><div class="value">${latestResults.hvacSizing.value || MISSING_RESULT_TEXT}</div><div class="note">${latestResults.hvacSizing.status || ""}</div></div>
        <div class="item"><span class="label">Contract Demand Density</span><div class="value">${latestResults.demandSizing.contract || "Not provided"}</div><div class="note">${latestResults.demandSizing.contractStatus || ""}</div></div>
        <div class="item"><span class="label">Backup Power Density</span><div class="value">${latestResults.demandSizing.dg || "Not provided"}</div><div class="note">${latestResults.demandSizing.dgStatus || ""}</div></div>
        <div class="item"><span class="label">Water Efficiency</span><div class="value">${Number.isFinite(latestResults.lpcd) ? `${latestResults.lpcd.toFixed(1)} lpcd` : MISSING_RESULT_TEXT}</div><div class="note">${latestResults.waterStatus.text || ""}</div></div>
      </div>
    </div>
  </div>
</body>
</html>`;

  const blob = new Blob([reportHtml], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `building-health-report-${citySlug}.html`;
  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/*************************************************
 * CONSTANTS
 *************************************************/
const ASSURE_EPI_TARGET = 75;
const DEFAULT_SPECIFIC_YIELD = 1500;
const NBC_LPCD = 45;
const MISSING_RESULT_TEXT = "Result not available due to missing input(s).";
const COLD_CLIMATE_MESSAGE ="BEE star ratings are not defined for cold climate zones due to insufficient benchmark data.";


/*************************************************
 * BEE STAR RATING EQUATIONS (SAMPLE – WORKING)
 * Replace with official BEE equations later
 *************************************************/
const beeEquations = {
  "Composite": {
    "Large": {
      "5Star": { a: 0.75, c: 20 },
      "4Star": { a: 0.80, c: 30 },
      "3Star": { a: 0.85, c: 40 },
      "2Star": { a: 0.90, c: 50 },
      "1Star": { a: 0.95, c: 60 }
    },
    "Medium": {
      "5Star": { a: 0.9, c: 20 },
      "4Star": { a: 0.95, c: 30 },
      "3Star": { a: 1.0, c: 40 },
      "2Star": { a: 1.05, c: 50 },
      "1Star": { a: 1.1, c: 60 }
    },
    "Small": {
      "5Star": { a: 0.45, c: 20 },
      "4Star": { a: 0.5, c: 30 },
      "3Star": { a: 0.55, c: 40 },
      "2Star": { a: 0.6, c: 50 },
      "1Star": { a: 0.65, c: 60 }
    }
  },

  "Warm & Humid": {
    "Large": {
      "5Star": { a: 0.7, c: 25 },
      "4Star": { a: 0.75, c: 35 },
      "3Star": { a: 0.8, c: 45 },
      "2Star": { a: 0.85, c: 55 },
      "1Star": { a: 0.9, c: 65 }
    },
    "Medium": {
      "5Star": { a: 0.7, c: 25 },
      "4Star": { a: 0.75, c: 35 },
      "3Star": { a: 0.8, c: 45 },
      "2Star": { a: 0.85, c: 55 },
      "1Star": { a: 0.9, c: 65 }
    },
    "Small": {
      "5Star": { a: 0.5, c: 25 },
      "4Star": { a: 0.55, c: 35 },
      "3Star": { a: 0.6, c: 45 },
      "2Star": { a: 0.65, c: 55 },
      "1Star": { a: 0.7, c: 65 }
    }
  },

  "Hot & Dry": {
    "Large": {
      "5Star": { a: 0.9, c: 15 },
      "4Star": { a: 0.95, c: 25 },
      "3Star": { a: 1.0, c: 35 },
      "2Star": { a: 1.05, c: 45 },
      "1Star": { a: 1.1, c: 55 }
    },
    "Medium": {
      "5Star": { a: 1.05, c: 15 },
      "4Star": { a: 1.1, c: 25 },
      "3Star": { a: 1.15, c: 35 },
      "2Star": { a: 1.2, c: 45 },
      "1Star": { a: 1.25, c: 55 }
    },
    "Small": {
      "5Star": { a: 1.55, c: 15 },
      "4Star": { a: 0.6, c: 25 },
      "3Star": { a: 0.65, c: 35 },
      "2Star": { a: 0.7, c: 45 },
      "1Star": { a: 0.75, c: 55 }
    }
  },

  "Temperate": {
    "Large": {
      "5Star": { a: 0.9, c: 15 },
      "4Star": { a: 0.95, c: 25 },
      "3Star": { a: 1.0, c: 35 },
      "2Star": { a: 1.05, c: 45 },
      "1Star": { a: 1.1, c: 55 }
    },
    "Medium": {
      "5Star": { a: 1.05, c: 15 },
      "4Star": { a: 1.1, c: 25 },
      "3Star": { a: 1.15, c: 35 },
      "2Star": { a: 1.2, c: 45 },
      "1Star": { a: 1.25, c: 55 }
    },
    "Small": {
      "5Star": { a: 0.55, c: 15 },
      "4Star": { a: 0.6, c: 25 },
      "3Star": { a: 0.65, c: 35 },
      "2Star": { a: 0.7, c: 45 },
      "1Star": { a: 0.75, c: 55 }
    }
  }
};

/*************************************************
 * CLIMATE + STATE + CITY DATA (SINGLE SOURCE)
 *************************************************/
let climateRawData = [];
let cityClimateMap = {};

fetch("Location_CZ_Latitude.json")
  .then(res => res.json())
  .then(data => {
    climateRawData = data;

    data.forEach(item => {
      cityClimateMap[item.City.trim().toLowerCase()] = {
        zone: item.Climate_Zone.trim(),
        state: item.State,
        lat: item.Lat,
        lon: item.Longitude
      };
    });

    console.log("✅ Climate JSON loaded");
  })
  .catch(err => console.error("❌ Climate JSON load error", err));



/*************************************************
 * SAFE INPUT READERS (CRITICAL)
 *************************************************/
function readNumber(id) {
  const el = document.getElementById(id);
  if (!el) return NaN;
  const v = el.value;
  if (v === null || v === undefined || v.trim() === "") return NaN;
  const normalized = v.replace(/,/g, "").trim();
  return Number(normalized);
}

function readText(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : "";
}

function toAnnualEnergyKWh(value, period) {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return period === "monthly" ? value * 12 : value;
}

function toAnnualWaterKL(value, period) {
  if (!Number.isFinite(value) || value <= 0) return NaN;

  if (period === "monthly") return value * 12;
  if (period === "daily") return value * 220;
  return value;
}

function buildOutputHelp(text) {
  return `
    <span class="input-help output-help">
      <img class="input-help-icon" src="buildinge_health_tool_asset/i_icon.png" alt="More info">
      <span class="input-help-tooltip">${text}</span>
    </span>
  `;
}

/*************************************************
 * STATE → CITY DROPDOWN (FIXED)'
 *************************************************/
document.addEventListener("DOMContentLoaded", () => {

  let climateRawData = [];

  const stateSelect = document.getElementById("state");
  const citySelect = document.getElementById("city");
  ["energyPeriod", "renewablePeriod", "waterPeriod"].forEach(id => {
    const select = document.getElementById(id);
    if (select) select.addEventListener("change", updateInputPlaceholders);
  });
  updateInputPlaceholders();

  if (!stateSelect || !citySelect) {
    console.error("State or City select not found in DOM");
    return;
  }

  fetch("Location_CZ_Latitude.json")
    .then(res => {
      if (!res.ok) throw new Error("JSON not loaded");
      return res.json();
    })
    .then(data => {
      console.log("✅ Climate JSON loaded:", data.length, "rows");

      climateRawData = data;

      // Populate States
      const states = [...new Set(data.map(d => d.State))].sort();

      states.forEach(state => {
        const opt = document.createElement("option");
        opt.value = state;
        opt.textContent = state;
        stateSelect.appendChild(opt);
      });

      console.log("✅ States populated:", stateSelect.options.length);
    })
    .catch(err => console.error("❌ Climate JSON error:", err));

  stateSelect.addEventListener("change", () => {
    citySelect.innerHTML = `<option value="">Select City</option>`;
    citySelect.disabled = true;

    if (!stateSelect.value) return;

    climateRawData
      .filter(d => d.State === stateSelect.value)
      .forEach(d => {
        const opt = document.createElement("option");
        opt.value = d.City;
        opt.textContent = d.City;
        citySelect.appendChild(opt);
      });

    citySelect.disabled = false;
  });

});


/*************************************************
 * BUILDING SIZE
 *************************************************/
function getBuildingSize(areaSqm) {
  if (areaSqm <= 10000) return "Small";
  if (areaSqm <= 30000) return "Medium";
  return "Large";
}

let epi1 = null;
let epi2 = null;
let epi3= null;
let epi4=null;
let epi5=null;


/*************************************************
 * CORE CALCULATION (FINAL)
 *************************************************/
function calculateBuildingPerformance(inputs) {

  const {
    city,
    areaSqm,
    energyKWh,
    energyPeriod,
    coolingTR,
    contractDemandKVA,
    dgSize,
    renewableValue,
    renewablePeriod,
    acAreaPercentage,
    waterKL,      // ✅ ADD
    waterPeriod,
    occupants,
    // lpcd
  } = inputs;

  let sfPerTR = null;


  /* ---------- ENERGY ---------- */
  const energyAnnualKWh = Number.isFinite(energyKWh) && energyKWh > 0
    ? toAnnualEnergyKWh(energyKWh, energyPeriod)
    : NaN;

  /* ---------- AREA ---------- */
  const areaSqft = Number.isFinite(areaSqm) && areaSqm > 0
    ? areaSqm / 0.092903
    : NaN;

  /* ---------- CLIMATE ---------- */
 const climateZone =
  cityClimateMap[city.toLowerCase()]?.zone || "Unknown";


  /* ---------- BUILDING SIZE ---------- */
  const buildingSize = getBuildingSize(areaSqm);

  /* ---------- EPI ---------- */
  const epi = Number.isFinite(energyAnnualKWh) &&
    energyAnnualKWh > 0 &&
    Number.isFinite(areaSqm) &&
    areaSqm > 0
      ? energyAnnualKWh / areaSqm
      : NaN;

  /* ---------- ASSURE EPI ---------- */
  const assureStatus = !Number.isFinite(epi)
    ? { text: MISSING_RESULT_TEXT, class: "rating-fair" }
    : epi <= ASSURE_EPI_TARGET
      ? { text: "Within target", class: "metric-good" }
      : { text: "Above target", class: "metric-bad" };

/* ---------- NET ENERGY (FINAL & CORRECT) ---------- */

  // Annual demand
  const annualEnergyDemand = energyAnnualKWh;


  // Renewable generation normalized to annual kWh
  const renewableGenKWh = toAnnualEnergyKWh(renewableValue, renewablePeriod);

  // Net balance
  const netEnergy = renewableGenKWh - annualEnergyDemand;

  // Tolerance
  const EPS = Math.max(1, 0.005 * annualEnergyDemand);

  let netStatus = {
    text: "Net Negative — More energy used than produced",
    class: "badge-negative"
  };

  if (renewableGenKWh > 0) {
    if (netEnergy > EPS) {
      netStatus = {
        text: "Net positive — Your building generates more energy than it consumes — extra energy can be exported for savings.",
        class: "badge-positive"
      };
    } else if (Math.abs(netEnergy) <= EPS) {
      netStatus = {
        text: "Net Zero — Your building generation and consumption are nearly equal",
        class: "badge-neutral"
      };
    }
  }

 /* ================= BEE STAR RATING (NBC-ALIGNED) ================= */

let starRating = {
  text: MISSING_RESULT_TEXT,
  note: MISSING_RESULT_TEXT,
  class: "badge-warn"
};

let epi1 = NaN;
let epi2 = NaN;
let epi3 = NaN;
let epi4 = NaN;
let epi5 = NaN;

/* ---------- HARD STOPS ---------- */

// 1️⃣ Cold climate zone → NOT APPLICABLE
if (climateZone.toLowerCase().includes("cold")) {
  starRating = {
    text: COLD_CLIMATE_MESSAGE,
    note: COLD_CLIMATE_MESSAGE,
    class: "badge-neutral"
  };
}

// 2️⃣ Missing required inputs
else if (
  !city ||
  climateZone === "Unknown" ||
  isNaN(areaSqm) || areaSqm <= 0 ||
  isNaN(energyKWh) || energyKWh <= 0 ||
  isNaN(acAreaPercentage) || acAreaPercentage <= 0 || acAreaPercentage > 100
) {
  starRating = {
    text: MISSING_RESULT_TEXT,
    note: MISSING_RESULT_TEXT,
    class: "badge-warn"
  };
}

// 3️⃣ Valid → calculate stars
else {
  const zoneKey = climateZone.trim();
  const eqByZone = beeEquations[zoneKey];
  const eq = eqByZone ? eqByZone[buildingSize] : null;

  if (!eq) {
    starRating = {
      text: MISSING_RESULT_TEXT,
      note: "BEE equations not available for this building type",
      class: "badge-warn"
    };
  } else {
    const acPct = acAreaPercentage;

    epi5 = (eq["5Star"].a * acPct) + eq["5Star"].c;
    epi4 = (eq["4Star"].a * acPct) + eq["4Star"].c;
    epi3 = (eq["3Star"].a * acPct) + eq["3Star"].c;
    epi2 = (eq["2Star"].a * acPct) + eq["2Star"].c;
    epi1 = (eq["1Star"].a * acPct) + eq["1Star"].c;

    if (epi <= epi5)
      starRating = { text: "★★★★★ (5 Star)", class: "badge-good" };
    else if (epi <= epi4)
      starRating = { text: "★★★★☆ (4 Star)", class: "badge-good" };
    else if (epi <= epi3)
      starRating = { text: "★★★☆☆ (3 Star)", class: "badge-warn" };
    else if (epi <= epi2)
      starRating = { text: "★★☆☆☆ (2 Star)", class: "badge-bad" };
    else if (epi <= epi1)
      starRating = { text: "★☆☆☆☆ (1 Star)", class: "badge-bad" };
    else
      starRating = { text: "No Star", class: "badge-bad" };
  }
}

  /* ================= HVAC SIZING KPI ================= */

  let hvacSizing = {
    value: "",
    status: MISSING_RESULT_TEXT,
    note: "",
    class: "rating-fair",
    sfPerTR: null
  };

  if (areaSqft > 0 && !isNaN(coolingTR) && coolingTR > 0) {

    // ✅ ASSIGN, DO NOT DECLARE
    sfPerTR = areaSqft / coolingTR;

    if (sfPerTR >= 700 && sfPerTR <= 800) {
      hvacSizing = {
        value: `${sfPerTR.toFixed(0)} sqft/TR`,
        status: "Efficient sizing",
        note: "Within recommended range",
        class: "rating-excellent",
        sfPerTR
      };
    }
    else if (sfPerTR < 700) {
      hvacSizing = {
        value: `${sfPerTR.toFixed(0)} sqft/TR`,
        status: "Oversized",
        note: "Low sqft/TR",
        class: "rating-poor",
        sfPerTR
      };
    }
    else {
      hvacSizing = {
        value: `${sfPerTR.toFixed(0)} sqft/TR`,
        status: "Possibly undersized",
        note: "High sqft/TR",
        class: "rating-fair",
        sfPerTR
      };
    }
  }


/* ================= CONTRACT / DG SIZING KPI (STRUCTURED) ================= */
const PF = 0.9;

let demandSizing = {
  contract: "",
  dg: "",
  cdWsf: NaN,
  dgWsf: NaN,
  contractStatus: MISSING_RESULT_TEXT,
  dgStatus: MISSING_RESULT_TEXT,
  contractClass: "rating-fair",
  dgClass: "rating-fair"
};

if (areaSqft > 0) {
  const cdKW = !isNaN(contractDemandKVA) ? contractDemandKVA * PF : NaN;
  const dgKW = !isNaN(dgSize) ? dgSize * PF : NaN;

  const cdWsf = !isNaN(cdKW) ? (cdKW * 1000) / areaSqft : NaN;
  const dgWsf = !isNaN(dgKW) ? (dgKW * 1000) / areaSqft : NaN;

  demandSizing.cdWsf = cdWsf;
  demandSizing.dgWsf = dgWsf;

  if (!isNaN(cdWsf)) {
    demandSizing.contract = `${cdWsf.toFixed(2)} W/sqft`;
    demandSizing.contractStatus = cdWsf < 5 ? "Efficient" : "Above target";
    demandSizing.contractClass = cdWsf < 5 ? "rating-excellent" : "rating-poor";
  } else {
    demandSizing.contract = "Not provided";
  }

  if (!isNaN(dgWsf)) {
    demandSizing.dg = `${dgWsf.toFixed(2)} W/sqft`;
    demandSizing.dgStatus = dgWsf < 5 ? "Efficient" : "Above target";
    demandSizing.dgClass = dgWsf < 5 ? "rating-excellent" : "rating-poor";
  } else {
    demandSizing.dg = "Not provided";
  }
}


/* ================= LPCD CALCULATION ================= */
let lpcd = NaN;
const annualWaterKL = toAnnualWaterKL(waterKL, waterPeriod);

if (
  !isNaN(annualWaterKL) &&
  annualWaterKL > 0 &&
  !isNaN(occupants) &&
  occupants > 0
) {
  // Annual kL → litres
  const annualLitres = annualWaterKL * 1000;

  // LPCD calcurflation (220 working days)
  lpcd = annualLitres / (occupants * 220);
}

console.log("WATER DEBUG:", {
  waterKL,
  waterPeriod,
  annualWaterKL,
  occupants,
  lpcd
});

/* ================= WATER (NBC LPCD ONLY) ================= */
let waterStatus = {
  text: MISSING_RESULT_TEXT,
  class: "rating-fair"
};

if (!isNaN(lpcd)) {
  if (lpcd <= NBC_LPCD) {
    waterStatus = {
      text: `${lpcd.toFixed(1)} lpcd — Within NBC`,
      class: "rating-excellent"
    };
  } else {
    waterStatus = {
      text: `${lpcd.toFixed(1)} lpcd — Above NBC`,
      class: "rating-poor"
    };
  }
}

  /* ---------- DEBUG (KEEP FOR NOW) ---------- */
  console.log("DEBUG:", {
    areaSqm,
    energyAnnualKWh,
    epi
  });

  return {
    city,
    climateZone,
    buildingSize,

    /* ---------- ENERGY ---------- */
    epi,
    annualEnergyDemand,     // ← used by Net Energy bar
    renewableGenKWh,        // ← used by Net Energy bar
    netEnergy,

    /* ---------- EPI / STARS ---------- */
    epiThresholds: {
      oneStar: epi1,
      twoStar: epi2,
      threeStar: epi3,
      fourStar: epi4,
      fiveStar: epi5
    },

    assureStatus,
    starRating,

    /* ---------- KPIs ---------- */
    netStatus,
    hvacSizing,
    sfPerTR,
    demandSizing,
    waterStatus,

    lpcd
  };

}


function updateEpiBar({ epi, thresholds, assure, coldClimate = false }) {

  /* ===============================
     0️⃣ DOM ELEMENTS (ONCE)
     =============================== */
  const fill = document.querySelector(".epi-fill");
  const buildingMarker = document.querySelector(".building-marker");
  const assureMarker = document.querySelector(".assure-marker");
  const bar = document.querySelector(".epi-bar");

  const buildingLabel = document.getElementById("buildingLabel");
  const assureLabel = document.getElementById("assureLabel");
  const buildingText = document.getElementById("buildingEpiText");
  const starScale = document.querySelector(".epi-star-scale");
  const msg = document.getElementById("epiMessage");

  /* ===============================
     RESET UI (CRITICAL FOR SWITCHING)
     =============================== */
  if (assureMarker) assureMarker.style.display = "";
  if (assureLabel) assureLabel.style.display = "";
  if (buildingMarker) buildingMarker.style.display = "";
  if (starScale) starScale.style.display = "";

  fill.style.width = "0%";
  fill.style.background = "#2ecc71";

  /* ===============================
     ❄️ COLD CLIMATE MODE
     =============================== */
  if (coldClimate) {
    if (isNaN(epi)) {
      if (starScale) starScale.style.display = "none";
      fill.style.width = "0%";
      fill.style.background = "#dcdcdc";
      if (buildingMarker) buildingMarker.style.display = "none";
      if (buildingLabel) buildingLabel.style.display = "none";
      if (assureMarker) assureMarker.style.left = "75%";
      if (assureLabel) assureLabel.style.left = "75%";
      msg.innerHTML = `
        <b>BEE star benchmarking is not available for cold climate zones.</b><br>
        EPI comparison with ASSURE KPI needs valid energy and area inputs.
      `;
      return;
    }

    const AXIS_MAX = Math.max(assure * 1.4, epi * 1.15, assure + 25);
    const pct = v => (Math.max(0, Math.min(v, AXIS_MAX)) / AXIS_MAX) * 100;
    const buildingPct = pct(epi);
    const assurePct = pct(assure);

    fill.style.width = `${buildingPct}%`;
    fill.style.background = epi <= assure ? "#2ecc71" : `
      linear-gradient(
        to right,
        #2ecc71 0%,
        #2ecc71 ${assurePct}%,
        #27ae60 ${assurePct}%,
        #27ae60 100%
      )
    `;

    buildingMarker.style.left = `calc(${buildingPct}% - 2px)`;
    buildingLabel.style.left = `${buildingPct}%`;
    assureMarker.style.left = `calc(${assurePct}% - 2px)`;
    assureLabel.style.left = `${assurePct}%`;
    buildingText.textContent = formatEpiLabel(epi);

    if (starScale) starScale.style.display = "none";

    const dist = Math.abs(buildingPct - assurePct);
    if (dist < 8) {
      buildingLabel.style.top = "-78px";
      assureLabel.style.top = "-38px";
    } else {
      buildingLabel.style.top = "-58px";
      assureLabel.style.top = "-58px";
    }

    clampFloatingElement(buildingLabel, bar, buildingPct);
    clampFloatingElement(assureLabel, bar, assurePct);

    const delta = Math.round(Math.abs(epi - assure));
    const status = epi <= assure
      ? `Within ASSURE KPI by ${delta} kWh/m²/yr.`
      : `${delta} kWh/m²/yr above ASSURE KPI (75 kWh/m²/yr).`;

    msg.innerHTML = `
      <b>BEE star benchmarking is not available for cold climate zones.</b><br>
      EPI comparison with ASSURE KPI is available: ${status}
    `;

    return;

  }

  /* ===============================
     NORMAL FLOW (NON-COLD)
     =============================== */
  if (!thresholds || isNaN(epi)) return;

  const {
    oneStar,
    twoStar,
    threeStar,
    fourStar,
    fiveStar
  } = thresholds;

  /* ===============================
     1️⃣ BASE THRESHOLD
     =============================== */
  const BASE_MAX = Math.max(
    assure,
    (2 * oneStar) - twoStar
  );

  /* ===============================
     2️⃣ SMART 2-STAGE EXTENSION
     =============================== */
  let AXIS_MAX = BASE_MAX;

  if (epi > BASE_MAX) {
    const SOFT_CAP = 1000;
    const LINEAR_FACTOR = 0.8;
    const LOG_FACTOR = BASE_MAX;

    if (epi <= SOFT_CAP) {
      AXIS_MAX = BASE_MAX + (epi - BASE_MAX) * LINEAR_FACTOR;
    } else {
      AXIS_MAX =
        BASE_MAX +
        (SOFT_CAP - BASE_MAX) * LINEAR_FACTOR +
        Math.log10(epi - SOFT_CAP + 1) * LOG_FACTOR;
    }
  }

  /* ===============================
     3️⃣ SCALE HELPERS
     =============================== */
  const clamp = v => Math.max(0, Math.min(v, AXIS_MAX));
  const pct = v => (clamp(v) / AXIS_MAX) * 100;

  const buildingEpi = clamp(epi);

  /* ===============================
     4️⃣ BAR + MARKERS
     =============================== */
  const buildingPct = pct(buildingEpi);
  const assurePct = pct(assure);

  fill.style.width = `${buildingPct}%`;

  // Green → darker green after ASSURE
  if (epi > assure) {
    fill.style.background = `
      linear-gradient(
        to right,
        #2ecc71 0%,
        #2ecc71 ${assurePct}%,
        #27ae60 ${assurePct}%,
        #27ae60 100%
      )
    `;
  } else {
    fill.style.background = "#2ecc71";
  }

  buildingMarker.style.left = `calc(${buildingPct}% - 2px)`;
  buildingLabel.style.left = `${buildingPct}%`;

  assureMarker.style.left = `calc(${assurePct}% - 2px)`;
  assureLabel.style.left = `${assurePct}%`;

  buildingText.textContent = formatEpiLabel(epi);
  clampFloatingElement(buildingLabel, bar, buildingPct);
  clampFloatingElement(assureLabel, bar, assurePct);

  /* ===============================
     5️⃣ STAR POSITIONING
     =============================== */
  const stars = [
    { id: 5, value: fiveStar },
    { id: 4, value: fourStar },
    { id: 3, value: threeStar },
    { id: 2, value: twoStar },
    { id: 1, value: oneStar }
  ];

  stars.forEach(({ id, value }) => {
    const el = document.querySelector(
      `.epi-star-group[data-star="${id}"]`
    );
    if (!el || isNaN(value)) return;
    el.style.left = `${pct(value)}%`;
    el.style.opacity = 1;
  });

  /* ===============================
     6️⃣ LABEL STACKING
     =============================== */
  const dist = Math.abs(buildingPct - assurePct);

  if (dist < 8) {
    buildingLabel.style.top = "-78px";
    assureLabel.style.top = "-38px";
  } else {
    buildingLabel.style.top = "-58px";
    assureLabel.style.top = "-58px";
  }

  /* ===============================
     7️⃣ USER MESSAGE
     =============================== */
  if (epi <= fiveStar) {
    msg.innerHTML = "Excellent! 5-Star energy performance.";
  }
  else if (epi <= threeStar) {
    msg.innerHTML = "Average efficiency. Optimization recommended.";
  }
  else if (epi <= oneStar) {
    msg.innerHTML = "<b>Poor efficiency.</b> Action required.";
  }
  else {
    const delta = Math.round(epi - assure);
    msg.innerHTML =
      `<b>Very high energy use.</b> ${delta} kWh/m²/yr above ASSURE KPI (75 kWh/m²/yr)`;
  }
}

// Net energy bar staus

function updateNetEnergyBar({ consumed, generated }) {

  const conFill = document.querySelector(".net-energy-consumed");
  const genFill = document.querySelector(".net-energy-generated");

  const conText = document.getElementById("conText");
  const genText = document.getElementById("genText");
  const msg = document.getElementById("netEnergyMsg");

  if (
    isNaN(consumed) || consumed < 0 ||
    isNaN(generated) || generated < 0
  ) {
    msg.innerHTML = "Result not available due to missing input(s).";
    return;
  }

  const maxVal = Math.max(consumed, generated, 1);

  const conPct = (consumed / maxVal) * 100;
  const genPct = (generated / maxVal) * 100;

  conFill.style.width = `${conPct}%`;
  genFill.style.width = `${genPct}%`;

  conText.textContent = `Consumed – ${Math.round(consumed)} kWh`;
  genText.textContent = `Generated – ${Math.round(generated)} kWh`;

  const diff = Math.round(generated - consumed);

  if (diff > 0) {
    msg.innerHTML = `
      <span style="color:#2ecc71">
        Net Positive: Generated &gt; Consumed (${diff} kWh surplus)
      </span>
    `;
  }
  else if (diff < 0) {
    msg.innerHTML = `
      <span style="color:#e74c3c">
        Net Negative: Consumed &gt; Generated (${Math.abs(diff)} kWh deficit)
      </span>
    `;
  }
  else {
    msg.innerHTML = `
      <span style="color:#f1c40f">
        Net Zero: Generated ≈ Consumed
      </span>
    `;
  }
}


// ############################ havc sizing bar ##################################

function updateHvacBar(sfPerTR) {
  if (!sfPerTR || isNaN(sfPerTR)) return;

  const TARGET = 800;

  const fill = document.querySelector(".hvac-fill");
  
  const buildingMarker = document.querySelector(".hvac-marker.building");
  const targetMarker = document.querySelector(".hvac-marker.target");

  const buildingLabel = document.getElementById("hvacBuildingLabel");
  const buildingValue = document.getElementById("hvacBuildingValue");
  const bar = document.querySelector(".hvac-bar");

  /* ================= DYNAMIC SCALE ================= */
  const AXIS_MAX = Math.max(sfPerTR, TARGET) * 1.2;
  const pct = v => Math.min((v / AXIS_MAX) * 100, 100);

  const buildingPct = pct(sfPerTR);
  const targetPct = pct(TARGET);

  /* ================= BAR WIDTH ================= */
  fill.style.width = `${buildingPct}%`;

  /* ================= POSITIONING ================= */
  targetMarker.style.left = `${targetPct}%`;
  const targetLabel = document.getElementById("hvacTargetLabel");
  targetLabel.style.left = `${targetPct}%`;


  buildingValue.textContent = `${Math.round(sfPerTR)} sqft/TR`;
  buildingLabel.style.left = `${buildingPct}%`;
  buildingLabel.style.setProperty("--bubble-stem-left", "50%");

  if (targetLabel) {
    targetLabel.innerHTML = `
      <span>ASSURE KPI</span>
      <b>800 sqft/TR</b>
    `;
  }

  /* ================= STRICT COLOR LOGIC ================= */
  const TOLERANCE = 1; // allow ±1 sqft/TR

  let color;

  if (Math.abs(sfPerTR - TARGET) <= TOLERANCE) {
    color = "#2ecc71"; // GREEN (exact / acceptable)
  }
  else if (sfPerTR < TARGET) {
    color = "#3498db"; // BLUE (more cooling provided)
  }
  else {
    color = "#e74c3c"; // RED (less cooling provided)
  }

  /* ================= APPLY COLORS ================= */
  fill.style.background = color;

  // Change building marker circle color
  buildingMarker.style.setProperty("--marker-color", color);

  // Change floating label box
  buildingLabel.style.background = color;
  buildingLabel.style.borderColor = color;
  buildingLabel.style.setProperty("--marker-color", color);

  // Change text color
  buildingValue.style.color = "#ffffff";
}

// ############################ WATER CYLINDER ##################################

function updateWaterCylinder(lpcd) {

  if (isNaN(lpcd)) return;

  const LIMIT = 45;
  const CYLINDER_HEIGHT = 460;

  const fill        = document.getElementById("fill");
  const limitLine   = document.getElementById("limitLine");
  const actualBadge = document.getElementById("badge");
  const scale       = document.getElementById("Scale");

  /* ================= SAFE GUARD ================= */
  if (!fill || !limitLine || !actualBadge || !scale) return;

  /* ================= SMART MAX SCALE ================= */
  function getNiceMax(value) {
    if (value <= 60) return 60;
    if (value <= 120) return 120;
    if (value <= 300) return 300;
    if (value <= 600) return 600;
    if (value <= 1000) return 1000;

    const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
    return Math.ceil(value / magnitude) * magnitude;
  }

  const maxValue = getNiceMax(lpcd);

  /* ================= FILL HEIGHT ================= */
  const fillPercent = Math.min(lpcd / maxValue, 1);
  const heightPx = fillPercent * CYLINDER_HEIGHT;
  fill.style.height = heightPx + "px";

  /* ================= COLOR LOGIC ================= */
  if (lpcd > LIMIT) {
    fill.style.background = "linear-gradient(to top, #ef4444, #dc2626)";
    actualBadge.style.color = "#ef4444";
  } else {
    fill.style.background = "linear-gradient(to top, #60a5fa, #3b82f6)";
    actualBadge.style.color = "#ffffff";
  }

  /* ================= LIMIT LINE ================= */
  const limitPercent = LIMIT / maxValue;
  const limitPosPx = limitPercent * CYLINDER_HEIGHT;
  limitLine.style.bottom = (limitPosPx - 2) + "px";

  /* ================= BADGE POSITION ================= */
  let badgeBottom = heightPx + 20;
  if (badgeBottom < 60) badgeBottom = 60;

  actualBadge.style.bottom = badgeBottom + "px";
  actualBadge.textContent = `Actual: ${lpcd.toFixed(1)} lpcd`;

  /* ================= CLEAN SCALE (MAX 6 TICKS) ================= */
  scale.innerHTML = "";

  const divisions = 5; // 6 ticks total
  const step = maxValue / divisions;

  for (let i = 0; i <= divisions; i++) {

    const value = Math.round(i * step);
    const percent = value / maxValue;
    const pos = percent * CYLINDER_HEIGHT;

    const label = document.createElement("div");
    label.className = "scale-row";
    label.style.position = "absolute";
    label.style.right = "0";
    label.style.bottom = pos + "px";
    label.style.transform = "translateY(50%)";

    const number = document.createElement("span");
    number.textContent = value;

    const line = document.createElement("div");
    line.className = "scale-line";

    label.appendChild(number);
    label.appendChild(line);

    scale.appendChild(label);
  }

  /* ================= NBC LIMIT LABEL ================= */
  const limitLabel = document.createElement("div");
  limitLabel.className = "scale-row";
  limitLabel.style.position = "absolute";
  limitLabel.style.right = "0";
  limitLabel.style.bottom = limitPosPx + "px";
  limitLabel.style.transform = "translateY(50%)";
  limitLabel.style.color = "#facc15";
  limitLabel.style.fontWeight = "700";
  limitLabel.innerHTML = `
    <span>45</span>
    <div class="scale-line"></div>
    <div class="scale-label">(NBC) limit: 45 lpcd</div>
  `;

  scale.appendChild(limitLabel);
}



/*************************************************
 * ASSESS BUTTON (FINAL – VALIDATED)
 *************************************************/
assessBtn.addEventListener("click", () => {

  /* ========= COLLECT INPUTS ========= */
  const inputs = {
    city: readText("city"),
    areaSqm: readNumber("area"),
    energyKWh: readNumber("energy"),
    energyPeriod: readText("energyPeriod"),
    coolingTR: readNumber("acCapacity"),
    contractDemandKVA: readNumber("contractDemand"),
    dgSize: readNumber("dgSize"),
    renewableValue: readNumber("renewableValue"),
    renewablePeriod: readText("renewablePeriod"),
    acAreaPercentage: readNumber("acArea"),
    waterKL: readNumber("water"),        // ✅ ADD
    waterPeriod: readText("waterPeriod"),
    occupants: readNumber("occupants"),  // ✅ ADD
    // lpcd: readNumber("lpcd")
  };

/* ========= CITY REQUIRED (ONLY POPUP CASE) ========= */
if (!inputs.city) {
  alert("Please select State and City to continue");
  return;
}


  /* ========= RUN CALCULATION ========= */
  const results = calculateBuildingPerformance(inputs);
  renderResults(results);
});

resetBtn.addEventListener("click", resetAssessmentForm);
downloadReportBtn.addEventListener("click", downloadReport);

function buildDemandLine(d) {
  const parts = [];

  if (d.contract && d.contract !== "Not provided") {
    parts.push(`<strong>Contract:</strong> ${d.contract}`);
  }

  if (d.dg && d.dg !== "Not provided") {
    parts.push(`<strong>DG:</strong> ${d.dg}`);
  }

  // If nothing provided
  if (parts.length === 0) {
    return `
      <span class="rating-fair">
        Input required — enter <b>Contract Demand</b> or <b>DG Set size</b>
      </span>
    `;
  }

  return `
    ${parts.join(" &nbsp;•&nbsp; ")}
    &nbsp;—&nbsp;
    <strong>${d.status}</strong>
  `;
}

function buildSizingDots(value, dotCount, colorA, colorB) {
  let dotsHtml = "";
  for (let i = 1; i <= dotCount; i++) {
    const fill = Math.max(0, Math.min(1, value - (i - 1)));
    const dotColor = i % 2 === 0 ? colorB : colorA;
    dotsHtml += `<div class="dg-dot" style="--fill:${fill}; --dot-color:${dotColor};"></div>`;
  }
  return dotsHtml;
}

function getSizingScalePct(value, dotCount) {
  const clampedValue = Math.max(0, Math.min(value, dotCount));
  return (clampedValue / dotCount) * 100;
}

function getSizingMarkerPct(value, dotCount) {
  const clampedValue = Math.max(0, Math.min(value, dotCount));
  if (clampedValue <= 0) return 0;
  return ((clampedValue - 0.5) / dotCount) * 100;
}

function renderDgSizingVisual(dgWsf) {
  const root = document.getElementById("outDgSizing");
  if (!root) return;

  if (isNaN(dgWsf) || dgWsf < 0) {
    root.innerHTML = `
      <div class="dg-head section-heading">
        <img class="section-icon" src="buildinge_health_tool_asset/dg-set-sizing.png" alt="DG Set Sizing">
        <span class="dg-title section-title">Backup Power Density</span>
        ${buildOutputHelp("Backup Power Density is the electrical power consumption per floor area that can be supported by the DG system. Lower value indicates a lean backup system that prioritises only the essentials while a higher value indicates redundancy.")}
      </div>
      <div class="rating-fair">Result not available due to missing input(s).</div>
    `;
    return;
  }

  const TARGET = 5;
  const DOT_COUNT = 13;

  const AXIS_MAX = DOT_COUNT; // each circle = 1 W/sqft

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  const scaledValue = clamp(dgWsf, 0, AXIS_MAX);
  const valuePct = getSizingScalePct(scaledValue, DOT_COUNT);
  const targetPct = getSizingMarkerPct(TARGET, DOT_COUNT);

  const bubblePct = clamp(valuePct, 0, 100);
  const good = dgWsf <= TARGET;
  const bubbleClass = good ? "dg-good" : "dg-bad";
  const bubbleMsg = good ? "Right amount of backup power" : "More backup power than needed";
  const lineColor = good ? "#25c46b" : "#ff4e63";

  const dotsHtml = buildSizingDots(scaledValue, DOT_COUNT, "#f79a1f", "#f5b13c");

  root.innerHTML = `
    <div class="dg-head section-heading">
        <img class="section-icon" src="buildinge_health_tool_asset/dg-set-sizing.png" alt="DG Set Sizing">
        <span class="dg-title section-title">Backup Power Density</span>
        ${buildOutputHelp("Backup Power Density is the electrical power consumption per floor area that can be supported by the DG system. Lower value indicates a lean backup system that prioritises only the essentials while a higher value indicates redundancy.")}
      </div>

    <div class="dg-visual">
      <div class="dg-bubble ${bubbleClass}" style="left:${bubblePct}%; --dg-line:${lineColor};">
        <span>Your Building's</span>
        <b>${dgWsf.toFixed(1)} W/sqft</b>
      </div>

      <div class="dg-scale">
        <div class="dg-dots">${dotsHtml}</div>
        <div class="dg-target-marker" style="left:${targetPct}%;"></div>
      </div>

      <div class="dg-target-label" style="left:${targetPct}%;">
        <span>ASSURE KPI</span>
        <b>&lt; 5 W/sqft</b>
      </div>
    </div>
  `;

  const bubble = root.querySelector(".dg-bubble");
  const frame = root.querySelector(".dg-visual");
  const scale = root.querySelector(".dg-scale");
  const targetLabel = root.querySelector(".dg-target-label");
  positionBubbleInFrame(bubble, frame, scale, bubblePct, 8);
  targetLabel.style.left = `${targetPct}%`;
}

// ///////////////////Contract demand//////////////////////////

function renderContractSizingVisual(cdWsf) {
  const root = document.getElementById("outContractSizing");
  if (!root) return;

  if (isNaN(cdWsf) || cdWsf < 0) {
    root.innerHTML = `
      <div class="dg-head section-heading">
        <img class="section-icon" src="buildinge_health_tool_asset/contract-demand.png" alt="Contract Demand">
        <span class="dg-title section-title">Contract Demand Density</span>
        ${buildOutputHelp("Contract Demand is the maximum power capacity agreed with the electric utility. If it is higher than your actual need, you are paying for unused capacity; if it is lower, it can lead to penalties.")}
      </div>
      <div class="rating-fair">Result not available due to missing input(s).</div>
    `;
    return;
  }

  const TARGET = 5;
  const DOT_COUNT = 13;
  const AXIS_MAX = DOT_COUNT; // each circle = 1 W/sqft

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  const scaledValue = clamp(cdWsf, 0, AXIS_MAX);
  const valuePct = getSizingScalePct(scaledValue, DOT_COUNT);
  const targetPct = getSizingMarkerPct(TARGET, DOT_COUNT);

  const bubblePct = clamp(valuePct, 0, 100);

  const good = cdWsf <= TARGET;
  const bubbleClass = good ? "dg-good" : "dg-bad";
  const bubbleMsg = good ? "Right-sized power capacity" : "More power capacity than needed";
  const lineColor = good ? "#b58cf5" : "#ff4e63";

  const dotsHtml = buildSizingDots(scaledValue, DOT_COUNT, "#9b6be8", "#b58cf5");

  root.innerHTML = `
    <div class="contract-theme">
      <div class="dg-head section-heading">
        <img class="section-icon" src="buildinge_health_tool_asset/contract-demand.png" alt="Contract Demand">
        <span class="dg-title section-title">Contract Demand Density</span>
        ${buildOutputHelp("Contract Demand Density is the maximum power capacity agreed with the electric utility. If it is higher than your actual need, you are paying for unused capacity; if it is lower, it can lead to penalties. ")}
      </div>

      <div class="dg-visual">
        <div class="dg-bubble ${bubbleClass}" style="left:${bubblePct}%; --dg-line:${lineColor};">
          <span>Your Building's</span>
          <b>${cdWsf.toFixed(1)} W/sqft</b>
        </div>

      <div class="dg-scale">
        <div class="dg-dots">${dotsHtml}</div>
        <div class="dg-target-marker" style="left:${targetPct}%;"></div>
      </div>

        <div class="dg-target-label" style="left:${targetPct}%;">
          <span>ASSURE KPI</span>
          <b>&lt; 5 W/sqft</b>
        </div>
      </div>
    </div>
  `;

  const bubble = root.querySelector(".dg-bubble");
  const frame = root.querySelector(".dg-visual");
  const scale = root.querySelector(".dg-scale");
  const targetLabel = root.querySelector(".dg-target-label");
  positionBubbleInFrame(bubble, frame, scale, bubblePct, 8);
  targetLabel.style.left = `${targetPct}%`;
}

/*************************************************
 * RENDER RESULTS (MATCHES HTML EXACTLY)
 *************************************************/
function renderResults(r) {
  latestResults = r;

  const beeEl = document.getElementById("outStarRating");
  const epiStarScale = document.getElementById("epiStarScale");

  /* ================= COLD CLIMATE HANDLING ================= */
  const isColdClimate =
    r.starRating.text === COLD_CLIMATE_MESSAGE;

  if (isColdClimate) {

    // Show cold-climate message
    beeEl.innerHTML = `
      <span class="rating-neutral">
        ${COLD_CLIMATE_MESSAGE}
      </span>
    `;

    // Hide star scale
    if (epiStarScale) {
      epiStarScale.style.display = "none";
    }

  } else {

    // Show star scale
    if (epiStarScale) {
      epiStarScale.style.display = "block";
    }

    // Normal star rendering
    if (r.starRating.text === MISSING_RESULT_TEXT) {
      beeEl.innerHTML = `
        <span class="rating-fair">
          ${MISSING_RESULT_TEXT}
        </span>
      `;
    } else {
      const filledStars = (r.starRating.text.match(/★/g) || []).length;

      let starsHtml = "";
      for (let i = 1; i <= 5; i++) {
        starsHtml += `
          <span class="bee-star ${i <= filledStars ? "filled" : "empty"}">★</span>
        `;
      }

      beeEl.innerHTML = `
        <span class="badge ${r.starRating.class}">
          <span class="bee-stars">${starsHtml}</span>
          <span class="bee-text">(${filledStars} Star)</span>
        </span>
      `;
    }
  }


  /* ================= WATER (PRO CLEAN VERSION) ================= */

  const waterContainer = document.getElementById("outWater");

  const TARGET = 45;

  if (!isNaN(r.lpcd)) {

    /* ========= SMART MAX SCALE ========= */
    function getNiceMax(value) {
      if (value <= 60) return 60;
      if (value <= 120) return 120;
      if (value <= 300) return 300;
      if (value <= 600) return 600;
      if (value <= 1000) return 1000;

      const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
      return Math.ceil(value / magnitude) * magnitude;
    }

    const MAX_LPCD = getNiceMax(r.lpcd);
    const actualPct = Math.min((r.lpcd / MAX_LPCD) * 100, 100);
    const actualLabelPct = Math.min(Math.max(actualPct * 0.48, 16), 58);
    const targetPctRaw = (TARGET / MAX_LPCD) * 100;
    const targetPct = targetPctRaw < 3 ? 3 : targetPctRaw;

      /* ========= SPLIT COLOR FILL ========= */

        const bluePct = (TARGET / MAX_LPCD) * 100;
        const redPct = Math.max(actualPct - bluePct, 0);

        const fillHtml = r.lpcd <= TARGET
          ? `
              <!-- FULL BLUE -->
              <div class="water-actual"
                  style="height:${actualPct}%;
                          background:linear-gradient(to top, #60a5fa, #3b82f6);">
              </div>
            `
        : `
            <!-- BLUE BELOW 45 -->
          <div style="
              position:absolute;
              bottom:0;
              width:100%;
              height:${bluePct}%;
              background:linear-gradient(to top, #60a5fa, #3b82f6);
          "></div>

          <!-- RED ABOVE 45 -->
          <div style="
              position:absolute;
              bottom:${bluePct}%;
              width:100%;
              height:${redPct}%;
              background:linear-gradient(to top, #ef4444, #dc2626);
          "></div>
        `;

      waterContainer.innerHTML = `
        <div class="water-card">

          <div class="water-title section-heading">
           <img class="section-icon" src="buildinge_health_tool_asset/water.png" alt="Water Efficiency">
           <span class="section-title">Water Efficiency </span>
           ${buildOutputHelp("Water Efficiency indicates the average amount of water used per person per day (lpcd). Lower values mean better efficiency and reduced water consumption, while higher values indicate increased usage and potential wastage.")}
          </div>

          <div class="water-wrapper">
            <div class="water-tank-wrap">
              <div class="water-tank-cap" aria-hidden="true"></div>
              <div class="water-cylinder">
                <div class="water-tank-outline" aria-hidden="true"></div>
                <div class="water-tank-glow" aria-hidden="true"></div>

                ${fillHtml}

                <!-- LIMIT LINE -->
                <div class="water-limit-band"
                    style="bottom:${targetPct}%">
                </div>

                  <!-- ACTUAL LABEL INSIDE TANK -->
                  <div class="water-actual-label"
                     style="bottom:${actualLabelPct}%">
                    <span class="water-actual-value">${r.lpcd.toFixed(1)}</span>
                    <span class="water-actual-unit">lpcd</span>
                  </div>

                </div>

                <div class="water-limit-overlay" aria-hidden="true">
                  <div class="water-limit-label"
                      style="bottom:${targetPct}%">
                    NBC limit: 45
                  </div>
                </div>

              </div>
              <div class="water-efficiency-message ${r.lpcd <= TARGET ? "is-good" : "is-alert"}">
                ${r.lpcd <= TARGET
                  ? "Water use is within the recommended limit—efficient performance."
                  : "Water use exceeds the recommended limit—consider reducing consumption."}
              </div>
            </div>
          </div>
        </div>
      `;

  } else {

    waterContainer.innerHTML = `
      <div class="water-card">

        <div class="water-title section-heading">
          <img class="section-icon" src="buildinge_health_tool_asset/water.png" alt="Water Efficiency">
          <span class="section-title">Water Efficiency </span>
          ${buildOutputHelp("Water Efficiency indicates the average amount of water used per person per day (lpcd). Lower values mean better efficiency and reduced water consumption, while higher values indicate increased usage and potential wastage.")}
        </div>

        <div style="padding:20px; color:#fbbf24;">
          Result not available due to missing input(s).
        </div>

      </div>
    `;
  }

  /* ================= EPI BAR ================= */
  updateEpiBar({
    epi: r.epi,
    thresholds: isColdClimate ? null : r.epiThresholds,
    assure: ASSURE_EPI_TARGET,
    coldClimate: isColdClimate
  });

  updateNetEnergyBar({
  consumed: r.annualEnergyDemand,
  generated: r.renewableGenKWh
 });

  if (r.sfPerTR) {
    updateHvacBar(r.sfPerTR);
  }

  renderContractSizingVisual(r.demandSizing.cdWsf);
  renderDgSizingVisual(r.demandSizing.dgWsf);



  /* ================= SHOW RESULTS ================= */
  setResultsVisibility(true);

  if (resultsSection) {
    resultsSection.classList.remove("results-refresh");
    void resultsSection.offsetWidth; // force reflow
    resultsSection.classList.add("results-refresh");
  }
}





