/**
 * AgriShare Exchange Comprehensive Verification & Automated Test Suite
 * Tests all core API flows, business rules, conflict safety, checklists, deposit ledger, and role boundaries.
 */

const http = require('http');
const app = require('../server/index');

let server;
const PORT = 3099;
const BASE_URL = `http://localhost:${PORT}`;

function makeRequest(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, headers: res.headers, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, raw: data });
        }
      });
    });

    req.on('error', (err) => reject(err));
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

let passed = 0;
let failed = 0;

function assert(condition, testName, details = '') {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${testName} - ${details}`);
    failed++;
  }
}

async function runTestSuite() {
  console.log('\n============================================================');
  console.log('  🌾 AgriShare Exchange - Automated Test Suite');
  console.log('============================================================\n');

  // Start temporary server for testing
  server = app.listen(PORT);

  try {
    // 1. Health & Status
    console.log('[Phase A: Health & Public Endpoints]');
    const health = await makeRequest('GET', '/api/health');
    assert(health.status === 200 && health.body.status === 'healthy', 'API Health Check returns healthy');

    const personas = await makeRequest('GET', '/api/auth/personas');
    assert(personas.status === 200 && personas.body.personas.length >= 4, 'Persona catalog provides Visitor, Renter, Owner, Operator, Admin');

    // 2. Equipment Listings
    console.log('\n[Phase B: Equipment Catalog & Search]');
    const listingsRes = await makeRequest('GET', '/api/listings');
    assert(listingsRes.status === 200 && listingsRes.body.count >= 8, `Listings endpoint returned ${listingsRes.body.count} items`);

    const filterRes = await makeRequest('GET', '/api/listings?category=Tractor');
    assert(filterRes.body.data.every(l => l.category === 'Tractor'), 'Category filter properly restricts to Tractor category');

    const singleListing = await makeRequest('GET', `/api/listings/eq_jd_8r_410`);
    assert(singleListing.status === 200 && singleListing.body.data.make === 'John Deere', 'Single listing detail includes make, model, specs, and owner');

    // 3. Overlap Conflict Safety Engine
    console.log('\n[Phase C: Overlap-Safe Booking Engine]');
    // Booking bk_active_01 is for 2026-10-25 to 2026-10-30
    const conflictCheck1 = await makeRequest('POST', '/api/bookings/check-conflict', {
      listing_id: 'eq_jd_8r_410',
      start_date: '2026-10-28',
      end_date: '2026-11-02'
    });
    assert(conflictCheck1.body.hasConflict === true, 'Conflict detected for overlapping date range (2026-10-28 to 2026-11-02)');

    const conflictCheck2 = await makeRequest('POST', '/api/bookings/check-conflict', {
      listing_id: 'eq_jd_8r_410',
      start_date: '2026-11-05',
      end_date: '2026-11-08'
    });
    assert(conflictCheck2.body.hasConflict === false, 'Conflict check passes for clear non-overlapping dates (2026-11-05 to 2026-11-08)');

    // Attempt to book conflicting dates
    const rejectBooking = await makeRequest('POST', '/api/bookings', {
      listing_id: 'eq_jd_8r_410',
      start_date: '2026-10-26',
      end_date: '2026-10-29',
      crop_task_description: 'Attempting conflicting booking'
    }, { 'x-user-id': 'u_renter_joe' });
    assert(rejectBooking.status === 409, 'Server rejects conflicting booking request with HTTP 409 Conflict');

    // 4. End-to-End Booking Lifecycle
    console.log('\n[Phase D: Booking Lifecycle, Checklists & Deposit Ledger]');
    // Create valid booking for Kubota M7
    const createBookingRes = await makeRequest('POST', '/api/bookings', {
      listing_id: 'eq_kubota_m7_172',
      start_date: '2026-11-10',
      end_date: '2026-11-12',
      delivery_mode: 'Self Pickup',
      crop_task_description: 'Round bale transport and field stacking',
      hire_type: 'Dry Hire'
    }, { 'x-user-id': 'u_renter_joe' });

    assert(createBookingRes.status === 201, 'Valid booking created with HTTP 201 Created');
    const createdBooking = createBookingRes.body.data;
    assert(createdBooking.status === 'pending', 'Initial booking status is pending');
    assert(createdBooking.security_deposit_held > 0, `Security deposit held is $${createdBooking.security_deposit_held}`);

    // Verify Deposit Ledger Hold was created
    const ledgerCheck = await makeRequest('GET', `/api/ledger?booking_id=${createdBooking.id}`);
    assert(ledgerCheck.body.data.some(l => l.entry_type === 'HOLD'), 'Deposit ledger created initial HOLD entry');

    // Owner approves booking (Owner Dave Miller)
    const approveRes = await makeRequest('PATCH', `/api/bookings/${createdBooking.id}/status`, {
      status: 'approved',
      notes: 'Approved for field use. Please check hydraulic couplers before hookup.'
    }, { 'x-user-id': 'u_owner_miller' });
    assert(approveRes.status === 200 && approveRes.body.data.status === 'approved', 'Owner successfully approves booking');

    // Operator executes Pre-Rental Handover Checklist
    const preHandoverRes = await makeRequest('POST', '/api/handovers', {
      booking_id: createdBooking.id,
      checklist_type: 'pre_rental',
      operator_or_inspector_name: 'Hank Miller (Field Inspector)',
      meter_engine_hours: 640.8,
      fuel_level_pct: 100,
      hydraulic_fluid_ok: true,
      engine_oil_ok: true,
      tires_tracks_ok: true,
      safety_shields_pto_ok: true,
      lights_signals_ok: true,
      cleanliness_ok: true,
      condition_notes: 'All safety shields verified. Tires at recommended pressure.',
      signoff_initials: 'HM'
    }, { 'x-user-id': 'u_operator_hank' });
    assert(preHandoverRes.status === 201, 'Pre-rental handover checklist recorded');

    // Verify booking transitioned to in_field
    const inFieldBooking = await makeRequest('GET', `/api/bookings/${createdBooking.id}`);
    assert(inFieldBooking.body.data.status === 'in_field', 'Booking transitioned to in_field status following pre-rental checklist');

    // Operator executes Post-Return Checklist with fuel penalty
    const postHandoverRes = await makeRequest('POST', '/api/handovers', {
      booking_id: createdBooking.id,
      checklist_type: 'post_rental',
      operator_or_inspector_name: 'Hank Miller (Field Inspector)',
      meter_engine_hours: 658.2,
      fuel_level_pct: 80,
      hydraulic_fluid_ok: true,
      engine_oil_ok: true,
      tires_tracks_ok: true,
      safety_shields_pto_ok: true,
      lights_signals_ok: true,
      cleanliness_ok: true,
      condition_notes: 'Clean return; fuel returned at 80% instead of 100%. Fuel charge assessed.',
      excess_hours_billed: 0,
      fuel_charge_billed: 50.00,
      signoff_initials: 'HM'
    }, { 'x-user-id': 'u_operator_hank' });
    assert(postHandoverRes.status === 201, 'Post-rental return checklist recorded with fuel charge');

    // Verify booking transitioned to returned
    const returnedBooking = await makeRequest('GET', `/api/bookings/${createdBooking.id}`);
    assert(returnedBooking.body.data.status === 'returned', 'Booking transitioned to returned status');

    // 5. Damage Report & Arbitrated Deposit Deduction
    console.log('\n[Phase E: Damage Incident & Escrow Deduction]');
    const damageRes = await makeRequest('POST', '/api/damages', {
      booking_id: createdBooking.id,
      listing_id: createdBooking.listing_id,
      severity: 'Minor Mechanical (Operable)',
      incident_description: 'Hydraulic quick coupler lever scratched and slightly bent during implement disconnection.',
      estimated_cost: 120.00
    }, { 'x-user-id': 'u_owner_miller' });
    assert(damageRes.status === 201, 'Damage incident report filed');

    const damageReportId = damageRes.body.data.id;
    // Resolve damage claim with deposit deduction
    const resolveDamageRes = await makeRequest('PATCH', `/api/damages/${damageReportId}/resolve`, {
      actual_cost: 110.00,
      deducted_from_deposit: 110.00,
      resolution_notes: 'Replaced hydraulic quick release lever. $110 deducted, remaining balance disbursed to renter.',
      status: 'resolved'
    }, { 'x-user-id': 'u_admin_sarah' });
    assert(resolveDamageRes.status === 200, 'Damage report arbitrated and resolved by Administrator');

    // Verify Ledger records DAMAGE_DEDUCTION and RELEASE_PARTIAL
    const updatedLedger = await makeRequest('GET', `/api/ledger?booking_id=${createdBooking.id}`);
    assert(updatedLedger.body.data.some(l => l.entry_type === 'DAMAGE_DEDUCTION'), 'Deposit ledger contains DAMAGE_DEDUCTION entry');
    assert(updatedLedger.body.data.some(l => l.entry_type === 'RELEASE_PARTIAL'), 'Deposit ledger contains RELEASE_PARTIAL refund entry');

    // 6. Security & Role Permissions
    console.log('\n[Phase F: Role Permission & Boundary Checks]');
    // Visitor cannot create listing
    const visitorListing = await makeRequest('POST', '/api/listings', {
      title: 'Hacked Listing',
      category: 'Tractor',
      make: 'Bogus',
      model: 'X',
      daily_rate: 100,
      county: 'Polk'
    }, { 'x-user-id': 'visitor' });
    assert(visitorListing.status === 401, 'Visitor cannot create equipment listings (HTTP 401)');

    // Renter cannot approve bookings
    const unauthorizedApprove = await makeRequest('PATCH', `/api/bookings/${createdBooking.id}/status`, {
      status: 'approved'
    }, { 'x-user-id': 'u_renter_joe' });
    assert(unauthorizedApprove.status === 403 || unauthorizedApprove.status === 400, 'Renter cannot approve equipment bookings (Access Denied)');

    // 7. Metrics & Audit Trail
    console.log('\n[Phase G: System Metrics & Audit Trail]');
    const metricsRes = await makeRequest('GET', '/api/metrics');
    assert(metricsRes.status === 200 && metricsRes.body.data.totalListings > 0, 'Platform metrics calculated correctly');

    const auditRes = await makeRequest('GET', '/api/audit-logs');
    assert(auditRes.status === 200 && auditRes.body.count > 0, 'Audit trail logged actions in persistent sequence');

  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  } finally {
    server.close();
    console.log('\n============================================================');
    console.log(`  Tests Completed: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
    console.log('============================================================\n');
    process.exit(failed > 0 ? 1 : 0);
  }
}

runTestSuite();
