import re

file_path = r"d:\OLD LAPTOP\my works\GEMA-Project\backend\src\scripts\seed.ts"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

pattern = r"const employee = new Employee\({[\s\S]*?\}\);"

replacement = """const employee = new Employee({
        userId: new mongoose.Types.ObjectId(),
        employeeId: `EMP${String(employees.length + 1).padStart(3, "0")}`,
        firstName: data.firstName,
        lastName: data.lastName,
        email: `${data.firstName.toLowerCase()}.${data.lastName.toLowerCase()}${employeeIndex}@${((vendor as any).companyName || "vendor").replace(/[^a-zA-Z0-9]/g, "").toLowerCase()}.com`,
        phone: `+971${Math.floor(Math.random() * 2) === 0 ? "50" : "55"}${Math.floor(Math.random() * 9000000) + 1000000}`,
        role: ["manager", "scanner", "coordinator", "security"][Math.floor(Math.random() * 4)] as any,
        vendorId: vendor._id,
        permissions: employeePermissions.map(p => ({ action: p, scope: "all" as any })),
        status: Math.random() > 0.1 ? "active" : (["inactive", "suspended"][Math.floor(Math.random() * 2)] as any),
        hiredAt: new Date(Date.now() - Math.random() * 730 * 24 * 60 * 60 * 1000),
        emergencyContact: {
          name: `Emergency Contact for ${data.firstName}`,
          relationship: ["Spouse", "Parent", "Sibling", "Friend"][Math.floor(Math.random() * 4)],
          phone: `+971${Math.floor(Math.random() * 2) === 0 ? "50" : "55"}${Math.floor(Math.random() * 9000000) + 1000000}`,
        }
      });"""

content = re.sub(pattern, replacement, content)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
