#!/usr/bin/env python3
from __future__ import annotations

import csv
import json
import math
import re
from collections import Counter
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from statistics import median
from typing import Iterator


ROOT = Path(__file__).resolve().parents[1]
RAW_DIR = ROOT / "data" / "raw"
OUTPUT_PATH = ROOT / "data" / "recommender_dataset.json"

TARGET_ACADEMIC_YEAR = 2568
STUDENT_FILE_GLOB = f"univ_std_11_01_{TARGET_ACADEMIC_YEAR}*.csv"
COST_FILE = RAW_DIR / "dqe_11_03.csv"


TRACKS = [
    ("engineering", "วิศวกรรม-อุตสาหกรรม"),
    ("health", "สุขภาพ-การแพทย์"),
    ("science", "วิทย์-เทคโนโลยี"),
    ("business", "ธุรกิจ-บริหาร-บัญชี"),
    ("education", "ครุศาสตร์-ศึกษาศาสตร์"),
    ("arts_media", "ศิลปะ-สื่อ-ออกแบบ"),
    ("social_human", "มนุษยศาสตร์-ภาษา-สังคม"),
    ("law_politics", "นิติศาสตร์-รัฐศาสตร์"),
    ("agri_env", "เกษตร-อาหาร-สิ่งแวดล้อม"),
    ("service_tourism", "บริการ-ท่องเที่ยว"),
    ("other", "อื่น ๆ"),
]


TRACK_RULES = [
    (
        "engineering",
        [
            "วิศว",
            "อุตสาห",
            "เครื่องกล",
            "โยธา",
            "ไฟฟ้า",
            "แมคคาทรอนิก",
            "เทคนิคการผลิต",
            "industrial",
            "engineering",
        ],
    ),
    (
        "health",
        [
            "แพทย",
            "พยาบาล",
            "สาธารณสุข",
            "เภสัช",
            "ทันต",
            "สัตวแพทย",
            "กายภาพบำบัด",
            "เทคนิคการแพทย์",
            "medical",
            "health",
            "nursing",
            "pharmacy",
        ],
    ),
    (
        "science",
        [
            "วิทยาการคอม",
            "คอมพิวเตอร์",
            "ดิจิทัล",
            "ข้อมูล",
            "ปัญญาประดิษฐ์",
            "software",
            "data",
            "science",
            "technology",
            "it",
            "ไซเบอร์",
            "เทคโนโลยี",
        ],
    ),
    (
        "business",
        [
            "บริหาร",
            "บัญชี",
            "การเงิน",
            "เศรษฐ",
            "ธุรกิจ",
            "การตลาด",
            "logistics",
            "finance",
            "business",
            "account",
        ],
    ),
    (
        "education",
        [
            "ครุ",
            "ศึกษาศาสตร์",
            "การสอน",
            "teacher",
            "education",
        ],
    ),
    (
        "arts_media",
        [
            "ศิลป",
            "นิเทศ",
            "ภาพยนตร์",
            "ดนตรี",
            "ออกแบบ",
            "สถาปัตย",
            "media",
            "design",
            "architecture",
            "communication arts",
        ],
    ),
    (
        "social_human",
        [
            "มนุษย",
            "สังคม",
            "ภาษา",
            "จิตวิทยา",
            "ประวัติศาสตร์",
            "ภูมิศาสตร์",
            "humanities",
            "social",
            "lingu",
        ],
    ),
    (
        "law_politics",
        [
            "นิติ",
            "รัฐศาสตร",
            "รัฐศาสตร์",
            "public administration",
            "politic",
            "law",
        ],
    ),
    (
        "agri_env",
        [
            "เกษตร",
            "ประมง",
            "อาหาร",
            "สิ่งแวดล้อม",
            "ทรัพยากร",
            "agri",
            "food",
            "environment",
            "forestry",
        ],
    ),
    (
        "service_tourism",
        [
            "ท่องเที่ยว",
            "การโรงแรม",
            "การบิน",
            "โลจิสติก",
            "hospitality",
            "tourism",
            "aviation",
            "service",
        ],
    ),
]


def normalize_institution_name(name: str) -> str:
    text = str(name or "").strip()
    text = re.sub(r"\s*\([^)]*\)\s*", "", text)
    text = re.sub(r"\s+", "", text)
    text = text.replace("มหาวิทยาลัยราชภัฏ", "มรภ")
    text = text.replace("มหาวิทยาลัยเทคโนโลยีราชมงคล", "มทร")
    return text


def clean_text(value: str) -> str:
    return re.sub(r"\s+", " ", str(value or "").strip())


def normalize_program_name(text: str) -> str:
    text = str(text or "").strip().lower()
    return re.sub(r"\s+", " ", text)


def parse_int(value: str) -> int:
    raw = str(value or "").replace(",", "").strip()
    if not raw:
        return 0
    try:
        return int(float(raw))
    except ValueError:
        return 0


def parse_float(value: str) -> float:
    raw = str(value or "").replace(",", "").strip()
    if not raw:
        return 0.0
    try:
        return float(raw)
    except ValueError:
        return 0.0


def parse_student_count(row: dict[str, str]) -> int:
    # New schema uses TOTAL_STD, old files used ALL STD.
    return parse_int(row.get("TOTAL_STD") or row.get("ALL STD") or "")


def iter_csv_rows(path: Path, encoding: str) -> Iterator[dict[str, str]]:
    with path.open(encoding=encoding, newline="") as file:
        sample = file.read(8192)
        file.seek(0)
        try:
            dialect = csv.Sniffer().sniff(sample, delimiters=",;|\t")
        except csv.Error:
            dialect = csv.excel
        reader = csv.DictReader(file, dialect=dialect)
        yield from reader


def classify_track(program_or_curriculum: str, faculty_name: str = "") -> str:
    text = normalize_program_name(f"{program_or_curriculum} {faculty_name}")

    for track_id, keywords in TRACK_RULES:
        if any(keyword in text for keyword in keywords):
            return track_id

    return "other"


@dataclass
class InstitutionAggregate:
    name: str
    province: str = ""
    type_counter: Counter = field(default_factory=Counter)
    total_students: int = 0
    track_students: Counter = field(default_factory=Counter)
    program_students: Counter = field(default_factory=Counter)
    costs: list[float] = field(default_factory=list)

    def budget_median(self) -> float | None:
        if not self.costs:
            return None
        return float(median(self.costs))


def quantile(sorted_values: list[float], q: float) -> float:
    if not sorted_values:
        return 0.0
    if len(sorted_values) == 1:
        return sorted_values[0]
    index = (len(sorted_values) - 1) * q
    low = math.floor(index)
    high = math.ceil(index)
    if low == high:
        return sorted_values[low]
    ratio = index - low
    return sorted_values[low] + (sorted_values[high] - sorted_values[low]) * ratio


def extract_semester_from_filename(path: Path) -> int:
    match = re.search(rf"_{TARGET_ACADEMIC_YEAR}(?:_(\d+))?\.csv$", path.name)
    if not match:
        return 1
    semester = parse_int(match.group(1) or "1")
    return semester if semester > 0 else 1


def resolve_student_files() -> tuple[list[Path], int]:
    candidates = sorted(RAW_DIR.glob(STUDENT_FILE_GLOB))
    if not candidates:
        return [], 0

    latest_semester = max(extract_semester_from_filename(path) for path in candidates)
    selected = [
        path for path in candidates if extract_semester_from_filename(path) == latest_semester
    ]
    return selected, latest_semester


def build_dataset(student_files: list[Path], target_semester: int) -> dict:
    institutions: dict[str, InstitutionAggregate] = {}

    def get_or_create(name: str) -> InstitutionAggregate:
        if name not in institutions:
            institutions[name] = InstitutionAggregate(name=name)
        return institutions[name]

    for student_file in student_files:
        for row in iter_csv_rows(student_file, encoding="utf-8-sig"):
            year = parse_int(row.get("ACADEMIC_YEAR", ""))
            if year and year != TARGET_ACADEMIC_YEAR:
                continue

            semester = parse_int(row.get("SEMESTER", ""))
            if target_semester and semester and semester != target_semester:
                continue

            name = clean_text(row.get("UNIV_NAME_TH") or "")
            if not name:
                continue

            students = parse_student_count(row)
            if students <= 0:
                continue

            program = clean_text(row.get("PROGRAM_NAME") or "")
            faculty = clean_text(row.get("FAC_NAME") or "")
            institution_type = clean_text(row.get("UNIV_TYPE_NAME") or "")
            province = clean_text(row.get("UNIV_PROVINCE_NAME") or "")

            item = get_or_create(name)
            if province and not item.province:
                item.province = province

            item.total_students += students
            item.track_students[classify_track(program, faculty)] += students
            if program:
                item.program_students[program] += students
            if institution_type:
                item.type_counter[institution_type] += students

    normalized_institution_index = {
        normalize_institution_name(name): name for name in institutions.keys()
    }

    for row in iter_csv_rows(COST_FILE, encoding="cp874"):
        name = clean_text(row.get("UNIV_NAME_TH") or "")
        if not name:
            continue

        cost = parse_float(row.get("COST_PER_YEAR", ""))
        if cost <= 0:
            continue

        resolved_name = institutions.get(name)
        if resolved_name is None:
            mapped_name = normalized_institution_index.get(normalize_institution_name(name))
            if not mapped_name:
                continue
            item = institutions[mapped_name]
        else:
            item = resolved_name
        item.costs.append(cost)

    institution_rows = []
    institution_costs = []
    total_program_rows = 0

    for _, institution in sorted(institutions.items(), key=lambda entry: entry[0]):
        if not institution.province:
            continue

        institution_budget_median = institution.budget_median()
        if institution_budget_median is not None:
            institution_costs.append(institution_budget_median)

        top_tracks = sorted(
            (
                {"id": track_id, "students": students}
                for track_id, students in institution.track_students.items()
                if students > 0
            ),
            key=lambda item: item["students"],
            reverse=True,
        )

        top_programs = sorted(
            (
                {"name": program_name, "students": students}
                for program_name, students in institution.program_students.items()
                if students > 0
            ),
            key=lambda item: item["students"],
            reverse=True,
        )[:6]

        total_program_rows += len(top_programs)

        institution_rows.append(
            {
                "name": institution.name,
                "province": institution.province,
                "universityType": institution.type_counter.most_common(1)[0][0]
                if institution.type_counter
                else "ไม่ระบุประเภท",
                "totalStudents": institution.total_students,
                "budgetMedianPerYear": round(institution_budget_median, 2)
                if institution_budget_median is not None
                else None,
                "tracks": top_tracks,
                "topPrograms": top_programs,
            }
        )

    institution_costs.sort()
    low_ceiling = round(quantile(institution_costs, 0.33), 2) if institution_costs else 40000
    high_floor = round(quantile(institution_costs, 0.66), 2) if institution_costs else 90000

    for item in institution_rows:
        budget = item["budgetMedianPerYear"]
        if budget is None:
            item["budgetBand"] = "unknown"
            continue

        if budget <= low_ceiling:
            item["budgetBand"] = "low"
        elif budget <= high_floor:
            item["budgetBand"] = "medium"
        else:
            item["budgetBand"] = "high"

    institution_rows.sort(
        key=lambda item: (
            item["province"],
            -item["totalStudents"],
            item["name"],
        )
    )

    return {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "metadata": {
            "institutionCount": len(institution_rows),
            "programCountInOutput": total_program_rows,
        },
        "sources": [
            {
                "datasetId": "univ_std_11_01",
                "datasetName": f"นักศึกษาปัจจุบัน ปีการศึกษา {TARGET_ACADEMIC_YEAR} ภาคการศึกษาที่ {target_semester}",
                "resourceFile": student_files[0].name,
                "resourceFiles": [path.name for path in student_files],
                "url": "https://data.mhesi.go.th/dataset/univ_std_11_01",
            },
            {
                "datasetId": "dqe_11_03",
                "datasetName": "ข้อมูลต้นทุนค่าใช้จ่ายในการผลิตนักศึกษาต่อหัวต่อปี ของแต่ละหลักสูตร",
                "resourceFile": "dqe_11_03.csv",
                "url": "https://data.mhesi.go.th/dataset/7fa12569-ce54-44bc-b12f-2f551fd5d722/resource/b6d4c798-c0f1-4107-b086-4c207fed3257/download/dqe_11_03.csv",
            },
        ],
        "tracks": [{"id": track_id, "label": label} for track_id, label in TRACKS],
        "budgetBands": [
            {
                "id": "low",
                "label": f"ประหยัด (<= {int(low_ceiling):,} บาท/ปี)",
                "max": low_ceiling,
            },
            {
                "id": "medium",
                "label": f"ปานกลาง ({int(low_ceiling):,} - {int(high_floor):,} บาท/ปี)",
                "min": low_ceiling,
                "max": high_floor,
            },
            {
                "id": "high",
                "label": f"งบสูง (> {int(high_floor):,} บาท/ปี)",
                "min": high_floor,
            },
            {"id": "unknown", "label": "ไม่ระบุงบประมาณ"},
        ],
        "institutions": institution_rows,
    }


def main() -> None:
    student_files, semester = resolve_student_files()
    if not student_files:
        raise FileNotFoundError(
            f"Missing student file(s) for year {TARGET_ACADEMIC_YEAR}: {RAW_DIR / STUDENT_FILE_GLOB}"
        )
    if not COST_FILE.exists():
        raise FileNotFoundError(f"Missing source file: {COST_FILE}")

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    payload = build_dataset(student_files, semester)
    OUTPUT_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Built {OUTPUT_PATH} with {payload['metadata']['institutionCount']} institutions.")


if __name__ == "__main__":
    main()
