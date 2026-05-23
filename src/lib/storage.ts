import { Storage } from "@google-cloud/storage";
import sharp from "sharp";

// Clean double quotes from environment keys
const cleanEnv = (key: string) => (process.env[key] || "").replace(/"/g, "");

const hasGCSCredentials = 
  cleanEnv("GCP_PROJECT_ID").length > 0 && 
  cleanEnv("GCP_CLIENT_EMAIL").length > 0 && 
  cleanEnv("GCP_PRIVATE_KEY").length > 0;

// Dynamic GCS Bypass: Prevent constructor crash if credentials are not configured in .env
const storage = hasGCSCredentials 
  ? new Storage({
      projectId: cleanEnv("GCP_PROJECT_ID"),
      credentials: {
        client_email: cleanEnv("GCP_CLIENT_EMAIL"),
        private_key: cleanEnv("GCP_PRIVATE_KEY").replace(/\\n/g, "\n"),
      },
    })
  : null;

const bucketName = cleanEnv("GCS_BUCKET_NAME") || "ai-house-rent-assets";

export async function getSignedUploadUrl(fileName: string, contentType: string) {
  if (!storage) {
    console.log("[GCS Bypass] Signed Upload URLs bypassed. No GCS credentials found.");
    return { uploadUrl: "", publicUrl: "" };
  }

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

export async function getSignedDownloadUrl(url: string) {
  if (!storage) {
    return url; // Return the original URL directly (e.g., 591 raw images)
  }

  if (!url || !url.includes(bucketName)) return url;
  
  try {
    const filePath = url.split(`${bucketName}/`)[1];
    if (!filePath) return url;

    const file = storage.bucket(bucketName).file(filePath);
    const [signedUrl] = await file.getSignedUrl({
      version: "v4",
      action: "read",
      expires: Date.now() + 60 * 60 * 1000, // 1 hour active
    });

    return signedUrl;
  } catch (error) {
    console.error("Error generating signed URL:", error);
    return url;
  }
}

export async function uploadFromUrl(url: string) {
  if (!storage) {
    console.log(`[GCS Bypass] Direct image load fallback for URL: ${url}`);
    return url; // Resilient fallback: Return original URL directly with 0 TWD and 0 GCP cost!
  }

  try {
    console.log(`Attempting to transfer and optimize image to GCS: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://www.591.com.tw/"
      }
    });
    
    if (!response.ok) throw new Error(`Failed to fetch image: ${response.status}`);
    
    const arrayBuffer = await response.arrayBuffer();
    const originalBuffer = Buffer.from(arrayBuffer);
    
    // --- WebP Optimization ---
    const optimizedBuffer = await sharp(originalBuffer)
      .resize(1600, 1600, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 90 })
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
  if (!storage) return;

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
