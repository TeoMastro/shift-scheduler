-- Factory Test Data
-- This script creates a complete dataset for testing shift scheduling
-- Company: Manufacturing Factory with 24-hour operations and 20 employees
-- Includes: Company, Users (1 Admin, 1 Manager, 18 Employees), Skills, Shift Types (3x8-hour shifts), User Skills, Preferences, and Unavailable Dates

-- Clear existing data (if any)
TRUNCATE TABLE "shift_date_preference" CASCADE;
TRUNCATE TABLE "unavailable_date" CASCADE;
TRUNCATE TABLE "user_has_skill" CASCADE;
TRUNCATE TABLE "shift_type_has_skill" CASCADE;
TRUNCATE TABLE "skill" CASCADE;
TRUNCATE TABLE "shift_type" CASCADE;
TRUNCATE TABLE "user" CASCADE;
TRUNCATE TABLE "company" CASCADE;

-- Insert Company
INSERT INTO "company" (id, name, created_at, updated_at) VALUES
(1, 'Premium Manufacturing Factory', NOW(), NOW());

-- Insert Users (1 Admin, 1 Manager, 18 Employees)
-- All users have password: demouser!1
-- Admin User (id: 1) - No company_id (system admin)
INSERT INTO "user" (id, first_name, last_name, email, password, role, status, created_at, updated_at) VALUES
(1, 'Admin', 'User', 'admin@nextlaunchkit.com', '$2b$12$ENNnfOwSsICRPVJ4i6cbVO0evS6HLIJyiObdAWwJ3fcX/DusJL.xm', 'ADMIN', 'ACTIVE', NOW(), NOW());

-- Manager User (id: 2)
INSERT INTO "user" (id, first_name, last_name, email, password, role, status, company_id, created_at, updated_at) VALUES
(2, 'Teo', 'Mastro', 'teomastro1999@gmail.com', '$2b$12$ENNnfOwSsICRPVJ4i6cbVO0evS6HLIJyiObdAWwJ3fcX/DusJL.xm', 'MANAGER', 'ACTIVE', 1, NOW(), NOW());

-- Employee Users (ids: 3-21)
INSERT INTO "user" (id, first_name, last_name, email, password, role, status, company_id, created_at, updated_at) VALUES
(3, 'Sarah', 'Johnson', 'sarah.johnson@factory.com', '$2b$12$ENNnfOwSsICRPVJ4i6cbVO0evS6HLIJyiObdAWwJ3fcX/DusJL.xm', 'EMPLOYEE', 'ACTIVE', 1, NOW(), NOW()),
(4, 'Michael', 'Chen', 'michael.chen@factory.com', '$2b$12$ENNnfOwSsICRPVJ4i6cbVO0evS6HLIJyiObdAWwJ3fcX/DusJL.xm', 'EMPLOYEE', 'ACTIVE', 1, NOW(), NOW()),
(5, 'Emily', 'Rodriguez', 'emily.rodriguez@factory.com', '$2b$12$ENNnfOwSsICRPVJ4i6cbVO0evS6HLIJyiObdAWwJ3fcX/DusJL.xm', 'EMPLOYEE', 'ACTIVE', 1, NOW(), NOW()),
(6, 'David', 'Kim', 'david.kim@factory.com', '$2b$12$ENNnfOwSsICRPVJ4i6cbVO0evS6HLIJyiObdAWwJ3fcX/DusJL.xm', 'EMPLOYEE', 'ACTIVE', 1, NOW(), NOW()),
(7, 'Jessica', 'Taylor', 'jessica.taylor@factory.com', '$2b$12$ENNnfOwSsICRPVJ4i6cbVO0evS6HLIJyiObdAWwJ3fcX/DusJL.xm', 'EMPLOYEE', 'ACTIVE', 1, NOW(), NOW()),
(8, 'James', 'Anderson', 'james.anderson@factory.com', '$2b$12$ENNnfOwSsICRPVJ4i6cbVO0evS6HLIJyiObdAWwJ3fcX/DusJL.xm', 'EMPLOYEE', 'ACTIVE', 1, NOW(), NOW()),
(9, 'Lisa', 'Martinez', 'lisa.martinez@factory.com', '$2b$12$ENNnfOwSsICRPVJ4i6cbVO0evS6HLIJyiObdAWwJ3fcX/DusJL.xm', 'EMPLOYEE', 'ACTIVE', 1, NOW(), NOW()),
(10, 'Robert', 'Brown', 'robert.brown@factory.com', '$2b$12$ENNnfOwSsICRPVJ4i6cbVO0evS6HLIJyiObdAWwJ3fcX/DusJL.xm', 'EMPLOYEE', 'ACTIVE', 1, NOW(), NOW()),
(11, 'Amanda', 'Wilson', 'amanda.wilson@factory.com', '$2b$12$ENNnfOwSsICRPVJ4i6cbVO0evS6HLIJyiObdAWwJ3fcX/DusJL.xm', 'EMPLOYEE', 'ACTIVE', 1, NOW(), NOW()),
(12, 'Daniel', 'Lee', 'daniel.lee@factory.com', '$2b$12$ENNnfOwSsICRPVJ4i6cbVO0evS6HLIJyiObdAWwJ3fcX/DusJL.xm', 'EMPLOYEE', 'ACTIVE', 1, NOW(), NOW()),
(13, 'Rachel', 'Garcia', 'rachel.garcia@factory.com', '$2b$12$ENNnfOwSsICRPVJ4i6cbVO0evS6HLIJyiObdAWwJ3fcX/DusJL.xm', 'EMPLOYEE', 'ACTIVE', 1, NOW(), NOW()),
(14, 'Christopher', 'Thompson', 'christopher.thompson@factory.com', '$2b$12$ENNnfOwSsICRPVJ4i6cbVO0evS6HLIJyiObdAWwJ3fcX/DusJL.xm', 'EMPLOYEE', 'ACTIVE', 1, NOW(), NOW()),
(15, 'Jennifer', 'White', 'jennifer.white@factory.com', '$2b$12$ENNnfOwSsICRPVJ4i6cbVO0evS6HLIJyiObdAWwJ3fcX/DusJL.xm', 'EMPLOYEE', 'ACTIVE', 1, NOW(), NOW()),
(16, 'Matthew', 'Harris', 'matthew.harris@factory.com', '$2b$12$ENNnfOwSsICRPVJ4i6cbVO0evS6HLIJyiObdAWwJ3fcX/DusJL.xm', 'EMPLOYEE', 'ACTIVE', 1, NOW(), NOW()),
(17, 'Ashley', 'Clark', 'ashley.clark@factory.com', '$2b$12$ENNnfOwSsICRPVJ4i6cbVO0evS6HLIJyiObdAWwJ3fcX/DusJL.xm', 'EMPLOYEE', 'ACTIVE', 1, NOW(), NOW()),
(18, 'Joshua', 'Lewis', 'joshua.lewis@factory.com', '$2b$12$ENNnfOwSsICRPVJ4i6cbVO0evS6HLIJyiObdAWwJ3fcX/DusJL.xm', 'EMPLOYEE', 'ACTIVE', 1, NOW(), NOW()),
(19, 'Nicole', 'Walker', 'nicole.walker@factory.com', '$2b$12$ENNnfOwSsICRPVJ4i6cbVO0evS6HLIJyiObdAWwJ3fcX/DusJL.xm', 'EMPLOYEE', 'ACTIVE', 1, NOW(), NOW()),
(20, 'Andrew', 'Hall', 'andrew.hall@factory.com', '$2b$12$ENNnfOwSsICRPVJ4i6cbVO0evS6HLIJyiObdAWwJ3fcX/DusJL.xm', 'EMPLOYEE', 'ACTIVE', 1, NOW(), NOW()),
(21, 'Megan', 'Allen', 'megan.allen@factory.com', '$2b$12$ENNnfOwSsICRPVJ4i6cbVO0evS6HLIJyiObdAWwJ3fcX/DusJL.xm', 'EMPLOYEE', 'ACTIVE', 1, NOW(), NOW());

-- Insert Skills (Manufacturing Factory specific - 5 total)
INSERT INTO "skill" (id, name, company_id, created_at, updated_at) VALUES
(1, 'Machine Operation', 1, NOW(), NOW()),
(2, 'Quality Control', 1, NOW(), NOW()),
(3, 'Assembly Line', 1, NOW(), NOW()),
(4, 'Forklift Certified', 1, NOW(), NOW()),
(5, 'Maintenance', 1, NOW(), NOW());

-- Insert Shift Types (3 x 8-hour shifts covering 24 hours)
INSERT INTO "shift_type" (id, name, start_time, end_time, company_id, created_at, updated_at) VALUES
(1, 'Morning Shift', '06:00:00', '14:00:00', 1, NOW(), NOW()),
(2, 'Afternoon Shift', '14:00:00', '22:00:00', 1, NOW(), NOW()),
(3, 'Night Shift', '22:00:00', '06:00:00', 1, NOW(), NOW());

-- Link Skills to Shift Types
-- Morning and Afternoon shifts require 2 skills, Night shift requires 1 skill
INSERT INTO "shift_type_has_skill" (shift_type_id, skill_id, created_at) VALUES
-- Morning Shift (06:00-14:00): Requires 2 skills
(1, 1, NOW()),  -- Machine Operation
(1, 2, NOW()),  -- Quality Control
-- Afternoon Shift (14:00-22:00): Requires 2 skills
(2, 3, NOW()),  -- Assembly Line
(2, 4, NOW()),  -- Forklift Certified
-- Night Shift (22:00-06:00): Requires 1 skill
(3, 5, NOW());  -- Maintenance

-- Assign Skills to Users (1-3 skills per employee)
-- Manager (user_id: 2)
INSERT INTO "user_has_skill" (user_id, skill_id, created_at) VALUES
(2, 1, NOW()),
(2, 2, NOW()),
(2, 5, NOW());

-- Employees with varied skill combinations (using only 5 skills)
INSERT INTO "user_has_skill" (user_id, skill_id, created_at) VALUES
-- Sarah Johnson (id: 3) - Machine Operation & Quality Control
(3, 1, NOW()),
(3, 2, NOW()),
-- Michael Chen (id: 4) - Assembly Line & Forklift
(4, 3, NOW()),
(4, 4, NOW()),
-- Emily Rodriguez (id: 5) - Quality Control & Machine Operation
(5, 2, NOW()),
(5, 1, NOW()),
(5, 3, NOW()),
-- David Kim (id: 6) - Forklift & Assembly Line
(6, 4, NOW()),
(6, 3, NOW()),
-- Jessica Taylor (id: 7) - Machine Operation & Assembly Line
(7, 1, NOW()),
(7, 3, NOW()),
(7, 2, NOW()),
-- James Anderson (id: 8) - Maintenance
(8, 5, NOW()),
(8, 1, NOW()),
-- Lisa Martinez (id: 9) - Machine Operation & Quality Control
(9, 1, NOW()),
(9, 2, NOW()),
-- Robert Brown (id: 10) - Assembly Line & Forklift
(10, 3, NOW()),
(10, 4, NOW()),
-- Amanda Wilson (id: 11) - Machine Operation & Quality Control
(11, 1, NOW()),
(11, 2, NOW()),
(11, 5, NOW()),
-- Daniel Lee (id: 12) - Quality Control & Assembly Line
(12, 2, NOW()),
(12, 3, NOW()),
-- Rachel Garcia (id: 13) - Machine Operation & Forklift
(13, 1, NOW()),
(13, 4, NOW()),
-- Christopher Thompson (id: 14) - Maintenance & Machine Operation
(14, 5, NOW()),
(14, 1, NOW()),
(14, 2, NOW()),
-- Jennifer White (id: 15) - Assembly Line & Quality Control
(15, 3, NOW()),
(15, 2, NOW()),
-- Matthew Harris (id: 16) - Forklift & Assembly Line
(16, 4, NOW()),
(16, 3, NOW()),
-- Ashley Clark (id: 17) - Machine Operation & Quality Control
(17, 1, NOW()),
(17, 2, NOW()),
(17, 4, NOW()),
-- Joshua Lewis (id: 18) - Maintenance
(18, 5, NOW()),
(18, 3, NOW()),
-- Nicole Walker (id: 19) - Quality Control & Forklift
(19, 2, NOW()),
(19, 4, NOW()),
(19, 1, NOW()),
-- Andrew Hall (id: 20) - Machine Operation & Assembly Line
(20, 1, NOW()),
(20, 3, NOW()),
-- Megan Allen (id: 21) - Assembly Line & Quality Control
(21, 3, NOW()),
(21, 2, NOW()),
(21, 4, NOW());

-- Insert Shift Date Preferences (mix of desired and undesired dates)
-- December 1, 2024 to January 31, 2025
INSERT INTO "shift_date_preference" (user_id, date, preference_type, created_at, updated_at) VALUES
-- Sarah Johnson preferences
(3, '2024-12-05', 'DESIRED', NOW(), NOW()),
(3, '2024-12-15', 'DESIRED', NOW(), NOW()),
(3, '2024-12-20', 'UNDESIRED', NOW(), NOW()),
(3, '2025-01-10', 'DESIRED', NOW(), NOW()),
(3, '2025-01-25', 'UNDESIRED', NOW(), NOW()),
-- Michael Chen preferences
(4, '2024-12-03', 'DESIRED', NOW(), NOW()),
(4, '2024-12-14', 'DESIRED', NOW(), NOW()),
(4, '2024-12-21', 'UNDESIRED', NOW(), NOW()),
(4, '2024-12-28', 'DESIRED', NOW(), NOW()),
(4, '2025-01-15', 'DESIRED', NOW(), NOW()),
-- Emily Rodriguez preferences
(5, '2024-12-08', 'DESIRED', NOW(), NOW()),
(5, '2024-12-17', 'DESIRED', NOW(), NOW()),
(5, '2024-12-25', 'UNDESIRED', NOW(), NOW()),
(5, '2025-01-05', 'DESIRED', NOW(), NOW()),
(5, '2025-01-20', 'UNDESIRED', NOW(), NOW()),
-- David Kim preferences
(6, '2024-12-02', 'UNDESIRED', NOW(), NOW()),
(6, '2024-12-15', 'UNDESIRED', NOW(), NOW()),
(6, '2024-12-22', 'DESIRED', NOW(), NOW()),
(6, '2025-01-12', 'DESIRED', NOW(), NOW()),
(6, '2025-01-28', 'DESIRED', NOW(), NOW()),
-- Jessica Taylor preferences
(7, '2024-12-06', 'DESIRED', NOW(), NOW()),
(7, '2024-12-14', 'DESIRED', NOW(), NOW()),
(7, '2024-12-21', 'DESIRED', NOW(), NOW()),
(7, '2024-12-27', 'UNDESIRED', NOW(), NOW()),
(7, '2025-01-18', 'DESIRED', NOW(), NOW()),
-- James Anderson preferences
(8, '2024-12-09', 'DESIRED', NOW(), NOW()),
(8, '2024-12-16', 'DESIRED', NOW(), NOW()),
(8, '2024-12-23', 'UNDESIRED', NOW(), NOW()),
(8, '2025-01-08', 'DESIRED', NOW(), NOW()),
(8, '2025-01-22', 'UNDESIRED', NOW(), NOW()),
-- Lisa Martinez preferences
(9, '2024-12-04', 'DESIRED', NOW(), NOW()),
(9, '2024-12-19', 'DESIRED', NOW(), NOW()),
(9, '2024-12-26', 'UNDESIRED', NOW(), NOW()),
(9, '2025-01-14', 'DESIRED', NOW(), NOW()),
(9, '2025-01-30', 'DESIRED', NOW(), NOW()),
-- Robert Brown preferences
(10, '2024-12-07', 'DESIRED', NOW(), NOW()),
(10, '2024-12-15', 'DESIRED', NOW(), NOW()),
(10, '2024-12-20', 'DESIRED', NOW(), NOW()),
(10, '2025-01-11', 'UNDESIRED', NOW(), NOW()),
(10, '2025-01-24', 'DESIRED', NOW(), NOW()),
-- Amanda Wilson preferences
(11, '2024-12-01', 'DESIRED', NOW(), NOW()),
(11, '2024-12-17', 'UNDESIRED', NOW(), NOW()),
(11, '2024-12-24', 'UNDESIRED', NOW(), NOW()),
(11, '2025-01-09', 'DESIRED', NOW(), NOW()),
(11, '2025-01-27', 'UNDESIRED', NOW(), NOW()),
-- Daniel Lee preferences
(12, '2024-12-10', 'DESIRED', NOW(), NOW()),
(12, '2024-12-14', 'DESIRED', NOW(), NOW()),
(12, '2024-12-28', 'DESIRED', NOW(), NOW()),
(12, '2025-01-06', 'UNDESIRED', NOW(), NOW()),
(12, '2025-01-19', 'DESIRED', NOW(), NOW()),
-- Rachel Garcia preferences
(13, '2024-12-11', 'DESIRED', NOW(), NOW()),
(13, '2024-12-18', 'DESIRED', NOW(), NOW()),
(13, '2024-12-25', 'UNDESIRED', NOW(), NOW()),
(13, '2025-01-13', 'DESIRED', NOW(), NOW()),
(13, '2025-01-29', 'UNDESIRED', NOW(), NOW()),
-- Christopher Thompson preferences
(14, '2024-12-05', 'DESIRED', NOW(), NOW()),
(14, '2024-12-16', 'DESIRED', NOW(), NOW()),
(14, '2024-12-23', 'DESIRED', NOW(), NOW()),
(14, '2025-01-07', 'UNDESIRED', NOW(), NOW()),
(14, '2025-01-21', 'DESIRED', NOW(), NOW()),
-- Jennifer White preferences
(15, '2024-12-12', 'DESIRED', NOW(), NOW()),
(15, '2024-12-19', 'UNDESIRED', NOW(), NOW()),
(15, '2024-12-26', 'DESIRED', NOW(), NOW()),
(15, '2025-01-16', 'DESIRED', NOW(), NOW()),
(15, '2025-01-31', 'UNDESIRED', NOW(), NOW()),
-- Matthew Harris preferences
(16, '2024-12-03', 'DESIRED', NOW(), NOW()),
(16, '2024-12-15', 'DESIRED', NOW(), NOW()),
(16, '2024-12-22', 'UNDESIRED', NOW(), NOW()),
(16, '2025-01-04', 'DESIRED', NOW(), NOW()),
(16, '2025-01-17', 'DESIRED', NOW(), NOW()),
-- Ashley Clark preferences
(17, '2024-12-08', 'DESIRED', NOW(), NOW()),
(17, '2024-12-17', 'DESIRED', NOW(), NOW()),
(17, '2024-12-24', 'DESIRED', NOW(), NOW()),
(17, '2025-01-12', 'UNDESIRED', NOW(), NOW()),
(17, '2025-01-26', 'DESIRED', NOW(), NOW()),
-- Joshua Lewis preferences
(18, '2024-12-02', 'UNDESIRED', NOW(), NOW()),
(18, '2024-12-14', 'UNDESIRED', NOW(), NOW()),
(18, '2024-12-21', 'DESIRED', NOW(), NOW()),
(18, '2025-01-03', 'DESIRED', NOW(), NOW()),
(18, '2025-01-23', 'DESIRED', NOW(), NOW()),
-- Nicole Walker preferences
(19, '2024-12-06', 'DESIRED', NOW(), NOW()),
(19, '2024-12-18', 'DESIRED', NOW(), NOW()),
(19, '2024-12-27', 'UNDESIRED', NOW(), NOW()),
(19, '2025-01-15', 'UNDESIRED', NOW(), NOW()),
(19, '2025-01-28', 'DESIRED', NOW(), NOW()),
-- Andrew Hall preferences
(20, '2024-12-09', 'DESIRED', NOW(), NOW()),
(20, '2024-12-16', 'DESIRED', NOW(), NOW()),
(20, '2024-12-23', 'UNDESIRED', NOW(), NOW()),
(20, '2025-01-11', 'DESIRED', NOW(), NOW()),
(20, '2025-01-25', 'UNDESIRED', NOW(), NOW()),
-- Megan Allen preferences
(21, '2024-12-01', 'UNDESIRED', NOW(), NOW()),
(21, '2024-12-20', 'DESIRED', NOW(), NOW()),
(21, '2024-12-28', 'DESIRED', NOW(), NOW()),
(21, '2025-01-08', 'DESIRED', NOW(), NOW()),
(21, '2025-01-22', 'DESIRED', NOW(), NOW());

-- Insert Unavailable Dates (various leave types)
-- December 1, 2024 to January 31, 2025
INSERT INTO "unavailable_date" (user_id, start_date, end_date, leave_type, reason, created_at, updated_at) VALUES
-- Early December leaves
(4, '2024-12-02', '2024-12-03', 'SICK_LEAVE', 'Medical appointment', NOW(), NOW()),
(10, '2024-12-05', '2024-12-05', 'SICK_LEAVE', 'Doctor visit', NOW(), NOW()),
(18, '2024-12-06', '2024-12-07', 'PERSONAL_LEAVE', 'Family event', NOW(), NOW()),
-- Mid December leaves
(7, '2024-12-12', '2024-12-13', 'PERSONAL_LEAVE', 'Personal matter', NOW(), NOW()),
(15, '2024-12-14', '2024-12-14', 'PERSONAL_LEAVE', 'Family commitment', NOW(), NOW()),
(19, '2024-12-16', '2024-12-17', 'PERSONAL_LEAVE', 'Personal days', NOW(), NOW()),
-- Christmas vacation (various lengths)
(3, '2024-12-23', '2024-12-26', 'VACATION', 'Christmas holiday with family', NOW(), NOW()),
(5, '2024-12-22', '2024-12-27', 'VACATION', 'Extended Christmas break', NOW(), NOW()),
(8, '2024-12-24', '2024-12-25', 'VACATION', 'Christmas', NOW(), NOW()),
(11, '2024-12-23', '2024-12-25', 'VACATION', 'Christmas holiday', NOW(), NOW()),
(13, '2024-12-24', '2024-12-26', 'VACATION', 'Christmas with family', NOW(), NOW()),
(16, '2024-12-21', '2024-12-26', 'VACATION', 'Christmas vacation', NOW(), NOW()),
-- New Year vacation
(6, '2024-12-30', '2025-01-03', 'VACATION', 'New Year celebration and rest', NOW(), NOW()),
(9, '2024-12-31', '2025-01-02', 'VACATION', 'New Year holiday', NOW(), NOW()),
(14, '2024-12-29', '2025-01-02', 'VACATION', 'End of year break', NOW(), NOW()),
(20, '2024-12-28', '2025-01-01', 'UNPAID_LEAVE', 'Personal reasons', NOW(), NOW()),
-- Early January leaves
(4, '2025-01-06', '2025-01-08', 'SICK_LEAVE', 'Flu recovery', NOW(), NOW()),
(12, '2025-01-07', '2025-01-07', 'OTHER', 'Moving house', NOW(), NOW()),
(17, '2025-01-09', '2025-01-10', 'PERSONAL_LEAVE', 'Home repairs', NOW(), NOW()),
-- Mid January leaves
(7, '2025-01-13', '2025-01-15', 'VACATION', 'Winter break', NOW(), NOW()),
(10, '2025-01-14', '2025-01-17', 'VACATION', 'Mid-winter vacation', NOW(), NOW()),
(21, '2025-01-16', '2025-01-17', 'PERSONAL_LEAVE', 'Family visit', NOW(), NOW()),
-- Late January leaves
(3, '2025-01-20', '2025-01-22', 'VACATION', 'Short winter trip', NOW(), NOW()),
(11, '2025-01-21', '2025-01-24', 'VACATION', 'Week getaway', NOW(), NOW()),
(15, '2025-01-23', '2025-01-23', 'SICK_LEAVE', 'Medical checkup', NOW(), NOW()),
(18, '2025-01-25', '2025-01-26', 'PERSONAL_LEAVE', 'Personal matters', NOW(), NOW()),
(19, '2025-01-27', '2025-01-31', 'VACATION', 'End of month vacation', NOW(), NOW()),
(8, '2025-01-29', '2025-01-30', 'OTHER', 'Professional development course', NOW(), NOW());

-- Reset sequence counters
SELECT setval(pg_get_serial_sequence('company', 'id'), (SELECT MAX(id) FROM "company"));
SELECT setval(pg_get_serial_sequence('user', 'id'), (SELECT MAX(id) FROM "user"));
SELECT setval(pg_get_serial_sequence('skill', 'id'), (SELECT MAX(id) FROM "skill"));
SELECT setval(pg_get_serial_sequence('shift_type', 'id'), (SELECT MAX(id) FROM "shift_type"));

-- Summary Query (optional - comment out if not needed)
SELECT 
    'Company' as entity, 
    COUNT(*) as count 
FROM "company"
UNION ALL
SELECT 'Users (Total)', COUNT(*) FROM "user"
UNION ALL
SELECT 'Users (Admin)', COUNT(*) FROM "user" WHERE role = 'ADMIN'
UNION ALL
SELECT 'Users (Manager)', COUNT(*) FROM "user" WHERE role = 'MANAGER'
UNION ALL
SELECT 'Users (Employee)', COUNT(*) FROM "user" WHERE role = 'EMPLOYEE'
UNION ALL
SELECT 'Skills', COUNT(*) FROM "skill"
UNION ALL
SELECT 'Shift Types', COUNT(*) FROM "shift_type"
UNION ALL
SELECT 'User Skills', COUNT(*) FROM "user_has_skill"
UNION ALL
SELECT 'Shift Type Skills', COUNT(*) FROM "shift_type_has_skill"
UNION ALL
SELECT 'Date Preferences', COUNT(*) FROM "shift_date_preference"
UNION ALL
SELECT 'Unavailable Dates', COUNT(*) FROM "unavailable_date";