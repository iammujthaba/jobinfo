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
            document.getElementById("viewPostOffice").textContent = data.post_office || "—";
            document.getElementById("viewPinCode").textContent = data.pin_code || "—";
            document.getElementById("viewCategory").textContent = data.category || "—";
            document.getElementById("viewAltPhone").textContent = data.alt_phone || "—";

            // Populate Edit Form
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
            
            // Update local memory
            Object.assign(currentProfileData, payload);
            
            // Update View Mode
            document.getElementById("topbar-name").textContent = currentProfileData.name || "Seeker Profile";
            document.getElementById("viewName").textContent = currentProfileData.name || "—";
            document.getElementById("viewAge").textContent = currentProfileData.age || "—";
            document.getElementById("viewPostOffice").textContent = currentProfileData.post_office || "—";
            document.getElementById("viewPinCode").textContent = currentProfileData.pin_code || "—";
            document.getElementById("viewCategory").textContent = currentProfileData.category || "—";
            document.getElementById("viewAltPhone").textContent = currentProfileData.alt_phone || "—";

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
        document.getElementById("profilePostOffice").value = currentProfileData.post_office || "";
        document.getElementById("profilePinCode").value = currentProfileData.pin_code || "";
        document.getElementById("profileCategory").value = currentProfileData.category || "";
        document.getElementById("profileAltPhone").value = currentProfileData.alt_phone || "";
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
                        <td><strong style="font-size:.95rem;">${app.job_title}</strong> <span style="display:block;color:#888;font-size:0.75rem;">${app.job_code}</span></td>
                        <td>${app.company || '—'}</td>
                        <td>${app.location}</td>
                        <td style="color:#888;font-size:0.8rem;">${date}</td>
                        <td><span class="status-badge ${statusClass}">${statusText}</span></td>
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
