import XLSX from "xlsx";
import fs from "fs";

const CURRENCY_MAP: Record<string, string> = {
  "₹": "INR",
  $: "USD",
  $US: "USD",
  "€": "EUR",
  "£": "GBP",
  "¥": "JPY",
  "₩": "KRW",
  "₺": "TRY",
  "₴": "UAH",
  "₦": "NGN",
  "₱": "PHP",
  "₫": "VND",
  "฿": "THB",
  R$: "BRL",
  R: "ZAR",
  S$: "SGD",
  A$: "AUD",
  C$: "CAD",
  HK$: "HKD",
  MX$: "MXN",
  kr: "SEK",
  zł: "PLN",
  Kč: "CZK",
  Ft: "HUF",
  RM: "MYR",
  "₪": "ILS",
  "﷼": "SAR",
  "د.إ": "AED",
  EGP: "EGP",
  PKR: "PKR",
};

function sanitize(value: string | number | boolean | null | undefined) {
  if (value === null || value === undefined) return null;
  const str = String(value).trim();
  return str === "" || str.toLowerCase() === "nan" ? null : str;
}

function parseBool(value: string | number | boolean | null | undefined) {
  if (value === null || value === undefined) return null;
  const str = String(value).trim().toUpperCase();
  if (str === "Y" || str === "YES" || str === "TRUE" || str === "1")
    return true;
  if (str === "N" || str === "NO" || str === "FALSE" || str === "0")
    return false;
  return null;
}

type ExcelCell = string | number | boolean | null | undefined;
type ExcelRow = ExcelCell[];

type RequiredPricingColumn =
  | "Region"
  | "Country"
  | "Operator"
  | "New Price (USD)";

type OptionalPricingColumn =
  | "Network"
  | "CC Code"
  | "MCC"
  | "MNC"
  | "Route Type"
  | "Dynamic Alphanumeric"
  | "Dynamic Shortcode"
  | "Dynamic Numeric"
  | "Delivery Report"
  | "Remarks";

type PricingColumn = RequiredPricingColumn | OptionalPricingColumn;
type ColumnIndexMap = Partial<Record<PricingColumn, number>>;

export type PricingEntry = {
  operator: string;
  network: string | null;
  ccCode: string | null;
  mcc: string | null;
  mnc: string | null;
  priceUSD: number | null;
  routeType: string | null;
  dynamicAlphanumeric: boolean | null;
  dynamicShortcode: boolean | null;
  dynamicNumeric: boolean | null;
  deliveryReport: boolean | null;
  remarks: string | null;
};

export type GlobalPricing = Record<string, Record<string, PricingEntry[]>>;
export type FlatPricingEntry = PricingEntry & {
  region: string;
  country: string;
};

const PRICING_COLUMNS = [
  "Region",
  "Country",
  "Operator",
  "New Price (USD)",
  "Network",
  "CC Code",
  "MCC",
  "MNC",
  "Route Type",
  "Dynamic Alphanumeric",
  "Dynamic Shortcode",
  "Dynamic Numeric",
  "Delivery Report",
  "Remarks",
] as const satisfies readonly PricingColumn[];

const REQUIRED_COLUMNS = [
  "Region",
  "Country",
  "Operator",
  "New Price (USD)",
] as const satisfies readonly RequiredPricingColumn[];

function isPricingColumn(value: string): value is PricingColumn {
  return PRICING_COLUMNS.includes(value as PricingColumn);
}

function getCell(
  row: ExcelRow,
  columns: ColumnIndexMap,
  column: PricingColumn,
): ExcelCell {
  const columnIndex = columns[column];
  return columnIndex === undefined ? undefined : row[columnIndex];
}

function parsePrice(value: ExcelCell): number | null {
  if (value === null || value === undefined || typeof value === "boolean") {
    return null;
  }

  const parsed = Number.parseFloat(String(value));
  return Number.isNaN(parsed) ? null : parsed;
}

export function parseGlobalPricingSMS(filePath: string): GlobalPricing {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  // Convert to array of arrays to handle merged header rows
  const raw = XLSX.utils.sheet_to_json<ExcelRow>(sheet, {
    header: 1,
    defval: null,
  });

  // Row 0 is the company title, Row 1 is the actual header row
  const HEADER_ROW_INDEX = 1;
  const headerRow = raw[HEADER_ROW_INDEX];

  if (!headerRow) {
    throw new Error("Header row not found in sheet.");
  }

  const headers = headerRow.map((h: ExcelCell) =>
    h !== null ? String(h).trim() : null,
  );

  // Map header names to column indices dynamically
  const col: ColumnIndexMap = {};
  headers.forEach((h: string | null, i: number) => {
    if (h && isPricingColumn(h)) col[h] = i;
  });

  REQUIRED_COLUMNS.forEach((c: RequiredPricingColumn) => {
    if (col[c] === undefined)
      throw new Error(`Required column "${c}" not found in sheet.`);
  });

  const result: GlobalPricing = {};

  // Data starts from row after headers
  for (let i = HEADER_ROW_INDEX + 1; i < raw.length; i++) {
    const row = raw[i];
    if (!row || row.every((cell: ExcelCell) => cell === null)) continue; // skip empty rows

    const region = sanitize(getCell(row, col, "Region"));
    const country = sanitize(getCell(row, col, "Country"));
    const operator = sanitize(getCell(row, col, "Operator"));

    if (!region || !country || !operator) continue; // skip rows without required fields

    const entry: PricingEntry = {
      operator,
      network: sanitize(getCell(row, col, "Network")),
      ccCode: sanitize(getCell(row, col, "CC Code")),
      mcc: sanitize(getCell(row, col, "MCC")),
      mnc: sanitize(getCell(row, col, "MNC")),
      priceUSD: parsePrice(getCell(row, col, "New Price (USD)")),
      routeType: sanitize(getCell(row, col, "Route Type")),
      dynamicAlphanumeric: parseBool(getCell(row, col, "Dynamic Alphanumeric")),
      dynamicShortcode: parseBool(getCell(row, col, "Dynamic Shortcode")),
      dynamicNumeric: parseBool(getCell(row, col, "Dynamic Numeric")),
      deliveryReport: parseBool(getCell(row, col, "Delivery Report")),
      remarks: sanitize(getCell(row, col, "Remarks")),
    };

    if (!result[region]) result[region] = {};
    if (!result[region][country]) result[region][country] = [];
    result[region][country].push(entry);
  }

  return result;
}

export function getFlatList(data: GlobalPricing): FlatPricingEntry[] {
  const rows: FlatPricingEntry[] = [];
  for (const [region, countries] of Object.entries(data)) {
    for (const [country, operators] of Object.entries(countries)) {
      for (const op of operators) {
        rows.push({ region, country, ...op });
      }
    }
  }
  return rows;
}

//whatsapp

export function parsePricingCSV(filePath: string) {
  const raw = fs.readFileSync(filePath, "utf8");
  const lines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const headerIdx = lines.findIndex((l) => l.startsWith("Market"));
  if (headerIdx === -1) throw new Error("Header not found: " + filePath);

  let dataStartIdx = headerIdx + 1;
  const next = lines[dataStartIdx];
  if (!next.includes(",") || next.split(",").length < 4) dataStartIdx++;

  const records = [];
  for (let i = dataStartIdx; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.replace(/^"|"$/g, "").trim());
    if (cols.length < 5) continue;

    const [
      market,
      currency,
      marketing,
      utility,
      authentication,
      authIntl,
      service,
    ] = cols;
    const toVal = (v: string) => (!v || v === "n/a" ? null : parseFloat(v));

    records.push({
      market,
      currency,
      marketing: toVal(marketing),
      utility: toVal(utility),
      authentication: toVal(authentication),
      authentication_intl: toVal(authIntl),
      service: toVal(service),
      source_file: filePath,
    });
  }
  return records;
}

export function parseCallingRatesCSV(filePath: string) {
  const raw = fs.readFileSync(filePath, "utf8");

  const rows: string[][] = [];
  let current = "";

  for (const char of raw) {
    current += char;
    if (char === "\n") {
      const quoteCount = (current.match(/"/g) || []).length;
      if (quoteCount % 2 === 0) {
        const cleaned = current.replace(/\r?\n$/, "");
        rows.push(parseCSVLine(cleaned));
        current = "";
      }
    }
  }
  if (current.trim()) rows.push(parseCSVLine(current));

  const headerIdx = rows.findIndex(
    (row) =>
      row.some((c) => c.trim() === "Currency") &&
      row.some((c) => c.trim() === "From") &&
      row.some((c) => c.trim() === "Rate"),
  );
  if (headerIdx === -1) throw new Error("Header row not found: " + filePath);

  const header = rows[headerIdx].map((c) => c.trim());
  const ci = (name: string) => header.findIndex((h) => h === name);

  const iCurrency = ci("Currency");
  const iFrom = ci("From");
  const iTo = ci("To");
  const iRateType = ci("Rate type");
  const iRate = ci("Rate");

  const toMinutes = (v: string): number | null => {
    if (!v || v.trim() === "--") return null;
    const n = parseInt(v.replace(/,/g, ""), 10);
    return isNaN(n) ? null : n;
  };

  const records = [];
  let currentMarket: string | null = null;

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.every((c) => !c.trim())) continue;

    const rawMarket = row[0]?.trim();
    if (rawMarket) currentMarket = rawMarket;
    if (!currentMarket) continue;

    const currency = row[iCurrency]?.trim();
    const rateType = row[iRateType]?.trim();
    const rawRate = row[iRate]?.trim();
    if (!currency || !rawRate) continue;

    const rate = parseFloat(rawRate);
    if (isNaN(rate)) continue;

    records.push({
      market: currentMarket,
      currency: CURRENCY_MAP[currency] ?? currency,
      from_minutes: toMinutes(row[iFrom]) ?? 0,
      to_minutes: toMinutes(row[iTo]),
      rate_type: rateType,
      rate,
      source_file: filePath,
    });
  }

  return records;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cell += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(cell);
      cell = "";
    } else {
      cell += ch;
    }
  }
  result.push(cell);
  return result;
}
