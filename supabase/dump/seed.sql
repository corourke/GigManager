SET session_replication_role = replica;

--
-- PostgreSQL database dump
--

-- \restrict F3d29VlbSWtDDYECZ9CzBEE8Rufz9U8HBm9NX91tyZlleQ6NDvwVF4LaF17h8Kb

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: organizations; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO organizations (id, name, type, url, phone_number, address_line1, address_line2, city, state, postal_code, country, description, allowed_domains, created_at, updated_at) VALUES ('3f029deb-55fe-4956-b41e-a44cfda7cd99', 'Smith Productions', 'Production', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-11-05 21:36:21.25698+00', '2025-11-05 21:36:21.25698+00');
INSERT INTO organizations (id, name, type, url, phone_number, address_line1, address_line2, city, state, postal_code, country, description, allowed_domains, created_at, updated_at) VALUES ('d82d53cf-4682-4778-a2af-06ae74769fe4', 'Central Park Amphitheater', 'Venue', NULL, NULL, NULL, NULL, 'Los Angeles', 'CA', NULL, 'USA', NULL, NULL, '2025-11-11 05:49:03.436147+00', '2025-11-11 05:49:03.436147+00');
INSERT INTO organizations (id, name, type, url, phone_number, address_line1, address_line2, city, state, postal_code, country, description, allowed_domains, created_at, updated_at) VALUES ('155ee642-6640-445e-bfae-b88f65a43c9c', 'Grand Ballroom Hotel', 'Venue', NULL, NULL, NULL, NULL, 'New York', 'NY', NULL, 'USA', NULL, NULL, '2025-11-11 05:49:03.436147+00', '2025-11-11 05:49:03.436147+00');
INSERT INTO organizations (id, name, type, url, phone_number, address_line1, address_line2, city, state, postal_code, country, description, allowed_domains, created_at, updated_at) VALUES ('5c215d0b-44d9-4e4b-9b5d-d906aece60b6', 'Lakeside Garden Venue', 'Venue', NULL, NULL, NULL, NULL, 'Chicago', 'IL', NULL, 'USA', NULL, NULL, '2025-11-11 05:49:03.436147+00', '2025-11-11 05:49:03.436147+00');
INSERT INTO organizations (id, name, type, url, phone_number, address_line1, address_line2, city, state, postal_code, country, description, allowed_domains, created_at, updated_at) VALUES ('b26965c5-86a9-433b-af66-fe762f9c3290', 'The Blue Note Jazz Club', 'Venue', NULL, NULL, NULL, NULL, 'New York', 'NY', NULL, 'USA', NULL, NULL, '2025-11-11 05:49:03.436147+00', '2025-11-11 05:49:03.436147+00');
INSERT INTO organizations (id, name, type, url, phone_number, address_line1, address_line2, city, state, postal_code, country, description, allowed_domains, created_at, updated_at) VALUES ('aea5fe93-9934-4146-bdb7-59539ec18427', 'Metropolitan Center', 'Venue', NULL, NULL, NULL, NULL, 'Chicago', 'IL', NULL, 'USA', NULL, NULL, '2025-11-11 05:49:03.436147+00', '2025-11-11 05:49:03.436147+00');
INSERT INTO organizations (id, name, type, url, phone_number, address_line1, address_line2, city, state, postal_code, country, description, allowed_domains, created_at, updated_at) VALUES ('d15db3e1-d8be-466f-90ac-c7e4a86b0a09', 'Red Rocks Amphitheatre', 'Venue', NULL, NULL, NULL, NULL, 'Morrison', 'CO', NULL, 'USA', NULL, NULL, '2025-11-11 05:49:03.436147+00', '2025-11-11 05:49:03.436147+00');
INSERT INTO organizations (id, name, type, url, phone_number, address_line1, address_line2, city, state, postal_code, country, description, allowed_domains, created_at, updated_at) VALUES ('ac5f45a4-fa86-45e6-9661-e85493417f99', 'Radio City Music Hall', 'Venue', NULL, NULL, NULL, NULL, 'New York', 'NY', NULL, 'USA', NULL, NULL, '2025-11-11 05:49:03.436147+00', '2025-11-11 05:49:03.436147+00');
INSERT INTO organizations (id, name, type, url, phone_number, address_line1, address_line2, city, state, postal_code, country, description, allowed_domains, created_at, updated_at) VALUES ('b02bb530-77d1-4f29-8b32-dc7a69f1e3ef', 'The Greek Theatre', 'Venue', NULL, NULL, NULL, NULL, 'Los Angeles', 'CA', NULL, 'USA', NULL, NULL, '2025-11-11 05:49:03.436147+00', '2025-11-11 05:49:03.436147+00');
INSERT INTO organizations (id, name, type, url, phone_number, address_line1, address_line2, city, state, postal_code, country, description, allowed_domains, created_at, updated_at) VALUES ('0273bdfa-6090-4acd-ba8b-6a790cc5fcf7', 'The Fillmore', 'Venue', NULL, NULL, NULL, NULL, 'San Francisco', 'CA', NULL, 'USA', NULL, NULL, '2025-11-11 05:49:03.436147+00', '2025-11-11 05:49:03.436147+00');
INSERT INTO organizations (id, name, type, url, phone_number, address_line1, address_line2, city, state, postal_code, country, description, allowed_domains, created_at, updated_at) VALUES ('9e253369-26be-4889-bc31-2b4f7b3df404', 'House of Blues', 'Venue', NULL, NULL, NULL, NULL, 'Boston', 'MA', NULL, 'USA', NULL, NULL, '2025-11-11 05:49:03.436147+00', '2025-11-11 05:49:03.436147+00');
INSERT INTO organizations (id, name, type, url, phone_number, address_line1, address_line2, city, state, postal_code, country, description, allowed_domains, created_at, updated_at) VALUES ('789248bc-07be-41d1-9d93-3bde0905c452', 'Sarah Johnson Quartet', 'Act', NULL, NULL, NULL, NULL, 'New York', 'NY', NULL, 'USA', NULL, NULL, '2025-11-11 05:49:55.425261+00', '2025-11-11 05:49:55.425261+00');
INSERT INTO organizations (id, name, type, url, phone_number, address_line1, address_line2, city, state, postal_code, country, description, allowed_domains, created_at, updated_at) VALUES ('03f9b748-a78b-4f27-9efc-1c31fdbde8c6', 'Electric Dreams Band', 'Act', NULL, NULL, NULL, NULL, 'Los Angeles', 'CA', NULL, 'USA', NULL, NULL, '2025-11-11 05:49:55.425261+00', '2025-11-11 05:49:55.425261+00');
INSERT INTO organizations (id, name, type, url, phone_number, address_line1, address_line2, city, state, postal_code, country, description, allowed_domains, created_at, updated_at) VALUES ('aab639ff-92fa-4ac0-a9b5-cb74146f27ac', 'Jazz Collective', 'Act', NULL, NULL, NULL, NULL, 'Chicago', 'IL', NULL, 'USA', NULL, NULL, '2025-11-11 05:49:55.425261+00', '2025-11-11 05:49:55.425261+00');
INSERT INTO organizations (id, name, type, url, phone_number, address_line1, address_line2, city, state, postal_code, country, description, allowed_domains, created_at, updated_at) VALUES ('a7b133e1-a8ab-45c5-b6b0-50438e6f5df4', 'The Acoustic Sessions', 'Act', NULL, NULL, NULL, NULL, 'Austin', 'TX', NULL, 'USA', NULL, NULL, '2025-11-11 05:49:55.425261+00', '2025-11-11 05:49:55.425261+00');
INSERT INTO organizations (id, name, type, url, phone_number, address_line1, address_line2, city, state, postal_code, country, description, allowed_domains, created_at, updated_at) VALUES ('f74cf4ff-8125-4f22-954c-dbff03bfd494', 'Symphony Orchestra', 'Act', NULL, NULL, NULL, NULL, 'Boston', 'MA', NULL, 'USA', NULL, NULL, '2025-11-11 05:49:55.425261+00', '2025-11-11 05:49:55.425261+00');
INSERT INTO organizations (id, name, type, url, phone_number, address_line1, address_line2, city, state, postal_code, country, description, allowed_domains, created_at, updated_at) VALUES ('1be9bec6-d721-4d56-a847-c9e4153adfed', 'Rock Revolution', 'Act', NULL, NULL, NULL, NULL, 'Seattle', 'WA', NULL, 'USA', NULL, NULL, '2025-11-11 05:49:55.425261+00', '2025-11-11 05:49:55.425261+00');
INSERT INTO organizations (id, name, type, url, phone_number, address_line1, address_line2, city, state, postal_code, country, description, allowed_domains, created_at, updated_at) VALUES ('553f5e86-78d1-4bfe-9ca6-b6890637e257', 'Country Roads Trio', 'Act', NULL, NULL, NULL, NULL, 'Nashville', 'TN', NULL, 'USA', NULL, NULL, '2025-11-11 05:49:55.425261+00', '2025-11-11 05:49:55.425261+00');
INSERT INTO organizations (id, name, type, url, phone_number, address_line1, address_line2, city, state, postal_code, country, description, allowed_domains, created_at, updated_at) VALUES ('ddd4dc3c-ce64-48fc-a9c6-0bcbfe61f68c', 'The Blues Brothers Tribute', 'Act', NULL, NULL, NULL, NULL, 'Chicago', 'IL', NULL, 'USA', NULL, NULL, '2025-11-11 05:49:55.425261+00', '2025-11-11 05:49:55.425261+00');
INSERT INTO organizations (id, name, type, url, phone_number, address_line1, address_line2, city, state, postal_code, country, description, allowed_domains, created_at, updated_at) VALUES ('017dae2c-6db3-447a-bbd3-be2ec14c3eff', 'Soundwave Productions', 'Production', 'https://soundwaveprod.com', NULL, NULL, NULL, 'Los Angeles', 'CA', NULL, 'USA', NULL, NULL, '2025-11-11 05:49:55.425261+00', '2025-11-11 05:49:55.425261+00');
INSERT INTO organizations (id, name, type, url, phone_number, address_line1, address_line2, city, state, postal_code, country, description, allowed_domains, created_at, updated_at) VALUES ('7d823aa7-55e1-4e18-9b86-0405043732c4', 'Lumina Lighting Co.', 'Lighting', 'https://luminalighting.com', NULL, NULL, NULL, 'Nashville', 'TN', NULL, 'USA', NULL, NULL, '2025-11-11 05:49:55.425261+00', '2025-11-11 05:49:55.425261+00');
INSERT INTO organizations (id, name, type, url, phone_number, address_line1, address_line2, city, state, postal_code, country, description, allowed_domains, created_at, updated_at) VALUES ('ac3e1208-6a6e-4814-a244-17e92c584b0b', 'ProStage Rentals', 'Staging', NULL, NULL, NULL, NULL, 'Chicago', 'IL', NULL, 'USA', NULL, NULL, '2025-11-11 05:49:55.425261+00', '2025-11-11 05:49:55.425261+00');
INSERT INTO organizations (id, name, type, url, phone_number, address_line1, address_line2, city, state, postal_code, country, description, allowed_domains, created_at, updated_at) VALUES ('9f60c1f7-a4b2-499b-802c-46ef4ba552f5', 'Elite Sound Systems', 'Sound', NULL, NULL, NULL, NULL, 'New York', 'NY', NULL, 'USA', NULL, NULL, '2025-11-11 05:49:55.425261+00', '2025-11-11 05:49:55.425261+00');
INSERT INTO organizations (id, name, type, url, phone_number, address_line1, address_line2, city, state, postal_code, country, description, allowed_domains, created_at, updated_at) VALUES ('07b92342-c677-4d7a-8988-b8ae49f7aaef', 'Brilliance Lighting', 'Lighting', NULL, NULL, NULL, NULL, 'Los Angeles', 'CA', NULL, 'USA', NULL, NULL, '2025-11-11 05:49:55.425261+00', '2025-11-11 05:49:55.425261+00');

--
-- Data for Name: assets; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO assets (id, organization_id, acquisition_date, vendor, cost, category, sub_category, insurance_policy_added, manufacturer_model, type, serial_number, description, replacement_value, insurance_class, quantity, created_by, updated_by, created_at, updated_at) VALUES ('ecd5f7b2-c1c2-40fe-91eb-9820eefcfa00', '09fca024-b5c1-4f81-a71b-a68361548948', '2025-05-19', 'Pro Audio World', '2200.00', 'Audio', 'Speaker', 'f', 'RCF SUB-8003', 'Powered Subwoofer', '', 'RCF Subwoofer, Casters and Cover.', '2600.00', 'E', '2', 'd0a35726-0993-40b4-b41d-c61806a4670e', 'd0a35726-0993-40b4-b41d-c61806a4670e', '2025-11-20 22:25:46.263348+00', '2025-11-21 01:45:53.427273+00');
INSERT INTO assets (id, organization_id, acquisition_date, vendor, cost, category, sub_category, insurance_policy_added, manufacturer_model, type, serial_number, description, replacement_value, insurance_class, quantity, created_by, updated_by, created_at, updated_at) VALUES ('10d36935-c6e6-4072-8906-c755d5cbd9d9', '09fca024-b5c1-4f81-a71b-a68361548948', '2024-01-15', 'Audio Vendor Inc', '94.50', 'Audio', 'Microphones', 'f', 'Shure SM58', 'Dynamic Microphone', 'SN123456', 'Notes about the asset', '100.00', 'A', '2', 'd0a35726-0993-40b4-b41d-c61806a4670e', 'aa545fd3-e827-40d0-a017-1d35b5f42aa9', '2025-11-21 02:26:12.256834+00', '2026-01-31 06:48:48.575459+00');
INSERT INTO assets (id, organization_id, acquisition_date, vendor, cost, category, sub_category, insurance_policy_added, manufacturer_model, type, serial_number, description, replacement_value, insurance_class, quantity, created_by, updated_by, created_at, updated_at) VALUES ('800e1842-ce2c-454b-a6ea-b458a564f8ba', '09fca024-b5c1-4f81-a71b-a68361548948', '2025-08-03', 'Pro Audio World', '2200.00', 'Audio', 'Speaker', 'f', 'RCF NX 932-A', 'Powered Speaker', NULL, 'This is a _great_ speaker!', '2200.00', 'E', '2', '7e7e8ad7-6951-4dc4-8310-eff2f1b30060', 'aa545fd3-e827-40d0-a017-1d35b5f42aa9', '2025-11-13 07:05:38.800809+00', '2026-01-31 14:45:13.202668+00');

--
-- Data for Name: staff_roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO staff_roles (id, name, description, created_at, updated_at) VALUES ('d22f9ff8-6afa-48b9-afaf-7ebf63d7bc38', 'FOH', 'Front of House - Sound engineer managing audience-facing audio', '2025-11-05 20:33:00.708967+00', '2025-11-05 20:33:00.708967+00');
INSERT INTO staff_roles (id, name, description, created_at, updated_at) VALUES ('5bcb1e1b-32b9-4d16-9489-bff30f02f004', 'Monitor', 'Monitor Engineer - Manages on-stage audio for performers', '2025-11-05 20:33:00.708967+00', '2025-11-05 20:33:00.708967+00');
INSERT INTO staff_roles (id, name, description, created_at, updated_at) VALUES ('703d81a2-595a-4cca-aef7-e66efb2390e8', 'Lighting', 'Lighting Technician - Operates and designs lighting systems', '2025-11-05 20:33:00.708967+00', '2025-11-05 20:33:00.708967+00');
INSERT INTO staff_roles (id, name, description, created_at, updated_at) VALUES ('ef13bc30-5bdd-4569-b303-0849730ad213', 'Stage', 'Stage Manager - Coordinates all stage activities and crew', '2025-11-05 20:33:00.708967+00', '2025-11-05 20:33:00.708967+00');
INSERT INTO staff_roles (id, name, description, created_at, updated_at) VALUES ('ffc2d1a9-7b6e-4048-860c-e9c87db05db0', 'CameraOp', 'Camera Operator - Operates video cameras for live production', '2025-11-05 20:33:00.708967+00', '2025-11-05 20:33:00.708967+00');
INSERT INTO staff_roles (id, name, description, created_at, updated_at) VALUES ('9509f5d2-9f1d-4a95-9764-720f6494a095', 'Video', 'Video Engineer - Manages video switching and routing', '2025-11-05 20:33:00.708967+00', '2025-11-05 20:33:00.708967+00');
INSERT INTO staff_roles (id, name, description, created_at, updated_at) VALUES ('8c06c29e-cc06-4e64-aef9-823de8545968', 'Rigger', 'Rigger - Installs and maintains rigging systems', '2025-11-05 20:33:00.708967+00', '2025-11-05 20:33:00.708967+00');
INSERT INTO staff_roles (id, name, description, created_at, updated_at) VALUES ('b902b99d-07e9-4741-896d-1c65a4f985e0', 'Loader', 'Loader - Assists with loading and unloading equipment', '2025-11-05 20:33:00.708967+00', '2025-11-05 20:33:00.708967+00');
INSERT INTO staff_roles (id, name, description, created_at, updated_at) VALUES ('3e95074d-350e-4807-8cfe-565fce0757cc', 'Runner', 'Runner - General support and errands during production', '2025-11-05 20:33:00.708967+00', '2025-11-05 20:33:00.708967+00');


--
-- Data for Name: kit_assets; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO kit_assets (id, kit_id, asset_id, quantity, notes, created_at) VALUES ('e6b56d95-9584-4d1c-8f95-0c347e920ee5', '4bd24cfb-9987-46d0-81c6-aa3f228cde5d', '10d36935-c6e6-4072-8906-c755d5cbd9d9', '4', NULL, '2026-01-31 06:48:25.940818+00');
INSERT INTO kit_assets (id, kit_id, asset_id, quantity, notes, created_at) VALUES ('c4e75592-2e85-41ba-89f0-6a2551331b90', '03f2ff8e-9ebf-421d-bd6c-d5b597fa44be', '800e1842-ce2c-454b-a6ea-b458a564f8ba', '2', NULL, '2026-01-31 16:53:09.056263+00');
INSERT INTO kit_assets (id, kit_id, asset_id, quantity, notes, created_at) VALUES ('8bbad1aa-ec5e-4498-bd2d-1daf8155dca4', '03f2ff8e-9ebf-421d-bd6c-d5b597fa44be', 'ecd5f7b2-c1c2-40fe-91eb-9820eefcfa00', '2', NULL, '2026-01-31 16:53:09.056263+00');


--
-- PostgreSQL database dump complete
--

-- \unrestrict F3d29VlbSWtDDYECZ9CzBEE8Rufz9U8HBm9NX91tyZlleQ6NDvwVF4LaF17h8Kb

RESET ALL;
