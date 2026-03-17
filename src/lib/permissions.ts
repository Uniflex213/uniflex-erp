export const PERMISSION_KEYS = [
  // Dashboards
  "dashboard.company.view",
  "dashboard.personal.view",
  // Produits
  "ventes.products.view",
  "ventes.products.create",
  "ventes.products.edit",
  "ventes.products.delete",
  "ventes.products.manage_pricing",
  // Commandes
  "ventes.orders.view_own",
  "ventes.orders.view_all",
  "ventes.orders.create",
  "ventes.orders.edit",
  "ventes.orders.delete",
  "ventes.orders.validate",
  // Outils de vente
  "ventes.pricelist.view",
  "ventes.pricelist.create",
  "ventes.pricelist.edit",
  "ventes.pricelist.send",
  "ventes.margin_calculator.view",
  // Échantillons
  "ventes.samples.view_own",
  "ventes.samples.view_all",
  "ventes.samples.create",
  "ventes.samples.edit",
  "ventes.samples.manage",
  // CRM & Performance
  "performance.pipeline_team.view",
  "performance.pipeline_team.add_lead",
  "performance.pipeline_team.edit_lead",
  "performance.pipeline_team.delete_lead",
  "performance.pipeline_team.manage",
  "performance.workstation.view",
  "performance.calendar.view",
  "performance.calendar.manage",
  "performance.my_team.view",
  "performance.my_team.manage",
  "performance.my_clients.view",
  "performance.my_clients.manage",
  // Store OPS
  "storeops.pickup_tickets.view",
  "storeops.pickup_tickets.create",
  "storeops.pickup_tickets.edit",
  "storeops.pickup_tickets.delete",
  "storeops.pickup_tickets.validate",
  "storeops.inventory.view",
  "storeops.inventory.create",
  "storeops.inventory.adjust",
  "storeops.inventory.delete",
  "storeops.to_invoice.view",
  "storeops.to_invoice.manage",
  "storeops.to_invoice.export",
  "storeops.expenses.view",
  "storeops.expenses.create",
  "storeops.benefice.view",
  "storeops.benefice.export",
  "storeops.prices.view",
  "storeops.prices.edit",
  // Disputes
  "disputes.view_own",
  "disputes.view_all",
  "disputes.create",
  "disputes.edit",
  "disputes.resolve",
  "disputes.delete",
  "disputes.manage",
  "disputes.export",
  // Rapports
  "reports.sales_analytics.view",
  "reports.financial.view",
  "reports.team_performance.view",
  "reports.commissions.view",
  "reports.export",
  // Messagerie
  "messaging.view",
  "messaging.send",
  "messaging.create_channel",
  "messaging.manage_channels",
  // Administration
  "admin.users.view",
  "admin.users.create",
  "admin.users.edit",
  "admin.users.suspend",
  "admin.users.delete",
  "admin.teams.view",
  "admin.teams.create",
  "admin.teams.manage",
  "admin.stores.view",
  "admin.stores.create",
  "admin.stores.edit",
  "admin.stores.deactivate",
  "admin.settings.view",
  "admin.settings.edit",
  "admin.activity_logs.view",
  "admin.logbook.view",
  "admin.account_requests.view",
  "admin.account_requests.approve",
  "admin.account_requests.reject",
  "admin.import_export.products",
  "admin.import_export.clients",
  // Codes vendeurs & Commissions & Team Leader
  "performance.team_prices.view",
  "performance.team_prices.edit",
  "performance.team_benefice.view",
  "performance.commission.view",
  "performance.team_leader.manage",
] as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[number];

// ── PERMISSION GROUPS — organisé par menu de l'app ──────────────────────────
export const PERMISSION_GROUPS: Record<string, PermissionKey[]> = {
  "Dashboard": [
    "dashboard.company.view",
    "dashboard.personal.view",
  ],

  "Ventes — Produits": [
    "ventes.products.view",
    "ventes.products.create",
    "ventes.products.edit",
    "ventes.products.delete",
    "ventes.products.manage_pricing",
  ],

  "Ventes — Commandes": [
    "ventes.orders.view_own",
    "ventes.orders.view_all",
    "ventes.orders.create",
    "ventes.orders.edit",
    "ventes.orders.delete",
    "ventes.orders.validate",
  ],

  "Ventes — Outils": [
    "ventes.pricelist.view",
    "ventes.pricelist.create",
    "ventes.pricelist.edit",
    "ventes.pricelist.send",
    "ventes.margin_calculator.view",
  ],

  "Ventes — Échantillons": [
    "ventes.samples.view_own",
    "ventes.samples.view_all",
    "ventes.samples.create",
    "ventes.samples.edit",
    "ventes.samples.manage",
  ],

  "Performance — Pipeline": [
    "performance.pipeline_team.view",
    "performance.pipeline_team.add_lead",
    "performance.pipeline_team.edit_lead",
    "performance.pipeline_team.delete_lead",
    "performance.pipeline_team.manage",
  ],

  "Performance — Espace de travail": [
    "performance.workstation.view",
    "performance.calendar.view",
    "performance.calendar.manage",
  ],

  "Performance — Mon équipe & Clients": [
    "performance.my_team.view",
    "performance.my_team.manage",
    "performance.my_clients.view",
    "performance.my_clients.manage",
  ],

  "Performance — Team Leader": [
    "performance.team_leader.manage",
    "performance.team_prices.view",
    "performance.team_prices.edit",
    "performance.team_benefice.view",
    "performance.commission.view",
  ],

  "Store OPS — Pickup Tickets": [
    "storeops.pickup_tickets.view",
    "storeops.pickup_tickets.create",
    "storeops.pickup_tickets.edit",
    "storeops.pickup_tickets.delete",
    "storeops.pickup_tickets.validate",
  ],

  "Store OPS — Inventaire": [
    "storeops.inventory.view",
    "storeops.inventory.create",
    "storeops.inventory.adjust",
    "storeops.inventory.delete",
  ],

  "Store OPS — À facturer": [
    "storeops.to_invoice.view",
    "storeops.to_invoice.manage",
    "storeops.to_invoice.export",
  ],

  "Store OPS — Dépenses": [
    "storeops.expenses.view",
    "storeops.expenses.create",
  ],

  "Store OPS — Bénéfice": [
    "storeops.benefice.view",
    "storeops.benefice.export",
  ],

  "Store OPS — Prix": [
    "storeops.prices.view",
    "storeops.prices.edit",
  ],

  "Disputes": [
    "disputes.view_own",
    "disputes.view_all",
    "disputes.create",
    "disputes.edit",
    "disputes.resolve",
    "disputes.delete",
    "disputes.manage",
    "disputes.export",
  ],

  "Rapports": [
    "reports.sales_analytics.view",
    "reports.financial.view",
    "reports.team_performance.view",
    "reports.commissions.view",
    "reports.export",
  ],

  "Messagerie": [
    "messaging.view",
    "messaging.send",
    "messaging.create_channel",
    "messaging.manage_channels",
  ],

  "Admin — Utilisateurs": [
    "admin.users.view",
    "admin.users.create",
    "admin.users.edit",
    "admin.users.suspend",
    "admin.users.delete",
  ],

  "Admin — Équipes": [
    "admin.teams.view",
    "admin.teams.create",
    "admin.teams.manage",
  ],

  "Admin — Magasins": [
    "admin.stores.view",
    "admin.stores.create",
    "admin.stores.edit",
    "admin.stores.deactivate",
  ],

  "Admin — Paramètres & Logs": [
    "admin.settings.view",
    "admin.settings.edit",
    "admin.activity_logs.view",
    "admin.logbook.view",
  ],

  "Admin — Demandes de compte": [
    "admin.account_requests.view",
    "admin.account_requests.approve",
    "admin.account_requests.reject",
  ],

  "Admin — Import/Export": [
    "admin.import_export.products",
    "admin.import_export.clients",
  ],

  "Vue Fabricant (SCI)": [
    "dashboard.company.view",
    "ventes.products.view",
    "ventes.products.edit",
    "ventes.products.manage_pricing",
    "ventes.orders.view_all",
    "ventes.orders.validate",
    "ventes.samples.view_all",
    "storeops.inventory.view",
    "storeops.inventory.create",
    "storeops.inventory.adjust",
    "storeops.pickup_tickets.view",
    "storeops.to_invoice.view",
    "disputes.view_all",
    "disputes.manage",
    "reports.sales_analytics.view",
    "reports.financial.view",
    "messaging.view",
    "messaging.send",
  ],
};

// Quick-toggle bundle: all permissions needed for Vue Fabricant (SCI) access
export const VUE_FABRICANT_PERMISSIONS: PermissionKey[] = [
  "dashboard.company.view",
  "ventes.products.view",
  "ventes.products.edit",
  "ventes.products.manage_pricing",
  "ventes.orders.view_all",
  "ventes.orders.validate",
  "ventes.samples.view_all",
  "storeops.inventory.view",
  "storeops.inventory.create",
  "storeops.inventory.adjust",
  "storeops.pickup_tickets.view",
  "storeops.to_invoice.view",
  "disputes.view_all",
  "disputes.manage",
  "reports.sales_analytics.view",
  "reports.financial.view",
  "messaging.view",
  "messaging.send",
];

// ── PERMISSION DEPENDENCIES — parent/enfant visibility ──────────────────────
// Chaque clé = permission enfant
// Chaque valeur = tableau de permissions parents dont AU MOINS UNE doit être cochée
export const PERMISSION_DEPENDENCIES: Partial<Record<PermissionKey, PermissionKey[]>> = {
  // Produits
  "ventes.products.create":          ["ventes.products.view"],
  "ventes.products.edit":            ["ventes.products.view"],
  "ventes.products.delete":          ["ventes.products.view"],
  "ventes.products.manage_pricing":  ["ventes.products.view"],

  // Commandes
  "ventes.orders.create":    ["ventes.orders.view_own", "ventes.orders.view_all"],
  "ventes.orders.edit":      ["ventes.orders.view_own", "ventes.orders.view_all"],
  "ventes.orders.delete":    ["ventes.orders.view_own", "ventes.orders.view_all"],
  "ventes.orders.validate":  ["ventes.orders.view_own", "ventes.orders.view_all"],

  // Pricelist
  "ventes.pricelist.create": ["ventes.pricelist.view"],
  "ventes.pricelist.edit":   ["ventes.pricelist.view"],
  "ventes.pricelist.send":   ["ventes.pricelist.view"],

  // Échantillons
  "ventes.samples.create":  ["ventes.samples.view_own", "ventes.samples.view_all"],
  "ventes.samples.edit":    ["ventes.samples.view_own", "ventes.samples.view_all"],
  "ventes.samples.manage":  ["ventes.samples.view_own", "ventes.samples.view_all"],

  // Pipeline
  "performance.pipeline_team.add_lead":    ["performance.pipeline_team.view"],
  "performance.pipeline_team.edit_lead":   ["performance.pipeline_team.view"],
  "performance.pipeline_team.delete_lead": ["performance.pipeline_team.view"],
  "performance.pipeline_team.manage":      ["performance.pipeline_team.view"],

  // Calendar
  "performance.calendar.manage": ["performance.calendar.view"],

  // Mon équipe
  "performance.my_team.manage":    ["performance.my_team.view"],
  "performance.my_clients.manage": ["performance.my_clients.view"],

  // Team Leader
  "performance.team_prices.edit": ["performance.team_prices.view"],

  // Pickup Tickets
  "storeops.pickup_tickets.create":   ["storeops.pickup_tickets.view"],
  "storeops.pickup_tickets.edit":     ["storeops.pickup_tickets.view"],
  "storeops.pickup_tickets.delete":   ["storeops.pickup_tickets.view"],
  "storeops.pickup_tickets.validate": ["storeops.pickup_tickets.view"],

  // Inventaire
  "storeops.inventory.create": ["storeops.inventory.view"],
  "storeops.inventory.adjust": ["storeops.inventory.view"],
  "storeops.inventory.delete": ["storeops.inventory.view"],

  // À facturer
  "storeops.to_invoice.manage": ["storeops.to_invoice.view"],
  "storeops.to_invoice.export": ["storeops.to_invoice.view"],

  // Dépenses
  "storeops.expenses.create": ["storeops.expenses.view"],

  // Bénéfice
  "storeops.benefice.export": ["storeops.benefice.view"],

  // Prix
  "storeops.prices.edit": ["storeops.prices.view"],

  // Disputes
  "disputes.create":  ["disputes.view_own", "disputes.view_all"],
  "disputes.edit":    ["disputes.view_own", "disputes.view_all"],
  "disputes.resolve": ["disputes.view_own", "disputes.view_all"],
  "disputes.delete":  ["disputes.view_own", "disputes.view_all"],
  "disputes.manage":  ["disputes.view_own", "disputes.view_all"],
  "disputes.export":  ["disputes.view_own", "disputes.view_all"],

  // Messagerie
  "messaging.send":            ["messaging.view"],
  "messaging.create_channel":  ["messaging.view"],
  "messaging.manage_channels": ["messaging.view"],

  // Admin Utilisateurs
  "admin.users.create":  ["admin.users.view"],
  "admin.users.edit":    ["admin.users.view"],
  "admin.users.suspend": ["admin.users.view"],
  "admin.users.delete":  ["admin.users.view"],

  // Admin Équipes
  "admin.teams.create": ["admin.teams.view"],
  "admin.teams.manage": ["admin.teams.view"],

  // Admin Magasins
  "admin.stores.create":     ["admin.stores.view"],
  "admin.stores.edit":       ["admin.stores.view"],
  "admin.stores.deactivate": ["admin.stores.view"],

  // Admin Paramètres
  "admin.settings.edit": ["admin.settings.view"],

  // Admin Demandes
  "admin.account_requests.approve": ["admin.account_requests.view"],
  "admin.account_requests.reject":  ["admin.account_requests.view"],

  // Rapports — export requiert au moins un view
  "reports.export": [
    "reports.sales_analytics.view",
    "reports.financial.view",
    "reports.team_performance.view",
    "reports.commissions.view",
  ],
};

export const PERMISSION_LABELS: Record<PermissionKey, string> = {
  "dashboard.company.view": "Voir dashboard compagnie",
  "dashboard.personal.view": "Voir dashboard personnel",
  "ventes.products.view": "Voir les produits",
  "ventes.products.create": "Créer des produits",
  "ventes.products.edit": "Modifier les produits",
  "ventes.products.delete": "Supprimer les produits",
  "ventes.products.manage_pricing": "Gérer les prix",
  "ventes.orders.view_own": "Voir ses commandes",
  "ventes.orders.view_all": "Voir toutes les commandes",
  "ventes.orders.create": "Créer des commandes",
  "ventes.orders.edit": "Modifier les commandes",
  "ventes.orders.delete": "Supprimer les commandes",
  "ventes.orders.validate": "Valider les commandes",
  "ventes.pricelist.view": "Voir les listes de prix",
  "ventes.pricelist.create": "Créer des listes de prix",
  "ventes.pricelist.edit": "Modifier les listes de prix",
  "ventes.pricelist.send": "Envoyer les listes de prix",
  "ventes.margin_calculator.view": "Calculateur de marge",
  "ventes.samples.view_own": "Voir ses échantillons",
  "ventes.samples.view_all": "Voir tous les échantillons",
  "ventes.samples.create": "Créer des demandes d'échantillons",
  "ventes.samples.edit": "Modifier les échantillons",
  "ventes.samples.manage": "Gérer les échantillons (admin)",
  "performance.pipeline_team.view": "Voir le pipeline équipe",
  "performance.pipeline_team.add_lead": "Ajouter des leads",
  "performance.pipeline_team.edit_lead": "Modifier les leads",
  "performance.pipeline_team.delete_lead": "Supprimer les leads",
  "performance.pipeline_team.manage": "Gérer le pipeline (admin)",
  "performance.workstation.view": "Accès poste de travail",
  "performance.calendar.view": "Voir le calendrier",
  "performance.calendar.manage": "Gérer le calendrier",
  "performance.my_team.view": "Voir mon équipe",
  "performance.my_team.manage": "Gérer mon équipe",
  "performance.my_clients.view": "Voir mes clients",
  "performance.my_clients.manage": "Gérer les clients (admin)",
  "storeops.pickup_tickets.view": "Voir les tickets de cueillette",
  "storeops.pickup_tickets.create": "Créer des tickets",
  "storeops.pickup_tickets.edit": "Modifier les tickets",
  "storeops.pickup_tickets.delete": "Supprimer les tickets",
  "storeops.pickup_tickets.validate": "Valider les tickets",
  "storeops.inventory.view": "Voir l'inventaire",
  "storeops.inventory.create": "Créer des entrées d'inventaire",
  "storeops.inventory.adjust": "Ajuster l'inventaire",
  "storeops.inventory.delete": "Supprimer des entrées d'inventaire",
  "storeops.to_invoice.view": "Voir les commandes à facturer",
  "storeops.to_invoice.manage": "Gérer la facturation",
  "storeops.to_invoice.export": "Exporter les factures",
  "storeops.expenses.view": "Voir les dépenses",
  "storeops.expenses.create": "Créer des dépenses",
  "storeops.benefice.view": "Voir le bénéfice magasin",
  "storeops.benefice.export": "Exporter le bénéfice",
  "storeops.prices.view": "Voir les prix magasin",
  "storeops.prices.edit": "Modifier les prix magasin",
  "disputes.view_own": "Voir ses disputes",
  "disputes.view_all": "Voir toutes les disputes",
  "disputes.create": "Ouvrir une dispute",
  "disputes.edit": "Modifier une dispute",
  "disputes.resolve": "Résoudre / fermer une dispute",
  "disputes.delete": "Supprimer une dispute",
  "disputes.manage": "Gérer toutes les disputes (admin)",
  "disputes.export": "Exporter les disputes",
  "reports.sales_analytics.view": "Voir analytics ventes",
  "reports.financial.view": "Voir rapports financiers",
  "reports.team_performance.view": "Voir performance équipe",
  "reports.commissions.view": "Voir les commissions",
  "reports.export": "Exporter les rapports",
  "messaging.view": "Voir la messagerie",
  "messaging.send": "Envoyer des messages",
  "messaging.create_channel": "Créer des canaux",
  "messaging.manage_channels": "Gérer les canaux",
  "admin.users.view": "Voir les utilisateurs",
  "admin.users.create": "Créer des utilisateurs",
  "admin.users.edit": "Modifier les utilisateurs",
  "admin.users.suspend": "Suspendre des utilisateurs",
  "admin.users.delete": "Supprimer des utilisateurs",
  "admin.teams.view": "Voir les équipes",
  "admin.teams.create": "Créer des équipes",
  "admin.teams.manage": "Gérer les équipes",
  "admin.stores.view": "Voir les magasins",
  "admin.stores.create": "Créer des magasins",
  "admin.stores.edit": "Modifier les magasins",
  "admin.stores.deactivate": "Désactiver des magasins",
  "admin.settings.view": "Voir les paramètres système",
  "admin.settings.edit": "Modifier les paramètres système",
  "admin.activity_logs.view": "Voir les journaux d'activité (legacy)",
  "admin.logbook.view": "Voir le Logbook compagnie",
  "admin.account_requests.view": "Voir les demandes de compte",
  "admin.account_requests.approve": "Approuver les demandes",
  "admin.account_requests.reject": "Rejeter les demandes",
  "admin.import_export.products": "Import/export produits",
  "admin.import_export.clients": "Import/export clients",
  "performance.team_prices.view": "Voir les prix équipe",
  "performance.team_prices.edit": "Modifier les prix équipe",
  "performance.team_benefice.view": "Voir le bénéfice équipe",
  "performance.commission.view": "Voir ses commissions",
  "performance.team_leader.manage": "Gérer l'équipe (chef)",
};

// ── RISK LEVELS ─────────────────────────────────────────────────────────────
export type RiskLevel = "safe" | "moderate" | "sensitive" | "critical";

export const RISK_COLORS: Record<RiskLevel, string> = {
  safe: "#22c55e",
  moderate: "#eab308",
  sensitive: "#f97316",
  critical: "#ef4444",
};

export const RISK_LABELS: Record<RiskLevel, string> = {
  safe: "Lecture",
  moderate: "Modification",
  sensitive: "Sensible",
  critical: "Critique",
};

export const PERMISSION_RISK: Record<PermissionKey, RiskLevel> = {
  // Dashboards — safe
  "dashboard.company.view": "safe",
  "dashboard.personal.view": "safe",
  // Produits
  "ventes.products.view": "safe",
  "ventes.products.create": "moderate",
  "ventes.products.edit": "moderate",
  "ventes.products.delete": "sensitive",
  "ventes.products.manage_pricing": "sensitive",
  // Commandes
  "ventes.orders.view_own": "safe",
  "ventes.orders.view_all": "moderate",
  "ventes.orders.create": "moderate",
  "ventes.orders.edit": "moderate",
  "ventes.orders.delete": "sensitive",
  "ventes.orders.validate": "sensitive",
  // Outils
  "ventes.pricelist.view": "safe",
  "ventes.pricelist.create": "moderate",
  "ventes.pricelist.edit": "moderate",
  "ventes.pricelist.send": "moderate",
  "ventes.margin_calculator.view": "safe",
  // Échantillons
  "ventes.samples.view_own": "safe",
  "ventes.samples.view_all": "moderate",
  "ventes.samples.create": "moderate",
  "ventes.samples.edit": "moderate",
  "ventes.samples.manage": "sensitive",
  // Pipeline
  "performance.pipeline_team.view": "safe",
  "performance.pipeline_team.add_lead": "moderate",
  "performance.pipeline_team.edit_lead": "moderate",
  "performance.pipeline_team.delete_lead": "sensitive",
  "performance.pipeline_team.manage": "sensitive",
  // Workspace
  "performance.workstation.view": "safe",
  "performance.calendar.view": "safe",
  "performance.calendar.manage": "moderate",
  // Équipe/Clients
  "performance.my_team.view": "safe",
  "performance.my_team.manage": "sensitive",
  "performance.my_clients.view": "safe",
  "performance.my_clients.manage": "sensitive",
  // Store OPS
  "storeops.pickup_tickets.view": "safe",
  "storeops.pickup_tickets.create": "moderate",
  "storeops.pickup_tickets.edit": "moderate",
  "storeops.pickup_tickets.delete": "sensitive",
  "storeops.pickup_tickets.validate": "sensitive",
  "storeops.inventory.view": "safe",
  "storeops.inventory.create": "moderate",
  "storeops.inventory.adjust": "sensitive",
  "storeops.inventory.delete": "sensitive",
  "storeops.to_invoice.view": "safe",
  "storeops.to_invoice.manage": "sensitive",
  "storeops.to_invoice.export": "moderate",
  "storeops.expenses.view": "safe",
  "storeops.expenses.create": "moderate",
  "storeops.benefice.view": "safe",
  "storeops.benefice.export": "moderate",
  "storeops.prices.view": "safe",
  "storeops.prices.edit": "sensitive",
  // Disputes
  "disputes.view_own": "safe",
  "disputes.view_all": "moderate",
  "disputes.create": "moderate",
  "disputes.edit": "moderate",
  "disputes.resolve": "sensitive",
  "disputes.delete": "sensitive",
  "disputes.manage": "sensitive",
  "disputes.export": "moderate",
  // Rapports
  "reports.sales_analytics.view": "safe",
  "reports.financial.view": "sensitive",
  "reports.team_performance.view": "safe",
  "reports.commissions.view": "safe",
  "reports.export": "moderate",
  // Messagerie
  "messaging.view": "safe",
  "messaging.send": "moderate",
  "messaging.create_channel": "moderate",
  "messaging.manage_channels": "sensitive",
  // Admin
  "admin.users.view": "moderate",
  "admin.users.create": "sensitive",
  "admin.users.edit": "sensitive",
  "admin.users.suspend": "critical",
  "admin.users.delete": "critical",
  "admin.teams.view": "moderate",
  "admin.teams.create": "sensitive",
  "admin.teams.manage": "sensitive",
  "admin.stores.view": "moderate",
  "admin.stores.create": "sensitive",
  "admin.stores.edit": "sensitive",
  "admin.stores.deactivate": "critical",
  "admin.settings.view": "moderate",
  "admin.settings.edit": "critical",
  "admin.activity_logs.view": "moderate",
  "admin.logbook.view": "moderate",
  "admin.account_requests.view": "moderate",
  "admin.account_requests.approve": "critical",
  "admin.account_requests.reject": "sensitive",
  "admin.import_export.products": "sensitive",
  "admin.import_export.clients": "sensitive",
  // Team Leader
  "performance.team_prices.view": "safe",
  "performance.team_prices.edit": "sensitive",
  "performance.team_benefice.view": "safe",
  "performance.commission.view": "safe",
  "performance.team_leader.manage": "sensitive",
};

export const PERMISSION_DESCRIPTIONS: Record<PermissionKey, string> = {
  "dashboard.company.view": "Accède au tableau de bord global avec les KPI de l'entreprise",
  "dashboard.personal.view": "Accède à son tableau de bord personnel avec ses stats",
  "ventes.products.view": "Consulte le catalogue de produits et leurs détails",
  "ventes.products.create": "Ajoute de nouveaux produits au catalogue",
  "ventes.products.edit": "Modifie les informations des produits existants",
  "ventes.products.delete": "Supprime des produits du catalogue — irréversible",
  "ventes.products.manage_pricing": "Modifie les prix des produits — impact sur les marges",
  "ventes.orders.view_own": "Voit uniquement ses propres commandes",
  "ventes.orders.view_all": "Voit les commandes de tous les vendeurs",
  "ventes.orders.create": "Crée de nouvelles commandes client",
  "ventes.orders.edit": "Modifie des commandes existantes (quantités, statut)",
  "ventes.orders.delete": "Supprime des commandes — irréversible",
  "ventes.orders.validate": "Approuve/valide des commandes pour traitement",
  "ventes.pricelist.view": "Consulte les listes de prix générées",
  "ventes.pricelist.create": "Génère de nouvelles listes de prix",
  "ventes.pricelist.edit": "Modifie les listes de prix existantes",
  "ventes.pricelist.send": "Envoie des listes de prix aux clients par email",
  "ventes.margin_calculator.view": "Utilise le calculateur de marge pour estimer les profits",
  "ventes.samples.view_own": "Voit ses propres demandes d'échantillons",
  "ventes.samples.view_all": "Voit toutes les demandes d'échantillons",
  "ventes.samples.create": "Soumet de nouvelles demandes d'échantillons",
  "ventes.samples.edit": "Modifie ses demandes d'échantillons",
  "ventes.samples.manage": "Approuve/rejette les demandes d'échantillons de tous",
  "performance.pipeline_team.view": "Voit le pipeline CRM et les leads de l'équipe",
  "performance.pipeline_team.add_lead": "Ajoute de nouveaux leads/prospects au CRM",
  "performance.pipeline_team.edit_lead": "Modifie les informations des leads existants",
  "performance.pipeline_team.delete_lead": "Supprime des leads du CRM — irréversible",
  "performance.pipeline_team.manage": "Gestion complète du pipeline : réassigner, archiver",
  "performance.workstation.view": "Accède à son espace de travail personnel",
  "performance.calendar.view": "Consulte le calendrier d'équipe",
  "performance.calendar.manage": "Crée/modifie des événements dans le calendrier",
  "performance.my_team.view": "Voit les membres et stats de son équipe",
  "performance.my_team.manage": "Modifie la composition et les rôles de l'équipe",
  "performance.my_clients.view": "Consulte sa liste de clients assignés",
  "performance.my_clients.manage": "Réassigne des clients entre vendeurs",
  "storeops.pickup_tickets.view": "Consulte les tickets de cueillette en magasin",
  "storeops.pickup_tickets.create": "Crée de nouveaux tickets de cueillette",
  "storeops.pickup_tickets.edit": "Modifie les tickets de cueillette existants",
  "storeops.pickup_tickets.delete": "Supprime des tickets de cueillette",
  "storeops.pickup_tickets.validate": "Valide/complète les tickets de cueillette",
  "storeops.inventory.view": "Consulte l'inventaire du magasin",
  "storeops.inventory.create": "Ajoute de nouvelles entrées d'inventaire",
  "storeops.inventory.adjust": "Ajuste les quantités d'inventaire — impact comptable",
  "storeops.inventory.delete": "Supprime des entrées d'inventaire — irréversible",
  "storeops.to_invoice.view": "Voit les commandes en attente de facturation",
  "storeops.to_invoice.manage": "Gère le processus de facturation",
  "storeops.to_invoice.export": "Exporte les données de facturation",
  "storeops.expenses.view": "Consulte les dépenses du magasin",
  "storeops.expenses.create": "Enregistre de nouvelles dépenses",
  "storeops.benefice.view": "Consulte le bénéfice net du magasin",
  "storeops.benefice.export": "Exporte les données de bénéfice",
  "storeops.prices.view": "Consulte les prix en magasin",
  "storeops.prices.edit": "Modifie les prix affichés en magasin",
  "disputes.view_own": "Voit ses propres disputes et litiges",
  "disputes.view_all": "Voit toutes les disputes de la plateforme",
  "disputes.create": "Ouvre une nouvelle dispute/litige",
  "disputes.edit": "Modifie les détails d'une dispute",
  "disputes.resolve": "Marque une dispute comme résolue/fermée",
  "disputes.delete": "Supprime une dispute — irréversible",
  "disputes.manage": "Gestion complète : réassigner, escalader, archiver",
  "disputes.export": "Exporte les données de disputes",
  "reports.sales_analytics.view": "Consulte les rapports d'analyse des ventes",
  "reports.financial.view": "Accède aux rapports financiers — données sensibles",
  "reports.team_performance.view": "Consulte les rapports de performance d'équipe",
  "reports.commissions.view": "Voit les rapports de commissions",
  "reports.export": "Exporte les rapports en fichier",
  "messaging.view": "Accède à la messagerie interne",
  "messaging.send": "Envoie des messages aux autres utilisateurs",
  "messaging.create_channel": "Crée de nouveaux canaux de discussion",
  "messaging.manage_channels": "Supprime/modifie les canaux — affecte tous les utilisateurs",
  "admin.users.view": "Voit la liste de tous les utilisateurs et leurs profils",
  "admin.users.create": "Crée de nouveaux comptes utilisateur sur la plateforme",
  "admin.users.edit": "Modifie le profil, rôle et permissions des utilisateurs",
  "admin.users.suspend": "Suspend l'accès d'un utilisateur — bloque sa connexion",
  "admin.users.delete": "Supprime définitivement un compte utilisateur",
  "admin.teams.view": "Voit la structure des équipes",
  "admin.teams.create": "Crée de nouvelles équipes",
  "admin.teams.manage": "Modifie/supprime des équipes et leur composition",
  "admin.stores.view": "Voit la liste des magasins",
  "admin.stores.create": "Enregistre de nouveaux magasins",
  "admin.stores.edit": "Modifie les informations des magasins",
  "admin.stores.deactivate": "Désactive un magasin — coupe l'accès aux employés",
  "admin.settings.view": "Consulte les paramètres système",
  "admin.settings.edit": "Modifie les paramètres système — affecte toute la plateforme",
  "admin.activity_logs.view": "Consulte les journaux d'activité (ancien format)",
  "admin.logbook.view": "Consulte le logbook d'activité de la compagnie",
  "admin.account_requests.view": "Voit les demandes de création de compte",
  "admin.account_requests.approve": "Approuve des demandes — crée de nouveaux accès",
  "admin.account_requests.reject": "Rejette des demandes de compte",
  "admin.import_export.products": "Importe/exporte les données produits en masse",
  "admin.import_export.clients": "Importe/exporte les données clients en masse",
  "performance.team_prices.view": "Consulte les prix de l'équipe",
  "performance.team_prices.edit": "Modifie les prix assignés à l'équipe",
  "performance.team_benefice.view": "Consulte le bénéfice de l'équipe",
  "performance.commission.view": "Consulte ses propres commissions",
  "performance.team_leader.manage": "Gère les membres et objectifs de l'équipe",
};

export const PERMISSION_GROUP_DESCRIPTIONS: Record<string, string> = {
  "Dashboard": "Tableaux de bord et indicateurs de performance",
  "Ventes — Produits": "Catalogue de produits, prix et fiches techniques",
  "Ventes — Commandes": "Création, suivi et validation des commandes",
  "Ventes — Outils": "Listes de prix, calculateur de marge",
  "Ventes — Échantillons": "Demandes et gestion des échantillons produit",
  "Performance — Pipeline": "CRM, leads et suivi des opportunités de vente",
  "Performance — Espace de travail": "Espace personnel, calendrier d'équipe",
  "Performance — Mon équipe & Clients": "Gestion des équipes et des clients assignés",
  "Performance — Team Leader": "Outils spécifiques aux chefs d'équipe",
  "Store OPS — Pickup Tickets": "Tickets de cueillette et préparation de commandes",
  "Store OPS — Inventaire": "Gestion des stocks et ajustements d'inventaire",
  "Store OPS — À facturer": "Commandes en attente de facturation",
  "Store OPS — Dépenses": "Suivi des dépenses du magasin",
  "Store OPS — Bénéfice": "Rapport de bénéfice net du magasin",
  "Store OPS — Prix": "Prix affichés en magasin",
  "Disputes": "Litiges, réclamations et résolution de conflits",
  "Rapports": "Rapports d'analyse, financiers et de performance",
  "Messagerie": "Communication interne entre utilisateurs",
  "Admin — Utilisateurs": "Gestion des comptes, suspension et suppression",
  "Admin — Équipes": "Structure organisationnelle des équipes",
  "Admin — Magasins": "Configuration et gestion des points de vente",
  "Admin — Paramètres & Logs": "Configuration système et journaux d'activité",
  "Admin — Demandes de compte": "Validation des nouvelles demandes d'accès",
  "Admin — Import/Export": "Import et export de données en masse",
  "Vue Fabricant (SCI)": "Accès complet au module fabricant — dashboard, inventaire, commandes, échantillons, rapports",
};

// ── HELPER FUNCTIONS ────────────────────────────────────────────────────────

/**
 * Vérifie si une permission enfant doit être VISIBLE dans le panneau admin
 * basé sur les permissions actuellement cochées.
 */
export function isPermissionVisible(
  permKey: PermissionKey,
  currentlyChecked: PermissionKey[]
): boolean {
  const deps = PERMISSION_DEPENDENCIES[permKey];
  if (!deps || deps.length === 0) return true;
  return deps.some(parentKey => currentlyChecked.includes(parentKey));
}

/**
 * Quand on décoche un parent, retourne la liste nettoyée
 * (retire automatiquement tous les enfants orphelins).
 */
export function cleanOrphanPermissions(
  currentlyChecked: PermissionKey[]
): PermissionKey[] {
  return currentlyChecked.filter(perm => isPermissionVisible(perm, currentlyChecked));
}

/**
 * Quand on coche un enfant, retourne la liste avec les parents
 * automatiquement ajoutés (prend le premier parent de la liste de dépendances).
 */
export function autoAddParentPermissions(
  permKey: PermissionKey,
  currentlyChecked: PermissionKey[]
): PermissionKey[] {
  const deps = PERMISSION_DEPENDENCIES[permKey];
  if (!deps || deps.length === 0) return currentlyChecked;
  const hasParent = deps.some(p => currentlyChecked.includes(p));
  if (!hasParent) {
    return [...currentlyChecked, deps[0]];
  }
  return currentlyChecked;
}

// ── PRESETS PAR RÔLE ──────────────────────────────────────────────────────
export const PRESET_TEAM_LEADER: PermissionKey[] = [
  "dashboard.company.view",
  "dashboard.personal.view",
  "ventes.products.view",
  "ventes.orders.view_all",
  "ventes.pricelist.view",
  "ventes.margin_calculator.view",
  "ventes.samples.view_all",
  "performance.pipeline_team.view",
  "performance.pipeline_team.add_lead",
  "performance.pipeline_team.edit_lead",
  "performance.pipeline_team.manage",
  "performance.workstation.view",
  "performance.calendar.view",
  "performance.calendar.manage",
  "performance.my_team.view",
  "performance.my_team.manage",
  "performance.my_clients.view",
  "performance.my_clients.manage",
  "performance.team_prices.view",
  "performance.team_prices.edit",
  "performance.team_benefice.view",
  "performance.commission.view",
  "performance.team_leader.manage",
  "disputes.view_all",
  "messaging.view",
  "messaging.send",
  "reports.sales_analytics.view",
  "reports.team_performance.view",
  "reports.commissions.view",
];

export const PRESET_VENDEUR: PermissionKey[] = [
  "dashboard.personal.view",
  "ventes.products.view",
  "ventes.orders.view_own",
  "ventes.orders.create",
  "ventes.orders.edit",
  "ventes.pricelist.view",
  "ventes.pricelist.create",
  "ventes.pricelist.edit",
  "ventes.pricelist.send",
  "ventes.margin_calculator.view",
  "ventes.samples.view_own",
  "ventes.samples.create",
  "performance.pipeline_team.view",
  "performance.pipeline_team.add_lead",
  "performance.pipeline_team.edit_lead",
  "performance.workstation.view",
  "performance.calendar.view",
  "performance.calendar.manage",
  "performance.my_team.view",
  "performance.my_clients.view",
  "performance.my_clients.manage",
  "disputes.view_own",
  "disputes.create",
  "disputes.edit",
  "messaging.view",
  "messaging.send",
  "reports.sales_analytics.view",
  "reports.commissions.view",
  "performance.team_prices.view",
  "performance.team_benefice.view",
  "performance.commission.view",
];

export const PRESET_MANUF: PermissionKey[] = [
  "dashboard.company.view",
  "ventes.products.view",
  "ventes.products.edit",
  "ventes.products.manage_pricing",
  "ventes.orders.view_all",
  "ventes.orders.validate",
  "ventes.samples.view_all",
  "storeops.inventory.view",
  "storeops.inventory.create",
  "storeops.inventory.adjust",
  "storeops.pickup_tickets.view",
  "storeops.to_invoice.view",
  "disputes.view_all",
  "disputes.manage",
  "reports.sales_analytics.view",
  "reports.financial.view",
  "messaging.view",
  "messaging.send",
];

export const PRESET_MAGASIN: PermissionKey[] = [
  "dashboard.personal.view",
  "ventes.products.view",
  "storeops.pickup_tickets.view",
  "storeops.pickup_tickets.create",
  "storeops.pickup_tickets.edit",
  "storeops.pickup_tickets.validate",
  "storeops.inventory.view",
  "storeops.inventory.create",
  "storeops.inventory.adjust",
  "storeops.to_invoice.view",
  "storeops.to_invoice.manage",
  "storeops.to_invoice.export",
  "storeops.expenses.view",
  "storeops.expenses.create",
  "storeops.benefice.view",
  "storeops.prices.view",
  "disputes.view_own",
  "disputes.create",
  "messaging.view",
  "messaging.send",
];

export const PRESET_ADMIN: PermissionKey[] = [
  "dashboard.company.view",
  "dashboard.personal.view",
  "ventes.products.view",
  "ventes.products.create",
  "ventes.products.edit",
  "ventes.products.manage_pricing",
  "ventes.orders.view_all",
  "ventes.orders.create",
  "ventes.orders.edit",
  "ventes.orders.validate",
  "ventes.pricelist.view",
  "ventes.pricelist.create",
  "ventes.pricelist.edit",
  "ventes.pricelist.send",
  "ventes.margin_calculator.view",
  "ventes.samples.view_all",
  "ventes.samples.manage",
  "performance.pipeline_team.view",
  "performance.pipeline_team.add_lead",
  "performance.pipeline_team.edit_lead",
  "performance.pipeline_team.delete_lead",
  "performance.pipeline_team.manage",
  "performance.workstation.view",
  "performance.calendar.view",
  "performance.calendar.manage",
  "performance.my_team.view",
  "performance.my_team.manage",
  "performance.my_clients.view",
  "performance.my_clients.manage",
  "storeops.pickup_tickets.view",
  "storeops.pickup_tickets.create",
  "storeops.pickup_tickets.edit",
  "storeops.pickup_tickets.validate",
  "storeops.inventory.view",
  "storeops.inventory.create",
  "storeops.inventory.adjust",
  "storeops.to_invoice.view",
  "storeops.to_invoice.manage",
  "storeops.to_invoice.export",
  "storeops.expenses.view",
  "storeops.expenses.create",
  "storeops.benefice.view",
  "storeops.benefice.export",
  "storeops.prices.view",
  "storeops.prices.edit",
  "admin.stores.view",
  "admin.stores.create",
  "admin.stores.edit",
  "admin.stores.deactivate",
  "disputes.view_all",
  "disputes.create",
  "disputes.edit",
  "disputes.resolve",
  "disputes.manage",
  "disputes.export",
  "reports.sales_analytics.view",
  "reports.financial.view",
  "reports.team_performance.view",
  "reports.commissions.view",
  "reports.export",
  "messaging.view",
  "messaging.send",
  "messaging.create_channel",
  "messaging.manage_channels",
  "admin.users.view",
  "admin.users.create",
  "admin.users.edit",
  "admin.users.suspend",
  "admin.teams.view",
  "admin.teams.create",
  "admin.teams.manage",
  "admin.settings.view",
  "admin.activity_logs.view",
  "admin.logbook.view",
  "admin.account_requests.view",
  "admin.account_requests.approve",
  "admin.account_requests.reject",
  "admin.import_export.products",
  "admin.import_export.clients",
];

export function can(permissions: string[], key: string): boolean {
  return permissions.includes(key);
}

export function canAny(permissions: string[], keys: string[]): boolean {
  return keys.some((k) => permissions.includes(k));
}
