from bs4 import BeautifulSoup
import re

with open('public/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

soup = BeautifulSoup(html, 'html.parser')
scripts = soup.find_all('script')

for i, script in enumerate(scripts):
    if script.string:
        with open(f'scratch/script_{i}.js', 'w', encoding='utf-8') as sf:
            sf.write(script.string)
        print(f"Extracted script {i}")
