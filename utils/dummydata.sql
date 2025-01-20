-- WARNING: DANGEROUS!!! DELETEs AND RESETs THE ENTIRE DATABASE
-- ONLY FOR DEVELOPMENT PURPOSES. REMOVE THIS FILE AND CODE IN PRODUCTION
-- -- DROP SCHEMA public CASCADE;
-- -- CREATE SCHEMA public;
-- -- GRANT ALL ON SCHEMA public TO postgres;
-- -- GRANT ALL ON SCHEMA public TO public;
-- -- COMMENT ON SCHEMA public IS 'standard public schema';



-- INSERT INTO admins (email, password) VALUES ('admin.jssmvp@jssonline.com', 'jssmvp123');

INSERT INTO division_users (admin_id,division_id,division,email,password,phone_number) 
VALUES(1,'CED','College Education Division','ced@jssonline.org','Ced123',9999887654);
INSERT INTO division_users (admin_id,division_id,division,email,password,phone_number) 
VALUES(1,'PSD','Public School Division','psd@jssonline.org','Psd123',8871625321);

INSERT INTO public.institution_users (
    division_id, email, password, phone_number, institution_id, country, state, district, taluk, institution_name, village_or_city, pid, khatha_or_property_no, name_of_khathadar, type_of_building
) VALUES (
    'CED', 'principal.sjce@jssonline.org', 'Sjce123', 9876543210, 'SJCE', 'India', 'Karnataka', 'Mysuru', 'Mysuru', 'Sri Jayachamarajendra College of Engineering, Mysore', 'Mysuru', 'PIID22', 'X981UI', 'President, JSS Mahavidyapeeta', 'RCC'
),
(
    'PSD', 'principal.jssps@jssonline.org', 'Jssps123', 9878843291, 'JSSPS', 'India', 'Karnataka', 'Mysuru', 'Mysuru', 'JSS Public School, Mysore', 'Mysuru', 'PIID23', 'UP789UI', 'President, JSS Mahavidyapeeta', 'RCC'
);