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
89b01570-f201-4939-abc0-bae126d12577	The Band	Act	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-02-04 20:00:59.115967+00	2026-02-04 20:00:59.115967+00
6bc48db4-2a7f-4cd3-9407-f40b8e4985fb	Venue Name	Venue	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-02-04 20:00:59.545456+00	2026-02-04 20:00:59.545456+00
632d52f1-1aac-4810-ae76-35ccee4e3866	Spazmatics	Act	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-02-07 07:54:17.491531+00	2026-02-07 07:54:17.491531+00
63fd3d39-d132-425f-88c6-e7c4c77deef7	Dan's Irish Pub	Venue	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-02-07 07:54:18.068132+00	2026-02-07 07:54:18.068132+00
c331394f-73f9-4ec2-938a-282da1378f9a	New Band	Act	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-02-07 10:02:42.914721+00	2026-02-07 10:02:42.914721+00
c0fcc02c-c3d2-46ad-87d3-b12bf3af0f90	New Venue	Venue	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-02-07 10:02:43.292784+00	2026-02-07 10:02:43.292784+00
ba9ff468-e4b8-4f62-953e-040bc0ec416d	Midnight Reruns	Act	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-02-09 05:18:57.223714+00	2026-02-09 05:18:57.223714+00
0e39fd33-f09e-4f3e-b225-a7f71192c10f	Meenar's Music Club	Venue	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-02-09 05:18:57.664447+00	2026-02-09 05:18:57.664447+00
828d89b5-34c4-4375-9cc5-0e8578189df2	Private	Venue	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-02-09 05:18:58.599243+00	2026-02-09 05:18:58.599243+00
1a819eac-9538-4464-956e-1d4bca313e4e	Blue Valley	Act	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-02-09 05:18:59.182013+00	2026-02-09 05:18:59.182013+00
ddd467b5-cd8a-4bb4-99a9-556dace68065	Las Positas Winery	Venue	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-02-09 05:18:59.570165+00	2026-02-09 05:18:59.570165+00
cd8a7ac1-70b0-45dc-bbeb-cfae46536d29	Mixed Nuts	Act	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-02-09 05:19:00.594977+00	2026-02-09 05:19:00.594977+00
825a133a-fef7-4bf8-974c-f429845269ce	Pleasant Hill Community Center	Venue	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-02-09 05:19:00.951794+00	2026-02-09 05:19:00.951794+00
99693fdc-ecd5-49b7-aa95-9caa7e0431a0	Revive	Act	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-02-09 05:19:01.729263+00	2026-02-09 05:19:01.729263+00
cb833228-88c7-4245-a184-d365e4fdb40d	Creekside Community Church	Venue	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-02-09 05:19:02.092592+00	2026-02-09 05:19:02.092592+00
c8bd84bd-64a1-4866-89dd-c32473bfde5c	Robert, Music	Act	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-02-09 05:19:02.863302+00	2026-02-09 05:19:02.863302+00
6bac75a5-acde-445c-9bab-b7bb049952e2	Pioneer Saloon	Venue	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-02-09 05:19:03.187722+00	2026-02-09 05:19:03.187722+00
9ced396d-5cb2-4835-9f1e-66ba3f741406	Norm's Place	Venue	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-02-09 05:19:03.75083+00	2026-02-09 05:19:03.75083+00
21ca7612-aab0-4c00-be33-aaeab172a906	Lafayette Theatre	Venue	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-02-09 05:19:04.313469+00	2026-02-09 05:19:04.313469+00
b921586b-68a2-4373-8b7c-eeb4d2ef0b8c	Fleetwood Macrame	Act	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-02-09 05:19:05.04434+00	2026-02-09 05:19:05.04434+00
6c03ce1a-e6e9-4c08-a42e-f225b7f708ff	Neon Velvet	Act	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-02-09 05:19:05.611679+00	2026-02-09 05:19:05.611679+00
fbe26d6b-6835-474c-b972-b7d36fdd6114	Gold Bar Whiskey Distillery Tasting Room	Venue	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-02-09 05:19:06.176007+00	2026-02-09 05:19:06.176007+00
62fe8870-8608-4e44-b6bf-8eef1c0cb75d	Hazy BBQ	Venue	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-02-09 05:19:06.724539+00	2026-02-09 05:19:06.724539+00
ba1084b2-abaf-4980-87d2-23deb87985ce	Milbourne Sound	Act	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-02-09 05:19:07.471529+00	2026-02-09 05:19:07.471529+00
b6b330b9-80c9-4352-ac2e-ed395d84c161	Walnut Creek Art-n-Wine	Venue	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-02-09 05:19:07.760836+00	2026-02-09 05:19:07.760836+00
bf545f52-cf50-4d82-975f-855ddcb0a8ce	Redwood City Music	Venue	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-02-09 05:19:08.520681+00	2026-02-09 05:19:08.520681+00
afebf956-8d10-4a2b-a20f-0f2ba9a44631	Earth, Wind & Fire	Act	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-02-09 05:19:09.16627+00	2026-02-09 05:19:09.16627+00
540fa944-fce5-4b06-bbf0-5a2418382883	Fox Theatre	Venue	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-02-09 05:19:09.513274+00	2026-02-09 05:19:09.513274+00
2a045a3f-81df-44a4-8b94-76839c2fa32c	Cheeseballs	Act	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-02-09 05:19:10.015454+00	2026-02-09 05:19:10.015454+00
b2da5b8b-92ec-43f0-9d3f-788db837d067	Fremont Pacific Commons	Venue	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-02-09 05:19:10.35881+00	2026-02-09 05:19:10.35881+00
c2bb6085-e647-4a76-b5f1-6a81d21577ed	Grrlztalk	Act	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-02-09 05:19:11.038717+00	2026-02-09 05:19:11.038717+00
b82328b3-98fe-4db7-964b-b5455e492108	Orinda Community Park	Venue	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-02-09 05:19:11.410753+00	2026-02-09 05:19:11.410753+00
c9761b46-01a7-40dc-bbf2-1d6f034c4707	Hipster Cocktail Party	Act	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-02-09 05:19:12.416735+00	2026-02-09 05:19:12.416735+00
eafca38d-1b02-4572-a287-19c884bc5dd9	Patron Latin Band	Act	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-02-09 05:19:13.380793+00	2026-02-09 05:19:13.380793+00
ba7694d3-7b0e-4bfb-bdad-e21ed05a020b	Round Hill Country Club	Venue	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-02-09 05:19:13.827268+00	2026-02-09 05:19:13.827268+00
1e8b6859-2ac8-470d-be50-8b83c93cdfaa	Vintage Jukebox	Act	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-02-09 05:19:14.597264+00	2026-02-09 05:19:14.597264+00
2bd018a4-6348-4a85-b78d-4446b5107234	SF Cruise Boat	Venue	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-02-09 05:19:15.152823+00	2026-02-09 05:19:15.152823+00
00d50a2a-9c93-409f-8f7a-f4a0677f0451	Private	Act	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-02-09 05:19:15.693915+00	2026-02-09 05:19:15.693915+00
0dc59bb2-b3d4-4d48-86ce-809ec957cfd1	Bridges Golf Club	Venue	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-02-09 05:19:16.020304+00	2026-02-09 05:19:16.020304+00
27e5d12f-0843-4fab-9368-e24077d31d94	Last One Picked	Act	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-02-09 05:19:16.547685+00	2026-02-09 05:19:16.547685+00
fcb7020e-1341-42cb-b6ea-f6423f318055	Diablo Country Club	Venue	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-02-09 05:19:17.15059+00	2026-02-09 05:19:17.15059+00
93544cfe-c4d8-4566-8748-b3964a56cabb	Del Valle Winery	Venue	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-02-09 05:19:17.676264+00	2026-02-09 05:19:17.676264+00
f2427546-4b6c-42f9-aed5-90abfe849f2c	Foreverland	Act	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-02-09 05:19:18.153325+00	2026-02-09 05:19:18.153325+00
c32ae626-73ab-473d-96e8-a5c6eda48c2f	Marriott San Ramon	Venue	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-02-09 05:19:19.030492+00	2026-02-09 05:19:19.030492+00
9611345f-c691-4f43-bba8-76433392a16a	Bray and the Dens	Act	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-02-09 05:19:20.030213+00	2026-02-09 05:19:20.030213+00
cfc55db2-2e8e-4784-98f3-6497566939e5	Club Fox	Venue	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-02-09 05:19:20.387175+00	2026-02-09 05:19:20.387175+00
61a3734a-2c82-4923-8ad4-943e3759fdf3	Redneck Prom	Act	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-02-09 05:19:20.868559+00	2026-02-09 05:19:20.868559+00
8ecffb09-1347-40eb-8923-87f467448087	Auburn	Venue	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-02-09 05:19:21.256479+00	2026-02-09 05:19:21.256479+00
f59fa3ea-aeca-4fa6-b099-42a0deaf06aa	Mike Hess Brewery	Venue	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-02-09 05:19:22.074208+00	2026-02-09 05:19:22.074208+00
e959aeb8-1f0a-41f2-a469-c8ee0f7579c1	Growler	Venue	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-02-09 05:19:23.83073+00	2026-02-09 05:19:23.83073+00
1ab6341b-4f95-4949-8135-814765239612	Various Acts	Act	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-02-09 05:19:24.311122+00	2026-02-09 05:19:24.311122+00
efc6f1e0-c7b2-4604-994a-4ef60b4b0f16	Powerplay	Act	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-02-09 05:19:26.140515+00	2026-02-09 05:19:26.140515+00
f35933a2-5424-425f-b8d2-d84647ff5ba7	Campolindo High School	Venue	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-02-09 05:19:27.356675+00	2026-02-09 05:19:27.356675+00
a58456bc-5bcd-488c-8345-3c3e3d311cbe	Summer Concerts	Act	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-02-09 05:19:28.878681+00	2026-02-09 05:19:28.878681+00
e98bb8af-1346-4cd4-bd13-b5cc86bd70b9	Art & Wine Festival	Act	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-02-09 05:19:31.57217+00	2026-02-09 05:19:31.57217+00
5efa2f7b-f8d3-495a-8da5-56ca58050ea2	Lafayette	Venue	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-02-09 05:19:31.88071+00	2026-02-09 05:19:31.88071+00
\.


--
-- Data for Name: assets; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."assets" ("id", "organization_id", "acquisition_date", "vendor", "cost", "category", "sub_category", "insurance_policy_added", "manufacturer_model", "type", "serial_number", "description", "replacement_value", "insurance_class", "quantity", "created_by", "updated_by", "created_at", "updated_at") FROM stdin;
ecd5f7b2-c1c2-40fe-91eb-9820eefcfa00	09fca024-b5c1-4f81-a71b-a68361548948	2025-05-19	Pro Audio World	2200.00	Audio	Speaker	f	RCF SUB-8003	Powered Subwoofer		RCF Subwoofer, Casters and Cover.	2600.00	E	2	d0a35726-0993-40b4-b41d-c61806a4670e	d0a35726-0993-40b4-b41d-c61806a4670e	2025-11-20 22:25:46.263348+00	2025-11-21 01:45:53.427273+00
10d36935-c6e6-4072-8906-c755d5cbd9d9	09fca024-b5c1-4f81-a71b-a68361548948	2024-01-15	Audio Vendor Inc	94.50	Audio	Microphones	f	Shure SM58	Dynamic Microphone	SN123456	Notes about the asset	100.00	A	2	d0a35726-0993-40b4-b41d-c61806a4670e	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2025-11-21 02:26:12.256834+00	2026-01-31 06:48:48.575459+00
800e1842-ce2c-454b-a6ea-b458a564f8ba	09fca024-b5c1-4f81-a71b-a68361548948	2025-08-03	Pro Audio World	2200.00	Audio	Speaker	f	RCF NX 932-A	Powered Speaker	\N	This is a _great_ speaker!	2200.00	E	2	7e7e8ad7-6951-4dc4-8310-eff2f1b30060	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2025-11-13 07:05:38.800809+00	2026-01-31 14:45:13.202668+00
\.


--
-- Data for Name: gigs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."gigs" ("id", "title", "status", "tags", "start", "end", "timezone", "notes", "parent_gig_id", "hierarchy_depth", "created_by", "updated_by", "created_at", "updated_at") FROM stdin;
892ab327-b80d-4657-b47b-fffbf8750b74	Earth, Wind & Fire @ Fox Theatre 6/26/2025	Completed	{Stage}	2025-06-26 12:00:00+00	2025-06-26 12:00:00+00	America/Los_Angeles	\N	\N	0	aa545fd3-e827-40d0-a017-1d35b5f42aa9	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:41.25944+00	2026-02-09 08:09:41.25944+00
ecd68d89-0a1b-4e45-8208-91bda132a694	Cheeseballs @ Fremont 6/27/2025	Completed	{Stage}	2025-06-27 12:00:00+00	2025-06-27 12:00:00+00	America/Los_Angeles	\N	\N	0	aa545fd3-e827-40d0-a017-1d35b5f42aa9	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:41.62187+00	2026-02-09 08:09:41.62187+00
f9848f9e-9768-4707-8577-ba52c2ba52ba	Midnight Reruns @ Norm's 7/3/2025	Completed	{Lights,PA}	2025-07-03 12:00:00+00	2025-07-03 12:00:00+00	America/Los_Angeles	Loadin: 5pm, SC: 6:30, Set: 8:00	\N	0	aa545fd3-e827-40d0-a017-1d35b5f42aa9	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:41.94913+00	2026-02-09 08:09:41.94913+00
4eb3e09c-f88d-48b9-a0c6-c26532202a80	Grrlztalk @ Orinda Park 7/24/2025	Completed	{PA}	2025-07-24 12:00:00+00	2025-07-24 12:00:00+00	America/Los_Angeles	Mel Speed gig -- He provides FOH speakers.  Needs sound tech and mixer.  2 hours in Orinda 6:00 PM - 8:00 PM (Setup 4pm)	\N	0	aa545fd3-e827-40d0-a017-1d35b5f42aa9	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:42.301334+00	2026-02-09 08:09:42.301334+00
9118bc4a-7794-4ebe-b338-d2e468e0bfc6	Midnight Reruns @ Meenar's 9/14/2024	Completed	{Mixing}	2024-09-14 12:00:00+00	2024-09-14 12:00:00+00	America/Los_Angeles	\N	\N	0	aa545fd3-e827-40d0-a017-1d35b5f42aa9	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:34.022515+00	2026-02-09 08:09:34.022515+00
b59b5e7d-a3a4-4a26-8f4f-55026baa2c21	Midnight Reruns @ Private 10/2/2024	Completed	{Mixing}	2024-10-02 12:00:00+00	2024-10-02 12:00:00+00	America/Los_Angeles	\N	\N	0	aa545fd3-e827-40d0-a017-1d35b5f42aa9	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:34.395651+00	2026-02-09 08:09:34.395651+00
de68c30d-3e29-445a-ae9d-e2fb2819eff4	Blue Valley @ Las Positas 10/11/2024	Completed	{Mixing}	2024-10-11 12:00:00+00	2024-10-11 12:00:00+00	America/Los_Angeles	\N	\N	0	aa545fd3-e827-40d0-a017-1d35b5f42aa9	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:34.764764+00	2026-02-09 08:09:34.764764+00
63f0e500-cc53-4193-81cf-37d3fd0d17db	Blue Valley @ Meenar's 11/16/2024	Completed	{Mixing}	2024-11-16 12:00:00+00	2024-11-16 12:00:00+00	America/Los_Angeles	\N	\N	0	aa545fd3-e827-40d0-a017-1d35b5f42aa9	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:35.080353+00	2026-02-09 08:09:35.080353+00
dafabf70-b8d1-43b7-93dd-f5373ea22256	Blue Valley @ Dan's 12/7/2024	Completed	{Mixing}	2024-12-07 12:00:00+00	2024-12-07 12:00:00+00	America/Los_Angeles	\N	\N	0	aa545fd3-e827-40d0-a017-1d35b5f42aa9	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:35.428865+00	2026-02-09 08:09:35.428865+00
5796bd45-00e7-4d3d-985a-fad7c9d96165	Mixed Nuts @ Pleasant Hill CC 2/22/2025	Completed	{Lights,Mixing,PA}	2025-02-22 12:00:00+00	2025-02-22 12:00:00+00	America/Los_Angeles	\N	\N	0	aa545fd3-e827-40d0-a017-1d35b5f42aa9	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:35.801144+00	2026-02-09 08:09:35.801144+00
2787f16b-d4b0-4476-bb3d-2bcbb1b4cb2b	Spazmatics @ Dan's 2/28/2025	Cancelled	{Cancelled,Lights}	2025-02-28 12:00:00+00	2025-02-28 12:00:00+00	America/Los_Angeles	\N	\N	0	aa545fd3-e827-40d0-a017-1d35b5f42aa9	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:36.159491+00	2026-02-09 08:09:36.159491+00
e80b78d5-1ca8-436d-a2e0-25c7a412bc3d	Revive @ Creekside 3/2/2025	Completed	{Mixing,Revive}	2025-03-02 12:00:00+00	2025-03-02 12:00:00+00	America/Los_Angeles	\N	\N	0	aa545fd3-e827-40d0-a017-1d35b5f42aa9	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:36.492063+00	2026-02-09 08:09:36.492063+00
daca5a7d-b28e-484b-ab6d-851905fbf332	Midnight Reruns @ Meenar's 3/15/2025	Completed	{Lights,PA}	2025-03-15 12:00:00+00	2025-03-15 12:00:00+00	America/Los_Angeles	\N	\N	0	aa545fd3-e827-40d0-a017-1d35b5f42aa9	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:36.724729+00	2026-02-09 08:09:36.724729+00
a6faf07b-6c52-41f9-89ad-d981a6dcc767	Robert, Music @ Pioneer Saloon 3/27/2025	Completed	{Lights,PA}	2025-03-27 12:00:00+00	2025-03-27 12:00:00+00	America/Los_Angeles	\N	\N	0	aa545fd3-e827-40d0-a017-1d35b5f42aa9	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:37.081893+00	2026-02-09 08:09:37.081893+00
bb4b03d7-d200-4730-ab00-82dce5696de2	Midnight Reruns @ Norm's 4/4/2025	Completed	{Lights,PA}	2025-04-04 12:00:00+00	2025-04-04 12:00:00+00	America/Los_Angeles	\N	\N	0	aa545fd3-e827-40d0-a017-1d35b5f42aa9	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:37.425138+00	2026-02-09 08:09:37.425138+00
0d93880b-4c73-4e00-bd43-e94f73b7beee	Spazmatics @ Lafayette Theatre 4/11/2025	Completed	{Stage}	2025-04-11 12:00:00+00	2025-04-11 12:00:00+00	America/Los_Angeles	\N	\N	0	aa545fd3-e827-40d0-a017-1d35b5f42aa9	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:37.747868+00	2026-02-09 08:09:37.747868+00
4b0ac1f6-aff6-4118-83ad-3d4b60fea4aa	Revive @ Creekside 4/18/2025	Completed	{Mixing,Revive}	2025-04-18 12:00:00+00	2025-04-18 12:00:00+00	America/Los_Angeles	\N	\N	0	aa545fd3-e827-40d0-a017-1d35b5f42aa9	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:38.050002+00	2026-02-09 08:09:38.050002+00
d126c89c-c02e-40c7-84a6-378e859bd1d4	Fleetwood Macrame  @ Private 5/3/2025	Completed	{Stage}	2025-05-03 12:00:00+00	2025-05-03 12:00:00+00	America/Los_Angeles	https://docs.google.com/document/d/1Y1BltDjdrXcfsJA_51YTcbg11q4UKG4cRG6o4vus7rI/edit?usp=sharing	\N	0	aa545fd3-e827-40d0-a017-1d35b5f42aa9	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:38.310903+00	2026-02-09 08:09:38.310903+00
429dba77-edf3-42d7-8011-3ecd74066463	Neon Velvet @ Private 5/9/2025	Completed	{Stage}	2025-05-09 12:00:00+00	2025-05-09 12:00:00+00	America/Los_Angeles	\N	\N	0	aa545fd3-e827-40d0-a017-1d35b5f42aa9	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:38.655489+00	2026-02-09 08:09:38.655489+00
736530f1-ac9c-45b1-814e-384102b3d24b	Neon Velvet @ Gold Bar 5/17/2025	Completed	{Stage}	2025-05-17 12:00:00+00	2025-05-17 12:00:00+00	America/Los_Angeles	https://docs.google.com/document/d/1YwkXgtuVZl_lk53TnDHC2lbG5uXzhQNbjnVxlTKaiF4/edit?usp=sharing	\N	0	aa545fd3-e827-40d0-a017-1d35b5f42aa9	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:38.984788+00	2026-02-09 08:09:38.984788+00
1aee5e52-1b9a-41b6-ad68-74988a827014	Midnight Reruns @ Hazy 5/23/2025	Completed	{PA}	2025-05-23 12:00:00+00	2025-05-23 12:00:00+00	America/Los_Angeles	\N	\N	0	aa545fd3-e827-40d0-a017-1d35b5f42aa9	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:39.333404+00	2026-02-09 08:09:39.333404+00
223bb868-3ce8-4ee5-a39b-27016605ddb7	Blue Valley @ Las Positas 5/30/2025	Completed	{Mixing}	2025-05-30 12:00:00+00	2025-05-30 12:00:00+00	America/Los_Angeles	4pm setup, 6pm start, 8:30 hard stop	\N	0	aa545fd3-e827-40d0-a017-1d35b5f42aa9	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:39.618169+00	2026-02-09 08:09:39.618169+00
655e8ad0-f20b-42c8-b9a3-af6cfed9bc97	Milbourne Sound @ WC Art-n-Wine 5/31/2025	Completed	{Mixing}	2025-05-31 12:00:00+00	2025-05-31 12:00:00+00	America/Los_Angeles	\N	\N	0	aa545fd3-e827-40d0-a017-1d35b5f42aa9	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:39.970839+00	2026-02-09 08:09:39.970839+00
aeeb2919-1fb1-403b-b943-ce0e22a9175f	Milbourne Sound @ WC Art-n-Wine 6/1/2025	Completed	{Mixing}	2025-06-01 12:00:00+00	2025-06-01 12:00:00+00	America/Los_Angeles	\N	\N	0	aa545fd3-e827-40d0-a017-1d35b5f42aa9	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:40.257459+00	2026-02-09 08:09:40.257459+00
73aaa3cc-fb44-40c6-89af-bed03146a96d	Neon Velvet @ Redwood City Music 6/13/2025	Completed	{Stage}	2025-06-13 12:00:00+00	2025-06-13 12:00:00+00	America/Los_Angeles	6pm to 8:30	\N	0	aa545fd3-e827-40d0-a017-1d35b5f42aa9	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:40.617252+00	2026-02-09 08:09:40.617252+00
27b08b7c-ca9f-4588-8674-02b85aa18795	Blue Valley @ Hazy 6/14/2025	Completed	{PA}	2025-06-14 12:00:00+00	2025-06-14 12:00:00+00	America/Los_Angeles	\N	\N	0	aa545fd3-e827-40d0-a017-1d35b5f42aa9	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:40.897249+00	2026-02-09 08:09:40.897249+00
d430cabd-f85d-437f-ace2-0d53b567d5d4	Fleetwood Macrame  @ Fremont 7/25/2025	Completed	{Stage}	2025-07-25 12:00:00+00	2025-07-25 12:00:00+00	America/Los_Angeles	\N	\N	0	aa545fd3-e827-40d0-a017-1d35b5f42aa9	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:42.585805+00	2026-02-09 08:09:42.585805+00
5800bc44-2d74-45c2-9aea-6f37f1663c94	Revive @ Creekside 8/2/2025	Completed	{Lights,Mixing,Revive}	2025-08-02 12:00:00+00	2025-08-02 12:00:00+00	America/Los_Angeles	On Lawn	\N	0	aa545fd3-e827-40d0-a017-1d35b5f42aa9	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:42.868806+00	2026-02-09 08:09:42.868806+00
754a8c8f-6571-49a5-bfb9-4cab546b2b52	Hipster Cocktail Party @ Orinda Park 8/7/2025	Completed	{PA}	2025-08-07 12:00:00+00	2025-08-07 12:00:00+00	America/Los_Angeles	Mel Speed gig -- He provides FOH speakers.  Needs sound tech and mixer.  2 hours in Orinda 6:00 PM - 8:00 PM (Setup 4pm)	\N	0	aa545fd3-e827-40d0-a017-1d35b5f42aa9	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:43.142269+00	2026-02-09 08:09:43.142269+00
df03f2e6-f50b-46d6-8f6e-1725c6926509	Midnight Reruns @ Hazy 8/8/2025	Completed	{Lights,PA}	2025-08-08 12:00:00+00	2025-08-08 12:00:00+00	America/Los_Angeles	\N	\N	0	aa545fd3-e827-40d0-a017-1d35b5f42aa9	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:43.445972+00	2026-02-09 08:09:43.445972+00
7168fe81-7290-4daf-8d16-19971965f907	Midnight Reruns @ Private 8/9/2025	Completed	{Lights,PA}	2025-08-09 12:00:00+00	2025-08-09 12:00:00+00	America/Los_Angeles	\N	\N	0	aa545fd3-e827-40d0-a017-1d35b5f42aa9	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:43.766477+00	2026-02-09 08:09:43.766477+00
bc241120-b2af-4439-8373-65ea20929256	Patron Latin Band @ Fremont 8/22/2025	Completed	{Stage}	2025-08-22 12:00:00+00	2025-08-22 12:00:00+00	America/Los_Angeles	\N	\N	0	aa545fd3-e827-40d0-a017-1d35b5f42aa9	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:44.09379+00	2026-02-09 08:09:44.09379+00
01f4f413-70a2-404f-b9a9-c97eb937b5a8	Midnight Reruns @ Round Hill CC 8/23/2025	Completed	{Lights,PA}	2025-08-23 12:00:00+00	2025-08-23 12:00:00+00	America/Los_Angeles	$280 + $30.24 Reimbursement for Van + ($111 of the $213.95 tax reimb)	\N	0	aa545fd3-e827-40d0-a017-1d35b5f42aa9	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:44.417247+00	2026-02-09 08:09:44.417247+00
17147147-5674-47c5-9d82-570e714b2111	Midnight Reruns @ Round Hill CC 8/28/2025	Proposed	{Conflict,PA}	2025-08-28 12:00:00+00	2025-08-28 12:00:00+00	America/Los_Angeles	Acoustic Gig (Nick & Alex)	\N	0	aa545fd3-e827-40d0-a017-1d35b5f42aa9	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:44.706332+00	2026-02-09 08:09:44.706332+00
88c94db7-42b9-456d-b0b7-50cb7737cd80	Vintage Jukebox @ Orinda Park 8/28/2025	Completed	{PA}	2025-08-28 12:00:00+00	2025-08-28 12:00:00+00	America/Los_Angeles	Mel Speed gig -- He provides FOH speakers.  Needs sound tech and mixer.  2 hours in Orinda 6:00 PM - 8:00 PM (Setup 4pm)	\N	0	aa545fd3-e827-40d0-a017-1d35b5f42aa9	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:44.980966+00	2026-02-09 08:09:44.980966+00
c52dbd70-98d9-44cd-913b-decfea646b20	Midnight Reruns @ Diablo CC 9/12/2025	Completed	{Lights,PA}	2025-09-12 12:00:00+00	2025-09-12 12:00:00+00	America/Los_Angeles	PA load in 10:30. Band load in 11:30, soundcheck 12:45, quiet stage 1:30. Band 3 to 5pm. Minimal light setup.	\N	0	aa545fd3-e827-40d0-a017-1d35b5f42aa9	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:46.380578+00	2026-02-09 08:09:46.380578+00
c6beab7e-948a-4d76-a628-9b12e6394226	Milbourne Sound @ SR Marriott 10/2/2025	Completed	{Stage}	2025-10-02 12:00:00+00	2025-10-02 12:00:00+00	America/Los_Angeles	\N	\N	0	aa545fd3-e827-40d0-a017-1d35b5f42aa9	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:47.679134+00	2026-02-09 08:09:47.679134+00
4d2f3b80-1aad-440c-a3d2-4c24fe03727a	Redneck Prom @  10/23/2025	Completed	{Stage}	2025-10-23 12:00:00+00	2025-10-23 12:00:00+00	America/Los_Angeles	Redneck Prom (Auburn)	\N	0	aa545fd3-e827-40d0-a017-1d35b5f42aa9	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:49.040337+00	2026-02-09 08:09:49.040337+00
158843aa-888c-418e-9e2b-cd216d55d56f	Spazmatics @ Dan's 3/20/2026	Booked	{PA,Lights}	2026-03-20 12:00:00+00	2026-03-20 12:00:00+00	America/Los_Angeles	\N	\N	0	aa545fd3-e827-40d0-a017-1d35b5f42aa9	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:52.688724+00	2026-02-09 08:09:52.688724+00
0d2c365d-1404-4b88-ba3a-d79f4669a655	Revive @ Creekside 5/17/2026	Proposed	{Cancelled}	2026-05-17 12:00:00+00	2026-05-17 12:00:00+00	America/Los_Angeles	\N	\N	0	aa545fd3-e827-40d0-a017-1d35b5f42aa9	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:54.492496+00	2026-02-09 08:09:54.492496+00
a518ec75-8fd7-4cea-b2cc-79581c908a92	Milbourne Sound @ Campolindo 5/29/2026	Booked	{Stage}	2026-05-29 12:00:00+00	2026-05-29 12:00:00+00	America/Los_Angeles	High School Graduation	\N	0	aa545fd3-e827-40d0-a017-1d35b5f42aa9	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:54.762068+00	2026-02-09 08:09:54.762068+00
2888be19-92ea-4fb9-9a42-d85ec71265bb	Midnight Reruns @ Hazy 6/12/2026	Booked	{Small}	2026-06-12 12:00:00+00	2026-06-12 12:00:00+00	America/Los_Angeles	Acoustic Gig	\N	0	aa545fd3-e827-40d0-a017-1d35b5f42aa9	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:56.241266+00	2026-02-09 08:09:56.241266+00
9681acd9-588a-4d37-9a73-70e5e8c5a1ed	Spazmatics @ Dan's 8/14/2026	Booked	{PA,Lights}	2026-08-14 12:00:00+00	2026-08-14 12:00:00+00	America/Los_Angeles	\N	\N	0	aa545fd3-e827-40d0-a017-1d35b5f42aa9	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:58.014145+00	2026-02-09 08:09:58.014145+00
f94a88ef-cb13-409e-9138-005f56406e2a	Blue Valley @ Las Positas 10/9/2026	Booked	{Lights,Mixing}	2026-10-09 12:00:00+00	2026-10-09 12:00:00+00	America/Los_Angeles	\N	\N	0	aa545fd3-e827-40d0-a017-1d35b5f42aa9	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:10:00.194201+00	2026-02-09 08:10:00.194201+00
06b0b468-2da2-4b00-8adb-9ea3ad577ba6	Revive @ Creekside 11/15/2026	Booked	{Mixing}	2026-11-15 12:00:00+00	2026-11-15 12:00:00+00	America/Los_Angeles	Thanksgiving Edition	\N	0	aa545fd3-e827-40d0-a017-1d35b5f42aa9	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:10:00.438874+00	2026-02-09 08:10:00.438874+00
47e95e09-7a62-4560-92c5-42448b948f8f	Midnight Reruns @ Norm's 11/20/2026	Booked	{Mixing}	2026-11-20 12:00:00+00	2026-11-20 12:00:00+00	America/Los_Angeles	No gear.	\N	0	aa545fd3-e827-40d0-a017-1d35b5f42aa9	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:10:00.680271+00	2026-02-09 08:10:00.680271+00
cf74f735-ecd2-41cb-8d4e-3a3cf46e18e1	Midnight Reruns @ Meenar's 12/31/2026	Booked	{Lights,PA}	2026-12-31 12:00:00+00	2026-12-31 12:00:00+00	America/Los_Angeles	New Year’s Eve Party	\N	0	aa545fd3-e827-40d0-a017-1d35b5f42aa9	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:10:00.925461+00	2026-02-09 08:10:00.925461+00
571b8639-2e14-43d2-abc1-4dc85698d349	Various Acts @ Private 2/7/2026	Settled	{Small,PA}	2026-02-07 12:00:00+00	2026-02-07 12:00:00+00	America/Los_Angeles	90th Birthday Party	\N	0	aa545fd3-e827-40d0-a017-1d35b5f42aa9	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:51.664331+00	2026-02-09 08:30:56.386843+00
24eabe32-f073-4370-bd5c-fe01e3929679	Neon Velvet @ SF Cruise Boat 9/3/2025	Completed	{Stage}	2025-09-03 12:00:00+00	2025-09-03 12:00:00+00	America/Los_Angeles	4:40 pm Load in, 7:00 pm boat sails, 9:30 pm boat returns, Hornblower Yacht Cruise, Pier 3 - Embarcadero, San Francisco, CA	\N	0	aa545fd3-e827-40d0-a017-1d35b5f42aa9	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:45.325623+00	2026-02-09 08:09:45.325623+00
7ab563a1-44d8-4da5-952f-4f12e48d4308	Blue Valley @ Del Valle 9/19/2025	Completed	{Mixing}	2025-09-19 12:00:00+00	2025-09-19 12:00:00+00	America/Los_Angeles	Livermore, CA. Load-in 3:30pm, show 6-9.	\N	0	aa545fd3-e827-40d0-a017-1d35b5f42aa9	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:46.720358+00	2026-02-09 08:09:46.720358+00
2fe8894b-fa68-4ef3-9d8a-7162f8c2c42b	Neon Velvet @ SR Marriott 10/3/2025	Completed	{Stage}	2025-10-03 12:00:00+00	2025-10-03 12:00:00+00	America/Los_Angeles	\N	\N	0	aa545fd3-e827-40d0-a017-1d35b5f42aa9	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:47.993318+00	2026-02-09 08:09:47.993318+00
6b1decfb-65f5-413c-a359-23811f1f6d7c	Midnight Reruns @ Norm's 10/24/2025	Cancelled	{Lights,Mixing,Cancelled}	2025-10-24 12:00:00+00	2025-10-24 12:00:00+00	America/Los_Angeles	Use their PA. Bring lights, iPad.	\N	0	aa545fd3-e827-40d0-a017-1d35b5f42aa9	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:49.372725+00	2026-02-09 08:09:49.372725+00
b36f454c-8117-46b2-b9ef-832ffe100d83	Midnight Reruns @ Mike Hess 10/25/2025	Cancelled	{Lights,PA,Mixing,Cancelled}	2025-10-25 12:00:00+00	2025-10-25 12:00:00+00	America/Los_Angeles	Outdoors. band: 5-8pm. Sunset 6:15pm.	\N	0	aa545fd3-e827-40d0-a017-1d35b5f42aa9	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:49.64968+00	2026-02-09 08:09:49.64968+00
9def06dc-306c-486e-a3f8-23fefe478818	Midnight Reruns @ Round Hill CC 11/1/2025	Completed	{Mixing}	2025-11-01 12:00:00+00	2025-11-01 12:00:00+00	America/Los_Angeles	Fall Wine Tasting, 5-8. Acoustic Only.	\N	0	aa545fd3-e827-40d0-a017-1d35b5f42aa9	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:49.916816+00	2026-02-09 08:09:49.916816+00
c832a4bb-3363-4f1b-8443-37998e62aa3c	Blue Valley @ Meenar's 11/14/2025	Cancelled	{Mixing,Cancelled}	2025-11-14 12:00:00+00	2025-11-14 12:00:00+00	America/Los_Angeles	Just not doing it.	\N	0	aa545fd3-e827-40d0-a017-1d35b5f42aa9	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:50.174553+00	2026-02-09 08:09:50.174553+00
3cf8d225-1138-4997-84b8-541c52dbd3db	Midnight Reruns @ Round Hill CC 12/19/2025	Completed	{Lights,PA,Tentative}	2025-12-19 12:00:00+00	2025-12-19 12:00:00+00	America/Los_Angeles	($260 + 102.95 tax reimb) Private Holiday Party, should be $400	\N	0	aa545fd3-e827-40d0-a017-1d35b5f42aa9	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:50.436739+00	2026-02-09 08:09:50.436739+00
c582b2a9-830e-418d-8b2e-2437062fcf41	Revive @ Creekside 3/26/2026	Booked	{Mixing}	2026-03-26 12:00:00+00	2026-03-26 12:00:00+00	America/Los_Angeles	\N	\N	0	aa545fd3-e827-40d0-a017-1d35b5f42aa9	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:52.996263+00	2026-02-09 08:09:52.996263+00
0717da11-9d9e-4e8d-ba5e-d7769be4614a	Midnight Reruns @ Meenar's 3/28/2026	Booked	{Lights,PA}	2026-03-28 12:00:00+00	2026-03-28 12:00:00+00	America/Los_Angeles	\N	\N	0	aa545fd3-e827-40d0-a017-1d35b5f42aa9	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:53.26248+00	2026-02-09 08:09:53.26248+00
754a3af1-26c1-4645-9740-2bc7dc9e59de	Powerplay @  4/25/2026	Booked	{Lights,Stage}	2026-04-25 12:00:00+00	2026-04-25 12:00:00+00	America/Los_Angeles	Milbourne Sound	\N	0	aa545fd3-e827-40d0-a017-1d35b5f42aa9	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:53.604464+00	2026-02-09 08:09:53.604464+00
feaaa92c-d3ac-4cf6-9ae6-871ad5807566	Midnight Reruns @ Norm's 5/29/2026	Proposed	{Lights,Mixing,Conflict}	2026-05-29 12:00:00+00	2026-05-29 12:00:00+00	America/Los_Angeles	No gear.	\N	0	aa545fd3-e827-40d0-a017-1d35b5f42aa9	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:55.069693+00	2026-02-09 08:09:55.069693+00
b8af02cc-6e76-4097-9b91-e8d3b2006582	Spazmatics @ Dan's 6/5/2026	Booked	{PA,Lights}	2026-06-05 12:00:00+00	2026-06-05 12:00:00+00	America/Los_Angeles	Possible conflict with WC Art and Wine setup in the afternoon.	\N	0	aa545fd3-e827-40d0-a017-1d35b5f42aa9	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:55.306433+00	2026-02-09 08:09:55.306433+00
86b031cd-94e3-40a7-987d-d5d974429837	Summer Concerts @ Fremont 6/26/2026	Booked	{Stage,Mixing}	2026-06-26 12:00:00+00	2026-06-26 12:00:00+00	America/Los_Angeles	Milbourne Sound, Maybe me mixing	\N	0	aa545fd3-e827-40d0-a017-1d35b5f42aa9	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:56.580076+00	2026-02-09 08:09:56.580076+00
2acd506e-9062-4dea-9ccd-8d43f2207f9c	Midnight Reruns @ Norm's 8/21/2026	Booked	{Mixing}	2026-08-21 12:00:00+00	2026-08-21 12:00:00+00	America/Los_Angeles	No gear.	\N	0	aa545fd3-e827-40d0-a017-1d35b5f42aa9	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:58.320492+00	2026-02-09 08:09:58.320492+00
606e743c-d7df-488c-9ebe-e36a12bfc127	Summer Concerts @ Fremont 8/28/2026	Booked	{Stage}	2026-08-28 12:00:00+00	2026-08-28 12:00:00+00	America/Los_Angeles	Milbourne Sound	\N	0	aa545fd3-e827-40d0-a017-1d35b5f42aa9	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:58.558835+00	2026-02-09 08:09:58.558835+00
66e04305-cff4-4a0a-a5ae-769d479bdab9	Private @ Bridges CC 9/5/2025	Completed	{Mixing}	2025-09-05 12:00:00+00	2025-09-05 12:00:00+00	America/Los_Angeles	Bridges GC. Loadin 3:00pm. Doors 6:00pm. Loadout 6pm.  (2 Trips)	\N	0	aa545fd3-e827-40d0-a017-1d35b5f42aa9	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:45.700057+00	2026-02-09 08:09:45.700057+00
d51c8555-bc40-4649-b84a-bea439e03414	Foreverland @ Fremont 9/26/2025	Completed	{Stage}	2025-09-26 12:00:00+00	2025-09-26 12:00:00+00	America/Los_Angeles	\N	\N	0	aa545fd3-e827-40d0-a017-1d35b5f42aa9	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:47.05629+00	2026-02-09 08:09:47.05629+00
0971a6e3-a628-4529-9cbc-8a372569f90b	Blue Valley @ Las Positas 10/11/2025	Completed	{PA}	2025-10-11 12:00:00+00	2025-10-11 12:00:00+00	America/Los_Angeles	\N	\N	0	aa545fd3-e827-40d0-a017-1d35b5f42aa9	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:48.305138+00	2026-02-09 08:09:48.305138+00
dbbd018e-9007-45be-8306-7272ece132bd	Midnight Reruns @ Round Hill CC 12/20/2025	Cancelled	{Tentative,Mixing,Cancelled}	2025-12-20 12:00:00+00	2025-12-20 12:00:00+00	America/Los_Angeles	Private Holiday Party — Acoustic Only	\N	0	aa545fd3-e827-40d0-a017-1d35b5f42aa9	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:50.719417+00	2026-02-09 08:09:50.719417+00
ea13d9e3-5e97-44f6-b2d0-0dd3db79ad32	Spazmatics @ Dan's 1/23/2026	Completed	{PA,Lights}	2026-01-23 12:00:00+00	2026-01-23 12:00:00+00	America/Los_Angeles	Cash, Uhaul $60, Gas $12	\N	0	aa545fd3-e827-40d0-a017-1d35b5f42aa9	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:50.971822+00	2026-02-09 08:09:50.971822+00
425d1e79-8ed9-4367-8dff-afa1602b207f	Spazmatics @ Dan's 5/15/2026	Booked	{PA,Lights}	2026-05-15 12:00:00+00	2026-05-15 12:00:00+00	America/Los_Angeles	\N	\N	0	aa545fd3-e827-40d0-a017-1d35b5f42aa9	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:53.895104+00	2026-02-09 08:09:53.895104+00
b2a54a50-45bf-434e-99cb-6cfaba2af0fe	Milbourne Sound @ WC Art-n-Wine 6/6/2026	Booked	{Mixing,Stage}	2026-06-06 12:00:00+00	2026-06-06 12:00:00+00	America/Los_Angeles	Start at Noon — 10 or 11am call time.	\N	0	aa545fd3-e827-40d0-a017-1d35b5f42aa9	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:55.611103+00	2026-02-09 08:09:55.611103+00
54358ce8-0f7c-4f63-8a5b-44922cc65fec	Powerplay @ Private 7/10/2026	Booked	{Stage,Lights}	2026-07-10 12:00:00+00	2026-07-10 12:00:00+00	America/Los_Angeles	Wedding with Mark Milbourne	\N	0	aa545fd3-e827-40d0-a017-1d35b5f42aa9	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:56.89091+00	2026-02-09 08:09:56.89091+00
1a85d900-e4d4-41aa-bdcc-17e1412b4bad	Midnight Reruns @ Meenar's 7/11/2026	Booked	{Lights,PA}	2026-07-11 12:00:00+00	2026-07-11 12:00:00+00	America/Los_Angeles	\N	\N	0	aa545fd3-e827-40d0-a017-1d35b5f42aa9	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:57.152424+00	2026-02-09 08:09:57.152424+00
66e99d56-061f-4dc5-a6f3-a7d0f4bd493c	Revive @ Creekside 9/13/2026	Booked	{Mixing}	2026-09-13 12:00:00+00	2026-09-13 12:00:00+00	America/Los_Angeles	\N	\N	0	aa545fd3-e827-40d0-a017-1d35b5f42aa9	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:58.830919+00	2026-02-09 08:09:58.830919+00
90cd1e8a-c72b-4f76-afce-4da1e4fd8c08	Midnight Reruns @ Hazy 9/18/2026	Booked	{Small}	2026-09-18 12:00:00+00	2026-09-18 12:00:00+00	America/Los_Angeles	Acoustic Gig	\N	0	aa545fd3-e827-40d0-a017-1d35b5f42aa9	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:59.090871+00	2026-02-09 08:09:59.090871+00
6ee36296-acbd-4c60-9d83-825339a121cc	Last One Picked @ Orinda Park 9/11/2025	Completed	{PA}	2025-09-11 12:00:00+00	2025-09-11 12:00:00+00	America/Los_Angeles	Mel Speed Gig	\N	0	aa545fd3-e827-40d0-a017-1d35b5f42aa9	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:46.045872+00	2026-02-09 08:09:46.045872+00
fb362402-77fe-4b70-868c-cec7e1300354	Midnight Reruns @ Meenar's 9/27/2025	Completed	{Lights,PA}	2025-09-27 12:00:00+00	2025-09-27 12:00:00+00	America/Los_Angeles	More full setup. 6:30.  Cash payment.	\N	0	aa545fd3-e827-40d0-a017-1d35b5f42aa9	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:47.343372+00	2026-02-09 08:09:47.343372+00
a061fefe-f7c6-4d1f-9976-49261da21b2f	Bray and the Dens @ Club Fox 10/17/2025	Completed	{Stage}	2025-10-17 12:00:00+00	2025-10-17 12:00:00+00	America/Los_Angeles	Recording	\N	0	aa545fd3-e827-40d0-a017-1d35b5f42aa9	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:48.680624+00	2026-02-09 08:09:48.680624+00
c4d2f505-4134-48ec-b9a6-7b4d71682728	Midnight Reruns @ Norm's 2/27/2026	Proposed	{Mixing,Conflict}	2026-02-27 12:00:00+00	2026-02-27 12:00:00+00	America/Los_Angeles	CONFLICT.	\N	0	aa545fd3-e827-40d0-a017-1d35b5f42aa9	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:52.151995+00	2026-02-09 08:09:52.151995+00
82bd57e8-bc54-46d6-9f77-b73fb4b0f9b1	Spazmatics @ Dan's 2/27/2026	Booked	{PA,Lights}	2026-02-27 12:00:00+00	2026-02-27 12:00:00+00	America/Los_Angeles	\N	\N	0	aa545fd3-e827-40d0-a017-1d35b5f42aa9	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:52.392813+00	2026-02-09 08:09:52.392813+00
96ede74e-c30b-419f-8513-93466f02150a	Blue Valley @ Las Positas 5/16/2026	Proposed	{Mixing}	2026-05-16 12:00:00+00	2026-05-16 12:00:00+00	America/Los_Angeles	\N	\N	0	aa545fd3-e827-40d0-a017-1d35b5f42aa9	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:54.197477+00	2026-02-09 08:09:54.197477+00
15215058-48ae-44f6-9f62-807c6ccdf0d7	Milbourne Sound @ WC Art-n-Wine 6/7/2026	Booked	{Mixing,Stage}	2026-06-07 12:00:00+00	2026-06-07 12:00:00+00	America/Los_Angeles	\N	\N	0	aa545fd3-e827-40d0-a017-1d35b5f42aa9	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:55.959024+00	2026-02-09 08:09:55.959024+00
2df30e5f-b860-4870-8a91-16823353f010	Revive @ Creekside 7/12/2026	Booked	{Mixing}	2026-07-12 12:00:00+00	2026-07-12 12:00:00+00	America/Los_Angeles	Outdoor Edition	\N	0	aa545fd3-e827-40d0-a017-1d35b5f42aa9	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:57.453882+00	2026-02-09 08:09:57.453882+00
007dade4-7768-4a5e-88df-09148dc6d006	Summer Concerts @ Fremont 7/24/2026	Booked	{Stage}	2026-07-24 12:00:00+00	2026-07-24 12:00:00+00	America/Los_Angeles	Milbourne Sound	\N	0	aa545fd3-e827-40d0-a017-1d35b5f42aa9	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:57.711095+00	2026-02-09 08:09:57.711095+00
f17cfba2-9afb-42c7-8949-df6c272de3dd	Art & Wine Festival @  9/19/2026	Booked	{Stage}	2026-09-19 12:00:00+00	2026-09-19 12:00:00+00	America/Los_Angeles	Milbourne Sound	\N	0	aa545fd3-e827-40d0-a017-1d35b5f42aa9	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:59.440247+00	2026-02-09 08:09:59.440247+00
47745061-f574-46a7-8503-617ca0396d61	Art & Wine Festival @  9/20/2026	Booked	{Stage}	2026-09-20 12:00:00+00	2026-09-20 12:00:00+00	America/Los_Angeles	Milbourne Sound	\N	0	aa545fd3-e827-40d0-a017-1d35b5f42aa9	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:59.674575+00	2026-02-09 08:09:59.674575+00
1ce45cbd-7448-4cf6-a7e3-c59688e361f6	Summer Concerts @ Fremont 9/25/2026	Booked	{Stage}	2026-09-25 12:00:00+00	2026-09-25 12:00:00+00	America/Los_Angeles	Milbourne Sound	\N	0	aa545fd3-e827-40d0-a017-1d35b5f42aa9	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:59.905439+00	2026-02-09 08:09:59.905439+00
7c9c6305-e4ae-4833-8aba-357cb920b7d9	Unavailable	DateHold	{Conflict}	2026-02-16 12:00:00+00	2026-02-21 12:00:00+00	America/Los_Angeles	Out of Town	\N	0	aa545fd3-e827-40d0-a017-1d35b5f42aa9	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:51.88863+00	2026-02-09 08:12:30.273542+00
932f11fc-1e8c-4318-8a34-a8e59ece180c	Midnight Reruns @  1/31/2026	Settled	{Small}	2026-01-31 12:00:00+00	2026-01-31 12:00:00+00	America/Los_Angeles	Acoustic gig in Danville at the Growler. Includes setup.	\N	0	aa545fd3-e827-40d0-a017-1d35b5f42aa9	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:51.335862+00	2026-02-09 08:23:24.826835+00
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."users" ("id", "email", "first_name", "last_name", "phone", "avatar_url", "address_line1", "address_line2", "city", "state", "postal_code", "country", "role_hint", "user_status", "created_at", "updated_at", "timezone") FROM stdin;
02c16e23-7859-491e-8788-84f4066f2f40	cameron.orourke+mark@gmail.com	Mark	Milbourne	\N	\N	\N	\N	\N	\N	\N	\N	\N	active	2026-02-03 03:31:19.730855+00	2026-02-03 03:31:19.730855+00	\N
6dd4ab14-a3b0-402e-be1a-b50ffcb89fb2	cameron.orourke+sam@gmail.com	Sam	Smith	\N	\N	\N	\N	\N	\N	\N	\N	\N	active	2026-02-03 03:53:39.931294+00	2026-02-03 04:00:05.397165+00	\N
b470fcce-cdea-4647-9ba7-19f501a26343	cameron.orourke+colin@gmail.com	Colin	Mac									\N	pending	2026-02-03 03:09:17.106623+00	2026-02-04 04:38:03.696494+00	\N
54eb084b-a81b-4c13-bdd8-a9f450351eac	cameron.orourke+joe@gmail.com	Joe	Johnson	925-858-0411	\N	\N	\N	\N	\N	\N	\N	\N	active	2026-02-04 07:16:29.767485+00	2026-02-04 20:04:03.352894+00	\N
016b9cc5-3f46-47b2-ad42-9e6a090fe278	cameron.orourke+matt@gmail.com	Matt	Walsh									\N	active	2026-02-03 20:41:54.795639+00	2026-02-08 03:28:53.354631+00	\N
aa545fd3-e827-40d0-a017-1d35b5f42aa9	cameron.orourke@gmail.com	Cameron	O'Rourke	925-858-0411		24 Lynnbrook Court	\N	San Ramon	\N	\N	\N	\N	active	2026-01-29 21:26:11.984872+00	2026-02-08 15:08:23.505734+00	America/Los_Angeles
\.


--
-- Data for Name: gig_financials; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."gig_financials" ("id", "gig_id", "organization_id", "amount", "date", "notes", "created_by", "created_at", "type", "category", "reference_number", "counterparty_id", "external_entity_name", "currency", "description", "due_date", "paid_at", "updated_by", "updated_at") FROM stdin;
a4b12d03-ab01-4bda-a9ea-f6aaa84f76c7	5796bd45-00e7-4d3d-985a-fad7c9d96165	09fca024-b5c1-4f81-a71b-a68361548948	208.00	2025-02-22	\N	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:35.85512+00	Payment Recieved	Production	\N	\N	\N	USD	Payment from import	\N	\N	\N	2026-02-09 08:09:35.85512+00
a44b258c-4905-4994-b61d-feec237f54a9	daca5a7d-b28e-484b-ab6d-851905fbf332	09fca024-b5c1-4f81-a71b-a68361548948	100.00	2025-03-15	\N	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:36.775894+00	Payment Recieved	Production	\N	\N	\N	USD	Payment from import	\N	\N	\N	2026-02-09 08:09:36.775894+00
810e6f46-055c-44cd-93fb-3b4dedf2836c	a6faf07b-6c52-41f9-89ad-d981a6dcc767	09fca024-b5c1-4f81-a71b-a68361548948	1040.00	2025-03-27	\N	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:37.134091+00	Payment Recieved	Production	\N	\N	\N	USD	Payment from import	\N	\N	\N	2026-02-09 08:09:37.134091+00
cddee572-cff7-4b5c-a9cf-cda82332e8e4	bb4b03d7-d200-4730-ab00-82dce5696de2	09fca024-b5c1-4f81-a71b-a68361548948	100.00	2025-04-04	\N	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:37.478452+00	Payment Recieved	Production	\N	\N	\N	USD	Payment from import	\N	\N	\N	2026-02-09 08:09:37.478452+00
dc08f1b9-3c23-4251-99a4-566fef82f23b	0d93880b-4c73-4e00-bd43-e94f73b7beee	09fca024-b5c1-4f81-a71b-a68361548948	250.00	2025-04-11	\N	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:37.80283+00	Payment Recieved	Production	\N	\N	\N	USD	Payment from import	\N	\N	\N	2026-02-09 08:09:37.80283+00
0cd0e87f-5fa2-48ad-a423-4c684d620ce4	d126c89c-c02e-40c7-84a6-378e859bd1d4	09fca024-b5c1-4f81-a71b-a68361548948	250.00	2025-05-03	\N	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:38.360348+00	Payment Recieved	Production	\N	\N	\N	USD	Payment from import	\N	\N	\N	2026-02-09 08:09:38.360348+00
cba7cfad-2f56-43c8-80ec-344e29275d74	429dba77-edf3-42d7-8011-3ecd74066463	09fca024-b5c1-4f81-a71b-a68361548948	250.00	2025-05-09	\N	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:38.709536+00	Payment Recieved	Production	\N	\N	\N	USD	Payment from import	\N	\N	\N	2026-02-09 08:09:38.709536+00
7376f67b-0f2f-4caf-80f0-535c7896f869	736530f1-ac9c-45b1-814e-384102b3d24b	09fca024-b5c1-4f81-a71b-a68361548948	250.00	2025-05-17	\N	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:39.032358+00	Payment Recieved	Production	\N	\N	\N	USD	Payment from import	\N	\N	\N	2026-02-09 08:09:39.032358+00
18b54942-d6e6-4761-a810-fec6a473d4a3	1aee5e52-1b9a-41b6-ad68-74988a827014	09fca024-b5c1-4f81-a71b-a68361548948	100.00	2025-05-23	\N	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:39.384114+00	Payment Recieved	Production	\N	\N	\N	USD	Payment from import	\N	\N	\N	2026-02-09 08:09:39.384114+00
9d3a626f-c758-4c8b-aa79-053eef9c0047	223bb868-3ce8-4ee5-a39b-27016605ddb7	09fca024-b5c1-4f81-a71b-a68361548948	100.00	2025-05-30	\N	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:39.66832+00	Payment Recieved	Production	\N	\N	\N	USD	Payment from import	\N	\N	\N	2026-02-09 08:09:39.66832+00
efbb35bb-8914-4c52-9e80-1533b6523040	655e8ad0-f20b-42c8-b9a3-af6cfed9bc97	09fca024-b5c1-4f81-a71b-a68361548948	400.00	2025-05-31	\N	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:40.021461+00	Payment Recieved	Production	\N	\N	\N	USD	Payment from import	\N	\N	\N	2026-02-09 08:09:40.021461+00
959f7fee-5d97-466f-a639-240876078baf	aeeb2919-1fb1-403b-b943-ce0e22a9175f	09fca024-b5c1-4f81-a71b-a68361548948	400.00	2025-06-01	\N	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:40.304894+00	Payment Recieved	Production	\N	\N	\N	USD	Payment from import	\N	\N	\N	2026-02-09 08:09:40.304894+00
692bcd95-f1b1-4b00-8aa0-16faa0444eaf	73aaa3cc-fb44-40c6-89af-bed03146a96d	09fca024-b5c1-4f81-a71b-a68361548948	200.00	2025-06-13	\N	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:40.662716+00	Payment Recieved	Production	\N	\N	\N	USD	Payment from import	\N	\N	\N	2026-02-09 08:09:40.662716+00
82a0f4ce-a803-4653-a4e9-7fa01919225b	27b08b7c-ca9f-4588-8674-02b85aa18795	09fca024-b5c1-4f81-a71b-a68361548948	80.00	2025-06-14	\N	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:40.943194+00	Payment Recieved	Production	\N	\N	\N	USD	Payment from import	\N	\N	\N	2026-02-09 08:09:40.943194+00
bc22df67-6a6c-4b86-aa8f-b841fbce32f2	892ab327-b80d-4657-b47b-fffbf8750b74	09fca024-b5c1-4f81-a71b-a68361548948	700.00	2025-06-26	\N	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:41.31839+00	Payment Recieved	Production	\N	\N	\N	USD	Payment from import	\N	\N	\N	2026-02-09 08:09:41.31839+00
efcebbd6-2b85-4ab1-be6e-2fc93bb441ba	ecd68d89-0a1b-4e45-8208-91bda132a694	09fca024-b5c1-4f81-a71b-a68361548948	250.00	2025-06-27	\N	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:41.675739+00	Payment Recieved	Production	\N	\N	\N	USD	Payment from import	\N	\N	\N	2026-02-09 08:09:41.675739+00
97ad2bb9-1220-4092-a02c-7f828822c639	f9848f9e-9768-4707-8577-ba52c2ba52ba	09fca024-b5c1-4f81-a71b-a68361548948	100.00	2025-07-03	\N	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:41.998656+00	Payment Recieved	Production	\N	\N	\N	USD	Payment from import	\N	\N	\N	2026-02-09 08:09:41.998656+00
37719bbd-0ef8-4d10-8a4f-aa0f95ef16e3	4eb3e09c-f88d-48b9-a0c6-c26532202a80	09fca024-b5c1-4f81-a71b-a68361548948	400.00	2025-07-24	\N	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:42.350708+00	Payment Recieved	Production	\N	\N	\N	USD	Payment from import	\N	\N	\N	2026-02-09 08:09:42.350708+00
3e97cead-d3df-45e7-bf39-11cd503da07b	d430cabd-f85d-437f-ace2-0d53b567d5d4	09fca024-b5c1-4f81-a71b-a68361548948	250.00	2025-07-25	\N	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:42.63206+00	Payment Recieved	Production	\N	\N	\N	USD	Payment from import	\N	\N	\N	2026-02-09 08:09:42.63206+00
ee797da7-5e98-4c27-b60b-061df9d1ec6c	754a8c8f-6571-49a5-bfb9-4cab546b2b52	09fca024-b5c1-4f81-a71b-a68361548948	400.00	2025-08-07	\N	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:43.195372+00	Payment Recieved	Production	\N	\N	\N	USD	Payment from import	\N	\N	\N	2026-02-09 08:09:43.195372+00
54084c48-7444-43be-aca6-8ffdfaf93fa5	df03f2e6-f50b-46d6-8f6e-1725c6926509	09fca024-b5c1-4f81-a71b-a68361548948	150.00	2025-08-08	\N	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:43.497923+00	Payment Recieved	Production	\N	\N	\N	USD	Payment from import	\N	\N	\N	2026-02-09 08:09:43.497923+00
0fec6a42-3b54-4033-8d9c-9073a84fdeeb	7168fe81-7290-4daf-8d16-19971965f907	09fca024-b5c1-4f81-a71b-a68361548948	526.00	2025-08-09	\N	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:43.817942+00	Payment Recieved	Production	\N	\N	\N	USD	Payment from import	\N	\N	\N	2026-02-09 08:09:43.817942+00
9f71ba26-287b-4e71-b891-7fbfbfa76b39	bc241120-b2af-4439-8373-65ea20929256	09fca024-b5c1-4f81-a71b-a68361548948	500.00	2025-08-22	\N	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:44.14258+00	Payment Recieved	Production	\N	\N	\N	USD	Payment from import	\N	\N	\N	2026-02-09 08:09:44.14258+00
985da5b6-e551-4ef5-b1ad-6603a3c9697b	88c94db7-42b9-456d-b0b7-50cb7737cd80	09fca024-b5c1-4f81-a71b-a68361548948	400.00	2025-08-28	\N	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:45.039649+00	Payment Recieved	Production	\N	\N	\N	USD	Payment from import	\N	\N	\N	2026-02-09 08:09:45.039649+00
f06f5c8b-489d-40d6-941b-18a9c9ff5ccf	24eabe32-f073-4370-bd5c-fe01e3929679	09fca024-b5c1-4f81-a71b-a68361548948	250.00	2025-09-03	\N	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:45.383351+00	Payment Recieved	Production	\N	\N	\N	USD	Payment from import	\N	\N	\N	2026-02-09 08:09:45.383351+00
bc15b743-6601-44a5-b0e1-ea4f808d9694	9118bc4a-7794-4ebe-b338-d2e468e0bfc6	09fca024-b5c1-4f81-a71b-a68361548948	100.00	2024-09-14	\N	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:34.093712+00	Payment Recieved	Production	\N	\N	\N	USD	Payment from import	\N	\N	\N	2026-02-09 08:09:34.093712+00
c08468c6-4ed3-4392-892a-c90b6959191b	b59b5e7d-a3a4-4a26-8f4f-55026baa2c21	09fca024-b5c1-4f81-a71b-a68361548948	130.00	2024-10-02	\N	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:34.446+00	Payment Recieved	Production	\N	\N	\N	USD	Payment from import	\N	\N	\N	2026-02-09 08:09:34.446+00
279923ae-c191-4814-8c81-885c43d2e54c	de68c30d-3e29-445a-ae9d-e2fb2819eff4	09fca024-b5c1-4f81-a71b-a68361548948	100.00	2024-10-11	\N	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:34.816421+00	Payment Recieved	Production	\N	\N	\N	USD	Payment from import	\N	\N	\N	2026-02-09 08:09:34.816421+00
0b841470-647e-4193-80f5-ce8d32bea39f	63f0e500-cc53-4193-81cf-37d3fd0d17db	09fca024-b5c1-4f81-a71b-a68361548948	100.00	2024-11-16	\N	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:35.131437+00	Payment Recieved	Production	\N	\N	\N	USD	Payment from import	\N	\N	\N	2026-02-09 08:09:35.131437+00
0f0d17c8-5ce1-41ef-8daa-0aa4907cc01c	dafabf70-b8d1-43b7-93dd-f5373ea22256	09fca024-b5c1-4f81-a71b-a68361548948	100.00	2024-12-07	\N	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:35.485894+00	Payment Recieved	Production	\N	\N	\N	USD	Payment from import	\N	\N	\N	2026-02-09 08:09:35.485894+00
74a69af2-dcda-451f-b8b6-2bd6a980816b	66e04305-cff4-4a0a-a5ae-769d479bdab9	09fca024-b5c1-4f81-a71b-a68361548948	900.00	2025-09-05	\N	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:45.753261+00	Payment Recieved	Production	\N	\N	\N	USD	Payment from import	\N	\N	\N	2026-02-09 08:09:45.753261+00
e128952e-4dd2-4e13-aed1-551f4d2e9d13	6ee36296-acbd-4c60-9d83-825339a121cc	09fca024-b5c1-4f81-a71b-a68361548948	400.00	2025-09-11	\N	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:46.100608+00	Payment Recieved	Production	\N	\N	\N	USD	Payment from import	\N	\N	\N	2026-02-09 08:09:46.100608+00
0d998946-c6ae-4341-896b-01dcb1345e65	c52dbd70-98d9-44cd-913b-decfea646b20	09fca024-b5c1-4f81-a71b-a68361548948	285.00	2025-09-12	\N	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:46.432328+00	Payment Recieved	Production	\N	\N	\N	USD	Payment from import	\N	\N	\N	2026-02-09 08:09:46.432328+00
b0d0a6b6-dc1a-4296-a4b7-1f1a1ea39d06	7ab563a1-44d8-4da5-952f-4f12e48d4308	09fca024-b5c1-4f81-a71b-a68361548948	60.00	2025-09-19	\N	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:46.772744+00	Payment Recieved	Production	\N	\N	\N	USD	Payment from import	\N	\N	\N	2026-02-09 08:09:46.772744+00
f3980408-c0d0-4140-9c8c-101f12cbf51d	d51c8555-bc40-4649-b84a-bea439e03414	09fca024-b5c1-4f81-a71b-a68361548948	250.00	2025-09-26	\N	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:47.107326+00	Payment Recieved	Production	\N	\N	\N	USD	Payment from import	\N	\N	\N	2026-02-09 08:09:47.107326+00
d870b011-0ad8-4370-890a-5c661d35b4c8	fb362402-77fe-4b70-868c-cec7e1300354	09fca024-b5c1-4f81-a71b-a68361548948	150.00	2025-09-27	\N	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:47.39554+00	Payment Recieved	Production	\N	\N	\N	USD	Payment from import	\N	\N	\N	2026-02-09 08:09:47.39554+00
6447b58f-9a3b-4d38-9a9f-ccfb2aa83b0b	c6beab7e-948a-4d76-a628-9b12e6394226	09fca024-b5c1-4f81-a71b-a68361548948	200.00	2025-10-02	\N	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:47.734843+00	Payment Recieved	Production	\N	\N	\N	USD	Payment from import	\N	\N	\N	2026-02-09 08:09:47.734843+00
cae070cc-97d0-4d41-b86e-e051b0ab500c	2fe8894b-fa68-4ef3-9d8a-7162f8c2c42b	09fca024-b5c1-4f81-a71b-a68361548948	250.00	2025-10-03	\N	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:48.043185+00	Payment Recieved	Production	\N	\N	\N	USD	Payment from import	\N	\N	\N	2026-02-09 08:09:48.043185+00
7aa4348e-999c-41fd-b038-e78219bc4011	0971a6e3-a628-4529-9cbc-8a372569f90b	09fca024-b5c1-4f81-a71b-a68361548948	120.00	2025-10-11	\N	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:48.35609+00	Payment Recieved	Production	\N	\N	\N	USD	Payment from import	\N	\N	\N	2026-02-09 08:09:48.35609+00
d2b147b3-89c1-4da8-910f-7c1f9a85eb07	a061fefe-f7c6-4d1f-9976-49261da21b2f	09fca024-b5c1-4f81-a71b-a68361548948	200.00	2025-10-17	\N	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:48.733696+00	Payment Recieved	Production	\N	\N	\N	USD	Payment from import	\N	\N	\N	2026-02-09 08:09:48.733696+00
1c5c5d52-f8bb-462a-899b-0191525aa95d	4d2f3b80-1aad-440c-a3d2-4c24fe03727a	09fca024-b5c1-4f81-a71b-a68361548948	350.00	2025-10-23	\N	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:49.088429+00	Payment Recieved	Production	\N	\N	\N	USD	Payment from import	\N	\N	\N	2026-02-09 08:09:49.088429+00
8518cb79-342e-48b6-8f93-1a9f72975c3b	3cf8d225-1138-4997-84b8-541c52dbd3db	09fca024-b5c1-4f81-a71b-a68361548948	362.95	2025-12-19	\N	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:50.483344+00	Payment Recieved	Production	\N	\N	\N	USD	Payment from import	\N	\N	\N	2026-02-09 08:09:50.483344+00
498e9916-696e-457e-b796-a20d9a3df296	ea13d9e3-5e97-44f6-b2d0-0dd3db79ad32	09fca024-b5c1-4f81-a71b-a68361548948	350.00	2026-01-23	\N	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:51.066119+00	Payment Recieved	Production	\N	\N	\N	USD	Payment from import	\N	\N	\N	2026-02-09 08:09:51.066119+00
789e36a9-2d2c-41ea-af53-18a837142599	932f11fc-1e8c-4318-8a34-a8e59ece180c	09fca024-b5c1-4f81-a71b-a68361548948	120.00	2026-01-31	\N	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:51.388089+00	Payment Recieved	Production	\N	\N	\N	USD	Payment from import	\N	\N	\N	2026-02-09 08:09:51.388089+00
97faaee2-36fd-4d81-b646-11b0f1e02b69	571b8639-2e14-43d2-abc1-4dc85698d349	09fca024-b5c1-4f81-a71b-a68361548948	500.00	2026-02-07	\N	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:51.719073+00	Payment Recieved	Production	\N	\N	\N	USD	Payment from import	\N	\N	\N	2026-02-09 08:09:51.719073+00
b80b92d2-53fa-4584-a2b2-caa0eda29540	82bd57e8-bc54-46d6-9f77-b73fb4b0f9b1	09fca024-b5c1-4f81-a71b-a68361548948	350.00	2026-02-27	\N	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:52.44127+00	Payment Recieved	Production	\N	\N	\N	USD	Payment from import	\N	\N	\N	2026-02-09 08:09:52.44127+00
709fdbf8-ce1c-45a4-94a5-8b1382e1fe3c	158843aa-888c-418e-9e2b-cd216d55d56f	09fca024-b5c1-4f81-a71b-a68361548948	350.00	2026-03-20	\N	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:52.739023+00	Payment Recieved	Production	\N	\N	\N	USD	Payment from import	\N	\N	\N	2026-02-09 08:09:52.739023+00
920c7f36-af40-4a75-89dc-7b66a8e17854	0717da11-9d9e-4e8d-ba5e-d7769be4614a	09fca024-b5c1-4f81-a71b-a68361548948	200.00	2026-03-28	\N	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:53.313543+00	Payment Recieved	Production	\N	\N	\N	USD	Payment from import	\N	\N	\N	2026-02-09 08:09:53.313543+00
38d4139c-4755-4c7f-ac2b-dfd4c1eed89b	754a3af1-26c1-4645-9740-2bc7dc9e59de	09fca024-b5c1-4f81-a71b-a68361548948	200.00	2026-04-25	\N	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:53.655905+00	Payment Recieved	Production	\N	\N	\N	USD	Payment from import	\N	\N	\N	2026-02-09 08:09:53.655905+00
cc8a0628-45c3-49da-b013-615f662d7608	b8af02cc-6e76-4097-9b91-e8d3b2006582	09fca024-b5c1-4f81-a71b-a68361548948	350.00	2026-06-05	\N	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:55.35369+00	Payment Recieved	Production	\N	\N	\N	USD	Payment from import	\N	\N	\N	2026-02-09 08:09:55.35369+00
22ea2b21-3e4f-479d-9319-6cf388ed5bda	86b031cd-94e3-40a7-987d-d5d974429837	09fca024-b5c1-4f81-a71b-a68361548948	250.00	2026-06-26	\N	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:56.63295+00	Payment Recieved	Production	\N	\N	\N	USD	Payment from import	\N	\N	\N	2026-02-09 08:09:56.63295+00
edfe5aaf-ad2d-4ba4-b4de-2150b47a4058	606e743c-d7df-488c-9ebe-e36a12bfc127	09fca024-b5c1-4f81-a71b-a68361548948	250.00	2026-08-28	\N	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:58.607758+00	Payment Recieved	Production	\N	\N	\N	USD	Payment from import	\N	\N	\N	2026-02-09 08:09:58.607758+00
b899ad78-33fa-4c82-9853-b831fcc1b93b	425d1e79-8ed9-4367-8dff-afa1602b207f	09fca024-b5c1-4f81-a71b-a68361548948	350.00	2026-05-15	\N	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:53.950974+00	Payment Recieved	Production	\N	\N	\N	USD	Payment from import	\N	\N	\N	2026-02-09 08:09:53.950974+00
c85fb56e-0cf8-49da-87b2-e0a21108ce34	b2a54a50-45bf-434e-99cb-6cfaba2af0fe	09fca024-b5c1-4f81-a71b-a68361548948	400.00	2026-06-06	\N	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:55.680011+00	Payment Recieved	Production	\N	\N	\N	USD	Payment from import	\N	\N	\N	2026-02-09 08:09:55.680011+00
5dda1b03-b00d-47f5-a933-cb8b58c9c961	1a85d900-e4d4-41aa-bdcc-17e1412b4bad	09fca024-b5c1-4f81-a71b-a68361548948	200.00	2026-07-11	\N	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:57.203475+00	Payment Recieved	Production	\N	\N	\N	USD	Payment from import	\N	\N	\N	2026-02-09 08:09:57.203475+00
ec404829-dba2-42ba-b987-0bb90a9c7ff8	90cd1e8a-c72b-4f76-afce-4da1e4fd8c08	09fca024-b5c1-4f81-a71b-a68361548948	100.00	2026-09-18	\N	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:59.14202+00	Payment Recieved	Production	\N	\N	\N	USD	Payment from import	\N	\N	\N	2026-02-09 08:09:59.14202+00
6151f776-27db-4f88-aaa0-721de29874fe	96ede74e-c30b-419f-8513-93466f02150a	09fca024-b5c1-4f81-a71b-a68361548948	200.00	2026-05-16	\N	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:54.243094+00	Payment Recieved	Production	\N	\N	\N	USD	Payment from import	\N	\N	\N	2026-02-09 08:09:54.243094+00
0ff09956-5f51-4199-b881-630d2bc86875	15215058-48ae-44f6-9f62-807c6ccdf0d7	09fca024-b5c1-4f81-a71b-a68361548948	400.00	2026-06-07	\N	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:56.006758+00	Payment Recieved	Production	\N	\N	\N	USD	Payment from import	\N	\N	\N	2026-02-09 08:09:56.006758+00
81d194a7-c37e-4c4c-beeb-99402f0b295c	007dade4-7768-4a5e-88df-09148dc6d006	09fca024-b5c1-4f81-a71b-a68361548948	250.00	2026-07-24	\N	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:57.756924+00	Payment Recieved	Production	\N	\N	\N	USD	Payment from import	\N	\N	\N	2026-02-09 08:09:57.756924+00
f45a558c-1ddb-4e71-b0dd-4aaf104d2112	1ce45cbd-7448-4cf6-a7e3-c59688e361f6	09fca024-b5c1-4f81-a71b-a68361548948	250.00	2026-09-25	\N	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:59.953559+00	Payment Recieved	Production	\N	\N	\N	USD	Payment from import	\N	\N	\N	2026-02-09 08:09:59.953559+00
deb03db6-c0d5-4895-9524-8a907a5251cf	a518ec75-8fd7-4cea-b2cc-79581c908a92	09fca024-b5c1-4f81-a71b-a68361548948	250.00	2026-05-29	\N	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:54.808735+00	Payment Recieved	Production	\N	\N	\N	USD	Payment from import	\N	\N	\N	2026-02-09 08:09:54.808735+00
87d28b4c-2513-4233-9618-7cab49b3d3cf	2888be19-92ea-4fb9-9a42-d85ec71265bb	09fca024-b5c1-4f81-a71b-a68361548948	100.00	2026-06-12	\N	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:56.291035+00	Payment Recieved	Production	\N	\N	\N	USD	Payment from import	\N	\N	\N	2026-02-09 08:09:56.291035+00
50b1891c-4c0a-4d9e-bd67-6fffb798c176	9681acd9-588a-4d37-9a73-70e5e8c5a1ed	09fca024-b5c1-4f81-a71b-a68361548948	350.00	2026-08-14	\N	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:09:58.067479+00	Payment Recieved	Production	\N	\N	\N	USD	Payment from import	\N	\N	\N	2026-02-09 08:09:58.067479+00
70c08c35-ff74-45bd-8de8-17e37056bde0	cf74f735-ecd2-41cb-8d4e-3a3cf46e18e1	09fca024-b5c1-4f81-a71b-a68361548948	200.00	2026-12-31	\N	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:10:00.977218+00	Payment Recieved	Production	\N	\N	\N	USD	Payment from import	\N	\N	\N	2026-02-09 08:10:00.977218+00
38ba1b69-6399-4e24-bdbd-440f8e92196b	01f4f413-70a2-404f-b9a9-c97eb937b5a8	09fca024-b5c1-4f81-a71b-a68361548948	391.00	2025-08-23		aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:27:37.503055+00	Payment Recieved	Production		\N		USD	Payment from import	\N	\N	\N	2026-02-09 08:27:58.822128+00
a01ebe9b-c032-4367-af04-259626a6a4d6	01f4f413-70a2-404f-b9a9-c97eb937b5a8	09fca024-b5c1-4f81-a71b-a68361548948	30.90	2026-02-09	Van	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:27:16.555411+00	Expense Reimbursed	Other		\N		USD	For portion of van	\N	\N	\N	2026-02-09 08:28:43.455838+00
\.


--
-- Data for Name: kits; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."kits" ("id", "organization_id", "name", "category", "description", "tags", "tag_number", "rental_value", "created_by", "updated_by", "created_at", "updated_at") FROM stdin;
84902571-af89-4863-b9f7-2550316e8a15	09fca024-b5c1-4f81-a71b-a68361548948	RCF Speaker Kit	Audio	\N	{}	A4-PA001	450.00	7e7e8ad7-6951-4dc4-8310-eff2f1b30060	7e7e8ad7-6951-4dc4-8310-eff2f1b30060	2025-11-13 07:16:52.322656+00	2025-11-16 15:25:28.064486+00
4f5b5230-b93b-4406-bced-d43aa991f6dd	09fca024-b5c1-4f81-a71b-a68361548948	Microphone Case	Audio	\N	{PA}	\N	10.00	d0a35726-0993-40b4-b41d-c61806a4670e	d0a35726-0993-40b4-b41d-c61806a4670e	2025-11-24 04:04:58.535607+00	2026-01-20 15:07:48.75218+00
4bd24cfb-9987-46d0-81c6-aa3f228cde5d	09fca024-b5c1-4f81-a71b-a68361548948	Microphone Case	Audio	\N	{}	\N	\N	aa545fd3-e827-40d0-a017-1d35b5f42aa9	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-01-31 06:48:25.826104+00	2026-01-31 06:48:25.826104+00
03f2ff8e-9ebf-421d-bd6c-d5b597fa44be	09fca024-b5c1-4f81-a71b-a68361548948	RCF Speakers	Audio	\N	{}	\N	\N	aa545fd3-e827-40d0-a017-1d35b5f42aa9	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-01-31 16:53:08.78894+00	2026-01-31 16:53:08.78894+00
\.


--
-- Data for Name: gig_kit_assignments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."gig_kit_assignments" ("id", "organization_id", "gig_id", "kit_id", "notes", "assigned_by", "assigned_at") FROM stdin;
\.


--
-- Data for Name: gig_participants; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."gig_participants" ("id", "gig_id", "organization_id", "role", "notes") FROM stdin;
38f84144-fce5-49cf-8bd5-fe4e40e0aa1b	9118bc4a-7794-4ebe-b338-d2e468e0bfc6	ba9ff468-e4b8-4f62-953e-040bc0ec416d	Act	\N
e37aff42-57c3-45c2-9a56-6bcaee1fd6a0	9118bc4a-7794-4ebe-b338-d2e468e0bfc6	0e39fd33-f09e-4f3e-b225-a7f71192c10f	Venue	\N
f84a16af-7aaf-4197-a809-8c6dbc8d8171	9118bc4a-7794-4ebe-b338-d2e468e0bfc6	09fca024-b5c1-4f81-a71b-a68361548948	Sound	\N
71724a5b-d459-42d9-8dae-409b8d5e2767	b59b5e7d-a3a4-4a26-8f4f-55026baa2c21	ba9ff468-e4b8-4f62-953e-040bc0ec416d	Act	\N
bb85e2cc-70b0-443e-94cf-0ae0df6c8695	b59b5e7d-a3a4-4a26-8f4f-55026baa2c21	828d89b5-34c4-4375-9cc5-0e8578189df2	Venue	\N
950d508c-ac69-4d17-9055-3bf234aac262	b59b5e7d-a3a4-4a26-8f4f-55026baa2c21	09fca024-b5c1-4f81-a71b-a68361548948	Sound	\N
c707e2a7-f299-401f-84cf-08512ce33369	de68c30d-3e29-445a-ae9d-e2fb2819eff4	1a819eac-9538-4464-956e-1d4bca313e4e	Act	\N
977e1267-2df2-468e-b65e-1e3a4dd50d25	de68c30d-3e29-445a-ae9d-e2fb2819eff4	ddd467b5-cd8a-4bb4-99a9-556dace68065	Venue	\N
57c1fd74-5789-4ef8-af95-4a77f924f591	de68c30d-3e29-445a-ae9d-e2fb2819eff4	09fca024-b5c1-4f81-a71b-a68361548948	Sound	\N
a300a34d-f514-49a1-975d-f6e7647bce9c	63f0e500-cc53-4193-81cf-37d3fd0d17db	1a819eac-9538-4464-956e-1d4bca313e4e	Act	\N
6a40c0fb-4583-4e16-ab32-e1bc66e5b92f	63f0e500-cc53-4193-81cf-37d3fd0d17db	0e39fd33-f09e-4f3e-b225-a7f71192c10f	Venue	\N
058f3b12-4899-4185-ab1c-fcee2f941947	63f0e500-cc53-4193-81cf-37d3fd0d17db	09fca024-b5c1-4f81-a71b-a68361548948	Sound	\N
79c00704-989c-4362-b977-1959755064be	dafabf70-b8d1-43b7-93dd-f5373ea22256	1a819eac-9538-4464-956e-1d4bca313e4e	Act	\N
b5c31717-b29c-4cd5-9a94-081545f392e0	dafabf70-b8d1-43b7-93dd-f5373ea22256	63fd3d39-d132-425f-88c6-e7c4c77deef7	Venue	\N
443dac00-2c66-4f40-b7c2-d27f29dbec51	dafabf70-b8d1-43b7-93dd-f5373ea22256	09fca024-b5c1-4f81-a71b-a68361548948	Sound	\N
93e90a51-18b6-4751-bfe5-309ff332dfaf	5796bd45-00e7-4d3d-985a-fad7c9d96165	cd8a7ac1-70b0-45dc-bbeb-cfae46536d29	Act	\N
2a447934-1fce-41e1-8a3b-defc21702a6c	5796bd45-00e7-4d3d-985a-fad7c9d96165	825a133a-fef7-4bf8-974c-f429845269ce	Venue	\N
1c1376f8-1ef9-45bf-b658-d31820678142	5796bd45-00e7-4d3d-985a-fad7c9d96165	09fca024-b5c1-4f81-a71b-a68361548948	Sound	\N
f70d9cf7-3cd6-47b7-9699-1b83d714756b	2787f16b-d4b0-4476-bb3d-2bcbb1b4cb2b	632d52f1-1aac-4810-ae76-35ccee4e3866	Act	\N
ef36e9ad-78d2-4aa4-8be4-6e919f580591	2787f16b-d4b0-4476-bb3d-2bcbb1b4cb2b	63fd3d39-d132-425f-88c6-e7c4c77deef7	Venue	\N
4a45f6a8-2b47-45c7-987d-fe636387632d	2787f16b-d4b0-4476-bb3d-2bcbb1b4cb2b	09fca024-b5c1-4f81-a71b-a68361548948	Sound	\N
a6e671b9-b923-49cf-a387-dd4fb9a17846	e80b78d5-1ca8-436d-a2e0-25c7a412bc3d	99693fdc-ecd5-49b7-aa95-9caa7e0431a0	Act	\N
4781147f-3634-4217-bbf2-0670e9d26043	e80b78d5-1ca8-436d-a2e0-25c7a412bc3d	cb833228-88c7-4245-a184-d365e4fdb40d	Venue	\N
d5b0a9d0-3d5b-4783-8e2a-cf639708801c	e80b78d5-1ca8-436d-a2e0-25c7a412bc3d	09fca024-b5c1-4f81-a71b-a68361548948	Sound	\N
2a9431d9-2e9c-46b1-be3c-eec77a998df7	daca5a7d-b28e-484b-ab6d-851905fbf332	ba9ff468-e4b8-4f62-953e-040bc0ec416d	Act	\N
1458779c-d824-4349-8126-9a998dca22c6	daca5a7d-b28e-484b-ab6d-851905fbf332	0e39fd33-f09e-4f3e-b225-a7f71192c10f	Venue	\N
ac4f2f42-b42b-49cd-b992-c9b52fabd953	daca5a7d-b28e-484b-ab6d-851905fbf332	09fca024-b5c1-4f81-a71b-a68361548948	Sound	\N
0ae94444-c4a8-4042-95a7-8c2ed4c32b54	a6faf07b-6c52-41f9-89ad-d981a6dcc767	c8bd84bd-64a1-4866-89dd-c32473bfde5c	Act	\N
bbf03358-328c-4da7-82d5-b7f43414b801	a6faf07b-6c52-41f9-89ad-d981a6dcc767	6bac75a5-acde-445c-9bab-b7bb049952e2	Venue	\N
8ecb513a-2dc4-44be-b8de-61c0a11d49cc	a6faf07b-6c52-41f9-89ad-d981a6dcc767	09fca024-b5c1-4f81-a71b-a68361548948	Sound	\N
7a5f5121-ff27-4177-8ebd-ec6e9d93a6b7	bb4b03d7-d200-4730-ab00-82dce5696de2	ba9ff468-e4b8-4f62-953e-040bc0ec416d	Act	\N
2e2edb5e-0e76-44cf-8855-2a737e351de5	bb4b03d7-d200-4730-ab00-82dce5696de2	9ced396d-5cb2-4835-9f1e-66ba3f741406	Venue	\N
3c2c388c-2cd0-43e1-ad25-594d61cafa0a	bb4b03d7-d200-4730-ab00-82dce5696de2	09fca024-b5c1-4f81-a71b-a68361548948	Sound	\N
2a17ffe0-714d-4e7a-a65f-673223d0c38d	0d93880b-4c73-4e00-bd43-e94f73b7beee	632d52f1-1aac-4810-ae76-35ccee4e3866	Act	\N
6d054788-ff9d-45cd-9e96-df710edc89be	0d93880b-4c73-4e00-bd43-e94f73b7beee	21ca7612-aab0-4c00-be33-aaeab172a906	Venue	\N
702d85ef-1503-4fe8-8d30-03c747c5c5b7	0d93880b-4c73-4e00-bd43-e94f73b7beee	09fca024-b5c1-4f81-a71b-a68361548948	Sound	\N
b2aa2775-dfc1-4cdf-bad2-e2db6c6ab35f	4b0ac1f6-aff6-4118-83ad-3d4b60fea4aa	99693fdc-ecd5-49b7-aa95-9caa7e0431a0	Act	\N
748ff6e6-1a46-4dc1-9ab3-52cb440b5d98	4b0ac1f6-aff6-4118-83ad-3d4b60fea4aa	cb833228-88c7-4245-a184-d365e4fdb40d	Venue	\N
85578830-03da-49cd-af81-c80f294909ea	4b0ac1f6-aff6-4118-83ad-3d4b60fea4aa	09fca024-b5c1-4f81-a71b-a68361548948	Sound	\N
b0bd6db9-191d-4fc4-a457-136949793966	d126c89c-c02e-40c7-84a6-378e859bd1d4	b921586b-68a2-4373-8b7c-eeb4d2ef0b8c	Act	\N
9bbbce96-ae0a-4bcc-81b3-655e4909b00c	d126c89c-c02e-40c7-84a6-378e859bd1d4	828d89b5-34c4-4375-9cc5-0e8578189df2	Venue	\N
21e6a108-0e4a-42e8-8bc2-e59dfa830f99	d126c89c-c02e-40c7-84a6-378e859bd1d4	09fca024-b5c1-4f81-a71b-a68361548948	Sound	\N
1976f621-d7dc-4eb9-8eb1-14d6cf2a27f0	429dba77-edf3-42d7-8011-3ecd74066463	6c03ce1a-e6e9-4c08-a42e-f225b7f708ff	Act	\N
4c91426f-539f-4e34-9b27-dace8f85a985	429dba77-edf3-42d7-8011-3ecd74066463	828d89b5-34c4-4375-9cc5-0e8578189df2	Venue	\N
a301aa79-efe8-496d-803d-4792a1748cc7	429dba77-edf3-42d7-8011-3ecd74066463	09fca024-b5c1-4f81-a71b-a68361548948	Sound	\N
6bd212de-60c8-4c28-ad67-e9361ec6bb5d	736530f1-ac9c-45b1-814e-384102b3d24b	6c03ce1a-e6e9-4c08-a42e-f225b7f708ff	Act	\N
8fe9ed76-5ef5-4398-966b-16db13bfb131	736530f1-ac9c-45b1-814e-384102b3d24b	fbe26d6b-6835-474c-b972-b7d36fdd6114	Venue	\N
7fee8106-a62f-4017-b77f-6e90aa424114	736530f1-ac9c-45b1-814e-384102b3d24b	09fca024-b5c1-4f81-a71b-a68361548948	Sound	\N
0bc6ef24-5ee5-4ef0-a2a1-9224dd719882	1aee5e52-1b9a-41b6-ad68-74988a827014	ba9ff468-e4b8-4f62-953e-040bc0ec416d	Act	\N
c16e7241-004c-4a41-be9a-4dbec868236d	1aee5e52-1b9a-41b6-ad68-74988a827014	62fe8870-8608-4e44-b6bf-8eef1c0cb75d	Venue	\N
db4cb8a2-b10f-4a1f-a071-57eda629ef5d	1aee5e52-1b9a-41b6-ad68-74988a827014	09fca024-b5c1-4f81-a71b-a68361548948	Sound	\N
ca759276-10e1-465a-ac5a-f72b127b99d6	223bb868-3ce8-4ee5-a39b-27016605ddb7	1a819eac-9538-4464-956e-1d4bca313e4e	Act	\N
1d729da2-ccbc-4460-be30-748292a83e4e	223bb868-3ce8-4ee5-a39b-27016605ddb7	ddd467b5-cd8a-4bb4-99a9-556dace68065	Venue	\N
f8699562-144b-49ee-97ed-9fcc46a8b607	223bb868-3ce8-4ee5-a39b-27016605ddb7	09fca024-b5c1-4f81-a71b-a68361548948	Sound	\N
8e83ffc3-c20f-45a0-96a3-f99d424cc5e8	655e8ad0-f20b-42c8-b9a3-af6cfed9bc97	ba1084b2-abaf-4980-87d2-23deb87985ce	Act	\N
923948d5-b31d-4924-afa1-b8f84069152e	655e8ad0-f20b-42c8-b9a3-af6cfed9bc97	b6b330b9-80c9-4352-ac2e-ed395d84c161	Venue	\N
dbe3c6bf-d738-4a9c-a9b2-f51c5e3bbf3e	655e8ad0-f20b-42c8-b9a3-af6cfed9bc97	09fca024-b5c1-4f81-a71b-a68361548948	Sound	\N
0451a953-b448-458c-9eee-d8d82941bb6d	aeeb2919-1fb1-403b-b943-ce0e22a9175f	ba1084b2-abaf-4980-87d2-23deb87985ce	Act	\N
6d8414b8-548a-4f49-96c2-da54b9cecc38	aeeb2919-1fb1-403b-b943-ce0e22a9175f	b6b330b9-80c9-4352-ac2e-ed395d84c161	Venue	\N
52806a9d-192b-4c2d-8300-cbca20755bd8	aeeb2919-1fb1-403b-b943-ce0e22a9175f	09fca024-b5c1-4f81-a71b-a68361548948	Sound	\N
360a20d8-f512-4166-a393-dbbd85285977	73aaa3cc-fb44-40c6-89af-bed03146a96d	6c03ce1a-e6e9-4c08-a42e-f225b7f708ff	Act	\N
4d60a2d7-40cf-43f7-8388-937c6b6ac0bd	73aaa3cc-fb44-40c6-89af-bed03146a96d	bf545f52-cf50-4d82-975f-855ddcb0a8ce	Venue	\N
bf332a44-4d97-4d40-899f-36f7589325b2	73aaa3cc-fb44-40c6-89af-bed03146a96d	09fca024-b5c1-4f81-a71b-a68361548948	Sound	\N
070f81ab-4259-43d6-8193-7cfb2f9eef9e	27b08b7c-ca9f-4588-8674-02b85aa18795	1a819eac-9538-4464-956e-1d4bca313e4e	Act	\N
6c46770f-28cb-46b9-abc5-22e583991ac2	27b08b7c-ca9f-4588-8674-02b85aa18795	62fe8870-8608-4e44-b6bf-8eef1c0cb75d	Venue	\N
99ea4367-c966-42d2-a460-b026f8edfa30	27b08b7c-ca9f-4588-8674-02b85aa18795	09fca024-b5c1-4f81-a71b-a68361548948	Sound	\N
2661d5e4-f657-4947-b1a2-a9367de03ff9	892ab327-b80d-4657-b47b-fffbf8750b74	afebf956-8d10-4a2b-a20f-0f2ba9a44631	Act	\N
99e75066-dfb1-4533-b211-1e2a5d6ca13e	892ab327-b80d-4657-b47b-fffbf8750b74	540fa944-fce5-4b06-bbf0-5a2418382883	Venue	\N
6e610739-3e01-40e0-9bef-9d6c10635328	892ab327-b80d-4657-b47b-fffbf8750b74	09fca024-b5c1-4f81-a71b-a68361548948	Sound	\N
5ab70a45-7643-487a-a418-2aa9b1a97efc	ecd68d89-0a1b-4e45-8208-91bda132a694	2a045a3f-81df-44a4-8b94-76839c2fa32c	Act	\N
1f32b73e-902a-4275-b4cb-3a493a0c2f09	ecd68d89-0a1b-4e45-8208-91bda132a694	b2da5b8b-92ec-43f0-9d3f-788db837d067	Venue	\N
0f6f7fd3-84e7-4b85-bc21-8d76ee5baacf	ecd68d89-0a1b-4e45-8208-91bda132a694	09fca024-b5c1-4f81-a71b-a68361548948	Sound	\N
59e53cdc-03b5-4a57-8d15-7bce021f8fc7	f9848f9e-9768-4707-8577-ba52c2ba52ba	ba9ff468-e4b8-4f62-953e-040bc0ec416d	Act	\N
df02cec4-c6c9-4029-a986-c4baf7224f0c	f9848f9e-9768-4707-8577-ba52c2ba52ba	9ced396d-5cb2-4835-9f1e-66ba3f741406	Venue	\N
a394ccd0-8ade-4c6f-a62e-fdd015fc835b	f9848f9e-9768-4707-8577-ba52c2ba52ba	09fca024-b5c1-4f81-a71b-a68361548948	Sound	\N
6461c658-bb4f-47da-8046-b5a5ffbbaa43	4eb3e09c-f88d-48b9-a0c6-c26532202a80	c2bb6085-e647-4a76-b5f1-6a81d21577ed	Act	\N
cd54037a-2ca7-4c97-8860-7ef5d96f709c	4eb3e09c-f88d-48b9-a0c6-c26532202a80	b82328b3-98fe-4db7-964b-b5455e492108	Venue	\N
e8416736-9eb6-4c00-9baf-8ac26c9849e6	4eb3e09c-f88d-48b9-a0c6-c26532202a80	09fca024-b5c1-4f81-a71b-a68361548948	Sound	\N
d18bbd8f-a6e9-46b5-a70f-d700f7880a96	d430cabd-f85d-437f-ace2-0d53b567d5d4	b921586b-68a2-4373-8b7c-eeb4d2ef0b8c	Act	\N
30a817f2-6ccf-4baa-b397-5aa9d943c591	d430cabd-f85d-437f-ace2-0d53b567d5d4	b2da5b8b-92ec-43f0-9d3f-788db837d067	Venue	\N
31a5255a-ec9a-4571-97e0-c6b35ef1c56d	d430cabd-f85d-437f-ace2-0d53b567d5d4	09fca024-b5c1-4f81-a71b-a68361548948	Sound	\N
e84d4113-cb6e-48a8-a77c-5cf12500085e	5800bc44-2d74-45c2-9aea-6f37f1663c94	99693fdc-ecd5-49b7-aa95-9caa7e0431a0	Act	\N
ef78b450-b11f-495f-9b59-aecfbbe45606	5800bc44-2d74-45c2-9aea-6f37f1663c94	cb833228-88c7-4245-a184-d365e4fdb40d	Venue	\N
aa10ecc2-42f7-4d11-9802-e3fc5d434396	5800bc44-2d74-45c2-9aea-6f37f1663c94	09fca024-b5c1-4f81-a71b-a68361548948	Sound	\N
52364418-5fd2-4077-af30-1f23be946d60	754a8c8f-6571-49a5-bfb9-4cab546b2b52	c9761b46-01a7-40dc-bbf2-1d6f034c4707	Act	\N
532b8eb8-896b-403b-81a9-d5fe6261015e	754a8c8f-6571-49a5-bfb9-4cab546b2b52	b82328b3-98fe-4db7-964b-b5455e492108	Venue	\N
404abf28-f275-4fe5-bf80-2d149701f9d3	754a8c8f-6571-49a5-bfb9-4cab546b2b52	09fca024-b5c1-4f81-a71b-a68361548948	Sound	\N
8b654064-6540-441d-acaf-4e924ea358ae	df03f2e6-f50b-46d6-8f6e-1725c6926509	ba9ff468-e4b8-4f62-953e-040bc0ec416d	Act	\N
96455092-525a-448b-a59f-c41af6c58162	df03f2e6-f50b-46d6-8f6e-1725c6926509	62fe8870-8608-4e44-b6bf-8eef1c0cb75d	Venue	\N
1a3f75c2-c517-47bc-b615-f845a1e2df17	df03f2e6-f50b-46d6-8f6e-1725c6926509	09fca024-b5c1-4f81-a71b-a68361548948	Sound	\N
7e5cc48a-fbad-4be7-aceb-d099c16b76ea	7168fe81-7290-4daf-8d16-19971965f907	ba9ff468-e4b8-4f62-953e-040bc0ec416d	Act	\N
9f9f5847-e30b-46b2-b8b3-c03623ef9ad2	7168fe81-7290-4daf-8d16-19971965f907	828d89b5-34c4-4375-9cc5-0e8578189df2	Venue	\N
773ab0da-f4bd-4a99-b44c-f40a2888b1ff	7168fe81-7290-4daf-8d16-19971965f907	09fca024-b5c1-4f81-a71b-a68361548948	Sound	\N
d54ef60c-4e0e-4ef4-aba8-97a84240ce7e	bc241120-b2af-4439-8373-65ea20929256	eafca38d-1b02-4572-a287-19c884bc5dd9	Act	\N
8874bb38-660f-4539-8c4d-eaf866a0cb78	bc241120-b2af-4439-8373-65ea20929256	b2da5b8b-92ec-43f0-9d3f-788db837d067	Venue	\N
ba5afcea-af35-46d5-ab4c-1eb16ac99ebe	bc241120-b2af-4439-8373-65ea20929256	09fca024-b5c1-4f81-a71b-a68361548948	Sound	\N
4b195ed6-76d6-4b5d-8b7e-1ba6bd449d30	01f4f413-70a2-404f-b9a9-c97eb937b5a8	ba9ff468-e4b8-4f62-953e-040bc0ec416d	Act	\N
eb838065-cdd7-43af-ae7f-1fb096593e3f	01f4f413-70a2-404f-b9a9-c97eb937b5a8	ba7694d3-7b0e-4bfb-bdad-e21ed05a020b	Venue	\N
90e1df07-0c1f-427c-9bbb-ad26af6c8578	01f4f413-70a2-404f-b9a9-c97eb937b5a8	09fca024-b5c1-4f81-a71b-a68361548948	Sound	\N
a499423e-b982-4d0f-81b6-8d31f9489b3f	6ee36296-acbd-4c60-9d83-825339a121cc	27e5d12f-0843-4fab-9368-e24077d31d94	Act	\N
55b6e0eb-3b2b-4494-8851-acc5e39f04f0	6ee36296-acbd-4c60-9d83-825339a121cc	b82328b3-98fe-4db7-964b-b5455e492108	Venue	\N
894a7d2e-0773-4e0f-876f-dd0242c9bef2	6ee36296-acbd-4c60-9d83-825339a121cc	09fca024-b5c1-4f81-a71b-a68361548948	Sound	\N
151616ba-170f-4be9-a094-503d5c014e94	fb362402-77fe-4b70-868c-cec7e1300354	ba9ff468-e4b8-4f62-953e-040bc0ec416d	Act	\N
9ebdf1ee-db47-4d7e-a59f-850fe8f78758	fb362402-77fe-4b70-868c-cec7e1300354	0e39fd33-f09e-4f3e-b225-a7f71192c10f	Venue	\N
2f69673f-1e1d-463c-a35c-2b29361419fe	fb362402-77fe-4b70-868c-cec7e1300354	09fca024-b5c1-4f81-a71b-a68361548948	Sound	\N
fa9b4a53-5e9c-4c1b-b625-c818e3e6ea5e	a061fefe-f7c6-4d1f-9976-49261da21b2f	9611345f-c691-4f43-bba8-76433392a16a	Act	\N
d5e31566-b79c-4852-b3c5-8e8e9970c47e	a061fefe-f7c6-4d1f-9976-49261da21b2f	cfc55db2-2e8e-4784-98f3-6497566939e5	Venue	\N
94153ac9-6e21-4bb0-aa3c-e8ad7e76b644	a061fefe-f7c6-4d1f-9976-49261da21b2f	09fca024-b5c1-4f81-a71b-a68361548948	Sound	\N
0da61c6e-93fb-467e-a5e8-42c417aca571	932f11fc-1e8c-4318-8a34-a8e59ece180c	ba9ff468-e4b8-4f62-953e-040bc0ec416d	Act	\N
c735a955-6462-47a1-80fc-622ed6b5a2f8	932f11fc-1e8c-4318-8a34-a8e59ece180c	e959aeb8-1f0a-41f2-a469-c8ee0f7579c1	Venue	\N
7693a2cd-7826-4750-b936-5ef4deb898d7	932f11fc-1e8c-4318-8a34-a8e59ece180c	09fca024-b5c1-4f81-a71b-a68361548948	Sound	\N
9585490d-d663-4cfc-92db-9b59cbefd148	7c9c6305-e4ae-4833-8aba-357cb920b7d9	09fca024-b5c1-4f81-a71b-a68361548948	Sound	\N
5b17a60d-a7d8-40b4-8684-ddb15e4cc1db	c4d2f505-4134-48ec-b9a6-7b4d71682728	ba9ff468-e4b8-4f62-953e-040bc0ec416d	Act	\N
51dcfa40-5a56-4559-922a-d96ac068cdd7	c4d2f505-4134-48ec-b9a6-7b4d71682728	9ced396d-5cb2-4835-9f1e-66ba3f741406	Venue	\N
0b01c3f3-b9f3-4247-841e-e9a874db9e18	c4d2f505-4134-48ec-b9a6-7b4d71682728	09fca024-b5c1-4f81-a71b-a68361548948	Sound	\N
48991750-bfbc-49e5-81c3-763f28d6e9f8	82bd57e8-bc54-46d6-9f77-b73fb4b0f9b1	632d52f1-1aac-4810-ae76-35ccee4e3866	Act	\N
ab5d628c-0215-40ed-80bc-b2f146479d9b	82bd57e8-bc54-46d6-9f77-b73fb4b0f9b1	63fd3d39-d132-425f-88c6-e7c4c77deef7	Venue	\N
44a2642c-8927-40b6-ac01-e463d19a455b	82bd57e8-bc54-46d6-9f77-b73fb4b0f9b1	09fca024-b5c1-4f81-a71b-a68361548948	Sound	\N
c241f691-b38d-444a-a796-3f6a5978030a	96ede74e-c30b-419f-8513-93466f02150a	1a819eac-9538-4464-956e-1d4bca313e4e	Act	\N
3e4c0ea4-7e2c-4ff9-a4ab-91280b0d48d9	96ede74e-c30b-419f-8513-93466f02150a	ddd467b5-cd8a-4bb4-99a9-556dace68065	Venue	\N
18c8226e-590a-4811-9b3a-0af52b964a13	96ede74e-c30b-419f-8513-93466f02150a	09fca024-b5c1-4f81-a71b-a68361548948	Sound	\N
8b9edb5d-acd6-4bf1-bfbc-e15214791570	15215058-48ae-44f6-9f62-807c6ccdf0d7	ba1084b2-abaf-4980-87d2-23deb87985ce	Act	\N
0040a884-663d-42ab-b76f-1047337f44be	15215058-48ae-44f6-9f62-807c6ccdf0d7	b6b330b9-80c9-4352-ac2e-ed395d84c161	Venue	\N
b74143fc-338e-4557-b212-a39461a6c58b	15215058-48ae-44f6-9f62-807c6ccdf0d7	09fca024-b5c1-4f81-a71b-a68361548948	Sound	\N
d4dd30e5-9a16-4120-9c83-c73e78238946	2df30e5f-b860-4870-8a91-16823353f010	99693fdc-ecd5-49b7-aa95-9caa7e0431a0	Act	\N
f99a8996-479d-4a7d-8691-e01c63d27ed1	2df30e5f-b860-4870-8a91-16823353f010	cb833228-88c7-4245-a184-d365e4fdb40d	Venue	\N
46f22ad4-370e-4cb9-99f8-a93fad0f527e	2df30e5f-b860-4870-8a91-16823353f010	09fca024-b5c1-4f81-a71b-a68361548948	Sound	\N
fb20c9bb-d9b0-49f7-8aa4-bb9ac0d75771	007dade4-7768-4a5e-88df-09148dc6d006	a58456bc-5bcd-488c-8345-3c3e3d311cbe	Act	\N
94eb6f5a-064d-480b-a9f7-ea60913c81a1	007dade4-7768-4a5e-88df-09148dc6d006	b2da5b8b-92ec-43f0-9d3f-788db837d067	Venue	\N
b3633d59-fe98-4eca-963c-610eeec725a7	007dade4-7768-4a5e-88df-09148dc6d006	09fca024-b5c1-4f81-a71b-a68361548948	Sound	\N
42dc774d-1672-45bd-b413-6720b822de22	f17cfba2-9afb-42c7-8949-df6c272de3dd	e98bb8af-1346-4cd4-bd13-b5cc86bd70b9	Act	\N
b9187be8-c25b-4f58-8ec7-c3a9016691a6	f17cfba2-9afb-42c7-8949-df6c272de3dd	5efa2f7b-f8d3-495a-8da5-56ca58050ea2	Venue	\N
e3d68101-2cc0-4cdd-a196-fe31bdcde61d	f17cfba2-9afb-42c7-8949-df6c272de3dd	09fca024-b5c1-4f81-a71b-a68361548948	Sound	\N
fb7b8eb4-adcf-4da2-bef1-5df9983be634	47745061-f574-46a7-8503-617ca0396d61	e98bb8af-1346-4cd4-bd13-b5cc86bd70b9	Act	\N
f336cc00-ff5a-4c97-90d8-2a8a87c79a26	47745061-f574-46a7-8503-617ca0396d61	5efa2f7b-f8d3-495a-8da5-56ca58050ea2	Venue	\N
618f5f5d-554c-4836-b9e4-ee7a825fb751	47745061-f574-46a7-8503-617ca0396d61	09fca024-b5c1-4f81-a71b-a68361548948	Sound	\N
8557a720-8f1f-44ce-9523-12b6d2455905	1ce45cbd-7448-4cf6-a7e3-c59688e361f6	a58456bc-5bcd-488c-8345-3c3e3d311cbe	Act	\N
adc57879-306f-4e81-be09-ab7047d9dd77	1ce45cbd-7448-4cf6-a7e3-c59688e361f6	b2da5b8b-92ec-43f0-9d3f-788db837d067	Venue	\N
0fec3711-20e2-4d72-8003-768431bcb99f	1ce45cbd-7448-4cf6-a7e3-c59688e361f6	09fca024-b5c1-4f81-a71b-a68361548948	Sound	\N
4c054022-cf1e-4526-aa77-96527c0c8a2a	17147147-5674-47c5-9d82-570e714b2111	ba9ff468-e4b8-4f62-953e-040bc0ec416d	Act	\N
fc7d3e67-6d12-4b2b-a766-2f90de284538	17147147-5674-47c5-9d82-570e714b2111	ba7694d3-7b0e-4bfb-bdad-e21ed05a020b	Venue	\N
ef850318-b508-417d-bb85-767089490c4b	17147147-5674-47c5-9d82-570e714b2111	09fca024-b5c1-4f81-a71b-a68361548948	Sound	\N
e96cf70e-e79e-4f52-94d3-3d2c21176366	88c94db7-42b9-456d-b0b7-50cb7737cd80	1e8b6859-2ac8-470d-be50-8b83c93cdfaa	Act	\N
a9b9817d-7701-432c-874e-67f6a7fc95a3	88c94db7-42b9-456d-b0b7-50cb7737cd80	b82328b3-98fe-4db7-964b-b5455e492108	Venue	\N
fd047994-15a3-4956-bbe3-295756a8966e	88c94db7-42b9-456d-b0b7-50cb7737cd80	09fca024-b5c1-4f81-a71b-a68361548948	Sound	\N
2a6ad8a5-04d8-4d98-abde-a1955d6a7bcb	c52dbd70-98d9-44cd-913b-decfea646b20	ba9ff468-e4b8-4f62-953e-040bc0ec416d	Act	\N
0084b3aa-fbd8-4e36-ba65-1061c5574cc3	c52dbd70-98d9-44cd-913b-decfea646b20	fcb7020e-1341-42cb-b6ea-f6423f318055	Venue	\N
cc0eaf64-1cd4-46b2-984c-8741e3bb8387	c52dbd70-98d9-44cd-913b-decfea646b20	09fca024-b5c1-4f81-a71b-a68361548948	Sound	\N
6fa2a0a7-a64c-463d-8fb9-87fa2cd00cc1	c6beab7e-948a-4d76-a628-9b12e6394226	ba1084b2-abaf-4980-87d2-23deb87985ce	Act	\N
924bad06-b460-4d85-bf4c-d802a2d71820	c6beab7e-948a-4d76-a628-9b12e6394226	c32ae626-73ab-473d-96e8-a5c6eda48c2f	Venue	\N
f3f6699e-2009-460f-990e-0234ea149113	c6beab7e-948a-4d76-a628-9b12e6394226	09fca024-b5c1-4f81-a71b-a68361548948	Sound	\N
56a491be-de81-428c-bbb3-3d459673e18f	4d2f3b80-1aad-440c-a3d2-4c24fe03727a	61a3734a-2c82-4923-8ad4-943e3759fdf3	Act	\N
7afee953-16c9-402d-b87e-74809eb4146f	4d2f3b80-1aad-440c-a3d2-4c24fe03727a	8ecffb09-1347-40eb-8923-87f467448087	Venue	\N
1951fb33-a668-42bb-b41d-ec8bafe6908f	4d2f3b80-1aad-440c-a3d2-4c24fe03727a	09fca024-b5c1-4f81-a71b-a68361548948	Sound	\N
c2624007-1576-43c2-8392-d602232836ac	571b8639-2e14-43d2-abc1-4dc85698d349	1ab6341b-4f95-4949-8135-814765239612	Act	\N
5402bea3-4d64-4f43-8233-7d5ad3e47f05	571b8639-2e14-43d2-abc1-4dc85698d349	828d89b5-34c4-4375-9cc5-0e8578189df2	Venue	\N
6cee1f16-1262-4fd2-a55f-2418b5df749e	571b8639-2e14-43d2-abc1-4dc85698d349	09fca024-b5c1-4f81-a71b-a68361548948	Sound	\N
9de6bde6-5099-47ee-8475-88f66048759d	158843aa-888c-418e-9e2b-cd216d55d56f	632d52f1-1aac-4810-ae76-35ccee4e3866	Act	\N
44a0d310-e41b-4905-b40c-88927ae9c0c4	158843aa-888c-418e-9e2b-cd216d55d56f	63fd3d39-d132-425f-88c6-e7c4c77deef7	Venue	\N
f4c8201a-cbe3-44f0-ac1a-ac696934434b	158843aa-888c-418e-9e2b-cd216d55d56f	09fca024-b5c1-4f81-a71b-a68361548948	Sound	\N
1c0bcc3a-b34a-4bd4-a503-d47a4e4d7f14	0d2c365d-1404-4b88-ba3a-d79f4669a655	99693fdc-ecd5-49b7-aa95-9caa7e0431a0	Act	\N
fa48ee57-ffb3-449d-ab24-e4d9fc3f2f1b	0d2c365d-1404-4b88-ba3a-d79f4669a655	cb833228-88c7-4245-a184-d365e4fdb40d	Venue	\N
dcb0f999-a770-485a-a2f1-2054f5ac5330	0d2c365d-1404-4b88-ba3a-d79f4669a655	09fca024-b5c1-4f81-a71b-a68361548948	Sound	\N
84ac0efe-41ad-4068-85f5-8c50a4fb61f6	a518ec75-8fd7-4cea-b2cc-79581c908a92	ba1084b2-abaf-4980-87d2-23deb87985ce	Act	\N
8e704c35-007d-4f33-b1fc-ce25cb6aa7a9	a518ec75-8fd7-4cea-b2cc-79581c908a92	f35933a2-5424-425f-b8d2-d84647ff5ba7	Venue	\N
c9cd5615-a28b-4926-b774-f883d18e2375	a518ec75-8fd7-4cea-b2cc-79581c908a92	09fca024-b5c1-4f81-a71b-a68361548948	Sound	\N
7fc42c10-2419-44d2-9f3d-5c8338ec9d43	2888be19-92ea-4fb9-9a42-d85ec71265bb	ba9ff468-e4b8-4f62-953e-040bc0ec416d	Act	\N
9601e865-70d0-496a-b069-d2ffb1fcbbd3	2888be19-92ea-4fb9-9a42-d85ec71265bb	62fe8870-8608-4e44-b6bf-8eef1c0cb75d	Venue	\N
94c2ec33-d6f9-4388-b1b4-160b1bf44f88	2888be19-92ea-4fb9-9a42-d85ec71265bb	09fca024-b5c1-4f81-a71b-a68361548948	Sound	\N
d2486a2b-509c-40b6-a06f-403646a930c9	9681acd9-588a-4d37-9a73-70e5e8c5a1ed	632d52f1-1aac-4810-ae76-35ccee4e3866	Act	\N
a668d5a5-5a21-45ea-8cc5-38dd58fb04a2	9681acd9-588a-4d37-9a73-70e5e8c5a1ed	63fd3d39-d132-425f-88c6-e7c4c77deef7	Venue	\N
7d2ddf73-d78d-42c9-aef0-0365b7aa6320	9681acd9-588a-4d37-9a73-70e5e8c5a1ed	09fca024-b5c1-4f81-a71b-a68361548948	Sound	\N
de0ab4a1-e8dd-4d84-bdd7-231cd20fc6e1	f94a88ef-cb13-409e-9138-005f56406e2a	1a819eac-9538-4464-956e-1d4bca313e4e	Act	\N
474d789a-559d-4691-9b9f-29b3c668b59a	f94a88ef-cb13-409e-9138-005f56406e2a	ddd467b5-cd8a-4bb4-99a9-556dace68065	Venue	\N
7b5fab80-71c4-496b-ad2a-0f66683c6ff8	f94a88ef-cb13-409e-9138-005f56406e2a	09fca024-b5c1-4f81-a71b-a68361548948	Sound	\N
e4ccc3d1-6256-4e54-be49-220911140e1c	06b0b468-2da2-4b00-8adb-9ea3ad577ba6	99693fdc-ecd5-49b7-aa95-9caa7e0431a0	Act	\N
ee2c5364-b8ff-4721-bd89-da92079538cf	06b0b468-2da2-4b00-8adb-9ea3ad577ba6	cb833228-88c7-4245-a184-d365e4fdb40d	Venue	\N
d2778b77-c33c-4734-a8db-fc8d60a7f8c3	06b0b468-2da2-4b00-8adb-9ea3ad577ba6	09fca024-b5c1-4f81-a71b-a68361548948	Sound	\N
6f48c1e3-372d-4cc5-9e6a-d4885c000663	47e95e09-7a62-4560-92c5-42448b948f8f	ba9ff468-e4b8-4f62-953e-040bc0ec416d	Act	\N
af933535-845a-4a4f-8e2e-bd03b46e2b68	47e95e09-7a62-4560-92c5-42448b948f8f	9ced396d-5cb2-4835-9f1e-66ba3f741406	Venue	\N
a239f8a2-a239-4343-a6bf-840c30812c13	47e95e09-7a62-4560-92c5-42448b948f8f	09fca024-b5c1-4f81-a71b-a68361548948	Sound	\N
8aabdeec-fdd0-4ed2-9611-fbac8a839b75	cf74f735-ecd2-41cb-8d4e-3a3cf46e18e1	ba9ff468-e4b8-4f62-953e-040bc0ec416d	Act	\N
ff5ca918-6b8e-4a1f-a4b4-8cca20bcd8b7	cf74f735-ecd2-41cb-8d4e-3a3cf46e18e1	0e39fd33-f09e-4f3e-b225-a7f71192c10f	Venue	\N
6431a8b2-fa60-4f0a-a459-bdb3021babeb	cf74f735-ecd2-41cb-8d4e-3a3cf46e18e1	09fca024-b5c1-4f81-a71b-a68361548948	Sound	\N
05451b40-b2bd-44e0-ae3a-42540eb130b5	24eabe32-f073-4370-bd5c-fe01e3929679	6c03ce1a-e6e9-4c08-a42e-f225b7f708ff	Act	\N
d7b5a795-80ff-4ff3-927c-cd81cca07bdf	24eabe32-f073-4370-bd5c-fe01e3929679	2bd018a4-6348-4a85-b78d-4446b5107234	Venue	\N
27863c3c-5141-4918-bd70-3e4bbaeb9452	24eabe32-f073-4370-bd5c-fe01e3929679	09fca024-b5c1-4f81-a71b-a68361548948	Sound	\N
03be938d-cc07-4cd4-83a6-d7f85b662b1d	7ab563a1-44d8-4da5-952f-4f12e48d4308	1a819eac-9538-4464-956e-1d4bca313e4e	Act	\N
90c374a8-80ec-45f7-b3cd-549ceabeb4fe	7ab563a1-44d8-4da5-952f-4f12e48d4308	93544cfe-c4d8-4566-8748-b3964a56cabb	Venue	\N
6498f867-f5b2-4345-abee-1eb5bea586b6	7ab563a1-44d8-4da5-952f-4f12e48d4308	09fca024-b5c1-4f81-a71b-a68361548948	Sound	\N
b8c11607-6a2e-4413-8580-122cc6140bcc	2fe8894b-fa68-4ef3-9d8a-7162f8c2c42b	6c03ce1a-e6e9-4c08-a42e-f225b7f708ff	Act	\N
2a656756-f4ae-4b73-8f45-8b555d783ae0	2fe8894b-fa68-4ef3-9d8a-7162f8c2c42b	c32ae626-73ab-473d-96e8-a5c6eda48c2f	Venue	\N
736f6e5e-477b-4e0f-a585-50aeb2cb9a60	2fe8894b-fa68-4ef3-9d8a-7162f8c2c42b	09fca024-b5c1-4f81-a71b-a68361548948	Sound	\N
ac766cde-97d4-44f4-be67-2371d446ed9e	6b1decfb-65f5-413c-a359-23811f1f6d7c	ba9ff468-e4b8-4f62-953e-040bc0ec416d	Act	\N
d0ca8251-6d7b-4c6a-838a-b5663d06ac65	6b1decfb-65f5-413c-a359-23811f1f6d7c	9ced396d-5cb2-4835-9f1e-66ba3f741406	Venue	\N
0fe2ec22-f0e1-4a55-b6c1-84ede5f22d49	6b1decfb-65f5-413c-a359-23811f1f6d7c	09fca024-b5c1-4f81-a71b-a68361548948	Sound	\N
c74b6053-f53f-4dec-8ba3-dcacbd2fe3db	b36f454c-8117-46b2-b9ef-832ffe100d83	ba9ff468-e4b8-4f62-953e-040bc0ec416d	Act	\N
0ed60341-8230-4ba9-b1b2-9fd8795aa513	b36f454c-8117-46b2-b9ef-832ffe100d83	f59fa3ea-aeca-4fa6-b099-42a0deaf06aa	Venue	\N
052c0042-342a-48a8-9ef3-7be5cfc895db	b36f454c-8117-46b2-b9ef-832ffe100d83	09fca024-b5c1-4f81-a71b-a68361548948	Sound	\N
73a8c663-a52c-4da4-9df4-f1f9a9864f9b	9def06dc-306c-486e-a3f8-23fefe478818	ba9ff468-e4b8-4f62-953e-040bc0ec416d	Act	\N
418ccfb1-8bcb-4cdd-bec2-9e72b4100648	9def06dc-306c-486e-a3f8-23fefe478818	ba7694d3-7b0e-4bfb-bdad-e21ed05a020b	Venue	\N
ef950034-a887-4034-a4b7-188cec9e8bdd	9def06dc-306c-486e-a3f8-23fefe478818	09fca024-b5c1-4f81-a71b-a68361548948	Sound	\N
b3cb7800-cf0c-4cee-b65f-09e61b857f2c	c832a4bb-3363-4f1b-8443-37998e62aa3c	1a819eac-9538-4464-956e-1d4bca313e4e	Act	\N
f39b5774-ea6f-4d63-8da0-3dcc31f71f8a	c832a4bb-3363-4f1b-8443-37998e62aa3c	0e39fd33-f09e-4f3e-b225-a7f71192c10f	Venue	\N
bbb76169-46f2-4fb7-a095-e61684e69812	c832a4bb-3363-4f1b-8443-37998e62aa3c	09fca024-b5c1-4f81-a71b-a68361548948	Sound	\N
b0820a3f-d310-4590-843d-2bc479430e93	3cf8d225-1138-4997-84b8-541c52dbd3db	ba9ff468-e4b8-4f62-953e-040bc0ec416d	Act	\N
e38fdd8c-59c7-4feb-b0ca-0aa826c5b82b	3cf8d225-1138-4997-84b8-541c52dbd3db	ba7694d3-7b0e-4bfb-bdad-e21ed05a020b	Venue	\N
fa07c00d-8599-41dd-a8c6-d7c988b8b56e	3cf8d225-1138-4997-84b8-541c52dbd3db	09fca024-b5c1-4f81-a71b-a68361548948	Sound	\N
4dc96551-8ba8-47a6-83e9-e9821c28da0f	c582b2a9-830e-418d-8b2e-2437062fcf41	99693fdc-ecd5-49b7-aa95-9caa7e0431a0	Act	\N
b8c855cf-ede3-454f-a48f-a12e06c67d4c	c582b2a9-830e-418d-8b2e-2437062fcf41	cb833228-88c7-4245-a184-d365e4fdb40d	Venue	\N
4b0cb3ab-8a8f-4539-a8c0-8eb27ecd9caf	c582b2a9-830e-418d-8b2e-2437062fcf41	09fca024-b5c1-4f81-a71b-a68361548948	Sound	\N
4669e4b3-6ed5-48ce-b089-6edc1a6fda89	0717da11-9d9e-4e8d-ba5e-d7769be4614a	ba9ff468-e4b8-4f62-953e-040bc0ec416d	Act	\N
da41a0f8-8a95-42fd-a24a-ac22ab318455	0717da11-9d9e-4e8d-ba5e-d7769be4614a	0e39fd33-f09e-4f3e-b225-a7f71192c10f	Venue	\N
eb9c4b6d-6361-4951-96de-dcc3affd05af	0717da11-9d9e-4e8d-ba5e-d7769be4614a	09fca024-b5c1-4f81-a71b-a68361548948	Sound	\N
bd9b16cd-dcd0-4fb0-b710-c3d3f7d5d29b	754a3af1-26c1-4645-9740-2bc7dc9e59de	efc6f1e0-c7b2-4604-994a-4ef60b4b0f16	Act	\N
729bc328-b425-49ce-9795-9dcb628bc74a	754a3af1-26c1-4645-9740-2bc7dc9e59de	09fca024-b5c1-4f81-a71b-a68361548948	Sound	\N
d2f6dde3-a4c7-480d-82e2-bfc57dd6cc0d	feaaa92c-d3ac-4cf6-9ae6-871ad5807566	ba9ff468-e4b8-4f62-953e-040bc0ec416d	Act	\N
ee40056c-063c-49f8-97e5-51f7851a4bb6	feaaa92c-d3ac-4cf6-9ae6-871ad5807566	9ced396d-5cb2-4835-9f1e-66ba3f741406	Venue	\N
fb9969b1-6ac3-4a03-8ace-0e74c0dbbadc	feaaa92c-d3ac-4cf6-9ae6-871ad5807566	09fca024-b5c1-4f81-a71b-a68361548948	Sound	\N
a20e3bda-3fc8-444b-8006-7bd8b1811c27	b8af02cc-6e76-4097-9b91-e8d3b2006582	632d52f1-1aac-4810-ae76-35ccee4e3866	Act	\N
cd69bf71-ff90-4e46-9456-e630d4fa5ecd	b8af02cc-6e76-4097-9b91-e8d3b2006582	63fd3d39-d132-425f-88c6-e7c4c77deef7	Venue	\N
b01a9389-940e-4911-bffe-f1ffd1aa931c	b8af02cc-6e76-4097-9b91-e8d3b2006582	09fca024-b5c1-4f81-a71b-a68361548948	Sound	\N
57bbb5f9-1d4f-4c11-a3f3-91fdce1350ef	86b031cd-94e3-40a7-987d-d5d974429837	a58456bc-5bcd-488c-8345-3c3e3d311cbe	Act	\N
e79d498f-124c-4fdd-af87-e07a47b8374f	86b031cd-94e3-40a7-987d-d5d974429837	b2da5b8b-92ec-43f0-9d3f-788db837d067	Venue	\N
6299ed89-f464-4a5f-ad02-87283a291efb	86b031cd-94e3-40a7-987d-d5d974429837	09fca024-b5c1-4f81-a71b-a68361548948	Sound	\N
a98562cc-142d-4b14-a6ab-4e27b323f452	2acd506e-9062-4dea-9ccd-8d43f2207f9c	ba9ff468-e4b8-4f62-953e-040bc0ec416d	Act	\N
862781b9-7524-472d-81f8-1d6510e9e5d2	2acd506e-9062-4dea-9ccd-8d43f2207f9c	9ced396d-5cb2-4835-9f1e-66ba3f741406	Venue	\N
f90d04be-ca40-411d-b383-ff2a0d8810b7	2acd506e-9062-4dea-9ccd-8d43f2207f9c	09fca024-b5c1-4f81-a71b-a68361548948	Sound	\N
19a432b6-29ce-451f-856c-87f642b4a162	606e743c-d7df-488c-9ebe-e36a12bfc127	a58456bc-5bcd-488c-8345-3c3e3d311cbe	Act	\N
298b90ed-61ac-4c6f-b7a9-ac1213298701	606e743c-d7df-488c-9ebe-e36a12bfc127	b2da5b8b-92ec-43f0-9d3f-788db837d067	Venue	\N
a1be1306-88ed-4020-b58c-43e2f7e728c1	606e743c-d7df-488c-9ebe-e36a12bfc127	09fca024-b5c1-4f81-a71b-a68361548948	Sound	\N
0769302b-9fe0-47bb-823e-bfe38e3946bb	66e04305-cff4-4a0a-a5ae-769d479bdab9	00d50a2a-9c93-409f-8f7a-f4a0677f0451	Act	\N
3359cdda-a375-4dbb-8b8f-87228fcb36db	66e04305-cff4-4a0a-a5ae-769d479bdab9	0dc59bb2-b3d4-4d48-86ce-809ec957cfd1	Venue	\N
dd2a1af4-4578-4356-bafb-13a996e39393	66e04305-cff4-4a0a-a5ae-769d479bdab9	09fca024-b5c1-4f81-a71b-a68361548948	Sound	\N
d6d5ae01-aaff-4e1a-934f-fb78078bb709	d51c8555-bc40-4649-b84a-bea439e03414	f2427546-4b6c-42f9-aed5-90abfe849f2c	Act	\N
42cc88db-4bc0-45e7-979c-4b3b77323e9c	d51c8555-bc40-4649-b84a-bea439e03414	b2da5b8b-92ec-43f0-9d3f-788db837d067	Venue	\N
7a27adb9-35b7-41d1-aacb-3305860079fa	d51c8555-bc40-4649-b84a-bea439e03414	09fca024-b5c1-4f81-a71b-a68361548948	Sound	\N
5a5befa8-a827-42fe-85bb-566829fd7f3b	0971a6e3-a628-4529-9cbc-8a372569f90b	1a819eac-9538-4464-956e-1d4bca313e4e	Act	\N
5766c5aa-93d1-4a27-80e9-78edbb3a33f2	0971a6e3-a628-4529-9cbc-8a372569f90b	ddd467b5-cd8a-4bb4-99a9-556dace68065	Venue	\N
f6bca4c9-ee33-4c19-80e7-942b36acea3e	0971a6e3-a628-4529-9cbc-8a372569f90b	09fca024-b5c1-4f81-a71b-a68361548948	Sound	\N
c18bc7f0-cb31-49b4-a22b-025af4187e6c	dbbd018e-9007-45be-8306-7272ece132bd	ba9ff468-e4b8-4f62-953e-040bc0ec416d	Act	\N
f186b141-2628-4c6c-8b30-0434fe6bac6a	dbbd018e-9007-45be-8306-7272ece132bd	ba7694d3-7b0e-4bfb-bdad-e21ed05a020b	Venue	\N
e751aa7f-cccc-4912-8532-622242e7a3dc	dbbd018e-9007-45be-8306-7272ece132bd	09fca024-b5c1-4f81-a71b-a68361548948	Sound	\N
e69f6904-d90c-48c3-b3ed-dddc474d6a82	ea13d9e3-5e97-44f6-b2d0-0dd3db79ad32	632d52f1-1aac-4810-ae76-35ccee4e3866	Act	\N
ef017976-dd5a-4ea1-a6c0-c8ad4f332930	ea13d9e3-5e97-44f6-b2d0-0dd3db79ad32	63fd3d39-d132-425f-88c6-e7c4c77deef7	Venue	\N
6cd1467b-87d4-4e99-8c0b-b062b26c75a6	ea13d9e3-5e97-44f6-b2d0-0dd3db79ad32	09fca024-b5c1-4f81-a71b-a68361548948	Sound	\N
6475fb69-a7f0-4fe6-a966-78a69c797767	425d1e79-8ed9-4367-8dff-afa1602b207f	632d52f1-1aac-4810-ae76-35ccee4e3866	Act	\N
146c7958-d037-4fd2-81c6-3de7bd872668	425d1e79-8ed9-4367-8dff-afa1602b207f	63fd3d39-d132-425f-88c6-e7c4c77deef7	Venue	\N
b6c62842-7fee-4269-b7f1-e02cb7fb8425	425d1e79-8ed9-4367-8dff-afa1602b207f	09fca024-b5c1-4f81-a71b-a68361548948	Sound	\N
02cf9d08-a513-4915-bd71-fbe0e58c4f6b	b2a54a50-45bf-434e-99cb-6cfaba2af0fe	ba1084b2-abaf-4980-87d2-23deb87985ce	Act	\N
840037c1-c8e4-4a15-a576-e6415b6a6fe5	b2a54a50-45bf-434e-99cb-6cfaba2af0fe	b6b330b9-80c9-4352-ac2e-ed395d84c161	Venue	\N
bf03dfb7-ba11-468a-bf33-bf41df8b8480	b2a54a50-45bf-434e-99cb-6cfaba2af0fe	09fca024-b5c1-4f81-a71b-a68361548948	Sound	\N
262ad64d-0949-4c5e-964a-d21b97386857	54358ce8-0f7c-4f63-8a5b-44922cc65fec	efc6f1e0-c7b2-4604-994a-4ef60b4b0f16	Act	\N
54440641-a3df-4b65-acc0-bbabc04e2641	54358ce8-0f7c-4f63-8a5b-44922cc65fec	828d89b5-34c4-4375-9cc5-0e8578189df2	Venue	\N
ba362fa8-5548-40bc-a56a-774cc7572662	54358ce8-0f7c-4f63-8a5b-44922cc65fec	09fca024-b5c1-4f81-a71b-a68361548948	Sound	\N
756cafe4-44c2-49f4-8775-e450fb40dc8a	1a85d900-e4d4-41aa-bdcc-17e1412b4bad	ba9ff468-e4b8-4f62-953e-040bc0ec416d	Act	\N
c5cf1b3a-9cd9-4cf0-b688-b3b4f40e6289	1a85d900-e4d4-41aa-bdcc-17e1412b4bad	0e39fd33-f09e-4f3e-b225-a7f71192c10f	Venue	\N
ef0f02ad-c73d-4c45-a48b-33fd6654ad2d	1a85d900-e4d4-41aa-bdcc-17e1412b4bad	09fca024-b5c1-4f81-a71b-a68361548948	Sound	\N
2250cf43-f919-45c1-9c52-a5a9b5208144	66e99d56-061f-4dc5-a6f3-a7d0f4bd493c	99693fdc-ecd5-49b7-aa95-9caa7e0431a0	Act	\N
2c93402b-d5ff-4e52-972f-ebe0301f1f76	66e99d56-061f-4dc5-a6f3-a7d0f4bd493c	cb833228-88c7-4245-a184-d365e4fdb40d	Venue	\N
e51bf345-9d51-4297-95e9-ef3e185b7242	66e99d56-061f-4dc5-a6f3-a7d0f4bd493c	09fca024-b5c1-4f81-a71b-a68361548948	Sound	\N
980517b3-2652-41f4-aefd-7bb52a8612c9	90cd1e8a-c72b-4f76-afce-4da1e4fd8c08	ba9ff468-e4b8-4f62-953e-040bc0ec416d	Act	\N
8d257478-bd2f-45da-9d7c-7feb645f8c68	90cd1e8a-c72b-4f76-afce-4da1e4fd8c08	62fe8870-8608-4e44-b6bf-8eef1c0cb75d	Venue	\N
0642026e-446b-48c0-a1ed-2d7b7866517e	90cd1e8a-c72b-4f76-afce-4da1e4fd8c08	09fca024-b5c1-4f81-a71b-a68361548948	Sound	\N
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

COPY "public"."gig_staff_slots" ("id", "gig_id", "staff_role_id", "organization_id", "required_count", "notes", "created_at", "updated_at") FROM stdin;
\.


--
-- Data for Name: gig_staff_assignments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."gig_staff_assignments" ("id", "slot_id", "user_id", "status", "rate", "fee", "notes", "assigned_at", "confirmed_at") FROM stdin;
\.


--
-- Data for Name: gig_status_history; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."gig_status_history" ("id", "gig_id", "from_status", "to_status", "changed_by", "changed_at") FROM stdin;
7804c51c-a13c-494f-9de7-60c88ac8f60a	932f11fc-1e8c-4318-8a34-a8e59ece180c	Completed	Settled	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:23:24.826835+00
b089de79-0b5c-4e90-b0bf-1e452fb879ff	571b8639-2e14-43d2-abc1-4dc85698d349	Completed	Settled	aa545fd3-e827-40d0-a017-1d35b5f42aa9	2026-02-09 08:23:52.736379+00
\.


--
-- Data for Name: invitations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."invitations" ("id", "organization_id", "email", "role", "invited_by", "status", "token", "expires_at", "accepted_at", "accepted_by", "created_at", "updated_at") FROM stdin;
69ff04d1-ec19-46e8-a497-b48ef473079f	09fca024-b5c1-4f81-a71b-a68361548948	cameron.orourke+colin@gmail.com	Staff	aa545fd3-e827-40d0-a017-1d35b5f42aa9	accepted	17c677af-8fad-4293-ac62-70b0cef49f67	2026-02-10 02:19:16.907593+00	2026-02-03 02:19:43.546749+00	\N	2026-02-03 02:19:16.907593+00	2026-02-03 02:19:16.907593+00
84c60577-a434-49bd-ad27-2d0db3dfdaa6	6e94b1e8-503a-4638-9f5e-deed9dbcee72	cameron.orourke+sam@gmail.com	Staff	02c16e23-7859-491e-8788-84f4066f2f40	accepted	5f853f1e-532d-44a8-a9a7-05d164c6b685	2026-02-10 03:53:39.931294+00	2026-02-03 04:00:05.397165+00	6dd4ab14-a3b0-402e-be1a-b50ffcb89fb2	2026-02-03 03:53:39.931294+00	2026-02-03 03:53:39.931294+00
1bcd3761-d4e1-4760-a1c1-bf47c4cee03f	09fca024-b5c1-4f81-a71b-a68361548948	cameron.orourke+matt@gmail.com	Staff	aa545fd3-e827-40d0-a017-1d35b5f42aa9	accepted	2c4fd1d9-fe1e-4dcf-8986-4336a8aabb48	2026-02-10 20:41:54.795639+00	2026-02-03 20:42:13.362056+00	016b9cc5-3f46-47b2-ad42-9e6a090fe278	2026-02-03 20:41:54.795639+00	2026-02-03 20:41:54.795639+00
e44d7124-888a-46e1-9fda-2419112e775d	09fca024-b5c1-4f81-a71b-a68361548948	cameron.orourke+joe@gmail.com	Staff	aa545fd3-e827-40d0-a017-1d35b5f42aa9	accepted	ad72d9ac-700f-4066-9c3a-e16368ea038f	2026-02-11 07:16:29.767485+00	2026-02-04 07:18:55.653133+00	54eb084b-a81b-4c13-bdd8-a9f450351eac	2026-02-04 07:16:29.767485+00	2026-02-04 07:16:29.767485+00
5f3aeeb8-0206-4f92-956c-df028b37d139	09fca024-b5c1-4f81-a71b-a68361548948	cameron.orourke+colin@gmail.com	Staff	aa545fd3-e827-40d0-a017-1d35b5f42aa9	pending	d3eeb422-fc70-4f88-88c5-1da41301cbd0	2026-02-11 16:42:47.057524+00	\N	\N	2026-02-04 16:42:47.057524+00	2026-02-04 16:42:47.057524+00
\.


--
-- Data for Name: kit_assets; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."kit_assets" ("id", "kit_id", "asset_id", "quantity", "notes", "created_at") FROM stdin;
e6b56d95-9584-4d1c-8f95-0c347e920ee5	4bd24cfb-9987-46d0-81c6-aa3f228cde5d	10d36935-c6e6-4072-8906-c755d5cbd9d9	4	\N	2026-01-31 06:48:25.940818+00
c4e75592-2e85-41ba-89f0-6a2551331b90	03f2ff8e-9ebf-421d-bd6c-d5b597fa44be	800e1842-ce2c-454b-a6ea-b458a564f8ba	2	\N	2026-01-31 16:53:09.056263+00
8bbad1aa-ec5e-4498-bd2d-1daf8155dca4	03f2ff8e-9ebf-421d-bd6c-d5b597fa44be	ecd5f7b2-c1c2-40fe-91eb-9820eefcfa00	2	\N	2026-01-31 16:53:09.056263+00
\.


--
-- Data for Name: kv_store_de012ad4; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."kv_store_de012ad4" ("key", "value") FROM stdin;
\.


--
-- Data for Name: organization_members; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."organization_members" ("id", "organization_id", "user_id", "role", "default_staff_role_id", "created_at") FROM stdin;
22d31883-60ed-4ee8-ad47-2e85db5bf167	9611345f-c691-4f43-bba8-76433392a16a	aa545fd3-e827-40d0-a017-1d35b5f42aa9	Admin	\N	2026-02-09 05:19:20.058595+00
a3e8358e-3cb7-4ee1-9a1f-37af3c8598ab	cfc55db2-2e8e-4784-98f3-6497566939e5	aa545fd3-e827-40d0-a017-1d35b5f42aa9	Admin	\N	2026-02-09 05:19:20.407189+00
fa8d78fb-da72-4610-8425-273f90445f78	61a3734a-2c82-4923-8ad4-943e3759fdf3	aa545fd3-e827-40d0-a017-1d35b5f42aa9	Admin	\N	2026-02-09 05:19:20.922667+00
ba870caf-a76a-41c2-81c6-22d2d5a4712a	8ecffb09-1347-40eb-8923-87f467448087	aa545fd3-e827-40d0-a017-1d35b5f42aa9	Admin	\N	2026-02-09 05:19:21.282283+00
cd10f263-b01c-4de2-b497-65c994ffd756	09fca024-b5c1-4f81-a71b-a68361548948	aa545fd3-e827-40d0-a017-1d35b5f42aa9	Admin	d22f9ff8-6afa-48b9-afaf-7ebf63d7bc38	2026-01-29 21:50:25.239253+00
b47adfe3-120c-47b2-b9df-d9bce9de45d5	f59fa3ea-aeca-4fa6-b099-42a0deaf06aa	aa545fd3-e827-40d0-a017-1d35b5f42aa9	Admin	\N	2026-02-09 05:19:22.100721+00
50d45916-3998-4e39-972e-7d071e83ec72	6e94b1e8-503a-4638-9f5e-deed9dbcee72	02c16e23-7859-491e-8788-84f4066f2f40	Admin	d22f9ff8-6afa-48b9-afaf-7ebf63d7bc38	2026-02-03 03:31:31.278601+00
8a02fbb6-5de2-4afa-b1d9-fbfec412960d	6e94b1e8-503a-4638-9f5e-deed9dbcee72	6dd4ab14-a3b0-402e-be1a-b50ffcb89fb2	Staff	\N	2026-02-03 03:53:39.931294+00
8a57b1d8-09f2-4364-88c3-8ae07216b703	09fca024-b5c1-4f81-a71b-a68361548948	b470fcce-cdea-4647-9ba7-19f501a26343	Staff	ef13bc30-5bdd-4569-b303-0849730ad213	2026-02-03 20:46:02.923539+00
f1c598b1-ca3e-47e8-afa5-6152e9cfe79b	e959aeb8-1f0a-41f2-a469-c8ee0f7579c1	aa545fd3-e827-40d0-a017-1d35b5f42aa9	Admin	\N	2026-02-09 05:19:23.861009+00
e5e6d6c5-ed73-4f69-bff1-65566a028093	09fca024-b5c1-4f81-a71b-a68361548948	54eb084b-a81b-4c13-bdd8-a9f450351eac	Staff	\N	2026-02-04 07:16:29.767485+00
9e9cf9f4-8ccc-4e3c-8ea0-42ad4bfdd12b	89b01570-f201-4939-abc0-bae126d12577	aa545fd3-e827-40d0-a017-1d35b5f42aa9	Admin	\N	2026-02-04 20:00:59.180487+00
8b478431-ff9c-4e6e-b2d7-095106f6adad	6bc48db4-2a7f-4cd3-9407-f40b8e4985fb	aa545fd3-e827-40d0-a017-1d35b5f42aa9	Admin	\N	2026-02-04 20:00:59.585964+00
1f923963-4f89-4cfd-a5a9-6ff55cc65ac6	632d52f1-1aac-4810-ae76-35ccee4e3866	aa545fd3-e827-40d0-a017-1d35b5f42aa9	Admin	\N	2026-02-07 07:54:17.58756+00
2a864e45-ddb3-406d-8c07-bd8fc5856d36	63fd3d39-d132-425f-88c6-e7c4c77deef7	aa545fd3-e827-40d0-a017-1d35b5f42aa9	Admin	\N	2026-02-07 07:54:18.13406+00
c9cfe9c1-b019-453d-9110-95d5bc70eaa9	c331394f-73f9-4ec2-938a-282da1378f9a	aa545fd3-e827-40d0-a017-1d35b5f42aa9	Admin	\N	2026-02-07 10:02:42.954159+00
5c0274eb-f7eb-4f0a-9654-793a9e28f095	c0fcc02c-c3d2-46ad-87d3-b12bf3af0f90	aa545fd3-e827-40d0-a017-1d35b5f42aa9	Admin	\N	2026-02-07 10:02:43.319724+00
83c7fc17-4aee-4616-bf62-9cce5b8e63ed	09fca024-b5c1-4f81-a71b-a68361548948	016b9cc5-3f46-47b2-ad42-9e6a090fe278	Manager	703d81a2-595a-4cca-aef7-e66efb2390e8	2026-02-03 20:41:54.795639+00
f1af9b89-9d07-4b6d-bed8-f0ad2876703b	ba9ff468-e4b8-4f62-953e-040bc0ec416d	aa545fd3-e827-40d0-a017-1d35b5f42aa9	Admin	\N	2026-02-09 05:18:57.275785+00
60e41e0b-554f-4eec-b704-e67b942299ab	0e39fd33-f09e-4f3e-b225-a7f71192c10f	aa545fd3-e827-40d0-a017-1d35b5f42aa9	Admin	\N	2026-02-09 05:18:57.702209+00
c6d523f4-ec5d-4654-aa4b-b8ec4e2a60c8	828d89b5-34c4-4375-9cc5-0e8578189df2	aa545fd3-e827-40d0-a017-1d35b5f42aa9	Admin	\N	2026-02-09 05:18:58.633743+00
abd672d2-7cff-4bb5-8fda-53019e7792a6	1a819eac-9538-4464-956e-1d4bca313e4e	aa545fd3-e827-40d0-a017-1d35b5f42aa9	Admin	\N	2026-02-09 05:18:59.209809+00
c4c331ae-15a1-4902-9eb8-83b89f3f278c	ddd467b5-cd8a-4bb4-99a9-556dace68065	aa545fd3-e827-40d0-a017-1d35b5f42aa9	Admin	\N	2026-02-09 05:18:59.615203+00
5715e21e-b613-4f5f-a151-09f4d63a1333	cd8a7ac1-70b0-45dc-bbeb-cfae46536d29	aa545fd3-e827-40d0-a017-1d35b5f42aa9	Admin	\N	2026-02-09 05:19:00.634598+00
8dc821a2-d5ec-4a75-a9fa-d2d57cc20c4f	825a133a-fef7-4bf8-974c-f429845269ce	aa545fd3-e827-40d0-a017-1d35b5f42aa9	Admin	\N	2026-02-09 05:19:00.981759+00
9994816d-a176-497d-bb46-bd5e9f0c51ac	99693fdc-ecd5-49b7-aa95-9caa7e0431a0	aa545fd3-e827-40d0-a017-1d35b5f42aa9	Admin	\N	2026-02-09 05:19:01.774801+00
6e42bd81-356b-4ab7-9206-ab59d16a70b6	cb833228-88c7-4245-a184-d365e4fdb40d	aa545fd3-e827-40d0-a017-1d35b5f42aa9	Admin	\N	2026-02-09 05:19:02.129374+00
2279c02f-7a91-4d85-be4e-bf4e5f37b4b2	c8bd84bd-64a1-4866-89dd-c32473bfde5c	aa545fd3-e827-40d0-a017-1d35b5f42aa9	Admin	\N	2026-02-09 05:19:02.893163+00
fb69d488-0555-46ad-b0bd-c0e470eb3e37	6bac75a5-acde-445c-9bab-b7bb049952e2	aa545fd3-e827-40d0-a017-1d35b5f42aa9	Admin	\N	2026-02-09 05:19:03.219964+00
1f5bd59d-08a9-4932-9b0a-b5342033e0f6	9ced396d-5cb2-4835-9f1e-66ba3f741406	aa545fd3-e827-40d0-a017-1d35b5f42aa9	Admin	\N	2026-02-09 05:19:03.779439+00
a08f19c1-e72e-49db-9c7d-cfcd1522a4e9	21ca7612-aab0-4c00-be33-aaeab172a906	aa545fd3-e827-40d0-a017-1d35b5f42aa9	Admin	\N	2026-02-09 05:19:04.340541+00
5a1b3c76-afdd-4b36-ad5d-ef4d99901364	b921586b-68a2-4373-8b7c-eeb4d2ef0b8c	aa545fd3-e827-40d0-a017-1d35b5f42aa9	Admin	\N	2026-02-09 05:19:05.090781+00
4e9c0d01-536f-419b-92cc-5762550b3bb0	6c03ce1a-e6e9-4c08-a42e-f225b7f708ff	aa545fd3-e827-40d0-a017-1d35b5f42aa9	Admin	\N	2026-02-09 05:19:05.651273+00
847e1aac-2897-434f-a8a6-f62151bb88be	fbe26d6b-6835-474c-b972-b7d36fdd6114	aa545fd3-e827-40d0-a017-1d35b5f42aa9	Admin	\N	2026-02-09 05:19:06.202663+00
d9fbfd0c-b1b3-4be1-8f5e-b3e33dc9a4df	62fe8870-8608-4e44-b6bf-8eef1c0cb75d	aa545fd3-e827-40d0-a017-1d35b5f42aa9	Admin	\N	2026-02-09 05:19:06.752119+00
7e3465f8-ca05-4066-85a5-877127462f4b	ba1084b2-abaf-4980-87d2-23deb87985ce	aa545fd3-e827-40d0-a017-1d35b5f42aa9	Admin	\N	2026-02-09 05:19:07.500694+00
72b3ac6c-7e00-483e-ba78-d2a926fd5333	b6b330b9-80c9-4352-ac2e-ed395d84c161	aa545fd3-e827-40d0-a017-1d35b5f42aa9	Admin	\N	2026-02-09 05:19:07.786739+00
741e8dd3-4f57-42fb-9c8d-5112d5cf1d22	bf545f52-cf50-4d82-975f-855ddcb0a8ce	aa545fd3-e827-40d0-a017-1d35b5f42aa9	Admin	\N	2026-02-09 05:19:08.546664+00
9760facb-7437-4fff-8960-c1aaed226560	afebf956-8d10-4a2b-a20f-0f2ba9a44631	aa545fd3-e827-40d0-a017-1d35b5f42aa9	Admin	\N	2026-02-09 05:19:09.191359+00
8ab1a99d-a477-4997-b5cc-227b2df0556d	540fa944-fce5-4b06-bbf0-5a2418382883	aa545fd3-e827-40d0-a017-1d35b5f42aa9	Admin	\N	2026-02-09 05:19:09.540554+00
3d852b09-5d92-44f2-8371-ea2edfec5853	2a045a3f-81df-44a4-8b94-76839c2fa32c	aa545fd3-e827-40d0-a017-1d35b5f42aa9	Admin	\N	2026-02-09 05:19:10.039117+00
8a08c200-a6bb-4c96-bcef-bc3d53518243	b2da5b8b-92ec-43f0-9d3f-788db837d067	aa545fd3-e827-40d0-a017-1d35b5f42aa9	Admin	\N	2026-02-09 05:19:10.38406+00
644a7441-e511-4737-a98e-1ebc3480424a	c2bb6085-e647-4a76-b5f1-6a81d21577ed	aa545fd3-e827-40d0-a017-1d35b5f42aa9	Admin	\N	2026-02-09 05:19:11.068386+00
ba588e89-06e6-49d3-9d56-e869477c394f	b82328b3-98fe-4db7-964b-b5455e492108	aa545fd3-e827-40d0-a017-1d35b5f42aa9	Admin	\N	2026-02-09 05:19:11.4399+00
347141de-ee04-4ab2-ae41-a503fdadc9fa	c9761b46-01a7-40dc-bbf2-1d6f034c4707	aa545fd3-e827-40d0-a017-1d35b5f42aa9	Admin	\N	2026-02-09 05:19:12.440795+00
c2de8ef0-3261-48e7-bd6f-df11a882d396	eafca38d-1b02-4572-a287-19c884bc5dd9	aa545fd3-e827-40d0-a017-1d35b5f42aa9	Admin	\N	2026-02-09 05:19:13.410721+00
f9843df7-db27-498b-9cdd-2874794982bf	ba7694d3-7b0e-4bfb-bdad-e21ed05a020b	aa545fd3-e827-40d0-a017-1d35b5f42aa9	Admin	\N	2026-02-09 05:19:13.852425+00
d9af825a-ca91-4fc5-bbce-50f4f47ba833	1e8b6859-2ac8-470d-be50-8b83c93cdfaa	aa545fd3-e827-40d0-a017-1d35b5f42aa9	Admin	\N	2026-02-09 05:19:14.62265+00
2d0740d6-276c-48dc-be3f-cdfd6485da51	2bd018a4-6348-4a85-b78d-4446b5107234	aa545fd3-e827-40d0-a017-1d35b5f42aa9	Admin	\N	2026-02-09 05:19:15.178561+00
b1f10024-314b-462b-8ad5-a335e2df23d6	00d50a2a-9c93-409f-8f7a-f4a0677f0451	aa545fd3-e827-40d0-a017-1d35b5f42aa9	Admin	\N	2026-02-09 05:19:15.727744+00
f25a98af-b4be-4184-aa45-316819d44080	0dc59bb2-b3d4-4d48-86ce-809ec957cfd1	aa545fd3-e827-40d0-a017-1d35b5f42aa9	Admin	\N	2026-02-09 05:19:16.04767+00
5a156fbf-e6df-4466-9bc0-4e39b7da0b52	27e5d12f-0843-4fab-9368-e24077d31d94	aa545fd3-e827-40d0-a017-1d35b5f42aa9	Admin	\N	2026-02-09 05:19:16.585846+00
ee6eb083-3173-4e7c-b86e-18c33561ca0f	fcb7020e-1341-42cb-b6ea-f6423f318055	aa545fd3-e827-40d0-a017-1d35b5f42aa9	Admin	\N	2026-02-09 05:19:17.175655+00
af698510-2f77-44fb-857e-08bd2215435b	93544cfe-c4d8-4566-8748-b3964a56cabb	aa545fd3-e827-40d0-a017-1d35b5f42aa9	Admin	\N	2026-02-09 05:19:17.710099+00
6b8cd6c6-b9c1-4c34-b641-383e8784f9b3	f2427546-4b6c-42f9-aed5-90abfe849f2c	aa545fd3-e827-40d0-a017-1d35b5f42aa9	Admin	\N	2026-02-09 05:19:18.18738+00
323c7671-3b75-4606-9b83-81b2bd82326b	c32ae626-73ab-473d-96e8-a5c6eda48c2f	aa545fd3-e827-40d0-a017-1d35b5f42aa9	Admin	\N	2026-02-09 05:19:19.053477+00
dc3bebb3-6fde-4d9b-bf87-d9faaec3cc19	1ab6341b-4f95-4949-8135-814765239612	aa545fd3-e827-40d0-a017-1d35b5f42aa9	Admin	\N	2026-02-09 05:19:24.338018+00
2e3d706c-6726-4e34-95b5-6a794b5cbe5f	efc6f1e0-c7b2-4604-994a-4ef60b4b0f16	aa545fd3-e827-40d0-a017-1d35b5f42aa9	Admin	\N	2026-02-09 05:19:26.165385+00
e769b58b-c83f-439d-afc8-94a2a67dbd4c	f35933a2-5424-425f-b8d2-d84647ff5ba7	aa545fd3-e827-40d0-a017-1d35b5f42aa9	Admin	\N	2026-02-09 05:19:27.382918+00
c30efade-56b2-42b8-81be-bd745e74c83a	a58456bc-5bcd-488c-8345-3c3e3d311cbe	aa545fd3-e827-40d0-a017-1d35b5f42aa9	Admin	\N	2026-02-09 05:19:28.922165+00
232fe701-3054-4775-98e0-9537b498a3b9	e98bb8af-1346-4cd4-bd13-b5cc86bd70b9	aa545fd3-e827-40d0-a017-1d35b5f42aa9	Admin	\N	2026-02-09 05:19:31.59998+00
62fba37b-73ab-43d2-99c1-444783570e20	5efa2f7b-f8d3-495a-8da5-56ca58050ea2	aa545fd3-e827-40d0-a017-1d35b5f42aa9	Admin	\N	2026-02-09 05:19:31.908822+00
\.


--
-- PostgreSQL database dump complete
--

-- \unrestrict F3d29VlbSWtDDYECZ9CzBEE8Rufz9U8HBm9NX91tyZlleQ6NDvwVF4LaF17h8Kb

RESET ALL;
