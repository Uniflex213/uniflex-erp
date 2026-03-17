import { SupabaseClient } from "@supabase/supabase-js";

// ── CATÉGORIES & COULEURS ──────────────────────────────────────────────────
// Chaque module a une couleur fixe pour le Logbook admin
export const LOG_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  order:     { bg: "#dbeafe", color: "#1d4ed8", label: "Commande" },
  crm:       { bg: "#dcfce7", color: "#15803d", label: "CRM / Lead" },
  client:    { bg: "#f0fdf4", color: "#166534", label: "Client" },
  sample:    { bg: "#fef3c7", color: "#b45309", label: "Échantillon" },
  ticket:    { bg: "#ede9fe", color: "#7c3aed", label: "Pickup Ticket" },
  invoice:   { bg: "#fee2e2", color: "#dc2626", label: "Facturation" },
  inventory: { bg: "#f1f5f9", color: "#475569", label: "Inventaire" },
  dispute:   { bg: "#fce7f3", color: "#be185d", label: "Dispute" },
  pricelist: { bg: "#ecfeff", color: "#0e7490", label: "Pricelist" },
  product:   { bg: "#f5f3ff", color: "#6d28d9", label: "Produit" },
  email:     { bg: "#fff7ed", color: "#c2410c", label: "Email" },
  admin:     { bg: "#f8fafc", color: "#1c1c1e", label: "Admin" },
  settings:  { bg: "#f1f5f9", color: "#64748b", label: "Paramètres" },
  expense:   { bg: "#fef9c3", color: "#a16207", label: "Dépense" },
  contest:   { bg: "#fdf4ff", color: "#9333ea", label: "Concours" },
  report:    { bg: "#f0f9ff", color: "#0369a1", label: "Rapport" },
};

export type LogModule = keyof typeof LOG_COLORS;

export interface ActivityLogEntry {
  user_id: string;
  action: string;
  module: LogModule;
  entity_type?: string;
  entity_id?: string;
  entity_name?: string;
  details?: Record<string, unknown>;
}

export async function logActivity(
  client: SupabaseClient,
  userId: string,
  action: string,
  module: LogModule | string,
  details?: Record<string, unknown>
): Promise<void> {
  try {
    await client.from("activity_logs").insert({
      user_id: userId,
      action,
      module,
      entity_type: details?.entity_type as string | undefined,
      entity_id: details?.entity_id as string | undefined,
      entity_name: details?.entity_name as string | undefined,
      details: details ?? {},
    });
  } catch {
    // silent
  }
}

// ── HELPERS MÉTIER ────────────────────────────────────────────────────────
// Utilise ces helpers dans chaque module pour logger les actions importantes

export const log = {
  // COMMANDES
  orderCreated:   (c: SupabaseClient, uid: string, orderId: string, clientName: string) =>
    logActivity(c, uid, "order_created",   "order",   { entity_type:"order", entity_id: orderId, entity_name: clientName }),
  orderUpdated:   (c: SupabaseClient, uid: string, orderId: string, clientName: string) =>
    logActivity(c, uid, "order_updated",   "order",   { entity_type:"order", entity_id: orderId, entity_name: clientName }),
  orderDeleted:   (c: SupabaseClient, uid: string, orderId: string, clientName: string) =>
    logActivity(c, uid, "order_deleted",   "order",   { entity_type:"order", entity_id: orderId, entity_name: clientName }),
  orderValidated: (c: SupabaseClient, uid: string, orderId: string, clientName: string) =>
    logActivity(c, uid, "order_validated", "order",   { entity_type:"order", entity_id: orderId, entity_name: clientName }),

  // CRM / LEADS
  leadCreated:    (c: SupabaseClient, uid: string, leadId: string, company: string) =>
    logActivity(c, uid, "lead_created",    "crm",     { entity_type:"lead", entity_id: leadId, entity_name: company }),
  leadUpdated:    (c: SupabaseClient, uid: string, leadId: string, company: string) =>
    logActivity(c, uid, "lead_updated",    "crm",     { entity_type:"lead", entity_id: leadId, entity_name: company }),
  leadDeleted:    (c: SupabaseClient, uid: string, leadId: string, company: string) =>
    logActivity(c, uid, "lead_deleted",    "crm",     { entity_type:"lead", entity_id: leadId, entity_name: company }),
  leadStageChanged: (c: SupabaseClient, uid: string, leadId: string, company: string, from: string, to: string) =>
    logActivity(c, uid, "lead_stage_changed", "crm", { entity_type:"lead", entity_id: leadId, entity_name: company, from, to }),

  // CLIENTS
  clientCreated:  (c: SupabaseClient, uid: string, clientId: string, name: string) =>
    logActivity(c, uid, "client_created",  "client",  { entity_type:"client", entity_id: clientId, entity_name: name }),
  clientUpdated:  (c: SupabaseClient, uid: string, clientId: string, name: string) =>
    logActivity(c, uid, "client_updated",  "client",  { entity_type:"client", entity_id: clientId, entity_name: name }),

  // ÉCHANTILLONS
  sampleCreated:  (c: SupabaseClient, uid: string, sampleId: string, company: string) =>
    logActivity(c, uid, "sample_created",  "sample",  { entity_type:"sample", entity_id: sampleId, entity_name: company }),
  sampleApproved: (c: SupabaseClient, uid: string, sampleId: string, company: string) =>
    logActivity(c, uid, "sample_approved", "sample",  { entity_type:"sample", entity_id: sampleId, entity_name: company }),
  sampleDelivered:(c: SupabaseClient, uid: string, sampleId: string, company: string) =>
    logActivity(c, uid, "sample_delivered","sample",  { entity_type:"sample", entity_id: sampleId, entity_name: company }),

  // PICKUP TICKETS
  ticketCreated:  (c: SupabaseClient, uid: string, ticketId: string, clientName: string) =>
    logActivity(c, uid, "ticket_created",  "ticket",  { entity_type:"ticket", entity_id: ticketId, entity_name: clientName }),
  ticketUpdated:  (c: SupabaseClient, uid: string, ticketId: string, clientName: string) =>
    logActivity(c, uid, "ticket_updated",  "ticket",  { entity_type:"ticket", entity_id: ticketId, entity_name: clientName }),
  ticketValidated:(c: SupabaseClient, uid: string, ticketId: string, clientName: string) =>
    logActivity(c, uid, "ticket_validated","ticket",  { entity_type:"ticket", entity_id: ticketId, entity_name: clientName }),

  // FACTURATION
  invoiceSent:    (c: SupabaseClient, uid: string, docId: string, clientName: string) =>
    logActivity(c, uid, "invoice_sent",    "invoice", { entity_type:"invoice", entity_id: docId, entity_name: clientName }),
  invoicePaid:    (c: SupabaseClient, uid: string, docId: string, clientName: string, amount: number) =>
    logActivity(c, uid, "invoice_paid",    "invoice", { entity_type:"invoice", entity_id: docId, entity_name: clientName, amount }),
  invoiceDisputed:(c: SupabaseClient, uid: string, docId: string, clientName: string) =>
    logActivity(c, uid, "invoice_disputed","invoice", { entity_type:"invoice", entity_id: docId, entity_name: clientName }),

  // INVENTAIRE
  stockAdjusted:  (c: SupabaseClient, uid: string, productId: string, productName: string, qty: number) =>
    logActivity(c, uid, "stock_adjusted",  "inventory",{ entity_type:"product", entity_id: productId, entity_name: productName, qty }),
  stockReceived:  (c: SupabaseClient, uid: string, productId: string, productName: string, qty: number) =>
    logActivity(c, uid, "stock_received",  "inventory",{ entity_type:"product", entity_id: productId, entity_name: productName, qty }),

  // DISPUTES
  disputeOpened:  (c: SupabaseClient, uid: string, disputeId: string, clientName: string, subject: string) =>
    logActivity(c, uid, "dispute_opened",  "dispute", { entity_type:"dispute", entity_id: disputeId, entity_name: clientName, subject }),
  disputeUpdated: (c: SupabaseClient, uid: string, disputeId: string, clientName: string) =>
    logActivity(c, uid, "dispute_updated", "dispute", { entity_type:"dispute", entity_id: disputeId, entity_name: clientName }),
  disputeResolved:(c: SupabaseClient, uid: string, disputeId: string, clientName: string) =>
    logActivity(c, uid, "dispute_resolved","dispute", { entity_type:"dispute", entity_id: disputeId, entity_name: clientName }),
  disputeClosed:  (c: SupabaseClient, uid: string, disputeId: string, clientName: string) =>
    logActivity(c, uid, "dispute_closed",  "dispute", { entity_type:"dispute", entity_id: disputeId, entity_name: clientName }),

  // PRICELIST
  pricelistCreated:(c: SupabaseClient, uid: string, id: string, clientName: string) =>
    logActivity(c, uid, "pricelist_created","pricelist",{ entity_type:"pricelist", entity_id: id, entity_name: clientName }),
  pricelistSent:  (c: SupabaseClient, uid: string, id: string, clientName: string) =>
    logActivity(c, uid, "pricelist_sent",  "pricelist",{ entity_type:"pricelist", entity_id: id, entity_name: clientName }),

  // PRODUITS
  productCreated: (c: SupabaseClient, uid: string, id: string, name: string) =>
    logActivity(c, uid, "product_created", "product", { entity_type:"product", entity_id: id, entity_name: name }),
  productUpdated: (c: SupabaseClient, uid: string, id: string, name: string) =>
    logActivity(c, uid, "product_updated", "product", { entity_type:"product", entity_id: id, entity_name: name }),
  productDeleted: (c: SupabaseClient, uid: string, id: string, name: string) =>
    logActivity(c, uid, "product_deleted", "product", { entity_type:"product", entity_id: id, entity_name: name }),

  // EMAIL
  emailSent:      (c: SupabaseClient, uid: string, to: string, subject: string, template: string) =>
    logActivity(c, uid, "email_sent",      "email",   { to, subject, template }),

  // DÉPENSES
  expenseCreated: (c: SupabaseClient, uid: string, id: string, label: string, amount: number) =>
    logActivity(c, uid, "expense_created", "expense", { entity_type:"expense", entity_id: id, entity_name: label, amount }),

  // ADMIN
  userCreated:    (c: SupabaseClient, uid: string, targetId: string, name: string) =>
    logActivity(c, uid, "user_created",    "admin",   { entity_type:"user", entity_id: targetId, entity_name: name }),
  userUpdated:    (c: SupabaseClient, uid: string, targetId: string, name: string) =>
    logActivity(c, uid, "user_updated",    "admin",   { entity_type:"user", entity_id: targetId, entity_name: name }),
  userSuspended:  (c: SupabaseClient, uid: string, targetId: string, name: string) =>
    logActivity(c, uid, "user_suspended",  "admin",   { entity_type:"user", entity_id: targetId, entity_name: name }),
  userDeleted:    (c: SupabaseClient, uid: string, targetId: string, name: string) =>
    logActivity(c, uid, "user_deleted",    "admin",   { entity_type:"user", entity_id: targetId, entity_name: name }),
  permissionsUpdated: (c: SupabaseClient, uid: string, targetId: string, name: string) =>
    logActivity(c, uid, "user_permissions_updated", "admin", { entity_type:"user", entity_id: targetId, entity_name: name }),
};

// Labels lisibles pour l'affichage dans le Logbook
export const ACTION_LABELS: Record<string, string> = {
  order_created:            "Commande créée",
  order_updated:            "Commande modifiée",
  order_deleted:            "Commande supprimée",
  order_validated:          "Commande validée",
  lead_created:             "Lead créé",
  lead_updated:             "Lead modifié",
  lead_deleted:             "Lead supprimé",
  lead_stage_changed:       "Étape CRM changée",
  client_created:           "Client créé",
  client_updated:           "Client modifié",
  sample_created:           "Échantillon demandé",
  sample_approved:          "Échantillon approuvé",
  sample_delivered:         "Échantillon livré",
  ticket_created:           "Ticket créé",
  ticket_updated:           "Ticket modifié",
  ticket_validated:         "Ticket validé",
  invoice_sent:             "Facture envoyée",
  invoice_paid:             "Facture payée",
  invoice_disputed:         "Facture en litige",
  stock_adjusted:           "Stock ajusté",
  stock_received:           "Stock reçu",
  dispute_opened:           "Dispute ouverte",
  dispute_updated:          "Dispute mise à jour",
  dispute_resolved:         "Dispute résolue",
  dispute_closed:           "Dispute fermée",
  pricelist_created:        "Pricelist créée",
  pricelist_sent:           "Pricelist envoyée",
  product_created:          "Produit créé",
  product_updated:          "Produit modifié",
  product_deleted:          "Produit supprimé",
  email_sent:               "Email envoyé",
  expense_created:          "Dépense enregistrée",
  user_created:             "Utilisateur créé",
  user_updated:             "Utilisateur modifié",
  user_suspended:           "Utilisateur suspendu",
  user_deleted:             "Utilisateur supprimé",
  user_permissions_updated: "Permissions modifiées",
  profile_updated:          "Profil mis à jour",
  password_changed:         "Mot de passe changé",
};
