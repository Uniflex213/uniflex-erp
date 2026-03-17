import React, { useState, useEffect } from 'react';
import { Download, Package, AlertTriangle, CheckCircle } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { T, fmt, fmtNum, exportToCsv, exportToPdf } from './reportUtils';

export default function ReportProductAnalytics() {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<any[]>([]);
  const [stockStats, setStockStats] = useState({ inStock: 0, lowStock: 0, outOfStock: 0 });
  const [productSales, setProductSales] = useState<{ name: string; quantity: number; revenue: number }[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [prodsRes, ordersRes] = await Promise.all([
      supabase.from('sale_products').select('id, name, is_active, stock_quantity, min_stock_level').order('name'),
      supabase.from('orders').select('products, total, created_at'),
    ]);

    const prods = prodsRes.data || [];
    setProducts(prods);

    let inStock = 0, lowStock = 0, outOfStock = 0;
    prods.forEach((p: any) => {
      const qty = p.stock_quantity ?? 0;
      const min = p.min_stock_level ?? 0;
      if (qty <= 0) outOfStock++;
      else if (qty <= min) lowStock++;
      else inStock++;
    });
    setStockStats({ inStock, lowStock, outOfStock });

    const salesMap: Record<string, { quantity: number; revenue: number }> = {};
    (ordersRes.data || []).forEach((order: any) => {
      const items = order.products || [];
      if (Array.isArray(items)) {
        items.forEach((item: any) => {
          const name = item.name || item.product_name || item.p || 'Inconnu';
          if (!salesMap[name]) salesMap[name] = { quantity: 0, revenue: 0 };
          salesMap[name].quantity += (item.quantity || item.q || 0);
          salesMap[name].revenue += (item.quantity || item.q || 0) * (item.price || item.unit_price || item.pr || 0);
        });
      }
    });
    const salesArr = Object.entries(salesMap).map(([name, data]) => ({ name, ...data })).sort((a, b) => b.revenue - a.revenue);
    setProductSales(salesArr);
    setLoading(false);
  };

  const maxRevenue = Math.max(...productSales.map(p => p.revenue), 1);

  const handleExport = (type: 'csv' | 'pdf') => {
    const headers = ['Produit', 'Quantite vendue', 'Revenu'];
    const rows = productSales.map(p => [p.name, String(p.quantity), fmt(p.revenue)]);
    if (type === 'csv') exportToCsv('rapport_produits', headers, rows);
    else exportToPdf('Rapport Produits', headers, rows);
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 40, color: T.textLight }}>Chargement...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 20 }}>
        <button onClick={() => handleExport('csv')} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '7px 14px', borderRadius: 6, border: `1px solid ${T.border}`, background: '#fff', color: T.textMid, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
          <Download size={12} /> CSV
        </button>
        <button onClick={() => handleExport('pdf')} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '7px 14px', borderRadius: 6, border: `1px solid ${T.border}`, background: '#fff', color: T.textMid, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
          <Download size={12} /> PDF
        </button>
      </div>

      <div style={{ display: 'flex', gap: 14, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { icon: <CheckCircle size={18} />, label: 'En stock', value: stockStats.inStock, color: T.green, bg: T.greenBg },
          { icon: <AlertTriangle size={18} />, label: 'Stock bas', value: stockStats.lowStock, color: T.orange, bg: T.orangeBg },
          { icon: <Package size={18} />, label: 'Rupture', value: stockStats.outOfStock, color: T.red, bg: T.redBg },
        ].map((s, i) => (
          <div key={i} style={{ flex: '1 1 180px', background: s.bg, borderRadius: 10, padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ color: s.color }}>{s.icon}</span>
              <span style={{ fontSize: 12, color: s.color, fontWeight: 600 }}>{s.label}</span>
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 400px', background: T.card, borderRadius: 10, border: `1px solid ${T.border}`, padding: 20 }}>
          <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 16 }}>Revenu par produit</div>
          {productSales.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 32, color: T.textLight, fontSize: 13 }}>Aucune donnee de vente</div>
          ) : (
            productSales.slice(0, 10).map(p => (
              <div key={p.name} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: T.text }}>{p.name}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: T.main }}>{fmt(p.revenue)}</span>
                </div>
                <div style={{ height: 8, background: '#f3f4f6', borderRadius: 4 }}>
                  <div style={{ height: '100%', width: `${(p.revenue / maxRevenue) * 100}%`, background: `linear-gradient(90deg, ${T.main}, ${T.main}aa)`, borderRadius: 4, transition: 'width 0.6s' }} />
                </div>
              </div>
            ))
          )}
        </div>

        <div style={{ flex: '1 1 300px', background: T.card, borderRadius: 10, border: `1px solid ${T.border}`, padding: 20 }}>
          <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 16 }}>Quantites vendues</div>
          {productSales.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 32, color: T.textLight, fontSize: 13 }}>Aucune donnee</div>
          ) : (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 100px', gap: 4, marginBottom: 8 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: T.textLight, textTransform: 'uppercase', letterSpacing: 0.5 }}>Produit</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: T.textLight, textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'center' }}>Qty</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: T.textLight, textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'right' }}>Revenu</div>
              </div>
              {productSales.slice(0, 12).map((p, i) => (
                <div key={p.name} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 100px', gap: 4, padding: '8px 0', borderBottom: i < Math.min(productSales.length, 12) - 1 ? `1px solid ${T.border}` : 'none' }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, textAlign: 'center' }}>{fmtNum(p.quantity)}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.main, textAlign: 'right' }}>{fmt(p.revenue)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
