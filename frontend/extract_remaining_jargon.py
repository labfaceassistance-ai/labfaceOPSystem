import os
import re
import json

directory = r'C:\Users\John Lloyd\Capstone\LabFace\frontend'
# Expanded list of overly technical terms
jargon_words = [
    'Neural', 'Link', 'Calibration', 'Diagnostic', 'Ledger', 
    'Purge', 'Signatures', 'Operational', 'Authentication', 
    'Identification', 'Validation', 'Optical', 'Stream', 
    'Evidence', 'Anomaly', 'Interface', 'Entity', 'Entities',
    'Adherence', 'Signatures', 'Outliers', 'Fraudulent',
    'Terminate', 'Session', 'Sync', 'Synchronized', 'Metadata',
    'Perspective', 'Confidentiality', 'Outlier'
]

jargon_pattern = re.compile(r'\b(' + '|'.join(jargon_words) + r')\b', re.IGNORECASE)

found_phrases = []

def extract_from_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except:
        return
    
    file_short = filepath.replace(directory, '')
    
    matches = set()
    # Extract text between tags >text<
    for match in re.findall(r'>\s*([^<]+)\s*<', content):
        if jargon_pattern.search(match) and 'className=' not in match and '/>' not in match:
            matches.add(match)
            
    # Extract placeholders
    for match in re.findall(r'placeholder=[\"\']([^\"\']+)[\"\']', content):
        if jargon_pattern.search(match):
            matches.add(match)
            
    # Extract titles
    for match in re.findall(r'title=[\"\']([^\"\']+)[\"\']', content):
        if jargon_pattern.search(match):
            matches.add(match)
            
    # Extract raw JS strings that might be rendered
    for match in re.findall(r'\{[\"\']([^\"\']+)[\"\']\}', content):
        if jargon_pattern.search(match):
            matches.add(match)

    for p in matches:
        p = p.strip()
        if len(p) > 2 and not p.startswith('/') and not p.startswith('http') and not '=' in p and not '{' in p and not p in ['Session', 'className']:
            # Ignore standard accepted terms like 'Session' alone, 'Active Session'
            if p == 'Active Session' or p == 'MAINTAIN ACTIVE SESSION': 
                continue
            found_phrases.append({'file': file_short, 'text': p})

for root, dirs, files in os.walk(directory):
    if 'node_modules' in root or '.next' in root:
        continue
    for file in files:
        if file.endswith('.tsx') or file.endswith('.ts'):
            extract_from_file(os.path.join(root, file))

with open('remaining_jargon.json', 'w', encoding='utf-8') as f:
    json.dump(found_phrases, f, indent=2)

print("Extraction complete.")
