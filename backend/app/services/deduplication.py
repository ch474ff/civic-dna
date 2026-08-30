from __future__ import annotations

import math
import re
from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import UTC, datetime
from difflib import SequenceMatcher
from typing import Any, Mapping, Sequence

from app.config import Settings, get_settings

# Common English stopwords for lightweight token filtering (excluding negation markers used in phrases)
STOPWORDS: frozenset[str] = frozenset(
    {
        "a",
        "about",
        "above",
        "after",
        "again",
        "against",
        "all",
        "am",
        "an",
        "and",
        "any",
        "are",
        "as",
        "at",
        "be",
        "because",
        "been",
        "before",
        "being",
        "below",
        "between",
        "both",
        "but",
        "by",
        "could",
        "did",
        "do",
        "does",
        "doing",
        "down",
        "during",
        "each",
        "few",
        "for",
        "from",
        "further",
        "had",
        "has",
        "have",
        "having",
        "he",
        "her",
        "here",
        "hers",
        "herself",
        "him",
        "himself",
        "his",
        "how",
        "i",
        "if",
        "in",
        "into",
        "is",
        "it",
        "its",
        "itself",
        "just",
        "me",
        "more",
        "most",
        "my",
        "myself",
        "nor",
        "now",
        "of",
        "off",
        "on",
        "once",
        "only",
        "or",
        "other",
        "our",
        "ours",
        "ourselves",
        "out",
        "over",
        "own",
        "same",
        "she",
        "should",
        "so",
        "some",
        "such",
        "than",
        "that",
        "the",
        "their",
        "theirs",
        "them",
        "themselves",
        "then",
        "there",
        "these",
        "they",
        "this",
        "those",
        "through",
        "to",
        "too",
        "under",
        "until",
        "up",
        "very",
        "was",
        "we",
        "were",
        "what",
        "when",
        "where",
        "which",
        "while",
        "who",
        "whom",
        "why",
        "with",
        "you",
        "your",
        "yours",
        "yourself",
        "yourselves",
        # Hinglish grammatical and functional words
        "hai",
        "hain",
        "tha",
        "thi",
        "the",
        "mein",
        "me",
        "ke",
        "ka",
        "ki",
        "ko",
        "se",
        "par",
        "pe",
        "aur",
        "ya",
        "ho",
        "raha",
        "rahi",
        "rahe",
        "yeh",
        "woh",
        "ye",
        "wo",
        "karo",
        "kariye",
        "kijiye",
        "bhejiye",
        "kripya",
        "please",
        "jaldi",
        "hamare",
        "hamara",
        "humare",
        "humari",
        "apne",
        "apna",
        "iss",
        "uss",
        "bohot",
        "bahot",
        "kuch",
        "sab",
        "toh",
        "bhi",
        "hi",
        "kar",
        "gaya",
        "gayi",
        "gaye",
    }
)

KANNADA_STOPWORDS: frozenset[str] = frozenset(
    {
        "ಮತ್ತು",
        "ಇದೆ",
        "ಇಲ್ಲ",
        "ಆಗಿದೆ",
        "ಆಗುತ್ತಿದೆ",
        "ಇಲ್ಲಿ",
        "ಅಲ್ಲಿ",
        "ನಮ್ಮ",
        "ಈ",
        "ಆ",
        "ಬಗ್ಗೆ",
        "ಮೇಲೆ",
        "ಕೆಳಗೆ",
        "ಒಳಗೆ",
        "ಹೊರಗೆ",
        "ಮಾಡಬೇಕು",
        "ಮಾಡಲಾಗಿದೆ",
        "ಬಹಳ",
        "ತುಂಬಾ",
        "ಸಾಕಷ್ಟು",
        "ಕಡೆಗೆ",
        "ಕಡೆಗೂ",
        "ಮಾಡಿ",
        "ಆಗಿ",
        "ಇರುವ",
        "ಇರುವಾಗ",
        "ಎಂದು",
        "ಯಾವುದೇ",
    }
)

STOPWORDS: frozenset[str] = (
    STOPWORDS | KANNADA_STOPWORDS
)

CIVIC_SYNONYMS: dict[str, str] = {
    # Magnitude / Severity
    "huge": "_mag_high_",
    "large": "_mag_high_",
    "big": "_mag_high_",
    "giant": "_mag_high_",
    "massive": "_mag_high_",
    "deep": "_mag_high_",
    "major": "_mag_high_",
    "severe": "_mag_high_",
    "enormous": "_mag_high_",
    "great": "_mag_high_",
    "heavy": "_mag_high_",
    "wide": "_mag_high_",
    "bahut": "_mag_high_",
    "bada": "_mag_high_",
    "badi": "_mag_high_",
    "bade": "_mag_high_",
    "zyada": "_mag_high_",
    "jyada": "_mag_high_",
    "kaafi": "_mag_high_",
    "small": "_mag_low_",
    "minor": "_mag_low_",
    "little": "_mag_low_",
    "slight": "_mag_low_",
    "tiny": "_mag_low_",
    "chota": "_mag_low_",
    "choti": "_mag_low_",
    "chote": "_mag_low_",
    "kam": "_mag_low_",
    # Road / Infrastructure
    "pothole": "_pothole_",
    "potholes": "_pothole_",
    "gaddha": "_pothole_",
    "gaddhe": "_pothole_",
    "gaddhae": "_pothole_",
    "khadda": "_pothole_",
    "khadde": "_pothole_",
    "crater": "_pothole_",
    "craters": "_pothole_",
    "pit": "_pothole_",
    "pits": "_pothole_",
    "cavity": "_pothole_",
    "cavities": "_pothole_",
    "sinkhole": "_pothole_",
    "trench": "_pothole_",
    "rut": "_pothole_",
    "ruts": "_pothole_",
    "road": "_road_",
    "street": "_road_",
    "sadak": "_road_",
    "sarak": "_road_",
    "rasta": "_road_",
    "raasta": "_road_",
    "avenue": "_road_",
    "lane": "_road_",
    "rd": "_road_",
    "st": "_road_",
    "highway": "_road_",
    "path": "_road_",
    "roadway": "_road_",
    "boulevard": "_road_",
    "cross": "_road_",
    "pul": "_road_",
    "flyover": "_road_",
    "divider": "_road_",
    "junction": "_transit_",
    "intersection": "_transit_",
    "corner": "_transit_",
    "crossing": "_transit_",
    "bus": "_transit_",
    "stop": "_transit_",
    "busstop": "_transit_",
    "station": "_transit_",
    "stand": "_transit_",
    "chowk": "_transit_",
    "chauraha": "_transit_",
    "pavement": "_pavement_",
    "footpath": "_pavement_",
    "sidewalk": "_pavement_",
    "asphalt": "_pavement_",
    "tar": "_pavement_",
    "concrete": "_pavement_",
    # Damage / Fault
    "damaged": "_damage_",
    "damage": "_damage_",
    "damaging": "_damage_",
    "broken": "_damage_",
    "cracked": "_damage_",
    "cracks": "_damage_",
    "collapse": "_damage_",
    "collapsed": "_damage_",
    "toota": "_damage_",
    "tooti": "_damage_",
    "tuti": "_damage_",
    "toote": "_damage_",
    "kharaab": "_damage_",
    "kharab": "_damage_",
    "bekaar": "_damage_",
    "bekar": "_damage_",
    "uneven": "_damage_",
    "rough": "_damage_",
    "bumpy": "_damage_",
    "faulty": "_damage_",
    "defective": "_damage_",
    "malfunctioning": "_damage_",
    "ruined": "_damage_",
    # Water & Supply & Pipeline
    "water": "_water_",
    "paani": "_water_",
    "pani": "_water_",
    "nal": "_water_",
    "nalka": "_water_",
    "jal": "_water_",
    "peeyajal": "_water_",
    "peene": "_water_",
    "drinking": "_water_",
    "potable": "_water_",
    "tap": "_water_",
    "taps": "_water_",
    "tanker": "_water_",
    "borewell": "_water_",
    "jalapurti": "_water_",
    "pipe": "_pipe_",
    "pipes": "_pipe_",
    "pipeline": "_pipe_",
    "pipelines": "_pipe_",
    "main": "_pipe_",
    "mains": "_pipe_",
    "line": "_pipe_",
    "lines": "_pipe_",
    "supply": "_supply_",
    "service": "_supply_",
    "delivery": "_supply_",
    "provision": "_supply_",
    "coming": "_supply_",
    "running": "_supply_",
    "flowing": "_supply_",
    "flow": "_supply_",
    "stopped": "_outage_",
    "shut": "_outage_",
    "cut": "_outage_",
    "outage": "_outage_",
    "interrupted": "_outage_",
    "disrupted": "_outage_",
    "failed": "_outage_",
    "failure": "_outage_",
    "blackout": "_outage_",
    "dry": "_outage_",
    "stoppage": "_outage_",
    "shortage": "_outage_",
    "breakdown": "_outage_",
    "inactive": "_outage_",
    "no_water": "_outage_",
    "paani_nahi": "_outage_",
    "pani_nahi": "_outage_",
    "bijli_nahi": "_outage_",
    "light_nahi": "_outage_",
    "band": "_outage_",
    "chali_gayi": "_outage_",
    "chala_gaya": "_outage_",
    "kami": "_outage_",
    "leak": "_leak_",
    "leaks": "_leak_",
    "leaking": "_leak_",
    "leakage": "_leak_",
    "risav": "_leak_",
    "behta": "_leak_",
    "beh": "_leak_",
    "bah": "_leak_",
    "waste": "_leak_",
    "barbaad": "_leak_",
    "barbad": "_leak_",
    "burst": "_leak_",
    "bursts": "_leak_",
    "bursting": "_leak_",
    "overflow": "_leak_",
    "overflowing": "_leak_",
    "spilling": "_leak_",
    "rupture": "_leak_",
    "ruptured": "_leak_",
    "gushing": "_leak_",
    "seeping": "_leak_",
    "seepage": "_leak_",
    "flood": "_flood_",
    "flooded": "_flood_",
    "flooding": "_flood_",
    "waterlog": "_flood_",
    "waterlogging": "_flood_",
    "waterlogged": "_flood_",
    "jalbharav": "_flood_",
    "jalbhorav": "_flood_",
    "bhara": "_flood_",
    "bhar": "_flood_",
    "dooba": "_flood_",
    "baadh": "_flood_",
    "submerged": "_flood_",
    "inundated": "_flood_",
    "drain": "_drain_",
    "drains": "_drain_",
    "drainage": "_drain_",
    "naali": "_drain_",
    "nali": "_drain_",
    "nala": "_drain_",
    "naala": "_drain_",
    "sewer": "_drain_",
    "sewers": "_drain_",
    "sewage": "_drain_",
    "gutter": "_drain_",
    "gutters": "_drain_",
    "manhole": "_drain_",
    "manholes": "_drain_",
    "culvert": "_drain_",
    # Electricity & Streetlights
    "electricity": "_electric_",
    "bijli": "_electric_",
    "electric": "_electric_",
    "electrical": "_electric_",
    "power": "_electric_",
    "current": "_electric_",
    "voltage": "_electric_",
    "streetlight": "_light_",
    "streetlights": "_light_",
    "light": "_light_",
    "lights": "_light_",
    "lighting": "_light_",
    "batti": "_light_",
    "lamp": "_light_",
    "lamps": "_light_",
    "lamppost": "_light_",
    "lampposts": "_light_",
    "lantern": "_light_",
    "lanterns": "_light_",
    "bulb": "_light_",
    "bulbs": "_light_",
    "dark": "_dark_",
    "andhera": "_dark_",
    "darkness": "_dark_",
    "unlit": "_dark_",
    "dim": "_dark_",
    "wire": "_wire_",
    "wires": "_wire_",
    "taar": "_wire_",
    "cable": "_wire_",
    "cables": "_wire_",
    "cord": "_wire_",
    "cords": "_wire_",
    "transformer": "_wire_",
    "transformers": "_wire_",
    "pole": "_wire_",
    "poles": "_wire_",
    "khamba": "_wire_",
    "khambha": "_wire_",
    "spark": "_spark_",
    "sparks": "_spark_",
    "sparking": "_spark_",
    "shock": "_spark_",
    "jhatka": "_spark_",
    "hanging": "_wire_hazard_",
    "dangling": "_wire_hazard_",
    "snapped": "_wire_hazard_",
    "exposed": "_wire_hazard_",
    # Garbage & Sanitation
    "garbage": "_garbage_",
    "kachra": "_garbage_",
    "kooda": "_garbage_",
    "kuda": "_garbage_",
    "gandagi": "_garbage_",
    "safai": "_garbage_",
    "dher": "_garbage_",
    "malba": "_garbage_",
    "trash": "_garbage_",
    "waste": "_garbage_",
    "rubbish": "_garbage_",
    "litter": "_garbage_",
    "debris": "_garbage_",
    "junk": "_garbage_",
    "dump": "_garbage_",
    "dumped": "_garbage_",
    "dumping": "_garbage_",
    "filth": "_garbage_",
    "bin": "_bin_",
    "bins": "_bin_",
    "dustbin": "_bin_",
    "dumpster": "_bin_",
    "dumpsters": "_bin_",
    "smell": "_odor_",
    "smelling": "_odor_",
    "stink": "_odor_",
    "stinking": "_odor_",
    "stench": "_odor_",
    "badboo": "_odor_",
    "durgandh": "_odor_",
    "badbu": "_odor_",
    "odor": "_odor_",
    "odour": "_odor_",
    "foul": "_odor_",
    "unhygienic": "_odor_",
    # Area / Neighborhood / Locations
    "neighborhood": "_area_",
    "neighbourhood": "_area_",
    "area": "_area_",
    "locality": "_area_",
    "colony": "_area_",
    "sector": "_area_",
    "block": "_area_",
    "vicinity": "_area_",
    "zone": "_area_",
    "community": "_area_",
    "society": "_area_",
    "market": "_market_",
    "bazaar": "_market_",
    "bazar": "_market_",
    "dukaan": "_market_",
    "dukan": "_market_",
    "hospital": "_health_",
    "aspatal": "_health_",
    "school": "_edu_",
    "mandir": "_worship_",
    "temple": "_worship_",
    "masjid": "_worship_",
    # Danger / Hazard / Issue
    "danger": "_hazard_",
    "khatra": "_hazard_",
    "khatarnaak": "_hazard_",
    "dangerous": "_hazard_",
    "hazard": "_hazard_",
    "hazardous": "_hazard_",
    "unsafe": "_hazard_",
    "risk": "_hazard_",
    "peril": "_hazard_",
    "accident": "_hazard_",
    "durghatna": "_hazard_",
    "accidents": "_hazard_",
    "injury": "_hazard_",
    "injuries": "_hazard_",
    "problem": "_issue_",
    "problems": "_issue_",
    "issue": "_issue_",
    "issues": "_issue_",
    "samasya": "_issue_",
    "dikkat": "_issue_",
    "pareshaani": "_issue_",
    "pareshani": "_issue_",
    "trouble": "_issue_",
    "slowdown": "_issue_",
    "slowdowns": "_issue_",
    "beside": "_near_",
    "near": "_near_",
    "paas": "_near_",
    "samne": "_near_",
    "saamne": "_near_",
    "bagal": "_near_",
    "shortage": "_shortage_",
    "scarcity": "_shortage_",
    "normal_supply": "_normal_state_",
    "normal": "_normal_state_",
    # Kannada Concept Mappings
    "ನೀರು": "_water_",
    "ನೀರಿನ": "_water_",
    "ಜಲ": "_water_",
    "ಕುಡಿಯುವ": "_water_",
    "neeru": "_water_",
    "neerina": "_water_",
    "ಪೈಪ್": "_pipe_",
    "ಪೈಪ್ಲೈನ್": "_pipe_",
    "ಪೈಪ್ಗಳು": "_pipe_",
    "ಕೊಳವೆ": "_pipe_",
    "ಸೋರಿಕೆ": "_leak_",
    "ಸೋರಿಕೆಯಾಗುತ್ತಿದೆ": "_leak_",
    "ಸೋರುತ್ತಿದೆ": "_leak_",
    "ಸೋರಿಕೆಗಳು": "_leak_",
    "ಹರಿಯುತ್ತಿದೆ": "_leak_",
    "ರಸ್ತೆ": "_road_",
    "ರಸ್ತೆಯ": "_road_",
    "ದಾರಿ": "_road_",
    "ರಸ್ತೆಗಳು": "_road_",
    "raste": "_road_",
    "ಗುಂಡಿ": "_pothole_",
    "ಗುಂಡಿಗಳು": "_pothole_",
    "ಗುಂಡಿಬಿದ್ದ": "_pothole_",
    "gundi": "_pothole_",
    "gundigalu": "_pothole_",
    "ಹಾಳಾದ": "_damage_",
    "ಒಡೆದ": "_damage_",
    "ಹಾಳಾಗಿದೆ": "_damage_",
    "ದುರಸ್ತಿ": "_repair_",
    "ವಿದ್ಯುತ್": "_electric_",
    "ಕರೆಂಟ್": "_electric_",
    "ತಂತಿ": "_electric_",
    "ಕಂಬ": "_pole_",
    "ದೀಪ": "_light_",
    "ದೀಪಗಳು": "_light_",
    "ಲೈಟ್": "_light_",
    "ಬೀದಿದೀಪ": "_light_",
    "ಬೀದಿ": "_road_",
    "ಕಸ": "_garbage_",
    "ತ್ಯಾಜ್ಯ": "_garbage_",
    "ಕೊಳಕು": "_garbage_",
    "ಕಸದ": "_garbage_",
    "kasa": "_garbage_",
    "ಕಸಬುಟ್ಟಿ": "_bin_",
    "ಬುಟ್ಟಿ": "_bin_",
    "ಚರಂಡಿ": "_drain_",
    "ಚರಂಡಿಯ": "_drain_",
    "ಗಟಾರ್": "_drain_",
    "charandi": "_drain_",
    "ಒಳಚರಂಡಿ": "_sewer_",
    "ಅಪಾಯ": "_hazard_",
    "ಅಪಾಯಕಾರಿ": "_hazard_",
    "apaya": "_hazard_",
    "ಅಪಘಾತ": "_hazard_",
    "ಸಾವು": "_hazard_",
    "ಬೆಂಕಿ": "_hazard_",
    "ಮಾರುಕಟ್ಟೆ": "_market_",
    "ಅಂಗಡಿ": "_market_",
    "ಅಂಗಡಿಗಳ": "_market_",
    "ಹತ್ತಿರ": "_near_",
    "ಬಳಿ": "_near_",
    "hattira": "_near_",
    "ಶಾಲೆ": "_edu_",
    "ಆಸ್ಪತ್ರೆ": "_health_",
    "ದೇವಾಲಯ": "_worship_",
    "ದೊಡ್ಡ": "_mag_high_",
    "ತೀವ್ರ": "_mag_high_",
    "ಗಂಭೀರ": "_mag_high_",
    "ಬಹಳ": "_mag_high_",
    "ತುಂಬಾ": "_mag_high_",
    "ಸಣ್ಣ": "_mag_low_",
    "ಸ್ವಲ್ಪ": "_mag_low_",
    "ಸಮಸ್ಯೆ": "_issue_",
    "ತೊಂದರೆ": "_issue_",
    "samasye": "_issue_",
}


@dataclass(frozen=True)
class SimilarityBreakdown:
    total_score: float
    text_score: float
    geo_score: float
    category_score: float
    dept_score: float
    temporal_score: float
    distance_meters: float | None
    time_delta_seconds: float | None


class TextSimilarityEngine:
    """Lightweight, deterministic text and semantic similarity engine.

    Uses civic concept canonicalization, token overlap (Jaccard/Dice), light stemming,
    character n-gram matching, and sequence similarity.
    """

    @staticmethod
    def stem(word: str) -> str:
        """Lightweight heuristic stemmer for common English civic domain suffixes."""
        w = word.lower()
        if len(w) <= 3:
            return w
        for suffix in ("ing", "tion", "ment", "ness", "able", "ible", "ed", "es", "ly", "s"):
            if w.endswith(suffix) and len(w) - len(suffix) >= 3:
                return w[: -len(suffix)]
        return w

    @classmethod
    def canonicalize_token(cls, raw: str) -> str:
        """Map raw or stemmed word to canonical civic concept token."""
        w = raw.lower().strip()
        st = cls.stem(w)
        return CIVIC_SYNONYMS.get(w, CIVIC_SYNONYMS.get(st, st))

    @classmethod
    def tokenize(cls, text: str) -> list[str]:
        if not text:
            return []
        cleaned = text.lower()
        # Negation rules (English, Hindi, Kannada)
        cleaned = re.sub(r"\bno\s+water\s+shortage\b", "normal_supply", cleaned)
        cleaned = re.sub(r"\bno\s+shortage\b", "normal_supply", cleaned)
        cleaned = re.sub(r"\bno\s+problem\b", "normal_supply", cleaned)
        cleaned = re.sub(r"\bno\s+issue\b", "normal_supply", cleaned)
        cleaned = re.sub(r"ನೀರಿನ\s+ಸಮಸ್ಯೆ\s+ಇಲ್ಲ", "normal_supply", cleaned)
        cleaned = re.sub(r"ನೀರು\s+ಸೋರಿಕೆ\s+ಇಲ್ಲ", "normal_supply", cleaned)
        cleaned = re.sub(r"ಯಾವುದೇ\s+ಸಮಸ್ಯೆ\s+ಇಲ್ಲ", "normal_supply", cleaned)
        cleaned = re.sub(r"ಸಮಸ್ಯೆ\s+ಇಲ್ಲ", "normal_supply", cleaned)
        cleaned = re.sub(r"ಸೋರಿಕೆ\s+ಇಲ್ಲ", "normal_supply", cleaned)
        cleaned = re.sub(r"\bno\s+water\b", "no_water", cleaned)
        cleaned = re.sub(r"\bpaani\s+nahi\b", "no_water", cleaned)
        cleaned = re.sub(r"\bpani\s+nahi\b", "no_water", cleaned)
        cleaned = re.sub(r"ನೀರು\s+ಇಲ್ಲ", "no_water", cleaned)
        cleaned = re.sub(r"ನೀರು\s+ಬರ್ತಿಲ್ಲ", "no_water", cleaned)
        cleaned = re.sub(r"ನೀರು\s+ಬರೋದಿಲ್ಲ", "no_water", cleaned)
        cleaned = re.sub(r"\bbijli\s+gul\b", "outage", cleaned)
        cleaned = re.sub(r"\bbijli\s+nahi\b", "outage", cleaned)
        cleaned = re.sub(r"\bpower\s+cut\b", "outage", cleaned)
        cleaned = re.sub(r"ವಿದ್ಯುತ್\s+ಇಲ್ಲ", "outage", cleaned)
        cleaned = re.sub(r"ಕರೆಂಟ್\s+ಇಲ್ಲ", "outage", cleaned)
        cleaned = re.sub(r"\bnot\s+working\b", "broken", cleaned)
        cleaned = re.sub(r"\bkaam\s+nahi\s+kar\s+raha\b", "broken", cleaned)
        cleaned = re.sub(r"\bout\s+of\s+order\b", "broken", cleaned)
        cleaned = re.sub(r"ಕೆಲಸ\s+ಮಾಡುತ್ತಿಲ್ಲ", "broken", cleaned)
        cleaned = re.sub(r"ಕೆಟ್ಟಿದೆ", "broken", cleaned)
        cleaned = re.sub(r"[^\w\s\u0900-\u0d7f]", " ", cleaned)

        tokens: list[str] = []
        for raw in cleaned.split():
            if not raw or len(raw) <= 1:
                continue
            st = cls.stem(raw)
            canon = cls.canonicalize_token(raw)
            if canon.startswith("_") or (raw not in STOPWORDS and st not in STOPWORDS):
                tokens.append(canon)
        return tokens

    @staticmethod
    def char_ngrams(text: str, n: int = 3) -> set[str]:
        if not text:
            return set()
        cleaned = re.sub(r"\s+", " ", text.lower().strip())
        if len(cleaned) < n:
            return {cleaned} if cleaned else set()
        return {cleaned[i : i + n] for i in range(len(cleaned) - n + 1)}

    @classmethod
    def token_dice(cls, tokens1: Sequence[str], tokens2: Sequence[str]) -> float:
        if not tokens1 and not tokens2:
            return 0.0
        set1, set2 = set(tokens1), set(tokens2)
        if not set1 or not set2:
            return 0.0
        intersection = len(set1 & set2)
        return (2.0 * intersection) / (len(set1) + len(set2))

    @classmethod
    def ngram_dice(cls, text1: str, text2: str, n: int = 3) -> float:
        t1, t2 = text1.strip().lower(), text2.strip().lower()
        if not t1 or not t2:
            return 0.0
        grams1 = cls.char_ngrams(t1, n)
        grams2 = cls.char_ngrams(t2, n)
        if not grams1 or not grams2:
            return 0.0
        intersection = len(grams1 & grams2)
        return (2.0 * intersection) / (len(grams1) + len(grams2))

    @classmethod
    def string_similarity(cls, text1: str, text2: str) -> float:
        t1, t2 = (text1 or "").strip().lower(), (text2 or "").strip().lower()
        if not t1 and not t2:
            return 1.0
        if not t1 or not t2:
            return 0.0
        if t1 == t2:
            return 1.0

        tokens1, tokens2 = cls.tokenize(t1), cls.tokenize(t2)
        if not tokens1 and not tokens2:
            return 1.0 if t1 == t2 else 0.0

        # Contradiction penalty: negation / normal supply vs active issue
        has_normal_1 = "_normal_state_" in tokens1
        has_normal_2 = "_normal_state_" in tokens2
        if has_normal_1 != has_normal_2:
            return 0.0

        tok_sim = cls.token_dice(tokens1, tokens2)
        ngram_sim = cls.ngram_dice(t1, t2, n=3)
        seq_sim = SequenceMatcher(None, t1, t2).ratio()

        # Weighted combination favoring semantic concept token overlap across scripts
        blended = 0.60 * tok_sim + 0.25 * ngram_sim + 0.15 * seq_sim
        return max(tok_sim, blended) if tok_sim >= 0.5 else blended

    @classmethod
    def compute_text_similarity(
        cls,
        c1: Mapping[str, Any],
        c2: Mapping[str, Any],
    ) -> float:
        title1, title2 = (c1.get("title") or "").strip(), (c2.get("title") or "").strip()
        desc1, desc2 = (c1.get("description") or "").strip(), (c2.get("description") or "").strip()

        if not title1 and not desc1 and not title2 and not desc2:
            return 1.0

        title_sim = cls.string_similarity(title1, title2)
        desc_sim = cls.string_similarity(desc1, desc2)

        # Full text combined
        full1 = f"{title1} {desc1}".strip()
        full2 = f"{title2} {desc2}".strip()

        tokens_full1 = cls.tokenize(full1)
        tokens_full2 = cls.tokenize(full2)
        has_norm_1 = "_normal_state_" in tokens_full1
        has_norm_2 = "_normal_state_" in tokens_full2
        if has_norm_1 != has_norm_2:
            return 0.0

        full_sim = cls.string_similarity(full1, full2)

        # Cross-comparison (title against description)
        cross_sim_1 = cls.string_similarity(title1, desc2) if title1 and desc2 else 0.0
        cross_sim_2 = cls.string_similarity(title2, desc1) if title2 and desc1 else 0.0
        cross_sim = 0.5 * (cross_sim_1 + cross_sim_2)

        combined = max(
            0.50 * title_sim + 0.50 * desc_sim,
            full_sim,
            0.40 * title_sim + 0.30 * desc_sim + 0.30 * cross_sim,
        )

        # Keyword similarity if extracted_severity_keywords are present
        kw1 = set(str(k).lower().strip() for k in (c1.get("extracted_severity_keywords") or []))
        kw2 = set(str(k).lower().strip() for k in (c2.get("extracted_severity_keywords") or []))
        if kw1 and kw2:
            kw_sim = (2.0 * len(kw1 & kw2)) / (len(kw1) + len(kw2))
            combined = 0.75 * combined + 0.25 * kw_sim

        return max(0.0, min(1.0, combined))


class DeduplicationService(ABC):
    """Abstract interface for duplicate complaint cluster matching."""

    @abstractmethod
    def find_duplicate_cluster(
        self,
        complaint: Mapping[str, Any],
        existing_complaints: Sequence[Mapping[str, Any]],
    ) -> str | None:
        """Return an existing cluster_id or None to create a new cluster."""
        raise NotImplementedError


class StubDeduplicationService(DeduplicationService):
    """Default stub returning None (creates a new cluster for every complaint)."""

    def find_duplicate_cluster(
        self,
        complaint: Mapping[str, Any],
        existing_complaints: Sequence[Mapping[str, Any]],
    ) -> str | None:
        del complaint, existing_complaints
        return None


class MultiSignalDeduplicationService(DeduplicationService):
    """Multi-signal deduplication combining text, geographic, category, department, and temporal signals."""

    def __init__(
        self,
        threshold: float | None = None,
        geo_radius_meters: float | None = None,
        temporal_window_hours: float | None = None,
        weight_text: float | None = None,
        weight_geo: float | None = None,
        weight_dept: float | None = None,
        weight_category: float | None = None,
        weight_temporal: float | None = None,
        text_engine: TextSimilarityEngine | None = None,
    ) -> None:
        settings: Settings = get_settings()
        self.threshold = threshold if threshold is not None else settings.dedup_threshold
        self.geo_radius_meters = (
            geo_radius_meters if geo_radius_meters is not None else settings.dedup_geo_radius_meters
        )
        self.temporal_window_hours = (
            temporal_window_hours if temporal_window_hours is not None else settings.dedup_temporal_window_hours
        )
        self.weight_text = weight_text if weight_text is not None else settings.dedup_weight_text
        self.weight_geo = weight_geo if weight_geo is not None else settings.dedup_weight_geo
        self.weight_dept = weight_dept if weight_dept is not None else settings.dedup_weight_dept
        self.weight_category = (
            weight_category if weight_category is not None else settings.dedup_weight_category
        )
        self.weight_temporal = (
            weight_temporal if weight_temporal is not None else settings.dedup_weight_temporal
        )
        self.text_engine = text_engine or TextSimilarityEngine()

    @staticmethod
    def haversine_distance(
        lat1: float | None,
        lng1: float | None,
        lat2: float | None,
        lng2: float | None,
    ) -> float | None:
        """Compute surface distance in meters using Haversine formula."""
        if lat1 is None or lng1 is None or lat2 is None or lng2 is None:
            return None
        try:
            lat1, lng1, lat2, lng2 = float(lat1), float(lng1), float(lat2), float(lng2)
        except (ValueError, TypeError):
            return None

        if not (-90 <= lat1 <= 90 and -180 <= lng1 <= 180 and -90 <= lat2 <= 90 and -180 <= lng2 <= 180):
            return None

        r = 6371000.0  # Earth radius in meters
        phi1 = math.radians(lat1)
        phi2 = math.radians(lat2)
        delta_phi = math.radians(lat2 - lat1)
        delta_lambda = math.radians(lng2 - lng1)

        a = (
            math.sin(delta_phi / 2.0) ** 2
            + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
        )
        c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
        return r * c

    def compute_geo_similarity(
        self,
        c1: Mapping[str, Any],
        c2: Mapping[str, Any],
    ) -> tuple[float, float | None]:
        """Return geographic similarity [0.0, 1.0] and raw distance in meters."""
        lat1, lng1 = c1.get("lat"), c1.get("lng")
        lat2, lng2 = c2.get("lat"), c2.get("lng")

        dist = self.haversine_distance(lat1, lng1, lat2, lng2)
        if dist is None:
            return 0.0, None

        if dist <= 0.0:
            return 1.0, 0.0
        if dist >= self.geo_radius_meters:
            return 0.0, dist

        score = 1.0 - (dist / self.geo_radius_meters)
        return max(0.0, min(1.0, score)), dist

    @staticmethod
    def compute_category_similarity(
        c1: Mapping[str, Any],
        c2: Mapping[str, Any],
    ) -> float:
        cat1 = (c1.get("category") or "").strip().lower()
        cat2 = (c2.get("category") or "").strip().lower()

        if not cat1 or not cat2 or cat1 == "unclassified" or cat2 == "unclassified":
            return 0.5
        if cat1 == cat2:
            return 1.0
        return 0.0

    @staticmethod
    def compute_department_similarity(
        c1: Mapping[str, Any],
        c2: Mapping[str, Any],
    ) -> float:
        dept1 = (c1.get("department") or "").strip().lower()
        dept2 = (c2.get("department") or "").strip().lower()

        if not dept1 or not dept2 or dept1 == "general" or dept2 == "general":
            return 0.5
        if dept1 == dept2:
            return 1.0
        return 0.0

    @staticmethod
    def _parse_datetime(val: Any) -> datetime | None:
        if isinstance(val, datetime):
            return val if val.tzinfo is not None else val.replace(tzinfo=UTC)
        if isinstance(val, str):
            try:
                dt = datetime.fromisoformat(val.replace("Z", "+00:00"))
                return dt if dt.tzinfo is not None else dt.replace(tzinfo=UTC)
            except (ValueError, TypeError):
                return None
        return None

    def compute_temporal_similarity(
        self,
        c1: Mapping[str, Any],
        c2: Mapping[str, Any],
    ) -> tuple[float, float | None]:
        """Compute temporal proximity between two complaints."""
        t1 = self._parse_datetime(c1.get("created_at") or c1.get("timestamp"))
        t2 = self._parse_datetime(c2.get("created_at") or c2.get("timestamp"))

        if t1 is None or t2 is None:
            return 0.8, None

        delta_seconds = abs((t1 - t2).total_seconds())
        window_seconds = max(1.0, self.temporal_window_hours * 3600.0)

        if delta_seconds >= window_seconds:
            return 0.0, delta_seconds

        score = 1.0 - (delta_seconds / window_seconds)
        return max(0.0, min(1.0, score)), delta_seconds

    def score_pair(
        self,
        complaint: Mapping[str, Any],
        candidate: Mapping[str, Any],
    ) -> SimilarityBreakdown:
        """Compute detailed multi-signal similarity between two complaints."""
        text_score = self.text_engine.compute_text_similarity(complaint, candidate)
        geo_score, distance_meters = self.compute_geo_similarity(complaint, candidate)
        cat_score = self.compute_category_similarity(complaint, candidate)
        dept_score = self.compute_department_similarity(complaint, candidate)
        temporal_score, delta_seconds = self.compute_temporal_similarity(complaint, candidate)

        # Hard Gating:
        # 1. If distance exceeds radius, do not group
        if distance_meters is not None and distance_meters > self.geo_radius_meters:
            return SimilarityBreakdown(
                total_score=0.0,
                text_score=text_score,
                geo_score=0.0,
                category_score=cat_score,
                dept_score=dept_score,
                temporal_score=temporal_score,
                distance_meters=distance_meters,
                time_delta_seconds=delta_seconds,
            )

        # 2. If text similarity is 0.0 (e.g. semantic contradiction or completely unrelated words), do not group
        if text_score <= 0.0:
            return SimilarityBreakdown(
                total_score=0.0,
                text_score=0.0,
                geo_score=geo_score,
                category_score=cat_score,
                dept_score=dept_score,
                temporal_score=temporal_score,
                distance_meters=distance_meters,
                time_delta_seconds=delta_seconds,
            )

        w_text = self.weight_text
        w_geo = self.weight_geo if distance_meters is not None else 0.0
        w_cat = self.weight_category
        w_dept = self.weight_dept
        w_time = self.weight_temporal if delta_seconds is not None else 0.0

        total_weight = w_text + w_geo + w_cat + w_dept + w_time
        if total_weight <= 0.0:
            weighted_score = text_score
        else:
            weighted_score = (
                w_text * text_score
                + w_geo * geo_score
                + w_cat * cat_score
                + w_dept * dept_score
                + w_time * temporal_score
            ) / total_weight

        total_score = max(0.0, min(1.0, weighted_score))

        return SimilarityBreakdown(
            total_score=total_score,
            text_score=text_score,
            geo_score=geo_score,
            category_score=cat_score,
            dept_score=dept_score,
            temporal_score=temporal_score,
            distance_meters=distance_meters,
            time_delta_seconds=delta_seconds,
        )

    def find_duplicate_cluster(
        self,
        complaint: Mapping[str, Any],
        existing_complaints: Sequence[Mapping[str, Any]],
    ) -> str | None:
        """Evaluate candidate complaints and return the best matching cluster_id if score >= threshold."""
        if not existing_complaints:
            return None

        current_id = complaint.get("complaint_id")
        best_cluster_id: str | None = None
        best_score: float = -1.0

        for candidate in existing_complaints:
            candidate_cluster_id = candidate.get("cluster_id")
            if not candidate_cluster_id:
                continue

            candidate_id = candidate.get("complaint_id")
            if current_id and candidate_id and current_id == candidate_id:
                continue

            breakdown = self.score_pair(complaint, candidate)
            if breakdown.total_score >= self.threshold and breakdown.total_score > best_score:
                best_score = breakdown.total_score
                best_cluster_id = str(candidate_cluster_id)

        return best_cluster_id
