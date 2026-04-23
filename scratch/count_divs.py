def count_divs(filename):
    print(f"Counting divs in {filename}...")
    try:
        with open(filename, 'r', encoding='utf-8') as f:
            content = f.read()
            # Remove comments to avoid false positives
            content = re.sub(r'{\/\*.*?\*\/}', '', content, flags=re.DOTALL)
            opens = content.count('<div')
            closes = content.count('</div')
            self_closing = content.count('/>') # Very rough
            print(f"Opens: {opens}")
            print(f"Closes: {closes}")
            if opens != closes:
                print(f"DIFF: {opens - closes}")
    except Exception as e:
        print(f"Error: {e}")

import re
if __name__ == "__main__":
    count_divs('frontend/app/professor/dashboard/tabs/MonitorTab.tsx')
