import os
import re

files_to_fix = [
    'app/notifications/page.tsx', 
    'app/professor/profile/page.tsx', 
    'app/professor/dashboard/tabs/ActiveSessionPanel.tsx'
]

def fix_buttons(filepath):
    full_path = os.path.join(r'C:\Users\John Lloyd\Capstone\LabFace\frontend', filepath)
    if not os.path.exists(full_path):
        return
        
    with open(full_path, 'r', encoding='utf-8') as f:
        content = f.read()

    def replacer(match):
        attrs = match.group(0)
        if 'className=\"' in attrs and 'tracking-' not in attrs:
            return attrs.replace('className=\"', 'className=\"tracking-[0.15em] font-black uppercase rounded-2xl ')
        elif 'className={\"' in attrs and 'tracking-' not in attrs:
            return attrs.replace('className=\"', 'className=\"tracking-[0.15em] font-black uppercase rounded-2xl ')
        else:
            if 'className' not in attrs:
                return attrs.replace('<button', '<button className=\"tracking-[0.15em] font-black uppercase rounded-2xl\"')
        return attrs

    fixed_content = re.sub(r'<button[^>]+>', replacer, content)

    with open(full_path, 'w', encoding='utf-8') as f:
        f.write(fixed_content)

for filepath in files_to_fix:
    fix_buttons(filepath)
print('Buttons fixed.')
