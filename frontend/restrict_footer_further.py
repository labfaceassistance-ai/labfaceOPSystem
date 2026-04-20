import os
import re

directory = r'C:\Users\John Lloyd\Capstone\LabFace\frontend'

# 1. Remove footer from notifications and privacy policy as per latest strict instruction
pages_to_remove = [
    os.path.join(directory, 'app', 'privacy-policy', 'page.tsx'),
    os.path.join(directory, 'app', 'notifications', 'page.tsx')
]

for p in pages_to_remove:
    if os.path.exists(p):
        with open(p, 'r', encoding='utf-8') as f:
            c = f.read()
        
        # Remove import
        c = re.sub(r"import IdentityFooter from '@/components/IdentityFooter';\s*", "", c)
        # Remove tag
        c = re.sub(r"\s*<IdentityFooter />", "", c)
        
        with open(p, 'w', encoding='utf-8') as f:
            f.write(c)

# 2. Final Jargon Check for specific isolated words
# The user wants to replace 'MATRIX', 'INITIALIZE', 'NEURAL', 'NODE', 'PURGE', 'VAULT', 'SYNC'
# with plain English equivalents if they appear in visible text.

# I will do a more careful replacement for these common words in JSX.
# Definitions for standalone replacements:
jargon_map = {
    "MATRIX": "DATABASE",
    "INITIALIZE": "START",
    "NEURAL": "AI",
    "NODE": "ITEM",
    "PURGE": "DELETE",
    "VAULT": "SECURITY",
    "SYNC": "UPDATE"
}
# Note: These are fallback. Usually they are part of phrases.

print("Footer removed from extra pages.")
