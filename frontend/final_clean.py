import os

file1 = r'C:\Users\John Lloyd\Capstone\LabFace\frontend\components\AttendanceInsights.tsx'
file2 = r'C:\Users\John Lloyd\Capstone\LabFace\frontend\components\ConsentStep.tsx'

if os.path.exists(file1):
    with open(file1, 'r', encoding='utf-8') as f:
        c = f.read()
    c = c.replace('Attendance Goal: {goal ? `${goal}% Sync` : \'Unassigned\'}', 'Attendance Goal: {goal ? `${goal}% Attendance` : \'Unassigned\'}')
    with open(file1, 'w', encoding='utf-8') as f:
        f.write(c)

if os.path.exists(file2):
    with open(file2, 'r', encoding='utf-8') as f:
        c = f.read()
    c = c.replace("'Minimal matrix drift may occur in fluctuating light'", "'Minimal detection variance may occur in fluctuating light'")
    c = c.replace("POL-ID-SYNC v{CONSENT_VERSION}", "POL-ID-LOG v{CONSENT_VERSION}")
    with open(file2, 'w', encoding='utf-8') as f:
        f.write(c)

print("Final jargon cleanup done.")
