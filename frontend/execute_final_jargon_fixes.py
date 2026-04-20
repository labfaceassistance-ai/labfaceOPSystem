import os
import re

directory = r'C:\Users\John Lloyd\Capstone\LabFace\frontend'

replacements = {
    # Admin Analytics & Test Feeds
    "Anomaly Score": "Risk Score",
    "Entities with &lt; 40% attendance": "Students with < 40% attendance",
    "Entities with < 40% attendance": "Students with < 40% attendance",
    "Initializing Neural Analytics...": "Loading Analytics...",
    "Resolve Critical Outliers": "Review At-Risk Students",
    "Neural Network Prediction Confidence": "AI Prediction Confidence",
    "Stable Signatures": "Stable Records",
    "Cloud Sync Buffer": "Cloud Storage",
    "Neural Recognition Conf.": "Recognition Confidence",
    "Initializing Data Stream Data...": "Loading Dashboard Data...",
    "Diagnostic Engine Paused": "Camera Testing Paused",
    "Awaiting Neural Signature...": "Waiting for Face Detection...",
    "Face Recognition Diagnostic": "Face Recognition Test",
    "start the diagnostic engine.": "start camera testing.",
    "Purge History": "Clear History",

    # Dashboards & Lists
    "Run Face Diagnostic": "Test Face Recognition",
    "ENTITY NOT FOUND IN ACTIVE DATABASE. POSSIBLE DATA CORRUPTION OR DELETION.": "Student not found in the database. The account may have been deleted.",
    "Confirmed fraudulent identity usage": "Confirmed account misuse",
    "Primary Link": "Main Contact",
    "Neural Signature": "Face Profile",
    "Target Identification": "Student Search",
    "Permanently Purge Fraudulent Account": "Permanently Delete Fraudulent Account",
    "Reported Entity Details": "Reported Student Details",
    "Neural Link (Email)": "Email Address",
    "Anomaly Description": "Report Description",
    "Neural Insights": "Attendance Insights",
    "CCTV Sync": "Auto-log via CCTV",
    "Operational Logs • Academic Classes": "Attendance History",
    "Operational Environment: Lab 1": "Classroom: Lab 1",
    "Sync Rate": "Attendance Rate",
    "Sync Error Detected": "Attendance Error Detected",
    "No nodes synchronized": "No attendance logged",
    "Operational Schedule • Lab 1": "Class Schedule • Lab 1",

    # Registration & Login Portals
    "Faculty accounts require manual administrative validation.": "Professor accounts require admin approval.",
    "Registry Validation": "Account Verification",
    "Neural Syncing...": "Uploading...",
    "All Neural Interfaces Are Logged": "All Login Attempts Are Monitored",
    "Send Sync Code": "Send Reset Code",

    # Profiles & Settings
    "Neural Pattern": "Face Profile",
    "Contribute to the evolution of the LabFace neural ecosystem. Your feedback is synchronized directly with our core developers.": "Help improve LabFace. Your feedback is sent directly to our developer team.",
    "Purge Identity": "Delete Account",
    "Initializing Neural Optic Array...": "Starting Camera...",
    "Academic Sync Required": "COR Verification Required",
    "Ensure your biometric signatures are current to maintain high recognition accuracy throughout campus operational hours.": "Keep your photos updated to ensure you are accurately recognized during classes.",
    "Neural signals are encrypted end-to-end.": "Your data is encrypted securely.",
    "Operational Period": "School Year",
    "Sync Registry": "Verify Master List",

    # Insights & Session States
    "Neural Pulse Active": "Live Suggestions Active",
    "Define your operational attendance target to enable Neural Optimization.": "Set your attendance goal for personal recommendations.",
    "Select your operational target for the current academic period.": "Choose your overall goal for the semester.",
    "Monthly Sync Trajectory": "Monthly Attendance Trend",
    "Neural Link Status": "Checking Session...",
    "Automatic Terminate in": "Auto Log Out in",
    "Stabilize Link": "Stay Logged In",
    "Security protocols require periodic re-authentication. Extend to maintain your active session or terminate securely.": "Your session will expire soon to protect your account. Choose an action below.",
    "Accessing Neural Registry...": "Searching accounts...",
    "Force Sync": "Refresh Feed",
    "Checking Neural Link...": "Testing Camera...",

    # Enrollment & Camera UI
    "Multi-Angle Identity Calibration": "Multi-Angle Face Registration",
    "Biometric Sync": "Face Registration",
    "Initializing Neural Logic": "Loading Face Scanner",
    "Sync Optimized": "Face Saved",
    "Biometric Re-Sync": "Update Face Data",
    "I have meticulously evaluated the synchronization policy. I voluntarily grant persistent authorization for the collection and archival of my biometric signatures.": "I have read the policy and agree to the collection of my photos for attendance.",
    "Sync Framework Policy": "Data Privacy Policy",
    "Neural Layer Details": "Privacy Details",
    "Authorize Sync": "I Agree",

    # Modals & Lists
    "Reference Session": "Selected Class",
    "Retain Session": "Keep Class",
    "Session Log Depth": "Attendance Log",
    "This action will formally notify all enrolled cohorts of the session archival status.": "This action will formally notify all students that the class is archived.",
    "Validation Documentation": "Supporting Documents",
    "Optical Evidence Fragment": "Captured Image",
    "Update Ledger": "Update Record",
    "Synchronized Entries:": "Registered Students:",
    "Authorize Purge": "Approve Deletion",
    "Initiating permanent identity purge for": "Deleting account for",
    "CRITICAL: ALL NEURAL RECORDS WILL BE DESTROYED.": "WARNING: ALL STUDENT DATA WILL BE LOST.",
    
    # Standalones that were missed due to structure but requested
    "Operational": "Active",
    "Terminate": "Log Out"
}

def process_file(filepath):
    if not os.path.exists(filepath): return []
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except UnicodeDecodeError:
        return []

    changes = []
    # Check for each replacement precisely
    for old, new in replacements.items():
        if old in content:
            # Check if this exact string is surrounded by tags or in exact context
            content = content.replace(f'>{old}<', f'>{new}<')
            content = content.replace(f'> {old} <', f'> {new} <')
            content = content.replace(f'"{old}"', f'"{new}"')
            content = content.replace(f"'{old}'", f"'{new}'")
            # fallback for standalone
            if old == "Operational" or old == "Terminate":
                content = re.sub(rf'\b{old}\b', new, content)
            elif content.find(old) != -1:
                content = content.replace(old, new)
            
            changes.append({'file': filepath, 'old': old, 'new': new})

    if changes:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
            
    return changes

num_files = 0
total_changes = 0

for root, dirs, files in os.walk(directory):
    if 'node_modules' in root or '.next' in root:
        continue
    for file in files:
        if file.endswith('.tsx') or file.endswith('.ts'):
            changes = process_file(os.path.join(root, file))
            if changes:
                num_files += 1
                total_changes += len(changes)

print(f"Modifications complete. Applied {total_changes} changes across {num_files} files.")
