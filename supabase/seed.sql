SET session_replication_role = replica;

--
-- PostgreSQL database dump
--

-- \restrict u0elhZuBaDYaqCUf4V9PqnmABJPGBs8jOSAgEuDZ3v0xseTaWRrMTfqOVpK8GQH

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
INSERT INTO organizations (id, name, type, url, phone_number, address_line1, address_line2, city, state, postal_code, country, description, allowed_domains, created_at, updated_at) VALUES ('6e94b1e8-503a-4638-9f5e-deed9dbcee72', 'Milbourne Sound', 'Sound', 'https://www.milbourne.com/', '925 555-5555', '3225 Sun Valley Avenue', NULL, 'Walnut Creek', 'CA', '94597', 'United States', NULL, 'milbourne.com', '2025-11-06 04:51:38.617986+00', '2025-11-15 04:29:57.907366+00');
INSERT INTO organizations (id, name, type, url, phone_number, address_line1, address_line2, city, state, postal_code, country, description, allowed_domains, created_at, updated_at) VALUES ('9130b451-1474-4dda-8549-39713313a3b3', 'Classical Ensemble', 'Act', NULL, NULL, '1234 Main', NULL, 'Philadelphia', 'PA', NULL, 'USA', NULL, NULL, '2025-11-11 05:49:55.425261+00', '2025-11-16 06:35:56.624249+00');
INSERT INTO organizations (id, name, type, url, phone_number, address_line1, address_line2, city, state, postal_code, country, description, allowed_domains, created_at, updated_at) VALUES ('09fca024-b5c1-4f81-a71b-a68361548948', 'Act4Audio', 'Sound', 'https://act4audio.com', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'act4audio.com', '2025-11-16 06:36:49.616038+00', '2025-11-16 06:36:49.616038+00');


--
-- Data for Name: assets; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO assets (id, organization_id, acquisition_date, vendor, cost, category, sub_category, insurance_policy_added, manufacturer_model, type, serial_number, description, replacement_value, insurance_class, quantity, created_by, updated_by, created_at, updated_at) VALUES ('ecd5f7b2-c1c2-40fe-91eb-9820eefcfa00', '09fca024-b5c1-4f81-a71b-a68361548948', '2025-05-19', 'Pro Audio World', '2200.00', 'Audio', 'Speaker', 'f', 'RCF SUB-8003', 'Powered Subwoofer', '', 'RCF Subwoofer, Casters and Cover.', '2600.00', 'E', '2', 'd0a35726-0993-40b4-b41d-c61806a4670e', 'd0a35726-0993-40b4-b41d-c61806a4670e', '2025-11-20 22:25:46.263348+00', '2025-11-21 01:45:53.427273+00');
INSERT INTO assets (id, organization_id, acquisition_date, vendor, cost, category, sub_category, insurance_policy_added, manufacturer_model, type, serial_number, description, replacement_value, insurance_class, quantity, created_by, updated_by, created_at, updated_at) VALUES ('800e1842-ce2c-454b-a6ea-b458a564f8ba', '09fca024-b5c1-4f81-a71b-a68361548948', '2025-08-03', 'Pro Audio World', '2200.00', 'Audio', 'Speaker', 'f', 'RCF NX 932-A', 'Powered Speaker', NULL, 'This is a _great_ speaker!', '2300.00', 'E', '2', '7e7e8ad7-6951-4dc4-8310-eff2f1b30060', 'd0a35726-0993-40b4-b41d-c61806a4670e', '2025-11-13 07:05:38.800809+00', '2025-11-21 01:47:17.88219+00');
INSERT INTO assets (id, organization_id, acquisition_date, vendor, cost, category, sub_category, insurance_policy_added, manufacturer_model, type, serial_number, description, replacement_value, insurance_class, quantity, created_by, updated_by, created_at, updated_at) VALUES ('10d36935-c6e6-4072-8906-c755d5cbd9d9', '09fca024-b5c1-4f81-a71b-a68361548948', '2024-01-15', 'Audio Vendor Inc', '94.50', 'Audio', 'Microphones', 'f', 'Shure SM58', 'Dynamic Microphone', 'SN123456', 'Notes about the asset', '100.00', 'A', '3', 'd0a35726-0993-40b4-b41d-c61806a4670e', 'd0a35726-0993-40b4-b41d-c61806a4670e', '2025-11-21 02:26:12.256834+00', '2026-01-26 19:59:02.059736+00');


--
-- Data for Name: gigs; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO gigs (id, title, status, tags, start, "end", timezone, amount_paid, notes, parent_gig_id, hierarchy_depth, created_by, updated_by, created_at, updated_at) VALUES ('c65a2ec2-7897-473b-97c7-562ae34dd884', 'Jazz at the Metro', 'Proposed', '{"\\"Live Music\\"",Concert}', '2026-02-28 04:00:00+00', '2026-02-28 06:30:00+00', 'America/Los_Angeles', NULL, 'These notes update immediately. Fast. Wait a few seconds.', NULL, '0', '7e7e8ad7-6951-4dc4-8310-eff2f1b30060', 'd0a35726-0993-40b4-b41d-c61806a4670e', '2025-11-14 04:39:07.492886+00', '2026-01-29 06:22:53.71269+00');
INSERT INTO gigs (id, title, status, tags, start, "end", timezone, amount_paid, notes, parent_gig_id, hierarchy_depth, created_by, updated_by, created_at, updated_at) VALUES ('c87ffb0f-0167-4d8a-83bc-d6530e16bcca', 'Summer Concert', 'Proposed', '{"\\"Live Music\\"",Outdoor}', '2026-04-19 01:00:00+00', '2026-04-19 05:30:00+00', 'America/Los_Angeles', NULL, 'Notes about the gig are saved immediately', NULL, '0', 'd0a35726-0993-40b4-b41d-c61806a4670e', 'd0a35726-0993-40b4-b41d-c61806a4670e', '2025-11-21 03:18:36.737575+00', '2026-01-29 06:05:14.468097+00');


--
-- Data for Name: gig_bids; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO gig_bids (id, gig_id, organization_id, amount, date_given, result, notes, created_by, created_at) VALUES ('ad1515ab-1303-46cc-a72b-04274ece9cbd', 'c65a2ec2-7897-473b-97c7-562ae34dd884', '09fca024-b5c1-4f81-a71b-a68361548948', '1500.00', '2026-01-26', 'Pending', NULL, 'd0a35726-0993-40b4-b41d-c61806a4670e', '2026-01-26 20:05:39.70731+00');
INSERT INTO gig_bids (id, gig_id, organization_id, amount, date_given, result, notes, created_by, created_at) VALUES ('06ec1d73-8665-4ee8-9cc0-fbc2c417ccf2', 'c65a2ec2-7897-473b-97c7-562ae34dd884', '09fca024-b5c1-4f81-a71b-a68361548948', '3200.00', '2025-11-16', 'Rejected', 'BBid de', 'd0a35726-0993-40b4-b41d-c61806a4670e', '2025-11-17 07:09:22.958781+00');
INSERT INTO gig_bids (id, gig_id, organization_id, amount, date_given, result, notes, created_by, created_at) VALUES ('e520f8d5-9535-44df-84cb-8aa4eaa11fd5', 'c87ffb0f-0167-4d8a-83bc-d6530e16bcca', '09fca024-b5c1-4f81-a71b-a68361548948', '100.00', '2026-01-20', 'Pending', NULL, 'd0a35726-0993-40b4-b41d-c61806a4670e', '2026-01-22 06:41:28.788278+00');


--
-- Data for Name: kits; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO kits (id, organization_id, name, category, description, tags, tag_number, rental_value, created_by, updated_by, created_at, updated_at) VALUES ('84902571-af89-4863-b9f7-2550316e8a15', '09fca024-b5c1-4f81-a71b-a68361548948', 'RCF Speaker Kit', 'Audio', NULL, '{}', 'A4-PA001', '450.00', '7e7e8ad7-6951-4dc4-8310-eff2f1b30060', '7e7e8ad7-6951-4dc4-8310-eff2f1b30060', '2025-11-13 07:16:52.322656+00', '2025-11-16 15:25:28.064486+00');
INSERT INTO kits (id, organization_id, name, category, description, tags, tag_number, rental_value, created_by, updated_by, created_at, updated_at) VALUES ('4f5b5230-b93b-4406-bced-d43aa991f6dd', '09fca024-b5c1-4f81-a71b-a68361548948', 'Microphone Case', 'Audio', NULL, '{PA}', NULL, '10.00', 'd0a35726-0993-40b4-b41d-c61806a4670e', 'd0a35726-0993-40b4-b41d-c61806a4670e', '2025-11-24 04:04:58.535607+00', '2026-01-20 15:07:48.75218+00');


--
-- Data for Name: gig_kit_assignments; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO gig_kit_assignments (id, organization_id, gig_id, kit_id, notes, assigned_by, assigned_at) VALUES ('931a807a-7e2f-4867-af87-4e45abc01c9d', '09fca024-b5c1-4f81-a71b-a68361548948', 'c87ffb0f-0167-4d8a-83bc-d6530e16bcca', '84902571-af89-4863-b9f7-2550316e8a15', NULL, 'd0a35726-0993-40b4-b41d-c61806a4670e', '2025-11-24 03:17:54.046607+00');
INSERT INTO gig_kit_assignments (id, organization_id, gig_id, kit_id, notes, assigned_by, assigned_at) VALUES ('f3fdb82d-4f64-4513-8ad9-6a31a7cf06b2', '09fca024-b5c1-4f81-a71b-a68361548948', 'c65a2ec2-7897-473b-97c7-562ae34dd884', '84902571-af89-4863-b9f7-2550316e8a15', NULL, 'd0a35726-0993-40b4-b41d-c61806a4670e', '2025-11-18 21:44:55.348362+00');
INSERT INTO gig_kit_assignments (id, organization_id, gig_id, kit_id, notes, assigned_by, assigned_at) VALUES ('640d520e-ae9b-44a8-a274-5a2d43f2815d', '09fca024-b5c1-4f81-a71b-a68361548948', 'c65a2ec2-7897-473b-97c7-562ae34dd884', '4f5b5230-b93b-4406-bced-d43aa991f6dd', NULL, 'd0a35726-0993-40b4-b41d-c61806a4670e', '2026-01-26 20:06:11.538257+00');


--
-- Data for Name: gig_participants; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO gig_participants (id, gig_id, organization_id, role, notes) VALUES ('af655822-b1fb-4fb8-94c2-ed458f76e806', 'c65a2ec2-7897-473b-97c7-562ae34dd884', '6e94b1e8-503a-4638-9f5e-deed9dbcee72', 'Sound', NULL);
INSERT INTO gig_participants (id, gig_id, organization_id, role, notes) VALUES ('4287b960-8295-4405-a237-d1017f4961c5', 'c65a2ec2-7897-473b-97c7-562ae34dd884', 'aea5fe93-9934-4146-bdb7-59539ec18427', 'Venue', NULL);
INSERT INTO gig_participants (id, gig_id, organization_id, role, notes) VALUES ('3a750fe5-fd7a-4a83-9ff5-2bab5c433d6d', 'c65a2ec2-7897-473b-97c7-562ae34dd884', '09fca024-b5c1-4f81-a71b-a68361548948', 'Lighting', NULL);
INSERT INTO gig_participants (id, gig_id, organization_id, role, notes) VALUES ('5cc9223b-347d-49b1-b115-30c4b2cfbeff', 'c65a2ec2-7897-473b-97c7-562ae34dd884', '03f9b748-a78b-4f27-9efc-1c31fdbde8c6', 'Act', NULL);
INSERT INTO gig_participants (id, gig_id, organization_id, role, notes) VALUES ('8fd2dce0-26ad-445a-b2e0-39699bc98bd9', 'c65a2ec2-7897-473b-97c7-562ae34dd884', 'ac3e1208-6a6e-4814-a244-17e92c584b0b', 'Rentals', NULL);
INSERT INTO gig_participants (id, gig_id, organization_id, role, notes) VALUES ('5c6d58d6-9166-49c9-8eff-7526852e37d4', 'c87ffb0f-0167-4d8a-83bc-d6530e16bcca', 'd82d53cf-4682-4778-a2af-06ae74769fe4', 'Venue', NULL);
INSERT INTO gig_participants (id, gig_id, organization_id, role, notes) VALUES ('6377c6d9-9dd9-42a0-a86c-2c6cdc622274', 'c87ffb0f-0167-4d8a-83bc-d6530e16bcca', '03f9b748-a78b-4f27-9efc-1c31fdbde8c6', 'Act', NULL);
INSERT INTO gig_participants (id, gig_id, organization_id, role, notes) VALUES ('c29b85ad-1de3-4c4a-af2f-40324bf051e8', 'c87ffb0f-0167-4d8a-83bc-d6530e16bcca', '09fca024-b5c1-4f81-a71b-a68361548948', 'Sound', NULL);


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
-- Data for Name: gig_staff_slots; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO gig_staff_slots (id, gig_id, staff_role_id, organization_id, required_count, notes, created_at, updated_at) VALUES ('a6a311e5-1607-4e3e-b5c9-05ec8868e58c', 'c65a2ec2-7897-473b-97c7-562ae34dd884', 'd22f9ff8-6afa-48b9-afaf-7ebf63d7bc38', '09fca024-b5c1-4f81-a71b-a68361548948', '1', NULL, '2026-01-26 06:05:07.016986+00', '2026-01-28 03:05:46.522765+00');
INSERT INTO gig_staff_slots (id, gig_id, staff_role_id, organization_id, required_count, notes, created_at, updated_at) VALUES ('b9e9580e-8019-4e94-a0d2-d90080a8a82c', 'c65a2ec2-7897-473b-97c7-562ae34dd884', 'ef13bc30-5bdd-4569-b303-0849730ad213', '09fca024-b5c1-4f81-a71b-a68361548948', '1', NULL, '2026-01-26 20:12:44.598114+00', '2026-01-28 03:05:46.965051+00');
INSERT INTO gig_staff_slots (id, gig_id, staff_role_id, organization_id, required_count, notes, created_at, updated_at) VALUES ('6dd48e42-176b-4972-9507-9c79a956be77', 'c87ffb0f-0167-4d8a-83bc-d6530e16bcca', 'd22f9ff8-6afa-48b9-afaf-7ebf63d7bc38', '09fca024-b5c1-4f81-a71b-a68361548948', '1', NULL, '2026-01-26 05:53:25.981201+00', '2026-01-26 05:53:25.981201+00');


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO users (id, email, first_name, last_name, phone, avatar_url, address_line1, address_line2, city, state, postal_code, country, role_hint, user_status, created_at, updated_at) VALUES ('7e7e8ad7-6951-4dc4-8310-eff2f1b30060', 'cameron.orourke+mark@gmail.com', 'Mark', 'Milbourne', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active', '2025-11-06 01:02:51.178587+00', '2025-11-06 01:02:51.178587+00');
INSERT INTO users (id, email, first_name, last_name, phone, avatar_url, address_line1, address_line2, city, state, postal_code, country, role_hint, user_status, created_at, updated_at) VALUES ('1d9bdc13-cae3-437b-83ec-ae5359fbc3a8', 'cameron.orourke+john@gmail.com', 'John', 'Smith', '', '', '', '', '', '', '', '', NULL, 'active', '2025-11-05 21:34:54.008103+00', '2025-11-16 19:53:26.331787+00');
INSERT INTO users (id, email, first_name, last_name, phone, avatar_url, address_line1, address_line2, city, state, postal_code, country, role_hint, user_status, created_at, updated_at) VALUES ('7e33b18d-a6ca-4fdf-8a52-9011c3785f0e', 'cameron.orourke+colin@gmail.com', 'Colin', 'MacMahon', '', '', '', '', '', '', '', '', NULL, 'pending', '2025-11-19 06:29:02.914192+00', '2026-01-16 05:57:52.563381+00');
INSERT INTO users (id, email, first_name, last_name, phone, avatar_url, address_line1, address_line2, city, state, postal_code, country, role_hint, user_status, created_at, updated_at) VALUES ('d0a35726-0993-40b4-b41d-c61806a4670e', 'cameron.orourke@gmail.com', 'Cameron', '"O''Rourke"', '925 858-0411', '', '24 Lynnbrook Ct', '', 'San Ramon', 'CA', '94582', '', NULL, 'active', '2025-11-16 06:34:54.751247+00', '2026-01-27 05:52:56.459394+00');


--
-- Data for Name: gig_staff_assignments; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO gig_staff_assignments (id, slot_id, user_id, status, rate, fee, notes, assigned_at, confirmed_at) VALUES ('4bb6844f-c1e1-4345-b232-2279072f801e', 'a6a311e5-1607-4e3e-b5c9-05ec8868e58c', 'd0a35726-0993-40b4-b41d-c61806a4670e', 'Requested', NULL, NULL, NULL, '2026-01-26 06:05:37.89593+00', NULL);
INSERT INTO gig_staff_assignments (id, slot_id, user_id, status, rate, fee, notes, assigned_at, confirmed_at) VALUES ('b1b1f619-325a-48c6-aa03-8b73f014c60c', 'b9e9580e-8019-4e94-a0d2-d90080a8a82c', '7e33b18d-a6ca-4fdf-8a52-9011c3785f0e', 'Declined', NULL, NULL, NULL, '2026-01-26 20:12:44.722032+00', NULL);
INSERT INTO gig_staff_assignments (id, slot_id, user_id, status, rate, fee, notes, assigned_at, confirmed_at) VALUES ('f45ba289-1c83-4bbc-8062-1d34ddf4acac', 'b9e9580e-8019-4e94-a0d2-d90080a8a82c', '1d9bdc13-cae3-437b-83ec-ae5359fbc3a8', 'Open', NULL, NULL, NULL, '2026-01-27 05:59:10.492557+00', NULL);
INSERT INTO gig_staff_assignments (id, slot_id, user_id, status, rate, fee, notes, assigned_at, confirmed_at) VALUES ('88fb8524-46a4-4f0a-87db-8188a8264ab3', '6dd48e42-176b-4972-9507-9c79a956be77', 'd0a35726-0993-40b4-b41d-c61806a4670e', 'Requested', NULL, NULL, NULL, '2026-01-26 05:53:26.114457+00', NULL);


--
-- Data for Name: gig_status_history; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO gig_status_history (id, gig_id, from_status, to_status, changed_by, changed_at) VALUES ('e49b4c42-91f9-46c2-b338-a0294898af03', 'c87ffb0f-0167-4d8a-83bc-d6530e16bcca', 'Proposed', 'DateHold', 'd0a35726-0993-40b4-b41d-c61806a4670e', '2026-01-26 05:50:21.875492+00');
INSERT INTO gig_status_history (id, gig_id, from_status, to_status, changed_by, changed_at) VALUES ('79987372-8f1d-4091-85a6-7dc23a95f0c9', 'c87ffb0f-0167-4d8a-83bc-d6530e16bcca', 'DateHold', 'Proposed', 'd0a35726-0993-40b4-b41d-c61806a4670e', '2026-01-26 06:09:28.079551+00');
INSERT INTO gig_status_history (id, gig_id, from_status, to_status, changed_by, changed_at) VALUES ('50d962d7-006a-4b9d-a167-d80c14be6cd1', 'c65a2ec2-7897-473b-97c7-562ae34dd884', 'Proposed', 'DateHold', 'd0a35726-0993-40b4-b41d-c61806a4670e', '2026-01-26 19:54:48.471038+00');
INSERT INTO gig_status_history (id, gig_id, from_status, to_status, changed_by, changed_at) VALUES ('db6aca89-636c-45a2-808e-2aa1c96a727f', 'c65a2ec2-7897-473b-97c7-562ae34dd884', 'DateHold', 'Proposed', 'd0a35726-0993-40b4-b41d-c61806a4670e', '2026-01-29 06:22:53.71269+00');


--
-- Data for Name: invitations; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- PostgreSQL database dump complete
--

-- \unrestrict u0elhZuBaDYaqCUf4V9PqnmABJPGBs8jOSAgEuDZ3v0xseTaWRrMTfqOVpK8GQH

RESET ALL;
