-- WARNING: DANGEROUS!!! DELETEs AND RESETs THE ENTIRE DATABASE
-- ONLY FOR DEVELOPMENT PURPOSES. REMOVE THIS FILE AND CODE IN PRODUCTION
-- -- DROP SCHEMA public CASCADE;
-- -- CREATE SCHEMA public;
-- -- GRANT ALL ON SCHEMA public TO postgres;
-- -- GRANT ALL ON SCHEMA public TO public;
-- -- COMMENT ON SCHEMA public IS 'standard public schema';



INSERT INTO admins (email, password) VALUES ('admin@admin.com', 'yolo');

INSERT INTO division_users (admin_id,division_id,division,email,password,phone_number) 
VALUES(1,'1','JSSSTU','johndoe2@example.com','JohnDoe2@','9999887654');
INSERT INTO division_users (admin_id,division_id,division,email,password,phone_number) 
VALUES(1,'2','JSSPDA','johndoe@example.com','JohnDoe123!','8871625321');

INSERT INTO institution_users (
    division_id,
    email,
    password,
    phone_number,
    institution_id,
    country,
    state,
    district,
    taluk,
    institution_name,
    village_or_city,
    pid,
    khatha_or_property_no,
    name_of_khathadar,
    type_of_building
) VALUES (
    '1',
    'manjunath.goldenjubilee@example.com',
    'ax781sibis',
    '9999887654',
    'GLDNJBLEE',
    'India',
    'Karnataka',
    'Mysuru',
    'Mysuru',
    'GoldenJubilee Building',
    'Mysuru',
    'pid001',
    'khatha001',
    'Manjunath S',
    'Academic Building'
), (
    '2',
    'jane.smith@example.com',
    'noashciu21is',
    '8871625321',
    'PDABLDG',
    'India',
    'Karnataka',
    'Mysuru',
    'Mysuru',
    'Polytechnic',
    'Mysuru',
    'pid002',
    'khatha002',
    'Shrusti M',
    'Academic Building'
);

INSERT INTO site_users (
    division_id,
    email,
    password,
    phone_number,
    site_id,
    country,
    state,
    district,
    taluk,
    site_name,
    village_or_city,
    pid,
    khatha_or_property_no,
    name_of_khathadar,
    type_of_building
) VALUES (
    '1',
    'sita.goldenjubilee@example.com',
    'sioasioshd',
    '9999887654',
    'SITEGLDNJBLEE',
    'India',
    'Karnataka',
    'Mysuru',
    'Mysuru',
    'GoldenJubilee Site',
    'Mysuru',
    'pid001',
    'khatha001',
    'Sita R',
    'Site for GLDNJBLEE'
), (
    '2',
    'sandy.smith@example.com',
    'usiudaisada',
    '8871625321',
    'PDASITE',
    'India',
    'Karnataka',
    'Mysuru',
    'Mysuru',
    'Polytechnic Site',
    'Mysuru',
    'pid002',
    'khatha002',
    'Sandy Smith',
    'Site for PDABLDG'
);

INSERT INTO institution_payment_details (
    institution_id,
    assessment_year,
    payment_year,
    receipt_no_or_date,
    property_tax,
    rebate,
    service_tax,
    dimension_of_vacant_area_sqft,
    dimension_of_building_area_sqft,
    total_dimension_in_sqft,
    to_which_department_paid,
    cesses,
    interest,
    total_amount,
    remarks
) VALUES (
    'GLDNJBLEE',
    2021,
    2022,
    'receipt001',
    5000,
    500,
    300,
    1000,
    2000,
    3000,
    'MCC',
    200,
    50,
    6050,
    'Paid'
), (
    'PDABLDG',
    2019,
    2020,
    'receipt003',
    6000,
    600,
    350,
    1200,
    2200,
    3400,
    'BMTC',
    220,
    60,
    7230,
    'Paid'
);

INSERT INTO site_payment_details (
    site_id,
    assessment_year,
    payment_year,
    receipt_no_or_date,
    property_tax,
    rebate,
    service_tax,
    dimension_of_vacant_area_sqft,
    dimension_of_building_area_sqft,
    total_dimension_in_sqft,
    to_which_department_paid,
    cesses,
    interest,
    total_amount,
    remarks
) VALUES (
    'SITEGLDNJBLEE',
    2021,
    2022,
    'receipt001',
    50710,
    580,
    300,
    6900,
    6900,
    6900,
    'MCC',
    200,
    50,
    6050,
    'Paid'
), (
    'PDASITE',
    2019,
    2020,
    'receipt003',
    89100,
    6020,
    350,
    1200,
    2200,
    3400,
    'BMTC',
    220,
    60,
    7230,
    'Paid'
);
