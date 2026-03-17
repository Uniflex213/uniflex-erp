/*
  # God Admin TOTP Bootstrap
  Sets vendeur_code + totp_secret + totp_enrolled for existing god_admin accounts
  Secrets are pre-generated base32 — users must scan QR once then log in normally
*/

-- Abed Cherkawi (test@uniflexdistribution.com)
UPDATE profiles SET
  vendeur_code = 'AC.GO.001',
  totp_secret = '5CENEBAMHXZPVIIMD7IZFVSJ3QH2HEZI',
  totp_enrolled = TRUE
WHERE id = '93491a9e-691a-40ca-a3c2-1a5a3382d817'
  AND (vendeur_code IS NULL OR totp_enrolled = FALSE);

-- ahmed (info@uniflexdistribution.com)
UPDATE profiles SET
  vendeur_code = 'AH.GO.001',
  totp_secret = 'UCFGV4IKMIV6T4XBL2MJ2IA2G4E4V54N',
  totp_enrolled = TRUE
WHERE id = '01bbbaef-9da2-4165-8186-9b70922f59d5'
  AND (vendeur_code IS NULL OR totp_enrolled = FALSE);
