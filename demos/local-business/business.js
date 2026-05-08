const menuItems = [
  { name: "Sourdough breakfast", category: "breakfast", text: "Toast, eggs, tomato relish, and herb butter.", price: "EUR 9.50" },
  { name: "Espresso set", category: "breakfast", text: "Double espresso with a small pastry.", price: "EUR 5.80" },
  { name: "Seasonal lunch box", category: "lunch", text: "Sandwich, salad, fruit, and fresh juice.", price: "EUR 13.00" },
  { name: "Roasted vegetable tart", category: "lunch", text: "Savory tart with greens and house dressing.", price: "EUR 11.50" },
  { name: "Cinnamon roll", category: "sweet", text: "Soft roll with cardamom and vanilla glaze.", price: "EUR 4.20" },
  { name: "Mini cake box", category: "sweet", text: "Six small cakes for office or study groups.", price: "EUR 18.00" }
];

const menuGrid = document.querySelector("#menu-grid");
const filterButtons = document.querySelectorAll("[data-filter]");
const bookingForm = document.querySelector("#booking-form");
const bookingStatus = document.querySelector("#booking-status");
const bookingConfirmation = document.querySelector("#booking-confirmation");
const bookingCode = document.querySelector("#booking-code");
const confirmationSummary = document.querySelector("#confirmation-summary");
const customerEmailLine = document.querySelector("#customer-email-line");
const timingLine = document.querySelector("#timing-line");
const emailSubject = document.querySelector("#email-subject");
const emailBody = document.querySelector("#email-body");

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    filterButtons.forEach((item) => item.classList.toggle("active", item === button));
    renderMenu(button.dataset.filter);
  });
});

bookingForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = new FormData(bookingForm);
  const payload = Object.fromEntries(data.entries());

  bookingStatus.textContent = "Creating booking request...";

  try {
    const booking = await createBooking(payload);
    renderBookingConfirmation(booking);
  } catch (error) {
    bookingStatus.textContent = error.message;
  }
});

renderMenu("all");

function renderMenu(filter) {
  const visibleItems = filter === "all" ? menuItems : menuItems.filter((item) => item.category === filter);
  menuGrid.innerHTML = visibleItems
    .map(
      (item) => `
        <article class="menu-card">
          <span class="pill good">${item.category}</span>
          <strong>${item.name}</strong>
          <p>${item.text}</p>
          <div class="price-row">
            <span>${item.price}</span>
            <span>Order</span>
          </div>
        </article>
      `
    )
    .join("");
}

function createBookingCode() {
  const date = new Date();
  const stamp = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `CB-${stamp}-${suffix}`;
}

async function createBooking(payload) {
  let response;

  try {
    response = await fetch(getBookingEndpoint(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  } catch {
    return createLocalBooking(payload);
  }

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result.error || "Booking email could not be sent. Check the server email settings.");
  }

  return result;
}

function getBookingEndpoint() {
  const isLocalhost = window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost";
  const isStaticDevPort = ["5500", "5501", "5502"].includes(window.location.port);

  if (isLocalhost && isStaticDevPort) {
    return "http://127.0.0.1:4173/api/bookings";
  }

  return "/api/bookings";
}

function createLocalBooking(payload) {
  const guests = Number(payload.guests);
  const responseWindow = guests > 6 ? "15 minutes" : "10 minutes";
  const bookingCode = createBookingCode();
  const name = payload.name.trim();
  const day = payload.day;
  const time = payload.time;

  return {
    bookingCode,
    status: guests > 6 ? "manual_review" : "request_created",
    summary: `${name}, your request for ${guests} guest${guests === 1 ? "" : "s"} on ${day.toLowerCase()} at ${time} has been created.`,
    customerEmail: {
      to: payload.email.trim(),
      subject: `Corner Bakery booking ${bookingCode}`,
      deliveryStatus: "preview",
      body: `Hi ${name}, we received your booking request for ${guests} guest${guests === 1 ? "" : "s"} on ${day.toLowerCase()} at ${time}. This email includes the address, arrival time, and a note that final staff confirmation follows within ${responseWindow}.`
    },
    emailDelivery: {
      provider: "local_preview",
      status: "preview"
    },
    timing: {
      immediate: "Customer confirmation email and staff notification are queued immediately.",
      staffConfirmation: `Staff confirms the final table status within ${responseWindow} during 07:30-18:00 opening hours.`,
      afterHours: "Requests after 17:45 are answered by 08:15 next opening day."
    }
  };
}

function renderBookingConfirmation(booking) {
  const customerStatus = booking.customerEmail.deliveryStatus || booking.emailDelivery?.customer?.status || "queued";
  const staffStatus = booking.staffEmail?.deliveryStatus || booking.emailDelivery?.staff?.status || "queued";
  const customerError = booking.emailDelivery?.customer?.error || booking.emailDelivery?.error;
  const emailFailed = customerStatus === "failed";
  const emailSent = customerStatus === "sent";

  bookingCode.textContent = booking.bookingCode;
  confirmationSummary.textContent = booking.summary;
  customerEmailLine.textContent = getCustomerEmailLine(booking, customerStatus, customerError);
  timingLine.textContent = `${booking.timing.staffConfirmation} ${booking.timing.afterHours}`;
  emailSubject.textContent = booking.customerEmail.subject;
  emailBody.textContent = booking.customerEmail.body;

  if (emailSent && staffStatus === "sent") {
    bookingStatus.textContent = `Booking confirmed. Confirmation email sent to ${booking.customerEmail.to}, and staff was notified.`;
  } else if (emailSent) {
    bookingStatus.textContent = `Booking confirmed. Confirmation email sent to ${booking.customerEmail.to}; staff notification still needs email setup.`;
  } else if (emailFailed) {
    bookingStatus.textContent = `Booking confirmed in this demo. Customer email was not sent: ${customerError || "email provider setup is incomplete."}`;
  } else {
    bookingStatus.textContent =
      booking.status === "manual_review"
        ? "Large group request created. Customer email and bakery notification are queued; staff review follows."
        : "Booking request created. Customer email and bakery notification are queued.";
  }

  bookingConfirmation.hidden = false;
}

function getCustomerEmailLine(booking, status, error) {
  if (status === "sent") {
    return `Confirmation email sent to ${booking.customerEmail.to}.`;
  }

  if (status === "failed") {
    return `Booking was created, but customer email was not sent: ${error || "email provider setup is incomplete."}`;
  }

  return `${booking.timing.immediate} Recipient: ${booking.customerEmail.to}.`;
}
