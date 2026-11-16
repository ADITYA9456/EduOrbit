import { getJudgeConfig, publicLanguages } from '@/lib/judge/config';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Reports whether a judge is configured. Never returns the URL or key.
export async function GET() {
  return NextResponse.json({ configured: getJudgeConfig().configured, languages: publicLanguages() });
}
