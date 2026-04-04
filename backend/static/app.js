/* =========================================================
   Smart Farming Web Application — app.js
   Connects: login.html | signup.html | dashboard.html
   API:      /predict (POST JSON) | /upload (POST FormData)
   ========================================================= */

document.addEventListener('DOMContentLoaded', () => {

  /* --------------------------------------------------------
     LOGIN FORM  (login.html)
  -------------------------------------------------------- */
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const errorDiv = document.getElementById('login-error');
      errorDiv.style.display = 'none';

      const emailInput = document.getElementById('email').value.trim();
      const passwordInput = document.getElementById('password').value;

      try {
        const res = await fetch('/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: emailInput, password: passwordInput })
        });
        const result = await res.json();

        if (res.ok) {
          localStorage.setItem('sf_user', JSON.stringify({ email: result.email }));
          window.location.href = '/dashboard';
        } else {
          errorDiv.querySelector ? (errorDiv.textContent = result.error || 'Invalid credentials.') : null;
          errorDiv.textContent = result.error || 'Invalid email or password.';
          errorDiv.style.display = 'block';
        }
      } catch (err) {
        errorDiv.textContent = 'Could not connect to server. Please try again.';
        errorDiv.style.display = 'block';
      }
    });
  }

  /* --------------------------------------------------------
     SIGNUP FORM  (signup.html)
  -------------------------------------------------------- */
  const signupForm = document.getElementById('signup-form');
  if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const errorDiv = document.getElementById('signup-error');
      errorDiv.style.display = 'none';

      const email = document.getElementById('email').value.trim();
      const p1 = document.getElementById('password').value;
      const p2 = document.getElementById('confirm-password').value;

      if (p1 !== p2) {
        errorDiv.textContent = 'Passwords do not match.';
        errorDiv.style.display = 'block';
        return;
      }

      try {
        const res = await fetch('/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password: p1, confirmPassword: p2 })
        });
        const result = await res.json();

        if (res.ok) {
          window.location.href = '/login';
        } else {
          errorDiv.textContent = result.error || 'Sign up failed. Please try again.';
          errorDiv.style.display = 'block';
        }
      } catch (err) {
        errorDiv.textContent = 'Could not connect to server. Please try again.';
        errorDiv.style.display = 'block';
      }
    });
  }

  /* --------------------------------------------------------
     DASHBOARD: User Greeting  (#user-greeting)
  -------------------------------------------------------- */
  const userGreeting = document.getElementById('user-greeting');
  const topbarAvatar = document.getElementById('topbar-avatar');
  if (userGreeting) {
    try {
      const user = JSON.parse(localStorage.getItem('sf_user') || '{}');
      if (user && user.email) {
        // Show name if stored, else show email prefix
        const display = user.name || user.email.split('@')[0];
        userGreeting.textContent = `Hello, ${display}`;
        if (topbarAvatar) {
          topbarAvatar.textContent = display.trim().charAt(0).toUpperCase() || 'F';
        }
      }
    } catch (_) { }
  }

  function refreshDashboardStats() {
    const runsEl = document.getElementById('dash-stat-runs');
    const lastEl = document.getElementById('dash-stat-lastcrop');
    if (runsEl) {
      runsEl.textContent = localStorage.getItem('sf_analysis_count') || '0';
    }
    if (lastEl) {
      lastEl.textContent = localStorage.getItem('sf_last_crop_label') || '—';
    }
  }

  refreshDashboardStats();

  /* --------------------------------------------------------
     DASHBOARD: Logout  (#logout-btn)
  -------------------------------------------------------- */
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem('sf_user');
      window.location.href = '/login';
    });
  }

  /* --------------------------------------------------------
     DASHBOARD: Sidebar Navigation
  -------------------------------------------------------- */
  const menuItems = document.querySelectorAll('.menu-item[data-target]');
  const views = document.querySelectorAll('.dashboard-view');

  window.switchView = function (targetId) {
    menuItems.forEach(item => {
      const isActive = item.getAttribute('data-target') === targetId;
      item.classList.toggle('active', isActive);
      // Keep result tab visible once unlocked
      if (isActive && targetId === 'view-result') {
        item.style.display = 'flex';
      }
    });
    views.forEach(view => {
      view.classList.toggle('active', view.id === targetId);
    });
  };

  menuItems.forEach(item => {
    item.addEventListener('click', () => {
      switchView(item.getAttribute('data-target'));
      const toggle = document.getElementById('dash-menu-toggle');
      if (toggle) toggle.checked = false;
    });
  });

  /* --------------------------------------------------------
     DASHBOARD: File Upload Display  (#file-upload / #file-name)
  -------------------------------------------------------- */
  const fileInput = document.getElementById('file-upload');
  const fileNameDisplay = document.getElementById('file-name');

  if (fileInput && fileNameDisplay) {
    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        fileNameDisplay.textContent = e.target.files[0].name;
        fileNameDisplay.style.color = 'var(--primary)';
      } else {
        fileNameDisplay.textContent = 'Click to select PDF or Image';
        fileNameDisplay.style.color = 'inherit';
      }
    });
  }

  /* --------------------------------------------------------
     DASHBOARD: Charts  (Chart.js — pieChart / barChart)
  -------------------------------------------------------- */
  let pieChartInstance = null;
  let barChartInstance = null;
  let phChartInstance = null;
  let microChartInstance = null;
  let polarChartInstance = null;

  function renderCharts(data) {
    const { N, P, K, ph, temperature, humidity, rainfall } = data;
    const optional = {
      Mg: data.Mg || 0,
      Ca: data.Ca || 0,
      S: data.S || 0,
      Fe: data.Fe || 0,
      Mn: data.Mn || 0,
      Zn: data.Zn || 0,
      Cu: data.Cu || 0
    };

    const ctxPie = document.getElementById('pieChart');
    const ctxBar = document.getElementById('barChart');
    const ctxPh = document.getElementById('phBarChart');
    const ctxMicro = document.getElementById('microChart');
    const ctxPolar = document.getElementById('polarChart');

    if (!ctxPie || !ctxBar || !ctxPh || !ctxMicro || !ctxPolar) return;

    // Destroy existing instances
    [pieChartInstance, barChartInstance, phChartInstance, microChartInstance, polarChartInstance].forEach(inst => inst && inst.destroy());

    // 1. NPK Doughnut Chart
    pieChartInstance = new Chart(ctxPie, {
      type: 'doughnut',
      data: {
        labels: ['Nitrogen', 'Phosphorus', 'Potassium'],
        datasets: [{
          data: [N, P, K],
          backgroundColor: ['#4caf50', '#ff9800', '#f44336'],
          hoverOffset: 12,
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom' }, title: { display: true, text: 'NPK Ratio Distribution' } },
        cutout: '65%'
      }
    });

    // 2. Nutrient Levels Bar Chart
    barChartInstance = new Chart(ctxBar, {
      type: 'bar',
      data: {
        labels: ['N', 'P', 'K'],
        datasets: [{
          label: 'Concentration (kg/ha)',
          data: [N, P, K],
          backgroundColor: ['rgba(76, 175, 80, 0.7)', 'rgba(255, 152, 0, 0.7)', 'rgba(244, 67, 54, 0.7)'],
          borderColor: ['#4caf50', '#ff9800', '#f44336'],
          borderWidth: 1,
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: { y: { beginAtZero: true, title: { display: true, text: 'Values' } } }
      }
    });

    // 3. (Removed Radar Chart)

    // 4. pH Balance Analysis
    phChartInstance = new Chart(ctxPh, {
      type: 'bar',
      data: {
        labels: ['Current pH'],
        datasets: [{
          label: 'pH Level (0-14)',
          data: [ph],
          backgroundColor: ph < 5.5 ? '#f44336' : (ph > 7.5 ? '#1e88e5' : '#4caf50'),
          borderWidth: 1,
          borderRadius: 20,
          barThickness: 40
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        scales: { x: { min: 0, max: 14, ticks: { stepSize: 1 } } },
        plugins: { subtitle: { display: true, text: ph < 5.5 ? 'Acidic' : (ph > 7.5 ? 'Alkaline' : 'Neutral') } }
      }
    });

    // 5. Micronutrients Metrics
    microChartInstance = new Chart(ctxMicro, {
      type: 'bar',
      data: {
        labels: ['Mg', 'Ca', 'S', 'Fe', 'Mn', 'Zn', 'Cu'],
        datasets: [{
          label: 'Micronutrient PPM',
          data: [optional.Mg, optional.Ca, optional.S, optional.Fe, optional.Mn, optional.Zn, optional.Cu],
          backgroundColor: '#9c27b0',
          borderRadius: 4
        }]
      },
      options: {
        indexAxis: 'x',
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } }
      }
    });

    // 6. Soil Fingerprint Polar Area Chart
    polarChartInstance = new Chart(ctxPolar, {
      type: 'polarArea',
      data: {
        labels: ['N', 'P', 'K', 'pH', 'Temp', 'Hum', 'Rain'],
        datasets: [{
          label: 'Full Profile',
          data: [N, P, K, ph * 10, temperature, humidity, rainfall / 5],
          backgroundColor: [
            'rgba(76, 175, 80, 0.5)',
            'rgba(255, 152, 0, 0.5)',
            'rgba(244, 67, 54, 0.5)',
            'rgba(33, 150, 243, 0.5)',
            'rgba(156, 39, 176, 0.5)',
            'rgba(0, 150, 136, 0.5)',
            'rgba(63, 81, 181, 0.5)'
          ]
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'right' } }
      }
    });
  }

  // Initial Placeholder render
  if (document.getElementById('pieChart')) {
    renderCharts({ N: 50, P: 40, K: 40, ph: 6.5, temperature: 25, humidity: 60, rainfall: 100 });
  }

  /* --------------------------------------------------------
     DASHBOARD: Display Results
     API returns:
       crops: [{crop, score}, ...]   ← top-3 ranked crops
       fertilizer: string
       soil: string
       suggestions: string
  -------------------------------------------------------- */
  let currentInputData = null;
  let currentCrops = null;
  let currentFertilizer = null;
  let currentLang = 'en';

  window.translateExplanation = function (lang) {
    if (!currentInputData) return;
    currentLang = lang;
    const explainContent = document.getElementById('simple-explanation-content');
    if (explainContent) {
      explainContent.innerHTML = generateSimpleExplanation(currentInputData, currentCrops, currentFertilizer, lang);
    }

    if (currentFertilizer && currentCrops && currentCrops.length > 0) {
      // Remember which tab was active
      let activeTabIdx = 0;
      for (let i = 0; i < 3; i++) {
        const panel = document.getElementById(`fert-panel-${i}`);
        if (panel && panel.style.display === 'block') {
          activeTabIdx = i;
          break;
        }
      }

      renderFertilizerPlans(currentFertilizer, currentCrops, lang);
      switchFertTab(activeTabIdx);
    }
  };

  function displayResults(data, payloadForDisplay) {
    // -- Recommended Crop (top-1 from ranked array) --
    if (data.crops && data.crops.length > 0) {
      const topCrop = data.crops[0].crop;
      const confidence = data.crops[0].score;
      const displayed = topCrop.charAt(0).toUpperCase() + topCrop.slice(1);
      document.getElementById('res-crop').textContent =
        `${displayed} (${confidence}%)`;
    }

    // -- Fertilizer Plans (top-3) --
    if (data.fertilizer_plans && data.crops && data.crops.length > 0) {
      document.getElementById('res-fert').textContent = 'Stage-wise plan below \u2193';
      renderFertilizerPlans(data.fertilizer_plans, data.crops, currentLang);
    } else {
      document.getElementById('res-fert').textContent = 'N/A';
    }

    // -- Soil Health --
    if (data.soil) {
      document.getElementById('res-health').textContent = data.soil;
    }

    // -- Suggestions --
    if (data.suggestions) {
      document.getElementById('res-suggest').textContent = data.suggestions;
    }

    // -- Water Requirement (derived from soil health) --
    const soil = (data.soil || '').toLowerCase();
    const waterReq =
      soil.includes('poor') || soil.includes('acidic') ? 'High' :
        soil.includes('good') || soil.includes('neutral') ? 'Medium' : 'Moderate';
    document.getElementById('res-water').textContent = waterReq;

    // -- Best Season (generic — API doesn't return this) --
    document.getElementById('res-season').textContent = 'Kharif / Rabi';

    // -- Unlock & show the Analysis Result nav item --
    const navResult = document.getElementById('nav-result');
    if (navResult) navResult.style.display = 'flex';

    // -- Update charts with all soil values --
    if (payloadForDisplay && payloadForDisplay.N !== undefined) {
      renderCharts(payloadForDisplay);
    }

    // -- Top-3 Crops Ranking with Progress Bars --
    if (data.crops && data.crops.length > 0) {
      renderTopCrops(data.crops);
    }

    // Cache current data for translation
    currentInputData = data.input || payloadForDisplay;
    currentCrops = data.crops;
    currentFertilizer = data.fertilizer_plans || data.fertilizer || null;

    // -- Simple Explanation --
    if (currentInputData && data.crops) {
      const explainCard = document.getElementById('simple-explanation-card');
      const explainContent = document.getElementById('simple-explanation-content');
      if (explainCard && explainContent) {
        explainContent.innerHTML = generateSimpleExplanation(currentInputData, data.crops, data.fertilizer_plans || data.fertilizer);
        explainCard.style.display = 'block';
      }
    }

    // -- Dashboard: persist stats --
    try {
      const n = parseInt(localStorage.getItem('sf_analysis_count') || '0', 10) + 1;
      localStorage.setItem('sf_analysis_count', String(n));
      refreshDashboardStats();
    } catch (_) { }

    try {
      if (data.crops && data.crops.length > 0) {
        const raw = data.crops[0].crop;
        const label = raw.charAt(0).toUpperCase() + raw.slice(1);
        localStorage.setItem('sf_last_crop_label', label);
        const lastEl = document.getElementById('dash-stat-lastcrop');
        if (lastEl) lastEl.textContent = label;
      }
    } catch (_) { }
  }

  /* --------------------------------------------------------
     DASHBOARD: Render Top-3 Crops Ranking Block
     Dynamically injected into #view-result .card — no template edit needed
  -------------------------------------------------------- */
  const RANK_META = [
    { label: '\uD83E\uDD47 Best Match', barClass: 'bar-rank-1', badgeClass: 'badge-rank-1' },
    { label: '\uD83E\uDD48 2nd Choice', barClass: 'bar-rank-2', badgeClass: 'badge-rank-2' },
    { label: '\uD83E\uDD49 3rd Choice', barClass: 'bar-rank-3', badgeClass: 'badge-rank-3' }
  ];

  function renderTopCrops(crops) {
    // Remove previous block if user re-runs analysis
    const existing = document.getElementById('top-crops-block');
    if (existing) existing.remove();

    const resultCard = document.querySelector('#view-result .card');
    if (!resultCard) return;

    const block = document.createElement('div');
    block.id = 'top-crops-block';
    block.className = 'top-crops-block';

    const rows = crops.slice(0, 3).map((item, i) => {
      const meta = RANK_META[i];
      const cropName = item.crop.charAt(0).toUpperCase() + item.crop.slice(1);
      const score = parseFloat(item.score);   // already 0-100
      const displayPct = score.toFixed(1);
      return (
        '<div class="crop-rank-item" style="animation-delay:' + (i * 0.13) + 's">' +
        '<div class="crop-rank-top">' +
        '<span class="crop-rank-badge ' + meta.badgeClass + '">' + meta.label + '</span>' +
        '<span class="crop-rank-name">' + cropName + '</span>' +
        '<span class="crop-rank-pct">' + displayPct + '%</span>' +
        '</div>' +
        '<div class="crop-rank-bar-track">' +
        '<div class="crop-rank-bar-fill ' + meta.barClass + '" data-width="' + score + '" style="width:0%"></div>' +
        '</div>' +
        '</div>'
      );
    }).join('');

    block.innerHTML =
      '<div class="top-crops-header">' +
      '<i class="fa-solid fa-ranking-star"></i>' +
      '<span>AI Crop Ranking</span>' +
      '<span class="top-crops-sub">Soil profile &middot; Nutrient score &middot; ML model</span>' +
      '</div>' +
      '<div class="top-crops-list">' + rows + '</div>';

    resultCard.appendChild(block);

    // Animate bars in after a brief paint delay
    requestAnimationFrame(() => {
      setTimeout(() => {
        block.querySelectorAll('.crop-rank-bar-fill').forEach(bar => {
          bar.style.width = bar.dataset.width + '%';
        });
      }, 80);
    });
  }

  /* --------------------------------------------------------
     DASHBOARD: Render Fertilizer Plans Block (top-3 crops)
     Injected into #view-result, tabbed per crop
  -------------------------------------------------------- */
  const planTranslations = {
    en: {
      title: "Fertilizer Plans &mdash; Top 3 Crops",
      subtitle: "Stage-wise fertilizer schedule based on your soil profile and nutrient deficiencies.",
      noPlan: "No detailed plan available for",
      deficiencies: "Deficiencies Detected",
      stageHeader: "Stage",
      fertHeader: "Fertilizer",
      doseHeader: "Dose",
      timeHeader: "Timing",
      microNote: "Micronutrient Note:"
    },
    hi: {
      title: "उर्वरक योजनाएं &mdash; शीर्ष 3 फसलें",
      subtitle: "आपकी मिट्टी प्रोफाइल और पोषक तत्वों की कमी के आधार पर चरण-वार उर्वरक अनुसूची।",
      noPlan: "इसके लिए कोई विस्तृत योजना उपलब्ध नहीं है:",
      deficiencies: "कमियां पाई गईं",
      stageHeader: "चरण",
      fertHeader: "उर्वरक",
      doseHeader: "खुराक",
      timeHeader: "समय",
      microNote: "सूक्ष्म पोषक तत्व नोट:"
    },
    gu: {
      title: "ખાતર યોજનાઓ &mdash; ટોચના 3 પાક",
      subtitle: "તમારી માટી પ્રોફાઇલ અને પોષક તત્વોની ખામી પર આધારિત તબક્કાવાર ખાતર સમયપત્રક.",
      noPlan: "તેના માટે કોઈ વિગતવાર યોજના ઉપલબ્ધ નથી:",
      deficiencies: "ખામીઓ મળી",
      stageHeader: "તબક્કો",
      fertHeader: "ખાતર",
      doseHeader: "માત્રા",
      timeHeader: "સમય",
      microNote: "સૂક્ષ્મ પોષકતત્વો નોંધ:"
    }
  };

  const termDict = {
    'Basal': { hi: 'बुनियादी', gu: 'પાયાનું' },
    'Tillering': { hi: 'कल्ले निकलना', gu: 'ફૂટ આવવી' },
    'Panicle': { hi: 'बालियां आना', gu: 'કણસલાં' },
    'Vegetative': { hi: 'वनस्पतिक', gu: 'વનસ્પતિક' },
    'Pre-tasseling': { hi: 'मंजरी से पहले', gu: 'મંજરી પહેલાં' },
    'Flowering': { hi: 'फूल आना', gu: 'ફૂલ આવવા' },
    'Planting': { hi: 'रोपण', gu: 'રોપાણ' },
    'Growth': { hi: 'विकास', gu: 'વિકાસ' },
    'Pre-monsoon': { hi: 'मानसून पूर्व', gu: 'ચોમાસા પહેલાં' },
    'Post-monsoon': { hi: 'मानसून उपरांत', gu: 'ચોમાસા પછી' },
    'Dormant': { hi: 'सुप्त', gu: 'સુષુપ્ત' },
    'Fruiting': { hi: 'फल आना', gu: 'ફળ આવવા' },
    'Fruit set': { hi: 'फल बनना', gu: 'ફળ બનવા' },
    'Annual': { hi: 'वार्षिक', gu: 'વાર્ષિક' },
    'Pruning': { hi: 'कटाई-छंटाई', gu: 'કાપણી' },
    'Pre-flowering': { hi: 'फूल आने से पहले', gu: 'ફૂલ આવતા પહેલા' },
    'Before transplanting': { hi: 'रोपाई से पहले', gu: 'રોપણી પહેલાં' },
    'At sowing': { hi: 'बुवाई के समय', gu: 'વાવણી સમયે' },
    'Before sowing': { hi: 'बुवाई से पहले', gu: 'વાવણી પહેલાં' },
    'At planting': { hi: 'रोपण के समय', gu: 'રોપાણ સમયે' },
    'Monthly': { hi: 'मासिक', gu: 'માસિક' },
    'After flowering': { hi: 'फूल आने के बाद', gu: 'ફૂલ આવ્યા પછી' },
    'Before rains': { hi: 'बारिश से पहले', gu: 'વરસાદ પહેલા' },
    'After rains': { hi: 'बारिश के बाद', gu: 'વરસાદ પછી' },
    'Winter': { hi: 'सर्दी', gu: 'શિયાળો' },
    'Spring': { hi: 'वसंत', gu: 'વસંત' },
    'After pruning': { hi: 'कटाई के बाद', gu: 'કાપણી પછી' },
    'Before fruiting': { hi: 'फल आने से पहले', gu: 'ફળ આવતા પહેલા' },
    'After fruit set': { hi: 'फल बनने के बाद', gu: 'ફળ બન્યા પછી' },
    'Nitrogen low → Increase Urea': { hi: 'नाइट्रोजन कम → यूरिया बढ़ाएं', gu: 'નાઈટ્રોજન ઓછું → યુરિયા વધારો' },
    'Phosphorus low → Add DAP': { hi: 'फास्फोरस कम → डीएपी डालें', gu: 'ફોસ્ફરસ ઓછું → ડીએપી ઉમેરો' },
    'Potassium low → Add MOP': { hi: 'पोटेशियम कम → एमओपी डालें', gu: 'પોટેશિયમ ઓછું → એમઓપી ઉમેરો' },
    'deficiency detected': { hi: 'की कमी पाई गई', gu: 'ની ખામી મળી' },
    'days': { hi: 'दिन', gu: 'દિવસ' },
    '/acre': { hi: '/एकड़', gu: '/એકર' },
    '/plant': { hi: '/पौधा', gu: '/છોડ' },
    '/tree': { hi: '/पेड़', gu: '/ઝાડ' }
  };

  function translateTerm(text, lang) {
    if (!text || lang === 'en') return text;
    let translated = text;
    for (const [enTerm, trans] of Object.entries(termDict)) {
      if (trans[lang]) {
        const regex = new RegExp(enTerm, 'gi');
        translated = translated.replace(regex, trans[lang]);
      }
    }
    return translated;
  }

  function getTranslatedCrop(rawCrop, lang) {
    const cropTranslations = {
      'apple': { hi: 'सेब', gu: 'સફરજન' },
      'banana': { hi: 'केला', gu: 'કેળું' },
      'blackgram': { hi: 'उड़द', gu: 'અડદ' },
      'chickpea': { hi: 'चना', gu: 'ચણા' },
      'coconut': { hi: 'नारियल', gu: 'નાળિયેર' },
      'coffee': { hi: 'कॉफी', gu: 'કોફી' },
      'cotton': { hi: 'कपास', gu: 'કપાસ' },
      'grapes': { hi: 'अंगूर', gu: 'દ્રાક્ષ' },
      'jute': { hi: 'जूट', gu: 'શણ' },
      'kidneybeans': { hi: 'राजमा', gu: 'રાજમા' },
      'lentil': { hi: 'मसूर', gu: 'મસૂર' },
      'maize': { hi: 'मक्का', gu: 'મકાઈ' },
      'mango': { hi: 'आम', gu: 'કેરી' },
      'mothbeans': { hi: 'मोठ दाल', gu: 'મઠ' },
      'mungbean': { hi: 'मूंग दाल', gu: 'મગ' },
      'muskmelon': { hi: 'खरबूजा', gu: 'ટેટી' },
      'orange': { hi: 'संतरा', gu: 'નારંગી' },
      'papaya': { hi: 'पपीता', gu: 'પપૈયું' },
      'pigeonpeas': { hi: 'अरहर (तूर)', gu: 'તુવેર' },
      'pomegranate': { hi: 'अनार', gu: 'દાડમ' },
      'rice': { hi: 'चावल (धान)', gu: 'ચોખા' },
      'watermelon': { hi: 'तरबूज', gu: 'તરબૂચ' },
      'wheat': { hi: 'गेहूँ', gu: 'ઘઉં' },
      'sugarcane': { hi: 'गन्ना', gu: 'શેરડી' },
      'soyabeans': { hi: 'सोयाबीन', gu: 'સોયાબીન' },
      'peas': { hi: 'मटर', gu: 'વટાણા' },
      'groundnut': { hi: 'मूंगफली', gu: 'મગફળી' }
    };
    let name = rawCrop.charAt(0).toUpperCase() + rawCrop.slice(1);
    if (lang !== 'en' && cropTranslations[rawCrop.toLowerCase()] && cropTranslations[rawCrop.toLowerCase()][lang]) {
      name = cropTranslations[rawCrop.toLowerCase()][lang];
    }
    return name;
  }

  function renderFertilizerPlans(plans, crops, lang = 'en') {
    const existing = document.getElementById('fertilizer-plans-block');
    if (existing) existing.remove();

    const resultSection = document.getElementById('view-result');
    if (!resultSection) return;

    const block = document.createElement('div');
    block.id = 'fertilizer-plans-block';
    block.className = 'card';
    block.style.marginTop = '20px';

    const t = planTranslations[lang] || planTranslations['en'];

    const TAB_COLORS = [
      { bg: '#e8f5e9', border: '#4caf50', text: '#2e7d32' },
      { bg: '#e3f2fd', border: '#2196f3', text: '#1565c0' },
      { bg: '#fff3e0', border: '#ff9800', text: '#e65100' }
    ];
    const MEDALS = ['\uD83E\uDD47', '\uD83E\uDD48', '\uD83E\uDD49'];

    let html = `
      <h3 style="margin-bottom:5px;">
        <i class="fa-solid fa-flask"></i> ${t.title}
      </h3>
      <p class="text-muted" style="margin-bottom:20px; font-size:0.9rem;">
        ${t.subtitle}
      </p>
      <div style="display:flex; gap:8px; margin-bottom:20px; flex-wrap:wrap;">`;

    crops.slice(0, 3).forEach((item, i) => {
      const c = TAB_COLORS[i];
      const name = getTranslatedCrop(item.crop, lang);
      html += `
        <button id="fert-tab-btn-${i}" onclick="switchFertTab(${i})"
          style="padding:8px 18px; border-radius:20px; border:2px solid ${c.border};
                 background:${i === 0 ? c.bg : 'white'}; color:${c.text};
                 font-weight:600; cursor:pointer; font-size:0.9rem; transition:all 0.2s;">
          ${MEDALS[i]} ${name}
        </button>`;
    });
    html += `</div>`;

    crops.slice(0, 3).forEach((item, i) => {
      const plan = plans[item.crop];
      const name = getTranslatedCrop(item.crop, lang);
      html += `<div id="fert-panel-${i}" style="display:${i === 0 ? 'block' : 'none'};">`;

      if (!plan || plan.message) {
        html += `<p class="text-muted">${t.noPlan} ${name}.</p>`;
      } else {
        // Deficiency warnings
        if (plan.deficiencies && plan.deficiencies.length > 0) {
          html += `
            <div style="background:#fff3e0; border-left:4px solid #ff9800;
                        border-radius:8px; padding:12px 15px; margin-bottom:18px;">
              <strong style="color:#e65100;">
                <i class="fa-solid fa-triangle-exclamation"></i> ${t.deficiencies}
              </strong>
              <ul style="margin:8px 0 0 0; padding-left:20px; color:#bf360c;">`;
          plan.deficiencies.forEach(d => {
            html += `<li style="margin-bottom:4px;">${translateTerm(d, lang)}</li>`;
          });
          html += `</ul></div>`;
        }

        // Stage-wise table
        html += `
          <div style="overflow-x:auto; margin-bottom:15px;">
            <table style="width:100%; border-collapse:collapse; font-size:0.92rem;">
              <thead>
                <tr style="background:#f5f5f5;">
                  <th style="padding:10px 14px; text-align:left; border-bottom:2px solid #e0e0e0; color:#555;">${t.stageHeader}</th>
                  <th style="padding:10px 14px; text-align:left; border-bottom:2px solid #e0e0e0; color:#555;">${t.fertHeader}</th>
                  <th style="padding:10px 14px; text-align:left; border-bottom:2px solid #e0e0e0; color:#555;">${t.doseHeader}</th>
                  <th style="padding:10px 14px; text-align:left; border-bottom:2px solid #e0e0e0; color:#555;">${t.timeHeader}</th>
                </tr>
              </thead>
              <tbody>`;
        plan.stages.forEach((s, idx) => {
          const rowBg = idx % 2 === 0 ? 'white' : '#fafafa';
          html += `
                <tr style="background:${rowBg};">
                  <td style="padding:10px 14px; border-bottom:1px solid #eee; font-weight:600; color:#2e7d32;">${translateTerm(s.stage, lang)}</td>
                  <td style="padding:10px 14px; border-bottom:1px solid #eee;">${translateTerm(s.fertilizer, lang)}</td>
                  <td style="padding:10px 14px; border-bottom:1px solid #eee; color:#1565c0;">${translateTerm(s.dose, lang)}</td>
                  <td style="padding:10px 14px; border-bottom:1px solid #eee; color:#e65100;">${translateTerm(s.timing, lang)}</td>
                </tr>`;
        });
        html += `</tbody></table></div>`;

        // Micronutrient note
        html += `
          <div style="background:#e8f5e9; border-left:4px solid #4caf50;
                      border-radius:8px; padding:12px 15px;">
            <strong style="color:#2e7d32;">
              <i class="fa-solid fa-seedling"></i> ${t.microNote}
            </strong>
            <span style="color:#424242; margin-left:6px;">${translateTerm(plan.micronutrients, lang)}</span>
          </div>`;
      }

      html += `</div>`;  // end panel
    });

    block.innerHTML = html;
    resultSection.appendChild(block);
  }

  window.switchFertTab = function (activeIdx) {
    const TAB_COLORS = [
      { bg: '#e8f5e9', border: '#4caf50', text: '#2e7d32' },
      { bg: '#e3f2fd', border: '#2196f3', text: '#1565c0' },
      { bg: '#fff3e0', border: '#ff9800', text: '#e65100' }
    ];
    for (let i = 0; i < 3; i++) {
      const panel = document.getElementById(`fert-panel-${i}`);
      const btn   = document.getElementById(`fert-tab-btn-${i}`);
      if (panel) panel.style.display = i === activeIdx ? 'block' : 'none';
      if (btn) {
        const c = TAB_COLORS[i];
        btn.style.background = i === activeIdx ? c.bg : 'white';
      }
    }
  };

  
  function classifyNPK(value) {
    if (value < 40) return 'low';
    if (value <= 80) return 'moderate';
    return 'high';
  }

  function classifyPH(value) {
    if (value < 5.5) return 'acidic';
    if (value <= 7.5) return 'neutral';
    return 'alkaline';
  }

  function classifyTemp(value) {
    if (value < 15) return 'low';
    if (value <= 30) return 'moderate';
    return 'high';
  }

  function classifyHumidity(value) {
    if (value < 40) return 'low';
    if (value <= 70) return 'moderate';
    return 'high';
  }

  function classifyRainfall(value) {
    if (value < 50) return 'low';
    if (value <= 150) return 'moderate';
    return 'high';
  }

  const translations = {
    en: {
      summary: "Here is your personalized summary based on the analysis:",
      n_high: "<strong>Nitrogen is high</strong>, providing excellent energy for rapid leaf and stem growth.",
      n_mod: "<strong>Nitrogen is moderate</strong>, which is acceptable but leaves room for optimization depending on the crop.",
      n_low: "<strong>Nitrogen is low</strong>. You should definitely consider supplementing it to prevent stunted plant development.",
      pk_levels: (p, k) => `Your Phosphorus levels are <strong>${p}</strong> and Potassium levels are <strong>${k}</strong>. `,
      pk_low: "Low levels can weaken root systems and disease resistance.",
      pk_high: "These are critical for strong roots and flowering.",
      ph_neutral: "Soil pH is <strong>neutral</strong>. Almost all crops thrive in this balanced environment!",
      ph_acidic: "Soil pH is <strong>acidic</strong>. You might need to apply lime to sweeten the soil before planting.",
      ph_alkaline: "Soil pH is <strong>alkaline</strong>. Adding organic matter or sulfur may be required to lower the pH.",
      temp_high: (t) => `Temperature is <strong>high (${t}°C)</strong>. Heat-tolerant crops will perform best here.`,
      temp_mod: (t) => `Temperature is <strong>moderate (${t}°C)</strong>, which is optimal for a wide variety of crops.`,
      temp_low: (t) => `Temperature is <strong>low (${t}°C)</strong>. Cold-hardy crops or greenhouse protection is recommended.`,
      hum_high: (h) => `Humidity is <strong>high (${h}%)</strong>. Ensure good airflow to prevent fungal diseases.`,
      hum_mod: (h) => `Humidity is <strong>moderate (${h}%)</strong>, providing good environmental balance.`,
      hum_low: (h) => `Humidity is <strong>low (${h}%)</strong>. Extra irrigation may be necessary to preserve plant moisture.`,
      verdict_title: "Final Verdict:",
      verdict: "The absolute best crop for this specific field is",
      action_title: "Recommended Action:",
      action_balanced: "Soil nutrients are balanced.",
      action_treat: "Treat your soil with",
      action_yield: "to achieve optimal yields."
    },
    hi: {
      summary: "विश्लेषण के आधार पर आपका व्यक्तिगत सारांश यहाँ है:",
      n_high: "<strong>नाइट्रोजन उच्च है</strong>, जो तेजी से पत्ती और तने के विकास के लिए उत्कृष्ट ऊर्जा प्रदान करता है।",
      n_mod: "<strong>नाइट्रोजन मध्यम है</strong>, जो स्वीकार्य है लेकिन फसल के आधार पर अनुकूलन की गुंजाइश छोड़ता है।",
      n_low: "<strong>नाइट्रोजन कम है</strong>। पौधों के कमजोर विकास को रोकने के लिए आपको निश्चित रूप से इसे पूरक करने पर विचार करना चाहिए।",
      pk_levels: (p, k) => `आपका फास्फोरस स्तर <strong>${p}</strong> है और पोटेशियम स्तर <strong>${k}</strong> है। `,
      pk_low: "निम्न स्तर जड़ प्रणाली और रोग प्रतिरोध क्षमता को कमजोर कर सकते हैं।",
      pk_high: "ये मजबूत जड़ों और फूल आने के लिए महत्वपूर्ण हैं।",
      ph_neutral: "मिट्टी का pH <strong>तटस्थ</strong> है। इस संतुलित वातावरण में लगभग सभी फसलें पनपती हैं!",
      ph_acidic: "मिट्टी का pH <strong>अम्लीय</strong> है। रोपण से पहले मिट्टी को मीठा करने के लिए आपको चूना लगाने की आवश्यकता हो सकती है।",
      ph_alkaline: "मिट्टी का pH <strong>क्षारीय</strong> है। pH को कम करने के लिए जैविक पदार्थ या सल्फर मिलाने की आवश्यकता हो सकती है।",
      temp_high: (t) => `तापमान <strong>उच्च (${t}°C)</strong> है। गर्मी सहने वाली फसलें यहाँ सबसे अच्छा प्रदर्शन करेंगी।`,
      temp_mod: (t) => `तापमान <strong>मध्यम (${t}°C)</strong> है, जो विभिन्न प्रकार की फसलों के लिए अनुकूल है।`,
      temp_low: (t) => `तापमान <strong>कम (${t}°C)</strong> है। ठंड सहने वाली फसलों या ग्रीनहाउस सुरक्षा की सिफारिश की जाती है।`,
      hum_high: (h) => `आर्द्रता <strong>उच्च (${h}%)</strong> है। फंगल रोगों को रोकने के लिए अच्छी वायु प्रवाह सुनिश्चित करें।`,
      hum_mod: (h) => `आर्द्रता <strong>मध्यम (${h}%)</strong> है, जो पर्यावरण का अच्छा संतुलन प्रदान करती है।`,
      hum_low: (h) => `आर्द्रता <strong>कम (${h}%)</strong> है। पौधों की नमी को बनाए रखने के लिए अतिरिक्त सिंचाई आवश्यक हो सकती है।`,
      verdict_title: "अंतिम निर्णय:",
      verdict: "इस विशिष्ट खेत के लिए सबसे अच्छी फसल है",
      action_title: "अनुशंसित कार्रवाई:",
      action_balanced: "मिट्टी के पोषक तत्व संतुलित हैं।",
      action_treat: "इष्टतम पैदावार प्राप्त करने के लिए अपनी मिट्टी का उपचार",
      action_yield: "के साथ करें।"
    },
    gu: {
      summary: "વિશ્લેષણના આધારે તમારો વ્યક્તિગત સારાંશ અહીં છે:",
      n_high: "<strong>નાઇટ્રોજન વધારે છે</strong>, જે પાંદડા અને દાંડીના ઝડપી વિકાસ માટે ઉત્તમ ઉર્જા પ્રદાન કરે છે.",
      n_mod: "<strong>નાઇટ્રોજન મધ્યમ છે</strong>, જે સ્વીકાર્ય છે પરંતુ પાકને આધારે સુધારણા માટે અવકાશ છોડે છે.",
      n_low: "<strong>નાઇટ્રોજન ઓછું છે</strong>. છોડના નબળા વિકાસને અટકાવવા માટે તમારે તેને પૂરક બનાવવાનું ચોક્કસપણે વિચારવું જોઈએ.",
      pk_levels: (p, k) => `તમારું ફોસ્ફરસ સ્તર <strong>${p}</strong> છે અને પોટેશિયમ સ્તર <strong>${k}</strong> છે. `,
      pk_low: "નીચા સ્તર રુટ સિસ્ટમ્સ અને રોગ પ્રતિકારને નબળા કરી શકે છે.",
      pk_high: "આ મજબૂત મૂળ અને ફૂલો માટે નિર્ણાયક છે.",
      ph_neutral: "માટીનું pH <strong>તટસ્થ</strong> છે. લગભગ તમામ પાકો આ સંતુલિત વાતાવરણમાં વિકાસ પામે છે!",
      ph_acidic: "માટીનું pH <strong>એસિડિક</strong> છે. માટીને વાવેતર યોગ્ય બનાવવા માટે ચૂનો લગાવવાની જરૂર પડી શકે છે.",
      ph_alkaline: "માટીનું pH <strong>આલ્કલાઇન</strong> છે. pH ઘટાડવા માટે કાર્બનિક પદાર્થો અથવા સલ્ફર ઉમેરવાની જરૂર પડી શકે છે.",
      temp_high: (t) => `તાપમાન <strong>ઊંચું (${t}°C)</strong> છે. ગરમી-સહન કરતા પાકો અહીં શ્રેષ્ઠ પ્રદર્શન કરશે.`,
      temp_mod: (t) => `તાપમાન <strong>મધ્યમ (${t}°C)</strong> છે, જે પાકની વિશાળ વિવિધતા માટે શ્રેષ્ઠ છે.`,
      temp_low: (t) => `તાપમાન <strong>નીચું (${t}°C)</strong> છે. ગ્રીનહાઉસ રક્ષણની ભલામણ કરવામાં આવે છે.`,
      hum_high: (h) => `ભેજ <strong>વધારે (${h}%)</strong> છે. ફંગલ રોગોને રોકવા સારો હવાનો પ્રવાહ સુનિશ્ચિત કરો.`,
      hum_mod: (h) => `ભેજ <strong>મધ્યમ (${h}%)</strong> છે, જે સારું પર્યાવરણીય સંતુલન પ્રદાન કરે છે.`,
      hum_low: (h) => `ભેજ <strong>ઓછો (${h}%)</strong> છે. છોડનો ભેજ જાળવવા વધારાની સિંચાઈ જરૂરી બની શકે છે.`,
      verdict_title: "અંતિમ નિર્ણય:",
      verdict: "આ ચોક્કસ ખેતર માટે સૌથી શ્રેષ્ઠ પાક છે",
      action_title: "ભલામણ કરેલ કાર્યવાહી:",
      action_balanced: "માટીના પોષક તત્વો સંતુલિત છે.",
      action_treat: "શ્રેષ્ઠ ઉપજ મેળવવા માટે તમારી માટીની સારવાર",
      action_yield: "સાથે કરો."
    }
  };

  function generateSimpleExplanation(input, crops, fertilizer, lang = 'en') {
    const t = translations[lang] || translations['en'];
    let explanationHTML = `<p style="font-weight: 500;">${t.summary}</p><ul style="line-height: 1.6;">`;

    const nStatus = classifyNPK(input.N);
    const pStatus = classifyNPK(input.P);
    const kStatus = classifyNPK(input.K);
    const phStatus = classifyPH(input.ph || input.pH);
    const tempStatus = classifyTemp(input.temperature);
    const humStatus = classifyHumidity(input.humidity);

    // Nitrogen
    if (nStatus === 'high') explanationHTML += `<li><span style="color: #2e7d32;">${t.n_high}</span></li>`;
    else if (nStatus === 'moderate') explanationHTML += `<li>${t.n_mod}</li>`;
    else explanationHTML += `<li><span style="color: #c62828;">${t.n_low}</span></li>`;

    // Phosphorus and Potassium
    explanationHTML += `<li>${t.pk_levels(pStatus, kStatus)}`;
    if (pStatus === 'low' || kStatus === 'low') {
      explanationHTML += `${t.pk_low}</li>`;
    } else {
      explanationHTML += `${t.pk_high}</li>`;
    }

    // pH
    if (phStatus === 'neutral') explanationHTML += `<li><span style="color: #1565c0;">${t.ph_neutral}</span></li>`;
    else if (phStatus === 'acidic') explanationHTML += `<li><span style="color: #c62828;">${t.ph_acidic}</span></li>`;
    else explanationHTML += `<li><span style="color: #c62828;">${t.ph_alkaline}</span></li>`;

    // Temperature
    if (tempStatus === 'high') explanationHTML += `<li>${t.temp_high(input.temperature)}</li>`;
    else if (tempStatus === 'moderate') explanationHTML += `<li><span style="color: #2e7d32;">${t.temp_mod(input.temperature)}</span></li>`;
    else explanationHTML += `<li><span style="color: #1565c0;">${t.temp_low(input.temperature)}</span></li>`;

    // Humidity
    if (humStatus === 'high') explanationHTML += `<li>${t.hum_high(input.humidity)}</li>`;
    else if (humStatus === 'moderate') explanationHTML += `<li><span style="color: #2e7d32;">${t.hum_mod(input.humidity)}</span></li>`;
    else explanationHTML += `<li><span style="color: #c62828;">${t.hum_low(input.humidity)}</span></li>`;

    explanationHTML += '</ul>';

    if (crops && crops.length > 0) {
      const rawCrop = crops[0].crop.toLowerCase().trim();
      const cropTranslations = {
        'apple': { hi: 'सेब', gu: 'સફરજન' },
        'banana': { hi: 'केला', gu: 'કેળું' },
        'blackgram': { hi: 'उड़द', gu: 'અડદ' },
        'chickpea': { hi: 'चना', gu: 'ચણા' },
        'coconut': { hi: 'नारियल', gu: 'નાળિયેર' },
        'coffee': { hi: 'कॉफी', gu: 'કોફી' },
        'cotton': { hi: 'कपास', gu: 'કપાસ' },
        'grapes': { hi: 'अंगूर', gu: 'દ્રાક્ષ' },
        'jute': { hi: 'जूट', gu: 'શણ' },
        'kidneybeans': { hi: 'राजमा', gu: 'રાજમા' },
        'lentil': { hi: 'मसूर', gu: 'મસૂર' },
        'maize': { hi: 'मक्का', gu: 'મકાઈ' },
        'mango': { hi: 'आम', gu: 'કેરી' },
        'mothbeans': { hi: 'मोठ दाल', gu: 'મઠ' },
        'mungbean': { hi: 'मूंग दाल', gu: 'મગ' },
        'muskmelon': { hi: 'खरबूजा', gu: 'ટેટી' },
        'orange': { hi: 'संतरा', gu: 'નારંગી' },
        'papaya': { hi: 'पपीता', gu: 'પપૈયું' },
        'pigeonpeas': { hi: 'अरहर (तूर)', gu: 'તુવેર' },
        'pomegranate': { hi: 'अनार', gu: 'દાડમ' },
        'rice': { hi: 'चावल (धान)', gu: 'ચોખા' },
        'watermelon': { hi: 'तरबूज', gu: 'તરબૂચ' },
        'wheat': { hi: 'गेहूँ', gu: 'ઘઉં' },
        'sugarcane': { hi: 'गन्ना', gu: 'શેરડી' },
        'soyabeans': { hi: 'सोयाबीन', gu: 'સોયાબીન' },
        'peas': { hi: 'मटर', gu: 'વટાણા' },
        'groundnut': { hi: 'मूंगफली', gu: 'મગફળી' }
      };

      let bestCrop = rawCrop.charAt(0).toUpperCase() + rawCrop.slice(1);
      if (lang !== 'en' && cropTranslations[rawCrop] && cropTranslations[rawCrop][lang]) {
        bestCrop = cropTranslations[rawCrop][lang];
      }

      explanationHTML += `
        <div style="background: #e8f5e9; padding: 15px; border-radius: 8px; margin-top: 20px; border-left: 4px solid #4caf50;">
          <p style="margin: 0; font-size: 1.05rem;">
            🌱 <strong>${t.verdict_title}</strong> ${t.verdict} 
            <span style="background: #4caf50; color: white; padding: 2px 8px; border-radius: 4px; font-weight: bold; font-size: 1.1rem; margin: 0 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">${bestCrop}</span>.
          </p>
        </div>`;
    }

    // Fertilizer action — derived from top crop's plan deficiencies
    if (fertilizer && typeof fertilizer === 'object' && crops && crops.length > 0) {
      const topCrop = crops[0].crop.toLowerCase();
      const plan = fertilizer[topCrop];
      if (plan && !plan.message) {
        if (plan.deficiencies && plan.deficiencies.length > 0) {
          const fertStr = plan.deficiencies.join('; ');
          explanationHTML += `
            <div style="background: #fff3e0; padding: 15px; border-radius: 8px; margin-top: 15px; border-left: 4px solid #ff9800;">
              <p style="margin: 0; font-size: 1.05rem;">
                \uD83E\uDDEA <strong>${t.action_title}</strong> ${t.action_treat}
                <span style="background: #ff9800; color: white; padding: 2px 8px; border-radius: 4px; font-weight: bold; font-size: 1rem; margin: 0 4px;">${fertStr}</span> ${t.action_yield}
              </p>
            </div>`;
        } else {
          explanationHTML += `
            <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin-top: 15px; border-left: 4px solid #2196f3;">
              <p style="margin: 0; font-size: 1.05rem;">
                \u2705 <strong>${t.action_title}</strong>
                <span style="font-weight: bold; font-size: 1.1rem; color: #1565c0;">${t.action_balanced}</span>
              </p>
            </div>`;
        }
      }
    } else if (fertilizer && typeof fertilizer === 'string') {
      const fertLower = fertilizer.toLowerCase();
      if (fertLower.includes('balanced') || fertLower.includes('optimal') || fertLower === 'none') {
        explanationHTML += `
          <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin-top: 15px; border-left: 4px solid #2196f3;">
            <p style="margin: 0; font-size: 1.05rem;">
              \u2705 <strong>${t.action_title}</strong>
              <span style="font-weight: bold; font-size: 1.1rem; color: #1565c0;">${t.action_balanced}</span>
            </p>
          </div>`;
      } else {
        explanationHTML += `
          <div style="background: #fff3e0; padding: 15px; border-radius: 8px; margin-top: 15px; border-left: 4px solid #ff9800;">
            <p style="margin: 0; font-size: 1.05rem;">
              \uD83E\uDDEA <strong>${t.action_title}</strong> ${t.action_treat}
              <span style="background: #ff9800; color: white; padding: 2px 8px; border-radius: 4px; font-weight: bold; font-size: 1.1rem; margin: 0 4px;">${fertilizer}</span> ${t.action_yield}
            </p>
          </div>`;
      }
    }

    return explanationHTML;
  }

  /* --------------------------------------------------------
     Helpers: Loading overlay
  -------------------------------------------------------- */
  const loadingOverlay = document.getElementById('loading-overlay');

  function showLoading() {
    if (loadingOverlay) loadingOverlay.style.display = 'flex';
  }
  function hideLoading() {
    if (loadingOverlay) loadingOverlay.style.display = 'none';
  }

  /* --------------------------------------------------------
     DASHBOARD: Manual Form Submit  (#manualForm)
     Fields: nitrogen, phosphorus, potassium, ph,
             temperature, humidity, rainfall, manualSoilType
     Optional: manMg, manCa, manS, manFe, manMn, manZn, manCu
  -------------------------------------------------------- */
  const manualForm = document.getElementById('manualForm');
  const manualSubmitBtn = document.getElementById('manualSubmitBtn');

  if (manualForm) {
    manualForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const manualError = document.getElementById('manualError');
      const manualErrorMsg = document.getElementById('manualErrorMsg');

      // Hide previous error
      if (manualError) manualError.classList.add('d-none');

      // Collect required fields
      const N = parseFloat(document.getElementById('nitrogen').value);
      const P = parseFloat(document.getElementById('phosphorus').value);
      const K = parseFloat(document.getElementById('potassium').value);
      const ph = parseFloat(document.getElementById('ph').value);
      const temperature = parseFloat(document.getElementById('temperature').value);
      const humidity = parseFloat(document.getElementById('humidity').value);
      const rainfall = parseFloat(document.getElementById('rainfall').value);
      const soil_type = document.getElementById('manualSoilType').value;

      // Validation
      if ([N, P, K, ph, temperature, humidity, rainfall].some(v => isNaN(v)) || !soil_type) {
        if (manualError && manualErrorMsg) {
          manualErrorMsg.textContent = 'Please fill in all required fields including soil type.';
          manualError.classList.remove('d-none');
        }
        return;
      }

      // Optional micronutrients helper
      const optional = (id) => {
        const el = document.getElementById(id);
        const val = el ? parseFloat(el.value) : NaN;
        return isNaN(val) ? null : val;
      };

      const payload = {
        N, P, K, ph, temperature, humidity, rainfall, soil_type,
        Mg: optional('manMg'),
        Ca: optional('manCa'),
        S: optional('manS'),
        Fe: optional('manFe'),
        Mn: optional('manMn'),
        Zn: optional('manZn'),
        Cu: optional('manCu')
      };

      // Show spinner state on button
      if (manualSubmitBtn) {
        manualSubmitBtn.querySelector('.btn-text')?.classList.add('d-none');
        manualSubmitBtn.querySelector('.btn-spinner')?.classList.remove('d-none');
        manualSubmitBtn.disabled = true;
      }

      showLoading();

      try {
        const response = await fetch('/predict', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.error || `Server error (${response.status})`);
        }

        const data = await response.json();
        displayResults(data, payload);
        saveReport(data, payload);

        setTimeout(() => {
          hideLoading();
          switchView('view-result');
        }, 600);

      } catch (error) {
        console.error('Prediction Error:', error);
        hideLoading();
        if (manualError && manualErrorMsg) {
          manualErrorMsg.textContent = error.message || 'Failed to connect to the AI server.';
          manualError.classList.remove('d-none');
        }
      } finally {
        // Restore button
        if (manualSubmitBtn) {
          manualSubmitBtn.querySelector('.btn-text')?.classList.remove('d-none');
          manualSubmitBtn.querySelector('.btn-spinner')?.classList.add('d-none');
          manualSubmitBtn.disabled = false;
        }
      }
    });
  }

  /* --------------------------------------------------------
     DASHBOARD: File Upload Submit  (#upload-form)
     Sends: file (PDF/image), soil_type, optional micronutrients
            (re-uses values from manualForm if filled)
  -------------------------------------------------------- */
  const uploadForm = document.getElementById('upload-form');

  if (uploadForm) {
    uploadForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const errorDiv = document.getElementById('upload-error');
      const file = fileInput ? fileInput.files[0] : null;

      if (!file) {
        errorDiv.textContent = 'Please select a file first.';
        errorDiv.style.display = 'block';
        return;
      }

      errorDiv.style.display = 'none';
      showLoading();

      const formData = new FormData();
      formData.append('file', file);

      // Attach soil_type from the manual panel if available
      const soilTypeEl = document.getElementById('manualSoilType');
      if (soilTypeEl && soilTypeEl.value) {
        formData.append('soil_type', soilTypeEl.value);
      }

      // Attach optional micronutrients from manual panel if available
      const microMap = { manMg: 'Mg', manCa: 'Ca', manS: 'S', manFe: 'Fe', manMn: 'Mn', manZn: 'Zn', manCu: 'Cu' };
      Object.entries(microMap).forEach(([elId, key]) => {
        const el = document.getElementById(elId);
        if (el && el.value.trim()) formData.append(key, el.value.trim());
      });

      try {
        const response = await fetch('/upload', {
          method: 'POST',
          body: formData
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.error || `Server error (${response.status})`);
        }

        const data = await response.json();
        // No NPK values to chart from upload (API doesn't echo them back)
        displayResults(data, data.input || null);
        saveReport(data, data.input || null);

        setTimeout(() => {
          hideLoading();
          switchView('view-result');
        }, 600);

      } catch (error) {
        console.error('Upload Error:', error);
        hideLoading();
        errorDiv.textContent = error.message || 'Failed to extract data from the document. Try manual entry.';
        errorDiv.style.display = 'block';
      }
    });
  }

  // Removed defunct downloadPdfBtn logic

  /* --------------------------------------------------------
     SAVE REPORT  — called after every successful analysis
     Silently posts to /save-report; failure is non-blocking
  -------------------------------------------------------- */
  async function saveReport(apiResult, inputPayload) {
    try {
      const user = JSON.parse(localStorage.getItem('sf_user') || '{}');
      const email = user.email;
      if (!email) return; // Not logged in — skip silently

      const output = {
        crops: apiResult.crops || [],
        soil: apiResult.soil || '',
        fertilizer_plans: apiResult.fertilizer_plans || {},
        suggestions: apiResult.suggestions || ''
      };

      await fetch('/save-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, input: inputPayload || {}, output })
      });
    } catch (err) {
      console.warn('[saveReport] Failed silently:', err);
    }
  }

  /* --------------------------------------------------------
     HISTORY — loadHistory() + openReport()
  -------------------------------------------------------- */
  async function loadHistory() {
    const user = JSON.parse(localStorage.getItem('sf_user') || '{}');
    const email = user.email;

    const historyItems = document.getElementById('history-items');
    const historyEmpty = document.getElementById('history-empty');
    const historyLoading = document.getElementById('history-loading');

    if (!historyItems) return;

    historyItems.innerHTML = '';
    historyLoading.style.display = 'block';
    historyEmpty.style.display = 'none';

    if (!email) {
      historyLoading.style.display = 'none';
      historyEmpty.style.display = 'block';
      return;
    }

    try {
      const res = await fetch(`/history/${encodeURIComponent(email)}`);
      const reports = await res.json();

      historyLoading.style.display = 'none';

      if (!Array.isArray(reports) || reports.length === 0) {
        historyEmpty.style.display = 'block';
        return;
      }

      reports.forEach((report) => {
        const topCrop = report.output?.crops?.[0];
        const cropName = topCrop ? topCrop.crop.charAt(0).toUpperCase() + topCrop.crop.slice(1) : 'Unknown';
        const score = topCrop ? parseFloat(topCrop.score).toFixed(1) : '--';
        const ts = report.timestamp ? new Date(report.timestamp) : null;
        const dateStr = ts ? ts.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
        const timeStr = ts ? ts.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '';

        const item = document.createElement('div');
        item.className = 'history-item';
        item.innerHTML = `
          <div class="history-item-main">
            <span class="history-item-icon">🌱</span>
            <div class="history-item-info">
              <strong class="history-item-crop">${cropName}</strong>
              <span class="history-item-score">${score}% match</span>
            </div>
          </div>
          <div class="history-item-meta">
            <span class="history-item-date"><i class="fa-regular fa-calendar"></i> ${dateStr}</span>
            <span class="history-item-time"><i class="fa-regular fa-clock"></i> ${timeStr}</span>
          </div>
          <div class="history-item-arrow"><i class="fa-solid fa-chevron-right"></i></div>
        `;
        item.addEventListener('click', () => openReport(report));
        historyItems.appendChild(item);
      });

    } catch (err) {
      historyLoading.style.display = 'none';
      historyItems.innerHTML = '<p style="color:#e53935; padding:10px;"><i class="fa-solid fa-triangle-exclamation"></i> Failed to load history. Please try again.</p>';
    }
  }

  function openReport(report) {
    // Build a synthetic API result from the saved report
    const synth = {
      crops: report.output?.crops || [],
      soil: report.output?.soil || '',
      fertilizer_plans: report.output?.fertilizer_plans || {},
      suggestions: report.output?.suggestions || ''
    };
    const inputPayload = report.input || {};

    displayResults(synth, inputPayload);

    // Unlock and show the Analysis Result nav tab
    const navResult = document.getElementById('nav-result');
    if (navResult) navResult.style.display = 'flex';

    // Navigate to result view
    switchView('view-result');
  }

  // Load history whenever the History sidebar item is clicked
  const navHistory = document.getElementById('nav-history');
  if (navHistory) {
    navHistory.addEventListener('click', () => {
      loadHistory();
    });
  }

});