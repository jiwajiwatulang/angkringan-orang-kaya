import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  console.log('Seeding data...')
  
  // Seed Tables (15 Meja)
  for (let i = 1; i <= 15; i++) {
    await prisma.table.upsert({
      where: { nomor: `Meja ${i}` },
      update: {},
      create: {
        nomor: `Meja ${i}`,
        status: 'kosong',
      },
    })
  }

  // Seed Menu
  const menus = [
    { nama: "Nasi Kucing Teri", harga: 3000, kategori: "Nasi" },
    { nama: "Nasi Kucing Tempe", harga: 3000, kategori: "Nasi" },
    { nama: "Sate Usus", harga: 2000, kategori: "Sate" },
    { nama: "Sate Telur Puyuh", harga: 3000, kategori: "Sate" },
    { nama: "Sate Ati Ampela", harga: 4000, kategori: "Sate" },
    { nama: "Gorengan Tempe", harga: 1000, kategori: "Gorengan" },
    { nama: "Gorengan Bakwan", harga: 1000, kategori: "Gorengan" },
    { nama: "Es Teh Manis", harga: 4000, kategori: "Minuman" },
    { nama: "Kopi Hitam", harga: 5000, kategori: "Minuman" },
    { nama: "Susu Jahe", harga: 6000, kategori: "Minuman" },
  ];

  for (const menu of menus) {
    const existing = await prisma.menuItem.findFirst({ where: { nama: menu.nama } });
    if (!existing) {
      await prisma.menuItem.create({ data: menu });
    }
  }

  console.log('Seeding finished.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
