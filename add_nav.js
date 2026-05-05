const fs = require('fs');
const path = require('path');

const dir = 'e:/git-respositories/rds2-but-from-future';
const files = fs.readdirSync(dir);

let count = 0;

for (const file of files) {
  if (file.endsWith('.html')) {
    const filePath = path.join(dir, file);
    let content = fs.readFileSync(filePath, 'utf8');

    // Make sure we only add it if it's not already there.
    // Also blog.html itself already has "blog.html" before "about.html"
    if (file === 'blog.html') {
      // In blog.html, we need to add the class to the existing link
      content = content.replace('<a href="blog.html" class="active">Blog Post</a>', '<a href="blog.html" class="active blog-nav-link">Blog Post</a>');
      fs.writeFileSync(filePath, content, 'utf8');
      continue;
    }

    if (!content.includes('<a href="blog.html"')) {
      // Regex to handle varying amounts of whitespace before <a href="about.html">
      content = content.replace(/([ \t]*)<a href="about\.html">About<\/a>/g, '$1<a href="blog.html" class="blog-nav-link">Blog Post</a>\n$1<a href="about.html">About</a>');
      fs.writeFileSync(filePath, content, 'utf8');
      count++;
      console.log(`Updated ${file}`);
    } else {
      // If blog.html link exists but missing the class (if it was added previously)
      if (!content.includes('class="blog-nav-link"')) {
        content = content.replace('<a href="blog.html">Blog Post</a>', '<a href="blog.html" class="blog-nav-link">Blog Post</a>');
        fs.writeFileSync(filePath, content, 'utf8');
        count++;
        console.log(`Updated class in ${file}`);
      }
    }
  }
}

console.log(`Done. Updated ${count} files.`);
