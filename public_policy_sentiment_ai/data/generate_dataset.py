"""
Reproducible dataset generator creating 600 realistic bilingual (English & Hindi)
citizen feedback records across 6 public policy initiatives.
Run directly: python data/generate_dataset.py
"""

from datetime import date, timedelta
from pathlib import Path
import random
import pandas as pd

SEED = 42
OUTPUT_PATH = Path(__file__).resolve().parent / "public_policy_feedback.csv"

REGIONS = [
    "Maharashtra", "Uttar Pradesh", "Karnataka", "Delhi NCR",
    "Tamil Nadu", "Bihar", "Rajasthan", "West Bengal", "Gujarat", "Madhya Pradesh",
]
CHANNELS = ["MyGov Portal", "Mobile App", "District Grievance Desk", "Public Townhall", "SMS Survey"]

# Structured bilingual feedback templates grouped by (policy, sentiment, language)
FEEDBACK_TEMPLATES = {
    "National Digital Health Mission": {
        "Positive": {
            "English": [
                "Digital health ID made hospital registration fast and seamless across clinics without carrying paper files.",
                "Linking lab diagnostic reports to the health locker saved valuable consultation time and improved doctor accuracy.",
                "Telemedicine consultations under the digital health portal are reliable and very helpful for elderly patients.",
                "Transparent digital prescription records reduced duplicate medical tests and lowered out-of-pocket expenses.",
                "The citizen health portal onboarding process is modern, accessible, and works smoothly on mobile phones.",
            ],
            "Hindi": [
                "डिजिटल हेल्थ आईडी से सरकारी अस्पताल में पंजीकरण बहुत तेज और आसान हो गया है।",
                "ऑनलाइन स्वास्थ्य रिकॉर्ड की सुविधा मरीजों और डॉक्टरों दोनों के लिए अत्यंत लाभदायक और पारदर्शी है।",
                "टेलीमेडिसिन सेवा ग्रामीण क्षेत्रों में बुजुर्गों के लिए बहुत मददगार साबित हो रही है।",
                "डिजिटल रिपोर्ट मिलने से बार-बार जांच कराने का खर्च कम हुआ है और समय की बचत हुई है।",
            ],
        },
        "Negative": {
            "English": [
                "Health portal server crashes during morning OPD hours causing severe registration delays at district hospitals.",
                "Biometric OTP verification repeatedly failed for senior citizens leaving them unable to access medical records.",
                "Private clinics refuse to accept the digital health ID due to poor software integration and training gaps.",
                "Data privacy consent screens are confusing and patients feel pressured without proper offline alternatives.",
            ],
            "Hindi": [
                "जिला अस्पताल में पोर्टल का सर्वर बार-बार बंद होने से मरीजों को लंबी कतारों में देरी का सामना करना पड़ता है।",
                "ओटीपी सत्यापन असफल होने के कारण बुजुर्ग नागरिकों को इलाज में भारी परेशानी हो रही है।",
                "निजी क्लीनिक डिजिटल हेल्थ कार्ड स्वीकार नहीं कर रहे हैं जिससे योजना का लाभ अधूरा रह जाता है।",
                "ग्रामीण स्वास्थ्य केंद्रों में इंटरनेट की कमी के कारण यह प्रणाली बेहद धीमी और अनियमित है।",
            ],
        },
        "Neutral": {
            "English": [
                "The digital health system works well in metro hospitals, please add an offline QR card option for rural clinics.",
                "Consider adding regional language voice guidance inside the health app so non-technical citizens can navigate easily.",
                "Hospital staff need standardized training workshops to speed up digital record uploads after discharge.",
            ],
            "Hindi": [
                "डिजिटल हेल्थ कार्ड अच्छा प्रयास है, कृपया ग्रामीण क्षेत्रों के लिए ऑफलाइन कार्ड स्कैन सुविधा भी जोड़ें।",
                "स्वास्थ्य ऐप में क्षेत्रीय भाषाओं में ऑडियो मार्गदर्शन देने से आम नागरिकों को समझने में आसानी होगी।",
            ],
        },
    },
    "Urban Clean Transit Subsidy": {
        "Positive": {
            "English": [
                "Electric bus passes under the clean transit subsidy cut my daily commute cost in half and reduced air pollution.",
                "New low-floor EV buses are clean, punctual, and equipped with reliable real-time arrival tracking.",
                "Student and women metro feeder subsidies made public transport safe, affordable, and convenient.",
                "Dedicated bus lanes and contactless smart cards noticeably improved morning peak-hour travel speed.",
            ],
            "Hindi": [
                "इलेक्ट्रिक बस सब्सिडी से रोज़ाना के सफर का खर्च आधा हो गया है और शहर में प्रदूषण भी घटा है।",
                "नई ईवी बसें बहुत स्वच्छ, समय की पाबंद और यात्रियों के लिए अत्यंत सुविधाजनक हैं।",
                "छात्रों और महिलाओं के लिए पास छूट योजना से सार्वजनिक परिवहन काफी सस्ता और सुरक्षित हुआ है।",
            ],
        },
        "Negative": {
            "English": [
                "Subsidy reimbursement for EV two-wheelers has been delayed for six months with zero portal status updates.",
                "Feeder bus frequency is too poor in outer suburbs forcing commuters back to expensive private autos.",
                "Charging stations at municipal depots are often broken or out of service causing sudden route cancellations.",
                "Smart transit card recharge machines fail frequently and refunds are ignored by helpline staff.",
            ],
            "Hindi": [
                "ईवी वाहन सब्सिडी का पैसा छह महीने से अटका हुआ है और शिकायत पोर्टल पर कोई सुनवाई नहीं हो रही।",
                "बाहरी कॉलोनियों में बसों की संख्या बहुत कम होने से यात्रियों को भारी परेशानी उठानी पड़ती है।",
                "चार्जिंग स्टेशन खराब रहने के कारण कई रूटों पर बस सेवा अनियमित और धीमी हो गई है।",
            ],
        },
        "Neutral": {
            "English": [
                "Public transit subsidy is helpful, please extend night bus schedules until 11:30 PM near industrial hubs.",
                "Suggest integrating metro, suburban rail, and city bus passes into one unified QR mobility ticket.",
                "More shaded bus shelters with live arrival boards should be installed before summer.",
            ],
            "Hindi": [
                "बस सब्सिडी अच्छी पहल है, कृपया रात 11 बजे तक प्रमुख रूटों पर फीडर बसें चलाने का सुझाव स्वीकार करें।",
                "मेट्रो और सिटी बस के लिए एक ही स्मार्ट कार्ड लागू किया जाए तो यात्रियों को और सुविधा होगी।",
            ],
        },
    },
    "National Education Reform": {
        "Positive": {
            "English": [
                "Vocational coding and practical skill labs in government schools significantly improved student engagement.",
                "Bilingual textbooks and foundational literacy kits helped primary students read with much greater confidence.",
                "Transparent scholarship direct bank transfers eliminated middlemen delays for college applicants.",
                "Continuous project-based assessments reduced rote memorization stress among high school learners.",
            ],
            "Hindi": [
                "सरकारी स्कूलों में कौशल विकास और कंप्यूटर लैब शुरू होने से छात्रों की रुचि और उपस्थिति बढ़ी है।",
                "मातृभाषा में पाठ्यपुस्तकें मिलने से प्राथमिक कक्षा के बच्चों को विषय समझने में बड़ी मदद मिली है।",
                "छात्रवृत्ति की राशि सीधे बैंक खाते में आने से पारदर्शिता बढ़ी है और देरी समाप्त हुई है।",
            ],
        },
        "Negative": {
            "English": [
                "Acute shortage of trained STEM teachers makes the new practical curriculum impossible to implement properly.",
                "Rural schools still lack reliable electricity and broadband for mandatory digital smart classrooms.",
                "Frequent mid-year exam pattern changes created severe confusion and anxiety for board students.",
                "Scholarship verification portal rejects valid caste and income certificates without clear error messages.",
            ],
            "Hindi": [
                "स्कूलों में प्रशिक्षित शिक्षकों की भारी कमी के कारण नया पाठ्यक्रम सही ढंग से लागू नहीं हो पा रहा है।",
                "ग्रामीण विद्यालयों में बिजली और इंटरनेट के बिना डिजिटल क्लासरूम योजना विफल साबित हो रही है।",
                "परीक्षा प्रणाली में बार-बार बदलाव से छात्रों और अभिभावकों में असमंजस और तनाव बढ़ा है।",
            ],
        },
        "Neutral": {
            "English": [
                "The skill-based syllabus is progressive, however quarterly teacher refresher bootcamps should be mandatory.",
                "Please publish sample question banks in both English and Hindi at least four months before final exams.",
                "District libraries need updated science lab kits to match the revised curriculum.",
            ],
            "Hindi": [
                "नई शिक्षा नीति की दिशा सकारात्मक है, लेकिन शिक्षकों के नियमित प्रशिक्षण पर अधिक ध्यान देना चाहिए।",
                "परीक्षा से चार महीने पहले हिंदी और अंग्रेजी में मॉडल प्रश्नपत्र जारी किए जाने चाहिए।",
            ],
        },
    },
    "Rural Solar Microgrid Scheme": {
        "Positive": {
            "English": [
                "Village solar microgrids ended evening blackouts and enabled farmers to run water pumps reliably.",
                "Affordable solar home lighting helped children study after sunset without kerosene smoke.",
                "Local youth trained as solar technicians created clean village jobs and rapid maintenance support.",
                "Subsidized rooftop solar panels lowered monthly electricity bills by nearly seventy percent.",
            ],
            "Hindi": [
                "गांव में सोलर माइक्रोग्रिड लगने से शाम की बिजली कटौती समाप्त हो गई है और सिंचाई आसान हुई है।",
                "सौर ऊर्जा से घर में रोशनी मिलने से बच्चों की पढ़ाई बेहतर हुई है और खर्च भी घटा है।",
                "स्थानीय युवाओं को सोलर मरम्मत का प्रशिक्षण मिलने से गांव में रोजगार के नए अवसर बने हैं।",
            ],
        },
        "Negative": {
            "English": [
                "Battery storage banks degraded within one year and replacement requests remain ignored by contractors.",
                "Corruption in beneficiary selection left poor marginal farmers out of the subsidized solar pump list.",
                "Microgrid voltage drops sharply whenever multiple flour mills run during afternoon hours.",
                "Upfront installation deposit is still too expensive for low-income agricultural households.",
            ],
            "Hindi": [
                "सोलर बैटरी एक साल में खराब हो गई और ठेकेदार मरम्मत करने में लगातार लापरवाही कर रहे हैं।",
                "लाभार्थी चयन में भ्रष्टाचार के कारण पात्र गरीब किसानों को सोलर पंप सब्सिडी नहीं मिल पाई।",
                "शुरुआती अंशदान राशि अधिक होने से छोटे किसानों पर आर्थिक बोझ बढ़ रहा है।",
            ],
        },
        "Neutral": {
            "English": [
                "Solar microgrids are reliable, please introduce zero-interest installment plans for small farmers.",
                "Suggest publishing a district toll-free helpline for inverter warranty claims within 48 hours.",
                "Integrating cold storage units with village microgrids would reduce post-harvest vegetable waste.",
            ],
            "Hindi": [
                "सोलर योजना अच्छी है, छोटे किसानों के लिए बिना ब्याज किस्त का विकल्प दिया जाना चाहिए।",
                "गांव स्तर पर कोल्ड स्टोरेज को सोलर ग्रिड से जोड़ने पर फसलों की बर्बादी रोकी जा सकती है।",
            ],
        },
    },
    "Smart Water Metering Initiative": {
        "Positive": {
            "English": [
                "Smart water meters detected hidden underground pipe leaks early and restored steady morning pressure.",
                "Automated monthly billing is transparent and reflects actual household consumption fairly.",
                "SMS alerts for unusual water spikes helped our apartment association prevent thousands of liters of waste.",
            ],
            "Hindi": [
                "स्मार्ट वाटर मीटर से पाइपलाइन रिसाव की पहचान समय पर हुई और सुबह पानी का दबाव सुधरा है।",
                "वास्तविक उपयोग के आधार पर पारदर्शी बिल आने से गलत वसूली की समस्या खत्म हुई है।",
                "मोबाइल पर अधिक खपत का अलर्ट मिलने से पानी की बर्बादी रोकने में काफी मदद मिली है।",
            ],
        },
        "Negative": {
            "English": [
                "Faulty smart meters inflated monthly water bills threefold even when municipal supply was dry for days.",
                "Airflow in empty pipes spins the digital meter faster, charging residents unfairly for zero water.",
                "Grievance redressal for billing disputes takes months and reconnection fees are harsh.",
                "Installation crews damaged road pavements and left debris outside residential gates.",
            ],
            "Hindi": [
                "खराब स्मार्ट मीटर के कारण पानी न आने पर भी तीन गुना अधिक बिल आ रहा है जो अन्यायपूर्ण है।",
                "खाली पाइप में हवा चलने से मीटर घूमता है और नागरिकों को बिना पानी के भारी शुल्क देना पड़ता है।",
                "बिल सुधार की शिकायत करने पर महीनों तक कोई कार्रवाई नहीं होती और सुनवाई धीमी है।",
            ],
        },
        "Neutral": {
            "English": [
                "Smart metering helps conservation, please certify meter calibration before billing begins.",
                "Recommend offering a free 20,000-liter lifeline slab for economically weaker households.",
                "Ward offices should display daily water supply schedules alongside pressure readings online.",
            ],
            "Hindi": [
                "जल संरक्षण के लिए मीटर जरूरी हैं, परंतु बिलिंग से पहले मीटर की सटीकता की जांच अनिवार्य होनी चाहिए।",
                "गरीब परिवारों के लिए न्यूनतम मुफ्त पानी की सीमा तय करने का सुझाव कृपया लागू करें।",
            ],
        },
    },
    "MSME Credit Guarantee Scheme": {
        "Positive": {
            "English": [
                "Collateral-free MSME credit guarantee allowed our small textile unit to purchase modern machinery quickly.",
                "Online loan sanction tracking is transparent and reduced bank branch visits dramatically.",
                "Lower interest subvention empowered women entrepreneurs to expand local food processing businesses.",
                "Timely working capital disbursement saved twenty-five manufacturing jobs during seasonal downturns.",
            ],
            "Hindi": [
                "बिना गारंटी एमएसएमई ऋण मिलने से हमारे छोटे उद्योग को आधुनिक मशीन खरीदने में बड़ी मदद मिली।",
                "ऑनलाइन लोन ट्रैकिंग पारदर्शी है जिससे बैंक के चक्कर कम हुए और समय पर पूंजी मिली।",
                "ब्याज छूट योजना ने महिला उद्यमियों को अपना व्यवसाय बढ़ाने के लिए सशक्त बनाया है।",
            ],
        },
        "Negative": {
            "English": [
                "Bank managers still demand informal collateral and delay MSME guarantee approvals for months.",
                "Excessive paperwork and repeated document rejections discourage micro-entrepreneurs from applying.",
                "Hidden processing charges and high insurance fees wipe out the promised interest subsidy benefit.",
                "First-time rural artisans receive zero guidance and their applications sit pending indefinitely.",
            ],
            "Hindi": [
                "योजना के बावजूद बैंक अधिकारी अभी भी गारंटी मांगते हैं और ऋण स्वीकृति में भारी देरी करते हैं।",
                "जटिल कागजी प्रक्रिया के कारण छोटे व्यापारियों के आवेदन बिना स्पष्ट कारण के रद्द कर दिए जाते हैं।",
                "प्रोसेसिंग शुल्क अधिक होने से ब्याज सब्सिडी का वास्तविक लाभ छोटे उद्यमियों को नहीं मिल पाता।",
            ],
        },
        "Neutral": {
            "English": [
                "Credit guarantee coverage is strong, please mandate a strict 15-day SLA for bank sanction decisions.",
                "District industry centers should host bilingual application camps for first-time small business owners.",
                "Linking GST invoice history directly to the credit portal would speed up eligibility verification.",
            ],
            "Hindi": [
                "ऋण गारंटी योजना उपयोगी है, बैंकों के लिए 15 दिन में निर्णय लेने की समयसीमा अनिवार्य की जाए।",
                "नए छोटे उद्यमियों के लिए जिला स्तर पर हिंदी में सहायता शिविर आयोजित किए जाने चाहिए।",
            ],
        },
    },
}

# Subtle realistic variations to prevent exact duplicates during TF-IDF training
ENGLISH_PREFIXES = [
    "", "In our district, ", "Based on recent experience, ", "From a citizen perspective, ",
    "After using this for three months, ", "Speaking for local residents, ",
]
ENGLISH_SUFFIXES = [
    "", " More transparency in tracking would help further.",
    " Authorities should monitor ground implementation regularly.",
    " Thank you for seeking public input.",
    " Please share monthly progress reports publicly.",
]
HINDI_PREFIXES = [
    "", "हमारे जिले में ", "नागरिक अनुभव के अनुसार ", "पिछले कुछ महीनों में ", "स्थानीय स्तर पर ",
]
HINDI_SUFFIXES = [
    "", " कृपया जमीनी स्तर पर नियमित समीक्षा करें।",
    " जनसुनवाई से सुधार की उम्मीद है।",
    " समयबद्ध निगरानी आवश्यक है।",
]


def generate_policy_dataset(num_records: int = 600, output_path: Path = OUTPUT_PATH) -> pd.DataFrame:
    """Generate a balanced, realistic English + Hindi policy feedback dataset."""
    rng = random.Random(SEED)
    start_date = date(2026, 1, 5)
    end_date = date(2026, 10, 28)
    total_days = (end_date - start_date).days

    policies = list(FEEDBACK_TEMPLATES.keys())
    # Realistic public sentiment distribution (~42% Positive, ~34% Negative, ~24% Neutral)
    sentiment_weights = [("Positive", 0.42), ("Negative", 0.34), ("Neutral", 0.24)]

    rows = []
    for idx in range(1, num_records + 1):
        policy = policies[(idx - 1) % len(policies)]
        r_val = rng.random()
        if r_val < sentiment_weights[0][1]:
            sentiment = "Positive"
        elif r_val < sentiment_weights[0][1] + sentiment_weights[1][1]:
            sentiment = "Negative"
        else:
            sentiment = "Neutral"

        # 65% English, 35% Hindi
        language = "English" if rng.random() < 0.65 else "Hindi"
        templates = FEEDBACK_TEMPLATES[policy][sentiment][language]
        base_text = rng.choice(templates)

        if language == "English":
            prefix = rng.choice(ENGLISH_PREFIXES)
            suffix = rng.choice(ENGLISH_SUFFIXES)
            if prefix:
                text = f"{prefix}{base_text[0].lower()}{base_text[1:]}{suffix}"
            else:
                text = f"{base_text}{suffix}"
        else:
            prefix = rng.choice(HINDI_PREFIXES)
            suffix = rng.choice(HINDI_SUFFIXES)
            text = f"{prefix}{base_text}{suffix}".strip()

        # Simulate realistic policy trend shift over 2026
        day_offset = rng.randint(0, total_days)
        submitted = start_date + timedelta(days=day_offset)

        rows.append({
            "feedback_id": f"FB-{idx:04d}",
            "submitted_date": submitted.isoformat(),
            "policy_name": policy,
            "region": rng.choice(REGIONS),
            "channel": rng.choice(CHANNELS),
            "language": language,
            "feedback_text": text,
            "sentiment": sentiment,
        })

    df = pd.DataFrame(rows).sort_values("submitted_date").reset_index(drop=True)
    df["feedback_id"] = [f"FB-{i + 1:04d}" for i in range(len(df))]
    output_path.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(output_path, index=False, encoding="utf-8-sig")
    print(f"Generated {len(df)} records at {output_path}")
    return df


if __name__ == "__main__":
    generate_policy_dataset()
