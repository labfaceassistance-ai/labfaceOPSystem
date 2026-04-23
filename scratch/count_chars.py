def count_chars(filename):
    print(f"Counting in {filename}...")
    try:
        with open(filename, 'r', encoding='utf-8') as f:
            content = f.read()
            counts = {
                'backticks': content.count('`'),
                'double_quotes': content.count('"'),
                'single_quotes': content.count("'"),
                'braces_open': content.count('{'),
                'braces_close': content.count('}'),
                'parens_open': content.count('('),
                'parens_close': content.count(')')
            }
            for char, count in counts.items():
                print(f"{char}: {count} ({'ODD' if count % 2 != 0 else 'EVEN'})")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    count_chars('frontend/app/professor/dashboard/tabs/MonitorTab.tsx')
    count_chars('frontend/components/ClassDetailsModal.tsx')
