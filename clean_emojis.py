import os
import glob

bad_strings = [
    " ðŸšŒ", " ðŸ”¥", "âš¡ ", "ðŸ’¡ ", "ðŸ’¡", "ðŸŽ“ ", "ðŸ›Žï¸  ", "ðŸ”” ", "ðŸ›©ï¸  ", "ðŸ”Ž ", "ðŸŽ¯ ", "ðŸŽ¯",
    "ðŸ“ˆ", "ðŸ“œ", "ðŸŒŸ", "ðŸš€", " 🚌", " 🔥", " ⚡", " 💡", " 🎓", " 🛎️", " 🔔", " 🛩️",
    " 🔍", " 🎯", " 📈", " 📜", " 🌟", " 🚀", "ðŸšŒ", "ðŸ”¥", "âš¡", "ðŸŽ“", "ðŸ›Žï¸", "ðŸ””",
    "ðŸ›©ï¸", "ðŸ”Ž", "🚌", "🔥", "⚡", "💡", "🎓", "🛎️", "🔔", "🛩️", "🔍", "🎯", "📈", "📜",
    "🌟", "🚀", " 🎯", " 💡"
]

for filename in glob.glob("*.html"):
    with open(filename, "r", encoding="utf-8") as f:
        content = f.read()

    for bad in bad_strings:
        content = content.replace(bad, "")

    with open(filename, "w", encoding="utf-8") as f:
        f.write(content)

print("Done")
