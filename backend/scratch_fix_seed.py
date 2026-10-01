import re

def fix_seed():
    file_path = r"d:\OLD LAPTOP\my works\GEMA-Project\backend\src\scripts\seed.ts"
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Fix country code
    content = content.replace('country: "UAE"', 'country: "AE"')

    # Fix shortDescription
    content = re.sub(
        r'(title:\s*".*?",\s*\n\s*)description:',
        r'\1shortDescription: "A short description",\n    description:',
        content
    )

    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)

if __name__ == "__main__":
    fix_seed()
