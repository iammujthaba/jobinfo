// Guard against unauthenticated access
const sessionToken = localStorage.getItem("seeker_session_token");
const waNumber = localStorage.getItem("seeker_wa_number");

if (!sessionToken || !waNumber) {
    window.location.href = "index.html";
}

let currentProfileData = {};

document.addEventListener("DOMContentLoaded", () => {
    loadProfile();
    loadResumes();
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
            document.getElementById("viewAge").textContent = data.age ? `${data.age} years` : "—";
            
            const locText = data.exact_location && data.district 
                ? `📍 ${data.exact_location}, ${data.district}` 
                : (data.exact_location || data.district ? `📍 ${data.exact_location || data.district}` : "📍 Location Not Set");
            document.getElementById("viewHeaderLocation").textContent = locText;
            
            document.getElementById("viewMobile").textContent = data.alt_phone || "—";
            document.getElementById("viewWhatsApp").textContent = waNumber ? `+${waNumber}` : "—";
            document.getElementById("viewGender").textContent = data.gender ? data.gender.charAt(0).toUpperCase() + data.gender.slice(1) : "—";

            if (data.name) {
                const parts = data.name.trim().split(' ');
                const initials = parts.length > 1 ? parts[0][0] + parts[parts.length-1][0] : parts[0][0];
                document.getElementById("profile-avatar").textContent = initials.toUpperCase().substring(0, 2);
            } else {
                document.getElementById("profile-avatar").textContent = "JS";
            }

            if (data.category) {
                let catText = data.category.replace('_', ' ');
                catText = catText.replace(/\b\w/g, l => l.toUpperCase());
                document.getElementById("viewCategory").textContent = catText;
            } else {
                document.getElementById("viewCategory").textContent = "—";
            }
            document.getElementById("viewSubCategory").textContent = data.sub_category || "—";
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
            document.getElementById("viewAge").textContent = currentProfileData.age ? `${currentProfileData.age} years` : "—";
            const locText = currentProfileData.exact_location && currentProfileData.district 
                ? `📍 ${currentProfileData.exact_location}, ${currentProfileData.district}` 
                : (currentProfileData.exact_location || currentProfileData.district ? `📍 ${currentProfileData.exact_location || currentProfileData.district}` : "📍 Location Not Set");
            document.getElementById("viewHeaderLocation").textContent = locText;
            document.getElementById("viewMobile").textContent = currentProfileData.alt_phone || "—";
            document.getElementById("viewWhatsApp").textContent = waNumber ? `+${waNumber}` : "—";
            document.getElementById("viewGender").textContent = currentProfileData.gender ? currentProfileData.gender.charAt(0).toUpperCase() + currentProfileData.gender.slice(1) : "—";

            if (currentProfileData.name) {
                const parts = currentProfileData.name.trim().split(' ');
                const initials = parts.length > 1 ? parts[0][0] + parts[parts.length-1][0] : parts[0][0];
                document.getElementById("profile-avatar").textContent = initials.toUpperCase().substring(0, 2);
            } else {
                document.getElementById("profile-avatar").textContent = "JS";
            }

            if (currentProfileData.category) {
                let catText = currentProfileData.category.replace('_', ' ');
                catText = catText.replace(/\b\w/g, l => l.toUpperCase());
                document.getElementById("viewCategory").textContent = catText;
            } else {
                document.getElementById("viewCategory").textContent = "—";
            }
            document.getElementById("viewSubCategory").textContent = currentProfileData.sub_category || "—";
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
        document.getElementById("profile-view").style.display = "none";
        document.getElementById("profile-edit").style.display = "block";
    } else {
        document.getElementById("profile-view").style.display = "block";
        document.getElementById("profile-edit").style.display = "none";
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
    const checks = {
        nameAge: !!(data.name && data.age),
        location: !!(data.district && data.exact_location),
        category: !!data.category,
        cv: !!data.has_cv,
        mobile: !!data.alt_phone
    };

    if (checks.nameAge) score += 20;
    if (checks.location) score += 20;
    if (checks.category) score += 20;
    if (checks.cv) score += 20;
    if (checks.mobile) score += 20;

    const bar = document.getElementById("strengthProgressBar");
    const text = document.getElementById("strengthPctText");
    const list = document.getElementById("strengthChecklist");

    if (bar) bar.style.width = score + "%";
    if (text) text.textContent = score + "%";

    if (list) {
        list.innerHTML = `
            <li>
              <div class="check-icon ${checks.nameAge ? 'done' : 'pending'}"><i class="bi ${checks.nameAge ? 'bi-check-lg' : 'bi-x-lg'}"></i></div>
              Name & age added
            </li>
            <li>
              <div class="check-icon ${checks.location ? 'done' : 'pending'}"><i class="bi ${checks.location ? 'bi-check-lg' : 'bi-x-lg'}"></i></div>
              Location set
            </li>
            <li>
              <div class="check-icon ${checks.category ? 'done' : 'pending'}"><i class="bi ${checks.category ? 'bi-check-lg' : 'bi-x-lg'}"></i></div>
              Job category selected
            </li>
            <li>
              <div class="check-icon ${checks.mobile ? 'done' : 'pending'}"><i class="bi ${checks.mobile ? 'bi-check-lg' : 'bi-x-lg'}"></i></div>
              Mobile number added
            </li>
            <li>
              <div class="check-icon ${checks.cv ? 'done' : 'pending'}"><i class="bi ${checks.cv ? 'bi-check-lg' : 'bi-x-lg'}"></i></div>
              ${checks.cv ? 'CV uploaded' : 'CV not uploaded'}
            </li>
        `;
    }
}


// ─── End ───────────────────────────────────────────────────────────────────────

// ─── CV Management ─────────────────────────────────────────────────────────────

async function loadResumes() {
    try {
        const url = new URL(`${JOBINFO_CONFIG.API_URL}/api/candidates/cvs`);
        url.searchParams.append("wa_number", waNumber);
        url.searchParams.append("session_token", sessionToken);

        const res = await fetch(url.toString(), {
            headers: { "Content-Type": "application/json" }
        });

        if (res.ok) {
            const data = await res.json();
            const cvs = data.cvs || [];
            document.getElementById("cvCountBadge").textContent = `${cvs.length} / 4`;
            
            const container = document.getElementById("cvListContainer");
            container.innerHTML = "";
            
            cvs.forEach(cv => {
                const dateText = cv.uploaded_at ? new Date(cv.uploaded_at).toLocaleDateString('en-GB') : "Unknown date";
                const badge = cv.is_default ? `<span class="badge bg-success" style="font-size:0.6rem; margin-left:6px; font-weight: 500;">Default</span>` : '';
                
                const html = `
                <div class="cv-item">
                    <div class="cv-info">
                        <i class="bi bi-file-earmark-pdf cv-icon"></i>
                        <div>
                            <div class="cv-name">${cv.filename} ${badge}</div>
                            <div class="cv-meta">Uploaded on ${dateText}</div>
                        </div>
                    </div>
                    <button class="btn-delete-cv" onclick="deleteResume(${cv.id})" title="Delete CV">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>`;
                container.innerHTML += html;
            });

            const uploadBtn = document.getElementById("cvUploadBtn");
            const fileInput = document.getElementById("cvFileInput");
            if (cvs.length >= 4) {
                uploadBtn.style.opacity = "0.5";
                uploadBtn.style.pointerEvents = "none";
                document.getElementById("cvUploadSub").textContent = "Maximum 4 CVs reached. Delete one to upload.";
            } else {
                uploadBtn.style.opacity = "1";
                uploadBtn.style.pointerEvents = "auto";
                document.getElementById("cvUploadSub").textContent = "PDF or DOCX max 10MB";
            }
        }
    } catch (e) {
        console.error("Error loading CVs", e);
    }
}

async function uploadResume(input) {
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    const allowed = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    
    // Fallback manual extension check for weird OS MIME mappings
    let isAllowed = false;
    if (allowed.includes(file.type)) isAllowed = true;
    else if (file.name.toLowerCase().endsWith('.pdf') || file.name.toLowerCase().endsWith('.docx') || file.name.toLowerCase().endsWith('.doc')) {
        isAllowed = true;
    }

    if (!isAllowed) {
        alert("Only PDF or Word documents are allowed.");
        input.value = "";
        return;
    }
    if (file.size > 10 * 1024 * 1024) {
        alert("File size exceeds 10MB limit.");
        input.value = "";
        return;
    }

    const uploadBtn = document.getElementById("cvUploadBtn");
    const originalContent = uploadBtn.innerHTML;
    uploadBtn.innerHTML = `<div class="spinner-border spinner-border-sm text-secondary mb-2" role="status"></div><div>Uploading...</div>`;
    uploadBtn.style.pointerEvents = "none";

    const formData = new FormData();
    formData.append("wa_number", waNumber);
    formData.append("session_token", sessionToken);
    formData.append("file", file);

    try {
        const res = await fetch(`${JOBINFO_CONFIG.API_URL}/api/candidates/cvs`, {
            method: "POST",
            body: formData
        });

        if (res.ok) {
            loadResumes(); 
            loadProfile(); 
        } else {
            const data = await res.json();
            alert("Upload failed: " + (data.detail || "Unknown error"));
        }
    } catch (e) {
        console.error("Upload error", e);
        alert("Network error during upload.");
    } finally {
        input.value = "";
        uploadBtn.innerHTML = originalContent;
        uploadBtn.style.pointerEvents = "auto";
    }
}

async function deleteResume(resumeId) {
    if (!confirm("Are you sure you want to delete this CV?")) return;

    try {
        const res = await fetch(`${JOBINFO_CONFIG.API_URL}/api/candidates/cvs/${resumeId}?wa_number=${waNumber}&session_token=${sessionToken}`, {
            method: "DELETE"
        });

        if (res.ok) {
            loadResumes();
            loadProfile(); 
        } else {
            const data = await res.json();
            alert("Notice: " + (data.detail || "Could not delete CV."));
        }
    } catch (e) {
        console.error("Delete CV error", e);
        alert("Network error during deletion.");
    }
}
