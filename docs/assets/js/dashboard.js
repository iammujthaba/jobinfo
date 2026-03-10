// Guard against unauthenticated access
const sessionToken = localStorage.getItem("seeker_session_token");
const waNumber = localStorage.getItem("seeker_wa_number");

if (!sessionToken || !waNumber) {
    window.location.href = "index.html";
}

document.addEventListener("DOMContentLoaded", () => {
    // Setup the WhatsApp bot link (from config if available)
    const waBotLink = document.getElementById("waBotLink");
    if (typeof JOBINFO_CONFIG !== 'undefined' && JOBINFO_CONFIG.BUSINESS_WA) {
        waBotLink.href = `https://wa.me/${JOBINFO_CONFIG.BUSINESS_WA}`;
    }

    loadProfile();
    loadApplications();
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
            document.getElementById("profileName").value = data.name || "";
            document.getElementById("profileAge").value = data.age || "";
            document.getElementById("profilePostOffice").value = data.post_office || "";
            document.getElementById("profilePinCode").value = data.pin_code || "";
            document.getElementById("profileCategory").value = data.category || "";
            document.getElementById("profileAltPhone").value = data.alt_phone || "";
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
        post_office: document.getElementById("profilePostOffice").value.trim() || null,
        pin_code: document.getElementById("profilePinCode").value.trim() || null,
        category: document.getElementById("profileCategory").value.trim() || null,
        alt_phone: document.getElementById("profileAltPhone").value.trim() || null,
    };

    try {
        const res = await fetch(`${JOBINFO_CONFIG.API_URL}/api/candidates/me`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            alert("Profile updated successfully!");
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

// ─── Applications Management ─────────────────────────────────────────────────

async function loadApplications() {
    const tbody = document.getElementById("applicationsTableBody");
    try {
        const url = new URL(`${JOBINFO_CONFIG.API_URL}/api/candidates/applications`);
        url.searchParams.append("wa_number", waNumber);
        url.searchParams.append("session_token", sessionToken);

        const res = await fetch(url.toString(), {
            headers: { "Content-Type": "application/json" }
        });

        if (res.ok) {
            const data = await res.json();
            tbody.innerHTML = "";
            
            if (!data.applications || data.applications.length === 0) {
                tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-4">You haven't applied for any jobs yet.</td></tr>`;
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
                        <td class="fw-bold">${app.job_title} <span class="text-muted d-block" style="font-size:0.75rem;font-weight:normal">${app.job_code}</span></td>
                        <td>${app.company || '—'}</td>
                        <td>${app.location}</td>
                        <td>${date}</td>
                        <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                    </tr>
                `;
                tbody.insertAdjacentHTML('beforeend', row);
            });
        }
    } catch (e) {
        console.error("Error loading applications", e);
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-danger py-4">Error loading applications.</td></tr>`;
    }
}
