import { Context } from "@oak/oak/context";

export function cors() {
  return async (ctx: Context, next: () => Promise<unknown>) => {
    ctx.response.headers.set("Access-Control-Allow-Origin", "*");
    ctx.response.headers.set(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, OPTIONS",
    );
    ctx.response.headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization",
    );

    if (ctx.request.method === "OPTIONS") {
      ctx.response.status = 200;
      return;
    }

    await next();
  };
}
