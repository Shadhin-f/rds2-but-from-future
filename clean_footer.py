import os
import glob

bad_strings = {
    "Â©": "©",
    "Â·": "·",
    "â€¢": "·",
    "Letâ€™s": "Let's",
    "materialsâ€”notes": "materials—notes",
}

for filename in glob.glob("*.html"):
    with open(filename, "r", encoding="utf-8") as f:
        content = f.read()

    for bad, good in bad_strings.items():
        content = content.replace(bad, good)

    with open(filename, "w", encoding="utf-8") as f:
        f.write(content)

print("Done")
