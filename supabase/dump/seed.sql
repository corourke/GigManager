SET session_replication_role = replica;

--
-- PostgreSQL database dump
--

-- \restrict 8kR3whH0nsQx8seZ9w7K78p3rdghcINuY6s50zGbHLag6OaOyTiyd0lGsMLbIOO

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
INSERT INTO organizations (id, name, type, url, phone_number, address_line1, address_line2, city, state, postal_code, country, description, allowed_domains, created_at, updated_at) VALUES ('89b01570-f201-4939-abc0-bae126d12577', 'The Band', 'Act', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-02-04 20:00:59.115967+00', '2026-02-04 20:00:59.115967+00');
INSERT INTO organizations (id, name, type, url, phone_number, address_line1, address_line2, city, state, postal_code, country, description, allowed_domains, created_at, updated_at) VALUES ('6bc48db4-2a7f-4cd3-9407-f40b8e4985fb', 'Venue Name', 'Venue', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-02-04 20:00:59.545456+00', '2026-02-04 20:00:59.545456+00');


--
-- Data for Name: assets; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO assets (id, organization_id, acquisition_date, vendor, cost, category, sub_category, insurance_policy_added, manufacturer_model, type, serial_number, description, replacement_value, insurance_class, quantity, created_by, updated_by, created_at, updated_at) VALUES ('ecd5f7b2-c1c2-40fe-91eb-9820eefcfa00', '09fca024-b5c1-4f81-a71b-a68361548948', '2025-05-19', 'Pro Audio World', '2200.00', 'Audio', 'Speaker', 'f', 'RCF SUB-8003', 'Powered Subwoofer', '', 'RCF Subwoofer, Casters and Cover.', '2600.00', 'E', '2', 'd0a35726-0993-40b4-b41d-c61806a4670e', 'd0a35726-0993-40b4-b41d-c61806a4670e', '2025-11-20 22:25:46.263348+00', '2025-11-21 01:45:53.427273+00');
INSERT INTO assets (id, organization_id, acquisition_date, vendor, cost, category, sub_category, insurance_policy_added, manufacturer_model, type, serial_number, description, replacement_value, insurance_class, quantity, created_by, updated_by, created_at, updated_at) VALUES ('10d36935-c6e6-4072-8906-c755d5cbd9d9', '09fca024-b5c1-4f81-a71b-a68361548948', '2024-01-15', 'Audio Vendor Inc', '94.50', 'Audio', 'Microphones', 'f', 'Shure SM58', 'Dynamic Microphone', 'SN123456', 'Notes about the asset', '100.00', 'A', '2', 'd0a35726-0993-40b4-b41d-c61806a4670e', 'aa545fd3-e827-40d0-a017-1d35b5f42aa9', '2025-11-21 02:26:12.256834+00', '2026-01-31 06:48:48.575459+00');
INSERT INTO assets (id, organization_id, acquisition_date, vendor, cost, category, sub_category, insurance_policy_added, manufacturer_model, type, serial_number, description, replacement_value, insurance_class, quantity, created_by, updated_by, created_at, updated_at) VALUES ('800e1842-ce2c-454b-a6ea-b458a564f8ba', '09fca024-b5c1-4f81-a71b-a68361548948', '2025-08-03', 'Pro Audio World', '2200.00', 'Audio', 'Speaker', 'f', 'RCF NX 932-A', 'Powered Speaker', NULL, 'This is a _great_ speaker!', '2200.00', 'E', '2', '7e7e8ad7-6951-4dc4-8310-eff2f1b30060', 'aa545fd3-e827-40d0-a017-1d35b5f42aa9', '2025-11-13 07:05:38.800809+00', '2026-01-31 14:45:13.202668+00');


--
-- Data for Name: gigs; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO gigs (id, title, status, tags, start, "end", timezone, amount_paid, notes, parent_gig_id, hierarchy_depth, created_by, updated_by, created_at, updated_at) VALUES ('c65a2ec2-7897-473b-97c7-562ae34dd884', 'Jazz at the Metro', 'Proposed', '{"\\"Live Music\\"",Outdoor}', '2026-02-22 04:00:00+00', '2026-02-22 09:00:00+00', 'America/Los_Angeles', NULL, 'These notes update immediately. ', NULL, '0', '7e7e8ad7-6951-4dc4-8310-eff2f1b30060', 'aa545fd3-e827-40d0-a017-1d35b5f42aa9', '2025-11-14 04:39:07.492886+00', '2026-02-02 05:15:43.911391+00');
INSERT INTO gigs (id, title, status, tags, start, "end", timezone, amount_paid, notes, parent_gig_id, hierarchy_depth, created_by, updated_by, created_at, updated_at) VALUES ('c87ffb0f-0167-4d8a-83bc-d6530e16bcca', 'Summer Concert', 'Proposed', '{"\\"Live Music\\"",Concert}', '2026-04-19 01:00:00+00', '2026-04-19 05:30:00+00', 'America/Los_Angeles', '0.00', 'Notes about the gig are saved immediately', NULL, '0', 'd0a35726-0993-40b4-b41d-c61806a4670e', 'aa545fd3-e827-40d0-a017-1d35b5f42aa9', '2025-11-21 03:18:36.737575+00', '2026-02-05 23:37:46.783423+00');


--
-- Data for Name: gig_bids; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO gig_bids (id, gig_id, organization_id, amount, date_given, result, notes, created_by, created_at) VALUES ('4be7d517-0109-4425-a333-e87f58719908', 'c65a2ec2-7897-473b-97c7-562ae34dd884', '09fca024-b5c1-4f81-a71b-a68361548948', '2200.00', '2026-01-30', 'Pending', NULL, 'aa545fd3-e827-40d0-a017-1d35b5f42aa9', '2026-01-31 06:39:16.728347+00');


--
-- Data for Name: kits; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO kits (id, organization_id, name, category, description, tags, tag_number, rental_value, created_by, updated_by, created_at, updated_at) VALUES ('84902571-af89-4863-b9f7-2550316e8a15', '09fca024-b5c1-4f81-a71b-a68361548948', 'RCF Speaker Kit', 'Audio', NULL, '{}', 'A4-PA001', '450.00', '7e7e8ad7-6951-4dc4-8310-eff2f1b30060', '7e7e8ad7-6951-4dc4-8310-eff2f1b30060', '2025-11-13 07:16:52.322656+00', '2025-11-16 15:25:28.064486+00');
INSERT INTO kits (id, organization_id, name, category, description, tags, tag_number, rental_value, created_by, updated_by, created_at, updated_at) VALUES ('4f5b5230-b93b-4406-bced-d43aa991f6dd', '09fca024-b5c1-4f81-a71b-a68361548948', 'Microphone Case', 'Audio', NULL, '{PA}', NULL, '10.00', 'd0a35726-0993-40b4-b41d-c61806a4670e', 'd0a35726-0993-40b4-b41d-c61806a4670e', '2025-11-24 04:04:58.535607+00', '2026-01-20 15:07:48.75218+00');
INSERT INTO kits (id, organization_id, name, category, description, tags, tag_number, rental_value, created_by, updated_by, created_at, updated_at) VALUES ('4bd24cfb-9987-46d0-81c6-aa3f228cde5d', '09fca024-b5c1-4f81-a71b-a68361548948', 'Microphone Case', 'Audio', NULL, '{}', NULL, NULL, 'aa545fd3-e827-40d0-a017-1d35b5f42aa9', 'aa545fd3-e827-40d0-a017-1d35b5f42aa9', '2026-01-31 06:48:25.826104+00', '2026-01-31 06:48:25.826104+00');
INSERT INTO kits (id, organization_id, name, category, description, tags, tag_number, rental_value, created_by, updated_by, created_at, updated_at) VALUES ('03f2ff8e-9ebf-421d-bd6c-d5b597fa44be', '09fca024-b5c1-4f81-a71b-a68361548948', 'RCF Speakers', 'Audio', NULL, '{}', NULL, NULL, 'aa545fd3-e827-40d0-a017-1d35b5f42aa9', 'aa545fd3-e827-40d0-a017-1d35b5f42aa9', '2026-01-31 16:53:08.78894+00', '2026-01-31 16:53:08.78894+00');


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
INSERT INTO gig_participants (id, gig_id, organization_id, role, notes) VALUES ('3a750fe5-fd7a-4a83-9ff5-2bab5c433d6d', 'c65a2ec2-7897-473b-97c7-562ae34dd884', '09fca024-b5c1-4f81-a71b-a68361548948', 'Lighting', NULL);
INSERT INTO gig_participants (id, gig_id, organization_id, role, notes) VALUES ('8fd2dce0-26ad-445a-b2e0-39699bc98bd9', 'c65a2ec2-7897-473b-97c7-562ae34dd884', 'ac3e1208-6a6e-4814-a244-17e92c584b0b', 'Rentals', NULL);
INSERT INTO gig_participants (id, gig_id, organization_id, role, notes) VALUES ('c29b85ad-1de3-4c4a-af2f-40324bf051e8', 'c87ffb0f-0167-4d8a-83bc-d6530e16bcca', '09fca024-b5c1-4f81-a71b-a68361548948', 'Sound', NULL);
INSERT INTO gig_participants (id, gig_id, organization_id, role, notes) VALUES ('6377c6d9-9dd9-42a0-a86c-2c6cdc622274', 'c87ffb0f-0167-4d8a-83bc-d6530e16bcca', '03f9b748-a78b-4f27-9efc-1c31fdbde8c6', 'Act', NULL);
INSERT INTO gig_participants (id, gig_id, organization_id, role, notes) VALUES ('5cc9223b-347d-49b1-b115-30c4b2cfbeff', 'c65a2ec2-7897-473b-97c7-562ae34dd884', 'aab639ff-92fa-4ac0-a9b5-cb74146f27ac', 'Act', NULL);
INSERT INTO gig_participants (id, gig_id, organization_id, role, notes) VALUES ('4287b960-8295-4405-a237-d1017f4961c5', 'c65a2ec2-7897-473b-97c7-562ae34dd884', 'd82d53cf-4682-4778-a2af-06ae74769fe4', 'Venue', NULL);
INSERT INTO gig_participants (id, gig_id, organization_id, role, notes) VALUES ('5c6d58d6-9166-49c9-8eff-7526852e37d4', 'c87ffb0f-0167-4d8a-83bc-d6530e16bcca', '9e253369-26be-4889-bc31-2b4f7b3df404', 'Venue', NULL);


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

INSERT INTO gig_staff_slots (id, gig_id, staff_role_id, organization_id, required_count, notes, created_at, updated_at) VALUES ('a6a311e5-1607-4e3e-b5c9-05ec8868e58c', 'c65a2ec2-7897-473b-97c7-562ae34dd884', 'd22f9ff8-6afa-48b9-afaf-7ebf63d7bc38', '09fca024-b5c1-4f81-a71b-a68361548948', '1', NULL, '2026-01-26 06:05:07.016986+00', '2026-01-31 06:38:47.985071+00');
INSERT INTO gig_staff_slots (id, gig_id, staff_role_id, organization_id, required_count, notes, created_at, updated_at) VALUES ('b9e9580e-8019-4e94-a0d2-d90080a8a82c', 'c65a2ec2-7897-473b-97c7-562ae34dd884', 'ef13bc30-5bdd-4569-b303-0849730ad213', '09fca024-b5c1-4f81-a71b-a68361548948', '1', NULL, '2026-01-26 20:12:44.598114+00', '2026-01-31 06:38:48.288084+00');
INSERT INTO gig_staff_slots (id, gig_id, staff_role_id, organization_id, required_count, notes, created_at, updated_at) VALUES ('6dd48e42-176b-4972-9507-9c79a956be77', 'c87ffb0f-0167-4d8a-83bc-d6530e16bcca', 'ef13bc30-5bdd-4569-b303-0849730ad213', '09fca024-b5c1-4f81-a71b-a68361548948', '1', NULL, '2026-01-26 05:53:25.981201+00', '2026-02-05 23:47:06.85804+00');


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO users (id, email, first_name, last_name, phone, avatar_url, address_line1, address_line2, city, state, postal_code, country, role_hint, user_status, created_at, updated_at) VALUES ('aa545fd3-e827-40d0-a017-1d35b5f42aa9', 'cameron.orourke@gmail.com', 'Cameron', 'O''Rourke', '925-858-0411', NULL, '24 Lynnbrook Court', NULL, 'San Ramon', NULL, NULL, NULL, NULL, 'active', '2026-01-29 21:26:11.984872+00', '2026-01-31 07:18:05.991196+00');
INSERT INTO users (id, email, first_name, last_name, phone, avatar_url, address_line1, address_line2, city, state, postal_code, country, role_hint, user_status, created_at, updated_at) VALUES ('02c16e23-7859-491e-8788-84f4066f2f40', 'cameron.orourke+mark@gmail.com', 'Mark', 'Milbourne', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active', '2026-02-03 03:31:19.730855+00', '2026-02-03 03:31:19.730855+00');
INSERT INTO users (id, email, first_name, last_name, phone, avatar_url, address_line1, address_line2, city, state, postal_code, country, role_hint, user_status, created_at, updated_at) VALUES ('6dd4ab14-a3b0-402e-be1a-b50ffcb89fb2', 'cameron.orourke+sam@gmail.com', 'Sam', 'Smith', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active', '2026-02-03 03:53:39.931294+00', '2026-02-03 04:00:05.397165+00');
INSERT INTO users (id, email, first_name, last_name, phone, avatar_url, address_line1, address_line2, city, state, postal_code, country, role_hint, user_status, created_at, updated_at) VALUES ('b470fcce-cdea-4647-9ba7-19f501a26343', 'cameron.orourke+colin@gmail.com', 'Colin', 'Mac', '', '', '', '', '', '', '', '', NULL, 'pending', '2026-02-03 03:09:17.106623+00', '2026-02-04 04:38:03.696494+00');
INSERT INTO users (id, email, first_name, last_name, phone, avatar_url, address_line1, address_line2, city, state, postal_code, country, role_hint, user_status, created_at, updated_at) VALUES ('016b9cc5-3f46-47b2-ad42-9e6a090fe278', 'cameron.orourke+matt@gmail.com', 'Matt', 'Walsh', '', '', '', '', '', '', '', '', NULL, 'active', '2026-02-03 20:41:54.795639+00', '2026-02-04 04:38:35.702576+00');
INSERT INTO users (id, email, first_name, last_name, phone, avatar_url, address_line1, address_line2, city, state, postal_code, country, role_hint, user_status, created_at, updated_at) VALUES ('54eb084b-a81b-4c13-bdd8-a9f450351eac', 'cameron.orourke+joe@gmail.com', 'Joe', 'Johnson', '925-858-0411', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active', '2026-02-04 07:16:29.767485+00', '2026-02-04 20:04:03.352894+00');


--
-- Data for Name: gig_staff_assignments; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO gig_staff_assignments (id, slot_id, user_id, status, rate, fee, notes, assigned_at, confirmed_at) VALUES ('c34f545d-625d-46dc-b700-fa0fc0acd5dc', 'a6a311e5-1607-4e3e-b5c9-05ec8868e58c', 'aa545fd3-e827-40d0-a017-1d35b5f42aa9', 'Requested', NULL, NULL, NULL, '2026-01-31 06:38:48.174697+00', NULL);
INSERT INTO gig_staff_assignments (id, slot_id, user_id, status, rate, fee, notes, assigned_at, confirmed_at) VALUES ('ba764a65-f1bf-48bf-a697-a3f9ed36cb2e', '6dd48e42-176b-4972-9507-9c79a956be77', 'b470fcce-cdea-4647-9ba7-19f501a26343', 'Requested', NULL, '100.00', NULL, '2026-02-05 23:46:48.40452+00', NULL);


--
-- Data for Name: gig_status_history; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO gig_status_history (id, gig_id, from_status, to_status, changed_by, changed_at) VALUES ('e49b4c42-91f9-46c2-b338-a0294898af03', 'c87ffb0f-0167-4d8a-83bc-d6530e16bcca', 'Proposed', 'DateHold', 'd0a35726-0993-40b4-b41d-c61806a4670e', '2026-01-26 05:50:21.875492+00');
INSERT INTO gig_status_history (id, gig_id, from_status, to_status, changed_by, changed_at) VALUES ('79987372-8f1d-4091-85a6-7dc23a95f0c9', 'c87ffb0f-0167-4d8a-83bc-d6530e16bcca', 'DateHold', 'Proposed', 'd0a35726-0993-40b4-b41d-c61806a4670e', '2026-01-26 06:09:28.079551+00');
INSERT INTO gig_status_history (id, gig_id, from_status, to_status, changed_by, changed_at) VALUES ('50d962d7-006a-4b9d-a167-d80c14be6cd1', 'c65a2ec2-7897-473b-97c7-562ae34dd884', 'Proposed', 'DateHold', 'd0a35726-0993-40b4-b41d-c61806a4670e', '2026-01-26 19:54:48.471038+00');
INSERT INTO gig_status_history (id, gig_id, from_status, to_status, changed_by, changed_at) VALUES ('db6aca89-636c-45a2-808e-2aa1c96a727f', 'c65a2ec2-7897-473b-97c7-562ae34dd884', 'DateHold', 'Proposed', 'd0a35726-0993-40b4-b41d-c61806a4670e', '2026-01-29 06:22:53.71269+00');
INSERT INTO gig_status_history (id, gig_id, from_status, to_status, changed_by, changed_at) VALUES ('7d9545fd-0167-434f-8a54-63bb5726b120', 'c65a2ec2-7897-473b-97c7-562ae34dd884', 'Proposed', 'DateHold', 'aa545fd3-e827-40d0-a017-1d35b5f42aa9', '2026-01-31 06:37:53.539936+00');
INSERT INTO gig_status_history (id, gig_id, from_status, to_status, changed_by, changed_at) VALUES ('976e5840-7726-4a56-b81c-b9cb3ebc82e5', 'c65a2ec2-7897-473b-97c7-562ae34dd884', 'DateHold', 'Proposed', 'aa545fd3-e827-40d0-a017-1d35b5f42aa9', '2026-01-31 15:28:59.697169+00');
INSERT INTO gig_status_history (id, gig_id, from_status, to_status, changed_by, changed_at) VALUES ('c0f890e0-e1b9-4652-a91e-a68594a9c308', 'c65a2ec2-7897-473b-97c7-562ae34dd884', 'Proposed', 'DateHold', 'aa545fd3-e827-40d0-a017-1d35b5f42aa9', '2026-02-02 00:18:21.797014+00');
INSERT INTO gig_status_history (id, gig_id, from_status, to_status, changed_by, changed_at) VALUES ('10dae8ff-46ef-4768-941c-219ef9f9f929', 'c65a2ec2-7897-473b-97c7-562ae34dd884', 'DateHold', 'Completed', 'aa545fd3-e827-40d0-a017-1d35b5f42aa9', '2026-02-02 00:19:59.0062+00');
INSERT INTO gig_status_history (id, gig_id, from_status, to_status, changed_by, changed_at) VALUES ('11b13ede-3e3b-4c97-af75-423b695e96f1', 'c65a2ec2-7897-473b-97c7-562ae34dd884', 'Completed', 'Booked', 'aa545fd3-e827-40d0-a017-1d35b5f42aa9', '2026-02-02 00:20:01.064089+00');
INSERT INTO gig_status_history (id, gig_id, from_status, to_status, changed_by, changed_at) VALUES ('00f66b85-6394-4488-9908-58d6f474ec1a', 'c65a2ec2-7897-473b-97c7-562ae34dd884', 'Booked', 'Proposed', 'aa545fd3-e827-40d0-a017-1d35b5f42aa9', '2026-02-02 00:20:02.818206+00');
INSERT INTO gig_status_history (id, gig_id, from_status, to_status, changed_by, changed_at) VALUES ('accb8667-7581-4433-8fe7-abe5bafcde7e', 'c65a2ec2-7897-473b-97c7-562ae34dd884', 'Proposed', 'Cancelled', 'aa545fd3-e827-40d0-a017-1d35b5f42aa9', '2026-02-02 00:20:04.672328+00');
INSERT INTO gig_status_history (id, gig_id, from_status, to_status, changed_by, changed_at) VALUES ('b75c5bcf-5c17-48b4-81c8-6a1b70f72f3b', 'c65a2ec2-7897-473b-97c7-562ae34dd884', 'Cancelled', 'Settled', 'aa545fd3-e827-40d0-a017-1d35b5f42aa9', '2026-02-02 00:20:06.524015+00');
INSERT INTO gig_status_history (id, gig_id, from_status, to_status, changed_by, changed_at) VALUES ('5f7485c5-06d3-4d67-832f-ab5d5f846072', 'c65a2ec2-7897-473b-97c7-562ae34dd884', 'Settled', 'DateHold', 'aa545fd3-e827-40d0-a017-1d35b5f42aa9', '2026-02-02 00:20:08.795023+00');
INSERT INTO gig_status_history (id, gig_id, from_status, to_status, changed_by, changed_at) VALUES ('a4fa0684-a4ad-4a0f-a935-d1281230b018', 'c65a2ec2-7897-473b-97c7-562ae34dd884', 'DateHold', 'Proposed', 'aa545fd3-e827-40d0-a017-1d35b5f42aa9', '2026-02-02 04:06:40.099092+00');


--
-- Data for Name: invitations; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO invitations (id, organization_id, email, role, invited_by, status, token, expires_at, accepted_at, accepted_by, created_at, updated_at) VALUES ('69ff04d1-ec19-46e8-a497-b48ef473079f', '09fca024-b5c1-4f81-a71b-a68361548948', 'cameron.orourke+colin@gmail.com', 'Staff', 'aa545fd3-e827-40d0-a017-1d35b5f42aa9', 'accepted', '17c677af-8fad-4293-ac62-70b0cef49f67', '2026-02-10 02:19:16.907593+00', '2026-02-03 02:19:43.546749+00', NULL, '2026-02-03 02:19:16.907593+00', '2026-02-03 02:19:16.907593+00');
INSERT INTO invitations (id, organization_id, email, role, invited_by, status, token, expires_at, accepted_at, accepted_by, created_at, updated_at) VALUES ('84c60577-a434-49bd-ad27-2d0db3dfdaa6', '6e94b1e8-503a-4638-9f5e-deed9dbcee72', 'cameron.orourke+sam@gmail.com', 'Staff', '02c16e23-7859-491e-8788-84f4066f2f40', 'accepted', '5f853f1e-532d-44a8-a9a7-05d164c6b685', '2026-02-10 03:53:39.931294+00', '2026-02-03 04:00:05.397165+00', '6dd4ab14-a3b0-402e-be1a-b50ffcb89fb2', '2026-02-03 03:53:39.931294+00', '2026-02-03 03:53:39.931294+00');
INSERT INTO invitations (id, organization_id, email, role, invited_by, status, token, expires_at, accepted_at, accepted_by, created_at, updated_at) VALUES ('1bcd3761-d4e1-4760-a1c1-bf47c4cee03f', '09fca024-b5c1-4f81-a71b-a68361548948', 'cameron.orourke+matt@gmail.com', 'Staff', 'aa545fd3-e827-40d0-a017-1d35b5f42aa9', 'accepted', '2c4fd1d9-fe1e-4dcf-8986-4336a8aabb48', '2026-02-10 20:41:54.795639+00', '2026-02-03 20:42:13.362056+00', '016b9cc5-3f46-47b2-ad42-9e6a090fe278', '2026-02-03 20:41:54.795639+00', '2026-02-03 20:41:54.795639+00');
INSERT INTO invitations (id, organization_id, email, role, invited_by, status, token, expires_at, accepted_at, accepted_by, created_at, updated_at) VALUES ('e44d7124-888a-46e1-9fda-2419112e775d', '09fca024-b5c1-4f81-a71b-a68361548948', 'cameron.orourke+joe@gmail.com', 'Staff', 'aa545fd3-e827-40d0-a017-1d35b5f42aa9', 'accepted', 'ad72d9ac-700f-4066-9c3a-e16368ea038f', '2026-02-11 07:16:29.767485+00', '2026-02-04 07:18:55.653133+00', '54eb084b-a81b-4c13-bdd8-a9f450351eac', '2026-02-04 07:16:29.767485+00', '2026-02-04 07:16:29.767485+00');
INSERT INTO invitations (id, organization_id, email, role, invited_by, status, token, expires_at, accepted_at, accepted_by, created_at, updated_at) VALUES ('5f3aeeb8-0206-4f92-956c-df028b37d139', '09fca024-b5c1-4f81-a71b-a68361548948', 'cameron.orourke+colin@gmail.com', 'Staff', 'aa545fd3-e827-40d0-a017-1d35b5f42aa9', 'pending', 'd3eeb422-fc70-4f88-88c5-1da41301cbd0', '2026-02-11 16:42:47.057524+00', NULL, NULL, '2026-02-04 16:42:47.057524+00', '2026-02-04 16:42:47.057524+00');


--
-- Data for Name: kit_assets; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO kit_assets (id, kit_id, asset_id, quantity, notes, created_at) VALUES ('e6b56d95-9584-4d1c-8f95-0c347e920ee5', '4bd24cfb-9987-46d0-81c6-aa3f228cde5d', '10d36935-c6e6-4072-8906-c755d5cbd9d9', '4', NULL, '2026-01-31 06:48:25.940818+00');
INSERT INTO kit_assets (id, kit_id, asset_id, quantity, notes, created_at) VALUES ('c4e75592-2e85-41ba-89f0-6a2551331b90', '03f2ff8e-9ebf-421d-bd6c-d5b597fa44be', '800e1842-ce2c-454b-a6ea-b458a564f8ba', '2', NULL, '2026-01-31 16:53:09.056263+00');
INSERT INTO kit_assets (id, kit_id, asset_id, quantity, notes, created_at) VALUES ('8bbad1aa-ec5e-4498-bd2d-1daf8155dca4', '03f2ff8e-9ebf-421d-bd6c-d5b597fa44be', 'ecd5f7b2-c1c2-40fe-91eb-9820eefcfa00', '2', NULL, '2026-01-31 16:53:09.056263+00');


--
-- Data for Name: kv_store_de012ad4; Type: TABLE DATA; Schema: public; Owner: postgres
--




--
-- PostgreSQL database dump complete
--

-- \unrestrict 8kR3whH0nsQx8seZ9w7K78p3rdghcINuY6s50zGbHLag6OaOyTiyd0lGsMLbIOO

RESET ALL;
