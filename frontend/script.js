/**
 * Smart Farming Advisor — script.js
 * Handles: mode toggle, form validation, fetch API calls, DOM updates
 */

'use strict';

/* ================================================
   CONSTANTS
================================================ */
const API_MANUAL = '/analyze/manual';
const API_PDF    = '/analyze/pdf';

/* ================================================
   DOM REFERENCES
================================================ */
const manualPanel    = document.getElementById('manualPanel');
const pdfPanel       = document.getElementById('pdfPanel');
const tabManual      = document.getElementById('tabManual');
const tabPdf         = document.getElementById('tabPdf');

const manualForm     = document.getElementById('manualForm');
const manualSubmitBtn = document.getElementById('manualSubmitBtn');
const manualError    = document.getElementById('manualError');
const manualErrorMsg = document.getElementById('manualErrorMsg');

const pdfForm        = document.getElementById('pdfForm');
const pdfSubmitBtn   = document.getElementById('pdfSubmitBtn');
const pdfFileInput   = document.getElementById('pdfFile');
const fileInfo       = document.getElementById('fileInfo');
const fileNameEl     = document.getElementById('fileName');
const clearFileBtn   = document.getElementById('clearFile');
const pdfError       = document.getElementById('pdfError');
const pdfErrorMsg    = document.getElementById('pdfErrorMsg');
const pdfFileError   = document.getElementById('pdfFileError');

const resultsSection = document.getElementById('results');
const analyzeAgainBtn = document.getElementById('analyzeAgainBtn');
const dropZone       = document.getElementById('dropZone');

// Result placeholders
const resCrop        = document.getElementById('resCropRecommendation');
const resFert        = document.getElementById('resFertilizerAdvice');
const resSoil        = document.getElementById('resSoilHealth');
const resSugg        = document.getElementById('resSuggestions');

/* ================================================
   MODE SWITCHING
================================================ */
/**
 * Switch between 'manual' and 'pdf' modes.
 * @param {'manual'|'pdf'} mode
 */
function switchMode(mode) {
  if (mode === 'manual') {
    manualPanel.classList.remove('d-none');
    pdfPanel.classList.add('d-none');
    tabManual.classList.add('active');
    tabManual.setAttribute('aria-selected', 'true');
    tabPdf.classList.remove('active');
    tabPdf.setAttribute('aria-selected', 'false');
  } else {
    pdfPanel.classList.remove('d-none');
    manualPanel.classList.add('d-none');
    tabPdf.classList.add('active');
    tabPdf.setAttribute('aria-selected', 'true');
    tabManual.classList.remove('active');
    tabManual.setAttribute('aria-selected', 'false');
  }
  // Hide results when switching
  hideResults();
}

// Expose to inline onclick attrs
window.switchMode = switchMode;

/* ================================================
   FORM VALIDATION HELPERS
================================================ */
function setLoadingState(btn, loading) {
  const textEl   = btn.querySelector('.btn-text');
  const spinEl   = btn.querySelector('.btn-spinner');
  btn.disabled   = loading;
  textEl.classList.toggle('d-none', loading);
  spinEl.classList.toggle('d-none', !loading);
}

function showError(container, msgEl, msg) {
  msgEl.textContent = msg;
  container.classList.remove('d-none');
}

function hideError(container) {
  container.classList.add('d-none');
}

function validateManualForm() {
  const fields = ['nitrogen','phosphorus','potassium','ph','temperature','humidity','rainfall'];
  const ranges = {
    nitrogen:    { min: 0,   max: 500 },
    phosphorus:  { min: 0,   max: 500 },
    potassium:   { min: 0,   max: 500 },
    ph:          { min: 0,   max: 14  },
    temperature: { min: -20, max: 60  },
    humidity:    { min: 0,   max: 100 },
    rainfall:    { min: 0,   max: 5000 },
  };

  let isValid = true;

  fields.forEach(id => {
    const input = document.getElementById(id);
    const val   = input.value.trim();
    const num   = parseFloat(val);
    const { min, max } = ranges[id];

    if (val === '' || isNaN(num) || num < min || num > max) {
      input.classList.add('is-invalid');
      isValid = false;
    } else {
      input.classList.remove('is-invalid');
    }
  });

  return isValid;
}

/* ================================================
   RESULTS DISPLAY
================================================ */
function showResults(data) {
  resCrop.textContent  = data.cropRecommendation || 'No data available.';
  resFert.textContent  = data.fertilizerAdvice   || 'No data available.';
  resSoil.textContent  = data.soilHealth         || 'No data available.';
  resSugg.textContent  = data.suggestions        || 'No data available.';

  resultsSection.classList.remove('d-none');

  // Smooth scroll to results
  setTimeout(() => {
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 100);
}

function hideResults() {
  resultsSection.classList.add('d-none');
}

/* ================================================
   MANUAL FORM SUBMIT  →  POST /analyze/manual
================================================ */
manualForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideError(manualError);

  if (!validateManualForm()) {
    showError(manualError, manualErrorMsg, 'Please correct the highlighted fields before submitting.');
    return;
  }

  const payload = {
    nitrogen:    parseFloat(document.getElementById('nitrogen').value),
    phosphorus:  parseFloat(document.getElementById('phosphorus').value),
    potassium:   parseFloat(document.getElementById('potassium').value),
    ph:          parseFloat(document.getElementById('ph').value),
    temperature: parseFloat(document.getElementById('temperature').value),
    humidity:    parseFloat(document.getElementById('humidity').value),
    rainfall:    parseFloat(document.getElementById('rainfall').value),
  };

  setLoadingState(manualSubmitBtn, true);
  hideResults();

  try {
    const response = await fetch(API_MANUAL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.message || `Server error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    showResults(data);

  } catch (err) {
    if (err.name === 'TypeError') {
      // Network error / backend not reachable → show demo data
      showResults(getDemoData(payload));
      showError(manualError, manualErrorMsg, 'Backend not reachable — showing demo results. Connect your API at ' + API_MANUAL);
    } else {
      showError(manualError, manualErrorMsg, err.message);
    }
  } finally {
    setLoadingState(manualSubmitBtn, false);
  }
});

/* ================================================
   PDF FORM SUBMIT  →  POST /analyze/pdf
================================================ */
pdfForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideError(pdfError);
  pdfFileError.classList.add('d-none');

  const file = pdfFileInput.files[0];

  if (!file) {
    pdfFileError.classList.remove('d-none');
    return;
  }

  if (file.type !== 'application/pdf') {
    pdfFileError.classList.remove('d-none');
    return;
  }

  const formData = new FormData();
  formData.append('pdfFile', file);

  setLoadingState(pdfSubmitBtn, true);
  hideResults();

  try {
    const response = await fetch(API_PDF, {
      method: 'POST',
      body:   formData,
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.message || `Server error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    showResults(data);

  } catch (err) {
    if (err.name === 'TypeError') {
      // Backend not connected — show demo output
      showResults(getDemoData(null));
      showError(pdfError, pdfErrorMsg, 'Backend not reachable — showing demo results. Connect your API at ' + API_PDF);
    } else {
      showError(pdfError, pdfErrorMsg, err.message);
    }
  } finally {
    setLoadingState(pdfSubmitBtn, false);
  }
});

/* ================================================
   FILE INPUT — DROP ZONE BEHAVIOR
================================================ */
pdfFileInput.addEventListener('change', () => {
  const file = pdfFileInput.files[0];
  if (file) {
    fileNameEl.textContent = file.name;
    fileInfo.classList.remove('d-none');
    pdfFileError.classList.add('d-none');
  }
});

clearFileBtn.addEventListener('click', () => {
  pdfFileInput.value = '';
  fileInfo.classList.add('d-none');
  fileNameEl.textContent = '';
});

// Drag & Drop
dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('drag-over');
});

dropZone.addEventListener('dragleave', () => {
  dropZone.classList.remove('drag-over');
});

dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  const dt   = e.dataTransfer;
  const file = dt.files[0];
  if (file && file.type === 'application/pdf') {
    // Create a DataTransfer and assign to input (browser-compat approach)
    const dTransfer   = new DataTransfer();
    dTransfer.items.add(file);
    pdfFileInput.files = dTransfer.files;
    fileNameEl.textContent = file.name;
    fileInfo.classList.remove('d-none');
    pdfFileError.classList.add('d-none');
  } else if (file) {
    pdfFileError.classList.remove('d-none');
  }
});

/* ================================================
   ANALYZE AGAIN — reset UI
================================================ */
analyzeAgainBtn.addEventListener('click', () => {
  hideResults();
  manualForm.reset();
  manualForm.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
  hideError(manualError);
  pdfFileInput.value = '';
  fileInfo.classList.add('d-none');
  hideError(pdfError);
  switchMode('manual');
  document.getElementById('analyzer').scrollIntoView({ behavior: 'smooth' });
});

/* ================================================
   NAVBAR SCROLL EFFECT
================================================ */
window.addEventListener('scroll', () => {
  const nav = document.getElementById('mainNavbar');
  if (window.scrollY > 50) {
    nav.style.background = 'rgba(7, 14, 10, 0.97)';
  } else {
    nav.style.background = 'rgba(13, 31, 22, 0.88)';
  }
}, { passive: true });

/* ================================================
   DEMO DATA (used while backend is not connected)
================================================ */
function getDemoData(params) {
  // Produce slightly dynamic demo output from params if available
  const n = params ? params.nitrogen    : 90;
  const p = params ? params.phosphorus  : 40;
  const k = params ? params.potassium   : 40;
  const ph = params ? params.ph         : 6.5;

  let cropHint = 'Rice or Wheat';
  if (n > 100 && ph >= 6 && ph <= 7.5) cropHint = 'Maize or Sugarcane';
  else if (ph < 6)                      cropHint = 'Tea or Blueberries (acidic soil)';
  else if (k > 100)                     cropHint = 'Potato or Banana';

  let fertHint = 'Balanced NPK (10-10-10)';
  if (n < 50)  fertHint = 'Nitrogen-rich fertilizer (Urea or Ammonium Nitrate)';
  else if (p < 20) fertHint = 'Phosphorus supplement (DAP — Di-ammonium Phosphate)';
  else if (k < 20) fertHint = 'Potassium supplement (Muriate of Potash — MOP)';

  const healthScore = ph >= 5.5 && ph <= 7.5 ? 'Good' : ph < 5.5 ? 'Acidic — needs liming' : 'Alkaline — needs sulfur treatment';

  return {
    cropRecommendation: `Based on your soil parameters, ${cropHint} is highly suitable for your region. These crops thrive in the provided N-P-K ratios and pH range.`,
    fertilizerAdvice:   `Recommended: ${fertHint}. Apply at 120 kg/ha during the pre-sowing stage. Consider split application for better uptake.`,
    soilHealth:         `Overall soil health is ${healthScore}. Organic matter content should be enriched with compost. Soil structure is suitable for root development.`,
    suggestions:        `Ensure proper irrigation scheduling. Consider crop rotation with legumes to naturally restore nitrogen. Monitor humidity and adjust watering if rainfall is below 150 mm.`,
  };
}

/* ================================================
   INIT — ensure manual mode is default
================================================ */
(function init() {
  switchMode('manual');
})();
