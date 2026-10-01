import re

file_path = r"d:\OLD LAPTOP\my works\GEMA-Project\backend\src\scripts\seed.ts"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

pattern = r"email: `\$\{data\.firstName\.toLowerCase\(\)\}\.\$\{data\.lastName\.toLowerCase\(\)\}\$\{employeeIndex\}@\$\{.*\.com`,"

replacement = """email: `${data.firstName.toLowerCase()}.${data.lastName.toLowerCase()}${employeeIndex}_${Math.floor(Math.random() * 100000)}@${((vendor as any).companyName || "vendor").replace(/[^a-zA-Z0-9]/g, "").toLowerCase()}.com`,"""

content = re.sub(pattern, replacement, content)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
