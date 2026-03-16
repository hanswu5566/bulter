import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { MODELS, genAI } from "@/lib/ai";
import { withErrorHandler, successResponse, errorResponse } from "@/lib/api-utils";
import { deleteFiles, getSignedDownloadUrl } from "@/lib/storage";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandler(async () => {
    const { id } = await params;
    const listing = await db.listing.findUnique({
      where: { id },
      include: {
        landlord: { select: { id: true, name: true, image: true } },
        reports: {
          orderBy: { createdAt: "desc" },
          take: 5,
        }
      }
    });

    if (!listing) {
      return errorResponse("Listing not found", 404);
    }

    // 幫房源詳情頁面生成 Signed URLs
    if (listing.images && listing.images.length > 0) {
      listing.images = await Promise.all(listing.images.map(img => getSignedDownloadUrl(img)));
    }

    return successResponse(listing);
  });
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandler(async () => {
    const session = await auth();
    const { id } = await params;

    const existing = await db.listing.findUnique({ where: { id } });
    if (!existing) return errorResponse("Listing not found", 404);
    if (existing.landlordId !== session?.user?.id) return errorResponse("Unauthorized", 403);

    const body = await req.json();
    
    // 只取出允許更新的欄位，過濾掉 landlord, reports, id, createdAt 等唯讀或關聯欄位
    const { 
      title, price, address, description, images, features, currency 
    } = body;

    const data: any = {
      title, price, address, description, features, currency
    };

    // 將帶有簽名的網址還原為原始網址，以便與資料庫中的原始路徑比對
    const normalizeUrl = (url: string) => url.split('?')[0];

    // 自動清理已移除的照片
    if (existing.images && existing.images.length > 0 && images) {
      const currentImagesNormalized = images.map(normalizeUrl);
      const removedImages = existing.images.filter(img => !currentImagesNormalized.includes(normalizeUrl(img)));
      
      if (removedImages.length > 0) {
        await deleteFiles(removedImages);
      }

      // 儲存進資料庫前，也確保存入的是原始網址（不含簽名）
      data.images = currentImagesNormalized;
    } else if (images) {
      data.images = images.map(normalizeUrl);
    }

    const updated = await db.listing.update({
      where: { id },
      data,
    });

    return successResponse(updated);
  });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandler(async () => {
    const session = await auth();
    const { id } = await params;

    const existing = await db.listing.findUnique({ where: { id } });
    if (!existing) return errorResponse("Listing not found", 404);
    if (existing.landlordId !== session?.user?.id) return errorResponse("Unauthorized", 403);

    // 刪除資料庫紀錄前，先清理 GCS 中的圖片檔案
    if (existing.images && existing.images.length > 0) {
      await deleteFiles(existing.images);
    }

    await db.listing.delete({ where: { id } });
    return successResponse({ deleted: true });
  });
}
