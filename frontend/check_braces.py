
import sys

def check_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        
        stack = []
        for i, line in enumerate(lines):
            for char in line:
                if char == '{':
                    stack.append(('{', i + 1))
                elif char == '}':
                    if not stack:
                        print(f"Error: Unexpected '}}' at line {i + 1}")
                    else:
                        stack.pop()
        
        if stack:
            print(f"Error: Unclosed '{{' found at lines: " + ", ".join([str(l) for _, l in stack]))
        else:
            print(f"Success: Braces are balanced in {filepath}")
            
    except Exception as e:
        print(f"Error reading file: {e}")

if __name__ == "__main__":
    check_file(r"c:\Users\John Lloyd\Capstone\LabFace\frontend\app\admin\dashboard\page.tsx")
    check_file(r"c:\Users\John Lloyd\Capstone\LabFace\frontend\app\admin\camera-test\page.tsx")
    check_file(r"c:\Users\John Lloyd\Capstone\LabFace\frontend\app\professor\profile\page.tsx")
