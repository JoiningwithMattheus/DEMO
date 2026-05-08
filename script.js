const contactForm = document.querySelector("#contact-form");
const formStatus = document.querySelector("#form-status");

contactForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(contactForm);
  const subject = encodeURIComponent(`Freelance request: ${data.get("projectType")}`);
  const body = encodeURIComponent(
    `Hi,\n\nMy name is ${data.get("name")}.\n\nProject type: ${data.get("projectType")}\nEmail: ${data.get("email")}\n\n${data.get("message") || ""}`
  );

  formStatus.textContent = "Opening your email app with the project details.";
  window.location.href = `mailto:vinhtai20305@gmail.com?subject=${subject}&body=${body}`;
});
