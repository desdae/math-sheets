export type WorksheetSummaryRecord = {
  id: string;
  title: string;
  status: "draft" | "partial" | "completed";
  difficulty: "easy" | "medium" | "hard";
  problemCount: number;
  allowedOperations: Array<"+" | "-" | "*" | "/">;
  numberRangeMin: number;
  numberRangeMax: number;
  worksheetSize: "small" | "medium" | "large";
  cleanDivisionOnly?: boolean;
  source?: string;
  createdAt: string;
  submittedAt?: string | null;
  elapsedSeconds?: number;
  result?: {
    scoreCorrect: number;
    scoreTotal: number;
    accuracyPercentage: number;
  };
};

export type WorksheetChip = {
  key: string;
  value: string;
  label: string;
  kind: "status" | "difficulty" | "operation" | "range" | "size";
};

export type WorksheetGroup = {
  key: "today" | "week" | "earlier";
  label: "Today" | "This week" | "Earlier";
  items: WorksheetSummaryRecord[];
};

const operationLabels = {
  "+": "addition",
  "-": "subtraction",
  "*": "multiplication",
  "/": "division"
} as const;

const dateFilterLabels = {
  "date:today": "Today",
  "date:this-week": "This week",
  "date:earlier": "Earlier"
} as const;

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const dayDifference = (left: Date, right: Date) => {
  const leftDay = startOfDay(left).getTime();
  const rightDay = startOfDay(right).getTime();
  return Math.floor((leftDay - rightDay) / 86_400_000);
};

export const buildWorksheetChips = (record: WorksheetSummaryRecord): WorksheetChip[] => {
  const operationChips = record.allowedOperations.map((operation) => ({
    key: `operation:${operationLabels[operation]}`,
    value: operationLabels[operation],
    label: operationLabels[operation],
    kind: "operation" as const
  }));

  return [
    {
      key: `status:${record.status}`,
      value: record.status,
      label: record.status,
      kind: "status"
    },
    {
      key: `difficulty:${record.difficulty}`,
      value: record.difficulty,
      label: record.difficulty,
      kind: "difficulty"
    },
    ...operationChips,
    {
      key: `size:${record.worksheetSize}`,
      value: record.worksheetSize,
      label: `${record.worksheetSize} sheet`,
      kind: "size"
    },
    {
      key: `range:${record.numberRangeMin}-${record.numberRangeMax}`,
      value: `${record.numberRangeMin}-${record.numberRangeMax}`,
      label: `${record.numberRangeMin}-${record.numberRangeMax}`,
      kind: "range"
    }
  ];
};

export const filterWorksheetRecords = (records: WorksheetSummaryRecord[], activeFilters: Set<string>) => {
  if (activeFilters.size === 0) {
    return records;
  }

  return records.filter((record) => {
    const values = new Set(buildWorksheetChips(record).map((chip) => chip.value));
    const createdAt = new Date(record.createdAt);

    return Array.from(activeFilters).every((value) => {
      if (value === "date:today") {
        return dayDifference(new Date(), createdAt) <= 0;
      }

      if (value === "date:this-week") {
        const ageInDays = dayDifference(new Date(), createdAt);
        return ageInDays >= 0 && ageInDays <= 6;
      }

      if (value === "date:earlier") {
        return dayDifference(new Date(), createdAt) > 6;
      }

      return values.has(value);
    });
  });
};

export const getWorksheetFilterLabel = (value: string, records: WorksheetSummaryRecord[]) => {
  if (value in dateFilterLabels) {
    return dateFilterLabels[value as keyof typeof dateFilterLabels];
  }

  for (const record of records) {
    const matchingChip = buildWorksheetChips(record).find((chip) => chip.value === value);

    if (matchingChip) {
      return matchingChip.label;
    }
  }

  return value;
};

export const buildWorksheetDateGroups = (records: WorksheetSummaryRecord[], now = new Date()): WorksheetGroup[] => {
  const today: WorksheetSummaryRecord[] = [];
  const week: WorksheetSummaryRecord[] = [];
  const earlier: WorksheetSummaryRecord[] = [];

  const sortedRecords = [...records].sort((left, right) => {
    return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
  });

  for (const record of sortedRecords) {
    const ageInDays = dayDifference(now, new Date(record.createdAt));

    if (ageInDays <= 0) {
      today.push(record);
    } else if (ageInDays <= 6) {
      week.push(record);
    } else {
      earlier.push(record);
    }
  }

  return [
    { key: "today", label: "Today", items: today },
    { key: "week", label: "This week", items: week },
    { key: "earlier", label: "Earlier", items: earlier }
  ];
};

export const formatWorksheetTimestamp = (isoDate: string, now = new Date()) => {
  const date = new Date(isoDate);
  const ageInDays = dayDifference(now, date);

  if (ageInDays <= 0) {
    return `Today at ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  }

  if (ageInDays <= 6) {
    return date.toLocaleDateString([], { weekday: "long", hour: "2-digit", minute: "2-digit" });
  }

  return date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
};

export const formatElapsedTime = (elapsedSeconds: number) => {
  const safeSeconds = Math.max(0, Math.floor(elapsedSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};
