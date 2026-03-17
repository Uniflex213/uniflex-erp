import React, { useState, useEffect } from "react";
import { Order, buildOrderId } from "./orderTypes";
import { useOrders } from "./OrdersContext";
import OrdersPage from "./OrdersPage";
import NewOrderPage from "./NewOrderPage";
import AdminOrdersPage from "./AdminOrdersPage";
import { useApp } from "../AppContext";
import { useAuth } from "../contexts/AuthContext";
import SendEmailModal from "../components/email/SendEmailModal";
import { tplOrderConfirmationClient } from "../lib/emailTemplates";
import { generateOrderPDFBase64 } from "./orderPDF";

type View = "list" | "new";

interface Props {
  isAdmin?: boolean;
}

export default function OrdersController({ isAdmin = false }: Props) {
  const { orders, addOrder, updateOrder, removeOrder, getNextCounter } = useOrders();
  const { prefillData, clearPrefill } = useApp();
  const { profile } = useAuth();
  const [view, setView] = useState<View>("list");
  const [orderPrefill, setOrderPrefill] = useState<{ deliveryAddress?: string; clientSearch?: string } | null>(null);
  const [emailModal, setEmailModal] = useState<{ order: Order; subject: string; html: string; text: string } | null>(null);

  useEffect(() => {
    if (prefillData && !isAdmin) {
      setOrderPrefill({
        deliveryAddress: prefillData.address,
        clientSearch: prefillData.companyName,
      });
      setView("new");
      clearPrefill();
    }
  }, []);

  const handleNewOrder = async (data: Omit<Order, "id" | "date" | "createdBy">) => {
    const counter = await getNextCounter();
    const newOrder: Order = {
      ...data,
      id: buildOrderId(data.motif, data.destination, data.label, counter),
      date: new Date().toISOString().split("T")[0],
      createdBy: profile?.full_name ?? "Inconnu",
    };
    await addOrder(newOrder);
    setView("list");
    const tpl = tplOrderConfirmationClient(newOrder as unknown as Record<string, unknown>);
    setEmailModal({ order: newOrder, subject: tpl.subject, html: tpl.html, text: tpl.text });
  };

  if (isAdmin) {
    return <AdminOrdersPage orders={orders} onUpdateOrder={updateOrder} />;
  }

  if (view === "new") {
    return (
      <NewOrderPage
        onBack={() => { setView("list"); setOrderPrefill(null); }}
        onSubmit={handleNewOrder}
        prefill={orderPrefill}
      />
    );
  }

  return (
    <>
      <OrdersPage
        orders={orders}
        onNewOrder={() => setView("new")}
        onRemoveOrder={removeOrder}
        onUpdateOrder={updateOrder}
      />
      {emailModal && (
        <SendEmailModal
          isOpen={true}
          onClose={() => setEmailModal(null)}
          smtpConfigKey="commandes"
          to=""
          subject={emailModal.subject}
          htmlBody={emailModal.html}
          textBody={emailModal.text}
          templateKey="order_confirmation_client"
          referenceType="order"
          referenceId={emailModal.order.id}
          attachmentLabel={`Commande_${emailModal.order.id}.pdf`}
          onGetAttachment={() => generateOrderPDFBase64(emailModal.order)}
        />
      )}
    </>
  );
}
