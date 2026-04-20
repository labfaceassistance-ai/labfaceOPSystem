import os
import re

directory = r'C:\Users\John Lloyd\Capstone\LabFace\frontend'

# 1. Handle Jargon replacements safely via specific file match and exact strings
replacements = {
    # student profile
    "Synchronized": "Updated",
    "Node Alert": "System Alert",
    "{ id: 'privacy', label: 'Vault', icon: Shield }": "{ id: 'privacy', label: 'Privacy', icon: Shield }",
    "Verify Node": "Verify Enrollment",
    "5 of 5 Biometric Nodes Synchronized": "5 of 5 Face Photos Uploaded",
    "Abort Sync": "Cancel Update",
    "Neural Matrix Successfully Updated": "Data Successfully Updated",
    "Neural Matrix Consent": "Privacy Consent",
    "Generating Neural PDF Report...": "Generating PDF Report...",
    "Purge Protocol Initialized": "Account Deletion Started",
    "neural pattern data will be purged": "facial profile data will be permanently deleted",
    
    # student tabs
    "dayClasses.length === 1 ? 'Node' : 'Nodes'": "dayClasses.length === 1 ? 'Class' : 'Classes'",
    "label: 'Sync Date'": "label: 'Class Date'",
    "label: 'Matrix Status'": "label: 'Status'",
    "Recent Sync Logs": "Recent Attendance Logs",

    # register student
    "Initialize Verification": "Start Verification",

    # admin profile & analytics
    "Visual identity matrix updated.": "Profile picture updated.",
    "Security Matrix": "Security Details",
    "Matrix fully duplicated.": "Data fully exported.",
    "OF ENTIRE MATRIX": "OF ALL STUDENTS",

    # UI Components
    "No neural matches for": "No student matches for",
    "Neural Push Notifications": "Push Notifications",
    "<Check size={12} /> Sync": "<Check size={12} /> Info",
    " Purge": " Delete",
    "Initialize Identity": "Sign In",
    "Neural Connectivity Check · Active Biometrics": "Camera Check · Active System",
    "Synchronizing...": "Processing...",
    "Initialize Capture": "Start Camera",
    "Matrix Status:": "Photo Status:",
    "Archive <span": "Save <span",
    "</span> Matrix": "</span> Photo",
    "Sync New Matrix": "Update Photos",
    "Frontal Sync": "Frontal View",
    "Initialize Biometric Stream": "Start Camera Scanner",
    "Initialize Secure Stream": "Start Setup",
    "Re-Sync": "Retake Photo",
    "Abort Sync": "Cancel",
    "Purge Auth": "Approve",
    "Void Proto": "Reject",
    "Confirm Purge": "Confirm Deletion",
    "Confirm Void": "Confirm Rejection",
    "Close Matrix View": "Close View",

    # Consent
    "Biometric Matrix Sync": "Face Registration Consent",
    "Identity Vault Encryption": "Data Privacy Security",
    "biometric matrix signatures": "face registration photos",
    "neural signatures": "face profiles",
    "Neural CCTV Consent": "CCTV Consent",
    "Continuous Authentication Matrix": "Continuous Verification",
    "Real-time Sync": "Real-time Detection",
    "Matrix Accuracy": "System Accuracy",
    "minimal matrix drift": "minimal detection variance",
    "Neural Layer Policy": "Data Retention Policy",
    "Vault Security": "Data Security",
    "Retention Matrix": "Data Retention",
    "matrix deletion": "account deletion",
    "Matrix Erasure": "Data Deletion",
    "Revoke Sync": "Revoke Consent",
    
    # Insights
    "Matrix Gains": "Attendance Gains",
    "Matrix Loss": "Attendance Loss",
    "Matrix Attendance Rate": "Attendance Rate",
    "Sync Locked": "Not Tracked",
    "Matrix Objective:": "Attendance Goal:",
    "Matrix objective secured.": "Goal achieved.",
    "Matrix stabilization requires": "Reaching goal requires",
    "Update Objective": "Update Goal",
    "Initialize Goal": "Set My Goal",
    "MATRIX OBJECTIVE: UNASSIGNED": "ATTENDANCE GOAL: NOT SET"   
}

# Apply Jargon Replace
for root, dirs, files in os.walk(directory):
    if 'node_modules' in root or '.next' in root: continue
    for file in files:
        if file.endswith('.tsx') or file.endswith('.ts'):
            path = os.path.join(root, file)
            try:
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
            except:
                continue
            
            original_content = content
            for old, new in replacements.items():
                if old in content:
                    content = content.replace(old, new)
            
            # More blind fallback for "Matrix", "Neural", "Initialize" inside tags if any missed
            # We must be careful not to break HTML. 
            
            if content != original_content:
                with open(path, 'w', encoding='utf-8') as f:
                    f.write(content)

# 2. Fix IdentityFooter

# Root layout: remove import and usage
layout_path = os.path.join(directory, 'app', 'layout.tsx')
if os.path.exists(layout_path):
    with open(layout_path, 'r', encoding='utf-8') as f:
        l_content = f.read()
    
    # Remove import
    l_content = re.sub(r"import IdentityFooter from '\.\./components/IdentityFooter';\s*", "", l_content)
    # Remove tag
    l_content = re.sub(r"\s*<IdentityFooter />", "", l_content)
    
    with open(layout_path, 'w', encoding='utf-8') as f:
        f.write(l_content)

# Add to page.tsx, privacy-policy/page.tsx, notifications/page.tsx
pages_to_add = [
    os.path.join(directory, 'app', 'page.tsx'),
    os.path.join(directory, 'app', 'privacy-policy', 'page.tsx'),
    os.path.join(directory, 'app', 'notifications', 'page.tsx')
]

for p in pages_to_add:
    if os.path.exists(p):
        with open(p, 'r', encoding='utf-8') as f:
            c = f.read()
        
        # Add import if missing
        import_stmt = "import IdentityFooter from '@/components/IdentityFooter';"
        if p.endswith('page.tsx') and 'app\\page.tsx' in p:
             import_stmt = "import IdentityFooter from '../components/IdentityFooter';"
        elif 'privacy-policy' in p or 'notifications' in p:
             import_stmt = "import IdentityFooter from '@/components/IdentityFooter';"
             
        if 'IdentityFooter' not in c:
            # Place after first line
            lines = c.split('\n')
            lines.insert(2, import_stmt)
            c = '\n'.join(lines)
            
            # Place tag before the last </div>
            # Find the last </div>
            last_div_idx = c.rfind('</div>')
            if last_div_idx != -1:
                c = c[:last_div_idx] + '    <IdentityFooter />\n        ' + c[last_div_idx:]
            
            with open(p, 'w', encoding='utf-8') as f:
                f.write(c)

print("Footer logic fixed and all jargon replaced.")
