export const anonymousWorksheetsKey = "mathsheets.anonymous.worksheets";
export const anonymousImportDecisionKey = "mathsheets.anonymous.import-decision";

export const createAnonymousWorksheetStore = (storageKey = anonymousWorksheetsKey) => ({
  load: <T>() => JSON.parse(localStorage.getItem(storageKey) ?? "[]") as T[],
  save: <T>(worksheets: T[]) => localStorage.setItem(storageKey, JSON.stringify(worksheets)),
  clear: () => localStorage.removeItem(storageKey)
});
