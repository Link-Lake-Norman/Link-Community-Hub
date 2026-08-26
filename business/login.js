const tabs = Array.from(document.querySelectorAll("[data-tab]"));
const signinForm = document.getElementById("signinForm");
const registerForm = document.getElementById("registerForm");
const signinStatus = document.getElementById("signinStatus");
const registerStatus = document.getElementById("registerStatus");
const params = new URLSearchParams(window.location.search);
const inviteToken = params.get("invite") || "";

function showTab(name) {
  tabs.forEach(tab => tab.classList.toggle("active", tab.dataset.tab === name));
  signinForm.classList.toggle("hidden", name !== "signin");
  registerForm.classList.toggle("hidden", name !== "register");
}

tabs.forEach(tab => tab.addEventListener("click", () => showTab(tab.dataset.tab)));

const error = params.get("error");
if (error) {
  signinStatus.className = "status error";
  signinStatus.textContent =
    error === "expired-link"
      ? "That sign-in link has expired. Request a new secure link below."
      : "That sign-in link is invalid. Request a new secure link below.";
}

if (inviteToken) showTab("register");

signinForm.addEventListener("submit", async event => {
  event.preventDefault();
  signinStatus.className = "status";
  signinStatus.textContent = "Sending secure sign-in link…";

  try {
    const response = await fetch("/api/business/auth/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: document.getElementById("signinEmail").value })
    });
    const data = await response.json();
    signinStatus.className = response.ok ? "status success" : "status error";
    signinStatus.textContent =
      data.message || data.error || "Check your email for your LINK sign-in link.";
  } catch {
    signinStatus.className = "status error";
    signinStatus.textContent = "The sign-in request could not be sent. Please try again.";
  }
});

registerForm.addEventListener("submit", async event => {
  event.preventDefault();
  registerStatus.className = "status";
  registerStatus.textContent = "Creating your LINK business account…";

  try {
    const response = await fetch("/api/business/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        businessName: document.getElementById("businessName").value,
        contactName: document.getElementById("contactName").value,
        email: document.getElementById("registerEmail").value,
        phone: document.getElementById("phone").value,
        website: document.getElementById("website").value,
        termsAccepted: document.getElementById("termsAccepted").checked,
        inviteToken
      })
    });
    const data = await response.json();
    registerStatus.className = response.ok ? "status success" : "status error";
    registerStatus.textContent = data.message || data.error || "Registration received.";
  } catch {
    registerStatus.className = "status error";
    registerStatus.textContent = "Business registration could not be completed. Please try again.";
  }
});
