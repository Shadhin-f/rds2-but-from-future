import os
import glob

bad_strings = {
    "ðŸ•›": "🕛",
    "âš ï¸ ": "⚠️",
    "âš ï¸": "⚠️",
}

for filename in glob.glob("*.html"):
    with open(filename, "r", encoding="utf-8") as f:
        content = f.read()

    changed = False
    for bad, good in bad_strings.items():
        if bad in content:
            content = content.replace(bad, good)
            changed = True

    if changed:
        with open(filename, "w", encoding="utf-8") as f:
            f.write(content)

print("Done")
