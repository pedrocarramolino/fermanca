import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Qué compilación sirve ahora el servidor — ver src/lib/app-version.ts. */
function currentBuild() {
  return NextResponse.json(
    { build: process.env.NEXT_PUBLIC_BUILD_TOKEN ?? "" },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export const GET = currentBuild;
export const POST = currentBuild;
