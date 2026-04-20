import os
import re

directory = r'C:\Users\John Lloyd\Capstone\LabFace\frontend'

replacements = {
    # Matrix translations
    "Schedule Matrix": "Class Schedule",
    "Real-time Data Matrix": "Real-time Dashboard",
    "Live Security Matrix": "Live Security Feed",
    "Matrix Synchronized": "Records Synchronized",
    "Registered Matrix": "Registered Accounts",
    "Performance Matrix": "Performance Overview",
    "Academic Matrix": "Academic Classes",
    "Update Identity Vault · 5 Perspective Matrix": "Update Profile Picture",
    "Live Feed Matrix · Access Grade A": "Live Camera Feed",
    "Historical Matrix Empty": "No History Found",
    "Export Matrix": "Export Data",
    "Student Record Matrix": "Student Master List",
    "Detection Matrix": "Live Detection",
    "Matrix History Empty": "No Record Found",
    "Roster Matrix Preview": "Class Roster Preview",
    "Attendance Ledger Matrix": "Attendance Records",
    "Aggregating Matrix Data...": "Loading Dashboard Data...",
    "Live Matrix Monitoring": "Live Monitoring",
    "Identity Matrix Number": "ID Number",
    "Matrix Code": "Course Code",
    "Preview Matrix": "Preview List",
    "Identity Purge Matrix · Level 9 Encryption": "Data Deletion Requests",
    "Syncing attendance matrix...": "Loading attendance...",
    "Check the subject identifier or section code": "Check the subject course or section code",
    "Archived Matrix Entries": "Archived Entries",
    "Display All Matrix": "Display All Cameras",
    "Finalize Matrix Update": "Save Changes",
    "Matrix Idle": "No Activity",
    "AI-Powered Attendance Matrix Analysis": "AI-Powered Attendance Analysis",
    "Accessing History Matrix...": "Loading History...",
    "QUERY SUBJECT MATRIX...": "SEARCH CLASSES...",
    "Optimizing Time Matrix...": "Loading Schedule...",
    "ZERO CRITICAL OUTLIERS DETECTED IN THE MATRIX.": "NO AT-RISK STUDENTS DETECTED.",
    "Unable to load account matrix.": "Unable to load account details.",
    "Set Matrix Objective": "Course Description",
    "Privacy & Purge Matrix": "Privacy & Deletion Requests",
    "Your academic matrix is currently empty.": "You are not enrolled in any classes.",
    "Matrix Identification": "Student Identification",
    "total matrix database": "total system database",
    "Matrix Data": "System Data",
    "Matrix": "Database",
    
    # Node translations
    "Next Priority Node": "Next Priority Class",
    "Recent Node Syncs": "Recent Activity",
    "NODE 01": "CAMERA 01",
    "NODE 02": "CAMERA 02",
    "Identity Node 01 · Diagnostic Log Active": "Camera 1 · Live Feed",
    "Node Logs Empty": "No Activity Logs",
    "Fetching node data...": "Loading data...",
    "Academic Node": "Class Name",
    "High-performance Neural Link Calibration · Node 01": "Camera Feed · Camera 1",
    "Security Node:": "Camera:",
    "Active Node Sessions": "Active Class Sessions",
    "Node Archived": "Class Archived",
    "No active sessions scheduled for this node.": "No active sessions scheduled.",
    "Pending Validation Node": "Pending Class Approval",
    "Review Academic Node Stats": "Review Analytics",
    "Fraudulent Node": "Fraudulent Account",
    "active node link": "active session",
    "node sync records": "attendance records",
    "Node": "Class",

    # Protocol translations
    "Time Segment Protocol": "Time Segment",
    "Anomaly Protocol": "Flags",
    "Protocol Type": "Type",
    "Edit Protocol": "Edit Class",
    "ENFORCE PROTOCOL": "SAVE ATTENDANCE",
    "Exception Protocol": "Exceptions",
    "Protocol Access": "Class Access",
    "Ratify Protocol": "Save Class",
    "Manage Protocol": "Manage Class",
    "Void Protocol": "Cancel Class",
    "Faculty Identity Protocol": "Professor Registration",
    "New Phase Protocol": "New Password",
    "Class Schedule Protocol": "Class Schedule",
    "Initialize Protocols": "Save Settings",
    "Cancel Class (Advance Notice Protocol)": "Cancel Class",
    "Encrypted Optical Ledger Evidence Protocol": "Captured Image",
    "Protocol Success": "Success",
    "Initialising Protocol...": "Loading...",
    "Restart Protocol": "Try Again",
    "protocol termination": "cancellation",
    "protocol adherence": "attendance",
    "Security Protocol Alert": "Alert",
    "Spreadsheet Protocol Required": "Spreadsheet Required",

    # Jargon Verbs & Nouns
    "Initialize Access Restoration": "Account Recovery",
    "Modify Access Phase": "Change Password",
    "Return to Command Vault": "Back to Admin Portal",
    "Command Vault": "Admin Portal",
    "Admin Dispatch (Notes)": "Admin Notes",
    "Initialize File Interface": "Upload File",
    "Metadata automatically derived from operational parameters.": "Details generated automatically.",
    "Credentials Alpha": "Admin Login",
    "Operational Logs • Academic Matrix": "Activity Logs",
    "Initialize Neural Link to begin capture": "Start Camera to begin capture",
    "Select Credentials (PDF/JPG)": "Upload Document (PDF/JPG)",
    "INITIATE EXPORT": "EXPORT DATA",
    "Portal synchronization active • Lab 1": "Attendance tracking active • Lab 1",
    "Terms of Vault": "Terms of Service",
    "Maintain the confidentiality of your account credentials": "Keep your login details safe",
    "Personal Parameters": "Personal Details",
    "The Identity Vault currently reports zero security violations.": "There are no security violations to report.",
    "Biometric patterns archived to identity vault. All perspectives secured.": "Photos successfully uploaded and saved.",
    "Verify New Phase": "Confirm New Password",
    "UPDATE PARAMETERS": "UPDATE PROFILE",
    "Querying Node Records...": "Searching Records...",
    "Current Secret Phase": "Current Password",
    "Transition Protocol (Effective Timestamp)": "Effective Date",
    "Extract Parameters": "Extract Data",
    "Initialize Class": "Create Class",
    "All credentials have been processed": "All requests processed",
    "Specify official justification parameters...": "Provide a reason...",
    "Initialize Command": "Sign In",
    "Role Node": "User Role",
    "Accessing Identity Vault...": "Loading Accounts...",
    "Identity Vault · Integrity Confirmed": "Database · Secure",
    "Ratify Credentials": "Verify Account",
    "Identity Feedback Portal": "Feedback Form",
    "Identity Verification Portal": "Sign Into LabFace",
    "Execute neural link scan or use portal below": "Scan face or manually verify below",
    "Synchronize your academic credentials to ensure uninterrupted class accessibility.": "Upload your COR to verify enrollment.",
    "Initializing Portal Matrix...": "Loading Platform...",
    "The Purge Matrix reports zero active deletion signatures.": "There are no pending deletion requests.",
    "Monitor Core Health Matrix": "System Health Monitoring",
    "Keep the matrix synchronized.": "Keep records up to date.",
    "Add Matrix Day": "Add Class Day",
    "Register with faculty credentials": "Register as a Professor",
    "All parameters synchronized.": "All settings saved successfully."
}

def process_file(filepath):
    if not os.path.exists(filepath): return []
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    changes = []
    # Check for each replacement precisely
    for old, new in replacements.items():
        if old in content and old != 'Matrix' and old != 'Node':
            content = content.replace(f'>{old}<', f'>{new}<')
            content = content.replace(f'"{old}"', f'"{new}"')
            content = content.replace(f"'{old}'", f"'{new}'")
            # fallback
            if content.find(old) != -1:
                content = content.replace(old, new)
            changes.append({'file': filepath, 'old': old, 'new': new})

    if changes:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
            
    return changes

all_changes = []

for root, dirs, files in os.walk(directory):
    if 'node_modules' in root or '.next' in root:
        continue
    for file in files:
        if file.endswith('.tsx') or file.endswith('.ts'):
            changes = process_file(os.path.join(root, file))
            all_changes.extend(changes)

# Let's write the report
with open('jargon_report.txt', 'w', encoding='utf-8') as f:
    for change in all_changes:
        f.write(f"- '{change['old']}' -> '{change['new']}'\n")

print(f"Total files modded: {len(all_changes)}")
