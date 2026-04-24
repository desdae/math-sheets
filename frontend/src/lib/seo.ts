import type { RouteLocationNormalizedLoaded, RouteMeta } from "vue-router";

const defaultSiteUrl = "https://mathsheet.app";
const defaultTitle = "MathSheets | Printable Math Worksheets and Practice";
const defaultDescription =
  "Generate printable math worksheets for addition, subtraction, multiplication, and division practice.";
const defaultKeywords =
  "math worksheets, printable math worksheets, arithmetic practice, addition worksheets, subtraction worksheets, multiplication worksheets, division worksheets, homeschool math, teacher resources, student practice";

type SchemaNode = Record<string, unknown>;

type SeoMeta = {
  title?: string;
  description?: string;
  robots?: string;
  canonicalPath?: string;
  keywords?: string;
  imagePath?: string;
  schema?: SchemaNode[];
};

const resolveSiteUrl = () => {
  const configuredSiteUrl = String(import.meta.env.VITE_SITE_URL ?? "").trim();
  return (configuredSiteUrl || defaultSiteUrl).replace(/\/$/, "");
};

const upsertHeadTag = (selector: string, createElement: () => HTMLElement, update: (element: HTMLElement) => void) => {
  if (typeof document === "undefined") {
    return;
  }

  const existingElement = document.head.querySelector<HTMLElement>(selector);
  const element = existingElement ?? createElement();

  update(element);

  if (!existingElement) {
    document.head.appendChild(element);
  }
};

const removeHeadTag = (selector: string) => {
  if (typeof document === "undefined") {
    return;
  }

  document.head.querySelector(selector)?.remove();
};

const removeSeoSchemaScripts = () => {
  if (typeof document === "undefined") {
    return;
  }

  document.head.querySelectorAll('script[data-seo-schema="true"]').forEach((node) => node.remove());
};

const appendSeoSchema = (schema: SchemaNode[]) => {
  if (typeof document === "undefined") {
    return;
  }

  removeSeoSchemaScripts();

  for (const node of schema) {
    const script = document.createElement("script");
    script.setAttribute("type", "application/ld+json");
    script.setAttribute("data-seo-schema", "true");
    script.textContent = JSON.stringify(node);
    document.head.appendChild(script);
  }
};

export const applySeo = (meta: SeoMeta = {}) => {
  if (typeof document === "undefined") {
    return;
  }

  const siteUrl = resolveSiteUrl();
  const title = meta.title || defaultTitle;
  const description = meta.description || defaultDescription;
  const keywords = meta.keywords || defaultKeywords;
  const robots = meta.robots || "index, follow";
  const canonicalPath = meta.canonicalPath ?? (typeof window !== "undefined" ? window.location.pathname : "/");
  const canonicalUrl = `${siteUrl}${canonicalPath.startsWith("/") ? canonicalPath : `/${canonicalPath}`}`;
  const imageUrl = meta.imagePath
    ? `${siteUrl}${meta.imagePath.startsWith("/") ? meta.imagePath : `/${meta.imagePath}`}`
    : undefined;

  document.title = title;

  upsertHeadTag('meta[name="description"]', () => document.createElement("meta"), (element) => {
    element.setAttribute("name", "description");
    element.setAttribute("content", description);
  });

  upsertHeadTag('meta[name="keywords"]', () => document.createElement("meta"), (element) => {
    element.setAttribute("name", "keywords");
    element.setAttribute("content", keywords);
  });

  upsertHeadTag('meta[name="robots"]', () => document.createElement("meta"), (element) => {
    element.setAttribute("name", "robots");
    element.setAttribute("content", robots);
  });

  upsertHeadTag('meta[property="og:title"]', () => document.createElement("meta"), (element) => {
    element.setAttribute("property", "og:title");
    element.setAttribute("content", title);
  });

  upsertHeadTag('meta[property="og:description"]', () => document.createElement("meta"), (element) => {
    element.setAttribute("property", "og:description");
    element.setAttribute("content", description);
  });

  upsertHeadTag('meta[property="og:url"]', () => document.createElement("meta"), (element) => {
    element.setAttribute("property", "og:url");
    element.setAttribute("content", canonicalUrl);
  });

  if (imageUrl) {
    upsertHeadTag('meta[property="og:image"]', () => document.createElement("meta"), (element) => {
      element.setAttribute("property", "og:image");
      element.setAttribute("content", imageUrl);
    });
  } else {
    removeHeadTag('meta[property="og:image"]');
  }

  upsertHeadTag('meta[name="twitter:title"]', () => document.createElement("meta"), (element) => {
    element.setAttribute("name", "twitter:title");
    element.setAttribute("content", title);
  });

  upsertHeadTag('meta[name="twitter:description"]', () => document.createElement("meta"), (element) => {
    element.setAttribute("name", "twitter:description");
    element.setAttribute("content", description);
  });

  if (imageUrl) {
    upsertHeadTag('meta[name="twitter:image"]', () => document.createElement("meta"), (element) => {
      element.setAttribute("name", "twitter:image");
      element.setAttribute("content", imageUrl);
    });
  } else {
    removeHeadTag('meta[name="twitter:image"]');
  }

  upsertHeadTag('link[rel="canonical"]', () => document.createElement("link"), (element) => {
    element.setAttribute("rel", "canonical");
    element.setAttribute("href", canonicalUrl);
  });

  appendSeoSchema(meta.schema ?? []);
};

const routeSeo = (meta: RouteMeta, path: string): SeoMeta => ({
  title: typeof meta.title === "string" ? meta.title : undefined,
  description: typeof meta.description === "string" ? meta.description : undefined,
  robots: typeof meta.robots === "string" ? meta.robots : undefined,
  keywords: typeof meta.keywords === "string" ? meta.keywords : undefined,
  imagePath: typeof meta.imagePath === "string" ? meta.imagePath : undefined,
  schema: Array.isArray(meta.schema) ? (meta.schema as SchemaNode[]) : undefined,
  canonicalPath: path
});

export const applyRouteSeo = (route: RouteLocationNormalizedLoaded) => {
  applySeo(routeSeo(route.meta, route.path));
};
