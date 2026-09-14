-- Advrix CRM full backup
-- Generated: 2026-09-09T06:27:13.559Z
-- DB: neondb (branch production br-calm-feather-az3up18a)
\nSET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA public;


-- Table: "public"."activity_log"
DROP TABLE IF EXISTS "public"."activity_log" CASCADE;
CREATE TABLE "public"."activity_log" (
  "id" int8 NOT NULL DEFAULT nextval('activity_log_id_seq'::regclass),
  "actor_user_id" uuid,
  "actor_name" text NOT NULL DEFAULT ''::text,
  "action" text NOT NULL,
  "entity_type" text NOT NULL DEFAULT 'system'::text,
  "entity_id" text,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE ONLY "public"."activity_log" ADD CONSTRAINT "activity_log_action_not_null" NOT NULL action;
ALTER TABLE ONLY "public"."activity_log" ADD CONSTRAINT "activity_log_actor_name_not_null" NOT NULL actor_name;
ALTER TABLE ONLY "public"."activity_log" ADD CONSTRAINT "activity_log_actor_user_id_fkey" FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE ONLY "public"."activity_log" ADD CONSTRAINT "activity_log_created_at_not_null" NOT NULL created_at;
ALTER TABLE ONLY "public"."activity_log" ADD CONSTRAINT "activity_log_entity_type_not_null" NOT NULL entity_type;
ALTER TABLE ONLY "public"."activity_log" ADD CONSTRAINT "activity_log_id_not_null" NOT NULL id;
ALTER TABLE ONLY "public"."activity_log" ADD CONSTRAINT "activity_log_metadata_not_null" NOT NULL metadata;
ALTER TABLE ONLY "public"."activity_log" ADD CONSTRAINT "activity_log_pkey" PRIMARY KEY (id);
CREATE INDEX idx_activity_log_action ON public.activity_log USING btree (entity_type, entity_id);
CREATE INDEX idx_activity_log_actor ON public.activity_log USING btree (actor_user_id, created_at DESC);
CREATE INDEX idx_activity_log_created ON public.activity_log USING btree (created_at DESC);

-- Data: 30 rows
INSERT INTO "public"."activity_log" ("id", "actor_user_id", "actor_name", "action", "entity_type", "entity_id", "metadata", "created_at") VALUES
(2, '2945609a-08cc-4bb5-a6f5-7e9dbf8b3f6d', 'Advrix Admin', 'attendance_check_in', 'attendance', '2026-09-01', '{"status":"present","latitude":23.5937355,"punch_in":"2026-09-01T05:50:54.645Z","longitude":72.3580092,"location_text":"Modhera Rd, Prabhunagar, Mahesana Taluka, Mahesana, Gujarat, 384001, India"}'::jsonb, '2026-09-01T05:50:55.667Z'),
(4, '2945609a-08cc-4bb5-a6f5-7e9dbf8b3f6d', 'Advrix Admin', 'leave_approved', 'leave', 'b53cfb8b-1260-4929-bfdf-b0e59fe5a4e5', '{"days":5,"end_date":"2026-09-05T00:00:00.000Z","leave_type":"sick","start_date":"2026-09-01T00:00:00.000Z","approved_by":"Advrix Admin","employee_id":"d3787b14-ead4-46a9-b216-6c4e6f0be1bf"}'::jsonb, '2026-09-01T05:58:53.642Z'),
(5, '2945609a-08cc-4bb5-a6f5-7e9dbf8b3f6d', 'Advrix Admin', 'leave_approved', 'leave', 'b53cfb8b-1260-4929-bfdf-b0e59fe5a4e5', '{"days":5,"end_date":"2026-09-05T00:00:00.000Z","leave_type":"sick","start_date":"2026-09-01T00:00:00.000Z","approved_by":"Advrix Admin","employee_id":"d3787b14-ead4-46a9-b216-6c4e6f0be1bf"}'::jsonb, '2026-09-01T06:00:59.074Z'),
(1, NULL, 'Sudhir Thakor', 'attendance_check_out', 'attendance', '2026-08-31', '{"latitude":23.5937158,"punch_in":"2026-08-31T03:55:37.269Z","longitude":72.3579873,"punch_out":"2026-08-31T08:58:28.128Z","hours_worked":5.05,"location_text":"Modhera Rd, Prabhunagar, Mahesana Taluka, Mahesana, Gujarat, 384001, India"}'::jsonb, '2026-08-31T08:58:29.123Z'),
(3, NULL, 'Sudhir Thakor', 'leave_requested', 'leave', 'd3787b14-ead4-46a9-b216-6c4e6f0be1bf', '{"days":5,"reason":"I''m sick so I can''t come to office","end_date":"2026-09-05","leave_type":"sick","start_date":"2026-09-01"}'::jsonb, '2026-09-01T05:56:18.497Z'),
(9, NULL, 'Sudhir Thakor', 'attendance_check_in', 'attendance', '2026-09-02', '{"status":"present","latitude":23.5937196,"punch_in":"2026-09-02T03:59:09.157Z","longitude":72.3579802,"location_text":"Modhera Rd, Prabhunagar, Mahesana Taluka, Mahesana, Gujarat, 384001, India"}'::jsonb, '2026-09-02T03:59:10.193Z'),
(6, NULL, 'Vishvas Patel', 'attendance_check_in', 'attendance', '2026-09-01', '{"status":"late","latitude":23.5937175,"punch_in":"2026-09-01T13:10:16.064Z","longitude":72.3579756,"location_text":"Modhera Rd, Prabhunagar, Mahesana Taluka, Mahesana, Gujarat, 384001, India"}'::jsonb, '2026-09-01T13:10:17.172Z'),
(7, NULL, 'Vishvas Patel', 'attendance_check_out', 'attendance', '2026-09-01', '{"latitude":23.5937151,"punch_in":"2026-09-01T13:10:16.064Z","longitude":72.3579869,"punch_out":"2026-09-01T13:10:30.624Z","hours_worked":0,"location_text":"Modhera Rd, Prabhunagar, Mahesana Taluka, Mahesana, Gujarat, 384001, India"}'::jsonb, '2026-09-01T13:10:31.624Z'),
(8, NULL, 'Vishvas Patel', 'attendance_check_in', 'attendance', '2026-09-02', '{"status":"present","latitude":23.5937645,"punch_in":"2026-09-02T03:55:51.476Z","longitude":72.3580733,"location_text":"Modhera Rd, Prabhunagar, Mahesana Taluka, Mahesana, Gujarat, 384001, India"}'::jsonb, '2026-09-02T03:55:52.512Z'),
(10, NULL, 'Vishvas Patel', 'attendance_check_out', 'attendance', '2026-09-02', '{"latitude":23.5937394,"punch_in":"2026-09-02T03:55:51.476Z","longitude":72.3580669,"punch_out":"2026-09-02T03:59:42.339Z","hours_worked":0.06,"location_text":"Modhera Rd, Prabhunagar, Mahesana Taluka, Mahesana, Gujarat, 384001, India"}'::jsonb, '2026-09-02T03:59:43.358Z'),
(11, '68c002cc-20db-4966-ab6e-e2cf66b42b41', 'Sudhir Thakor', 'attendance_check_in', 'attendance', '2026-09-02', '{"status":"present","latitude":23.59407244540995,"punch_in":"2026-09-02T04:03:55.202Z","longitude":72.35798121779958,"location_text":"Modhera road, Modhera Rd, Prabhunagar, Mahesana Taluka, Mahesana, Gujarat, 384001, India"}'::jsonb, '2026-09-02T04:03:56.216Z'),
(12, 'a0f6eb30-79cd-4e6b-a1d7-1ca2f764a690', 'Vishvas Patel', 'attendance_check_in', 'attendance', '2026-09-02', '{"status":"present","latitude":23.594058,"punch_in":"2026-09-02T04:06:21.656Z","longitude":72.357947,"location_text":"Modhera road, Modhera Rd, Prabhunagar, Mahesana Taluka, Mahesana, Gujarat, 384001, India"}'::jsonb, '2026-09-02T04:06:22.652Z'),
(13, '73116e41-29af-4c4f-ad4b-bb34aced2b47', 'Kaushal Rawat', 'attendance_check_in', 'attendance', '2026-09-02', '{"status":"present","latitude":23.593732,"punch_in":"2026-09-02T04:54:55.581Z","longitude":72.3580372,"location_text":"Modhera Rd, Prabhunagar, Mahesana Taluka, Mahesana, Gujarat, 384001, India"}'::jsonb, '2026-09-02T04:54:56.589Z'),
(14, '68c002cc-20db-4966-ab6e-e2cf66b42b41', 'Sudhir Thakor', 'attendance_check_in', 'attendance', '2026-09-03', '{"status":"present","latitude":23.5937331,"punch_in":"2026-09-03T03:57:37.350Z","longitude":72.3580264,"location_text":"Modhera Rd, Prabhunagar, Mahesana Taluka, Mahesana, Gujarat, 384001, India"}'::jsonb, '2026-09-03T03:57:38.380Z'),
(15, 'a0f6eb30-79cd-4e6b-a1d7-1ca2f764a690', 'Vishvas Patel', 'attendance_check_in', 'attendance', '2026-09-03', '{"status":"present","latitude":23.5937361,"punch_in":"2026-09-03T04:00:30.382Z","longitude":72.3580173,"location_text":"Modhera Rd, Prabhunagar, Mahesana Taluka, Mahesana, Gujarat, 384001, India"}'::jsonb, '2026-09-03T04:00:31.437Z'),
(16, '73116e41-29af-4c4f-ad4b-bb34aced2b47', 'Kaushal Rawat', 'attendance_check_in', 'attendance', '2026-09-03', '{"status":"present","latitude":23.5940123,"punch_in":"2026-09-03T05:01:23.710Z","longitude":72.359046,"location_text":"Modhera Rd, Prabhunagar, Mahesana Taluka, Mahesana, Gujarat, 384001, India"}'::jsonb, '2026-09-03T05:01:24.773Z'),
(17, '68c002cc-20db-4966-ab6e-e2cf66b42b41', 'Sudhir Thakor', 'attendance_check_in', 'attendance', '2026-09-07', '{"status":"present","latitude":23.5937322,"punch_in":"2026-09-07T04:00:27.459Z","longitude":72.3580686,"location_text":"Modhera Rd, Prabhunagar, Mahesana Taluka, Mahesana, Gujarat, 384001, India"}'::jsonb, '2026-09-07T04:00:28.458Z'),
(18, '73116e41-29af-4c4f-ad4b-bb34aced2b47', 'Kaushal Rawat', 'leave_requested', 'leave', '73116e41-29af-4c4f-ad4b-bb34aced2b47', '{"days":2,"reason":"Dear Sir/Ma’am,\r\n\r\nI am not feeling well due to loose motions and need to take rest. Therefore, I will not be able to attend the office for one day today. Kindly grant me leave for the day.\r\n\r\nThank you for understanding.\r\n\r\nRegards,\r\nKaushal","end_date":"2026-09-09","leave_type":"sick","start_date":"2026-09-08"}'::jsonb, '2026-09-08T03:59:17.632Z'),
(19, '68c002cc-20db-4966-ab6e-e2cf66b42b41', 'Sudhir Thakor', 'attendance_check_in', 'attendance', '2026-09-08', '{"status":"present","latitude":23.5937377,"punch_in":"2026-09-08T04:01:46.036Z","longitude":72.3580004,"location_text":"Modhera Rd, Prabhunagar, Mahesana Taluka, Mahesana, Gujarat, 384001, India"}'::jsonb, '2026-09-08T04:01:47.065Z'),
(20, 'a0f6eb30-79cd-4e6b-a1d7-1ca2f764a690', 'Vishvas Patel', 'attendance_check_in', 'attendance', '2026-09-08', '{"status":"present","latitude":23.5937104,"punch_in":"2026-09-08T04:07:16.766Z","longitude":72.3579976,"location_text":"Modhera Rd, Prabhunagar, Mahesana Taluka, Mahesana, Gujarat, 384001, India"}'::jsonb, '2026-09-08T04:07:17.761Z'),
(21, '2945609a-08cc-4bb5-a6f5-7e9dbf8b3f6d', 'Advrix Admin', 'attendance_check_in', 'attendance', '2026-09-08', '{"status":"present","latitude":23.5937414,"punch_in":"2026-09-08T04:41:39.432Z","longitude":72.3580513,"location_text":"Modhera Rd, Prabhunagar, Mahesana Taluka, Mahesana, Gujarat, 384001, India"}'::jsonb, '2026-09-08T04:41:40.549Z'),
(22, 'd0625c86-49b2-46eb-93c6-99a723c00416', 'Vishvash Patel', 'attendance_check_in', 'attendance', '2026-09-08', '{"status":"present","latitude":23.593713,"punch_in":"2026-09-08T04:43:23.132Z","longitude":72.3580351,"location_text":"Modhera Rd, Prabhunagar, Mahesana Taluka, Mahesana, Gujarat, 384001, India"}'::jsonb, '2026-09-08T04:43:24.182Z'),
(23, '2945609a-08cc-4bb5-a6f5-7e9dbf8b3f6d', 'Advrix Admin', 'leave_approved', 'leave', 'aee7d264-15f2-4a1d-b7d7-4e5ae50caa74', '{"days":2,"end_date":"2026-09-09T00:00:00.000Z","leave_type":"sick","start_date":"2026-09-08T00:00:00.000Z","approved_by":"Advrix Admin","employee_id":"73116e41-29af-4c4f-ad4b-bb34aced2b47"}'::jsonb, '2026-09-08T05:46:56.844Z'),
(24, 'd0625c86-49b2-46eb-93c6-99a723c00416', 'Vishvash Patel', 'lunch_break_end', 'attendance', '2026-09-08', '{"mins":112,"break_end":"2026-09-08T08:54:14.070Z","break_start":"2026-09-08T07:01:51.660Z","total_break_mins":112}'::jsonb, '2026-09-08T08:54:15.071Z'),
(25, '68c002cc-20db-4966-ab6e-e2cf66b42b41', 'Sudhir Thakor', 'attendance_check_out', 'attendance', '2026-09-08', '{"status":"half_day","latitude":23.5937339,"punch_in":"2026-09-08T04:01:46.036Z","longitude":72.3580065,"punch_out":"2026-09-08T12:29:43.587Z","breaks_mins":32,"hours_worked":7.93,"location_text":"Modhera Rd, Prabhunagar, Mahesana Taluka, Mahesana, Gujarat, 384001, India"}'::jsonb, '2026-09-08T12:29:45.780Z'),
(26, '2945609a-08cc-4bb5-a6f5-7e9dbf8b3f6d', 'Advrix Admin', 'attendance_check_out', 'attendance', '2026-09-08', '{"status":"half_day","latitude":23.593725,"punch_in":"2026-09-08T04:41:39.432Z","longitude":72.357974,"punch_out":"2026-09-08T12:39:51.009Z","breaks_mins":0,"hours_worked":7.97,"location_text":"Modhera Rd, Prabhunagar, Mahesana Taluka, Mahesana, Gujarat, 384001, India"}'::jsonb, '2026-09-08T12:39:53.130Z'),
(27, '68c002cc-20db-4966-ab6e-e2cf66b42b41', 'Sudhir Thakor', 'attendance_check_in', 'attendance', '2026-09-09', '{"status":"present","latitude":23.594068766277353,"punch_in":"2026-09-09T04:01:47.355Z","longitude":72.3579222433971,"location_text":"Modhera road, Modhera Rd, Prabhunagar, Mahesana Taluka, Mahesana, Gujarat, 384001, India"}'::jsonb, '2026-09-09T04:01:49.449Z'),
(28, 'd0625c86-49b2-46eb-93c6-99a723c00416', 'Vishvash Patel', 'attendance_check_in', 'attendance', '2026-09-09', '{"status":"present","latitude":23.594495112791897,"punch_in":"2026-09-09T04:18:50.376Z","longitude":72.35779921423931,"location_text":"Modhera Rd, Mahesana, Mahesana Taluka, Mahesana, Gujarat, 384001, India"}'::jsonb, '2026-09-09T04:18:52.538Z'),
(29, '73116e41-29af-4c4f-ad4b-bb34aced2b47', 'Kaushal Rawat', 'attendance_check_in', 'attendance', '2026-09-09', '{"status":"present","latitude":23.5936068,"punch_in":"2026-09-09T04:45:38.758Z","longitude":72.3580752,"location_text":"Modhera Rd, Prabhunagar, Mahesana Taluka, Mahesana, Gujarat, 384001, India"}'::jsonb, '2026-09-09T04:45:40.826Z'),
(30, '2945609a-08cc-4bb5-a6f5-7e9dbf8b3f6d', 'Advrix Admin', 'attendance_check_in', 'attendance', '2026-09-09', '{"status":"present","latitude":23.5965,"punch_in":"2026-09-09T06:01:42.803Z","longitude":72.3733,"location_text":"Rajivbrigade Nagar, Mahesana, Mahesana Taluka, Mahesana, Gujarat, 384001, India"}'::jsonb, '2026-09-09T06:01:45.161Z');

-- Table: "public"."assignments"
DROP TABLE IF EXISTS "public"."assignments" CASCADE;
CREATE TABLE "public"."assignments" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL,
  "project_id" uuid NOT NULL,
  "role_key" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "on_leave" bool NOT NULL DEFAULT false,
  "leave_reason" text,
  "leave_days" int4 NOT NULL DEFAULT 0,
  "allotment_deadline" date,
  "position" int4 NOT NULL DEFAULT 0
);
ALTER TABLE ONLY "public"."assignments" ADD CONSTRAINT "assignments_created_at_not_null" NOT NULL created_at;
ALTER TABLE ONLY "public"."assignments" ADD CONSTRAINT "assignments_id_not_null" NOT NULL id;
ALTER TABLE ONLY "public"."assignments" ADD CONSTRAINT "assignments_leave_days_not_null" NOT NULL leave_days;
ALTER TABLE ONLY "public"."assignments" ADD CONSTRAINT "assignments_on_leave_not_null" NOT NULL on_leave;
ALTER TABLE ONLY "public"."assignments" ADD CONSTRAINT "assignments_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY "public"."assignments" ADD CONSTRAINT "assignments_position_not_null" NOT NULL "position";
ALTER TABLE ONLY "public"."assignments" ADD CONSTRAINT "assignments_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE ONLY "public"."assignments" ADD CONSTRAINT "assignments_project_id_not_null" NOT NULL project_id;
ALTER TABLE ONLY "public"."assignments" ADD CONSTRAINT "assignments_role_key_fkey" FOREIGN KEY (role_key) REFERENCES roles(key) ON DELETE RESTRICT;
ALTER TABLE ONLY "public"."assignments" ADD CONSTRAINT "assignments_role_key_not_null" NOT NULL role_key;
ALTER TABLE ONLY "public"."assignments" ADD CONSTRAINT "assignments_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE ONLY "public"."assignments" ADD CONSTRAINT "assignments_user_id_not_null" NOT NULL user_id;
ALTER TABLE ONLY "public"."assignments" ADD CONSTRAINT "assignments_user_id_project_id_role_key_key" UNIQUE (user_id, project_id, role_key);
CREATE INDEX idx_assignments_project ON public.assignments USING btree (project_id);
-- no rows in "public"."assignments"

-- Table: "public"."attendance"
DROP TABLE IF EXISTS "public"."attendance" CASCADE;
CREATE TABLE "public"."attendance" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL,
  "date" date NOT NULL DEFAULT CURRENT_DATE,
  "punch_in" timestamptz,
  "punch_out" timestamptz,
  "status" text NOT NULL DEFAULT 'present'::text,
  "hours_worked" numeric(4,2) DEFAULT 0,
  "note" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "latitude" float8,
  "longitude" float8,
  "location_text" text,
  "break_start_time" timestamptz,
  "break_end_time" timestamptz,
  "total_break_mins" int4 NOT NULL DEFAULT 0,
  "proof_image_url" text
);
ALTER TABLE ONLY "public"."attendance" ADD CONSTRAINT "attendance_created_at_not_null" NOT NULL created_at;
ALTER TABLE ONLY "public"."attendance" ADD CONSTRAINT "attendance_date_not_null" NOT NULL date;
ALTER TABLE ONLY "public"."attendance" ADD CONSTRAINT "attendance_id_not_null" NOT NULL id;
ALTER TABLE ONLY "public"."attendance" ADD CONSTRAINT "attendance_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY "public"."attendance" ADD CONSTRAINT "attendance_status_not_null" NOT NULL status;
ALTER TABLE ONLY "public"."attendance" ADD CONSTRAINT "attendance_total_break_mins_not_null" NOT NULL total_break_mins;
ALTER TABLE ONLY "public"."attendance" ADD CONSTRAINT "attendance_user_id_date_key" UNIQUE (user_id, date);
ALTER TABLE ONLY "public"."attendance" ADD CONSTRAINT "attendance_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE ONLY "public"."attendance" ADD CONSTRAINT "attendance_user_id_not_null" NOT NULL user_id;
CREATE INDEX idx_attendance_date ON public.attendance USING btree (date DESC);
CREATE INDEX idx_attendance_status ON public.attendance USING btree (status);
CREATE INDEX idx_attendance_user_date ON public.attendance USING btree (user_id, date DESC);

-- Data: 16 rows
INSERT INTO "public"."attendance" ("id", "user_id", "date", "punch_in", "punch_out", "status", "hours_worked", "note", "created_at", "latitude", "longitude", "location_text", "break_start_time", "break_end_time", "total_break_mins", "proof_image_url") VALUES
('c0482007-40b9-4a55-81ab-0cff1a9a5308', '68c002cc-20db-4966-ab6e-e2cf66b42b41', '2026-09-07T18:30:00.000Z', '2026-09-08T04:01:46.036Z', '2026-09-08T12:29:43.587Z', 'half_day', 7.93, NULL, '2026-09-08T04:01:46.381Z', 23.5937339, 72.3580065, 'Modhera Rd, Prabhunagar, Mahesana Taluka, Mahesana, Gujarat, 384001, India', '2026-09-08T07:22:49.395Z', '2026-09-08T07:54:36.427Z', 32, NULL),
('84217cc0-0fd2-44ae-9ba6-7065d7ccc738', '2945609a-08cc-4bb5-a6f5-7e9dbf8b3f6d', '2026-09-07T18:30:00.000Z', '2026-09-08T04:41:39.432Z', '2026-09-08T12:39:51.009Z', 'half_day', 7.97, NULL, '2026-09-08T04:41:39.786Z', 23.593725, 72.357974, 'Modhera Rd, Prabhunagar, Mahesana Taluka, Mahesana, Gujarat, 384001, India', NULL, NULL, 0, NULL),
('965ab43d-702c-40c7-a2ef-e87baa624ebd', '68c002cc-20db-4966-ab6e-e2cf66b42b41', '2026-09-08T18:30:00.000Z', '2026-09-09T04:01:47.355Z', NULL, 'present', 0.00, NULL, '2026-09-09T04:01:48.783Z', 23.594068766277353, 72.3579222433971, 'Modhera road, Modhera Rd, Prabhunagar, Mahesana Taluka, Mahesana, Gujarat, 384001, India', NULL, NULL, 0, NULL),
('7b5af654-f530-4461-8e92-2ff7f449a97e', 'd0625c86-49b2-46eb-93c6-99a723c00416', '2026-09-08T18:30:00.000Z', '2026-09-09T04:18:50.376Z', NULL, 'present', 0.00, NULL, '2026-09-09T04:18:51.852Z', 23.594495112791897, 72.35779921423931, 'Modhera Rd, Mahesana, Mahesana Taluka, Mahesana, Gujarat, 384001, India', NULL, NULL, 0, NULL),
('f345acfe-8712-48f6-9761-5db18b55ce26', '73116e41-29af-4c4f-ad4b-bb34aced2b47', '2026-09-08T18:30:00.000Z', '2026-09-09T04:45:38.758Z', NULL, 'on_leave', 0.00, NULL, '2026-09-09T04:45:40.177Z', 23.5936068, 72.3580752, 'Modhera Rd, Prabhunagar, Mahesana Taluka, Mahesana, Gujarat, 384001, India', NULL, NULL, 0, NULL),
('ef356f8c-f8b0-4ba6-a33c-35ed36c0e417', '73116e41-29af-4c4f-ad4b-bb34aced2b47', '2026-09-07T18:30:00.000Z', NULL, NULL, 'on_leave', 0.00, NULL, '2026-09-09T05:07:10.604Z', NULL, NULL, NULL, NULL, NULL, 0, NULL),
('e37bb56d-5abc-4564-8b7d-fd8bea9663f2', '2945609a-08cc-4bb5-a6f5-7e9dbf8b3f6d', '2026-09-08T18:30:00.000Z', '2026-09-09T06:01:42.803Z', NULL, 'present', 0.00, NULL, '2026-09-09T06:01:44.488Z', 23.5965, 72.3733, 'Rajivbrigade Nagar, Mahesana, Mahesana Taluka, Mahesana, Gujarat, 384001, India', NULL, NULL, 0, NULL),
('189ef7f3-36de-41cc-bcb0-8988fb60df62', '68c002cc-20db-4966-ab6e-e2cf66b42b41', '2026-09-01T18:30:00.000Z', '2026-09-02T04:03:55.202Z', NULL, 'present', 0.00, NULL, '2026-09-02T04:03:55.536Z', 23.59407244540995, 72.35798121779958, 'Modhera road, Modhera Rd, Prabhunagar, Mahesana Taluka, Mahesana, Gujarat, 384001, India', NULL, NULL, 0, NULL),
('1bd7a50d-af1b-46d2-b72f-54fb5d2ab10c', 'a0f6eb30-79cd-4e6b-a1d7-1ca2f764a690', '2026-09-01T18:30:00.000Z', '2026-09-02T04:06:21.656Z', NULL, 'present', 0.00, NULL, '2026-09-02T04:06:21.982Z', 23.594058, 72.357947, 'Modhera road, Modhera Rd, Prabhunagar, Mahesana Taluka, Mahesana, Gujarat, 384001, India', NULL, NULL, 0, NULL),
('b14d9e3d-d8b7-4f4b-862a-2ce3a7241308', '73116e41-29af-4c4f-ad4b-bb34aced2b47', '2026-09-01T18:30:00.000Z', '2026-09-02T04:54:55.581Z', NULL, 'present', 0.00, NULL, '2026-09-02T04:54:55.909Z', 23.593732, 72.3580372, 'Modhera Rd, Prabhunagar, Mahesana Taluka, Mahesana, Gujarat, 384001, India', NULL, NULL, 0, NULL),
('56e8c13c-0414-42de-beac-30717518d5ba', '68c002cc-20db-4966-ab6e-e2cf66b42b41', '2026-09-02T18:30:00.000Z', '2026-09-03T03:57:37.350Z', NULL, 'present', 0.00, NULL, '2026-09-03T03:57:37.699Z', 23.5937331, 72.3580264, 'Modhera Rd, Prabhunagar, Mahesana Taluka, Mahesana, Gujarat, 384001, India', NULL, NULL, 0, NULL),
('584c2260-bb92-4031-a914-aded3d38cc10', 'a0f6eb30-79cd-4e6b-a1d7-1ca2f764a690', '2026-09-02T18:30:00.000Z', '2026-09-03T04:00:30.382Z', NULL, 'present', 0.00, NULL, '2026-09-03T04:00:30.731Z', 23.5937361, 72.3580173, 'Modhera Rd, Prabhunagar, Mahesana Taluka, Mahesana, Gujarat, 384001, India', NULL, NULL, 0, NULL),
('7065a063-01a2-4ee9-9ab1-18dcb80bc537', '73116e41-29af-4c4f-ad4b-bb34aced2b47', '2026-09-02T18:30:00.000Z', '2026-09-03T05:01:23.710Z', NULL, 'present', 0.00, NULL, '2026-09-03T05:01:24.047Z', 23.5940123, 72.359046, 'Modhera Rd, Prabhunagar, Mahesana Taluka, Mahesana, Gujarat, 384001, India', NULL, NULL, 0, NULL),
('329d1e9a-87f3-4511-93c3-2d26c434f8eb', '68c002cc-20db-4966-ab6e-e2cf66b42b41', '2026-09-06T18:30:00.000Z', '2026-09-07T04:00:27.459Z', NULL, 'present', 0.00, NULL, '2026-09-07T04:00:27.791Z', 23.5937322, 72.3580686, 'Modhera Rd, Prabhunagar, Mahesana Taluka, Mahesana, Gujarat, 384001, India', NULL, NULL, 0, NULL),
('e2b8ee13-1f9e-44bb-ac27-e95320e8b5cf', 'a0f6eb30-79cd-4e6b-a1d7-1ca2f764a690', '2026-09-07T18:30:00.000Z', '2026-09-08T04:07:16.766Z', NULL, 'present', 0.00, NULL, '2026-09-08T04:07:17.102Z', 23.5937104, 72.3579976, 'Modhera Rd, Prabhunagar, Mahesana Taluka, Mahesana, Gujarat, 384001, India', NULL, NULL, 0, NULL),
('7380b28e-7ded-4f58-8fee-e020e1ca1d7f', 'd0625c86-49b2-46eb-93c6-99a723c00416', '2026-09-07T18:30:00.000Z', '2026-09-08T04:43:23.132Z', NULL, 'present', 0.00, NULL, '2026-09-08T04:43:23.482Z', 23.593713, 72.3580351, 'Modhera Rd, Prabhunagar, Mahesana Taluka, Mahesana, Gujarat, 384001, India', '2026-09-08T07:01:51.660Z', '2026-09-08T08:54:14.070Z', 112, NULL);

-- Table: "public"."attendance_settings"
DROP TABLE IF EXISTS "public"."attendance_settings" CASCADE;
CREATE TABLE "public"."attendance_settings" (
  "id" int4 NOT NULL DEFAULT 1,
  "shift_start_time" text NOT NULL DEFAULT '10:00'::text,
  "shift_end_time" text NOT NULL DEFAULT '19:00'::text,
  "late_grace_period_mins" int4 NOT NULL DEFAULT 15,
  "minimum_hours_for_half_day" numeric(4,2) NOT NULL DEFAULT 4.5,
  "minimum_hours_for_full_day" numeric(4,2) NOT NULL DEFAULT 8.0,
  "monthly_paid_leaves" int4 NOT NULL DEFAULT 1,
  "allowed_break_mins" int4 NOT NULL DEFAULT 60,
  "updated_by" text,
  "updated_at" timestamptz DEFAULT now()
);
ALTER TABLE ONLY "public"."attendance_settings" ADD CONSTRAINT "attendance_settings_allowed_break_mins_not_null" NOT NULL allowed_break_mins;
ALTER TABLE ONLY "public"."attendance_settings" ADD CONSTRAINT "attendance_settings_id_check" CHECK ((id = 1));
ALTER TABLE ONLY "public"."attendance_settings" ADD CONSTRAINT "attendance_settings_id_not_null" NOT NULL id;
ALTER TABLE ONLY "public"."attendance_settings" ADD CONSTRAINT "attendance_settings_late_grace_period_mins_not_null" NOT NULL late_grace_period_mins;
ALTER TABLE ONLY "public"."attendance_settings" ADD CONSTRAINT "attendance_settings_minimum_hours_for_full_day_not_null" NOT NULL minimum_hours_for_full_day;
ALTER TABLE ONLY "public"."attendance_settings" ADD CONSTRAINT "attendance_settings_minimum_hours_for_half_day_not_null" NOT NULL minimum_hours_for_half_day;
ALTER TABLE ONLY "public"."attendance_settings" ADD CONSTRAINT "attendance_settings_monthly_paid_leaves_not_null" NOT NULL monthly_paid_leaves;
ALTER TABLE ONLY "public"."attendance_settings" ADD CONSTRAINT "attendance_settings_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY "public"."attendance_settings" ADD CONSTRAINT "attendance_settings_shift_end_time_not_null" NOT NULL shift_end_time;
ALTER TABLE ONLY "public"."attendance_settings" ADD CONSTRAINT "attendance_settings_shift_start_time_not_null" NOT NULL shift_start_time;

-- Data: 1 rows
INSERT INTO "public"."attendance_settings" ("id", "shift_start_time", "shift_end_time", "late_grace_period_mins", "minimum_hours_for_half_day", "minimum_hours_for_full_day", "monthly_paid_leaves", "allowed_break_mins", "updated_by", "updated_at") VALUES
(1, '09:30', '18:30', 10, 4.50, 8.00, 1, 60, '2945609a-08cc-4bb5-a6f5-7e9dbf8b3f6d', '2026-09-09T05:38:50.309Z');

-- Table: "public"."client_shares"
DROP TABLE IF EXISTS "public"."client_shares" CASCADE;
CREATE TABLE "public"."client_shares" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "client_id" uuid NOT NULL,
  "token" text NOT NULL,
  "created_by" uuid,
  "last_accessed_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE ONLY "public"."client_shares" ADD CONSTRAINT "client_shares_client_id_fkey" FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;
ALTER TABLE ONLY "public"."client_shares" ADD CONSTRAINT "client_shares_client_id_not_null" NOT NULL client_id;
ALTER TABLE ONLY "public"."client_shares" ADD CONSTRAINT "client_shares_created_at_not_null" NOT NULL created_at;
ALTER TABLE ONLY "public"."client_shares" ADD CONSTRAINT "client_shares_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE ONLY "public"."client_shares" ADD CONSTRAINT "client_shares_id_not_null" NOT NULL id;
ALTER TABLE ONLY "public"."client_shares" ADD CONSTRAINT "client_shares_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY "public"."client_shares" ADD CONSTRAINT "client_shares_token_key" UNIQUE (token);
ALTER TABLE ONLY "public"."client_shares" ADD CONSTRAINT "client_shares_token_not_null" NOT NULL token;
CREATE INDEX idx_client_shares_client ON public.client_shares USING btree (client_id);
-- no rows in "public"."client_shares"

-- Table: "public"."clients"
DROP TABLE IF EXISTS "public"."clients" CASCADE;
CREATE TABLE "public"."clients" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  "company" text,
  "email" text,
  "phone" text,
  "created_by" uuid,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "assigned_pm_id" uuid
);
ALTER TABLE ONLY "public"."clients" ADD CONSTRAINT "clients_assigned_pm_id_fkey" FOREIGN KEY (assigned_pm_id) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE ONLY "public"."clients" ADD CONSTRAINT "clients_created_at_not_null" NOT NULL created_at;
ALTER TABLE ONLY "public"."clients" ADD CONSTRAINT "clients_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE ONLY "public"."clients" ADD CONSTRAINT "clients_id_not_null" NOT NULL id;
ALTER TABLE ONLY "public"."clients" ADD CONSTRAINT "clients_name_not_null" NOT NULL name;
ALTER TABLE ONLY "public"."clients" ADD CONSTRAINT "clients_pkey" PRIMARY KEY (id);
CREATE INDEX idx_clients_assigned_pm ON public.clients USING btree (assigned_pm_id);
CREATE INDEX idx_clients_name ON public.clients USING btree (name);

-- Data: 28 rows
INSERT INTO "public"."clients" ("id", "name", "company", "email", "phone", "created_by", "created_at", "assigned_pm_id") VALUES
('b8675266-375c-420d-b769-a2b53b9f9956', 'Slok Patel', 'Shivion Lakeview', NULL, NULL, '7383317a-b7ac-46d8-9db8-43b8c4e4afa9', '2026-09-08T12:04:27.912Z', '7383317a-b7ac-46d8-9db8-43b8c4e4afa9'),
('b3855796-5fa1-4253-a064-fb77269ec7fb', 'Maneshbhai Patel', 'Shivyan Height', NULL, NULL, '7383317a-b7ac-46d8-9db8-43b8c4e4afa9', '2026-09-08T12:05:01.365Z', '7383317a-b7ac-46d8-9db8-43b8c4e4afa9'),
('c35a9d05-7ba9-4daa-8332-131f5e113d55', 'Chintan Patel', 'Ekarth Ananta', NULL, NULL, '7383317a-b7ac-46d8-9db8-43b8c4e4afa9', '2026-09-08T12:06:12.778Z', '7383317a-b7ac-46d8-9db8-43b8c4e4afa9'),
('3640ce54-899a-48eb-9db6-f0c8a8218b62', 'Jenil Patel', 'Saundarya Legacy', NULL, NULL, '7383317a-b7ac-46d8-9db8-43b8c4e4afa9', '2026-09-08T12:06:33.290Z', '7383317a-b7ac-46d8-9db8-43b8c4e4afa9'),
('b7ebd6d9-90af-4c40-9806-6beeed09bd1d', 'Lalbhai Patel', 'Lalji Luxuria', NULL, NULL, '2945609a-08cc-4bb5-a6f5-7e9dbf8b3f6d', '2026-09-07T09:30:43.118Z', '7383317a-b7ac-46d8-9db8-43b8c4e4afa9'),
('7f0a18da-f2c3-450e-90ed-91ee11f7cc43', 'WORLD GURU', 'WORLD GURU', NULL, NULL, 'd0625c86-49b2-46eb-93c6-99a723c00416', '2026-09-08T12:10:00.720Z', 'd0625c86-49b2-46eb-93c6-99a723c00416'),
('80f8c589-2df7-4e9e-80ff-b4dcde893bf0', 'khodiyar chsama ghar', 'khodiyar chsama ghar', NULL, '+91 820 057 7399', 'd0625c86-49b2-46eb-93c6-99a723c00416', '2026-09-08T12:21:17.032Z', 'd0625c86-49b2-46eb-93c6-99a723c00416'),
('5fd382ad-8d20-4f08-a278-d9c6eeeaf685', 'Pelican nest', 'Pelican nest', NULL, NULL, 'd0625c86-49b2-46eb-93c6-99a723c00416', '2026-09-08T12:34:10.786Z', 'd0625c86-49b2-46eb-93c6-99a723c00416'),
('1d1730b6-056b-4ce6-8c1d-446a0f17ddbc', 'Aalayam palacia', 'Aalayam palacia', NULL, NULL, 'd0625c86-49b2-46eb-93c6-99a723c00416', '2026-09-08T12:35:36.454Z', 'd0625c86-49b2-46eb-93c6-99a723c00416'),
('b1770f5a-6b19-408a-af72-ebacc81e9969', 'Shivalik Velenza', 'Shivalik Velenza', NULL, NULL, 'd0625c86-49b2-46eb-93c6-99a723c00416', '2026-09-08T12:37:08.288Z', 'd0625c86-49b2-46eb-93c6-99a723c00416'),
('3a353688-1fce-4083-8121-50798393ff0c', 'Shivalik Satvam', 'Shivalik Satvam', NULL, NULL, 'd0625c86-49b2-46eb-93c6-99a723c00416', '2026-09-08T12:37:40.730Z', 'd0625c86-49b2-46eb-93c6-99a723c00416'),
('b6e02131-d8a8-4d63-a2e2-110089459985', 'Casa Estrella', 'Casa Estrella', NULL, NULL, 'd0625c86-49b2-46eb-93c6-99a723c00416', '2026-09-08T12:38:41.984Z', 'd0625c86-49b2-46eb-93c6-99a723c00416'),
('e21ded4f-d7f1-483b-a053-34d6e0448298', 'Casa Infinity', 'Casa Infinity', NULL, NULL, 'd0625c86-49b2-46eb-93c6-99a723c00416', '2026-09-08T12:42:15.464Z', 'd0625c86-49b2-46eb-93c6-99a723c00416'),
('b0d989f9-07f0-405e-bd7a-af01e73a5056', 'Nand Gokul', 'Nand Gokul', NULL, NULL, 'd0625c86-49b2-46eb-93c6-99a723c00416', '2026-09-08T12:42:50.804Z', 'd0625c86-49b2-46eb-93c6-99a723c00416'),
('3bc662b1-b527-4126-bdef-b7ecb599e2cf', 'YouCan Industrail Park', 'YouCan Industrail Park', NULL, NULL, 'd0625c86-49b2-46eb-93c6-99a723c00416', '2026-09-08T12:44:16.811Z', 'd0625c86-49b2-46eb-93c6-99a723c00416'),
('642a9b4e-ec95-40ed-9d75-5b14153c513f', 'Aarush Height', 'Aarush Height', NULL, NULL, 'd0625c86-49b2-46eb-93c6-99a723c00416', '2026-09-08T12:48:26.162Z', 'd0625c86-49b2-46eb-93c6-99a723c00416'),
('5f626954-ef46-4b69-8046-16c75f723da9', 'SHIV SANIDHYA', 'SHIV SANIDHYA', NULL, NULL, 'd0625c86-49b2-46eb-93c6-99a723c00416', '2026-09-08T12:51:55.114Z', 'd0625c86-49b2-46eb-93c6-99a723c00416'),
('a920ee65-727f-4ac1-a562-12d8d1d639d9', 'Aalayam Royal', 'Aalayam Royal', NULL, NULL, 'd0625c86-49b2-46eb-93c6-99a723c00416', '2026-09-08T12:52:36.796Z', 'd0625c86-49b2-46eb-93c6-99a723c00416'),
('b40af818-41c2-4f2e-b679-033c44906195', 'Khodiyar Chashmah ghar', 'Khodiyar Chashmah ghar', NULL, NULL, 'd0625c86-49b2-46eb-93c6-99a723c00416', '2026-09-08T12:57:43.123Z', 'd0625c86-49b2-46eb-93c6-99a723c00416'),
('e15fe4c0-a14d-4292-8b69-dc32432d1cda', 'Pavan Kaur', 'venus Techno Equipment Pvt Ltd', NULL, NULL, '2945609a-08cc-4bb5-a6f5-7e9dbf8b3f6d', '2026-09-02T04:21:39.455Z', 'd0625c86-49b2-46eb-93c6-99a723c00416'),
('fa33a6cf-923a-4377-aa96-40ccb82f81a4', 'Aalayam Royal', 'Aalayam Royal', NULL, NULL, '2945609a-08cc-4bb5-a6f5-7e9dbf8b3f6d', '2026-09-03T05:07:07.766Z', 'd0625c86-49b2-46eb-93c6-99a723c00416'),
('94fe4272-a534-40bb-afad-acf064b9bee4', 'Aarush Height', 'Aarush Height', NULL, NULL, '2945609a-08cc-4bb5-a6f5-7e9dbf8b3f6d', '2026-09-03T05:07:18.434Z', 'd0625c86-49b2-46eb-93c6-99a723c00416'),
('fe0626a4-98e0-40de-b8b3-4828423f62c5', 'Nand Gokul', 'Nand Gokul', NULL, NULL, '2945609a-08cc-4bb5-a6f5-7e9dbf8b3f6d', '2026-09-07T09:30:31.762Z', 'd0625c86-49b2-46eb-93c6-99a723c00416'),
('ba0236e3-0ff8-48fc-9ed9-4d9ff1fb41bf', 'Mateswari Luxuria', 'Mateswari Luxuria', NULL, NULL, '2945609a-08cc-4bb5-a6f5-7e9dbf8b3f6d', '2026-09-07T09:30:20.026Z', '7383317a-b7ac-46d8-9db8-43b8c4e4afa9'),
('3c2910d4-755c-432e-9274-bf5066c0d18a', 'Dr Meera Gandhi', 'Jivanyog Nursing Home', NULL, NULL, '2945609a-08cc-4bb5-a6f5-7e9dbf8b3f6d', '2026-09-07T09:26:35.595Z', '7383317a-b7ac-46d8-9db8-43b8c4e4afa9'),
('8543e780-f067-4e8d-91f9-baa4d4cad763', 'shailesh kumar patel', 'The Vikas Co Op Credit Society Ltd', NULL, NULL, 'd0625c86-49b2-46eb-93c6-99a723c00416', '2026-09-08T06:20:02.274Z', 'd0625c86-49b2-46eb-93c6-99a723c00416'),
('c76f371e-6b54-4bb9-9725-e55b6038f1fe', 'Vinay Gupta', 'Sun Glow Energy', NULL, NULL, 'd0625c86-49b2-46eb-93c6-99a723c00416', '2026-09-08T10:45:07.247Z', 'd0625c86-49b2-46eb-93c6-99a723c00416'),
('1d43f7e6-7f9f-4bd4-9290-7a34b2122116', 'Vipul Prajapati', 'VR Enterprise', NULL, NULL, 'd0625c86-49b2-46eb-93c6-99a723c00416', '2026-09-08T10:40:26.570Z', 'd0625c86-49b2-46eb-93c6-99a723c00416');

-- Table: "public"."contents"
DROP TABLE IF EXISTS "public"."contents" CASCADE;
CREATE TABLE "public"."contents" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "client_id" uuid NOT NULL,
  "title" text NOT NULL,
  "body" text,
  "remarks" text,
  "assignee_id" uuid,
  "status" text NOT NULL DEFAULT 'active'::text,
  "created_by" uuid,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "completed_at" timestamptz,
  "task_id" uuid
);
ALTER TABLE ONLY "public"."contents" ADD CONSTRAINT "contents_assignee_id_fkey" FOREIGN KEY (assignee_id) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE ONLY "public"."contents" ADD CONSTRAINT "contents_client_id_fkey" FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;
ALTER TABLE ONLY "public"."contents" ADD CONSTRAINT "contents_client_id_not_null" NOT NULL client_id;
ALTER TABLE ONLY "public"."contents" ADD CONSTRAINT "contents_created_at_not_null" NOT NULL created_at;
ALTER TABLE ONLY "public"."contents" ADD CONSTRAINT "contents_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE ONLY "public"."contents" ADD CONSTRAINT "contents_id_not_null" NOT NULL id;
ALTER TABLE ONLY "public"."contents" ADD CONSTRAINT "contents_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY "public"."contents" ADD CONSTRAINT "contents_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'completed'::text])));
ALTER TABLE ONLY "public"."contents" ADD CONSTRAINT "contents_status_not_null" NOT NULL status;
ALTER TABLE ONLY "public"."contents" ADD CONSTRAINT "contents_task_id_fkey" FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL;
ALTER TABLE ONLY "public"."contents" ADD CONSTRAINT "contents_title_not_null" NOT NULL title;
ALTER TABLE ONLY "public"."contents" ADD CONSTRAINT "contents_updated_at_not_null" NOT NULL updated_at;
CREATE INDEX idx_contents_assignee ON public.contents USING btree (assignee_id);
CREATE INDEX idx_contents_client ON public.contents USING btree (client_id);
CREATE INDEX idx_contents_completed_at ON public.contents USING btree (completed_at);
CREATE INDEX idx_contents_status ON public.contents USING btree (status);
CREATE INDEX idx_contents_task ON public.contents USING btree (task_id);

-- Data: 18 rows
INSERT INTO "public"."contents" ("id", "client_id", "title", "body", "remarks", "assignee_id", "status", "created_by", "created_at", "updated_at", "completed_at", "task_id") VALUES
('4ac08bb4-c449-45bb-8c91-627d57b166fe', 'fa33a6cf-923a-4377-aa96-40ccb82f81a4', 'Multipurpose Hall ma Celebrationની મજા', NULL, NULL, '68c002cc-20db-4966-ab6e-e2cf66b42b41', 'completed', '2945609a-08cc-4bb5-a6f5-7e9dbf8b3f6d', '2026-09-03T05:15:50.481Z', '2026-09-03T05:16:34.200Z', '2026-09-03T05:16:34.200Z', NULL),
('a9314edc-63bc-4e08-9b69-f9fe25074e3b', 'fa33a6cf-923a-4377-aa96-40ccb82f81a4', 'Greenery સાથે Freshnessની મજા', NULL, NULL, '68c002cc-20db-4966-ab6e-e2cf66b42b41', 'completed', '2945609a-08cc-4bb5-a6f5-7e9dbf8b3f6d', '2026-09-03T05:15:58.525Z', '2026-09-03T05:16:34.433Z', '2026-09-03T05:16:34.433Z', NULL),
('6c15b16f-cfb7-44a4-99bb-bd7531a15550', 'fa33a6cf-923a-4377-aa96-40ccb82f81a4', 'GYM સાથે Fitnessની મજા', NULL, NULL, '68c002cc-20db-4966-ab6e-e2cf66b42b41', 'completed', '2945609a-08cc-4bb5-a6f5-7e9dbf8b3f6d', '2026-09-03T05:16:08.854Z', '2026-09-03T05:16:34.658Z', '2026-09-03T05:16:34.658Z', NULL),
('16f17eef-1daa-450d-a9e7-82509b5ef911', 'fa33a6cf-923a-4377-aa96-40ccb82f81a4', 'Aalayam Royal, પરિવારને ગમે', NULL, NULL, '68c002cc-20db-4966-ab6e-e2cf66b42b41', 'completed', '2945609a-08cc-4bb5-a6f5-7e9dbf8b3f6d', '2026-09-03T09:11:38.129Z', '2026-09-03T10:46:36.946Z', '2026-09-03T10:46:36.946Z', NULL),
('aa8f2774-7401-4b83-a670-306b53f25e4a', 'fa33a6cf-923a-4377-aa96-40ccb82f81a4', 'Budget એવું, ખિસ્સાને ગમે', NULL, NULL, '68c002cc-20db-4966-ab6e-e2cf66b42b41', 'completed', '2945609a-08cc-4bb5-a6f5-7e9dbf8b3f6d', '2026-09-03T09:11:32.274Z', '2026-09-03T10:46:37.199Z', '2026-09-03T10:46:37.199Z', NULL),
('558f2c3a-e8a5-4c65-8888-bd1282379e89', 'fa33a6cf-923a-4377-aa96-40ccb82f81a4', 'Location એવી, દિલને ગમે', NULL, NULL, '68c002cc-20db-4966-ab6e-e2cf66b42b41', 'completed', '2945609a-08cc-4bb5-a6f5-7e9dbf8b3f6d', '2026-09-03T09:11:24.822Z', '2026-09-03T10:46:37.426Z', '2026-09-03T10:46:37.426Z', NULL),
('1c130784-be6a-40ad-80de-5da58f0efe24', 'fa33a6cf-923a-4377-aa96-40ccb82f81a4', 'જ્યાં દિલને ઘર મળી જાય', NULL, NULL, '68c002cc-20db-4966-ab6e-e2cf66b42b41', 'completed', '2945609a-08cc-4bb5-a6f5-7e9dbf8b3f6d', '2026-09-03T09:11:19.718Z', '2026-09-03T10:46:37.649Z', '2026-09-03T10:46:37.649Z', NULL),
('3399479e-b6fa-4ff2-a3a7-30214f242ab4', 'fa33a6cf-923a-4377-aa96-40ccb82f81a4', 'જ્યાં પરિવાર સાથે દરેક પળ ખાસ બની જાય', NULL, NULL, '68c002cc-20db-4966-ab6e-e2cf66b42b41', 'completed', '2945609a-08cc-4bb5-a6f5-7e9dbf8b3f6d', '2026-09-03T09:11:11.801Z', '2026-09-03T10:46:37.875Z', '2026-09-03T10:46:37.875Z', NULL),
('cf4a198f-92c1-4150-92c7-951ff218ebc2', 'fa33a6cf-923a-4377-aa96-40ccb82f81a4', 'જ્યાં દરેક ખૂણો ખુશીઓથી ભરાય', NULL, NULL, '68c002cc-20db-4966-ab6e-e2cf66b42b41', 'completed', '2945609a-08cc-4bb5-a6f5-7e9dbf8b3f6d', '2026-09-03T09:11:03.815Z', '2026-09-03T10:46:38.097Z', '2026-09-03T10:46:38.097Z', NULL),
('91aebe1d-f73c-4cc0-9ca6-09557db26b71', '3c2910d4-755c-432e-9274-bf5066c0d18a', 'POST 1 — IVF પછી શું ધ્યાનમાં રાખવું જોઈએ?', 'POST 1 — IVF પછી શું ધ્યાનમાં રાખવું જોઈએ?

- એમ્બ્રિયો ટ્રાન્સફર પછી સામાન્ય હળવી પ્રવૃત્તિ કરી શકાય.
- ભારે વજન ઉઠાવવાનું ટાળો.
- દવાઓ સમયસર લો.
- પૂરતો આરામ અને ઊંઘ લો.
- ડૉક્ટરની સલાહ વગર દવા બંધ ન કરો.
- પ્રેગ્નન્સી ટેસ્ટ માટે જણાવેલી તારીખનું પાલન કરો.', NULL, 'f5fd7e86-7927-42e5-9b4c-e01122055bcd', 'active', 'd0625c86-49b2-46eb-93c6-99a723c00416', '2026-09-07T09:27:47.117Z', '2026-09-07T09:27:47.117Z', NULL, NULL),
('f854359a-bc31-42cb-9081-0bc72647dea2', '94fe4272-a534-40bb-afad-acf064b9bee4', 'Fitness માટે Gym', NULL, NULL, '68c002cc-20db-4966-ab6e-e2cf66b42b41', 'completed', '2945609a-08cc-4bb5-a6f5-7e9dbf8b3f6d', '2026-09-03T05:15:02.248Z', '2026-09-07T04:59:24.920Z', '2026-09-07T04:59:24.920Z', NULL),
('013fbacb-22ac-4716-8a0a-4c60ea59f64b', '94fe4272-a534-40bb-afad-acf064b9bee4', 'Relax માટે Gazebo', NULL, NULL, '68c002cc-20db-4966-ab6e-e2cf66b42b41', 'completed', '2945609a-08cc-4bb5-a6f5-7e9dbf8b3f6d', '2026-09-03T05:15:08.075Z', '2026-09-07T04:59:25.144Z', '2026-09-07T04:59:25.144Z', NULL),
('d4204ed1-88f5-4d54-acac-70dc853ae770', '94fe4272-a534-40bb-afad-acf064b9bee4', 'Kids માટે Play Area', NULL, NULL, '68c002cc-20db-4966-ab6e-e2cf66b42b41', 'completed', '2945609a-08cc-4bb5-a6f5-7e9dbf8b3f6d', '2026-09-03T05:14:56.592Z', '2026-09-07T04:59:25.359Z', '2026-09-07T04:59:25.359Z', NULL),
('6a8fe1ed-7d08-4f65-a9b5-066b10a8333b', '3c2910d4-755c-432e-9274-bf5066c0d18a', 'POST 2 — IVF સફળતા કયા Factors પર આધારિત છે?', 'POST 2 — IVF સફળતા કયા Factors પર આધારિત છે?

- મહિલાની ઉંમર
- Egg Quality
- Sperm Quality
- Embryo Quality
- Uterus ની સ્થિતિ
- અગાઉની IVF History
- યોગ્ય સારવાર અને તબીબી માર્ગદર્શન', NULL, 'f5fd7e86-7927-42e5-9b4c-e01122055bcd', 'active', 'd0625c86-49b2-46eb-93c6-99a723c00416', '2026-09-07T09:28:15.167Z', '2026-09-07T09:28:15.167Z', NULL, NULL),
('4bd6b3d4-ff7f-4074-a517-9ff51ad19a33', '3c2910d4-755c-432e-9274-bf5066c0d18a', 'IVF શરૂ કરતા પહેલાં આ વાતો જાણો', 'IVF શરૂ કરતા પહેલાં આ વાતો જાણો

- IVF દરેક વ્યક્તિ માટે એકસરખું નથી.
- Treatment Plan વ્યક્તિની પરિસ્થિતિ પ્રમાણે નક્કી થાય છે.
- IVF માટે Egg & Sperm Quality મહત્વપૂર્ણ છે.
- દરેક cycleનું outcome અલગ હોઈ શકે છે.
- Medicines અને injections સમયસર લેવા જરૂરી છે.
- Treatment દરમિયાન regular follow-up જરૂરી છે.
- કોઈપણ doubt હોય તો Doctor સાથે ચર્ચા કરો.', NULL, 'f5fd7e86-7927-42e5-9b4c-e01122055bcd', 'active', 'd0625c86-49b2-46eb-93c6-99a723c00416', '2026-09-07T09:28:41.131Z', '2026-09-07T09:28:41.131Z', NULL, NULL),
('2d1d4bb1-ab0e-44c2-9ab4-bda71c5cd94d', '94fe4272-a534-40bb-afad-acf064b9bee4', 'તમારા સપનાના ઘર માટે એકદમ Perfect', NULL, NULL, '68c002cc-20db-4966-ab6e-e2cf66b42b41', 'completed', '2945609a-08cc-4bb5-a6f5-7e9dbf8b3f6d', '2026-09-03T08:15:45.282Z', '2026-09-08T04:49:06.440Z', '2026-09-08T04:49:06.440Z', NULL),
('6708e9dd-960a-4f06-81a0-7acd61705960', '94fe4272-a534-40bb-afad-acf064b9bee4', 'પરિવારની ખુશીઓ માટે એકદમ Best', NULL, NULL, '68c002cc-20db-4966-ab6e-e2cf66b42b41', 'completed', '2945609a-08cc-4bb5-a6f5-7e9dbf8b3f6d', '2026-09-03T08:15:34.785Z', '2026-09-08T04:49:06.668Z', '2026-09-08T04:49:06.668Z', NULL),
('61a6daed-6d63-4109-8c13-384031ffa203', '94fe4272-a534-40bb-afad-acf064b9bee4', 'Budgetમાં Perfect, Locationમાં Best', NULL, NULL, '68c002cc-20db-4966-ab6e-e2cf66b42b41', 'completed', '2945609a-08cc-4bb5-a6f5-7e9dbf8b3f6d', '2026-09-03T08:15:27.335Z', '2026-09-08T04:49:06.895Z', '2026-09-08T04:49:06.895Z', NULL);

-- Table: "public"."deliverable_assignees"
DROP TABLE IF EXISTS "public"."deliverable_assignees" CASCADE;
CREATE TABLE "public"."deliverable_assignees" (
  "deliverable_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "position" int4 NOT NULL DEFAULT 0,
  "added_at" timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE ONLY "public"."deliverable_assignees" ADD CONSTRAINT "deliverable_assignees_added_at_not_null" NOT NULL added_at;
ALTER TABLE ONLY "public"."deliverable_assignees" ADD CONSTRAINT "deliverable_assignees_deliverable_id_fkey" FOREIGN KEY (deliverable_id) REFERENCES project_deliverables(id) ON DELETE CASCADE;
ALTER TABLE ONLY "public"."deliverable_assignees" ADD CONSTRAINT "deliverable_assignees_deliverable_id_not_null" NOT NULL deliverable_id;
ALTER TABLE ONLY "public"."deliverable_assignees" ADD CONSTRAINT "deliverable_assignees_pkey" PRIMARY KEY (deliverable_id, user_id);
ALTER TABLE ONLY "public"."deliverable_assignees" ADD CONSTRAINT "deliverable_assignees_position_not_null" NOT NULL "position";
ALTER TABLE ONLY "public"."deliverable_assignees" ADD CONSTRAINT "deliverable_assignees_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE ONLY "public"."deliverable_assignees" ADD CONSTRAINT "deliverable_assignees_user_id_not_null" NOT NULL user_id;
CREATE INDEX idx_deliverable_assignees_seq ON public.deliverable_assignees USING btree (deliverable_id, "position");
-- no rows in "public"."deliverable_assignees"

-- Table: "public"."deliverable_types"
DROP TABLE IF EXISTS "public"."deliverable_types" CASCADE;
CREATE TABLE "public"."deliverable_types" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "key" text NOT NULL,
  "label" text NOT NULL,
  "content_role" text,
  "visual_role" text,
  "default_qty" int4 NOT NULL DEFAULT 1,
  "sort" int4 NOT NULL DEFAULT 0
);
ALTER TABLE ONLY "public"."deliverable_types" ADD CONSTRAINT "deliverable_types_content_role_fkey" FOREIGN KEY (content_role) REFERENCES roles(key) ON DELETE RESTRICT;
ALTER TABLE ONLY "public"."deliverable_types" ADD CONSTRAINT "deliverable_types_default_qty_not_null" NOT NULL default_qty;
ALTER TABLE ONLY "public"."deliverable_types" ADD CONSTRAINT "deliverable_types_id_not_null" NOT NULL id;
ALTER TABLE ONLY "public"."deliverable_types" ADD CONSTRAINT "deliverable_types_key_key" UNIQUE (key);
ALTER TABLE ONLY "public"."deliverable_types" ADD CONSTRAINT "deliverable_types_key_not_null" NOT NULL key;
ALTER TABLE ONLY "public"."deliverable_types" ADD CONSTRAINT "deliverable_types_label_not_null" NOT NULL label;
ALTER TABLE ONLY "public"."deliverable_types" ADD CONSTRAINT "deliverable_types_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY "public"."deliverable_types" ADD CONSTRAINT "deliverable_types_sort_not_null" NOT NULL sort;
ALTER TABLE ONLY "public"."deliverable_types" ADD CONSTRAINT "deliverable_types_visual_role_fkey" FOREIGN KEY (visual_role) REFERENCES roles(key) ON DELETE RESTRICT;

-- Data: 8 rows
INSERT INTO "public"."deliverable_types" ("id", "key", "label", "content_role", "visual_role", "default_qty", "sort") VALUES
('4e71e463-c87d-46f7-92ad-c7174faa5158', 'static_post', 'Static Post', 'WRITER', 'DESIGNER', 1, 10),
('7dcf33b3-c91a-4620-8fcd-cb5f38853c23', 'reel', 'Reel', 'WRITER', 'EDITOR', 1, 20),
('09afe56e-9f15-4b83-999e-87d4b7189ebc', 'story', 'Story', 'WRITER', 'DESIGNER', 1, 30),
('b75edb60-e6ed-45f8-beb5-6081568278ff', 'banner', 'Banner', 'WRITER', 'DESIGNER', 1, 60),
('9f8f4236-f9e1-4944-972a-03c31acfe11c', 'content_writing', 'Content Piece', 'WRITER', NULL, 1, 70),
('c3cb6e34-0c47-44af-ae7a-fd494667b983', 'design_asset', 'Design Asset', NULL, 'DESIGNER', 1, 80),
('da2ec95f-80e6-490e-a55e-90909c22cf0f', 'video_shoot', 'Video Shoot', 'WRITER', 'EDITOR', 1, 40),
('c7ab5bf3-d1c2-4148-a776-bf7cf594bd28', 'video_edit', 'Video Edit', 'WRITER', 'EDITOR', 1, 50);

-- Table: "public"."leads"
DROP TABLE IF EXISTS "public"."leads" CASCADE;
CREATE TABLE "public"."leads" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  "company" text,
  "email" text,
  "phone" text,
  "source" text NOT NULL DEFAULT 'other'::text,
  "status" text NOT NULL DEFAULT 'new'::text,
  "deal_value" numeric(12,2) DEFAULT 0,
  "notes" text,
  "next_follow_up" date,
  "owner_id" uuid NOT NULL,
  "converted_client_id" uuid,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE ONLY "public"."leads" ADD CONSTRAINT "leads_converted_client_id_fkey" FOREIGN KEY (converted_client_id) REFERENCES clients(id) ON DELETE SET NULL;
ALTER TABLE ONLY "public"."leads" ADD CONSTRAINT "leads_created_at_not_null" NOT NULL created_at;
ALTER TABLE ONLY "public"."leads" ADD CONSTRAINT "leads_id_not_null" NOT NULL id;
ALTER TABLE ONLY "public"."leads" ADD CONSTRAINT "leads_name_not_null" NOT NULL name;
ALTER TABLE ONLY "public"."leads" ADD CONSTRAINT "leads_owner_id_fkey" FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE ONLY "public"."leads" ADD CONSTRAINT "leads_owner_id_not_null" NOT NULL owner_id;
ALTER TABLE ONLY "public"."leads" ADD CONSTRAINT "leads_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY "public"."leads" ADD CONSTRAINT "leads_source_not_null" NOT NULL source;
ALTER TABLE ONLY "public"."leads" ADD CONSTRAINT "leads_status_not_null" NOT NULL status;
ALTER TABLE ONLY "public"."leads" ADD CONSTRAINT "leads_updated_at_not_null" NOT NULL updated_at;
CREATE INDEX idx_leads_owner ON public.leads USING btree (owner_id, created_at DESC);
CREATE INDEX idx_leads_status ON public.leads USING btree (status);
-- no rows in "public"."leads"

-- Table: "public"."leaves"
DROP TABLE IF EXISTS "public"."leaves" CASCADE;
CREATE TABLE "public"."leaves" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL,
  "leave_type" text NOT NULL,
  "start_date" date NOT NULL,
  "end_date" date NOT NULL,
  "days" int4 NOT NULL DEFAULT 1,
  "reason" text NOT NULL,
  "status" text NOT NULL DEFAULT 'pending'::text,
  "approved_by" uuid,
  "approved_at" timestamptz,
  "rejection_reason" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "is_paid" bool NOT NULL DEFAULT true
);
ALTER TABLE ONLY "public"."leaves" ADD CONSTRAINT "leaves_approved_by_fkey" FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE ONLY "public"."leaves" ADD CONSTRAINT "leaves_created_at_not_null" NOT NULL created_at;
ALTER TABLE ONLY "public"."leaves" ADD CONSTRAINT "leaves_days_not_null" NOT NULL days;
ALTER TABLE ONLY "public"."leaves" ADD CONSTRAINT "leaves_end_date_not_null" NOT NULL end_date;
ALTER TABLE ONLY "public"."leaves" ADD CONSTRAINT "leaves_id_not_null" NOT NULL id;
ALTER TABLE ONLY "public"."leaves" ADD CONSTRAINT "leaves_is_paid_not_null" NOT NULL is_paid;
ALTER TABLE ONLY "public"."leaves" ADD CONSTRAINT "leaves_leave_type_not_null" NOT NULL leave_type;
ALTER TABLE ONLY "public"."leaves" ADD CONSTRAINT "leaves_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY "public"."leaves" ADD CONSTRAINT "leaves_reason_not_null" NOT NULL reason;
ALTER TABLE ONLY "public"."leaves" ADD CONSTRAINT "leaves_start_date_not_null" NOT NULL start_date;
ALTER TABLE ONLY "public"."leaves" ADD CONSTRAINT "leaves_status_not_null" NOT NULL status;
ALTER TABLE ONLY "public"."leaves" ADD CONSTRAINT "leaves_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE ONLY "public"."leaves" ADD CONSTRAINT "leaves_user_id_not_null" NOT NULL user_id;
CREATE INDEX idx_leaves_dates ON public.leaves USING btree (start_date, end_date);
CREATE INDEX idx_leaves_status ON public.leaves USING btree (status);
CREATE INDEX idx_leaves_user ON public.leaves USING btree (user_id, created_at DESC);
CREATE INDEX idx_leaves_user_dates ON public.leaves USING btree (user_id, start_date);

-- Data: 1 rows
INSERT INTO "public"."leaves" ("id", "user_id", "leave_type", "start_date", "end_date", "days", "reason", "status", "approved_by", "approved_at", "rejection_reason", "created_at", "is_paid") VALUES
('aee7d264-15f2-4a1d-b7d7-4e5ae50caa74', '73116e41-29af-4c4f-ad4b-bb34aced2b47', 'sick', '2026-09-07T18:30:00.000Z', '2026-09-07T18:30:00.000Z', 1, 'Dear Sir/Ma’am,

I am not feeling well due to loose motions and need to take rest. Therefore, I will not be able to attend the office for one day today. Kindly grant me leave for the day.

Thank you for understanding.

Regards,
Kaushal', 'approved', '2945609a-08cc-4bb5-a6f5-7e9dbf8b3f6d', '2026-09-08T05:46:55.959Z', NULL, '2026-09-08T03:59:16.505Z', true);

-- Table: "public"."login_attempts"
DROP TABLE IF EXISTS "public"."login_attempts" CASCADE;
CREATE TABLE "public"."login_attempts" (
  "id" int8 NOT NULL DEFAULT nextval('login_attempts_id_seq'::regclass),
  "email" text NOT NULL,
  "ip_address" text,
  "locked_until" timestamptz,
  "created_at" timestamptz DEFAULT now()
);
ALTER TABLE ONLY "public"."login_attempts" ADD CONSTRAINT "login_attempts_email_not_null" NOT NULL email;
ALTER TABLE ONLY "public"."login_attempts" ADD CONSTRAINT "login_attempts_id_not_null" NOT NULL id;
ALTER TABLE ONLY "public"."login_attempts" ADD CONSTRAINT "login_attempts_pkey" PRIMARY KEY (id);
CREATE INDEX idx_login_attempts_email_time ON public.login_attempts USING btree (lower(email), created_at);
-- no rows in "public"."login_attempts"

-- Table: "public"."notifications"
DROP TABLE IF EXISTS "public"."notifications" CASCADE;
CREATE TABLE "public"."notifications" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL,
  "type" text NOT NULL DEFAULT 'system'::text,
  "title" text NOT NULL,
  "body" text NOT NULL DEFAULT ''::text,
  "link" text,
  "read" bool NOT NULL DEFAULT false,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE ONLY "public"."notifications" ADD CONSTRAINT "notifications_body_not_null" NOT NULL body;
ALTER TABLE ONLY "public"."notifications" ADD CONSTRAINT "notifications_created_at_not_null" NOT NULL created_at;
ALTER TABLE ONLY "public"."notifications" ADD CONSTRAINT "notifications_id_not_null" NOT NULL id;
ALTER TABLE ONLY "public"."notifications" ADD CONSTRAINT "notifications_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY "public"."notifications" ADD CONSTRAINT "notifications_read_not_null" NOT NULL read;
ALTER TABLE ONLY "public"."notifications" ADD CONSTRAINT "notifications_title_not_null" NOT NULL title;
ALTER TABLE ONLY "public"."notifications" ADD CONSTRAINT "notifications_type_not_null" NOT NULL type;
ALTER TABLE ONLY "public"."notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE ONLY "public"."notifications" ADD CONSTRAINT "notifications_user_id_not_null" NOT NULL user_id;
CREATE INDEX idx_notifications_read ON public.notifications USING btree (user_id, read);
CREATE INDEX idx_notifications_unread ON public.notifications USING btree (user_id) WHERE (read = false);
CREATE INDEX idx_notifications_user ON public.notifications USING btree (user_id, created_at DESC);

-- Data: 137 rows
INSERT INTO "public"."notifications" ("id", "user_id", "type", "title", "body", "link", "read", "created_at") VALUES
('cc11be8c-95fe-4328-8d07-a00913e777b1', '7383317a-b7ac-46d8-9db8-43b8c4e4afa9', 'project', 'New project in production', 'fest posts added by Vishvash Patel — tasks are ready in the pipeline.', '/projects', false, '2026-09-08T12:15:46.868Z'),
('ba2563dd-d620-4af7-828c-eef85e9e1ead', '7383317a-b7ac-46d8-9db8-43b8c4e4afa9', 'project', 'New project in production', 'Social Media Post added by Priya Patel — tasks are ready in the pipeline.', '/projects', false, '2026-09-08T12:25:00.041Z'),
('909a0435-6b09-4061-badb-df66fd804552', '7383317a-b7ac-46d8-9db8-43b8c4e4afa9', 'project', 'New project in production', 'Social Media Post added by Priya Patel — tasks are ready in the pipeline.', '/projects', false, '2026-09-08T12:26:31.892Z'),
('00d6ca30-0cb5-4cb2-bd6e-d2d743745905', 'd0625c86-49b2-46eb-93c6-99a723c00416', 'task', 'Task ready for review', 'Sudhir Thakor submitted "Static Post 01" for review.', '/projects?taskId=b8649663-1b35-4bdf-87f6-3bdf8c1f19cc', true, '2026-09-02T05:07:07.650Z'),
('003ee5aa-320b-4fa3-9cd5-f78f3e6fcc69', 'd0625c86-49b2-46eb-93c6-99a723c00416', 'project', 'New project in production', 'fest posts added by Vishvash Patel — tasks are ready in the pipeline.', '/projects', true, '2026-09-08T12:15:46.868Z'),
('dc253242-efba-4363-983c-6d6809688a9d', 'd0625c86-49b2-46eb-93c6-99a723c00416', 'project', 'New project in production', 'Social Media Post added by Priya Patel — tasks are ready in the pipeline.', '/projects', true, '2026-09-08T12:25:00.041Z'),
('42be5843-7686-4dc3-9a9e-8a86c41f468b', 'a0f6eb30-79cd-4e6b-a1d7-1ca2f764a690', 'task', 'You''re up next', '"Static Post 01" is ready for the next stage.', '/dashboard?taskId=b8649663-1b35-4bdf-87f6-3bdf8c1f19cc', false, '2026-09-02T09:24:36.684Z'),
('f42d93bd-e20a-4811-963f-407da57cbbdb', 'd0625c86-49b2-46eb-93c6-99a723c00416', 'project', 'New project in production', 'Social Media Post added by Priya Patel — tasks are ready in the pipeline.', '/projects', true, '2026-09-08T12:26:31.892Z'),
('51eaa620-c987-4435-89a8-695faa2920f4', 'a0f6eb30-79cd-4e6b-a1d7-1ca2f764a690', 'task', 'You''re up next', '"Static Post 02" is ready for the next stage.', '/dashboard?taskId=1ae33524-81ea-49ff-81a0-08103c5fe675', false, '2026-09-02T09:24:54.051Z'),
('bbcedfcf-a07a-4895-955e-8fb61d1413be', '2945609a-08cc-4bb5-a6f5-7e9dbf8b3f6d', 'project', 'New project in production', 'Bauma Expo Post added by Advrix Admin — tasks are ready in the pipeline.', '/projects', true, '2026-09-02T04:24:11.923Z'),
('a8b2b0bc-a579-416b-9723-79c74a8fa75d', '2945609a-08cc-4bb5-a6f5-7e9dbf8b3f6d', 'project', 'New project in production', 'Bauma Expo Post added by Advrix Admin — tasks are ready in the pipeline.', '/projects', true, '2026-09-02T04:24:24.837Z'),
('e950845f-2549-41c1-bb9e-541902b5137c', '2945609a-08cc-4bb5-a6f5-7e9dbf8b3f6d', 'project', 'New project in production', 'Bauma Expo Social Media Post added by Advrix Admin — tasks are ready in the pipeline.', '/projects', true, '2026-09-02T04:26:00.723Z'),
('c3263315-ef17-4dd0-b5d1-48fcca4934a6', '2945609a-08cc-4bb5-a6f5-7e9dbf8b3f6d', 'task', 'Task ready for review', 'Sudhir Thakor submitted "Static Post 01" for review.', '/projects?taskId=b8649663-1b35-4bdf-87f6-3bdf8c1f19cc', true, '2026-09-02T05:07:07.650Z'),
('9d51430e-8469-4064-867c-85f9aad32df7', '2945609a-08cc-4bb5-a6f5-7e9dbf8b3f6d', 'task', 'Task ready for review', 'Sudhir Thakor submitted "Static Post 02" for review.', '/projects?taskId=1ae33524-81ea-49ff-81a0-08103c5fe675', true, '2026-09-02T05:34:22.121Z'),
('3a254698-a044-415f-b605-0f7dd1953f9d', '68c002cc-20db-4966-ab6e-e2cf66b42b41', 'task', 'Stage approved', '"Static Post 01" was approved — it moves to the next stage.', '/dashboard?taskId=b8649663-1b35-4bdf-87f6-3bdf8c1f19cc', true, '2026-09-02T09:24:36.455Z'),
('c01cedc8-68ff-4e70-8778-f4108f183a06', '68c002cc-20db-4966-ab6e-e2cf66b42b41', 'task', 'Stage approved', '"Static Post 02" was approved — it moves to the next stage.', '/dashboard?taskId=1ae33524-81ea-49ff-81a0-08103c5fe675', true, '2026-09-02T09:24:53.822Z'),
('75383f46-6905-463a-adc4-ad05e6606ad4', 'a0f6eb30-79cd-4e6b-a1d7-1ca2f764a690', 'task', 'You''re up next', '"Static Post 03" is ready for the next stage.', '/dashboard?taskId=4d2bbe11-3958-4614-ac0d-9bec1da29dfa', false, '2026-09-02T09:46:49.536Z'),
('49cb3554-1331-426a-aa62-ba129567b205', '2945609a-08cc-4bb5-a6f5-7e9dbf8b3f6d', 'task', 'Task ready for review', 'Sudhir Thakor submitted "Static Post 03" for review.', '/projects?taskId=4d2bbe11-3958-4614-ac0d-9bec1da29dfa', true, '2026-09-02T09:33:31.979Z'),
('3fb62a45-0222-4cef-8a3a-4b66affd0004', 'd0625c86-49b2-46eb-93c6-99a723c00416', 'task', 'Task ready for review', 'Sudhir Thakor submitted "Static Post 03" for review.', '/projects?taskId=4d2bbe11-3958-4614-ac0d-9bec1da29dfa', true, '2026-09-02T09:33:31.979Z'),
('2ece49cb-b26f-42c0-a140-ed89c0fcf211', 'a0f6eb30-79cd-4e6b-a1d7-1ca2f764a690', 'task', 'Task completed', '"Static Post 03" was approved and completed.', '/dashboard?taskId=4d2bbe11-3958-4614-ac0d-9bec1da29dfa', false, '2026-09-02T12:43:33.383Z'),
('78d66449-b5d7-49ec-ba36-d91afe753dce', 'a0f6eb30-79cd-4e6b-a1d7-1ca2f764a690', 'task', 'Task completed', '"Static Post 01" was approved and completed.', '/dashboard?taskId=b8649663-1b35-4bdf-87f6-3bdf8c1f19cc', false, '2026-09-05T08:52:53.011Z'),
('9b2c5d19-6672-4b1e-9cc9-f0c757159169', 'a0f6eb30-79cd-4e6b-a1d7-1ca2f764a690', 'task', 'Task completed', '"Static Post 02" was approved and completed.', '/dashboard?taskId=1ae33524-81ea-49ff-81a0-08103c5fe675', false, '2026-09-05T08:53:13.897Z'),
('40a92ccc-b2ba-47d1-bbc8-990e2e71bbd1', '2945609a-08cc-4bb5-a6f5-7e9dbf8b3f6d', 'task', 'Task ready for review', 'Vishvas Patel submitted "Static Post 02" for review.', '/projects?taskId=1ae33524-81ea-49ff-81a0-08103c5fe675', true, '2026-09-05T08:51:56.076Z'),
('ab3b50e0-014d-43a8-b46d-29b75abca16f', '2945609a-08cc-4bb5-a6f5-7e9dbf8b3f6d', 'task', 'Task ready for review', 'Vishvas Patel submitted "Static Post 01" for review.', '/projects?taskId=b8649663-1b35-4bdf-87f6-3bdf8c1f19cc', true, '2026-09-05T08:52:22.415Z'),
('abfd722b-f492-4409-9a24-06355b13f882', '49109573-1ae8-4b67-96a2-45bdf0c763c1', 'task', 'Stage approved', '"POST 1 — IVF પછી શું ધ્યાનમાં રાખવું જોઈએ?" was approved — it moves to the next stage.', '/dashboard?taskId=e2235eed-f61b-4f1e-9ede-6ffd6e1cf9a0', false, '2026-09-07T09:56:15.212Z'),
('1be4e28e-cea3-412b-b9c7-f9bd8025b837', 'f5fd7e86-7927-42e5-9b4c-e01122055bcd', 'task', 'You''re up next', '"POST 1 — IVF પછી શું ધ્યાનમાં રાખવું જોઈએ?" is ready for the next stage.', '/dashboard?taskId=e2235eed-f61b-4f1e-9ede-6ffd6e1cf9a0', false, '2026-09-07T09:56:15.451Z'),
('b8fdc682-deb8-4c8d-8d0b-8a40778b6a04', '49109573-1ae8-4b67-96a2-45bdf0c763c1', 'task', 'Stage approved', '"POST 2 — IVF સફળતા કયા Factors પર આધારિત છે?" was approved — it moves to the next stage.', '/dashboard?taskId=cd90d34e-3bd3-4bd0-b736-a2b86322551e', false, '2026-09-07T09:56:54.563Z'),
('15fd50bb-a424-4e7d-8bd1-e53839bcdb1c', 'f5fd7e86-7927-42e5-9b4c-e01122055bcd', 'task', 'You''re up next', '"POST 2 — IVF સફળતા કયા Factors પર આધારિત છે?" is ready for the next stage.', '/dashboard?taskId=cd90d34e-3bd3-4bd0-b736-a2b86322551e', false, '2026-09-07T09:56:54.783Z'),
('0b4b2f83-62aa-435d-a068-bc5d53e296f0', '2945609a-08cc-4bb5-a6f5-7e9dbf8b3f6d', 'project', 'New project in production', '12 Social Media Post added by Vishvash Patel — tasks are ready in the pipeline.', '/projects', true, '2026-09-07T09:53:46.726Z'),
('776c18a9-a5bb-4fa9-8e31-cdcf1d102260', '2945609a-08cc-4bb5-a6f5-7e9dbf8b3f6d', 'project', 'New project in production', 'matteshwari luxuria added by Vishvash Patel — tasks are ready in the pipeline.', '/projects', true, '2026-09-07T09:35:10.205Z'),
('7207faa3-3222-400d-a72e-2ef5d890e92f', '2945609a-08cc-4bb5-a6f5-7e9dbf8b3f6d', 'project', 'New project in production', 'Social Media Reels added by Advrix Admin — tasks are ready in the pipeline.', '/projects', true, '2026-09-07T11:10:44.769Z'),
('26aea55d-5ad5-41a6-9617-707e49eb412f', 'd0625c86-49b2-46eb-93c6-99a723c00416', 'project', 'New project in production', 'matteshwari luxuria added by Vishvash Patel — tasks are ready in the pipeline.', '/projects', true, '2026-09-07T09:35:10.205Z'),
('f40e9861-09df-4a57-829e-e766e3a01b52', '68c002cc-20db-4966-ab6e-e2cf66b42b41', 'task', 'Stage approved', '"Static Post 03" was approved — it moves to the next stage.', '/dashboard?taskId=4d2bbe11-3958-4614-ac0d-9bec1da29dfa', true, '2026-09-02T09:46:49.296Z'),
('83d1e308-4ce9-4275-b60b-8b76cb6dc861', 'd0625c86-49b2-46eb-93c6-99a723c00416', 'project', 'New project in production', 'Bauma Expo Post added by Advrix Admin — tasks are ready in the pipeline.', '/projects', true, '2026-09-02T04:24:11.923Z'),
('b1b2a313-deef-44ff-905e-8784f2e0e886', 'd0625c86-49b2-46eb-93c6-99a723c00416', 'project', 'New project in production', 'Bauma Expo Post added by Advrix Admin — tasks are ready in the pipeline.', '/projects', true, '2026-09-02T04:24:24.837Z'),
('d63125c5-4dbe-4f99-8687-22c3c3ce56f5', 'd0625c86-49b2-46eb-93c6-99a723c00416', 'project', 'New project in production', 'Bauma Expo Social Media Post added by Advrix Admin — tasks are ready in the pipeline.', '/projects', true, '2026-09-02T04:26:00.723Z'),
('e5f29287-a6bf-43d3-9d7a-d4ad2472abf3', '7383317a-b7ac-46d8-9db8-43b8c4e4afa9', 'project', 'New project in production', 'fest posts added by Vishvash Patel — tasks are ready in the pipeline.', '/projects', false, '2026-09-08T12:16:02.129Z'),
('17cb74c9-910a-4c61-b993-3e7920ac7f81', 'a9ac9325-edae-4526-93d4-3da2ecaaeabb', 'task', 'Upcoming Deadline', '"Reel 01" is due soon.', '/dashboard?taskId=f927a476-616f-4923-934b-e2d4a9abae28', true, '2026-09-07T11:11:11.935Z'),
('08d42e0b-1a5b-4ca5-b271-f27e4b63fef2', 'a9ac9325-edae-4526-93d4-3da2ecaaeabb', 'task', 'Task completed', '"Reel 01" was approved and completed.', '/dashboard?taskId=f927a476-616f-4923-934b-e2d4a9abae28', true, '2026-09-07T11:12:15.196Z'),
('be4f7dff-17a9-4151-89e8-783f9620a8ab', '2945609a-08cc-4bb5-a6f5-7e9dbf8b3f6d', 'project', 'New project in production', 'Social Media Reels added by Advrix Admin — tasks are ready in the pipeline.', '/projects', true, '2026-09-07T11:10:50.631Z'),
('942ada7e-57fa-45f1-bfc5-0ec89dc41ffd', '2945609a-08cc-4bb5-a6f5-7e9dbf8b3f6d', 'task', 'Task ready for review', 'Sabir Alam submitted "Reel 01" for review.', '/projects?taskId=f927a476-616f-4923-934b-e2d4a9abae28', true, '2026-09-07T11:11:52.307Z'),
('523be7cc-c0b4-4de2-a0b3-8089c6eec299', 'f5fd7e86-7927-42e5-9b4c-e01122055bcd', 'task', 'Upcoming Deadline', '"POST 1 — IVF પછી શું ધ્યાનમાં રાખવું જોઈએ?" is due soon.', '/dashboard?taskId=e2235eed-f61b-4f1e-9ede-6ffd6e1cf9a0', false, '2026-09-07T11:26:29.024Z'),
('42ea5b4d-af7e-4a4d-b648-03b39baa0eae', '2945609a-08cc-4bb5-a6f5-7e9dbf8b3f6d', 'leave', 'New leave request', 'Kaushal Rawat requested 2 day(s) of sick leave from 2026-09-08 to 2026-09-09.', '/attendance', true, '2026-09-08T03:59:16.956Z'),
('23affff1-7a5b-4c6e-99ae-894cd1f7dcf5', 'f5fd7e86-7927-42e5-9b4c-e01122055bcd', 'task', 'Task completed', '"Banner 01" was approved and completed.', '/dashboard?taskId=ad6f14ee-8348-4ee0-949a-a488c64ac7c1', false, '2026-09-08T06:05:34.820Z'),
('7897294d-6b22-4307-a5a2-e5a56a0f5cf9', '2945609a-08cc-4bb5-a6f5-7e9dbf8b3f6d', 'project', 'New project in production', 'fest posts added by Vishvash Patel — tasks are ready in the pipeline.', '/projects', true, '2026-09-08T12:16:02.129Z'),
('dc6f5935-964a-4c66-8703-3fae01c22134', '7383317a-b7ac-46d8-9db8-43b8c4e4afa9', 'project', 'New project in production', 'Social Media Post added by Priya Patel — tasks are ready in the pipeline.', '/projects', false, '2026-09-08T12:22:07.696Z'),
('af1845c8-1468-48d6-990e-c6eb7ac36c6a', '68c002cc-20db-4966-ab6e-e2cf66b42b41', 'task', 'Upcoming Deadline', '"create an id card 01" is due soon.', '/dashboard?taskId=f1fa3bfe-1094-4ec5-a3cd-b01f9f7285c9', true, '2026-09-08T06:21:31.470Z'),
('721ea07d-a2e8-4bf0-8dd9-07cb3e9947bc', 'd0625c86-49b2-46eb-93c6-99a723c00416', 'project', 'New project in production', 'fest posts added by Vishvash Patel — tasks are ready in the pipeline.', '/projects', true, '2026-09-08T12:16:02.129Z'),
('bc638302-7332-4e42-af68-125156acd865', '2945609a-08cc-4bb5-a6f5-7e9dbf8b3f6d', 'task', 'Task ready for review', 'Sudhir Thakor submitted "create an id card 01" for review.', '/projects?taskId=f1fa3bfe-1094-4ec5-a3cd-b01f9f7285c9', true, '2026-09-08T06:36:53.092Z'),
('2a41ac66-7d3d-4de4-955c-707bc5aa94a6', '2945609a-08cc-4bb5-a6f5-7e9dbf8b3f6d', 'project', 'New project in production', 'id card added by Vishvash Patel — tasks are ready in the pipeline.', '/projects', true, '2026-09-08T06:20:49.231Z'),
('16075432-58e3-4f2b-a21c-44e06ff6a2f7', 'd0625c86-49b2-46eb-93c6-99a723c00416', 'project', 'New project in production', 'Social Media Post added by Priya Patel — tasks are ready in the pipeline.', '/projects', true, '2026-09-08T12:22:07.696Z'),
('73a5b809-637b-4319-89dd-38c08b4b5e4b', '2945609a-08cc-4bb5-a6f5-7e9dbf8b3f6d', 'attendance', 'Lunch break started', 'Sudhir Thakor started their lunch break.', '/attendance', true, '2026-09-08T07:22:50.167Z'),
('cc077b8b-cd8c-46bc-a062-0486cee7ef6d', '73116e41-29af-4c4f-ad4b-bb34aced2b47', 'leave', 'Leave approved', 'Your sick leave (Tue Sep 08 2026 00:00:00 GMT+0000 (Coordinated Universal Time) to Wed Sep 09 2026 00:00:00 GMT+0000 (Coordinated Universal Time)) was approved.', '/attendance', true, '2026-09-08T05:46:56.176Z'),
('104dbf81-1ca8-493a-b255-81c9c40d1bce', '2945609a-08cc-4bb5-a6f5-7e9dbf8b3f6d', 'attendance', 'Lunch break ended', 'Sudhir Thakor ended their lunch break. (Total break: 32m)', '/attendance', true, '2026-09-08T07:54:37.205Z'),
('d8e8d262-7d0a-4f36-8d72-7613043de5ec', '68c002cc-20db-4966-ab6e-e2cf66b42b41', 'task', 'Task sent back for rework', 'Advrix Admin requested changes on "create an id card 01".', '/dashboard?taskId=f1fa3bfe-1094-4ec5-a3cd-b01f9f7285c9', true, '2026-09-08T08:07:27.149Z'),
('cff38dc9-9b69-47a5-aa7a-a2c6eb77c469', '2945609a-08cc-4bb5-a6f5-7e9dbf8b3f6d', 'task', 'Task ready for review', 'Sudhir Thakor submitted "create an id card 01" for review.', '/projects?taskId=f1fa3bfe-1094-4ec5-a3cd-b01f9f7285c9', true, '2026-09-08T08:10:45.408Z'),
('30e20311-4341-41b4-abfc-28f2c216654b', '68c002cc-20db-4966-ab6e-e2cf66b42b41', 'task', 'Task sent back for rework', 'Advrix Admin requested changes on "create an id card 01".', '/dashboard?taskId=f1fa3bfe-1094-4ec5-a3cd-b01f9f7285c9', true, '2026-09-08T08:11:56.836Z'),
('7e3a1f3b-0822-45e3-b2bd-40e30a0f21c1', '2945609a-08cc-4bb5-a6f5-7e9dbf8b3f6d', 'task', 'Task ready for review', 'Sudhir Thakor submitted "create an id card 01" for review.', '/projects?taskId=f1fa3bfe-1094-4ec5-a3cd-b01f9f7285c9', true, '2026-09-08T08:49:40.927Z'),
('a6200fb0-e9e8-4f86-84ae-b8faf1b0c91f', 'd0625c86-49b2-46eb-93c6-99a723c00416', 'task', 'Task ready for review', 'Sudhir Thakor submitted "Static Post 02" for review.', '/projects?taskId=1ae33524-81ea-49ff-81a0-08103c5fe675', true, '2026-09-02T05:34:22.121Z'),
('efac72be-afcf-4aaa-8fbb-c16283fceddf', 'd0625c86-49b2-46eb-93c6-99a723c00416', 'task', 'Task ready for review', 'Vishvas Patel submitted "Static Post 02" for review.', '/projects?taskId=1ae33524-81ea-49ff-81a0-08103c5fe675', true, '2026-09-05T08:51:56.076Z'),
('af3d1022-0824-4b68-b905-57be58add738', 'd0625c86-49b2-46eb-93c6-99a723c00416', 'task', 'Task ready for review', 'Vishvas Patel submitted "Static Post 01" for review.', '/projects?taskId=b8649663-1b35-4bdf-87f6-3bdf8c1f19cc', true, '2026-09-05T08:52:22.415Z'),
('51dcd876-2ceb-44e2-ab7d-542e511c0dc0', 'd0625c86-49b2-46eb-93c6-99a723c00416', 'project', 'New project in production', '12 Social Media Post added by Vishvash Patel — tasks are ready in the pipeline.', '/projects', true, '2026-09-07T09:53:46.726Z'),
('64a7e646-f91e-4c30-ac1d-97a910b33b58', 'd0625c86-49b2-46eb-93c6-99a723c00416', 'project', 'New project in production', 'Social Media Reels added by Advrix Admin — tasks are ready in the pipeline.', '/projects', true, '2026-09-07T11:10:44.769Z'),
('99061f18-dfb5-45be-80e1-8e12c0179b2c', 'd0625c86-49b2-46eb-93c6-99a723c00416', 'project', 'New project in production', 'Social Media Reels added by Advrix Admin — tasks are ready in the pipeline.', '/projects', true, '2026-09-07T11:10:50.631Z'),
('55b545d9-d2fd-4bfb-a2df-cfc183475bb1', 'd0625c86-49b2-46eb-93c6-99a723c00416', 'task', 'Task ready for review', 'Sabir Alam submitted "Reel 01" for review.', '/projects?taskId=f927a476-616f-4923-934b-e2d4a9abae28', true, '2026-09-07T11:11:52.307Z'),
('1827a3bb-6d2a-43cd-a131-5a0f50fcb005', 'd0625c86-49b2-46eb-93c6-99a723c00416', 'project', 'New project in production', 'id card added by Vishvash Patel — tasks are ready in the pipeline.', '/projects', true, '2026-09-08T06:20:49.231Z'),
('304e635d-515c-41bd-ae57-c275fc5d6f8c', 'd0625c86-49b2-46eb-93c6-99a723c00416', 'task', 'Task ready for review', 'Sudhir Thakor submitted "create an id card 01" for review.', '/projects?taskId=f1fa3bfe-1094-4ec5-a3cd-b01f9f7285c9', true, '2026-09-08T06:36:53.092Z'),
('72b7ccfe-90e5-4021-86d7-5765f6a43c8d', 'd0625c86-49b2-46eb-93c6-99a723c00416', 'attendance', 'Lunch break started', 'Sudhir Thakor started their lunch break.', '/attendance', true, '2026-09-08T07:22:50.167Z'),
('ac506db2-61e8-42b7-841f-7c0748d374a8', 'd0625c86-49b2-46eb-93c6-99a723c00416', 'attendance', 'Lunch break ended', 'Sudhir Thakor ended their lunch break. (Total break: 32m)', '/attendance', true, '2026-09-08T07:54:37.205Z'),
('d7606578-4cb9-4582-b4da-917fe348168f', '2945609a-08cc-4bb5-a6f5-7e9dbf8b3f6d', 'attendance', 'Lunch break ended', 'Vishvash Patel ended their lunch break. (Total break: 112m)', '/attendance', true, '2026-09-08T08:54:15.521Z'),
('c22ed282-5b01-4bd4-a03c-e26a6ba9a64d', '7383317a-b7ac-46d8-9db8-43b8c4e4afa9', 'project', 'New project in production', 'id card added by Vishvash Patel — tasks are ready in the pipeline.', '/projects', true, '2026-09-08T06:20:49.231Z'),
('fe2fec39-52f4-4eb5-85a7-789120b060b9', '7383317a-b7ac-46d8-9db8-43b8c4e4afa9', 'task', 'Task ready for review', 'Sudhir Thakor submitted "create an id card 01" for review.', '/projects?taskId=f1fa3bfe-1094-4ec5-a3cd-b01f9f7285c9', true, '2026-09-08T06:36:53.092Z'),
('48cb72a4-ac93-431c-a74c-10cbab1d299a', '7383317a-b7ac-46d8-9db8-43b8c4e4afa9', 'task', 'Task ready for review', 'Sudhir Thakor submitted "create an id card 01" for review.', '/projects?taskId=f1fa3bfe-1094-4ec5-a3cd-b01f9f7285c9', true, '2026-09-08T08:10:45.408Z'),
('460bba3b-85ba-4634-a6b8-8a4daa72bc18', '7383317a-b7ac-46d8-9db8-43b8c4e4afa9', 'task', 'Task ready for review', 'Sudhir Thakor submitted "create an id card 01" for review.', '/projects?taskId=f1fa3bfe-1094-4ec5-a3cd-b01f9f7285c9', true, '2026-09-08T08:49:40.927Z'),
('29a05af0-a1ab-488b-8e0a-7677bc1a4dee', 'd0625c86-49b2-46eb-93c6-99a723c00416', 'task', 'Task ready for review', 'Sudhir Thakor submitted "create an id card 01" for review.', '/projects?taskId=f1fa3bfe-1094-4ec5-a3cd-b01f9f7285c9', true, '2026-09-08T08:10:45.408Z'),
('26ab00f0-6648-41cf-a4f6-3fc066bb713d', 'd0625c86-49b2-46eb-93c6-99a723c00416', 'task', 'Task ready for review', 'Sudhir Thakor submitted "create an id card 01" for review.', '/projects?taskId=f1fa3bfe-1094-4ec5-a3cd-b01f9f7285c9', true, '2026-09-08T08:49:40.927Z'),
('48410a4f-a7fb-4f3e-ada4-210e54b48f91', '68c002cc-20db-4966-ab6e-e2cf66b42b41', 'task', 'Stage approved', '"Bhai Dooj" was approved — it moves to the next stage.', '/dashboard?taskId=015d644c-42cc-4cba-8ff1-a2dd503d9093', true, '2026-09-08T10:09:15.140Z'),
('cdc1067d-81cd-4bc1-b9c0-975609ad7ca2', '7383317a-b7ac-46d8-9db8-43b8c4e4afa9', 'project', 'New project in production', 'Social Media Post added by Priya Patel — tasks are ready in the pipeline.', '/projects', false, '2026-09-08T12:26:25.533Z'),
('557c51b0-2631-4f72-aec0-b3cb52b9aea0', '2945609a-08cc-4bb5-a6f5-7e9dbf8b3f6d', 'project', 'New project in production', 'DLT REGISTRATION added by Advrix Admin — tasks are ready in the pipeline.', '/projects', true, '2026-09-08T08:57:05.898Z'),
('8291f244-cfe8-4845-8db2-c85ab2af27c1', '68c002cc-20db-4966-ab6e-e2cf66b42b41', 'task', 'Task completed', '"create an id card 01" was approved and completed.', '/dashboard?taskId=f1fa3bfe-1094-4ec5-a3cd-b01f9f7285c9', true, '2026-09-08T08:55:47.652Z'),
('96a2ddc5-b239-410e-95f5-07e163ba1a7a', 'd0625c86-49b2-46eb-93c6-99a723c00416', 'project', 'New project in production', 'DLT REGISTRATION added by Advrix Admin — tasks are ready in the pipeline.', '/projects', true, '2026-09-08T08:57:05.898Z'),
('6ed8540a-9f85-46f6-8b94-f5572090df00', '7383317a-b7ac-46d8-9db8-43b8c4e4afa9', 'project', 'New project in production', 'Social Media Post added by Priya Patel — tasks are ready in the pipeline.', '/projects', false, '2026-09-08T12:26:51.451Z'),
('36755c74-6282-4dee-9131-ec8c4de772aa', '2945609a-08cc-4bb5-a6f5-7e9dbf8b3f6d', 'project', 'New project in production', 'fest posts added by Vishvash Patel — tasks are ready in the pipeline.', '/projects', true, '2026-09-08T10:06:53.301Z'),
('e7acfcc3-e602-43ac-85b9-bdce050ae658', 'a0f6eb30-79cd-4e6b-a1d7-1ca2f764a690', 'task', 'You''re up next', '"Bhai Dooj" is ready for the next stage.', '/dashboard?taskId=015d644c-42cc-4cba-8ff1-a2dd503d9093', false, '2026-09-08T10:09:16.040Z'),
('17d6f5e0-65a7-4e66-8fe8-89d0e0292cf9', 'a0f6eb30-79cd-4e6b-a1d7-1ca2f764a690', 'task', 'Task sent back for rework', 'Vishvash Patel requested changes on "Bhai Dooj".', '/dashboard?taskId=015d644c-42cc-4cba-8ff1-a2dd503d9093', false, '2026-09-08T10:09:35.005Z'),
('939bee65-4b8d-4965-95fd-61191404a089', 'a0f6eb30-79cd-4e6b-a1d7-1ca2f764a690', 'task', 'Task sent back for rework', 'Advrix Admin requested changes on "Bhai Dooj".', '/dashboard?taskId=015d644c-42cc-4cba-8ff1-a2dd503d9093', false, '2026-09-08T10:10:30.856Z'),
('f617749d-033f-416a-a9fb-7289538497bc', 'd0625c86-49b2-46eb-93c6-99a723c00416', 'project', 'New project in production', 'fest posts added by Vishvash Patel — tasks are ready in the pipeline.', '/projects', true, '2026-09-08T10:06:53.301Z'),
('738ea89b-b09f-41be-9caf-bd8ece2769bc', '7383317a-b7ac-46d8-9db8-43b8c4e4afa9', 'project', 'New project in production', 'Social Media Post added by Priya Patel — tasks are ready in the pipeline.', '/projects', false, '2026-09-08T12:28:42.390Z'),
('7ad562ff-1c05-4a97-a161-173f59330a6b', '2945609a-08cc-4bb5-a6f5-7e9dbf8b3f6d', 'project', 'New project in production', 'Festival Posts added by Vishvash Patel — tasks are ready in the pipeline.', '/projects', true, '2026-09-08T10:41:21.709Z'),
('157a1138-7d18-4506-bc91-5373d0be15c6', 'd0625c86-49b2-46eb-93c6-99a723c00416', 'project', 'New project in production', 'Festival Posts added by Vishvash Patel — tasks are ready in the pipeline.', '/projects', true, '2026-09-08T10:41:21.709Z'),
('f413f436-810b-4453-a489-837990df5291', '7383317a-b7ac-46d8-9db8-43b8c4e4afa9', 'project', 'New project in production', 'DLT REGISTRATION added by Advrix Admin — tasks are ready in the pipeline.', '/projects', true, '2026-09-08T08:57:05.898Z'),
('2fd1a166-1fea-49a3-84ac-fc81c2eddc59', '7383317a-b7ac-46d8-9db8-43b8c4e4afa9', 'project', 'New project in production', 'fest posts added by Vishvash Patel — tasks are ready in the pipeline.', '/projects', true, '2026-09-08T10:06:53.301Z'),
('c6817593-b5bf-4c7f-a261-022dd7aa952c', '7383317a-b7ac-46d8-9db8-43b8c4e4afa9', 'project', 'New project in production', 'Festival Posts added by Vishvash Patel — tasks are ready in the pipeline.', '/projects', true, '2026-09-08T10:41:21.709Z'),
('76538163-f99c-467b-b077-607b7ed69bc1', '2945609a-08cc-4bb5-a6f5-7e9dbf8b3f6d', 'project', 'New project in production', 'fest posts added by Vishvash Patel — tasks are ready in the pipeline.', '/projects', true, '2026-09-08T12:15:46.868Z'),
('540e3ea2-0f5e-41cb-b993-fab2f797bb23', '7383317a-b7ac-46d8-9db8-43b8c4e4afa9', 'project', 'New project in production', 'sun glow added by Vishvash Patel — tasks are ready in the pipeline.', '/projects', false, '2026-09-08T12:07:39.986Z'),
('9f155778-5615-4470-a75b-8a30450e4f23', 'f5fd7e86-7927-42e5-9b4c-e01122055bcd', 'task', 'Stage approved', '"POST 1 — IVF પછી શું ધ્યાનમાં રાખવું જોઈએ?" was approved — it moves to the next stage.', '/dashboard?taskId=e2235eed-f61b-4f1e-9ede-6ffd6e1cf9a0', false, '2026-09-08T12:53:56.863Z'),
('303dc9c2-f120-4776-a787-cd7a9d7f678c', '7383317a-b7ac-46d8-9db8-43b8c4e4afa9', 'project', 'New project in production', 'Social Media Post added by Priya Patel — tasks are ready in the pipeline.', '/projects', false, '2026-09-08T12:08:14.004Z'),
('94259a6b-1c2d-4bc8-9fb4-645285cae810', 'f5fd7e86-7927-42e5-9b4c-e01122055bcd', 'task', 'Stage approved', '"બાપ્પા આવે છે વિઘ્ન દૂર કરવા…તો પછી તમારા ‘પોતાના ઘર’નું વિઘ્ન પણ દૂર કરી દો!" was approved — it moves to the next stage.', '/dashboard?taskId=1fa7b691-9e72-44f4-82e7-37f7371d9b15', false, '2026-09-08T12:10:24.479Z'),
('6ff1b47e-ec2a-4353-b071-a8b64840df97', 'a0f6eb30-79cd-4e6b-a1d7-1ca2f764a690', 'task', 'You''re up next', '"બાપ્પા આવે છે વિઘ્ન દૂર કરવા…તો પછી તમારા ‘પોતાના ઘર’નું વિઘ્ન પણ દૂર કરી દો!" is ready for the next stage.', '/dashboard?taskId=1fa7b691-9e72-44f4-82e7-37f7371d9b15', false, '2026-09-08T12:10:25.392Z'),
('89f663a9-ca4a-4ffd-84b1-aa7deb60f9d6', 'a0f6eb30-79cd-4e6b-a1d7-1ca2f764a690', 'task', 'Task sent back for rework', 'Advrix Admin requested changes on "બાપ્પા આવે છે વિઘ્ન દૂર કરવા…તો પછી તમારા ‘પોતાના ઘર’નું વિઘ્ન પણ દૂર કરી દો!".', '/dashboard?taskId=1fa7b691-9e72-44f4-82e7-37f7371d9b15', false, '2026-09-08T12:10:59.060Z'),
('a07d7985-04aa-4b50-acf4-9f07b0ff5531', 'd0625c86-49b2-46eb-93c6-99a723c00416', 'project', 'New project in production', 'Social Media Post added by Priya Patel — tasks are ready in the pipeline.', '/projects', true, '2026-09-08T12:26:25.533Z'),
('55117b46-eac5-46d8-a39c-4af13c05edef', '7383317a-b7ac-46d8-9db8-43b8c4e4afa9', 'project', 'New project in production', 'Social Media Post added by Priya Patel — tasks are ready in the pipeline.', '/projects', false, '2026-09-08T12:13:26.554Z'),
('30f155cf-6c12-4d7c-9167-5367ab4eefc0', '2945609a-08cc-4bb5-a6f5-7e9dbf8b3f6d', 'project', 'New project in production', 'sun glow added by Vishvash Patel — tasks are ready in the pipeline.', '/projects', true, '2026-09-08T12:07:39.986Z'),
('745705c7-67b1-4370-ad26-7e37c6c19268', '2945609a-08cc-4bb5-a6f5-7e9dbf8b3f6d', 'project', 'New project in production', 'Social Media Post added by Priya Patel — tasks are ready in the pipeline.', '/projects', true, '2026-09-08T12:08:14.004Z'),
('9c266107-84be-45a6-98f3-09cf8cbba5c4', '2945609a-08cc-4bb5-a6f5-7e9dbf8b3f6d', 'project', 'New project in production', 'Social Media Post added by Priya Patel — tasks are ready in the pipeline.', '/projects', true, '2026-09-08T12:13:26.554Z'),
('00a14926-936f-4733-ade4-8028b597614c', '2945609a-08cc-4bb5-a6f5-7e9dbf8b3f6d', 'project', 'New project in production', 'Social Media Post added by Priya Patel — tasks are ready in the pipeline.', '/projects', true, '2026-09-08T12:25:00.041Z'),
('8e2cc2c4-23a8-4aed-b58c-10e6485ef939', '2945609a-08cc-4bb5-a6f5-7e9dbf8b3f6d', 'project', 'New project in production', 'Social Media Post added by Priya Patel — tasks are ready in the pipeline.', '/projects', true, '2026-09-08T12:26:31.892Z'),
('401303e0-b34e-4f53-b45d-d77d524c9eea', '2945609a-08cc-4bb5-a6f5-7e9dbf8b3f6d', 'project', 'New project in production', 'Social Media Post added by Priya Patel — tasks are ready in the pipeline.', '/projects', true, '2026-09-08T12:22:07.696Z'),
('d293928b-2d5a-43cd-b204-4ebcb2f659e1', '2945609a-08cc-4bb5-a6f5-7e9dbf8b3f6d', 'project', 'New project in production', 'Social Media Post added by Priya Patel — tasks are ready in the pipeline.', '/projects', true, '2026-09-08T12:26:25.533Z'),
('19be13fc-7cf7-447b-811c-28ff9bea532b', '2945609a-08cc-4bb5-a6f5-7e9dbf8b3f6d', 'attendance', 'Clock out', 'Sudhir Thakor clocked out for the day. (Net Hours: 7.93h)', '/attendance', true, '2026-09-08T12:29:46.233Z'),
('0b655498-e862-476b-b56f-41e3ab413b7b', '2945609a-08cc-4bb5-a6f5-7e9dbf8b3f6d', 'project', 'New project in production', 'Social Media Post added by Priya Patel — tasks are ready in the pipeline.', '/projects', true, '2026-09-08T12:26:51.451Z'),
('91ecf31f-c987-4c00-8afb-6346ac251c5c', '2945609a-08cc-4bb5-a6f5-7e9dbf8b3f6d', 'project', 'New project in production', 'Social Media Post added by Priya Patel — tasks are ready in the pipeline.', '/projects', true, '2026-09-08T12:28:42.390Z'),
('08f297c8-c578-4dbc-a364-15c48516ff18', 'a0f6eb30-79cd-4e6b-a1d7-1ca2f764a690', 'task', 'You''re up next', '"POST 1 — IVF પછી શું ધ્યાનમાં રાખવું જોઈએ?" is ready for the next stage.', '/dashboard?taskId=e2235eed-f61b-4f1e-9ede-6ffd6e1cf9a0', false, '2026-09-08T12:53:57.757Z'),
('389eb360-6d87-4f69-b577-63cacd139547', 'f5fd7e86-7927-42e5-9b4c-e01122055bcd', 'task', 'Stage approved', '"POST 2 — IVF સફળતા કયા Factors પર આધારિત છે?" was approved — it moves to the next stage.', '/dashboard?taskId=cd90d34e-3bd3-4bd0-b736-a2b86322551e', false, '2026-09-08T12:54:22.397Z'),
('1e413ba6-4308-455f-937c-0ea840735122', 'a0f6eb30-79cd-4e6b-a1d7-1ca2f764a690', 'task', 'You''re up next', '"POST 2 — IVF સફળતા કયા Factors પર આધારિત છે?" is ready for the next stage.', '/dashboard?taskId=cd90d34e-3bd3-4bd0-b736-a2b86322551e', false, '2026-09-08T12:54:23.285Z'),
('0c17ec65-56c8-411b-a1a7-c5dacc672f5b', '2945609a-08cc-4bb5-a6f5-7e9dbf8b3f6d', 'attendance', 'Clock in', 'Sudhir Thakor clocked in at 04:01 AM.', '/attendance', true, '2026-09-09T04:01:50.338Z'),
('34c8fdc1-2db7-4ff3-b846-a2c9e6668a26', '68c002cc-20db-4966-ab6e-e2cf66b42b41', 'task', 'Upcoming Deadline', '"Engineer''s Day" is due soon.', '/dashboard?taskId=ce2f8d4b-32a9-46ef-b239-829f0636c178', true, '2026-09-09T04:15:31.691Z'),
('e27d0ace-b099-4dbd-ba3b-3dbd22a3f408', '2945609a-08cc-4bb5-a6f5-7e9dbf8b3f6d', 'attendance', 'Clock in', 'Vishvash Patel clocked in at 04:18 AM.', '/attendance', false, '2026-09-09T04:18:53.455Z'),
('d9fe5f84-8323-46b7-97e8-6635ed187878', '2945609a-08cc-4bb5-a6f5-7e9dbf8b3f6d', 'project', 'New project in production', 'Ganesh standy added by Vishvash Patel — tasks are ready in the pipeline.', '/projects', false, '2026-09-09T04:37:23.852Z'),
('76f5df68-c30e-4f52-8d66-45b175e0d8b3', '7383317a-b7ac-46d8-9db8-43b8c4e4afa9', 'project', 'New project in production', 'Ganesh standy added by Vishvash Patel — tasks are ready in the pipeline.', '/projects', false, '2026-09-09T04:37:23.852Z'),
('0b18a4ad-f1b3-4159-b0fb-baa5540cd5d8', '68c002cc-20db-4966-ab6e-e2cf66b42b41', 'task', 'Upcoming Deadline', '"Banner 01" is due soon.', '/dashboard?taskId=bfb7a65e-73ca-4114-8dd4-ed595e9c98d9', true, '2026-09-09T04:39:05.851Z'),
('6e1c54cd-bd13-41a8-bab9-a05fb06109b4', 'd0625c86-49b2-46eb-93c6-99a723c00416', 'project', 'New project in production', 'Social Media Post added by Priya Patel — tasks are ready in the pipeline.', '/projects', true, '2026-09-08T12:26:51.451Z'),
('4348239a-9769-4029-af53-e2910ff6a0ca', 'd0625c86-49b2-46eb-93c6-99a723c00416', 'project', 'New project in production', 'Social Media Post added by Priya Patel — tasks are ready in the pipeline.', '/projects', true, '2026-09-08T12:28:42.390Z'),
('4fb74ade-b52b-4aed-9bf1-f295ca339733', 'd0625c86-49b2-46eb-93c6-99a723c00416', 'attendance', 'Clock out', 'Sudhir Thakor clocked out for the day. (Net Hours: 7.93h)', '/attendance', true, '2026-09-08T12:29:46.233Z'),
('d15c8fb4-2d56-4e79-a402-cba94179288b', 'd0625c86-49b2-46eb-93c6-99a723c00416', 'project', 'New project in production', 'sun glow added by Vishvash Patel — tasks are ready in the pipeline.', '/projects', true, '2026-09-08T12:07:39.986Z'),
('6f78cf87-5f79-47d6-87a8-5348154cef9f', 'd0625c86-49b2-46eb-93c6-99a723c00416', 'project', 'New project in production', 'Social Media Post added by Priya Patel — tasks are ready in the pipeline.', '/projects', true, '2026-09-08T12:08:14.004Z'),
('cdf3c957-6ea0-414d-9267-9720e6888574', 'd0625c86-49b2-46eb-93c6-99a723c00416', 'project', 'New project in production', 'Social Media Post added by Priya Patel — tasks are ready in the pipeline.', '/projects', true, '2026-09-08T12:13:26.554Z'),
('d17766c9-76cd-4a32-bc2a-2ed59acea1f8', 'd0625c86-49b2-46eb-93c6-99a723c00416', 'attendance', 'Clock in', 'Sudhir Thakor clocked in at 04:01 AM.', '/attendance', true, '2026-09-09T04:01:50.338Z'),
('4c4e242e-dfd9-45da-836d-624905794bf5', 'd0625c86-49b2-46eb-93c6-99a723c00416', 'task', 'Upcoming Deadline', '"DLT REGISTRATION 01" is due soon.', '/dashboard?taskId=05e4fd1f-4ce6-4e3b-93a5-e6fa71bbbe3a', true, '2026-09-09T04:08:34.713Z'),
('d1a5f1a9-9181-457f-9927-0ca4d37d4d78', 'd0625c86-49b2-46eb-93c6-99a723c00416', 'project', 'New project in production', 'Ganesh standy added by Vishvash Patel — tasks are ready in the pipeline.', '/projects', true, '2026-09-09T04:37:23.852Z'),
('4b831e12-5dea-45f9-9057-f95bc31b1322', '2945609a-08cc-4bb5-a6f5-7e9dbf8b3f6d', 'attendance', 'Clock in', 'Kaushal Rawat clocked in at 04:45 AM.', '/attendance', false, '2026-09-09T04:45:41.711Z'),
('9e791db1-be30-4cb3-9c54-7041b10448d0', '2945609a-08cc-4bb5-a6f5-7e9dbf8b3f6d', 'project', 'New project in production', 'SMP-sep added by Vishvash Patel — tasks are ready in the pipeline.', '/projects', false, '2026-09-09T04:55:49.970Z'),
('5e07e3e4-8e24-4ffe-a6af-bc0d6f6e8236', '7383317a-b7ac-46d8-9db8-43b8c4e4afa9', 'project', 'New project in production', 'SMP-sep added by Vishvash Patel — tasks are ready in the pipeline.', '/projects', false, '2026-09-09T04:55:49.970Z'),
('d49bcda7-b27c-4aed-b7bd-1820d147b8af', 'd0625c86-49b2-46eb-93c6-99a723c00416', 'project', 'New project in production', 'SMP-sep added by Vishvash Patel — tasks are ready in the pipeline.', '/projects', false, '2026-09-09T04:55:49.970Z'),
('31a2765d-45c7-46bb-85a5-6b2f5aa6e711', '2945609a-08cc-4bb5-a6f5-7e9dbf8b3f6d', 'project', 'New project in production', 'fest posts added by Vishvash Patel — tasks are ready in the pipeline.', '/projects', false, '2026-09-09T05:59:50.963Z'),
('cf152070-3529-4091-a951-61c18586553e', '7383317a-b7ac-46d8-9db8-43b8c4e4afa9', 'project', 'New project in production', 'fest posts added by Vishvash Patel — tasks are ready in the pipeline.', '/projects', false, '2026-09-09T05:59:50.963Z'),
('498a40d4-6fa0-46be-8e0c-b929852e76b8', 'd0625c86-49b2-46eb-93c6-99a723c00416', 'project', 'New project in production', 'fest posts added by Vishvash Patel — tasks are ready in the pipeline.', '/projects', false, '2026-09-09T05:59:50.963Z');

-- Table: "public"."project_deliverables"
DROP TABLE IF EXISTS "public"."project_deliverables" CASCADE;
CREATE TABLE "public"."project_deliverables" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "project_id" uuid NOT NULL,
  "category_key" text NOT NULL,
  "category_label" text NOT NULL,
  "quantity" int4 NOT NULL,
  "is_custom" bool NOT NULL DEFAULT false,
  "custom_label" text,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE ONLY "public"."project_deliverables" ADD CONSTRAINT "project_deliverables_category_key_not_null" NOT NULL category_key;
ALTER TABLE ONLY "public"."project_deliverables" ADD CONSTRAINT "project_deliverables_category_label_not_null" NOT NULL category_label;
ALTER TABLE ONLY "public"."project_deliverables" ADD CONSTRAINT "project_deliverables_created_at_not_null" NOT NULL created_at;
ALTER TABLE ONLY "public"."project_deliverables" ADD CONSTRAINT "project_deliverables_id_not_null" NOT NULL id;
ALTER TABLE ONLY "public"."project_deliverables" ADD CONSTRAINT "project_deliverables_is_custom_not_null" NOT NULL is_custom;
ALTER TABLE ONLY "public"."project_deliverables" ADD CONSTRAINT "project_deliverables_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY "public"."project_deliverables" ADD CONSTRAINT "project_deliverables_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE ONLY "public"."project_deliverables" ADD CONSTRAINT "project_deliverables_project_id_not_null" NOT NULL project_id;
ALTER TABLE ONLY "public"."project_deliverables" ADD CONSTRAINT "project_deliverables_quantity_check" CHECK ((quantity >= 1));
ALTER TABLE ONLY "public"."project_deliverables" ADD CONSTRAINT "project_deliverables_quantity_not_null" NOT NULL quantity;
CREATE INDEX idx_deliverables_project ON public.project_deliverables USING btree (project_id);

-- Data: 18 rows
INSERT INTO "public"."project_deliverables" ("id", "project_id", "category_key", "category_label", "quantity", "is_custom", "custom_label", "created_at") VALUES
('d239a039-9f59-4f6c-b47b-cac6f3ffa50e', '2ad17228-869f-4c06-9c4b-caf8fe20cefd', 'banner', 'Banner', 1, false, NULL, '2026-09-07T09:35:06.006Z'),
('8bb2bab3-f815-478a-90a3-a74dc6b2d841', '307d7157-b69d-4eb4-81e4-0f89b4b67662', 'static_post', 'Static Post', 12, false, NULL, '2026-09-07T09:53:29.521Z'),
('cf92e5e7-3f74-47ed-a15e-f0704ad1706a', 'ba2105f4-c767-4a14-a8d0-68c544c1020c', 'reel', 'Reel', 1, false, NULL, '2026-09-07T11:10:40.649Z'),
('4b8da7d2-d578-45de-9061-07a506a2df52', '06204b7b-2eae-406a-8894-d7bf61b4ebdf', 'reel', 'Reel', 1, false, NULL, '2026-09-07T11:10:46.379Z'),
('6c5bfdc7-8181-4acc-9678-d3f05370632c', '0fc5018d-65e6-4dba-8ac3-a000376123e6', 'custom', 'create an id card', 1, true, 'create an id card', '2026-09-08T06:20:45.271Z'),
('cbd5c422-4d0c-4c28-a633-320014bc6f1d', '6c2be8e9-4b64-490d-a946-eb7586c36273', 'custom', 'DLT REGISTRATION', 1, true, 'DLT REGISTRATION', '2026-09-08T08:57:01.626Z'),
('f3bcd8f9-4870-4030-a259-2b847513b4bd', '0d5ab193-c75c-4eac-bf48-7d7f97324738', 'static_post', 'Static Post', 4, false, NULL, '2026-09-08T10:06:45.604Z'),
('1ef25a3f-898b-4de9-8ab9-494461681c4a', '0d5ab193-c75c-4eac-bf48-7d7f97324738', 'static_post', 'Static Post', 1, false, NULL, '2026-09-08T10:35:12.715Z'),
('7af8f177-6244-48bd-9c78-306ca2ec19b6', 'ef95b809-26d1-4072-b505-78bdd593420f', 'static_post', 'Static Post', 8, false, NULL, '2026-09-08T10:41:09.675Z'),
('e07176f7-b8e4-4747-9ba4-5940dd4912d5', 'c93533d0-fd2d-4427-be6f-8cdd08993a17', 'static_post', 'Static Post', 9, false, NULL, '2026-09-08T12:07:26.574Z'),
('310ce2a3-b3b4-4bec-93f3-5f9d57154f68', '57be733e-7c4f-44c1-b937-98ef41b66d93', 'static_post', 'Static Post', 1, false, NULL, '2026-09-08T12:13:22.599Z'),
('de871404-7b53-4cb1-a454-ed0785dc2482', 'f0dec7dc-b7ec-4535-b79a-f942b2df191e', 'static_post', 'Static Post', 8, false, NULL, '2026-09-08T12:15:49.650Z'),
('c0428491-26ef-4138-b5fe-db4cfc448289', 'b5046137-29b8-400f-a6fb-8dc08e4268cf', 'static_post', 'Static Post', 1, false, NULL, '2026-09-08T12:22:03.718Z'),
('e2359e43-cb04-45c4-be8e-0ffe5f094829', '1b1ef994-601e-4b01-8428-3264ef8e2e6b', 'static_post', 'Static Post', 1, false, NULL, '2026-09-08T12:24:55.905Z'),
('2ef11405-b098-4f46-9125-e26ad589c6b8', 'c8c3a80f-a5ac-4fad-a179-e221ff053f3e', 'static_post', 'Static Post', 1, false, NULL, '2026-09-08T12:26:47.554Z'),
('eaaf66cc-e4a9-44f1-8abe-a2bd47947913', '10e5e20c-8883-4fc2-a05a-b76a2841dd55', 'static_post', 'Static Post', 1, false, NULL, '2026-09-08T12:28:38.296Z'),
('0db9684a-147f-40ef-b38d-97a7e0ecd5ac', '9be782c3-d555-4d7f-a87e-0998359f9e7a', 'static_post', 'Static Post', 3, false, NULL, '2026-09-09T04:55:43.712Z'),
('c782d491-df44-4f2c-9a71-7e75692a8a0a', 'd6c17551-11bc-4c4f-92e0-cb817be52d88', 'static_post', 'Static Post', 10, false, NULL, '2026-09-09T05:59:36.886Z');

-- Table: "public"."projects"
DROP TABLE IF EXISTS "public"."projects" CASCADE;
CREATE TABLE "public"."projects" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "client_id" uuid NOT NULL,
  "name" text NOT NULL,
  "status" text NOT NULL DEFAULT 'pending_approval'::text,
  "brief" text,
  "deliverables" text,
  "deadline" date,
  "created_by" uuid,
  "approved_by" uuid,
  "approved_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE ONLY "public"."projects" ADD CONSTRAINT "projects_approved_by_fkey" FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE ONLY "public"."projects" ADD CONSTRAINT "projects_client_id_fkey" FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;
ALTER TABLE ONLY "public"."projects" ADD CONSTRAINT "projects_client_id_not_null" NOT NULL client_id;
ALTER TABLE ONLY "public"."projects" ADD CONSTRAINT "projects_created_at_not_null" NOT NULL created_at;
ALTER TABLE ONLY "public"."projects" ADD CONSTRAINT "projects_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE ONLY "public"."projects" ADD CONSTRAINT "projects_id_not_null" NOT NULL id;
ALTER TABLE ONLY "public"."projects" ADD CONSTRAINT "projects_name_not_null" NOT NULL name;
ALTER TABLE ONLY "public"."projects" ADD CONSTRAINT "projects_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY "public"."projects" ADD CONSTRAINT "projects_status_not_null" NOT NULL status;
CREATE INDEX idx_projects_client ON public.projects USING btree (client_id);
CREATE INDEX idx_projects_client_created ON public.projects USING btree (client_id, created_at DESC);
CREATE INDEX idx_projects_status ON public.projects USING btree (status);

-- Data: 17 rows
INSERT INTO "public"."projects" ("id", "client_id", "name", "status", "brief", "deliverables", "deadline", "created_by", "approved_by", "approved_at", "created_at") VALUES
('307d7157-b69d-4eb4-81e4-0f89b4b67662', '3c2910d4-755c-432e-9274-bf5066c0d18a', '12 Social Media Post', 'in_progress', NULL, '12 × Static Post', '2026-09-29T18:30:00.000Z', 'd0625c86-49b2-46eb-93c6-99a723c00416', 'd0625c86-49b2-46eb-93c6-99a723c00416', '2026-09-07T09:53:29.298Z', '2026-09-07T09:53:29.298Z'),
('06204b7b-2eae-406a-8894-d7bf61b4ebdf', '3c2910d4-755c-432e-9274-bf5066c0d18a', 'Social Media Reels', 'in_progress', NULL, '1 × Reel', '2026-09-10T18:30:00.000Z', '2945609a-08cc-4bb5-a6f5-7e9dbf8b3f6d', '2945609a-08cc-4bb5-a6f5-7e9dbf8b3f6d', '2026-09-07T11:10:46.149Z', '2026-09-07T11:10:46.149Z'),
('2ad17228-869f-4c06-9c4b-caf8fe20cefd', 'ba0236e3-0ff8-48fc-9ed9-4d9ff1fb41bf', 'matteshwari luxuria', 'completed', '2ow to 10h', '1 × Banner', NULL, 'd0625c86-49b2-46eb-93c6-99a723c00416', 'd0625c86-49b2-46eb-93c6-99a723c00416', '2026-09-07T09:35:05.769Z', '2026-09-07T09:35:05.769Z'),
('0fc5018d-65e6-4dba-8ac3-a000376123e6', '8543e780-f067-4e8d-91f9-baa4d4cad763', 'id card', 'completed', 'create an id card', '1 × create an id card', '2026-09-07T18:30:00.000Z', 'd0625c86-49b2-46eb-93c6-99a723c00416', 'd0625c86-49b2-46eb-93c6-99a723c00416', '2026-09-08T06:20:45.041Z', '2026-09-08T06:20:45.041Z'),
('6c2be8e9-4b64-490d-a946-eb7586c36273', '8543e780-f067-4e8d-91f9-baa4d4cad763', 'DLT REGISTRATION', 'in_progress', NULL, '1 × DLT REGISTRATION', NULL, '2945609a-08cc-4bb5-a6f5-7e9dbf8b3f6d', '2945609a-08cc-4bb5-a6f5-7e9dbf8b3f6d', '2026-09-08T08:57:01.383Z', '2026-09-08T08:57:01.383Z'),
('0d5ab193-c75c-4eac-bf48-7d7f97324738', 'e15fe4c0-a14d-4292-8b69-dc32432d1cda', 'fest posts', 'in_progress', NULL, '4 × Static Post', NULL, 'd0625c86-49b2-46eb-93c6-99a723c00416', 'd0625c86-49b2-46eb-93c6-99a723c00416', '2026-09-08T10:06:45.331Z', '2026-09-08T10:06:45.331Z'),
('ef95b809-26d1-4072-b505-78bdd593420f', '1d43f7e6-7f9f-4bd4-9290-7a34b2122116', 'Festival Posts', 'in_progress', NULL, '8 × Static Post', '2026-09-27T18:30:00.000Z', 'd0625c86-49b2-46eb-93c6-99a723c00416', 'd0625c86-49b2-46eb-93c6-99a723c00416', '2026-09-08T10:41:09.445Z', '2026-09-08T10:41:09.445Z'),
('c93533d0-fd2d-4427-be6f-8cdd08993a17', 'c76f371e-6b54-4bb9-9725-e55b6038f1fe', 'sun glow', 'in_progress', NULL, '9 × Static Post', '2026-09-27T18:30:00.000Z', 'd0625c86-49b2-46eb-93c6-99a723c00416', 'd0625c86-49b2-46eb-93c6-99a723c00416', '2026-09-08T12:07:26.336Z', '2026-09-08T12:07:26.336Z'),
('57be733e-7c4f-44c1-b937-98ef41b66d93', 'c35a9d05-7ba9-4daa-8332-131f5e113d55', 'Social Media Post', 'in_progress', NULL, '1 × Static Post', NULL, '7383317a-b7ac-46d8-9db8-43b8c4e4afa9', '7383317a-b7ac-46d8-9db8-43b8c4e4afa9', '2026-09-08T12:13:22.380Z', '2026-09-08T12:13:22.380Z'),
('f0dec7dc-b7ec-4535-b79a-f942b2df191e', '7f0a18da-f2c3-450e-90ed-91ee11f7cc43', 'fest posts', 'in_progress', NULL, '8 × Static Post', '2026-09-27T18:30:00.000Z', 'd0625c86-49b2-46eb-93c6-99a723c00416', 'd0625c86-49b2-46eb-93c6-99a723c00416', '2026-09-08T12:15:49.435Z', '2026-09-08T12:15:49.435Z'),
('b5046137-29b8-400f-a6fb-8dc08e4268cf', '3640ce54-899a-48eb-9db6-f0c8a8218b62', 'Social Media Post', 'in_progress', NULL, '1 × Static Post', NULL, '7383317a-b7ac-46d8-9db8-43b8c4e4afa9', '7383317a-b7ac-46d8-9db8-43b8c4e4afa9', '2026-09-08T12:22:03.501Z', '2026-09-08T12:22:03.501Z'),
('1b1ef994-601e-4b01-8428-3264ef8e2e6b', 'b3855796-5fa1-4253-a064-fb77269ec7fb', 'Social Media Post', 'in_progress', NULL, '1 × Static Post', NULL, '7383317a-b7ac-46d8-9db8-43b8c4e4afa9', '7383317a-b7ac-46d8-9db8-43b8c4e4afa9', '2026-09-08T12:24:55.252Z', '2026-09-08T12:24:55.252Z'),
('c8c3a80f-a5ac-4fad-a179-e221ff053f3e', 'b7ebd6d9-90af-4c40-9806-6beeed09bd1d', 'Social Media Post', 'in_progress', NULL, '1 × Static Post', NULL, '7383317a-b7ac-46d8-9db8-43b8c4e4afa9', '7383317a-b7ac-46d8-9db8-43b8c4e4afa9', '2026-09-08T12:26:47.337Z', '2026-09-08T12:26:47.337Z'),
('10e5e20c-8883-4fc2-a05a-b76a2841dd55', 'ba0236e3-0ff8-48fc-9ed9-4d9ff1fb41bf', 'Social Media Post', 'in_progress', NULL, '1 × Static Post', NULL, '7383317a-b7ac-46d8-9db8-43b8c4e4afa9', '7383317a-b7ac-46d8-9db8-43b8c4e4afa9', '2026-09-08T12:28:38.079Z', '2026-09-08T12:28:38.079Z'),
('ba2105f4-c767-4a14-a8d0-68c544c1020c', '3c2910d4-755c-432e-9274-bf5066c0d18a', 'Social Media Reels', 'in_progress', NULL, '1 × Reel', '2026-09-10T18:30:00.000Z', '2945609a-08cc-4bb5-a6f5-7e9dbf8b3f6d', '2945609a-08cc-4bb5-a6f5-7e9dbf8b3f6d', '2026-09-07T11:10:40.417Z', '2026-09-07T11:10:40.417Z'),
('9be782c3-d555-4d7f-a87e-0998359f9e7a', '3a353688-1fce-4083-8121-50798393ff0c', 'SMP-sep', 'in_progress', NULL, '3 × Static Post', '2026-09-08T18:30:00.000Z', 'd0625c86-49b2-46eb-93c6-99a723c00416', 'd0625c86-49b2-46eb-93c6-99a723c00416', '2026-09-09T04:55:43.391Z', '2026-09-09T04:55:43.391Z'),
('d6c17551-11bc-4c4f-92e0-cb817be52d88', 'b40af818-41c2-4f2e-b679-033c44906195', 'fest posts', 'in_progress', NULL, '10 × Static Post', NULL, 'd0625c86-49b2-46eb-93c6-99a723c00416', 'd0625c86-49b2-46eb-93c6-99a723c00416', '2026-09-09T05:59:36.662Z', '2026-09-09T05:59:36.662Z');

-- Table: "public"."push_subscriptions"
DROP TABLE IF EXISTS "public"."push_subscriptions" CASCADE;
CREATE TABLE "public"."push_subscriptions" (
  "id" int8 NOT NULL DEFAULT nextval('push_subscriptions_id_seq'::regclass),
  "user_id" uuid NOT NULL,
  "endpoint" text NOT NULL,
  "p256dh" text NOT NULL,
  "auth" text NOT NULL,
  "created_at" timestamptz DEFAULT now()
);
ALTER TABLE ONLY "public"."push_subscriptions" ADD CONSTRAINT "push_subscriptions_auth_not_null" NOT NULL auth;
ALTER TABLE ONLY "public"."push_subscriptions" ADD CONSTRAINT "push_subscriptions_endpoint_key" UNIQUE (endpoint);
ALTER TABLE ONLY "public"."push_subscriptions" ADD CONSTRAINT "push_subscriptions_endpoint_not_null" NOT NULL endpoint;
ALTER TABLE ONLY "public"."push_subscriptions" ADD CONSTRAINT "push_subscriptions_id_not_null" NOT NULL id;
ALTER TABLE ONLY "public"."push_subscriptions" ADD CONSTRAINT "push_subscriptions_p256dh_not_null" NOT NULL p256dh;
ALTER TABLE ONLY "public"."push_subscriptions" ADD CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY "public"."push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE ONLY "public"."push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_not_null" NOT NULL user_id;
CREATE INDEX idx_push_sub_user ON public.push_subscriptions USING btree (user_id);

-- Data: 3 rows
INSERT INTO "public"."push_subscriptions" ("id", "user_id", "endpoint", "p256dh", "auth", "created_at") VALUES
(3, '2945609a-08cc-4bb5-a6f5-7e9dbf8b3f6d', 'https://fcm.googleapis.com/fcm/send/fNS7pErZjOg:APA91bHnQH1P4sZHE9N-BdslfRN7xa6gXb9wXJfRawgLSVfUlae2bnCFwGRzGNSub7ZRWKEWeV2nHp8Mj_JOqnQzcObLNyYpsFsGM6Zgv5plp4iuPXulc53KTDoY2bE6RBcOuoRo3GvU', 'BJy82W7pxX7eqkPIIfSlZsN8qhQKkOx8on_0B9N94TfxKXkBLbx-YF9Y0ed0mdZvp-pC7C3cFCsLTVoXmiwJjVQ', 'k54KpQoRVYmGx3W5lbQ5mg', '2026-09-08T08:16:59.995Z'),
(7, '68c002cc-20db-4966-ab6e-e2cf66b42b41', 'https://fcm.googleapis.com/fcm/send/f_daxWP1wkI:APA91bFNpJUP3pVFo-FN2cI5_rMpQnjtp2UkA-ow0ZgIRcDLx6Ty7V3ouG7Y3Rd_nuftSpexH_R5IWTLCvQYWWgyeQPiE6o_K8b4dJzJEbwqiS1rMC6kDctNxvm7OgNrtwSl7GdcuYt9', 'BF0OKpZgRuxxlnTWVfVsgAJSxwzyJXFS2UtqDWei5YwuMvT-WgTwwptlPs9TOUoQ-jWwfIuu83qIHXFov4PKM-w', 'Pa35dFXFq__LARPeBcW1vw', '2026-09-09T05:25:15.090Z'),
(8, '2945609a-08cc-4bb5-a6f5-7e9dbf8b3f6d', 'https://fcm.googleapis.com/fcm/send/cdyL70es8Yk:APA91bHZbQiuOclzrgJqbIUEKZxpZ_a8Nws4kn1Tr9SBtwxN8THSF4Qoz8BzzJOnKHbNWfq2wgKmFg83-OCQMOBYoI5hwzeormDwFq1TxFW3Qxb1sWZCd7UydxSC--92zBHZG-8CmF8D', 'BGOHSE8THP97_oPn7stjwxQCBHT16RrFm7HxYWABCef7WFL-g6iHbScECstVWLmw7CBh4N5y1_4xwfQbUiA2H0o', 'jf2jZWR_D_dBvTjC7l7Tnw', '2026-09-09T05:38:25.375Z');

-- Table: "public"."roles"
DROP TABLE IF EXISTS "public"."roles" CASCADE;
CREATE TABLE "public"."roles" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "key" text NOT NULL,
  "label" text NOT NULL,
  "permissions" _text NOT NULL DEFAULT '{}'::text[],
  "dashboard" text NOT NULL DEFAULT 'staff'::text,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE ONLY "public"."roles" ADD CONSTRAINT "roles_created_at_not_null" NOT NULL created_at;
ALTER TABLE ONLY "public"."roles" ADD CONSTRAINT "roles_dashboard_not_null" NOT NULL dashboard;
ALTER TABLE ONLY "public"."roles" ADD CONSTRAINT "roles_id_not_null" NOT NULL id;
ALTER TABLE ONLY "public"."roles" ADD CONSTRAINT "roles_key_key" UNIQUE (key);
ALTER TABLE ONLY "public"."roles" ADD CONSTRAINT "roles_key_not_null" NOT NULL key;
ALTER TABLE ONLY "public"."roles" ADD CONSTRAINT "roles_label_not_null" NOT NULL label;
ALTER TABLE ONLY "public"."roles" ADD CONSTRAINT "roles_permissions_not_null" NOT NULL permissions;
ALTER TABLE ONLY "public"."roles" ADD CONSTRAINT "roles_pkey" PRIMARY KEY (id);

-- Data: 8 rows
INSERT INTO "public"."roles" ("id", "key", "label", "permissions", "dashboard", "created_at") VALUES
('1b08250d-3faa-4753-9d73-306d7294fe38', 'SUPER_ADMIN', 'Super Admin', 'admin:*', 'admin', '2026-08-05T09:20:39.293Z'),
('e9a17f93-431a-43c8-a946-d221fb6fb5c4', 'PROJECT_MANAGER', 'Project Manager', 'projects:view,projects:create,projects:manage,projects:delete,projects:assign,tasks:execute,tasks:review,tasks:manage,attendance:view,leads:view,leads:manage,reports:view', 'pm', '2026-08-05T09:20:39.373Z'),
('8cd8f5c6-3916-469e-abbb-9481b5669ebc', 'SALES', 'Sales Executive', 'projects:view,projects:create,leads:view,leads:manage', 'sales', '2026-08-05T09:20:39.450Z'),
('e38eaa07-dbad-4e9d-8ad9-c8c66e42cb77', 'WRITER', 'Content Writer', 'tasks:execute', 'staff', '2026-08-05T09:20:39.527Z'),
('0d5ffc04-2d35-47e8-837e-c3f5d96de4b9', 'DESIGNER', 'Graphic Designer', 'tasks:execute', 'staff', '2026-08-05T09:20:39.604Z'),
('4c0197e5-581b-4251-a31e-b3d6db0ae910', 'EDITOR', 'Video Editor', 'tasks:execute', 'staff', '2026-08-05T09:20:39.683Z'),
('9c686ef3-7321-4ae1-bd6c-ca12cacf8ef5', 'SMM', 'Social Media Manager', 'tasks:execute', 'staff', '2026-08-05T09:20:39.762Z'),
('a7f17a68-8d3f-4e3d-8ac6-5529a5f4d806', 'VIDEOGRAPHER', 'Videographer', 'tasks:execute', 'staff', '2026-08-24T11:34:04.619Z');

-- Table: "public"."task_assignees"
DROP TABLE IF EXISTS "public"."task_assignees" CASCADE;
CREATE TABLE "public"."task_assignees" (
  "task_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "added_at" timestamptz NOT NULL DEFAULT now(),
  "position" int4 NOT NULL DEFAULT 0
);
ALTER TABLE ONLY "public"."task_assignees" ADD CONSTRAINT "task_assignees_added_at_not_null" NOT NULL added_at;
ALTER TABLE ONLY "public"."task_assignees" ADD CONSTRAINT "task_assignees_pkey" PRIMARY KEY (task_id, user_id);
ALTER TABLE ONLY "public"."task_assignees" ADD CONSTRAINT "task_assignees_position_not_null" NOT NULL "position";
ALTER TABLE ONLY "public"."task_assignees" ADD CONSTRAINT "task_assignees_task_id_fkey" FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE;
ALTER TABLE ONLY "public"."task_assignees" ADD CONSTRAINT "task_assignees_task_id_not_null" NOT NULL task_id;
ALTER TABLE ONLY "public"."task_assignees" ADD CONSTRAINT "task_assignees_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE ONLY "public"."task_assignees" ADD CONSTRAINT "task_assignees_user_id_not_null" NOT NULL user_id;
CREATE INDEX idx_task_assignees_seq ON public.task_assignees USING btree (task_id, "position", added_at);
CREATE INDEX idx_task_assignees_user ON public.task_assignees USING btree (user_id);

-- Data: 111 rows
INSERT INTO "public"."task_assignees" ("task_id", "user_id", "added_at", "position") VALUES
('e2235eed-f61b-4f1e-9ede-6ffd6e1cf9a0', '49109573-1ae8-4b67-96a2-45bdf0c763c1', '2026-09-07T09:54:47.486Z', 0),
('e2235eed-f61b-4f1e-9ede-6ffd6e1cf9a0', 'f5fd7e86-7927-42e5-9b4c-e01122055bcd', '2026-09-07T09:54:47.933Z', 1),
('e2235eed-f61b-4f1e-9ede-6ffd6e1cf9a0', 'a0f6eb30-79cd-4e6b-a1d7-1ca2f764a690', '2026-09-07T09:54:48.377Z', 2),
('cd90d34e-3bd3-4bd0-b736-a2b86322551e', '49109573-1ae8-4b67-96a2-45bdf0c763c1', '2026-09-07T09:54:49.712Z', 0),
('cd90d34e-3bd3-4bd0-b736-a2b86322551e', 'f5fd7e86-7927-42e5-9b4c-e01122055bcd', '2026-09-07T09:54:50.157Z', 1),
('cd90d34e-3bd3-4bd0-b736-a2b86322551e', 'a0f6eb30-79cd-4e6b-a1d7-1ca2f764a690', '2026-09-07T09:54:50.603Z', 2),
('86dfaa87-1059-472e-b165-da2f53937ba9', '49109573-1ae8-4b67-96a2-45bdf0c763c1', '2026-09-07T09:54:51.936Z', 0),
('86dfaa87-1059-472e-b165-da2f53937ba9', 'f5fd7e86-7927-42e5-9b4c-e01122055bcd', '2026-09-07T09:54:52.379Z', 1),
('86dfaa87-1059-472e-b165-da2f53937ba9', 'a0f6eb30-79cd-4e6b-a1d7-1ca2f764a690', '2026-09-07T09:54:52.823Z', 2),
('359c2c5f-75aa-4e2f-9322-b8ac59df1593', '49109573-1ae8-4b67-96a2-45bdf0c763c1', '2026-09-07T09:54:54.158Z', 0),
('359c2c5f-75aa-4e2f-9322-b8ac59df1593', 'f5fd7e86-7927-42e5-9b4c-e01122055bcd', '2026-09-07T09:54:54.604Z', 1),
('359c2c5f-75aa-4e2f-9322-b8ac59df1593', 'a0f6eb30-79cd-4e6b-a1d7-1ca2f764a690', '2026-09-07T09:54:55.046Z', 2),
('f6d7324a-44cc-4196-8344-b33ba4f49b4c', '49109573-1ae8-4b67-96a2-45bdf0c763c1', '2026-09-07T09:54:56.450Z', 0),
('f6d7324a-44cc-4196-8344-b33ba4f49b4c', 'f5fd7e86-7927-42e5-9b4c-e01122055bcd', '2026-09-07T09:54:56.895Z', 1),
('f6d7324a-44cc-4196-8344-b33ba4f49b4c', 'a0f6eb30-79cd-4e6b-a1d7-1ca2f764a690', '2026-09-07T09:54:57.338Z', 2),
('6cca0f58-54dc-4872-bb82-d349488de448', '49109573-1ae8-4b67-96a2-45bdf0c763c1', '2026-09-07T09:54:58.672Z', 0),
('6cca0f58-54dc-4872-bb82-d349488de448', 'f5fd7e86-7927-42e5-9b4c-e01122055bcd', '2026-09-07T09:54:59.117Z', 1),
('6cca0f58-54dc-4872-bb82-d349488de448', 'a0f6eb30-79cd-4e6b-a1d7-1ca2f764a690', '2026-09-07T09:54:59.560Z', 2),
('b5b238b8-579d-4adc-9027-1f0da57481db', '49109573-1ae8-4b67-96a2-45bdf0c763c1', '2026-09-07T09:55:00.893Z', 0),
('b5b238b8-579d-4adc-9027-1f0da57481db', 'f5fd7e86-7927-42e5-9b4c-e01122055bcd', '2026-09-07T09:55:01.337Z', 1),
('b5b238b8-579d-4adc-9027-1f0da57481db', 'a0f6eb30-79cd-4e6b-a1d7-1ca2f764a690', '2026-09-07T09:55:01.782Z', 2),
('4acfa88e-381d-4e70-a0b4-f3fdd2054313', '49109573-1ae8-4b67-96a2-45bdf0c763c1', '2026-09-07T09:55:03.117Z', 0),
('4acfa88e-381d-4e70-a0b4-f3fdd2054313', 'f5fd7e86-7927-42e5-9b4c-e01122055bcd', '2026-09-07T09:55:03.562Z', 1),
('4acfa88e-381d-4e70-a0b4-f3fdd2054313', 'a0f6eb30-79cd-4e6b-a1d7-1ca2f764a690', '2026-09-07T09:55:04.007Z', 2),
('522f5a7b-af2c-4770-b609-9f55931ef532', '49109573-1ae8-4b67-96a2-45bdf0c763c1', '2026-09-07T09:55:05.338Z', 0),
('522f5a7b-af2c-4770-b609-9f55931ef532', 'f5fd7e86-7927-42e5-9b4c-e01122055bcd', '2026-09-07T09:55:05.781Z', 1),
('522f5a7b-af2c-4770-b609-9f55931ef532', 'a0f6eb30-79cd-4e6b-a1d7-1ca2f764a690', '2026-09-07T09:55:06.226Z', 2),
('830db8ce-e7e5-435a-bc45-eebef504e46c', '49109573-1ae8-4b67-96a2-45bdf0c763c1', '2026-09-07T09:55:07.558Z', 0),
('830db8ce-e7e5-435a-bc45-eebef504e46c', 'f5fd7e86-7927-42e5-9b4c-e01122055bcd', '2026-09-07T09:55:08.003Z', 1),
('830db8ce-e7e5-435a-bc45-eebef504e46c', 'a0f6eb30-79cd-4e6b-a1d7-1ca2f764a690', '2026-09-07T09:55:08.447Z', 2),
('162e5be8-b260-4521-8023-969e559d75b8', '49109573-1ae8-4b67-96a2-45bdf0c763c1', '2026-09-07T09:55:09.815Z', 0),
('162e5be8-b260-4521-8023-969e559d75b8', 'f5fd7e86-7927-42e5-9b4c-e01122055bcd', '2026-09-07T09:55:10.259Z', 1),
('162e5be8-b260-4521-8023-969e559d75b8', 'a0f6eb30-79cd-4e6b-a1d7-1ca2f764a690', '2026-09-07T09:55:10.705Z', 2),
('957c9cd7-989a-4f6e-8e6e-7069dd1c9fab', '49109573-1ae8-4b67-96a2-45bdf0c763c1', '2026-09-07T09:55:12.038Z', 0),
('957c9cd7-989a-4f6e-8e6e-7069dd1c9fab', 'f5fd7e86-7927-42e5-9b4c-e01122055bcd', '2026-09-07T09:55:12.483Z', 1),
('957c9cd7-989a-4f6e-8e6e-7069dd1c9fab', 'a0f6eb30-79cd-4e6b-a1d7-1ca2f764a690', '2026-09-07T09:55:12.929Z', 2),
('ad6f14ee-8348-4ee0-949a-a488c64ac7c1', 'f5fd7e86-7927-42e5-9b4c-e01122055bcd', '2026-09-07T10:34:27.023Z', 0),
('f1fa3bfe-1094-4ec5-a3cd-b01f9f7285c9', '68c002cc-20db-4966-ab6e-e2cf66b42b41', '2026-09-08T06:21:15.464Z', 0),
('05e4fd1f-4ce6-4e3b-93a5-e6fa71bbbe3a', 'd0625c86-49b2-46eb-93c6-99a723c00416', '2026-09-08T08:59:40.340Z', 0),
('b7ff64b7-460e-46f5-ab94-de3854083071', '68c002cc-20db-4966-ab6e-e2cf66b42b41', '2026-09-08T10:08:08.514Z', 0),
('b7ff64b7-460e-46f5-ab94-de3854083071', 'a0f6eb30-79cd-4e6b-a1d7-1ca2f764a690', '2026-09-08T10:08:08.943Z', 1),
('34ae5c6a-3d1c-438d-a012-d7ef1c4f0cef', '68c002cc-20db-4966-ab6e-e2cf66b42b41', '2026-09-08T10:08:10.232Z', 0),
('34ae5c6a-3d1c-438d-a012-d7ef1c4f0cef', 'a0f6eb30-79cd-4e6b-a1d7-1ca2f764a690', '2026-09-08T10:08:10.666Z', 1),
('96a4ab86-885c-454b-b9c0-bc56f6ed9570', '68c002cc-20db-4966-ab6e-e2cf66b42b41', '2026-09-08T10:08:11.986Z', 0),
('96a4ab86-885c-454b-b9c0-bc56f6ed9570', 'a0f6eb30-79cd-4e6b-a1d7-1ca2f764a690', '2026-09-08T10:08:12.413Z', 1),
('fb4e2638-fa88-4101-945f-8dcb8f02e6ff', '68c002cc-20db-4966-ab6e-e2cf66b42b41', '2026-09-08T10:39:04.558Z', 0),
('fb4e2638-fa88-4101-945f-8dcb8f02e6ff', 'a0f6eb30-79cd-4e6b-a1d7-1ca2f764a690', '2026-09-08T10:39:05.010Z', 1),
('ff8272f2-0b07-493c-b8dc-66c4b32bd7d5', 'f5fd7e86-7927-42e5-9b4c-e01122055bcd', '2026-09-08T12:14:31.067Z', 0),
('ff8272f2-0b07-493c-b8dc-66c4b32bd7d5', 'a0f6eb30-79cd-4e6b-a1d7-1ca2f764a690', '2026-09-08T12:14:31.503Z', 1),
('fcace8f4-6f1e-43a5-be54-e15a0f0143c6', 'f5fd7e86-7927-42e5-9b4c-e01122055bcd', '2026-09-08T12:22:44.732Z', 0),
('fcace8f4-6f1e-43a5-be54-e15a0f0143c6', 'a0f6eb30-79cd-4e6b-a1d7-1ca2f764a690', '2026-09-08T12:22:45.179Z', 1),
('13a46c98-b486-4039-bede-ad491cf02690', 'f5fd7e86-7927-42e5-9b4c-e01122055bcd', '2026-09-08T12:25:34.033Z', 0),
('13a46c98-b486-4039-bede-ad491cf02690', 'a0f6eb30-79cd-4e6b-a1d7-1ca2f764a690', '2026-09-08T12:25:34.494Z', 1),
('ce2f8d4b-32a9-46ef-b239-829f0636c178', '68c002cc-20db-4966-ab6e-e2cf66b42b41', '2026-09-09T04:08:16.049Z', 0),
('ce2f8d4b-32a9-46ef-b239-829f0636c178', 'a0f6eb30-79cd-4e6b-a1d7-1ca2f764a690', '2026-09-09T04:08:16.497Z', 1),
('b6920edd-ef0c-41b6-b3cc-cdeb0f532352', '68c002cc-20db-4966-ab6e-e2cf66b42b41', '2026-09-09T04:08:17.830Z', 0),
('b6920edd-ef0c-41b6-b3cc-cdeb0f532352', 'a0f6eb30-79cd-4e6b-a1d7-1ca2f764a690', '2026-09-09T04:08:18.275Z', 1),
('0d912007-d5eb-49c6-972a-abc091182f10', '68c002cc-20db-4966-ab6e-e2cf66b42b41', '2026-09-09T04:08:19.606Z', 0),
('0d912007-d5eb-49c6-972a-abc091182f10', 'a0f6eb30-79cd-4e6b-a1d7-1ca2f764a690', '2026-09-09T04:08:20.049Z', 1),
('c03d83a6-8d89-4542-a4e6-e68ada54b183', '68c002cc-20db-4966-ab6e-e2cf66b42b41', '2026-09-09T04:08:21.381Z', 0),
('c03d83a6-8d89-4542-a4e6-e68ada54b183', 'a0f6eb30-79cd-4e6b-a1d7-1ca2f764a690', '2026-09-09T04:08:21.824Z', 1),
('e91a635d-aab3-4902-94d1-ea137fad9bed', '68c002cc-20db-4966-ab6e-e2cf66b42b41', '2026-09-09T04:08:23.153Z', 0),
('e91a635d-aab3-4902-94d1-ea137fad9bed', 'a0f6eb30-79cd-4e6b-a1d7-1ca2f764a690', '2026-09-09T04:08:23.598Z', 1),
('925b41f2-3fd7-4491-a128-6e36d410af0d', '68c002cc-20db-4966-ab6e-e2cf66b42b41', '2026-09-09T04:08:24.933Z', 0),
('925b41f2-3fd7-4491-a128-6e36d410af0d', 'a0f6eb30-79cd-4e6b-a1d7-1ca2f764a690', '2026-09-09T04:08:25.377Z', 1),
('7d2c251d-2296-4747-85db-204a73c0da2c', '68c002cc-20db-4966-ab6e-e2cf66b42b41', '2026-09-09T04:08:26.712Z', 0),
('7d2c251d-2296-4747-85db-204a73c0da2c', 'a0f6eb30-79cd-4e6b-a1d7-1ca2f764a690', '2026-09-09T04:08:27.157Z', 1),
('7da10b3a-6f69-47b8-8923-cfbff482adaf', '68c002cc-20db-4966-ab6e-e2cf66b42b41', '2026-09-09T04:08:28.509Z', 0),
('7da10b3a-6f69-47b8-8923-cfbff482adaf', 'a0f6eb30-79cd-4e6b-a1d7-1ca2f764a690', '2026-09-09T04:08:28.953Z', 1),
('63583195-ce3e-43cc-af06-42fa763005fc', '68c002cc-20db-4966-ab6e-e2cf66b42b41', '2026-09-09T04:08:30.286Z', 0),
('63583195-ce3e-43cc-af06-42fa763005fc', 'a0f6eb30-79cd-4e6b-a1d7-1ca2f764a690', '2026-09-09T04:08:30.730Z', 1),
('cde85cbd-5ec5-4e34-919b-8293a43a1757', '68c002cc-20db-4966-ab6e-e2cf66b42b41', '2026-09-09T04:09:09.837Z', 0),
('cde85cbd-5ec5-4e34-919b-8293a43a1757', 'a0f6eb30-79cd-4e6b-a1d7-1ca2f764a690', '2026-09-09T04:09:10.283Z', 1),
('eba73b91-85b2-4521-95bc-37b0dfe2a563', '68c002cc-20db-4966-ab6e-e2cf66b42b41', '2026-09-09T04:09:12.051Z', 0),
('eba73b91-85b2-4521-95bc-37b0dfe2a563', 'a0f6eb30-79cd-4e6b-a1d7-1ca2f764a690', '2026-09-09T04:09:12.500Z', 1),
('4cfc3e50-d86a-4e19-9a5d-3f768280f014', '68c002cc-20db-4966-ab6e-e2cf66b42b41', '2026-09-09T04:09:13.844Z', 0),
('4cfc3e50-d86a-4e19-9a5d-3f768280f014', 'a0f6eb30-79cd-4e6b-a1d7-1ca2f764a690', '2026-09-09T04:09:14.296Z', 1),
('fedd1ca9-b9e6-484e-b642-3f0255358070', '68c002cc-20db-4966-ab6e-e2cf66b42b41', '2026-09-09T04:09:15.636Z', 0),
('fedd1ca9-b9e6-484e-b642-3f0255358070', 'a0f6eb30-79cd-4e6b-a1d7-1ca2f764a690', '2026-09-09T04:09:16.083Z', 1),
('cfc754db-6dd5-4972-8295-a95c81ba40e6', '68c002cc-20db-4966-ab6e-e2cf66b42b41', '2026-09-09T04:09:17.426Z', 0),
('cfc754db-6dd5-4972-8295-a95c81ba40e6', 'a0f6eb30-79cd-4e6b-a1d7-1ca2f764a690', '2026-09-09T04:09:17.874Z', 1),
('66c3e2bc-2087-460a-90b1-b950c3910c10', '68c002cc-20db-4966-ab6e-e2cf66b42b41', '2026-09-09T04:09:19.217Z', 0),
('66c3e2bc-2087-460a-90b1-b950c3910c10', 'a0f6eb30-79cd-4e6b-a1d7-1ca2f764a690', '2026-09-09T04:09:19.665Z', 1),
('4a5cb327-6f4f-4df8-9711-f152b9f508b6', '68c002cc-20db-4966-ab6e-e2cf66b42b41', '2026-09-09T04:09:21.008Z', 0),
('4a5cb327-6f4f-4df8-9711-f152b9f508b6', 'a0f6eb30-79cd-4e6b-a1d7-1ca2f764a690', '2026-09-09T04:09:21.454Z', 1),
('8ee2c763-7fdd-4a93-8f66-d9489cce0543', '68c002cc-20db-4966-ab6e-e2cf66b42b41', '2026-09-09T04:09:23.212Z', 0),
('8ee2c763-7fdd-4a93-8f66-d9489cce0543', 'a0f6eb30-79cd-4e6b-a1d7-1ca2f764a690', '2026-09-09T04:09:23.654Z', 1),
('9d04a493-78af-4fdb-a407-3cd247bd880b', '68c002cc-20db-4966-ab6e-e2cf66b42b41', '2026-09-09T04:09:46.218Z', 0),
('9d04a493-78af-4fdb-a407-3cd247bd880b', 'a0f6eb30-79cd-4e6b-a1d7-1ca2f764a690', '2026-09-09T04:09:46.671Z', 1),
('41a0176b-b8e6-49c1-8295-ca69a9b4882f', '68c002cc-20db-4966-ab6e-e2cf66b42b41', '2026-09-09T04:09:48.481Z', 0),
('41a0176b-b8e6-49c1-8295-ca69a9b4882f', 'a0f6eb30-79cd-4e6b-a1d7-1ca2f764a690', '2026-09-09T04:09:48.935Z', 1),
('ec895ee5-c853-4d98-b718-261178cc25f3', '68c002cc-20db-4966-ab6e-e2cf66b42b41', '2026-09-09T04:09:50.293Z', 0),
('ec895ee5-c853-4d98-b718-261178cc25f3', 'a0f6eb30-79cd-4e6b-a1d7-1ca2f764a690', '2026-09-09T04:09:50.749Z', 1),
('822c87c5-3834-4a16-a13d-11724c52c564', '68c002cc-20db-4966-ab6e-e2cf66b42b41', '2026-09-09T04:09:52.109Z', 0),
('822c87c5-3834-4a16-a13d-11724c52c564', 'a0f6eb30-79cd-4e6b-a1d7-1ca2f764a690', '2026-09-09T04:09:52.564Z', 1),
('00609052-16b6-491f-8716-2fc276b9883f', '68c002cc-20db-4966-ab6e-e2cf66b42b41', '2026-09-09T04:09:53.927Z', 0),
('00609052-16b6-491f-8716-2fc276b9883f', 'a0f6eb30-79cd-4e6b-a1d7-1ca2f764a690', '2026-09-09T04:09:54.380Z', 1),
('dfc600ac-7e5b-4104-a1a4-a9d40e619053', '68c002cc-20db-4966-ab6e-e2cf66b42b41', '2026-09-09T04:09:55.742Z', 0),
('dfc600ac-7e5b-4104-a1a4-a9d40e619053', 'a0f6eb30-79cd-4e6b-a1d7-1ca2f764a690', '2026-09-09T04:09:56.197Z', 1),
('a8082252-444d-450c-b404-f0533d2544b9', '68c002cc-20db-4966-ab6e-e2cf66b42b41', '2026-09-09T04:09:57.563Z', 0),
('a8082252-444d-450c-b404-f0533d2544b9', 'a0f6eb30-79cd-4e6b-a1d7-1ca2f764a690', '2026-09-09T04:09:58.017Z', 1),
('8f8448c2-df63-4657-b145-9cdb0c77fcc7', '68c002cc-20db-4966-ab6e-e2cf66b42b41', '2026-09-09T04:09:59.795Z', 0),
('8f8448c2-df63-4657-b145-9cdb0c77fcc7', 'a0f6eb30-79cd-4e6b-a1d7-1ca2f764a690', '2026-09-09T04:10:00.237Z', 1),
('8c4a5195-19bb-4776-bebb-a35ba6dd2a19', 'f5fd7e86-7927-42e5-9b4c-e01122055bcd', '2026-09-09T04:56:52.154Z', 0),
('8c4a5195-19bb-4776-bebb-a35ba6dd2a19', 'a0f6eb30-79cd-4e6b-a1d7-1ca2f764a690', '2026-09-09T04:56:52.600Z', 1),
('a3e8805d-774a-4b46-a604-739ffb8ec6ec', 'f5fd7e86-7927-42e5-9b4c-e01122055bcd', '2026-09-09T04:56:53.941Z', 0),
('a3e8805d-774a-4b46-a604-739ffb8ec6ec', 'a0f6eb30-79cd-4e6b-a1d7-1ca2f764a690', '2026-09-09T04:56:54.387Z', 1),
('65023823-712e-4f1b-9f34-6a245526a457', 'f5fd7e86-7927-42e5-9b4c-e01122055bcd', '2026-09-09T04:56:55.723Z', 0),
('65023823-712e-4f1b-9f34-6a245526a457', 'a0f6eb30-79cd-4e6b-a1d7-1ca2f764a690', '2026-09-09T04:56:56.168Z', 1),
('ab751a91-3dcf-4f34-9c76-b3ce380aac9c', 'f5fd7e86-7927-42e5-9b4c-e01122055bcd', '2026-09-09T05:37:01.284Z', 0),
('ab751a91-3dcf-4f34-9c76-b3ce380aac9c', 'a0f6eb30-79cd-4e6b-a1d7-1ca2f764a690', '2026-09-09T05:37:01.715Z', 1);

-- Table: "public"."task_contributions"
DROP TABLE IF EXISTS "public"."task_contributions" CASCADE;
CREATE TABLE "public"."task_contributions" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "task_id" uuid NOT NULL,
  "step" int4 NOT NULL DEFAULT 0,
  "user_id" uuid,
  "user_name" text,
  "role_label" text,
  "content" text,
  "status" text NOT NULL DEFAULT 'submitted'::text,
  "review_comment" text,
  "reviewed_by" uuid,
  "submitted_at" timestamptz NOT NULL DEFAULT now(),
  "reviewed_at" timestamptz
);
ALTER TABLE ONLY "public"."task_contributions" ADD CONSTRAINT "task_contributions_id_not_null" NOT NULL id;
ALTER TABLE ONLY "public"."task_contributions" ADD CONSTRAINT "task_contributions_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY "public"."task_contributions" ADD CONSTRAINT "task_contributions_reviewed_by_fkey" FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE ONLY "public"."task_contributions" ADD CONSTRAINT "task_contributions_status_not_null" NOT NULL status;
ALTER TABLE ONLY "public"."task_contributions" ADD CONSTRAINT "task_contributions_step_not_null" NOT NULL step;
ALTER TABLE ONLY "public"."task_contributions" ADD CONSTRAINT "task_contributions_submitted_at_not_null" NOT NULL submitted_at;
ALTER TABLE ONLY "public"."task_contributions" ADD CONSTRAINT "task_contributions_task_id_fkey" FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE;
ALTER TABLE ONLY "public"."task_contributions" ADD CONSTRAINT "task_contributions_task_id_not_null" NOT NULL task_id;
ALTER TABLE ONLY "public"."task_contributions" ADD CONSTRAINT "task_contributions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX idx_task_contributions_task ON public.task_contributions USING btree (task_id, step);
-- no rows in "public"."task_contributions"

-- Table: "public"."tasks"
DROP TABLE IF EXISTS "public"."tasks" CASCADE;
CREATE TABLE "public"."tasks" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "project_id" uuid NOT NULL,
  "step_key" text NOT NULL DEFAULT 'manual'::text,
  "group_key" text NOT NULL DEFAULT 'manual'::text,
  "role_key" text,
  "deliverable_id" uuid,
  "sequence" int4 NOT NULL DEFAULT 1,
  "title" text NOT NULL,
  "description" text,
  "content" text,
  "status" text NOT NULL DEFAULT 'pending'::text,
  "priority" text NOT NULL DEFAULT 'medium'::text,
  "assigned_to" uuid,
  "created_by" uuid,
  "due_date" date,
  "completed_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "review_comment" text,
  "client_feedback" text,
  "platforms" _text NOT NULL DEFAULT '{}'::text[],
  "reviewed_by" uuid,
  "reviewed_at" timestamptz,
  "brief_copy" text,
  "on_leave_note" text,
  "remarks" text,
  "current_step" int4 NOT NULL DEFAULT 0,
  "brief_approved_by" uuid,
  "brief_approved_at" timestamptz,
  "remarks_edited_by" uuid,
  "remarks_edited_at" timestamptz,
  "content_status" text
);
ALTER TABLE ONLY "public"."tasks" ADD CONSTRAINT "tasks_assigned_to_fkey" FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE ONLY "public"."tasks" ADD CONSTRAINT "tasks_brief_approved_by_fkey" FOREIGN KEY (brief_approved_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE ONLY "public"."tasks" ADD CONSTRAINT "tasks_created_at_not_null" NOT NULL created_at;
ALTER TABLE ONLY "public"."tasks" ADD CONSTRAINT "tasks_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE ONLY "public"."tasks" ADD CONSTRAINT "tasks_current_step_not_null" NOT NULL current_step;
ALTER TABLE ONLY "public"."tasks" ADD CONSTRAINT "tasks_deliverable_id_fkey" FOREIGN KEY (deliverable_id) REFERENCES project_deliverables(id) ON DELETE CASCADE;
ALTER TABLE ONLY "public"."tasks" ADD CONSTRAINT "tasks_group_key_not_null" NOT NULL group_key;
ALTER TABLE ONLY "public"."tasks" ADD CONSTRAINT "tasks_id_not_null" NOT NULL id;
ALTER TABLE ONLY "public"."tasks" ADD CONSTRAINT "tasks_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY "public"."tasks" ADD CONSTRAINT "tasks_platforms_not_null" NOT NULL platforms;
ALTER TABLE ONLY "public"."tasks" ADD CONSTRAINT "tasks_priority_not_null" NOT NULL priority;
ALTER TABLE ONLY "public"."tasks" ADD CONSTRAINT "tasks_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE ONLY "public"."tasks" ADD CONSTRAINT "tasks_project_id_not_null" NOT NULL project_id;
ALTER TABLE ONLY "public"."tasks" ADD CONSTRAINT "tasks_remarks_edited_by_fkey" FOREIGN KEY (remarks_edited_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE ONLY "public"."tasks" ADD CONSTRAINT "tasks_reviewed_by_fkey" FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE ONLY "public"."tasks" ADD CONSTRAINT "tasks_role_key_fkey" FOREIGN KEY (role_key) REFERENCES roles(key) ON DELETE RESTRICT;
ALTER TABLE ONLY "public"."tasks" ADD CONSTRAINT "tasks_sequence_not_null" NOT NULL sequence;
ALTER TABLE ONLY "public"."tasks" ADD CONSTRAINT "tasks_status_not_null" NOT NULL status;
ALTER TABLE ONLY "public"."tasks" ADD CONSTRAINT "tasks_step_key_not_null" NOT NULL step_key;
ALTER TABLE ONLY "public"."tasks" ADD CONSTRAINT "tasks_title_not_null" NOT NULL title;
CREATE INDEX idx_tasks_assigned ON public.tasks USING btree (assigned_to);
CREATE INDEX idx_tasks_content_status ON public.tasks USING btree (content_status);
CREATE INDEX idx_tasks_due_date ON public.tasks USING btree (due_date);
CREATE INDEX idx_tasks_project ON public.tasks USING btree (project_id);
CREATE INDEX idx_tasks_project_status ON public.tasks USING btree (project_id, status);
CREATE INDEX idx_tasks_status ON public.tasks USING btree (status);

-- Data: 62 rows
INSERT INTO "public"."tasks" ("id", "project_id", "step_key", "group_key", "role_key", "deliverable_id", "sequence", "title", "description", "content", "status", "priority", "assigned_to", "created_by", "due_date", "completed_at", "created_at", "review_comment", "client_feedback", "platforms", "reviewed_by", "reviewed_at", "brief_copy", "on_leave_note", "remarks", "current_step", "brief_approved_by", "brief_approved_at", "remarks_edited_by", "remarks_edited_at", "content_status") VALUES
('f1fa3bfe-1094-4ec5-a3cd-b01f9f7285c9', '0fc5018d-65e6-4dba-8ac3-a000376123e6', 'custom_d_1', 'custom', 'DESIGNER', '6c5bfdc7-8181-4acc-9678-d3f05370632c', 1, 'create an id card 01', 'Unified deliverable "create an id card 01". This task flows sequentially through the assigned team — each member starts, submits, and is approved before the next hand-off.', '', 'completed', 'medium', '68c002cc-20db-4966-ab6e-e2cf66b42b41', NULL, '2026-09-07T18:30:00.000Z', '2026-09-08T08:55:46.335Z', '2026-09-08T06:20:45.929Z', NULL, NULL, '', NULL, NULL, NULL, NULL, 'Done', 0, NULL, '2026-09-08T06:20:45.929Z', '68c002cc-20db-4966-ab6e-e2cf66b42b41', '2026-09-08T12:37:27.890Z', NULL),
('b7ff64b7-460e-46f5-ab94-de3854083071', '0d5ab193-c75c-4eac-bf48-7d7f97324738', 'static_post_d_2', 'static_post', 'DESIGNER', 'f3bcd8f9-4870-4030-a259-2b847513b4bd', 1, 'Bhai Dooj', 'Unified deliverable "Static Post 02". This task flows sequentially through the assigned team — each member starts, submits, and is approved before the next hand-off.', '', 'approved', 'medium', '68c002cc-20db-4966-ab6e-e2cf66b42b41', NULL, '2026-09-27T18:30:00.000Z', NULL, '2026-09-08T10:06:47.184Z', NULL, NULL, '', NULL, NULL, NULL, NULL, '', 0, NULL, '2026-09-08T10:06:47.184Z', '68c002cc-20db-4966-ab6e-e2cf66b42b41', '2026-09-09T04:27:09.196Z', NULL),
('bb6ef589-7208-4c75-afd5-f781518bd71a', 'd6c17551-11bc-4c4f-92e0-cb817be52d88', 'static_post_d_2', 'static_post', NULL, 'c782d491-df44-4f2c-9a71-7e75692a8a0a', 1, 'Engineer''s Day', 'Unified deliverable "Engineer''s Day". This task flows sequentially through the assigned team — each member starts, submits, and is approved before the next hand-off.', NULL, 'approved', 'medium', NULL, NULL, '2026-09-13T18:30:00.000Z', NULL, '2026-09-09T05:59:38.454Z', NULL, NULL, '', NULL, NULL, NULL, NULL, NULL, 0, NULL, '2026-09-09T05:59:38.454Z', NULL, NULL, NULL),
('8edf87c2-ef4b-4380-89ab-29b3a7cc98f8', 'd6c17551-11bc-4c4f-92e0-cb817be52d88', 'static_post_d_3', 'static_post', NULL, 'c782d491-df44-4f2c-9a71-7e75692a8a0a', 1, 'Sharad Navratri Begins', 'Unified deliverable "Sharad Navratri Begins". This task flows sequentially through the assigned team — each member starts, submits, and is approved before the next hand-off.', NULL, 'approved', 'medium', NULL, NULL, '2026-09-15T18:30:00.000Z', NULL, '2026-09-09T05:59:39.349Z', NULL, NULL, '', NULL, NULL, NULL, NULL, NULL, 0, NULL, '2026-09-09T05:59:39.349Z', NULL, NULL, NULL),
('bea815b0-a650-48be-aa3b-09cd48560ae4', 'd6c17551-11bc-4c4f-92e0-cb817be52d88', 'static_post_d_4', 'static_post', NULL, 'c782d491-df44-4f2c-9a71-7e75692a8a0a', 1, 'Durga Ashtami', 'Unified deliverable "Durga Ashtami". This task flows sequentially through the assigned team — each member starts, submits, and is approved before the next hand-off.', NULL, 'approved', 'medium', NULL, NULL, '2026-09-17T18:30:00.000Z', NULL, '2026-09-09T05:59:40.242Z', NULL, NULL, '', NULL, NULL, NULL, NULL, NULL, 0, NULL, '2026-09-09T05:59:40.242Z', NULL, NULL, NULL),
('2c09a9b4-4770-4030-912c-f066b9764f30', 'd6c17551-11bc-4c4f-92e0-cb817be52d88', 'static_post_d_5', 'static_post', NULL, 'c782d491-df44-4f2c-9a71-7e75692a8a0a', 1, 'National Unity Day', 'Unified deliverable "National Unity Day". This task flows sequentially through the assigned team — each member starts, submits, and is approved before the next hand-off.', NULL, 'approved', 'medium', NULL, NULL, '2026-09-20T18:30:00.000Z', NULL, '2026-09-09T05:59:41.136Z', NULL, NULL, '', NULL, NULL, NULL, NULL, NULL, 0, NULL, '2026-09-09T05:59:41.136Z', NULL, NULL, NULL),
('34ae5c6a-3d1c-438d-a012-d7ef1c4f0cef', '0d5ab193-c75c-4eac-bf48-7d7f97324738', 'static_post_d_3', 'static_post', 'DESIGNER', 'f3bcd8f9-4870-4030-a259-2b847513b4bd', 1, 'Labh Panchami', 'Unified deliverable "Static Post 03". This task flows sequentially through the assigned team — each member starts, submits, and is approved before the next hand-off.', '', 'approved', 'medium', '68c002cc-20db-4966-ab6e-e2cf66b42b41', NULL, '2026-09-27T18:30:00.000Z', NULL, '2026-09-08T10:06:48.475Z', NULL, NULL, '', NULL, NULL, NULL, NULL, '', 0, NULL, '2026-09-08T10:06:48.475Z', 'd0625c86-49b2-46eb-93c6-99a723c00416', '2026-09-08T10:16:17.966Z', NULL),
('96a4ab86-885c-454b-b9c0-bc56f6ed9570', '0d5ab193-c75c-4eac-bf48-7d7f97324738', 'static_post_d_4', 'static_post', 'DESIGNER', 'f3bcd8f9-4870-4030-a259-2b847513b4bd', 1, 'Chhath puja', 'Unified deliverable "Static Post 04". This task flows sequentially through the assigned team — each member starts, submits, and is approved before the next hand-off.', '', 'approved', 'medium', '68c002cc-20db-4966-ab6e-e2cf66b42b41', NULL, '2026-09-27T18:30:00.000Z', NULL, '2026-09-08T10:06:49.347Z', NULL, NULL, '', NULL, NULL, NULL, NULL, '', 0, NULL, '2026-09-08T10:06:49.347Z', 'd0625c86-49b2-46eb-93c6-99a723c00416', '2026-09-08T10:16:33.380Z', NULL),
('359c2c5f-75aa-4e2f-9322-b8ac59df1593', '307d7157-b69d-4eb4-81e4-0f89b4b67662', 'static_post_d_4', 'static_post', 'WRITER', '8bb2bab3-f815-478a-90a3-a74dc6b2d841', 1, 'Static Post 04', 'Unified deliverable "Static Post 04". This task flows sequentially through the assigned team — each member starts, submits, and is approved before the next hand-off.', NULL, 'approved', 'medium', '49109573-1ae8-4b67-96a2-45bdf0c763c1', NULL, '2026-09-10T18:30:00.000Z', NULL, '2026-09-07T09:53:32.834Z', NULL, NULL, '', NULL, NULL, NULL, NULL, NULL, 0, NULL, '2026-09-07T09:53:32.834Z', NULL, NULL, NULL),
('6cca0f58-54dc-4872-bb82-d349488de448', '307d7157-b69d-4eb4-81e4-0f89b4b67662', 'static_post_d_6', 'static_post', 'WRITER', '8bb2bab3-f815-478a-90a3-a74dc6b2d841', 1, 'Static Post 06', 'Unified deliverable "Static Post 06". This task flows sequentially through the assigned team — each member starts, submits, and is approved before the next hand-off.', NULL, 'approved', 'medium', '49109573-1ae8-4b67-96a2-45bdf0c763c1', NULL, '2026-09-13T18:30:00.000Z', NULL, '2026-09-07T09:53:34.602Z', NULL, NULL, '', NULL, NULL, NULL, NULL, NULL, 0, NULL, '2026-09-07T09:53:34.602Z', NULL, NULL, NULL),
('b5b238b8-579d-4adc-9027-1f0da57481db', '307d7157-b69d-4eb4-81e4-0f89b4b67662', 'static_post_d_7', 'static_post', 'WRITER', '8bb2bab3-f815-478a-90a3-a74dc6b2d841', 1, 'Static Post 07', 'Unified deliverable "Static Post 07". This task flows sequentially through the assigned team — each member starts, submits, and is approved before the next hand-off.', NULL, 'approved', 'medium', '49109573-1ae8-4b67-96a2-45bdf0c763c1', NULL, '2026-09-14T18:30:00.000Z', NULL, '2026-09-07T09:53:35.513Z', NULL, NULL, '', NULL, NULL, NULL, NULL, NULL, 0, NULL, '2026-09-07T09:53:35.513Z', NULL, NULL, NULL),
('4acfa88e-381d-4e70-a0b4-f3fdd2054313', '307d7157-b69d-4eb4-81e4-0f89b4b67662', 'static_post_d_8', 'static_post', 'WRITER', '8bb2bab3-f815-478a-90a3-a74dc6b2d841', 1, 'Static Post 08', 'Unified deliverable "Static Post 08". This task flows sequentially through the assigned team — each member starts, submits, and is approved before the next hand-off.', NULL, 'approved', 'medium', '49109573-1ae8-4b67-96a2-45bdf0c763c1', NULL, '2026-09-15T18:30:00.000Z', NULL, '2026-09-07T09:53:36.396Z', NULL, NULL, '', NULL, NULL, NULL, NULL, NULL, 0, NULL, '2026-09-07T09:53:36.396Z', NULL, NULL, NULL),
('522f5a7b-af2c-4770-b609-9f55931ef532', '307d7157-b69d-4eb4-81e4-0f89b4b67662', 'static_post_d_9', 'static_post', 'WRITER', '8bb2bab3-f815-478a-90a3-a74dc6b2d841', 1, 'Static Post 09', 'Unified deliverable "Static Post 09". This task flows sequentially through the assigned team — each member starts, submits, and is approved before the next hand-off.', NULL, 'approved', 'medium', '49109573-1ae8-4b67-96a2-45bdf0c763c1', NULL, '2026-09-16T18:30:00.000Z', NULL, '2026-09-07T09:53:37.279Z', NULL, NULL, '', NULL, NULL, NULL, NULL, NULL, 0, NULL, '2026-09-07T09:53:37.279Z', NULL, NULL, NULL),
('830db8ce-e7e5-435a-bc45-eebef504e46c', '307d7157-b69d-4eb4-81e4-0f89b4b67662', 'static_post_d_10', 'static_post', 'WRITER', '8bb2bab3-f815-478a-90a3-a74dc6b2d841', 1, 'Static Post 10', 'Unified deliverable "Static Post 10". This task flows sequentially through the assigned team — each member starts, submits, and is approved before the next hand-off.', NULL, 'approved', 'medium', '49109573-1ae8-4b67-96a2-45bdf0c763c1', NULL, '2026-09-17T18:30:00.000Z', NULL, '2026-09-07T09:53:38.595Z', NULL, NULL, '', NULL, NULL, NULL, NULL, NULL, 0, NULL, '2026-09-07T09:53:38.595Z', NULL, NULL, NULL),
('162e5be8-b260-4521-8023-969e559d75b8', '307d7157-b69d-4eb4-81e4-0f89b4b67662', 'static_post_d_11', 'static_post', 'WRITER', '8bb2bab3-f815-478a-90a3-a74dc6b2d841', 1, 'Static Post 11', 'Unified deliverable "Static Post 11". This task flows sequentially through the assigned team — each member starts, submits, and is approved before the next hand-off.', NULL, 'approved', 'medium', '49109573-1ae8-4b67-96a2-45bdf0c763c1', NULL, '2026-09-18T18:30:00.000Z', NULL, '2026-09-07T09:53:39.471Z', NULL, NULL, '', NULL, NULL, NULL, NULL, NULL, 0, NULL, '2026-09-07T09:53:39.471Z', NULL, NULL, NULL),
('957c9cd7-989a-4f6e-8e6e-7069dd1c9fab', '307d7157-b69d-4eb4-81e4-0f89b4b67662', 'static_post_d_12', 'static_post', 'WRITER', '8bb2bab3-f815-478a-90a3-a74dc6b2d841', 1, 'Static Post 12', 'Unified deliverable "Static Post 12". This task flows sequentially through the assigned team — each member starts, submits, and is approved before the next hand-off.', NULL, 'approved', 'medium', '49109573-1ae8-4b67-96a2-45bdf0c763c1', NULL, '2026-09-20T18:30:00.000Z', NULL, '2026-09-07T09:53:40.353Z', NULL, NULL, '', NULL, NULL, NULL, NULL, NULL, 0, NULL, '2026-09-07T09:53:40.353Z', NULL, NULL, NULL),
('86dfaa87-1059-472e-b165-da2f53937ba9', '307d7157-b69d-4eb4-81e4-0f89b4b67662', 'static_post_d_3', 'static_post', 'WRITER', '8bb2bab3-f815-478a-90a3-a74dc6b2d841', 1, 'Static Post 03', 'Unified deliverable "Static Post 03". This task flows sequentially through the assigned team — each member starts, submits, and is approved before the next hand-off.', '', 'approved', 'medium', '49109573-1ae8-4b67-96a2-45bdf0c763c1', NULL, '2026-09-09T18:30:00.000Z', NULL, '2026-09-07T09:53:31.953Z', NULL, NULL, '', NULL, NULL, NULL, NULL, '', 0, NULL, '2026-09-07T09:53:31.953Z', '2945609a-08cc-4bb5-a6f5-7e9dbf8b3f6d', '2026-09-07T10:01:59.491Z', NULL),
('ad6f14ee-8348-4ee0-949a-a488c64ac7c1', '2ad17228-869f-4c06-9c4b-caf8fe20cefd', 'banner_d_1', 'banner', 'DESIGNER', 'd239a039-9f59-4f6c-b47b-cac6f3ffa50e', 1, 'Banner 01', 'Unified deliverable "Banner 01". This task flows sequentially through the assigned team — each member starts, submits, and is approved before the next hand-off.', '', 'completed', 'urgent', 'f5fd7e86-7927-42e5-9b4c-e01122055bcd', NULL, '2026-09-05T18:30:00.000Z', '2026-09-08T06:05:33.484Z', '2026-09-07T09:35:06.704Z', NULL, NULL, '', NULL, NULL, NULL, NULL, '', 0, NULL, '2026-09-07T09:35:06.704Z', '2945609a-08cc-4bb5-a6f5-7e9dbf8b3f6d', '2026-09-08T06:05:30.373Z', NULL),
('f6d7324a-44cc-4196-8344-b33ba4f49b4c', '307d7157-b69d-4eb4-81e4-0f89b4b67662', 'static_post_d_5', 'static_post', 'WRITER', '8bb2bab3-f815-478a-90a3-a74dc6b2d841', 1, 'Static Post 05', 'Unified deliverable "Static Post 05". This task flows sequentially through the assigned team — each member starts, submits, and is approved before the next hand-off.', '', 'approved', 'medium', '49109573-1ae8-4b67-96a2-45bdf0c763c1', NULL, '2026-09-11T18:30:00.000Z', NULL, '2026-09-07T09:53:33.715Z', NULL, NULL, '', NULL, NULL, NULL, NULL, '', 0, NULL, '2026-09-07T09:53:33.715Z', '2945609a-08cc-4bb5-a6f5-7e9dbf8b3f6d', '2026-09-07T12:05:59.471Z', NULL),
('b6920edd-ef0c-41b6-b3cc-cdeb0f532352', 'c93533d0-fd2d-4427-be6f-8cdd08993a17', 'static_post_d_2', 'static_post', 'DESIGNER', 'e07176f7-b8e4-4747-9ba4-5940dd4912d5', 1, 'Sharad Navratri Begins', 'Unified deliverable "Sharad Navratri Begins". This task flows sequentially through the assigned team — each member starts, submits, and is approved before the next hand-off.', NULL, 'approved', 'medium', '68c002cc-20db-4966-ab6e-e2cf66b42b41', NULL, '2026-09-10T18:30:00.000Z', NULL, '2026-09-08T12:07:28.196Z', NULL, NULL, '', NULL, NULL, NULL, NULL, NULL, 0, NULL, '2026-09-08T12:07:28.196Z', NULL, NULL, NULL),
('0d912007-d5eb-49c6-972a-abc091182f10', 'c93533d0-fd2d-4427-be6f-8cdd08993a17', 'static_post_d_3', 'static_post', 'DESIGNER', 'e07176f7-b8e4-4747-9ba4-5940dd4912d5', 1, 'Durga Ashtami', 'Unified deliverable "Durga Ashtami". This task flows sequentially through the assigned team — each member starts, submits, and is approved before the next hand-off.', NULL, 'approved', 'medium', '68c002cc-20db-4966-ab6e-e2cf66b42b41', NULL, '2026-09-13T18:30:00.000Z', NULL, '2026-09-08T12:07:29.111Z', NULL, NULL, '', NULL, NULL, NULL, NULL, NULL, 0, NULL, '2026-09-08T12:07:29.111Z', NULL, NULL, NULL),
('05e4fd1f-4ce6-4e3b-93a5-e6fa71bbbe3a', '6c2be8e9-4b64-490d-a946-eb7586c36273', 'custom_d_1', 'custom', 'PROJECT_MANAGER', 'cbd5c422-4d0c-4c28-a633-320014bc6f1d', 1, 'DLT REGISTRATION 01', 'Unified deliverable "DLT REGISTRATION 01". This task flows sequentially through the assigned team — each member starts, submits, and is approved before the next hand-off.', '', 'approved', 'medium', 'd0625c86-49b2-46eb-93c6-99a723c00416', NULL, '2026-09-09T18:30:00.000Z', NULL, '2026-09-08T08:57:02.346Z', NULL, NULL, '', NULL, NULL, NULL, NULL, '', 0, NULL, '2026-09-08T08:57:02.346Z', 'd0625c86-49b2-46eb-93c6-99a723c00416', '2026-09-08T10:59:47.602Z', NULL),
('c03d83a6-8d89-4542-a4e6-e68ada54b183', 'c93533d0-fd2d-4427-be6f-8cdd08993a17', 'static_post_d_4', 'static_post', 'DESIGNER', 'e07176f7-b8e4-4747-9ba4-5940dd4912d5', 1, 'National Unity Day', 'Unified deliverable "National Unity Day". This task flows sequentially through the assigned team — each member starts, submits, and is approved before the next hand-off.', NULL, 'approved', 'medium', '68c002cc-20db-4966-ab6e-e2cf66b42b41', NULL, '2026-09-15T18:30:00.000Z', NULL, '2026-09-08T12:07:30.024Z', NULL, NULL, '', NULL, NULL, NULL, NULL, NULL, 0, NULL, '2026-09-08T12:07:30.024Z', NULL, NULL, NULL),
('e91a635d-aab3-4902-94d1-ea137fad9bed', 'c93533d0-fd2d-4427-be6f-8cdd08993a17', 'static_post_d_5', 'static_post', 'DESIGNER', 'e07176f7-b8e4-4747-9ba4-5940dd4912d5', 1, 'Dhanteras', 'Unified deliverable "Dhanteras". This task flows sequentially through the assigned team — each member starts, submits, and is approved before the next hand-off.', NULL, 'approved', 'medium', '68c002cc-20db-4966-ab6e-e2cf66b42b41', NULL, '2026-09-17T18:30:00.000Z', NULL, '2026-09-08T12:07:30.937Z', NULL, NULL, '', NULL, NULL, NULL, NULL, NULL, 0, NULL, '2026-09-08T12:07:30.937Z', NULL, NULL, NULL),
('925b41f2-3fd7-4491-a128-6e36d410af0d', 'c93533d0-fd2d-4427-be6f-8cdd08993a17', 'static_post_d_6', 'static_post', 'DESIGNER', 'e07176f7-b8e4-4747-9ba4-5940dd4912d5', 1, 'Bhai Dooj', 'Unified deliverable "Bhai Dooj". This task flows sequentially through the assigned team — each member starts, submits, and is approved before the next hand-off.', NULL, 'approved', 'medium', '68c002cc-20db-4966-ab6e-e2cf66b42b41', NULL, '2026-09-20T18:30:00.000Z', NULL, '2026-09-08T12:07:31.853Z', NULL, NULL, '', NULL, NULL, NULL, NULL, NULL, 0, NULL, '2026-09-08T12:07:31.853Z', NULL, NULL, NULL),
('7d2c251d-2296-4747-85db-204a73c0da2c', 'c93533d0-fd2d-4427-be6f-8cdd08993a17', 'static_post_d_7', 'static_post', 'DESIGNER', 'e07176f7-b8e4-4747-9ba4-5940dd4912d5', 1, 'Labh Panchami', 'Unified deliverable "Labh Panchami". This task flows sequentially through the assigned team — each member starts, submits, and is approved before the next hand-off.', NULL, 'approved', 'medium', '68c002cc-20db-4966-ab6e-e2cf66b42b41', NULL, '2026-09-22T18:30:00.000Z', NULL, '2026-09-08T12:07:32.768Z', NULL, NULL, '', NULL, NULL, NULL, NULL, NULL, 0, NULL, '2026-09-08T12:07:32.768Z', NULL, NULL, NULL),
('7da10b3a-6f69-47b8-8923-cfbff482adaf', 'c93533d0-fd2d-4427-be6f-8cdd08993a17', 'static_post_d_8', 'static_post', 'DESIGNER', 'e07176f7-b8e4-4747-9ba4-5940dd4912d5', 1, 'Chhath Puja', 'Unified deliverable "Chhath Puja". This task flows sequentially through the assigned team — each member starts, submits, and is approved before the next hand-off.', NULL, 'approved', 'medium', '68c002cc-20db-4966-ab6e-e2cf66b42b41', NULL, '2026-09-24T18:30:00.000Z', NULL, '2026-09-08T12:07:33.682Z', NULL, NULL, '', NULL, NULL, NULL, NULL, NULL, 0, NULL, '2026-09-08T12:07:33.682Z', NULL, NULL, NULL),
('cde85cbd-5ec5-4e34-919b-8293a43a1757', 'ef95b809-26d1-4072-b505-78bdd593420f', 'static_post_d_1', 'static_post', 'DESIGNER', '7af8f177-6244-48bd-9c78-306ca2ec19b6', 1, 'Sharad Navratri Begins', 'Unified deliverable "Static Post 01". This task flows sequentially through the assigned team — each member starts, submits, and is approved before the next hand-off.', '', 'approved', 'medium', '68c002cc-20db-4966-ab6e-e2cf66b42b41', NULL, '2026-09-27T18:30:00.000Z', NULL, '2026-09-08T10:41:10.354Z', NULL, NULL, '', NULL, NULL, NULL, NULL, '', 0, NULL, '2026-09-08T10:41:10.354Z', 'd0625c86-49b2-46eb-93c6-99a723c00416', '2026-09-08T10:42:23.936Z', NULL),
('eba73b91-85b2-4521-95bc-37b0dfe2a563', 'ef95b809-26d1-4072-b505-78bdd593420f', 'static_post_d_2', 'static_post', 'DESIGNER', '7af8f177-6244-48bd-9c78-306ca2ec19b6', 1, 'Durga Ashtami', 'Unified deliverable "Static Post 02". This task flows sequentially through the assigned team — each member starts, submits, and is approved before the next hand-off.', '', 'approved', 'medium', '68c002cc-20db-4966-ab6e-e2cf66b42b41', NULL, '2026-09-27T18:30:00.000Z', NULL, '2026-09-08T10:41:11.258Z', NULL, NULL, '', NULL, NULL, NULL, NULL, '', 0, NULL, '2026-09-08T10:41:11.258Z', 'd0625c86-49b2-46eb-93c6-99a723c00416', '2026-09-08T10:42:30.931Z', NULL),
('4cfc3e50-d86a-4e19-9a5d-3f768280f014', 'ef95b809-26d1-4072-b505-78bdd593420f', 'static_post_d_3', 'static_post', 'DESIGNER', '7af8f177-6244-48bd-9c78-306ca2ec19b6', 1, 'National Unity Day', 'Unified deliverable "Static Post 03". This task flows sequentially through the assigned team — each member starts, submits, and is approved before the next hand-off.', '', 'approved', 'medium', '68c002cc-20db-4966-ab6e-e2cf66b42b41', NULL, '2026-09-27T18:30:00.000Z', NULL, '2026-09-08T10:41:12.163Z', NULL, NULL, '', NULL, NULL, NULL, NULL, '', 0, NULL, '2026-09-08T10:41:12.163Z', 'd0625c86-49b2-46eb-93c6-99a723c00416', '2026-09-08T10:42:09.752Z', NULL),
('fedd1ca9-b9e6-484e-b642-3f0255358070', 'ef95b809-26d1-4072-b505-78bdd593420f', 'static_post_d_4', 'static_post', 'DESIGNER', '7af8f177-6244-48bd-9c78-306ca2ec19b6', 1, 'Dhanteras', 'Unified deliverable "Static Post 04". This task flows sequentially through the assigned team — each member starts, submits, and is approved before the next hand-off.', '', 'approved', 'medium', '68c002cc-20db-4966-ab6e-e2cf66b42b41', NULL, '2026-09-27T18:30:00.000Z', NULL, '2026-09-08T10:41:13.068Z', NULL, NULL, '', NULL, NULL, NULL, NULL, '', 0, NULL, '2026-09-08T10:41:13.068Z', 'd0625c86-49b2-46eb-93c6-99a723c00416', '2026-09-08T10:42:54.160Z', NULL),
('cfc754db-6dd5-4972-8295-a95c81ba40e6', 'ef95b809-26d1-4072-b505-78bdd593420f', 'static_post_d_5', 'static_post', 'DESIGNER', '7af8f177-6244-48bd-9c78-306ca2ec19b6', 1, 'Bhai Dooj', 'Unified deliverable "Static Post 05". This task flows sequentially through the assigned team — each member starts, submits, and is approved before the next hand-off.', '', 'approved', 'medium', '68c002cc-20db-4966-ab6e-e2cf66b42b41', NULL, '2026-09-27T18:30:00.000Z', NULL, '2026-09-08T10:41:13.970Z', NULL, NULL, '', NULL, NULL, NULL, NULL, '', 0, NULL, '2026-09-08T10:41:13.970Z', 'd0625c86-49b2-46eb-93c6-99a723c00416', '2026-09-08T10:43:05.997Z', NULL),
('66c3e2bc-2087-460a-90b1-b950c3910c10', 'ef95b809-26d1-4072-b505-78bdd593420f', 'static_post_d_6', 'static_post', 'DESIGNER', '7af8f177-6244-48bd-9c78-306ca2ec19b6', 1, 'Labh Panchami', 'Unified deliverable "Static Post 06". This task flows sequentially through the assigned team — each member starts, submits, and is approved before the next hand-off.', '', 'approved', 'medium', '68c002cc-20db-4966-ab6e-e2cf66b42b41', NULL, '2026-09-27T18:30:00.000Z', NULL, '2026-09-08T10:41:14.929Z', NULL, NULL, '', NULL, NULL, NULL, NULL, '', 0, NULL, '2026-09-08T10:41:14.929Z', 'd0625c86-49b2-46eb-93c6-99a723c00416', '2026-09-08T10:43:32.631Z', NULL),
('4a5cb327-6f4f-4df8-9711-f152b9f508b6', 'ef95b809-26d1-4072-b505-78bdd593420f', 'static_post_d_7', 'static_post', 'DESIGNER', '7af8f177-6244-48bd-9c78-306ca2ec19b6', 1, 'Chhath puja', 'Unified deliverable "Static Post 07". This task flows sequentially through the assigned team — each member starts, submits, and is approved before the next hand-off.', '', 'approved', 'medium', '68c002cc-20db-4966-ab6e-e2cf66b42b41', NULL, '2026-09-27T18:30:00.000Z', NULL, '2026-09-08T10:41:15.834Z', NULL, NULL, '', NULL, NULL, NULL, NULL, '', 0, NULL, '2026-09-08T10:41:15.834Z', 'd0625c86-49b2-46eb-93c6-99a723c00416', '2026-09-08T10:43:52.078Z', NULL),
('8ee2c763-7fdd-4a93-8f66-d9489cce0543', 'ef95b809-26d1-4072-b505-78bdd593420f', 'static_post_d_8', 'static_post', 'DESIGNER', '7af8f177-6244-48bd-9c78-306ca2ec19b6', 1, 'Guru Nanak Jayanti', 'Unified deliverable "Static Post 08". This task flows sequentially through the assigned team — each member starts, submits, and is approved before the next hand-off.', '', 'approved', 'medium', '68c002cc-20db-4966-ab6e-e2cf66b42b41', NULL, '2026-09-27T18:30:00.000Z', NULL, '2026-09-08T10:41:16.745Z', NULL, NULL, '', NULL, NULL, NULL, NULL, '', 0, NULL, '2026-09-08T10:41:16.745Z', 'd0625c86-49b2-46eb-93c6-99a723c00416', '2026-09-08T10:44:03.115Z', NULL),
('9620a9e8-0bd6-4317-84e0-a06e1e9270b4', 'd6c17551-11bc-4c4f-92e0-cb817be52d88', 'static_post_d_7', 'static_post', NULL, 'c782d491-df44-4f2c-9a71-7e75692a8a0a', 1, 'Bhai Dooj', 'Unified deliverable "Bhai Dooj". This task flows sequentially through the assigned team — each member starts, submits, and is approved before the next hand-off.', NULL, 'approved', 'medium', NULL, NULL, '2026-09-24T18:30:00.000Z', NULL, '2026-09-09T05:59:42.920Z', NULL, NULL, '', NULL, NULL, NULL, NULL, NULL, 0, NULL, '2026-09-09T05:59:42.920Z', NULL, NULL, NULL),
('640d1cc3-49d4-4ea5-8dee-a376895b6654', 'd6c17551-11bc-4c4f-92e0-cb817be52d88', 'static_post_d_8', 'static_post', NULL, 'c782d491-df44-4f2c-9a71-7e75692a8a0a', 1, 'Labh Panchami', 'Unified deliverable "Labh Panchami". This task flows sequentially through the assigned team — each member starts, submits, and is approved before the next hand-off.', NULL, 'approved', 'medium', NULL, NULL, '2026-09-27T18:30:00.000Z', NULL, '2026-09-09T05:59:43.812Z', NULL, NULL, '', NULL, NULL, NULL, NULL, NULL, 0, NULL, '2026-09-09T05:59:43.812Z', NULL, NULL, NULL),
('fb4e2638-fa88-4101-945f-8dcb8f02e6ff', '0d5ab193-c75c-4eac-bf48-7d7f97324738', 'static_post_d_1', 'static_post', 'DESIGNER', 'f3bcd8f9-4870-4030-a259-2b847513b4bd', 1, 'Guru Nanak Jayanti', 'Unified deliverable "Static Post 01". This task flows sequentially through the assigned team — each member starts, submits, and is approved before the next hand-off.', '', 'approved', 'medium', '68c002cc-20db-4966-ab6e-e2cf66b42b41', NULL, '2026-09-16T18:30:00.000Z', NULL, '2026-09-08T10:35:13.376Z', NULL, NULL, '', NULL, NULL, NULL, NULL, '', 0, NULL, '2026-09-08T10:35:13.376Z', '2945609a-08cc-4bb5-a6f5-7e9dbf8b3f6d', '2026-09-08T10:54:39.839Z', NULL),
('6d821b9d-2672-4335-b909-1f9a4d1f7460', 'd6c17551-11bc-4c4f-92e0-cb817be52d88', 'static_post_d_1', 'static_post', NULL, 'c782d491-df44-4f2c-9a71-7e75692a8a0a', 1, 'ganesh chaturthi', 'Unified deliverable "ganesh chaturthi". This task flows sequentially through the assigned team — each member starts, submits, and is approved before the next hand-off.', NULL, 'approved', 'medium', NULL, NULL, '2026-09-10T18:30:00.000Z', NULL, '2026-09-09T05:59:37.557Z', NULL, NULL, '', NULL, NULL, NULL, NULL, NULL, 0, NULL, '2026-09-09T05:59:37.557Z', NULL, NULL, NULL),
('983fdaa6-a408-4b05-b039-95a26dff004b', 'd6c17551-11bc-4c4f-92e0-cb817be52d88', 'static_post_d_6', 'static_post', NULL, 'c782d491-df44-4f2c-9a71-7e75692a8a0a', 1, 'Dhanteras', 'Unified deliverable "Dhanteras". This task flows sequentially through the assigned team — each member starts, submits, and is approved before the next hand-off.', NULL, 'approved', 'medium', NULL, NULL, '2026-09-22T18:30:00.000Z', NULL, '2026-09-09T05:59:42.028Z', NULL, NULL, '', NULL, NULL, NULL, NULL, NULL, 0, NULL, '2026-09-09T05:59:42.028Z', NULL, NULL, NULL),
('3604cf68-6092-438f-93d2-8cd3fe1d5a8f', 'd6c17551-11bc-4c4f-92e0-cb817be52d88', 'static_post_d_9', 'static_post', NULL, 'c782d491-df44-4f2c-9a71-7e75692a8a0a', 1, 'Chhath puja', 'Unified deliverable "Chhath puja". This task flows sequentially through the assigned team — each member starts, submits, and is approved before the next hand-off.', NULL, 'approved', 'medium', NULL, NULL, '2026-09-29T18:30:00.000Z', NULL, '2026-09-09T05:59:44.706Z', NULL, NULL, '', NULL, NULL, NULL, NULL, NULL, 0, NULL, '2026-09-09T05:59:44.706Z', NULL, NULL, NULL),
('fcace8f4-6f1e-43a5-be54-e15a0f0143c6', 'b5046137-29b8-400f-a6fb-8dc08e4268cf', 'static_post_d_1', 'static_post', 'DESIGNER', 'c0428491-26ef-4138-b5fe-db4cfc448289', 1, 'આ ગણેશ ચતુર્થી યાદગાર બનાવો… બાપ્પાના આશીર્વાદ સાથે પોતાનું ઘર BOOK કરાવો!', 'Unified deliverable "આ ગણેશ ચતુર્થી યાદગાર બનાવો… બાપ્પાના આશીર્વાદ સાથે પોતાનું ઘર BOOK કરાવો!". This task flows sequentially through the assigned team — each member starts, submits, and is approved before the next hand-off.', '', 'approved', 'medium', 'f5fd7e86-7927-42e5-9b4c-e01122055bcd', NULL, '2026-09-09T18:30:00.000Z', NULL, '2026-09-08T12:22:04.373Z', NULL, NULL, '', NULL, NULL, NULL, NULL, '', 0, NULL, '2026-09-08T12:22:04.373Z', '7383317a-b7ac-46d8-9db8-43b8c4e4afa9', '2026-09-08T12:22:34.165Z', NULL),
('13a46c98-b486-4039-bede-ad491cf02690', '1b1ef994-601e-4b01-8428-3264ef8e2e6b', 'static_post_d_1', 'static_post', 'DESIGNER', 'e2359e43-cb04-45c4-be8e-0ffe5f094829', 1, 'બાપ્પા કહે છે… ઘર એવું લો, જ્યાં Family સાથે Happiness રહે!', 'Unified deliverable "બાપ્પા કહે છે… ઘર એવું લો, જ્યાં Family સાથે Happiness રહે!". This task flows sequentially through the assigned team — each member starts, submits, and is approved before the next hand-off.', '', 'approved', 'medium', 'f5fd7e86-7927-42e5-9b4c-e01122055bcd', NULL, '2026-09-09T18:30:00.000Z', NULL, '2026-09-08T12:24:56.573Z', NULL, NULL, '', NULL, NULL, NULL, NULL, '', 0, NULL, '2026-09-08T12:24:56.573Z', '7383317a-b7ac-46d8-9db8-43b8c4e4afa9', '2026-09-08T12:25:21.940Z', NULL),
('1824cb47-46ba-4525-9072-9a5bb0cd827d', 'd6c17551-11bc-4c4f-92e0-cb817be52d88', 'static_post_d_10', 'static_post', NULL, 'c782d491-df44-4f2c-9a71-7e75692a8a0a', 1, 'Guru Nanak Jayanti', 'Unified deliverable "Guru Nanak Jayanti". This task flows sequentially through the assigned team — each member starts, submits, and is approved before the next hand-off.', NULL, 'approved', 'medium', NULL, NULL, '2026-10-01T18:30:00.000Z', NULL, '2026-09-09T05:59:45.607Z', NULL, NULL, '', NULL, NULL, NULL, NULL, NULL, 0, NULL, '2026-09-09T05:59:45.607Z', NULL, NULL, NULL),
('ff8272f2-0b07-493c-b8dc-66c4b32bd7d5', '57be733e-7c4f-44c1-b937-98ef41b66d93', 'static_post_d_1', 'static_post', 'DESIGNER', '310ce2a3-b3b4-4bec-93f3-5f9d57154f68', 1, 'બાપ્પા આવે છે વિઘ્ન દૂર કરવા…તો પછી તમારા ‘પોતાના ઘર’નું વિઘ્ન પણ દૂર કરી દો!', 'Unified deliverable "Static Post 01". This task flows sequentially through the assigned team — each member starts, submits, and is approved before the next hand-off.', '', 'approved', 'medium', 'f5fd7e86-7927-42e5-9b4c-e01122055bcd', NULL, '2026-09-09T18:30:00.000Z', NULL, '2026-09-08T12:13:23.249Z', NULL, NULL, '', NULL, NULL, NULL, NULL, 'Horizontal Post', 0, NULL, '2026-09-08T12:13:23.249Z', '2945609a-08cc-4bb5-a6f5-7e9dbf8b3f6d', '2026-09-08T13:11:13.254Z', NULL),
('ce2f8d4b-32a9-46ef-b239-829f0636c178', 'c93533d0-fd2d-4427-be6f-8cdd08993a17', 'static_post_d_1', 'static_post', 'DESIGNER', 'e07176f7-b8e4-4747-9ba4-5940dd4912d5', 1, 'Engineer''s Day', 'Unified deliverable "Engineer''s Day". This task flows sequentially through the assigned team — each member starts, submits, and is approved before the next hand-off.', NULL, 'approved', 'medium', '68c002cc-20db-4966-ab6e-e2cf66b42b41', NULL, '2026-09-08T18:30:00.000Z', NULL, '2026-09-08T12:07:27.265Z', NULL, NULL, '', NULL, NULL, NULL, NULL, NULL, 0, NULL, '2026-09-08T12:07:27.265Z', NULL, NULL, NULL),
('63583195-ce3e-43cc-af06-42fa763005fc', 'c93533d0-fd2d-4427-be6f-8cdd08993a17', 'static_post_d_9', 'static_post', 'DESIGNER', 'e07176f7-b8e4-4747-9ba4-5940dd4912d5', 1, 'Guru Nanak Jayanti', 'Unified deliverable "Guru Nanak Jayanti". This task flows sequentially through the assigned team — each member starts, submits, and is approved before the next hand-off.', NULL, 'approved', 'medium', '68c002cc-20db-4966-ab6e-e2cf66b42b41', NULL, '2026-09-27T18:30:00.000Z', NULL, '2026-09-08T12:07:34.596Z', NULL, NULL, '', NULL, NULL, NULL, NULL, NULL, 0, NULL, '2026-09-08T12:07:34.596Z', NULL, NULL, NULL),
('41a0176b-b8e6-49c1-8295-ca69a9b4882f', 'f0dec7dc-b7ec-4535-b79a-f942b2df191e', 'static_post_d_2', 'static_post', 'DESIGNER', 'de871404-7b53-4cb1-a454-ed0785dc2482', 1, 'Durga Ashtami', 'Unified deliverable "Durga Ashtami". This task flows sequentially through the assigned team — each member starts, submits, and is approved before the next hand-off.', NULL, 'approved', 'medium', '68c002cc-20db-4966-ab6e-e2cf66b42b41', NULL, '2026-09-10T18:30:00.000Z', NULL, '2026-09-08T12:15:51.173Z', NULL, NULL, '', NULL, NULL, NULL, NULL, NULL, 0, NULL, '2026-09-08T12:15:51.173Z', NULL, NULL, NULL),
('ec895ee5-c853-4d98-b718-261178cc25f3', 'f0dec7dc-b7ec-4535-b79a-f942b2df191e', 'static_post_d_3', 'static_post', 'DESIGNER', 'de871404-7b53-4cb1-a454-ed0785dc2482', 1, 'National Unity Day', 'Unified deliverable "National Unity Day". This task flows sequentially through the assigned team — each member starts, submits, and is approved before the next hand-off.', NULL, 'approved', 'medium', '68c002cc-20db-4966-ab6e-e2cf66b42b41', NULL, '2026-09-13T18:30:00.000Z', NULL, '2026-09-08T12:15:52.042Z', NULL, NULL, '', NULL, NULL, NULL, NULL, NULL, 0, NULL, '2026-09-08T12:15:52.042Z', NULL, NULL, NULL),
('822c87c5-3834-4a16-a13d-11724c52c564', 'f0dec7dc-b7ec-4535-b79a-f942b2df191e', 'static_post_d_4', 'static_post', 'DESIGNER', 'de871404-7b53-4cb1-a454-ed0785dc2482', 1, 'Dhanteras', 'Unified deliverable "Dhanteras". This task flows sequentially through the assigned team — each member starts, submits, and is approved before the next hand-off.', NULL, 'approved', 'medium', '68c002cc-20db-4966-ab6e-e2cf66b42b41', NULL, '2026-09-15T18:30:00.000Z', NULL, '2026-09-08T12:15:52.913Z', NULL, NULL, '', NULL, NULL, NULL, NULL, NULL, 0, NULL, '2026-09-08T12:15:52.913Z', NULL, NULL, NULL),
('00609052-16b6-491f-8716-2fc276b9883f', 'f0dec7dc-b7ec-4535-b79a-f942b2df191e', 'static_post_d_5', 'static_post', 'DESIGNER', 'de871404-7b53-4cb1-a454-ed0785dc2482', 1, 'Bhai Dooj', 'Unified deliverable "Bhai Dooj". This task flows sequentially through the assigned team — each member starts, submits, and is approved before the next hand-off.', NULL, 'approved', 'medium', '68c002cc-20db-4966-ab6e-e2cf66b42b41', NULL, '2026-09-17T18:30:00.000Z', NULL, '2026-09-08T12:15:53.783Z', NULL, NULL, '', NULL, NULL, NULL, NULL, NULL, 0, NULL, '2026-09-08T12:15:53.783Z', NULL, NULL, NULL),
('dfc600ac-7e5b-4104-a1a4-a9d40e619053', 'f0dec7dc-b7ec-4535-b79a-f942b2df191e', 'static_post_d_6', 'static_post', 'DESIGNER', 'de871404-7b53-4cb1-a454-ed0785dc2482', 1, 'Labh Panchami', 'Unified deliverable "Labh Panchami". This task flows sequentially through the assigned team — each member starts, submits, and is approved before the next hand-off.', NULL, 'approved', 'medium', '68c002cc-20db-4966-ab6e-e2cf66b42b41', NULL, '2026-09-20T18:30:00.000Z', NULL, '2026-09-08T12:15:54.654Z', NULL, NULL, '', NULL, NULL, NULL, NULL, NULL, 0, NULL, '2026-09-08T12:15:54.654Z', NULL, NULL, NULL),
('a8082252-444d-450c-b404-f0533d2544b9', 'f0dec7dc-b7ec-4535-b79a-f942b2df191e', 'static_post_d_7', 'static_post', 'DESIGNER', 'de871404-7b53-4cb1-a454-ed0785dc2482', 1, 'Chhath puja', 'Unified deliverable "Chhath puja". This task flows sequentially through the assigned team — each member starts, submits, and is approved before the next hand-off.', NULL, 'approved', 'medium', '68c002cc-20db-4966-ab6e-e2cf66b42b41', NULL, '2026-09-22T18:30:00.000Z', NULL, '2026-09-08T12:15:55.523Z', NULL, NULL, '', NULL, NULL, NULL, NULL, NULL, 0, NULL, '2026-09-08T12:15:55.523Z', NULL, NULL, NULL),
('8f8448c2-df63-4657-b145-9cdb0c77fcc7', 'f0dec7dc-b7ec-4535-b79a-f942b2df191e', 'static_post_d_8', 'static_post', 'DESIGNER', 'de871404-7b53-4cb1-a454-ed0785dc2482', 1, 'Guru Nanak Jayanti', 'Unified deliverable "Guru Nanak Jayanti". This task flows sequentially through the assigned team — each member starts, submits, and is approved before the next hand-off.', NULL, 'approved', 'medium', '68c002cc-20db-4966-ab6e-e2cf66b42b41', NULL, '2026-09-24T18:30:00.000Z', NULL, '2026-09-08T12:15:56.469Z', NULL, NULL, '', NULL, NULL, NULL, NULL, NULL, 0, NULL, '2026-09-08T12:15:56.469Z', NULL, NULL, NULL),
('9d04a493-78af-4fdb-a407-3cd247bd880b', 'f0dec7dc-b7ec-4535-b79a-f942b2df191e', 'static_post_d_1', 'static_post', 'DESIGNER', 'de871404-7b53-4cb1-a454-ed0785dc2482', 1, 'Sharad Navratri Begins', 'Unified deliverable "Sharad Navratri Begins". This task flows sequentially through the assigned team — each member starts, submits, and is approved before the next hand-off.', '', 'approved', 'medium', '68c002cc-20db-4966-ab6e-e2cf66b42b41', NULL, '2026-09-27T18:30:00.000Z', NULL, '2026-09-08T12:15:50.304Z', NULL, NULL, '', NULL, NULL, NULL, NULL, '', 0, NULL, '2026-09-08T12:15:50.304Z', 'd0625c86-49b2-46eb-93c6-99a723c00416', '2026-09-09T04:13:49.152Z', NULL),
('bdcab481-b5a5-4266-bd40-590a2bc608a7', '10e5e20c-8883-4fc2-a05a-b76a2841dd55', 'static_post_d_1', 'static_post', NULL, 'eaaf66cc-e4a9-44f1-8abe-a2bd47947913', 1, 'બાપ્પાના આગમન સાથે કરો નવી શરૂઆત… Mateshwari Luxurious સાથે તમારા પોતાના ઘરની શરૂઆત', 'Unified deliverable "બાપ્પાના આગમન સાથે કરો નવી શરૂઆત… Mateshwari Luxurious સાથે તમારા પોતાના ઘરની શરૂઆત". This task flows sequentially through the assigned team — each member starts, submits, and is approved before the next hand-off.', NULL, 'approved', 'medium', NULL, NULL, '2026-09-09T18:30:00.000Z', NULL, '2026-09-08T12:28:39.111Z', NULL, NULL, '', NULL, NULL, NULL, NULL, NULL, 0, NULL, '2026-09-08T12:28:39.111Z', NULL, NULL, NULL),
('ab751a91-3dcf-4f34-9c76-b3ce380aac9c', 'c8c3a80f-a5ac-4fad-a179-e221ff053f3e', 'static_post_d_1', 'static_post', 'DESIGNER', '2ef11405-b098-4f46-9125-e26ad589c6b8', 1, 'આ વખતે બાપ્પા પાસે એક જ પ્રાર્થના… આવતા ગણેશોત્સવ સુધી આપણું પોતાનું ઘર હોવું જોઈએ!', 'Unified deliverable "આ વખતે બાપ્પા પાસે એક જ પ્રાર્થના… આવતા ગણેશોત્સવ સુધી આપણું પોતાનું ઘર હોવું જોઈએ!". This task flows sequentially through the assigned team — each member starts, submits, and is approved before the next hand-off.', 'આ વખતે બાપ્પા પાસે એક જ પ્રાર્થના… આવતા ગણેશોત્સવ સુધી આપણું પોતાનું ઘર હોવું જોઈએ!', 'approved', 'medium', 'f5fd7e86-7927-42e5-9b4c-e01122055bcd', NULL, '2026-09-09T18:30:00.000Z', NULL, '2026-09-08T12:26:48.201Z', NULL, NULL, '', NULL, NULL, NULL, NULL, 'Horizontal Post', 0, NULL, '2026-09-08T12:26:48.201Z', '7383317a-b7ac-46d8-9db8-43b8c4e4afa9', '2026-09-09T05:36:59.494Z', NULL),
('cd90d34e-3bd3-4bd0-b736-a2b86322551e', '307d7157-b69d-4eb4-81e4-0f89b4b67662', 'static_post_d_2', 'static_post', 'SMM', '8bb2bab3-f815-478a-90a3-a74dc6b2d841', 1, 'POST 2 — IVF સફળતા કયા Factors પર આધારિત છે?', 'Unified deliverable "Static Post 02". This task flows sequentially through the assigned team — each member starts, submits, and is approved before the next hand-off.', 'POST 2 — IVF સફળતા કયા Factors પર આધારિત છે?

- મહિલાની ઉંમર
- Egg Quality
- Sperm Quality
- Embryo Quality
- Uterus ની સ્થિતિ
- અગાઉની IVF History
- યોગ્ય સારવાર અને તબીબી માર્ગદર્શન', 'approved', 'medium', 'a0f6eb30-79cd-4e6b-a1d7-1ca2f764a690', NULL, '2026-09-29T18:30:00.000Z', NULL, '2026-09-07T09:53:31.072Z', NULL, NULL, '', NULL, NULL, NULL, NULL, '', 2, NULL, '2026-09-07T09:53:31.072Z', '2945609a-08cc-4bb5-a6f5-7e9dbf8b3f6d', '2026-09-08T12:54:20.041Z', NULL),
('e2235eed-f61b-4f1e-9ede-6ffd6e1cf9a0', '307d7157-b69d-4eb4-81e4-0f89b4b67662', 'static_post_d_1', 'static_post', 'SMM', '8bb2bab3-f815-478a-90a3-a74dc6b2d841', 1, 'POST 1 — IVF પછી શું ધ્યાનમાં રાખવું જોઈએ?', 'Unified deliverable "Static Post 01". This task flows sequentially through the assigned team — each member starts, submits, and is approved before the next hand-off.', 'POST 1 — IVF પછી શું ધ્યાનમાં રાખવું જોઈએ?

- એમ્બ્રિયો ટ્રાન્સફર પછી સામાન્ય હળવી પ્રવૃત્તિ કરી શકાય.
- ભારે વજન ઉઠાવવાનું ટાળો.
- દવાઓ સમયસર લો.
- પૂરતો આરામ અને ઊંઘ લો.
- ડૉક્ટરની સલાહ વગર દવા બંધ ન કરો.
- પ્રેગ્નન્સી ટેસ્ટ માટે જણાવેલી તારીખનું પાલન કરો.', 'approved', 'urgent', 'a0f6eb30-79cd-4e6b-a1d7-1ca2f764a690', NULL, '2026-09-07T18:30:00.000Z', NULL, '2026-09-07T09:53:30.186Z', NULL, NULL, '', NULL, NULL, NULL, NULL, '', 2, NULL, '2026-09-07T09:53:30.186Z', '2945609a-08cc-4bb5-a6f5-7e9dbf8b3f6d', '2026-09-08T12:54:44.010Z', NULL),
('8c4a5195-19bb-4776-bebb-a35ba6dd2a19', '9be782c3-d555-4d7f-a87e-0998359f9e7a', 'static_post_d_1', 'static_post', 'DESIGNER', '0db9684a-147f-40ef-b38d-97a7e0ecd5ac', 1, 'આ ગણેશ ચતુર્થીએ એક સંકલ્પ કરીએ,', 'Unified deliverable "આ ગણેશ ચતુર્થીએ એક સંકલ્પ કરીએ,". This task flows sequentially through the assigned team — each member starts, submits, and is approved before the next hand-off.', NULL, 'approved', 'medium', 'f5fd7e86-7927-42e5-9b4c-e01122055bcd', NULL, '2026-09-09T18:30:00.000Z', NULL, '2026-09-09T04:55:44.381Z', NULL, NULL, '', NULL, NULL, NULL, NULL, NULL, 0, NULL, '2026-09-09T04:55:44.381Z', NULL, NULL, NULL),
('a3e8805d-774a-4b46-a604-739ffb8ec6ec', '9be782c3-d555-4d7f-a87e-0998359f9e7a', 'static_post_d_2', 'static_post', 'DESIGNER', '0db9684a-147f-40ef-b38d-97a7e0ecd5ac', 1, 'પોતાના ઘરનું સપનું સાકાર કરીએ,', 'Unified deliverable "પોતાના ઘરનું સપનું સાકાર કરીએ,". This task flows sequentially through the assigned team — each member starts, submits, and is approved before the next hand-off.', NULL, 'approved', 'medium', 'f5fd7e86-7927-42e5-9b4c-e01122055bcd', NULL, '2026-09-10T18:30:00.000Z', NULL, '2026-09-09T04:55:45.276Z', NULL, NULL, '', NULL, NULL, NULL, NULL, NULL, 0, NULL, '2026-09-09T04:55:45.276Z', NULL, NULL, NULL),
('65023823-712e-4f1b-9f34-6a245526a457', '9be782c3-d555-4d7f-a87e-0998359f9e7a', 'static_post_d_3', 'static_post', 'DESIGNER', '0db9684a-147f-40ef-b38d-97a7e0ecd5ac', 1, 'બાપ્પાના આશીર્વાદ સાથે Shivalik Satvamમાં નવું ઘર  બુક કરીએ!', 'Unified deliverable "બાપ્પાના આશીર્વાદ સાથે Shivalik Satvamમાં નવું ઘર  બુક કરીએ!". This task flows sequentially through the assigned team — each member starts, submits, and is approved before the next hand-off.', NULL, 'approved', 'medium', 'f5fd7e86-7927-42e5-9b4c-e01122055bcd', NULL, '2026-09-11T18:30:00.000Z', NULL, '2026-09-09T04:55:46.169Z', NULL, NULL, '', NULL, NULL, NULL, NULL, NULL, 0, NULL, '2026-09-09T04:55:46.169Z', NULL, NULL, NULL);

-- Table: "public"."users"
DROP TABLE IF EXISTS "public"."users" CASCADE;
CREATE TABLE "public"."users" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "full_name" text NOT NULL,
  "email" text NOT NULL,
  "password_hash" text NOT NULL,
  "role_id" uuid NOT NULL,
  "is_active" bool NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "password_enc" text,
  "phone" text,
  "permissions" _text,
  "designation" text
);
ALTER TABLE ONLY "public"."users" ADD CONSTRAINT "users_created_at_not_null" NOT NULL created_at;
ALTER TABLE ONLY "public"."users" ADD CONSTRAINT "users_email_key" UNIQUE (email);
ALTER TABLE ONLY "public"."users" ADD CONSTRAINT "users_email_not_null" NOT NULL email;
ALTER TABLE ONLY "public"."users" ADD CONSTRAINT "users_full_name_not_null" NOT NULL full_name;
ALTER TABLE ONLY "public"."users" ADD CONSTRAINT "users_id_not_null" NOT NULL id;
ALTER TABLE ONLY "public"."users" ADD CONSTRAINT "users_is_active_not_null" NOT NULL is_active;
ALTER TABLE ONLY "public"."users" ADD CONSTRAINT "users_password_hash_not_null" NOT NULL password_hash;
ALTER TABLE ONLY "public"."users" ADD CONSTRAINT "users_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY "public"."users" ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT;
ALTER TABLE ONLY "public"."users" ADD CONSTRAINT "users_role_id_not_null" NOT NULL role_id;
CREATE INDEX idx_users_phone ON public.users USING btree (phone);
CREATE INDEX idx_users_role ON public.users USING btree (role_id);

-- Data: 10 rows
INSERT INTO "public"."users" ("id", "full_name", "email", "password_hash", "role_id", "is_active", "created_at", "password_enc", "phone", "permissions", "designation") VALUES
('f5fd7e86-7927-42e5-9b4c-e01122055bcd', 'Rushi Panchal', 'rushi@advrix.com', '$2a$10$N2KXAy/O6ylMbsYR1esoXO.Bkc/5CGZrfUVO15ag/wAfMa00a8JTy', '0d5ffc04-2d35-47e8-837e-c3f5d96de4b9', true, '2026-09-02T04:09:39.440Z', NULL, NULL, NULL, NULL),
('2945609a-08cc-4bb5-a6f5-7e9dbf8b3f6d', 'Advrix Admin', 'admin@advrix.com', '$2a$10$AGIGySqmZ7vPeK1L6h8qIu19btbJ2ZY2P5ixdlCxiFFS2rq8Hfrom', '1b08250d-3faa-4753-9d73-306d7294fe38', true, '2026-08-05T09:20:40.809Z', 'jTgXAssjiD5fqi5v:If4zOc0ySJkxFQntdL1NYw==:mlTCwWUoXD7EZg==', NULL, NULL, NULL),
('49109573-1ae8-4b67-96a2-45bdf0c763c1', 'Priyanka Shah', 'contentwriter@advrix.com', '$2a$10$CC.5tzARJtAkicet7nVibO6X9xJrjXTstAHqmOrORahKZXBixPVJq', 'e38eaa07-dbad-4e9d-8ad9-c8c66e42cb77', true, '2026-09-03T04:48:57.134Z', NULL, NULL, NULL, NULL),
('a9ac9325-edae-4526-93d4-3da2ecaaeabb', 'Sabir Alam', 'sabir@advrix.com', '$2a$10$.f1lyoJhk3suQTXlerzw9.aYyPSHFe/uwwFktmUF4kXdOt99pdnlu', '4c0197e5-581b-4251-a31e-b3d6db0ae910', true, '2026-09-02T04:10:04.894Z', NULL, '7003162795', NULL, NULL),
('7383317a-b7ac-46d8-9db8-43b8c4e4afa9', 'Priya Patel', 'project@advrix.com', '$2a$10$4h99YBS6KfNmu4jg97DTVedxBY5A5qcijTmid8xjpZ0KkTfgaBaAK', 'e9a17f93-431a-43c8-a946-d221fb6fb5c4', true, '2026-09-07T13:55:01.125Z', NULL, NULL, NULL, NULL),
('a0f6eb30-79cd-4e6b-a1d7-1ca2f764a690', 'Vishvas Patel', 'vishvas@advrix.com', '$2a$10$uV0EgMjH5KVNpQxJo3D4Muy2OsbalJ/flpYCC3PsAZCsA0uSs4eES', '9c686ef3-7321-4ae1-bd6c-ca12cacf8ef5', true, '2026-09-02T04:02:58.410Z', NULL, '8320005228', NULL, NULL),
('d0625c86-49b2-46eb-93c6-99a723c00416', 'Vishvash Patel', 'pm@advrix.com', '$2a$10$rz0HBZ6YbjCx/tXE.jz2Su.idSplitjPWQ0F5fjSSgvuWelus03oi', 'e9a17f93-431a-43c8-a946-d221fb6fb5c4', true, '2026-09-02T04:08:07.335Z', NULL, '8320005228', NULL, NULL),
('73116e41-29af-4c4f-ad4b-bb34aced2b47', 'Kaushal Rawat', 'kaushal@advrix.com', '$2a$10$whPF9c6tysWVCn79ThA35.P0C2sOJWyX6pjg0aya/znaCvanADCDq', 'a7f17a68-8d3f-4e3d-8ac6-5529a5f4d806', true, '2026-09-02T04:04:59.524Z', NULL, '7990525387', NULL, NULL),
('68c002cc-20db-4966-ab6e-e2cf66b42b41', 'Sudhir Thakor', 'sudhir@advrix.com', '$2a$10$mc4Bg121POlSr7MYytm7subC8eVC8R1ZPa3B83/sztfYEO15BdxtS', '0d5ffc04-2d35-47e8-837e-c3f5d96de4b9', true, '2026-09-02T04:02:30.163Z', NULL, '92743 91035', NULL, NULL),
('506bf2f6-b455-4ac8-b423-4e2ae0e07e66', 'Priyanka Shah', 'priyanka@advrix.com', '$2a$10$NsLT/W.d3AVraY25a93.W.ETLglKKydvkCuXz1VmZYOHYY9erSbBO', '8cd8f5c6-3916-469e-abbb-9481b5669ebc', true, '2026-09-02T04:07:19.774Z', NULL, NULL, NULL, NULL);

-- Table: "public"."workflow_steps"
DROP TABLE IF EXISTS "public"."workflow_steps" CASCADE;
CREATE TABLE "public"."workflow_steps" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "step_key" text NOT NULL,
  "group_key" text NOT NULL,
  "name" text NOT NULL,
  "target_role" text NOT NULL,
  "title_template" text NOT NULL,
  "description_template" text NOT NULL DEFAULT ''::text,
  "await" text NOT NULL DEFAULT ''::text,
  "sequence" int4 NOT NULL DEFAULT 0,
  "active" bool NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE ONLY "public"."workflow_steps" ADD CONSTRAINT "workflow_steps_active_not_null" NOT NULL active;
ALTER TABLE ONLY "public"."workflow_steps" ADD CONSTRAINT "workflow_steps_await_not_null" NOT NULL await;
ALTER TABLE ONLY "public"."workflow_steps" ADD CONSTRAINT "workflow_steps_created_at_not_null" NOT NULL created_at;
ALTER TABLE ONLY "public"."workflow_steps" ADD CONSTRAINT "workflow_steps_description_template_not_null" NOT NULL description_template;
ALTER TABLE ONLY "public"."workflow_steps" ADD CONSTRAINT "workflow_steps_group_key_not_null" NOT NULL group_key;
ALTER TABLE ONLY "public"."workflow_steps" ADD CONSTRAINT "workflow_steps_id_not_null" NOT NULL id;
ALTER TABLE ONLY "public"."workflow_steps" ADD CONSTRAINT "workflow_steps_name_not_null" NOT NULL name;
ALTER TABLE ONLY "public"."workflow_steps" ADD CONSTRAINT "workflow_steps_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY "public"."workflow_steps" ADD CONSTRAINT "workflow_steps_sequence_not_null" NOT NULL sequence;
ALTER TABLE ONLY "public"."workflow_steps" ADD CONSTRAINT "workflow_steps_step_key_not_null" NOT NULL step_key;
ALTER TABLE ONLY "public"."workflow_steps" ADD CONSTRAINT "workflow_steps_target_role_fkey" FOREIGN KEY (target_role) REFERENCES roles(key) ON DELETE RESTRICT;
ALTER TABLE ONLY "public"."workflow_steps" ADD CONSTRAINT "workflow_steps_target_role_not_null" NOT NULL target_role;
ALTER TABLE ONLY "public"."workflow_steps" ADD CONSTRAINT "workflow_steps_title_template_not_null" NOT NULL title_template;

-- Data: 4 rows
INSERT INTO "public"."workflow_steps" ("id", "step_key", "group_key", "name", "target_role", "title_template", "description_template", "await", "sequence", "active", "created_at") VALUES
('997470b4-faa1-4493-b8a5-745e1013f0c3', 'ideation', 'ideation', 'Script & Captions', 'WRITER', 'Write Script & Captions', 'Develop the core script, captions and brand manifesto based on the project brief.', '', 10, true, '2026-08-05T09:20:40.404Z'),
('773b7ebe-e73a-4e25-b796-c4b97f98e70c', 'prod_edit', 'production', 'Video Edit', 'EDITOR', 'Cut & Grade Final Video', 'Edit footage, apply color grading, cinematic cuts and final high-res render.', 'ideation', 20, true, '2026-08-05T09:20:40.485Z'),
('0d8bd125-fac4-40c2-ae4d-d9d6852897bd', 'prod_design', 'production', 'Design Assets', 'DESIGNER', 'Create Layout & Thumbnails', 'Design thumbnails, vector layouts and brand-aligned visuals for the campaign.', 'ideation', 20, true, '2026-08-05T09:20:40.576Z'),
('b79946c4-56e5-4688-8a08-0284b2b43250', 'distribution', 'distribution', 'Publish & Optimize', 'SMM', 'Publish & Optimize Content', 'Format for platform aspect ratios, apply SEO, schedule publishing and track engagement.', 'production', 30, true, '2026-08-05T09:20:40.652Z');

-- Done
