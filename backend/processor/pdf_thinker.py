import spacy
import re
import sys
from pdf_librarian import extract_text  
from nlp_processor import process_to_hierarchy

# Load the "Brain" model
nlp = spacy.load("en_core_web_sm")
nlp.max_length = 5000000 

print("!!! AI Thinker: Loading Senior NLP Architecture v17.1 !!!")

def clean_text(text):
    """Strips noise while meticulously preserving compound nouns and technical phrases."""
    t = text.strip().strip("-").strip(".").strip()
    if len(t) < 3 or t.lower() in {"it", "the", "this", "some", "ex", "there"}: return ""
    
    doc = nlp(t)
    tokens = [tok.text for tok in doc if tok.pos_ in ["NOUN", "PROPN", "ADJ"] and not tok.is_stop]
    if not tokens: return ""
    
    cleaned = " ".join(tokens).title()
    if len(cleaned) < 4: return "" 
    return cleaned

def extract_concepts_hierarchical(chapter_data):
    """
    chapter_data: {"Chapter Name": "Text Content..."}
    Professional logic: Processes entire text into a nested JSON hierarchy.
    """
    print(f"--- Thinking Hierarchical: Analyzing {len(chapter_data)} logical segments ---")
    
    # Combine content for holistic document understanding
    full_text = "\n".join(chapter_data.values())
    
    # Use the modular Senior NLP Service
    return process_to_hierarchy(full_text)

if __name__ == "__main__":
    print("AI Thinker Module Loaded.")
