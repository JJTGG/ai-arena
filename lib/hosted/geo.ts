import "server-only";

export function getRequestCountry(
  headers: Headers,
): string {
  const vercelCountry =
    headers
      .get("x-vercel-ip-country")
      ?.trim()
      .toUpperCase();

  if (vercelCountry) {
    return vercelCountry;
  }

  if (process.env.NODE_ENV !== "production") {
    return (
      process.env.HOSTED_DEV_COUNTRY
        ?.trim()
        .toUpperCase() || "ZZ"
    );
  }

  return "ZZ";
}
