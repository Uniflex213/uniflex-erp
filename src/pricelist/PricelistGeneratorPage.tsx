import React, { useState, useEffect } from "react";
import { Pricelist, MOCK_PRICELISTS } from "./pricelistTypes";
import PricelistHistory from "./PricelistHistory";
import PricelistBuilder from "./PricelistBuilder";
import { generatePricelistPDF, generatePricelistPDFBase64 } from "./pdfGenerator";
import { useApp } from "../AppContext";
import SendEmailModal from "../components/email/SendEmailModal";
import { tplPricelistClient } from "../lib/emailTemplates";
import { useAuth } from "../contexts/AuthContext";

type View = "history" | "create";

export default function PricelistGeneratorPage() {
  const { prefillData, clearPrefill } = useApp();
  const { profile } = useAuth();
  const [view, setView] = useState<View>("history");
  const [pricelists, setPricelists] = useState<Pricelist[]>(MOCK_PRICELISTS);
  const [prefill, setPrefill] = useState<Pricelist | null>(null);
  const [emailModal, setEmailModal] = useState<{ pl: Pricelist; subject: string; html: string; text: string } | null>(null);

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

  const handleDelete = (id: string) => {
    setPricelists(prev => prev.filter(pl => pl.id !== id));
  };

  const handleSave = (pl: Pricelist) => {
    setPricelists(prev => [pl, ...prev]);
    setView("history");
    const tpl = tplPricelistClient(pl as unknown as Record<string, unknown>, profile?.full_name ?? "Équipe Uniflex");
    setEmailModal({ pl, subject: tpl.subject, html: tpl.html, text: tpl.text });
  };

  const handleGeneratePDF = async (pl: Pricelist) => {
    await generatePricelistPDF(pl);
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
          onGetAttachment={() => generatePricelistPDFBase64(emailModal.pl)}
        />
      )}
    </>
  );
}
