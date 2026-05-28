export const formatCurrency = (val) =>
  new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(val || 0);

export const formatMillion = (val) => `${((val || 0) / 1000000).toFixed(2)} млн`;

export const formatRevenueShare = (value, revenue) => {
  if (!revenue) {
    return "0.0%";
  }

  return `${((Math.abs(value || 0) / revenue) * 100).toFixed(1)}%`;
};
