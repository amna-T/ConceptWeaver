import spacy
from collections import Counter
import re

# Load small model for efficiency; can be swapped for lg if vector-based clustering is needed
nlp = spacy.load("en_core_web_sm")

class ConceptNormalizer:
    """Normalizes tech terms using lemmas and entity resolution."""
    @staticmethod
    def normalize(text):
        doc = nlp(text.lower().strip())
        # Keep only nouns, adjectives, and proper nouns
        tokens = [t.lemma_ for t in doc if t.pos_ in ["NOUN", "PROPN", "ADJ"] and not t.is_stop]
        if not tokens: return ""
        return " ".join(tokens).title()

class ConceptRanker:
    """Scores concepts by frequency and document position."""
    @staticmethod
    def rank_concepts(text, limit=30):
        doc = nlp(text)
        # Extract noun chunks as multi-word concepts are more meaningful
        concepts = []
        for chunk in doc.noun_chunks:
            norm = ConceptNormalizer.normalize(chunk.text)
            if len(norm) > 2:
                concepts.append(norm)
        
        counts = Counter(concepts)
        # Return top-N weighted concepts
        return [item[0] for item in counts.most_common(limit)]

class SemanticClusterer:
    """Groups related concepts into logical subtopics."""
    @staticmethod
    def cluster(concepts, main_topic):
        clusters = {}
        for concept in concepts:
            if concept.lower() == main_topic.lower(): continue
            root_word = concept.split()[0]
            if root_word not in clusters:
                clusters[root_word] = []
            clusters[root_word].append(concept)
            
        structured_topics = []
        for topic, items in clusters.items():
            # Senior Logic: If it's a Proper Noun (Entity), it DESERVES its own branch
            # even if it has no cluster children.
            doc_topic = nlp(topic)
            is_proper = any(t.pos_ == "PROPN" for t in doc_topic)
            
            if len(items) >= 2 or is_proper:
                structured_topics.append({
                    "topic": topic,
                    "concepts": list(set(items))[:5]
                })
            else:
                misc_group = next((t for t in structured_topics if t["topic"] == "Core Elements"), None)
                if not misc_group:
                    misc_group = {"topic": "Core Elements", "concepts": []}
                    structured_topics.append(misc_group)
                misc_group["concepts"].extend(items)

        return structured_topics[:10]

class HierarchyBuilder:
    """Assembles the final nested JSON structure."""
    @staticmethod
    def build(full_text):
        # 1. Smart Title Detection (Quoted text priority)
        first_line = full_text.split('\n')[0]
        match = re.search(r'[“"\'"‘]([^”"\'"’]*)[”"\'"’]', first_line)
        
        if match:
            main_topic = match.group(1).title()
        else:
            doc_start = nlp(full_text[:1000])
            ents = [e.text for e in doc_start.ents if e.label_ in ["GPE", "ORG", "PERSON", "EVENT"]]
            main_topic = ents[0].title() if ents else "General Analysis"
        
        # 2. Extract and Rank Concepts
        top_concepts = ConceptRanker.rank_concepts(full_text, limit=40)
        
        # 3. Cluster into Subtopics
        subtopics = SemanticClusterer.cluster(top_concepts, main_topic)
        
        return {
            "main_topic": main_topic,
            "subtopics": subtopics
        }

def process_to_hierarchy(full_text):
    """Main entry point for senior-level extraction."""
    return HierarchyBuilder.build(full_text)
