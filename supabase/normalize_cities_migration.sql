-- LUP-87: City Normalization Migration
-- Normalizes existing city data in the users table and adds target_cities to campaigns.

-- 1. Normalize existing city values in users table
UPDATE users SET city = 'Dakar' WHERE lower(trim(city)) IN ('dkr', 'dakarr', 'dakaar', 'dakar');
UPDATE users SET city = 'Guédiawaye' WHERE lower(trim(city)) IN ('guediawaye', 'guediaway', 'gediawaye', 'guédiawaye');
UPDATE users SET city = 'Pikine' WHERE lower(trim(city)) IN ('pikin', 'pikines', 'pikine');
UPDATE users SET city = 'Rufisque' WHERE lower(trim(city)) IN ('rufisk', 'rufis', 'rufisque');
UPDATE users SET city = 'Thiès' WHERE lower(trim(city)) IN ('thies', 'tiès', 'ties', 'thiès');
UPDATE users SET city = 'Saint-Louis' WHERE lower(trim(city)) IN ('saint louis', 'st louis', 'st-louis', 'saintlouis', 'ndar', 'saint-louis');
UPDATE users SET city = 'Kaolack' WHERE lower(trim(city)) IN ('kaolak', 'kaolac', 'kaolack');
UPDATE users SET city = 'Ziguinchor' WHERE lower(trim(city)) IN ('ziginchor', 'ziguinchore', 'zig', 'ziguinchor');
UPDATE users SET city = 'Mbour' WHERE lower(trim(city)) IN ('mbore', 'mboure', 'mbour');
UPDATE users SET city = 'Diourbel' WHERE lower(trim(city)) IN ('diourbell', 'diourbelle', 'diourbel');
UPDATE users SET city = 'Tambacounda' WHERE lower(trim(city)) IN ('tamba', 'tambakounda', 'tambacounda');
UPDATE users SET city = 'Richard-Toll' WHERE lower(trim(city)) IN ('richard toll', 'richardtoll', 'richard-toll');
UPDATE users SET city = 'Kolda' WHERE lower(trim(city)) IN ('koldha', 'kolda');
UPDATE users SET city = 'Kaffrine' WHERE lower(trim(city)) IN ('kafrine', 'kaffrine');
UPDATE users SET city = 'Sédhiou' WHERE lower(trim(city)) IN ('sedhiou', 'sédhiou');
UPDATE users SET city = 'Kédougou' WHERE lower(trim(city)) IN ('kedougou', 'kdougou', 'kédougou');
UPDATE users SET city = 'Fatick' WHERE lower(trim(city)) IN ('fatik', 'fatick');
UPDATE users SET city = 'Tivaouane' WHERE lower(trim(city)) IN ('tivaoune', 'tivaoane', 'tivaouane');
UPDATE users SET city = 'Touba' WHERE lower(trim(city)) IN ('tuba', 'touba');
UPDATE users SET city = 'Mbacké' WHERE lower(trim(city)) IN ('mbacke', 'mbaké', 'mbacké');
UPDATE users SET city = 'Diamniadio' WHERE lower(trim(city)) IN ('diamnedio', 'diamnadio', 'diamniadio');
UPDATE users SET city = 'Bargny' WHERE lower(trim(city)) IN ('bargni', 'bargny');
UPDATE users SET city = 'Mékhé' WHERE lower(trim(city)) IN ('mekhe', 'mékhé');
UPDATE users SET city = 'Nguékhokh' WHERE lower(trim(city)) IN ('nguekhokh', 'nguékhokh');
UPDATE users SET city = 'Vélingara' WHERE lower(trim(city)) IN ('velingara', 'vélingara');
UPDATE users SET city = 'Nioro du Rip' WHERE lower(trim(city)) IN ('nioro du rip', 'nioro');
UPDATE users SET city = 'Joal-Fadiouth' WHERE lower(trim(city)) IN ('joal fadiouth', 'joal', 'joal-fadiouth');
UPDATE users SET city = 'Saly' WHERE lower(trim(city)) IN ('saly portudal', 'saly');
UPDATE users SET city = 'Bignona' WHERE lower(trim(city)) IN ('bignonna', 'bignona');

-- 2. Add target_cities column to campaigns table
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS target_cities text[];
