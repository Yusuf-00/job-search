import { NextRequest, NextResponse } from 'next/server';
import { searchJobsService } from '../../../../lib/search/search.service';

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;

  try {
    const result = await searchJobsService({
      q: params.get('q') ?? undefined,
      city: params.get('city') ?? undefined,
      minSalaryAnnual: params.get('minSalary') ? Number(params.get('minSalary')) : undefined,
      page: params.get('page') ? Number(params.get('page')) : undefined,
      pageSize: params.get('pageSize') ? Number(params.get('pageSize')) : undefined,
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error('Search failed', err);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
