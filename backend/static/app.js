/* =========================================================
   Smart Farming Web Application - Application Logic
   ========================================================= */

document.addEventListener('DOMContentLoaded', () => {

  // ---------------------------------------------------------
  // Routing & Authentication Basics
  // ---------------------------------------------------------
  const loginForm = document.getElementById('login-form');
  const signupForm = document.getElementById('signup-form');
  const logoutBtn = document.getElementById('logout-btn');

  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      // Dummy login successful, go to dashboard
      window.location.href = '/dashboard';
    });
  }

  if (signupForm) {
    signupForm.addEventListener('submit', (e) => {
      e.preventDefault();
      // Basic check for password match
      const p1 = document.getElementById('password').value;
      const p2 = document.getElementById('confirm-password').value;
      if (p1 !== p2) {
        document.getElementById('signup-error').style.display = 'block';
        return;
      }
      // Dump to login
      window.location.href = '/login';
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      window.location.href = '/login';
    });
  }

  // ---------------------------------------------------------
  // Dashboard Logic (Sidebar Navigation)
  // ---------------------------------------------------------
  const menuItems = document.querySelectorAll('.menu-item[data-target]');
  const views = document.querySelectorAll('.dashboard-view');

  window.switchView = function(targetId) {
    // Update active class on sidebar
    menuItems.forEach(item => {
      if(item.getAttribute('data-target') === targetId) {
        item.classList.add('active');
        // Unhide Analysis Result tab if navigating to it
        if(targetId === 'view-result') item.style.display = 'flex';
      } else {
        item.classList.remove('active');
      }
    });

    // Update active class on views
    views.forEach(view => {
      if(view.id === targetId) {
        view.classList.add('active');
      } else {
        view.classList.remove('active');
      }
    });
  };

  menuItems.forEach(item => {
    item.addEventListener('click', () => {
      switchView(item.getAttribute('data-target'));
    });
  });

  // ---------------------------------------------------------
  // Custom File Input Display
  // ---------------------------------------------------------
  const fileInput = document.getElementById('file-upload');
  const fileNameDisplay = document.getElementById('file-name');
  if (fileInput && fileNameDisplay) {
    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        fileNameDisplay.textContent = e.target.files[0].name;
        fileNameDisplay.style.color = "var(--primary)";
      } else {
        fileNameDisplay.textContent = "Click to select PDF or Image";
        fileNameDisplay.style.color = "inherit";
      }
    });
  }

  // ---------------------------------------------------------
  // Global Chart Variables
  // ---------------------------------------------------------
  let pieChartInstance = null;
  let barChartInstance = null;

  function renderCharts(N, P, K) {
    const ctxPie = document.getElementById('pieChart');
    const ctxBar = document.getElementById('barChart');
    
    // Check if chart contexts exist on the page
    if (!ctxPie || !ctxBar) return;

    if (pieChartInstance) pieChartInstance.destroy();
    if (barChartInstance) barChartInstance.destroy();

    // High quality modern chart style
    pieChartInstance = new Chart(ctxPie, {
      type: 'doughnut',
      data: {
        labels: ['Nitrogen', 'Phosphorus', 'Potassium'],
        datasets: [{
          data: [N, P, K],
          backgroundColor: ['#4caf50', '#ff9800', '#f44336'],
          hoverOffset: 10,
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'bottom', labels: {font: {family: 'Inter'} } }
        },
        cutout: '70%'
      }
    });

    barChartInstance = new Chart(ctxBar, {
      type: 'bar',
      data: {
        labels: ['Nitrogen', 'Phosphorus', 'Potassium'],
        datasets: [{
          label: 'Level (kg/ha)',
          data: [N, P, K],
          backgroundColor: ['rgba(76, 175, 80, 0.8)', 'rgba(255, 152, 0, 0.8)', 'rgba(244, 67, 54, 0.8)'],
          borderRadius: 8,
          barPercentage: 0.6
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: { beginAtZero: true, grid: { borderDash: [5, 5] } },
          x: { grid: { display: false } }
        }
      }
    });
  }

  // Attempt to render charts on load using some base values
  if(document.getElementById('pieChart')) renderCharts(50, 40, 40);

  function displayResults(data) {
    // Display results in the UI
    if (data.crop) {
      document.getElementById('res-crop').textContent = data.crop;
    }
    if (data.fertilizer) {
      document.getElementById('res-fert').textContent = data.fertilizer;
    }
    if (data.soil) {
      document.getElementById('res-health').textContent = data.soil;
    }
    if (data.suggestions) {
      document.getElementById('res-suggest').textContent = data.suggestions;
    }
    
    // Assign generic values for water and best season
    document.getElementById('res-water').textContent = 'Medium';
    document.getElementById('res-season').textContent = 'Winter';
  }

  // ---------------------------------------------------------
  // Form Submission: Manual Analysis
  // ---------------------------------------------------------
  const soilForm = document.getElementById('soil-form');
  const loadingOverlay = document.getElementById('loading-overlay');

  if (soilForm) {
    soilForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      loadingOverlay.style.display = 'flex';

      const payload = {
        N: parseFloat(document.getElementById('val-n').value),
        P: parseFloat(document.getElementById('val-p').value),
        K: parseFloat(document.getElementById('val-k').value),
        ph: parseFloat(document.getElementById('val-ph').value),
        temperature: parseFloat(document.getElementById('val-temp').value),
        humidity: parseFloat(document.getElementById('val-hum').value),
        rainfall: parseFloat(document.getElementById('val-rain').value)
      };

      try {
        const response = await fetch('/predict', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) throw new Error("Server error");
        
        const data = await response.json();
        
        displayResults(data);
        renderCharts(payload.N, payload.P, payload.K);
        
        // Hide loading and show results view
        setTimeout(() => {
          loadingOverlay.style.display = 'none';
          switchView('view-result');
        }, 800); // Small delay for animation feel
        
      } catch (error) {
        console.error("Prediction Error:", error);
        alert('Failed to connect to AI server. Showing demo data instead.');
        loadingOverlay.style.display = 'none';
        
        // Dummy data fallback
        displayResults({
          crop: 'Wheat',
          fertilizer: 'Apply NPK 10-26-26',
          soil: 'Good',
          suggestions: 'Maintain consistent soil moisture.'
        });
        renderCharts(payload.N, payload.P, payload.K);
        switchView('view-result');
      }
    });
  }

  // ---------------------------------------------------------
  // Form Submission: PDF / Image Upload
  // ---------------------------------------------------------
  const uploadForm = document.getElementById('upload-form');
  if (uploadForm) {
    uploadForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const file = fileInput.files[0];
      const errorDiv = document.getElementById('upload-error');
      
      if (!file) {
        errorDiv.textContent = 'Please select a file first.';
        errorDiv.style.display = 'block';
        return;
      }
      
      errorDiv.style.display = 'none';
      loadingOverlay.style.display = 'flex';

      const formData = new FormData();
      formData.append('file', file);

      try {
        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) throw new Error("Server error");

        const textResponse = await response.text();
        
        // It might return string with Error
        if (textResponse.startsWith('Error')) {
           throw new Error(textResponse);
        }

        const resData = JSON.parse(textResponse);

        displayResults(resData);
        
        if (resData.data) {
          renderCharts(resData.data.N || 50, resData.data.P || 40, resData.data.K || 40);
        }
        
        setTimeout(() => {
          loadingOverlay.style.display = 'none';
          switchView('view-result');
        }, 800);

      } catch (error) {
        console.error("Upload Error:", error);
        loadingOverlay.style.display = 'none';
        errorDiv.textContent = 'Failed to extract data from document. Try manual entry.';
        errorDiv.style.display = 'block';
      }
    });
  }

});
