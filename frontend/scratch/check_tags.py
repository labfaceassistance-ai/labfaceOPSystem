import re

def check_braces(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    stack = []
    brackets = {
        '(': ')',
        '{': '}',
        '[': ']'
    }
    
    # We need to skip comments and strings to be accurate
    clean_content = re.sub(r'//.*', '', content)
    clean_content = re.sub(r'/\*.*?\*/', '', clean_content, flags=re.DOTALL)
    clean_content = re.sub(r'"[^"\\]*(?:\\.[^"\\]*)*"', '', clean_content)
    clean_content = re.sub(r"'[^'\\]*(?:\\.[^'\\]*)*'", '', clean_content)
    clean_content = re.sub(r'`[^`\\]*(?:\\.[^`\\]*)*`', '', clean_content, flags=re.DOTALL)

    lines = clean_content.split('\n')
    for i, line in enumerate(lines):
        for char in line:
            if char in brackets.keys():
                stack.append((char, i+1))
            elif char in brackets.values():
                if not stack:
                    print(f"Extra closing {char} at line {i+1}")
                else:
                    opening, line_num = stack.pop()
                    if brackets[opening] != char:
                        print(f"Mismatched {char} at line {i+1} (expected {brackets[opening]} from line {line_num})")
    
    while stack:
        opening, line_num = stack.pop()
        print(f"Unclosed {opening} from line {line_num}")

filename = r'c:\Users\John Lloyd\Capstone\LabFace\frontend\app\admin\dashboard\page.tsx'
print("Checking braces for Admin Dashboard:")
check_braces(filename)

filename = r'c:\Users\John Lloyd\Capstone\LabFace\frontend\app\admin\camera-test\page.tsx'
print("\nChecking braces for Admin Camera Test:")
check_braces(filename)
