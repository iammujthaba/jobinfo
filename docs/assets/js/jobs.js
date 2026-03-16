/**
 * jobs.js — Loads and renders live job listings from the backend API.
 * Powers jobs.html (browse/search/filter page).
 */

"use strict";

const PAGE_SIZE = 12;
let currentPage = 1;
let totalJobs = 0;
let currentLocation = "";
let currentTitle = "";
let locationTimeout = null;
let titleTimeout = null;

/* ── Bootstrap ─────────────────────────────────────────────────────────────── */
document.addEventListener("DOMContentLoaded", () => {
  loadJobs(true);

  document.getElementById("search-btn")?.addEventListener("click", () => {
    currentTitle = document.getElementById("job-search")?.value.trim() || "";
    currentLocation = document.getElementById("location-filter")?.value.trim() || "";
    currentPage = 1;
    loadJobs(true);
  });

  document.getElementById("job-search")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      document.getElementById("title-suggestions").style.display = "none";
      document.getElementById("search-btn")?.click();
    }
  });

  // ── Title autocomplete
  const titleInput = document.getElementById("job-search");
  const titleSuggestions = document.getElementById("title-suggestions");
  if (titleInput && titleSuggestions) {
    titleInput.addEventListener("input", (e) => {
      clearTimeout(titleTimeout);
      const query = e.target.value.trim();
      if (!query) { titleSuggestions.style.display = "none"; return; }
      titleTimeout = setTimeout(() => fetchTitleSuggestions(query), 250);
    });
    document.addEventListener("click", (e) => {
      if (!titleInput.contains(e.target) && !titleSuggestions.contains(e.target)) {
        titleSuggestions.style.display = "none";
      }
    });
  }

  const locInput = document.getElementById("location-filter");
  const locSuggestions = document.getElementById("location-suggestions");

  if (locInput && locSuggestions) {
    // 1. Debounced input handler
    locInput.addEventListener("input", (e) => {
      clearTimeout(locationTimeout);
      const query = e.target.value.trim();
      
      if (!query) {
        locSuggestions.style.display = "none";
        return;
      }
      
      locationTimeout = setTimeout(() => fetchLocationSuggestions(query), 250);
    });

    // 2. Hide suggestions when clicking outside
    document.addEventListener("click", (e) => {
      if (!locInput.contains(e.target) && !locSuggestions.contains(e.target)) {
        locSuggestions.style.display = "none";
      }
    });
    
    // 3. Trigger search on enter
    locInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        locSuggestions.style.display = "none";
        document.getElementById("search-btn")?.click();
      }
    });
  }

  document.getElementById("load-more-btn")?.addEventListener("click", () => {
    currentPage++;
    loadJobs(false);
  });
});

/* ── Title Suggestions ────────────────────────────────────────────────── */
async function fetchTitleSuggestions(query) {
  const titleSuggestions = document.getElementById("title-suggestions");
  try {
    const res = await fetch(`${JOBINFO_CONFIG.API_URL}/api/vacancies/titles/suggest?query=${encodeURIComponent(query)}`);
    if (!res.ok) return;
    const data = await res.json();
    if (!data.results || data.results.length === 0) { titleSuggestions.style.display = "none"; return; }
    titleSuggestions.innerHTML = "";
    data.results.forEach(t => {
      const li = document.createElement("li");
      li.textContent = t;
      li.addEventListener("click", () => {
        document.getElementById("job-search").value = t;
        titleSuggestions.style.display = "none";
        document.getElementById("search-btn")?.click();
      });
      titleSuggestions.appendChild(li);
    });
    titleSuggestions.style.display = "block";
  } catch (err) {
    console.error("Title suggest error:", err);
  }
}

/* ── Location Suggestions ────────────────────────────────────────────────── */
async function fetchLocationSuggestions(query) {
  const locSuggestions = document.getElementById("location-suggestions");
  try {
    const res = await fetch(`${JOBINFO_CONFIG.API_URL}/api/vacancies/locations/suggest?query=${encodeURIComponent(query)}`);
    if (!res.ok) return;
    const data = await res.json();
    
    if (!data.results || data.results.length === 0) {
      locSuggestions.style.display = "none";
      return;
    }
    
    locSuggestions.innerHTML = "";
    data.results.forEach(loc => {
      const li = document.createElement("li");
      li.textContent = loc;
      li.addEventListener("click", () => {
        document.getElementById("location-filter").value = loc;
        locSuggestions.style.display = "none";
        document.getElementById("search-btn")?.click(); // Auto-search on select
      });
      locSuggestions.appendChild(li);
    });
    
    locSuggestions.style.display = "block";
  } catch (err) {
    console.error("Location suggest error:", err);
  }
}

/* ── Fetch jobs from API ─────────────────────────────────────────────────── */
async function loadJobs(reset) {
  const grid = document.getElementById("jobs-grid");
  const loadMoreBtn = document.getElementById("load-more-btn");
  const countEl = document.getElementById("jobs-count");

  if (reset && grid) grid.innerHTML = `<div class="col-12 text-center py-5"><div class="spinner-border text-primary" role="status"></div><p class="mt-2 text-muted">Loading jobs…</p></div>`;

  const params = new URLSearchParams({
    page: currentPage,
    page_size: PAGE_SIZE,
  });
  if (currentTitle) params.append("title", currentTitle);
  if (currentLocation) params.append("location", currentLocation);

  try {
    const res = await fetch(`${JOBINFO_CONFIG.API_URL}/api/vacancies?${params}`);
    if (!res.ok) throw new Error("API error");
    const data = await res.json();
    totalJobs = data.total;

    if (reset && grid) grid.innerHTML = "";

    if (data.results.length === 0 && currentPage === 1) {
      grid.innerHTML = `<div class="col-12 text-center py-5"><i class="bi bi-search" style="font-size:2.5rem;color:#ccc"></i><p class="mt-2 text-muted">No jobs found. Try a different search.</p></div>`;
    } else {
      data.results.forEach((job) => {
        grid.insertAdjacentHTML("beforeend", buildJobCard(job));
      });
    }

    if (countEl) countEl.textContent = `${totalJobs} job${totalJobs !== 1 ? "s" : ""} found`;

    const loaded = (currentPage - 1) * PAGE_SIZE + data.results.length;
    if (loadMoreBtn) {
      loadMoreBtn.style.display = loaded < totalJobs ? "inline-block" : "none";
    }
  } catch (err) {
    console.error(err);
    if (grid) grid.innerHTML = `<div class="col-12 text-center py-5 text-danger"><i class="bi bi-exclamation-triangle" style="font-size:2rem"></i><p class="mt-2">Could not load jobs. Please try again.</p></div>`;
  }
}

/* ── Build a single job card ─────────────────────────────────────────────── */
function buildJobCard(job) {
  window.loadedJobs = window.loadedJobs || {};
  window.loadedJobs[job.job_code] = job;
  const applyUrl = `https://wa.me/${JOBINFO_CONFIG.BUSINESS_WA}?text=Apply%20${encodeURIComponent(job.job_code)}`;
  const salaryMap = {
    "interview_based": "Based on Interview",
    "not_mentioned": "Not Mentioned",
    "stipend": "Stipend",
    "below_10k": "Below ₹10,000",
    "10k_20k": "₹10,000 - ₹20,000",
    "20k_30k": "₹20,000 - ₹30,000",
    "30k_40k": "₹30,000 - ₹40,000",
    "40k_50k": "₹40,000 - ₹50,000",
    "above_50k": "Above ₹50,000"
  };

  const expMap = {
    "no_experience": "No Experience Required",
    "fresher_or_exp": "Fresher or Experienced",
    "1_2_years": "1-2 Years",
    "3_5_years": "3-5 Years",
    "5_plus_years": "5+ Years"
  };

  const fmtSalary = job.salary_range ? (salaryMap[job.salary_range] || job.salary_range) : null;
  const fmtExp = job.experience_required ? (expMap[job.experience_required] || job.experience_required) : null;

  const salary = fmtSalary && fmtSalary !== "Not Mentioned" ? `<span class="badge bg-success-subtle text-success me-1"><i class="bi bi-currency-rupee"></i>${fmtSalary}</span>` : "";
  const exp = fmtExp ? `<span class="badge bg-info-subtle text-info"><i class="bi bi-briefcase"></i> ${fmtExp}</span>` : "";

  return `
  <div class="col-lg-4 col-md-6 job-card-col" data-aos="fade-up" style="cursor:pointer;" onclick="showJobDetailsModal('${job.job_code}')">
    <div class="job-card h-100 p-3 bg-white rounded shadow-sm d-flex flex-column">
      <div class="job-card-header mb-2">
        <span class="job-code-badge">${job.job_code}</span>
        <h5 class="job-title mt-1 mb-0">${escHtml(job.job_title)}</h5>
        <p class="job-company text-muted mb-1"><i class="bi bi-building me-1"></i>${escHtml(job.company_name || "—")}</p>
        <p class="job-location text-muted mb-1"><i class="bi bi-geo-alt me-1"></i>${escHtml(job.district_region)}</p>
      </div>
      <div class="job-badges mb-2">${salary}${exp}</div>
      <p class="job-desc text-muted small flex-grow-1">${escHtml((job.job_description || "").substring(0, 120))}${job.job_description && job.job_description.length > 120 ? "…" : ""}</p>
      <a href="${applyUrl}" target="_blank" rel="noopener" class="btn btn-success btn-sm mt-auto apply-wa-btn" onclick="event.stopPropagation()">
        <i class="bi bi-whatsapp me-1"></i>Apply via WhatsApp
      </a>
    </div>
  </div>`;
}

function escHtml(str) {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
