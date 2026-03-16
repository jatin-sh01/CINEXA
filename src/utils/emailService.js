import axios from "axios";

const BRAND_NAME = process.env.MAIL_BRAND_NAME || "CINEXA";
const BRAND_LOGO_URL =
  process.env.MAIL_LOGO_URL ||
  process.env.MAIL_LOGO_CID ||
  process.env.BRAND_LOGO_URL ||
  "cid:cinexa-logo@cinexa.mail";
const BRAND_PRIMARY_COLOR = process.env.MAIL_PRIMARY_COLOR || "#e11d48";
const BRAND_BG_COLOR = process.env.MAIL_BG_COLOR || "#f8fafc";
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || "support@cinexa.com";

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function toHtmlParagraphs(message = "") {
  return escapeHtml(message)
    .split("\n")
    .filter(Boolean)
    .map((line) => `<p style=\"margin:0 0 12px 0;\">${line}</p>`)
    .join("");
}

function renderBrandedTemplate({ title, previewText = "", bodyHtml, cta }) {
  const safeTitle = escapeHtml(title);
  const safePreviewText = escapeHtml(previewText);

  const ctaHtml = cta?.url
    ? `<a href=\"${escapeHtml(cta.url)}\" style=\"display:inline-block;padding:12px 18px;border-radius:8px;background:${BRAND_PRIMARY_COLOR};color:#ffffff;text-decoration:none;font-weight:600;\">${escapeHtml(cta.label || "Open")}</a>`
    : "";

  return `
<!doctype html>
<html lang=\"en\">
  <head>
    <meta charset=\"utf-8\" />
    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />
    <title>${safeTitle}</title>
  </head>
  <body style=\"margin:0;padding:0;background:${BRAND_BG_COLOR};font-family:Segoe UI,Arial,sans-serif;color:#111827;\">
    <div style=\"display:none;max-height:0;overflow:hidden;opacity:0;\">${safePreviewText}</div>
    <table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"padding:20px 12px;\">
      <tr>
        <td align=\"center\">
          <table role=\"presentation\" width=\"600\" cellpadding=\"0\" cellspacing=\"0\" style=\"max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;\">
            <tr>
              <td style=\"padding:20px 24px;border-bottom:1px solid #e5e7eb;\">
                <img src=\"${escapeHtml(BRAND_LOGO_URL)}\" alt=\"${escapeHtml(BRAND_NAME)}\" style=\"height:36px;display:block;\" />
              </td>
            </tr>
            <tr>
              <td style=\"padding:24px;\">
                <h1 style=\"margin:0 0 12px 0;font-size:20px;line-height:1.3;\">${safeTitle}</h1>
                <div style=\"font-size:14px;line-height:1.6;color:#374151;\">${bodyHtml}</div>
                ${ctaHtml ? `<div style=\"margin-top:20px;\">${ctaHtml}</div>` : ""}
              </td>
            </tr>
            <tr>
              <td style=\"padding:18px 24px;background:#f9fafb;color:#6b7280;font-size:12px;line-height:1.5;\">
                Need help? Contact us at ${escapeHtml(SUPPORT_EMAIL)}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

const sendMail = async (subject, email, content, options = {}) => {
  const html =
    options.html ||
    renderBrandedTemplate({
      title: subject,
      previewText: subject,
      bodyHtml: toHtmlParagraphs(content),
      cta: options.cta,
    });

  try {
    await axios.post(process.env.NOTI_SERVICE + "/api/tickets", {
      subject,
      recepientEmails: [email],
      content,
      html,
    });
    console.log("mail queued", { subject, email, hasHtml: Boolean(html) });
  } catch (error) {
    console.error("mail queue failed", {
      subject,
      email,
      message: error?.message,
      status: error?.response?.status,
      response: error?.response?.data,
    });
    throw error;
  }
};

async function sendAccountCreatedMail({ email, name }) {
  const subject = `Welcome to ${BRAND_NAME}`;
  const content = `Hi ${name || "there"},\n\nYour account has been created successfully. Start exploring movies and book your next show.`;

  const html = renderBrandedTemplate({
    title: "Welcome to CINEXA",
    previewText: "Your account is ready",
    bodyHtml: `
      <p style=\"margin:0 0 12px 0;\">Hi ${escapeHtml(name || "there")},</p>
      <p style=\"margin:0 0 12px 0;\">Your account has been created successfully.</p>
      <p style=\"margin:0;\">You can now browse shows, reserve seats, and complete payments securely.</p>
    `,
  });

  return sendMail(subject, email, content, { html });
}

async function sendBookingCreatedMail({
  email,
  name,
  bookingId,
  movieName,
  theaterName,
  showTiming,
  seats,
  amount,
}) {
  const subject = "Booking created. Complete payment to confirm";
  const content = `Hi ${name || "there"},\n\nYour booking is created with id ${bookingId}. Complete payment to confirm your seats.`;

  const html = renderBrandedTemplate({
    title: "Booking Created",
    previewText: "Complete payment to confirm your booking",
    bodyHtml: `
      <p style=\"margin:0 0 12px 0;\">Hi ${escapeHtml(name || "there")},</p>
      <p style=\"margin:0 0 12px 0;\">Your booking has been created and is awaiting payment.</p>
      <p style=\"margin:0 0 8px 0;\"><strong>Booking ID:</strong> ${escapeHtml(bookingId)}</p>
      <p style=\"margin:0 0 8px 0;\"><strong>Movie:</strong> ${escapeHtml(movieName || "-")}</p>
      <p style=\"margin:0 0 8px 0;\"><strong>Theater:</strong> ${escapeHtml(theaterName || "-")}</p>
      <p style=\"margin:0 0 8px 0;\"><strong>Show:</strong> ${escapeHtml(showTiming || "-")}</p>
      <p style=\"margin:0 0 8px 0;\"><strong>Seats:</strong> ${escapeHtml(seats || "-")}</p>
      <p style=\"margin:0;\"><strong>Amount:</strong> ${escapeHtml(amount || "-")}</p>
    `,
  });

  return sendMail(subject, email, content, { html });
}

async function sendBookingPaymentSuccessMail({
  email,
  name,
  bookingId,
  transactionId,
  movieName,
  theaterName,
  showTiming,
  seats,
  amount,
}) {
  const subject = "Payment successful. Booking confirmed";
  const content = `Hi ${name || "there"},\n\nPayment is successful and your booking ${bookingId} is confirmed.`;

  const html = renderBrandedTemplate({
    title: "Booking Confirmed",
    previewText: "Payment received successfully",
    bodyHtml: `
      <p style=\"margin:0 0 12px 0;\">Hi ${escapeHtml(name || "there")},</p>
      <p style=\"margin:0 0 12px 0;\">Your payment was successful and your booking is confirmed.</p>
      <p style=\"margin:0 0 8px 0;\"><strong>Booking ID:</strong> ${escapeHtml(bookingId)}</p>
      <p style=\"margin:0 0 8px 0;\"><strong>Transaction ID:</strong> ${escapeHtml(transactionId || "-")}</p>
      <p style=\"margin:0 0 8px 0;\"><strong>Movie:</strong> ${escapeHtml(movieName || "-")}</p>
      <p style=\"margin:0 0 8px 0;\"><strong>Theater:</strong> ${escapeHtml(theaterName || "-")}</p>
      <p style=\"margin:0 0 8px 0;\"><strong>Show:</strong> ${escapeHtml(showTiming || "-")}</p>
      <p style=\"margin:0 0 8px 0;\"><strong>Seats:</strong> ${escapeHtml(seats || "-")}</p>
      <p style=\"margin:0;\"><strong>Amount Paid:</strong> ${escapeHtml(amount || "-")}</p>
    `,
  });

  return sendMail(subject, email, content, { html });
}

async function sendBookingPaymentFailedMail({
  email,
  name,
  bookingId,
  transactionId,
  reason,
}) {
  const subject = "Payment failed for your booking";
  const content = `Hi ${name || "there"},\n\nWe could not complete payment for booking ${bookingId}. Please try again.`;

  const html = renderBrandedTemplate({
    title: "Payment Failed",
    previewText: "Please retry payment",
    bodyHtml: `
      <p style=\"margin:0 0 12px 0;\">Hi ${escapeHtml(name || "there")},</p>
      <p style=\"margin:0 0 12px 0;\">We could not complete your payment for the booking below.</p>
      <p style=\"margin:0 0 8px 0;\"><strong>Booking ID:</strong> ${escapeHtml(bookingId)}</p>
      <p style=\"margin:0 0 8px 0;\"><strong>Transaction ID:</strong> ${escapeHtml(transactionId || "-")}</p>
      <p style=\"margin:0;\"><strong>Reason:</strong> ${escapeHtml(reason || "Payment was declined or cancelled")}</p>
    `,
  });

  return sendMail(subject, email, content, { html });
}

async function sendBookingExpiredMail({ email, name, bookingId }) {
  const subject = "Booking expired";
  const content = `Hi ${name || "there"},\n\nYour booking ${bookingId} has expired because payment was not completed in time.`;

  const html = renderBrandedTemplate({
    title: "Booking Expired",
    previewText: "Create a new booking to continue",
    bodyHtml: `
      <p style=\"margin:0 0 12px 0;\">Hi ${escapeHtml(name || "there")},</p>
      <p style=\"margin:0 0 12px 0;\">Your booking has expired because payment was not completed in time.</p>
      <p style=\"margin:0;\"><strong>Booking ID:</strong> ${escapeHtml(bookingId)}</p>
    `,
  });

  return sendMail(subject, email, content, { html });
}

export {
  sendAccountCreatedMail,
  sendBookingCreatedMail,
  sendBookingPaymentSuccessMail,
  sendBookingPaymentFailedMail,
  sendBookingExpiredMail,
  renderBrandedTemplate,
};

export default sendMail;
