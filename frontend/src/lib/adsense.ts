export type AdSenseConfig = {
  enabled: boolean;
  clientId: string;
  inlineSlotId: string;
};

const ALLOWED_AD_PATHS = new Set(["/", "/privacy", "/terms", "/leaderboard"]);

let scriptPromise: Promise<void> | null = null;

export function resolveAdsenseConfig(
  env: Record<string, string | boolean | undefined> = import.meta.env as unknown as Record<string, string | boolean | undefined>
): AdSenseConfig {
  const clientId = String(env.VITE_ADSENSE_CLIENT_ID ?? "").trim();
  const inlineSlotId = String(env.VITE_ADSENSE_INLINE_SLOT_ID ?? "").trim();
  const enabledFlag = String(env.VITE_ENABLE_ADSENSE ?? "false") === "true";
  const isProduction = env.PROD === true || env.MODE === "production";

  return {
    enabled: Boolean(isProduction && enabledFlag && clientId && inlineSlotId),
    clientId,
    inlineSlotId
  };
}

export function canRenderAdsOnPath(path: string) {
  return ALLOWED_AD_PATHS.has(path);
}

export async function ensureAdsenseScript(clientId: string) {
  if (typeof document === "undefined" || !clientId) {
    return;
  }

  if (document.querySelector('script[data-mathsheets-adsense="true"]')) {
    return;
  }

  if (!scriptPromise) {
    scriptPromise = new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.async = true;
      script.crossOrigin = "anonymous";
      script.dataset.mathsheetsAdsense = "true";
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(clientId)}`;
      script.addEventListener("load", () => resolve(), { once: true });
      script.addEventListener("error", () => reject(new Error("Failed to load AdSense script")), { once: true });
      document.head.appendChild(script);
    });
  }

  return scriptPromise;
}
