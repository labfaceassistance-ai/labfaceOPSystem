import os

files_to_fix = [
    r'c:\Users\John Lloyd\Capstone\LabFace\frontend\app\register\student\page.tsx',
    r'c:\Users\John Lloyd\Capstone\LabFace\frontend\app\register\professor\page.tsx',
    r'c:\Users\John Lloyd\Capstone\LabFace\frontend\app\login\page.tsx',
    r'c:\Users\John Lloyd\Capstone\LabFace\frontend\app\forgot-password\page.tsx',
    r'c:\Users\John Lloyd\Capstone\LabFace\frontend\app\admin\login\page.tsx'
]

replacements = {
    'PRIMARY NAME': 'FIRST NAME',
    'SURNAME IDENTIFIER': 'LAST NAME',
    'IDENTITY PROTOCOL (INSTITUTIONAL ID)': 'STUDENT ID NUMBER',
    'UNIVERSITY COMMUNICATION ADDRESS': 'INSTITUTIONAL EMAIL',
    'Academic COMMUNICATION ADDRESS': 'INSTITUTIONAL EMAIL',
    'STUDENT IDENTITY PROTOCOL': 'STUDENT ENROLLMENT',
    'CHOOSE ACADEMIC PROGRAM': 'CHOOSE YOUR PROGRAM',
    'CHOOSE REGISTRY LEVEL': 'CHOOSE YOUR YEAR LEVEL',
    'Registry COMMUNICATION ADDRESS': 'EMAIL ADDRESS',
    'INITIALIZE YOUR IDENTITY': 'CREATE AN ACCOUNT',
    'INITIATE LOGIN': 'SIGN IN',
    'DISPATCH RECOVERY PROTOCOL': 'SEND RESET LINK',
    'RETURN TO ACCESS PORTAL': 'BACK TO LOGIN',
    'CONFIRM SECRET PHASE': 'CONFIRM PASSWORD',
    'LOST YOUR ACCESS PROTOCOL?': 'FORGOT YOUR PASSWORD?',
    'VERIFYING CREDENTIALS...': 'SIGNING IN...',
    'ACCESS DENIED': 'LOGIN FAILED',
    'FORMAT REJECTED': 'INVALID FORMAT'
}

for filepath in files_to_fix:
    if os.path.exists(filepath):
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        for old, new in replacements.items():
            content = content.replace(old, new)
            
        # Specific rule for COMMUNICATION ADDRESS in login pages
        if 'login' in filepath.lower():
            content = content.replace('COMMUNICATION ADDRESS', 'STUDENT ID')
            
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
print('Labels reverted.')
