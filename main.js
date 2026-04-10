const GEOJSON_PATH = "/data/thailand.geojson";
const mapSvg = d3.select("#map");
const statusText = document.querySelector("#status");
const frame = document.querySelector(".map-frame");
const provinceNameElement = document.querySelector("#province-name");
const provinceDescriptionElement = document.querySelector("#province-description");
const provinceRegionElement = document.querySelector("#province-region");
const provinceCountElement = document.querySelector("#province-count");
const provinceUpdatedElement = document.querySelector("#province-updated");
const institutionListElement = document.querySelector("#institution-list");
const provinceChipElement = document.querySelector("#province-chip");

let thailandGeoData = null;
let currentTransform = d3.zoomIdentity;
let selectedProvinceName = "กรุงเทพมหานคร";

// Tune interaction and label sizing for each device range.
function getResponsiveMapConfig(width) {
  if (width <= 480) {
    return {
      minLabelSize: 18,
      maxLabelSize: 18,
      globalLabelZoom: 5.4,
      maxZoom: 10,
      labelScaleExponent: 1.85,
      strokeScaleExponent: 1.5,
      baseStroke: 3.2,
    };
  }

  if (width <= 768) {
    return {
      minLabelSize: 28,
      maxLabelSize: 28,
      globalLabelZoom: 4.8,
      maxZoom: 10,
      labelScaleExponent: 1.8,
      strokeScaleExponent: 1.45,
      baseStroke: 4.6,
    };
  }

  if (width <= 1024) {
    return {
      minLabelSize: 40,
      maxLabelSize: 40,
      globalLabelZoom: 4.25,
      maxZoom: 9,
      labelScaleExponent: 1.75,
      strokeScaleExponent: 1.45,
      baseStroke: 6.2,
    };
  }

  return {
    minLabelSize: 52,
    maxLabelSize: 52,
    globalLabelZoom: 4,
    maxZoom: 8,
    labelScaleExponent: 1.7,
    strokeScaleExponent: 1.45,
    baseStroke: 8,
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

const MOCK_PROVINCE_DATA = {
  กรุงเทพมหานคร: {
    description:
      "จังหวัดตัวอย่างสำหรับเดโมข้อมูลสถาบันในเมืองใหญ่ โดยเน้นสถาบันอุดมศึกษา โรงพยาบาล และหน่วยงานภาครัฐ",
    updatedAt: "Updated just now",
    institutions: [
      { name: "จุฬาลงกรณ์มหาวิทยาลัย", type: "มหาวิทยาลัย" },
      { name: "มหาวิทยาลัยธรรมศาสตร์ ศูนย์ท่าพระจันทร์", type: "มหาวิทยาลัย" },
      { name: "โรงพยาบาลศิริราช", type: "โรงพยาบาล" },
      { name: "ศูนย์เยาวชนกรุงเทพมหานคร (ไทย-ญี่ปุ่น)", type: "ศูนย์บริการสาธารณะ" },
    ],
  },
  เชียงใหม่: {
    description: "ตัวอย่างข้อมูลสถาบันเด่นในจังหวัดเชียงใหม่สำหรับทดสอบการแสดงผลรายการ",
    updatedAt: "Updated 2 mins ago",
    institutions: [
      { name: "มหาวิทยาลัยเชียงใหม่", type: "มหาวิทยาลัย" },
      { name: "มหาวิทยาลัยแม่โจ้", type: "มหาวิทยาลัย" },
      { name: "โรงพยาบาลมหาราชนครเชียงใหม่", type: "โรงพยาบาล" },
      { name: "อุทยานวิทยาศาสตร์ภาคเหนือ", type: "ศูนย์วิจัยและนวัตกรรม" },
    ],
  },
  ขอนแก่น: {
    description: "ตัวอย่างข้อมูลของจังหวัดศูนย์กลางภาคอีสาน เหมาะสำหรับเดโมสถาบันการศึกษาและสุขภาพ",
    updatedAt: "Updated 5 mins ago",
    institutions: [
      { name: "มหาวิทยาลัยขอนแก่น", type: "มหาวิทยาลัย" },
      { name: "โรงพยาบาลศรีนครินทร์", type: "โรงพยาบาล" },
      { name: "วิทยาลัยอาชีวศึกษาขอนแก่น", type: "วิทยาลัย" },
      { name: "ศูนย์ประชุมและแสดงสินค้านานาชาติ ขอนแก่น", type: "ศูนย์ประชุม" },
    ],
  },
  ชลบุรี: {
    description: "ตัวอย่างข้อมูลจังหวัดเศรษฐกิจภาคตะวันออก พร้อมรายชื่อสถาบันสำหรับเดโม",
    updatedAt: "Updated 8 mins ago",
    institutions: [
      { name: "มหาวิทยาลัยบูรพา", type: "มหาวิทยาลัย" },
      { name: "โรงพยาบาลชลบุรี", type: "โรงพยาบาล" },
      { name: "วิทยาลัยเทคนิคพัทยา", type: "วิทยาลัย" },
      { name: "ศูนย์การเรียนรู้ EEC", type: "ศูนย์เรียนรู้" },
    ],
  },
  ภูเก็ต: {
    description: "ตัวอย่างข้อมูลจังหวัดท่องเที่ยวภาคใต้ พร้อมสถาบันสำคัญเพื่อใช้จำลองหน้ารายละเอียด",
    updatedAt: "Updated 12 mins ago",
    institutions: [
      { name: "มหาวิทยาลัยสงขลานครินทร์ วิทยาเขตภูเก็ต", type: "มหาวิทยาลัย" },
      { name: "โรงพยาบาลวชิระภูเก็ต", type: "โรงพยาบาล" },
      { name: "วิทยาลัยอาชีวศึกษาภูเก็ต", type: "วิทยาลัย" },
      { name: "ศูนย์นวัตกรรมการท่องเที่ยวภูเก็ต", type: "ศูนย์นวัตกรรม" },
    ],
  },
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
  const rawProvinceName = getRawProvinceName(feature);
  return THAI_PROVINCE_NAMES[rawProvinceName] ?? rawProvinceName;
}

// Resolve the palette color for each province.
function getProvinceFill(feature) {
  const rawProvinceName = getRawProvinceName(feature);
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
  const rawProvinceName = getRawProvinceName(feature);
  const regionKey = PROVINCE_REGIONS[rawProvinceName] ?? "unknown";
  return REGION_LABELS[regionKey] ?? REGION_LABELS.unknown;
}

function createFallbackProvinceData(provinceName, regionLabel) {
  return {
    description: `ข้อมูลจำลองของจังหวัด${provinceName} สำหรับทดสอบ flow การกดจังหวัดแล้วแสดงรายละเอียดด้านข้าง`,
    updatedAt: "Demo generated",
    institutions: [
      { name: `สำนักงานศึกษาธิการจังหวัด${provinceName}`, type: "หน่วยงานภาครัฐ" },
      { name: `โรงพยาบาลประจำจังหวัด${provinceName}`, type: "โรงพยาบาล" },
      { name: `วิทยาลัยอาชีวศึกษาจังหวัด${provinceName}`, type: "วิทยาลัย" },
      { name: `ศูนย์บริการประชาชน${provinceName}`, type: `ศูนย์บริการ ${regionLabel}` },
    ],
  };
}

// Render the selected province's mock detail data into the side panel.
function renderProvinceDetails(provinceName, feature) {
  const regionLabel = feature ? getProvinceRegionLabel(feature) : REGION_LABELS.unknown;
  const provinceData =
    MOCK_PROVINCE_DATA[provinceName] ?? createFallbackProvinceData(provinceName, regionLabel);

  selectedProvinceName = provinceName;
  provinceChipElement.textContent = provinceName;
  provinceNameElement.textContent = provinceName;
  provinceDescriptionElement.textContent = provinceData.description;
  provinceRegionElement.textContent = regionLabel;
  provinceCountElement.textContent = `${provinceData.institutions.length} แห่ง`;
  provinceUpdatedElement.textContent = provinceData.updatedAt;

  institutionListElement.replaceChildren();

  provinceData.institutions.forEach((institution) => {
    const listItem = document.createElement("li");
    listItem.className = "institution-list__item";
    listItem.innerHTML = `
      <span class="institution-list__name">${institution.name}</span>
      <span class="institution-list__type">${institution.type}</span>
    `;
    institutionListElement.appendChild(listItem);
  });
}

// Show a small status message while loading or when the file is missing.
function setStatus(message = "", visible = true) {
  statusText.textContent = message;
  statusText.classList.toggle("is-hidden", !visible);
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
  const labelsGroup = mapLayer.append("g");

  // Fit each label to the size of its province instead of using one global font size.
  function getLabelMetrics(feature) {
    const provinceName = getProvinceName(feature);
    const [[x0, y0], [x1, y1]] = path.bounds(feature);
    const provinceWidth = Math.max(x1 - x0, 1);
    const provinceHeight = Math.max(y1 - y0, 1);
    const provinceArea = Math.max(path.area(feature), 1);

    const widthBasedSize = provinceWidth / Math.max(provinceName.length * 2.8, 6);
    const heightBasedSize = provinceHeight * 0.09;
    const areaBasedSize = Math.sqrt(provinceArea) * 0.09;

    const baseSize = Math.max(
      minLabelSize,
      Math.min(widthBasedSize, heightBasedSize, areaBasedSize, maxLabelSize)
    );

    let minZoom = globalLabelZoom;

    if (baseSize < 1.35) {
      minZoom = 7;
    } else if (baseSize < 1.6) {
      minZoom = 6;
    } else if (baseSize < 1.9) {
      minZoom = 5;
    }

    return {
      baseSize,
      baseStroke,
      minZoom,
    };
  }

  // Keep label size readable even when the map is zoomed in.
  function updateLabelScale(zoomLevel) {
    const safeZoomLevel = Math.max(zoomLevel, 1);
    const fontScale = safeZoomLevel ** labelScaleExponent;
    const strokeScale = safeZoomLevel ** strokeScaleExponent;

    labelsGroup
      .selectAll("text")
      .attr("display", function () {
        const minZoom = Number(this.dataset.minZoom || globalLabelZoom);
        return safeZoomLevel >= minZoom ? null : "none";
      })
      .attr("font-size", function () {
        const baseSize = Number(this.dataset.baseSize || minLabelSize);
        return `${Math.max(baseSize / fontScale, 0.45)}px`;
      })
      .attr("stroke-width", function () {
        const baseStroke = Number(this.dataset.baseStroke || 1.1);
        return `${Math.max(baseStroke / strokeScale, 0.08)}px`;
      });
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
    .on("mouseenter", function (_, feature) {
      const provinceName = getProvinceName(feature);
      const isSelected = provinceName === selectedProvinceName;

      d3.select(this)
        .classed("is-hovered", true)
        .attr("fill", isSelected ? getProvinceSelectedFill(feature) : getProvinceHoverFill(feature));
    })
    .on("mouseleave", function (_, feature) {
      const provinceName = getProvinceName(feature);
      const isSelected = provinceName === selectedProvinceName;

      d3.select(this)
        .classed("is-hovered", false)
        .attr("fill", isSelected ? getProvinceSelectedFill(feature) : getProvinceFill(feature));
    })
    .on("click", (_, feature) => {
      const provinceName = getProvinceName(feature);
      console.log(provinceName);
      renderProvinceDetails(provinceName, feature);
      provincePaths
        .classed("is-selected", (item) => getProvinceName(item) === provinceName)
        .attr("fill", (item) =>
          getProvinceName(item) === provinceName ? getProvinceSelectedFill(item) : getProvinceFill(item)
        );
    });

  provincePaths
    .classed("is-selected", (feature) => getProvinceName(feature) === selectedProvinceName)
    .attr("fill", (feature) =>
      getProvinceName(feature) === selectedProvinceName ? getProvinceSelectedFill(feature) : getProvinceFill(feature)
    );

  // Place a text label at the center of each province.
  labelsGroup
    .selectAll("text")
    .data(geoData.features)
    .join("text")
    .attr("class", "province-label")
    .attr("x", (feature) => path.centroid(feature)[0])
    .attr("y", (feature) => path.centroid(feature)[1])
    .attr("dy", "0.35em")
    .each(function (feature) {
      const { baseSize, baseStroke, minZoom } = getLabelMetrics(feature);

      d3.select(this)
        .attr("data-base-size", baseSize.toFixed(2))
        .attr("data-base-stroke", baseStroke.toFixed(2))
        .attr("data-min-zoom", minZoom.toFixed(2));
    })
    .text((feature) => getProvinceName(feature));

  updateLabelScale(currentTransform.k);

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

  mapSvg.call(zoom).call(zoom.transform, currentTransform);
}

// Load the local GeoJSON file and render it once it is available.
async function loadMap() {
  setStatus("Loading Thailand map...", true);

  try {
    const geoData = await d3.json(GEOJSON_PATH);

    if (!geoData?.features?.length) {
      throw new Error("GeoJSON file does not contain any features.");
    }

    thailandGeoData = geoData;
    renderMap(thailandGeoData);
    const defaultProvinceFeature = thailandGeoData.features.find(
      (feature) => getProvinceName(feature) === selectedProvinceName
    );
    renderProvinceDetails(selectedProvinceName, defaultProvinceFeature);
    setStatus("", false);
  } catch (error) {
    console.error("Unable to load Thailand GeoJSON:", error);
    setStatus(
      "Unable to load /data/thailand.geojson. Please place the file in the data folder and run this project with a local server.",
      true
    );
  }
}

// Redraw the map when the layout changes so the SVG stays responsive.
const resizeObserver = new ResizeObserver(() => {
  if (thailandGeoData) {
    renderMap(thailandGeoData);
  }
});

resizeObserver.observe(frame);
loadMap();
