// Guard against unauthenticated access
const sessionToken = localStorage.getItem("seeker_session_token");
const waNumber = localStorage.getItem("seeker_wa_number");

if (!sessionToken || !waNumber) {
    window.location.href = "index.html";
}

let currentProfileData = {};

document.addEventListener("DOMContentLoaded", () => {
    loadProfile();
    loadApplications();
    loadAnalytics();
});

function logoutSeeker() {
    localStorage.removeItem("seeker_session_token");
    localStorage.removeItem("seeker_wa_number");
    window.location.href = "index.html";
}

// ─── Profile Management ──────────────────────────────────────────────────────

async function loadProfile() {
    try {
        const url = new URL(`${JOBINFO_CONFIG.API_URL}/api/candidates/me`);
        url.searchParams.append("wa_number", waNumber);
        url.searchParams.append("session_token", sessionToken);

        const res = await fetch(url.toString(), {
            headers: { "Content-Type": "application/json" }
        });

        if (res.status === 401 || res.status === 403) {
            logoutSeeker();
            return;
        }

        if (res.ok) {
            const data = await res.json();
            currentProfileData = data;

            // Populate View Mode
            document.getElementById("topbar-name").textContent = data.name || "Seeker Profile";
            document.getElementById("viewName").textContent = data.name || "—";
            document.getElementById("viewAge").textContent = data.age || "—";
            
            const locText = data.exact_location && data.district 
                ? `📍 ${data.exact_location}, ${data.district}` 
                : (data.exact_location || data.district ? `📍 ${data.exact_location || data.district}` : "📍 Location Not Set");
            document.getElementById("viewHeaderLocation").textContent = locText;
            document.getElementById("viewCategory").textContent = data.category || "—";
            document.getElementById("viewAltPhone").textContent = data.alt_phone || "—";
            document.getElementById("viewGender").textContent = data.gender ? data.gender.charAt(0).toUpperCase() + data.gender.slice(1) : "—";

            // Populate Edit Form
            document.getElementById("profileName").value = data.name || "";
            document.getElementById("profileAge").value = data.age || "";
            document.getElementById("profileDistrict").value = data.district || "";
            document.getElementById("profileExactLocation").value = data.exact_location || "";
            document.getElementById("profileCategory").value = data.category || "";
            document.getElementById("profileAltPhone").value = data.alt_phone || "";
            document.getElementById("profileGender").value = data.gender || "";
            
            computeProfileStrength(data);
        } else {
            console.error("Failed to load profile", await res.text());
        }
    } catch (e) {
        console.error("Error loading profile", e);
    }
}

async function updateProfile() {
    const btn = document.getElementById("btnSaveProfile");
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = 'Saving...';

    const payload = {
        wa_number: waNumber,
        session_token: sessionToken,
        name: document.getElementById("profileName").value.trim() || null,
        age: parseInt(document.getElementById("profileAge").value) || null,
        district: document.getElementById("profileDistrict").value.trim() || null,
        exact_location: document.getElementById("profileExactLocation").value.trim() || null,
        category: document.getElementById("profileCategory").value.trim() || null,
        alt_phone: document.getElementById("profileAltPhone").value.trim() || null,
        gender: document.getElementById("profileGender").value.trim() || null,
    };

    try {
        const res = await fetch(`${JOBINFO_CONFIG.API_URL}/api/candidates/me`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            alert("Profile updated successfully!");
            
            // Update local memory
            Object.assign(currentProfileData, payload);
            
            // Update View Mode
            document.getElementById("topbar-name").textContent = currentProfileData.name || "Seeker Profile";
            document.getElementById("viewName").textContent = currentProfileData.name || "—";
            document.getElementById("viewAge").textContent = currentProfileData.age || "—";
            const locText = currentProfileData.exact_location && currentProfileData.district 
                ? `📍 ${currentProfileData.exact_location}, ${currentProfileData.district}` 
                : (currentProfileData.exact_location || currentProfileData.district ? `📍 ${currentProfileData.exact_location || currentProfileData.district}` : "📍 Location Not Set");
            document.getElementById("viewHeaderLocation").textContent = locText;
            document.getElementById("viewCategory").textContent = currentProfileData.category || "—";
            document.getElementById("viewAltPhone").textContent = currentProfileData.alt_phone || "—";
            document.getElementById("viewGender").textContent = currentProfileData.gender ? currentProfileData.gender.charAt(0).toUpperCase() + currentProfileData.gender.slice(1) : "—";

            toggleProfileEdit(false);
        } else {
            const data = await res.json();
            alert("Failed to update profile: " + (data.detail || "Unknown error"));
        }
    } catch (e) {
        console.error("Error updating profile", e);
        alert("Network error.");
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

function toggleProfileEdit(show) {
    if (show) {
        document.getElementById("profileViewSection").style.display = "none";
        document.getElementById("profileEditSection").style.display = "block";
    } else {
        document.getElementById("profileViewSection").style.display = "block";
        document.getElementById("profileEditSection").style.display = "none";
        // Reset form inputs to originally loaded data if hiding
        document.getElementById("profileName").value = currentProfileData.name || "";
        document.getElementById("profileAge").value = currentProfileData.age || "";
        document.getElementById("profileDistrict").value = currentProfileData.district || "";
        document.getElementById("profileExactLocation").value = currentProfileData.exact_location || "";
        document.getElementById("profileCategory").value = currentProfileData.category || "";
        document.getElementById("profileAltPhone").value = currentProfileData.alt_phone || "";
        document.getElementById("profileGender").value = currentProfileData.gender || "";
    }
}

function computeProfileStrength(data) {
    let score = 0;
    const missing = [];

    if (data.name) score += 25; else missing.push("Full Name");
    if (data.district) score += 25; else missing.push("District");
    if (data.age) score += 25; else missing.push("Age");
    if (data.category) score += 25; else missing.push("Job Category");

    const bar = document.getElementById("strengthProgressBar");
    const text = document.getElementById("strengthText");
    const list = document.getElementById("strengthChecklist");

    if (bar) {
        bar.style.width = score + "%";
        bar.setAttribute("aria-valuenow", score);
        if (score === 100) {
            bar.className = "progress-bar bg-success";
        } else if (score >= 50) {
            bar.className = "progress-bar bg-warning";
        } else {
            bar.className = "progress-bar bg-danger";
        }
    }
    
    if (text) text.textContent = score + "% Complete";

    if (list) {
        list.innerHTML = "";
        if (score === 100) {
            list.innerHTML = `<li class="text-success"><i class="bi bi-check-circle-fill me-1"></i>Profile looks great!</li>`;
        } else {
            missing.forEach(item => {
                list.insertAdjacentHTML("beforeend", `<li><i class="bi bi-exclamation-circle text-warning me-1"></i>Missing: ${item}</li>`);
            });
        }
    }
}

async function loadAnalytics() {
    const container = document.getElementById("analyticsContent");
    if (!container) return;
    
    try {
        const url = new URL(`${JOBINFO_CONFIG.API_URL}/api/candidates/analytics`);
        url.searchParams.append("wa_number", waNumber);
        url.searchParams.append("session_token", sessionToken);

        const res = await fetch(url.toString(), {
            headers: { "Content-Type": "application/json" }
        });

        if (res.ok) {
            const data = await res.json();
            container.innerHTML = "";
            
            if (!data.focus_areas || data.focus_areas.length === 0) {
                container.innerHTML = `<div class="text-center text-muted small py-3">No data available yet.</div>`;
                return;
            }
            
            data.focus_areas.slice(0, 4).forEach(area => {
                let catName = area.category;
                if (catName === "retail") catName = "Retail";
                else if (catName === "hospitality") catName = "Hospitality";
                else if (catName === "healthcare") catName = "Healthcare";
                else if (catName === "driving") catName = "Driving";
                else if (catName === "office_admin") catName = "Office";
                else if (catName === "maintenance_technician") catName = "Maintenance";
                else if (catName === "it_professional") catName = "IT";
                else if (catName === "gulf_abroad") catName = "Gulf/Abroad";
                else catName = catName.charAt(0).toUpperCase() + catName.slice(1).replace('_', ' ');

                const html = `
                    <div class="mb-3">
                        <div class="d-flex justify-content-between small mb-1">
                            <span class="fw-bold" style="color:#555;">${catName}</span>
                            <span class="text-muted">${area.percentage}% (${area.count})</span>
                        </div>
                        <div class="progress" style="height: 6px;">
                            <div class="progress-bar bg-primary" role="progressbar" style="width: ${area.percentage}%;" aria-valuenow="${area.percentage}" aria-valuemin="0" aria-valuemax="100"></div>
                        </div>
                    </div>
                `;
                container.insertAdjacentHTML("beforeend", html);
            });
        }
    } catch (e) {
        console.error("Error loading analytics", e);
        container.innerHTML = `<div class="text-center text-danger small py-3">Failed to load analytics.</div>`;
    }
}

// ─── Applications Management ─────────────────────────────────────────────────

async function loadApplications() {
    const tbody = document.getElementById("applicationsTableBody");
    try {
        const url = new URL(`${JOBINFO_CONFIG.API_URL}/api/candidates/applications`);
        url.searchParams.append("wa_number", waNumber);
        url.searchParams.append("session_token", sessionToken);

        const days = document.getElementById("filterDays")?.value;
        const status = document.getElementById("filterStatus")?.value;
        if (days) url.searchParams.append("days", days);
        if (status) url.searchParams.append("status", status);

        const res = await fetch(url.toString(), {
            headers: { "Content-Type": "application/json" }
        });

        if (res.status === 401 || res.status === 403) {
            logoutSeeker();
            return;
        }

        if (res.ok) {
            const data = await res.json();
            tbody.innerHTML = "";
            
            if (!data.applications || data.applications.length === 0) {
                tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:#888;padding:20px;">You haven't applied for any jobs yet.</td></tr>`;
                return;
            }

            data.applications.forEach(app => {
                let statusClass = "status-applied";
                let statusText = "Applied";
                
                if (app.status === "shortlisted") {
                    statusClass = "status-shortlisted";
                    statusText = "Shortlisted";
                } else if (app.status === "rejected") {
                    statusClass = "status-rejected";
                    statusText = "Not Selected";
                }

                const date = new Date(app.applied_at).toLocaleDateString();

                const row = `
                    <tr>
                        <td data-label="Job Title">
                            <strong style="font-size:.95rem;">${app.job_title}</strong> 
                            <span style="display:block;color:#888;font-size:0.75rem;">${app.job_code}</span>
                        </td>
                        <td data-label="Company">${app.company || '—'}</td>
                        <td data-label="Location">${app.location}</td>
                        <td data-label="Date Applied" style="color:#888;font-size:0.8rem;">${date}</td>
                        <td data-label="Status"><span class="status-badge ${statusClass}">${statusText}</span></td>
                    </tr>
                `;
                tbody.insertAdjacentHTML('beforeend', row);
            });
        } else {
            const errorText = await res.text();
            console.error("API returned error:", errorText);
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:#e74c3c;padding:20px;">Failed to load applications. Server returned ${res.status}</td></tr>`;
        }
    } catch (e) {
        console.error("Error loading applications", e);
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:#e74c3c;padding:20px;">Error loading applications.</td></tr>`;
    }
}
