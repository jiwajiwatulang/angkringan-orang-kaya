import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const { items, total, customerName, customerPhone, paymentMethod, orderType } = await request.json();

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Buat record Order tanpa meja
      const newOrder = await tx.order.create({
        data: {
          total,
          status: 'paid',
          customerName,
          customerPhone,
          paymentMethod,
          orderType,
          items: {
            create: items.map((item: any) => ({
              menuItemId: item.id,
              qty: item.qty,
              hargaSatuan: item.harga
            }))
          }
        }
      });

      return newOrder;
    });

    return NextResponse.json({ success: true, order: result });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: 'Gagal memproses pembayaran' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const { id, items, total, customerName, customerPhone, paymentMethod, orderType, tableId, status } = await request.json();

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Delete old items
      await tx.orderItem.deleteMany({
        where: { orderId: id }
      });

      // Update order and insert new items
      const updatedOrder = await tx.order.update({
        where: { id },
        data: {
          total,
          status: status || 'paid',
          customerName,
          customerPhone,
          paymentMethod,
          orderType,
          tableId,
          items: {
            create: items.map((item: any) => ({
              menuItemId: item.id || item.menuItemId,
              qty: item.qty,
              hargaSatuan: item.harga || item.hargaSatuan
            }))
          }
        }
      });

      return updatedOrder;
    });

    return NextResponse.json({ success: true, order: result });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: 'Gagal mengupdate pesanan' }, { status: 500 });
  }
}

export async function GET() {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      table: true,
      items: {
        include: {
          menuItem: true
        }
      }
    }
  });
  return NextResponse.json(orders);
}

export async function DELETE(request: Request) {
  try {
    const { id, ids } = await request.json();
    
    if (ids && Array.isArray(ids)) {
      await prisma.order.deleteMany({
        where: { id: { in: ids } }
      });
    } else if (id) {
      await prisma.order.delete({
        where: { id }
      });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Gagal menghapus data' }, { status: 500 });
  }
}
