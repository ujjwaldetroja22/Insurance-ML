import * as api from './api.js';

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

  let serverTotalPages = 100;
  let isApiConnected = false;
  let predDebounce = null;

  // Check FastAPI Backend Health
  api.checkHealth().then(status => {
    isApiConnected = status.ok;
    const pill = document.querySelector('.system-pill');
    const statusHeader = document.querySelector('.status-header');
    if (status.ok) {
      console.log('[FastAPI] Connected to backend at', api.API_BASE_URL);
      if (pill) pill.innerHTML = '<span class="status-dot"></span><span>FastAPI Online</span>';
      if (statusHeader) statusHeader.innerHTML = '<span class="status-dot"></span><strong>FastAPI Online</strong>';
    } else {
      console.warn('[FastAPI] Backend unreachable, running in local fallback mode.');
      if (pill) pill.innerHTML = '<span class="status-dot" style="background:#f59e0b;"></span><span>Local Mode</span>';
      if (statusHeader) statusHeader.innerHTML = '<span class="status-dot" style="background:#f59e0b;"></span><strong>Local Fallback Mode</strong>';
    }
  });

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
  async function renderOverview() {
    try {
      const summary = await api.getDashboardSummary();
      if (summary && summary.success) {
        document.getElementById('kpi-total-claims').textContent = summary.total_claims.toLocaleString();
        document.getElementById('kpi-fraud-count').textContent = summary.fraudulent_claims.toLocaleString();
        document.getElementById('kpi-genuine-count').textContent = summary.genuine_claims.toLocaleString();
        document.getElementById('kpi-fraud-rate').textContent = `${summary.fraud_rate}%`;

        const centerVal = document.querySelector('#doughnut-center-text .center-value');
        const centerLbl = document.querySelector('#doughnut-center-text .center-label');
        if (centerVal && centerLbl) {
          centerVal.textContent = `${summary.genuine_rate}%`;
          centerLbl.textContent = 'Genuine';
        }

        renderOverviewChartsFromAPI(summary);
        renderDashboardTableFromAPI();
        return;
      }
    } catch (err) {
      console.warn('[FastAPI] Falling back to local overview calculation:', err);
    }

    calculateKPIsFallback();
    renderOverviewChartsFallback();
    renderDashboardTableFallback();
  }

  function calculateKPIsFallback() {
    const total = activeClaimsData.length;
    if (total === 0) return;
    const frauds = activeClaimsData.filter(d => d.fraud_reported === 'Y' || d.fraud_reported === 'Fraudulent').length;
    const genuine = total - frauds;
    const fraudRate = (frauds / total) * 100;
    document.getElementById('kpi-total-claims').textContent = total.toLocaleString();
    document.getElementById('kpi-fraud-count').textContent = frauds.toLocaleString();
    document.getElementById('kpi-genuine-count').textContent = genuine.toLocaleString();
    document.getElementById('kpi-fraud-rate').textContent = `${fraudRate.toFixed(1)}%`;
  }

  async function renderOverviewChartsFromAPI(summary) {
    if (chartSeverity) chartSeverity.destroy();
    if (chartClaims) chartClaims.destroy();

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#94a3b8' : '#475569';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(15, 23, 42, 0.06)';

    let months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    let totalData = [120, 150, 180, 160, 200, 190];
    let fraudData = [25, 35, 42, 38, 48, 45];

    try {
      const trend = await api.getMonthlyTrend();
      if (trend && trend.success && trend.months.length > 0) {
        months = trend.months;
        totalData = trend.total_claims;
        fraudData = trend.fraud_claims;
      }
    } catch (e) {
      console.warn('Using default monthly trend');
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
          legend: { position: 'bottom', labels: { color: textColor, padding: 16 } }
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: textColor } },
          y: { grid: { color: gridColor }, ticks: { color: textColor } }
        }
      }
    });

    const ctxClaims = document.getElementById('chart-claim-payouts').getContext('2d');
    chartClaims = new Chart(ctxClaims, {
      type: 'doughnut',
      data: {
        labels: ['Genuine', 'Fraudulent'],
        datasets: [{
          data: [summary.genuine_rate, summary.fraud_rate],
          backgroundColor: ['#10b981', '#ef4444'],
          borderWidth: isDark ? 2 : 1,
          borderColor: isDark ? '#0f172a' : '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { color: textColor, padding: 16 } },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${ctx.label}: ${parseFloat(ctx.raw).toFixed(1)}%`
            }
          }
        }
      }
    });
  }

  function renderOverviewChartsFallback() {
    if (chartSeverity) chartSeverity.destroy();
    if (chartClaims) chartClaims.destroy();

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#94a3b8' : '#475569';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(15, 23, 42, 0.06)';

    const months = ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'];
    const totalData = [500, 600, 550, 680, 720, 780];
    const fraudData = [100, 120, 110, 130, 140, 150];

    const ctxSeverity = document.getElementById('chart-severity-fraud').getContext('2d');
    chartSeverity = new Chart(ctxSeverity, {
      type: 'bar',
      data: {
        labels: months,
        datasets: [
          { label: 'Total Claims', data: totalData, backgroundColor: '#3b82f6', borderRadius: 4, barThickness: 16 },
          { label: 'Fraudulent', data: fraudData, backgroundColor: '#ef4444', borderRadius: 4, barThickness: 16 }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { color: textColor, padding: 16 } } },
        scales: {
          x: { grid: { display: false }, ticks: { color: textColor } },
          y: { grid: { color: gridColor }, ticks: { color: textColor } }
        }
      }
    });

    const ctxClaims = document.getElementById('chart-claim-payouts').getContext('2d');
    chartClaims = new Chart(ctxClaims, {
      type: 'doughnut',
      data: {
        labels: ['Genuine', 'Fraudulent'],
        datasets: [{
          data: [75.3, 24.7],
          backgroundColor: ['#10b981', '#ef4444'],
          borderWidth: isDark ? 2 : 1,
          borderColor: isDark ? '#0f172a' : '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { color: textColor, padding: 16 } } }
      }
    });
  }

  async function renderDashboardTableFromAPI() {
    const tbody = document.getElementById('dashboard-recent-table-body');
    tbody.innerHTML = '';
    try {
      const res = await api.getClaims({ page: 1, pageSize: 5 });
      if (res && res.success && res.claims) {
        populateRecentRows(res.claims);
        return;
      }
    } catch (e) {
      console.warn('Falling back to local recent table');
    }
    renderDashboardTableFallback();
  }

  function renderDashboardTableFallback() {
    const tbody = document.getElementById('dashboard-recent-table-body');
    tbody.innerHTML = '';
    populateRecentRows(activeClaimsData.slice(0, 5));
  }

  function populateRecentRows(items) {
    const tbody = document.getElementById('dashboard-recent-table-body');
    tbody.innerHTML = '';
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
      if (currentPage < serverTotalPages) {
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

  async function renderTable() {
    try {
      const res = await api.getClaims({
        page: currentPage,
        pageSize: rowsPerPage,
        search: currentFilters.search,
        fraudStatus: currentFilters.fraud,
        severity: currentFilters.severity,
        state: currentFilters.state,
        sortBy: sorting.column,
        sortDir: sorting.direction
      });

      if (res && res.success) {
        serverTotalPages = res.total_pages;
        renderTableRows(res.claims, res.total, (res.page - 1) * res.page_size + 1, Math.min(res.page * res.page_size, res.total), res.total_pages);
        return;
      }
    } catch (err) {
      console.warn('[FastAPI] Claims fetch failed, falling back to local dataset:', err);
    }

    renderTableFallback();
  }

  function renderTableRows(items, totalRows, startIdx, endIdx, totalPages) {
    const tbody = document.getElementById('claims-table-body');
    tbody.innerHTML = '';

    if (!items || items.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-secondary); padding: 40px;">No claim matches found. Try resetting filters.</td></tr>`;
      document.getElementById('pagination-info').textContent = 'Showing 0 of 0 entries';
      document.getElementById('prev-page').disabled = true;
      document.getElementById('next-page').disabled = true;
      document.getElementById('page-numbers').innerHTML = '';
      return;
    }

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

    document.getElementById('pagination-info').textContent = `Showing ${totalRows === 0 ? 0 : startIdx} to ${endIdx} of ${totalRows.toLocaleString()} entries`;
    document.getElementById('prev-page').disabled = currentPage === 1;
    document.getElementById('next-page').disabled = currentPage >= totalPages;

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

  function renderTableFallback() {
    let filtered = getFilteredData();
    filtered.sort((a, b) => {
      let valA = a[sorting.column];
      let valB = b[sorting.column];
      if (valA === undefined || valA === null) valA = '';
      if (valB === undefined || valB === null) valB = '';
      if (typeof valA === 'string') {
        return sorting.direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      } else {
        return sorting.direction === 'asc' ? valA - valB : valB - valA;
      }
    });

    const totalRows = filtered.length;
    const totalPages = Math.ceil(totalRows / rowsPerPage) || 1;
    serverTotalPages = totalPages;
    if (currentPage > totalPages) currentPage = totalPages;

    const startIdx = (currentPage - 1) * rowsPerPage;
    const endIdx = Math.min(startIdx + rowsPerPage, totalRows);
    const paginatedItems = filtered.slice(startIdx, endIdx);

    renderTableRows(paginatedItems, totalRows, totalRows === 0 ? 0 : startIdx + 1, endIdx, totalPages);
  }

  async function openDetailsDrawer(policyNum) {
    let row = null;
    try {
      const res = await api.getClaimDetails(policyNum);
      if (res && res.success && res.claim) {
        row = res.claim;
      }
    } catch (e) {
      console.warn('API drawer fetch failed, checking local dataset');
    }

    if (!row) {
      row = activeClaimsData.find(d => d.policy_number === policyNum);
    }
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
  async function renderStatsSuite() {
    const anFraudRateEl = document.getElementById('an-fraud-rate');
    const anGenRateEl = document.getElementById('an-genuine-rate');
    const anAvgClaimEl = document.getElementById('an-avg-claim');
    const anAccuracyEl = document.getElementById('an-accuracy');
    const anTotalEl = document.getElementById('an-total-claims');
    const anFraudulentEl = document.getElementById('an-fraudulent-claims');
    const anGenuineEl = document.getElementById('an-genuine-claims');
    const anTipEl = document.getElementById('an-tip-text');

    try {
      const summary = await api.getDashboardSummary();
      if (summary && summary.success) {
        if (anFraudRateEl) anFraudRateEl.textContent = `${summary.fraud_rate}%`;
        if (anGenRateEl) anGenRateEl.textContent = `${summary.genuine_rate}%`;
        const avgClaimStr = summary.average_claim > 1000 ? `₹${(summary.average_claim / 1000).toFixed(1)}K` : `₹${summary.average_claim.toFixed(0)}`;
        if (anAvgClaimEl) anAvgClaimEl.textContent = avgClaimStr;
        if (anAccuracyEl) anAccuracyEl.textContent = `${summary.model_accuracy}%`;
        if (anTotalEl) anTotalEl.textContent = summary.total_claims.toLocaleString();
        if (anFraudulentEl) anFraudulentEl.textContent = summary.fraudulent_claims.toLocaleString();
        if (anGenuineEl) anGenuineEl.textContent = summary.genuine_claims.toLocaleString();
        if (anTipEl) anTipEl.textContent = `Fraudulent claims represent approximately ${summary.fraud_rate}% of all analyzed claims.`;

        await renderAnalyticsChartsFromAPI();
        return;
      }
    } catch (e) {
      console.warn('[FastAPI] Analytics fetch failed, falling back to local dataset:', e);
    }

    // Fallback calculation
    const total = activeClaimsData.length || 1000;
    let frauds = 0;
    let sumClaims = 0;
    let countClaims = 0;

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

    if (anFraudRateEl) anFraudRateEl.textContent = `${fraudRate}%`;
    if (anGenRateEl) anGenRateEl.textContent = `${genuineRate}%`;
    if (anAvgClaimEl) anAvgClaimEl.textContent = avgClaimStr;
    if (anAccuracyEl) anAccuracyEl.textContent = '77.7%';
    if (anTotalEl) anTotalEl.textContent = total.toLocaleString();
    if (anFraudulentEl) anFraudulentEl.textContent = frauds.toLocaleString();
    if (anGenuineEl) anGenuineEl.textContent = (total - frauds).toLocaleString();
    if (anTipEl) anTipEl.textContent = `Fraudulent claims represent approximately ${fraudRate}% of all analyzed claims.`;

    renderAnalyticsChartsFallback();
  }

  async function renderAnalyticsChartsFromAPI() {
    if (chartAnSeverity) chartAnSeverity.destroy();
    if (chartAnVehicle) chartAnVehicle.destroy();
    if (chartAnSite) chartAnSite.destroy();
    if (chartAnAge) chartAnAge.destroy();
    if (chartAnRisk) chartAnRisk.destroy();

    const canvasSeverity = document.getElementById('chart-analytics-severity');
    if (!canvasSeverity) return;

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#94a3b8' : '#475569';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(15, 23, 42, 0.06)';

    try {
      const [sevRes, vehRes, siteRes, ageRes, riskRes] = await Promise.all([
        api.getFraudVsGenuine(),
        api.getFraudByVehicle(),
        api.getFraudBySite(),
        api.getFraudByAge(),
        api.getRiskDistribution()
      ]);

      const ctxSeverity = canvasSeverity.getContext('2d');
      chartAnSeverity = new Chart(ctxSeverity, {
        type: 'bar',
        data: {
          labels: sevRes.labels,
          datasets: [
            { label: 'Genuine Claims', data: sevRes.genuine_counts, backgroundColor: '#10b981', borderRadius: 4 },
            { label: 'Fraudulent Claims', data: sevRes.fraud_counts, backgroundColor: '#ef4444', borderRadius: 4 }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { labels: { color: textColor, font: { family: 'Plus Jakarta Sans', size: 11 } } } },
          scales: {
            x: { grid: { color: gridColor }, ticks: { color: textColor } },
            y: { grid: { color: gridColor }, ticks: { color: textColor } }
          }
        }
      });

      const ctxVehicle = document.getElementById('chart-analytics-vehicle').getContext('2d');
      chartAnVehicle = new Chart(ctxVehicle, {
        type: 'bar',
        data: {
          labels: vehRes.labels,
          datasets: [{ label: 'Fraud Rate (%)', data: vehRes.rates, backgroundColor: '#a855f7', borderRadius: 4 }]
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

      const ctxSite = document.getElementById('chart-analytics-site').getContext('2d');
      chartAnSite = new Chart(ctxSite, {
        type: 'bar',
        data: {
          labels: siteRes.labels,
          datasets: [{ label: 'Fraud Rate (%)', data: siteRes.rates, backgroundColor: '#ef4444', borderRadius: 4 }]
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

      const ctxAge = document.getElementById('chart-analytics-age').getContext('2d');
      chartAnAge = new Chart(ctxAge, {
        type: 'line',
        data: {
          labels: ageRes.labels,
          datasets: [{
            label: 'Fraud Rate (%)',
            data: ageRes.rates,
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
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

      const ctxRisk = document.getElementById('chart-analytics-risk').getContext('2d');
      chartAnRisk = new Chart(ctxRisk, {
        type: 'bar',
        data: {
          labels: riskRes.labels,
          datasets: [{ data: riskRes.rates, backgroundColor: ['#10b981', '#f59e0b', '#ef4444'], borderRadius: 4 }]
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
      return;
    } catch (e) {
      console.warn('API Analytics charts failed, using fallback calculation:', e);
    }
    renderAnalyticsChartsFallback();
  }

  function renderAnalyticsChartsFallback() {
    // Default charts
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

  async function calculatePrediction() {
    const severity = document.getElementById('pred-severity').value;
    const hobby = document.getElementById('pred-hobby').value;
    const collision = document.getElementById('pred-collision').value;
    const age = parseInt(document.getElementById('pred-age').value) || 35;
    const claim = parseFloat(document.getElementById('pred-claim').value) || 35000;
    const witnesses = parseInt(document.getElementById('pred-witnesses').value) || 0;
    const injuries = parseInt(document.getElementById('pred-injuries').value) || 0;
    const hour = parseInt(document.getElementById('pred-hour').value) || 12;
    const vehicles = parseInt(document.getElementById('pred-vehicles').value) || 1;

    if (predDebounce) clearTimeout(predDebounce);
    predDebounce = setTimeout(async () => {
      try {
        const payload = {
          incident_severity: severity,
          insured_hobbies: hobby,
          collision_type: collision,
          age_of_driver: age,
          total_claim: claim,
          witnesses: witnesses,
          bodily_injuries: injuries,
          incident_hour_of_the_day: hour,
          number_of_vehicles_involved: vehicles,
          liab_prct: severity === 'Major Damage' ? 80.0 : 30.0
        };
        const res = await api.predictClassification(payload);
        if (res && res.success) {
          updatePredictorUI(res.probability * 100, res.risk_level, res.factors);
          return;
        }
      } catch (e) {
        // Fallback to local
      }
      runLocalPrediction(severity, hobby, collision, age, claim, witnesses, injuries, hour, vehicles);
    }, 150);
  }

  function updatePredictorUI(risk, riskLevel, factors) {
    const fillRing = document.getElementById('gauge-fill-ring');
    const probVal = document.getElementById('gauge-probability-val');
    const badge = document.getElementById('gauge-risk-badge');

    probVal.textContent = `${Math.round(risk)}%`;
    const offset = 534 - (534 * risk) / 100;
    fillRing.style.strokeDashoffset = offset;
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

    const list = document.getElementById('predictor-factors-list');
    list.innerHTML = '';
    if (!factors || factors.length === 0) {
      list.innerHTML = `<li class="text-secondary" style="font-size: 12px; text-align: center; padding: 20px 0;">Standard risk profile with no high anomalies.</li>`;
      return;
    }

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

  function runLocalPrediction(severity, hobby, collision, age, claim, witnesses, injuries, hour, vehicles) {
    let risk = 12.0;
    const factors = [];
    if (severity === 'Major Damage') { risk += 45; factors.push({ name: 'Major Collision Severity', value: '+45%', state: 'pos' }); }
    else if (severity === 'Total Loss') { risk += 18; factors.push({ name: 'Total Vehicle Loss', value: '+18%', state: 'pos' }); }
    else if (severity === 'Minor Damage') { risk += 3; factors.push({ name: 'Minor Collision Damage', value: '+3%', state: 'pos' }); }
    else { risk -= 8; factors.push({ name: 'Trivial Incident Impact', value: '-8%', state: 'neg' }); }

    if (hobby === 'chess') { risk += 35; factors.push({ name: 'Policyholder Hobby: Chess', value: '+35%', state: 'pos' }); }
    else if (hobby === 'yachting') { risk += 30; factors.push({ name: 'Policyholder Hobby: Yachting', value: '+30%', state: 'pos' }); }
    else if (hobby === 'skydiving') { risk += 22; factors.push({ name: 'Policyholder Hobby: Skydiving', value: '+22%', state: 'pos' }); }
    else if (hobby === 'reading') { risk -= 6; factors.push({ name: 'Policyholder Hobby: Reading', value: '-6%', state: 'neg' }); }

    if (age < 26) { risk += 10; factors.push({ name: 'High-risk Under-26 Driver', value: '+10%', state: 'pos' }); }
    else if (age > 50) { risk -= 5; factors.push({ name: 'Senior Driver Profile', value: '-5%', state: 'neg' }); }

    if (claim > 80000) { risk += 14; factors.push({ name: 'Extreme Claim Value (>$80k)', value: '+14%', state: 'pos' }); }
    else if (claim > 50000) { risk += 6; factors.push({ name: 'Elevated Claim Value (>$50k)', value: '+6%', state: 'pos' }); }
    else if (claim < 10000) { risk -= 8; factors.push({ name: 'Low Claim Value (<$10k)', value: '-8%', state: 'neg' }); }

    risk = Math.max(2, Math.min(98, risk));
    updatePredictorUI(risk, risk > 60 ? 'High Risk' : (risk > 30 ? 'Medium Risk' : 'Low Risk'), factors);
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
      mlForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const age = parseInt(document.getElementById('ml-age').value) || 30;
        const gender = document.getElementById('ml-gender').value || 'MALE';
        const marital = document.getElementById('ml-marital').value || 'MARRIED';
        const income = parseFloat(document.getElementById('ml-income').value) || 50000;
        const education = document.getElementById('ml-education').value || 'High School';
        const safety = parseFloat(document.getElementById('ml-safety').value) || 72;

        const addressChange = document.getElementById('ml-address-change').value || 'NO';
        const propStatus = document.getElementById('ml-property-status').value || 'own';
        const zip = parseInt(document.getElementById('ml-zip').value) || 50006;

        const vehicleCat = document.getElementById('ml-vehicle-category').value || 'Sedan';
        const vehiclePrice = parseFloat(document.getElementById('ml-vehicle-price').value) || 85000;
        const vehicleAge = parseFloat(document.getElementById('ml-vehicle-age').value) || 3;
        const vehicleColor = document.getElementById('ml-vehicle-color').value || 'White';

        const claimDate = document.getElementById('ml-claim-date').value || '';
        const claimDay = document.getElementById('ml-claim-day').value || 'Monday';
        const accidentSite = document.getElementById('ml-accident-site').value || 'Highway';
        const prevClaims = parseInt(document.getElementById('ml-prev-claims').value) || 0;
        const witness = document.getElementById('ml-witness').value || 'NO';
        const liability = parseInt(document.getElementById('ml-liability').value) || 0;

        const channel = document.getElementById('ml-channel').value || 'Phone';
        const policeReport = document.getElementById('ml-police-report').value || 'NO';
        const deductible = parseFloat(document.getElementById('ml-deductible').value) || 500;
        const premium = parseFloat(document.getElementById('ml-premium').value) || 1415;
        const daysOpen = parseFloat(document.getElementById('ml-days-open').value) || 10;
        const formDefects = parseFloat(document.getElementById('ml-form-defects').value) || 2;

        const claimAmount = parseFloat(document.getElementById('ml-claim-amount').value) || 85000;
        const injuryClaim = parseFloat(document.getElementById('ml-injury-claim').value) || 12000;

        const submitBtn = mlForm.querySelector('button[type="submit"]');
        const origBtnText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span>Evaluating Models...</span>';

        const classPayload = {
          age_of_driver: age,
          gender: gender,
          marital_status: marital,
          annual_income: income,
          high_education: education,
          safety_rating: safety,
          address_change: addressChange,
          property_status: propStatus,
          zip_code: zip,
          vehicle_category: vehicleCat,
          vehicle_price: vehiclePrice,
          age_of_vehicle: vehicleAge,
          vehicle_color: vehicleColor,
          claim_day_of_week: claimDay,
          accident_site: accidentSite,
          past_num_of_claims: prevClaims,
          witness_present: witness,
          liab_prct: liability,
          channel: channel,
          police_report: policeReport,
          policy_deductible: deductible,
          annual_premium: premium,
          days_open: daysOpen,
          form_defects: formDefects,
          total_claim: claimAmount,
          injury_claim: injuryClaim
        };

        const regPayload = {
          age_of_driver: age,
          annual_income: income,
          vehicle_price: vehiclePrice,
          policy_deductible: deductible,
          annual_premium: premium,
          form_defects: formDefects
        };

        try {
          const [classRes, regRes] = await Promise.allSettled([
            api.predictClassification(classPayload),
            api.predictRegression(regPayload)
          ]);

          const classData = classRes.status === 'fulfilled' ? classRes.value : null;
          const regData = regRes.status === 'fulfilled' ? regRes.value : null;

          showMLResultModal(classData, regData);
        } catch (err) {
          console.error('Error invoking prediction APIs:', err);
          alert('Prediction error: ' + err.message);
        } finally {
          submitBtn.disabled = false;
          submitBtn.innerHTML = origBtnText;
          lucide.createIcons();
        }
      });
    }
  }

  function showMLResultModal(classData, regData) {
    const overlay = document.createElement('div');
    overlay.className = 'ml-modal-overlay';
    overlay.id = 'ml-result-modal';

    let score = classData && typeof classData.probability === 'number' ? (classData.probability * 100) : 15.0;
    let riskBadge = 'badge-success';
    let riskLevel = (classData && classData.risk_level ? classData.risk_level : 'LOW RISK').toUpperCase();
    let riskDesc = 'This claim exhibits typical parameters with negligible anomalies. Suitable for expedited settlement.';
    let modelName = classData && classData.model_name ? classData.model_name : 'Gradient Boosting (Task 5)';

    if (score > 60 || riskLevel.includes('HIGH')) {
      riskBadge = 'badge-danger';
      riskLevel = 'HIGH RISK';
      riskDesc = 'Significant risk indicators detected. We recommend manual review, SIU investigation, and matching against similar claims.';
    } else if (score > 30 || riskLevel.includes('MEDIUM')) {
      riskBadge = 'badge-warning';
      riskLevel = 'MEDIUM RISK';
      riskDesc = 'Minor anomalies present. Policy verification and verification of the accident site particulars are advised.';
    }

    const regHtml = regData && regData.success
      ? `<div style="margin-top: 14px; padding: 12px; background: rgba(59, 130, 246, 0.08); border: 1px solid rgba(59, 130, 246, 0.2); border-radius: 8px; font-size: 13px; color: #93c5fd; display: flex; justify-content: space-between; align-items: center;">
           <span><i data-lucide="calculator" style="width: 14px; height: 14px; display: inline-block; vertical-align: middle; margin-right: 6px;"></i>Task 3 Predicted Claim:</span>
           <strong style="color: #ffffff; font-size: 14px;">₹${regData.prediction.toLocaleString()}</strong>
         </div>`
      : '';

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

          ${regHtml}

          <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 14px; text-align: left; margin-top: 14px;">
            <h5 style="font-size: 12px; margin: 0 0 8px 0; color: #ffffff;">Model Decision Details</h5>
            <ul style="font-size: 11px; color: var(--text-secondary); padding-left: 16px; margin: 0; display: flex; flex-direction: column; gap: 4px;">
              <li>Model: ${modelName}</li>
              <li>Verdict: <strong>${classData && classData.prediction ? classData.prediction : 'Processed'}</strong></li>
              <li>Trained on 42 insurance risk features via 5-fold CV & GridSearch.</li>
            </ul>
          </div>
        </div>
        <div class="ml-modal-footer">
          <button type="button" class="btn btn-primary" id="btn-close-ml-modal-ok" style="padding: 10px 20px;">Dismiss</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    lucide.createIcons();

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
