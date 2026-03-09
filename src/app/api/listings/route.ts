import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { calculateMatchScore } from "@/lib/matching";
import { withErrorHandler, successResponse, errorResponse } from "@/lib/api-utils";
import { uploadFromUrl } from "@/lib/storage";

export async function GET() {
  return withErrorHandler(async () => {
    const session = await auth();
    const userId = session?.user?.id;
    
    const listings = await db.listing.findMany({
      orderBy: { createdAt: "desc" },
      include: { 
        landlord: { 
          select: { 
            id: true,
            name: true, 
            image: true 
          } 
        } 
      }
    });

    const userTags = (session?.user as any)?.profileTags as string[] | undefined;
    
    const processedListings = await Promise.all(
      listings.map(async (l) => {
        const matchScore = userTags && userTags.length > 0 
          ? await calculateMatchScore(userTags, l) 
          : 70;
          
        return { 
          ...l, 
          matchScore,
          isOwner: userId === l.landlordId 
        };
      })
    );

    return successResponse(processedListings);
  });
}

export async function POST(req: Request) {
  return withErrorHandler(async () => {
    const session = await auth();
    if (!session || (session.user as any)?.role !== "LANDLORD") {
      return errorResponse("Unauthorized: Landlord role required", 401);
    }

    const rawData = await req.json();

    // 只有允許的欄位才能存入資料庫
    const data: any = {
      title: rawData.title,
      description: rawData.description,
      address: rawData.address,
      price: rawData.price,
      images: rawData.images || [],
      features: rawData.features,
      raw591Data: rawData.raw591Data,
      landlordId: session.user.id!,
    };

    // 如果有圖片，檢查是否需要轉存到 GCS
    if (data.images && Array.isArray(data.images)) {
      const bucketName = (process.env.GCS_BUCKET_NAME || "").replace(/"/g, "");
      const bucketUrlPrefix = `https://storage.googleapis.com/${bucketName}`;
      
      // 使用循序處理以確保圖片順序不變 (第一張封面圖必須維持在第一張)
      const processedImages = [];
      for (const imgUrl of data.images) {
        if (typeof imgUrl === "string" && imgUrl.startsWith("http") && !imgUrl.startsWith(bucketUrlPrefix)) {
          try {
            const uploadedUrl = await uploadFromUrl(imgUrl);
            processedImages.push(uploadedUrl);
          } catch (err) {
            console.error("Image upload failed, keeping original:", imgUrl, err);
            processedImages.push(imgUrl);
          }
        } else {
          processedImages.push(imgUrl);
        }
      }
      data.images = processedImages;
    }

    const newListing = await db.listing.create({
      data: data,
    });

    return successResponse(newListing, 201);
  });
}
