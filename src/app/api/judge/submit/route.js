import { handleJudgeRequest } from '@/lib/judge/handler';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(request) {
  return handleJudgeRequest(request, 'submit');
}
