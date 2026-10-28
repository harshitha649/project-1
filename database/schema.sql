-- ==============================================================================
-- Agricultural Equipment Rental and Idle-Time Exchange ("AgriShare Exchange")
-- PostgreSQL / Supabase Schema Definition
-- ==============================================================================

-- Enable UUID extension if supported
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS & PROFILES TABLE
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT,
    role TEXT NOT NULL CHECK (role IN ('visitor', 'renter', 'owner', 'operator', 'admin')),
    farm_name TEXT,
    county TEXT NOT NULL,
    state TEXT NOT NULL DEFAULT 'IA',
    verified_insurance BOOLEAN NOT NULL DEFAULT false,
    insurance_policy_number TEXT,
    bio TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. EQUIPMENT LISTINGS TABLE
CREATE TABLE IF NOT EXISTS equipment_listings (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN (
        'Tractor',
        'Combine Harvester',
        'Seeder & Planter',
        'Tillage & Plow',
        'Baler',
        'Sprayer',
        'Hauling & Trailer',
        'Specialty'
    )),
    make TEXT NOT NULL,
    model TEXT NOT NULL,
    year INTEGER NOT NULL CHECK (year >= 1970 AND year <= 2030),
    horsepower INTEGER,
    operating_hours NUMERIC(8,1) NOT NULL DEFAULT 0.0,
    condition TEXT NOT NULL CHECK (condition IN ('Excellent', 'Good', 'Fair')),
    description TEXT NOT NULL,
    image_url TEXT,
    county TEXT NOT NULL,
    service_radius_miles INTEGER NOT NULL DEFAULT 30 CHECK (service_radius_miles > 0),
    hourly_rate NUMERIC(10,2) NOT NULL CHECK (hourly_rate > 0),
    daily_rate NUMERIC(10,2) NOT NULL CHECK (daily_rate > 0),
    weekly_rate NUMERIC(10,2) CHECK (weekly_rate > 0),
    security_deposit NUMERIC(10,2) NOT NULL CHECK (security_deposit >= 0),
    min_rental_days INTEGER NOT NULL DEFAULT 1 CHECK (min_rental_days >= 1),
    fuel_policy TEXT NOT NULL DEFAULT 'Full-to-Full' CHECK (fuel_policy IN ('Full-to-Full', 'Metered-Gallon', 'Renter-Supplied')),
    operator_option TEXT NOT NULL DEFAULT 'Dry Hire (Machine Only)' CHECK (operator_option IN (
        'Dry Hire (Machine Only)',
        'Wet Hire (Operator Provided)',
        'Either Option Available'
    )),
    max_hours_per_day NUMERIC(5,2) NOT NULL DEFAULT 8.0 CHECK (max_hours_per_day > 0),
    excess_hour_fee NUMERIC(10,2) NOT NULL DEFAULT 45.00 CHECK (excess_hour_fee >= 0),
    idle_discount_pct INTEGER NOT NULL DEFAULT 0 CHECK (idle_discount_pct >= 0 AND idle_discount_pct <= 70),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. AVAILABILITY & IDLE WINDOWS TABLE
CREATE TABLE IF NOT EXISTS availability_windows (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    listing_id TEXT NOT NULL REFERENCES equipment_listings(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'idle_special' CHECK (status IN ('idle_special', 'available', 'blackout_maintenance', 'booked')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_avail_dates CHECK (end_date >= start_date)
);

-- 4. BOOKINGS TABLE
CREATE TABLE IF NOT EXISTS bookings (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    booking_ref TEXT UNIQUE NOT NULL,
    listing_id TEXT NOT NULL REFERENCES equipment_listings(id) ON DELETE RESTRICT,
    renter_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_days INTEGER NOT NULL CHECK (total_days >= 1),
    daily_rate_applied NUMERIC(10,2) NOT NULL,
    rental_total NUMERIC(10,2) NOT NULL CHECK (rental_total >= 0),
    security_deposit_held NUMERIC(10,2) NOT NULL CHECK (security_deposit_held >= 0),
    delivery_mode TEXT NOT NULL CHECK (delivery_mode IN ('Self Pickup', 'Owner Delivery', 'Commercial Hauling')),
    delivery_fee NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (delivery_fee >= 0),
    grand_total NUMERIC(10,2) NOT NULL CHECK (grand_total >= 0),
    crop_task_description TEXT NOT NULL,
    hire_type TEXT NOT NULL DEFAULT 'Dry Hire' CHECK (hire_type IN ('Dry Hire', 'Wet Hire')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending',
        'approved',
        'declined',
        'confirmed',
        'in_field',
        'returned',
        'completed',
        'cancelled'
    )),
    owner_notes TEXT,
    cancelled_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_booking_dates CHECK (end_date >= start_date)
);

-- 5. HANDOVER & RETURN CHECKLISTS TABLE
CREATE TABLE IF NOT EXISTS handover_checklists (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    checklist_type TEXT NOT NULL CHECK (checklist_type IN ('pre_rental', 'post_return')),
    operator_or_inspector_name TEXT NOT NULL,
    meter_engine_hours NUMERIC(8,1) NOT NULL,
    fuel_level_pct INTEGER NOT NULL CHECK (fuel_level_pct >= 0 AND fuel_level_pct <= 100),
    hydraulic_fluid_ok BOOLEAN NOT NULL DEFAULT true,
    engine_oil_ok BOOLEAN NOT NULL DEFAULT true,
    tires_tracks_ok BOOLEAN NOT NULL DEFAULT true,
    safety_shields_pto_ok BOOLEAN NOT NULL DEFAULT true,
    lights_signals_ok BOOLEAN NOT NULL DEFAULT true,
    cleanliness_ok BOOLEAN NOT NULL DEFAULT true,
    condition_notes TEXT,
    excess_hours_billed NUMERIC(5,1) NOT NULL DEFAULT 0.0 CHECK (excess_hours_billed >= 0),
    fuel_charge_billed NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (fuel_charge_billed >= 0),
    signoff_initials TEXT NOT NULL,
    completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. DAMAGE REPORTS TABLE
CREATE TABLE IF NOT EXISTS damage_reports (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    listing_id TEXT NOT NULL REFERENCES equipment_listings(id) ON DELETE RESTRICT,
    reported_by_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    reported_by_role TEXT NOT NULL CHECK (reported_by_role IN ('renter', 'owner', 'operator', 'admin')),
    severity TEXT NOT NULL CHECK (severity IN (
        'Cosmetic / Scratches',
        'Minor Mechanical (Operable)',
        'Major Inoperable / Safety Hazard'
    )),
    incident_description TEXT NOT NULL,
    estimated_cost NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (estimated_cost >= 0),
    actual_cost NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (actual_cost >= 0),
    deducted_from_deposit NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (deducted_from_deposit >= 0),
    status TEXT NOT NULL DEFAULT 'reported' CHECK (status IN (
        'reported',
        'under_investigation',
        'assessed',
        'deducted',
        'resolved',
        'waived'
    )),
    resolution_notes TEXT,
    photo_evidence_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. SIMULATED DEPOSIT LEDGER TABLE
CREATE TABLE IF NOT EXISTS deposit_ledger (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    entry_type TEXT NOT NULL CHECK (entry_type IN (
        'HOLD',
        'RELEASE_FULL',
        'RELEASE_PARTIAL',
        'DAMAGE_DEDUCTION',
        'FUEL_PENALTY',
        'EXCESS_HOURS_FEE',
        'FORFEITURE'
    )),
    amount NUMERIC(10,2) NOT NULL,
    balance_after NUMERIC(10,2) NOT NULL CHECK (balance_after >= 0),
    description TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    user_id TEXT,
    details TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- INDEXES FOR FAST QUERIES & CONFLICT CHECKS
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_listings_owner ON equipment_listings(owner_id);
CREATE INDEX IF NOT EXISTS idx_listings_category ON equipment_listings(category);
CREATE INDEX IF NOT EXISTS idx_listings_county ON equipment_listings(county);
CREATE INDEX IF NOT EXISTS idx_listings_active ON equipment_listings(is_active);

CREATE INDEX IF NOT EXISTS idx_avail_listing_dates ON availability_windows(listing_id, start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_bookings_listing_dates ON bookings(listing_id, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_bookings_renter ON bookings(renter_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);

CREATE INDEX IF NOT EXISTS idx_checklists_booking ON handover_checklists(booking_id);
CREATE INDEX IF NOT EXISTS idx_damage_booking ON damage_reports(booking_id);
CREATE INDEX IF NOT EXISTS idx_damage_listing ON damage_reports(listing_id);
CREATE INDEX IF NOT EXISTS idx_ledger_booking ON deposit_ledger(booking_id);
CREATE INDEX IF NOT EXISTS idx_ledger_user ON deposit_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_windows ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE handover_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE damage_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE deposit_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Equipment listings: Public read, owners insert/update/delete their own
DROP POLICY IF EXISTS "Public can view active listings" ON equipment_listings;
CREATE POLICY "Public can view active listings" ON equipment_listings
    FOR SELECT USING (is_active = true OR auth.uid()::text = owner_id);

DROP POLICY IF EXISTS "Owners manage their listings" ON equipment_listings;
CREATE POLICY "Owners manage their listings" ON equipment_listings
    FOR ALL USING (auth.uid()::text = owner_id);

-- Bookings: Renters and equipment owners can view their associated bookings
DROP POLICY IF EXISTS "Parties can view their bookings" ON bookings;
CREATE POLICY "Parties can view their bookings" ON bookings
    FOR SELECT USING (
        auth.uid()::text = renter_id OR
        EXISTS (SELECT 1 FROM equipment_listings WHERE id = bookings.listing_id AND owner_id = auth.uid()::text)
    );

DROP POLICY IF EXISTS "Renters can create bookings" ON bookings;
CREATE POLICY "Renters can create bookings" ON bookings
    FOR INSERT WITH CHECK (auth.uid()::text = renter_id);

-- Handover Checklists: Parties to the booking & operators can view/create
DROP POLICY IF EXISTS "Checklist access policy" ON handover_checklists;
CREATE POLICY "Checklist access policy" ON handover_checklists
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM bookings b
            JOIN equipment_listings l ON b.listing_id = l.id
            WHERE b.id = handover_checklists.booking_id
            AND (b.renter_id = auth.uid()::text OR l.owner_id = auth.uid()::text)
        )
    );

-- Deposit Ledger: Parties can view ledger entries for their bookings
DROP POLICY IF EXISTS "Ledger view policy" ON deposit_ledger;
CREATE POLICY "Ledger view policy" ON deposit_ledger
    FOR SELECT USING (
        user_id = auth.uid()::text OR
        EXISTS (
            SELECT 1 FROM bookings b
            JOIN equipment_listings l ON b.listing_id = l.id
            WHERE b.id = deposit_ledger.booking_id
            AND (b.renter_id = auth.uid()::text OR l.owner_id = auth.uid()::text)
        )
    );
