file_path = r"d:\OLD LAPTOP\my works\GEMA-Project\backend\src\scripts\seed.ts"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

replacement = """    try {
      reviews.push(await review.save());
    } catch (e: any) {
      // ignore duplicate reviews
    }"""

content = content.replace("    reviews.push(await review.save());", replacement)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
