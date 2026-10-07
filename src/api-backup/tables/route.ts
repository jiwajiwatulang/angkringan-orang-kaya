import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const tables = await prisma.table.findMany({
    orderBy: { id: 'asc' }
  });
  return NextResponse.json(tables);
}

export async function PUT(request: Request) {
  const { id, status } = await request.json();
  const updatedTable = await prisma.table.update({
    where: { id },
    data: { status }
  });
  return NextResponse.json(updatedTable);
}
