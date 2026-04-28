$files = Get-ChildItem -Path . -Filter *.html
foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $content = $content -replace '<a href="about\.html"(.*?)>Dev</a>', '<a href="about.html"$1>About</a>'
    $content = $content -replace '<a href="about\.html"(.*?)>About Dev</a>', '<a href="about.html"$1>About</a>'
    [System.IO.File]::WriteAllText($file.FullName, $content, [System.Text.Encoding]::UTF8)
}
