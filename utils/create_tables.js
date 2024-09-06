const createTablesIfNotExists = (db) => {
    if(!db){
        console.log("database is not connected.Aborting");
        return;
    } else {
        db.query(`CREATE TABLE IF NOT EXISTS public.admin(
    admin_id character varying COLLATE pg_catalog."default" NOT NULL,
    email character varying COLLATE pg_catalog."default" NOT NULL,
    password character varying COLLATE pg_catalog."default" NOT NULL,
    CONSTRAINT admin_pkey PRIMARY KEY (admin_id),
    CONSTRAINT admin_email_key UNIQUE (email))`);

        db.query(`CREATE TABLE IF NOT EXISTS public.division_user(
    admin_id character varying(20) COLLATE pg_catalog."default" NOT NULL,
    division_id character varying(20),
    division character(20) COLLATE pg_catalog."default" NOT NULL,
    email character varying(20) COLLATE pg_catalog."default" NOT NULL,
    password character varying(20) COLLATE pg_catalog."default" NOT NULL,
    phone_number bigint NOT NULL,
    CONSTRAINT division_user_pkey PRIMARY KEY (division_id),
    CONSTRAINT division_user_email_key UNIQUE (email),
    CONSTRAINT division_user_phone_number_key UNIQUE (phone_number),
    CONSTRAINT division_user_admin_id_fkey FOREIGN KEY (admin_id)
        REFERENCES public.admin (admin_id) MATCH SIMPLE
        ON UPDATE CASCADE
        ON DELETE CASCADE)`);

        db.query(`CREATE TABLE IF NOT EXISTS public.institution_user(
    division_id character varying(20),
    institution_id character varying(20),
    district character(20) COLLATE pg_catalog."default" NOT NULL,
    taluk character(20) COLLATE pg_catalog."default" NOT NULL,
    institution_name character(20) COLLATE pg_catalog."default" NOT NULL,
    village_or_city character(20) COLLATE pg_catalog."default" NOT NULL,
    pid character varying(20) COLLATE pg_catalog."default",
    khatha_or_property_no character varying(20) COLLATE pg_catalog."default" NOT NULL,
    name_of_khathadar character(20) COLLATE pg_catalog."default" NOT NULL,
    type_of_building character(20) COLLATE pg_catalog."default",
    CONSTRAINT institution_user_pkey PRIMARY KEY (institution_id),
    CONSTRAINT institution_user_khatha_or_property_no_key UNIQUE (khatha_or_property_no),
    CONSTRAINT institution_user_pid_key UNIQUE (pid),
    CONSTRAINT institution_user_division_id_fkey FOREIGN KEY (division_id)
        REFERENCES public.division_user (division_id) MATCH SIMPLE
        ON UPDATE CASCADE
        ON DELETE CASCADE)`);

        db.query(`CREATE TABLE IF NOT EXISTS public.site_user(
    division_id character varying(20),
    site_id character varying(20),
    district character(20) COLLATE pg_catalog."default" NOT NULL,
    taluk character(20) COLLATE pg_catalog."default" NOT NULL,
    site_name character(20) COLLATE pg_catalog."default" NOT NULL,
    village_or_city character(20) COLLATE pg_catalog."default" NOT NULL,
    pid character varying(20) COLLATE pg_catalog."default",
    khatha_or_property_no character varying(20) COLLATE pg_catalog."default" NOT NULL,
    name_of_khathadar character(20) COLLATE pg_catalog."default" NOT NULL,
    type_of_building character(20) COLLATE pg_catalog."default",
    CONSTRAINT site_user_pkey PRIMARY KEY (site_id),
    CONSTRAINT site_user_khatha_or_property_no_key UNIQUE (khatha_or_property_no),
    CONSTRAINT site_user_pid_key UNIQUE (pid),
    CONSTRAINT site_user_division_id_fkey FOREIGN KEY (division_id)
        REFERENCES public.division_user (division_id) MATCH SIMPLE
        ON UPDATE CASCADE
        ON DELETE CASCADE)`);


        db.query(`CREATE TABLE IF NOT EXISTS public.payment_details(
    sl_no SERIAL PRIMARY KEY,
    institution_id character varying(20) COLLATE pg_catalog."default" NOT NULL,
    site_id character varying(20) COLLATE pg_catalog."default" NOT NULL,
    assessment_year integer NOT NULL,
    payment_year integer NOT NULL,
    receipt_no_or_date character varying(20) COLLATE pg_catalog."default" NOT NULL,
    property_tax integer NOT NULL,
    rebate integer NOT NULL,
    service_tax integer NOT NULL,
    dimension_of_vacant_area_sqft integer NOT NULL,
    dimension_of_building_area_sqft integer NOT NULL,
    total_dimension_in_sqft integer NOT NULL,
    to_which_department_paid character(20) COLLATE pg_catalog."default" NOT NULL,
    cesses integer NOT NULL,
    interest integer NOT NULL,
    total_amount integer NOT NULL,
    remarks character varying(10) COLLATE pg_catalog."default" NOT NULL,
    CONSTRAINT payment_details_receipt_no_or_date_key UNIQUE (receipt_no_or_date),
    CONSTRAINT payment_details_site_id_key UNIQUE (site_id),
    CONSTRAINT payment_details_institution_id_fkey FOREIGN KEY (institution_id)
        REFERENCES public.institution_user (institution_id) MATCH SIMPLE
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT payment_details_site_id_fkey FOREIGN KEY (site_id)
        REFERENCES public.site_user (site_id) MATCH SIMPLE
        ON UPDATE CASCADE
        ON DELETE CASCADE)`);

        db.query(`CREATE TABLE IF NOT EXISTS public.bills(
    sl_no integer NOT NULL,
    filename character varying(255) COLLATE pg_catalog."default" NOT NULL,
    filetype character varying(50) COLLATE pg_catalog."default",
    data bytea,
    uploaded_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT bills_sl_no_fkey FOREIGN KEY (sl_no)
        REFERENCES public.payment_details (sl_no) MATCH SIMPLE
        ON UPDATE CASCADE
        ON DELETE CASCADE)`);

    console.log("tables created successfully");
    }
}

export default createTablesIfNotExists;