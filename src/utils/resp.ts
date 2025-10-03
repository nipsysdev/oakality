export function handleError(
  ctx: { response: { status: number; body: unknown; type?: string } },
  error: unknown,
) {
  ctx.response.status = 500;
  ctx.response.body = {
    success: false,
    error: error instanceof Error ? error.message : String(error),
  };
  ctx.response.type = "json";
}

export function handleSuccess<T>(
  ctx: { response: { body: unknown; type?: string } },
  data: T,
) {
  ctx.response.body = {
    success: true,
    data,
  };
  ctx.response.type = "json";
}
