import { NextResponse } from 'next/server';

import { fetchEnterpriseAssistants } from '@/lib/ai/connector';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const result = await fetchEnterpriseAssistants({
    courseId: url.searchParams.get('courseId'),
    companyId: url.searchParams.get('companyId'),
  });

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error, data: result.data },
      { status: result.status },
    );
  }

  return NextResponse.json(result.data, {
    status: 200,
    headers: { 'Cache-Control': 'no-store' },
  });
}
