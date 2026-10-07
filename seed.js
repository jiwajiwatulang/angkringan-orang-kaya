const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Deleting old menu...");
  await prisma.menuItem.deleteMany();

  const newMenus = [
    // --- ANGKRINGAN ORANG KAYA ---
    
    // Makanan Utama
    { nama: "Ayam panggang (Dada)", harga: 25000, kategori: "Makanan Utama" },
    { nama: "Ayam panggang (Paha)", harga: 25000, kategori: "Makanan Utama" },
    { nama: "Iga panggang", harga: 55000, kategori: "Makanan Utama" },
    { nama: "Pindang balado", harga: 10000, kategori: "Makanan Utama" },
    { nama: "Nasi bakar ayam sisit", harga: 15000, kategori: "Makanan Utama" },
    { nama: "Nasi bakar pindang sisit", harga: 15000, kategori: "Makanan Utama" },
    { nama: "Nasi bakar sambel cumi pete", harga: 15000, kategori: "Makanan Utama" },

    // Lauk & Pelengkap
    { nama: "Tempe bakar", harga: 4000, kategori: "Lauk & Pelengkap" },
    { nama: "Terong bakar", harga: 7000, kategori: "Lauk & Pelengkap" },
    { nama: "Sate koyor", harga: 8000, kategori: "Lauk & Pelengkap" },
    { nama: "Sate ati", harga: 8000, kategori: "Lauk & Pelengkap" },
    { nama: "Nasi putih", harga: 7000, kategori: "Lauk & Pelengkap" },
    { nama: "Nasi gurih", harga: 10000, kategori: "Lauk & Pelengkap" },

    // Sambel
    { nama: "Sambel cumi pete", harga: 10000, kategori: "Sambel" },
    { nama: "Sambel jengkol balado", harga: 10000, kategori: "Sambel" },
    { nama: "Sambel embe", harga: 7000, kategori: "Sambel" },

    // Soft Drink (Angkringan & Kopi Kaya merged)
    { nama: "Es teh / Ice Tea", harga: 6000, kategori: "Soft Drink" },
    { nama: "Air mineral", harga: 6000, kategori: "Soft Drink" },
    { nama: "Coca-Cola", harga: 8000, kategori: "Soft Drink" },
    { nama: "Fanta", harga: 8000, kategori: "Soft Drink" },
    { nama: "Sprite", harga: 8000, kategori: "Soft Drink" },

    // --- KOPI KAYA ---

    // Coffee
    { nama: "Americano (Hot)", harga: 25000, kategori: "Coffee" },
    { nama: "Americano (Ice)", harga: 25000, kategori: "Coffee" },
    { nama: "Café Latte (Hot)", harga: 40000, kategori: "Coffee" },
    { nama: "Café Latte (Ice)", harga: 45000, kategori: "Coffee" },
    { nama: "Cappuccino (Hot)", harga: 40000, kategori: "Coffee" },
    { nama: "Cappuccino (Ice)", harga: 45000, kategori: "Coffee" },
    { nama: "Flat White (Hot)", harga: 40000, kategori: "Coffee" },
    { nama: "Flat White (Ice)", harga: 45000, kategori: "Coffee" },
    { nama: "Mochaccino (Hot)", harga: 40000, kategori: "Coffee" },
    { nama: "Mochaccino (Ice)", harga: 45000, kategori: "Coffee" },
    { nama: "Espresso (Single)", harga: 15000, kategori: "Coffee" },
    { nama: "Espresso (Double)", harga: 20000, kategori: "Coffee" },
    { nama: "Chocolate (Hot)", harga: 40000, kategori: "Coffee" },
    { nama: "Chocolate (Ice)", harga: 45000, kategori: "Coffee" },
    { nama: "Red Velvet (Hot)", harga: 40000, kategori: "Coffee" },
    { nama: "Red Velvet (Ice)", harga: 45000, kategori: "Coffee" },

    // Milkshake
    { nama: "Berrylicious Milkshake", harga: 50000, kategori: "Milkshake" },
    { nama: "Caramel Vanilla Milkshake", harga: 50000, kategori: "Milkshake" },
    { nama: "Chocolate Milkshake", harga: 50000, kategori: "Milkshake" },

    // Matcha
    { nama: "Matcha Latte (Hot)", harga: 45000, kategori: "Matcha" },
    { nama: "Matcha Latte (Ice)", harga: 45000, kategori: "Matcha" },
    { nama: "Strawberry Matcha (Ice)", harga: 55000, kategori: "Matcha" },
    { nama: "Matcha Brown Sugar (Ice)", harga: 45000, kategori: "Matcha" },
    { nama: "Pure Matcha (Hot)", harga: 40000, kategori: "Matcha" },
    { nama: "Pure Matcha (Ice)", harga: 45000, kategori: "Matcha" },

    // Tea & Refreshers
    { nama: "Iced Lemon Tea", harga: 20000, kategori: "Tea & Refreshers" },
    { nama: "Lychee Tea", harga: 25000, kategori: "Tea & Refreshers" },
    { nama: "Strawberry Tea Crush", harga: 30000, kategori: "Tea & Refreshers" },
    { nama: "Apple Lime Breeze", harga: 30000, kategori: "Tea & Refreshers" },
    { nama: "Grape Lime Tea", harga: 30000, kategori: "Tea & Refreshers" },
    { nama: "Lychee Yakult", harga: 45000, kategori: "Tea & Refreshers" },
    { nama: "Strawberry Yakult", harga: 45000, kategori: "Tea & Refreshers" },
    { nama: "Orange Juice", harga: 30000, kategori: "Tea & Refreshers" },
  ];

  console.log("Seeding new menus...");
  for (const menu of newMenus) {
    await prisma.menuItem.create({ data: menu });
  }

  console.log("Seeding complete!");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
