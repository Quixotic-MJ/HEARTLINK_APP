-- HL-171 (panel revision, 2026-11-25): the nearest barangay's emergency contacts. When a user's location is on, the app
-- picks the nearest barangay on the phone (the location never leaves the phone) and shows its hotline. Admins add and
-- check the numbers on the portal's "Barangay contacts" page; the app only offers Call for a checked number.
--
-- The first rows are Cebu City's 80 barangays with a location from OpenStreetMap (2026-11-25): the barangay hall where
-- the map has one (location_kind 'hall'), otherwise the middle of the barangay ('centre'). No phone numbers are added
-- here: the team enters and checks them (OT-16). San Nicolas Central has no point on the map yet, so it has no location
-- and stays hidden until an admin adds one. Safe to re-run: rows are matched by osm_id and nothing the team entered is
-- overwritten.

CREATE TABLE IF NOT EXISTS public.barangay_contacts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
    city text NOT NULL DEFAULT 'Cebu City' CHECK (char_length(city) BETWEEN 1 AND 120),
    hall_address text,
    latitude double precision CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90),
    longitude double precision CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180),
    location_kind text CHECK (location_kind IS NULL OR location_kind IN ('hall', 'centre')),
    hotline_1 text,
    hotline_2 text,
    numbers_checked boolean NOT NULL DEFAULT false,
    checked_at timestamptz,
    checked_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    note text,
    active boolean NOT NULL DEFAULT true,
    source text NOT NULL DEFAULT 'team' CHECK (source IN ('osm', 'team')),
    osm_id text UNIQUE,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.barangay_contacts IS 'HL-171: barangay emergency contacts; the app shows the nearest one (location stays on the phone)';
COMMENT ON COLUMN public.barangay_contacts.numbers_checked IS 'The team called the hotline(s); the app only offers Call when true';
COMMENT ON COLUMN public.barangay_contacts.location_kind IS 'hall = the barangay hall on the map; centre = the middle of the barangay (approximate)';

-- Only the server (service role) reads and writes it, like the other tables
ALTER TABLE public.barangay_contacts ENABLE ROW LEVEL SECURITY;

INSERT INTO public.barangay_contacts (osm_id, name, city, location_kind, latitude, longitude, source)
SELECT v.osm_id, v.name, 'Cebu City', v.kind, v.lat, v.lon, 'osm'
FROM (VALUES
    ('way/617544800', 'Adlaon', 'hall', 10.436649, 123.867842),
    ('node/6226724033', 'Agsungot', 'hall', 10.435072, 123.909909),
    ('way/682052707', 'Apas', 'hall', 10.337229, 123.90484),
    ('way/1417460833', 'Babag', 'hall', 10.374053, 123.849739),
    ('way/628031537', 'Bacayan', 'hall', 10.38729, 123.921822),
    ('node/797072839', 'Banilad', 'centre', 10.34654, 123.912792),
    ('way/617155925', 'Basak Pardo', 'hall', 10.289723, 123.865271),
    ('way/162320708', 'Basak San Nicolas', 'hall', 10.286123, 123.870423),
    ('way/1274003863', 'Binaliw', 'hall', 10.422716, 123.915856),
    ('way/611979164', 'Bonbon', 'hall', 10.367953, 123.832068),
    ('node/4589620290', 'Budlaan', 'hall', 10.378644, 123.886021),
    ('way/995597557', 'Buhisan', 'hall', 10.30449, 123.858698),
    ('node/5895466305', 'Bulacao', 'centre', 10.275542, 123.851267),
    ('way/668198992', 'Buot-Taup Pardo', 'hall', 10.347983, 123.808235),
    ('node/3182172188', 'Busay', 'hall', 10.345936, 123.893708),
    ('node/9518382152', 'Calamba', 'centre', 10.301609, 123.88454),
    ('node/1252357187', 'Cambinocot', 'centre', 10.462749, 123.897478),
    ('way/1172883817', 'Capitol Site', 'hall', 10.324583, 123.890327),
    ('way/327697313', 'Carreta', 'hall', 10.308036, 123.908638),
    ('node/5779664707', 'Cogon Pardo', 'centre', 10.277398, 123.862116),
    ('node/5812892049', 'Cogon Ramos', 'centre', 10.304937, 123.898389),
    ('way/609551356', 'Day-as', 'hall', 10.301779, 123.902069),
    ('way/629138223', 'Duljo Fatima', 'hall', 10.291782, 123.884782),
    ('node/5775251413', 'Ermita', 'centre', 10.291659, 123.897412),
    ('way/179733890', 'Guadalupe', 'hall', 10.322856, 123.884196),
    ('node/5811357395', 'Guba', 'hall', 10.428945, 123.888798),
    ('way/1172320106', 'Hipodromo', 'hall', 10.314069, 123.906944),
    ('way/472435837', 'Inayawan', 'hall', 10.269953, 123.856177),
    ('node/5773507439', 'Kalubihan', 'centre', 10.297703, 123.899099),
    ('way/482254560', 'Kalunasan', 'hall', 10.329158, 123.88688),
    ('way/1119902688', 'Kamagayan', 'hall', 10.30074, 123.901057),
    ('way/327697367', 'Kamputhaw', 'hall', 10.318232, 123.897507),
    ('way/616120407', 'Kasambagan', 'hall', 10.324425, 123.910799),
    ('way/666618602', 'Kinasang-an Pardo', 'hall', 10.28223, 123.858921),
    ('way/604778651', 'Labangon', 'hall', 10.299632, 123.879242),
    ('way/1054680389', 'Lahug', 'hall', 10.324242, 123.898537),
    ('way/628931581', 'Lorega San Miguel', 'hall', 10.306677, 123.904004),
    ('node/1252356855', 'Lusaran', 'centre', 10.490245, 123.891077),
    ('node/2179310679', 'Luz', 'hall', 10.323687, 123.906225),
    ('way/612131526', 'Mabini', 'hall', 10.452763, 123.918874),
    ('way/85131900', 'Mabolo', 'hall', 10.313735, 123.914067),
    ('way/1289045611', 'Malubog', 'hall', 10.37887, 123.867803),
    ('node/2179308102', 'Mambaling', 'hall', 10.292157, 123.87643),
    ('way/1217651043', 'Pahina Central', 'hall', 10.296682, 123.892307),
    ('node/5773474885', 'Pahina San Nicolas', 'centre', 10.294014, 123.892811),
    ('way/1055283920', 'Pamutan', 'hall', 10.337707, 123.841267),
    ('way/1171460290', 'Pari-an', 'hall', 10.299087, 123.903151),
    ('way/612124453', 'Paril', 'hall', 10.474833, 123.915866),
    ('way/609538530', 'Pasil', 'hall', 10.290042, 123.894476),
    ('way/1315901108', 'Pit-os', 'hall', 10.396481, 123.921743),
    ('way/1361633447', 'Poblacion Pardo', 'hall', 10.279218, 123.855617),
    ('way/993432470', 'Pulangbato', 'hall', 10.397906, 123.906261),
    ('way/926293928', 'Pung-ol Sibugay', 'hall', 10.389425, 123.854015),
    ('way/1417982579', 'Punta Princesa', 'hall', 10.295225, 123.871828),
    ('way/632980955', 'Quiot Pardo', 'hall', 10.288756, 123.859672),
    ('way/632568713', 'Sambag I', 'hall', 10.299249, 123.893515),
    ('node/5003156887', 'Sambag II', 'centre', 10.305827, 123.891223),
    ('way/1171880848', 'San Antonio', 'hall', 10.302849, 123.899404),
    ('way/627817801', 'San Jose', 'hall', 10.378995, 123.916506),
    ('way/114371011', 'San Nicolas Proper', 'hall', 10.295158, 123.890945),
    ('way/1119902689', 'San Roque', 'hall', 10.295138, 123.907729),
    ('node/5812892047', 'Santa Cruz', 'centre', 10.306066, 123.895878),
    ('way/666622684', 'Sapangdaku', 'hall', 10.335107, 123.872674),
    ('way/1418598000', 'Sawang Calero', 'hall', 10.292281, 123.891159),
    ('way/995604040', 'Sinsin', 'hall', 10.344913, 123.780899),
    ('node/1255322689', 'Sirao', 'centre', 10.414126, 123.872213),
    ('way/609539937', 'Suba', 'hall', 10.289919, 123.893761),
    ('node/9193538233', 'Sudlon I', 'hall', 10.362413, 123.787003),
    ('way/995604042', 'Sudlon II', 'hall', 10.375373, 123.787469),
    ('node/9518382149', 'T. Padilla', 'centre', 10.301809, 123.904291),
    ('way/665056356', 'Tabunan', 'hall', 10.441163, 123.82087),
    ('node/9178011283', 'Tagbao', 'hall', 10.443025, 123.840779),
    ('way/628148370', 'Talamban', 'hall', 10.369838, 123.918388),
    ('node/9178011262', 'Taptap', 'hall', 10.431351, 123.849067),
    ('node/5813151353', 'Tejero', 'centre', 10.301973, 123.907424),
    ('way/629032111', 'Tinago', 'hall', 10.29701, 123.908776),
    ('way/1055037310', 'Tisa', 'hall', 10.301223, 123.869596),
    ('node/5994730809', 'To-ong', 'centre', 10.309864, 123.837474),
    ('way/614530767', 'Zapatera', 'hall', 10.305678, 123.899955)
) AS v(osm_id, name, kind, lat, lon)
ON CONFLICT (osm_id) DO NOTHING;

-- San Nicolas Central: no point on the map yet (no location, hidden from the app until an admin adds one)
INSERT INTO public.barangay_contacts (osm_id, name, city, source)
VALUES ('psgc/san-nicolas-central', 'San Nicolas Central', 'Cebu City', 'osm')
ON CONFLICT (osm_id) DO NOTHING;
