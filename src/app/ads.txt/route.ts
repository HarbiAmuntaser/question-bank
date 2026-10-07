import { getAdsTxtLine, getAdSenseRuntimeConfig } from "@/lib/adsense/config";

export const dynamic = "force-dynamic";

export async function GET() {
  const { identity } = getAdSenseRuntimeConfig();
  if (!identity) {
    return new Response("Not found\n", {
      status: 404,
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "private, no-store",
      },
    });
  }

  return new Response(`${getAdsTxtLine(identity)}\n`, {
    status: 200,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
