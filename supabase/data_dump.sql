SET session_replication_role = replica;

--
-- PostgreSQL database dump
--

-- \restrict mbY1uY9Qhzj6pfTmxcu6Obp0dJLa6TJHdTYFBOzGna8SkGE7am3nUU9Wlh1rQGU

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

COPY "public"."organizations" ("id", "name", "type", "url", "phone_number", "address_line1", "address_line2", "city", "state", "postal_code", "country", "description", "allowed_domains", "created_at", "updated_at") FROM stdin;
3f029deb-55fe-4956-b41e-a44cfda7cd99	Smith Productions	Production	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2025-11-05 21:36:21.25698+00	2025-11-05 21:36:21.25698+00
d82d53cf-4682-4778-a2af-06ae74769fe4	Central Park Amphitheater	Venue	\N	\N	\N	\N	Los Angeles	CA	\N	USA	\N	\N	2025-11-11 05:49:03.436147+00	2025-11-11 05:49:03.436147+00
155ee642-6640-445e-bfae-b88f65a43c9c	Grand Ballroom Hotel	Venue	\N	\N	\N	\N	New York	NY	\N	USA	\N	\N	2025-11-11 05:49:03.436147+00	2025-11-11 05:49:03.436147+00
5c215d0b-44d9-4e4b-9b5d-d906aece60b6	Lakeside Garden Venue	Venue	\N	\N	\N	\N	Chicago	IL	\N	USA	\N	\N	2025-11-11 05:49:03.436147+00	2025-11-11 05:49:03.436147+00
b26965c5-86a9-433b-af66-fe762f9c3290	The Blue Note Jazz Club	Venue	\N	\N	\N	\N	New York	NY	\N	USA	\N	\N	2025-11-11 05:49:03.436147+00	2025-11-11 05:49:03.436147+00
aea5fe93-9934-4146-bdb7-59539ec18427	Metropolitan Center	Venue	\N	\N	\N	\N	Chicago	IL	\N	USA	\N	\N	2025-11-11 05:49:03.436147+00	2025-11-11 05:49:03.436147+00
d15db3e1-d8be-466f-90ac-c7e4a86b0a09	Red Rocks Amphitheatre	Venue	\N	\N	\N	\N	Morrison	CO	\N	USA	\N	\N	2025-11-11 05:49:03.436147+00	2025-11-11 05:49:03.436147+00
ac5f45a4-fa86-45e6-9661-e85493417f99	Radio City Music Hall	Venue	\N	\N	\N	\N	New York	NY	\N	USA	\N	\N	2025-11-11 05:49:03.436147+00	2025-11-11 05:49:03.436147+00
b02bb530-77d1-4f29-8b32-dc7a69f1e3ef	The Greek Theatre	Venue	\N	\N	\N	\N	Los Angeles	CA	\N	USA	\N	\N	2025-11-11 05:49:03.436147+00	2025-11-11 05:49:03.436147+00
0273bdfa-6090-4acd-ba8b-6a790cc5fcf7	The Fillmore	Venue	\N	\N	\N	\N	San Francisco	CA	\N	USA	\N	\N	2025-11-11 05:49:03.436147+00	2025-11-11 05:49:03.436147+00
9e253369-26be-4889-bc31-2b4f7b3df404	House of Blues	Venue	\N	\N	\N	\N	Boston	MA	\N	USA	\N	\N	2025-11-11 05:49:03.436147+00	2025-11-11 05:49:03.436147+00
789248bc-07be-41d1-9d93-3bde0905c452	Sarah Johnson Quartet	Act	\N	\N	\N	\N	New York	NY	\N	USA	\N	\N	2025-11-11 05:49:55.425261+00	2025-11-11 05:49:55.425261+00
03f9b748-a78b-4f27-9efc-1c31fdbde8c6	Electric Dreams Band	Act	\N	\N	\N	\N	Los Angeles	CA	\N	USA	\N	\N	2025-11-11 05:49:55.425261+00	2025-11-11 05:49:55.425261+00
aab639ff-92fa-4ac0-a9b5-cb74146f27ac	Jazz Collective	Act	\N	\N	\N	\N	Chicago	IL	\N	USA	\N	\N	2025-11-11 05:49:55.425261+00	2025-11-11 05:49:55.425261+00
a7b133e1-a8ab-45c5-b6b0-50438e6f5df4	The Acoustic Sessions	Act	\N	\N	\N	\N	Austin	TX	\N	USA	\N	\N	2025-11-11 05:49:55.425261+00	2025-11-11 05:49:55.425261+00
f74cf4ff-8125-4f22-954c-dbff03bfd494	Symphony Orchestra	Act	\N	\N	\N	\N	Boston	MA	\N	USA	\N	\N	2025-11-11 05:49:55.425261+00	2025-11-11 05:49:55.425261+00
1be9bec6-d721-4d56-a847-c9e4153adfed	Rock Revolution	Act	\N	\N	\N	\N	Seattle	WA	\N	USA	\N	\N	2025-11-11 05:49:55.425261+00	2025-11-11 05:49:55.425261+00
553f5e86-78d1-4bfe-9ca6-b6890637e257	Country Roads Trio	Act	\N	\N	\N	\N	Nashville	TN	\N	USA	\N	\N	2025-11-11 05:49:55.425261+00	2025-11-11 05:49:55.425261+00
ddd4dc3c-ce64-48fc-a9c6-0bcbfe61f68c	The Blues Brothers Tribute	Act	\N	\N	\N	\N	Chicago	IL	\N	USA	\N	\N	2025-11-11 05:49:55.425261+00	2025-11-11 05:49:55.425261+00
017dae2c-6db3-447a-bbd3-be2ec14c3eff	Soundwave Productions	Production	https://soundwaveprod.com	\N	\N	\N	Los Angeles	CA	\N	USA	\N	\N	2025-11-11 05:49:55.425261+00	2025-11-11 05:49:55.425261+00
7d823aa7-55e1-4e18-9b86-0405043732c4	Lumina Lighting Co.	Lighting	https://luminalighting.com	\N	\N	\N	Nashville	TN	\N	USA	\N	\N	2025-11-11 05:49:55.425261+00	2025-11-11 05:49:55.425261+00
ac3e1208-6a6e-4814-a244-17e92c584b0b	ProStage Rentals	Staging	\N	\N	\N	\N	Chicago	IL	\N	USA	\N	\N	2025-11-11 05:49:55.425261+00	2025-11-11 05:49:55.425261+00
9f60c1f7-a4b2-499b-802c-46ef4ba552f5	Elite Sound Systems	Sound	\N	\N	\N	\N	New York	NY	\N	USA	\N	\N	2025-11-11 05:49:55.425261+00	2025-11-11 05:49:55.425261+00
07b92342-c677-4d7a-8988-b8ae49f7aaef	Brilliance Lighting	Lighting	\N	\N	\N	\N	Los Angeles	CA	\N	USA	\N	\N	2025-11-11 05:49:55.425261+00	2025-11-11 05:49:55.425261+00
6e94b1e8-503a-4638-9f5e-deed9dbcee72	Milbourne Sound	Sound	https://www.milbourne.com/	925 555-5555	3225 Sun Valley Avenue	\N	Walnut Creek	CA	94597	United States	\N	milbourne.com	2025-11-06 04:51:38.617986+00	2025-11-15 04:29:57.907366+00
9130b451-1474-4dda-8549-39713313a3b3	Classical Ensemble	Act	\N	\N	1234 Main	\N	Philadelphia	PA	\N	USA	\N	\N	2025-11-11 05:49:55.425261+00	2025-11-16 06:35:56.624249+00
09fca024-b5c1-4f81-a71b-a68361548948	Act4Audio	Sound	https://act4audio.com	\N	\N	\N	\N	\N	\N	\N	\N	act4audio.com	2025-11-16 06:36:49.616038+00	2025-11-16 06:36:49.616038+00
\.


--
-- Data for Name: assets; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."assets" ("id", "organization_id", "acquisition_date", "vendor", "cost", "category", "sub_category", "insurance_policy_added", "manufacturer_model", "type", "serial_number", "description", "replacement_value", "created_by", "updated_by", "created_at", "updated_at", "insurance_class", "quantity") FROM stdin;
800e1842-ce2c-454b-a6ea-b458a564f8ba	09fca024-b5c1-4f81-a71b-a68361548948	2025-08-03	Pro Audio World	2200.00	Audio	Speakers	t	RCF NX 932-A	Powered Speaker	\N	This is a _great_ speaker!	2300.00	7e7e8ad7-6951-4dc4-8310-eff2f1b30060	7e7e8ad7-6951-4dc4-8310-eff2f1b30060	2025-11-13 07:05:38.800809+00	2025-11-16 15:25:10.554613+00	E	2
\.


--
-- Data for Name: gigs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."gigs" ("id", "title", "status", "tags", "start", "end", "timezone", "amount_paid", "notes", "created_by", "updated_by", "created_at", "updated_at", "parent_gig_id", "hierarchy_depth") FROM stdin;
c65a2ec2-7897-473b-97c7-562ae34dd884	Jazz at the Met	Proposed	{Concert}	2025-11-21 04:00:00+00	2035-11-22 06:30:00+00	America/Los_Angeles	\N	\N	7e7e8ad7-6951-4dc4-8310-eff2f1b30060	d0a35726-0993-40b4-b41d-c61806a4670e	2025-11-14 04:39:07.492886+00	2025-11-17 17:22:31.566542+00	\N	0
\.


--
-- Data for Name: gig_bids; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."gig_bids" ("id", "gig_id", "amount", "date_given", "result", "notes", "created_by", "created_at", "organization_id") FROM stdin;
06ec1d73-8665-4ee8-9cc0-fbc2c417ccf2	c65a2ec2-7897-473b-97c7-562ae34dd884	3000.00	2025-11-16	Pending	BBid de	d0a35726-0993-40b4-b41d-c61806a4670e	2025-11-17 07:09:22.958781+00	09fca024-b5c1-4f81-a71b-a68361548948
\.


--
-- Data for Name: kits; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."kits" ("id", "organization_id", "name", "category", "description", "tags", "created_by", "updated_by", "created_at", "updated_at", "tag_number", "rental_value") FROM stdin;
84902571-af89-4863-b9f7-2550316e8a15	09fca024-b5c1-4f81-a71b-a68361548948	RCF Speaker Kit	Audio	\N	{}	7e7e8ad7-6951-4dc4-8310-eff2f1b30060	7e7e8ad7-6951-4dc4-8310-eff2f1b30060	2025-11-13 07:16:52.322656+00	2025-11-16 15:25:28.064486+00	A4-PA001	450.00
\.


--
-- Data for Name: gig_kit_assignments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."gig_kit_assignments" ("id", "organization_id", "gig_id", "kit_id", "notes", "assigned_by", "assigned_at") FROM stdin;
cb10c51a-7cb9-414a-a673-3cb7eb90aea4	09fca024-b5c1-4f81-a71b-a68361548948	c65a2ec2-7897-473b-97c7-562ae34dd884	84902571-af89-4863-b9f7-2550316e8a15	Kit	d0a35726-0993-40b4-b41d-c61806a4670e	2025-11-17 07:08:11.453358+00
\.


--
-- Data for Name: gig_participants; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."gig_participants" ("id", "gig_id", "organization_id", "role", "notes") FROM stdin;
af655822-b1fb-4fb8-94c2-ed458f76e806	c65a2ec2-7897-473b-97c7-562ae34dd884	6e94b1e8-503a-4638-9f5e-deed9dbcee72	Sound	\N
9f0ad7db-6fc7-4bae-b550-4709c7fe79af	c65a2ec2-7897-473b-97c7-562ae34dd884	aab639ff-92fa-4ac0-a9b5-cb74146f27ac	Act	\N
4287b960-8295-4405-a237-d1017f4961c5	c65a2ec2-7897-473b-97c7-562ae34dd884	aea5fe93-9934-4146-bdb7-59539ec18427	Venue	\N
e079d52d-14c3-4335-89af-24614d5f4ac0	c65a2ec2-7897-473b-97c7-562ae34dd884	3f029deb-55fe-4956-b41e-a44cfda7cd99	Staging	\N
3a750fe5-fd7a-4a83-9ff5-2bab5c433d6d	c65a2ec2-7897-473b-97c7-562ae34dd884	09fca024-b5c1-4f81-a71b-a68361548948	Lighting	\N
\.


--
-- Data for Name: staff_roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."staff_roles" ("id", "name", "description", "created_at", "updated_at") FROM stdin;
d22f9ff8-6afa-48b9-afaf-7ebf63d7bc38	FOH	Front of House - Sound engineer managing audience-facing audio	2025-11-05 20:33:00.708967+00	2025-11-05 20:33:00.708967+00
5bcb1e1b-32b9-4d16-9489-bff30f02f004	Monitor	Monitor Engineer - Manages on-stage audio for performers	2025-11-05 20:33:00.708967+00	2025-11-05 20:33:00.708967+00
703d81a2-595a-4cca-aef7-e66efb2390e8	Lighting	Lighting Technician - Operates and designs lighting systems	2025-11-05 20:33:00.708967+00	2025-11-05 20:33:00.708967+00
ef13bc30-5bdd-4569-b303-0849730ad213	Stage	Stage Manager - Coordinates all stage activities and crew	2025-11-05 20:33:00.708967+00	2025-11-05 20:33:00.708967+00
ffc2d1a9-7b6e-4048-860c-e9c87db05db0	CameraOp	Camera Operator - Operates video cameras for live production	2025-11-05 20:33:00.708967+00	2025-11-05 20:33:00.708967+00
9509f5d2-9f1d-4a95-9764-720f6494a095	Video	Video Engineer - Manages video switching and routing	2025-11-05 20:33:00.708967+00	2025-11-05 20:33:00.708967+00
8c06c29e-cc06-4e64-aef9-823de8545968	Rigger	Rigger - Installs and maintains rigging systems	2025-11-05 20:33:00.708967+00	2025-11-05 20:33:00.708967+00
b902b99d-07e9-4741-896d-1c65a4f985e0	Loader	Loader - Assists with loading and unloading equipment	2025-11-05 20:33:00.708967+00	2025-11-05 20:33:00.708967+00
3e95074d-350e-4807-8cfe-565fce0757cc	Runner	Runner - General support and errands during production	2025-11-05 20:33:00.708967+00	2025-11-05 20:33:00.708967+00
\.


--
-- Data for Name: gig_staff_slots; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."gig_staff_slots" ("id", "gig_id", "staff_role_id", "required_count", "notes", "created_at", "updated_at", "organization_id") FROM stdin;
cbde0a46-3125-4b19-b965-c4f90c834761	c65a2ec2-7897-473b-97c7-562ae34dd884	d22f9ff8-6afa-48b9-afaf-7ebf63d7bc38	1	\N	2025-11-15 20:54:35.547941+00	2025-11-17 17:22:33.162817+00	09fca024-b5c1-4f81-a71b-a68361548948
791cad72-802e-4dec-a055-14c5660054bb	c65a2ec2-7897-473b-97c7-562ae34dd884	ef13bc30-5bdd-4569-b303-0849730ad213	1	\N	2025-11-17 07:07:14.735054+00	2025-11-17 17:22:33.479016+00	09fca024-b5c1-4f81-a71b-a68361548948
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."users" ("id", "email", "first_name", "last_name", "phone", "avatar_url", "address_line1", "address_line2", "city", "state", "postal_code", "country", "role_hint", "created_at", "updated_at", "user_status") FROM stdin;
7e7e8ad7-6951-4dc4-8310-eff2f1b30060	cameron.orourke+mark@gmail.com	Mark	Milbourne	\N	\N	\N	\N	\N	\N	\N	\N	\N	2025-11-06 01:02:51.178587+00	2025-11-06 01:02:51.178587+00	active
1d9bdc13-cae3-437b-83ec-ae5359fbc3a8	cameron.orourke+john@gmail.com	John	Smith									\N	2025-11-05 21:34:54.008103+00	2025-11-16 19:53:26.331787+00	active
d0a35726-0993-40b4-b41d-c61806a4670e	cameron.orourke@gmail.com	Cameron	"O'Rourke"	925 858-0411		24 Lynnbrook Ct	 	San Ramon	CA	94582		\N	2025-11-16 06:34:54.751247+00	2025-11-17 05:13:01.299607+00	active
\.


--
-- Data for Name: gig_staff_assignments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."gig_staff_assignments" ("id", "slot_id", "user_id", "status", "rate", "fee", "notes", "assigned_at", "confirmed_at") FROM stdin;
677c6fbf-6ea5-49f7-a0be-4462485b8ea4	cbde0a46-3125-4b19-b965-c4f90c834761	7e7e8ad7-6951-4dc4-8310-eff2f1b30060	Requested	\N	300.00	\N	2025-11-15 20:54:35.779418+00	\N
\.


--
-- Data for Name: gig_status_history; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."gig_status_history" ("id", "gig_id", "from_status", "to_status", "changed_by", "changed_at") FROM stdin;
24eb9347-7a13-40e3-87b4-2a5ccf2c318c	c65a2ec2-7897-473b-97c7-562ae34dd884	DateHold	Proposed	1d9bdc13-cae3-437b-83ec-ae5359fbc3a8	2025-11-15 16:09:19.629417+00
\.


--
-- Data for Name: invitations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."invitations" ("id", "organization_id", "email", "role", "invited_by", "status", "token", "expires_at", "accepted_at", "accepted_by", "created_at", "updated_at") FROM stdin;
\.


--
-- Data for Name: kit_assets; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."kit_assets" ("id", "kit_id", "asset_id", "quantity", "notes", "created_at") FROM stdin;
2981982c-d5e6-44b1-9c9b-9433b8b21382	84902571-af89-4863-b9f7-2550316e8a15	800e1842-ce2c-454b-a6ea-b458a564f8ba	2	\N	2025-11-13 07:16:52.477456+00
\.


--
-- Data for Name: kv_store_de012ad4; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."kv_store_de012ad4" ("key", "value") FROM stdin;
\.


--
-- Data for Name: organization_members; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."organization_members" ("id", "organization_id", "user_id", "role", "created_at", "default_staff_role_id") FROM stdin;
56143586-45c6-48b0-8fa7-a823f6833cfb	6e94b1e8-503a-4638-9f5e-deed9dbcee72	7e7e8ad7-6951-4dc4-8310-eff2f1b30060	Admin	2025-11-06 04:51:38.870943+00	\N
0a059ddd-9897-430a-94aa-5673583dadb0	3f029deb-55fe-4956-b41e-a44cfda7cd99	7e7e8ad7-6951-4dc4-8310-eff2f1b30060	Manager	2025-11-15 20:58:14.493608+00	\N
2cdcecb4-d9ec-45d4-a36e-b85d7b0b3def	3f029deb-55fe-4956-b41e-a44cfda7cd99	1d9bdc13-cae3-437b-83ec-ae5359fbc3a8	Admin	2025-11-05 21:36:21.41479+00	\N
6013b9ad-cbe6-4075-a7ea-75ccfb78dc14	09fca024-b5c1-4f81-a71b-a68361548948	d0a35726-0993-40b4-b41d-c61806a4670e	Admin	2025-11-16 06:36:49.697096+00	\N
7df13091-4a34-4395-94d5-2e0060be8851	6e94b1e8-503a-4638-9f5e-deed9dbcee72	d0a35726-0993-40b4-b41d-c61806a4670e	Viewer	2025-11-16 19:55:38.334627+00	\N
\.


--
-- PostgreSQL database dump complete
--

-- \unrestrict mbY1uY9Qhzj6pfTmxcu6Obp0dJLa6TJHdTYFBOzGna8SkGE7am3nUU9Wlh1rQGU

RESET ALL;
