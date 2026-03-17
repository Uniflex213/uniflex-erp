import { CRMLead, CRMActivity, CRMReminder } from "./crmTypes";

const now = new Date();
const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000).toISOString();
const daysFromNow = (d: number) => new Date(now.getTime() + d * 86400000).toISOString();

export const MOCK_ACTIVITIES: CRMActivity[] = [
  // Lead 1 — Constructions Beaulieu
  { id: "a1", lead_id: "l1", type: "Lead créé", title: "Lead créé", description: "Lead ajouté manuellement au pipeline.", logged_by_name: "Karim Mansouri", logged_by_initials: "KM", activity_at: daysAgo(22), created_at: daysAgo(22) },
  { id: "a2", lead_id: "l1", type: "Appel", title: "Premier contact téléphonique", description: "Conversation de 12 min. Intéressé par le kit nivelage auto et l'enduit de lissage. Budget disponible Q2.", call_duration: 12, call_result: "Positif", logged_by_name: "Karim Mansouri", logged_by_initials: "KM", activity_at: daysAgo(20), created_at: daysAgo(20) },
  { id: "a3", lead_id: "l1", type: "Email envoyé", title: "Envoi de la brochure produits", description: "Envoyé catalogue complet + fiche technique kit nivelage.", email_subject: "Catalogue produits Uniflex 2026", logged_by_name: "Karim Mansouri", logged_by_initials: "KM", activity_at: daysAgo(19), created_at: daysAgo(19) },
  { id: "a4", lead_id: "l1", type: "Changement d'étape", title: "Avancement d'étape", description: "Lead déplacé de Nouveau Lead vers Premier Contact.", stage_from: "Nouveau Lead", stage_to: "Premier Contact", logged_by_name: "Karim Mansouri", logged_by_initials: "KM", activity_at: daysAgo(19), created_at: daysAgo(19) },
  { id: "a5", lead_id: "l1", type: "Rencontre / Visite", title: "Visite chez le client", description: "Rencontre au bureau de Beaulieu. Bonne discussion, ils veulent tester l'enduit sur un chantier pilote.", meeting_location: "Laval, bureau Beaulieu", meeting_duration: 60, meeting_attendees: "Karim, Patrick Beaulieu (VP Opérations)", logged_by_name: "Karim Mansouri", logged_by_initials: "KM", activity_at: daysAgo(12), created_at: daysAgo(12) },
  { id: "a6", lead_id: "l1", type: "Pricelist envoyée", title: "Pricelist personnalisée envoyée", description: "Pricelist pour 3 produits, volume 500 gallons/mois.", logged_by_name: "Karim Mansouri", logged_by_initials: "KM", activity_at: daysAgo(8), created_at: daysAgo(8) },

  // Lead 2 — Planchers Elite MTL
  { id: "a7", lead_id: "l2", type: "Lead créé", title: "Lead créé", description: "Lead ajouté via référence client.", logged_by_name: "Marie Tremblay", logged_by_initials: "MT", activity_at: daysAgo(35), created_at: daysAgo(35) },
  { id: "a8", lead_id: "l2", type: "Appel", title: "Appel de qualification", description: "12 installations par mois en moyenne, cherchent produits fiables à prix compétitif.", call_duration: 18, call_result: "Positif", logged_by_name: "Marie Tremblay", logged_by_initials: "MT", activity_at: daysAgo(30), created_at: daysAgo(30) },
  { id: "a9", lead_id: "l2", type: "Rencontre / Visite", title: "Réunion de qualification", description: "Rencontre détaillée des besoins. Volume potentiel de 800 gallons/mois.", meeting_location: "Montréal, showroom Planchers Elite", meeting_duration: 90, meeting_attendees: "Marie, Luc Fontaine (Directeur achats), Annie Côté (Technicien)", logged_by_name: "Marie Tremblay", logged_by_initials: "MT", activity_at: daysAgo(20), created_at: daysAgo(20) },
  { id: "a10", lead_id: "l2", type: "Note interne", title: "Note: concurrent actuel", description: "Utilise actuellement Laticrete. Pas satisfaits du service. Opportunité à saisir.", logged_by_name: "Marie Tremblay", logged_by_initials: "MT", activity_at: daysAgo(18), created_at: daysAgo(18) },
  { id: "a11", lead_id: "l2", type: "Proposition / Soumission", title: "Soumission officielle envoyée", description: "Soumission pour 800 gal/mois sur 12 mois. Inclut garantie et support technique.", proposal_amount: 68000, logged_by_name: "Marie Tremblay", logged_by_initials: "MT", activity_at: daysAgo(10), created_at: daysAgo(10) },
  { id: "a12", lead_id: "l2", type: "Email reçu", title: "Réponse positive à la soumission", description: "Intéressés mais demandent révision sur prix apprêt universel.", email_subject: "Re: Soumission Uniflex - Planchers Elite", logged_by_name: "Marie Tremblay", logged_by_initials: "MT", activity_at: daysAgo(6), created_at: daysAgo(6) },

  // Lead 3 — Réno-Dépôt Québec
  { id: "a13", lead_id: "l3", type: "Lead créé", title: "Lead créé", description: "Contact via salon Construct Canada 2025.", logged_by_name: "Alex Bouchard", logged_by_initials: "AB", activity_at: daysAgo(45), created_at: daysAgo(45) },
  { id: "a14", lead_id: "l3", type: "Appel", title: "Follow-up post-salon", description: "Rappelé suite au salon. Intéressé par nos produits pour gamme pro.", call_duration: 8, call_result: "Positif", logged_by_name: "Alex Bouchard", logged_by_initials: "AB", activity_at: daysAgo(40), created_at: daysAgo(40) },
  { id: "a15", lead_id: "l3", type: "Appel", title: "Appel qualification volumes", description: "50+ succursales. Volumes potentiels énormes. Passer en Large Scale.", call_duration: 25, call_result: "Positif", logged_by_name: "Alex Bouchard", logged_by_initials: "AB", activity_at: daysAgo(30), created_at: daysAgo(30) },
  { id: "a16", lead_id: "l3", type: "Rencontre / Visite", title: "Présentation corporate à Québec", description: "Présentation complète de la gamme au siège social. Très bien reçu.", meeting_location: "Québec, siège social RDQ", meeting_duration: 120, meeting_attendees: "Alex, Karim (support), Directeur Commercial, Acheteur national", logged_by_name: "Alex Bouchard", logged_by_initials: "AB", activity_at: daysAgo(18), created_at: daysAgo(18) },
  { id: "a17", lead_id: "l3", type: "Changement d'étape", title: "Passage en Négociation", description: "Ils ont accepté la proposition de base et veulent négocier les conditions.", stage_from: "Proposition Envoyée", stage_to: "Négociation", logged_by_name: "Alex Bouchard", logged_by_initials: "AB", activity_at: daysAgo(7), created_at: daysAgo(7) },

  // Lead 4 — Toitures Gagnon & Fils
  { id: "a18", lead_id: "l4", type: "Lead créé", title: "Lead créé", description: "Cold call entrant, ils cherchaient un fournisseur.", logged_by_name: "Sophie Lavoie", logged_by_initials: "SL", activity_at: daysAgo(18), created_at: daysAgo(18) },
  { id: "a19", lead_id: "l4", type: "Email envoyé", title: "Envoi brochure initiale", description: "Suite au call, envoyé brochure et tarifs indicatifs.", email_subject: "Solutions Uniflex pour entrepreneurs", logged_by_name: "Sophie Lavoie", logged_by_initials: "SL", activity_at: daysAgo(17), created_at: daysAgo(17) },
  { id: "a20", lead_id: "l4", type: "Note interne", title: "Entreprise familiale, décision lente", description: "PME familiale, processus de décision long mais fidèles une fois clients. Bien cibler.", logged_by_name: "Sophie Lavoie", logged_by_initials: "SL", activity_at: daysAgo(16), created_at: daysAgo(16) },

  // Lead 5 — Distribution Lessard Inc.
  { id: "a21", lead_id: "l5", type: "Lead créé", title: "Lead créé", description: "Référence de Constructions Beaulieu.", logged_by_name: "Karim Mansouri", logged_by_initials: "KM", activity_at: daysAgo(55), created_at: daysAgo(55) },
  { id: "a22", lead_id: "l5", type: "Appel", title: "Premier contact", description: "Distributeur régional avec 200+ clients installateurs. Intérêt fort.", call_duration: 20, call_result: "Positif", logged_by_name: "Karim Mansouri", logged_by_initials: "KM", activity_at: daysAgo(50), created_at: daysAgo(50) },
  { id: "a23", lead_id: "l5", type: "Rencontre / Visite", title: "Visite entrepôt et démo", description: "Démo produit sur place. Très impressionnés par la qualité.", meeting_location: "Rive-Sud, entrepôt Lessard", meeting_duration: 90, meeting_attendees: "Karim, Marc Lessard (CEO), Jean-Pierre (Logistique)", logged_by_name: "Karim Mansouri", logged_by_initials: "KM", activity_at: daysAgo(42), created_at: daysAgo(42) },
  { id: "a24", lead_id: "l5", type: "Échantillon envoyé", title: "Envoi échantillons", description: "Envoyé 10 unités de chaque produit pour test terrain.", sample_products: "Enduit de lissage Pro, Kit nivelage auto, Apprêt universel", sample_qty: 30, logged_by_name: "Karim Mansouri", logged_by_initials: "KM", activity_at: daysAgo(38), created_at: daysAgo(38) },
  { id: "a25", lead_id: "l5", type: "Pricelist envoyée", title: "Pricelist distributeur envoyée", description: "Tarifs spéciaux distributeur sur volumes 2000+ gal/mois.", logged_by_name: "Karim Mansouri", logged_by_initials: "KM", activity_at: daysAgo(28), created_at: daysAgo(28) },
  { id: "a26", lead_id: "l5", type: "Appel", title: "Négociation prix", description: "Demandent 8% de remise additionnelle. En discussion. Très motivés.", call_duration: 30, call_result: "Positif", logged_by_name: "Karim Mansouri", logged_by_initials: "KM", activity_at: daysAgo(15), created_at: daysAgo(15) },

  // Lead 6 — Groupe Immo Lafleur (Fermé Gagné)
  { id: "a27", lead_id: "l6", type: "Lead créé", title: "Lead créé", description: "Appel entrant, grand projet de rénovation.", logged_by_name: "Marie Tremblay", logged_by_initials: "MT", activity_at: daysAgo(90), created_at: daysAgo(90) },
  { id: "a28", lead_id: "l6", type: "Rencontre / Visite", title: "Présentation projet", description: "200 unités de condo à rénover. Deal énorme.", meeting_location: "Montréal, bureau Lafleur", meeting_duration: 120, meeting_attendees: "Marie, Karim, Robert Lafleur (PDG)", logged_by_name: "Marie Tremblay", logged_by_initials: "MT", activity_at: daysAgo(80), created_at: daysAgo(80) },
  { id: "a29", lead_id: "l6", type: "Proposition / Soumission", title: "Soumission projet immobilier", description: "Contrat annuel 1 500 gallons/mois.", proposal_amount: 145000, logged_by_name: "Marie Tremblay", logged_by_initials: "MT", activity_at: daysAgo(60), created_at: daysAgo(60) },
  { id: "a30", lead_id: "l6", type: "Changement d'étape", title: "Deal closé !", description: "Contrat signé. Premier client Large Scale Uniflex!", stage_from: "Négociation", stage_to: "Fermé Gagné", logged_by_name: "Marie Tremblay", logged_by_initials: "MT", activity_at: daysAgo(45), created_at: daysAgo(45) },

  // Lead 7 — Plancher Concept Plus (Fermé Gagné)
  { id: "a31", lead_id: "l7", type: "Lead créé", title: "Lead créé", description: "Référence réseau Sophie.", logged_by_name: "Sophie Lavoie", logged_by_initials: "SL", activity_at: daysAgo(70), created_at: daysAgo(70) },
  { id: "a32", lead_id: "l7", type: "Appel", title: "Qualification express", description: "Prêt à changer de fournisseur immédiatement. Fast track.", call_duration: 15, call_result: "Positif", logged_by_name: "Sophie Lavoie", logged_by_initials: "SL", activity_at: daysAgo(65), created_at: daysAgo(65) },
  { id: "a33", lead_id: "l7", type: "Changement d'étape", title: "Fermé Gagné", description: "Deal fermé rapidement, client très motivé.", stage_from: "Proposition Envoyée", stage_to: "Fermé Gagné", logged_by_name: "Sophie Lavoie", logged_by_initials: "SL", activity_at: daysAgo(55), created_at: daysAgo(55) },

  // Lead 8 — Entreprises Martin Réno (Fermé Perdu)
  { id: "a34", lead_id: "l8", type: "Lead créé", title: "Lead créé", description: "Cold call outbound.", logged_by_name: "James O'Brien", logged_by_initials: "JO", activity_at: daysAgo(60), created_at: daysAgo(60) },
  { id: "a35", lead_id: "l8", type: "Appel", title: "Appel rejeté", description: "Pas intéressé à changer. Utilise Mapei depuis 10 ans.", call_duration: 5, call_result: "Négatif", logged_by_name: "James O'Brien", logged_by_initials: "JO", activity_at: daysAgo(55), created_at: daysAgo(55) },
  { id: "a36", lead_id: "l8", type: "Raison de perte", title: "Lead perdu — Compétiteur", description: "Fidèle à Mapei, ne veut pas changer. Recontacter dans 12 mois.", loss_reason: "Compétiteur choisi", logged_by_name: "James O'Brien", logged_by_initials: "JO", activity_at: daysAgo(50), created_at: daysAgo(50) },

  // Lead 9 — Constructions Vachon (Fermé Perdu)
  { id: "a37", lead_id: "l9", type: "Lead créé", title: "Lead créé", description: "Référence mais budget limité.", logged_by_name: "Alex Bouchard", logged_by_initials: "AB", activity_at: daysAgo(75), created_at: daysAgo(75) },
  { id: "a38", lead_id: "l9", type: "Proposition / Soumission", title: "Soumission refusée", description: "Budget nettement insuffisant pour nos produits premium.", proposal_amount: 22000, logged_by_name: "Alex Bouchard", logged_by_initials: "AB", activity_at: daysAgo(65), created_at: daysAgo(65) },
  { id: "a39", lead_id: "l9", type: "Raison de perte", title: "Lead perdu — Prix", description: "Nos prix sont 35% au-dessus de leur budget. Perdu.", loss_reason: "Prix trop élevé", logged_by_name: "Alex Bouchard", logged_by_initials: "AB", activity_at: daysAgo(60), created_at: daysAgo(60) },

  // Lead 10 — Rénovations Pro-Habitat
  { id: "a40", lead_id: "l10", type: "Lead créé", title: "Lead créé", description: "Via pub LinkedIn.", logged_by_name: "James O'Brien", logged_by_initials: "JO", activity_at: daysAgo(5), created_at: daysAgo(5) },
  { id: "a41", lead_id: "l10", type: "Email envoyé", title: "Email de bienvenue", description: "Envoyé intro et catalogue produits.", email_subject: "Bienvenue chez Uniflex — vos solutions plancher", logged_by_name: "James O'Brien", logged_by_initials: "JO", activity_at: daysAgo(4), created_at: daysAgo(4) },

  // Lead 11 — Plafonds & Planchers RDS
  { id: "a42", lead_id: "l11", type: "Lead créé", title: "Lead créé", description: "Appel entrant via site web.", logged_by_name: "Sophie Lavoie", logged_by_initials: "SL", activity_at: daysAgo(3), created_at: daysAgo(3) },

  // Lead 12 — Les Sols Durables (Fermé Gagné)
  { id: "a43", lead_id: "l12", type: "Lead créé", title: "Lead créé", description: "Réseau personnel Karim.", logged_by_name: "Karim Mansouri", logged_by_initials: "KM", activity_at: daysAgo(85), created_at: daysAgo(85) },
  { id: "a44", lead_id: "l12", type: "Changement d'étape", title: "Fermé Gagné", description: "Contrat signé, démarrage en mars.", stage_from: "Négociation", stage_to: "Fermé Gagné", logged_by_name: "Karim Mansouri", logged_by_initials: "KM", activity_at: daysAgo(50), created_at: daysAgo(50) },

  // Lead 13 — Techno-Béton Rive-Nord
  { id: "a45", lead_id: "l13", type: "Lead créé", title: "Lead créé", description: "Salon Batimat Montréal.", logged_by_name: "Marie Tremblay", logged_by_initials: "MT", activity_at: daysAgo(14), created_at: daysAgo(14) },
  { id: "a46", lead_id: "l13", type: "Appel", title: "Premier contact post-salon", description: "Très intéressés par l'enduit polymère. Gros volumes potentiels.", call_duration: 12, call_result: "Positif", logged_by_name: "Marie Tremblay", logged_by_initials: "MT", activity_at: daysAgo(12), created_at: daysAgo(12) },
  { id: "a47", lead_id: "l13", type: "Rencontre / Visite", title: "Rencontre qualification", description: "Visiteurs usine. Volume estimé 400 gallons/mois.", meeting_location: "Rive-Nord, usine Techno-Béton", meeting_duration: 75, meeting_attendees: "Marie, Jean-Paul Tessier (Acheteur), Réal Landry (Tech)", logged_by_name: "Marie Tremblay", logged_by_initials: "MT", activity_at: daysAgo(8), created_at: daysAgo(8) },

  // Lead 14 — Aménagement Intérieur Beaupré
  { id: "a48", lead_id: "l14", type: "Lead créé", title: "Lead créé", description: "Cold call Sophie.", logged_by_name: "Sophie Lavoie", logged_by_initials: "SL", activity_at: daysAgo(8), created_at: daysAgo(8) },
  { id: "a49", lead_id: "l14", type: "Appel", title: "Appel qualification", description: "Petit installateur, 5 chantiers/mois. Volume modeste mais fidèle.", call_duration: 10, call_result: "Positif", logged_by_name: "Sophie Lavoie", logged_by_initials: "SL", activity_at: daysAgo(7), created_at: daysAgo(7) },

  // Lead 15 — Constructions Nordiques
  { id: "a50", lead_id: "l15", type: "Lead créé", title: "Lead créé", description: "Référence partenaire.", logged_by_name: "Alex Bouchard", logged_by_initials: "AB", activity_at: daysAgo(25), created_at: daysAgo(25) },
  { id: "a51", lead_id: "l15", type: "Appel", title: "Qualification volumes Nord-Québec", description: "Opèrent en régions nordiques, besoin produits performants à basses températures.", call_duration: 22, call_result: "Positif", logged_by_name: "Alex Bouchard", logged_by_initials: "AB", activity_at: daysAgo(23), created_at: daysAgo(23) },
  { id: "a52", lead_id: "l15", type: "Pricelist envoyée", title: "Pricelist nord envoyée", description: "Tarifs adaptés pour volumes nordiques.", logged_by_name: "Alex Bouchard", logged_by_initials: "AB", activity_at: daysAgo(18), created_at: daysAgo(18) },

  // Lead 16 — Groupe Immobilier Lanthier (Fermé Gagné)
  { id: "a53", lead_id: "l16", type: "Lead créé", title: "Lead créé", description: "Appel entrant grand groupe.", logged_by_name: "James O'Brien", logged_by_initials: "JO", activity_at: daysAgo(95), created_at: daysAgo(95) },
  { id: "a54", lead_id: "l16", type: "Changement d'étape", title: "Fermé Gagné", description: "Contrat 2 ans signé, 1200 gal/mois.", stage_from: "Négociation", stage_to: "Fermé Gagné", logged_by_name: "James O'Brien", logged_by_initials: "JO", activity_at: daysAgo(40), created_at: daysAgo(40) },

  // Lead 17 — Parquet Tradition Estrie
  { id: "a55", lead_id: "l17", type: "Lead créé", title: "Lead créé", description: "Référence Marie.", logged_by_name: "Marie Tremblay", logged_by_initials: "MT", activity_at: daysAgo(10), created_at: daysAgo(10) },
  { id: "a56", lead_id: "l17", type: "Email envoyé", title: "Premier contact email", description: "Email personnalisé avec focus colle parquet et finitions.", email_subject: "Solutions plancher Uniflex pour Parquet Tradition", logged_by_name: "Marie Tremblay", logged_by_initials: "MT", activity_at: daysAgo(9), created_at: daysAgo(9) },
  { id: "a57", lead_id: "l17", type: "Email reçu", title: "Réponse favorable", description: "Intéressés, demandent une rencontre cette semaine.", email_subject: "Re: Solutions plancher Uniflex", logged_by_name: "Marie Tremblay", logged_by_initials: "MT", activity_at: daysAgo(7), created_at: daysAgo(7) },

  // Lead 18 — Solutions Plancher Outaouais
  { id: "a58", lead_id: "l18", type: "Lead créé", title: "Lead créé", description: "Pub Google Ads.", logged_by_name: "James O'Brien", logged_by_initials: "JO", activity_at: daysAgo(2), created_at: daysAgo(2) },

  // Lead 19 — Entreprises Charpentier & Associés
  { id: "a59", lead_id: "l19", type: "Lead créé", title: "Lead créé", description: "Cold call entrant.", logged_by_name: "Karim Mansouri", logged_by_initials: "KM", activity_at: daysAgo(16), created_at: daysAgo(16) },
  { id: "a60", lead_id: "l19", type: "Appel", title: "Appel initial", description: "Grande entreprise de charpenterie, intéressée à diversifier fournisseurs.", call_duration: 15, call_result: "Positif", logged_by_name: "Karim Mansouri", logged_by_initials: "KM", activity_at: daysAgo(15), created_at: daysAgo(15) },
];

export const MOCK_REMINDERS: CRMReminder[] = [
  { id: "r1", lead_id: "l1", title: "Follow-up pricelist Beaulieu", reminder_at: daysAgo(2), priority: "Haute", recurrence: "Aucune", notes: "Vérifier s'ils ont eu le temps de revoir la pricelist.", completed: false, assigned_agent_name: "Karim Mansouri", created_at: daysAgo(8) },
  { id: "r2", lead_id: "l2", title: "Rappel négociation prix apprêt", reminder_at: daysAgo(1), priority: "Haute", recurrence: "Aucune", notes: "Avoir réponse sur la révision de prix.", completed: false, assigned_agent_name: "Marie Tremblay", created_at: daysAgo(5) },
  { id: "r3", lead_id: "l3", title: "Rencontre négociation conditions contrat", reminder_at: daysAgo(3), priority: "Haute", recurrence: "Aucune", notes: "Préparer contreproposition sur délais livraison.", completed: false, assigned_agent_name: "Alex Bouchard", created_at: daysAgo(7) },
  { id: "r4", lead_id: "l5", title: "Réponse remise 8%", reminder_at: daysAgo(5), priority: "Haute", recurrence: "Aucune", notes: "Karim doit avoir approbation de la direction avant de répondre.", completed: false, assigned_agent_name: "Karim Mansouri", created_at: daysAgo(15) },
  { id: "r5", lead_id: "l13", title: "Envoi pricelist Techno-Béton", reminder_at: daysFromNow(2), priority: "Moyenne", recurrence: "Aucune", notes: "Préparer tarifs spéciaux volume 400 gal.", completed: false, assigned_agent_name: "Marie Tremblay", created_at: daysAgo(8) },
  { id: "r6", lead_id: "l14", title: "Planifier visite chez Beaupré", reminder_at: daysFromNow(3), priority: "Basse", recurrence: "Aucune", notes: "", completed: false, assigned_agent_name: "Sophie Lavoie", created_at: daysAgo(7) },
  { id: "r7", lead_id: "l15", title: "Follow-up pricelist nordique", reminder_at: daysFromNow(5), priority: "Moyenne", recurrence: "Aucune", notes: "Demander feedback sur les tarifs envoyés.", completed: false, assigned_agent_name: "Alex Bouchard", created_at: daysAgo(18) },
  { id: "r8", lead_id: "l17", title: "Rencontre Parquet Tradition", reminder_at: daysFromNow(1), priority: "Haute", recurrence: "Aucune", notes: "Confirmer lieu et heure.", completed: false, assigned_agent_name: "Marie Tremblay", created_at: daysAgo(7) },
  { id: "r9", lead_id: "l10", title: "Follow-up email Pro-Habitat", reminder_at: daysFromNow(4), priority: "Basse", recurrence: "Hebdomadaire", notes: "", completed: false, assigned_agent_name: "James O'Brien", created_at: daysAgo(4) },
];

export const MOCK_LEADS: CRMLead[] = [
  {
    id: "l1", company_name: "Constructions Beaulieu Inc.", contact_first_name: "Patrick", contact_last_name: "Beaulieu",
    contact_title: "VP Opérations", phone: "514-555-0142", email: "p.beaulieu@constructions-beaulieu.ca",
    website: "www.constructions-beaulieu.ca", address: "1425 Boul. Industriel, Laval, QC", region: "Laval",
    postal_code: "H7L 3T9", type: "Installateur", source: "Référence", temperature: "Hot", stage: "Proposition Envoyée",
    estimated_value: 45000, monthly_volume: 400, products_interest: ["Enduit de lissage Pro", "Kit nivelage auto"],
    closing_probability: 65, target_closing_date: daysFromNow(25).split("T")[0], annual_revenue_goal: 50000,
    monthly_volume_goal: 450, notes: "Client très prometteur, bien établi dans la région de Laval. Historique solide.",
    assigned_agent_id: "karim", assigned_agent_name: "Karim Mansouri", assigned_agent_initials: "KM", assigned_agent_color: "#6366f1",
    last_activity_at: daysAgo(8), archived: false, created_at: daysAgo(22), updated_at: daysAgo(8),
  },
  {
    id: "l2", company_name: "Planchers Elite MTL", contact_first_name: "Luc", contact_last_name: "Fontaine",
    contact_title: "Directeur Achats", phone: "514-555-0287", email: "luc.fontaine@plancherselite.com",
    website: "www.plancherselite.com", address: "845 Rue Saint-Denis, Montréal, QC", region: "Montréal",
    postal_code: "H2J 2L1", type: "Installateur", source: "Référence", temperature: "Hot", stage: "Négociation",
    estimated_value: 68000, monthly_volume: 800, products_interest: ["Apprêt universel", "Colle parquet haute perf.", "Enduit de lissage Pro"],
    closing_probability: 80, target_closing_date: daysFromNow(10).split("T")[0], annual_revenue_goal: 75000,
    monthly_volume_goal: 900, notes: "Actuellement avec Laticrete. Très motivés à changer. Deal imminent.",
    assigned_agent_id: "marie", assigned_agent_name: "Marie Tremblay", assigned_agent_initials: "MT", assigned_agent_color: "#059669",
    last_activity_at: daysAgo(6), archived: false, created_at: daysAgo(35), updated_at: daysAgo(6),
  },
  {
    id: "l3", company_name: "Réno-Dépôt Québec", contact_first_name: "François", contact_last_name: "Demers",
    contact_title: "Directeur Commercial", phone: "418-555-0193", email: "f.demers@renodepot-qc.ca",
    website: "www.renodepot-qc.ca", address: "2200 Autoroute Dufferin, Québec, QC", region: "Québec",
    postal_code: "G2C 1W4", type: "Large Scale", source: "Salon / événement", temperature: "Hot", stage: "Négociation",
    estimated_value: 320000, monthly_volume: 3500, products_interest: ["Enduit de lissage Pro", "Apprêt universel", "Kit nivelage auto", "Colle parquet haute perf."],
    closing_probability: 70, target_closing_date: daysFromNow(15).split("T")[0], annual_revenue_goal: 350000,
    monthly_volume_goal: 4000, notes: "PRIORITÉ ABSOLUE. 50+ succursales au Québec. Deal transformateur pour Uniflex.",
    assigned_agent_id: "alex", assigned_agent_name: "Alex Bouchard", assigned_agent_initials: "AB", assigned_agent_color: "#d97706",
    last_activity_at: daysAgo(7), archived: false, created_at: daysAgo(45), updated_at: daysAgo(7),
  },
  {
    id: "l4", company_name: "Toitures Gagnon & Fils", contact_first_name: "Sylvain", contact_last_name: "Gagnon",
    contact_title: "Propriétaire", phone: "450-555-0314", email: "sylvain@toituregagnon.ca",
    website: "", address: "77 Chemin des Artisans, Saint-Jérôme, QC", region: "Rive-Nord",
    postal_code: "J7Y 2N5", type: "Installateur", source: "Cold call", temperature: "Warm", stage: "Premier Contact",
    estimated_value: 18000, monthly_volume: 150, products_interest: ["Enduit de lissage Pro", "Primer béton"],
    closing_probability: 35, target_closing_date: daysFromNow(45).split("T")[0], annual_revenue_goal: 20000,
    monthly_volume_goal: 180, notes: "PME familiale, décision lente. Bien les accompagner.",
    assigned_agent_id: "sophie", assigned_agent_name: "Sophie Lavoie", assigned_agent_initials: "SL", assigned_agent_color: "#7c3aed",
    last_activity_at: daysAgo(16), archived: false, created_at: daysAgo(18), updated_at: daysAgo(16),
  },
  {
    id: "l5", company_name: "Distribution Lessard Inc.", contact_first_name: "Marc", contact_last_name: "Lessard",
    contact_title: "CEO", phone: "450-555-0476", email: "marc.lessard@distrib-lessard.ca",
    website: "www.distrib-lessard.ca", address: "3200 Boul. Rome, Brossard, QC", region: "Rive-Sud",
    postal_code: "J4Y 2T3", type: "Distributeur", source: "Référence", temperature: "Hot", stage: "Négociation",
    estimated_value: 195000, monthly_volume: 2200, products_interest: ["Enduit de lissage Pro", "Kit nivelage auto", "Apprêt universel", "Colle parquet haute perf.", "Résine époxy"],
    closing_probability: 75, target_closing_date: daysFromNow(12).split("T")[0], annual_revenue_goal: 210000,
    monthly_volume_goal: 2500, notes: "Distributeur clé Rive-Sud. 200+ clients installateurs. Deal stratégique.",
    assigned_agent_id: "karim", assigned_agent_name: "Karim Mansouri", assigned_agent_initials: "KM", assigned_agent_color: "#6366f1",
    last_activity_at: daysAgo(15), archived: false, created_at: daysAgo(55), updated_at: daysAgo(15),
  },
  {
    id: "l6", company_name: "Groupe Immo Lafleur", contact_first_name: "Robert", contact_last_name: "Lafleur",
    contact_title: "PDG", phone: "514-555-0521", email: "r.lafleur@groupelafleur.ca",
    website: "www.groupelafleur.ca", address: "1000 Rue Peel, Montréal, QC", region: "Montréal",
    postal_code: "H3C 2W4", type: "Large Scale", source: "Référence", temperature: "Hot", stage: "Fermé Gagné",
    estimated_value: 145000, monthly_volume: 1500, products_interest: ["Enduit de lissage Pro", "Apprêt universel", "Kit nivelage auto"],
    closing_probability: 100, target_closing_date: daysAgo(45).split("T")[0], annual_revenue_goal: 150000,
    monthly_volume_goal: 1500, notes: "GAGNÉ. 200 unités condo rénovées. Client phare Uniflex.",
    assigned_agent_id: "marie", assigned_agent_name: "Marie Tremblay", assigned_agent_initials: "MT", assigned_agent_color: "#059669",
    last_activity_at: daysAgo(45), closed_at: daysAgo(45), archived: false, created_at: daysAgo(90), updated_at: daysAgo(45),
  },
  {
    id: "l7", company_name: "Plancher Concept Plus", contact_first_name: "Annie", contact_last_name: "Ricard",
    contact_title: "Directrice Opérations", phone: "514-555-0634", email: "aricard@plancherconcept.com",
    website: "www.plancherconcept.com", address: "2040 Rue Sherbrooke O, Montréal, QC", region: "Montréal",
    postal_code: "H3H 1G9", type: "Installateur", source: "Réseau", temperature: "Hot", stage: "Fermé Gagné",
    estimated_value: 38000, monthly_volume: 350, products_interest: ["Colle parquet haute perf.", "Finition satin"],
    closing_probability: 100, target_closing_date: daysAgo(55).split("T")[0], annual_revenue_goal: 40000,
    monthly_volume_goal: 400, notes: "Client acquis rapidement. Très satisfait des produits.",
    assigned_agent_id: "sophie", assigned_agent_name: "Sophie Lavoie", assigned_agent_initials: "SL", assigned_agent_color: "#7c3aed",
    last_activity_at: daysAgo(55), closed_at: daysAgo(55), archived: false, created_at: daysAgo(70), updated_at: daysAgo(55),
  },
  {
    id: "l8", company_name: "Entreprises Martin Réno", contact_first_name: "Claude", contact_last_name: "Martin",
    contact_title: "Propriétaire", phone: "514-555-0745", email: "claude@martinreno.ca",
    website: "", address: "123 Rue Notre-Dame E, Montréal, QC", region: "Montréal",
    postal_code: "H2Y 1C6", type: "Installateur", source: "Cold call", temperature: "Cold", stage: "Fermé Perdu",
    estimated_value: 12000, monthly_volume: 100, products_interest: ["Apprêt universel"],
    closing_probability: 0, target_closing_date: daysAgo(50).split("T")[0], annual_revenue_goal: 12000,
    monthly_volume_goal: 100, notes: "Fidèle à Mapei depuis 10 ans. Pas ouvert au changement. Recontacter 2027.",
    assigned_agent_id: "james", assigned_agent_name: "James O'Brien", assigned_agent_initials: "JO", assigned_agent_color: "#0891b2",
    last_activity_at: daysAgo(50), closed_at: daysAgo(50), archived: false, created_at: daysAgo(60), updated_at: daysAgo(50),
  },
  {
    id: "l9", company_name: "Constructions Vachon", contact_first_name: "Daniel", contact_last_name: "Vachon",
    contact_title: "Président", phone: "418-555-0856", email: "d.vachon@constructionsvachon.qc.ca",
    website: "www.constructionsvachon.qc.ca", address: "550 Boul. Wilfrid-Hamel, Québec, QC", region: "Québec",
    postal_code: "G1M 2R9", type: "Installateur", source: "Référence", temperature: "Cold", stage: "Fermé Perdu",
    estimated_value: 22000, monthly_volume: 200, products_interest: ["Enduit de lissage Pro", "Apprêt universel"],
    closing_probability: 0, target_closing_date: daysAgo(60).split("T")[0], annual_revenue_goal: 25000,
    monthly_volume_goal: 220, notes: "Budget insuffisant. Leur proposer gamme entrée de gamme quand disponible.",
    assigned_agent_id: "alex", assigned_agent_name: "Alex Bouchard", assigned_agent_initials: "AB", assigned_agent_color: "#d97706",
    last_activity_at: daysAgo(60), closed_at: daysAgo(60), archived: false, created_at: daysAgo(75), updated_at: daysAgo(60),
  },
  {
    id: "l10", company_name: "Rénovations Pro-Habitat", contact_first_name: "Kevin", contact_last_name: "Trahan",
    contact_title: "Chef de chantier", phone: "514-555-0967", email: "k.trahan@prohabitat.ca",
    website: "www.prohabitat.ca", address: "88 Boul. Saint-Laurent, Montréal, QC", region: "Montréal",
    postal_code: "H2T 1W2", type: "Installateur", source: "Pub en ligne", temperature: "Warm", stage: "Nouveau Lead",
    estimated_value: 24000, monthly_volume: 220, products_interest: ["Kit nivelage auto", "Enduit de lissage Pro"],
    closing_probability: 20, annual_revenue_goal: 25000, monthly_volume_goal: 250, notes: "",
    assigned_agent_id: "james", assigned_agent_name: "James O'Brien", assigned_agent_initials: "JO", assigned_agent_color: "#0891b2",
    last_activity_at: daysAgo(4), archived: false, created_at: daysAgo(5), updated_at: daysAgo(4),
  },
  {
    id: "l11", company_name: "Plafonds & Planchers RDS", contact_first_name: "Nathalie", contact_last_name: "Bourgeois",
    contact_title: "Gérante", phone: "450-555-1078", email: "nbourgeois@pprds.ca",
    website: "", address: "1200 Boul. Taschereau, Longueuil, QC", region: "Rive-Sud",
    postal_code: "J4K 2V8", type: "Installateur", source: "Site web", temperature: "Cold", stage: "Nouveau Lead",
    estimated_value: 15000, monthly_volume: 120, products_interest: ["Apprêt universel"],
    closing_probability: 15, annual_revenue_goal: 16000, monthly_volume_goal: 140, notes: "",
    assigned_agent_id: "sophie", assigned_agent_name: "Sophie Lavoie", assigned_agent_initials: "SL", assigned_agent_color: "#7c3aed",
    last_activity_at: daysAgo(3), archived: false, created_at: daysAgo(3), updated_at: daysAgo(3),
  },
  {
    id: "l12", company_name: "Les Sols Durables", contact_first_name: "Pierre-Luc", contact_last_name: "Gendron",
    contact_title: "Directeur Technique", phone: "514-555-1189", email: "plgendron@lesdurables.ca",
    website: "www.lesdurables.ca", address: "3400 Rue Hochelaga, Montréal, QC", region: "Montréal",
    postal_code: "H1W 1H3", type: "Installateur", source: "Réseau", temperature: "Warm", stage: "Fermé Gagné",
    estimated_value: 55000, monthly_volume: 600, products_interest: ["Enduit de lissage Pro", "Colle parquet haute perf.", "Finition satin"],
    closing_probability: 100, annual_revenue_goal: 58000, monthly_volume_goal: 650, notes: "Client depuis mars. Très satisfait.",
    assigned_agent_id: "karim", assigned_agent_name: "Karim Mansouri", assigned_agent_initials: "KM", assigned_agent_color: "#6366f1",
    last_activity_at: daysAgo(50), closed_at: daysAgo(50), archived: false, created_at: daysAgo(85), updated_at: daysAgo(50),
  },
  {
    id: "l13", company_name: "Techno-Béton Rive-Nord", contact_first_name: "Jean-Paul", contact_last_name: "Tessier",
    contact_title: "Responsable Achats", phone: "450-555-1290", email: "jptessier@techno-beton.ca",
    website: "www.techno-beton.ca", address: "2800 Chemin du Lac, Terrebonne, QC", region: "Rive-Nord",
    postal_code: "J6W 4Y2", type: "Installateur", source: "Salon / événement", temperature: "Hot", stage: "Qualification",
    estimated_value: 42000, monthly_volume: 400, products_interest: ["Mortier polymère", "Résine époxy", "Primer béton"],
    closing_probability: 55, target_closing_date: daysFromNow(30).split("T")[0], annual_revenue_goal: 45000,
    monthly_volume_goal: 450, notes: "Très intéressés par mortier polymère. Potentiel exclusivité région.",
    assigned_agent_id: "marie", assigned_agent_name: "Marie Tremblay", assigned_agent_initials: "MT", assigned_agent_color: "#059669",
    last_activity_at: daysAgo(8), archived: false, created_at: daysAgo(14), updated_at: daysAgo(8),
  },
  {
    id: "l14", company_name: "Aménagement Intérieur Beaupré", contact_first_name: "Caroline", contact_last_name: "Beaupré",
    contact_title: "Propriétaire", phone: "819-555-1301", email: "caroline@amenagement-beaupre.ca",
    website: "", address: "450 Rue King O, Sherbrooke, QC", region: "Estrie",
    postal_code: "J1H 2A7", type: "Installateur", source: "Cold call", temperature: "Warm", stage: "Premier Contact",
    estimated_value: 14000, monthly_volume: 100, products_interest: ["Colle parquet haute perf.", "Finition satin"],
    closing_probability: 30, annual_revenue_goal: 15000, monthly_volume_goal: 120, notes: "",
    assigned_agent_id: "sophie", assigned_agent_name: "Sophie Lavoie", assigned_agent_initials: "SL", assigned_agent_color: "#7c3aed",
    last_activity_at: daysAgo(7), archived: false, created_at: daysAgo(8), updated_at: daysAgo(7),
  },
  {
    id: "l15", company_name: "Constructions Nordiques", contact_first_name: "Éric", contact_last_name: "Fortin",
    contact_title: "Directeur Projets", phone: "418-555-1412", email: "e.fortin@constructionsnord.ca",
    website: "www.constructionsnord.ca", address: "900 Rue Cartier, Chicoutimi, QC", region: "Québec",
    postal_code: "G7H 3N3", type: "Installateur", source: "Référence", temperature: "Warm", stage: "Proposition Envoyée",
    estimated_value: 32000, monthly_volume: 280, products_interest: ["Enduit de lissage Pro", "Mortier polymère"],
    closing_probability: 45, target_closing_date: daysFromNow(35).split("T")[0], annual_revenue_goal: 35000,
    monthly_volume_goal: 300, notes: "Régions nordiques, besoin produits performants à froid.",
    assigned_agent_id: "alex", assigned_agent_name: "Alex Bouchard", assigned_agent_initials: "AB", assigned_agent_color: "#d97706",
    last_activity_at: daysAgo(18), archived: false, created_at: daysAgo(25), updated_at: daysAgo(18),
  },
  {
    id: "l16", company_name: "Groupe Immobilier Lanthier", contact_first_name: "Sylvie", contact_last_name: "Lanthier",
    contact_title: "VP Développement", phone: "514-555-1523", email: "slanthier@gilanthier.ca",
    website: "www.gilanthier.ca", address: "600 Boul. Maisonneuve O, Montréal, QC", region: "Montréal",
    postal_code: "H3A 3J2", type: "Large Scale", source: "Référence", temperature: "Warm", stage: "Fermé Gagné",
    estimated_value: 115000, monthly_volume: 1200, products_interest: ["Enduit de lissage Pro", "Kit nivelage auto", "Apprêt universel"],
    closing_probability: 100, annual_revenue_goal: 120000, monthly_volume_goal: 1200, notes: "Contrat 2 ans signé. Client stratégique.",
    assigned_agent_id: "james", assigned_agent_name: "James O'Brien", assigned_agent_initials: "JO", assigned_agent_color: "#0891b2",
    last_activity_at: daysAgo(40), closed_at: daysAgo(40), archived: false, created_at: daysAgo(95), updated_at: daysAgo(40),
  },
  {
    id: "l17", company_name: "Parquet Tradition Estrie", contact_first_name: "Marc-André", contact_last_name: "Pelletier",
    contact_title: "Gérant", phone: "819-555-1634", email: "map@parquettradition.ca",
    website: "www.parquettradition.ca", address: "320 Boul. Portland, Sherbrooke, QC", region: "Estrie",
    postal_code: "J1L 2L4", type: "Installateur", source: "Réseau", temperature: "Warm", stage: "Premier Contact",
    estimated_value: 21000, monthly_volume: 180, products_interest: ["Colle parquet haute perf.", "Finition satin", "Sous-couche acoustique"],
    closing_probability: 40, target_closing_date: daysFromNow(40).split("T")[0], annual_revenue_goal: 22000,
    monthly_volume_goal: 200, notes: "Spécialiste plancher de bois franc. Bon potentiel.",
    assigned_agent_id: "marie", assigned_agent_name: "Marie Tremblay", assigned_agent_initials: "MT", assigned_agent_color: "#059669",
    last_activity_at: daysAgo(7), archived: false, created_at: daysAgo(10), updated_at: daysAgo(7),
  },
  {
    id: "l18", company_name: "Solutions Plancher Outaouais", contact_first_name: "David", contact_last_name: "Paquette",
    contact_title: "Directeur Technique", phone: "819-555-1745", email: "d.paquette@splano.ca",
    website: "", address: "1100 Boul. Maloney, Gatineau, QC", region: "Outaouais",
    postal_code: "J8P 7H3", type: "Installateur", source: "Pub en ligne", temperature: "Hot", stage: "Nouveau Lead",
    estimated_value: 28000, monthly_volume: 250, products_interest: ["Enduit de lissage Pro"],
    closing_probability: 25, annual_revenue_goal: 30000, monthly_volume_goal: 280, notes: "",
    assigned_agent_id: "james", assigned_agent_name: "James O'Brien", assigned_agent_initials: "JO", assigned_agent_color: "#0891b2",
    last_activity_at: daysAgo(2), archived: false, created_at: daysAgo(2), updated_at: daysAgo(2),
  },
  {
    id: "l19", company_name: "Entreprises Charpentier & Associés", contact_first_name: "Gilles", contact_last_name: "Charpentier",
    contact_title: "Président", phone: "450-555-1856", email: "g.charpentier@charpentier-ass.ca",
    website: "www.charpentier-ass.ca", address: "700 Rue des Érables, Saint-Hyacinthe, QC", region: "Rive-Sud",
    postal_code: "J2S 4T6", type: "Distributeur", source: "Cold call", temperature: "Warm", stage: "Qualification",
    estimated_value: 85000, monthly_volume: 900, products_interest: ["Apprêt universel", "Enduit de lissage Pro", "Kit nivelage auto", "Résine époxy"],
    closing_probability: 50, target_closing_date: daysFromNow(45).split("T")[0], annual_revenue_goal: 90000,
    monthly_volume_goal: 1000, notes: "Distributeur Rive-Sud potentiel. Bons volumes si deal conclu.",
    assigned_agent_id: "karim", assigned_agent_name: "Karim Mansouri", assigned_agent_initials: "KM", assigned_agent_color: "#6366f1",
    last_activity_at: daysAgo(15), archived: false, created_at: daysAgo(16), updated_at: daysAgo(15),
  },
  {
    id: "l20", company_name: "Revêtements Desrochers", contact_first_name: "Bruno", contact_last_name: "Desrochers",
    contact_title: "Gérant Général", phone: "450-555-1967", email: "b.desrochers@revetdesrochers.ca",
    website: "", address: "215 Boul. Arthur-Sauvé, Saint-Eustache, QC", region: "Rive-Nord",
    postal_code: "J7R 2H2", type: "Installateur", source: "Site web", temperature: "Warm", stage: "Qualification",
    estimated_value: 19000, monthly_volume: 160, products_interest: ["Sous-couche acoustique", "Colle parquet haute perf."],
    closing_probability: 40, annual_revenue_goal: 20000, monthly_volume_goal: 180, notes: "",
    assigned_agent_id: "marie", assigned_agent_name: "Marie Tremblay", assigned_agent_initials: "MT", assigned_agent_color: "#059669",
    last_activity_at: daysAgo(15), archived: false, created_at: daysAgo(20), updated_at: daysAgo(15),
  },
];

export function enrichLeads(leads: CRMLead[]): CRMLead[] {
  return leads.map(lead => ({
    ...lead,
    activities: MOCK_ACTIVITIES.filter(a => a.lead_id === lead.id),
    reminders: MOCK_REMINDERS.filter(r => r.lead_id === lead.id),
    files: [],
  }));
}
