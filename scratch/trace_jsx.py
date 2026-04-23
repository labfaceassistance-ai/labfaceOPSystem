import re

def trace_jsx(filename):
    print(f"Tracing JSX in {filename}...")
    try:
        with open(filename, 'r', encoding='utf-8') as f:
            lines = f.readlines()
            stack = []
            for i, line in enumerate(lines):
                line_num = i + 1
                # Find tags (excluding self-closing ones and comments)
                tags = re.findall(r'<(/?[a-zA-Z0-9]+(?:\.[a-zA-Z0-9]+)?)', line)
                for tag in tags:
                    if tag.startswith('/'):
                        closing_tag = tag[1:]
                        if not stack:
                            print(f"L{line_num}: Unexpected closing tag </{closing_tag}>")
                        else:
                            last_tag = stack.pop()
                            if last_tag != closing_tag:
                                print(f"L{line_num}: Mismatched tag. Expected </{last_tag}> but found </{closing_tag}>")
                    elif not line.strip().endswith('/>') and not line.strip().endswith('/>') and '<' + tag + ' ' in line or '<' + tag + '>' in line:
                        # Simple check for self-closing in same line
                        if '/>' not in line[line.find('<' + tag):]:
                             stack.append(tag)
                             # print(f"L{line_num}: Opened <{tag}> (Stack: {len(stack)})")
            
            if stack:
                print(f"Unclosed tags at end: {stack}")
            else:
                print("All tags balanced!")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    trace_jsx('frontend/app/professor/dashboard/tabs/MonitorTab.tsx')
