import os
import re
import json

directory = r'C:\Users\John Lloyd\Capstone\LabFace\frontend'
jargon_words = ['Protocol', 'Matrix', 'Node', 'Identifier', 'Initialize', 'Dispatch', 'Initiate', 'Phase', 'Vault', 'Hermetic', 'Parameters', 'Credentials', 'Instance', 'Portal']

jargon_pattern = re.compile(r'\b(' + '|'.join(jargon_words) + r')\b', re.IGNORECASE)

found_phrases = set()

def extract_from_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Extract text between tags >text<
    for match in re.findall(r'>\s*([^<]+)\s*<', content):
        if jargon_pattern.search(match) and 'className=' not in match and '/>' not in match:
            found_phrases.add(match)
            
    # Extract placeholders
    for match in re.findall(r'placeholder=[\"\']([^\"\']+)[\"\']', content):
        if jargon_pattern.search(match):
            found_phrases.add(match)
            
    # Extract titles
    for match in re.findall(r'title=[\"\']([^\"\']+)[\"\']', content):
        if jargon_pattern.search(match):
            found_phrases.add(match)
            
    # Extract raw JS strings that might be rendered
    for match in re.findall(r'\{[\"\']([^\"\']+)[\"\']\}', content):
        if jargon_pattern.search(match):
            found_phrases.add(match)

for root, dirs, files in os.walk(directory):
    if 'node_modules' in root or '.next' in root:
        continue
    for file in files:
        if file.endswith('.tsx') or file.endswith('.ts'):
            extract_from_file(os.path.join(root, file))

filtered_phrases = []
for p in found_phrases:
    p = p.strip()
    if len(p) > 2 and not p.startswith('/') and not p.startswith('http') and not '=' in p and not '{' in p:
        filtered_phrases.append(p)

with open('jargon.json', 'w', encoding='utf-8') as f:
    json.dump(filtered_phrases, f, indent=2)

print("Extraction complete.")
