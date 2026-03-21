import React, { useState, useEffect, useCallback } from "react";
import { Pricelist } from "./pricelistTypes";
import PricelistHistory from "./PricelistHistory";
import PricelistBuilder from "./PricelistBuilder";
import { generatePricelistPDF, generatePricelistPDFBase64, PdfSellerInfo } from "./pdfGenerator";
import { useApp } from "../AppContext";
import SendEmailModal from "../components/email/SendEmailModal";
import { tplPricelistClient } from "../lib/emailTemplates";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../supabaseClient";

type View = "history" | "create";

export default function PricelistGeneratorPage() {
  const { prefillData, clearPrefill } = useApp();
  const { profile } = useAuth();
  const [view, setView] = useState<View>("history");
  const [pricelists, setPricelists] = useState<Pricelist[]>([]);
  const [prefill, setPrefill] = useState<Pricelist | null>(null);
  const [emailModal, setEmailModal] = useState<{ pl: Pricelist; subject: string; html: string; text: string } | null>(null);

  const sellerInfo: PdfSellerInfo | undefined = profile ? {
    fullName: profile.full_name || "Équipe Uniflex",
    title: profile.role === "god_admin" ? "Directeur" : profile.role === "admin" ? "Gestionnaire" : "Représentant",
    email: profile.email || "",
    phone: profile.phone || "",
    agentCode: profile.agent_code || "",
  } : undefined;

  const loadPricelists = useCallback(async () => {
    const ownerId = profile?.id;
    if (!ownerId) return;
    const { data: rows } = await supabase
      .from("pricelists")
      .select("*")
      .eq("owner_id", ownerId)
      .order("created_at", { ascending: false });
    if (!rows) return;
    const mapped: Pricelist[] = [];
    for (const r of rows) {
      const { data: lines } = await supabase
        .from("pricelist_lines")
        .select("*")
        .eq("pricelist_id", r.id)
        .order("sort_order");
      mapped.push({
        id: r.id,
        createdAt: r.created_at,
        companyName: r.company_name || "",
        address: r.address || "",
        clientType: r.client_type || "Installateur",
        contactName: r.contact_name || "",
        clientEmail: r.client_email || "",
        clientPhone: r.client_phone || "",
        validUntil: r.valid_until || "",
        currency: r.currency || "CAD",
        exchangeRate: r.exchange_rate,
        internalNotes: r.internal_notes || "",
        lines: (lines || []).map((l: any) => ({
          id: l.id,
          product: l.product,
          minQty: l.min_qty,
          price: Number(l.price),
          unit: l.unit,
          format: l.format,
        })),
      });
    }
    setPricelists(mapped);
  }, [profile?.id]);

  useEffect(() => { loadPricelists(); }, [loadPricelists]);

  useEffect(() => {
    if (prefillData) {
      setPrefill({
        id: "",
        companyName: prefillData.companyName ?? "",
        address: prefillData.address ?? "",
        clientType: (prefillData.clientType as Pricelist["clientType"]) ?? "Installateur",
        contactName: prefillData.contactName ?? "",
        clientEmail: prefillData.clientEmail ?? "",
        clientPhone: prefillData.clientPhone ?? "",
        validUntil: "",
        currency: "CAD",
        internalNotes: "",
        lines: [],
        createdAt: new Date().toISOString(),
      });
      setView("create");
      clearPrefill();
    }
  }, []);

  const handleCreateNew = () => {
    setPrefill(null);
    setView("create");
  };

  const handleDuplicate = (pl: Pricelist) => {
    setPrefill(pl);
    setView("create");
  };

  const handleDelete = async (id: string) => {
    await supabase.from("pricelist_lines").delete().eq("pricelist_id", id);
    await supabase.from("pricelists").delete().eq("id", id);
    setPricelists(prev => prev.filter(pl => pl.id !== id));
  };

  const handleSave = async (pl: Pricelist) => {
    const ownerId = profile?.id;
    if (!ownerId) return;
    const { data: row } = await supabase.from("pricelists").insert({
      company_name: pl.companyName,
      address: pl.address,
      client_type: pl.clientType,
      contact_name: pl.contactName,
      client_email: pl.clientEmail,
      client_phone: pl.clientPhone,
      valid_until: pl.validUntil || null,
      currency: pl.currency,
      exchange_rate: pl.exchangeRate || null,
      internal_notes: pl.internalNotes,
      owner_id: ownerId,
    }).select("id, created_at").single();
    if (row && pl.lines.length > 0) {
      await supabase.from("pricelist_lines").insert(
        pl.lines.map((l, i) => ({
          pricelist_id: row.id,
          product: l.product,
          min_qty: l.minQty,
          price: l.price,
          unit: l.unit,
          format: l.format,
          sort_order: i,
        }))
      );
    }
    const saved = { ...pl, id: row?.id ?? pl.id, createdAt: row?.created_at ?? pl.createdAt };
    setPricelists(prev => [saved, ...prev]);
    setView("history");
    const tpl = tplPricelistClient(saved as unknown as Record<string, unknown>, profile?.full_name ?? "Équipe Uniflex");
    setEmailModal({ pl: saved, subject: tpl.subject, html: tpl.html, text: tpl.text });
  };

  const handleGeneratePDF = async (pl: Pricelist) => {
    await generatePricelistPDF(pl, sellerInfo);
  };

  if (view === "create") {
    return (
      <PricelistBuilder
        onBack={() => setView("history")}
        onSave={handleSave}
        prefill={prefill}
      />
    );
  }

  return (
    <>
      <PricelistHistory
        pricelists={pricelists}
        onCreateNew={handleCreateNew}
        onDuplicate={handleDuplicate}
        onDelete={handleDelete}
        onGeneratePDF={handleGeneratePDF}
      />
      {emailModal && (
        <SendEmailModal
          isOpen={true}
          onClose={() => setEmailModal(null)}
          smtpConfigKey="user_personal"
          to={emailModal.pl.clientEmail ?? ""}
          subject={emailModal.subject}
          htmlBody={emailModal.html}
          textBody={emailModal.text}
          templateKey="pricelist_client"
          referenceType="pricelist"
          attachmentLabel={`Pricelist_${emailModal.pl.companyName.replace(/\s+/g, "_")}.pdf`}
          onGetAttachment={() => generatePricelistPDFBase64(emailModal.pl, sellerInfo)}
        />
      )}
    </>
  );
}
