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

// Your access token can be found at: https://ion.cesium.com/tokens.
    // Replace `your_access_token` with your Cesium ion access token.

Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIwYTQ2MTQ2Ny01ZGQ3LTQyZDEtOThiYS03NzczNTU0NjlmMGIiLCJpZCI6MzE4NDc5LCJpYXQiOjE3NTE2MTg1MTN9.PhUSbgbBWYde8UL2pE3SRCZ_hgVq-HKYoHeX7K6v9Hk';

// Initialize the Cesium Viewer in the HTML element with the `cesiumContainer` ID.
const viewer = new Cesium.Viewer('cesiumContainer', {
  terrain: Cesium.Terrain.fromWorldTerrain(),
});    

// Fly the camera to San Francisco at the given longitude, latitude, and height.
viewer.camera.flyTo({
  destination: Cesium.Cartesian3.fromDegrees(50.214525, 53.223701, 400),
  orientation: {
    heading: Cesium.Math.toRadians(0.0),
    pitch: Cesium.Math.toRadians(-15.0),
  }
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

let dronesReport = {};
let currentDronePos = {}
let droneWasOutsideZone = {} // метка вылета для условия
let dronesFalled = []

function drawDroneRoute(droneData, selectedDrone, globalStartTime){
  if (!droneWasOutsideZone[selectedDrone]) {
    droneWasOutsideZone[selectedDrone] = { wasOutsideZone: false };
  }

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
    polyline: {
      positions: routePositions,
      width: 3,
      material: Cesium.Color.YELLOW
    }
  });

  viewer.entities.add({
    id: selectedDrone + '-point',
    position: property,
    point: { pixelSize: 10, color: Cesium.Color.WHITE },
    label: {
      text: selectedDrone,
      font: "14px sans-serif",
      fillColor: Cesium.Color.WHITE,
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      pixelOffset: new Cesium.Cartesian2(0, -20)
    },
    orientation: new Cesium.VelocityOrientationProperty(property)
  });

  viewer.clock.onTick.addEventListener(function(clock) {
    const currentTime = clock.currentTime;
    const position = property.getValue(currentTime);

    if (!droneWasOutsideZone[selectedDrone].wasOutsideZone && position) {
      const cartographic = Cesium.Ellipsoid.WGS84.cartesianToCartographic(position);
      const lon = Cesium.Math.toDegrees(cartographic.longitude);
      const lat = Cesium.Math.toDegrees(cartographic.latitude);
      const alt = cartographic.height;
      checkCoordsDrone(lat.toFixed(6), lon.toFixed(6), alt.toFixed(2), selectedDrone);
    }
  });
}

const selectZoneOption = document.querySelector('.zones_toolbar'); // тулбар выбора зоны
let zonesData = []
let countDronesInsideZone = {}
await fetch('zones.json')
  .then(response => response.json())
  .then(data => {
    zonesData = data
    console.log("DATA Zones", zonesData)
    

    Object.keys(zonesData).forEach(key => {
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = key;
      selectZoneOption.appendChild(opt);
    });
    loadDronePaths()
    /* for (const key in data) {
      //drawZones(data[key], key)
      console.log("drawZone", data[key], key)
    } */
})
  // Получение массива с дронами
let dronesData = []
const droneZonePasses = {};
console.log("droneZonePasses", droneZonePasses)
let currentDroneZone = []

const selectDroneOption = document.querySelector('.drone_toolbar'); // тулбар выбора дрона
function loadDronePaths(){
  fetch('drones.json')
  .then(response => response.json())
  .then(data => {
    dronesData = data
    console.log("DATA DRONES", dronesData)

    Object.keys(dronesData).forEach(key => {
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = key;
      selectDroneOption.appendChild(opt);
    });

    Object.keys(zonesData).forEach(zone =>{
      Object.keys(dronesData).forEach(key => {
        for (let i of dronesData[key]) {
          if (isPointInPolygon([i.position[1], i.position[0], i.altitude], zonesData[zone]) === 'inside') {
            currentDroneZone = zone
            if (!countDronesInsideZone[zone]) {
              countDronesInsideZone[zone] = 1
            } else {
              countDronesInsideZone[zone]++;
            }
            // Подсчёт, сколько раз этот конкретный дрон вошёл в зону
            if (!droneZonePasses[key]) {
              droneZonePasses[key] = {};
            }

            if (!droneZonePasses[key][zone]) {
              droneZonePasses[key]['zoneInfo'] = [zonesData[zone].altitude, currentDroneZone];
            } 
            console.log(`RR ${key}`, dronesData[key].map(i => i.position));
            dronesReport[key] = {
              dronePath: dronesData[key].map(i => [[i.position, i.altitude].join("|")]),
              droneZone: currentDroneZone
            };
            break;
          }
        }
        //console.log("Подробности по каждому дрону:", droneZonePasses);
        //console.log(`Drone ${key} is ${droneInsideZone ? 'inside' : 'outside'} the zone.`);
        //drawDroneRoute(data[key], key, droneInsideZone ? "GREEN" : "YELLOW")
      })
      //console.log("LAL", currentDroneZone)
      drawZones(zonesData[zone], zone)
    })

    selectDroneOption.addEventListener('change', () => {
      const selectedDrone = selectDroneOption.value;
      const globalStartTime = Cesium.JulianDate.now();

      clearAllDrones(dronesData);

      if (selectedDrone === "allDrones") {
        configureClock(data, globalStartTime);
        for (const key in data) {
          drawDroneRoute(data[key], key, globalStartTime);
        }
        console.log("DATA D", dronesReport)
        droneReport()
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
//console.log("вылетел", currentDronePos)
//selectedDrone

function checkCoordsDrone(lat, lon, alt, droneName){
      //  console.log("droneZonePasses21", droneZonePasses[droneName].zoneInfo[1])
       //console.log("droneZonePasses1", droneZonePasses[droneName].zoneInfo[1])
       //console.log("droneZonePasses1", zonesData[droneZonePasses[droneName].zoneInfo[1]])
       //console.log("droneZonePasses1", zonesData[droneZonePasses[droneName]])
        if (droneZonePasses[droneName] &&
            droneZonePasses[droneName].zoneInfo &&
            zonesData[droneZonePasses[droneName].zoneInfo[1]] !== undefined
          ){
          const resultDroneStatus = isPointInPolygon([lon, lat, alt], zonesData[droneZonePasses[droneName].zoneInfo[1]]);
          //console.log("CURR", droneZonePasses[droneName])
          //console.log("CURR223", zonesData[droneZonePasses[droneName].zoneInfo[1]])

          if (resultDroneStatus === 'outside') {
            //Значит, вылетел — добавляем точку
            console.log(`ВЫЛЕТЕЛ из зоны ${currentDroneZone}`);
            droneWasOutsideZone[droneName].wasOutsideZone = true
            dronesReport[droneName].droneOutside = [lon, lat, alt]
            droneReport()
            // Целевая точка стрелки
            const target = Cesium.Cartesian3.fromDegrees(lon, lat, alt);

            // Смещаем точку назад, чтобы создать направление "на цель"
            const direction = Cesium.Cartesian3.normalize(target, new Cesium.Cartesian3());
            const arrowLength = 10.0; // длина стрелки в метрах

            const offset = Cesium.Cartesian3.multiplyByScalar(direction, -arrowLength, new Cesium.Cartesian3());
            const start = Cesium.Cartesian3.add(target, offset, new Cesium.Cartesian3());

            // стрелка линия
            viewer.entities.add({
              name: "Exit Arrow Line",
              polyline: {
                positions: [start, target],
                width: 26,
                material: new Cesium.PolylineArrowMaterialProperty(Cesium.Color.ORANGE)
              }
            });
            // точка выхода дрона
            viewer.entities.add({
              name: "Точка выхода",
              position: Cesium.Cartesian3.fromDegrees(lon, lat, alt),
              point: {
                pixelSize: 8,
                color: Cesium.Color.ORANGE
              },
              label: {
                text: `Точка выхода ${droneName}`,
                font: "12px sans-serif",
                fillColor: Cesium.Color.ORANGE,
                verticalOrigin: Cesium.VerticalOrigin.TOP,
                pixelOffset: new Cesium.Cartesian2(0, -10)
              }
            });
          }else if(resultDroneStatus === 'droneFall'){
            console.log("DRONE FALLED")
            dronesReport[droneName].droneFall = [lon, lat, alt]
            droneReport()
            // точка падения дрона
            viewer.entities.add({
              name: "Падение",
              position: Cesium.Cartesian3.fromDegrees(lon, lat, alt),
              point: {
                pixelSize: 8,
                color: Cesium.Color.RED
              },
              label: {
                text: `Падение ${droneName}`,
                font: "12px sans-serif",
                fillColor: Cesium.Color.RED,
                verticalOrigin: Cesium.VerticalOrigin.TOP,
                pixelOffset: new Cesium.Cartesian2(0, -10)
              }
            });
            droneWasOutsideZone[droneName].wasOutsideZone = true
          }
        } 
}
  // Polygons
/*   const orangePolygon = viewer.entities.add({
    name: "Зона 1",
    id: 'Zone 1',
    polygon: {
      hierarchy: Cesium.Cartesian3.fromDegreesArrayHeights([
        50.069118, 53.176585, 100, 
        50.091385, 53.198935, 100, 
        50.109617, 53.207369, 100, 
        50.144884, 53.187896, 100, 
        50.074349, 53.174250, 100
      ]),
      extrudedHeight: 0,
      perPositionHeight: true,
      material: Cesium.Color.ORANGE.withAlpha(0.5),
      outline: false,
      outlineColor: Cesium.Color.BLACK,
    },
  }); */

//отображение зоны

async function drawZones(zoneData, key){
    let coordinates = []

    zoneData.area.forEach(p => {
      //console.log("KEK", countDronesInsideZone[key])
      coordinates.push(p[1], p[0], zoneData.height)
    });

    //console.log(countDronesInsideZone)

    viewer.entities.add({
      name: key,
      id: key,
      polygon: {
        hierarchy: Cesium.Cartesian3.fromDegreesArrayHeights(
          coordinates
        ),
        extrudedHeight: 0,
        perPositionHeight: true,
        material: countDronesInsideZone[key] <= 3 ? Cesium.Color.BLUE.withAlpha(0.5) : 
        countDronesInsideZone[key] > 3 && countDronesInsideZone[key] <= 5 ? Cesium.Color.ORANGE.withAlpha(0.5) : 
        Cesium.Color.RED.withAlpha(0.5),
        outline: false,
        outlineColor: Cesium.Color.BLACK,
      },
    });
}
// Отслеживание пролетов в зоне
function isPointInPolygon(point, polygon) {
  //console.log(droneName)
  const [x, y, z] = point;
  const area = polygon.area
  //console.log("CURi", polygon)
  let inside = false;
  if( (z - polygon.altitude) < 1 ){
    console.log("Дрон упал", (z - polygon.altitude) )
    //dronesFalled.push([droneName, point])
    return "droneFall";
  }
  
  if ((z - polygon.altitude) > polygon.height) {
    return "outside"; 
  }

  for (let i = 0, j = area.length - 1; i < area.length; j = i++) {
    const xi = area[i][1], yi = area[i][0];
    const xj = area[j][1], yj = area[j][0];

    const intersect = ((yi > y) !== (yj > y)) &&
      (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  //const insideAltitude = z >= polygon.altitude
  return inside ? "inside" : "outside";
}

async function droneReport(){
  await console.log(JSON.stringify(dronesReport, null, 2))
  const tbody = document.getElementById("reportTableBody");

  tbody.innerHTML = ""; // очистка перед заполнением

  Object.entries(dronesReport).forEach(([droneName, report]) => {
    const zone = report.droneZone || "";
    const path = Array.isArray(report.dronePath) ? JSON.stringify(report.dronePath) : "";
    const outside = Array.isArray(report.droneOutside) ? report.droneOutside.join("|") : "";
    const fall = Array.isArray(report.droneFall) ? report.droneFall.join("|") : "";

    const row = document.createElement("tr");
    row.innerHTML = `
      <th scope="row">${droneName}</th>
      <td>${zone}</td>
      <td>${path}</td>
      <td>${outside}</td>
      <td>${fall}</td>
    `;
    tbody.appendChild(row);
  });
}