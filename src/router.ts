import { Router as OakRouter } from "@oak/oak/router";
import { getCountries } from "./api/countries.ts";
import { searchLocalities } from "./api/localities.ts";
import { servePmtiles } from "./api/pmtiles.ts";
import { handleError, handleSuccess } from "./utils/resp.ts";

export const Router = new OakRouter();

Router.get("/countries", async (ctx) => {
  try {
    const countries = await getCountries();
    handleSuccess(ctx, countries);
  } catch (error) {
    handleError(ctx, error);
  }
});

Router.get("/countries/:countryCode/localities", async (ctx) => {
  try {
    const countryCode = ctx.params.countryCode;
    const query = ctx.request.url.searchParams.get("q") || undefined;

    const pageParam = ctx.request.url.searchParams.get("page");

    const page = pageParam ? parseInt(pageParam, 10) : 1;

    if (Number.isNaN(page) || page < 1) {
      ctx.response.status = 400;
      ctx.response.body = {
        success: false,
        error: "Page must be a positive integer",
      };
      ctx.response.type = "json";
      return;
    }

    const result = await searchLocalities(countryCode, query, page);
    ctx.response.body = {
      success: true,
      data: result.data,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    };
    ctx.response.type = "json";
  } catch (error) {
    handleError(ctx, error);
  }
});

Router.get("/countries/:countryCode/localities/:id/pmtiles", async (ctx) => {
  try {
    const countryCode = ctx.params.countryCode;
    const localityId = ctx.params.id;

    const response = await servePmtiles(countryCode, localityId);

    if (!response) {
      ctx.response.status = 404;
      ctx.response.body = {
        success: false,
        error: "Pmtiles file not found",
      };
      ctx.response.type = "json";
      return;
    }

    response.headers.forEach((value, key) => {
      ctx.response.headers.set(key, value);
    });

    ctx.response.status = response.status;
    ctx.response.body = response.body;
  } catch (error) {
    handleError(ctx, error);
  }
});
