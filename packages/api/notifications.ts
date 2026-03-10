/**
 * @jawwing/api — Email notifications
 *
 * Fire-and-forget notifications for reply alerts.
 * Email privacy is preserved — never reveals who replied.
 */

import { eq } from "drizzle-orm";
import { db, posts, accounts } from "@jawwing/db";
import { decryptEmail } from "./accounts";
import { Resend } from "resend";

// ─── notifyPostReply ──────────────────────────────────────────────────────────

/**
 * Send a reply notification to the post author if they have an account
 * and have notifications enabled.
 * Fire-and-forget — never throws.
 */
export async function notifyPostReply(postId: string, replyContent: string): Promise<void> {
  try {
    if (!process.env.RESEND_API_KEY) return;

    // Look up the post
    const [post] = await db
      .select({ account_id: posts.account_id })
      .from(posts)
      .where(eq(posts.id, postId))
      .limit(1);

    if (!post?.account_id) return;

    // Look up the account
    const [account] = await db
      .select()
      .from(accounts)
      .where(eq(accounts.id, post.account_id))
      .limit(1);

    if (!account?.email_encrypted) return;

    // Check notification preferences
    let prefs: { replies: boolean; trending: boolean } = { replies: true, trending: false };
    try {
      prefs = JSON.parse(account.notification_prefs ?? '{"replies":true,"trending":false}');
    } catch { /* use defaults */ }

    if (!prefs.replies) return;

    // Decrypt email
    const email = decryptEmail(account.email_encrypted);

    // Send notification
    const resend = new Resend(process.env.RESEND_API_KEY);
    const snippet = replyContent.slice(0, 100);
    const postUrl = `https://jawwing.com/post/${postId}`;

    await resend.emails.send({
      from: "noreply@jawwing.com",
      to: email,
      subject: "Someone replied to your post on Jawwing",
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>New Reply</title></head>
<body style="background:#000;color:#fff;font-family:'Courier New',Courier,monospace;margin:0;padding:40px 20px;">
  <div style="max-width:480px;margin:0 auto;">
    <div style="font-size:13px;letter-spacing:0.14em;font-weight:700;margin-bottom:32px;">JAWWING</div>
    <div style="font-size:11px;letter-spacing:0.06em;color:#777;margin-bottom:16px;text-transform:uppercase;">Someone replied to your post</div>
    <div style="border:1px solid #333;padding:16px;margin-bottom:24px;font-size:13px;color:#ccc;word-break:break-word;">
      ${snippet.replace(/</g, "&lt;").replace(/>/g, "&gt;")}${replyContent.length > 100 ? "…" : ""}
    </div>
    <a href="${postUrl}" style="display:inline-block;border:1px solid #fff;padding:10px 20px;color:#fff;text-decoration:none;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;">VIEW POST</a>
    <div style="margin-top:40px;font-size:10px;color:#444;letter-spacing:0.06em;">
      Your email is encrypted and never shown to anyone. <br>
      To manage notifications, visit <a href="https://jawwing.com/my-posts" style="color:#555;">jawwing.com/my-posts</a>
    </div>
  </div>
</body>
</html>
      `.trim(),
    });
  } catch (err) {
    // Fire-and-forget — log but never throw
    console.error("[notifyPostReply]", err);
  }
}
