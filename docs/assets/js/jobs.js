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
    if (e.key === "Enter") document.getElementById("search-btn")?.click();
  });

  document.getElementById("load-more-btn")?.addEventListener("click", () => {
    currentPage++;
    loadJobs(false);
  });
});

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
  const applyUrl = `https://wa.me/${JOBINFO_CONFIG.BUSINESS_WA}?text=Apply%20${encodeURIComponent(job.job_code)}`;
  const salary = job.salary_range ? `<span class="badge bg-success-subtle text-success me-1"><i class="bi bi-currency-rupee"></i>${job.salary_range}</span>` : "";
  const exp = job.experience_required ? `<span class="badge bg-info-subtle text-info"><i class="bi bi-briefcase"></i> ${job.experience_required}</span>` : "";

  return `
  <div class="col-lg-4 col-md-6 job-card-col" data-aos="fade-up">
    <div class="job-card h-100 p-3 bg-white rounded shadow-sm d-flex flex-column">
      <div class="job-card-header mb-2">
        <span class="job-code-badge">${job.job_code}</span>
        <h5 class="job-title mt-1 mb-0">${escHtml(job.title)}</h5>
        <p class="job-company text-muted mb-1"><i class="bi bi-building me-1"></i>${escHtml(job.company || "—")}</p>
        <p class="job-location text-muted mb-1"><i class="bi bi-geo-alt me-1"></i>${escHtml(job.location)}</p>
      </div>
      <div class="job-badges mb-2">${salary}${exp}</div>
      <p class="job-desc text-muted small flex-grow-1">${escHtml((job.description || "").substring(0, 120))}${job.description && job.description.length > 120 ? "…" : ""}</p>
      <a href="${applyUrl}" target="_blank" rel="noopener" class="btn btn-success btn-sm mt-auto apply-wa-btn">
        <i class="bi bi-whatsapp me-1"></i>Apply via WhatsApp
      </a>
    </div>
  </div>`;
}

function escHtml(str) {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
