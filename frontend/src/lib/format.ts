export const formatPercent = (value: number | null | undefined) => `${Number(value ?? 0).toFixed(1)}%`;

export const formatDate = (value: string | null | undefined) =>
  value ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value)) : "Not yet";
