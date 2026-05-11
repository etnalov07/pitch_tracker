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
    to: string[];
    subject: string;
    content: PostGameReportContent;
    pdfAttachment?: { filename: string; content: Buffer };
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

    async sendPostGameReport({ to, subject, content, pdfAttachment }: PostGameReportEmailParams): Promise<boolean> {
        const client = this.getClient();
        if (!client) {
            console.warn('Email not configured: RESEND_API_KEY is not set. Skipping post-game report email.');
            return false;
        }

        const html = baseShell('Postgame Report', renderPostGameReportBody(content));

        try {
            await client.emails.send({
                from: `${config.email.fromEmailName} <${config.email.fromEmail}>`,
                to,
                subject,
                html,
                attachments: pdfAttachment ? [{ filename: pdfAttachment.filename, content: pdfAttachment.content }] : undefined,
            });
            return true;
        } catch (err) {
            console.error('Failed to send post-game report email:', err);
            return false;
        }
    }
}

function renderPostGameReportBody(content: PostGameReportContent): string {
    const ipOuts = content.outcome_totals.weak_contact_outs + content.outcome_totals.hard_contact_outs;

    const narrative = content.narrative
        ? `<p style="margin:0 0 20px;padding:12px 16px;background-color:#f0f7ff;border-left:3px solid #2563eb;font-size:14px;color:#1a1a1a;line-height:1.55;font-style:italic;">${escapeHtml(content.narrative)}</p>`
        : '';

    const totalsRow = (
        [
            ['Hits', content.outcome_totals.hits],
            ['Walks', content.outcome_totals.walks],
            ['K', content.outcome_totals.strikeouts],
            ['IP outs', ipOuts],
        ] as Array<[string, number]>
    )
        .map(
            ([label, val]) => `
                <td align="center" style="padding:14px 8px;background-color:#f8f9fa;border:1px solid #e2e8f0;border-radius:6px;">
                  <div style="font-size:22px;font-weight:700;color:#1e3a5f;line-height:1;">${val}</div>
                  <div style="font-size:11px;font-weight:600;color:#6b7280;letter-spacing:0.5px;text-transform:uppercase;margin-top:6px;">${label}</div>
                </td>`
        )
        .join('<td style="width:8px;"></td>');

    const pitchMixSection =
        content.pitch_mix.length > 0
            ? sectionHtml(
                  'Opponent pitch mix',
                  tableHtml(
                      ['Pitch type', '%'],
                      content.pitch_mix.slice(0, 5).map((m) => [m.pitch_type, `${m.pct}%`])
                  )
              )
            : '';

    const perPitcherSection =
        content.per_pitcher.length > 0
            ? sectionHtml(
                  'Our pitchers',
                  tableHtml(
                      ['Pitcher', 'P', 'Strike%', 'H', 'R'],
                      content.per_pitcher.map((p) => [
                          p.pitcher_name,
                          String(p.total_pitches),
                          `${p.strike_percentage}%`,
                          p.hits_allowed != null ? String(p.hits_allowed) : '—',
                          p.runs_allowed != null ? String(p.runs_allowed) : '—',
                      ])
                  )
              )
            : '';

    const perHitterSection =
        content.per_hitter.length > 0
            ? sectionHtml(
                  'Per-hitter (top of order)',
                  tableHtml(
                      ['#', 'Hitter', 'PA', 'H', 'BB', 'K'],
                      content.per_hitter.map((h) => [
                          String(h.batting_order),
                          h.batter_name,
                          String(h.at_bats_count),
                          String(h.hits),
                          String(h.walks),
                          String(h.strikeouts),
                      ])
                  )
              )
            : '';

    return `
      <p style="margin:0 0 4px;font-size:13px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Game</p>
      <p style="margin:0 0 20px;font-size:18px;color:#1a1a1a;font-weight:700;">${escapeHtml(content.game_label)}</p>
      ${narrative}
      <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
        <tr>${totalsRow}</tr>
      </table>
      ${pitchMixSection}
      ${perPitcherSection}
      ${perHitterSection}
      <p style="margin:24px 0 0;font-size:12px;color:#9ca3af;text-align:center;">Generated by Pitch Chart on ${escapeHtml(content.generated_at)} — full chart attached as PDF.</p>
    `;
}

function sectionHtml(label: string, inner: string): string {
    return `
      <p style="margin:0 0 6px;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;font-weight:700;">${escapeHtml(label)}</p>
      ${inner}
    `;
}

function tableHtml(headers: string[], rows: string[][]): string {
    const headerCells = headers
        .map(
            (h, i) =>
                `<th align="${i === 0 ? 'left' : 'right'}" style="padding:8px 10px;font-size:11px;color:#6b7280;font-weight:700;text-transform:uppercase;letter-spacing:0.4px;border-bottom:1px solid #e2e8f0;">${escapeHtml(h)}</th>`
        )
        .join('');
    const bodyRows = rows
        .map(
            (row) =>
                `<tr>${row
                    .map(
                        (cell, i) =>
                            `<td align="${i === 0 ? 'left' : 'right'}" style="padding:8px 10px;font-size:14px;color:#1a1a1a;border-bottom:1px solid #f1f5f9;">${escapeHtml(cell)}</td>`
                    )
                    .join('')}</tr>`
        )
        .join('');
    return `
      <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;border:1px solid #e2e8f0;border-radius:6px;overflow:hidden;">
        <thead><tr>${headerCells}</tr></thead>
        <tbody>${bodyRows}</tbody>
      </table>
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
