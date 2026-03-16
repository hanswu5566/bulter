import { scrape591 } from "./taiwan-591";

export type ScrapeResult = {
  rawContent: string;
  source: string;
  url: string;
  images?: string[];
};

export async function scrapeListing(url: string): Promise<ScrapeResult> {
  // Dispatcher based on URL patterns
  if (url.includes("591.com.tw")) {
    return await scrape591(url);
  }

  // Placeholder for future countries/platforms
  // if (url.includes("zillow.com")) return await scrapeZillow(url);
  
  throw new Error(`Unsupported platform: ${url}`);
}
