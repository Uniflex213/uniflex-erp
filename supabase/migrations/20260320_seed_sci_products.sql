-- Seed SCI product catalogue (without prices — prices are managed separately)
-- Uses ON CONFLICT to avoid duplicates if run multiple times

INSERT INTO sale_products (name, sku, description, components_count, formats, formats_other, units_per_pallet, is_active)
VALUES
  ('UNI-MVBFC CLEAR 3 GAL KIT', 'B-4300', '100% Solid Moisture Vapor Barrier Fast Cure (4H) 3 GAL Kit Clear', 2, ARRAY['3 GAL Kit'], 'Resin', NULL, true),
  ('UNI-PROTEK SATIN 1 GAL', 'B-6714S', 'UNIFLEX ALIPHATIC URETHANE SATIN 1 GAL KIT', 2, ARRAY['1 GAL Kit'], 'Finish Coats', NULL, true),
  ('UNI-PROTEK MATTE 1 GAL', 'B-6714', 'UNIFLEX ALIPHATIC URETHANE MATTE 1 GAL KIT', 2, ARRAY['1 GAL Kit'], 'Finish Coats', NULL, true),
  ('UNI-ECF 4h', 'B-9001', 'UNIFLEX EPOXY CRACK-FILLER FAST CURE (4H) 3L KIT', 2, ARRAY['3L Kit'], 'Repair Kits', NULL, true),
  ('UNI-100 433', 'B-4443', 'UNIFLEX 100% solid Epoxy Resin Pre-Tint 433 Super White 3 GAL Kit', 2, ARRAY['3 GAL Kit'], 'Resin', NULL, true),
  ('UNI-100 885', 'B-4885', 'UNI-100 100% Solid Epoxy Resin Pre-Tint 885 Light Grey 3 GAL Kit', 2, ARRAY['3 GAL Kit'], 'Resin', NULL, true),
  ('TG 1/4 NIGHTFALL 40 Lbs BOX', 'TG-1003', 'TG ORIGINAL BLENDS 1/4 NIGHTFALL 40 Lbs BOX', 1, ARRAY['40 Lbs Box'], 'Torginol Flakes', NULL, true),
  ('TG 1/4 GRAVEL 40 Lbs', 'TG-1004', 'TG ORIGINAL BLENDS 1/4 GRAVEL 40 Lbs BOX', 1, ARRAY['40 Lbs Box'], 'Torginol Flakes', NULL, true),
  ('TG 1/4 CABIN FEVER 40 Lbs', 'TG-1002', 'TG ORIGINAL BLENDS 1/4 CABIN FEVER 40 Lbs BOX', 1, ARRAY['40 Lbs Box'], 'Torginol Flakes', NULL, true),
  ('TG 1/4 DOMINO 40 Lbs', 'TG-1001', 'TG 1/4 DOMINO BLEND 40 Lbs BOX', 1, ARRAY['40 Lbs Box'], 'Torginol Flakes', NULL, true),
  ('UNI-C915', 'B-1915', 'RESIN TINT 0.5 LITER', 1, ARRAY['0.5L'], 'Resin Add-On', NULL, true),
  ('UNI-C316', 'B-1316', 'RESIN TINT 0.5 LITER', 1, ARRAY['0.5L'], 'Resin Add-On', NULL, true),
  ('UNI-C330', 'B-1330', 'RESIN TINT 0.5 LITER', 1, ARRAY['0.5L'], 'Resin Add-On', NULL, true),
  ('UNI-C885', 'B-1885', 'RESIN TINT 1 LITER', 1, ARRAY['1L'], 'Resin Add-On', NULL, true),
  ('UNI-C459', 'B-1459', 'RESIN TINT 1 LITER', 1, ARRAY['1L'], 'Resin Add-On', NULL, true),
  ('UNI-C433', 'B-1433', 'RESIN TINT 1 LITER', 1, ARRAY['1L'], 'Resin Add-On', NULL, true),
  ('UNI-C431', 'B-1431', 'RESIN TINT 1 LITER', 1, ARRAY['1L'], 'Resin Add-On', NULL, true),
  ('UNI-C305', 'B-1305', 'RESIN TINT 1 LITER', 1, ARRAY['1L'], 'Resin Add-On', NULL, true),
  ('Uni-C124', 'B-1124', 'RESIN TINT 1 LITER', 1, ARRAY['1L'], 'Resin Add-On', NULL, true),
  ('UNI-C101', 'B-1101', 'RESIN TINT 1 LITER', 1, ARRAY['1L'], 'Resin Add-on', NULL, true),
  ('Uni-Quartz LIGHTROCK', 'B-2023', '1 COMPONENT HIGH PERFORMANCE QUARTZ BASE RESIN', 1, ARRAY['5 GAL'], 'Quartz Mixed Resin', NULL, true),
  ('Uni-Quartz Taupe 5 Gal', 'B-2022', '1 COMPONENT HIGH PERFORMANCE QUARTZ BASE RESIN 5 Gal', 1, ARRAY['5 GAL'], 'Quartz Mixed Resin', NULL, true),
  ('Uni-Quartz CASTLE 5 Gal', 'B-2021', '1 COMPONENT HIGH PERFORMANCE QUARTZ BASE RESIN', 1, ARRAY['5 GAL'], 'Quartz Mixed Resin', NULL, true),
  ('Uni-Quartz SAHARA 5 Gal', 'B-2020', '1 COMPONENT HIGH PERFORMANCE QUARTZ BASE RESIN', 1, ARRAY['5 GAL'], 'Quartz Mixed Resin', NULL, true),
  ('Uni-Thixo', 'B-1085', 'EPOXY BASED THICKENING AGENT', 1, ARRAY['Unit'], 'Resin Add-on', NULL, true),
  ('Uni-8084', 'B-8084', '100% SOLID POLYASPARTIC SLOW CURE', 2, ARRAY['Unit'], 'Resin', NULL, true),
  ('Uni-100', 'B-4100', '100% SOLID MEDIUM VISCOSITY EPOXY RESIN', 2, ARRAY['Unit'], 'Resin', NULL, true)
ON CONFLICT (sku) DO NOTHING;
