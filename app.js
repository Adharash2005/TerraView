/**
 * International Conflict Analysis & Prediction Platform
 * Core Application Engine (Vanilla JavaScript)
 * 
 * Features integrated:
 * - Three.js 3D Interactive Globe
 * - HTML5 Canvas API Risk Projection Graph
 * - Geolocation API Proximity Calculator
 * - Local Storage API & Session Storage API
 * - HTML5 Native Drag & Drop API
 * - JavaScript Event Handling: `input`, `change`, `mouseover`, `mouseout`, `submit`, `scroll`, `resize`
 */

// Initialize Lucide icons once DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) window.lucide.createIcons();
});

if (document.readyState !== 'loading' && window.lucide) {
  window.lucide.createIcons();
}

/* ==========================================================================
   1. SESSION STORAGE & SESSION TIMER
   ========================================================================== */
function initSessionStorage() {
  const sessionStartTime = sessionStorage.getItem('sessionStart') || new Date().toISOString();
  sessionStorage.setItem('sessionStart', sessionStartTime);

  const badge = document.getElementById('sessionStatusBadge');
  const timerEl = document.getElementById('sessionTimerText');

  if (badge) badge.style.display = 'inline-flex';

  if (timerEl) {
    const updateTimer = () => {
      const elapsedSec = Math.floor((new Date() - new Date(sessionStartTime)) / 1000);
      const mins = Math.floor(elapsedSec / 60);
      const secs = elapsedSec % 60;
      timerEl.textContent = `Session: ${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
    };
    updateTimer();
    setInterval(updateTimer, 1000);
  }
}

/* ==========================================================================
   2. THREE.JS 3D INTERACTIVE GLOBE RENDERER
   ========================================================================== */
let globeScene, globeCamera, globeRenderer, globeSphere, globePointsGroup, arcGroup;
let isDraggingGlobe = false;
let previousMousePosition = { x: 0, y: 0 };
let targetRotation = { x: 0.3, y: 0.8 };

const CONFLICT_HOTSPOTS = [
  { name: 'Kyiv (Eastern Europe)', lat: 50.45, lng: 30.52, risk: 8.8, color: 0x9e2a2b },
  { name: 'Middle East (Levant)', lat: 31.5, lng: 34.46, risk: 7.9, color: 0x9e2a2b },
  { name: 'Taiwan Strait', lat: 23.7, lng: 121.0, risk: 6.4, color: 0x435446 },
  { name: 'Sudan (Horn of Africa)', lat: 15.5, lng: 32.5, risk: 7.2, color: 0x2c3e50 },
  { name: 'Kashmir (South Asia)', lat: 34.08, lng: 74.79, risk: 6.8, color: 0x9e2a2b }
];

function latLngToVector3(lat, lng, radius) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
}

function generatePoliticalGlobeTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');

  // Oceans - clean light slate
  ctx.fillStyle = '#f1f5f9';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Latitude / Longitude Grid lines on canvas
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);

  // Equator
  const eqY = canvas.height / 2;
  ctx.beginPath();
  ctx.moveTo(0, eqY);
  ctx.lineTo(canvas.width, eqY);
  ctx.stroke();

  // Tropics (23.5 N / S)
  const tropicNY = ((90 - 23.5) / 180) * canvas.height;
  const tropicSY = ((90 + 23.5) / 180) * canvas.height;
  ctx.beginPath();
  ctx.moveTo(0, tropicNY); ctx.lineTo(canvas.width, tropicNY);
  ctx.moveTo(0, tropicSY); ctx.lineTo(canvas.width, tropicSY);
  ctx.stroke();

  ctx.setLineDash([]);

  if (!window.WORLD_BOUNDARIES || !Array.isArray(window.WORLD_BOUNDARIES)) {
    return new THREE.CanvasTexture(canvas);
  }

  // Curated Political Map Color Palette
  const politicalPalette = [
    '#e2e8f0', // Pearl Grey
    '#dcfce7', // Soft Sage Green
    '#fef3c7', // Warm Parchment
    '#e0e7ff', // Soft Sky Indigo
    '#fee2e2', // Soft Rose
    '#f3e8ff', // Subtle Lavender
    '#ecfdf5', // Soft Mint
    '#ffedd5', // Warm Cream
    '#f5f5f4', // Muted Stone
    '#ede9fe'  // Soft Violet
  ];

  window.WORLD_BOUNDARIES.forEach((country, index) => {
    const isIndia = (country.iso === 'IND' || country.name === 'India');
    const fillColor = isIndia ? '#dcfce7' : politicalPalette[index % politicalPalette.length];
    const strokeColor = isIndia ? '#9e2a2b' : '#475569';
    const strokeWidth = isIndia ? 2.5 : 1.0;

    ctx.fillStyle = fillColor;
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;

    country.contours.forEach(ring => {
      if (!ring || ring.length < 2) return;

      ctx.beginPath();
      for (let i = 0; i < ring.length; i++) {
        const lng = ring[i][0];
        const lat = ring[i][1];

        const x = ((lng + 180) / 360) * canvas.width;
        const y = ((90 - lat) / 180) * canvas.height;

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    });
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function init3DGlobe() {
  const container = document.getElementById('globeContainer');
  const canvas = document.getElementById('globeCanvas');
  if (!container || !canvas || typeof THREE === 'undefined') return;

  const width = container.clientWidth;
  const height = container.clientHeight;

  // Scene & Camera
  globeScene = new THREE.Scene();
  globeCamera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
  globeCamera.position.z = 240;

  // Renderer
  globeRenderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
  globeRenderer.setSize(width, height);
  globeRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // Base Globe Geometry with Political Canvas Texture
  const politicalTexture = generatePoliticalGlobeTexture();
  const sphereGeo = new THREE.SphereGeometry(75, 64, 64);
  const sphereMat = new THREE.MeshPhongMaterial({
    map: politicalTexture,
    color: 0xffffff,
    emissive: 0x111827,
    emissiveIntensity: 0.1,
    wireframe: false,
    flatShading: false,
    shininess: 20
  });
  globeSphere = new THREE.Mesh(sphereGeo, sphereMat);
  globeScene.add(globeSphere);

  // Wireframe Latitude/Longitude Grid
  const wireframeGeo = new THREE.SphereGeometry(75.4, 32, 24);
  const wireframeMat = new THREE.MeshBasicMaterial({
    color: 0xd1d5db,
    wireframe: true,
    transparent: true,
    opacity: 0.25
  });
  const wireframeMesh = new THREE.Mesh(wireframeGeo, wireframeMat);
  globeSphere.add(wireframeMesh);

  // Country Boundaries rendering on 3D globe surface
  if (window.WORLD_BOUNDARIES && Array.isArray(window.WORLD_BOUNDARIES)) {
    const countryLinesGroup = new THREE.Group();
    
    // Standard country boundary material
    const countryMat = new THREE.LineBasicMaterial({
      color: 0x1e293b, // Dark slate outline for sharp country boundary visibility across all continents
      transparent: true,
      opacity: 0.85
    });

    const standardSegments = [];

    window.WORLD_BOUNDARIES.forEach(country => {
      const isIndia = (country.iso === 'IND' || country.name === 'India');

      country.contours.forEach(ring => {
        if (!ring || ring.length < 2) return;

        if (isIndia) {
          // India Boundary: drawn as an explicit, prominent outline with POK, Gilgit-Baltistan & Aksai Chin as integral parts of India
          const indiaPoints = [];
          for (let i = 0; i < ring.length; i++) {
            const pt = ring[i];
            indiaPoints.push(latLngToVector3(pt[1], pt[0], 75.4));
          }
          const indiaGeo = new THREE.BufferGeometry().setFromPoints(indiaPoints);
          const indiaMat = new THREE.LineBasicMaterial({
            color: 0x9e2a2b, // Accent rust color for India's complete official border
            linewidth: 2,
            transparent: true,
            opacity: 0.95
          });
          const indiaLine = new THREE.LineLoop(indiaGeo, indiaMat);
          countryLinesGroup.add(indiaLine);
        } else {
          // Standard country boundary segments
          for (let i = 0; i < ring.length - 1; i++) {
            const p1 = ring[i];
            const p2 = ring[i + 1];
            const v1 = latLngToVector3(p1[1], p1[0], 75.32);
            const v2 = latLngToVector3(p2[1], p2[0], 75.32);
            standardSegments.push(v1.x, v1.y, v1.z);
            standardSegments.push(v2.x, v2.y, v2.z);
          }
        }
      });
    });

    if (standardSegments.length > 0) {
      const segGeo = new THREE.BufferGeometry();
      segGeo.setAttribute('position', new THREE.Float32BufferAttribute(standardSegments, 3));
      const segMesh = new THREE.LineSegments(segGeo, countryMat);
      countryLinesGroup.add(segMesh);
    }

    globeSphere.add(countryLinesGroup);
  }

  // Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
  globeScene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(150, 100, 200);
  globeScene.add(dirLight);

  // Hotspot Points Group
  globePointsGroup = new THREE.Group();
  CONFLICT_HOTSPOTS.forEach(spot => {
    const pos = latLngToVector3(spot.lat, spot.lng, 75.8);
    
    // Pin Marker Geometry
    const pinGeo = new THREE.SphereGeometry(2.2, 16, 16);
    const pinMat = new THREE.MeshBasicMaterial({ color: spot.color });
    const pinMesh = new THREE.Mesh(pinGeo, pinMat);
    pinMesh.position.copy(pos);
    globePointsGroup.add(pinMesh);

    // Pulse Ring Around Pin
    const ringGeo = new THREE.RingGeometry(2.8, 3.8, 24);
    const ringMat = new THREE.MeshBasicMaterial({ color: spot.color, side: THREE.DoubleSide, transparent: true, opacity: 0.7 });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.position.copy(pos);
    ringMesh.lookAt(new THREE.Vector3(0,0,0));
    globePointsGroup.add(ringMesh);
  });
  globeSphere.add(globePointsGroup);

  // Arcs between hotspots
  arcGroup = new THREE.Group();
  for (let i = 0; i < CONFLICT_HOTSPOTS.length - 1; i++) {
    const start = latLngToVector3(CONFLICT_HOTSPOTS[i].lat, CONFLICT_HOTSPOTS[i].lng, 76);
    const end = latLngToVector3(CONFLICT_HOTSPOTS[i+1].lat, CONFLICT_HOTSPOTS[i+1].lng, 76);
    
    const mid = start.clone().add(end).multiplyScalar(0.5).normalize().multiplyScalar(95);
    const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
    const points = curve.getPoints(40);
    const curveGeo = new THREE.BufferGeometry().setFromPoints(points);
    const curveMat = new THREE.LineBasicMaterial({ color: 0x9e2a2b, transparent: true, opacity: 0.4 });
    const curveLine = new THREE.Line(curveGeo, curveMat);
    arcGroup.add(curveLine);
  }
  globeSphere.add(arcGroup);

  // Mouse & Touch Drag Controls
  const onMouseDown = (e) => {
    isDraggingGlobe = true;
    previousMousePosition = { x: e.clientX || e.touches[0].clientX, y: e.clientY || e.touches[0].clientY };
  };

  const onMouseMove = (e) => {
    if (!isDraggingGlobe) return;
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    
    const deltaX = clientX - previousMousePosition.x;
    const deltaY = clientY - previousMousePosition.y;

    targetRotation.y += deltaX * 0.005;
    targetRotation.x += deltaY * 0.005;

    targetRotation.x = Math.max(-1.2, Math.min(1.2, targetRotation.x));

    previousMousePosition = { x: clientX, y: clientY };
  };

  const onMouseUp = () => { isDraggingGlobe = false; };

  container.addEventListener('mousedown', onMouseDown);
  container.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);

  container.addEventListener('touchstart', onMouseDown);
  container.addEventListener('touchmove', onMouseMove);
  window.addEventListener('touchend', onMouseUp);

  container.addEventListener('wheel', (e) => {
    e.preventDefault();
    globeCamera.position.z += e.deltaY * 0.1;
    globeCamera.position.z = Math.max(140, Math.min(350, globeCamera.position.z));
  }, { passive: false });

  // Focus Button Listeners
  document.querySelectorAll('.globe-focus-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const lat = parseFloat(btn.dataset.lat);
      const lng = parseFloat(btn.dataset.lng);
      rotateGlobeToLatLng(lat, lng);
    });
  });

  // Render Loop
  function animateGlobe() {
    requestAnimationFrame(animateGlobe);
    
    if (!isDraggingGlobe) {
      targetRotation.y += 0.0015; // Slow ambient rotation
    }

    globeSphere.rotation.y += (targetRotation.y - globeSphere.rotation.y) * 0.08;
    globeSphere.rotation.x += (targetRotation.x - globeSphere.rotation.x) * 0.08;

    globeRenderer.render(globeScene, globeCamera);
  }
  animateGlobe();
}

function rotateGlobeToLatLng(lat, lng) {
  if (!globeSphere) return;
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);

  targetRotation.x = phi - Math.PI / 2;
  targetRotation.y = -theta;
}

/* ==========================================================================
   3. GEOLOCATION API: Regional Proximity Radar
   ========================================================================== */
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return Math.round(R * c);
}

function handleGeolocationRadar() {
  const alertBox = document.getElementById('proximityAlertBox');
  const coordsText = document.getElementById('userCoordinatesText');
  const resultText = document.getElementById('proximityResultText');

  if (!navigator.geolocation) {
    if (alertBox) {
      alertBox.classList.remove('hidden');
      resultText.textContent = 'Geolocation API is not supported by your browser environment.';
    }
    return;
  }

  if (alertBox) {
    alertBox.classList.remove('hidden');
    resultText.textContent = 'Scanning satellite positioning coordinates...';
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const userLat = position.coords.latitude;
      const userLng = position.coords.longitude;

      // Find closest conflict hotspot
      let closestSpot = CONFLICT_HOTSPOTS[0];
      let minDistance = calculateHaversineDistance(userLat, userLng, closestSpot.lat, closestSpot.lng);

      CONFLICT_HOTSPOTS.forEach(spot => {
        const dist = calculateHaversineDistance(userLat, userLng, spot.lat, spot.lng);
        if (dist < minDistance) {
          minDistance = dist;
          closestSpot = spot;
        }
      });

      if (coordsText) coordsText.textContent = `LAT: ${userLat.toFixed(2)}° | LNG: ${userLng.toFixed(2)}°`;
      if (resultText) {
        resultText.innerHTML = `Your location is <strong class="text-neutral-900 font-bold">${minDistance.toLocaleString()} km</strong> from the nearest active monitored zone (<span class="text-rust-700 font-semibold">${closestSpot.name}</span>). Strategic filter automatically centered on this region.`;
      }

      // Rotate 3D globe to nearest hotspot
      rotateGlobeToLatLng(closestSpot.lat, closestSpot.lng);
      
      // Auto-set form region
      const focusRegionSelect = document.getElementById('focusRegion');
      if (focusRegionSelect) {
        if (closestSpot.name.includes('Kyiv')) focusRegionSelect.value = 'Eastern Europe';
        else if (closestSpot.name.includes('Middle East')) focusRegionSelect.value = 'Middle East';
        else if (closestSpot.name.includes('Taiwan')) focusRegionSelect.value = 'Indo-Pacific';
        else if (closestSpot.name.includes('Sudan')) focusRegionSelect.value = 'Sub-Saharan Africa';
      }
    },
    (error) => {
      if (coordsText) coordsText.textContent = 'LOCATION PERMISSION DENIED';
      if (resultText) {
        resultText.textContent = 'Unable to fetch precise location coordinates. Defaulting to global baseline metrics (Geneva HQ).';
      }
    }
  );
}

/* ==========================================================================
   4. CANVAS API: Dynamic 60fps Risk Trajectory Graph
   ========================================================================== */
const REGIONAL_RISK_DATA = {
  eastern_europe: {
    years: ['2016', '2018', '2020', '2022', '2024', '2026'],
    scores: [3.2, 4.1, 4.8, 9.2, 8.9, 8.8],
    baseline: [4.0, 4.0, 4.0, 4.0, 4.0, 4.0],
    summary: 'Eastern Europe: High escalation volatility with sustained military force deployment.'
  },
  middle_east: {
    years: ['2016', '2018', '2020', '2022', '2024', '2026'],
    scores: [6.5, 7.0, 6.8, 7.5, 8.4, 7.9],
    baseline: [5.0, 5.0, 5.0, 5.0, 5.0, 5.0],
    summary: 'Middle East: Elevated maritime corridor risk and regional proxy friction.'
  },
  indo_pacific: {
    years: ['2016', '2018', '2020', '2022', '2024', '2026'],
    scores: [4.0, 4.5, 5.2, 5.8, 6.7, 6.4],
    baseline: [4.5, 4.5, 4.5, 4.5, 4.5, 4.5],
    summary: 'Indo-Pacific: Steady long-term structural tension in maritime naval lanes.'
  },
  sub_saharan: {
    years: ['2016', '2018', '2020', '2022', '2024', '2026'],
    scores: [5.1, 5.4, 6.0, 6.8, 7.6, 7.2],
    baseline: [4.8, 4.8, 4.8, 4.8, 4.8, 4.8],
    summary: 'Sub-Saharan Africa: Conflict driven by resource security & internal displacement.'
  }
};

let activeRegionKey = 'eastern_europe';

function drawRiskCanvasChart() {
  const canvas = document.getElementById('riskTrendCanvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  // Use the parent element's dimensions to avoid feedback loop from canvas resize
  const parent = canvas.parentElement;
  const displayWidth = parent ? parent.offsetWidth : canvas.offsetWidth;
  const displayHeight = parent ? parent.offsetHeight : canvas.offsetHeight;

  // Set high-DPI resolution without reading canvas BoundingClientRect after mutation
  canvas.width = displayWidth * window.devicePixelRatio;
  canvas.height = displayHeight * window.devicePixelRatio;
  ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

  const width = displayWidth;
  const height = displayHeight;

  const dataset = REGIONAL_RISK_DATA[activeRegionKey];
  const padding = { top: 30, right: 30, bottom: 40, left: 45 };
  const graphWidth = width - padding.left - padding.right;
  const graphHeight = height - padding.top - padding.bottom;

  ctx.clearRect(0, 0, width, height);

  // Background Grid Lines
  ctx.strokeStyle = '#f3f4f6';
  ctx.lineWidth = 1;

  for (let i = 0; i <= 5; i++) {
    const y = padding.top + (graphHeight / 5) * i;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();

    // Y-Axis Labels
    const val = (10 - i * 2).toFixed(1);
    ctx.fillStyle = '#9ca3af';
    ctx.font = '10px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(val, padding.left - 10, y + 3);
  }

  const stepX = graphWidth / (dataset.years.length - 1);

  // Draw X-Axis Year Labels
  dataset.years.forEach((yr, idx) => {
    const x = padding.left + idx * stepX;
    ctx.fillStyle = '#6b7280';
    ctx.font = '11px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(yr, x, height - 12);
  });

  // Draw Baseline Line (Muted Olive)
  ctx.strokeStyle = '#435446';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  dataset.baseline.forEach((val, idx) => {
    const x = padding.left + idx * stepX;
    const y = padding.top + graphHeight * (1 - val / 10);
    if (idx === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  ctx.setLineDash([]);

  // Draw Escalation Score Line (Rust Red)
  ctx.strokeStyle = '#9e2a2b';
  ctx.lineWidth = 3;
  ctx.beginPath();

  const points = dataset.scores.map((val, idx) => ({
    x: padding.left + idx * stepX,
    y: padding.top + graphHeight * (1 - val / 10)
  }));

  points.forEach((pt, idx) => {
    if (idx === 0) ctx.moveTo(pt.x, pt.y);
    else ctx.lineTo(pt.x, pt.y);
  });
  ctx.stroke();

  // Gradient Fill under Line
  const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
  gradient.addColorStop(0, 'rgba(158, 42, 43, 0.15)');
  gradient.addColorStop(1, 'rgba(158, 42, 43, 0.0)');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  points.forEach(pt => ctx.lineTo(pt.x, pt.y));
  ctx.lineTo(points[points.length - 1].x, height - padding.bottom);
  ctx.lineTo(points[0].x, height - padding.bottom);
  ctx.closePath();
  ctx.fill();

  // Draw Data Point Nodes
  points.forEach((pt, idx) => {
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#9e2a2b';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Value label above node
    ctx.fillStyle = '#111827';
    ctx.font = 'bold 10px font-mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(dataset.scores[idx].toFixed(1), pt.x, pt.y - 10);
  });
}

/* ==========================================================================
   5. JAVASCRIPT EVENT HANDLING
   ========================================================================== */
function initEventHandlers() {
  
  // EVENT 1: `input` Event on Database Search Box
  const searchInput = document.getElementById('searchInput');
  const charCountLabel = document.getElementById('charCountLabel');
  const reportsGrid = document.getElementById('reportsGrid');
  const noMatchMsg = document.getElementById('noMatchMessage');

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const val = e.target.value.toLowerCase().trim();
      
      // Update character count display dynamically (raw length, not trimmed)
      if (charCountLabel) {
        charCountLabel.textContent = `${e.target.value.length} / 40 chars`;
      }

      // Live search filtering of crisis reports
      if (reportsGrid) {
        const cards = reportsGrid.querySelectorAll('article');
        let visibleCount = 0;

        cards.forEach(card => {
          const keywords = (card.dataset.keywords || '').toLowerCase();
          const text = card.textContent.toLowerCase();

          if (val === '' || keywords.includes(val) || text.includes(val)) {
            card.style.display = 'flex';
            visibleCount++;
          } else {
            card.style.display = 'none';
          }
        });

        if (noMatchMsg) {
          if (visibleCount === 0) noMatchMsg.classList.remove('hidden');
          else noMatchMsg.classList.add('hidden');
        }
      }
    });
  }

  // EVENT 2: `mouseover` & `mouseout` Events on Dimension Cards
  const dimensionCards = document.querySelectorAll('.dimension-card');
  dimensionCards.forEach(card => {
    card.addEventListener('mouseover', () => {
      const hoverDetails = card.querySelector('.hover-details');
      const iconBox = card.querySelector('.icon-box');

      if (hoverDetails) hoverDetails.classList.remove('hidden');
      if (iconBox) {
        iconBox.classList.remove('bg-neutral-100', 'text-neutral-800');
        iconBox.classList.add('bg-olive-800', 'text-white');
      }
      card.style.borderColor = '#435446';
    });

    card.addEventListener('mouseout', () => {
      const hoverDetails = card.querySelector('.hover-details');
      const iconBox = card.querySelector('.icon-box');

      if (hoverDetails) hoverDetails.classList.add('hidden');
      if (iconBox) {
        iconBox.classList.remove('bg-olive-800', 'text-white');
        iconBox.classList.add('bg-neutral-100', 'text-neutral-800');
      }
      card.style.borderColor = '#e5e7eb';
    });
  });

  // EVENT 3: `change` Event on Region Select Dropdown for Canvas
  const regionSelect = document.getElementById('regionSelect');
  const forecastSummaryText = document.getElementById('forecastSummaryText');

  if (regionSelect) {
    regionSelect.addEventListener('change', (e) => {
      activeRegionKey = e.target.value;
      
      // Update forecast summary copy
      if (forecastSummaryText && REGIONAL_RISK_DATA[activeRegionKey]) {
        forecastSummaryText.textContent = REGIONAL_RISK_DATA[activeRegionKey].summary;
      }

      // Redraw Canvas chart
      drawRiskCanvasChart();

      // Save active choice to Session Storage API
      sessionStorage.setItem('activeRegionSelect', activeRegionKey);
    });

    // Restore saved region selection from Session Storage
    const savedRegion = sessionStorage.getItem('activeRegionSelect');
    if (savedRegion && REGIONAL_RISK_DATA[savedRegion]) {
      regionSelect.value = savedRegion;
      activeRegionKey = savedRegion;
    }
  }

  // EVENT 4: `submit` Event on Research Form with Validation
  const researchForm = document.getElementById('researchForm');
  const formValidationHint = document.getElementById('formValidationHint');
  const dossierPlaceholder = document.getElementById('dossierDefaultPlaceholder');
  const dossierContent = document.getElementById('dossierContent');
  const dossierActionFooter = document.getElementById('dossierActionFooter');

  if (researchForm) {
    researchForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const region = document.getElementById('focusRegion').value;
      const timeframe = document.getElementById('timeHorizon').value;
      const category = document.getElementById('conflictCategory').value;
      const notes = document.getElementById('researchNotes').value.trim();

      if (notes.length < 10) {
        if (formValidationHint) formValidationHint.classList.remove('hidden');
        return;
      }
      if (formValidationHint) formValidationHint.classList.add('hidden');

      // Compute sample risk index based on parameters
      let riskScore = 7.5;
      if (category.includes('Sovereignty')) riskScore += 1.2;
      if (category.includes('Proxy')) riskScore += 0.8;
      if (region.includes('Eastern Europe')) riskScore += 0.5;

      const riskPercent = Math.min(96, Math.max(45, Math.round(riskScore * 10))) + '%';
      const treatyScore = (10 - riskScore * 0.85).toFixed(1) + ' / 10';

      // Populate output elements
      if (dossierPlaceholder) dossierPlaceholder.classList.add('hidden');
      if (dossierContent) dossierContent.classList.remove('hidden');
      if (dossierActionFooter) dossierActionFooter.classList.remove('hidden');

      const focusSummary = document.getElementById('dossierFocusSummary');
      const riskPercentEl = document.getElementById('dossierRiskPercent');
      const treatyScoreEl = document.getElementById('dossierTreatyScore');
      const notesResultEl = document.getElementById('dossierNotesResult');
      const timestampEl = document.getElementById('dossierTimestamp');

      if (focusSummary) focusSummary.textContent = `${region} · ${timeframe} · ${category}`;
      if (riskPercentEl) riskPercentEl.textContent = riskPercent;
      if (treatyScoreEl) treatyScoreEl.textContent = treatyScore;
      if (notesResultEl) notesResultEl.textContent = `"${notes}"`;
      if (timestampEl) timestampEl.textContent = 'COMPUTED: ' + new Date().toLocaleTimeString();

      // Store research model input in Session Storage API
      const sessionDossier = { region, timeframe, category, notes, riskPercent, treatyScore, date: new Date().toLocaleDateString() };
      sessionStorage.setItem('lastResearchQuery', JSON.stringify(sessionDossier));
    });
  }

  // EVENT 5: `scroll` Event for Sticky Header Effect
  const mainHeader = document.getElementById('mainHeader');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 40) {
      mainHeader.classList.add('shadow-sm');
    } else {
      mainHeader.classList.remove('shadow-sm');
    }
  });

  // EVENT 6: `resize` Event for Responsive Canvas Redraw
  window.addEventListener('resize', () => {
    drawRiskCanvasChart();
  });
}

/* ==========================================================================
   6. NATIVE DRAG AND DROP API
   ========================================================================== */
function initDragAndDrop() {
  const draggables = document.querySelectorAll('.draggable-item');
  const dropZone = document.getElementById('priorityDropZone');
  const droppedItemsList = document.getElementById('droppedItemsList');
  const dropPlaceholder = document.getElementById('dropPlaceholder');
  const itemCountEl = document.getElementById('dropItemCount');

  let draggedItem = null;

  draggables.forEach(item => {
    item.addEventListener('dragstart', (e) => {
      draggedItem = item;
      e.dataTransfer.setData('text/plain', item.dataset.id);
      item.classList.add('opacity-50');
    });

    item.addEventListener('dragend', () => {
      item.classList.remove('opacity-50');
      draggedItem = null;
    });
  });

  if (dropZone) {
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', () => {
      dropZone.classList.remove('drag-over');
    });

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('drag-over');

      if (draggedItem) {
        const title = draggedItem.dataset.title;
        const cat = draggedItem.dataset.cat;

        // Check if already added
        const existing = droppedItemsList.querySelector(`[data-id="${draggedItem.dataset.id}"]`);
        if (!existing) {
          if (dropPlaceholder) dropPlaceholder.classList.add('hidden');

          const node = document.createElement('div');
          node.className = 'p-3 bg-neutral-50 rounded border border-gray-200 flex justify-between items-center text-xs';
          node.dataset.id = draggedItem.dataset.id;
          node.dataset.title = title;
          node.innerHTML = `
            <div>
              <span class="font-bold text-neutral-900 block">${title}</span>
              <span class="text-[10px] text-neutral-500">Category: ${cat}</span>
            </div>
            <button class="remove-drop-item text-neutral-400 hover:text-rust-700 font-bold transition">✕</button>
          `;

          node.querySelector('.remove-drop-item').addEventListener('click', () => {
            node.remove();
            updateDropCount();
          });

          droppedItemsList.appendChild(node);
          updateDropCount();
        }
      }
    });
  }

  function updateDropCount() {
    const items = droppedItemsList.children;
    if (itemCountEl) itemCountEl.textContent = `${items.length} Indicators Added`;
    if (items.length === 0 && dropPlaceholder) {
      dropPlaceholder.classList.remove('hidden');
    }
  }

  // Clear Deck Button
  const clearDeckBtn = document.getElementById('clearDeckBtn');
  if (clearDeckBtn) {
    clearDeckBtn.addEventListener('click', () => {
      droppedItemsList.innerHTML = '';
      updateDropCount();
    });
  }

  // Save Deck to Local Storage API
  const saveDeckBtn = document.getElementById('saveDeckBtn');
  if (saveDeckBtn) {
    saveDeckBtn.addEventListener('click', () => {
      const items = Array.from(droppedItemsList.children).map(child => ({
        id: child.dataset.id,
        title: child.dataset.title
      }));

      if (items.length === 0) return;

      const existingDecks = JSON.parse(localStorage.getItem('savedDecks') || '[]');
      existingDecks.push({
        date: new Date().toLocaleString(),
        items: items
      });

      localStorage.setItem('savedDecks', JSON.stringify(existingDecks));
      updateSavedCountBadge();

      saveDeckBtn.innerHTML = '<i data-lucide="check" class="w-3.5 h-3.5"></i><span>Deck Saved!</span>';
      if (window.lucide) window.lucide.createIcons();
      setTimeout(() => {
        saveDeckBtn.innerHTML = '<i data-lucide="save" class="w-3.5 h-3.5"></i><span>Save Strategic Deck</span>';
        if (window.lucide) window.lucide.createIcons();
      }, 2000);
    });
  }
}

/* ==========================================================================
   7. LOCAL STORAGE API: Saved Dossiers & Drawer Manager
   ========================================================================== */
function initLocalStorageManager() {
  const saveBtn = document.getElementById('saveFocusToLocalBtn');
  const saveFeedback = document.getElementById('saveFeedbackText');

  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      const focusSummary = document.getElementById('dossierFocusSummary').textContent;
      const riskPercent = document.getElementById('dossierRiskPercent').textContent;
      const treatyScore = document.getElementById('dossierTreatyScore').textContent;
      const notes = document.getElementById('dossierNotesResult').textContent;

      const newDossier = {
        id: 'dossier_' + Date.now(),
        summary: focusSummary,
        risk: riskPercent,
        treaty: treatyScore,
        notes: notes,
        timestamp: new Date().toLocaleString()
      };

      const savedList = JSON.parse(localStorage.getItem('savedDossiers') || '[]');
      savedList.unshift(newDossier);
      localStorage.setItem('savedDossiers', JSON.stringify(savedList));

      updateSavedCountBadge();
      renderSavedDossiersDrawer();

      if (saveFeedback) {
        saveFeedback.classList.remove('hidden');
        setTimeout(() => saveFeedback.classList.add('hidden'), 2500);
      }
    });
  }

  // Drawer Open/Close Listeners
  const drawer = document.getElementById('dossiersDrawer');
  const openDrawerBtn = document.getElementById('openDossierBtn');
  const closeDrawerBtn = document.getElementById('closeDrawerBtn');
  const clearStorageBtn = document.getElementById('clearLocalStorageBtn');

  if (openDrawerBtn && drawer) {
    openDrawerBtn.addEventListener('click', () => {
      renderSavedDossiersDrawer();
      drawer.style.display = 'flex';
      drawer.style.justifyContent = 'flex-end';
      drawer.classList.remove('hidden');
    });
  }

  if (closeDrawerBtn && drawer) {
    closeDrawerBtn.addEventListener('click', () => {
      drawer.style.display = 'none';
      drawer.classList.add('hidden');
    });
  }

  if (clearStorageBtn) {
    clearStorageBtn.addEventListener('click', () => {
      localStorage.removeItem('savedDossiers');
      localStorage.removeItem('savedDecks');
      updateSavedCountBadge();
      renderSavedDossiersDrawer();
    });
  }

  updateSavedCountBadge();
}

function updateSavedCountBadge() {
  const dossiers = JSON.parse(localStorage.getItem('savedDossiers') || '[]');
  const decks = JSON.parse(localStorage.getItem('savedDecks') || '[]');
  const total = dossiers.length + decks.length;
  
  const badge = document.getElementById('savedCountBadge');
  if (badge) badge.textContent = total;
}

function renderSavedDossiersDrawer() {
  const container = document.getElementById('savedDossiersContainer');
  const emptyState = document.getElementById('emptySavedState');
  if (!container) return;

  const dossiers = JSON.parse(localStorage.getItem('savedDossiers') || '[]');
  const decks = JSON.parse(localStorage.getItem('savedDecks') || '[]');

  container.innerHTML = '';

  if (dossiers.length === 0 && decks.length === 0) {
    if (emptyState) emptyState.classList.remove('hidden');
    return;
  }

  if (emptyState) emptyState.classList.add('hidden');

  // Render Saved Dossiers
  dossiers.forEach((dos, idx) => {
    const el = document.createElement('div');
    el.className = 'p-4 bg-neutral-50 rounded border border-gray-200 text-xs space-y-2';
    el.innerHTML = `
      <div class="flex justify-between items-center text-[10px] font-mono text-neutral-400">
        <span>RESEARCH DOSSIER #${idx + 1}</span>
        <span>${dos.timestamp}</span>
      </div>
      <div class="font-serif font-bold text-sm text-neutral-900">${dos.summary}</div>
      <div class="flex space-x-4 text-[11px]">
        <span class="text-rust-700 font-bold">Escalation: ${dos.risk}</span>
        <span class="text-olive-800 font-bold">Treaty Score: ${dos.treaty}</span>
      </div>
      <p class="text-[11px] text-neutral-600 italic line-clamp-2">${dos.notes}</p>
      <div class="pt-2 flex justify-end">
        <button class="delete-dos-btn text-[10px] text-rust-700 hover:underline font-semibold" data-id="${dos.id}">Remove</button>
      </div>
    `;

    el.querySelector('.delete-dos-btn').addEventListener('click', () => {
      const updated = dossiers.filter(d => d.id !== dos.id);
      localStorage.setItem('savedDossiers', JSON.stringify(updated));
      updateSavedCountBadge();
      renderSavedDossiersDrawer();
    });

    container.appendChild(el);
  });

  // Render Saved Strategic Decks
  decks.forEach((deck, idx) => {
    const el = document.createElement('div');
    el.className = 'p-4 bg-olive-50 rounded border border-olive-200 text-xs space-y-2';
    el.innerHTML = `
      <div class="flex justify-between items-center text-[10px] font-mono text-olive-800">
        <span>STRATEGIC DECK #${idx + 1}</span>
        <span>${deck.date}</span>
      </div>
      <div class="font-semibold text-neutral-900">${deck.items.length} Indicators Compiled</div>
      <ul class="list-disc list-inside text-[11px] text-neutral-700 space-y-0.5">
        ${deck.items.map(it => `<li>${it.title}</li>`).join('')}
      </ul>
    `;
    container.appendChild(el);
  });
}

/* ==========================================================================
   8. APPLICATION INITIALIZATION
   ========================================================================== */
window.addEventListener('load', () => {
  initSessionStorage();
  init3DGlobe();
  drawRiskCanvasChart();
  initEventHandlers();
  initDragAndDrop();
  initLocalStorageManager();

  // Radar buttons initialization
  const navRadarBtn = document.getElementById('navProximityBtn');
  const heroRadarBtn = document.getElementById('heroProximityTrigger');

  if (navRadarBtn) navRadarBtn.addEventListener('click', handleGeolocationRadar);
  if (heroRadarBtn) heroRadarBtn.addEventListener('click', handleGeolocationRadar);
});
