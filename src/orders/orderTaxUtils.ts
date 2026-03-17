import { TaxLine } from "./orderTypes";

export const fmt = (n: number) =>
  new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

export function detectDestination(address: string, postalCode: string): "CANADA" | "USA" | "" {
  const pc = (postalCode || "").trim();
  if (pc && /^[A-Za-z]/.test(pc)) return "CANADA";
  if (pc && /^\d{5}/.test(pc)) return "USA";
  const addr = address.toLowerCase();
  const caProvinces = [" qc ", " on ", " bc ", " ab ", " mb ", " sk ", " ns ", " nb ", " nl ", " pe ", " nt ", " yt ", " nu ",
    " québec", " ontario", " british columbia", " alberta", " manitoba"];
  if (caProvinces.some(p => addr.includes(p))) return "CANADA";
  const usStates = [" wa ", " ny ", " ca ", " tx ", " fl ", " il ", " pa ", " oh ", " ga ", " nc ", " mi ", " nj ", " va ",
    " az ", " ma ", " tn ", " in ", " mo ", " md ", " wi ", " co ", " mn ", " sc ", " al ", " la ", " ky ", " or ", " ok ",
    " ct ", " ut ", " ia ", " nv ", " ar ", " ms ", " ks ", " ne ", " nm ", " wv ", " id ", " hi ", " nh ", " me ", " ri ",
    " mt ", " de ", " sd ", " nd ", " ak ", " dc ", " vt ", " wy "];
  if (usStates.some(s => addr.includes(s))) return "USA";
  return "";
}

export function detectProvince(address: string): string {
  const addr = " " + address.toUpperCase() + " ";
  const map: [string, string][] = [
    [" QC ", "QC"], [",QC ", "QC"], [", QC", "QC"], [" QUÉBEC", "QC"], [" QUEBEC", "QC"],
    [" ON ", "ON"], [",ON ", "ON"], [", ON", "ON"], [" ONTARIO", "ON"],
    [" BC ", "BC"], [",BC ", "BC"], [", BC", "BC"], [" BRITISH COLUMBIA", "BC"],
    [" AB ", "AB"], [",AB ", "AB"], [", AB", "AB"], [" ALBERTA", "AB"],
    [" SK ", "SK"], [",SK ", "SK"], [", SK", "SK"], [" SASKATCHEWAN", "SK"],
    [" MB ", "MB"], [",MB ", "MB"], [", MB", "MB"], [" MANITOBA", "MB"],
    [" NB ", "NB"], [",NB ", "NB"], [", NB", "NB"], [" NEW BRUNSWICK", "NB"],
    [" NS ", "NS"], [",NS ", "NS"], [", NS", "NS"], [" NOVA SCOTIA", "NS"],
    [" PE ", "PE"], [",PE ", "PE"], [", PE", "PE"], [" PRINCE EDWARD", "PE"],
    [" NL ", "NL"], [",NL ", "NL"], [", NL", "NL"], [" NEWFOUNDLAND", "NL"],
    [" NT ", "NT"], [",NT ", "NT"], [", NT", "NT"], [" NORTHWEST", "NT"],
    [" YT ", "YT"], [",YT ", "YT"], [", YT", "YT"], [" YUKON", "YT"],
    [" NU ", "NU"], [",NU ", "NU"], [", NU", "NU"], [" NUNAVUT", "NU"],
  ];
  for (const [pattern, code] of map) {
    if (addr.includes(pattern)) return code;
  }
  return "";
}

export function computeTaxLines(province: string, taxableAmount: number): TaxLine[] {
  if (!province) return [];
  const TVH15 = ["NB", "NS", "PE", "NL"];
  if (TVH15.includes(province)) return [{ label: "TVH (15%)", rate: 0.15, amount: taxableAmount * 0.15 }];
  if (province === "ON") return [{ label: "TVH (13%)", rate: 0.13, amount: taxableAmount * 0.13 }];
  const lines: TaxLine[] = [{ label: "TPS (5%)", rate: 0.05, amount: taxableAmount * 0.05 }];
  if (province === "QC") lines.push({ label: "TVQ (9.975%)", rate: 0.09975, amount: taxableAmount * 0.09975 });
  else if (province === "BC") lines.push({ label: "PST (7%)", rate: 0.07, amount: taxableAmount * 0.07 });
  else if (province === "SK") lines.push({ label: "PST (6%)", rate: 0.06, amount: taxableAmount * 0.06 });
  else if (province === "MB") lines.push({ label: "PST (7%)", rate: 0.07, amount: taxableAmount * 0.07 });
  return lines;
}
