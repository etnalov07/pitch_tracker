import { Resend } from 'resend';
import { config } from '../config/env';

interface InviteEmailParams {
    to: string;
    teamName: string;
    inviterName: string;
    role: string;
    inviteUrl: string;
}

class EmailService {
    private resend: Resend | null = null;

    private getClient(): Resend | null {
        if (!config.email.resendApiKey) {
            return null;
        }
        if (!this.resend) {
            this.resend = new Resend(config.email.resendApiKey);
        }
        return this.resend;
    }

    async sendInviteEmail({ to, teamName, inviterName, role, inviteUrl }: InviteEmailParams): Promise<boolean> {
        const client = this.getClient();
        if (!client) {
            console.warn('Email not configured: RESEND_API_KEY is not set. Skipping invite email.');
            return false;
        }

        const roleLabel = role === 'assistant' ? 'Assistant Coach' : role.charAt(0).toUpperCase() + role.slice(1);

        const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background-color:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f5f7;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color:#1e3a5f;padding:24px 32px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:0.5px;">Pitch Chart</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px;font-size:16px;color:#1a1a1a;">You've been invited to join a team on Pitch Chart!</p>
              <!-- Invite Details Card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8f9fa;border:1px solid #e2e8f0;border-radius:6px;margin:24px 0;">
                <tr>
                  <td style="padding:20px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:4px 0;font-size:14px;color:#6b7280;width:80px;">Team</td>
                        <td style="padding:4px 0;font-size:14px;color:#1a1a1a;font-weight:600;">${teamName}</td>
                      </tr>
                      <tr>
                        <td style="padding:4px 0;font-size:14px;color:#6b7280;width:80px;">Role</td>
                        <td style="padding:4px 0;font-size:14px;color:#1a1a1a;font-weight:600;">${roleLabel}</td>
                      </tr>
                      <tr>
                        <td style="padding:4px 0;font-size:14px;color:#6b7280;width:80px;">Invited by</td>
                        <td style="padding:4px 0;font-size:14px;color:#1a1a1a;font-weight:600;">${inviterName}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:8px 0 24px;">
                    <a href="${inviteUrl}" style="display:inline-block;background-color:#2563eb;color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;padding:14px 40px;border-radius:6px;">Accept Invite</a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 8px;font-size:13px;color:#9ca3af;text-align:center;">This invite will expire in ${config.invite.defaultExpiryDays} days.</p>
              <p style="margin:0;font-size:13px;color:#9ca3af;text-align:center;">Don't have an account? You'll be able to sign up when you accept the invite.</p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:16px 32px;background-color:#f8f9fa;border-top:1px solid #e2e8f0;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">&copy; ${new Date().getFullYear()} Pitch Chart</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();

        try {
            await client.emails.send({
                from: `${config.email.fromEmailName} <${config.email.fromEmail}>`,
                to,
                subject: `You're invited to join ${teamName} on Pitch Chart`,
                html,
            });
            return true;
        } catch (err) {
            console.error('Failed to send invite email:', err);
            return false;
        }
    }
}

export default new EmailService();
