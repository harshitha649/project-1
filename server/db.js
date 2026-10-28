const { createClient } = require('@supabase/supabase-js');
const config = require('./config');
const fs = require('fs');
const path = require('path');

// Global in-memory storage seeded from seed.sql for local/testing fallback
class LocalDataStore {
  constructor() {
    this.tables = {
      users: [],
      equipment_listings: [],
      availability_windows: [],
      bookings: [],
      handover_checklists: [],
      damage_reports: [],
      deposit_ledger: [],
      audit_logs: []
    };
    this.initDefaultSeed();
  }

  initDefaultSeed() {
    // Seed Users
    this.tables.users = [
      {
        id: 'u_owner_vance',
        email: 'thomas.vance@vancegrain.com',
        full_name: 'Thomas Vance',
        phone: '(319) 555-0142',
        role: 'owner',
        farm_name: 'Vance Family Farms',
        county: 'Cedar',
        state: 'IA',
        verified_insurance: true,
        insurance_policy_number: 'NATIONWIDE-AG-9921',
        bio: '3rd generation corn and soybean operator with 1,800 acres. Sharing modern, well-maintained tractors and grain machinery during idle inter-season windows.',
        created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
        updated_at: new Date(Date.now() - 30 * 86400000).toISOString()
      },
      {
        id: 'u_renter_joe',
        email: 'joe.higgins@redcedarorganic.org',
        full_name: 'Joe Higgins',
        phone: '(319) 555-0188',
        role: 'renter',
        farm_name: 'Red Cedar Organic Acres',
        county: 'Linn',
        state: 'IA',
        verified_insurance: true,
        insurance_policy_number: 'FARM-BUREAU-6642',
        bio: 'Specialty organic grain and cover-crop producer farming 220 acres. Uses rental exchange to access heavy tillage and precision planters without capital debt.',
        created_at: new Date(Date.now() - 25 * 86400000).toISOString(),
        updated_at: new Date(Date.now() - 25 * 86400000).toISOString()
      },
      {
        id: 'u_operator_hank',
        email: 'hank.miller@agrishare-ops.net',
        full_name: 'Hank Miller',
        phone: '(515) 555-0274',
        role: 'operator',
        farm_name: 'Midwest Ag Tech Inspections',
        county: 'Johnson',
        state: 'IA',
        verified_insurance: true,
        insurance_policy_number: 'TECH-AGRI-1102',
        bio: 'ASE-certified heavy farm machinery inspector & field logistics operator. Over 18 years experience handling John Deere and Case IH fleet handovers.',
        created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
        updated_at: new Date(Date.now() - 20 * 86400000).toISOString()
      },
      {
        id: 'u_admin_sarah',
        email: 'sarah.chen@agrishare.org',
        full_name: 'Sarah Chen',
        phone: '(515) 555-0100',
        role: 'admin',
        farm_name: 'AgriShare Exchange HQ',
        county: 'Polk',
        state: 'IA',
        verified_insurance: true,
        insurance_policy_number: 'PLATFORM-MASTER-001',
        bio: 'Platform Operations Lead & Dispute Arbitrator for Midwest Ag Exchange.',
        created_at: new Date(Date.now() - 40 * 86400000).toISOString(),
        updated_at: new Date(Date.now() - 40 * 86400000).toISOString()
      },
      {
        id: 'u_owner_miller',
        email: 'dave.miller@prairieviewfarms.com',
        full_name: 'Dave Miller',
        phone: '(319) 555-0311',
        role: 'owner',
        farm_name: 'Prairie View Holdings',
        county: 'Benton',
        state: 'IA',
        verified_insurance: true,
        insurance_policy_number: 'STATEFARM-AG-8821',
        bio: 'Diversified cattle and forage operation. Our high-density balers and flatbed trailers sit idle between cutting cycles.',
        created_at: new Date(Date.now() - 22 * 86400000).toISOString(),
        updated_at: new Date(Date.now() - 22 * 86400000).toISOString()
      }
    ];

    // Seed Listings
    this.tables.equipment_listings = [
      {
        id: 'eq_jd_8r_410',
        owner_id: 'u_owner_vance',
        title: 'John Deere 8R 410 Row-Crop Tractor (410 HP)',
        category: 'Tractor',
        make: 'John Deere',
        model: '8R 410',
        year: 2022,
        horsepower: 410,
        operating_hours: 1420.5,
        condition: 'Excellent',
        description: 'Equipped with e23 PowerShift, Gen 4 CommandCenter 4600 display with StarFire 6000 AutoTrac receiver. Dual rear tires, high-flow hydraulic pump (85 gpm), cab suspension. Available during late spring post-planting window.',
        image_url: 'https://images.unsplash.com/photo-1592982537447-7440770cbfc9?auto=format&fit=crop&w=1200&q=80',
        county: 'Cedar',
        service_radius_miles: 40,
        hourly_rate: 135.00,
        daily_rate: 880.00,
        weekly_rate: 4800.00,
        security_deposit: 1500.00,
        min_rental_days: 2,
        fuel_policy: 'Full-to-Full',
        operator_option: 'Dry Hire (Machine Only)',
        max_hours_per_day: 10.0,
        excess_hour_fee: 55.00,
        idle_discount_pct: 20,
        is_active: true,
        created_at: new Date(Date.now() - 28 * 86400000).toISOString(),
        updated_at: new Date(Date.now() - 28 * 86400000).toISOString()
      },
      {
        id: 'eq_case_axial_8250',
        owner_id: 'u_owner_vance',
        title: 'Case IH Axial-Flow 8250 Combine Harvester',
        category: 'Combine Harvester',
        make: 'Case IH',
        model: 'Axial-Flow 8250',
        year: 2021,
        horsepower: 498,
        operating_hours: 980.2,
        condition: 'Excellent',
        description: 'AFS Harvest Command automation, 410-bushel grain tank with high-capacity folding unload auger. Includes luxury cab and lateral tilt feeder house. Available before corn harvest season for early small-grain cutting.',
        image_url: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=1200&q=80',
        county: 'Cedar',
        service_radius_miles: 50,
        hourly_rate: 260.00,
        daily_rate: 1650.00,
        weekly_rate: 8900.00,
        security_deposit: 3000.00,
        min_rental_days: 3,
        fuel_policy: 'Full-to-Full',
        operator_option: 'Wet Hire (Operator Provided)',
        max_hours_per_day: 8.0,
        excess_hour_fee: 95.00,
        idle_discount_pct: 15,
        is_active: true,
        created_at: new Date(Date.now() - 25 * 86400000).toISOString(),
        updated_at: new Date(Date.now() - 25 * 86400000).toISOString()
      },
      {
        id: 'eq_great_plains_drill',
        owner_id: 'u_owner_vance',
        title: 'Great Plains 1500 No-Till Grain Drill (15 ft)',
        category: 'Seeder & Planter',
        make: 'Great Plains',
        model: '1500 3-Point',
        year: 2020,
        horsepower: 130,
        operating_hours: 412.0,
        condition: 'Good',
        description: '15-foot working width, 7.5-inch spacing with 00 Series openers. Equipped with native grass box and small seeds attachment. Perfect for planting cover crops, oats, or pasture renovation.',
        image_url: 'https://images.unsplash.com/photo-1589923188900-85dae523342b?auto=format&fit=crop&w=1200&q=80',
        county: 'Linn',
        service_radius_miles: 35,
        hourly_rate: 75.00,
        daily_rate: 440.00,
        weekly_rate: 2200.00,
        security_deposit: 800.00,
        min_rental_days: 1,
        fuel_policy: 'Full-to-Full',
        operator_option: 'Either Option Available',
        max_hours_per_day: 10.0,
        excess_hour_fee: 40.00,
        idle_discount_pct: 25,
        is_active: true,
        created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
        updated_at: new Date(Date.now() - 20 * 86400000).toISOString()
      },
      {
        id: 'eq_kubota_m7_172',
        owner_id: 'u_owner_miller',
        title: 'Kubota M7-172 Premium KVT Utility Tractor',
        category: 'Tractor',
        make: 'Kubota',
        model: 'M7-172 KVT',
        year: 2023,
        horsepower: 168,
        operating_hours: 640.8,
        condition: 'Excellent',
        description: 'Equipped with KVT continuously variable transmission, front loader with grapple bucket, 110-inch rear wheel weights. Fantastic tractor for loader work, round bale handling, and medium tillage.',
        image_url: 'https://images.unsplash.com/photo-1560493676-04071c5f467b?auto=format&fit=crop&w=1200&q=80',
        county: 'Benton',
        service_radius_miles: 30,
        hourly_rate: 90.00,
        daily_rate: 580.00,
        weekly_rate: 3100.00,
        security_deposit: 1000.00,
        min_rental_days: 1,
        fuel_policy: 'Full-to-Full',
        operator_option: 'Dry Hire (Machine Only)',
        max_hours_per_day: 8.0,
        excess_hour_fee: 45.00,
        idle_discount_pct: 10,
        is_active: true,
        created_at: new Date(Date.now() - 18 * 86400000).toISOString(),
        updated_at: new Date(Date.now() - 18 * 86400000).toISOString()
      },
      {
        id: 'eq_nh_bigbaler_1290',
        owner_id: 'u_owner_miller',
        title: 'New Holland BigBaler 1290 High Density',
        category: 'Baler',
        make: 'New Holland',
        model: 'BigBaler 1290 HD',
        year: 2022,
        horsepower: 240,
        operating_hours: 510.4,
        condition: 'Excellent',
        description: 'Produces 3x4 large square bales with up to 22% higher density than standard balers. Equipped with Loop Master knotter technology and moisture sensing system. Available between alfalfa cuttings.',
        image_url: 'https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?auto=format&fit=crop&w=1200&q=80',
        county: 'Johnson',
        service_radius_miles: 45,
        hourly_rate: 140.00,
        daily_rate: 950.00,
        weekly_rate: 4900.00,
        security_deposit: 1800.00,
        min_rental_days: 2,
        fuel_policy: 'Full-to-Full',
        operator_option: 'Either Option Available',
        max_hours_per_day: 8.0,
        excess_hour_fee: 60.00,
        idle_discount_pct: 15,
        is_active: true,
        created_at: new Date(Date.now() - 15 * 86400000).toISOString(),
        updated_at: new Date(Date.now() - 15 * 86400000).toISOString()
      },
      {
        id: 'eq_sunflower_1436_disc',
        owner_id: 'u_owner_vance',
        title: 'Sunflower 1436 Flexible Tandem Disc Harrow (24 ft)',
        category: 'Tillage & Plow',
        make: 'Sunflower (AGCO)',
        model: '1436-24',
        year: 2019,
        horsepower: 200,
        operating_hours: 890.0,
        condition: 'Good',
        description: '24-foot cutting width with 22-inch notched front blades and smooth rear blades. Hydraulic depth control and walking tandem axles for uniform ground penetration in residue-heavy fields.',
        image_url: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80',
        county: 'Cedar',
        service_radius_miles: 30,
        hourly_rate: 65.00,
        daily_rate: 380.00,
        weekly_rate: 1950.00,
        security_deposit: 700.00,
        min_rental_days: 1,
        fuel_policy: 'Full-to-Full',
        operator_option: 'Dry Hire (Machine Only)',
        max_hours_per_day: 12.0,
        excess_hour_fee: 35.00,
        idle_discount_pct: 30,
        is_active: true,
        created_at: new Date(Date.now() - 12 * 86400000).toISOString(),
        updated_at: new Date(Date.now() - 12 * 86400000).toISOString()
      },
      {
        id: 'eq_hagie_sts12_sprayer',
        owner_id: 'u_owner_vance',
        title: 'Hagie STS12 Self-Propelled High-Clearance Sprayer',
        category: 'Sprayer',
        make: 'Hagie / John Deere',
        model: 'STS12',
        year: 2021,
        horsepower: 300,
        operating_hours: 1150.0,
        condition: 'Excellent',
        description: '120-foot hybrid carbon-fiber boom, 1,200 gallon stainless solution tank, 72-inch under-frame clearance for late-season tall corn application. Includes Raven Slingshot field computer.',
        image_url: 'https://images.unsplash.com/photo-1530595467537-0b5996c41f2d?auto=format&fit=crop&w=1200&q=80',
        county: 'Linn',
        service_radius_miles: 40,
        hourly_rate: 210.00,
        daily_rate: 1350.00,
        weekly_rate: 7200.00,
        security_deposit: 2500.00,
        min_rental_days: 1,
        fuel_policy: 'Full-to-Full',
        operator_option: 'Wet Hire (Operator Provided)',
        max_hours_per_day: 8.0,
        excess_hour_fee: 85.00,
        idle_discount_pct: 10,
        is_active: true,
        created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
        updated_at: new Date(Date.now() - 10 * 86400000).toISOString()
      },
      {
        id: 'eq_pj_32ft_trailer',
        owner_id: 'u_owner_miller',
        title: 'PJ 32-Foot Gooseneck Dual Tandem Equipment Trailer',
        category: 'Hauling & Trailer',
        make: 'PJ Trailers',
        model: 'LD 32+5 Monster Ramps',
        year: 2023,
        horsepower: 0,
        operating_hours: 220.0,
        condition: 'Excellent',
        description: '25,000 lbs GVWR, dual 10k Dexter oil-bath axles, 5-foot dovetail with heavy spring-assisted flip-over Monster Ramps. Electric-over-hydraulic brakes and front lockable toolbox.',
        image_url: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80',
        county: 'Benton',
        service_radius_miles: 60,
        hourly_rate: 35.00,
        daily_rate: 195.00,
        weekly_rate: 950.00,
        security_deposit: 500.00,
        min_rental_days: 1,
        fuel_policy: 'Full-to-Full',
        operator_option: 'Dry Hire (Machine Only)',
        max_hours_per_day: 24.0,
        excess_hour_fee: 20.00,
        idle_discount_pct: 0,
        is_active: true,
        created_at: new Date(Date.now() - 8 * 86400000).toISOString(),
        updated_at: new Date(Date.now() - 8 * 86400000).toISOString()
      }
    ];

    // Seed Availability Windows
    this.tables.availability_windows = [
      {
        id: 'av_1',
        listing_id: 'eq_jd_8r_410',
        start_date: '2026-11-01',
        end_date: '2026-11-20',
        status: 'idle_special',
        notes: 'Late fall tillage window; 20% off weekly rentals',
        created_at: new Date().toISOString()
      },
      {
        id: 'av_2',
        listing_id: 'eq_case_axial_8250',
        start_date: '2026-11-15',
        end_date: '2026-12-05',
        status: 'available',
        notes: 'Post-soybean harvest available open slot',
        created_at: new Date().toISOString()
      },
      {
        id: 'av_3',
        listing_id: 'eq_great_plains_drill',
        start_date: '2026-11-02',
        end_date: '2026-11-12',
        status: 'idle_special',
        notes: 'Cover crop drilling special window',
        created_at: new Date().toISOString()
      },
      {
        id: 'av_4',
        listing_id: 'eq_kubota_m7_172',
        start_date: '2026-11-05',
        end_date: '2026-11-25',
        status: 'available',
        notes: 'Standard yard/hauling availability',
        created_at: new Date().toISOString()
      },
      {
        id: 'av_5',
        listing_id: 'eq_sunflower_1436_disc',
        start_date: '2026-11-01',
        end_date: '2026-11-18',
        status: 'idle_special',
        notes: 'Autumn stalk shredding and primary disking',
        created_at: new Date().toISOString()
      }
    ];

    // Seed Bookings
    this.tables.bookings = [
      {
        id: 'bk_active_01',
        booking_ref: 'AGRI-2026-8812',
        listing_id: 'eq_jd_8r_410',
        renter_id: 'u_renter_joe',
        start_date: '2026-10-25',
        end_date: '2026-10-30',
        total_days: 5,
        daily_rate_applied: 704.00,
        rental_total: 3520.00,
        security_deposit_held: 1500.00,
        delivery_mode: 'Self Pickup',
        delivery_fee: 0.00,
        grand_total: 5020.00,
        crop_task_description: 'Deep ripping 140 acres of continuous corn ground before ground frost sets in.',
        hire_type: 'Dry Hire',
        status: 'in_field',
        owner_notes: 'Approved with clean insurance check. Renter has verified 8R series operating experience.',
        created_at: new Date(Date.now() - 4 * 86400000).toISOString(),
        updated_at: new Date(Date.now() - 3 * 86400000).toISOString()
      },
      {
        id: 'bk_completed_02',
        booking_ref: 'AGRI-2026-7429',
        listing_id: 'eq_great_plains_drill',
        renter_id: 'u_renter_joe',
        start_date: '2026-10-15',
        end_date: '2026-10-18',
        total_days: 3,
        daily_rate_applied: 330.00,
        rental_total: 990.00,
        security_deposit_held: 800.00,
        delivery_mode: 'Owner Delivery',
        delivery_fee: 85.00,
        grand_total: 1875.00,
        crop_task_description: 'Interseeding rye cover crop across 85 acres of harvested soybean stubble.',
        hire_type: 'Dry Hire',
        status: 'completed',
        owner_notes: 'Handover and return inspection completed with zero discrepancies. Full deposit released.',
        created_at: new Date(Date.now() - 14 * 86400000).toISOString(),
        updated_at: new Date(Date.now() - 10 * 86400000).toISOString()
      },
      {
        id: 'bk_pending_03',
        booking_ref: 'AGRI-2026-9041',
        listing_id: 'eq_case_axial_8250',
        renter_id: 'u_renter_joe',
        start_date: '2026-11-16',
        end_date: '2026-11-20',
        total_days: 4,
        daily_rate_applied: 1402.50,
        rental_total: 5610.00,
        security_deposit_held: 3000.00,
        delivery_mode: 'Commercial Hauling',
        delivery_fee: 250.00,
        grand_total: 8860.00,
        crop_task_description: 'Harvesting 190 acres of organic food-grade non-GMO corn with certified operator.',
        hire_type: 'Wet Hire',
        status: 'pending',
        owner_notes: 'Waiting on owner Thomas Vance schedule confirmation.',
        created_at: new Date(Date.now() - 1 * 86400000).toISOString(),
        updated_at: new Date(Date.now() - 1 * 86400000).toISOString()
      },
      {
        id: 'bk_returned_damage_04',
        booking_ref: 'AGRI-2026-6114',
        listing_id: 'eq_sunflower_1436_disc',
        renter_id: 'u_renter_joe',
        start_date: '2026-10-08',
        end_date: '2026-10-11',
        total_days: 3,
        daily_rate_applied: 266.00,
        rental_total: 798.00,
        security_deposit_held: 700.00,
        delivery_mode: 'Self Pickup',
        delivery_fee: 0.00,
        grand_total: 1498.00,
        crop_task_description: 'Primary fall chisel-disking on heavy clay soil.',
        hire_type: 'Dry Hire',
        status: 'returned',
        owner_notes: 'Returned with damaged outer gang scraper bracket. Incident reported for insurance assessment.',
        created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
        updated_at: new Date(Date.now() - 16 * 86400000).toISOString()
      }
    ];

    // Seed Handover Checklists
    this.tables.handover_checklists = [
      {
        id: 'chk_pre_01',
        booking_id: 'bk_active_01',
        checklist_type: 'pre_rental',
        operator_or_inspector_name: 'Hank Miller (Inspector #409)',
        meter_engine_hours: 1420.5,
        fuel_level_pct: 100,
        hydraulic_fluid_ok: true,
        engine_oil_ok: true,
        tires_tracks_ok: true,
        safety_shields_pto_ok: true,
        lights_signals_ok: true,
        cleanliness_ok: true,
        condition_notes: 'Clean cab, duals inflated to 14 psi, 3-point quick hitch pins secure, full DEF & diesel tanks.',
        excess_hours_billed: 0.0,
        fuel_charge_billed: 0.00,
        signoff_initials: 'HM/JH',
        completed_at: new Date(Date.now() - 3 * 86400000).toISOString()
      },
      {
        id: 'chk_pre_02',
        booking_id: 'bk_completed_02',
        checklist_type: 'pre_rental',
        operator_or_inspector_name: 'Thomas Vance (Owner)',
        meter_engine_hours: 412.0,
        fuel_level_pct: 100,
        hydraulic_fluid_ok: true,
        engine_oil_ok: true,
        tires_tracks_ok: true,
        safety_shields_pto_ok: true,
        lights_signals_ok: true,
        cleanliness_ok: true,
        condition_notes: 'Seed cups calibrated, down-pressure springs lubricated, tires at 32 psi.',
        excess_hours_billed: 0.0,
        fuel_charge_billed: 0.00,
        signoff_initials: 'TV/JH',
        completed_at: new Date(Date.now() - 13 * 86400000).toISOString()
      },
      {
        id: 'chk_post_02',
        booking_id: 'bk_completed_02',
        checklist_type: 'post_rental',
        operator_or_inspector_name: 'Thomas Vance (Owner)',
        meter_engine_hours: 438.4,
        fuel_level_pct: 100,
        hydraulic_fluid_ok: true,
        engine_oil_ok: true,
        tires_tracks_ok: true,
        safety_shields_pto_ok: true,
        lights_signals_ok: true,
        cleanliness_ok: true,
        condition_notes: 'Seed hoppers washed out thoroughly, disc openers wiped clean, all seed tubes undamaged.',
        excess_hours_billed: 0.0,
        fuel_charge_billed: 0.00,
        signoff_initials: 'TV',
        completed_at: new Date(Date.now() - 10 * 86400000).toISOString()
      },
      {
        id: 'chk_pre_04',
        booking_id: 'bk_returned_damage_04',
        checklist_type: 'pre_rental',
        operator_or_inspector_name: 'Thomas Vance (Owner)',
        meter_engine_hours: 890.0,
        fuel_level_pct: 100,
        hydraulic_fluid_ok: true,
        engine_oil_ok: true,
        tires_tracks_ok: true,
        safety_shields_pto_ok: true,
        lights_signals_ok: true,
        cleanliness_ok: true,
        condition_notes: 'Disc gangs in solid shape. All scrapers adjusted.',
        excess_hours_billed: 0.0,
        fuel_charge_billed: 0.00,
        signoff_initials: 'TV/JH',
        completed_at: new Date(Date.now() - 19 * 86400000).toISOString()
      },
      {
        id: 'chk_post_04',
        booking_id: 'bk_returned_damage_04',
        checklist_type: 'post_rental',
        operator_or_inspector_name: 'Hank Miller (Inspector #409)',
        meter_engine_hours: 922.0,
        fuel_level_pct: 75,
        hydraulic_fluid_ok: true,
        engine_oil_ok: true,
        tires_tracks_ok: false,
        safety_shields_pto_ok: true,
        lights_signals_ok: true,
        cleanliness_ok: true,
        condition_notes: 'Right outer wing scraper arm bent after striking hidden limestone rock. Fuel tank at 75% (25% fuel refill charge calculated).',
        excess_hours_billed: 0.0,
        fuel_charge_billed: 45.00,
        signoff_initials: 'HM',
        completed_at: new Date(Date.now() - 16 * 86400000).toISOString()
      }
    ];

    // Seed Damage Reports
    this.tables.damage_reports = [
      {
        id: 'dmg_01',
        booking_id: 'bk_returned_damage_04',
        listing_id: 'eq_sunflower_1436_disc',
        reported_by_user_id: 'u_owner_vance',
        reported_by_role: 'owner',
        severity: 'Minor Mechanical (Operable)',
        incident_description: 'Renter reported encountering an unmarked buried limestone ledge on north forty field. Outer right disc scraper bracket sheared and bent backward.',
        estimated_cost: 285.00,
        actual_cost: 265.00,
        deducted_from_deposit: 265.00,
        status: 'deducted',
        resolution_notes: 'Replaced OEM Sunflower scraper assembly part #SF-9912. Deducted $265.00 from security deposit along with $45 fuel replenish fee. Balance of $390.00 refunded to renter.',
        photo_evidence_url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80',
        created_at: new Date(Date.now() - 16 * 86400000).toISOString(),
        updated_at: new Date(Date.now() - 15 * 86400000).toISOString()
      }
    ];

    // Seed Deposit Ledger
    this.tables.deposit_ledger = [
      {
        id: 'led_01',
        booking_id: 'bk_completed_02',
        user_id: 'u_renter_joe',
        entry_type: 'HOLD',
        amount: 800.00,
        balance_after: 800.00,
        description: 'Security deposit escrow hold for Great Plains Grain Drill rental',
        created_at: new Date(Date.now() - 14 * 86400000).toISOString()
      },
      {
        id: 'led_02',
        booking_id: 'bk_completed_02',
        user_id: 'u_renter_joe',
        entry_type: 'RELEASE_FULL',
        amount: 800.00,
        balance_after: 0.00,
        description: 'Full security deposit escrow release upon satisfactory return checklist signoff',
        created_at: new Date(Date.now() - 10 * 86400000).toISOString()
      },
      {
        id: 'led_03',
        booking_id: 'bk_returned_damage_04',
        user_id: 'u_renter_joe',
        entry_type: 'HOLD',
        amount: 700.00,
        balance_after: 700.00,
        description: 'Security deposit escrow hold for Sunflower Disc Harrow rental',
        created_at: new Date(Date.now() - 20 * 86400000).toISOString()
      },
      {
        id: 'led_04',
        booking_id: 'bk_returned_damage_04',
        user_id: 'u_renter_joe',
        entry_type: 'FUEL_PENALTY',
        amount: 45.00,
        balance_after: 655.00,
        description: 'Fuel replenishment fee deduction (returned at 75% tank level)',
        created_at: new Date(Date.now() - 16 * 86400000).toISOString()
      },
      {
        id: 'led_05',
        booking_id: 'bk_returned_damage_04',
        user_id: 'u_renter_joe',
        entry_type: 'DAMAGE_DEDUCTION',
        amount: 265.00,
        balance_after: 390.00,
        description: 'Approved repair deduction for bent disc scraper bracket (Damage Report #dmg_01)',
        created_at: new Date(Date.now() - 15 * 86400000).toISOString()
      },
      {
        id: 'led_06',
        booking_id: 'bk_returned_damage_04',
        user_id: 'u_renter_joe',
        entry_type: 'RELEASE_PARTIAL',
        amount: 390.00,
        balance_after: 0.00,
        description: 'Final remaining deposit refund disbursed to renter bank account',
        created_at: new Date(Date.now() - 15 * 86400000).toISOString()
      },
      {
        id: 'led_07',
        booking_id: 'bk_active_01',
        user_id: 'u_renter_joe',
        entry_type: 'HOLD',
        amount: 1500.00,
        balance_after: 1500.00,
        description: 'Security deposit escrow active hold for John Deere 8R 410 rental',
        created_at: new Date(Date.now() - 4 * 86400000).toISOString()
      }
    ];

    // Seed Audit Logs
    this.tables.audit_logs = [
      {
        id: 'aud_01',
        action: 'USER_REGISTERED',
        entity_type: 'user',
        entity_id: 'u_owner_vance',
        user_id: 'u_admin_sarah',
        details: 'Owner profile registered and farm liability insurance verified',
        created_at: new Date(Date.now() - 30 * 86400000).toISOString()
      },
      {
        id: 'aud_02',
        action: 'LISTING_PUBLISHED',
        entity_type: 'equipment_listing',
        entity_id: 'eq_jd_8r_410',
        user_id: 'u_owner_vance',
        details: 'New machinery listing John Deere 8R 410 published with idle special discount',
        created_at: new Date(Date.now() - 28 * 86400000).toISOString()
      },
      {
        id: 'aud_03',
        action: 'BOOKING_REQUESTED',
        entity_type: 'booking',
        entity_id: 'bk_active_01',
        user_id: 'u_renter_joe',
        details: 'Booking AGRI-2026-8812 requested for 5 days ($3,520.00 rental + $1,500.00 deposit hold)',
        created_at: new Date(Date.now() - 4 * 86400000).toISOString()
      },
      {
        id: 'aud_04',
        action: 'BOOKING_APPROVED',
        entity_type: 'booking',
        entity_id: 'bk_active_01',
        user_id: 'u_owner_vance',
        details: 'Owner approved booking request; terms and dry hire guidelines accepted',
        created_at: new Date(Date.now() - 3.8 * 86400000).toISOString()
      },
      {
        id: 'aud_05',
        action: 'HANDOVER_INSPECTION_COMPLETED',
        entity_type: 'handover_checklist',
        entity_id: 'chk_pre_01',
        user_id: 'u_operator_hank',
        details: 'Pre-rental inspection certified: 1,420.5 hrs, fuel 100%, 0 defects. Machine released to field.',
        created_at: new Date(Date.now() - 3 * 86400000).toISOString()
      },
      {
        id: 'aud_06',
        action: 'DAMAGE_REPORT_FILED',
        entity_type: 'damage_report',
        entity_id: 'dmg_01',
        user_id: 'u_owner_vance',
        details: 'Incident filed for bent disc scraper bracket on Sunflower 1436 disc harrow',
        created_at: new Date(Date.now() - 16 * 86400000).toISOString()
      },
      {
        id: 'aud_07',
        action: 'DEPOSIT_DEDUCTION_SETTLED',
        entity_type: 'deposit_ledger',
        entity_id: 'led_05',
        user_id: 'u_admin_sarah',
        details: 'Arbitrated damage settlement: $265 deduction approved, $390 remaining balance released to Joe Higgins',
        created_at: new Date(Date.now() - 15 * 86400000).toISOString()
      }
    ];
  }
}

const localStore = new LocalDataStore();

// Initialize Supabase Client
let supabaseClient = null;
let isLiveSupabase = false;

if (config.isSupabaseConfigured()) {
  try {
    supabaseClient = createClient(config.supabase.url, config.supabase.serviceRoleKey || config.supabase.anonKey, {
      auth: { persistSession: false }
    });
    console.log(`[Database] Supabase client initialized for ${config.supabase.url}`);
    isLiveSupabase = true;
  } catch (err) {
    console.warn(`[Database] Could not connect to Supabase: ${err.message}. Using high-fidelity operational store.`);
    isLiveSupabase = false;
  }
} else {
  console.log(`[Database] Operating with local operational store. Set SUPABASE_URL & SUPABASE_ANON_KEY in .env to connect to live Supabase cloud.`);
}

/**
 * Universal Database Interface
 * Matches Supabase table query syntax or routes through operational store
 */
const db = {
  isLiveSupabase() {
    return isLiveSupabase;
  },

  getStore() {
    return localStore.tables;
  },

  // Log an audit event
  async logAudit(action, entityType, entityId, userId, details) {
    const entry = {
      id: 'aud_' + Math.random().toString(36).substr(2, 9),
      action,
      entity_type: entityType,
      entity_id: entityId,
      user_id: userId,
      details,
      created_at: new Date().toISOString()
    };
    if (isLiveSupabase && supabaseClient) {
      try {
        await supabaseClient.from('audit_logs').insert([entry]);
      } catch (e) {
        console.error('Audit log supabase error:', e.message);
      }
    }
    localStore.tables.audit_logs.unshift(entry);
    return entry;
  },

  // USERS
  async getUsers() {
    if (isLiveSupabase && supabaseClient) {
      const { data, error } = await supabaseClient.from('users').select('*');
      if (!error && data) return data;
    }
    return localStore.tables.users;
  },

  async getUserById(id) {
    if (isLiveSupabase && supabaseClient) {
      const { data, error } = await supabaseClient.from('users').select('*').eq('id', id).single();
      if (!error && data) return data;
    }
    return localStore.tables.users.find(u => u.id === id) || null;
  },

  // EQUIPMENT LISTINGS
  async getListings(filters = {}) {
    let listings = [];
    if (isLiveSupabase && supabaseClient) {
      let query = supabaseClient.from('equipment_listings').select('*').eq('is_active', true);
      if (filters.category) query = query.eq('category', filters.category);
      if (filters.county) query = query.eq('county', filters.county);
      if (filters.owner_id) query = query.eq('owner_id', filters.owner_id);
      const { data, error } = await query;
      if (!error && data) listings = data;
    }

    if (!listings || listings.length === 0) {
      listings = [...localStore.tables.equipment_listings];
      if (filters.category && filters.category !== 'All') {
        listings = listings.filter(l => l.category.toLowerCase() === filters.category.toLowerCase());
      }
      if (filters.county && filters.county !== 'All') {
        listings = listings.filter(l => l.county.toLowerCase() === filters.county.toLowerCase());
      }
      if (filters.owner_id) {
        listings = listings.filter(l => l.owner_id === filters.owner_id);
      }
      if (filters.search) {
        const q = filters.search.toLowerCase();
        listings = listings.filter(l =>
          l.title.toLowerCase().includes(q) ||
          l.make.toLowerCase().includes(q) ||
          l.model.toLowerCase().includes(q) ||
          l.description.toLowerCase().includes(q)
        );
      }
      if (filters.maxPrice) {
        listings = listings.filter(l => Number(l.daily_rate) <= Number(filters.maxPrice));
      }
      if (filters.hireType && filters.hireType !== 'All') {
        listings = listings.filter(l => l.operator_option.includes(filters.hireType) || l.operator_option.includes('Either'));
      }
    }

    // Attach owner details
    const users = await this.getUsers();
    return listings.map(l => ({
      ...l,
      owner: users.find(u => u.id === l.owner_id) || { full_name: 'Farm Owner', farm_name: 'Prairie Acres', county: l.county }
    }));
  },

  async getListingById(id) {
    let listing = null;
    if (isLiveSupabase && supabaseClient) {
      const { data, error } = await supabaseClient.from('equipment_listings').select('*').eq('id', id).single();
      if (!error && data) listing = data;
    }
    if (!listing) {
      listing = localStore.tables.equipment_listings.find(l => l.id === id);
    }
    if (!listing) return null;

    const owner = await this.getUserById(listing.owner_id);
    const windows = localStore.tables.availability_windows.filter(w => w.listing_id === id);
    const existingBookings = localStore.tables.bookings.filter(b => b.listing_id === id && !['cancelled', 'declined'].includes(b.status));

    return {
      ...listing,
      owner,
      availability_windows: windows,
      booked_ranges: existingBookings.map(b => ({ start: b.start_date, end: b.end_date, status: b.status }))
    };
  },

  async createListing(listingData) {
    const newListing = {
      id: 'eq_' + Math.random().toString(36).substr(2, 9),
      operating_hours: 0.0,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...listingData
    };
    if (isLiveSupabase && supabaseClient) {
      try {
        await supabaseClient.from('equipment_listings').insert([newListing]);
      } catch (e) {
        console.error('Supabase createListing error:', e.message);
      }
    }
    localStore.tables.equipment_listings.unshift(newListing);
    await this.logAudit('LISTING_CREATED', 'equipment_listing', newListing.id, newListing.owner_id, `Created listing: ${newListing.title}`);
    return newListing;
  },

  async updateListing(id, updates) {
    const index = localStore.tables.equipment_listings.findIndex(l => l.id === id);
    if (index === -1) return null;
    const updated = {
      ...localStore.tables.equipment_listings[index],
      ...updates,
      updated_at: new Date().toISOString()
    };
    localStore.tables.equipment_listings[index] = updated;

    if (isLiveSupabase && supabaseClient) {
      try {
        await supabaseClient.from('equipment_listings').update(updates).eq('id', id);
      } catch (e) {
        console.error('Supabase updateListing error:', e.message);
      }
    }
    await this.logAudit('LISTING_UPDATED', 'equipment_listing', id, updates.owner_id || 'system', `Updated listing: ${updated.title}`);
    return updated;
  },

  // BOOKINGS
  async getBookings(filters = {}) {
    let bookings = [...localStore.tables.bookings];
    if (filters.renter_id) {
      bookings = bookings.filter(b => b.renter_id === filters.renter_id);
    }
    if (filters.owner_id) {
      const ownerListingIds = localStore.tables.equipment_listings
        .filter(l => l.owner_id === filters.owner_id)
        .map(l => l.id);
      bookings = bookings.filter(b => ownerListingIds.includes(b.listing_id));
    }
    if (filters.status && filters.status !== 'All') {
      bookings = bookings.filter(b => b.status === filters.status);
    }

    // Attach related listings and users
    return bookings.map(b => {
      const listing = localStore.tables.equipment_listings.find(l => l.id === b.listing_id);
      const renter = localStore.tables.users.find(u => u.id === b.renter_id);
      const owner = listing ? localStore.tables.users.find(u => u.id === listing.owner_id) : null;
      const checklists = localStore.tables.handover_checklists.filter(c => c.booking_id === b.id);
      const damageReports = localStore.tables.damage_reports.filter(d => d.booking_id === b.id);
      const ledgerEntries = localStore.tables.deposit_ledger.filter(l => l.booking_id === b.id);

      return {
        ...b,
        listing,
        renter,
        owner,
        checklists,
        damageReports,
        ledgerEntries
      };
    });
  },

  async getBookingById(id) {
    const booking = localStore.tables.bookings.find(b => b.id === id || b.booking_ref === id);
    if (!booking) return null;

    const listing = localStore.tables.equipment_listings.find(l => l.id === booking.listing_id);
    const renter = localStore.tables.users.find(u => u.id === booking.renter_id);
    const owner = listing ? localStore.tables.users.find(u => u.id === listing.owner_id) : null;
    const checklists = localStore.tables.handover_checklists.filter(c => c.booking_id === booking.id);
    const damageReports = localStore.tables.damage_reports.filter(d => d.booking_id === booking.id);
    const ledgerEntries = localStore.tables.deposit_ledger.filter(l => l.booking_id === booking.id);

    return {
      ...booking,
      listing,
      renter,
      owner,
      checklists,
      damageReports,
      ledgerEntries
    };
  },

  // Check for date range collision
  async checkBookingConflict(listingId, startDate, endDate, excludeBookingId = null) {
    const reqStart = new Date(startDate).getTime();
    const reqEnd = new Date(endDate).getTime();

    const activeBookings = localStore.tables.bookings.filter(b =>
      b.listing_id === listingId &&
      !['cancelled', 'declined'].includes(b.status) &&
      (excludeBookingId ? b.id !== excludeBookingId : true)
    );

    for (const b of activeBookings) {
      const bStart = new Date(b.start_date).getTime();
      const bEnd = new Date(b.end_date).getTime();
      // Overlap formula: (StartA <= EndB) and (EndA >= StartB)
      if (reqStart <= bEnd && reqEnd >= bStart) {
        return {
          hasConflict: true,
          conflictingBooking: {
            ref: b.booking_ref,
            start_date: b.start_date,
            end_date: b.end_date,
            status: b.status
          }
        };
      }
    }
    return { hasConflict: false };
  },

  async createBooking(bookingData) {
    // Generate human-friendly reference
    const bookingRef = 'AGRI-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000);
    const newBooking = {
      id: 'bk_' + Math.random().toString(36).substr(2, 9),
      booking_ref: bookingRef,
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...bookingData
    };

    localStore.tables.bookings.unshift(newBooking);

    // Create deposit hold entry in ledger
    if (newBooking.security_deposit_held > 0) {
      const ledgerEntry = {
        id: 'led_' + Math.random().toString(36).substr(2, 9),
        booking_id: newBooking.id,
        user_id: newBooking.renter_id,
        entry_type: 'HOLD',
        amount: Number(newBooking.security_deposit_held),
        balance_after: Number(newBooking.security_deposit_held),
        description: `Security deposit escrow hold for booking ${newBooking.booking_ref}`,
        created_at: new Date().toISOString()
      };
      localStore.tables.deposit_ledger.unshift(ledgerEntry);
    }

    if (isLiveSupabase && supabaseClient) {
      try {
        await supabaseClient.from('bookings').insert([newBooking]);
      } catch (e) {
        console.error('Supabase createBooking error:', e.message);
      }
    }

    await this.logAudit(
      'BOOKING_REQUESTED',
      'booking',
      newBooking.id,
      newBooking.renter_id,
      `Requested booking ${newBooking.booking_ref} (${newBooking.total_days} days, $${newBooking.grand_total})`
    );

    return newBooking;
  },

  async updateBookingStatus(id, newStatus, notes = '', actingUserId = '') {
    const booking = localStore.tables.bookings.find(b => b.id === id);
    if (!booking) return null;

    booking.status = newStatus;
    if (notes) booking.owner_notes = notes;
    booking.updated_at = new Date().toISOString();

    // If cancelled or declined, release deposit hold if held
    if (['cancelled', 'declined'].includes(newStatus)) {
      const activeHolds = localStore.tables.deposit_ledger.filter(l => l.booking_id === id && l.entry_type === 'HOLD');
      if (activeHolds.length > 0) {
        localStore.tables.deposit_ledger.unshift({
          id: 'led_' + Math.random().toString(36).substr(2, 9),
          booking_id: id,
          user_id: booking.renter_id,
          entry_type: 'RELEASE_FULL',
          amount: booking.security_deposit_held,
          balance_after: 0.00,
          description: `Deposit hold cancelled due to booking status change to ${newStatus}`,
          created_at: new Date().toISOString()
        });
      }
    }

    // If completed and no remaining balance or damage, release deposit
    if (newStatus === 'completed') {
      const ledgerEntries = localStore.tables.deposit_ledger.filter(l => l.booking_id === id);
      const hasDeduction = ledgerEntries.some(l => l.entry_type === 'DAMAGE_DEDUCTION');
      const hasRelease = ledgerEntries.some(l => ['RELEASE_FULL', 'RELEASE_PARTIAL'].includes(l.entry_type));

      if (!hasRelease && !hasDeduction) {
        localStore.tables.deposit_ledger.unshift({
          id: 'led_' + Math.random().toString(36).substr(2, 9),
          booking_id: id,
          user_id: booking.renter_id,
          entry_type: 'RELEASE_FULL',
          amount: booking.security_deposit_held,
          balance_after: 0.00,
          description: `Full security deposit escrow release upon booking completion`,
          created_at: new Date().toISOString()
        });
      }
    }

    if (isLiveSupabase && supabaseClient) {
      try {
        await supabaseClient.from('bookings').update({ status: newStatus, owner_notes: notes }).eq('id', id);
      } catch (e) {
        console.error('Supabase updateBookingStatus error:', e.message);
      }
    }

    await this.logAudit(
      `BOOKING_${newStatus.toUpperCase()}`,
      'booking',
      id,
      actingUserId,
      `Booking ${booking.booking_ref} status changed to ${newStatus}`
    );

    return booking;
  },

  // HANDOVER CHECKLISTS
  async createChecklist(checklistData) {
    const newChecklist = {
      id: 'chk_' + Math.random().toString(36).substr(2, 9),
      completed_at: new Date().toISOString(),
      ...checklistData
    };

    // Normalize checklist type
    const isPre = newChecklist.checklist_type === 'pre_rental';
    const isPost = newChecklist.checklist_type === 'post_return' || newChecklist.checklist_type === 'post_rental';
    newChecklist.checklist_type = isPre ? 'pre_rental' : 'post_return';

    localStore.tables.handover_checklists.unshift(newChecklist);

    // Transition booking status based on checklist type
    const booking = localStore.tables.bookings.find(b => b.id === newChecklist.booking_id);
    if (booking) {
      if (isPre) {
        booking.status = 'in_field';
        booking.updated_at = new Date().toISOString();
        await this.logAudit(
          'HANDOVER_PRE_RENTAL_COMPLETED',
          'handover_checklist',
          newChecklist.id,
          newChecklist.signoff_initials,
          `Pre-rental checklist passed. Meter: ${newChecklist.meter_engine_hours} hrs. Equipment released to field.`
        );
      } else if (isPost) {
        booking.status = 'returned';
        booking.updated_at = new Date().toISOString();

        // Process any excess hours or fuel charges
        if (newChecklist.fuel_charge_billed > 0) {
          const currentLedger = localStore.tables.deposit_ledger.filter(l => l.booking_id === booking.id);
          const currentBal = currentLedger.length > 0 ? currentLedger[0].balance_after : booking.security_deposit_held;
          const newBal = Math.max(0, currentBal - newChecklist.fuel_charge_billed);
          localStore.tables.deposit_ledger.unshift({
            id: 'led_' + Math.random().toString(36).substr(2, 9),
            booking_id: booking.id,
            user_id: booking.renter_id,
            entry_type: 'FUEL_PENALTY',
            amount: Number(newChecklist.fuel_charge_billed),
            balance_after: Number(newBal.toFixed(2)),
            description: `Fuel replenishment charge (${newChecklist.fuel_level_pct}% returned vs full standard)`,
            created_at: new Date().toISOString()
          });
        }

        if (newChecklist.excess_hours_billed > 0) {
          const currentLedger = localStore.tables.deposit_ledger.filter(l => l.booking_id === booking.id);
          const currentBal = currentLedger.length > 0 ? currentLedger[0].balance_after : booking.security_deposit_held;
          const listing = localStore.tables.equipment_listings.find(l => l.id === booking.listing_id);
          const fee = Number(newChecklist.excess_hours_billed) * Number(listing ? listing.excess_hour_fee : 45.00);
          const newBal = Math.max(0, currentBal - fee);
          localStore.tables.deposit_ledger.unshift({
            id: 'led_' + Math.random().toString(36).substr(2, 9),
            booking_id: booking.id,
            user_id: booking.renter_id,
            entry_type: 'EXCESS_HOURS_FEE',
            amount: Number(fee.toFixed(2)),
            balance_after: Number(newBal.toFixed(2)),
            description: `Excess operating hours charge (${newChecklist.excess_hours_billed} hrs)`,
            created_at: new Date().toISOString()
          });
        }

        await this.logAudit(
          'HANDOVER_POST_RETURN_COMPLETED',
          'handover_checklist',
          newChecklist.id,
          newChecklist.signoff_initials,
          `Return checklist completed. Final meter: ${newChecklist.meter_engine_hours} hrs. Return fuel: ${newChecklist.fuel_level_pct}%.`
        );
      }
    }

    if (isLiveSupabase && supabaseClient) {
      try {
        await supabaseClient.from('handover_checklists').insert([newChecklist]);
      } catch (e) {
        console.error('Supabase createChecklist error:', e.message);
      }
    }

    return newChecklist;
  },

  // DAMAGE REPORTS
  async getDamageReports() {
    return localStore.tables.damage_reports.map(d => {
      const booking = localStore.tables.bookings.find(b => b.id === d.booking_id);
      const listing = localStore.tables.equipment_listings.find(l => l.id === d.listing_id);
      const reporter = localStore.tables.users.find(u => u.id === d.reported_by_user_id);
      return {
        ...d,
        booking,
        listing,
        reporter
      };
    });
  },

  async createDamageReport(reportData) {
    const newReport = {
      id: 'dmg_' + Math.random().toString(36).substr(2, 9),
      status: 'reported',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...reportData
    };

    localStore.tables.damage_reports.unshift(newReport);

    if (isLiveSupabase && supabaseClient) {
      try {
        await supabaseClient.from('damage_reports').insert([newReport]);
      } catch (e) {
        console.error('Supabase createDamageReport error:', e.message);
      }
    }

    await this.logAudit(
      'DAMAGE_REPORT_FILED',
      'damage_report',
      newReport.id,
      newReport.reported_by_user_id,
      `Damage report filed (${newReport.severity}): ${newReport.incident_description.substring(0, 60)}...`
    );

    return newReport;
  },

  async resolveDamageReport(id, { actual_cost, deducted_from_deposit, resolution_notes, status = 'resolved' }, actingUserId = '') {
    const report = localStore.tables.damage_reports.find(d => d.id === id);
    if (!report) return null;

    report.actual_cost = Number(actual_cost || 0);
    report.deducted_from_deposit = Number(deducted_from_deposit || 0);
    report.resolution_notes = resolution_notes || report.resolution_notes;
    report.status = status;
    report.updated_at = new Date().toISOString();

    // If money was deducted from deposit, write ledger entry
    if (report.deducted_from_deposit > 0) {
      const booking = localStore.tables.bookings.find(b => b.id === report.booking_id);
      if (booking) {
        const currentLedger = localStore.tables.deposit_ledger.filter(l => l.booking_id === booking.id);
        const currentBal = currentLedger.length > 0 ? currentLedger[0].balance_after : booking.security_deposit_held;
        const newBal = Math.max(0, currentBal - report.deducted_from_deposit);

        localStore.tables.deposit_ledger.unshift({
          id: 'led_' + Math.random().toString(36).substr(2, 9),
          booking_id: booking.id,
          user_id: booking.renter_id,
          entry_type: 'DAMAGE_DEDUCTION',
          amount: Number(report.deducted_from_deposit),
          balance_after: Number(newBal.toFixed(2)),
          description: `Damage deduction settled for Report #${report.id}: ${resolution_notes}`,
          created_at: new Date().toISOString()
        });

        // Release remainder if requested
        if (newBal > 0 && status === 'resolved') {
          localStore.tables.deposit_ledger.unshift({
            id: 'led_' + Math.random().toString(36).substr(2, 9),
            booking_id: booking.id,
            user_id: booking.renter_id,
            entry_type: 'RELEASE_PARTIAL',
            amount: Number(newBal.toFixed(2)),
            balance_after: 0.00,
            description: `Remaining deposit balance release to renter after damage repair deduction`,
            created_at: new Date().toISOString()
          });
          booking.status = 'completed';
        }
      }
    }

    await this.logAudit(
      'DAMAGE_REPORT_RESOLVED',
      'damage_report',
      id,
      actingUserId,
      `Damage report #${id} resolved: $${report.deducted_from_deposit} deducted from deposit`
    );

    return report;
  },

  // DEPOSIT LEDGER
  async getDepositLedger(bookingId = null, userId = null) {
    let ledger = [...localStore.tables.deposit_ledger];
    if (bookingId) ledger = ledger.filter(l => l.booking_id === bookingId);
    if (userId) ledger = ledger.filter(l => l.user_id === userId);

    return ledger.map(l => {
      const booking = localStore.tables.bookings.find(b => b.id === l.booking_id);
      const user = localStore.tables.users.find(u => u.id === l.user_id);
      return {
        ...l,
        booking,
        user
      };
    });
  },

  // METRICS & ANALYTICS
  async getPlatformMetrics() {
    const listings = localStore.tables.equipment_listings;
    const bookings = localStore.tables.bookings;
    const damages = localStore.tables.damage_reports;
    const ledger = localStore.tables.deposit_ledger;

    const totalListings = listings.length;
    const activeListings = listings.filter(l => l.is_active).length;
    const totalBookings = bookings.length;
    const inFieldBookings = bookings.filter(b => b.status === 'in_field').length;
    const pendingBookings = bookings.filter(b => b.status === 'pending').length;
    const completedBookings = bookings.filter(b => b.status === 'completed').length;

    // Escrow balance currently held
    const activeBookingIds = bookings.filter(b => ['pending', 'approved', 'confirmed', 'in_field', 'returned'].includes(b.status)).map(b => b.id);
    let escrowHeld = 0;
    for (const bId of activeBookingIds) {
      const latestEntry = ledger.find(l => l.booking_id === bId);
      if (latestEntry) {
        escrowHeld += Number(latestEntry.balance_after);
      }
    }

    const totalRentalRevenue = bookings
      .filter(b => !['declined', 'cancelled'].includes(b.status))
      .reduce((sum, b) => sum + Number(b.rental_total), 0);

    const totalDamageClaims = damages.length;
    const openDamageClaims = damages.filter(d => !['resolved', 'waived'].includes(d.status)).length;

    // Category breakdown
    const categoryCounts = {};
    listings.forEach(l => {
      categoryCounts[l.category] = (categoryCounts[l.category] || 0) + 1;
    });

    return {
      totalListings,
      activeListings,
      totalBookings,
      inFieldBookings,
      pendingBookings,
      completedBookings,
      escrowHeld: Number(escrowHeld.toFixed(2)),
      totalRentalRevenue: Number(totalRentalRevenue.toFixed(2)),
      totalDamageClaims,
      openDamageClaims,
      categoryCounts,
      equipmentUtilizationRate: totalListings > 0 ? Math.round((inFieldBookings / totalListings) * 100) : 0
    };
  },

  // AUDIT LOGS
  async getAuditLogs(limit = 50) {
    return localStore.tables.audit_logs.slice(0, limit);
  }
};

module.exports = db;
