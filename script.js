// 📍 Souřadnice Letohrad
const LETOHRAD_COORDS = [50.04229263166373, 16.515718020675035];
const INITIAL_ZOOM = 15;

// 🗺️ Inicializace mapy
const map = L.map('map').setView(LETOHRAD_COORDS, INITIAL_ZOOM);

// Podkladové dlaždice
const OpenStreetMap = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; OpenStreetMap'
});
const Ortofoto_CUZK = L.tileLayer.wms('https://geoportal.cuzk.cz/WMS_ORTOFOTO_PUB/WMService.aspx?', {
  layers: 'GR_ORTFOTORGB',
  format: 'image/jpeg',
  version: '1.3.0',
  attribution: '&copy; ČÚZK'
});
OpenStreetMap.addTo(map);

// Přepínač podkladových vrstev
const baseMaps = {
  '<img src="osm.png" class="basemap-thumb"><span class="basemap-label">OSM Base Map</span>': OpenStreetMap,
  '<img src="cuzk.png" class="basemap-thumb"><span class="basemap-label">ČÚZK - Ortofoto</span>': Ortofoto_CUZK
};
L.control.layers(baseMaps, {}, { collapsed: false }).addTo(map);
L.control.scale({ imperial: false, position: 'bottomleft' }).addTo(map);

// --- Připravené souřadnice pro ikonky (doplníš sám) ---
const iconLocations = [
 //{ coords: [16.514712548000034, 50.042398004000063], iconUrl: 'parkking.png' },
  // { coords: [lat, lng], iconUrl: 'budovy.png' },
  // { coords: [lat, lng], iconUrl: 'strelnice.png' }
];

// --- Přidání ikon na mapu defaultně ---
iconLocations.forEach(item => {
  const icon = L.icon({
    iconUrl: item.iconUrl,
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  });
  L.marker(item.coords, { icon: icon, pane: 'markerPane' }).addTo(map);
});

// --- Info marker v centru ---
L.marker(LETOHRAD_COORDS).addTo(map)
  .bindPopup("<h2>Biatlonový areál Letohrad</h2><p>Centrum mapy</p>");

// 🌍 Globální proměnné
const layerURLs = {
  komplet: "https://raw.githubusercontent.com/Dzejkob1/biathlon-letohrad-interactive--map/main/data/layers/komplet.geojson",
  horni: "https://raw.githubusercontent.com/Dzejkob1/biathlon-letohrad-interactive--map/main/data/layers/horni_kolo.geojson",
  dolni: "https://raw.githubusercontent.com/Dzejkob1/biathlon-letohrad-interactive--map/main/data/layers/dolni_kolo.geojson",
  nove: "https://raw.githubusercontent.com/Dzejkob1/biathlon-letohrad-interactive--map/main/data/layers/nove_kolo.geojson",
  podklad: "https://raw.githubusercontent.com/Dzejkob1/biathlon-letohrad-interactive--map/main/data/layers/podklad.geojson"
};

let layers = {};
let podkladLayer = null;
let podkladBounds = null;
let elevationChart = null;
let elevationMarker = null;

// --- Pany (pořadí vrstev) ---
map.createPane('podkladPane');
map.getPane('podkladPane').style.zIndex = 200;
map.getPane('podkladPane').style.pointerEvents = 'none';

map.createPane('lesPane');
map.getPane('lesPane').style.zIndex = 300;

map.createPane('polygonPane');
map.getPane('polygonPane').style.zIndex = 400;

// Pane pro marker nad všemi vrstvami
map.createPane('markerPane');
map.getPane('markerPane').style.zIndex = 10000;
map.getPane('markerPane').style.pointerEvents = 'none';

// --- Funkce pro návrat na areál ---
function resetMapView() {
  if (!podkladBounds) return;
  const adjustedBounds = podkladBounds.pad(-0.7);
  map.fitBounds(adjustedBounds);
  const center = podkladBounds.getCenter();
  map.setView(center, 17);
}

// --- Načtení podkladu ---
fetch(layerURLs.podklad)
  .then(res => res.json())
  .then(data => {
    podkladLayer = L.geoJSON(data, {
      style: {
        color: '#7f7f7fff',
        weight: 1,
        fillColor: '#e7e7e7ff',
        fillOpacity: 1
      },
      pane: 'podkladPane'
    }).addTo(map);

    podkladBounds = podkladLayer.getBounds();
    resetMapView();
  });

// --- Funkce pro načtení GeoJSON vrstvy ---
function loadGeoJSONLayer(url, options = {}) {
  return fetch(url)
    .then(res => res.json())
    .then(data => L.geoJSON(data, options))
    .catch(err => console.error("Chyba při načítání vrstvy:", err));
}

// --- Polygonové vrstvy ---
const polygonLayerList = {
  tribuna: { fillColor: '#9dc7eaff', fillOpacity: 0.6, color: '#a4a4a4ff', weight: 1, opacity: 0.8 },
  budovy: { fillColor: '#7d94c3ff', fillOpacity: 0.6, color: '#a4a4a4ff', weight: 1, opacity: 0.8 },
  strelnice: { fillColor: '#c1b9faff', fillOpacity: 0.6, color: '#a4a4a4ff', weight: 1, opacity: 0.8 },
  strel_stavy: { fillColor: '#3d6690ff', fillOpacity: 0.6, color: '#a4a4a4ff', weight: 1, opacity: 0.8 },
  parkoviste: { fillColor: '#2486e9ff', fillOpacity: 0.6, color: '#a4a4a4ff', weight: 1, opacity: 0.8 },
  nadrz: { fillColor: '#69b8f8ff', fillOpacity: 0.6, color: '#a4a4a4ff', weight: 1, opacity: 0.8 },
  les: { fillColor: '#d7f0d8ff', fillOpacity: 0.6, color: '#a4a4a4ff', weight: 1, opacity: 0.8 }
};

Object.entries(polygonLayerList).forEach(([name, style]) => {
  const pane = name === 'les' ? 'lesPane' : 'polygonPane';
  loadGeoJSONLayer(`https://raw.githubusercontent.com/Dzejkob1/biathlon-letohrad-interactive--map/main/data/layers/${name}.geojson`, { style, pane })
    .then(layer => layer.addTo(map));
});

// --- Checkbox vrstvy ---
function loadCheckboxLayers() {
  const checkboxConfigs = [
    { id: 'komplet', key: 'komplet', url: layerURLs.komplet, style: { color: '#ff2a00ff', weight: 4, opacity: 0.9 }, pane: 'polygonPane' },
    { id: 'hornikolo', key: 'horni', url: layerURLs.horni, style: { color: '#faa700ff', weight: 4, opacity: 0.9 }, pane: 'polygonPane' },
    { id: 'dolnikolo', key: 'dolni', url: layerURLs.dolni, style: { color: '#2d9700ff', weight: 4, opacity: 0.9 }, pane: 'polygonPane' },
    { id: 'novekolo', key: 'nove', url: layerURLs.nove, style: { color: '#6a1b9a', weight: 4, opacity: 0.9 }, pane: 'polygonPane' }
  ];

  Promise.all(checkboxConfigs.map(cfg =>
    loadGeoJSONLayer(cfg.url, { style: cfg.style, pane: cfg.pane })
      .then(layer => {
        layers[cfg.key] = layer;

        // uložíme latlngs pouze pro komplet
        if(cfg.key === "komplet") {
          layers[cfg.key].latlngs = layer.getLayers()[0].feature.geometry.coordinates.map(c => L.latLng(c[1], c[0]));
        }
      })
  )).then(() => {
    checkboxConfigs.forEach(cfg => {
      const checkbox = document.getElementById(cfg.id);
      checkbox.addEventListener("change", e => {
        if (e.target.checked) {
          layers[cfg.key].addTo(map);
          if (cfg.key === "komplet") loadElevationProfile(layers[cfg.key]);
        } else {
          if (map.hasLayer(layers[cfg.key])) map.removeLayer(layers[cfg.key]);
          if (cfg.key === "komplet") hideElevationChart();
        }
      });
    });
  });
}
loadCheckboxLayers();

// --- Liniové vrstvy ---
const lineLayerList = {
  okruh: { url: "data/layers/okruh.geojson", style: { color: '#1877b3ff', weight: 4, opacity: 1 }, pane: 'polygonPane' },
  silnice: { url: "data/layers/silnice.geojson", style: { color: '#505050ff', weight: 4, opacity: 0.7 }, pane: 'polygonPane' },
  cesty: { url: "data/layers/cesty.geojson", style: { color: '#7e7e7eff', weight: 3, opacity: 0.7 }, pane: 'polygonPane' },
  cyklostezka: { url: "data/layers/cyklostezka.geojson", style: { color: '#ad97b0ff', weight: 2, opacity: 0.7 }, pane: 'polygonPane' },
  pesiny: { url: "data/layers/pesiny.geojson", style: { color: '#83631dff', weight: 2, opacity: 0.7 }, pane: 'polygonPane' },
  podchod: { url: "data/layers/podchod.geojson", style: { color: '#e3e082ff', weight: 3, opacity: 0.7 }, pane: 'polygonPane' },
  potok: { url: "data/layers/potok.geojson", style: { color: '#2196f3', weight: 2, opacity: 0.7 }, pane: 'polygonPane' }
};

Object.entries(lineLayerList).forEach(([name, cfg]) => {
  loadGeoJSONLayer(`https://raw.githubusercontent.com/Dzejkob1/biathlon-letohrad-interactive--map/main/${cfg.url}`, { style: cfg.style, pane: cfg.pane })
    .then(layer => layer.addTo(map));
});

// --- Výškový profil s interaktivním markerem ---
function loadElevationProfile(geoLayer) {
  fetch("https://raw.githubusercontent.com/Dzejkob1/biathlon-letohrad-interactive--map/main/data/elevation/komplet_profile.json")
    .then(res => res.json())
    .then(data => showElevationChart(data, geoLayer));
}

function showElevationChart(data, geoLayer) {
  const ctx = document.getElementById("elevationChart").getContext("2d");
  document.getElementById("profileContainer").style.display = "block";

  const distance = data.map(p => p.FIRST_DIST / 1000); // km
  const elevation = data.map(p => p.FIRST_Z);

  if (elevationChart) elevationChart.destroy();

  elevationChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: distance.map(d => d.toFixed(2)),
      datasets: [{
        label: 'Výškový profil trati',
        data: elevation,
        borderColor: '#1976d2',
        backgroundColor: 'rgba(25,118,210,0.25)',
        fill: true,
        tension: 0.25,
        pointRadius: 3
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: { label: ctx => `${ctx.parsed.y.toFixed(1)} m n. m.` }
        },
        title: { display: true, text: 'Výškový profil trati (km / m n. m.)' }
      },
      interaction: { mode: 'index', intersect: false },
      scales: {
        x: { title: { display: true, text: 'Vzdálenost (km)' } },
        y: { title: { display: true, text: 'Nadmořská výška (m)' } }
      },
      onHover: (event, elements) => {
        if (!elements.length) return;
        const index = elements[0].index;
        updateMapMarker(index, geoLayer);
      }
    }
  });
}

// Marker na mapě
function updateMapMarker(index, geoLayer) {
  if (!geoLayer.latlngs) return;
  const point = geoLayer.latlngs[Math.min(index, geoLayer.latlngs.length-1)];
  if (!point) return;

  if (!elevationMarker) {
    elevationMarker = L.circleMarker(point, {
      radius: 6,
      color: '#ff2a00',
      fillColor: '#ff2a00',
      fillOpacity: 1,
      pane: 'markerPane'
    }).addTo(map);
  } else {
    elevationMarker.setLatLng(point);
  }
}

function hideElevationChart() {
  document.getElementById("profileContainer").style.display = "none";
  if (elevationMarker) {
    map.removeLayer(elevationMarker);
    elevationMarker = null;
  }
  if (elevationChart) {
    elevationChart.destroy();
    elevationChart = null;
  }
}

// --- Tlačítko návratu ---
document.getElementById("resetView").addEventListener("click", resetMapView);

// --- Info marker ---
L.marker(LETOHRAD_COORDS).addTo(map)
  .bindPopup("<h2>Biatlonový areál Letohrad</h2><p>Centrm mapy</p>");
