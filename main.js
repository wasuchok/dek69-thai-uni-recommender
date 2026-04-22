const GEOJSON_PATH = "/data/thailand.geojson";
const RECOMMENDER_DATA_PATH = "/data/recommender_dataset.json";
const mapSvg = d3.select("#map");
const statusText = document.querySelector("#status");
const frame = document.querySelector(".map-frame");
const visitorCountElement = document.querySelector("#visitor-count");
const provinceNameElement = document.querySelector("#province-name");
const provinceDescriptionElement = document.querySelector("#province-description");
const provinceRegionElement = document.querySelector("#province-region");
const provinceCountElement = document.querySelector("#province-count");
const provinceUpdatedElement = document.querySelector("#province-updated");
const institutionListElement = document.querySelector("#institution-list");
const provinceChipElement = document.querySelector("#province-chip");
const provinceSearchInput = document.querySelector("#province-search");
const provinceOptionsElement = document.querySelector("#province-options");
const provinceSearchSubmitButton = document.querySelector("#province-search-submit");
const resetViewButton = document.querySelector("#reset-view");
const studyTrackSelect = document.querySelector("#study-track");
const budgetFilterSelect = document.querySelector("#budget-filter");
const areaFilterSelect = document.querySelector("#area-filter");
const clearFiltersButton = document.querySelector("#clear-filters");
const VISITOR_COUNTER_NAMESPACE = "job-ma-rien-tee-nai";
const VISITOR_COUNTER_KEY = "web-total-visits";
const LOCAL_VISITOR_COUNTER_KEY = "job-ma-rien-tee-nai-local-visits";
const VISITOR_COUNTER_CACHE_KEY = "job-ma-rien-tee-nai-global-visits-cache";
const VISITOR_COUNTER_TIMEOUT_MS = 2500;

let thailandGeoData = null;
let recommenderData = null;
let currentTransform = d3.zoomIdentity;
let selectedProvinceName = "";
let hoveredProvinceName = "";
let currentAreaFilterLabel = "ทุกพื้นที่";
let currentFilters = {
  track: "all",
  budget: "all",
  area: "all",
};
let currentMapState = {
  width: 0,
  height: 0,
  mapLayer: null,
  provincePaths: null,
  labelGroups: null,
  path: null,
  zoomBehavior: null,
};

// Tune interaction and label sizing for each device range.
function getResponsiveMapConfig(width) {
  if (width <= 480) {
    return {
      minLabelSize: 7.8,
      maxLabelSize: 10.8,
      globalLabelZoom: 1,
      maxZoom: 10,
      labelScaleExponent: 1,
      strokeScaleExponent: 1,
      baseStroke: 1.45,
    };
  }

  if (width <= 768) {
    return {
      minLabelSize: 8.2,
      maxLabelSize: 11.4,
      globalLabelZoom: 1,
      maxZoom: 10,
      labelScaleExponent: 1,
      strokeScaleExponent: 1,
      baseStroke: 1.55,
    };
  }

  if (width <= 1024) {
    return {
      minLabelSize: 8.6,
      maxLabelSize: 11.8,
      globalLabelZoom: 1,
      maxZoom: 9,
      labelScaleExponent: 1,
      strokeScaleExponent: 1,
      baseStroke: 1.65,
    };
  }

  return {
    minLabelSize: 9,
    maxLabelSize: 12.8,
    globalLabelZoom: 1,
    maxZoom: 8,
    labelScaleExponent: 1,
    strokeScaleExponent: 1,
    baseStroke: 1.75,
  };
}

const REGION_COLORS = {
  north: "#a7d8ce",
  northeast: "#b7d0f7",
  central: "#f3dfae",
  east: "#f0c7bb",
  west: "#c4dec7",
  south: "#d3c4f0",
  unknown: "#d6dee8",
};

const REGION_LABELS = {
  north: "ภาคเหนือ",
  northeast: "ภาคตะวันออกเฉียงเหนือ",
  central: "ภาคกลาง",
  east: "ภาคตะวันออก",
  west: "ภาคตะวันตก",
  south: "ภาคใต้",
  unknown: "ไม่ระบุภูมิภาค",
};

// Group provinces by region so the map feels more readable and colorful.
const PROVINCE_REGIONS = {
  "Amnat Charoen": "northeast",
  "Ang Thong": "central",
  "Bangkok Metropolis": "central",
  "Buri Ram": "northeast",
  Chachoengsao: "east",
  "Chai Nat": "central",
  Chaiyaphum: "northeast",
  Chanthaburi: "east",
  "Chiang Mai": "north",
  "Chiang Rai": "north",
  "Chon Buri": "east",
  Chumphon: "south",
  Kalasin: "northeast",
  "Kamphaeng Phet": "north",
  Kanchanaburi: "west",
  "Khon Kaen": "northeast",
  Krabi: "south",
  Lampang: "north",
  Lamphun: "north",
  Loei: "northeast",
  "Lop Buri": "central",
  "Mae Hong Son": "north",
  "Maha Sarakham": "northeast",
  Mukdahan: "northeast",
  "Nakhon Nayok": "central",
  "Nakhon Pathom": "central",
  "Nakhon Phanom": "northeast",
  "Nakhon Ratchasima": "northeast",
  "Nakhon Sawan": "central",
  "Nakhon Si Thammarat": "south",
  Nan: "north",
  Narathiwat: "south",
  "Nong Bua Lam Phu": "northeast",
  "Nong Khai": "northeast",
  Nonthaburi: "central",
  "Pathum Thani": "central",
  Pattani: "south",
  Phangnga: "south",
  Phatthalung: "south",
  "Phatthalung (Songkhla Lake)": "south",
  Phayao: "north",
  Phetchabun: "north",
  Phetchaburi: "west",
  Phichit: "north",
  Phitsanulok: "north",
  "Phra Nakhon Si Ayutthaya": "central",
  Phrae: "north",
  Phuket: "south",
  "Prachin Buri": "east",
  "Prachuap Khiri Khan": "west",
  Ranong: "south",
  Ratchaburi: "west",
  Rayong: "east",
  "Roi Et": "northeast",
  "Sa Kaeo": "east",
  "Sakon Nakhon": "northeast",
  "Samut Prakan": "central",
  "Samut Sakhon": "central",
  "Samut Songkhram": "central",
  Saraburi: "central",
  Satun: "south",
  "Si Sa Ket": "northeast",
  "Sing Buri": "central",
  Songkhla: "south",
  "Songkhla (Songkhla Lake)": "south",
  Sukhothai: "north",
  "Suphan Buri": "central",
  "Surat Thani": "south",
  Surin: "northeast",
  Tak: "north",
  Trang: "south",
  Trat: "east",
  "Ubon Ratchathani": "northeast",
  "Udon Thani": "northeast",
  "Uthai Thani": "central",
  Uttaradit: "north",
  Yala: "south",
  Yasothon: "northeast",
};

// Map English province names from the GeoJSON file to Thai labels.
const THAI_PROVINCE_NAMES = {
  "Amnat Charoen": "อำนาจเจริญ",
  "Ang Thong": "อ่างทอง",
  "Bangkok Metropolis": "กรุงเทพมหานคร",
  "Buri Ram": "บุรีรัมย์",
  Chachoengsao: "ฉะเชิงเทรา",
  "Chai Nat": "ชัยนาท",
  Chaiyaphum: "ชัยภูมิ",
  Chanthaburi: "จันทบุรี",
  "Chiang Mai": "เชียงใหม่",
  "Chiang Rai": "เชียงราย",
  "Chon Buri": "ชลบุรี",
  Chumphon: "ชุมพร",
  Kalasin: "กาฬสินธุ์",
  "Kamphaeng Phet": "กำแพงเพชร",
  Kanchanaburi: "กาญจนบุรี",
  "Khon Kaen": "ขอนแก่น",
  Krabi: "กระบี่",
  Lampang: "ลำปาง",
  Lamphun: "ลำพูน",
  Loei: "เลย",
  "Lop Buri": "ลพบุรี",
  "Mae Hong Son": "แม่ฮ่องสอน",
  "Maha Sarakham": "มหาสารคาม",
  Mukdahan: "มุกดาหาร",
  "Nakhon Nayok": "นครนายก",
  "Nakhon Pathom": "นครปฐม",
  "Nakhon Phanom": "นครพนม",
  "Nakhon Ratchasima": "นครราชสีมา",
  "Nakhon Sawan": "นครสวรรค์",
  "Nakhon Si Thammarat": "นครศรีธรรมราช",
  Nan: "น่าน",
  Narathiwat: "นราธิวาส",
  "Nong Bua Lam Phu": "หนองบัวลำภู",
  "Nong Khai": "หนองคาย",
  Nonthaburi: "นนทบุรี",
  "Pathum Thani": "ปทุมธานี",
  Pattani: "ปัตตานี",
  Phangnga: "พังงา",
  Phatthalung: "พัทลุง",
  "Phatthalung (Songkhla Lake)": "พัทลุง (ทะเลสาบสงขลา)",
  Phayao: "พะเยา",
  Phetchabun: "เพชรบูรณ์",
  Phetchaburi: "เพชรบุรี",
  Phichit: "พิจิตร",
  Phitsanulok: "พิษณุโลก",
  "Phra Nakhon Si Ayutthaya": "พระนครศรีอยุธยา",
  Phrae: "แพร่",
  Phuket: "ภูเก็ต",
  "Prachin Buri": "ปราจีนบุรี",
  "Prachuap Khiri Khan": "ประจวบคีรีขันธ์",
  Ranong: "ระนอง",
  Ratchaburi: "ราชบุรี",
  Rayong: "ระยอง",
  "Roi Et": "ร้อยเอ็ด",
  "Sa Kaeo": "สระแก้ว",
  "Sakon Nakhon": "สกลนคร",
  "Samut Prakan": "สมุทรปราการ",
  "Samut Sakhon": "สมุทรสาคร",
  "Samut Songkhram": "สมุทรสงคราม",
  Saraburi: "สระบุรี",
  Satun: "สตูล",
  "Si Sa Ket": "ศรีสะเกษ",
  "Sing Buri": "สิงห์บุรี",
  Songkhla: "สงขลา",
  "Songkhla (Songkhla Lake)": "สงขลา (ทะเลสาบสงขลา)",
  Sukhothai: "สุโขทัย",
  "Suphan Buri": "สุพรรณบุรี",
  "Surat Thani": "สุราษฎร์ธานี",
  Surin: "สุรินทร์",
  Tak: "ตาก",
  Trang: "ตรัง",
  Trat: "ตราด",
  "Ubon Ratchathani": "อุบลราชธานี",
  "Udon Thani": "อุดรธานี",
  "Uthai Thani": "อุทัยธานี",
  Uttaradit: "อุตรดิตถ์",
  Yala: "ยะลา",
  Yasothon: "ยโสธร",
};

const TRACK_LABELS = {
  engineering: "วิศวกรรม-อุตสาหกรรม",
  health: "สุขภาพ-การแพทย์",
  science: "วิทย์-เทคโนโลยี",
  business: "ธุรกิจ-บริหาร-บัญชี",
  education: "ครุศาสตร์-ศึกษาศาสตร์",
  arts_media: "ศิลปะ-สื่อ-ออกแบบ",
  social_human: "มนุษยศาสตร์-ภาษา-สังคม",
  law_politics: "นิติศาสตร์-รัฐศาสตร์",
  agri_env: "เกษตร-อาหาร-สิ่งแวดล้อม",
  service_tourism: "บริการ-ท่องเที่ยว",
  other: "อื่น ๆ",
};

const BUDGET_FALLBACK_LABELS = {
  low: "ประหยัด",
  medium: "ปานกลาง",
  high: "งบสูง",
  unknown: "ไม่ระบุงบประมาณ",
};

const THAI_PROVINCE_TO_REGION = Object.entries(THAI_PROVINCE_NAMES).reduce(
  (provinceMap, [englishName, thaiName]) => {
    const normalizedEnglishName = normalizeProvinceLookupName(englishName);
    const normalizedThaiName = normalizeProvinceLookupName(thaiName);
    const region = PROVINCE_REGIONS[normalizedEnglishName] ?? "unknown";
    provinceMap[normalizedThaiName] = region;
    return provinceMap;
  },
  {}
);

const PROVINCE_LABEL_LINE_BREAKS = {
  กรุงเทพมหานคร: ["กรุงเทพ", "มหานคร"],
  ฉะเชิงเทรา: ["ฉะเชิง", "เทรา"],
  นครนายก: ["นคร", "นายก"],
  นครปฐม: ["นคร", "ปฐม"],
  นครราชสีมา: ["นคร", "ราชสีมา"],
  นครศรีธรรมราช: ["นครศรี", "ธรรมราช"],
  นครสวรรค์: ["นคร", "สวรรค์"],
  ประจวบคีรีขันธ์: ["ประจวบ", "คีรีขันธ์"],
  พระนครศรีอยุธยา: ["พระนครศรี", "อยุธยา"],
  มหาสารคาม: ["มหา", "สารคาม"],
  สมุทรปราการ: ["สมุทร", "ปราการ"],
  สมุทรสงคราม: ["สมุทร", "สงคราม"],
  สมุทรสาคร: ["สมุทร", "สาคร"],
  สุราษฎร์ธานี: ["สุราษฎร์", "ธานี"],
  หนองบัวลำภู: ["หนองบัว", "ลำภู"],
  อำนาจเจริญ: ["อำนาจ", "เจริญ"],
  อุดรธานี: ["อุดร", "ธานี"],
  อุบลราชธานี: ["อุบล", "ราชธานี"],
};

function normalizeProvinceLookupName(name) {
  return String(name ?? "")
    .replace(/\s*\([^)]*\)\s*/g, "")
    .trim();
}

function getProvinceLabelLines(provinceName) {
  return PROVINCE_LABEL_LINE_BREAKS[provinceName] ?? [provinceName];
}

// Pick the raw province name from common field names used in Thailand map files.
function getRawProvinceName(feature) {
  const properties = feature?.properties ?? {};

  return (
    properties.name ??
    properties.name_th ??
    properties.nameTH ??
    properties.NAME_TH ??
    properties.NAME_1 ??
    properties.province ??
    properties.PROVINCE ??
    properties.changwat ??
    "Unknown province"
  );
}

// Prefer Thai labels, but keep a safe fallback if the source data changes.
function getProvinceName(feature) {
  const rawProvinceName = normalizeProvinceLookupName(getRawProvinceName(feature));
  return THAI_PROVINCE_NAMES[rawProvinceName] ?? rawProvinceName;
}

// Resolve the palette color for each province.
function getProvinceFill(feature) {
  const rawProvinceName = normalizeProvinceLookupName(getRawProvinceName(feature));
  const region = PROVINCE_REGIONS[rawProvinceName] ?? "unknown";
  return REGION_COLORS[region] ?? REGION_COLORS.unknown;
}

// Brighten the fill a little so hover feels responsive but still soft.
function getProvinceHoverFill(feature) {
  return d3.color(getProvinceFill(feature)).darker(0.12).formatHex();
}

function getProvinceSelectedFill(feature) {
  return d3.color(getProvinceFill(feature)).darker(0.32).formatHex();
}

function getProvinceRegionLabel(feature) {
  const rawProvinceName = normalizeProvinceLookupName(getRawProvinceName(feature));
  const regionKey = PROVINCE_REGIONS[rawProvinceName] ?? "unknown";
  return REGION_LABELS[regionKey] ?? REGION_LABELS.unknown;
}

function getRegionKeyFromProvinceName(provinceName) {
  return THAI_PROVINCE_TO_REGION[normalizeProvinceLookupName(provinceName)] ?? "unknown";
}

function formatNumber(value) {
  return Number(value ?? 0).toLocaleString("th-TH");
}

function formatPercent(value) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "ไม่ระบุ";
  }

  return `${value.toLocaleString("th-TH", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`;
}

function formatBudget(value) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "ไม่ระบุ";
  }

  return `${Math.round(value).toLocaleString("th-TH")} บาท/ปี`;
}

function getTrackLabel(trackId) {
  return TRACK_LABELS[trackId] ?? TRACK_LABELS.other;
}

function getSelectedTrackLabel() {
  if (currentFilters.track === "all") {
    return "ทุกสาย";
  }

  return getTrackLabel(currentFilters.track);
}

function getSelectedBudgetLabel() {
  if (currentFilters.budget === "all") {
    return "ทุกช่วงงบ";
  }

  const budgetBands = recommenderData?.budgetBands ?? [];
  const budgetMatch = budgetBands.find((budget) => budget.id === currentFilters.budget);
  return budgetMatch?.label ?? BUDGET_FALLBACK_LABELS[currentFilters.budget] ?? "ไม่ระบุงบ";
}

function getAreaLabelByFilterValue(areaValue) {
  if (!areaValue || areaValue === "all") {
    return "ทุกพื้นที่";
  }

  if (areaValue.startsWith("province:")) {
    return areaValue.replace("province:", "");
  }

  if (areaValue.startsWith("region:")) {
    const regionKey = areaValue.replace("region:", "");
    return REGION_LABELS[regionKey] ?? REGION_LABELS.unknown;
  }

  return "ทุกพื้นที่";
}

function getTrackStudentCount(institution, trackId) {
  if (!trackId || trackId === "all") {
    return institution.totalStudents ?? 0;
  }

  const matchedTrack = (institution.tracks ?? []).find((track) => track.id === trackId);
  return matchedTrack?.students ?? 0;
}

function matchesAreaFilter(institution, areaFilterValue) {
  if (!areaFilterValue || areaFilterValue === "all") {
    return true;
  }

  if (areaFilterValue.startsWith("province:")) {
    return institution.province === areaFilterValue.replace("province:", "");
  }

  if (areaFilterValue.startsWith("region:")) {
    const regionKey = areaFilterValue.replace("region:", "");
    return getRegionKeyFromProvinceName(institution.province) === regionKey;
  }

  return true;
}

function buildRecommendationResults() {
  if (!recommenderData?.institutions?.length) {
    return [];
  }

  const filteredInstitutions = recommenderData.institutions.filter((institution) => {
    const matchesArea = matchesAreaFilter(institution, currentFilters.area);
    const matchesTrack =
      currentFilters.track === "all" || getTrackStudentCount(institution, currentFilters.track) > 0;
    const matchesBudget =
      currentFilters.budget === "all" || institution.budgetBand === currentFilters.budget;

    return matchesArea && matchesTrack && matchesBudget;
  });

  return filteredInstitutions
    .slice()
    .sort((left, right) => {
      const leftTrackStudents = getTrackStudentCount(left, currentFilters.track);
      const rightTrackStudents = getTrackStudentCount(right, currentFilters.track);

      if (rightTrackStudents !== leftTrackStudents) {
        return rightTrackStudents - leftTrackStudents;
      }

      if ((right.totalStudents ?? 0) !== (left.totalStudents ?? 0)) {
        return (right.totalStudents ?? 0) - (left.totalStudents ?? 0);
      }

      if ((right.graduatesLatestYear ?? 0) !== (left.graduatesLatestYear ?? 0)) {
        return (right.graduatesLatestYear ?? 0) - (left.graduatesLatestYear ?? 0);
      }

      return left.name.localeCompare(right.name, "th");
    })
    .slice(0, 20);
}

function getDataSourceLabel() {
  const postGraduateSummary = recommenderData?.postGraduateSummary;
  if (!postGraduateSummary) {
    return "MHESI Open Data";
  }

  const labels = ["MHESI Open Data"];
  if (postGraduateSummary.graduatesYear) {
    labels.push(`ผู้สำเร็จ ${postGraduateSummary.graduatesYear}`);
  }
  if (postGraduateSummary.surveyYear) {
    labels.push(`ภาวะมีงานทำ ${postGraduateSummary.surveyYear}`);
  }

  return labels.join(" · ");
}

function renderRecommendations() {
  const recommendations = buildRecommendationResults();
  currentAreaFilterLabel = getAreaLabelByFilterValue(currentFilters.area);
  const postGraduateSummary = recommenderData?.postGraduateSummary;
  const employmentContext =
    postGraduateSummary?.employmentRatePct != null
      ? ` · อัตรามีงานทำจากผู้ตอบแบบสอบถามปี ${postGraduateSummary.surveyYear} ${formatPercent(
          postGraduateSummary.employmentRatePct
        )}`
      : "";

  provinceChipElement.textContent = currentAreaFilterLabel;
  provinceNameElement.textContent = "สถาบันที่แนะนำ";
  provinceDescriptionElement.textContent = `กรองด้วย ${getSelectedTrackLabel()} · ${getSelectedBudgetLabel()} · ${currentAreaFilterLabel}${employmentContext}`;
  provinceRegionElement.textContent = currentAreaFilterLabel;
  provinceCountElement.textContent = `${formatNumber(recommendations.length)} แห่ง`;
  provinceUpdatedElement.textContent = getDataSourceLabel();

  institutionListElement.replaceChildren();

  if (!recommendations.length) {
    const listItem = document.createElement("li");
    listItem.className = "institution-list__item";
    listItem.innerHTML = `
      <span class="institution-list__name">ไม่พบสถาบันที่ตรงตัวกรอง</span>
      <span class="institution-list__type">ลองเปลี่ยนสายเรียน งบประมาณ หรือพื้นที่</span>
    `;
    institutionListElement.appendChild(listItem);
    return;
  }

  recommendations.forEach((institution) => {
    const topTrack = institution.tracks?.[0]?.id ?? "other";
    const topProgram = institution.topPrograms?.[0]?.name ?? "ไม่ระบุหลักสูตรเด่น";
    const graduatesYearLabel = postGraduateSummary?.graduatesYear ?? "ล่าสุด";
    const graduateCount = Number(institution.graduatesLatestYear ?? 0);
    const graduateRatioLabel =
      typeof institution.graduateToStudentRatio === "number"
        ? ` · คิดเป็น ${formatPercent(institution.graduateToStudentRatio)} ของนักศึกษาปัจจุบัน`
        : "";
    const graduateOutcomeText =
      graduateCount > 0
        ? `ผลลัพธ์หลังจบ: ผู้สำเร็จปี ${graduatesYearLabel} ${formatNumber(
            graduateCount
          )} คน${graduateRatioLabel}`
        : "ผลลัพธ์หลังจบ: ยังไม่มีข้อมูลผู้สำเร็จสำหรับสถาบันนี้";
    const listItem = document.createElement("li");
    listItem.className = "institution-list__item";
    listItem.innerHTML = `
      <span class="institution-list__name">${institution.name}</span>
      <span class="institution-list__type">${institution.universityType}</span>
      <span class="institution-list__meta">${institution.province} · จำนวนนักศึกษา ${formatNumber(institution.totalStudents)}</span>
      <span class="institution-list__track">สายเด่น: ${getTrackLabel(topTrack)} · หลักสูตรเด่น: ${topProgram}</span>
      <span class="institution-list__budget">ต้นทุนต่อหัวต่อปี: ${formatBudget(institution.budgetMedianPerYear)}</span>
      <span class="institution-list__outcome">${graduateOutcomeText}</span>
    `;
    institutionListElement.appendChild(listItem);
  });
}

function populateFilterOptions() {
  if (!recommenderData) {
    return;
  }

  studyTrackSelect.replaceChildren();
  budgetFilterSelect.replaceChildren();
  areaFilterSelect.replaceChildren();

  const allTrackOption = document.createElement("option");
  allTrackOption.value = "all";
  allTrackOption.textContent = "ทั้งหมด";
  studyTrackSelect.appendChild(allTrackOption);

  recommenderData.tracks.forEach((track) => {
    const option = document.createElement("option");
    option.value = track.id;
    option.textContent = track.label;
    studyTrackSelect.appendChild(option);
  });

  const allBudgetOption = document.createElement("option");
  allBudgetOption.value = "all";
  allBudgetOption.textContent = "ทั้งหมด";
  budgetFilterSelect.appendChild(allBudgetOption);

  recommenderData.budgetBands.forEach((budget) => {
    const option = document.createElement("option");
    option.value = budget.id;
    option.textContent = budget.label;
    budgetFilterSelect.appendChild(option);
  });

  const allAreaOption = document.createElement("option");
  allAreaOption.value = "all";
  allAreaOption.textContent = "ทุกพื้นที่";
  areaFilterSelect.appendChild(allAreaOption);

  const regionOrder = ["north", "northeast", "central", "east", "west", "south"];
  const regionValues = Array.from(
    new Set(
      recommenderData.institutions
        .map((institution) => getRegionKeyFromProvinceName(institution.province))
        .filter((region) => region !== "unknown")
    )
  ).sort((left, right) => regionOrder.indexOf(left) - regionOrder.indexOf(right));

  regionValues.forEach((region) => {
    const option = document.createElement("option");
    option.value = `region:${region}`;
    option.textContent = REGION_LABELS[region] ?? region;
    areaFilterSelect.appendChild(option);
  });

  const provinceValues = Array.from(
    new Set(
      recommenderData.institutions
        .map((institution) => institution.province)
        .filter((provinceName) => provinceName)
    )
  ).sort((left, right) => left.localeCompare(right, "th"));

  provinceValues.forEach((provinceName) => {
    const option = document.createElement("option");
    option.value = `province:${provinceName}`;
    option.textContent = provinceName;
    areaFilterSelect.appendChild(option);
  });

  studyTrackSelect.value = currentFilters.track;
  budgetFilterSelect.value = currentFilters.budget;
  areaFilterSelect.value = currentFilters.area;
}

function applyRecommendationFilters() {
  currentFilters = {
    track: studyTrackSelect.value || "all",
    budget: budgetFilterSelect.value || "all",
    area: areaFilterSelect.value || "all",
  };
  renderRecommendations();
}

function getProvinceFeatureByName(provinceName) {
  if (!thailandGeoData) {
    return null;
  }

  const matchingFeatures = thailandGeoData.features.filter(
    (feature) => getProvinceName(feature) === provinceName
  );

  if (!matchingFeatures.length) {
    return null;
  }

  if (!currentMapState.path) {
    return matchingFeatures[0];
  }

  return matchingFeatures.reduce((largestFeature, feature) =>
    currentMapState.path.area(feature) > currentMapState.path.area(largestFeature)
      ? feature
      : largestFeature
  );
}

function getSearchMatch(query) {
  const normalizedQuery = query.trim().toLocaleLowerCase("th");

  if (!normalizedQuery || !thailandGeoData) {
    return null;
  }

  const features = thailandGeoData.features;
  const exactMatch = features.find(
    (feature) => getProvinceName(feature).toLocaleLowerCase("th") === normalizedQuery
  );

  if (exactMatch) {
    return getProvinceFeatureByName(getProvinceName(exactMatch));
  }

  return (
    features.find((feature) =>
      getProvinceName(feature).toLocaleLowerCase("th").includes(normalizedQuery)
    ) ?? null
  );
}

function populateProvinceSearch(features) {
  const provinceNames = Array.from(new Set(features.map((feature) => getProvinceName(feature)))).sort(
    (left, right) => left.localeCompare(right, "th")
  );

  provinceOptionsElement.replaceChildren();

  provinceNames.forEach((provinceName) => {
    const option = document.createElement("option");
    option.value = provinceName;
    provinceOptionsElement.appendChild(option);
  });

}

function updateProvinceVisualState() {
  if (!currentMapState.provincePaths || !currentMapState.labelGroups) {
    return;
  }

  currentMapState.provincePaths
    .classed("is-hovered", (feature) => getProvinceName(feature) === hoveredProvinceName)
    .classed("is-selected", (feature) => getProvinceName(feature) === selectedProvinceName)
    .attr("fill", (feature) => {
      const provinceName = getProvinceName(feature);

      if (provinceName === selectedProvinceName) {
        return getProvinceSelectedFill(feature);
      }

      if (provinceName === hoveredProvinceName) {
        return getProvinceHoverFill(feature);
      }

      return getProvinceFill(feature);
    });

  currentMapState.labelGroups
    .classed("is-hovered", (feature) => getProvinceName(feature) === hoveredProvinceName)
    .classed("is-selected", (feature) => getProvinceName(feature) === selectedProvinceName);
}

function selectProvince(provinceName, feature = null, syncAreaFilter = true) {
  const matchedFeature = feature ?? getProvinceFeatureByName(provinceName);

  if (!matchedFeature) {
    return;
  }

  hoveredProvinceName = "";
  selectedProvinceName = provinceName;
  provinceSearchInput.value = provinceName;

  if (syncAreaFilter && areaFilterSelect.querySelector(`option[value="province:${provinceName}"]`)) {
    areaFilterSelect.value = `province:${provinceName}`;
  }

  applyRecommendationFilters();
  updateProvinceVisualState();
  updateLabelScale(currentTransform.k);
}

function resetMapView(animate = true) {
  if (!currentMapState.zoomBehavior) {
    return;
  }

  const selection = animate ? mapSvg.transition().duration(500) : mapSvg;
  selection.call(currentMapState.zoomBehavior.transform, d3.zoomIdentity);
}

function focusProvince(feature, animate = true) {
  if (!currentMapState.zoomBehavior || !currentMapState.path) {
    return;
  }

  const [[x0, y0], [x1, y1]] = currentMapState.path.bounds(feature);
  const dx = Math.max(x1 - x0, 1);
  const dy = Math.max(y1 - y0, 1);
  const scale = Math.max(
    1.6,
    Math.min(6, 0.78 / Math.max(dx / currentMapState.width, dy / currentMapState.height))
  );
  const translateX = currentMapState.width / 2 - scale * ((x0 + x1) / 2);
  const translateY = currentMapState.height / 2 - scale * ((y0 + y1) / 2);
  const nextTransform = d3.zoomIdentity.translate(translateX, translateY).scale(scale);
  const selection = animate ? mapSvg.transition().duration(650) : mapSvg;

  selection.call(currentMapState.zoomBehavior.transform, nextTransform);
}

function boxesIntersect(left, right) {
  return !(
    left.right <= right.left ||
    left.left >= right.right ||
    left.bottom <= right.top ||
    left.top >= right.bottom
  );
}

function getBoxOverlapArea(left, right) {
  if (!boxesIntersect(left, right)) {
    return 0;
  }

  const width = Math.min(left.right, right.right) - Math.max(left.left, right.left);
  const height = Math.min(left.bottom, right.bottom) - Math.max(left.top, right.top);
  return width * height;
}

function clampValue(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function layoutProvinceLabels() {
  if (!currentMapState.labelGroups) {
    return;
  }

  const placedBoxes = [];
  const mapPadding = 6;
  const labelNodes = currentMapState.labelGroups.nodes().sort((leftNode, rightNode) => {
    const leftSelected = leftNode.classList.contains("is-selected") ? 1 : 0;
    const rightSelected = rightNode.classList.contains("is-selected") ? 1 : 0;

    if (leftSelected !== rightSelected) {
      return rightSelected - leftSelected;
    }

    return Number(rightNode.dataset.area || 0) - Number(leftNode.dataset.area || 0);
  });

  labelNodes.forEach((node) => {
    const group = d3.select(node);
    const rect = group.select("rect");
    const line = group.select("line");
    const rectX = Number(rect.attr("x") || 0);
    const rectY = Number(rect.attr("y") || 0);
    const rectWidth = Number(rect.attr("width") || 0);
    const rectHeight = Number(rect.attr("height") || 0);
    const anchorX = Number(node.dataset.anchorX || 0);
    const anchorY = Number(node.dataset.anchorY || 0);

    if (!rectWidth || !rectHeight) {
      group.attr("transform", `translate(${anchorX}, ${anchorY})`);
      line.attr("display", "none");
      return;
    }

    const offsetX = Math.max(rectWidth * 0.72, 18);
    const offsetY = Math.max(rectHeight * 0.9, 14);
    const candidateOffsets = [
      [0, 0],
      [0, -offsetY],
      [offsetX, 0],
      [-offsetX, 0],
      [0, offsetY],
      [offsetX * 0.86, -offsetY * 0.78],
      [-offsetX * 0.86, -offsetY * 0.78],
      [offsetX * 0.86, offsetY * 0.78],
      [-offsetX * 0.86, offsetY * 0.78],
      [0, -offsetY * 1.82],
      [offsetX * 1.46, 0],
      [-offsetX * 1.46, 0],
      [0, offsetY * 1.82],
      [offsetX * 1.18, -offsetY * 1.42],
      [-offsetX * 1.18, -offsetY * 1.42],
      [offsetX * 1.18, offsetY * 1.42],
      [-offsetX * 1.18, offsetY * 1.42],
    ];

    let bestPlacement = null;

    candidateOffsets.forEach(([dx, dy]) => {
      const candidateCenterX = anchorX + dx;
      const candidateCenterY = anchorY + dy;
      const candidateBox = {
        left: candidateCenterX + rectX,
        top: candidateCenterY + rectY,
        right: candidateCenterX + rectX + rectWidth,
        bottom: candidateCenterY + rectY + rectHeight,
      };

      let penalty = Math.abs(dx) + Math.abs(dy);

      penalty += Math.max(mapPadding - candidateBox.left, 0) * 14;
      penalty += Math.max(candidateBox.right - (currentMapState.width - mapPadding), 0) * 14;
      penalty += Math.max(mapPadding - candidateBox.top, 0) * 14;
      penalty += Math.max(candidateBox.bottom - (currentMapState.height - mapPadding), 0) * 14;

      placedBoxes.forEach((placedBox) => {
        penalty += getBoxOverlapArea(candidateBox, placedBox) * 30;
      });

      if (!bestPlacement || penalty < bestPlacement.penalty) {
        bestPlacement = {
          penalty,
          centerX: candidateCenterX,
          centerY: candidateCenterY,
          box: candidateBox,
        };
      }
    });

    const centerX = clampValue(bestPlacement.centerX, mapPadding, currentMapState.width - mapPadding);
    const centerY = clampValue(bestPlacement.centerY, mapPadding, currentMapState.height - mapPadding);
    const localAnchorX = anchorX - centerX;
    const localAnchorY = anchorY - centerY;
    const lineEndX = clampValue(localAnchorX, rectX, rectX + rectWidth);
    const lineEndY = clampValue(localAnchorY, rectY, rectY + rectHeight);
    const hasOffset = Math.abs(localAnchorX) > 6 || Math.abs(localAnchorY) > 6;

    group.attr("transform", `translate(${centerX}, ${centerY})`);

    line
      .attr("display", hasOffset ? null : "none")
      .attr("x1", localAnchorX)
      .attr("y1", localAnchorY)
      .attr("x2", lineEndX)
      .attr("y2", lineEndY);

    placedBoxes.push({
      left: centerX + rectX - 4,
      top: centerY + rectY - 4,
      right: centerX + rectX + rectWidth + 4,
      bottom: centerY + rectY + rectHeight + 4,
    });
  });
}

function updateLabelScale(zoomLevel) {
  if (!currentMapState.labelGroups) {
    return;
  }

  const safeZoomLevel = Math.max(zoomLevel, 1);
  currentMapState.labelGroups.attr("display", null).each(function () {
    const group = d3.select(this);
    const text = group.select("text");
    const rect = group.select("rect");
    const baseSize = Number(text.attr("data-base-size") || 8);
    const baseStroke = Number(text.attr("data-base-stroke") || 3);
    const centroidX = Number(group.attr("data-centroid-x") || 0);
    const centroidY = Number(group.attr("data-centroid-y") || 0);
    const anchorX = currentTransform.applyX(centroidX);
    const anchorY = currentTransform.applyY(centroidY);
    const zoomBoost = 1 + Math.log2(safeZoomLevel) * 0.31;
    const nextFontSize = Math.min(Math.max(baseSize * zoomBoost, 9.8), 17.2);
    const nextStrokeWidth = Math.min(Math.max(baseStroke * (0.92 + Math.log2(safeZoomLevel) * 0.2), 1.1), 2);

    group
      .attr("data-anchor-x", anchorX.toFixed(2))
      .attr("data-anchor-y", anchorY.toFixed(2))
      .attr("transform", `translate(${anchorX}, ${anchorY})`);

    text
      .attr("font-size", `${nextFontSize}px`)
      .attr("stroke-width", `${nextStrokeWidth}px`);

    const bbox = text.node().getBBox();
    const horizontalPadding = Math.max(nextFontSize * 0.28, 3.2);
    const verticalPadding = Math.max(nextFontSize * 0.14, 2.1);

    rect
      .attr("x", bbox.x - horizontalPadding)
      .attr("y", bbox.y - verticalPadding)
      .attr("width", bbox.width + horizontalPadding * 2)
      .attr("height", bbox.height + verticalPadding * 2)
      .attr("rx", Math.max(nextFontSize * 0.2, 3.2))
      .attr("ry", Math.max(nextFontSize * 0.2, 3.2));
  });

  layoutProvinceLabels();
}

// Show a small status message while loading or when the file is missing.
function setStatus(message = "", visible = true) {
  statusText.textContent = message;
  statusText.classList.toggle("is-hidden", !visible);
}

function setVisitorCountText(text, hint = "") {
  if (!visitorCountElement) {
    return;
  }

  visitorCountElement.textContent = text;
  visitorCountElement.title = hint;
}

function increaseLocalVisitorCount() {
  const currentCount = Number(localStorage.getItem(LOCAL_VISITOR_COUNTER_KEY) || "0");
  const safeCurrentCount = Number.isFinite(currentCount) && currentCount > 0 ? currentCount : 0;
  const nextCount = safeCurrentCount + 1;
  localStorage.setItem(LOCAL_VISITOR_COUNTER_KEY, String(nextCount));
  return nextCount;
}

function getCachedGlobalVisitorCount() {
  const cachedCount = Number(localStorage.getItem(VISITOR_COUNTER_CACHE_KEY) || "0");
  if (!Number.isFinite(cachedCount) || cachedCount <= 0) {
    return null;
  }
  return cachedCount;
}

function setCachedGlobalVisitorCount(count) {
  if (!Number.isFinite(count) || count <= 0) {
    return;
  }
  localStorage.setItem(VISITOR_COUNTER_CACHE_KEY, String(Math.round(count)));
}

async function fetchVisitorCountFromCounterApi() {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), VISITOR_COUNTER_TIMEOUT_MS);

  try {
    const endpoint = `https://api.counterapi.dev/v1/${encodeURIComponent(VISITOR_COUNTER_NAMESPACE)}/${encodeURIComponent(VISITOR_COUNTER_KEY)}/up`;
    const response = await fetch(endpoint, {
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`CounterAPI request failed: ${response.status}`);
    }

    const payload = await response.json();
    const nextCount = Number(payload?.value);

    if (!Number.isFinite(nextCount) || nextCount <= 0) {
      throw new Error("CounterAPI payload is invalid.");
    }

    return nextCount;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function updateVisitorCount() {
  if (!visitorCountElement) {
    return;
  }

  const cachedCount = getCachedGlobalVisitorCount();
  if (cachedCount) {
    setVisitorCountText(
      `${cachedCount.toLocaleString("th-TH")} ครั้ง`,
      "แสดงค่าล่าสุดที่เคยโหลดได้ (อาจไม่ใช่เวลาจริง)"
    );
  } else {
    setVisitorCountText("กำลังโหลด...");
  }

  try {
    const latestCount = await fetchVisitorCountFromCounterApi();
    setCachedGlobalVisitorCount(latestCount);
    setVisitorCountText(`${latestCount.toLocaleString("th-TH")} ครั้ง`, "นับจาก CounterAPI");
  } catch (error) {
    console.error("Unable to load global visitor count from CounterAPI:", error);

    if (cachedCount) {
      setVisitorCountText(
        `${cachedCount.toLocaleString("th-TH")} ครั้ง`,
        "แสดงค่าล่าสุดที่เคยโหลดได้ (CounterAPI ไม่พร้อมใช้งาน)"
      );
      return;
    }

    const localCount = increaseLocalVisitorCount();
    setVisitorCountText(
      `${localCount.toLocaleString("th-TH")} ครั้ง`,
      "แสดงค่าจำนวนเข้าชมเฉพาะอุปกรณ์นี้ (โหมดสำรอง)"
    );
  }
}

// Draw the map to match the current container size.
function renderMap(geoData) {
  const width = Math.max(frame.clientWidth - 40, 320);
  const height = Math.max(frame.clientHeight - 40, 320);
  const padding = 24;
  const responsiveConfig = getResponsiveMapConfig(width);
  const {
    minLabelSize,
    maxLabelSize,
    globalLabelZoom,
    maxZoom,
    labelScaleExponent,
    strokeScaleExponent,
    baseStroke,
  } = responsiveConfig;

  mapSvg.selectAll("*").remove();
  mapSvg.on(".zoom", null);
  mapSvg.attr("viewBox", `0 0 ${width} ${height}`);

  const projection = d3.geoMercator().fitExtent(
    [
      [padding, padding],
      [width - padding, height - padding],
    ],
    geoData
  );

  const path = d3.geoPath(projection);
  const mapLayer = mapSvg.append("g").attr("class", "map-layer");
  const provincesGroup = mapLayer.append("g");
  const labelsGroup = mapSvg.append("g").attr("class", "labels-layer");
  const labelFeatures = Array.from(
    geoData.features.reduce((featureMap, feature) => {
      const provinceName = getProvinceName(feature);
      const area = path.area(feature);
      const existingEntry = featureMap.get(provinceName);

      if (!existingEntry || area > existingEntry.area) {
        featureMap.set(provinceName, { feature, area });
      }

      return featureMap;
    }, new Map()).values(),
    ({ feature }) => feature
  );

  function getLabelMetrics(feature) {
    const provinceName = getProvinceName(feature);
    const labelLines = getProvinceLabelLines(provinceName);
    const [[x0, y0], [x1, y1]] = path.bounds(feature);
    const provinceWidth = Math.max(x1 - x0, 1);
    const provinceHeight = Math.max(y1 - y0, 1);
    const provinceArea = Math.max(path.area(feature), 1);
    const longestLineLength = Math.max(...labelLines.map((line) => line.length), 4);

    const widthBasedSize = provinceWidth / Math.max(longestLineLength * 1.12, 3.2);
    const heightBasedSize = provinceHeight / Math.max(labelLines.length * 1.5, 1.8);
    const areaBasedSize = Math.sqrt(provinceArea) * 0.28;

    const baseSize = Math.max(
      minLabelSize,
      Math.min(widthBasedSize, heightBasedSize, areaBasedSize, maxLabelSize)
    );

    return {
      baseSize,
      baseStroke,
      labelLines,
    };
  }

  // Render one SVG path per province.
  const provincePaths = provincesGroup
    .selectAll("path")
    .data(geoData.features)
    .join("path")
    .attr("class", "province")
    .attr("fill", (feature) => getProvinceFill(feature))
    .attr("d", path)
    .attr("aria-label", (feature) => getProvinceName(feature))
    .on("mouseenter", (_, feature) => {
      hoveredProvinceName = getProvinceName(feature);
      updateProvinceVisualState();
      updateLabelScale(currentTransform.k);
    })
    .on("mouseleave", () => {
      hoveredProvinceName = "";
      updateProvinceVisualState();
      updateLabelScale(currentTransform.k);
    })
    .on("click", (_, feature) => {
      const provinceName = getProvinceName(feature);
      selectProvince(provinceName, feature);
    });

  const labelGroups = labelsGroup
    .selectAll("g")
    .data(labelFeatures)
    .join((enter) => {
      const group = enter.append("g").attr("class", "province-label-group");
      group.append("line").attr("class", "province-label-leader");
      group.append("rect").attr("class", "province-label-bg");
      group.append("text").attr("class", "province-label");
      return group;
    })
    .attr("transform", (feature) => {
      const [x, y] = path.centroid(feature);
      return `translate(${x}, ${y})`;
    })
    .each(function (feature) {
      const { baseSize, baseStroke, labelLines } = getLabelMetrics(feature);
      const [centroidX, centroidY] = path.centroid(feature);
      const text = d3.select(this)
        .attr("data-centroid-x", centroidX.toFixed(2))
        .attr("data-centroid-y", centroidY.toFixed(2))
        .attr("data-area", path.area(feature).toFixed(2))
        .select("text")
        .attr("data-base-size", baseSize.toFixed(2))
        .attr("data-base-stroke", baseStroke.toFixed(2))
        .attr("data-scale-exponent", labelScaleExponent.toFixed(2))
        .attr("data-stroke-scale-exponent", strokeScaleExponent.toFixed(2))
        .attr("font-size", `${baseSize}px`);

      text.selectAll("tspan").remove();

      const topOffset = -((labelLines.length - 1) * 0.56);

      labelLines.forEach((line, index) => {
        text
          .append("tspan")
          .attr("x", 0)
          .attr("dy", index === 0 ? `${topOffset}em` : "1.14em")
          .text(line);
      });
    });

  // Enable zooming and dragging while keeping the map inside the SVG area.
  const zoom = d3
    .zoom()
    .scaleExtent([1, maxZoom])
    .extent([
      [0, 0],
      [width, height],
    ])
    .translateExtent([
      [0, 0],
      [width, height],
    ])
    .on("start", () => {
      mapSvg.classed("is-dragging", true);
    })
    .on("zoom", (event) => {
      currentTransform = event.transform;
      mapLayer.attr("transform", currentTransform);
      updateLabelScale(currentTransform.k);
    })
    .on("end", () => {
      mapSvg.classed("is-dragging", false);
    });

  currentMapState = {
    width,
    height,
    mapLayer,
    provincePaths,
    labelGroups,
    path,
    zoomBehavior: zoom,
  };

  updateProvinceVisualState();
  updateLabelScale(currentTransform.k);
  mapSvg.call(zoom).call(zoom.transform, currentTransform);
}

function normalizeInstitutionNameForMatch(name) {
  return String(name ?? "")
    .replace(/\s*\([^)]*\)\s*/g, "")
    .replace(/\s+/g, "")
    .trim();
}

function enrichInstitutionsWithRegions(dataset) {
  const institutions = dataset?.institutions ?? [];
  const provinceLookup = new Map();

  institutions.forEach((institution) => {
    provinceLookup.set(normalizeInstitutionNameForMatch(institution.name), institution.province);
  });

  return institutions.map((institution) => {
    if (institution.province) {
      return institution;
    }

    const matchedProvince =
      provinceLookup.get(normalizeInstitutionNameForMatch(institution.name)) ?? "ไม่ระบุจังหวัด";

    return {
      ...institution,
      province: matchedProvince,
    };
  });
}

// Load map + recommendation dataset and render once both are available.
async function loadMap() {
  setStatus("กำลังโหลดแผนที่และข้อมูลแนะนำ...", true);

  try {
    const [geoData, dataset] = await Promise.all([
      d3.json(GEOJSON_PATH),
      d3.json(RECOMMENDER_DATA_PATH),
    ]);

    if (!geoData?.features?.length) {
      throw new Error("GeoJSON file does not contain any features.");
    }

    if (!dataset?.institutions?.length) {
      throw new Error("Recommendation dataset is empty.");
    }

    thailandGeoData = geoData;
    recommenderData = {
      ...dataset,
      institutions: enrichInstitutionsWithRegions(dataset),
    };

    populateProvinceSearch(thailandGeoData.features);
    populateFilterOptions();
    studyTrackSelect.value = "all";
    budgetFilterSelect.value = "all";
    areaFilterSelect.value = "all";
    applyRecommendationFilters();
    renderMap(thailandGeoData);

    const defaultProvinceFeature = getProvinceFeatureByName(selectedProvinceName);
    if (defaultProvinceFeature) {
      selectProvince(selectedProvinceName, defaultProvinceFeature, true);
    }
    setStatus("", false);
  } catch (error) {
    console.error("Unable to load map/recommendation data:", error);
    setStatus(
      "โหลดข้อมูลไม่สำเร็จ ตรวจสอบไฟล์ /data/thailand.geojson และ /data/recommender_dataset.json แล้วลองใหม่อีกครั้ง",
      true
    );
  }
}

function handleProvinceSearch() {
  const matchedFeature = getSearchMatch(provinceSearchInput.value);

  if (!matchedFeature) {
    setStatus("ไม่พบจังหวัดที่ค้นหา ลองพิมพ์ชื่อจังหวัดใหม่อีกครั้ง", true);
    return;
  }

  setStatus("", false);
  selectProvince(getProvinceName(matchedFeature), matchedFeature);
  focusProvince(matchedFeature);
}

// Redraw the map when the layout changes so the SVG stays responsive.
const resizeObserver = new ResizeObserver(() => {
  if (thailandGeoData) {
    renderMap(thailandGeoData);
  }
});

resizeObserver.observe(frame);
provinceSearchSubmitButton.addEventListener("click", handleProvinceSearch);
provinceSearchInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    handleProvinceSearch();
  }
});
resetViewButton.addEventListener("click", () => {
  setStatus("", false);
  resetMapView();
  areaFilterSelect.value = "all";
  selectedProvinceName = "";
  provinceSearchInput.value = "";
  updateProvinceVisualState();
  applyRecommendationFilters();
});
studyTrackSelect.addEventListener("change", applyRecommendationFilters);
budgetFilterSelect.addEventListener("change", applyRecommendationFilters);
areaFilterSelect.addEventListener("change", () => {
  currentFilters.area = areaFilterSelect.value || "all";
  const selectedArea = areaFilterSelect.value;

  if (selectedArea.startsWith("province:")) {
    const provinceName = selectedArea.replace("province:", "");
    const matchedFeature = getProvinceFeatureByName(provinceName);
    if (matchedFeature) {
      selectedProvinceName = provinceName;
      provinceSearchInput.value = provinceName;
      updateProvinceVisualState();
      focusProvince(matchedFeature);
    }
  } else {
    selectedProvinceName = "";
    updateProvinceVisualState();
  }

  applyRecommendationFilters();
});
clearFiltersButton.addEventListener("click", () => {
  studyTrackSelect.value = "all";
  budgetFilterSelect.value = "all";
  areaFilterSelect.value = "all";
  selectedProvinceName = "";
  provinceSearchInput.value = "";
  updateProvinceVisualState();
  applyRecommendationFilters();
});
updateVisitorCount();
loadMap();
