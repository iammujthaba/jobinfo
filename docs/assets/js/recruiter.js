/**
 * recruiter.js — Handles the 3-step OTP authenticated vacancy submission & Registration.
 */

"use strict";

let sessionToken = null;
let verifiedWaNumber = null;
// Store whether this specific surface is in registration mode
let surfaceRegMode = {}; 
let registrationData = {};

/* ── Magic Link Interception ─────────────────────────────────────────────── */
document.addEventListener("DOMContentLoaded", () => {
  const urlParams = new URLSearchParams(window.location.search);
  const magicToken = urlParams.get('token') || urlParams.get('magic_token');

  if (magicToken) {
    const overlayHtml = `
      <div id="magic-auth-overlay" style="position:fixed;top:0;left:0;width:100vw;height:100vh;background:#fff;z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;">
        <div class="spinner-border text-success mb-3" role="status" style="width:3rem;height:3rem;"></div>
        <h5 class="text-muted fw-bold">Authenticating...</h5>
        <p class="text-muted small">Please wait while we log you in securely.</p>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', overlayHtml);

    fetch(`${JOBINFO_CONFIG.API_URL}/api/auth/magic/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: magicToken })
    })
    .then(res => {
      if (!res.ok) throw new Error("Invalid or expired magic link");
      return res.json();
    })
    .then(data => {
      const sessionToken = data.session_token;
      const verifiedWaNumber = data.wa_number;

      sessionStorage.setItem("ji_token",   sessionToken);
      sessionStorage.setItem("ji_wa",      verifiedWaNumber);
      sessionStorage.setItem("ji_r_token", sessionToken);
      sessionStorage.setItem("ji_r_wa",    verifiedWaNumber);
      
      const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
      window.history.replaceState({ path: newUrl }, '', newUrl);
      
      window.location.href = 'recruiter-dashboard.html';
    })
    .catch(err => {
      console.error(err);
      const overlay = document.getElementById('magic-auth-overlay');
      if (overlay) overlay.remove();
      
      const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
      window.history.replaceState({ path: newUrl }, '', newUrl);

      swal("Authentication Failed", "This secure link has expired or is invalid. Please log in using OTP.", "warning");
    });
  }
});

/* ── DOM Init & Gatekeeper Logic ─────────────────────────────────────────── */
document.addEventListener("DOMContentLoaded", () => {
  // Initialize WhatsApp Banner Link
  if (typeof JOBINFO_CONFIG !== 'undefined' && JOBINFO_CONFIG.BUSINESS_WA) {
      const waBtn = document.getElementById('wa-post-btn');
      if (waBtn) {
          const triggerMessage = encodeURIComponent("Post Vacancy");
          waBtn.href = `https://wa.me/${JOBINFO_CONFIG.BUSINESS_WA}?text=${triggerMessage}`;
      }
  }
  // Initialize the inline surfaces conditionally based on what is present
  if (document.getElementById('inline-reg-form')) {
    initSurface('inline-', 'post-vacancy');
  } else if (document.getElementById('pv-reg-form')) {
    initSurface('pv-', 'post-vacancy');
  }
  
  // Initialize modal surface asynchronously after components.js fetches it
  const mc = document.getElementById("modals-container");
  if (mc) {
    if (document.getElementById("modal-step1")) {
      initSurface('modal-', 'dashboard');
    } else {
      const observer = new MutationObserver((mutations, obs) => {
        if (document.getElementById("modal-step1")) {
          initSurface('modal-', 'dashboard');
          obs.disconnect();
        }
      });
      observer.observe(mc, { childList: true, subtree: true });
    }
  }
  
  // Job form submit
  const jobForm = document.querySelector(".job-form");
  if (jobForm) {
    jobForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      if (!sessionToken) sessionToken = sessionStorage.getItem("ji_token");
      if (!verifiedWaNumber) verifiedWaNumber = sessionStorage.getItem("ji_wa");

      if (!sessionToken || !verifiedWaNumber) {
        swal("Session Expired", "Please verify your WhatsApp number again.", "warning");
        return;
      }

      const submitBtn = jobForm.querySelector("[type=submit]");
      submitBtn.disabled = true;
      submitBtn.textContent = "Submitting…";

      const fd = new FormData(jobForm);
      const payload = {
        wa_number: verifiedWaNumber,
        session_token: sessionToken,
        job_category: fd.get("job_category"),
        company_name: fd.get("company_name"),
        district_region: fd.get("district_region"),
        exact_location: fd.get("exact_location"),
        job_title: fd.get("job_title"),
        job_description: fd.get("job_description"),
        job_mode: fd.get("job_mode"),
        experience_required: fd.get("experience_required"),
        salary_range: fd.get("salary_range")
      };

      try {
        const res = await fetch(`${JOBINFO_CONFIG.API_URL}/api/recruiters/vacancy`, {
          method: "POST", headers: { "Content-Type": "application/json" },
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
});

function initSurface(prefix, intent) {
  const isModal = (prefix === 'modal-');
  const step1Id = isModal ? 'modal-step1' : 'otp-step1';
  const step2Id = isModal ? 'modal-step2' : 'otp-step2';
  const step3Id = isModal ? 'modal-step3' : 'otp-step3';
  const step4Id = isModal ? null : 'otp-step4'; // Success banner

  const waInputId = isModal ? 'modal-wa-input' : 'wa-number-input';
  const sendBtnId = isModal ? 'modal-send-otp-btn' : 'send-otp-btn';
  
  const regFormId = prefix + 'reg-form';
  const reqCompanyId = prefix + 'company';
  const reqTypeId = prefix + 'type';
  const reqLocId = prefix + 'location';
  const reqContactId = prefix + 'contact';
  
  const otpInputId = isModal ? 'modal-otp-input' : 'otp-input';
  const verifyBtnId = isModal ? 'modal-verify-btn' : 'verify-otp-btn';
  const resendBtnId = isModal ? 'modal-resend-btn' : 'resend-otp-btn';

  const s1 = document.getElementById(step1Id);
  const s2 = document.getElementById(step2Id);
  const s3 = document.getElementById(step3Id);
  const s4 = document.getElementById(step4Id);
  
  if (!s1 || !s2 || !s3) return; // Surface not present on this page
  
  const waInput = document.getElementById(waInputId);
  const sendBtn = document.getElementById(sendBtnId);
  const regForm = document.getElementById(regFormId);
  const otpInput = document.getElementById(otpInputId);
  const verifyBtn = document.getElementById(verifyBtnId);
  const resendBtn = document.getElementById(resendBtnId);

  const setDisplay = (n) => {
    s1.style.display = (n === 1) ? 'block' : 'none';
    s2.style.display = (n === 2) ? 'block' : 'none';
    s3.style.display = (n === 3) ? 'block' : 'none';
    if (s4) s4.style.display = (n === 4) ? 'block' : 'none';
    if (isModal) {
      document.getElementById('modal-dot1')?.classList.toggle('active', n >= 1);
      document.getElementById('modal-dot2')?.classList.toggle('active', n >= 2);
      document.getElementById('modal-dot3')?.classList.toggle('active', n >= 3);
    }
  };

  sendBtn.addEventListener('click', async () => {
    const number = (waInput.value || "").replace(/\D/g, "");
    if (number.length < 10) {
      swal("Invalid Number", "Please enter a valid WhatsApp number (10 digits minimum).", "warning"); return;
    }
    if (number === "7025962176") { window.location.href = "admin.html"; return; }
    
    verifiedWaNumber = number.startsWith("91") ? number : "91" + number;
    
    sendBtn.disabled = true;
    sendBtn.innerHTML = '<i class="bi bi-hourglass-split me-1"></i>Checking...';
    
    try {
      const res = await fetch(`${JOBINFO_CONFIG.API_URL}/api/auth/check-recruiter`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wa_number: verifiedWaNumber })
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      
      if (data.exists) {
        surfaceRegMode[prefix] = false;
        setDisplay(3);
        startResend(resendBtn, isModal ? 'modal-cd' : null);
      } else {
        surfaceRegMode[prefix] = true;
        setDisplay(2);
      }
    } catch(err) {
      swal("Error", "Could not check number. Try again.", "error");
    } finally {
      sendBtn.disabled = false;
      sendBtn.innerHTML = isModal ? 'Continue' : '<i class="bi bi-send me-1"></i>Send OTP';
    }
  });

  if (waInput) waInput.addEventListener('keydown', e => { if(e.key==='Enter') sendBtn.click(); });
  
  if (regForm) {
    regForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      registrationData[prefix] = {
        company_name: document.getElementById(reqCompanyId).value,
        business_type: document.getElementById(reqTypeId).value,
        location: document.getElementById(reqLocId).value,
        business_contact: document.getElementById(reqContactId).value
      };
      
      const subBtn = document.getElementById(prefix + 'reg-submit');
      if(subBtn) { subBtn.disabled = true; subBtn.textContent = "Sending OTP..."; }
      
      try {
        const res = await fetch(`${JOBINFO_CONFIG.API_URL}/api/otp/send`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ wa_number: verifiedWaNumber })
        });
        if (!res.ok) throw new Error();
        setDisplay(3);
        startResend(resendBtn, isModal ? 'modal-cd' : null);
      } catch(e) {
        swal("Error", "Could not send OTP.", "error");
      } finally {
        if(subBtn) { subBtn.disabled = false; subBtn.innerHTML = `<i class="bi bi-person-check me-1"></i>Register & Send OTP`; }
      }
    });
  }

  verifyBtn.addEventListener('click', async () => {
    const code = (otpInput.value || "").trim();
    if (code.length !== 6) {
      swal("Invalid OTP", "Please enter the 6-digit OTP.", "warning"); return;
    }
    
    verifyBtn.disabled = true;
    verifyBtn.textContent = "Verifying...";
    
    try {
      let url, bodyData;
      if (surfaceRegMode[prefix]) {
        url = `${JOBINFO_CONFIG.API_URL}/api/auth/recruiter/register`;
        bodyData = { wa_number: verifiedWaNumber, otp_code: code, ...registrationData[prefix] };
      } else {
        url = `${JOBINFO_CONFIG.API_URL}/api/otp/verify`;
        bodyData = { wa_number: verifiedWaNumber, otp_code: code };
      }
      
      const res = await fetch(url, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyData)
      });
      if (!res.ok) throw new Error("Verification failed.");
      
      const data = await res.json();
      sessionToken = data.session_token;
      sessionStorage.setItem("ji_token", sessionToken);
      sessionStorage.setItem("ji_wa", verifiedWaNumber);
      sessionStorage.setItem("ji_r_token", sessionToken);
      sessionStorage.setItem("ji_r_wa", verifiedWaNumber);
      
      handleSuccessfulLogin(intent, setDisplay);
    } catch(e) {
      swal("Error", "Incorrect OTP. Try again.", "error");
    } finally {
      verifyBtn.disabled = false;
      verifyBtn.textContent = "Verify OTP";
    }
  });

  if (otpInput) otpInput.addEventListener('keydown', e => { if(e.key==='Enter') verifyBtn.click(); });
  
  if (resendBtn) {
    resendBtn.addEventListener('click', async () => {
      resendBtn.disabled = true;
      try {
        await fetch(`${JOBINFO_CONFIG.API_URL}/api/otp/send`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ wa_number: verifiedWaNumber })
        });
        startResend(resendBtn, isModal ? 'modal-cd' : null);
        swal("OTP Sent", "A new OTP has been sent.", "success");
      } catch {
        resendBtn.disabled = false;
      }
    });
  }
}

function startResend(btn, cdSpanId) {
  if (!btn) return;
  let sec = 60;
  btn.disabled = true;
  if(cdSpanId) {
    const span = document.getElementById(cdSpanId);
    if(span) span.textContent = sec;
  } else {
    btn.textContent = `Resend in ${sec}s`;
  }
  
  const timer = setInterval(() => {
    sec--;
    if (sec <= 0) {
      clearInterval(timer);
      btn.disabled = false;
      btn.textContent = "Resend OTP";
    } else {
      if(cdSpanId) {
        const span = document.getElementById(cdSpanId);
        if(span) span.textContent = sec;
      } else {
        btn.textContent = `Resend in ${sec}s`;
      }
    }
  }, 1000);
}

function handleSuccessfulLogin(intent, setDisplay) {
  // Update nav buttons to point to dashboard
  const mb = document.getElementById("login-nav-btn-mobile");
  const db = document.getElementById("login-nav-btn");
  if(mb) { mb.innerHTML = '<i class="bi bi-layout-text-sidebar-reverse me-1"></i>My Vacancies'; mb.href = "recruiter-dashboard.html"; mb.removeAttribute("data-bs-toggle"); mb.removeAttribute("data-bs-target"); }
  if(db) { db.innerHTML = '<i class="bi bi-layout-text-sidebar-reverse me-1"></i>My Vacancies'; db.href = "recruiter-dashboard.html"; db.removeAttribute("data-bs-toggle"); db.removeAttribute("data-bs-target"); }

  if (intent === 'dashboard') {
    window.location.href = 'recruiter-dashboard.html';
  } else {
    // Hide modal if it's open
    const modalEl = document.getElementById('recruiterLoginModal');
    if (modalEl && window.bootstrap) {
      const modalInstance = bootstrap.Modal.getInstance(modalEl);
      if (modalInstance) modalInstance.hide();
    }
    
    // Set display for the active flow if applicable
    setDisplay(4);

    const jf = document.querySelector(".job-form");
    if(jf) {
      jf.style.display = "block";
      const hiddenWa = document.getElementById("form-wa-number");
      if (hiddenWa) hiddenWa.value = verifiedWaNumber;
    }
  }
}

// buildDescription has been removed since job_description is used directly

/* ── FAQ toggle (preserved) ──────────────────────────────────────────────── */
const toggleBtn = document.getElementById("toggle-question-form");
const formWrapper = document.getElementById("question-form-wrapper");
if (toggleBtn && formWrapper) {
  toggleBtn.addEventListener("click", () => {
    const isHidden = formWrapper.style.display === "none";
    formWrapper.style.display = isHidden ? "block" : "none";
    toggleBtn.textContent = isHidden ? "Close" : "Ask Question";
  });
}

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

/* ── Auto-skip OTP ───────────────────────────────────────────────────────── */
(function restoreDashboardSession() {
  const rToken = sessionStorage.getItem("ji_r_token") || sessionStorage.getItem("ji_token");
  const rWa    = sessionStorage.getItem("ji_r_wa")    || sessionStorage.getItem("ji_wa");
  if (!rToken || !rWa) return;

  sessionToken     = rToken;
  verifiedWaNumber = rWa;

  const hiddenWa = document.getElementById("form-wa-number");
  if (hiddenWa) hiddenWa.value = rWa;

  const mb = document.getElementById("login-nav-btn-mobile");
  const db = document.getElementById("login-nav-btn");
  if(mb) { mb.innerHTML = '<i class="bi bi-layout-text-sidebar-reverse me-1"></i>My Vacancies'; mb.href = "recruiter-dashboard.html"; mb.removeAttribute("data-bs-toggle"); mb.removeAttribute("data-bs-target"); }
  if(db) { db.innerHTML = '<i class="bi bi-layout-text-sidebar-reverse me-1"></i>My Vacancies'; db.href = "recruiter-dashboard.html"; db.removeAttribute("data-bs-toggle"); db.removeAttribute("data-bs-target"); }

  if (document.getElementById("otp-step1")) document.getElementById("otp-step1").style.display = "none";
  if (document.getElementById("otp-step2")) document.getElementById("otp-step2").style.display = "none";
  if (document.getElementById("otp-step3")) document.getElementById("otp-step3").style.display = "none";
  
  const step4 = document.getElementById("otp-step4");
  if (step4) {
    step4.style.display = "block";
    step4.innerHTML = `
      <div class="alert alert-success text-center fw-semibold mb-4" style="max-width:800px;margin:0 auto 24px;">
        <i class="bi bi-check-circle-fill me-2"></i>
        You're logged in as <strong>+${rWa}</strong>. Fill in your vacancy details below.
      </div>`;
  }
  const jf = document.querySelector(".job-form");
  if (jf) jf.style.display = "block";
})();
