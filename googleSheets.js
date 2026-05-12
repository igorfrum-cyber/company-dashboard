const MONTH_SPECS = [
  { name: "Январь", candidates: ["Январь"] },
  { name: "Февраль", candidates: ["Февраль", "Февраль "] },
  { name: "Март", candidates: ["Март"] },
  { name: "Апрель", candidates: ["Апрель", "Апрель "] },
  { name: "Май", candidates: ["Май"] },
  { name: "Июнь", candidates: ["Июнь"] },
  { name: "Июль", candidates: ["Июль"] },
  { name: "Август", candidates: ["Август"] },
  { name: "Сентябрь", candidates: ["Сентябрь", "Сентбрь", "Сентбрь ", "Сентяюрь"] },
  { name: "Октябрь", candidates: ["Октябрь"] },
  { name: "Ноябрь", candidates: ["Ноябрь", "Ноябрь "] },
  { name: "Декабрь", candidates: ["Декабрь"] },
];

const normalizeText = (value) =>
  String(value ?? "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[().,:-]/g, "")
    .trim();

const toNumber = (value) => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed || trimmed.includes("#DIV/0")) {
      return 0;
    }
    const normalized = trimmed.replace(/\s/g, "").replace(",", ".");
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const parseGvizResponse = (text) => {
  const match = text.match(/setResponse\(([\s\S]+)\);/);
  if (!match?.[1]) {
    throw new Error("Не удалось распарсить ответ Google Sheets.");
  }
  const payload = JSON.parse(match[1]);
  if (payload.status === "error") {
    throw new Error(payload.errors?.[0]?.detailed_message || "Google Sheets вернул ошибку.");
  }
  return payload.table || { rows: [] };
};

const fetchSheetRows = async (sheetId, sheetName) => {
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Google Sheets недоступен (${response.status}).`);
  }

  const text = await response.text();
  const table = parseGvizResponse(text);
  return (table.rows || []).map((row) => (row.c || []).map((cell) => cell?.v ?? null));
};

const readMetricMap = (rows) => {
  const metrics = new Map();

  for (const row of rows) {
    const rawLabel = row[0];
    const rawValue = row[1];
    if (typeof rawLabel !== "string") {
      continue;
    }
    const label = normalizeText(rawLabel);
    if (!label) {
      continue;
    }

    metrics.set(label, toNumber(rawValue));
  }
  return metrics;
};

const readByPrefixes = (metrics, prefixes) => {
  for (const prefix of prefixes) {
    const normalizedPrefix = normalizeText(prefix);
    for (const [label, value] of metrics.entries()) {
      if (label.startsWith(normalizedPrefix)) {
        return value;
      }
    }
  }
  return 0;
};

const pickMonthRows = async (sheetId, candidates) => {
  let lastError;
  for (const candidate of candidates) {
    try {
      const rows = await fetchSheetRows(sheetId, candidate);
      return rows;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error("Не удалось прочитать лист месяца.");
};

const parseMonth = async (sheetId, spec) => {
  const rows = await pickMonthRows(sheetId, spec.candidates);
  const metrics = readMetricMap(rows);

  const revenue = readByPrefixes(metrics, ["Выручка"]);
  const grossProfit = readByPrefixes(metrics, ["Валовая прибыль"]);
  const ebitda = readByPrefixes(metrics, ["EBITDA"]);
  const netProfit = readByPrefixes(metrics, ["Чистая прибыль"]);
  const opex = readByPrefixes(metrics, ["Операционные расходы"]);
  const salaries = readByPrefixes(metrics, ["Зарплата сотрудников", "Зарплаты сотрудников"]);
  const delivery = readByPrefixes(metrics, ["Доставка покупателю"]);
  const tvIncome = readByPrefixes(metrics, ["Доходы ТВ"]);
  const tvDividends = readByPrefixes(metrics, ["Дивиденды"]);
  const tvOtherIncome = readByPrefixes(metrics, ["Прочие доходы"]);

  if (revenue <= 0) {
    return null;
  }

  const opexOther = Math.max(opex - salaries - delivery, 0);

  return {
    name: spec.name,
    revenue,
    grossProfit,
    ebitda,
    netProfit,
    cogs: revenue - grossProfit,
    opex,
    taxes: ebitda - netProfit,
    ebitdaMargin: revenue > 0 ? Number(((ebitda / revenue) * 100).toFixed(1)) : 0,
    netMargin: revenue > 0 ? Number(((netProfit / revenue) * 100).toFixed(1)) : 0,
    tvIncome,
    tvDividends,
    tvOtherIncome,
    opexDetails: {
      salaries,
      delivery,
      other: opexOther,
    },
  };
};

export const loadDashboardDataFromGoogleSheets = async (sheetId) => {
  const parsed = await Promise.all(MONTH_SPECS.map((spec) => parseMonth(sheetId, spec)));
  return parsed.filter(Boolean);
};
