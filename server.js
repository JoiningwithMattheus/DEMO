require("dotenv").config();
const {Resend} = require("resend");
const http = require("http");
const fs = require("fs");
const path = require("path");

const root = __dirname;
const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || "0.0.0.0";
const resend = new Resend(process.env.RESEND_API_KEY);

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml"
};

const server = http.createServer(async (request, response) => {
  if (request.method === "POST" && request.url === "/api/bookings") {
    handleBooking(request, response);
    return;
  }

  serveStatic(request, response);
});

server.listen(port, host, () => {
  console.log(`Portfolio demo server running at http://127.0.0.1:${port}/`);
});

function serveStatic(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const cleanPath = decodeURIComponent(url.pathname).replace(/^\/+/, "");
  let filePath = path.join(root, cleanPath || "index.html");

  if (!filePath.startsWith(root)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, "index.html");
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }

    response.writeHead(200, {
      "Content-Type": mimeTypes[path.extname(filePath)] || "application/octet-stream"
    });
    response.end(content);
  });
}

async function handleBooking(request, response) {
  try {
    const body = await readJson(request);
    const booking = createBookingResponse(body);

    try {
      const delivery = await sendBookingEmails(booking);
      booking.customerEmail.deliveryStatus = "sent";
      booking.staffEmail.deliveryStatus = "sent";
      booking.emailDelivery = delivery;
    } catch (emailError) {
      booking.customerEmail.deliveryStatus = "failed";
      booking.staffEmail.deliveryStatus = "failed";
      booking.emailDelivery = {
        provider: process.env.EMAIL_PROVIDER || "not_configured",
        status: "failed",
        error: emailError.message
      };
    }

    response.writeHead(201, { "Content-Type": "application/json; charset=utf-8" });
    response.end(JSON.stringify(booking));
  } catch (error) {
    response.writeHead(error.statusCode || 400, { "Content-Type": "application/json; charset=utf-8" });
    response.end(JSON.stringify({ error: error.message }));
  }
}

async function sendBookingEmails(booking){
  if (process.env.EMAIL_PROVIDER !== "resend") {
    throw createEmailError("EMAIL_PROVIDER must be set to resend for this server setup.");
  }

  if (!process.env.RESEND_API_KEY) {
    throw createEmailError("RESEND_API_KEY is missing.");
  }

  if (!process.env.FROM_EMAIL || /yourdomain\.com|example\.com/.test(process.env.FROM_EMAIL)) {
    throw createEmailError("FROM_EMAIL must be a verified Resend sender, not the placeholder domain.");
  }

  if (!process.env.STAFF_EMAIL || /your@email\.com|example\.com/.test(process.env.STAFF_EMAIL)) {
    throw createEmailError("STAFF_EMAIL must be your real receiving email address.");
  }

  const customerDelivery = await sendResendEmail({
    from: process.env.FROM_EMAIL,
    to: [booking.customerEmail.to],
    subject: booking.customerEmail.subject,
    html: paragraphHtml(booking.customerEmail.body),
    text: booking.customerEmail.body,
    replyTo: process.env.STAFF_EMAIL
  });

  const staffDelivery = await sendResendEmail({
    from: process.env.FROM_EMAIL,
    to: [process.env.STAFF_EMAIL],
    subject: booking.staffEmail.subject,
    html: paragraphHtml(`New booking: ${booking.summary}`),
    text: `New booking: ${booking.summary}`
  });

  return {
    provider: "resend",
    customerMessageId: customerDelivery.id,
    staffMessageId: staffDelivery.id
  };
}

async function sendResendEmail(message) {
  const { data, error } = await resend.emails.send(message);

  if (error) {
    throw createEmailError(`Resend rejected the email: ${error.message || "Unknown error"}`);
  }

  return data;
}

function createEmailError(message) {
  const error = new Error(message);
  error.statusCode = 502;
  return error;
}

function paragraphHtml(text) {
  return `<p>${escapeHtml(text)}</p>`;
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => {
    const map = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    };
    return map[character];
  });
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let body = "";

    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        reject(new Error("Request body too large"));
      }
    });

    request.on("end", () => {
      try {
        resolve(JSON.parse(body || "{}"));
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
  });
}

function createBookingResponse(data) {
  const name = requiredText(data.name, "Name");
  const email = requiredText(data.email, "Email");
  const day = requiredText(data.day, "Day");
  const time = requiredText(data.time, "Time");
  const guests = Number(data.guests);

  if (!Number.isInteger(guests) || guests < 1 || guests > 12) {
    throw new Error("Guests must be between 1 and 12");
  }

  const bookingCode = createBookingCode();
  const manualReview = guests > 6;
  const responseWindow = manualReview ? "15 minutes" : "10 minutes";
  const sentAt = new Date().toISOString();

  return {
    bookingCode,
    status: manualReview ? "manual_review" : "request_created",
    summary: `${name}, your request for ${guests} guest${guests === 1 ? "" : "s"} on ${day.toLowerCase()} at ${time} has been created.`,
    customerEmail: {
      to: email,
      subject: `Corner Bakery booking ${bookingCode}`,
      deliveryStatus: "queued",
      sentAt,
      body: `Hi ${name}, we received your booking request for ${guests} guest${guests === 1 ? "" : "s"} on ${day.toLowerCase()} at ${time}. This email includes the address, arrival time, and a note that final staff confirmation follows within ${responseWindow}.`
    },
    staffEmail: {
      to: process.env.STAFF_EMAIL,
      subject: `New booking request ${bookingCode}`,
      deliveryStatus: "queued",
      sentAt
    },
    timing: {
      immediate: "Customer confirmation email and staff notification are queued immediately.",
      staffConfirmation: `Staff confirms the final table status within ${responseWindow} during 07:30-18:00 opening hours.`,
      afterHours: "Requests after 17:45 are answered by 08:15 next opening day."
    }
  };
}

function requiredText(value, label) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} is required`);
  }

  return value.trim();
}

function createBookingCode() {
  const date = new Date();
  const stamp = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `CB-${stamp}-${suffix}`;
}
