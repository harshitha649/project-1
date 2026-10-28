/**
 * Agricultural Equipment Rental and Idle-Time Exchange ("AgriShare Exchange")
 * Vanilla JavaScript Frontend Application Engine
 */

const app = {
  // State
  currentUser: {
    id: 'u_renter_joe',
    role: 'renter',
    full_name: 'Joe Higgins',
    farm_name: 'Red Cedar Organic Acres',
    county: 'Linn'
  },
  currentView: 'landing',
  listings: [],
  bookings: [],
  ledgerData: [],
  damages: [],
  auditLogs: [],
  metrics: {},
  activeModalListing: null,
  filters: {
    category: 'All',
    county: 'All',
    hireType: 'All',
    maxPrice: 2000,
    search: ''
  },

  // ---------------------------------------------------------------------------
  // INITIALIZATION
  // ---------------------------------------------------------------------------
  async init() {
    console.log('[AgriShare] Initializing application...');
    this.setupEventListeners();
    await this.fetchInitialUser();
    await this.fetchMetrics();
    await this.fetchListings();
    this.navigate('landing');
  },

  setupEventListeners() {
    // Persona Switcher
    const personaSelect = document.getElementById('persona-select');
    if (personaSelect) {
      personaSelect.addEventListener('change', (e) => this.handlePersonaChange(e.target.value));
    }

    // Catalog Filters
    const searchInput = document.getElementById('filter-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.filters.search = e.target.value;
        this.renderCatalog();
      });
    }

    const countySelect = document.getElementById('filter-county');
    if (countySelect) {
      countySelect.addEventListener('change', (e) => {
        this.filters.county = e.target.value;
        this.renderCatalog();
      });
    }

    const hireSelect = document.getElementById('filter-hire-type');
    if (hireSelect) {
      hireSelect.addEventListener('change', (e) => {
        this.filters.hireType = e.target.value;
        this.renderCatalog();
      });
    }

    const priceSlider = document.getElementById('filter-max-price');
    const priceVal = document.getElementById('price-val');
    if (priceSlider && priceVal) {
      priceSlider.addEventListener('input', (e) => {
        this.filters.maxPrice = e.target.value;
        priceVal.textContent = `$${e.target.value}`;
        this.renderCatalog();
      });
    }
  },

  // ---------------------------------------------------------------------------
  // API CLIENT HELPER
  // ---------------------------------------------------------------------------
  async api(endpoint, method = 'GET', body = null) {
    const headers = {
      'Content-Type': 'application/json',
      'x-user-id': this.currentUser?.id || 'visitor'
    };

    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);

    try {
      const res = await fetch(endpoint, options);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Request failed with status ${res.status}`);
      }
      return data;
    } catch (err) {
      console.error(`API Error [${method} ${endpoint}]:`, err);
      throw err;
    }
  },

  // ---------------------------------------------------------------------------
  // AUTH & PERSONA MANAGEMENT
  // ---------------------------------------------------------------------------
  async fetchInitialUser() {
    try {
      const res = await this.api('/api/auth/me');
      if (res.user) {
        this.currentUser = res.user;
        this.updatePersonaUI();
      }
    } catch (e) {
      console.warn('Could not fetch initial user, using default persona.');
    }
  },

  async handlePersonaChange(userId) {
    try {
      const res = await this.api('/api/auth/switch-persona', 'POST', { userId });
      this.currentUser = res.user;
      this.updatePersonaUI();
      this.showToast(`Switched persona to ${this.currentUser.full_name} (${this.currentUser.role.toUpperCase()})`, 'info');

      // Refresh current active view
      this.refreshCurrentView();
    } catch (e) {
      this.showToast(e.message, 'error');
    }
  },

  updatePersonaUI() {
    const nameEl = document.getElementById('persona-name');
    const roleBadge = document.getElementById('persona-role-badge');
    const farmEl = document.getElementById('persona-farm');
    const selectEl = document.getElementById('persona-select');

    if (nameEl) nameEl.textContent = this.currentUser.full_name || 'Guest Visitor';
    if (roleBadge) {
      const role = (this.currentUser.role || 'visitor').toUpperCase();
      roleBadge.textContent = role;
      roleBadge.className = `persona-badge badge-${this.currentUser.role}`;
    }
    if (farmEl) {
      farmEl.textContent = this.currentUser.farm_name
        ? `${this.currentUser.farm_name} (${this.currentUser.county} Co.)`
        : 'Public Guest / Browsing Only';
    }
    if (selectEl && this.currentUser.id) {
      selectEl.value = this.currentUser.id;
    }
  },

  // ---------------------------------------------------------------------------
  // NAVIGATION & VIEW SWITCHER
  // ---------------------------------------------------------------------------
  navigate(viewName) {
    this.currentView = viewName;

    // Update nav links active class
    document.querySelectorAll('.nav-link').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === viewName);
    });

    // Update view sections visibility
    document.querySelectorAll('.view-section').forEach(sec => {
      sec.classList.remove('active');
    });

    const targetSec = document.getElementById(`view-${viewName}`);
    if (targetSec) {
      targetSec.classList.add('active');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    this.refreshCurrentView();
  },

  async refreshCurrentView() {
    switch (this.currentView) {
      case 'landing':
        await this.fetchMetrics();
        await this.fetchListings();
        this.renderFeaturedLanding();
        break;
      case 'catalog':
        await this.fetchListings();
        this.renderCatalog();
        break;
      case 'renter':
        await this.fetchBookings();
        this.renderRenterHub();
        break;
      case 'owner':
        await this.fetchListings();
        await this.fetchBookings();
        this.renderOwnerHub();
        break;
      case 'operator':
        await this.fetchBookings();
        this.renderOperatorStation();
        break;
      case 'ledger':
        await this.fetchLedger();
        this.renderDepositLedger();
        break;
      case 'admin':
        await this.fetchDamages();
        await this.fetchAuditLogs();
        this.renderAdminDashboard();
        break;
    }
  },

  // ---------------------------------------------------------------------------
  // DATA FETCHERS
  // ---------------------------------------------------------------------------
  async fetchMetrics() {
    try {
      const res = await this.api('/api/metrics');
      if (res.data) {
        this.metrics = res.data;
        const totalListings = document.getElementById('metric-total-listings');
        const utilization = document.getElementById('metric-utilization');
        const escrow = document.getElementById('metric-escrow');
        const hoursShared = document.getElementById('metric-hours-shared');

        if (totalListings) totalListings.textContent = this.metrics.totalListings;
        if (utilization) utilization.textContent = `${this.metrics.equipmentUtilizationRate}%`;
        if (escrow) escrow.textContent = `$${this.metrics.escrowHeld.toLocaleString()}`;
        if (hoursShared) hoursShared.textContent = (this.metrics.totalBookings * 48).toLocaleString();
      }
    } catch (e) {
      console.warn('Metrics fetch error:', e.message);
    }
  },

  async fetchListings() {
    try {
      const res = await this.api('/api/listings');
      this.listings = res.data || [];
    } catch (e) {
      this.showToast('Could not load equipment listings: ' + e.message, 'error');
    }
  },

  async fetchBookings() {
    try {
      const res = await this.api('/api/bookings');
      this.bookings = res.data || [];
    } catch (e) {
      this.showToast('Could not load bookings: ' + e.message, 'error');
    }
  },

  async fetchLedger() {
    try {
      const res = await this.api('/api/ledger');
      this.ledgerData = res.data || [];
      const summary = res.summary || {};

      const activeEscrow = document.getElementById('ledger-active-escrow');
      const totalHolds = document.getElementById('ledger-total-holds');
      const totalDeductions = document.getElementById('ledger-total-deductions');
      const totalRefunded = document.getElementById('ledger-total-refunded');

      if (activeEscrow) activeEscrow.textContent = `$${(summary.activeEscrowBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
      if (totalHolds) totalHolds.textContent = `$${(summary.totalHolds || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
      if (totalDeductions) totalDeductions.textContent = `$${(summary.totalDeductions || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
      if (totalRefunded) totalRefunded.textContent = `$${(summary.totalReleased || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
    } catch (e) {
      this.showToast('Could not load deposit ledger: ' + e.message, 'error');
    }
  },

  async fetchDamages() {
    try {
      const res = await this.api('/api/damages');
      this.damages = res.data || [];
    } catch (e) {
      this.showToast('Could not load damage reports: ' + e.message, 'error');
    }
  },

  async fetchAuditLogs() {
    try {
      const res = await this.api('/api/audit-logs?limit=50');
      this.auditLogs = res.data || [];
    } catch (e) {
      console.warn('Audit logs fetch error:', e.message);
    }
  },

  // ---------------------------------------------------------------------------
  // VIEW RENDERERS
  // ---------------------------------------------------------------------------
  renderFeaturedLanding() {
    const grid = document.getElementById('landing-featured-grid');
    if (!grid) return;
    const featured = this.listings.slice(0, 3);
    grid.innerHTML = featured.map(l => this.buildEquipmentCardHtml(l)).join('');
  },

  renderCatalog() {
    const grid = document.getElementById('catalog-equipment-grid');
    if (!grid) return;

    let filtered = [...this.listings];

    if (this.filters.category && this.filters.category !== 'All') {
      filtered = filtered.filter(l => l.category.toLowerCase() === this.filters.category.toLowerCase());
    }

    if (this.filters.county && this.filters.county !== 'All') {
      filtered = filtered.filter(l => l.county.toLowerCase() === this.filters.county.toLowerCase());
    }

    if (this.filters.hireType && this.filters.hireType !== 'All') {
      filtered = filtered.filter(l => l.operator_option.includes(this.filters.hireType) || l.operator_option.includes('Either'));
    }

    if (this.filters.maxPrice) {
      filtered = filtered.filter(l => Number(l.daily_rate) <= Number(this.filters.maxPrice));
    }

    if (this.filters.search) {
      const q = this.filters.search.toLowerCase();
      filtered = filtered.filter(l =>
        l.title.toLowerCase().includes(q) ||
        l.make.toLowerCase().includes(q) ||
        l.model.toLowerCase().includes(q) ||
        l.description.toLowerCase().includes(q)
      );
    }

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <div class="empty-state-icon">🚜</div>
          <h4>No agricultural equipment found</h4>
          <p>Try broadening your county filter, price threshold, or search keyword.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = filtered.map(l => this.buildEquipmentCardHtml(l)).join('');
  },

  buildEquipmentCardHtml(l) {
    const discountedRate = l.idle_discount_pct > 0
      ? (Number(l.daily_rate) * (1 - l.idle_discount_pct / 100)).toFixed(0)
      : l.daily_rate;

    return `
      <div class="equipment-card">
        <div class="card-img-wrap">
          <img src="${l.image_url}" alt="${l.title}" class="card-img" onerror="this.src='https://images.unsplash.com/photo-1592982537447-7440770cbfc9?auto=format&fit=crop&w=1200&q=80'">
          ${l.idle_discount_pct > 0 ? `<div class="card-idle-badge">🌾 ${l.idle_discount_pct}% Idle Special</div>` : ''}
          <div class="card-category-badge">${l.category}</div>
        </div>
        <div class="card-body">
          <h4 class="card-title">${l.title}</h4>
          <div class="card-location">
            <span>📍 ${l.county} County, IA</span> &bull; 
            <span>${l.service_radius_miles} mi radius</span> &bull;
            <span>${l.owner?.farm_name || 'Family Farm'}</span>
          </div>

          <div class="card-specs-row">
            ${l.horsepower ? `<span>⚡ ${l.horsepower} HP</span>` : ''}
            <span>⏱️ ${l.operating_hours || 0} hrs</span>
            <span>🛡️ $${Number(l.security_deposit).toLocaleString()} Escrow</span>
          </div>

          <p class="card-desc">${l.description}</p>

          <div class="card-footer">
            <div class="card-rates">
              <span class="rate-primary">
                $${discountedRate}
                <span style="font-size: 0.8rem; font-weight: 500; color: var(--color-soil-500);">/day</span>
              </span>
              ${l.idle_discount_pct > 0 ? `<span class="rate-sub" style="text-decoration: line-through;">Regular $${l.daily_rate}/day</span>` : `<span class="rate-sub">Min ${l.min_rental_days || 1} day(s)</span>`}
            </div>
            <button class="card-btn" onclick="app.openBookingModal('${l.id}')">
              Rent / Reserve &rarr;
            </button>
          </div>
        </div>
      </div>
    `;
  },

  setCategoryFilter(cat, btn) {
    this.filters.category = cat;
    document.querySelectorAll('.category-pill').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    this.renderCatalog();
  },

  resetFilters() {
    this.filters = { category: 'All', county: 'All', hireType: 'All', maxPrice: 2000, search: '' };
    const searchInput = document.getElementById('filter-search');
    const countySelect = document.getElementById('filter-county');
    const hireSelect = document.getElementById('filter-hire-type');
    const priceSlider = document.getElementById('filter-max-price');
    const priceVal = document.getElementById('price-val');

    if (searchInput) searchInput.value = '';
    if (countySelect) countySelect.value = 'All';
    if (hireSelect) hireSelect.value = 'All';
    if (priceSlider) priceSlider.value = 2000;
    if (priceVal) priceVal.textContent = '$2000';

    document.querySelectorAll('.category-pill').forEach((b, i) => b.classList.toggle('active', i === 0));
    this.renderCatalog();
  },

  // ---------------------------------------------------------------------------
  // RENTER HUB RENDERER
  // ---------------------------------------------------------------------------
  renderRenterHub() {
    const tbody = document.getElementById('renter-bookings-tbody');
    if (!tbody) return;

    // Filter to current user bookings or show all demo if admin/operator
    let userBookings = this.bookings.filter(b => b.renter_id === this.currentUser.id);
    if (this.currentUser.role === 'admin') userBookings = this.bookings;

    if (userBookings.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="empty-state">
            <div class="empty-state-icon">📋</div>
            <h4>No active bookings for ${this.currentUser.full_name}</h4>
            <p>Visit the Machinery Catalog to request machinery for your upcoming field operations.</p>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = userBookings.map(b => {
      const listing = b.listing || { title: 'Farm Equipment', county: 'Linn' };
      return `
        <tr>
          <td><strong style="font-family: var(--font-mono); color: var(--color-olive-900);">${b.booking_ref}</strong></td>
          <td>
            <strong>${listing.title}</strong>
            <div style="font-size: 0.78rem; color: var(--color-soil-500);">${b.hire_type} &bull; ${b.delivery_mode}</div>
          </td>
          <td>
            <div style="font-family: var(--font-mono); font-size: 0.82rem;">${b.start_date} &rarr; ${b.end_date}</div>
            <div style="font-size: 0.75rem; color: var(--color-soil-500);">${b.total_days} days</div>
          </td>
          <td>
            <strong>$${Number(b.rental_total).toFixed(2)}</strong>
            <div style="font-size: 0.75rem; color: var(--color-soil-500);">$${Number(b.daily_rate_applied).toFixed(2)}/day</div>
          </td>
          <td>
            <span class="badge badge-hold">$${Number(b.security_deposit_held).toFixed(2)}</span>
          </td>
          <td>
            <span class="badge badge-${b.status}">${b.status.replace('_', ' ')}</span>
          </td>
          <td>
            <div style="display: flex; gap: 6px; flex-wrap: wrap;">
              ${b.status === 'in_field' ? `
                <button class="btn-action-sm btn-action-red" onclick="app.openDamageModal('${b.id}', '${b.listing_id}')">
                  ⚠️ Report Incident
                </button>
              ` : ''}
              ${b.status === 'pending' ? `
                <button class="btn-action-sm btn-action-neutral" onclick="app.cancelBooking('${b.id}')">
                  Cancel
                </button>
              ` : ''}
              <button class="btn-action-sm btn-action-neutral" onclick="app.viewBookingLedger('${b.id}')">
                Ledger
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  },

  // ---------------------------------------------------------------------------
  // OWNER HUB RENDERER
  // ---------------------------------------------------------------------------
  renderOwnerHub() {
    const approvalsTbody = document.getElementById('owner-approvals-tbody');
    const fleetTbody = document.getElementById('owner-fleet-tbody');

    // Pending Requests for this owner
    const pendingBookings = this.bookings.filter(b =>
      b.status === 'pending' &&
      (this.currentUser.role === 'admin' || b.listing?.owner_id === this.currentUser.id)
    );

    if (approvalsTbody) {
      if (pendingBookings.length === 0) {
        approvalsTbody.innerHTML = `
          <tr>
            <td colspan="8" style="text-align: center; color: var(--color-soil-500); padding: 24px;">
              No pending booking requests requiring approval at this time.
            </td>
          </tr>
        `;
      } else {
        approvalsTbody.innerHTML = pendingBookings.map(b => `
          <tr>
            <td><strong style="font-family: var(--font-mono);">${b.booking_ref}</strong></td>
            <td>
              <strong>${b.renter?.full_name || 'Renter'}</strong>
              <div style="font-size: 0.78rem; color: var(--color-soil-500);">${b.renter?.farm_name || 'Farm'} (${b.renter?.county} Co.)</div>
            </td>
            <td>${b.listing?.title}</td>
            <td style="font-family: var(--font-mono); font-size: 0.82rem;">${b.start_date} to ${b.end_date} (${b.total_days} d)</td>
            <td style="max-width: 200px; font-size: 0.8rem; color: var(--color-soil-700);">${b.crop_task_description}</td>
            <td><strong>$${Number(b.grand_total).toFixed(2)}</strong></td>
            <td><span class="badge badge-pending">PENDING</span></td>
            <td>
              <div style="display: flex; gap: 6px;">
                <button class="btn-action-sm btn-action-green" onclick="app.handleOwnerDecision('${b.id}', 'approved')">Approve</button>
                <button class="btn-action-sm btn-action-red" onclick="app.handleOwnerDecision('${b.id}', 'declined')">Decline</button>
              </div>
            </td>
          </tr>
        `).join('');
      }
    }

    // Owner's Registered Fleet
    let ownerListings = this.listings.filter(l => l.owner_id === this.currentUser.id);
    if (this.currentUser.role === 'admin') ownerListings = this.listings;

    if (fleetTbody) {
      if (ownerListings.length === 0) {
        fleetTbody.innerHTML = `
          <tr>
            <td colspan="8" class="empty-state">
              <h4>No registered equipment in your fleet</h4>
              <p>Click "+ Add Machinery to Fleet" to list your idle tractors or combines.</p>
            </td>
          </tr>
        `;
      } else {
        fleetTbody.innerHTML = ownerListings.map(l => `
          <tr>
            <td>
              <strong>${l.title}</strong>
              <div style="font-size: 0.78rem; color: var(--color-soil-500);">${l.make} &bull; ${l.model} (${l.year})</div>
            </td>
            <td>${l.category}</td>
            <td style="font-family: var(--font-mono);">${l.operating_hours || 0} hrs</td>
            <td><strong>$${Number(l.daily_rate).toFixed(2)}</strong></td>
            <td><span class="badge badge-release">${l.idle_discount_pct}% OFF</span></td>
            <td>${l.county} County</td>
            <td><span class="badge badge-approved">Active</span></td>
            <td>
              <button class="btn-action-sm btn-action-neutral" onclick="app.showToast('Listing settings saved.', 'info')">Edit Settings</button>
            </td>
          </tr>
        `).join('');
      }
    }
  },

  async handleOwnerDecision(bookingId, decision) {
    try {
      await this.api(`/api/bookings/${bookingId}/status`, 'PATCH', {
        status: decision,
        notes: decision === 'approved' ? 'Owner approved machinery for field operation.' : 'Owner declined request.'
      });
      this.showToast(`Booking ${decision === 'approved' ? 'approved' : 'declined'}.`, 'success');
      this.refreshCurrentView();
    } catch (e) {
      this.showToast('Error updating booking: ' + e.message, 'error');
    }
  },

  async cancelBooking(bookingId) {
    if (!confirm('Are you sure you want to cancel this booking request? Escrow holds will be released.')) return;
    try {
      await this.api(`/api/bookings/${bookingId}/status`, 'PATCH', { status: 'cancelled' });
      this.showToast('Booking cancelled and escrow hold released.', 'info');
      this.refreshCurrentView();
    } catch (e) {
      this.showToast(e.message, 'error');
    }
  },

  // ---------------------------------------------------------------------------
  // OPERATOR STATION RENDERER
  // ---------------------------------------------------------------------------
  renderOperatorStation() {
    const tbody = document.getElementById('operator-bookings-tbody');
    if (!tbody) return;

    if (this.bookings.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="empty-state">No equipment handovers currently scheduled.</td></tr>`;
      return;
    }

    tbody.innerHTML = this.bookings.map(b => {
      const hasPre = b.checklists?.some(c => c.checklist_type === 'pre_rental');
      const hasPost = b.checklists?.some(c => c.checklist_type === 'post_return');

      return `
        <tr>
          <td><strong style="font-family: var(--font-mono);">${b.booking_ref}</strong></td>
          <td>${b.listing?.title}</td>
          <td>${b.renter?.full_name} (${b.renter?.farm_name})</td>
          <td style="font-family: var(--font-mono); font-size: 0.82rem;">${b.start_date} to ${b.end_date}</td>
          <td><span class="badge badge-${b.status}">${b.status.replace('_', ' ')}</span></td>
          <td>
            ${hasPre ? `
              <span class="badge badge-approved">✓ Pre-Rental Done</span>
            ` : (b.status === 'approved' || b.status === 'confirmed' ? `
              <button class="btn-action-sm btn-action-blue" onclick="app.openHandoverModal('${b.id}', 'pre_rental')">
                📋 Pre-Rental Checkout
              </button>
            ` : `<span style="font-size: 0.78rem; color: var(--color-soil-500);">Awaiting Approval</span>`)}
          </td>
          <td>
            ${hasPost ? `
              <span class="badge badge-completed">✓ Returned & Inspected</span>
            ` : (b.status === 'in_field' ? `
              <button class="btn-action-sm btn-action-green" onclick="app.openHandoverModal('${b.id}', 'post_return')">
                🔄 Return Inspection
              </button>
            ` : `<span style="font-size: 0.78rem; color: var(--color-soil-500);">Not In Field</span>`)}
          </td>
          <td>
            <button class="btn-action-sm btn-action-red" onclick="app.openDamageModal('${b.id}', '${b.listing_id}')">
              ⚠️ Log Damage
            </button>
          </td>
        </tr>
      `;
    }).join('');
  },

  // ---------------------------------------------------------------------------
  // DEPOSIT ESCROW LEDGER RENDERER
  // ---------------------------------------------------------------------------
  renderDepositLedger() {
    const tbody = document.getElementById('ledger-tbody');
    if (!tbody) return;

    if (this.ledgerData.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="empty-state">No escrow ledger transactions recorded.</td></tr>`;
      return;
    }

    tbody.innerHTML = this.ledgerData.map(l => {
      let badgeClass = 'badge-hold';
      if (['RELEASE_FULL', 'RELEASE_PARTIAL'].includes(l.entry_type)) badgeClass = 'badge-release';
      if (['DAMAGE_DEDUCTION', 'FUEL_PENALTY', 'EXCESS_HOURS_FEE', 'FORFEITURE'].includes(l.entry_type)) badgeClass = 'badge-deduction';

      return `
        <tr>
          <td><strong style="font-family: var(--font-mono); color: var(--color-soil-700);">${l.id}</strong></td>
          <td><strong style="font-family: var(--font-mono);">${l.booking?.booking_ref || 'N/A'}</strong></td>
          <td>${l.user?.full_name || 'Renter'}</td>
          <td><span class="badge ${badgeClass}">${l.entry_type.replace('_', ' ')}</span></td>
          <td><strong style="font-family: var(--font-mono); font-size: 0.95rem;">$${Number(l.amount).toFixed(2)}</strong></td>
          <td><span style="font-family: var(--font-mono); color: var(--color-olive-900);">$${Number(l.balance_after).toFixed(2)}</span></td>
          <td style="font-size: 0.82rem; color: var(--color-soil-700); max-width: 280px;">${l.description}</td>
          <td style="font-size: 0.78rem; color: var(--color-soil-500);">${new Date(l.created_at).toLocaleString()}</td>
        </tr>
      `;
    }).join('');
  },

  viewBookingLedger(bookingId) {
    this.navigate('ledger');
  },

  // ---------------------------------------------------------------------------
  // ADMIN & AUDIT TRAIL RENDERER
  // ---------------------------------------------------------------------------
  renderAdminDashboard() {
    const damagesTbody = document.getElementById('admin-damages-tbody');
    const auditTbody = document.getElementById('admin-audit-tbody');

    if (damagesTbody) {
      if (this.damages.length === 0) {
        damagesTbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: var(--color-soil-500); padding: 20px;">No damage reports on file.</td></tr>`;
      } else {
        damagesTbody.innerHTML = this.damages.map(d => `
          <tr>
            <td><strong style="font-family: var(--font-mono);">${d.id}</strong></td>
            <td>${d.booking?.booking_ref || 'N/A'}</td>
            <td>${d.listing?.title}</td>
            <td><span class="badge badge-damage">${d.severity}</span></td>
            <td style="max-width: 240px; font-size: 0.82rem;">${d.incident_description}</td>
            <td><strong>$${Number(d.estimated_cost).toFixed(2)}</strong></td>
            <td><strong style="color: var(--color-rust-600);">$${Number(d.deducted_from_deposit).toFixed(2)}</strong></td>
            <td><span class="badge badge-${d.status}">${d.status}</span></td>
            <td>
              ${d.status !== 'resolved' ? `
                <button class="btn-action-sm btn-action-blue" onclick="app.openResolveDamageModal('${d.id}')">
                  Arbitrate & Settle
                </button>
              ` : `<span style="font-size: 0.78rem; color: var(--color-olive-700);">Resolved</span>`}
            </td>
          </tr>
        `).join('');
      }
    }

    if (auditTbody) {
      if (this.auditLogs.length === 0) {
        auditTbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--color-soil-500); padding: 20px;">No system events recorded.</td></tr>`;
      } else {
        auditTbody.innerHTML = this.auditLogs.map(a => `
          <tr>
            <td style="font-family: var(--font-mono); font-size: 0.78rem;">${a.id}</td>
            <td><strong style="font-size: 0.8rem; color: var(--color-olive-800);">${a.action}</strong></td>
            <td><span class="badge badge-neutral">${a.entity_type}</span></td>
            <td style="font-family: var(--font-mono); font-size: 0.78rem;">${a.entity_id}</td>
            <td style="font-size: 0.8rem;">${a.user_id || 'System'}</td>
            <td style="font-size: 0.82rem; color: var(--color-soil-700); max-width: 320px;">${a.details}</td>
            <td style="font-size: 0.75rem; color: var(--color-soil-500);">${new Date(a.created_at).toLocaleString()}</td>
          </tr>
        `).join('');
      }
    }
  },

  // ---------------------------------------------------------------------------
  // MODAL HANDLERS & WORKFLOWS
  // ---------------------------------------------------------------------------
  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('active');
  },

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
  },

  // BOOKING MODAL
  openBookingModal(listingId) {
    const listing = this.listings.find(l => l.id === listingId);
    if (!listing) return;
    this.activeModalListing = listing;

    document.getElementById('book-listing-id').value = listing.id;
    document.getElementById('booking-modal-title').textContent = `Book ${listing.title}`;

    const summaryEl = document.getElementById('booking-equipment-summary');
    if (summaryEl) {
      summaryEl.innerHTML = `
        <div style="font-weight: 700; color: var(--color-olive-900);">${listing.title} (${listing.year})</div>
        <div style="font-size: 0.82rem; color: var(--color-soil-500); margin-top: 2px;">
          Owner: ${listing.owner?.farm_name || 'Vance Family Farms'} &bull; Base: ${listing.county} County &bull; Daily Rate: $${listing.daily_rate}
          ${listing.idle_discount_pct > 0 ? ` &bull; <strong style="color: var(--color-rust-600);">${listing.idle_discount_pct}% Idle Special Active</strong>` : ''}
        </div>
      `;
    }

    // Default dates: tomorrow to +3 days
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const returnDate = new Date();
    returnDate.setDate(returnDate.getDate() + 4);

    const startInput = document.getElementById('book-start-date');
    const endInput = document.getElementById('book-end-date');
    if (startInput) startInput.value = tomorrow.toISOString().split('T')[0];
    if (endInput) endInput.value = returnDate.toISOString().split('T')[0];

    this.calculateBookingPricing();
    this.openModal('modal-booking');
  },

  async calculateBookingPricing() {
    const listing = this.activeModalListing;
    if (!listing) return;

    const startDateVal = document.getElementById('book-start-date').value;
    const endDateVal = document.getElementById('book-end-date').value;
    const deliveryMode = document.getElementById('book-delivery-mode').value;
    const alertBox = document.getElementById('booking-conflict-alert');
    const submitBtn = document.getElementById('btn-submit-booking');

    if (!startDateVal || !endDateVal) return;

    // Check for overlap conflict via API
    try {
      const conflictRes = await this.api('/api/bookings/check-conflict', 'POST', {
        listing_id: listing.id,
        start_date: startDateVal,
        end_date: endDateVal
      });

      if (conflictRes.hasConflict) {
        alertBox.style.display = 'block';
        alertBox.innerHTML = `⚠️ <strong>Schedule Collision:</strong> Already booked from ${conflictRes.conflictingBooking.start_date} to ${conflictRes.conflictingBooking.end_date}. Overlap-safe policy requires alternate dates.`;
        if (submitBtn) submitBtn.disabled = true;
      } else {
        alertBox.style.display = 'none';
        if (submitBtn) submitBtn.disabled = false;
      }
    } catch (e) {
      console.warn('Conflict check error:', e.message);
    }

    // Calculate duration & financials
    const start = new Date(startDateVal);
    const end = new Date(endDateVal);
    const days = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1);

    const baseDaily = Number(listing.daily_rate);
    const discount = Number(listing.idle_discount_pct || 0);
    const rateApplied = discount > 0 ? (baseDaily * (1 - discount / 100)) : baseDaily;
    const rentalTotal = rateApplied * days;

    let deliveryFee = 0;
    if (deliveryMode === 'Owner Delivery') deliveryFee = 85.00;
    if (deliveryMode === 'Commercial Hauling') deliveryFee = 220.00;

    const depositHold = Number(listing.security_deposit || 0);
    const grandTotal = rentalTotal + deliveryFee + depositHold;

    document.getElementById('calc-days').textContent = days;
    document.getElementById('calc-rate').textContent = `$${rateApplied.toFixed(2)}`;
    document.getElementById('calc-rental-total').textContent = `$${rentalTotal.toFixed(2)}`;
    document.getElementById('calc-delivery-fee').textContent = `$${deliveryFee.toFixed(2)}`;
    document.getElementById('calc-deposit-hold').textContent = `$${depositHold.toFixed(2)}`;
    document.getElementById('calc-grand-total').textContent = `$${grandTotal.toFixed(2)}`;
  },

  async handleBookingSubmit(e) {
    e.preventDefault();
    if (this.currentUser.role === 'visitor') {
      this.showToast('Please switch from Visitor to a registered Renter persona in the top bar to place reservations.', 'error');
      return;
    }

    const listing_id = document.getElementById('book-listing-id').value;
    const start_date = document.getElementById('book-start-date').value;
    const end_date = document.getElementById('book-end-date').value;
    const delivery_mode = document.getElementById('book-delivery-mode').value;
    const hire_type = document.getElementById('book-hire-type').value;
    const crop_task_description = document.getElementById('book-crop-task').value;
    const insurance_confirmed = document.getElementById('book-insurance-confirm').checked;

    try {
      const res = await this.api('/api/bookings', 'POST', {
        listing_id,
        start_date,
        end_date,
        delivery_mode,
        hire_type,
        crop_task_description,
        insurance_confirmed
      });

      this.closeModal('modal-booking');
      this.showToast(`Booking request ${res.data.booking_ref} created. Deposit held in simulated escrow.`, 'success');
      this.navigate('renter');
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  // HANDOVER CHECKLIST MODAL
  openHandoverModal(bookingId, checklistType) {
    const booking = this.bookings.find(b => b.id === bookingId);
    if (!booking) return;

    document.getElementById('handover-booking-id').value = bookingId;
    document.getElementById('handover-checklist-type').value = checklistType;

    const titleEl = document.getElementById('handover-modal-title');
    const isPre = checklistType === 'pre_rental';
    titleEl.textContent = isPre
      ? `Pre-Rental Handover Inspection (${booking.listing?.title})`
      : `Post-Rental Return Inspection (${booking.listing?.title})`;

    document.getElementById('handover-inspector').value = this.currentUser.full_name || 'Hank Miller';
    document.getElementById('handover-meter').value = booking.listing?.operating_hours || '1420.5';
    document.getElementById('handover-fuel').value = '100';
    this.updateFuelDisplay(100);
    document.getElementById('handover-initials').value = this.currentUser.role === 'operator' ? 'HM' : 'JH';

    this.openModal('modal-handover');
  },

  updateFuelDisplay(val) {
    const display = document.getElementById('fuel-level-display');
    const preview = document.getElementById('fuel-charge-preview');
    const fill = document.getElementById('fuel-gauge-bar-fill');

    if (display) display.textContent = `${val}%`;
    if (fill) fill.style.width = `${val}%`;

    const isPost = document.getElementById('handover-checklist-type')?.value === 'post_return';
    if (preview) {
      if (val >= 100 || !isPost) {
        preview.textContent = 'Full standard met (No charge)';
        preview.style.color = 'var(--color-olive-700)';
      } else {
        const missing = 100 - val;
        const fee = (missing * 1.80).toFixed(2);
        preview.textContent = `Deficit penalty: -$${fee} will be billed to deposit`;
        preview.style.color = 'var(--color-rust-600)';
      }
    }
  },

  async handleHandoverSubmit(e) {
    e.preventDefault();
    const booking_id = document.getElementById('handover-booking-id').value;
    const checklist_type = document.getElementById('handover-checklist-type').value;
    const operator_or_inspector_name = document.getElementById('handover-inspector').value;
    const meter_engine_hours = document.getElementById('handover-meter').value;
    const fuel_level_pct = document.getElementById('handover-fuel').value;
    const hydraulic_fluid_ok = document.getElementById('chk-hydraulic').checked;
    const engine_oil_ok = document.getElementById('chk-oil').checked;
    const tires_tracks_ok = document.getElementById('chk-tires').checked;
    const safety_shields_pto_ok = document.getElementById('chk-shields').checked;
    const lights_signals_ok = document.getElementById('chk-lights').checked;
    const cleanliness_ok = document.getElementById('chk-clean').checked;
    const condition_notes = document.getElementById('handover-notes').value;
    const signoff_initials = document.getElementById('handover-initials').value;

    let fuel_charge_billed = 0;
    if (checklist_type === 'post_return' && fuel_level_pct < 100) {
      fuel_charge_billed = Number(((100 - fuel_level_pct) * 1.80).toFixed(2));
    }

    try {
      const res = await this.api('/api/handovers', 'POST', {
        booking_id,
        checklist_type,
        operator_or_inspector_name,
        meter_engine_hours,
        fuel_level_pct,
        hydraulic_fluid_ok,
        engine_oil_ok,
        tires_tracks_ok,
        safety_shields_pto_ok,
        lights_signals_ok,
        cleanliness_ok,
        condition_notes,
        fuel_charge_billed,
        signoff_initials
      });

      this.closeModal('modal-handover');
      this.showToast(res.message, 'success');
      this.refreshCurrentView();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  // DAMAGE REPORT MODAL
  openDamageModal(bookingId, listingId) {
    document.getElementById('damage-booking-id').value = bookingId;
    document.getElementById('damage-listing-id').value = listingId;
    document.getElementById('damage-desc').value = '';
    document.getElementById('damage-cost').value = '';
    this.openModal('modal-damage');
  },

  async handleDamageSubmit(e) {
    e.preventDefault();
    const booking_id = document.getElementById('damage-booking-id').value;
    const listing_id = document.getElementById('damage-listing-id').value;
    const severity = document.getElementById('damage-severity').value;
    const incident_description = document.getElementById('damage-desc').value;
    const estimated_cost = document.getElementById('damage-cost').value;
    const photo_evidence_url = document.getElementById('damage-photo').value;

    try {
      const res = await this.api('/api/damages', 'POST', {
        booking_id,
        listing_id,
        severity,
        incident_description,
        estimated_cost,
        photo_evidence_url
      });
      this.closeModal('modal-damage');
      this.showToast('Incident report submitted to arbitration queue.', 'success');
      this.refreshCurrentView();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  // RESOLVE DAMAGE MODAL
  openResolveDamageModal(damageId) {
    const report = this.damages.find(d => d.id === damageId);
    if (!report) return;

    document.getElementById('resolve-damage-id').value = damageId;
    const summary = document.getElementById('resolve-damage-summary');
    if (summary) {
      summary.innerHTML = `
        <strong>Incident #${report.id} (${report.severity})</strong>
        <p style="margin: 4px 0; color: var(--color-soil-700);">${report.incident_description}</p>
        <div>Estimated: $${Number(report.estimated_cost).toFixed(2)} &bull; Equipment: ${report.listing?.title}</div>
      `;
    }

    document.getElementById('resolve-actual-cost').value = report.estimated_cost;
    document.getElementById('resolve-deduction').value = report.estimated_cost;
    document.getElementById('resolve-notes').value = 'Parts replaced by certified dealership. Deducted from security deposit; balance released to renter.';
    this.openModal('modal-resolve-damage');
  },

  async handleResolveDamageSubmit(e) {
    e.preventDefault();
    const damageId = document.getElementById('resolve-damage-id').value;
    const actual_cost = document.getElementById('resolve-actual-cost').value;
    const deducted_from_deposit = document.getElementById('resolve-deduction').value;
    const resolution_notes = document.getElementById('resolve-notes').value;

    try {
      const res = await this.api(`/api/damages/${damageId}/resolve`, 'PATCH', {
        actual_cost,
        deducted_from_deposit,
        resolution_notes,
        status: 'resolved'
      });
      this.closeModal('modal-resolve-damage');
      this.showToast(res.message, 'success');
      this.refreshCurrentView();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  // NEW LISTING MODAL
  openNewListingModal() {
    if (this.currentUser.role === 'visitor') {
      this.showToast('Please switch from Visitor to an Owner persona (e.g. Thomas Vance) to post machinery.', 'error');
      return;
    }
    this.openModal('modal-new-listing');
  },

  async handleListingSubmit(e) {
    e.preventDefault();
    const title = document.getElementById('new-title').value;
    const category = document.getElementById('new-category').value;
    const county = document.getElementById('new-county').value;
    const make = document.getElementById('new-make').value;
    const model = document.getElementById('new-model').value;
    const year = document.getElementById('new-year').value;
    const horsepower = document.getElementById('new-hp').value;
    const daily_rate = document.getElementById('new-daily-rate').value;
    const security_deposit = document.getElementById('new-deposit').value;
    const idle_discount_pct = document.getElementById('new-discount').value;
    const operator_option = document.getElementById('new-hire-opt').value;
    const description = document.getElementById('new-desc').value;
    const image_url = document.getElementById('new-image').value;

    try {
      const res = await this.api('/api/listings', 'POST', {
        title,
        category,
        county,
        make,
        model,
        year,
        horsepower,
        daily_rate,
        security_deposit,
        idle_discount_pct,
        operator_option,
        description,
        image_url
      });

      this.closeModal('modal-new-listing');
      this.showToast(`Machinery listing "${res.data.title}" published!`, 'success');
      this.navigate('catalog');
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  // ---------------------------------------------------------------------------
  // TOAST NOTIFICATIONS
  // ---------------------------------------------------------------------------
  showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
    toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 4500);
  }
};

// Start application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  app.init();
});
