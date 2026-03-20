/**
 * One-shot script: seed SCI products into sale_products table.
 * Run from browser console or via: npx tsx scripts/seed-sci-products.ts
 *
 * Copy-paste the array below into Supabase SQL Editor as INSERT statements,
 * or run this script with your Supabase credentials.
 */

const PRODUCTS = [
  { name: "UNI-MVBFC CLEAR 3 GAL KIT", sku: "B-4300", description: "100% Solid Moisture Vapor Barrier Fast Cure (4H) 3 GAL Kit Clear", formats: ["3 GAL Kit"], formats_other: "Resin" },
  { name: "UNI-PROTEK SATIN 1 GAL", sku: "B-6714S", description: "UNIFLEX ALIPHATIC URETHANE SATIN 1 GAL KIT", formats: ["1 GAL Kit"], formats_other: "Finish Coats" },
  { name: "UNI-PROTEK MATTE 1 GAL", sku: "B-6714", description: "UNIFLEX ALIPHATIC URETHANE MATTE 1 GAL KIT", formats: ["1 GAL Kit"], formats_other: "Finish Coats" },
  { name: "UNI-ECF 4h", sku: "B-9001", description: "UNIFLEX EPOXY CRACK-FILLER FAST CURE (4H) 3L KIT", formats: ["3L Kit"], formats_other: "Repair Kits" },
  { name: "UNI-100 433", sku: "B-4443", description: "UNIFLEX 100% solid Epoxy Resin Pre-Tint 433 Super White 3 GAL Kit", formats: ["3 GAL Kit"], formats_other: "Resin" },
  { name: "UNI-100 885", sku: "B-4885", description: "UNI-100 100% Solid Epoxy Resin Pre-Tint 885 Light Grey 3 GAL Kit", formats: ["3 GAL Kit"], formats_other: "Resin" },
  { name: "TG 1/4 NIGHTFALL 40 Lbs BOX", sku: "TG-1003", description: "TG ORIGINAL BLENDS 1/4 NIGHTFALL 40 Lbs BOX", formats: ["40 Lbs Box"], formats_other: "Torginol Flakes" },
  { name: "TG 1/4 GRAVEL 40 Lbs", sku: "TG-1004", description: "TG ORIGINAL BLENDS 1/4 GRAVEL 40 Lbs BOX", formats: ["40 Lbs Box"], formats_other: "Torginol Flakes" },
  { name: "TG 1/4 CABIN FEVER 40 Lbs", sku: "TG-1002", description: "TG ORIGINAL BLENDS 1/4 CABIN FEVER 40 Lbs BOX", formats: ["40 Lbs Box"], formats_other: "Torginol Flakes" },
  { name: "TG 1/4 DOMINO 40 Lbs", sku: "TG-1001", description: "TG 1/4 DOMINO BLEND 40 Lbs BOX", formats: ["40 Lbs Box"], formats_other: "Torginol Flakes" },
  { name: "UNI-C915", sku: "B-1915", description: "RESIN TINT 0.5 LITER", formats: ["0.5L"], formats_other: "Resin Add-On" },
  { name: "UNI-C316", sku: "B-1316", description: "RESIN TINT 0.5 LITER", formats: ["0.5L"], formats_other: "Resin Add-On" },
  { name: "UNI-C330", sku: "B-1330", description: "RESIN TINT 0.5 LITER", formats: ["0.5L"], formats_other: "Resin Add-On" },
  { name: "UNI-C885", sku: "B-1885", description: "RESIN TINT 1 LITER", formats: ["1L"], formats_other: "Resin Add-On" },
  { name: "UNI-C459", sku: "B-1459", description: "RESIN TINT 1 LITER", formats: ["1L"], formats_other: "Resin Add-On" },
  { name: "UNI-C433", sku: "B-1433", description: "RESIN TINT 1 LITER", formats: ["1L"], formats_other: "Resin Add-On" },
  { name: "UNI-C431", sku: "B-1431", description: "RESIN TINT 1 LITER", formats: ["1L"], formats_other: "Resin Add-On" },
  { name: "UNI-C305", sku: "B-1305", description: "RESIN TINT 1 LITER", formats: ["1L"], formats_other: "Resin Add-On" },
  { name: "Uni-C124", sku: "B-1124", description: "RESIN TINT 1 LITER", formats: ["1L"], formats_other: "Resin Add-On" },
  { name: "UNI-C101", sku: "B-1101", description: "RESIN TINT 1 LITER", formats: ["1L"], formats_other: "Resin Add-on" },
  { name: "Uni-Quartz LIGHTROCK", sku: "B-2023", description: "1 COMPONENT HIGH PERFORMANCE QUARTZ BASE RESIN", formats: ["5 GAL"], formats_other: "Quartz Mixed Resin" },
  { name: "Uni-Quartz Taupe 5 Gal", sku: "B-2022", description: "1 COMPONENT HIGH PERFORMANCE QUARTZ BASE RESIN 5 Gal", formats: ["5 GAL"], formats_other: "Quartz Mixed Resin" },
  { name: "Uni-Quartz CASTLE 5 Gal", sku: "B-2021", description: "1 COMPONENT HIGH PERFORMANCE QUARTZ BASE RESIN", formats: ["5 GAL"], formats_other: "Quartz Mixed Resin" },
  { name: "Uni-Quartz SAHARA 5 Gal", sku: "B-2020", description: "1 COMPONENT HIGH PERFORMANCE QUARTZ BASE RESIN", formats: ["5 GAL"], formats_other: "Quartz Mixed Resin" },
  { name: "Uni-Thixo", sku: "B-1085", description: "EPOXY BASED THICKENING AGENT", formats: [], formats_other: "Resin Add-on" },
  { name: "Uni-8084", sku: "B-8084", description: "100% SOLID POLYASPARTIC SLOW CURE", formats: [], formats_other: "Resin" },
  { name: "Uni-100", sku: "B-4100", description: "100% SOLID MEDIUM VISCOSITY EPOXY RESIN", formats: [], formats_other: "Resin" },
];

export default PRODUCTS;
