import { Resend } from 'resend';
import { config } from '../config/env';
import type { PostGameReportContent } from '../types';

interface InviteEmailParams {
    to: string;
    teamName: string;
    inviterName: string;
    role: string;
    inviteUrl: string;
}

interface WelcomeEmailParams {
    to: string;
    firstName: string;
    verifyUrl?: string;
}

interface VerificationEmailParams {
    to: string;
    firstName: string;
    verifyUrl: string;
}

interface PostGameReportEmailParams {
    recipients: string[]; // BCC list — recipients don't see each other
    subject: string;
    content: PostGameReportContent;
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

    async sendWelcomeEmail({ to, firstName, verifyUrl }: WelcomeEmailParams): Promise<boolean> {
        const client = this.getClient();
        if (!client) {
            console.warn('Email not configured: RESEND_API_KEY is not set. Skipping welcome email.');
            return false;
        }

        const verifyButton = verifyUrl
            ? `
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:8px 0 16px;">
                    <a href="${verifyUrl}" style="display:inline-block;background-color:#2563eb;color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;padding:14px 40px;border-radius:6px;">Verify your email</a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 8px;font-size:13px;color:#9ca3af;text-align:center;">Verifying unlocks password recovery and other email-anchored features.</p>`
            : '';

        const html = baseShell(
            'Welcome to Pitch Chart',
            `
              <p style="margin:0 0 12px;font-size:16px;color:#1a1a1a;">Hi ${escapeHtml(firstName)},</p>
              <p style="margin:0 0 16px;font-size:15px;color:#1a1a1a;line-height:1.5;">Welcome to Pitch Chart. Your account is ready — you can sign in and start charting games, building lineups, and reviewing scouting reports right away.</p>
              ${verifyButton}
              <p style="margin:24px 0 0;font-size:13px;color:#6b7280;">If you didn't sign up, you can ignore this email.</p>
            `
        );

        try {
            await client.emails.send({
                from: `${config.email.fromEmailName} <${config.email.fromEmail}>`,
                to,
                subject: 'Welcome to Pitch Chart',
                html,
            });
            return true;
        } catch (err) {
            console.error('Failed to send welcome email:', err);
            return false;
        }
    }

    async sendVerificationEmail({ to, firstName, verifyUrl }: VerificationEmailParams): Promise<boolean> {
        const client = this.getClient();
        if (!client) {
            console.warn('Email not configured: RESEND_API_KEY is not set. Skipping verification email.');
            return false;
        }

        const html = baseShell(
            'Verify your email',
            `
              <p style="margin:0 0 12px;font-size:16px;color:#1a1a1a;">Hi ${escapeHtml(firstName)},</p>
              <p style="margin:0 0 16px;font-size:15px;color:#1a1a1a;line-height:1.5;">Click the button below to verify your email on Pitch Chart.</p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:8px 0 16px;">
                    <a href="${verifyUrl}" style="display:inline-block;background-color:#2563eb;color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;padding:14px 40px;border-radius:6px;">Verify your email</a>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 0;font-size:13px;color:#6b7280;">If you didn't request this, you can ignore this email.</p>
            `
        );

        try {
            await client.emails.send({
                from: `${config.email.fromEmailName} <${config.email.fromEmail}>`,
                to,
                subject: 'Verify your email on Pitch Chart',
                html,
            });
            return true;
        } catch (err) {
            console.error('Failed to send verification email:', err);
            return false;
        }
    }

    async sendPostGameReport({ recipients, subject, content }: PostGameReportEmailParams): Promise<boolean> {
        const client = this.getClient();
        if (!client) {
            console.warn('Email not configured: RESEND_API_KEY is not set. Skipping post-game report email.');
            return false;
        }

        const html = baseShell('Postgame Report', renderPostGameReportBody(content));

        try {
            await client.emails.send({
                from: `${config.email.fromEmailName} <${config.email.fromEmail}>`,
                // BCC the actual recipients so they don't see each other's
                // addresses. Resend requires a `to:` so use the sender as a
                // visible no-op address (standard BCC-blast pattern).
                to: config.email.fromEmail,
                bcc: recipients,
                subject,
                html,
            });
            return true;
        } catch (err) {
            console.error('Failed to send post-game report email:', err);
            return false;
        }
    }
}

function renderPostGameReportBody(content: PostGameReportContent): string {
    const pitcherCards = content.per_pitcher
        .map(
            (p) => `
              <div style="margin:0 0 16px;padding:14px 16px;background-color:#f8f9fa;border:1px solid #e2e8f0;border-radius:6px;">
                <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#1e3a5f;letter-spacing:0.3px;">${escapeHtml(p.pitcher_name)}</p>
                ${
                    p.narrative
                        ? `<p style="margin:0;font-size:14px;color:#1a1a1a;line-height:1.55;">${escapeHtml(p.narrative)}</p>`
                        : `<p style="margin:0;font-size:13px;color:#9ca3af;font-style:italic;">Narrative not yet generated. Open the full report to see the latest.</p>`
                }
              </div>`
        )
        .join('');

    const teamNarrativeBlock = content.team_narrative
        ? `<p style="margin:0;padding:14px 16px;background-color:#f0f7ff;border-left:3px solid #2563eb;font-size:14px;color:#1a1a1a;line-height:1.55;font-style:italic;">${escapeHtml(content.team_narrative)}</p>`
        : `<p style="margin:0;padding:14px 16px;background-color:#f8f9fa;border-left:3px solid #e2e8f0;font-size:13px;color:#9ca3af;font-style:italic;">Team narrative not yet generated. Open the full report to see the latest.</p>`;

    const safeUrl = escapeHtml(content.public_report_url);

    return `
      <p style="margin:0 0 4px;font-size:13px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Game</p>
      <p style="margin:0 0 24px;font-size:18px;color:#1a1a1a;font-weight:700;">${escapeHtml(content.game_label)}</p>

      ${
          pitcherCards
              ? `<p style="margin:0 0 8px;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;font-weight:700;">Coaches Summary</p>${pitcherCards}`
              : ''
      }

      <p style="margin:24px 0 8px;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;font-weight:700;">How they attacked us</p>
      ${teamNarrativeBlock}

      <table width="100%" cellpadding="0" cellspacing="0" style="margin:32px 0 8px;">
        <tr>
          <td align="center">
            <a href="${safeUrl}" style="display:inline-block;background-color:#2563eb;color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;padding:14px 36px;border-radius:6px;">View full report</a>
          </td>
        </tr>
      </table>
      <p style="margin:8px 0 0;font-size:12px;color:#9ca3af;text-align:center;line-height:1.5;">Charts, attack-zone heatmap, and per-hitter breakdowns are in the full report:<br /><a href="${safeUrl}" style="color:#2563eb;text-decoration:none;">${safeUrl}</a></p>
    `;
}

/** Minimal HTML escaper for user-controlled strings in templates. */
function escapeHtml(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** Shared header/footer wrapper so every template stays visually consistent. */
function baseShell(heading: string, bodyHtml: string): string {
    return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background-color:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f5f7;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <tr>
            <td style="background-color:#1e3a5f;padding:24px 32px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:0.5px;">${escapeHtml(heading)}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">${bodyHtml}</td>
          </tr>
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
}

export default new EmailService();
