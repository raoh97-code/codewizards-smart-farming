'use strict';

console.log("JS Loaded");

/* ================================================
   DOM REFERENCES
================================================ */
const manualPanel = document.getElementById('manualPanel');
const pdfPanel = document.getElementById('pdfPanel');

const resultsSection = document.getElementById('results');

const manualForm = document.getElementById("manualForm");
const pdfForm = document.getElementById("pdfForm");

const manualSubmitBtn = document.getElementById("manualSubmitBtn");
const pdfSubmitBtn = document.getElementById("pdfSubmitBtn");

const pdfFileInput = document.getElementById("pdfFile");
const fileInfo = document.getElementById("fileInfo");
const fileNameEl = document.getElementById("fileName");
const clearFileBtn = document.getElementById("clearFile");

const analyzeAgainBtn = document.getElementById("analyzeAgainBtn");
const dropZone = document.getElementById("dropZone");

/* ================================================
   MODE SWITCH
================================================ */
function switchMode(mode) {
  if (mode === 'manual') {
    manualPanel.classList.remove('d-none');
    pdfPanel.classList.add('d-none');
  } else {
    pdfPanel.classList.remove('d-none');
    manualPanel.classList.add('d-none');
  }
  hideResults();
}

window.switchMode = switchMode;

/* ================================================
   RESULTS
================================================ */
function showResults(result) {
  document.getElementById("resCropRecommendation").innerText = result.crop;
  document.getElementById("resFertilizerAdvice").innerText = result.fertilizer;
  document.getElementById("resSoilHealth").innerText = result.soil;
  document.getElementById("resSuggestions").innerText = result.suggestions;

  resultsSection.classList.remove("d-none");
  resultsSection.scrollIntoView({ behavior: "smooth" });
}

function hideResults() {
  resultsSection.classList.add('d-none');
}

/* ================================================
   MANUAL FORM SUBMIT
================================================ */
manualForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  manualSubmitBtn.disabled = true;

  try {
    const data = {
      N: document.getElementById("nitrogen").value,
      P: document.getElementById("phosphorus").value,
      K: document.getElementById("potassium").value,
      temperature: document.getElementById("temperature").value,
      humidity: document.getElementById("humidity").value,
      ph: document.getElementById("ph").value,
      rainfall: document.getElementById("rainfall").value
    };

    const response = await fetch("http://127.0.0.1:5000/predict", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data)
    });

    const result = await response.json();
    showResults(result);

  } catch (error) {
    document.getElementById("manualError").classList.remove("d-none");
    document.getElementById("manualErrorMsg").innerText = "Server error. Check backend.";
  }

  manualSubmitBtn.disabled = false;
});

/* ================================================
   PDF FORM SUBMIT
================================================ */
pdfForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const file = pdfFileInput.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append("file", file);

  try {
    const response = await fetch("http://127.0.0.1:5000/upload", {
      method: "POST",
      body: formData
    });

    const result = await response.json();
    showResults(result);

  } catch (error) {
    document.getElementById("pdfError").classList.remove("d-none");
    document.getElementById("pdfErrorMsg").innerText = "Upload failed!";
  }
});

/* ================================================
   FILE INPUT HANDLING
================================================ */
pdfFileInput.addEventListener('change', () => {
  const file = pdfFileInput.files[0];
  if (file) {
    fileNameEl.textContent = file.name;
    fileInfo.classList.remove('d-none');
  }
});

clearFileBtn.addEventListener('click', () => {
  pdfFileInput.value = '';
  fileInfo.classList.add('d-none');
});

/* ================================================
   DRAG & DROP
================================================ */
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

  const file = e.dataTransfer.files[0];

  if (file && file.type === 'application/pdf') {
    const dt = new DataTransfer();
    dt.items.add(file);
    pdfFileInput.files = dt.files;

    fileNameEl.textContent = file.name;
    fileInfo.classList.remove('d-none');
  }
});

/* ================================================
   RESET
================================================ */
analyzeAgainBtn.addEventListener('click', () => {
  hideResults();
  manualForm.reset();
  pdfFileInput.value = '';
  fileInfo.classList.add('d-none');
  switchMode('manual');
});

/* ================================================
   INIT
================================================ */
(function init() {
  switchMode('manual');
})();