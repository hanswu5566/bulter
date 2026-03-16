
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('--- 調查開始：讀取最新房源圖片 URL ---');
  const listings = await prisma.listing.findMany({
    orderBy: { createdAt: 'desc' },
    select: { id: true, title: true, images: true },
    take: 5
  });

  if (listings.length === 0) {
    console.log('找不到任何房源。');
    return;
  }

  listings.forEach((l, i) => {
    console.log(`\n房源 ${i + 1}: ${l.title}`);
    console.log(`ID: ${l.id}`);
    console.log('圖片 URL 列表:');
    if (!l.images || l.images.length === 0) {
      console.log('  [無圖片]');
    } else {
      l.images.forEach(img => console.log(`  - ${img}`));
    }
  });
}

main()
  .catch(e => console.error('資料庫查詢錯誤:', e))
  .finally(async () => {
    await prisma.$disconnect();
  });
