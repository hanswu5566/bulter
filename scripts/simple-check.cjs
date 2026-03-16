
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const listings = await prisma.listing.findMany({
    select: { title: true, images: true },
    take: 1
  });
  console.log('API Return Sample:', JSON.stringify(listings, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
