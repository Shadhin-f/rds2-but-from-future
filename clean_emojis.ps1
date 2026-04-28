$badStrings = @(
    " ðŸšŒ", " ðŸ”¥", "âš¡ ", "ðŸ’¡ ", "ðŸ’¡", "ðŸŽ“ ", "ðŸ›Žï¸  ", "ðŸ”” ", "ðŸ›©ï¸  ", "ðŸ”Ž ", "ðŸŽ¯ ", "ðŸŽ¯",
    "ðŸ“ˆ", "ðŸ“œ", "ðŸŒŸ", "ðŸš€", " 🚌", " 🔥", " ⚡", " 💡", " 🎓", " 🛎️", " 🔔", " 🛩️",
    " 🔍", " 🎯", " 📈", " 📜", " 🌟", " 🚀", "ðŸšŒ", "ðŸ”¥", "âš¡", "ðŸŽ“", "ðŸ›Žï¸", "ðŸ””",
    "ðŸ›©ï¸", "ðŸ”Ž", "🚌", "🔥", "⚡", "💡", "🎓", "🛎️", "🔔", "🛩️", "🔍", "🎯", "📈", "📜",
    "🌟", "🚀", " 🎯", " 💡"
)

$utf8 = New-Object System.Text.UTF8Encoding $false
$files = Get-ChildItem -Path . -Filter *.html
foreach ($file in $files) {
    $content = [System.IO.File]::ReadAllText($file.FullName, $utf8)
    foreach ($bad in $badStrings) {
        $content = $content.Replace($bad, "")
    }
    [System.IO.File]::WriteAllText($file.FullName, $content, $utf8)
}
