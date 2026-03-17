import React, { useState, useRef, useEffect } from "react";
import { Order, OrderProduct, OrderMotif, OrderDestination, OrderLabel, DeliveryType } from "./orderTypes";
import { useApp } from "../AppContext";
import { useAuth } from "../contexts/AuthContext";
import { Client } from "../clients/clientTypes";
import { supabase } from "../supabaseClient";
import { T } from "../theme";
import { fmt, detectDestination, detectProvince, computeTaxLines } from "./orderTaxUtils";
import ClientCard, { LockIcon } from "./OrderClientCard";

const BackIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
);

const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6l-1 14H6L5 6"/>
    <path d="M10 11v6M14 11v6"/>
  </svg>
);

interface Props {
  onBack: () => void;
  onSubmit: (order: Omit<Order, "id" | "date" | "createdBy">) => void;
  prefill?: { deliveryAddress?: string; clientSearch?: string } | null;
}

type ContextForm = {
  motif: OrderMotif | "";
  motifAutre: string;
  vendeurCode: string;
  clientId: string;
  destination: OrderDestination | "";
  destinationAutre: string;
  deliveryAddress: string;
  deliveryType: DeliveryType | "";
  shippingCost: string;
  label: OrderLabel | "";
};

type ProductRow = {
  id: string;
  product: string;
  qty: string;
  price: string;
  unit: "/KIT" | "/GAL";
  format: string;
};

export default function NewOrderPage({ onBack, onSubmit, prefill }: Props) {
  const { products: ctxProducts } = useApp();
  const { profile } = useAuth();

  const [step, setStep] = useState<"context" | "builder">("context");
  const [hasTeamPrices, setHasTeamPrices] = useState(false);
  const [teamPriceItems, setTeamPriceItems] = useState<any[]>([]);
  const [teamName, setTeamName] = useState<string | null>(null);
  const [ctx, setCtx] = useState<ContextForm>({
    motif: "", motifAutre: "", vendeurCode: profile?.vendeur_code ?? "", clientId: "",
    destination: "", destinationAutre: "",
    deliveryAddress: prefill?.deliveryAddress ?? "",
    deliveryType: "", shippingCost: "", label: "",
  });
  const [clientSearch, setClientSearch] = useState(prefill?.clientSearch ?? "");
  const [showClientDrop, setShowClientDrop] = useState(false);
  const clientRef = useRef<HTMLDivElement>(null);

  const [clients, setClients] = useState<Client[]>([]);
  const [newRow, setNewRow] = useState<ProductRow>({ id: "", product: "", qty: "", price: "", unit: "/KIT", format: "" });
  const [orderLines, setOrderLines] = useState<OrderProduct[]>([]);
  const [discountType, setDiscountType] = useState<"%" | "$">("%");
  const [discountValue, setDiscountValue] = useState<string>("");
  const [extraFees, setExtraFees] = useState<string>("");
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    supabase
      .from("clients")
      .select("id, company_name, contact_first_name, contact_last_name, contact_title, email, phone, billing_address, billing_city, billing_province, billing_postal_code, billing_country, shipping_address, shipping_city, shipping_province, shipping_postal_code, shipping_country, shipping_same_as_billing, pricelist_pdf_url, agent_name, client_code")
      .order("company_name", { ascending: true })
      .then(({ data }) => { if (data) setClients(data as Client[]); });

    const teamId = profile?.team_id;
    if (teamId) {
      (async () => {
        const [{ data: team }, { data: teamPrices }] = await Promise.all([
          supabase.from("teams").select("name").eq("id", teamId).maybeSingle(),
          supabase.from("team_prices").select("*").eq("team_id", teamId).eq("is_active", true),
        ]);
        if (team) setTeamName(team.name);
        if (teamPrices && teamPrices.length > 0) {
          setHasTeamPrices(true);
          setTeamPriceItems(teamPrices);
        }
      })();
    }
  }, [profile?.team_id]);

  const filteredClients = clients.filter(c =>
    c.company_name.toLowerCase().includes(clientSearch.toLowerCase())
  );
  const selectedClient = clients.find(c => c.id === ctx.clientId);

  const handleSelectClient = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    if (!client) return;
    const shippingAddr = client.shipping_same_as_billing !== false
      ? [client.billing_address, client.billing_city, client.billing_province, client.billing_postal_code].filter(Boolean).join(", ")
      : [client.shipping_address, client.shipping_city, client.shipping_province, client.shipping_postal_code].filter(Boolean).join(", ");
    const autoAddr = shippingAddr;
    const autoDest = detectDestination(
      client.billing_address || "",
      client.billing_postal_code || ""
    );
    setCtx(prev => ({
      ...prev,
      clientId,
      deliveryAddress: autoAddr || prev.deliveryAddress,
      destination: autoDest || prev.destination,
    }));
    setClientSearch("");
    setShowClientDrop(false);
  };

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (clientRef.current && !clientRef.current.contains(e.target as Node)) {
        setShowClientDrop(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const ctxValid = ctx.motif !== "" && ctx.clientId !== "" && ctx.destination !== "" && ctx.deliveryAddress.trim() !== "" && ctx.label !== "" && ctx.deliveryType !== "" && (ctx.motif !== "Autre" || ctx.motifAutre.trim() !== "") && (ctx.destination !== "AUTRE" || ctx.destinationAutre.trim() !== "") && (ctx.deliveryType !== "Add Shipping" || (ctx.shippingCost !== "" && Number(ctx.shippingCost) >= 0));

  const rowValid = newRow.product !== "" && newRow.qty !== "" && Number(newRow.qty) > 0 && newRow.price !== "" && Number(newRow.price) > 0 && newRow.format !== "";

  const subtotal = orderLines.reduce((s, l) => s + l.qty * l.price, 0);
  const discountAmt = discountValue !== "" && Number(discountValue) > 0
    ? (discountType === "%" ? subtotal * (Number(discountValue) / 100) : Math.min(Number(discountValue), subtotal))
    : 0;
  const subtotalAfterDiscount = subtotal - discountAmt;
  const shippingAmt = ctx.deliveryType === "Add Shipping" && ctx.shippingCost !== "" ? Number(ctx.shippingCost) : 0;
  const province = ctx.destination === "CANADA" ? detectProvince(ctx.deliveryAddress) : "";
  const taxLines = ctx.destination === "CANADA" ? computeTaxLines(province, subtotalAfterDiscount) : [];
  const taxTotal = taxLines.reduce((s, t) => s + t.amount, 0);
  const extraFeesAmt = extraFees !== "" ? Number(extraFees) : 0;
  const total = subtotalAfterDiscount + shippingAmt + taxTotal + extraFeesAmt;

  const addLine = () => {
    if (!rowValid) return;
    setOrderLines(prev => [...prev, {
      id: Date.now().toString(),
      product: newRow.product,
      qty: Number(newRow.qty),
      price: Number(newRow.price),
      unit: newRow.unit,
      format: newRow.format as OrderProduct["format"],
    }]);
    setNewRow({ id: "", product: "", qty: "", price: "", unit: "/KIT", format: "" });
  };

  const removeLine = (id: string) => setOrderLines(prev => prev.filter(l => l.id !== id));

  const handleSubmit = () => {
    onSubmit({
      client: selectedClient?.company_name || clientSearch,
      clientId: ctx.clientId,
      motif: ctx.motif as OrderMotif,
      motifAutre: ctx.motifAutre,
      vendeurCode: profile?.vendeur_code || ctx.vendeurCode,
      vendeur_code: profile?.vendeur_code ?? null,
      team_id: profile?.team_id ?? null,
      destination: ctx.destination as OrderDestination,
      destinationAutre: ctx.destinationAutre,
      deliveryAddress: ctx.deliveryAddress,
      deliveryType: ctx.deliveryType as DeliveryType,
      shippingCost: ctx.deliveryType === "Add Shipping" ? Number(ctx.shippingCost) : undefined,
      label: ctx.label as OrderLabel,
      products: orderLines,
      subtotal,
      discountType: discountAmt > 0 ? discountType : undefined,
      discountValue: discountAmt > 0 ? Number(discountValue) : undefined,
      discount: discountAmt > 0 ? discountAmt : undefined,
      subtotalAfterDiscount,
      province: province || undefined,
      taxLines: taxLines.length > 0 ? taxLines : undefined,
      taxTotal: taxTotal > 0 ? taxTotal : undefined,
      extraFees: extraFeesAmt > 0 ? extraFeesAmt : undefined,
      total,
      status: "pending_approval",
    });
    setShowConfirm(false);
  };

  const inputStyle: React.CSSProperties = {
    border: `1px solid ${T.border}`, borderRadius: 8, padding: "9px 12px",
    fontSize: 13, fontFamily: "inherit", outline: "none", background: T.bgCard,
    color: T.text, width: "100%", boxSizing: "border-box",
  };

  const radioOpt = (label: string, value: string, field: keyof ContextForm) => {
    const checked = ctx[field] === value;
    return (
      <label key={value} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", padding: "6px 0" }}>
        <div onClick={() => setCtx(p => ({ ...p, [field]: value }))} style={{ width: 18, height: 18, borderRadius: "50%", border: `2px solid ${checked ? T.main : "#d1d5db"}`, background: checked ? T.main : "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.15s", cursor: "pointer" }}>
          {checked && <div style={{ width: 8, height: 8, borderRadius: "50%", background: T.bgCard }} />}
        </div>
        <span style={{ fontSize: 13, fontWeight: checked ? 700 : 400, color: checked ? T.text : T.textMid }}>{label}</span>
        <input type="radio" value={value} checked={checked} onChange={() => setCtx(p => ({ ...p, [field]: value }))} style={{ display: "none" }} />
      </label>
    );
  };

  const TotalRow = ({ label, value, bold, highlight, negative, muted }: { label: React.ReactNode; value: string; bold?: boolean; highlight?: boolean; negative?: boolean; muted?: boolean }) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0" }}>
      <span style={{ fontSize: 13, color: muted ? T.textLight : T.textMid }}>{label}</span>
      <span style={{ fontSize: highlight ? 18 : 13, fontWeight: bold || highlight ? 800 : 500, color: highlight ? T.main : negative ? "#dc2626" : muted ? T.textLight : T.text }}>
        {value}
      </span>
    </div>
  );

  const Divider = () => <div style={{ borderTop: `1px solid ${T.divider}`, margin: "8px 0" }} />;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontSize: 13, color: T.textMid, fontFamily: "inherit" }}>
          <BackIcon /> Retour
        </button>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Nouvelle commande</h2>
            {hasTeamPrices && (
              <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 20, background: "rgba(99,102,241,0.12)", color: "#6366f1", fontWeight: 700 }}>
                ✓ Prix équipe actifs
              </span>
            )}
          </div>
          <p style={{ margin: 0, color: T.textMid, fontSize: 13 }}>Remplir le contexte puis construire la commande</p>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ background: T.card, borderRadius: 14, border: `1px solid ${T.border}`, overflow: "hidden" }}>
          <div
            style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: step === "builder" ? `1px solid ${T.border}` : "none", cursor: step === "builder" ? "pointer" : "default", background: step === "builder" ? "#f8f9fb" : T.card }}
            onClick={() => step === "builder" && setStep("context")}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: step === "builder" ? T.main : `${T.main}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {step === "builder" ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                ) : (
                  <span style={{ fontSize: 13, fontWeight: 800, color: T.main }}>1</span>
                )}
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 15 }}>Contexte de la commande</div>
                {step === "builder" && (
                  <div style={{ fontSize: 12, color: T.textMid, marginTop: 2 }}>
                    {ctx.motif} · {selectedClient?.company_name} · {ctx.destination} · {ctx.label} · {ctx.deliveryType}
                  </div>
                )}
              </div>
            </div>
            {step === "builder" && <span style={{ fontSize: 11, color: T.main, fontWeight: 700 }}>Modifier</span>}
          </div>

          {step === "context" && (
            <div style={{ padding: 24 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: T.textMid, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 10 }}>Motif de la commande *</div>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    {(["Restock", "Dropship client", "Sample", "Gros client", "Autre"] as OrderMotif[]).map(m => (
                      <div key={m}>
                        {radioOpt(m, m, "motif")}
                        {m === "Autre" && ctx.motif === "Autre" && (
                          <input value={ctx.motifAutre} onChange={e => setCtx(p => ({ ...p, motifAutre: e.target.value }))} placeholder="Préciser..." style={{ ...inputStyle, marginTop: 6, marginLeft: 26 }} />
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 160 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 8 }}>
                        <LockIcon />
                        <span style={{ fontSize: 12, fontWeight: 700, color: T.textMid, textTransform: "uppercase", letterSpacing: 0.4 }}>Code vendeur</span>
                      </div>
                      <div style={{ ...inputStyle, background: "#f4f5f9", color: "#9ca3af", cursor: "default" }}>
                        {profile?.vendeur_code || "—"}
                      </div>
                    </div>
                    {teamName && (
                      <div style={{ flex: 1, minWidth: 160 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 8 }}>
                          <LockIcon />
                          <span style={{ fontSize: 12, fontWeight: 700, color: T.textMid, textTransform: "uppercase", letterSpacing: 0.4 }}>Équipe</span>
                        </div>
                        <div style={{ ...inputStyle, background: "#f4f5f9", color: "#9ca3af", cursor: "default" }}>
                          {teamName}
                        </div>
                      </div>
                    )}
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: T.textMid, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 8 }}>Client *</div>
                    <div style={{ position: "relative" }} ref={clientRef}>
                      <input
                        value={selectedClient ? selectedClient.company_name : clientSearch}
                        onChange={e => { setClientSearch(e.target.value); setCtx(p => ({ ...p, clientId: "" })); setShowClientDrop(true); }}
                        onFocus={() => setShowClientDrop(true)}
                        placeholder="Rechercher un client..."
                        style={inputStyle}
                      />
                      {showClientDrop && filteredClients.length > 0 && !ctx.clientId && (
                        <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.1)", zIndex: 20, overflow: "hidden", maxHeight: 220, overflowY: "auto" }}>
                          {filteredClients.slice(0, 10).map(c => (
                            <div key={c.id} onClick={() => handleSelectClient(c.id)} style={{ padding: "10px 14px", cursor: "pointer", fontSize: 13, borderBottom: `1px solid ${T.border}` }}
                              onMouseOver={e => (e.currentTarget as HTMLDivElement).style.background = "#f8f9ff"}
                              onMouseOut={e => (e.currentTarget as HTMLDivElement).style.background = "transparent"}>
                              <div style={{ fontWeight: 600 }}>{c.company_name}</div>
                              <div style={{ fontSize: 11, color: T.textLight, marginTop: 2 }}>{[c.billing_city, c.billing_province].filter(Boolean).join(", ")}</div>
                            </div>
                          ))}
                        </div>
                      )}
                      {showClientDrop && filteredClients.length === 0 && clientSearch && !ctx.clientId && (
                        <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.1)", zIndex: 20, padding: "12px 14px", fontSize: 13, color: T.textLight }}>
                          Aucun client trouvé
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: T.textMid, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 10 }}>Destination *</div>
                  {(["CANADA", "USA", "AUTRE"] as OrderDestination[]).map(d => (
                    <div key={d}>
                      {radioOpt(d, d, "destination")}
                      {d === "AUTRE" && ctx.destination === "AUTRE" && (
                        <input value={ctx.destinationAutre} onChange={e => setCtx(p => ({ ...p, destinationAutre: e.target.value }))} placeholder="Préciser le pays..." style={{ ...inputStyle, marginTop: 6, marginLeft: 26 }} />
                      )}
                    </div>
                  ))}

                  <div style={{ marginTop: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: T.textMid, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 8 }}>Type de livraison *</div>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      {(["Pickup", "Shipping Client", "Add Shipping"] as DeliveryType[]).map(dt => {
                        const labels: Record<string, string> = {
                          "Pickup": "Pickup — Le client vient chercher",
                          "Shipping Client": "Shipping Client — À la charge du client",
                          "Add Shipping": "Add Shipping — Uniflex prend en charge",
                        };
                        const checked = ctx.deliveryType === dt;
                        return (
                          <div key={dt}>
                            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", padding: "6px 0" }}>
                              <div onClick={() => setCtx(p => ({ ...p, deliveryType: dt }))} style={{ width: 18, height: 18, borderRadius: "50%", border: `2px solid ${checked ? T.main : "#d1d5db"}`, background: checked ? T.main : "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.15s", cursor: "pointer" }}>
                                {checked && <div style={{ width: 8, height: 8, borderRadius: "50%", background: T.bgCard }} />}
                              </div>
                              <span style={{ fontSize: 13, fontWeight: checked ? 700 : 400, color: checked ? T.text : T.textMid }}>{labels[dt]}</span>
                            </label>
                            {dt === "Add Shipping" && ctx.deliveryType === "Add Shipping" && (
                              <div style={{ marginLeft: 26, marginTop: 4 }}>
                                <div style={{ position: "relative" }}>
                                  <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: T.textMid, pointerEvents: "none" }}>$</span>
                                  <input type="number" min="0" step="0.01" value={ctx.shippingCost} onChange={e => setCtx(p => ({ ...p, shippingCost: e.target.value }))} placeholder="0.00" style={{ ...inputStyle, paddingLeft: 22 }} />
                                </div>
                                <div style={{ fontSize: 11, color: T.textLight, marginTop: 3 }}>Coût total du shipping (frais et taxes inclus)</div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div style={{ marginTop: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: T.textMid, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 8 }}>Adresse de livraison *</div>
                    <textarea value={ctx.deliveryAddress} onChange={e => setCtx(p => ({ ...p, deliveryAddress: e.target.value }))} placeholder="Adresse de livraison..." rows={2} style={{ ...inputStyle, resize: "vertical" }} />
                    {ctx.clientId && (
                      <div style={{ fontSize: 11, color: "#059669", marginTop: 4 }}>Adresse pré-remplie depuis la fiche client — modifiable</div>
                    )}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: T.textMid, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 10 }}>Label *</div>
                  {(["UNIFLEX", "PRIVATE LABEL", "BLANK"] as OrderLabel[]).map(l => radioOpt(l, l, "label"))}
                </div>
              </div>

              <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end" }}>
                <button onClick={() => ctxValid && setStep("builder")} disabled={!ctxValid} style={{ background: ctxValid ? T.main : "#e5e7eb", color: ctxValid ? "#fff" : "#9ca3af", border: "none", borderRadius: 10, padding: "12px 28px", fontSize: 14, fontWeight: 800, cursor: ctxValid ? "pointer" : "not-allowed", fontFamily: "inherit", transition: "all 0.2s" }}>
                  NEXT →
                </button>
              </div>
            </div>
          )}
        </div>

        {step === "builder" && (
          <div style={{ animation: "fadeInUp 0.25s ease-out" }}>
            <style>{`@keyframes fadeInUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }`}</style>

            {selectedClient && (
              <ClientCard
                client={selectedClient}
                deliveryAddress={ctx.deliveryAddress}
                onDeliveryAddressChange={addr => setCtx(p => ({ ...p, deliveryAddress: addr }))}
              />
            )}

            <div style={{ background: T.card, borderRadius: 14, border: `1px solid ${T.border}`, padding: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: `${T.main}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: T.main }}>2</span>
                </div>
                <div style={{ fontWeight: 800, fontSize: 15 }}>Builder de commande</div>
              </div>

              <div style={{ background: "#f8f9fb", borderRadius: 10, padding: 16, marginBottom: 20, border: `1px solid ${T.border}` }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: T.textMid, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 12 }}>Ajouter un produit</div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
                  <div style={{ flex: "2 1 160px" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: T.textLight, textTransform: "uppercase", marginBottom: 4 }}>Produit</div>
                    <select value={newRow.product} onChange={e => setNewRow(p => ({ ...p, product: e.target.value }))} style={{ border: `1px solid ${T.border}`, borderRadius: 8, padding: "9px 12px", fontSize: 13, fontFamily: "inherit", outline: "none", background: T.bgCard, color: newRow.product ? T.text : T.textLight, width: "100%", cursor: "pointer" }}>
                      <option value="">Sélectionner...</option>
                      {ctxProducts.filter(p => p.is_active).sort((a, b) => a.name.localeCompare(b.name)).map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                    </select>
                  </div>
                  <div style={{ flex: "1 1 80px" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: T.textLight, textTransform: "uppercase", marginBottom: 4 }}>Qté</div>
                    <input type="number" min="1" value={newRow.qty} onChange={e => setNewRow(p => ({ ...p, qty: e.target.value }))} placeholder="0" style={{ border: `1px solid ${T.border}`, borderRadius: 8, padding: "9px 12px", fontSize: 13, fontFamily: "inherit", outline: "none", background: T.bgCard, width: "100%", boxSizing: "border-box" as const }} />
                  </div>
                  <div style={{ flex: "1 1 120px" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: T.textLight, textTransform: "uppercase", marginBottom: 4 }}>Prix négocié</div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <input type="number" min="0" value={newRow.price} onChange={e => setNewRow(p => ({ ...p, price: e.target.value }))} placeholder="0.00" style={{ border: `1px solid ${T.border}`, borderRadius: 8, padding: "9px 12px", fontSize: 13, fontFamily: "inherit", outline: "none", background: T.bgCard, flex: 1, boxSizing: "border-box" as const }} />
                      <select value={newRow.unit} onChange={e => setNewRow(p => ({ ...p, unit: e.target.value as "/KIT" | "/GAL" }))} style={{ border: `1px solid ${T.border}`, borderRadius: 8, padding: "9px 8px", fontSize: 12, fontFamily: "inherit", outline: "none", background: T.bgCard, cursor: "pointer", flexShrink: 0 }}>
                        <option value="/KIT">/KIT</option>
                        <option value="/GAL">/GAL</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ flex: "2 1 160px" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: T.textLight, textTransform: "uppercase", marginBottom: 4 }}>Format</div>
                    <select value={newRow.format} onChange={e => setNewRow(p => ({ ...p, format: e.target.value }))} style={{ border: `1px solid ${T.border}`, borderRadius: 8, padding: "9px 12px", fontSize: 13, fontFamily: "inherit", outline: "none", background: T.bgCard, color: newRow.format ? T.text : T.textLight, width: "100%", cursor: "pointer" }}>
                      <option value="">Sélectionner...</option>
                      {["Common Kit (1GAL, 2GAL, 3GAL)", "Large Kit (5GAL, 10GAL, 15GAL)", "BARREL KIT (55 GAL per Barrel)", "TOTE KIT (250 GAL per Tote)", "SPECIAL (see with HO for options)"].map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                  <button onClick={addLine} disabled={!rowValid} style={{ background: rowValid ? T.main : "#e5e7eb", color: rowValid ? "#fff" : "#9ca3af", border: "none", borderRadius: 8, padding: "10px 18px", fontSize: 13, fontWeight: 700, cursor: rowValid ? "pointer" : "not-allowed", fontFamily: "inherit", whiteSpace: "nowrap", transition: "all 0.2s" }}>
                    + AJOUTER
                  </button>
                </div>
              </div>

              <div style={{ border: `1px solid ${T.border}`, borderRadius: 10, overflow: "hidden", marginBottom: 20 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#f8f9fb" }}>
                      {["Produit", "Quantité", "Prix négocié", "Unité", "Format", "Sous-total", ""].map(h => (
                        <th key={h} style={{ padding: "10px 14px", textAlign: h === "Quantité" || h === "Prix négocié" || h === "Sous-total" ? "right" : "left", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.3, color: T.textLight, borderBottom: `1px solid ${T.border}` }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {orderLines.length === 0 ? (
                      <tr><td colSpan={7} style={{ padding: "32px 16px", textAlign: "center", color: T.textLight, fontSize: 13 }}>Aucun produit ajouté</td></tr>
                    ) : orderLines.map((line, i) => (
                      <tr key={line.id} style={{ borderBottom: i < orderLines.length - 1 ? `1px solid ${T.border}` : "none" }}>
                        <td style={{ padding: "12px 14px", fontWeight: 700 }}>{line.product}</td>
                        <td style={{ padding: "12px 14px", textAlign: "right" }}>{line.qty}</td>
                        <td style={{ padding: "12px 14px", textAlign: "right" }}>{fmt(line.price)}</td>
                        <td style={{ padding: "12px 14px", color: T.textMid, fontSize: 12 }}>{line.unit}</td>
                        <td style={{ padding: "12px 14px", color: T.textMid, fontSize: 12 }}>{line.format}</td>
                        <td style={{ padding: "12px 14px", textAlign: "right", fontWeight: 700 }}>{fmt(line.qty * line.price)}</td>
                        <td style={{ padding: "12px 14px" }}>
                          <button onClick={() => removeLine(line.id)} style={{ background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 6, padding: "5px 8px", cursor: "pointer", display: "flex", alignItems: "center" }}>
                            <TrashIcon />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ background: "#f8f9fb", border: `1px solid ${T.border}`, borderRadius: 12, padding: "18px 20px", marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: T.textLight, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 12 }}>Résumé de la commande</div>

                <TotalRow label="Sous-total produits" value={fmt(subtotal)} bold />

                <div style={{ padding: "6px 0" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 13, color: T.textMid }}>Rabais</span>
                      <div style={{ display: "flex", borderRadius: 6, overflow: "hidden", border: `1px solid ${T.border}` }}>
                        {(["%", "$"] as const).map(t => (
                          <button key={t} onClick={() => setDiscountType(t)} style={{ padding: "3px 9px", fontSize: 12, fontWeight: 700, border: "none", cursor: "pointer", fontFamily: "inherit", background: discountType === t ? T.main : "#fff", color: discountType === t ? "#fff" : T.textMid, transition: "all 0.15s" }}>{t}</button>
                        ))}
                      </div>
                      <input type="number" min="0" step="0.01" value={discountValue} onChange={e => setDiscountValue(e.target.value)} placeholder="0" style={{ border: `1px solid ${T.border}`, borderRadius: 6, padding: "4px 9px", fontSize: 13, fontFamily: "inherit", outline: "none", background: T.bgCard, width: 80 }} />
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: discountAmt > 0 ? "#dc2626" : T.textLight }}>
                      {discountAmt > 0 ? `-${fmt(discountAmt)}` : "—"}
                    </span>
                  </div>
                </div>

                <Divider />
                <TotalRow label="Sous-total après rabais" value={fmt(subtotalAfterDiscount)} bold />

                <TotalRow
                  label="Shipping"
                  value={ctx.deliveryType === "Add Shipping" ? (ctx.shippingCost !== "" ? fmt(shippingAmt) : "—") : "N/A"}
                  muted={ctx.deliveryType !== "Add Shipping"}
                />

                {ctx.destination === "CANADA" && (
                  <>
                    <Divider />
                    {province ? (
                      taxLines.length > 0 ? (
                        taxLines.map(t => (
                          <TotalRow key={t.label} label={t.label} value={fmt(t.amount)} />
                        ))
                      ) : (
                        <TotalRow label="Taxes" value="N/A" muted />
                      )
                    ) : (
                      <div style={{ fontSize: 12, color: "#b45309", background: "#fef3c7", borderRadius: 6, padding: "6px 10px", marginBottom: 4 }}>
                        Province non détectée — préciser la province dans l'adresse pour calculer les taxes
                      </div>
                    )}
                  </>
                )}

                {ctx.destination === "USA" || ctx.destination === "AUTRE" ? (
                  <>
                    <Divider />
                    <TotalRow label="Taxes" value="N/A — Hors Canada" muted />
                  </>
                ) : null}

                <Divider />
                <div style={{ padding: "6px 0" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 13, color: T.textMid }}>Extra fees</span>
                      <div style={{ position: "relative" }}>
                        <span style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: T.textMid, pointerEvents: "none" }}>$</span>
                        <input type="number" min="0" step="0.01" value={extraFees} onChange={e => setExtraFees(e.target.value)} placeholder="0.00" style={{ border: `1px solid ${T.border}`, borderRadius: 6, padding: "4px 9px 4px 18px", fontSize: 13, fontFamily: "inherit", outline: "none", background: T.bgCard, width: 90 }} />
                      </div>
                      <span style={{ fontSize: 11, color: T.textLight }}>manutention, douanes…</span>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: extraFeesAmt > 0 ? T.text : T.textLight }}>
                      {extraFeesAmt > 0 ? fmt(extraFeesAmt) : "—"}
                    </span>
                  </div>
                </div>

                <div style={{ borderTop: `2px solid ${T.main}22`, marginTop: 10, paddingTop: 12, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span style={{ fontSize: 16, fontWeight: 800, color: T.text }}>TOTAL</span>
                  <span style={{ fontSize: 26, fontWeight: 800, color: T.main }}>{fmt(total)}</span>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button onClick={() => orderLines.length > 0 && setShowConfirm(true)} disabled={orderLines.length === 0} style={{ background: orderLines.length > 0 ? T.main : "#e5e7eb", color: orderLines.length > 0 ? "#fff" : "#9ca3af", border: "none", borderRadius: 10, padding: "13px 28px", fontSize: 14, fontWeight: 800, cursor: orderLines.length > 0 ? "pointer" : "not-allowed", fontFamily: "inherit", letterSpacing: 0.3, transition: "all 0.2s" }}>
                  SEND TO HEAD OFFICE →
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {showConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
          <div style={{ background: T.bgCard, borderRadius: 16, padding: 32, maxWidth: 480, width: "90%", boxShadow: "0 24px 64px rgba(0,0,0,0.2)" }}>
            <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 16 }}>Confirmer l'envoi</div>
            <div style={{ fontSize: 13, color: T.textMid, lineHeight: 1.8, marginBottom: 20 }}>
              <div><strong style={{ color: T.text }}>Client :</strong> {selectedClient?.company_name}</div>
              <div><strong style={{ color: T.text }}>Motif :</strong> {ctx.motif}</div>
              <div><strong style={{ color: T.text }}>Destination :</strong> {ctx.destination}{province ? ` (${province})` : ""}</div>
              <div><strong style={{ color: T.text }}>Livraison :</strong> {ctx.deliveryType}</div>
              {discountAmt > 0 && <div><strong style={{ color: T.text }}>Rabais :</strong> -{fmt(discountAmt)}</div>}
              {ctx.deliveryType === "Add Shipping" && <div><strong style={{ color: T.text }}>Shipping :</strong> {fmt(shippingAmt)}</div>}
              {taxTotal > 0 && <div><strong style={{ color: T.text }}>Taxes :</strong> {fmt(taxTotal)}</div>}
              {extraFeesAmt > 0 && <div><strong style={{ color: T.text }}>Extra fees :</strong> {fmt(extraFeesAmt)}</div>}
            </div>
            <div style={{ fontWeight: 800, fontSize: 18, color: T.main, marginBottom: 24 }}>Total : {fmt(total)}</div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setShowConfirm(false)} style={{ background: "#f4f5f9", color: T.textMid, border: `1px solid ${T.border}`, borderRadius: 8, padding: "10px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Annuler</button>
              <button onClick={handleSubmit} style={{ background: T.main, color: "#fff", border: "none", borderRadius: 8, padding: "10px 24px", fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>Confirmer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
