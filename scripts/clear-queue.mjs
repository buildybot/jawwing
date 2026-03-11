import { createClient } from "@libsql/client";

async function clearQueue() {
  console.log("Starting queue clear...");
  for (let i=0; i<30; i++) {
    try {
      const res = await fetch("https://www.jawwing.com/api/cron/mod-queue", { 
        headers: { "x-admin-key": process.env.ADMIN_API_KEY } 
      });
      const data = await res.json();
      console.log(`Batch ${i+1}: processed=${data.processed} approved=${data.approved} flagged=${data.flagged} pending=${data.pendingRemaining}`);
      if (data.processed === 0 && data.pendingRemaining === 0) {
        console.log("Queue cleared!");
        break;
      }
    } catch (e) {
      console.error(e);
    }
    await new Promise(r => setTimeout(r, 2000));
  }
}
clearQueue();
