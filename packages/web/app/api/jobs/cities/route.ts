import { NextResponse } from 'next/server';
import { listCitiesService } from '../../../../lib/search/search.service';

export async function GET() {
  const cities = await listCitiesService();
  return NextResponse.json(cities);
}
