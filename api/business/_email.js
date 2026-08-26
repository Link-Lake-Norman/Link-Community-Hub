import { Resend } from "resend";
import { escapeHtml, publicBaseUrl } from "./_util.js";

function mailer() {
  if (!process.env.RESEND_API_KEY || !process.env.LINK_FROM_EMAIL) return null;
  return new Resend(process.env.RESEND_API_KEY);
}

export async function sendBusinessMagicLink({ req, businessName, contactName, email, token }) {
  const resend = mailer();
  if (!resend) return { configured: false };
  const url = `${publicBaseUrl(req)}/api/business/auth/verify?token=${encodeURIComponent(token)}`;
  return resend.emails.send({
    from: process.env.LINK_FROM_EMAIL,
    to: email,
    subject: "Your LINK Community Hub™ business sign-in link",
    html: `<div style="font-family:Arial,sans-serif;color:#0b2344;line-height:1.6;max-width:640px"><h2>Sign in to LINK Community Hub™</h2><p>${escapeHtml(contactName || "Hello")}, use the secure link below to access ${escapeHtml(businessName || "your business")}.</p><p><a href="${url}" style="display:inline-block;background:#0b2344;color:white;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:700">Open Business Portal</a></p><p style="font-size:12px;color:#667085">This one-time link expires in 20 minutes.</p></div>`
  });
}

export async function sendResourceRequestEmails({ business, nonprofit, contactName, contactEmail, item, message }) {
  const resend = mailer();
  if (!resend) return { configured: false };
  const adminEmail = process.env.LINK_ADMIN_EMAIL || "jaime@linklakenorman.com";
  const businessHtml = `<div style="font-family:Arial,sans-serif;color:#0b2344;line-height:1.6;max-width:680px"><h2>New LINK Community Resource Request</h2><p><strong>Resource:</strong> ${escapeHtml(item.title)}</p><p><strong>Nonprofit:</strong> ${escapeHtml(nonprofit.display_name)}</p><p><strong>Contact:</strong> ${escapeHtml(contactName)} (${escapeHtml(contactEmail)})</p>${message ? `<p><strong>Message:</strong><br>${escapeHtml(message)}</p>` : ""}<p>Sign in to your LINK Business Portal to connect, decline or complete this request.</p></div>`;
  const nonprofitHtml = `<div style="font-family:Arial,sans-serif;color:#0b2344;line-height:1.6;max-width:680px"><h2>LINK received your resource request</h2><p>Your request for <strong>${escapeHtml(item.title)}</strong> from <strong>${escapeHtml(business.business_name)}</strong> has been sent.</p><p>LINK makes the introduction. The business controls availability and the parties handle approval, transfer, pickup/delivery, valuation and receipts directly.</p></div>`;
  const sends = [
    resend.emails.send({ from: process.env.LINK_FROM_EMAIL, to: business.email, replyTo: contactEmail, subject: `LINK Resource Request — ${item.title} — ${nonprofit.display_name}`, html: businessHtml }),
    resend.emails.send({ from: process.env.LINK_FROM_EMAIL, to: contactEmail, replyTo: business.email, subject: `LINK Request Received — ${item.title}`, html: nonprofitHtml })
  ];
  if (adminEmail) sends.push(resend.emails.send({ from: process.env.LINK_FROM_EMAIL, to: adminEmail, replyTo: contactEmail, subject: `LINK Resource Exchange — ${business.business_name} / ${nonprofit.display_name}`, html: businessHtml }));
  return Promise.allSettled(sends);
}

export async function sendRequestStatusEmail({ to, businessName, itemTitle, status }) {
  const resend = mailer();
  if (!resend || !to) return { configured: false };
  const copy = {
    connected: "The business has connected with you about this resource. Please coordinate directly with the business for next steps.",
    declined: "The business is not able to fulfill this resource request at this time.",
    completed: "The business marked this LINK resource connection as completed. Thank you for keeping community resources circulating locally."
  }[status] || "Your LINK resource request was updated.";
  try {
    return await resend.emails.send({ from: process.env.LINK_FROM_EMAIL, to, subject: `LINK Resource Request Update — ${itemTitle}`, html: `<div style="font-family:Arial,sans-serif;color:#0b2344;line-height:1.6;max-width:640px"><h2>Resource Request Update</h2><p><strong>${escapeHtml(businessName)}</strong></p><p><strong>${escapeHtml(itemTitle)}</strong></p><p>${escapeHtml(copy)}</p></div>` });
  } catch (error) {
    console.error("LINK request status email error:", error);
    return { error: true };
  }
}

export async function sendBusinessInvite({ req, fromBusiness, inviteeName, inviteeEmail, audienceType, token }) {
  const resend = mailer();
  if (!resend) return { configured: false };
  const url = `${publicBaseUrl(req)}/api/invites/open?token=${encodeURIComponent(token)}`;
  return resend.emails.send({
    from: process.env.LINK_FROM_EMAIL,
    to: inviteeEmail,
    replyTo: fromBusiness.email,
    subject: `${fromBusiness.business_name} invited you to LINK Community Hub™`,
    html: `<div style="font-family:Arial,sans-serif;color:#0b2344;line-height:1.6;max-width:640px"><h2>You’re invited to LINK Community Hub™</h2><p>${escapeHtml(inviteeName || "Hello")}, ${escapeHtml(fromBusiness.business_name)} thought LINK Community Hub™ may be useful to you as a ${escapeHtml(audienceType || "community participant")}.</p><p>LINK connects local needs, nonprofits, businesses, schools, volunteers, resources and opportunities so more community support can happen locally.</p><p><a href="${url}" style="display:inline-block;background:#0b2344;color:white;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:700">Explore LINK Community Hub™</a></p></div>`
  });
}
