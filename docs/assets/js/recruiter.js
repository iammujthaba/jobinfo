/**
 * recruiter.js — Handles the 3-step OTP-authenticated vacancy submission.
 * Step 1: Enter WhatsApp number → send OTP
 * Step 2: Enter OTP → verify → get session token
 * Step 3: Vacancy form visible → submits to backend API
 */

"use strict";

/* ── State ───────────────────────────────────────────────────────────────── */
let sessionToken = null;
let verifiedWaNumber = null;

/* ── DOM References ──────────────────────────────────────────────────────── */
const step1    = document.getElementById("otp-step1");
const step2    = document.getElementById("otp-step2");
const step3    = document.getElementById("otp-step3");
const jobForm  = document.querySelector(".job-form");

/* ── Helper: show a step ─────────────────────────────────────────────────── */
function showStep(n) {
  [step1, step2, step3].forEach((el, i) => {
    if (!el) return;
    el.style.display = (i + 1 === n) ? "block" : "none";
  });
  if (n === 3 && jobForm) jobForm.style.display = "block";
}

/* ── Step 1: Send OTP ────────────────────────────────────────────────────── */
const sendOtpBtn = document.getElementById("send-otp-btn");
if (sendOtpBtn) {
  sendOtpBtn.addEventListener("click", async () => {
    const waInput = document.getElementById("wa-number-input");
    const number = (waInput?.value || "").replace(/\D/g, "");
    if (number.length < 10) {
      swal("Invalid Number", "Please enter a valid WhatsApp number (10 digits minimum).", "warning");
      return;
    }
    // Admin shortcut: entering the admin number redirects to admin.html
    if (number === "7025962175") {
      window.location.href = "admin.html";
      return;
    }
    // Prepend 91 if not already an international number
    verifiedWaNumber = number.startsWith("91") ? number : "91" + number;

    sendOtpBtn.disabled = true;
    sendOtpBtn.innerHTML = '<i class="bi bi-hourglass-split me-1"></i>Sending…';

    try {
      const res = await fetch(`${JOBINFO_CONFIG.API_URL}/api/otp/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wa_number: verifiedWaNumber }),
      });
      if (!res.ok) throw new Error(await res.text());
      // Show success feedback briefly before moving to step 2
      sendOtpBtn.innerHTML = '<i class="bi bi-check-circle-fill me-1"></i>OTP Sent!';
      await new Promise(r => setTimeout(r, 800));
      showStep(2);
      // Show countdown for resend
      startResendCountdown();
    } catch (err) {
      swal("Error", "Could not send OTP. Please try again.", "error");
      console.error(err);
      sendOtpBtn.disabled = false;
      sendOtpBtn.innerHTML = '<i class="bi bi-send me-1"></i>Send OTP';
    }
  });
}

/* ── Step 2: Verify OTP ──────────────────────────────────────────────────── */
const verifyOtpBtn = document.getElementById("verify-otp-btn");
if (verifyOtpBtn) {
  verifyOtpBtn.addEventListener("click", async () => {
    const otpInput = document.getElementById("otp-input");
    const code = (otpInput?.value || "").trim();
    if (code.length !== 6) {
      swal("Invalid OTP", "Please enter the 6-digit OTP sent to your WhatsApp.", "warning");
      return;
    }

    verifyOtpBtn.disabled = true;
    verifyOtpBtn.textContent = "Verifying…";

    try {
      const res = await fetch(`${JOBINFO_CONFIG.API_URL}/api/otp/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wa_number: verifiedWaNumber, otp_code: code }),
      });
      if (!res.ok) {
        swal("Wrong OTP", "The OTP is incorrect or expired. Please try again.", "error");
        return;
      }
      const data = await res.json();
      sessionToken = data.session_token;
      // Write both key pairs so either login path grants full access everywhere
      sessionStorage.setItem("ji_token",   sessionToken);
      sessionStorage.setItem("ji_wa",      verifiedWaNumber);
      sessionStorage.setItem("ji_r_token", sessionToken);
      sessionStorage.setItem("ji_r_wa",    verifiedWaNumber);
      // Instantly update the nav Login button without a page reload
      const loginNavBtn = document.getElementById("login-nav-btn");
      if (loginNavBtn) {
        loginNavBtn.innerHTML = '<i class="bi bi-layout-text-sidebar-reverse me-1"></i>My Vacancies';
      }
      showStep(3);
      // Pre-fill hidden WA field in the job form
      const hiddenWa = document.getElementById("form-wa-number");
      if (hiddenWa) hiddenWa.value = verifiedWaNumber;
    } catch (err) {
      swal("Error", "Verification failed. Please try again.", "error");
      console.error(err);
    } finally {
      verifyOtpBtn.disabled = false;
      verifyOtpBtn.textContent = "Verify OTP";
    }
  });
}

/* ── Resend OTP countdown ────────────────────────────────────────────────── */
function startResendCountdown() {
  const resendBtn = document.getElementById("resend-otp-btn");
  if (!resendBtn) return;
  let sec = 60;
  resendBtn.disabled = true;
  resendBtn.textContent = `Resend in ${sec}s`;
  const timer = setInterval(() => {
    sec--;
    if (sec <= 0) {
      clearInterval(timer);
      resendBtn.disabled = false;
      resendBtn.textContent = "Resend OTP";
    } else {
      resendBtn.textContent = `Resend in ${sec}s`;
    }
  }, 1000);
}

const resendOtpBtn = document.getElementById("resend-otp-btn");
if (resendOtpBtn) {
  resendOtpBtn.addEventListener("click", async () => {
    if (!verifiedWaNumber) return;
    resendOtpBtn.disabled = true;
    try {
      await fetch(`${JOBINFO_CONFIG.API_URL}/api/otp/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wa_number: verifiedWaNumber }),
      });
      startResendCountdown();
      swal("OTP Sent", "A new OTP has been sent to your WhatsApp.", "success");
    } catch {
      resendOtpBtn.disabled = false;
    }
  });
}

/* ── Step 3: Submit Vacancy Form ─────────────────────────────────────────── */
if (jobForm) {
  jobForm.style.display = "none"; // hidden until OTP verified

  jobForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Restore session if page was refreshed
    if (!sessionToken) sessionToken = sessionStorage.getItem("ji_token");
    if (!verifiedWaNumber) verifiedWaNumber = sessionStorage.getItem("ji_wa");

    if (!sessionToken || !verifiedWaNumber) {
      swal("Session Expired", "Please verify your WhatsApp number again.", "warning");
      showStep(1);
      return;
    }

    const submitBtn = jobForm.querySelector("[type=submit]");
    submitBtn.disabled = true;
    submitBtn.textContent = "Submitting…";

    const fd = new FormData(jobForm);
    const payload = {
      wa_number: verifiedWaNumber,
      session_token: sessionToken,
      title: fd.get("job-post"),
      company: fd.get("company-name"),
      location: `${fd.get("location")}, ${fd.get("district")}`,
      description: buildDescription(fd),
      salary_range: fd.get("salary") || null,
      experience_required: fd.get("experience-level") || null,
    };

    try {
      const res = await fetch(`${JOBINFO_CONFIG.API_URL}/api/recruiters/vacancy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      swal(
        "Vacancy Submitted! 🎉",
        `Your vacancy (${data.job_code}) has been received and is under review. You'll get a WhatsApp notification once it's approved.`,
        "success"
      );
      jobForm.reset();
    } catch (err) {
      swal("Submission Failed", "Something went wrong. Please try again or contact us on WhatsApp.", "error");
      console.error(err);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Submit Job";
    }
  });
}

/* ── Build description from extra fields ─────────────────────────────────── */
function buildDescription(fd) {
  const parts = [];
  if (fd.get("gender") && fd.get("gender") !== "") parts.push(`Gender Preference: ${fd.get("gender")}`);
  if (fd.get("Number-of-Vacancies")) parts.push(`Total Vacancies: ${fd.get("Number-of-Vacancies")}`);
  if (fd.get("skills")) parts.push(`Skills: ${fd.get("skills")}`);
  if (fd.get("qualification")) parts.push(`Qualification: ${fd.get("qualification")}`);
  if (fd.get("contact-number")) parts.push(`Contact: ${fd.get("contact-number")}`);
  if (fd.get("additional-info")) parts.push(`Additional Info: ${fd.get("additional-info")}`);
  return parts.join("\n") || null;
}

/* ── FAQ toggle (preserved from original) ────────────────────────────────── */
const toggleBtn = document.getElementById("toggle-question-form");
const formWrapper = document.getElementById("question-form-wrapper");
if (toggleBtn && formWrapper) {
  toggleBtn.addEventListener("click", () => {
    const isHidden = formWrapper.style.display === "none";
    formWrapper.style.display = isHidden ? "block" : "none";
    toggleBtn.textContent = isHidden ? "Close" : "Ask Question";
  });
}

/* ── Accordion (preserved) ───────────────────────────────────────────────── */
document.querySelectorAll(".accordion-header").forEach((header) => {
  header.addEventListener("click", () => {
    const body = header.nextElementSibling;
    const isOpen = body.style.maxHeight;
    document.querySelectorAll(".accordion-body").forEach((b) => (b.style.maxHeight = null));
    document.querySelectorAll(".accordion-header").forEach((h) => h.classList.add("collapsed"));
    if (!isOpen) {
      body.style.maxHeight = body.scrollHeight + "px";
      header.classList.remove("collapsed");
    }
  });
});

/* ── Auto-skip OTP if recruiter is already logged in via dashboard ──────────
   This MUST stay at the very bottom so it runs AFTER the form init block
   that sets jobForm.style.display = "none".                                   */
(function restoreDashboardSession() {
  // Check dashboard session first, then fall back to direct OTP session
  const rToken = sessionStorage.getItem("ji_r_token") || sessionStorage.getItem("ji_token");
  const rWa    = sessionStorage.getItem("ji_r_wa")    || sessionStorage.getItem("ji_wa");
  if (!rToken || !rWa) return;          // not logged in — use normal OTP flow

  sessionToken     = rToken;
  verifiedWaNumber = rWa;

  // Pre-fill hidden WA field used by form submission
  const hiddenWa = document.getElementById("form-wa-number");
  if (hiddenWa) hiddenWa.value = rWa;

  // Hide OTP step boxes, show logged-in banner
  if (step1) step1.style.display = "none";
  if (step2) step2.style.display = "none";
  if (step3) {
    step3.style.display = "block";
    step3.innerHTML = `
      <div class="alert alert-success text-center fw-semibold mb-4">
        <i class="bi bi-check-circle-fill me-2"></i>
        You're logged in as <strong>+${rWa}</strong>. Fill in your vacancy details below.
      </div>`;
  }

  // Show the form — overrides the display:none set by the form init block above
  if (jobForm) jobForm.style.display = "block";
})();
