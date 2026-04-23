import sys

def check_file(filename):
    print(f"Checking {filename}...")
    try:
        with open(filename, 'rb') as f:
            content = f.read()
            for i, byte in enumerate(content):
                if byte > 127:
                    # Find line number
                    line_num = content[:i].count(b'\n') + 1
                    print(f"Non-ASCII byte {byte} found at line {line_num}, index {i}")
    except Exception as e:
        print(f"Error reading {filename}: {e}")

if __name__ == "__main__":
    check_file('frontend/app/professor/dashboard/tabs/MonitorTab.tsx')
    check_file('frontend/components/ClassDetailsModal.tsx')
