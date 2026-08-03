import { en } from "./en";

const translations: Record<string, typeof en> = { en };

let currentLocale = "en";

export function setLocale(locale: string) {
  if (translations[locale]) {
    currentLocale = locale;
  }
}

export function t(path: string, vars?: Record<string, string | number>): string {
  const keys = path.split(".");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let value: any = translations[currentLocale] || translations.en;

  for (const key of keys) {
    value = value?.[key];
    if (value === undefined) return path;
  }

  if (typeof value !== "string") return path;

  if (vars) {
    return Object.entries(vars).reduce(
      (str, [k, v]) => str.replace(`{{${k}}}`, String(v)),
      value
    );
  }

  return value;
}
