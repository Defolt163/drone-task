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
    document.body.style.overflow = 'hidden'
  }else if(reportBlockStatus){
    reportBlockStatus = false
    reportBlock.classList.remove('open')
    overflow.classList.remove('open')
    document.body.style.overflow = ''
  }
})
overflow.addEventListener('click', () => {
    reportBlockStatus = false
    reportBlock.classList.remove('open')
    overflow.classList.remove('open')
    document.body.style.overflow = ''
})
xmarkReport.addEventListener('click', () => {
    reportBlockStatus = false
    reportBlock.classList.remove('open')
    overflow.classList.remove('open')
    document.body.style.overflow = ''
})

// УПРАВЛЕНИЕ СЛОЯМИ
  //Зоны
const zonesControlCheckbox = document.getElementById('zonesControlCheckbox')
zonesControlCheckbox.addEventListener('change', function () {
  if (this.checked) {
    zonesControl(true)
  } else {
    zonesControl(false)
  }
})
  //Траектории
const dronesPathCheckbox = document.getElementById('dronesPathCheckbox')
dronesPathCheckbox.addEventListener('change', function () {
  if (this.checked) {
    controlDronePath(true)
  } else {
    controlDronePath(false)
  }
})
  // Тепловая карта
const heatmapCheckbox = document.getElementById('heatmapCheckbox')
heatmapCheckbox.addEventListener('change', function () {
  if (this.checked) {
    controlHeatmap(true)
  } else {
    controlHeatmap(false)
  }
})
  //События
const dronesEventsCheckbox = document.getElementById('dronesEventsCheckbox')
dronesEventsCheckbox.addEventListener('change', function () {
  if (this.checked) {
    controlWarnMarkers(true)
  } else {
    controlWarnMarkers(false)
  }
})
  //Дроны
const dronesPosCheckbox = document.getElementById('dronesPosCheckbox')
dronesPosCheckbox.addEventListener('change', function () {
  if (this.checked) {
    controlDronePoint(true)
  } else {
    controlDronePoint(false)
  }
})
// Функции для слоев
  //События
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
  //Тепловая карта
function controlHeatmap(status) {
  !status ? heatMap.hide() : heatMap.show()
}
  // Траектории
function controlDronePath(status){
  viewer.entities.values.forEach(entity => {
    if (entity.id.includes("-path")) {
      entity.show = status;
    }
  });
}
  // Дроны
function controlDronePoint(status){
  viewer.entities.values.forEach(entity => {
    if (entity.id.includes("-point")) {
      entity.show = status;
    }
  });
}
  // Зоны
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
  destination: Cesium.Cartesian3.fromDegrees(50.117078, 53.195070, 5400),
  /* orientation: {
    heading: Cesium.Math.toRadians(0.0),
    pitch: Cesium.Math.toRadians(-15.0),
  } */
});
  
let heatMap = null
function generateHeatmap(dronePaths) {
  const bbox = [49.980134, 53.424384, 50.41006, 53.135739] // Ограничения зоны сетки [minX, maxY, maxX, minY]
  const cellSize = 0.35 // 350м
  const options = { units: 'kilometers' }
  const grid = turf.squareGrid(bbox, cellSize, options) // Создание сетки

  const heatCells = {} // Ячейки с пересечениями

  // поиск пересечений
  for (const droneName in dronePaths) {
    const path = dronePaths[droneName] // массив с объектами точек пути дрона [{time: 0, position: [lon,lat], altitude: 400}, {...}]
    //разделение пути на отрезки
    for (let i = 0; i < path.length - 1; i++) {
      const start = path[i] // пеовая точка
      const end = path[i + 1] // вторая точка

      const droneSegment = turf.lineString([
        [start.position[1], start.position[0]], // [lon, lat]
        [end.position[1], end.position[0]]
      ]);

      // Проверка отрезка на пересечение ячейки сетки
      grid.features.forEach((cell) => {
        if (turf.booleanIntersects(cell, droneSegment)) { //Функция Boolean-intersects возвращает (TRUE), если пересечение двух геометрических фигур НЕ является пустым множеством
          const center = turf.centroid(cell).geometry.coordinates // координаты центра ячейки

          const lon = Number(center[0].toFixed(6)) // сократить координату до 6ти знаков после запятой
          const lat = Number(center[1].toFixed(6))
          const key = `${lon},${lat}` // создается строковый ключ на основе долготы и широты (lon, lat)

          heatCells[key] = (heatCells[key] || 0) + 1 // если такая координата уже есть в heatCells, то значение увеличивается на 1. Если ещё нет, то используется 0, и создается новая запись со значением 1
        }
      })
    }
  }

  // Преобразуем в массив
  const heatArray = Object.entries(heatCells).map(([key, count]) => {
    const [lon, lat] = key.split(',').map(Number)
    return { x: lon, y: lat, value: count }
  });
  // heatArray = [{x: lon, y: lat, value: 5}, {...}]

  const valueMin = 1
  const valueMax = Math.max(...heatArray.map(p => p.value)) // Перебор массива и выявление большего значения value. Это и будет максимальное значение тепловой карты

  // Границы Самары
  const bounds = {
    west: 50.05,
    east: 50.35,
    south: 53.13,
    north: 53.35
  };

  // Инициализация и отрисовка тепловой карты
  heatMap = CesiumHeatmap.create(viewer, bounds, {
    radius: 35,
    maxOpacity: 0.9,
    scaleRadius: true
  });
  
  // Наложение тепловой карты
  heatMap.setWGS84Data(valueMin, valueMax, heatArray); 
}

// настройка часов для воспроизведения движения от начала до конца в реальном времени
function configureClock(data, globalStartTime) {
  let globalStopTime = globalStartTime // изначально конец всей анимации равен её началу.
  // цикл по всем трекам
  for (const key in data) {
    const lastTime = data[key].at(-1).time
    const stopCandidate = Cesium.JulianDate.addSeconds(globalStartTime, lastTime, new Cesium.JulianDate())
    if (Cesium.JulianDate.lessThan(globalStopTime, stopCandidate)) {
      globalStopTime = stopCandidate;
    }
  }

  viewer.clock.startTime = globalStartTime.clone() //устанавливает время начала
  viewer.clock.stopTime = globalStopTime.clone() // устанавливает время конца
  viewer.clock.currentTime = globalStartTime.clone() // устанавливает время текущего времени
  viewer.clock.clockRange = Cesium.ClockRange.LOOP_STOP // цикл анимации
  viewer.clock.multiplier = 1 // скорость — нормальная
  viewer.clock.shouldAnimate = true // включить анимацию
}

// очистка отрисованных дронов
function clearAllDrones(dronesData) {
  Object.keys(dronesData).forEach(key => {
    viewer.entities.removeById(key + '-path');
    viewer.entities.removeById(key + '-point');
  });
}

let dronesReport = []; // переменная для формирования отчета
// отрисовка дронов
function drawDroneRoute(droneData, selectedDrone, globalStartTime){

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

const selectZoneOption = document.querySelector('.zones_toolbar'); // тулбар выбора зоны
let zonesData = []
let countDronesInsideZone = {}
// получение данных о зонах
await fetch('zones.json')
  .then(response => response.json())
  .then(data => {
    zonesData = data
    // генерация селекта в DOM
    Object.keys(zonesData).forEach(key => {
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = key;
      selectZoneOption.appendChild(opt);
    });
    loadDronePaths()
})
  // Получение данных с дронами
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

    Object.keys(dronesData).forEach(key => {
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = key;
      selectDroneOption.appendChild(opt);
    });

    /* Object.keys(zonesData).forEach(zone =>{
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
        break
        console.log('dronesData', dronePathArray)
      })
      //generateHeatmap(dronesData)
      drawZones(zonesData[zone], zone)
      console.log('dronesData', dronesData)
    }) */
   // Проверка нахождения дрона в зоне
   // Перебор объекта с дронами, 
   Object.keys(dronesData).forEach(droneKey => {
    const droneEntries = dronesData[droneKey] // выбранный дрон

    const droneTimeArray = droneEntries.map(i => [i.time, [i.position[0], i.position[1], i.altitude], droneKey]) // для проверки времени соединения
    const dronePathArray = droneEntries.map(i => [i.position[0], i.position[1], i.altitude, droneKey]) // для проверки пути дрона на вылеты

    let foundZone = null // найденная зона

    for (let zone of Object.keys(zonesData)) {
      if (isPointInPolygon(dronePathArray, zonesData[zone], zone) === 'inside') {
        foundZone = zone // зона найдена

        countDronesInsideZone[zone] = (countDronesInsideZone[zone] || 0) + 1 // учёт количества дронов в зоне, для определения цвета

        break // дрон не может быть одновременно в нескольких зонах
      }
    }

    if (foundZone) {
      checkDroneZoneTime(droneTimeArray, foundZone) // проверка соединения
    }
    console.log('dronePathArray', dronePathArray);
  });
    // отрисовка каждой зоны
    Object.keys(zonesData).forEach(zoneKey => {
      console.log("zonesData", zonesData)
      drawZones(zonesData[zoneKey], zoneKey)
    })
    generateHeatmap(dronesData) // трисовка тепловой карты

    // Выбор дрона
    selectDroneOption.addEventListener('change', () => {
      selectedDrone = selectDroneOption.value
      const globalStartTime = Cesium.JulianDate.now() // фиксируем текущее время как стартовое
      clearAllDrones(dronesData) // очистка полигона

      if (selectedDrone === "allDrones") {
        configureClock(data, globalStartTime) // настраиваем часы (анимацию) для всех дронов
        for (const key in data) {
          drawDroneRoute(data[key], key, globalStartTime) //рисуем маршруты для каждого дрона
        }
      } else {
        const droneData = data[selectedDrone] // выбираем выбранный дрон
        configureClock({ [selectedDrone]: droneData }, globalStartTime) // настройка анимации выбранного дорна
        drawDroneRoute(droneData, selectedDrone, globalStartTime) // маршрут выбранного дрона
      }
    });
    selectDroneOption.value = "allDrones" // установить по умолчанию параметр
    selectDroneOption.dispatchEvent(new Event('change')) // вызвать событие изменения параметра
  }).catch(error => {
    console.error("Ошибка загрузки JSON:", error)
  })
}

// проверка нахождения дрона внутри зоны
function isPointInPolygon(point, polygon, zoneName){
  // Проверка по высоте
  for (const key of point){
    if(key[2] > (polygon.altitude + polygon.height)){ // key[2] - альтитуда дрона; (polygon.altitude + polygon.height) - альтитуда верхней границы полигона
      console.log("Дрон не в зоне")
      // запись в отчет
      dronesReport.push({
        "type": "Drone without a zone",
        "droneName": key[3],
        "coords": [key[1],key[0],key[2]],
        "zone": "None"
      })
      return "outside";
    }
  }

  let points = turf.points(point) // нахождение дрона
  let searchWithin = turf.polygon([polygon.area]) // границы зоны
  let ptsWithin = turf.pointsWithinPolygon(points, searchWithin) // Находит точки, которые находятся внутри многоугольника.
  // ptsWithin возвращает FeatureCollection Точка(и) или многоточка(и) с координатами, которые находятся хотя бы в пределах одного многоугольника
  if (ptsWithin.features.length !== 0){ //Дрон находится в зоне
    console.log("ptsWithin.features", ptsWithin.features)
    lineInterselect(point, polygon.area, zoneName) // Проверка на вылеты
    checkDroneHeight(point, polygon, zoneName) // Проверка на падения
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

// проверка на вылеты
function lineInterselect(dronePath, zoneBorder, zoneName) {
  let zoneLine = turf.lineString(zoneBorder)
  let addedPoints = new Set() // пройденные точки

  // разделение целого пути дрона на отрезки
  for (let dronePart = 0; dronePart < dronePath.length - 1; dronePart++) {

    let start = dronePath[dronePart] // первая точка
    let end = dronePath[dronePart + 1] // вторая точка

    let segment = turf.lineString([[start[0], start[1]], [end[0], end[1]]]) // объект отрезка. LineString создает объект на основе массива координат
    let intersects = turf.lineIntersect(segment, zoneLine) // Проверка пересечений отрезка дрона и линий границы зоны

    for (let feature of intersects.features) {
      let intersectionCoords = feature.geometry.coordinates // [lon, lat] координаты точки пересечения
      let key = intersectionCoords.join(',') // преобразование в строку
      if (addedPoints.has(key)) continue // Проверяем, добавляли ли уже такую точку. Если да — пропускаем (continue), чтобы не обрабатывать её второй раз
      addedPoints.add(key) // Если точка новая, то добавляем её в множество addedPoints

      // вычисление альтитуды пересеченияв пути
      const totalDist = turf.length(segment, { units: 'meters' }); // расстояние полного отрезка
      const segmentToIntersection = turf.lineString([[start[0], start[1]], intersectionCoords]);
      const partDist = turf.length(segmentToIntersection, { units: 'meters' }); // расстояние отрезка с пересечением
      const t = partDist / totalDist; // процент пройденного пути

      const altitude = start[2] + t * (end[2] - start[2]); // линейная интерполяция start[2] - альтитуда первой точки, end[2] - альтитуда 2й точки

      // Запись в отчет
      dronesReport.push({
        "type": dronePart % 2 === 0 ? "Drone Returned the Area" : "Drone Left the Area",
        "droneName": dronePath[dronePart][3],
        "coords": [intersectionCoords[1], intersectionCoords[0], altitude],
        "zone": zoneName
      })

      // Установка метки
      viewer.entities.add({
        name: dronePart % 2 === 0 ? `Точка входа ${dronePath[dronePart][3]}` : `Точка выхода ${dronePath[dronePart][3]}`, // Нечет - вылет; Чет - возвращение
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
  droneReport() // обновить отчет
}

// Проверка на падения
function checkDroneHeight(dronePath, zone, zoneName) {
  const zoneAltitude = zone.altitude; // Нижняя граница зоны
  const reportedDrones = new Set();
  // Ищем пересечение на каждом отрезке пути
  for (let i = 0; i < dronePath.length - 1; i++) {
    const start = [dronePath[i][1], dronePath[i][0], dronePath[i][2]]; // Текущая точка
    const end = [dronePath[i + 1][1], dronePath[i + 1][0], dronePath[i + 1][2]]; // Следующая точка

    const alt1 = start[2]; // Высота начальной точки start[2] - альтитуда [lon, lat, alt, droneName]
    const alt2 = end[2];   // Высота конечной точки end[2] - алтитуда

    // высота дрона от нижней границы. Альтитуда дрона - Альтитуда зоны. 90-100=-90
    if (alt1 - zoneAltitude >= 1 && alt2 - zoneAltitude < 1) {
      // Если пересечение есть, вычисляем долю пути
      const t = (zoneAltitude + 1 - alt1) / (alt2 - alt1) // 1 = +1 метр к альтитуде щоны

      // Линейная интерполяция координат
        // start||end = [lon, lat, alt]
      const lon = start[0] + t * (end[0] - start[0]);
      const lat = start[1] + t * (end[1] - start[1]);

      console.log("Пересечение на пути отрезка дрона:", lat, lon, zoneAltitude, dronePath[i][3]);
      // запись в отчет
      if (!reportedDrones.has(dronePath[i][3])) {
        reportedDrones.add(dronePath[i][3]);
        dronesReport.push({
          "type": "Drone Fall",
          "droneName": dronePath[i][3],
          "coords": [lat, lon, zoneAltitude+1],
          "zone": zoneName
        })
      }

      // Можно добавить метку в Cesium или визуализировать на карте:
      viewer.entities.add({
        name: `Падение дрона ${dronePath[i][3]}`,
        position: Cesium.Cartesian3.fromDegrees(lon, lat, zoneAltitude+1),
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

// Проверка времени связи
function checkDroneZoneTime(droneTime, zoneName) {
  console.log("checkDroneZoneTime", droneTime)
  // droneTime = [[time0, [lon,lat,alt], droneName], [time1, [...], droneName]]
  const reportedDrones = new Set();
  for (let i = 0; i < droneTime.length - 1; i++) {
    const p1 = droneTime[i][0]; // Текущая точка времени
    const p2 = droneTime[i + 1][0]; // Следующая точка времени

    if (p2 - p1 > 10) {
      let lat = droneTime[i][1][1],
      lon = droneTime[i][1][0],
      alt = droneTime[i][1][2]
      console.log("потеря сигнала", droneTime[i][2]);
      // запись в отчет
      if (!reportedDrones.has(droneTime[i][2])) {
        reportedDrones.add(droneTime[i][2]);
        dronesReport.push({
          "type": "Drone No Signal",
          "droneName": droneTime[i][2],
          "coords": [lat, lon, alt],
          "zone": zoneName
        })
      }
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

function droneReport() {
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