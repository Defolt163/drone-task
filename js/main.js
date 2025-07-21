const reportBlock = document.querySelector('.report')
const overflow = document.querySelector('.overflow')
const reportButton = document.querySelector('.report_button')
const xmarkReport = document.getElementById('xmarkReport')

let reportBlockStatus = false
reportButton.addEventListener('click', () => {
  if(!reportBlockStatus){
    reportBlockStatus = true
    reportBlock.classList.toggle('open')
    overflow.classList.toggle('open')
    document.body.style.overflow = 'hidden';
  }else if(reportBlockStatus){
    reportBlockStatus = false
    reportBlock.classList.remove('open')
    overflow.classList.remove('open')
    document.body.style.overflow = '';
  }
})
overflow.addEventListener('click', () => {
    reportBlockStatus = false
    reportBlock.classList.remove('open')
    overflow.classList.remove('open')
    document.body.style.overflow = '';
})
xmarkReport.addEventListener('click', () => {
    reportBlockStatus = false
    reportBlock.classList.remove('open')
    overflow.classList.remove('open')
    document.body.style.overflow = '';
})

// УПРАВЛЕНИЕ СЛОЯМИ
const zonesControlCheckbox = document.getElementById('zonesControlCheckbox')
zonesControlCheckbox.addEventListener('change', function () {
  if (this.checked) {
    zonesControl(true); // функция, когда чекбокс включён
  } else {
    zonesControl(false); // функция, когда чекбокс выключен
  }
})
const dronesPathCheckbox = document.getElementById('dronesPathCheckbox')
dronesPathCheckbox.addEventListener('change', function () {
  if (this.checked) {
    controlDronePath(true); // функция, когда чекбокс включён
  } else {
    controlDronePath(false); // функция, когда чекбокс выключен
  }
})
const heatmapCheckbox = document.getElementById('heatmapCheckbox')
heatmapCheckbox.addEventListener('change', function () {
  if (this.checked) {
    controlHeatmap(true)
  } else {
    controlHeatmap(false)
  }
})

const dronesEventsCheckbox = document.getElementById('dronesEventsCheckbox')
dronesEventsCheckbox.addEventListener('change', function () {
  if (this.checked) {
    controlWarnMarkers(true)
  } else {
    controlWarnMarkers(false)
  }
})

// Функции для слоев
function controlWarnMarkers(status) {
  viewer.entities.values.forEach(entity => {
    if (
      entity.name &&
      (entity.name.includes("Падение") ||
       entity.name.includes("Потеря") ||
       entity.name.includes("Точка"))
    ) {
      entity.show = status;
    }
  });
}

function controlHeatmap(status) {
  Object.keys(zonesData).forEach(zone => {
    const entity = viewer.entities.getById(zone);
    if (entity && entity.polygon) {
      entity.polygon.fill = !status ? false : true;
      entity.polygon.outline = !status ? true : false;
    }
  });
}

function controlDronePath(status){
  viewer.entities.values.forEach(entity => {
    if (entity.id.includes("-path")) {
      entity.show = status;
    }
  });
}

function zonesControl(status){
  Object.keys(zonesData).forEach(zone =>{
    const entity = viewer.entities.getById(zone)
    if (entity) {
      entity.show = status;
    }
  })
}
// Your access token can be found at: https://ion.cesium.com/tokens.
    // Replace `your_access_token` with your Cesium ion access token.

Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIwYTQ2MTQ2Ny01ZGQ3LTQyZDEtOThiYS03NzczNTU0NjlmMGIiLCJpZCI6MzE4NDc5LCJpYXQiOjE3NTE2MTg1MTN9.PhUSbgbBWYde8UL2pE3SRCZ_hgVq-HKYoHeX7K6v9Hk';

// Initialize the Cesium Viewer in the HTML element with the `cesiumContainer` ID.
const viewer = new Cesium.Viewer('cesiumContainer', {
  terrain: Cesium.Terrain.fromWorldTerrain(),
});    

// Fly the camera to San Francisco at the given longitude, latitude, and height.
viewer.camera.flyTo({
  destination: Cesium.Cartesian3.fromDegrees(50.117078, 53.195070, 1400),
  orientation: {
    heading: Cesium.Math.toRadians(0.0),
    pitch: Cesium.Math.toRadians(-15.0),
  }
});

/* function generateHeatmap(dronesData){

  let bounds = {
    west: 50.05,
    east: 50.35,
    south: 53.13,
    north: 53.35
  };
  
  // init heatmap
  let heatMap = CesiumHeatmap.create(viewer, bounds, {
    radius: 30,
    maxOpacity: 0.9,
    scaleRadius: true
  });

  const coordMap = new Map();

  Object.values(dronesData).forEach(drone => {
    drone.forEach(p => {
      const lon = p.position[1];
      const lat = p.position[0];
      const key = `${lat.toFixed(5)},${lon.toFixed(5)}`;
  
      if (!coordMap.has(key)) {
        coordMap.set(key, { x: lon, y: lat, value: 0 });
      } else {
        coordMap.get(key).value += 1;
      }
    });
  });
  
  const heatmapData = Array.from(coordMap.values());
  let valueMin = 0;
  let valueMax = Math.max(...heatmapData.map(p => p.value));

  heatMap.setWGS84Data(valueMin, valueMax, heatmapData);
  
  // 2. Камера на зону
  viewer.camera.flyTo({
    destination: Cesium.Rectangle.fromDegrees(bounds.west, bounds.south, bounds.east, bounds.north)
  });
} */

function interpolatePoints(p1, p2, stepMeters = 30) {
    const from = turf.point([p1[1], p1[0]]);
    const to = turf.point([p2[1], p2[0]]);
    const distance = turf.distance(from, to, { units: 'meters' });
    const line = turf.lineString([from.geometry.coordinates, to.geometry.coordinates]);
    const points = [];
  
    for (let i = 0; i < distance; i += stepMeters) {
      const interpolated = turf.along(line, i, { units: 'meters' });
      const [lon, lat] = interpolated.geometry.coordinates;
      points.push([lat.toFixed(5), lon.toFixed(5)]);
    }
  
    return points;
  }
  
  let pointCounts = {};
  
  for (const droneId in dronesData) {
    const path = dronesData[droneId];
  
    for (let i = 0; i < path.length - 1; i++) {
      const p1 = path[i].position;
      const p2 = path[i + 1].position;
  
      const interpolatedPoints = interpolatePoints(p1, p2);
  
      for (const [lat, lon] of interpolatedPoints) {
        const key = `${lat},${lon}`;
        pointCounts[key] = (pointCounts[key] || 0) + 1;
      }
    }
  }
  
  // Преобразуем в формат CesiumHeatmap
    let heatmapData = [];
    let maxValue = 0;
    
    for (const key in pointCounts) {
      const [lat, lon] = key.split(',').map(Number);
      const value = pointCounts[key];
      heatmapData.push({ x: lon, y: lat, value });
      if (value > maxValue) maxValue = value;
    }
    
    // Heatmap setup
    let bounds = { west: 50.05, east: 50.35, south: 53.13, north: 53.35 };
    
    let heatMap = CesiumHeatmap.create(viewer, bounds, {
      maxOpacity: 0.3
    });
    
    heatMap.setWGS84Data(1, maxValue, heatmapData);
    
    viewer.camera.flyTo({
      destination: Cesium.Rectangle.fromDegrees(bounds.west, bounds.south, bounds.east, bounds.north)
    });
  


function configureClock(data, globalStartTime) {
  let globalStopTime = globalStartTime;

  for (const key in data) {
    const lastTime = data[key].at(-1).time;
    const stopCandidate = Cesium.JulianDate.addSeconds(globalStartTime, lastTime, new Cesium.JulianDate());
    if (Cesium.JulianDate.lessThan(globalStopTime, stopCandidate)) {
      globalStopTime = stopCandidate;
    }
  }

  viewer.clock.startTime = globalStartTime.clone();
  viewer.clock.stopTime = globalStopTime.clone();
  viewer.clock.currentTime = globalStartTime.clone();
  viewer.clock.clockRange = Cesium.ClockRange.LOOP_STOP;
  viewer.clock.multiplier = 1;
  viewer.clock.shouldAnimate = true;
}

function clearAllDrones(dronesData) {
  Object.keys(dronesData).forEach(key => {
    viewer.entities.removeById(key + '-path');
    viewer.entities.removeById(key + '-point');
  });
}

let dronesReport = [];

function drawDroneRoute(droneData, selectedDrone, globalStartTime, commandType){

  const routePositions = droneData.map(p =>
    Cesium.Cartesian3.fromDegrees(p.position[1], p.position[0], p.altitude)
  );

  const property = new Cesium.SampledPositionProperty();

  droneData.forEach(p => {
    const time = Cesium.JulianDate.addSeconds(globalStartTime, p.time, new Cesium.JulianDate());
    const pos = Cesium.Cartesian3.fromDegrees(p.position[1], p.position[0], p.altitude);
    property.addSample(time, pos);
  });

  viewer.entities.add({
    id: selectedDrone + '-path',
    name: selectedDrone + '-path',
    polyline: {
      positions: routePositions,
      width: 3,
      material: Cesium.Color.YELLOW
    }
  });
  if(commandType !== 'checkbox'){
    viewer.entities.add({
      id: selectedDrone + '-point',
      position: property,
      //point: { pixelSize: 10, color: Cesium.Color.WHITE },
      model: {
        uri: "../public/CesiumDrone.glb",
        minimumPixelSize: 64,
        maximumScale: 20000,
      },
      label: {
        text: selectedDrone,
        font: "14px sans-serif",
        fillColor: Cesium.Color.WHITE,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        pixelOffset: new Cesium.Cartesian2(0, -20)
      },
      orientation: new Cesium.VelocityOrientationProperty(property)
    });
  }
}

const selectZoneOption = document.querySelector('.zones_toolbar'); // тулбар выбора зоны
let zonesData = []
let countDronesInsideZone = {}
await fetch('zones.json')
  .then(response => response.json())
  .then(data => {
    zonesData = data
    
    Object.keys(zonesData).forEach(key => {
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = key;
      selectZoneOption.appendChild(opt);
    });
    loadDronePaths()
})
  // Получение массива с дронами
let dronesData = []
let droneZonePasses = {};

//console.log("droneZonePasses", droneZonePasses)
let currentDroneZone = []
let selectedDrone = "allDrones"

const selectDroneOption = document.querySelector('.drone_toolbar'); // тулбар выбора дрона
async function loadDronePaths(){
  fetch('drones.json')
  .then(response => response.json())
  .then(data => {
    dronesData = data
    console.log("DATA DRONES", dronesData)
    generateHeatmap(dronesData)

    Object.keys(dronesData).forEach(key => {
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = key;
      selectDroneOption.appendChild(opt);
    });

    Object.keys(zonesData).forEach(zone =>{
      Object.keys(dronesData).forEach(key => {
        console.log("DROE KEY2", dronesData[key])
        let droneTimeArray = []
        for (let i of dronesData[key]) {
          droneTimeArray.push([i.time, [i.position[0], i.position[1], i.altitude], key])
        }
        checkDroneZoneTime(droneTimeArray, zone)
        console.log('droneTimeArray', droneTimeArray)
        let dronePathArray = []
        for (let i of dronesData[key]) {
          dronePathArray.push([i.position[0], i.position[1], i.altitude, key])
        }
        //console.log("isPointInPolygon", )
        if (isPointInPolygon(dronePathArray, zonesData[zone], zone) === 'inside') {
          currentDroneZone = zone
          if (!countDronesInsideZone[zone]) {
            countDronesInsideZone[zone] = 1
          } else {
            countDronesInsideZone[zone]++;
          }
          if (!droneZonePasses[zone]) {
            droneZonePasses[zone] = [key];
          } else if (!droneZonePasses[zone].includes(key)) {
            droneZonePasses[zone].push(key);
          }
        }
      })
      drawZones(zonesData[zone], zone)
      //console.log('droneZonePasses', droneZonePasses)
    })

    selectDroneOption.addEventListener('change', () => {
      selectedDrone = selectDroneOption.value;
      const globalStartTime = Cesium.JulianDate.now();

      clearAllDrones(dronesData);

      if (selectedDrone === "allDrones") {
        configureClock(data, globalStartTime);
        for (const key in data) {
          drawDroneRoute(data[key], key, globalStartTime);
        }
      } else {
        const droneData = data[selectedDrone];
        configureClock({ [selectedDrone]: droneData }, globalStartTime);
        drawDroneRoute(droneData, selectedDrone, globalStartTime);
      }
    });
    selectDroneOption.value = "allDrones";
    selectDroneOption.dispatchEvent(new Event('change'));
  }).catch(error => {
    console.error("Ошибка загрузки JSON:", error);
  });
}

function isPointInPolygon(point, polygon, zoneName){
  for (const key of point){
    if(key[2] > (polygon.altitude + polygon.height)){
      console.log("Дрон не в зоне")
      dronesReport.push({
        "type": "Drone without a zone",
        "droneName": key[3],
        "coords": [key[1],key[0],key[2]],
        "zone": "None"
      })
      return "outside";
    }
  }

  let points = turf.points(point)
  let searchWithin = turf.polygon([polygon.area])
  let ptsWithin = turf.pointsWithinPolygon(points, searchWithin);
  if (ptsWithin.features.length !== 0){
    console.log("ptsWithin.features", ptsWithin.features)
    lineInterselect(point, polygon.area, zoneName)
    checkDroneHeight(point, polygon, zoneName)
    return 'inside'
  }
}

/* function lineInterselect(dronePath, zoneBorder){
  let droneLine = turf.lineString(dronePath);
  let zoneLine = turf.lineString(zoneBorder);
  let intersects = turf.lineIntersect(droneLine, zoneLine);
  let addedPoint = null
  if(intersects.features.length !== 0){
    console.log("intersectionCoords", intersects.features.length)
    for(let point = 0; point < intersects.features.length; point++){
      for(let dronePart = 0; dronePart < dronePath.length - 1; dronePart++){
        let p1 = turf.lineString([[dronePath[dronePart][0], dronePath[dronePart][1]],[dronePath[dronePart + 1][0],dronePath[dronePart + 1][1]]]) // отрезок пути дрона
        let intersectionCoords = intersects.features[point].geometry.coordinates; // [lon, lat] точка пересечения линий
        var intersectsTest = turf.lineIntersect(p1, zoneLine);
        console.log('intersectionCoords1', dronePart)
        if(intersectsTest.features.length !== 0 && addedPoint !== dronePart){
          const totalDist = turf.length(p1, { units: 'meters' })
          let droneDirPartStart = turf.lineString([[dronePath[dronePart][0], dronePath[dronePart][1]], intersectionCoords])
          console.log("Используемые intersectionCoords", dronePart, [dronePath[dronePart][0], dronePath[dronePart][1]], intersectionCoords)
          const partDist = turf.length(droneDirPartStart, { units: 'meters' });
          const t = partDist / totalDist
          const altitude = dronePath[dronePart][2] + t * (dronePath[dronePart + 1][2] - dronePath[dronePart][2])
          console.log(`intersectsTest высота пересечение ${point}`, altitude)
          viewer.entities.add({
            name: "Точка выхода",
            position: Cesium.Cartesian3.fromDegrees(intersects.features[point].geometry.coordinates[1], intersects.features[point].geometry.coordinates[0], altitude),
            point: {
              pixelSize: 8,
              color: Cesium.Color.ORANGE
            },
            label: {
              text: `Точка выхода`,
              font: "12px sans-serif",
              fillColor: Cesium.Color.ORANGE,
              verticalOrigin: Cesium.VerticalOrigin.TOP,
              pixelOffset: new Cesium.Cartesian2(0, -10)
            }
          })
        }
      }
    }
  }
} */

function lineInterselect(dronePath, zoneBorder, zoneName) {
  let zoneLine = turf.lineString(zoneBorder);
  let addedPoints = new Set();

  // разделение пути дрона на отрезки
  for (let dronePart = 0; dronePart < dronePath.length - 1; dronePart++) {

    let start = dronePath[dronePart]; // первая точка
    let end = dronePath[dronePart + 1]; // вторая точка

    let segment = turf.lineString([[start[0], start[1]], [end[0], end[1]]]);
    let intersects = turf.lineIntersect(segment, zoneLine);

    for (let feature of intersects.features) {
      let intersectionCoords = feature.geometry.coordinates; // [lon, lat]

      let key = intersectionCoords.join(',');
      if (addedPoints.has(key)) continue;
      addedPoints.add(key);

      const totalDist = turf.length(segment, { units: 'meters' }); // расстояние полного отрезка
      const segmentToIntersection = turf.lineString([[start[0], start[1]], intersectionCoords]);
      const partDist = turf.length(segmentToIntersection, { units: 'meters' }); // расстояние отрезка с пересечением
      const t = partDist / totalDist; // процент пройденного пути

      const altitude = start[2] + t * (end[2] - start[2]); // линейная интерполяция

      dronesReport.push({
        "type": dronePart % 2 === 0 ? "Drone Returned the Area" : "Drone Left the Area",
        "droneName": dronePath[dronePart][3],
        "coords": [intersectionCoords[1], intersectionCoords[0], altitude],
        "zone": zoneName
      })

      viewer.entities.add({
        name: dronePart % 2 === 0 ? `Точка входа ${dronePath[dronePart][3]}` : `Точка выхода ${dronePath[dronePart][3]}`,
        position: Cesium.Cartesian3.fromDegrees(intersectionCoords[1], intersectionCoords[0], altitude),
        model: {
          uri: "../public/arrow.glb",
          minimumPixelSize: 64,
        },
        label: {
          text: dronePart % 2 === 0 ? `Точка входа ${dronePath[dronePart][3]}` : `Точка выхода ${dronePath[dronePart][3]}`,
          font: "12px sans-serif",
          fillColor: Cesium.Color.PINK,
          verticalOrigin: Cesium.VerticalOrigin.TOP,
          pixelOffset: new Cesium.Cartesian2(0, -10)
        }
      });
    }
  }
  droneReport()
}

function checkDroneHeight(dronePath, zone, zoneName) {
  const zoneAltitude = zone.altitude; // Нижняя граница зоны
  const reportedDrones = new Set();
  // Ищем пересечение на каждом отрезке пути
  for (let i = 0; i < dronePath.length - 1; i++) {
    const start = [dronePath[i][1], dronePath[i][0], dronePath[i][2]]; // Текущая точка
    const end = [dronePath[i + 1][1], dronePath[i + 1][0], dronePath[i + 1][2]]; // Следующая точка

    const alt1 = start[2]; // Высота начальной точки
    const alt2 = end[2];   // Высота конечной точки
    console.log("Пересечение:", alt1, alt2, dronePath[i][3]);

    // Проверяем, пересекают ли обе высоты зону, где высота < 1м от нижней границы
    if ((alt1 - zoneAltitude < 1 && alt2 - zoneAltitude >= 1) || (alt1 - zoneAltitude >= 1 && alt2 - zoneAltitude < 1)) {
      // Если пересечение есть, вычисляем точку t
      const t = (zoneAltitude + 1 - alt1) / (alt2 - alt1);

      // Линейная интерполяция координат
      const lon = start[0] + t * (end[0] - start[0]);
      const lat = start[1] + t * (end[1] - start[1]);

      console.log("Пересечение на пути дрона:", lat, lon, zoneAltitude, dronePath[i][3]);
      if (!reportedDrones.has(dronePath[i][3])) {
        reportedDrones.add(dronePath[i][3]);
        dronesReport.push({
          "type": "Drone Fall",
          "droneName": dronePath[i][3],
          "coords": [lat, lon, zoneAltitude],
          "zone": zoneName
        })
      }

      // Можно добавить метку в Cesium или визуализировать на карте:
      viewer.entities.add({
        name: `Падение дрона ${dronePath[i][3]}`,
        position: Cesium.Cartesian3.fromDegrees(lon, lat, zoneAltitude),
        point: {
          pixelSize: 10,
          color: Cesium.Color.RED
        },
        label: {
          text: `Падение дрона ${dronePath[i][3]}`,
          font: "12px sans-serif",
          fillColor: Cesium.Color.RED,
          verticalOrigin: Cesium.VerticalOrigin.TOP,
          pixelOffset: new Cesium.Cartesian2(0, -10)
        }
      });
    }
  }
  droneReport()
}

function checkDroneZoneTime(droneTime, zoneName) {
  console.log("checkDroneZoneTime", droneTime)
  const reportedDrones = new Set();
  for (let i = 0; i < droneTime.length - 1; i++) {
    const p1 = droneTime[i][0]; // Текущая точка
    const p2 = droneTime[i + 1][0]; // Следующая точка

    console.log("p2", p2)

    if (p2 - p1 > 10) {
      let lat = droneTime[i][1][1],
      lon = droneTime[i][1][0],
      alt = droneTime[i][1][2]
      console.log("потеря сигнала", droneTime[i][2]);
      if (!reportedDrones.has(droneTime[i][2])) {
        reportedDrones.add(droneTime[i][2]);
        dronesReport.push({
          "type": "Drone No Signal",
          "droneName": droneTime[i][2],
          "coords": [lat, lon, alt],
          "zone": zoneName
        })
      }
      // Можно добавить метку в Cesium или визуализировать на карте:
      viewer.entities.add({
        name: `Потеря сигнала ${droneTime[i][2]}`,
        position: Cesium.Cartesian3.fromDegrees(lat, lon, alt),
        point: {
          pixelSize: 10,
          color: Cesium.Color.ORANGE
        },
        label: {
          text: `Потеря сигнала ${droneTime[i][2]}`,
          font: "12px sans-serif",
          fillColor: Cesium.Color.ORANGE,
          verticalOrigin: Cesium.VerticalOrigin.TOP,
          pixelOffset: new Cesium.Cartesian2(0, -10)
        }
      });
    }
  }
  droneReport()
}


/* viewer.entities.add({
      name: "Точка выхода",
      position: Cesium.Cartesian3.fromDegrees(intersects.features[0].geometry.coordinates[1], intersects.features[0].geometry.coordinates[0], 250),
      point: {
        pixelSize: 8,
        color: Cesium.Color.ORANGE
      },
      label: {
        text: `Точка выхода`,
        font: "12px sans-serif",
        fillColor: Cesium.Color.ORANGE,
        verticalOrigin: Cesium.VerticalOrigin.TOP,
        pixelOffset: new Cesium.Cartesian2(0, -10)
      }
    }); */

//отображение зоны

async function drawZones(zoneData, key){
    let coordinates = []

    zoneData.area.forEach(p => {
      coordinates.push(p[1], p[0], (zoneData.altitude + zoneData.height))
    });

    viewer.entities.add({
      name: key,
      id: key,
      polygon: {
        hierarchy: Cesium.Cartesian3.fromDegreesArrayHeights(
          coordinates
        ),
        extrudedHeight: 0,
        perPositionHeight: true,
        fill: true,
        material: countDronesInsideZone[key] <= 3 ? Cesium.Color.BLUE.withAlpha(0.5) : 
        countDronesInsideZone[key] > 3 && countDronesInsideZone[key] <= 5 ? Cesium.Color.ORANGE.withAlpha(0.5) : 
        Cesium.Color.RED.withAlpha(0.5),
        outline: false,
        outlineColor: Cesium.Color.BLACK,
      },
    });
}

// Function to download the CSV file
const download = (data) => {
    // Create a Blob with the CSV data and type
    const blob = new Blob([data], { type: 'text/csv' });
    
    // Create a URL for the Blob
    const url = URL.createObjectURL(blob);
    
    // Create an anchor tag for downloading
    const a = document.createElement('a');
    
    // Set the URL and download attribute of the anchor tag
    a.href = url;
    a.download = 'download.csv';
    
    // Trigger the download by clicking the anchor tag
    a.click();
}

// Function to create a CSV string from an object
const csvmaker = (dataArray) => {
  if (!Array.isArray(dataArray) || dataArray.length === 0) return '';

  const headers = Object.keys(dataArray[0]);
  const rows = dataArray.map(obj => headers.map(key => obj[key]));

  const csv = [
    headers.join(';'), // Заголовки
    ...rows.map(row => row.join(';')) // Строки
  ].join('\n');

  return csv;
};

// Asynchronous function to fetch data and download the CSV file
const get = async () => {
    // Example data object
    const data = dronesReport
    
    // Create the CSV string from the data
    const csvdata = csvmaker(data);
    console.log(csvdata)
    // Download the CSV file
    download(csvdata);
}

// Add a click event listener to the button with ID 'action'
document.getElementById('action').addEventListener('click', get);


async function droneReport() {
  const tbody = document.getElementById("reportTableBody");
  tbody.innerHTML = ""; // очистка

  dronesReport.forEach(report => {
    const row = document.createElement("tr");
    row.innerHTML = 
     ` <td>${report.droneName}</td>
      <td>${report.zone}</td>
      <td>${report.coords.join(', ')}</td>
      <td>${
        report.type === "Drone Left the Area" ? "Дрон покинул зону" : 
        report.type === "Drone Returned the Area" ? "Дрон вернулся в зону" :
        report.type === "Drone No Signal" ? "Сигнал потерян" : 
        report.type === "Drone without a zone" ? "Дрон без зоны" :
        "Дрон упал"}</td>`
    tbody.appendChild(row);
  });
}