"""Multilingual keyword databases for complaint classification.

Supported languages: English (en), Hindi (hi), Hinglish (hinglish), Tamil (ta),
Bengali (bn), Marathi (mr).

Each category has keyword lists per language. The keyword provider matches
these against complaint text (case-insensitive for Latin script, literal
match for other scripts) to determine category, severity, and sensitive
location indicators.
"""

from __future__ import annotations

# ---------------------------------------------------------------------------
# Category → language → keyword list
# ---------------------------------------------------------------------------

CATEGORY_KEYWORDS: dict[str, dict[str, list[str]]] = {
    "Roads & Potholes": {
        "en": [
            "pothole", "potholes", "road damage", "road repair",
            "broken road", "damaged road", "highway", "pavement",
            "asphalt", "footpath", "sidewalk", "bridge", "flyover",
            "divider", "speed breaker", "manhole cover", "cave in",
        ],
        "hi": [
            "सड़क", "गड्ढा", "गड्ढे", "टूटी सड़क", "खराब सड़क",
            "पुल", "फुटपाथ", "फ्लाईओवर", "स्पीड ब्रेकर",
            "मैनहोल", "दरार",
        ],
        "hinglish": [
            "sadak", "sarak", "gaddha", "gaddhe", "gaddhae", "tooti sadak",
            "tuti sadak", "kharaab sadak", "kharab sadak", "pothole", "potholes",
            "footpath", "pul", "bridge", "flyover", "divider", "speed breaker",
            "manhole", "rasta", "raasta", "toota rasta", "khadde", "khadda",
            "asphalt", "pavement",
        ],
        "ta": [
            "சாலை", "குழி", "குழிகள்", "பாலம்", "நடைபாதை",
            "உடைந்த சாலை", "மேம்பாலம்", "விரிசல்",
        ],
        "bn": [
            "রাস্তা", "গর্ত", "সড়ক", "সেতু", "ফুটপাত",
            "ভাঙা রাস্তা", "ফ্লাইওভার", "ফাটল", "ম্যানহোল",
        ],
        "mr": [
            "रस्ता", "खड्डा", "खड्डे", "पूल", "फूटपाथ",
            "खराब रस्ता", "उड्डाणपूल", "मॅनहोल", "भेग",
        ],
        "kn": [
            "ರಸ್ತೆ", "ರಸ್ತೆಯ ಸಮಸ್ಯೆ", "ಗುಂಡಿ", "ರಸ್ತೆ ಗುಂಡಿ", "ಗುಂಡಿಗಳು",
            "ಹಾಳಾದ ರಸ್ತೆ", "ಒಡೆದ ರಸ್ತೆ", "ರಸ್ತೆ ಹಾಳಾಗಿದೆ", "ಸೇತುವೆ",
            "ಡಿವೈಡರ್", "ವೇಗ ತಡೆಗೋಡೆ", "ಮ್ಯಾನ್ಹೋಲ್", "ದಾರಿ", "ರಸ್ತೆಯ",
            "ಗುಂಡಿ ಬಿದ್ದಿದೆ", "ರಸ್ತೆ ಗುಂಡಿಗಳು", "raste", "gundi",
            "gundigalu", "halada raste", "sethuve", "divider", "manhole",
            "raste gundi",
        ],
    },
    "Water Supply": {
        "en": [
            "water supply", "no water", "water shortage", "tap",
            "pipe", "pipeline", "leaking", "leak", "burst pipe",
            "tanker", "borewell", "drinking water", "water pressure",
            "dirty water", "contaminated water", "water connection",
            "dry tap", "water meter",
        ],
        "hi": [
            "पानी", "नल", "पाइप", "पाइपलाइन", "लीक", "रिसाव",
            "जलापूर्ति", "टंकी", "बोरवेल", "पेयजल",
            "गंदा पानी", "पानी की कमी", "पानी नहीं",
        ],
        "hinglish": [
            "paani", "pani", "pipeline", "nal", "pipe", "paani nahi",
            "pani nahi", "paani supply", "pani supply", "ganda paani",
            "ganda pani", "tanker", "borewell", "peeyajal", "peene ka paani",
            "peene ka pani", "paani ki kami", "pani ki kami", "leak", "leaking",
            "paani leak", "pani leak", "paani waste", "pani waste", "motor",
            "water meter", "water shortage", "drinking water", "paani connection",
        ],
        "ta": [
            "தண்ணீர்", "குழாய்", "கசிவு", "நீர் வழங்கல்",
            "ஆழ்குழாய்", "குடிநீர்", "நீர் பற்றாக்குறை",
        ],
        "bn": [
            "জল", "পানি", "কল", "পাইপ", "লিক",
            "জল সরবরাহ", "ট্যাঙ্কার", "বোরওয়েল",
            "পানীয় জল", "নোংরা জল", "জলের অভাব",
        ],
        "mr": [
            "पाणी", "नळ", "पाईप", "गळती", "पाणीपुरवठा",
            "टँकर", "बोअरवेल", "पिण्याचे पाणी",
            "पाण्याची टंचाई",
        ],
        "kn": [
            "ನೀರು", "ಕುಡಿಯುವ ನೀರು", "ನೀರಿನ ಸಮಸ್ಯೆ", "ನೀರಿನ ಪೈಪ್", "ಪೈಪ್ಲೈನ್",
            "ನೀರು ಸೋರಿಕೆ", "ಪೈಪ್ ಸೋರಿಕೆ", "ನೀರು ಬರ್ತಿಲ್ಲ", "ನೀರು ಬರೋದಿಲ್ಲ",
            "ಕಲುಷಿತ ನೀರು", "ಕೊಳಕು ನೀರು", "ನೀರು ವ್ಯರ್ಥ", "ಟ್ಯಾಂಕರ್", "ಬೋರ್ವೆಲ್",
            "ನೀರಿನ", "ಪೈಪ್", "ಸೋರಿಕೆ", "ಸೋರಿಕೆಯಾಗುತ್ತಿದೆ", "ಜಲ", "ಕುಡಿಯುವ",
            "neeru", "neerina", "neeru supply", "pipeline", "neeru leak",
            "water pipe", "tanker", "borewell", "kudiyuva neeru",
        ],
    },
    "Electricity": {
        "en": [
            "electricity", "power cut", "power outage", "blackout",
            "transformer", "voltage", "short circuit", "electrocution",
            "electric shock", "power line", "sparking", "exposed wire",
            "cable", "fuse", "load shedding", "electrical",
        ],
        "hi": [
            "बिजली", "बिजली कटौती", "ट्रांसफार्मर", "वोल्टेज",
            "शॉर्ट सर्किट", "करंट", "बिजली का खंभा", "बिजली गुल",
            "लोड शेडिंग", "बिजली का तार", "स्पार्किंग",
            "खुला तार", "फ्यूज", "बिजली का झटका",
        ],
        "hinglish": [
            "bijli", "light", "taar", "wire", "power cut", "khamba",
            "bijli ka khamba", "bijli gul", "bijli chali gayi", "short circuit",
            "current", "transformer", "load shedding", "sparking", "khula taar",
            "khula wire", "fuse", "voltage", "bijli ka jhatka", "andhera",
            "power line", "cable", "electrical", "blackout",
        ],
        "ta": [
            "மின்சாரம்", "மின்வெட்டு", "மின்மாற்றி",
            "மின்னழுத்தம்", "மின்கம்பம்", "மின்கசிவு",
            "குறுக்குவழி",
        ],
        "bn": [
            "বিদ্যুৎ", "পাওয়ার কাট", "ট্রান্সফরমার", "ভোল্টেজ",
            "শর্ট সার্কিট", "কারেন্ট", "বৈদ্যতিক খুঁটি",
            "লোড শেডিং", "খোলা তার", "বিদ্যুৎ স্পৃষ্ট",
        ],
        "mr": [
            "वीज", "वीज कपात", "ट्रान्सफॉर्मर", "व्होल्टेज",
            "शॉर्ट सर्किट", "करंट", "विजेचा खांब",
            "लोड शेडिंग", "उघडा तार", "विजेचा धक्का",
        ],
        "kn": [
            "ವಿದ್ಯುತ್", "ಕರೆಂಟ್", "ವಿದ್ಯುತ್ ಕಡಿತ", "ಕರೆಂಟ್ ಇಲ್ಲ", "ವಿದ್ಯುತ್ ಇಲ್ಲ",
            "ವಿದ್ಯುತ್ ಕಂಬ", "ತಂತಿ", "ವಿದ್ಯುತ್ ತಂತಿ", "ತೆರೆದ ತಂತಿ", "ಶಾರ್ಟ್ ಸರ್ಕ್ಯೂಟ್",
            "ಟ್ರಾನ್ಸ್ಫಾರ್ಮರ್", "ಕಿಡಿ", "ಕತ್ತಲೆ", "ವಿದ್ಯುತ್ ಸಮಸ್ಯೆ", "ವಿದ್ಯುತ್ ಶಾಕ್",
            "vidyut", "current", "current illa", "vidyut illa", "current cut",
            "transformer", "short circuit", "kamba", "wire", "current kamba",
        ],
    },
    "Sanitation & Waste": {
        "en": [
            "garbage", "trash", "waste", "rubbish", "litter",
            "dump", "dumping", "sanitation", "dustbin", "stench",
            "smell", "stink", "unhygienic", "garbage collection",
            "solid waste", "debris", "sweeping",
        ],
        "hi": [
            "कूड़ा", "कचरा", "गंदगी", "सफाई", "कूड़ेदान",
            "डस्टबिन", "बदबू", "दुर्गंध", "अस्वच्छ",
            "कचरा संग्रह", "मलबा",
        ],
        "hinglish": [
            "kachra", "kooda", "kuda", "gandagi", "safai", "dustbin",
            "badboo", "durgandh", "kachre ka dher", "kude ka dher", "malba",
            "kuda uthana", "kachra gadi", "safai karamchari", "kachra nahi uthaya",
            "safai nahi hui", "stench", "smell", "kachra phekna", "garbage",
            "trash", "waste", "unhygienic", "litter",
        ],
        "ta": [
            "குப்பை", "கழிவு", "தூய்மை", "அசுத்தம்",
            "குப்பைத்தொட்டி", "துர்நாற்றம்", "நாற்றம்",
        ],
        "bn": [
            "আবর্জনা", "ময়লা", "কচরা", "পরিচ্ছন্নতা",
            "ডাস্টবিন", "দুর্গন্ধ", "অস্বাস্থ্যকর", "জঞ্জাল",
        ],
        "mr": [
            "कचरा", "घाण", "स्वच्छता", "डस्टबिन",
            "कचराकुंडी", "दुर्गंधी", "अस्वच्छ",
        ],
        "kn": [
            "ಕಸ", "ಕಸದ ಸಮಸ್ಯೆ", "ಕಸದ ರಾಶಿ", "ಕಸ ವಿಲೇವಾರಿ", "ಕಸದ ಬುಟ್ಟಿ",
            "ಸ್ವಚ್ಛತೆ", "ಕೊಳಕು", "ದುರ್ವಾಸನೆ", "ತ್ಯಾಜ್ಯ", "ಕಸ ತುಂಬಿದೆ",
            "ಕಸ ತೆಗೆದುಕೊಂಡು ಹೋಗುತ್ತಿಲ್ಲ", "ಕಸದ", "ಕಸ ಸುರಿಯುವುದು",
            "kasa", "kasada rashi", "kasada butti", "swacchate", "durvasane",
            "tyajya", "dustbin", "kasa dumping",
        ],
    },
    "Street Lighting": {
        "en": [
            "street light", "streetlight", "lamp post", "lamppost",
            "light pole", "dark street", "no light", "broken light",
            "faulty light", "light out", "dim light", "lighting",
            "sodium lamp", "led light",
        ],
        "hi": [
            "स्ट्रीट लाइट", "बत्ती", "लैंप", "अंधेरा",
            "खंभे की बत्ती", "टूटी लाइट", "लाइट बंद",
            "पथ प्रकाश", "रोशनी नहीं",
        ],
        "hinglish": [
            "street light", "streetlight", "sadak ki light", "light kharab",
            "batti", "khambhe ki light", "andhera", "light band", "tooti light",
            "tuti light", "light nahi jal rahi", "street light band hai", "bulb",
            "lamp post", "dark street", "no light", "broken light", "light pole",
        ],
        "ta": [
            "தெரு விளக்கு", "விளக்கு", "விளக்கு கம்பம்",
            "இருள்", "ஒளி இல்லை", "உடைந்த விளக்கு",
        ],
        "bn": [
            "রাস্তার আলো", "বাতি", "ল্যাম্প পোস্ট",
            "অন্ধকার", "আলো নেই", "ভাঙা আলো",
        ],
        "mr": [
            "पथदिवा", "दिवा", "दिव्याचा खांब", "अंधार",
            "लाईट नाही", "तुटलेला दिवा",
        ],
        "kn": [
            "ಬೀದಿ ದೀಪ", "ರಸ್ತೆ ದೀಪ", "ದೀಪ", "ಲೈಟ್", "ಬೀದಿ ಲೈಟ್",
            "ದೀಪ ಕೆಲಸ ಮಾಡುತ್ತಿಲ್ಲ", "ಲೈಟ್ ಕೆಲಸ ಮಾಡುತ್ತಿಲ್ಲ", "ದೀಪ ಕೆಟ್ಟಿದೆ",
            "ಕತ್ತಲೆ", "ಬೆಳಕು ಇಲ್ಲ", "ಬೀದಿದೀಪ", "ಕಂಬದ ದೀಪ", "ದೀಪಗಳು",
            "beedi deepa", "beedideepa", "deepa", "street light", "light illa",
            "deepa kettide", "kattale", "belaku illa",
        ],
    },
    "Drainage": {
        "en": [
            "drain", "drainage", "sewer", "sewage", "gutter",
            "clogged", "blocked drain", "overflow", "waterlogging",
            "water logging", "stagnant water", "standing water",
            "septic", "storm drain", "nala",
        ],
        "hi": [
            "नाला", "नाली", "गटर", "सीवर", "जलभराव",
            "बंद नाली", "सीवेज", "गंदा नाला", "जमा पानी",
            "सेप्टिक", "ड्रेनेज",
        ],
        "hinglish": [
            "naali", "nali", "nala", "naala", "gutter", "sewer", "sewage",
            "jalbharav", "waterlogging", "paani bharna", "pani bharna",
            "band naali", "band nali", "ganda nala", "ganda naala", "overflow",
            "naali overflow", "septic", "stagnant water", "choked drain",
            "drain", "drainage", "clogged", "blocked drain",
        ],
        "ta": [
            "வடிகால்", "சாக்கடை", "அடைப்பு", "கழிவுநீர்",
            "தேங்கிய நீர்", "நீர்த்தேக்கம்",
        ],
        "bn": [
            "নর্দমা", "ড্রেন", "নালা", "পয়ঃনিষ্কাশন",
            "জলাবদ্ধতা", "বন্ধ নর্দমা", "উপচে পড়া", "জমা জল",
        ],
        "mr": [
            "गटार", "नाला", "ड्रेनेज", "सांडपाणी",
            "पाणी साचणे", "बंद गटार", "साचलेले पाणी",
        ],
        "kn": [
            "ಚರಂಡಿ", "ಚರಂಡಿ ಸಮಸ್ಯೆ", "ಒಳಚರಂಡಿ", "ಚರಂಡಿ ಮುಚ್ಚಿದೆ", "ಚರಂಡಿ ತುಂಬಿದೆ",
            "ನೀರು ನಿಲ್ಲುವುದು", "ನೀರು ನಿಂತಿದೆ", "ಪ್ರವಾಹ", "ನೀರು ಹರಿಯುತ್ತಿಲ್ಲ", "ಗಟಾರ್",
            "ಒಳಚರಂಡಿ ಸೋರಿಕೆ", "ಚರಂಡಿಯ", "ಚರಂಡಿ ನೀರು", "ಚರಂಡಿ ಬ್ಲಾಕ್",
            "charandi", "olacharandi", "drain", "gutter", "drainage",
            "neeru nintide", "choked drain", "drain block",
        ],
    },
    "Public Safety": {
        "en": [
            "unsafe", "dangerous", "danger", "crime", "theft",
            "robbery", "assault", "attack", "accident", "emergency",
            "fire", "collapse", "hazard", "hazardous", "violence",
            "vandalism", "suspicious", "threat", "security",
        ],
        "hi": [
            "असुरक्षित", "खतरनाक", "खतरा", "चोरी", "लूट",
            "हमला", "दुर्घटना", "आपातकाल", "आग", "ढहना",
            "जोखिम", "हिंसा", "तोड़फोड़", "संदिग्ध", "धमकी",
        ],
        "hinglish": [
            "khatra", "khatarnaak", "chori", "loot", "hamla", "durghatna",
            "accident", "aag", "fire", "girna", "dhasna", "unsafe", "dangerous",
            "dhamki", "hungama", "violence", "emergency", "jaanleva", "hazard",
            "threat", "security", "robbery",
        ],
        "ta": [
            "ஆபத்து", "ஆபத்தான", "திருட்டு", "தாக்குதல்",
            "விபத்து", "அவசரம்", "தீ", "இடிவு", "வன்முறை",
        ],
        "bn": [
            "বিপজ্জনক", "বিপদ", "চুরি", "ডাকাতি", "হামলা",
            "দুর্ঘটনা", "জরুরি", "আগুন", "ধসে পড়া",
            "সহিংসতা",
        ],
        "mr": [
            "असुरक्षित", "धोकादायक", "धोका", "चोरी",
            "हल्ला", "अपघात", "आणीबाणी", "आग", "कोसळणे",
            "जोखीम", "हिंसा",
        ],
        "kn": [
            "ಅಪಾಯ", "ಅಪಾಯಕಾರಿ", "ಸುರಕ್ಷತೆ", "ಕಳ್ಳತನ", "ದರೋಡೆ",
            "ದಾಳಿ", "ಅಪಘಾತ", "ಬೆಂಕಿ", "ಕುಸಿತ", "ಬೆದರಿಕೆ",
            "ಜೀವಕ್ಕೆ ಅಪಾಯ", "ಅಪಾಯಕಾರಿ ಸ್ಥಳ", "ಹಿಂಸಾಚಾರ", "ತುರ್ತು", "ರಕ್ಷಣೆ",
            "apaya", "apayakarai", "kallathana", "darode", "apaghatha",
            "benki", "kusitha", "bedarike", "accident", "emergency", "danger",
        ],
    },
}

# ---------------------------------------------------------------------------
# Severity keywords — indicators of life-safety risk
# ---------------------------------------------------------------------------

SEVERITY_KEYWORDS: dict[str, list[str]] = {
    "en": [
        "accident", "injury", "injured", "death", "dead", "killed",
        "fire", "burning", "flames", "explosion", "collapse", "collapsed",
        "electrocution", "electric shock", "exposed wire", "flooding",
        "dangerous", "emergency", "urgent", "critical", "severe",
        "blocked road", "contamination", "toxic", "hazardous",
        "falling", "fallen", "sinkhole", "open manhole",
        "life threatening",
    ],
    "hi": [
        "दुर्घटना", "चोट", "घायल", "मौत", "मृत्यु",
        "आग", "जलना", "विस्फोट", "ढहना", "गिरना",
        "करंट", "बिजली का झटका", "खुला तार", "बाढ़",
        "खतरनाक", "आपातकाल", "तत्काल", "गंभीर", "जानलेवा",
        "सड़क बंद", "प्रदूषण", "जहरीला", "खुला मैनहोल",
    ],
    "hinglish": [
        "durghatna", "accident", "chot", "ghayal", "maut", "mrityu", "dead",
        "death", "aag", "fire", "current", "bijli ka jhatka", "khula taar",
        "khula wire", "baadh", "flooding", "khatarnaak", "emergency", "urgent",
        "critical", "severe", "khula manhole", "jaanleva", "life threatening",
        "collapse", "gir gaya", "hazard",
    ],
    "ta": [
        "விபத்து", "காயம்", "இறப்பு", "தீ", "வெடிப்பு",
        "இடிவு", "மின்அதிர்ச்சி", "வெள்ளம்",
        "ஆபத்தான", "அவசரம்", "கடுமையான", "உயிருக்கு ஆபத்து",
    ],
    "bn": [
        "দুর্ঘটনা", "আঘাত", "আহত", "মৃত্যু", "মৃত",
        "আগুন", "বিস্ফোরণ", "ধসে পড়া", "বিদ্যুৎ ஸ்பৃষ্ট",
        "বন্যা", "জলাবদ্ধতা",
        "বিপজ্জনক", "জরুরি", "গুরুতর", "প্রাণঘাতী",
    ],
    "mr": [
        "अपघात", "दुखापत", "जखमी", "मृत्यू", "मृत",
        "आग", "स्फोट", "कोसळणे", "विजेचा धक्का",
        "पूर", "पाणी साचणे",
        "धोकादायक", "आणीबाणी", "तातडी", "गंभीर", "जीवघेणा",
    ],
    "kn": [
        "ಅಪಘಾತ", "ಗಾಯ", "ಸಾವು", "ಮರಣ", "ಬೆಂಕಿ", "ಸ್ಫೋಟ", "ಕುಸಿತ",
        "ವಿದ್ಯುತ್ ಶಾಕ್", "ಪ್ರವಾಹ", "ತುರ್ತು", "ಜೀವಕ್ಕೆ ಅಪಾಯ",
        "ತಕ್ಷಣ", "ಬಹಳ ಅಪಾಯಕಾರಿ", "ದೊಡ್ಡ ಅಪಾಯ", "ತೀವ್ರ", "ಗಂಭೀರ",
        "ತೀವ್ರ ಸಮಸ್ಯೆ", "ತುಂಬಾ", "ದೊಡ್ಡ ಸಮಸ್ಯೆ", "ತಕ್ಷಣ ಸರಿಪಡಿಸಬೇಕು",
        "ಅಪಾಯಕಾರಿ", "ತೆರೆದ ಮ್ಯಾನ್ಹೋಲ್",
    ],
}

# ---------------------------------------------------------------------------
# Sensitive / vulnerable location keywords
# ---------------------------------------------------------------------------

SENSITIVE_LOCATION_KEYWORDS: dict[str, list[str]] = {
    "en": [
        "school", "hospital", "clinic", "temple", "mosque", "church",
        "gurudwara", "playground", "park", "market", "bus stop",
        "railway", "station", "children", "elderly", "orphanage",
        "nursing home", "college", "university",
    ],
    "hi": [
        "स्कूल", "अस्पताल", "मंदिर", "मस्जिद", "गिरजाघर",
        "गुरुद्वारा", "पार्क", "बाज़ार", "बस स्टॉप",
        "रेलवे", "स्टेशन", "बच्चे", "बुजुर्ग",
    ],
    "hinglish": [
        "school", "hospital", "aspatal", "mandir", "masjid", "gurudwara",
        "church", "park", "bazaar", "bazar", "market", "bus stop", "busstop",
        "station", "railway", "bacche", "bache", "bujurg", "elderly", "college",
        "university",
    ],
    "ta": [
        "பள்ளி", "மருத்துவமனை", "கோவில்", "மசூதி",
        "பூங்கா", "சந்தை", "பேருந்து நிலையம்",
        "குழந்தைகள்", "முதியோர்", "கல்லூரி",
    ],
    "bn": [
        "স্কুল", "হাসপাতাল", "মন্দির", "মসজিদ",
        "পার্ক", "বাজার", "বাস স্টপ",
        "শিশু", "বৃদ্ধ", "কলেজ",
    ],
    "mr": [
        "शाळा", "रुग्णालय", "मंदिर", "मशीद",
        "बाग", "बाजार", "बस स्टॉप",
        "मुले", "वृद्ध", "महाविद्यालय",
    ],
    "kn": [
        "ಶಾಲೆ", "ಆಸ್ಪತ್ರೆ", "ಕ್ಲಿನಿಕ್", "ದೇವಾಲಯ", "ಗುಡಿ", "ಮಸೀದಿ",
        "ಚರ್ಚ್", "ಉದ್ಯಾನವನ", "ಪಾರ್ಕ್", "ಮಾರುಕಟ್ಟೆ", "ಬಸ್ ನಿಲ್ದಾಣ",
        "ರೈಲ್ವೆ", "ನಿಲ್ದಾಣ", "ಮಕ್ಕಳು", "ವೃದ್ಧರು", "ಕಾಲೇಜು",
    ],
}
