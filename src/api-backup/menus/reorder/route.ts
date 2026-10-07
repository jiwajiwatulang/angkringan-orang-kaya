import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const { items } = await request.json();

    await prisma.$transaction(
      items.map((item: { id: number; urutan: number }) =>
        prisma.menuItem.update({
          where: { id: item.id },
          data: { urutan: item.urutan },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: 'Gagal mengatur ulang urutan' }, { status: 500 });
  }
}
