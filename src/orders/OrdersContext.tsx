import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { Order, OrderBillingStatus } from "./orderTypes";
import { supabase } from "../supabaseClient";
import { useAuth } from "../contexts/AuthContext";
import { sendNotification } from "../lib/notifications";

async function getNextOrderNumber(): Promise<number> {
  const period = new Date().toLocaleDateString("en-US", { month: "2-digit", year: "2-digit" }).replace("/", "");
  // MMYY format
  const mm = String(new Date().getMonth() + 1).padStart(2, "0");
  const yy = String(new Date().getFullYear()).slice(-2);
  const { data, error } = await supabase.rpc("get_next_order_number", { p_period: mm + yy });
  if (error || data == null) {
    console.error("Failed to get order counter from DB:", error);
    return Date.now() % 100000; // fallback
  }
  return data as number;
}

function mapRow(row: Record<string, unknown>): Order {
  return {
    id: row.id as string,
    date: (row.date as string)?.split("T")[0] ?? "",
    client: row.client as string,
    clientId: row.client_id as string,
    motif: row.motif as Order["motif"],
    motifAutre: row.motif_autre as string | undefined,
    vendeurCode: row.vendeur_code as string,
    destination: row.destination as Order["destination"],
    destinationAutre: row.destination_autre as string | undefined,
    deliveryAddress: row.delivery_address as string,
    deliveryType: row.delivery_type as Order["deliveryType"],
    shippingCost: row.shipping_cost as number | undefined,
    label: row.label as Order["label"],
    products: (row.products as Order["products"]) ?? [],
    subtotal: Number(row.subtotal) || 0,
    discountType: row.discount_type as Order["discountType"],
    discountValue: row.discount_value != null ? Number(row.discount_value) : undefined,
    discount: row.discount != null ? Number(row.discount) : undefined,
    subtotalAfterDiscount: row.subtotal_after_discount != null ? Number(row.subtotal_after_discount) : undefined,
    province: row.province as string | undefined,
    taxLines: (row.tax_lines as Order["taxLines"]) ?? undefined,
    taxTotal: row.tax_total != null ? Number(row.tax_total) : undefined,
    extraFees: row.extra_fees != null ? Number(row.extra_fees) : undefined,
    total: Number(row.total) || 0,
    status: row.status as Order["status"],
    adminNote: row.admin_note as string | undefined,
    revisionComment: row.revision_comment as string | undefined,
    revisionResponse: row.revision_response as string | undefined,
    revisionResponseAt: row.revision_response_at as string | undefined,
    rejectionReason: row.rejection_reason as string | undefined,
    shipping: row.shipping as Order["shipping"],
    createdBy: row.created_by as string,
    billing_status: (row.billing_status as OrderBillingStatus) ?? "unbilled",
    team_id: (row.team_id as string | null) ?? null,
  };
}

function partialOrderToRow(updates: Partial<Order>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if ("client" in updates) out.client = updates.client;
  if ("clientId" in updates) out.client_id = updates.clientId;
  if ("motif" in updates) out.motif = updates.motif;
  if ("motifAutre" in updates) out.motif_autre = updates.motifAutre;
  if ("vendeurCode" in updates) out.vendeur_code = updates.vendeurCode;
  if ("destination" in updates) out.destination = updates.destination;
  if ("destinationAutre" in updates) out.destination_autre = updates.destinationAutre;
  if ("deliveryAddress" in updates) out.delivery_address = updates.deliveryAddress;
  if ("deliveryType" in updates) out.delivery_type = updates.deliveryType;
  if ("shippingCost" in updates) out.shipping_cost = updates.shippingCost;
  if ("label" in updates) out.label = updates.label;
  if ("products" in updates) out.products = updates.products;
  if ("subtotal" in updates) out.subtotal = updates.subtotal;
  if ("discountType" in updates) out.discount_type = updates.discountType;
  if ("discountValue" in updates) out.discount_value = updates.discountValue;
  if ("discount" in updates) out.discount = updates.discount;
  if ("subtotalAfterDiscount" in updates) out.subtotal_after_discount = updates.subtotalAfterDiscount;
  if ("province" in updates) out.province = updates.province;
  if ("taxLines" in updates) out.tax_lines = updates.taxLines;
  if ("taxTotal" in updates) out.tax_total = updates.taxTotal;
  if ("extraFees" in updates) out.extra_fees = updates.extraFees;
  if ("total" in updates) out.total = updates.total;
  if ("status" in updates) out.status = updates.status;
  if ("adminNote" in updates) out.admin_note = updates.adminNote;
  if ("revisionComment" in updates) out.revision_comment = updates.revisionComment;
  if ("revisionResponse" in updates) out.revision_response = updates.revisionResponse;
  if ("revisionResponseAt" in updates) out.revision_response_at = updates.revisionResponseAt;
  if ("rejectionReason" in updates) out.rejection_reason = updates.rejectionReason;
  if ("shipping" in updates) out.shipping = updates.shipping;
  if ("createdBy" in updates) out.created_by = updates.createdBy;
  if ("billing_status" in updates) out.billing_status = updates.billing_status;
  if ("team_id" in updates) out.team_id = updates.team_id;
  return out;
}

interface OrdersContextValue {
  orders: Order[];
  loading: boolean;
  addOrder: (order: Order) => Promise<void>;
  updateOrder: (id: string, updates: Partial<Order>) => Promise<void>;
  removeOrder: (id: string) => Promise<void>;
  getNextCounter: () => Promise<number>;
  reloadOrders: () => Promise<void>;
}

const OrdersContext = createContext<OrdersContextValue | null>(null);

export function OrdersProvider({ children }: { children: React.ReactNode }) {
  const { profile, realProfile } = useAuth();
  const ownerId = realProfile?.id ?? profile?.id ?? null;
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const isAdmin = profile?.role === "god_admin" || profile?.role === "admin";

  const reloadOrders = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });
    // Vendeurs only see their own orders; admin/god_admin see all
    if (!isAdmin && ownerId) {
      query = query.eq("owner_id", ownerId);
    }
    const { data, error } = await query;
    if (!error && data) setOrders(data.map(mapRow));
    setLoading(false);
  }, [isAdmin, ownerId]);

  useEffect(() => {
    reloadOrders();
    const channel = supabase
      .channel("orders-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        reloadOrders();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [reloadOrders]);

  const addOrder = async (order: Order) => {
    const row: Record<string, unknown> = {
      id: order.id,
      client: order.client,
      client_id: order.clientId,
      motif: order.motif,
      motif_autre: order.motifAutre,
      vendeur_code: order.vendeurCode,
      destination: order.destination,
      destination_autre: order.destinationAutre,
      delivery_address: order.deliveryAddress,
      delivery_type: order.deliveryType,
      shipping_cost: order.shippingCost,
      label: order.label,
      products: order.products,
      subtotal: order.subtotal,
      discount_type: order.discountType,
      discount_value: order.discountValue,
      discount: order.discount,
      subtotal_after_discount: order.subtotalAfterDiscount,
      province: order.province,
      tax_lines: order.taxLines,
      tax_total: order.taxTotal,
      extra_fees: order.extraFees,
      total: order.total,
      status: order.status,
      admin_note: order.adminNote,
      created_by: order.createdBy,
      billing_status: order.billing_status ?? "unbilled",
      owner_id: ownerId,
      team_id: order.team_id ?? null,
    };
    const { data, error } = await supabase.from("orders").insert([row]).select().maybeSingle();
    if (!error && data) {
      setOrders(prev => [mapRow(data as Record<string, unknown>), ...prev]);
      // Notify admins of new order
      const { data: admins } = await supabase.from("profiles").select("id").in("role", ["god_admin", "admin"]);
      (admins ?? []).forEach((a: { id: string }) => {
        if (a.id !== ownerId) {
          sendNotification(a.id, "order", `Nouvelle commande ${order.id}`, `${order.client} — ${order.createdBy}`, "order", order.id);
        }
      });
    }
  };

  const updateOrder = async (id: string, updates: Partial<Order>) => {
    const row = partialOrderToRow(updates);
    const { data, error } = await supabase.from("orders").update(row).eq("id", id).select().maybeSingle();
    if (!error && data) {
      setOrders(prev => prev.map(o => o.id === id ? mapRow(data as Record<string, unknown>) : o));
    } else {
      setOrders(prev => prev.map(o => o.id === id ? { ...o, ...updates } : o));
    }
  };

  const removeOrder = async (id: string) => {
    await supabase.from("orders").delete().eq("id", id);
    setOrders(prev => prev.filter(o => o.id !== id));
  };

  const getNextCounter = async (): Promise<number> => {
    return getNextOrderNumber();
  };

  return (
    <OrdersContext.Provider value={{ orders, loading, addOrder, updateOrder, removeOrder, getNextCounter, reloadOrders }}>
      {children}
    </OrdersContext.Provider>
  );
}

export function useOrders() {
  const ctx = useContext(OrdersContext);
  if (!ctx) throw new Error("useOrders must be used within OrdersProvider");
  return ctx;
}
