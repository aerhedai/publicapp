import { NextResponse } from "next/server";
export async function GET() {
  return NextResponse.json({ hasBypassSecret: !!process.env.VERCEL_AUTOMATION_BYPASS_SECRET });
}
