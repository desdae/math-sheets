declare module "cloudflare:node" {
  export type HttpServerHandlerOptions = {
    port: number;
  };

  export function httpServerHandler(options: HttpServerHandlerOptions): {
    fetch(request: Request, env?: unknown, ctx?: unknown): Promise<Response> | Response;
  };
}

declare module "cloudflare:workers" {
  export const env: Record<string, unknown>;
}
