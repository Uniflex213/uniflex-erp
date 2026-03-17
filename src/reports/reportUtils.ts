import jsPDF from 'jspdf';
import { T } from "../theme";
export { T };

export const fmt = (n: number) =>
  new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

export const fmtNum = (n: number) => new Intl.NumberFormat('fr-CA').format(n);

export const fmtPct = (n: number) => `${n.toFixed(1)}%`;

export type DateRange = {
  key: string;
  label: string;
  startDate: Date;
  endDate: Date;
};

export function getDateRanges(): DateRange[] {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
  const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 12, 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  return [
    { key: 'this_month', label: 'Ce mois', startDate: startOfMonth, endDate: now },
    { key: '3_months', label: '3 derniers mois', startDate: threeMonthsAgo, endDate: now },
    { key: '6_months', label: '6 derniers mois', startDate: sixMonthsAgo, endDate: now },
    { key: 'ytd', label: 'Depuis debut annee', startDate: startOfYear, endDate: now },
    { key: '12_months', label: '12 derniers mois', startDate: twelveMonthsAgo, endDate: now },
  ];
}

export function exportToCsv(filename: string, headers: string[], rows: string[][]) {
  const bom = '\uFEFF';
  const csvContent = bom + [headers.join(','), ...rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

export function exportToPdf(title: string, headers: string[], rows: string[][]) {
  const doc = new jsPDF({ orientation: 'landscape' });
  doc.setFontSize(18);
  doc.text(title, 14, 20);
  doc.setFontSize(9);
  doc.text(`Genere le ${new Date().toLocaleDateString('fr-CA')} a ${new Date().toLocaleTimeString('fr-CA')}`, 14, 28);

  let y = 38;
  const colWidths = headers.map(() => Math.floor(260 / headers.length));
  const lineHeight = 7;

  doc.setFillColor(17, 19, 24);
  doc.rect(14, y - 5, 270, lineHeight + 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  headers.forEach((h, i) => {
    doc.text(h, 16 + colWidths.slice(0, i).reduce((a, b) => a + b, 0), y);
  });

  doc.setTextColor(0, 0, 0);
  y += lineHeight + 2;

  rows.forEach((row) => {
    if (y > 190) {
      doc.addPage();
      y = 20;
    }
    row.forEach((cell, i) => {
      doc.text(String(cell).slice(0, 40), 16 + colWidths.slice(0, i).reduce((a, b) => a + b, 0), y);
    });
    y += lineHeight;
  });

  doc.save(`${title.replace(/\s+/g, '_')}.pdf`);
}
