import { db } from "./lib/db";

async function run() {
  const listing = await db.listing.findUnique({
    where: { id: "cmoprz9o80000uivcesmr23at" }
  });
  console.log(JSON.stringify(listing, null, 2));
}

run();
