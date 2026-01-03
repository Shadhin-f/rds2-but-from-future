"""
NSU Library Book Scraper - FIXED VERSION
This script scrapes all book information from NSU Library OPAC catalog
Total Books: 30,209
"""
 
import requests
from bs4 import BeautifulSoup
import csv
import json
import time
import re
from datetime import datetime
 
class NSULibraryScraper:
    def __init__(self):
        self.base_url = "https://opac.northsouth.edu/cgi-bin/koha/opac-search.pl"
        self.total_books = 0
        self.books_data = []
        
    def get_total_count(self):
        """Get the total number of books available"""
        params = {
            'limit': 'mc-itype,phr:BK',
            'sort_by': 'relevance'
        }
        
        try:
            response = requests.get(self.base_url, params=params, timeout=30)
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Find the result count - Looking for text containing "Your search returned X results"
            numresults = soup.find(id='numresults')
            if numresults:
                text = numresults.get_text()
                # Extract number using regex
                match = re.search(r'(\d+)\s+results', text)
                if match:
                    self.total_books = int(match.group(1))
                    print(f"Total books found: {self.total_books}")
                    return self.total_books
            
            print("Could not find result count on page")
            return 0
            
        except Exception as e:
            print(f"Error getting total count: {e}")
            return 0
    
    def scrape_page(self, offset=0, count=20):
        """Scrape a single page of results"""
        params = {
            'limit': 'mc-itype,phr:BK',
            'offset': offset,
            'count': count,
            'sort_by': 'relevance'
        }
        
        books_on_page = []
        
        try:
            response = requests.get(self.base_url, params=params, timeout=30)
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Find all book entries - they are in table rows
            book_rows = soup.find_all('tr')
            
            for row in book_rows:
                # Check if this row contains a book entry
                title_link = row.find('a', class_='title')
                if not title_link:
                    continue
                    
                book_info = {}
                
                # Extract title
                book_info['title'] = title_link.text.strip()
                book_info['detail_url'] = f"https://opac.northsouth.edu{title_link.get('href', '')}"
                
                # Extract biblionumber from URL
                if 'biblionumber=' in book_info['detail_url']:
                    biblio_num = book_info['detail_url'].split('biblionumber=')[-1].split('&')[0]
                    book_info['biblionumber'] = biblio_num
                
                # Extract authors - look for links with 'au:' in href
                authors = []
                author_spans = row.find_all('a', href=lambda x: x and '/cgi-bin/koha/opac-search.pl?q=au:' in str(x))
                for author_link in author_spans:
                    author_name = author_link.text.strip()
                    if author_name:
                        authors.append(author_name)
                
                book_info['authors'] = ', '.join(authors) if authors else 'N/A'
                
                # Extract all text from the row for other details
                row_text = row.get_text(separator=' | ', strip=True)
                
                # Try to extract material type
                if 'Material type:' in row_text:
                    material_start = row_text.find('Material type:')
                    material_section = row_text[material_start:material_start+200]
                    book_info['material_info'] = material_section.split('|')[0].strip()
                
                # Try to extract publication details
                if 'Publication details:' in row_text:
                    pub_start = row_text.find('Publication details:')
                    pub_section = row_text[pub_start:pub_start+200]
                    book_info['publication'] = pub_section.split('|')[0].replace('Publication details:', '').strip()
                
                # Try to extract availability
                if 'Availability:' in row_text:
                    avail_start = row_text.find('Availability:')
                    avail_section = row_text[avail_start:avail_start+300]
                    book_info['availability'] = avail_section.split('Place hold')[0].replace('Availability:', '').strip()
                
                # Extract call number - look for pattern like "GEN QA269.D38 1970"
                call_match = re.search(r'([A-Z]{2,4})\s+([A-Z0-9.]+\s+\d{4})', row_text)
                if call_match:
                    book_info['call_number'] = call_match.group(0)
                
                if book_info and 'title' in book_info:
                    books_on_page.append(book_info)
            
            return books_on_page
            
        except Exception as e:
            print(f"Error scraping page at offset {offset}: {e}")
            return []
    
    def scrape_all_books(self, save_interval=100):
        """Scrape all books with progress tracking"""
        # Get total count first
        if not self.total_books:
            self.get_total_count()
        
        if not self.total_books:
            print("Could not determine total book count. Exiting.")
            return
        
        books_per_page = 20
        total_pages = (self.total_books + books_per_page - 1) // books_per_page
        
        print(f"\nStarting to scrape {self.total_books} books across {total_pages} pages...")
        print(f"Progress will be saved every {save_interval} books\n")
        
        for page_num in range(total_pages):
            offset = page_num * books_per_page
            
            print(f"Scraping page {page_num + 1}/{total_pages} (offset {offset})", end=' ')
            
            books = self.scrape_page(offset, books_per_page)
            self.books_data.extend(books)
            
            print(f"- Found {len(books)} books")
            
            # Save progress periodically
            if len(self.books_data) > 0 and len(self.books_data) % save_interval == 0:
                self.save_progress()
            
            # Be polite to the server - add delay between requests
            time.sleep(1)
            
            # Progress indicator every 50 pages
            if (page_num + 1) % 50 == 0:
                progress = (len(self.books_data) / self.total_books) * 100
                print(f"\n>>> Progress: {progress:.1f}% ({len(self.books_data)}/{self.total_books} books)\n")
        
        print(f"\n{'='*60}")
        print(f"Scraping complete! Total books collected: {len(self.books_data)}")
        print(f"{'='*60}\n")
    
    def save_progress(self):
        """Save current progress to JSON file"""
        filename = f"nsu_books_progress_{len(self.books_data)}.json"
        try:
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(self.books_data, f, ensure_ascii=False, indent=2)
            print(f"    >> Progress saved to {filename}")
        except Exception as e:
            print(f"    >> Error saving progress: {e}")
    
    def save_to_csv(self, filename='nsu_library_books.csv'):
        """Save all scraped data to CSV file"""
        if not self.books_data:
            print("No data to save!")
            return
        
        try:
            # Get all unique keys
            all_keys = set()
            for book in self.books_data:
                all_keys.update(book.keys())
            
            with open(filename, 'w', newline='', encoding='utf-8') as f:
                writer = csv.DictWriter(f, fieldnames=sorted(all_keys))
                writer.writeheader()
                writer.writerows(self.books_data)
            
            print(f"✓ Data saved to {filename}")
        except Exception as e:
            print(f"Error saving CSV: {e}")
    
    def save_to_json(self, filename='nsu_library_books.json'):
        """Save all scraped data to JSON file"""
        if not self.books_data:
            print("No data to save!")
            return
        
        try:
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(self.books_data, f, ensure_ascii=False, indent=2)
            
            print(f"✓ Data saved to {filename}")
        except Exception as e:
            print(f"Error saving JSON: {e}")
 
 
def main():
    """Main function to run the scraper"""
    print("\n" + "="*60)
    print("NSU Library Book Scraper")
    print("="*60)
    print(f"Start time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*60 + "\n")
    
    scraper = NSULibraryScraper()
    
    # Scrape all books
    scraper.scrape_all_books(save_interval=200)
    
    # Save to both CSV and JSON
    print("\nSaving final files...")
    scraper.save_to_csv('nsu_library_books_complete.csv')
    scraper.save_to_json('nsu_library_books_complete.json')
    
    print("\n" + "="*60)
    print(f"End time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Total books scraped: {len(scraper.books_data)}")
    print("="*60 + "\n")
 
 
if __name__ == "__main__":
    main()
 
 
"""
USAGE INSTRUCTIONS:
===================
 
1. Install required libraries:
   pip install requests beautifulsoup4
 
2. Run the script:
   python nsu_library_scraper.py
 
3. The script will:
   - Scrape all 30,209+ books from NSU Library OPAC
   - Save progress every 200 books (in case of interruption)
   - Create two output files:
     * nsu_library_books_complete.csv (spreadsheet format)
     * nsu_library_books_complete.json (JSON format)
 
4. Output includes:
   - Title
   - Author(s)
   - Publication details
   - Call number
   - Availability status
   - Material information
   - Direct URL to book details
   - Biblionumber (unique ID)
 
ESTIMATED TIME:
- With 1 second delay between pages: ~25-30 minutes for all 30,209 books
- Progress is saved periodically to prevent data loss
 
NOTES:
- The script is respectful to the server (1 second delay between requests)
- Progress files are saved automatically during scraping
- If interrupted, you can modify the script to resume from last offset
 
FIXES IN THIS VERSION:
- Fixed HTML parsing to correctly find the result count
- Improved error handling with timeouts
- Better regex patterns for extracting book information
- More robust author extraction
- Enhanced progress reporting
"""