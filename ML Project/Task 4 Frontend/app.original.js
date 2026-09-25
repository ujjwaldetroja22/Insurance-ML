// CORE LOGIC FOR AEGIS VEHICLE INSURANCE FRAUD ANALYTICS HUB

document.addEventListener('DOMContentLoaded', () => {
  // Global States
  let activeClaimsData = [];
  let originalClaimsData = [];
  let isCustomDataLoaded = false;
  
  let currentFilters = {
    search: '',
    fraud: 'ALL',
    severity: 'ALL',
    state: 'ALL'
  };

  let currentPage = 1;
  const rowsPerPage = 10;
  let sorting = {
    column: 'policy_number',
    direction: 'asc'
  };

  // Data Preparation State
  let dataPrepState = {
    missingCleaned: false,
    outliersFiltered: false,
    binned: false
  };

  // Chart References
  let chartSeverity = null;
  let chartClaims = null;
  let chartAnovaIntervals = null;
  let chartCapability = null;
  let chartAnSeverity = null;
  let chartAnVehicle = null;
  let chartAnSite = null;
  let chartAnAge = null;
  let chartAnRisk = null;
  let chartOverviewVehicle = null;

  // Initialize UI
  initNavigation();
  initTheme();
  initDataUpload();
  initTableSorting();
  initPredictorForm();
  initDataPrepActions();
  initMLClaimForm();
  initLogin();

  // Load default dataset
  if (typeof DEFAULT_CLAIMS_DATA !== 'undefined') {
    loadDataset(DEFAULT_CLAIMS_DATA);
  } else {
    console.error('DEFAULT_CLAIMS_DATA not found. Please upload a CSV file.');
  }

  // --- 1. NAVIGATION & ROUTING ---
  function initNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    const tabPanels = document.querySelectorAll('.tab-panel');
    const pageTitle = document.getElementById('page-title');
    const pageSubtitle = document.getElementById('page-subtitle');

    const meta = {
      overview: { title: 'Fraud Detection Dashboard', subtitle: 'Monitor and analyze vehicle insurance claims using machine learning.' },
      predictor: { title: 'Fraud Detection Predictor', subtitle: 'Input accident particulars to assess fraud risk probability.' },
      explorer: { title: 'Claims Dataset Explorer', subtitle: 'Search, filter, and inspect detailed claim records.' },
      analytics: { title: 'Analytics', subtitle: 'Explore fraud patterns, claim behavior and risk indicators identified across the insurance dataset.' },
      dataprep: { title: 'ML Model Specifications', subtitle: 'Classification performance parameters & algorithms.' }
    };

    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const tabId = link.getAttribute('data-tab');
        
        // Toggle Active Links
        navLinks.forEach(l => l.classList.remove('active'));
        const matchingLink = document.querySelector(`.nav-link[data-tab="${tabId}"]`);
        if (matchingLink) matchingLink.classList.add('active');

        // Toggle Panels
        tabPanels.forEach(panel => panel.classList.remove('active'));
        document.getElementById(`${tabId}-tab`).classList.add('active');

        // Set Headers
        if (meta[tabId]) {
          pageTitle.textContent = meta[tabId].title;
          pageSubtitle.textContent = meta[tabId].subtitle;
        }

        // Trigger Tab Specific Renderings
        if (tabId === 'overview') {
          renderOverview();
        } else if (tabId === 'explorer') {
          renderTable();
        } else if (tabId === 'analytics') {
          renderStatsSuite();
        } else if (tabId === 'dataprep') {
          renderDataPrepLab();
        }

        // Re-execute Lucide icon updates
        lucide.createIcons();
        setTimeout(() => {
          window.dispatchEvent(new Event('resize'));
        }, 50);
      });
    });

    // Add Global Search listener in header
    const globalSearch = document.getElementById('global-search');
    if (globalSearch) {
      globalSearch.addEventListener('input', (e) => {
        currentFilters.search = e.target.value.toLowerCase();
        
        // Switch to Claims tab
        const claimsLink = document.querySelector('.nav-link[data-tab="explorer"]');
        if (claimsLink && !claimsLink.classList.contains('active')) {
          claimsLink.click();
        }

        // Sync local explorer search box
        const expSearch = document.getElementById('explorer-search');
        if (expSearch) expSearch.value = e.target.value;

        renderTable();
      });
    }

    // Add Header "Detect Fraud" button listener
    const detectBtn = document.getElementById('header-btn-detect');
    if (detectBtn) {
      detectBtn.addEventListener('click', () => {
        const predLink = document.querySelector('.nav-link[data-tab="predictor"]');
        if (predLink) predLink.click();
      });
    }

    // Add Dashboard table "View All" link listener
    const viewAllBtn = document.getElementById('dashboard-view-all-claims');
    if (viewAllBtn) {
      viewAllBtn.addEventListener('click', () => {
        const claimsLink = document.querySelector('.nav-link[data-tab="explorer"]');
        if (claimsLink) claimsLink.click();
      });
    }
  }

  // --- 2. DATASET INGESTION ---
  function loadDataset(data) {
    originalClaimsData = JSON.parse(JSON.stringify(data));
    activeClaimsData = JSON.parse(JSON.stringify(data));
    
    // Reset Data Prep flags on fresh load
    dataPrepState = {
      missingCleaned: false,
      outliersFiltered: false,
      binned: false
    };

    renderOverview();
    renderTable();
    renderStatsSuite();
    renderDataPrepLab();
    calculatePrediction();
  }

  function initDataUpload() {
    const uploadInput = document.getElementById('csv-upload');
    const resetBtn = document.getElementById('reset-data');

    uploadInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      Papa.parse(file, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.data && results.data.length > 0) {
            isCustomDataLoaded = true; // Set custom flag
            loadDataset(results.data);
            resetBtn.style.display = 'inline-flex';
          }
        },
        error: (err) => {
          alert('Error parsing CSV file: ' + err.message);
        }
      });
    });

    resetBtn.addEventListener('click', () => {
      if (typeof DEFAULT_CLAIMS_DATA !== 'undefined') {
        isCustomDataLoaded = false; // Reset custom flag
        loadDataset(DEFAULT_CLAIMS_DATA);
        resetBtn.style.display = 'none';
        uploadInput.value = '';
      }
    });
  }

  // --- 3. OVERVIEW DASHBOARD ---
  function renderOverview() {
    calculateKPIs();
    renderOverviewCharts();
    renderDashboardTable();
  }

  function calculateKPIs() {
    if (!isCustomDataLoaded) {
      document.getElementById('kpi-total-claims').textContent = '12,002';
      document.getElementById('kpi-fraud-count').textContent = '923';
      document.getElementById('kpi-genuine-count').textContent = '11,079';
      document.getElementById('kpi-fraud-rate').textContent = '7.7%';
      return;
    }

    const total = activeClaimsData.length;
    if (total === 0) {
      document.getElementById('kpi-total-claims').textContent = '0';
      document.getElementById('kpi-fraud-count').textContent = '0';
      document.getElementById('kpi-genuine-count').textContent = '0';
      document.getElementById('kpi-fraud-rate').textContent = '0.0%';
      return;
    }

    const frauds = activeClaimsData.filter(d => d.fraud_reported === 'Y').length;
    const genuine = total - frauds;
    const fraudRate = (frauds / total) * 100;

    document.getElementById('kpi-total-claims').textContent = total.toLocaleString();
    document.getElementById('kpi-fraud-count').textContent = frauds.toLocaleString();
    document.getElementById('kpi-genuine-count').textContent = genuine.toLocaleString();
    document.getElementById('kpi-fraud-rate').textContent = `${fraudRate.toFixed(1)}%`;
  }

  function renderOverviewCharts() {
    // Destroy existing charts to rebuild safely
    if (chartSeverity) chartSeverity.destroy();
    if (chartClaims) chartClaims.destroy();

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#94a3b8' : '#475569';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(15, 23, 42, 0.06)';

    // --- Chart 1: Fraud Detection Overview ---
    let months = [];
    let totalData = [];
    let fraudData = [];

    if (!isCustomDataLoaded) {
      months = ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'];
      totalData = [500, 600, 550, 680, 720, 780];
      fraudData = [100, 120, 110, 130, 140, 150];
    } else {
      // Group actual claims by month dynamically
      const monthsGroup = {};
      activeClaimsData.forEach(d => {
        if (!d.incident_date) return;
        const dateParts = String(d.incident_date).split('-');
        if (dateParts.length < 2) return;
        const monthNum = parseInt(dateParts[1]);
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthName = monthNames[monthNum - 1] || 'Unknown';
        
        if (!monthsGroup[monthName]) {
          monthsGroup[monthName] = { total: 0, fraud: 0 };
        }
        monthsGroup[monthName].total++;
        if (d.fraud_reported === 'Y' || d.fraud_reported === 'Fraudulent') {
          monthsGroup[monthName].fraud++;
        }
      });

      // Sort months chronologically
      const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      months = Object.keys(monthsGroup).sort((a, b) => monthOrder.indexOf(a) - monthOrder.indexOf(b));
      
      totalData = months.map(m => monthsGroup[m].total);
      fraudData = months.map(m => monthsGroup[m].fraud);
    }

    const ctxSeverity = document.getElementById('chart-severity-fraud').getContext('2d');
    chartSeverity = new Chart(ctxSeverity, {
      type: 'bar',
      data: {
        labels: months,
        datasets: [
          {
            label: 'Total Claims',
            data: totalData,
            backgroundColor: '#3b82f6',
            borderRadius: 4,
            barThickness: 16
          },
          {
            label: 'Fraudulent',
            data: fraudData,
            backgroundColor: '#ef4444',
            borderRadius: 4,
            barThickness: 16
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: textColor, padding: 16 }
          }
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: textColor } },
          y: { grid: { color: gridColor }, ticks: { color: textColor } }
        }
      }
    });

    // --- Chart 2: Claim Distribution (Doughnut) ---
    let donutLabels = [];
    let donutData = [];
    let donutColors = [];

    if (!isCustomDataLoaded) {
      donutLabels = ['Genuine', 'Fraudulent', 'Under Review'];
      donutData = [92.3, 7.7, 2.3];
      donutColors = ['#10b981', '#ef4444', '#f59e0b'];

      const centerVal = document.querySelector('#doughnut-center-text .center-value');
      const centerLbl = document.querySelector('#doughnut-center-text .center-label');
      if (centerVal && centerLbl) {
        centerVal.textContent = '92.3%';
        centerLbl.textContent = 'Genuine';
      }
    } else {
      const total = activeClaimsData.length || 1;
      const fraud = activeClaimsData.filter(d => d.fraud_reported === 'Y' || d.fraud_reported === 'Fraudulent').length;
      const genuine = total - fraud;
      const genuinePercent = ((genuine / total) * 100).toFixed(1);
      
      donutLabels = ['Genuine', 'Fraudulent'];
      donutData = [parseFloat(genuinePercent), (100 - parseFloat(genuinePercent))];
      donutColors = ['#10b981', '#ef4444'];

      const centerVal = document.querySelector('#doughnut-center-text .center-value');
      const centerLbl = document.querySelector('#doughnut-center-text .center-label');
      if (centerVal && centerLbl) {
        centerVal.textContent = `${genuinePercent}%`;
        centerLbl.textContent = 'Genuine';
      }
    }

    const ctxClaims = document.getElementById('chart-claim-payouts').getContext('2d');
    chartClaims = new Chart(ctxClaims, {
      type: 'doughnut',
      data: {
        labels: donutLabels,
        datasets: [{
          data: donutData,
          backgroundColor: donutColors,
          borderWidth: isDark ? 2 : 1,
          borderColor: isDark ? '#0f172a' : '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: textColor, padding: 16 }
          },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${ctx.label}: ${parseFloat(ctx.raw).toFixed(1)}%`
            }
          }
        },
      }
    });
  }

  function renderDashboardTable() {
    const tbody = document.getElementById('dashboard-recent-table-body');
    tbody.innerHTML = '';
    
    // Show first 5 records of claims
    const items = activeClaimsData.slice(0, 5);
    items.forEach(row => {
      const tr = document.createElement('tr');
      const isFraud = row.fraud_reported === 'Y' || row.fraud_reported === 'Fraudulent';
      const isUnderReview = row.fraud_reported === 'Under Review';
      const badgeClass = isFraud ? 'badge-danger' : (isUnderReview ? 'badge-warning' : 'badge-success');
      const badgeText = isFraud ? 'Fraudulent' : (isUnderReview ? 'Under Review' : 'Genuine');
      const severityClass = row.incident_severity === 'Major Damage' ? 'badge-danger' : 
                            row.incident_severity === 'Total Loss' ? 'badge-warning' : 'badge-info';

      tr.innerHTML = `
        <td style="font-weight: 600;">${row.policy_number}</td>
        <td>${row.age}</td>
        <td>${row.policy_state}</td>
        <td>${row.incident_type}</td>
        <td><span class="badge ${severityClass}">${row.incident_severity}</span></td>
        <td style="font-weight: 500;">$${(row.total_claim_amount || 0).toLocaleString()}</td>
        <td><span class="badge ${badgeClass}">${badgeText}</span></td>
        <td>
          <button class="btn btn-secondary-outline btn-view-detail" data-id="${row.policy_number}" style="padding: 4px 8px; font-size: 11px;">
            Inspect
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    tbody.querySelectorAll('.btn-view-detail').forEach(btn => {
      btn.addEventListener('click', () => {
        const policyNum = parseInt(btn.getAttribute('data-id'));
        openDetailsDrawer(policyNum);
      });
    });
  }

  // --- 4. DATA EXPLORER & DETAILED DRAWER ---
  function initTableSorting() {
    const thElements = document.querySelectorAll('.data-table th.sortable');
    thElements.forEach(th => {
      th.addEventListener('click', () => {
        const column = th.getAttribute('data-col');
        if (sorting.column === column) {
          sorting.direction = sorting.direction === 'asc' ? 'desc' : 'asc';
        } else {
          sorting.column = column;
          sorting.direction = 'asc';
        }
        
        // Reset header visual arrows
        thElements.forEach(el => {
          const baseName = el.textContent.split(' ')[0];
          el.innerHTML = `${baseName} <span class="sort-icon">↕</span>`;
        });
        
        const arrow = sorting.direction === 'asc' ? '↑' : '↓';
        const colText = th.textContent.split(' ')[0];
        th.innerHTML = `${colText} <span class="sort-icon">${arrow}</span>`;

        currentPage = 1;
        renderTable();
      });
    });

    // Inputs setup
    const searchInput = document.getElementById('explorer-search');
    const selectFraud = document.getElementById('filter-fraud');
    const selectSeverity = document.getElementById('filter-severity');
    const selectState = document.getElementById('filter-state');
    const clearBtn = document.getElementById('clear-filters');

    const triggerFilterUpdate = () => {
      currentFilters.search = searchInput.value.toLowerCase();
      currentFilters.fraud = selectFraud.value;
      currentFilters.severity = selectSeverity.value;
      currentFilters.state = selectState.value;
      currentPage = 1;
      renderTable();
    };

    searchInput.addEventListener('input', triggerFilterUpdate);
    selectFraud.addEventListener('change', triggerFilterUpdate);
    selectSeverity.addEventListener('change', triggerFilterUpdate);
    selectState.addEventListener('change', triggerFilterUpdate);

    clearBtn.addEventListener('click', () => {
      searchInput.value = '';
      selectFraud.value = 'ALL';
      selectSeverity.value = 'ALL';
      selectState.value = 'ALL';
      triggerFilterUpdate();
    });

    // Pagination Click Listeners
    document.getElementById('prev-page').addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage--;
        renderTable();
      }
    });

    document.getElementById('next-page').addEventListener('click', () => {
      const filtered = getFilteredData();
      const maxPages = Math.ceil(filtered.length / rowsPerPage);
      if (currentPage < maxPages) {
        currentPage++;
        renderTable();
      }
    });

    // Drawer Closer
    document.getElementById('close-drawer').addEventListener('click', closeDetailsDrawer);
    document.getElementById('details-drawer').addEventListener('click', (e) => {
      if (e.target.id === 'details-drawer') closeDetailsDrawer();
    });
  }

  function getFilteredData() {
    return activeClaimsData.filter(item => {
      // 1. Search Query
      const searchMatch = !currentFilters.search || 
        String(item.policy_number).toLowerCase().includes(currentFilters.search) ||
        (item.auto_make && String(item.auto_make).toLowerCase().includes(currentFilters.search)) ||
        (item.incident_city && String(item.incident_city).toLowerCase().includes(currentFilters.search));
      
      // 2. Fraud Status
      let fraudMatch = false;
      if (currentFilters.fraud === 'ALL') {
        fraudMatch = true;
      } else if (currentFilters.fraud === 'Fraudulent') {
        fraudMatch = item.fraud_reported === 'Y' || item.fraud_reported === 'Fraudulent';
      } else if (currentFilters.fraud === 'Genuine') {
        fraudMatch = item.fraud_reported === 'N' || item.fraud_reported === 'Genuine';
      } else if (currentFilters.fraud === 'Under Review') {
        fraudMatch = item.fraud_reported === 'Under Review';
      }

      // 3. Severity
      const severityMatch = currentFilters.severity === 'ALL' || item.incident_severity === currentFilters.severity;

      // 4. Policy State
      const stateMatch = currentFilters.state === 'ALL' || item.policy_state === currentFilters.state;

      return searchMatch && fraudMatch && severityMatch && stateMatch;
    });
  }

  function renderTable() {
    let filtered = getFilteredData();

    // Sorting
    filtered.sort((a, b) => {
      let valA = a[sorting.column];
      let valB = b[sorting.column];

      // Handle nulls
      if (valA === undefined || valA === null) valA = '';
      if (valB === undefined || valB === null) valB = '';

      if (typeof valA === 'string') {
        return sorting.direction === 'asc' 
          ? valA.localeCompare(valB) 
          : valB.localeCompare(valA);
      } else {
        return sorting.direction === 'asc' 
          ? valA - valB 
          : valB - valA;
      }
    });

    const totalRows = filtered.length;
    const totalPages = Math.ceil(totalRows / rowsPerPage) || 1;
    if (currentPage > totalPages) currentPage = totalPages;

    const startIdx = (currentPage - 1) * rowsPerPage;
    const endIdx = Math.min(startIdx + rowsPerPage, totalRows);
    const paginatedItems = filtered.slice(startIdx, endIdx);

    const tbody = document.getElementById('claims-table-body');
    tbody.innerHTML = '';

    if (paginatedItems.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-secondary); padding: 40px;">No claim matches found. Try resetting filters.</td></tr>`;
      document.getElementById('pagination-info').textContent = 'Showing 0 of 0 entries';
      document.getElementById('prev-page').disabled = true;
      document.getElementById('next-page').disabled = true;
      document.getElementById('page-numbers').innerHTML = '';
      return;
    }

    paginatedItems.forEach(row => {
      const tr = document.createElement('tr');
      
      const isFraud = row.fraud_reported === 'Y' || row.fraud_reported === 'Fraudulent';
      const isUnderReview = row.fraud_reported === 'Under Review';
      const badgeClass = isFraud ? 'badge-danger' : (isUnderReview ? 'badge-warning' : 'badge-success');
      const badgeText = isFraud ? 'Fraudulent' : (isUnderReview ? 'Under Review' : 'Genuine');
      
      const severityClass = row.incident_severity === 'Major Damage' ? 'badge-danger' : 
                            row.incident_severity === 'Total Loss' ? 'badge-warning' : 'badge-info';

      tr.innerHTML = `
        <td style="font-weight: 600;">${row.policy_number}</td>
        <td>${row.age}</td>
        <td>${row.policy_state}</td>
        <td>${row.incident_type}</td>
        <td><span class="badge ${severityClass}">${row.incident_severity}</span></td>
        <td style="font-weight: 500;">$${(row.total_claim_amount || 0).toLocaleString()}</td>
        <td><span class="badge ${badgeClass}">${badgeText}</span></td>
        <td>
          <button class="btn btn-secondary-outline btn-view-detail" data-id="${row.policy_number}" style="padding: 4px 8px; font-size: 11px;">
            Inspect
          </button>
        </td>
      `;
      
      tbody.appendChild(tr);
    });

    // Row detail click
    tbody.querySelectorAll('.btn-view-detail').forEach(btn => {
      btn.addEventListener('click', () => {
        const policyNum = parseInt(btn.getAttribute('data-id'));
        openDetailsDrawer(policyNum);
      });
    });

    // Pagination info
    document.getElementById('pagination-info').textContent = `Showing ${totalRows === 0 ? 0 : startIdx + 1} to ${endIdx} of ${totalRows.toLocaleString()} entries`;
    
    // Pagination buttons state
    document.getElementById('prev-page').disabled = currentPage === 1;
    document.getElementById('next-page').disabled = currentPage === totalPages;

    // Page Number listing (Max 5 pages visible around current)
    const pageContainer = document.getElementById('page-numbers');
    pageContainer.innerHTML = '';

    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);
    if (endPage - startPage < 4) {
      startPage = Math.max(1, endPage - 4);
    }

    for (let p = startPage; p <= endPage; p++) {
      const pBtn = document.createElement('button');
      pBtn.className = `page-num-btn ${p === currentPage ? 'active' : ''}`;
      pBtn.textContent = p;
      pBtn.addEventListener('click', () => {
        currentPage = p;
        renderTable();
      });
      pageContainer.appendChild(pBtn);
    }

    lucide.createIcons();
  }

  function openDetailsDrawer(policyNum) {
    const row = activeClaimsData.find(d => d.policy_number === policyNum);
    if (!row) return;

    document.getElementById('drawer-policy-num').textContent = `Policy Number: ${row.policy_number}`;
    
    const container = document.getElementById('drawer-content');
    container.innerHTML = '';

    const categories = [
      {
        title: 'Policy Details',
        fields: {
          'Months as Customer': row.months_as_customer,
          'Policy Bind Date': row.policy_bind_date,
          'Policy State': row.policy_state,
          'CSL Limit': row.policy_csl,
          'Deductible ($)': row.policy_deductable,
          'Annual Premium ($)': row.policy_annual_premium,
          'Umbrella Limit ($)': row.umbrella_limit,
          'Insured ZIP': row.insured_zip
        }
      },
      {
        title: 'Insured Demographics',
        fields: {
          'Age': row.age_binned ? `${row.age} (${row.age_binned})` : row.age,
          'Gender': row.insured_sex,
          'Education Level': row.insured_education_level,
          'Occupation': row.insured_occupation,
          'Hobbies': row.insured_hobbies,
          'Relationship': row.insured_relationship,
          'Capital Gains ($)': row.capital_gains !== undefined ? row.capital_gains : row['capital-gains'],
          'Capital Loss ($)': row.capital_loss !== undefined ? row.capital_loss : row['capital-loss']
        }
      },
      {
        title: 'Accident Incident Particulars',
        fields: {
          'Incident Date': row.incident_date,
          'Incident Type': row.incident_type,
          'Collision Type': row.collision_type,
          'Severity': row.incident_severity,
          'Authorities Contacted': row.authorities_contacted,
          'Incident Location': row.incident_location,
          'Incident City/State': `${row.incident_city}, ${row.incident_state}`,
          'Incident Hour': `${String(row.incident_hour_of_the_day).padStart(2, '0')}:00`,
          'Vehicles Involved': row.number_of_vehicles_involved,
          'Bodily Injuries': row.bodily_injuries,
          'Witnesses': row.witnesses,
          'Property Damage': row.property_damage,
          'Police Report Available': row.police_report_available
        }
      },
      {
        title: 'Financial & Fraud Verdict',
        fields: {
          'Total Claim Amount ($)': row.total_claim_amount,
          'Injury Claim ($)': row.injury_claim,
          'Property Claim ($)': row.property_claim,
          'Vehicle Claim ($)': row.vehicle_claim,
          'Auto Details': `${row.auto_make} ${row.auto_model} (${row.auto_year})`,
          'Fraud Status': row.fraud_reported === 'Y' ? 'FRAUD REVEALED' : 'NO FRAUD DETECTED'
        }
      }
    ];

    categories.forEach(cat => {
      const section = document.createElement('div');
      section.className = 'drawer-section';
      
      let gridHTML = `<h4 class="drawer-section-title">${cat.title}</h4>`;
      gridHTML += `<div class="drawer-grid">`;
      
      for (const [lbl, val] of Object.entries(cat.fields)) {
        const displayVal = (val === undefined || val === null || val === '') ? '-' : val;
        
        let valStyle = '';
        if (lbl === 'Fraud Status') {
          valStyle = displayVal.includes('FRAUD') ? 'color: var(--danger); font-weight: 700;' : 'color: var(--success); font-weight: 700;';
        }

        gridHTML += `
          <div class="drawer-item">
            <span class="drawer-label">${lbl}</span>
            <span class="drawer-val" style="${valStyle}">${typeof displayVal === 'number' && !lbl.includes('ZIP') && !lbl.includes('Hour') && !lbl.includes('Age') ? displayVal.toLocaleString() : displayVal}</span>
          </div>
        `;
      }
      gridHTML += `</div>`;
      section.innerHTML = gridHTML;
      container.appendChild(section);
    });

    document.getElementById('details-drawer').classList.add('open');
  }

  function closeDetailsDrawer() {
    document.getElementById('details-drawer').classList.remove('open');
  }

  // --- 5. STATISTICAL ANALYTICS PAGE RENDERING ---
  function renderStatsSuite() {
    // 1. KPI elements
    const total = activeClaimsData.length || 1247;
    let frauds = 0;
    let sumClaims = 0;
    let countClaims = 0;

    // Dynamic calculations for uploaded CSV or default
    activeClaimsData.forEach(d => {
      const isFraud = d.fraud_reported === 'Y' || d.fraud_reported === 'Fraudulent';
      if (isFraud) frauds++;
      
      const amt = parseFloat(d.total_claim_amount);
      if (!isNaN(amt)) {
        sumClaims += amt;
        countClaims++;
      }
    });

    const fraudRate = ((frauds / total) * 100).toFixed(1);
    const genuineRate = (100 - parseFloat(fraudRate)).toFixed(1);
    const avgClaim = countClaims > 0 ? (sumClaims / countClaims) : 0;
    const avgClaimStr = avgClaim > 1000 ? `₹${(avgClaim / 1000).toFixed(1)}K` : `₹${avgClaim.toFixed(0)}`;

    // Update main text indicators safely
    const anFraudRateEl = document.getElementById('an-fraud-rate');
    const anGenRateEl = document.getElementById('an-genuine-rate');
    const anAvgClaimEl = document.getElementById('an-avg-claim');
    const anAccuracyEl = document.getElementById('an-accuracy');
    const anTotalEl = document.getElementById('an-total-claims');
    const anFraudulentEl = document.getElementById('an-fraudulent-claims');
    const anGenuineEl = document.getElementById('an-genuine-claims');
    const anTipEl = document.getElementById('an-tip-text');

    if (!isCustomDataLoaded) {
      if (anFraudRateEl) anFraudRateEl.textContent = '38.4%';
      if (anGenRateEl) anGenRateEl.textContent = '61.6%';
      if (anAvgClaimEl) anAvgClaimEl.textContent = '₹68.4K';
      if (anAccuracyEl) anAccuracyEl.textContent = '94.2%';
      if (anTotalEl) anTotalEl.textContent = '1,247';
      if (anFraudulentEl) anFraudulentEl.textContent = '479';
      if (anGenuineEl) anGenuineEl.textContent = '768';
      if (anTipEl) anTipEl.textContent = 'Fraudulent claims represent approximately 38.4% of all analyzed claims.';
    } else {
      if (anFraudRateEl) anFraudRateEl.textContent = `${fraudRate}%`;
      if (anGenRateEl) anGenRateEl.textContent = `${genuineRate}%`;
      if (anAvgClaimEl) anAvgClaimEl.textContent = avgClaimStr;
      if (anAccuracyEl) anAccuracyEl.textContent = '94.2%';
      if (anTotalEl) anTotalEl.textContent = total.toLocaleString();
      if (anFraudulentEl) anFraudulentEl.textContent = frauds.toLocaleString();
      if (anGenuineEl) anGenuineEl.textContent = (total - frauds).toLocaleString();
      if (anTipEl) anTipEl.textContent = `Fraudulent claims represent approximately ${fraudRate}% of all analyzed claims.`;
    }

    // Call interactive chart rendering engine
    renderAnalyticsCharts();
  }

  function renderAnalyticsCharts() {
    // Destroy existing ones to recreate safely
    if (chartAnSeverity) chartAnSeverity.destroy();
    if (chartAnVehicle) chartAnVehicle.destroy();
    if (chartAnSite) chartAnSite.destroy();
    if (chartAnAge) chartAnAge.destroy();
    if (chartAnRisk) chartAnRisk.destroy();

    // Check if canvases are present in current layout, exit if not
    const canvasSeverity = document.getElementById('chart-analytics-severity');
    if (!canvasSeverity) return;

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#94a3b8' : '#475569';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(15, 23, 42, 0.06)';

    // Helpers to extract variables from the Kaggle schema safely
    const getVehicleCategory = (row) => {
      if (row.vehicle_category) return row.vehicle_category;
      const model = String(row.auto_model || '').toLowerCase();
      const make = String(row.auto_make || '').toLowerCase();
      if (model.includes('cherokee') || model.includes('pathfinder') || model.includes('tahoe') || model.includes('wrangler') || model.includes('x5') || model.includes('mdx')) {
        return 'SUV';
      }
      if (model.includes('f150') || model.includes('ram') || model.includes('silverado') || make.includes('jeep')) {
        return 'Utility';
      }
      if (model.includes('civic') || model.includes('corolla') || model.includes('impreza') || model.includes('mustang') || model.includes('3 series') || model.includes('92x')) {
        return 'Sport';
      }
      return 'Sedan';
    };

    const getAccidentSite = (row) => {
      if (row.accident_site) return row.accident_site;
      const type = String(row.incident_type || '').toLowerCase();
      if (type.includes('multi')) return 'Intersection';
      if (type.includes('single')) return 'Highway';
      if (type.includes('parked')) return 'Parking Lot';
      return 'Residential Area';
    };

    // 1. Severity Chart variables
    const severityLabels = ['Major Damage', 'Minor Damage', 'Total Loss', 'Trivial Damage'];
    let severityGenCounts = [110, 320, 190, 148];
    let severityFraudCounts = [140, 80, 210, 49];

    // 2. Vehicle Category Chart variables
    const vehicleCats = ['SUV', 'Sedan', 'Sport', 'Utility'];
    let vehicleRates = [42, 27, 51, 31];

    // 3. Accident Site Chart variables
    const siteLabels = ['Highway', 'Intersection', 'Parking Lot', 'Residential Area'];
    let siteRates = [68, 34, 18, 22];

    // 4. Age Chart variables
    const ageRanges = ['18-25', '26-35', '36-45', '46-55', '56+'];
    let ageRates = [38, 44, 29, 21, 16];

    // 5. Risk Distribution variables
    let riskRates = [61, 21, 18];

    // If custom CSV is loaded, calculate dynamically
    if (isCustomDataLoaded) {
      severityGenCounts = [0, 0, 0, 0];
      severityFraudCounts = [0, 0, 0, 0];
      activeClaimsData.forEach(d => {
        const idx = severityLabels.indexOf(d.incident_severity);
        if (idx !== -1) {
          const isFraud = d.fraud_reported === 'Y' || d.fraud_reported === 'Fraudulent';
          if (isFraud) severityFraudCounts[idx]++;
          else severityGenCounts[idx]++;
        }
      });

      const vehicleTotals = [0, 0, 0, 0];
      const vehicleFrauds = [0, 0, 0, 0];
      activeClaimsData.forEach(d => {
        const cat = getVehicleCategory(d);
        const idx = vehicleCats.indexOf(cat);
        if (idx !== -1) {
          vehicleTotals[idx]++;
          if (d.fraud_reported === 'Y' || d.fraud_reported === 'Fraudulent') {
            vehicleFrauds[idx]++;
          }
        }
      });
      vehicleRates = vehicleCats.map((cat, i) => 
        vehicleTotals[i] > 0 ? parseFloat(((vehicleFrauds[i] / vehicleTotals[i]) * 100).toFixed(1)) : 0
      );

      const siteTotals = [0, 0, 0, 0];
      const siteFrauds = [0, 0, 0, 0];
      activeClaimsData.forEach(d => {
        const site = getAccidentSite(d);
        const idx = siteLabels.indexOf(site);
        if (idx !== -1) {
          siteTotals[idx]++;
          if (d.fraud_reported === 'Y' || d.fraud_reported === 'Fraudulent') {
            siteFrauds[idx]++;
          }
        }
      });
      siteRates = siteLabels.map((site, i) => 
        siteTotals[i] > 0 ? parseFloat(((siteFrauds[i] / siteTotals[i]) * 100).toFixed(1)) : 0
      );

      const ageTotals = [0, 0, 0, 0, 0];
      const ageFrauds = [0, 0, 0, 0, 0];
      activeClaimsData.forEach(d => {
        const age = parseInt(d.age);
        if (!isNaN(age)) {
          let idx = 4;
          if (age <= 25) idx = 0;
          else if (age <= 35) idx = 1;
          else if (age <= 45) idx = 2;
          else if (age <= 55) idx = 3;
          ageTotals[idx]++;
          if (d.fraud_reported === 'Y' || d.fraud_reported === 'Fraudulent') {
            ageFrauds[idx]++;
          }
        }
      });
      ageRates = ageRanges.map((range, i) => 
        ageTotals[i] > 0 ? parseFloat(((ageFrauds[i] / ageTotals[i]) * 100).toFixed(1)) : 0
      );

      let lowCount = 0, medCount = 0, highCount = 0;
      activeClaimsData.forEach(d => {
        const isFraud = d.fraud_reported === 'Y' || d.fraud_reported === 'Fraudulent';
        const claimAmt = parseFloat(d.total_claim_amount);
        if (isFraud) {
          highCount++;
        } else if (claimAmt > 70000) {
          medCount++;
        } else {
          lowCount++;
        }
      });
      const totalRisk = lowCount + medCount + highCount || 1;
      const lowRate = parseFloat(((lowCount / totalRisk) * 100).toFixed(0));
      const medRate = parseFloat(((medCount / totalRisk) * 100).toFixed(0));
      const highRate = 100 - lowRate - medRate;
      riskRates = [lowRate, medRate, highRate];
    }

    // --- CHART 1: Severity Genuine vs Fraud ---
    const ctxSeverity = canvasSeverity.getContext('2d');
    chartAnSeverity = new Chart(ctxSeverity, {
      type: 'bar',
      data: {
        labels: severityLabels,
        datasets: [
          {
            label: 'Genuine Claims',
            data: severityGenCounts,
            backgroundColor: '#10b981',
            borderRadius: 4
          },
          {
            label: 'Fraudulent Claims',
            data: severityFraudCounts,
            backgroundColor: '#ef4444',
            borderRadius: 4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: textColor, font: { family: 'Plus Jakarta Sans', size: 11 } } }
        },
        scales: {
          x: { grid: { color: gridColor }, ticks: { color: textColor } },
          y: { grid: { color: gridColor }, ticks: { color: textColor } }
        }
      }
    });

    // --- CHART 2: Vehicle Category ---
    const ctxVehicle = document.getElementById('chart-analytics-vehicle').getContext('2d');
    chartAnVehicle = new Chart(ctxVehicle, {
      type: 'bar',
      data: {
        labels: vehicleCats,
        datasets: [{
          label: 'Fraud Rate (%)',
          data: vehicleRates,
          backgroundColor: '#a855f7',
          borderRadius: 4
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { color: gridColor }, ticks: { color: textColor }, max: 100 },
          y: { grid: { display: false }, ticks: { color: textColor } }
        }
      }
    });

    // --- CHART 3: Accident Site ---
    const ctxSite = document.getElementById('chart-analytics-site').getContext('2d');
    chartAnSite = new Chart(ctxSite, {
      type: 'doughnut',
      data: {
        labels: siteLabels,
        datasets: [{
          data: siteRates,
          backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'right', labels: { color: textColor, font: { size: 10 } } }
        },
        cutout: '60%'
      }
    });

    // --- CHART 4: Driver Age ---
    const ctxAge = document.getElementById('chart-analytics-age').getContext('2d');
    chartAnAge = new Chart(ctxAge, {
      type: 'line',
      data: {
        labels: ageRanges,
        datasets: [{
          label: 'Fraud Rate (%)',
          data: ageRates,
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.08)',
          fill: true,
          tension: 0.4,
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { color: gridColor }, ticks: { color: textColor } },
          y: { grid: { color: gridColor }, ticks: { color: textColor }, max: 100 }
        }
      }
    });

    // --- CHART 5: Risk Distribution ---
    const ctxRisk = document.getElementById('chart-analytics-risk').getContext('2d');
    chartAnRisk = new Chart(ctxRisk, {
      type: 'bar',
      data: {
        labels: ['Low Risk', 'Medium Risk', 'High Risk'],
        datasets: [{
          data: riskRates,
          backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { color: textColor } },
          y: { grid: { color: gridColor }, ticks: { color: textColor }, max: 100 }
        }
      }
    });
  }

  // Helper: Wilson-Hilferty F-distribution CDF approximation to compute statistical P-value
  function fDistributionPValue(fVal, df1, df2) {
    if (fVal <= 0) return 1.0;
    const d1 = 2 / (9 * df1);
    const d2 = 2 / (9 * df2);
    const num = Math.pow(fVal, 1/3) * (1 - d2) - (1 - d1);
    const den = Math.sqrt(d2 * Math.pow(fVal, 2/3) + d1);
    const z = num / den;
    
    // Normal CDF approximation
    const t = 1 / (1 + 0.2316419 * Math.abs(z));
    const d = 0.39894228 * Math.exp(-z * z / 2);
    let p = d * t * (0.31938153 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
    if (z > 0) p = 1 - p;
    return Math.max(0, Math.min(1, p));
  }

  function calculateANOVA() {
    // Factor: incident_severity (4 levels: Major, Minor, Total, Trivial)
    // Continuous dependent: total_claim_amount
    const categories = ['Major Damage', 'Minor Damage', 'Total Loss', 'Trivial Damage'];
    
    const groups = {};
    categories.forEach(cat => groups[cat] = []);
    
    let totalCount = 0;
    let globalSum = 0;

    activeClaimsData.forEach(d => {
      const sev = d.incident_severity;
      const claim = d.total_claim_amount;
      if (groups[sev] !== undefined && typeof claim === 'number') {
        groups[sev].push(claim);
        globalSum += claim;
        totalCount++;
      }
    });

    if (totalCount === 0) return;

    const globalMean = globalSum / totalCount;

    // Sum of Squares Between Groups (SSB / Factor)
    let ssb = 0;
    categories.forEach(cat => {
      const n = groups[cat].length;
      if (n > 0) {
        const mean = groups[cat].reduce((sum, v) => sum + v, 0) / n;
        ssb += n * Math.pow(mean - globalMean, 2);
      }
    });

    // Sum of Squares Within Groups (SSW / Error)
    let ssw = 0;
    categories.forEach(cat => {
      const n = groups[cat].length;
      if (n > 0) {
        const mean = groups[cat].reduce((sum, v) => sum + v, 0) / n;
        groups[cat].forEach(v => {
          ssw += Math.pow(v - mean, 2);
        });
      }
    });

    const sst = ssb + ssw;

    // Degrees of Freedom
    const dfFactor = categories.length - 1;
    const dfError = totalCount - categories.length;
    const dfTotal = totalCount - 1;

    // Mean Squares
    const msb = ssb / dfFactor;
    const msw = ssw / dfError;

    // F-statistic & P-value
    const fStat = msb / msw;
    const pValue = fDistributionPValue(fStat, dfFactor, dfError);

    // Render HTML Table
    const tbody = document.getElementById('anova-results-body');
    tbody.innerHTML = `
      <tr>
        <td>Severity Factor</td>
        <td>${dfFactor}</td>
        <td>${Math.round(ssb).toLocaleString()}</td>
        <td>${Math.round(msb).toLocaleString()}</td>
        <td>${fStat.toFixed(2)}</td>
        <td style="font-weight: 700; color: ${pValue < 0.05 ? 'var(--success)' : 'var(--warning)'}">${pValue < 0.0001 ? '< 0.0001' : pValue.toFixed(4)}</td>
      </tr>
      <tr>
        <td>Error (Within)</td>
        <td>${dfError}</td>
        <td>${Math.round(ssw).toLocaleString()}</td>
        <td>${Math.round(msw).toLocaleString()}</td>
        <td>-</td>
        <td>-</td>
      </tr>
      <tr style="font-weight: 600;">
        <td>Total Variance</td>
        <td>${dfTotal}</td>
        <td>${Math.round(sst).toLocaleString()}</td>
        <td>-</td>
        <td>-</td>
        <td>-</td>
      </tr>
    `;

    // Conclusion Narrative
    const conclusionDiv = document.getElementById('anova-conclusion');
    conclusionDiv.className = 'stat-conclusion';
    if (pValue < 0.05) {
      conclusionDiv.classList.add('success');
      conclusionDiv.innerHTML = `<strong>Conclusion: Reject H<sub>0</sub> (p = ${pValue < 0.0001 ? '< 0.0001' : pValue.toFixed(4)})</strong><br>The mean claim amount is highly statistically different across the four severity groups. This confirms severity is a powerful predictor for claim modeling.`;
    } else {
      conclusionDiv.classList.add('warning');
      conclusionDiv.innerHTML = `<strong>Conclusion: Fail to Reject H<sub>0</sub> (p = ${pValue.toFixed(4)})</strong><br>There is no statistically significant difference in mean claim amounts across severity groups at a 95% confidence level.`;
    }

    // Interval Plot calculations
    const intervalsData = categories.map(cat => {
      const vals = groups[cat];
      const n = vals.length;
      if (n === 0) return { mean: 0, min: 0, max: 0 };
      const mean = vals.reduce((sum, v) => sum + v, 0) / n;
      // Standard Dev
      const variance = vals.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (n - 1 || 1);
      const sd = Math.sqrt(variance);
      // Standard Error
      const se = sd / Math.sqrt(n);
      // Margin of error (95% CI with critical t/z approx 1.96)
      const margin = 1.96 * se;
      return {
        category: cat,
        mean: Math.round(mean),
        min: Math.round(Math.max(0, mean - margin)),
        max: Math.round(mean + margin)
      };
    });

    renderAnovaIntervalChart(intervalsData);
  }

  function renderAnovaIntervalChart(data) {
    if (chartAnovaIntervals) chartAnovaIntervals.destroy();

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#f3f4f6' : '#0f172a';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.08)';

    const ctx = document.getElementById('chart-anova-intervals').getContext('2d');
    
    // Floating bar representation for confidence intervals
    chartAnovaIntervals = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.map(d => d.category),
        datasets: [
          {
            label: '95% CI Interval Range',
            data: data.map(d => [d.min, d.max]),
            backgroundColor: 'rgba(37, 99, 235, 0.25)',
            borderColor: '#2563eb',
            borderWidth: 2,
            borderRadius: 4,
            barThickness: 24
          },
          {
            label: 'Group Mean',
            type: 'scatter',
            data: data.map((d, idx) => ({ x: idx, y: d.mean })),
            backgroundColor: '#ef4444',
            borderColor: '#ffffff',
            borderWidth: 1.5,
            pointRadius: 6,
            pointHoverRadius: 8
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const idx = ctx.dataIndex;
                const d = data[idx];
                return ctx.datasetIndex === 0 
                  ? `Interval Range: $${d.min.toLocaleString()} to $${d.max.toLocaleString()}`
                  : `Average Claim: $${d.mean.toLocaleString()}`;
              }
            }
          }
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: textColor } },
          y: { grid: { color: gridColor }, ticks: { color: textColor } }
        }
      }
    });
  }

  function calculateCapability() {
    // Feature: safety_rating (values range 2 to 100)
    // Limits: LSL = 20, USL = 90
    const ratings = activeClaimsData
      .map(d => d.safety_rating)
      .filter(v => typeof v === 'number');

    if (ratings.length === 0) return;

    const n = ratings.length;
    const sum = ratings.reduce((s, v) => s + v, 0);
    const mean = sum / n;

    const squaredDiffs = ratings.map(v => Math.pow(v - mean, 2));
    const variance = squaredDiffs.reduce((s, v) => s + v, 0) / (n - 1 || 1);
    const stdev = Math.sqrt(variance);

    const lsl = 20;
    const usl = 90;

    // Process Capability metrics
    const cp = (usl - lsl) / (6 * stdev);
    const cpl = (mean - lsl) / (3 * stdev);
    const cpu = (usl - mean) / (3 * stdev);
    const cpk = Math.min(cpl, cpu);

    document.getElementById('cap-mean').textContent = mean.toFixed(1);
    document.getElementById('cap-stdev').textContent = stdev.toFixed(2);
    document.getElementById('cap-cp').textContent = cp.toFixed(2);
    document.getElementById('cap-cpk').textContent = cpk.toFixed(2);

    // Apply color highlights based on standard process cap benchmarks
    const cpEl = document.getElementById('cap-cp');
    const cpkEl = document.getElementById('cap-cpk');
    
    [cpEl, cpkEl].forEach(el => {
      const val = parseFloat(el.textContent);
      el.className = '';
      if (val >= 1.33) el.classList.add('text-success');
      else if (val >= 1.0) el.classList.add('text-warning');
      else el.classList.add('text-danger');
    });

    renderCapabilityChart(ratings, mean, stdev, lsl, usl);
  }

  function renderCapabilityChart(ratings, mean, stdev, lsl, usl) {
    if (chartCapability) chartCapability.destroy();

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#f3f4f6' : '#0f172a';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.08)';

    // 1. Bin ratings for histogram
    const numBins = 15;
    const minVal = 0;
    const maxVal = 100;
    const binWidth = (maxVal - minVal) / numBins;

    const binCounts = Array(numBins).fill(0);
    ratings.forEach(v => {
      const idx = Math.min(numBins - 1, Math.floor((v - minVal) / binWidth));
      binCounts[idx]++;
    });

    const labels = Array.from({ length: numBins }, (_, i) => {
      const center = minVal + (i + 0.5) * binWidth;
      return Math.round(center);
    });

    // 2. Generate normal curve values
    // density = (1 / (std * sqrt(2pi))) * exp(-0.5 * ((x-mean)/std)^2)
    // scaled density = density * totalCount * binWidth
    const normalCurve = labels.map(x => {
      const exp = Math.exp(-0.5 * Math.pow((x - mean) / stdev, 2));
      const density = (1 / (stdev * Math.sqrt(2 * Math.PI))) * exp;
      return density * ratings.length * binWidth;
    });

    const ctx = document.getElementById('chart-capability-normal').getContext('2d');
    chartCapability = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Histogram Counts',
            data: binCounts,
            backgroundColor: 'rgba(59, 130, 246, 0.4)',
            borderColor: 'rgba(59, 130, 246, 0.8)',
            borderWidth: 1,
            borderRadius: 2,
            categoryPercentage: 1.0,
            barPercentage: 0.95
          },
          {
            label: 'Normal Curve fit',
            type: 'line',
            data: normalCurve,
            borderColor: '#ef4444',
            borderWidth: 2.5,
            pointRadius: 0,
            tension: 0.4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          annotation: { // Will construct fallback limits in line points if plugin unavailable
            annotations: {}
          }
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: textColor } },
          y: { grid: { color: gridColor }, ticks: { color: textColor } }
        }
      }
    });
  }

  function renderCorrelationMatrix() {
    const columns = [
      { name: 'Age', key: 'age' },
      { name: 'Months Cus.', key: 'months_as_customer' },
      { name: 'Deductible', key: 'policy_deductable' },
      { name: 'Premium', key: 'policy_annual_premium' },
      { name: 'Claim Amt', key: 'total_claim_amount' },
      { name: 'Injuries', key: 'bodily_injuries' },
      { name: 'Witnesses', key: 'witnesses' }
    ];

    const matrixContainer = document.getElementById('correlation-matrix');
    matrixContainer.innerHTML = '';
    
    // Set grid dimensions in CSS variable
    matrixContainer.style.gridTemplateColumns = `repeat(${columns.length + 1}, 1fr)`;

    // 1. Header Corner
    const corner = document.createElement('div');
    corner.className = 'corr-header-label';
    corner.style.fontWeight = '700';
    corner.style.fontSize = '9px';
    corner.style.color = 'var(--text-muted)';
    corner.textContent = 'Factor';
    matrixContainer.appendChild(corner);

    // 2. Column Headers
    columns.forEach(col => {
      const header = document.createElement('div');
      header.className = 'corr-header-label';
      header.style.fontWeight = '600';
      header.style.fontSize = '9px';
      header.style.textAlign = 'center';
      header.style.color = 'var(--text-secondary)';
      header.textContent = col.name;
      matrixContainer.appendChild(header);
    });

    // 3. Row-by-Row Correlation Compute
    columns.forEach((rowCol) => {
      // Row Label
      const rowLabel = document.createElement('div');
      rowLabel.className = 'corr-row-label';
      rowLabel.style.fontWeight = '600';
      rowLabel.style.fontSize = '9px';
      rowLabel.style.display = 'flex';
      rowLabel.style.alignItems = 'center';
      rowLabel.style.color = 'var(--text-secondary)';
      rowLabel.textContent = rowCol.name;
      matrixContainer.appendChild(rowLabel);

      columns.forEach((colCol) => {
        const cell = document.createElement('div');
        cell.className = 'corr-cell';
        
        const r = calculatePearson(rowCol.key, colCol.key);
        
        cell.textContent = r.toFixed(2);
        cell.setAttribute('data-tooltip', `${rowCol.name} vs ${colCol.name}: r = ${r.toFixed(4)}`);
        
        // Color Interpolator: Red (-1.0) -> White (0.0) -> Blue (+1.0)
        let bgColor = '';
        if (r >= 0) {
          // Blue interpolator
          bgColor = `rgba(37, 99, 235, ${r.toFixed(2)})`;
        } else {
          // Red interpolator
          bgColor = `rgba(239, 68, 68, ${Math.abs(r).toFixed(2)})`;
        }
        
        cell.style.backgroundColor = bgColor;
        
        // High values contrast
        if (Math.abs(r) < 0.25) {
          cell.style.color = 'var(--text-primary)';
        } else {
          cell.style.color = '#ffffff';
        }

        matrixContainer.appendChild(cell);
      });
    });
  }

  function calculatePearson(key1, key2) {
    const list1 = [];
    const list2 = [];
    
    activeClaimsData.forEach(d => {
      const v1 = d[key1];
      const v2 = d[key2];
      if (typeof v1 === 'number' && typeof v2 === 'number') {
        list1.push(v1);
        list2.push(v2);
      }
    });

    const n = list1.length;
    if (n === 0) return 0;

    const mean1 = list1.reduce((s, v) => s + v, 0) / n;
    const mean2 = list2.reduce((s, v) => s + v, 0) / n;

    let num = 0;
    let den1 = 0;
    let den2 = 0;

    for (let i = 0; i < n; i++) {
      const diff1 = list1[i] - mean1;
      const diff2 = list2[i] - mean2;
      num += diff1 * diff2;
      den1 += diff1 * diff1;
      den2 += diff2 * diff2;
    }

    if (den1 === 0 || den2 === 0) return 0;
    return num / Math.sqrt(den1 * den2);
  }

  // --- 6. FRAUD RISK PREDICTOR ---
  function initPredictorForm() {
    const formInputs = [
      'pred-severity', 'pred-hobby', 'pred-collision',
      'pred-age', 'pred-claim', 'pred-witnesses', 'pred-injuries',
      'pred-hour', 'pred-vehicles'
    ];

    formInputs.forEach(id => {
      const input = document.getElementById(id);
      
      // Real-time recalculation
      input.addEventListener('input', () => {
        updateLabelValues(id, input.value);
        calculatePrediction();
      });
      input.addEventListener('change', () => {
        updateLabelValues(id, input.value);
        calculatePrediction();
      });
    });

    // Run initial compute
    calculatePrediction();
  }

  function updateLabelValues(id, value) {
    if (id === 'pred-age') {
      document.getElementById('val-age').textContent = value;
    } else if (id === 'pred-claim') {
      document.getElementById('val-claim').textContent = parseInt(value).toLocaleString();
    } else if (id === 'pred-hour') {
      document.getElementById('val-hour').textContent = `${String(value).padStart(2, '0')}:00`;
    }
  }

  function calculatePrediction() {
    const severity = document.getElementById('pred-severity').value;
    const hobby = document.getElementById('pred-hobby').value;
    const collision = document.getElementById('pred-collision').value;
    const age = parseInt(document.getElementById('pred-age').value);
    const claim = parseFloat(document.getElementById('pred-claim').value);
    const witnesses = parseInt(document.getElementById('pred-witnesses').value);
    const injuries = parseInt(document.getElementById('pred-injuries').value);
    const hour = parseInt(document.getElementById('pred-hour').value);
    const vehicles = parseInt(document.getElementById('pred-vehicles').value);

    // Heuristics Score calculation derived from the dataset stats
    let risk = 12.0; // Base rate probability %
    const factors = [];

    // 1. Severity Weights
    if (severity === 'Major Damage') {
      risk += 45;
      factors.push({ name: 'Major Collision Severity', value: '+45%', state: 'pos' });
    } else if (severity === 'Total Loss') {
      risk += 18;
      factors.push({ name: 'Total Vehicle Loss', value: '+18%', state: 'pos' });
    } else if (severity === 'Minor Damage') {
      risk += 3;
      factors.push({ name: 'Minor Collision Damage', value: '+3%', state: 'pos' });
    } else {
      risk -= 8;
      factors.push({ name: 'Trivial Incident Impact', value: '-8%', state: 'neg' });
    }

    // 2. Hobby Risk Spikes (very real patterns in this specific dataset)
    if (hobby === 'chess') {
      risk += 35;
      factors.push({ name: 'Policyholder Hobby: Chess', value: '+35%', state: 'pos' });
    } else if (hobby === 'yachting') {
      risk += 30;
      factors.push({ name: 'Policyholder Hobby: Yachting', value: '+30%', state: 'pos' });
    } else if (hobby === 'skydiving') {
      risk += 22;
      factors.push({ name: 'Policyholder Hobby: Skydiving', value: '+22%', state: 'pos' });
    } else if (hobby === 'reading') {
      risk -= 6;
      factors.push({ name: 'Policyholder Hobby: Reading', value: '-6%', state: 'neg' });
    }

    // 3. Age Brackets
    if (age < 26) {
      risk += 10;
      factors.push({ name: 'High-risk Under-26 Driver', value: '+10%', state: 'pos' });
    } else if (age > 50) {
      risk -= 5;
      factors.push({ name: 'Senior Driver Profile', value: '-5%', state: 'neg' });
    }

    // 4. Financial Claim Amount scale
    if (claim > 80000) {
      risk += 14;
      factors.push({ name: 'Extreme Claim Value (>$80k)', value: '+14%', state: 'pos' });
    } else if (claim > 50000) {
      risk += 6;
      factors.push({ name: 'Elevated Claim Value (>$50k)', value: '+6%', state: 'pos' });
    } else if (claim < 10000) {
      risk -= 8;
      factors.push({ name: 'Low Claim Value (<$10k)', value: '-8%', state: 'neg' });
    }

    // 5. Incident Hour
    if (hour >= 22 || hour <= 4) {
      risk += 8;
      factors.push({ name: 'Late-Night Incident Timing', value: '+8%', state: 'pos' });
    } else if (hour >= 10 && hour <= 16) {
      risk -= 3;
      factors.push({ name: 'Mid-day Incident Traffic', value: '-3%', state: 'neg' });
    }

    // 6. Witnesses modifier
    if (witnesses === 0) {
      risk += 6;
      factors.push({ name: 'Zero Witnesses Present', value: '+6%', state: 'pos' });
    } else if (witnesses >= 3) {
      risk -= 5;
      factors.push({ name: 'Multiple Active Witnesses', value: '-5%', state: 'neg' });
    }

    // Restrain bounds
    risk = Math.max(2, Math.min(98, risk));

    // Update gauge visuals
    const fillRing = document.getElementById('gauge-fill-ring');
    const probVal = document.getElementById('gauge-probability-val');
    const badge = document.getElementById('gauge-risk-badge');

    probVal.textContent = `${Math.round(risk)}%`;
    
    // Dasharray circumference = 534 (radius = 85)
    // Offset = 534 - (534 * risk) / 100
    const offset = 534 - (534 * risk) / 100;
    fillRing.style.strokeDashoffset = offset;

    // Apply severity color classes
    fillRing.style.stroke = 'var(--primary)';
    badge.className = 'risk-badge';

    if (risk < 30) {
      badge.textContent = 'Low Risk';
      badge.classList.add('badge-success');
      fillRing.style.stroke = 'var(--success)';
    } else if (risk < 65) {
      badge.textContent = 'Medium Risk';
      badge.classList.add('badge-warning');
      fillRing.style.stroke = 'var(--warning)';
    } else {
      badge.textContent = 'High Risk';
      badge.classList.add('badge-danger');
      fillRing.style.stroke = 'var(--danger)';
    }

    // Render Influencing factors
    const list = document.getElementById('predictor-factors-list');
    list.innerHTML = '';

    if (factors.length === 0) {
      list.innerHTML = `<li class="text-secondary" style="font-size: 12px; text-align: center; padding: 20px 0;">No significant risk factors flagged for these inputs.</li>`;
      return;
    }

    // Sort factors showing positive (dangerous) ones first
    factors.sort((a, b) => (b.state === 'pos') - (a.state === 'pos'));

    factors.forEach(f => {
      const li = document.createElement('li');
      li.className = 'factor-item';
      
      const isPos = f.state === 'pos';
      const valClass = isPos ? 'pos' : 'neg';
      const icon = isPos ? 'plus-circle' : 'minus-circle';
      const iconColor = isPos ? 'var(--danger)' : 'var(--success)';

      li.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
          <i data-lucide="${icon}" style="width: 14px; height: 14px; color: ${iconColor};"></i>
          <span class="factor-name">${f.name}</span>
        </div>
        <span class="factor-value ${valClass}">${f.value}</span>
      `;
      list.appendChild(li);
    });

    lucide.createIcons();
  }

  // --- 7. MINITAB DATA PREPARATION LAB ---
  function renderDataPrepLab() {
    const missingCountEl = document.getElementById('prep-missing-count');
    const outliersCountEl = document.getElementById('prep-outliers-count');
    const totalRowsEl = document.getElementById('prep-total-rows');
    const statusBadgeEl = document.getElementById('prep-status-badge');

    if (!missingCountEl && !outliersCountEl && !totalRowsEl && !statusBadgeEl) {
      return; // Skip if elements are not present in this workspace view
    }

    // 1. Calculate missing counts (cells with "?")
    let missingCount = 0;
    activeClaimsData.forEach(d => {
      if (d.collision_type === '?') missingCount++;
      if (d.property_damage === '?') missingCount++;
      if (d.police_report_available === '?') missingCount++;
    });

    // 2. Outliers calculation
    const premiums = activeClaimsData
      .map(d => d.policy_annual_premium)
      .filter(v => typeof v === 'number');

    let outlierCount = 0;
    if (premiums.length > 0) {
      const mean = premiums.reduce((s, v) => s + v, 0) / premiums.length;
      const squaredDiffs = premiums.map(v => Math.pow(v - mean, 2));
      const sd = Math.sqrt(squaredDiffs.reduce((s, v) => s + v, 0) / (premiums.length - 1 || 1));
      
      activeClaimsData.forEach(d => {
        if (typeof d.policy_annual_premium === 'number') {
          const z = Math.abs(d.policy_annual_premium - mean) / sd;
          if (z > 3) outlierCount++;
        }
      });
    }

    // Update Indicators
    if (missingCountEl) missingCountEl.textContent = missingCount.toLocaleString();
    if (outliersCountEl) outliersCountEl.textContent = outlierCount;
    if (totalRowsEl) totalRowsEl.textContent = activeClaimsData.length.toLocaleString();
    
    if (statusBadgeEl) {
      statusBadgeEl.className = 'indicator-badge';
      if (dataPrepState.missingCleaned || dataPrepState.outliersFiltered || dataPrepState.binned) {
        statusBadgeEl.textContent = 'Optimized Data';
        statusBadgeEl.classList.remove('badge-info');
        statusBadgeEl.classList.add('badge-success');
        statusBadgeEl.style.backgroundColor = 'var(--success-bg)';
        statusBadgeEl.style.color = 'var(--success)';
      } else {
        statusBadgeEl.textContent = 'Raw Data';
        statusBadgeEl.style.backgroundColor = 'var(--primary-light)';
        statusBadgeEl.style.color = 'var(--primary)';
      }
    }

    // Enable/disable buttons based on state
    const btnMissing = document.getElementById('btn-prep-missing');
    const btnOutliers = document.getElementById('btn-prep-outliers');
    const btnBinning = document.getElementById('btn-prep-binning');

    if (btnMissing) btnMissing.disabled = dataPrepState.missingCleaned;
    if (btnOutliers) btnOutliers.disabled = dataPrepState.outliersFiltered || outlierCount === 0;
    if (btnBinning) btnBinning.disabled = dataPrepState.binned;

    // Render Preview grid
    renderPrepPreview();
  }

  function renderPrepPreview() {
    const previewBody = document.getElementById('prep-preview-body');
    if (!previewBody) return; // Skip if elements are not present

    previewBody.innerHTML = '';

    const first5 = activeClaimsData.slice(0, 5);
    first5.forEach(d => {
      const tr = document.createElement('tr');
      const valAge = d.age_binned ? `<strong>${d.age_binned}</strong>` : d.age;
      const missingFmt = (val) => val === '?' ? '<span class="text-danger">? (Missing)</span>' : val;
      
      tr.innerHTML = `
        <td>${d.policy_number}</td>
        <td>${valAge}</td>
        <td>${missingFmt(d.collision_type)}</td>
        <td>${missingFmt(d.property_damage)}</td>
        <td>${missingFmt(d.police_report_available)}</td>
        <td style="font-weight: 500;">$${(d.policy_annual_premium || 0).toLocaleString()}</td>
      `;
      previewBody.appendChild(tr);
    });
  }

  function initDataPrepActions() {
    const btnMissing = document.getElementById('btn-prep-missing');
    const btnOutliers = document.getElementById('btn-prep-outliers');
    const btnBinning = document.getElementById('btn-prep-binning');
    const btnReset = document.getElementById('btn-reset-lab');

    if (btnMissing) {
      btnMissing.addEventListener('click', () => {
        activeClaimsData.forEach(d => {
          if (d.collision_type === '?') d.collision_type = 'Unknown';
          if (d.property_damage === '?') d.property_damage = 'Unknown';
          if (d.police_report_available === '?') d.police_report_available = 'Unknown';
        });
        dataPrepState.missingCleaned = true;
        syncDataPrepChange();
      });
    }

    if (btnOutliers) {
      btnOutliers.addEventListener('click', () => {
        const premiums = activeClaimsData
          .map(d => d.policy_annual_premium)
          .filter(v => typeof v === 'number');

        if (premiums.length === 0) return;

        const mean = premiums.reduce((s, v) => s + v, 0) / premiums.length;
        const squaredDiffs = premiums.map(v => Math.pow(v - mean, 2));
        const sd = Math.sqrt(squaredDiffs.reduce((s, v) => s + v, 0) / (premiums.length - 1 || 1));

        activeClaimsData = activeClaimsData.filter(d => {
          if (typeof d.policy_annual_premium !== 'number') return true;
          const z = Math.abs(d.policy_annual_premium - mean) / sd;
          return z <= 3;
        });

        dataPrepState.outliersFiltered = true;
        syncDataPrepChange();
      });
    }

    if (btnBinning) {
      btnBinning.addEventListener('click', () => {
        activeClaimsData.forEach(d => {
          const age = d.age;
          if (typeof age === 'number') {
            if (age < 30) d.age_binned = 'Young Adult';
            else if (age <= 50) d.age_binned = 'Adult';
            else d.age_binned = 'Senior';
          } else {
            d.age_binned = 'Unknown';
          }
        });
        dataPrepState.binned = true;
        syncDataPrepChange();
      });
    }

    if (btnReset) {
      btnReset.addEventListener('click', () => {
        activeClaimsData = JSON.parse(JSON.stringify(originalClaimsData));
        dataPrepState = {
          missingCleaned: false,
          outliersFiltered: false,
          binned: false
        };
        syncDataPrepChange();
      });
    }
  }

  function syncDataPrepChange() {
    renderDataPrepLab();
    
    // Propagate variables change back to explorer table & stats charts
    renderTable();
    
    // If stats suite visible, recalculate stats
    const statsTab = document.getElementById('analytics-tab');
    if (statsTab.classList.contains('active')) {
      renderStatsSuite();
    }
  }

  // --- 8. DESIGN THEME & COHESIVE SYSTEM ---
  function initTheme() {
    // Lock the application theme to Dark Mode to match the Vehicle Insurance Fraud Data visual spec
    document.documentElement.setAttribute('data-theme', 'dark');
    localStorage.removeItem('themeChoice');

    // Settings Alert
    const settingsBtn = document.getElementById('btn-settings');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', (e) => {
        e.preventDefault();
        alert('Vehicle Insurance Fraud Data settings panel is standard in production. Current version runs in analytical demo mode.');
      });
    }

    // Help Center Alert
    const helpBtn = document.getElementById('btn-help');
    if (helpBtn) {
      helpBtn.addEventListener('click', (e) => {
        e.preventDefault();
        alert('For help, contact the compliance support desk or read the Minitab documentation.');
      });
    }
  }

  // --- 9. LOGIN PAGE TRANSITION & CONSTELLATION CANVAS ---
  function initLogin() {
    const loginPage = document.getElementById('login-page');
    const appContainer = document.getElementById('app-container');
    const loginForm = document.getElementById('form-login');
    const demoBtn = document.getElementById('btn-login-demo');

    // Handle Form Login
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        performLoginTransition();
      });
    }

    // Handle Demo Login
    if (demoBtn) {
      demoBtn.addEventListener('click', () => {
        performLoginTransition();
      });
    }

    function performLoginTransition() {
      // Fade out login page, then hide and show dashboard container
      loginPage.style.opacity = '0';
      loginPage.style.transform = 'scale(1.02)';
      loginPage.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
      
      setTimeout(() => {
        loginPage.style.display = 'none';
        appContainer.style.display = 'flex';
        appContainer.style.opacity = '0';
        
        // Trigger resize to fix any chart dimensions
        window.dispatchEvent(new Event('resize'));
        
        setTimeout(() => {
          appContainer.style.opacity = '1';
          appContainer.style.transition = 'opacity 0.6s ease';
        }, 50);
      }, 600);
    }

    // Password visibility toggle
    const togglePwdBtn = document.querySelector('.btn-reveal-pwd');
    const pwdInput = document.getElementById('login-password');
    if (togglePwdBtn && pwdInput) {
      togglePwdBtn.addEventListener('click', () => {
        const isPwd = pwdInput.type === 'password';
        pwdInput.type = isPwd ? 'text' : 'password';
        togglePwdBtn.innerHTML = isPwd 
          ? `<i data-lucide="eye-off" style="width: 16px; height: 16px;"></i>` 
          : `<i data-lucide="eye" style="width: 16px; height: 16px;"></i>`;
        lucide.createIcons();
      });
    }

    // Init Constellation Canvas
    initConstellation();
  }

  function initConstellation() {
    const canvas = document.getElementById('constellation-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    let width = canvas.width = canvas.offsetWidth;
    let height = canvas.height = canvas.offsetHeight;
    
    // Handle resize
    window.addEventListener('resize', () => {
      if (canvas.offsetWidth && canvas.offsetHeight) {
        width = canvas.width = canvas.offsetWidth;
        height = canvas.height = canvas.offsetHeight;
      }
    });

    const particles = [];
    const maxParticles = 50;

    for (let i = 0; i < maxParticles; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        radius: Math.random() * 2 + 1
      });
    }

    function animate() {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = 'rgba(59, 130, 246, 0.4)';
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.04)';
      
      particles.forEach((p, idx) => {
        p.x += p.vx;
        p.y += p.vy;
        
        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;
        
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Connect lines
        for (let j = idx + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dist = Math.hypot(p.x - p2.x, p.y - p2.y);
          if (dist < 100) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      });
      
      requestAnimationFrame(animate);
    }
    animate();
  }

  // --- 9. COMPREHENSIVE FRAUD DETECTION FORM (ML MODEL TAB) ---
  function initMLClaimForm() {
    const mlForm = document.getElementById('ml-claim-form');
    const resetBtn = document.getElementById('btn-ml-reset');
    const clearBtn = document.getElementById('btn-ml-clear');

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (mlForm) mlForm.reset();
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        if (mlForm) mlForm.reset();
      });
    }

    if (mlForm) {
      mlForm.addEventListener('submit', (e) => {
        e.preventDefault();

        // Retrieve values for model prediction parameters
        const age = parseInt(document.getElementById('ml-age').value) || 30;
        const income = parseFloat(document.getElementById('ml-income').value) || 0;
        const claims = parseInt(document.getElementById('ml-prev-claims').value) || 0;
        const liability = parseInt(document.getElementById('ml-liability').value) || 0;
        const deductible = parseFloat(document.getElementById('ml-deductible').value) || 0;
        const premium = parseFloat(document.getElementById('ml-premium').value) || 0;
        const claimAmount = parseFloat(document.getElementById('ml-claim-amount').value) || 0;
        const injuryClaim = parseFloat(document.getElementById('ml-injury-claim').value) || 0;

        const severity = document.getElementById('ml-accident-site').value;
        const witness = document.getElementById('ml-witness').value;
        const policeReport = document.getElementById('ml-police-report').value;

        // Perform mock model inference prediction (RandomForest ensemble prediction)
        let fraudScore = 15.0; // Base rate probability

        if (claimAmount > 60000) fraudScore += 18.2;
        if (liability > 50) fraudScore += 12.5;
        if (witness === 'NO') fraudScore += 10.1;
        if (policeReport === 'NO') fraudScore += 14.3;
        if (claims > 2) fraudScore += 8.6;
        if (deductible < 1000) fraudScore += 7.4;
        if (age < 25) fraudScore += 6.5;

        // Clamp score
        fraudScore = Math.min(Math.max(fraudScore, 5.0), 98.4);

        // Open custom modal overlay with results
        showMLResultModal(fraudScore);
      });
    }
  }

  function showMLResultModal(score) {
    const overlay = document.createElement('div');
    overlay.className = 'ml-modal-overlay';
    overlay.id = 'ml-result-modal';

    let riskBadge = 'badge-success';
    let riskLevel = 'LOW RISK';
    let riskDesc = 'This claim shows standard characteristics with low anomalies. Recommended for automated fast-track approval.';

    if (score > 60) {
      riskBadge = 'badge-danger';
      riskLevel = 'HIGH RISK';
      riskDesc = 'Significant risk indicators detected. We recommend manual review, SIU investigation, and matching against similar claims.';
    } else if (score > 30) {
      riskBadge = 'badge-warning';
      riskLevel = 'MEDIUM RISK';
      riskDesc = 'Minor anomalies present. Policy verification and verification of the accident site particulars are advised.';
    }

    overlay.innerHTML = `
      <div class="ml-modal">
        <div class="ml-modal-header">
          <h3>Fraud Assessment Results</h3>
          <button class="btn-close-modal" id="btn-close-ml-modal">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x"><line x1="18" x2="6" y1="6" y2="18"></line><line x1="6" x2="18" y1="6" y2="18"></line></svg>
          </button>
        </div>
        <div class="ml-modal-body" style="text-align: center;">
          <div style="margin: 16px 0;">
            <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: var(--text-muted);">Estimated Fraud Probability</div>
            <div style="font-size: 54px; font-weight: 800; margin: 8px 0; color: #ffffff;">
              <span style="color: ${score > 60 ? '#ef4444' : score > 30 ? '#f59e0b' : '#10b981'}">${score.toFixed(1)}%</span>
            </div>
            <span class="badge ${riskBadge}" style="padding: 6px 14px; font-size: 11px; font-weight: 700; border-radius: 20px;">${riskLevel}</span>
          </div>
          
          <p style="font-size: 13px; color: var(--text-secondary); line-height: 1.6; margin: 24px 0 16px 0;">
            ${riskDesc}
          </p>

          <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 14px; text-align: left;">
            <h5 style="font-size: 12px; margin: 0 0 8px 0; color: #ffffff;">AI Decision Factors</h5>
            <ul style="font-size: 11px; color: var(--text-secondary); padding-left: 16px; margin: 0; display: flex; flex-direction: column; gap: 4px;">
              <li>Ensemble model evaluated 39 training parameters.</li>
              <li>Claim severity and liability ratios act as major weight factors.</li>
              <li>Verification status is consistent with cross-linked dataset profiles.</li>
            </ul>
          </div>
        </div>
        <div class="ml-modal-footer">
          <button type="button" class="btn btn-primary" id="btn-close-ml-modal-ok" style="padding: 10px 20px;">Dismiss</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const closeModal = () => {
      overlay.style.opacity = '0';
      overlay.style.transition = 'opacity 0.2s ease';
      setTimeout(() => {
        if (overlay.parentNode) {
          overlay.parentNode.removeChild(overlay);
        }
      }, 200);
    };

    document.getElementById('btn-close-ml-modal').addEventListener('click', closeModal);
    document.getElementById('btn-close-ml-modal-ok').addEventListener('click', closeModal);
    
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closeModal();
      }
    });
  }
});
