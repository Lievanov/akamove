--
-- PostgreSQL database dump
--

\restrict CF8BC002DXh0beX8wAmFkdb5ZjYwB3zyE0OF7gjQFJ4v8QUcvOEdj8AzhnpidFm

-- Dumped from database version 15.8
-- Dumped by pg_dump version 16.13 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
begin
  insert into public.profiles (id, full_name, avatar_url, email)
  values (
    new.id, 
    new.raw_user_meta_data->>'full_name', 
    new.raw_user_meta_data->>'avatar_url',
    new.raw_user_meta_data->>'email'
    );
  return new;
end;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: payment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid NOT NULL,
    classes uuid[] NOT NULL,
    payment_method text,
    payment_amount numeric,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    period_id uuid DEFAULT gen_random_uuid() NOT NULL,
    notes text,
    is_dropout boolean,
    is_credit boolean DEFAULT false
);


--
-- Name: period; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.period (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    start_date date,
    end_date date,
    classes uuid[],
    prices numeric[],
    name text,
    is_current boolean
);


--
-- Name: student; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.student (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    date_of_birth date,
    email text,
    phone text,
    notes text,
    is_active boolean DEFAULT true,
    classes uuid[],
    credit real,
    CONSTRAINT student_credit_check CHECK ((credit >= (0.0)::double precision))
);


--
-- Name: TABLE student; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.student IS 'students table';


--
-- Name: COLUMN student.credit; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.student.credit IS 'credit';


--
-- Name: active_vs_nonactive_students_view; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.active_vs_nonactive_students_view WITH (security_invoker='on') AS
 WITH latest_period AS (
         SELECT period.id
           FROM public.period
          ORDER BY period.created_at DESC
         LIMIT 1
        ), active_students_latest_period AS (
         SELECT count(s.id) AS active_students
           FROM ((public.student s
             JOIN public.payment p ON ((s.id = p.student_id)))
             CROSS JOIN latest_period lp)
          WHERE (p.period_id = lp.id)
        ), total_students AS (
         SELECT count(*) AS total_students
           FROM public.student
        )
 SELECT ( SELECT active_students_latest_period.active_students
           FROM active_students_latest_period) AS active_students,
    ( SELECT total_students.total_students
           FROM total_students) AS total_students;


--
-- Name: class; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.class (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    name text NOT NULL,
    level bigint,
    "order" integer,
    class_type integer
);


--
-- Name: COLUMN class."order"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.class."order" IS 'class level order';


--
-- Name: COLUMN class.class_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.class.class_type IS 'bachata , salsa or any other class';


--
-- Name: all_students_by_last_payments_view; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.all_students_by_last_payments_view WITH (security_invoker='on') AS
 SELECT s.id,
    s.first_name,
    s.last_name,
    concat(s.first_name, ' ', s.last_name) AS full_name,
    s.phone,
    COALESCE(array_agg(c.id) FILTER (WHERE (c.id IS NOT NULL)), ARRAY[]::uuid[]) AS class_ids,
    COALESCE(array_agg(c.class_type) FILTER (WHERE (c.class_type IS NOT NULL)), ARRAY[]::integer[]) AS class_type,
    COALESCE(array_agg(((c.name || ' '::text) || c.level)) FILTER (WHERE ((c.name IS NOT NULL) AND (c.level IS NOT NULL))), ARRAY[]::text[]) AS class_info
   FROM (((public.student s
     LEFT JOIN ( SELECT payment.id,
            payment.student_id,
            payment.classes,
            payment.payment_method,
            payment.payment_amount,
            payment.created_at,
            payment.period_id,
            payment.notes,
            payment.is_dropout
           FROM public.payment
          WHERE (payment.period_id = ( SELECT period.id
                   FROM public.period
                  ORDER BY period.created_at DESC
                 LIMIT 1))) pay ON ((pay.student_id = s.id)))
     LEFT JOIN LATERAL unnest(pay.classes) class_id_array(class_id_array) ON (true))
     LEFT JOIN public.class c ON ((c.id = class_id_array.class_id_array)))
  GROUP BY s.id, s.first_name, s.last_name, s.phone;


--
-- Name: class_period_student_count; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.class_period_student_count AS
SELECT
    NULL::uuid AS period_id,
    NULL::date AS start_date,
    NULL::date AS end_date,
    NULL::uuid AS class_id,
    NULL::integer AS class_type,
    NULL::text AS class_info,
    NULL::bigint AS student_count,
    NULL::numeric AS total_payment;


--
-- Name: class_type; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.class_type (
    id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    name text NOT NULL
);


--
-- Name: class_type_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.class_type ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.class_type_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: classes_by_student_view; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.classes_by_student_view AS
SELECT
    NULL::uuid AS id,
    NULL::text AS first_name,
    NULL::text AS last_name,
    NULL::text AS phone,
    NULL::timestamp with time zone AS created_at,
    NULL::integer AS class_type,
    NULL::text AS class_info,
    NULL::uuid AS class_id,
    NULL::uuid AS period_id,
    NULL::text AS period_name;


--
-- Name: deletion_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.deletion_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    reason text,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: event_payment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.event_payment (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id uuid NOT NULL,
    payment_date date NOT NULL,
    payment_amount numeric NOT NULL,
    client_name text NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    student_id uuid
);


--
-- Name: events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_name text NOT NULL,
    event_date date NOT NULL,
    event_price numeric NOT NULL,
    date_of_event_price numeric NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: filtered_payment_view; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.filtered_payment_view WITH (security_invoker='on') AS
 SELECT p.id,
    p.student_id,
    p.classes,
    p.payment_method,
    p.payment_amount,
    p.created_at,
    p.period_id,
    p.notes,
    p.is_dropout,
    p.is_credit,
    s.first_name,
    s.last_name,
    s.phone,
    per.name AS period_name,
    per.start_date AS start_period_date,
    per.end_date AS end_period_date
   FROM ((public.payment p
     LEFT JOIN public.student s ON ((s.id = p.student_id)))
     LEFT JOIN public.period per ON ((per.id = p.period_id)));


--
-- Name: instructors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.instructors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL
);


--
-- Name: location; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.location (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    name text NOT NULL,
    address text NOT NULL,
    phone text,
    capacity integer,
    is_active boolean DEFAULT true NOT NULL,
    notes text
);


--
-- Name: notes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    note text NOT NULL,
    is_completed boolean DEFAULT false,
    user_id uuid
);


--
-- Name: payment_by_student_view; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.payment_by_student_view WITH (security_invoker='on') AS
 SELECT pay.id,
    per.start_date,
    per.end_date,
    per.name AS period_name,
    per.created_at AS period_created_at,
    pay.student_id,
    pay.payment_method,
    pay.payment_amount,
    pay.classes AS payment_classes,
    pay.created_at,
    array_agg(c.class_type) AS class_type,
    array_agg(((c.name || ' '::text) || c.level)) AS class_info
   FROM (((public.payment pay
     JOIN public.period per ON ((per.id = pay.period_id)))
     LEFT JOIN LATERAL unnest(pay.classes) class_id_array(class_id_array) ON (true))
     FULL JOIN public.class c ON ((c.id = class_id_array.class_id_array)))
  GROUP BY pay.id, per.start_date, per.end_date, per.name, per.created_at, pay.student_id, pay.created_at, pay.payment_method, pay.payment_amount, pay.classes
  ORDER BY per.created_at DESC;


--
-- Name: period_location_class; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.period_location_class (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    period_id uuid NOT NULL,
    location_id uuid NOT NULL,
    class_id uuid NOT NULL,
    day_of_week text NOT NULL,
    class_time time without time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL
);


--
-- Name: private_lesson_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.private_lesson_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    private_lesson_id uuid,
    instructor_id uuid,
    used_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: private_lessons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.private_lessons (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid,
    instructor_id uuid,
    lessons_used integer DEFAULT 0 NOT NULL,
    lessons_purchased integer NOT NULL,
    date_purchased date NOT NULL,
    amount numeric(10,2) NOT NULL,
    is_active boolean DEFAULT true NOT NULL
);


--
-- Name: private_lessons_view; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.private_lessons_view WITH (security_invoker='on') AS
 SELECT pl.id,
    pl.student_id,
    pl.instructor_id,
    pl.lessons_purchased,
    pl.lessons_used,
    pl.date_purchased,
    pl.amount,
    pl.is_active,
    s.first_name,
    s.last_name,
    i.name AS instructor_name
   FROM ((public.private_lessons pl
     LEFT JOIN public.student s ON ((s.id = pl.student_id)))
     LEFT JOIN public.instructors i ON ((i.id = pl.instructor_id)));


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    full_name text,
    email text,
    avatar_url text,
    role text DEFAULT 'user'::text,
    push_token text
);


--
-- Name: settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.settings (
    key text NOT NULL,
    value jsonb,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: student_count_by_period_id; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.student_count_by_period_id WITH (security_invoker='on') AS
 SELECT p.id AS period_id,
    p.start_date,
    p.end_date,
    count(DISTINCT pm.student_id) AS student_count
   FROM (public.period p
     LEFT JOIN public.payment pm ON ((p.id = pm.period_id)))
  GROUP BY p.id, p.start_date, p.end_date
  ORDER BY p.start_date;


--
-- Name: student_credit_balance; Type: MATERIALIZED VIEW; Schema: public; Owner: -
--

CREATE MATERIALIZED VIEW public.student_credit_balance AS
 SELECT payment.student_id,
    sum(payment.payment_amount) AS credit_balance
   FROM public.payment
  WHERE (payment.is_credit = true)
  GROUP BY payment.student_id
  WITH NO DATA;


--
-- Name: students_by_last_payments_view; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.students_by_last_payments_view AS
SELECT
    NULL::uuid AS id,
    NULL::text AS first_name,
    NULL::text AS last_name,
    NULL::text AS phone,
    NULL::text AS payment_method,
    NULL::timestamp with time zone AS created_at,
    NULL::integer[] AS class_type,
    NULL::text[] AS class_info;


--
-- Name: user_credit_balances; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_credit_balances (
    student_id uuid NOT NULL,
    total_credit numeric DEFAULT 0
);


--
-- Name: period Period_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.period
    ADD CONSTRAINT "Period_pkey" PRIMARY KEY (id);


--
-- Name: class_type class_type_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.class_type
    ADD CONSTRAINT class_type_pkey PRIMARY KEY (id);


--
-- Name: class classes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.class
    ADD CONSTRAINT classes_pkey PRIMARY KEY (id);


--
-- Name: deletion_requests deletion_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deletion_requests
    ADD CONSTRAINT deletion_requests_pkey PRIMARY KEY (id);


--
-- Name: event_payment event_payment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_payment
    ADD CONSTRAINT event_payment_pkey PRIMARY KEY (id);


--
-- Name: events events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_pkey PRIMARY KEY (id);


--
-- Name: instructors instructors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.instructors
    ADD CONSTRAINT instructors_pkey PRIMARY KEY (id);


--
-- Name: location location_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.location
    ADD CONSTRAINT location_pkey PRIMARY KEY (id);


--
-- Name: notes notes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notes
    ADD CONSTRAINT notes_pkey PRIMARY KEY (id);


--
-- Name: payment payment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment
    ADD CONSTRAINT payment_pkey PRIMARY KEY (id);


--
-- Name: period_location_class period_location_class_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.period_location_class
    ADD CONSTRAINT period_location_class_pkey PRIMARY KEY (id);


--
-- Name: private_lesson_logs private_lesson_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.private_lesson_logs
    ADD CONSTRAINT private_lesson_logs_pkey PRIMARY KEY (id);


--
-- Name: private_lessons private_lessons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.private_lessons
    ADD CONSTRAINT private_lessons_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_email_key UNIQUE (email);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: settings settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_pkey PRIMARY KEY (key);


--
-- Name: student student_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student
    ADD CONSTRAINT student_pkey PRIMARY KEY (id);


--
-- Name: user_credit_balances user_credit_balances_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_credit_balances
    ADD CONSTRAINT user_credit_balances_pkey PRIMARY KEY (student_id);


--
-- Name: class_period_student_count _RETURN; Type: RULE; Schema: public; Owner: -
--

CREATE OR REPLACE VIEW public.class_period_student_count WITH (security_invoker='on') AS
 SELECT p.id AS period_id,
    p.start_date,
    p.end_date,
    c.id AS class_id,
    c.class_type,
    ((c.name || ' '::text) || c.level) AS class_info,
    count(DISTINCT pm.student_id) AS student_count,
    sum(pm.payment_amount) AS total_payment
   FROM ((public.period p
     CROSS JOIN public.class c)
     JOIN public.payment pm ON (((p.id = pm.period_id) AND (c.id = ANY (pm.classes)))))
  GROUP BY p.id, p.start_date, p.end_date, c.id, c.name, c.class_type
 HAVING (count(DISTINCT pm.student_id) > 0)
  ORDER BY p.start_date, c.name;


--
-- Name: classes_by_student_view _RETURN; Type: RULE; Schema: public; Owner: -
--

CREATE OR REPLACE VIEW public.classes_by_student_view WITH (security_invoker='on') AS
 SELECT s.id,
    s.first_name,
    s.last_name,
    s.phone,
    s.created_at,
    c.class_type,
    ((c.name || ' '::text) || c.level) AS class_info,
    class_id_array.class_id_array AS class_id,
    per.id AS period_id,
    per.name AS period_name
   FROM ((((public.student s
     JOIN public.payment pay ON ((s.id = pay.student_id)))
     JOIN LATERAL unnest(pay.classes) class_id_array(class_id_array) ON (true))
     JOIN public.class c ON ((c.id = class_id_array.class_id_array)))
     JOIN public.period per ON ((per.id = pay.period_id)))
  GROUP BY s.id, s.first_name, s.last_name, c.class_type, ((c.name || ' '::text) || c.level), class_id_array.class_id_array, per.id, per.name;


--
-- Name: students_by_last_payments_view _RETURN; Type: RULE; Schema: public; Owner: -
--

CREATE OR REPLACE VIEW public.students_by_last_payments_view WITH (security_invoker='on') AS
 SELECT s.id,
    s.first_name,
    s.last_name,
    s.phone,
    pay.payment_method,
    s.created_at,
    array_agg(c.class_type) AS class_type,
    array_agg(((c.name || ' '::text) || c.level)) AS class_info
   FROM ((((public.student s
     JOIN public.payment pay ON ((s.id = pay.student_id)))
     JOIN LATERAL unnest(pay.classes) class_id_array(class_id_array) ON (true))
     JOIN public.class c ON ((c.id = class_id_array.class_id_array)))
     JOIN public.period per ON (((per.id = pay.period_id) AND (per.end_date = ( SELECT max(period.end_date) AS max
           FROM public.period)))))
  GROUP BY s.id, s.first_name, s.last_name, pay.payment_method;


--
-- Name: event_payment event_payment_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_payment
    ADD CONSTRAINT event_payment_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: event_payment event_payment_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_payment
    ADD CONSTRAINT event_payment_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.student(id) ON DELETE SET NULL;


--
-- Name: payment payment_period_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment
    ADD CONSTRAINT payment_period_id_fkey FOREIGN KEY (period_id) REFERENCES public.period(id);


--
-- Name: payment payment_studentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment
    ADD CONSTRAINT "payment_studentId_fkey" FOREIGN KEY (student_id) REFERENCES public.student(id);


--
-- Name: period_location_class period_location_class_class_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.period_location_class
    ADD CONSTRAINT period_location_class_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.class(id) ON DELETE CASCADE;


--
-- Name: period_location_class period_location_class_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.period_location_class
    ADD CONSTRAINT period_location_class_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.location(id) ON DELETE CASCADE;


--
-- Name: period_location_class period_location_class_period_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.period_location_class
    ADD CONSTRAINT period_location_class_period_id_fkey FOREIGN KEY (period_id) REFERENCES public.period(id) ON DELETE CASCADE;


--
-- Name: private_lesson_logs private_lesson_logs_instructor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.private_lesson_logs
    ADD CONSTRAINT private_lesson_logs_instructor_id_fkey FOREIGN KEY (instructor_id) REFERENCES public.instructors(id);


--
-- Name: private_lesson_logs private_lesson_logs_private_lesson_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.private_lesson_logs
    ADD CONSTRAINT private_lesson_logs_private_lesson_id_fkey FOREIGN KEY (private_lesson_id) REFERENCES public.private_lessons(id) ON DELETE CASCADE;


--
-- Name: private_lessons private_lessons_instructor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.private_lessons
    ADD CONSTRAINT private_lessons_instructor_id_fkey FOREIGN KEY (instructor_id) REFERENCES public.instructors(id);


--
-- Name: private_lessons private_lessons_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.private_lessons
    ADD CONSTRAINT private_lessons_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.student(id);


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_credit_balances user_credit_balances_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_credit_balances
    ADD CONSTRAINT user_credit_balances_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.student(id);


--
-- Name: location Admins can delete locations.; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete locations." ON public.location FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))));


--
-- Name: period_location_class Admins can delete.; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete." ON public.period_location_class FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))));


--
-- Name: location Admins can insert locations.; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert locations." ON public.location FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))));


--
-- Name: settings Admins can insert settings.; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert settings." ON public.settings FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))));


--
-- Name: period_location_class Admins can insert.; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert." ON public.period_location_class FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))));


--
-- Name: settings Admins can read settings.; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can read settings." ON public.settings FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))));


--
-- Name: location Admins can update locations.; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update locations." ON public.location FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))));


--
-- Name: settings Admins can update settings.; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update settings." ON public.settings FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))));


--
-- Name: period_location_class Admins can update.; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update." ON public.period_location_class FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))));


--
-- Name: student Allow all users to Update student; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all users to Update student" ON public.student FOR UPDATE USING (true) WITH CHECK (true);


--
-- Name: user_credit_balances Allow read access to own credit balance; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow read access to own credit balance" ON public.user_credit_balances FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.student
  WHERE ((student.id = user_credit_balances.student_id) AND (student.id = auth.uid())))));


--
-- Name: user_credit_balances Allow update of own credit balance; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow update of own credit balance" ON public.user_credit_balances FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.student
  WHERE ((student.id = user_credit_balances.student_id) AND (student.id = auth.uid())))));


--
-- Name: instructors Authenticated users can delete instructors; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can delete instructors" ON public.instructors FOR DELETE TO authenticated USING (true);


--
-- Name: private_lessons Authenticated users can delete private_lessons; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can delete private_lessons" ON public.private_lessons FOR DELETE TO authenticated USING (true);


--
-- Name: instructors Authenticated users can insert instructors; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can insert instructors" ON public.instructors FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: private_lesson_logs Authenticated users can insert private_lesson_logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can insert private_lesson_logs" ON public.private_lesson_logs FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: private_lessons Authenticated users can insert private_lessons; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can insert private_lessons" ON public.private_lessons FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: instructors Authenticated users can select instructors; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can select instructors" ON public.instructors FOR SELECT TO authenticated USING (true);


--
-- Name: private_lesson_logs Authenticated users can select private_lesson_logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can select private_lesson_logs" ON public.private_lesson_logs FOR SELECT TO authenticated USING (true);


--
-- Name: private_lessons Authenticated users can select private_lessons; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can select private_lessons" ON public.private_lessons FOR SELECT TO authenticated USING (true);


--
-- Name: instructors Authenticated users can update instructors; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can update instructors" ON public.instructors FOR UPDATE TO authenticated USING (true) WITH CHECK (true);


--
-- Name: private_lessons Authenticated users can update private_lessons; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can update private_lessons" ON public.private_lessons FOR UPDATE TO authenticated USING (true) WITH CHECK (true);


--
-- Name: notes Enable delete for authenticated users only; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable delete for authenticated users only" ON public.notes FOR DELETE TO authenticated USING (true);


--
-- Name: class Enable delete for users based on user_id; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable delete for users based on user_id" ON public.class FOR DELETE USING (true);


--
-- Name: student Enable insert access for all users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable insert access for all users" ON public.student FOR INSERT WITH CHECK (true);


--
-- Name: class Enable insert for all users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable insert for all users" ON public.class FOR INSERT WITH CHECK (true);


--
-- Name: payment Enable insert for all users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable insert for all users" ON public.payment FOR INSERT WITH CHECK (true);


--
-- Name: class_type Enable insert for authenticated users only; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable insert for authenticated users only" ON public.class_type FOR INSERT WITH CHECK (true);


--
-- Name: notes Enable insert for authenticated users only; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable insert for authenticated users only" ON public.notes FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: period Enable insert for authenticated users only; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable insert for authenticated users only" ON public.period FOR INSERT WITH CHECK (true);


--
-- Name: class Enable read access for all users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable read access for all users" ON public.class FOR SELECT USING (true);


--
-- Name: class_type Enable read access for all users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable read access for all users" ON public.class_type FOR SELECT USING (true);


--
-- Name: notes Enable read access for all users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable read access for all users" ON public.notes FOR SELECT TO authenticated USING (true);


--
-- Name: payment Enable read access for all users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable read access for all users" ON public.payment FOR SELECT USING (true);


--
-- Name: period Enable read access for all users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable read access for all users" ON public.period FOR SELECT USING (true);


--
-- Name: student Enable read access for all users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable read access for all users" ON public.student FOR SELECT USING (true);


--
-- Name: notes Enable update for authenticated users only; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable update for authenticated users only" ON public.notes FOR UPDATE TO authenticated USING (true) WITH CHECK (true);


--
-- Name: payment Enable update for users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable update for users" ON public.payment FOR UPDATE USING (true) WITH CHECK (true);


--
-- Name: class Enable update for users based on email; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable update for users based on email" ON public.class FOR UPDATE USING (true) WITH CHECK (true);


--
-- Name: period Enable update for users based on email; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable update for users based on email" ON public.period FOR UPDATE USING (true) WITH CHECK (true);


--
-- Name: profiles Public profiles are viewable by everyone.; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles FOR SELECT USING (true);


--
-- Name: profiles Users can insert their own profile.; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own profile." ON public.profiles FOR INSERT WITH CHECK ((auth.uid() = id));


--
-- Name: profiles Users can update own profile.; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own profile." ON public.profiles FOR UPDATE USING ((auth.uid() = id));


--
-- Name: class; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.class ENABLE ROW LEVEL SECURITY;

--
-- Name: class_type; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.class_type ENABLE ROW LEVEL SECURITY;

--
-- Name: deletion_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.deletion_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: event_payment; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.event_payment ENABLE ROW LEVEL SECURITY;

--
-- Name: event_payment event_payment_delete_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY event_payment_delete_authenticated ON public.event_payment FOR DELETE TO authenticated USING (true);


--
-- Name: event_payment event_payment_insert_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY event_payment_insert_authenticated ON public.event_payment FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: event_payment event_payment_select_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY event_payment_select_authenticated ON public.event_payment FOR SELECT TO authenticated USING (true);


--
-- Name: event_payment event_payment_update_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY event_payment_update_authenticated ON public.event_payment FOR UPDATE TO authenticated USING (true) WITH CHECK (true);


--
-- Name: events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

--
-- Name: events events_delete_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY events_delete_authenticated ON public.events FOR DELETE TO authenticated USING (true);


--
-- Name: events events_insert_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY events_insert_authenticated ON public.events FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: events events_select_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY events_select_authenticated ON public.events FOR SELECT TO authenticated USING (true);


--
-- Name: events events_update_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY events_update_authenticated ON public.events FOR UPDATE TO authenticated USING (true) WITH CHECK (true);


--
-- Name: instructors; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.instructors ENABLE ROW LEVEL SECURITY;

--
-- Name: location; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.location ENABLE ROW LEVEL SECURITY;

--
-- Name: notes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

--
-- Name: payment; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payment ENABLE ROW LEVEL SECURITY;

--
-- Name: period; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.period ENABLE ROW LEVEL SECURITY;

--
-- Name: period_location_class; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.period_location_class ENABLE ROW LEVEL SECURITY;

--
-- Name: private_lesson_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.private_lesson_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: private_lessons; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.private_lessons ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: location public can view locations.; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "public can view locations." ON public.location FOR SELECT USING (true);


--
-- Name: period_location_class public can view.; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "public can view." ON public.period_location_class FOR SELECT USING (true);


--
-- Name: settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

--
-- Name: student; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.student ENABLE ROW LEVEL SECURITY;

--
-- Name: user_credit_balances; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_credit_balances ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--

\unrestrict CF8BC002DXh0beX8wAmFkdb5ZjYwB3zyE0OF7gjQFJ4v8QUcvOEdj8AzhnpidFm


-- The following objects live on auth.users and are NOT captured by a
-- --schema=public dump. They must be created manually if the target
-- project needs new-user profile rows created automatically.
--
-- create function public.handle_new_user () returns trigger as $$
-- begin
--   insert into public.profiles (id, full_name, avatar_url, email)
--   values (
--     new.id,
--     new.raw_user_meta_data->>'full_name',
--     new.raw_user_meta_data->>'avatar_url',
--     new.raw_user_meta_data->>'email'
--     );
--   return new;
-- end;
-- $$ language plpgsql security definer;
--
-- create trigger on_auth_user_created
-- after insert on auth.users for each row
-- execute procedure public.handle_new_user ();
