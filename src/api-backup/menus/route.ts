import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const menus = await prisma.menuItem.findMany({
    orderBy: [
      { urutan: 'asc' },
      { id: 'asc' }
    ]
  });
  return NextResponse.json(menus);
}

export async function POST(request: Request) {
  const { nama, harga, kategori } = await request.json();
  const newMenu = await prisma.menuItem.create({
    data: {
      nama,
      harga: parseInt(harga),
      kategori
    }
  });
  return NextResponse.json(newMenu);
}

export async function DELETE(request: Request) {
  try {
    const { id, ids } = await request.json();
    
    if (ids && Array.isArray(ids)) {
      await prisma.menuItem.deleteMany({
        where: { id: { in: ids } }
      });
    } else if (id) {
      await prisma.menuItem.delete({
        where: { id }
      });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
