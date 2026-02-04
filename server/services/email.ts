import { Resend } from 'resend';

const SUPPORT_EMAIL = 'contact@dzagahjeremiah.com';
const FROM_EMAIL = 'barista@monday.trade';

let resendClient: Resend | null = null;

function getResendClient(): Resend | null {
  if (!process.env.RESEND_API_KEY) {
    console.log("[WARN] RESEND_API_KEY not configured");
    return null;
  }

  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
    console.log("[OK] Resend client initialized");
  }

  return resendClient;
}

export async function sendSupportNotification(
  userAddress: string,
  initialMessage: string,
  threadId: string
): Promise<boolean> {
  const client = getResendClient();

  if (!client) {
    console.log("[WARN] Email not sent - Resend not configured");
    return false;
  }

  try {
    const result = await client.emails.send({
      from: `Barista Support <${FROM_EMAIL}>`,
      to: SUPPORT_EMAIL,
      subject: `New Support Thread - ${userAddress.slice(0, 8)}...`,
      html: `
        <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; background: #0f0d1a; color: #fff; padding: 32px; border-radius: 16px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #9945FF; margin: 0;">New Support Request</h1>
          </div>
          
          <div style="background: #1a1625; padding: 20px; border-radius: 12px; margin-bottom: 20px;">
            <p style="margin: 0 0 8px 0; color: #a0a0a0; font-size: 12px;">User Wallet</p>
            <p style="margin: 0; font-family: monospace; color: #14F195;">${userAddress}</p>
          </div>
          
          <div style="background: #1a1625; padding: 20px; border-radius: 12px; margin-bottom: 20px;">
            <p style="margin: 0 0 8px 0; color: #a0a0a0; font-size: 12px;">Initial Message</p>
            <p style="margin: 0; color: #fff;">${initialMessage}</p>
          </div>
          
          <div style="background: #1a1625; padding: 20px; border-radius: 12px; margin-bottom: 20px;">
            <p style="margin: 0 0 8px 0; color: #a0a0a0; font-size: 12px;">Thread ID</p>
            <p style="margin: 0; font-family: monospace; color: #9945FF;">${threadId}</p>
          </div>
          
          <div style="text-align: center; margin-top: 24px;">
            <a href="https://barista.monday.trade/agent" style="display: inline-block; background: #9945FF; color: #fff; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">
              Open Agent Dashboard
            </a>
          </div>
          
          <p style="text-align: center; color: #666; font-size: 12px; margin-top: 24px;">
            Monday Trade Support - Powered by Barista
          </p>
        </div>
      `,
    });

    console.log(`[OK] Support notification sent to ${SUPPORT_EMAIL}`);
    return true;
  } catch (error) {
    console.error("[ERROR] Failed to send support notification:", error);
    return false;
  }
}

export function isConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}
