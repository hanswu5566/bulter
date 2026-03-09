import { Storage } from "@google-cloud/storage";
import sharp from "sharp";

// 清理環境變數中的引號
const cleanEnv = (key: string) => (process.env[key] || "").replace(/"/g, "");

const storage = new Storage({
  projectId: cleanEnv("GCP_PROJECT_ID"),
  credentials: {
    client_email: cleanEnv("GCP_CLIENT_EMAIL"),
    private_key: cleanEnv("GCP_PRIVATE_KEY").replace(/\\n/g, "\n"),
  },
});

const bucketName = cleanEnv("GCS_BUCKET_NAME") || "ai-house-rent-assets";

export async function getSignedUploadUrl(fileName: string, contentType: string) {
  const file = storage.bucket(bucketName).file(`uploads/${Date.now()}-${fileName}`);
  
  const [url] = await file.getSignedUrl({
    version: "v4",
    action: "write",
    expires: Date.now() + 15 * 60 * 1000, // 15 minutes
    contentType,
  });

  return { 
    uploadUrl: url, 
    publicUrl: `https://storage.googleapis.com/${bucketName}/${file.name}` 
  };
}

export async function uploadFromUrl(url: string) {
  try {
    console.log(`Attempting to transfer and optimize image: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://www.591.com.tw/"
      }
    });
    
    if (!response.ok) throw new Error(`Failed to fetch image: ${response.status}`);
    
    const arrayBuffer = await response.arrayBuffer();
    const originalBuffer = Buffer.from(arrayBuffer);
    
    // --- 圖片最佳化處理 ---
    const optimizedBuffer = await sharp(originalBuffer)
      .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
    
    const fileName = `imports/${Date.now()}-${Math.random().toString(36).substring(7)}.webp`;
    const file = storage.bucket(bucketName).file(fileName);
    
    await file.save(optimizedBuffer, {
      metadata: { 
        contentType: 'image/webp',
        cacheControl: 'public, max-age=31536000',
      },
    });

    const publicUrl = `https://storage.googleapis.com/${bucketName}/${fileName}`;
    console.log(`Optimized image uploaded to: ${publicUrl}`);
    
    return publicUrl;
  } catch (error) {
    console.error("Error optimizing and uploading image:", error);
    return url; 
  }
}

export async function deleteFiles(urls: string[]) {
  const prefix = `https://storage.googleapis.com/${bucketName}/`;
  
  for (const url of urls) {
    if (url.startsWith(prefix)) {
      try {
        const filePath = url.replace(prefix, "");
        await storage.bucket(bucketName).file(filePath).delete();
        console.log(`Deleted file from GCS: ${filePath}`);
      } catch (error) {
        console.error(`Failed to delete file from GCS: ${url}`, error);
      }
    }
  }
}
