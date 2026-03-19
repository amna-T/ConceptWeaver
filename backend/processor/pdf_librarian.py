import fitz
import sys
import os 

import re

def extract_chapters(pdf_path):
    """
    Extracts text partitioned by logical Chapters/Units.
    Logic:
    1. Scan TOC. If Level 1 is just the Book Title, drill down to Level 2.
    2. Fallback to Regex for "UNIT I", "UNIT-1", "CHAPTER 1", etc.
    3. Filter out "Noise Chapters" (less than 200 chars).
    """
    with fitz.open(pdf_path) as doc:
        toc = doc.get_toc() # [[lvl, title, page], ...]
        fname = os.path.basename(pdf_path).lower()
        
        print(f"---Deep Scanning: {fname}---")
        
        # 🔎 STRATEGY 1: Smart TOC Discovery
        chapters = {}
        if toc:
            # Determine the best structural level
            target_lvl = 1
            lvl1_entries = [x for x in toc if x[0] == 1]
            if len(lvl1_entries) <= 1:
                lvl2_entries = [x for x in toc if x[0] == 2]
                if len(lvl2_entries) >= 2: target_lvl = 2
                else:
                    lvl3_entries = [x for x in toc if x[0] == 3]
                    if len(lvl3_entries) >= 2: target_lvl = 3

            relevant_toc = [e for e in toc if e[0] == target_lvl]
            
            for i in range(len(relevant_toc)):
                lvl, title, start_page = relevant_toc[i]
                if title.lower() in fname or len(title) < 3: continue
                
                end_page = len(doc)
                curr_idx = toc.index(relevant_toc[i])
                if curr_idx + 1 < len(toc):
                    end_page = toc[curr_idx + 1][2] - 1
                
                p_start = max(0, start_page - 1)
                p_end = min(len(doc), end_page)
                
                chunk = ""
                for p in range(p_start, p_end):
                    chunk += doc.load_page(p).get_text()
                
                if len(chunk.strip()) > 300:
                    chapters[title.strip()] = chunk
                    print(f"TOC Struct: '{title}'")

        # 🔎 STRATEGY 2: Aggressive Regex Fallback
        if len(chapters) <= 1:
            print("Internal structure hidden. Starting Regex Deep-Scan...")
            full_text = "".join([p.get_text() for p in doc])
            
            patterns = [
                r"((?:UNIT|CHAPTER|MODULE|PART|LECTURE|WEEK|SOLUTIONS|VOCABULARY|FACTS|SUMMARY|MCQS)\s*(?:-|\.|:)?\s*[IVXLC\d]*)",
                r"(^\s*(?:UNIT|CHAPTER|MODULE|LECTURE|WEEK|SOLUTIONS|VOCABULARY|FACTS|SUMMARY|MCQS)\s*[IVXLC\d]*\s*$)"
            ]
            
            split_points = []
            for p in patterns:
                for m in re.finditer(p, full_text, re.MULTILINE | re.IGNORECASE):
                    context = full_text[max(0, m.start()-5) : m.start()]
                    if not context.strip() or "\n" in context:
                        split_points.append((m.start(), m.group().strip().upper()))
            
            split_points = list(set(split_points))
            split_points.sort()
            
            if len(split_points) >= 2:
                for i in range(len(split_points)):
                    start = split_points[i][0]
                    name = split_points[i][1]
                    end = split_points[i+1][0] if i+1 < len(split_points) else len(full_text)
                    content = full_text[start:end]
                    if len(content) > 300:
                        chapters[name] = content
                        print(f"Regex Struct: '{name}'")

        # 🔎 STRATEGY 3: Final fallback
        if not chapters:
            print("No logical breaks found. Grouping by Page-Blocks.")
            total_pages = len(doc)
            if total_pages > 15:
                step = max(5, total_pages // 5)
                for i in range(0, total_pages, step):
                    ch_name = f"Part {i//step + 1}"
                    ch_text = "".join([doc.load_page(p).get_text() for p in range(i, min(i+step, total_pages))])
                    chapters[ch_name] = ch_text
            else:
                chapters["Analysis"] = "".join([p.get_text() for p in doc])

    return chapters

def extract_text(pdf_path):
    """Fallback function for backward compatibility"""
    with fitz.open(pdf_path) as doc:
        return "".join([p.get_text() for p in doc])

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python pdf_librarian.py <path_to_pdf>")
        sys.exit(1)

    pdf_path = sys.argv[1]
    if not os.path.exists(pdf_path):
        print(f"Error: File not found at {pdf_path}")
        sys.exit(1)

    text = extract_text(pdf_path)
    print("\n---Full Extracted Text---")
    print(text)