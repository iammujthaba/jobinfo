let currentSeekerPhone = "";
let seekerResendTimer = null;

async function sendSeekerOtp(isResend = false) {
  let phoneInput = document.getElementById("loginPhone").value.trim();
  if (isResend) {
    phoneInput = currentSeekerPhone.replace(/^91/, "");
  } else {
    if (!phoneInput || phoneInput.length < 10) {
      alert("Please enter a valid 10-digit WhatsApp number.");
      return;
    }
    currentSeekerPhone = "91" + phoneInput;
  }
  
  const btn = document.getElementById("btnSendOtp");
  const resendBtn = document.getElementById("btnResendOtp");
  
  if (!isResend) {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true" style="margin-right:8px;"></span> Sending...';
  } else if (resendBtn) {
    resendBtn.disabled = true;
    resendBtn.innerHTML = 'Sending...';
  }

  try {
    const res = await fetch(`${JOBINFO_CONFIG.API_URL}/api/otp/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wa_number: currentSeekerPhone, role: "seeker" })
    });
    
    if (res.ok) {
      if (!isResend) {
        document.getElementById("loginStepPhone").style.display = "none";
        document.getElementById("loginStepUnregistered").style.display = "none";
        document.getElementById("loginStepOtp").style.display = "block";
        document.getElementById("s-dot1").classList.add("active");
        document.getElementById("s-dot2").classList.add("active");
      }
      startSeekerResendTimer();
    } else {
      const data = await res.json();
      if (data.detail === "not_registered") {
        document.getElementById("loginStepPhone").style.display = "none";
        document.getElementById("loginStepOtp").style.display = "none";
        document.getElementById("loginStepUnregistered").style.display = "block";
      } else {
        alert("Failed to send OTP: " + data.detail);
      }
      if (resendBtn && isResend) resendBtn.disabled = false;
    }
  } catch (error) {
    console.error(error);
    alert("Network error. Please try again.");
    if (resendBtn && isResend) resendBtn.disabled = false;
  } finally {
    if (!isResend) {
      btn.disabled = false;
      btn.innerHTML = '<i class="bi bi-send me-2"></i>Send OTP';
    }
  }
}

function startSeekerResendTimer() {
  const resendBtn = document.getElementById("btnResendOtp");
  const cdSpan = document.getElementById("s-cd");
  if (!resendBtn || !cdSpan) return;

  resendBtn.disabled = true;
  let timeLeft = 60;
  resendBtn.innerHTML = `Resend in <span id="s-cd">${timeLeft}</span>s`;

  if (seekerResendTimer) clearInterval(seekerResendTimer);
  
  seekerResendTimer = setInterval(() => {
    timeLeft--;
    const currentCd = document.getElementById("s-cd");
    if (currentCd) currentCd.textContent = timeLeft;
    
    if (timeLeft <= 0) {
      clearInterval(seekerResendTimer);
      resendBtn.disabled = false;
      resendBtn.innerHTML = "Resend OTP";
    }
  }, 1000);
}

async function verifySeekerOtp() {
  const otpInput = document.getElementById("loginOtp").value.trim();
  if (otpInput.length !== 6) {
    alert("Please enter the 6-digit OTP.");
    return;
  }
  const btn = document.getElementById("btnVerifyOtp");
  btn.disabled = true;
  btn.innerHTML = 'Verifying...';

  try {
    const res = await fetch(`${JOBINFO_CONFIG.API_URL}/api/otp/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        wa_number: currentSeekerPhone, 
        otp_code: otpInput,
        role: "seeker"
      })
    });
    
    if (res.ok) {
      const data = await res.json();
      localStorage.setItem("seeker_session_token", data.session_token);
      localStorage.setItem("seeker_wa_number", data.wa_number);
      
      // Route based on newly returned flag
      if (data.is_new_user) {
         window.location.href = "register.html";
      } else {
         window.location.href = "dashboard.html"; 
      }
    } else {
      alert("Invalid or Expired OTP. Please try again.");
    }
  } catch (error) {
    console.error(error);
    alert("Network error.");
  } finally {
    btn.disabled = false;
    btn.innerHTML = 'Verify &amp; Open Dashboard';
  }
}

function changePhoneNumber() {
  document.getElementById("loginStepOtp").style.display = "none";
  document.getElementById("loginStepUnregistered").style.display = "none";
  document.getElementById("loginStepPhone").style.display = "block";
  document.getElementById("s-dot2").classList.remove("active");
  document.getElementById("s-dot1").classList.add("active");
  document.getElementById("loginOtp").value = "";
  if (seekerResendTimer) {
    clearInterval(seekerResendTimer);
    seekerResendTimer = null;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const seekerModal = document.getElementById('seekerLoginModal');
  if (seekerModal) {
    seekerModal.addEventListener('hidden.bs.modal', () => {
      changePhoneNumber();
      document.getElementById("loginPhone").value = "";
      currentSeekerPhone = "";
    });
  }
});
