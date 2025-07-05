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

  function drawDroneRoute(droneData, selectedDrone){
    const routePositions = droneData.map(p =>
        Cesium.Cartesian3.fromDegrees(p.position[1], p.position[0], p.altitude)
      );
      // Анимация дрона
      const start = Cesium.JulianDate.now();
      const property = new Cesium.SampledPositionProperty();

      droneData.forEach(p => {
        const time = Cesium.JulianDate.addSeconds(start, p.time, new Cesium.JulianDate());
        const pos = Cesium.Cartesian3.fromDegrees(p.position[1], p.position[0], p.altitude);
        property.addSample(time, pos);
      });

      // Добавляем путь
      viewer.entities.add({
        id: selectedDrone + '-path',
        polyline: {
          positions: routePositions,
          width: 3,
          material: Cesium.Color.YELLOW
        }
      });

      // Добавляем точку с лейблом в начале пути (можно сделать движущейся, если есть данные по времени)
      viewer.entities.add({
        id: selectedDrone + '-point',
        position: property, // позиция по времени
        point: { pixelSize: 10, color: Cesium.Color.RED },
        label: {
          text: selectedDrone,
          font: "14px sans-serif",
          fillColor: Cesium.Color.WHITE,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          pixelOffset: new Cesium.Cartesian2(0, -20)
        },
        orientation: new Cesium.VelocityOrientationProperty(property),
        path: {
          resolution: 1,
          material: Cesium.Color.YELLOW,
          width: 3
        }
      });

      viewer.clock.startTime = start.clone();
      viewer.clock.stopTime = Cesium.JulianDate.addSeconds(start, droneData.at(-1).time, new Cesium.JulianDate());
      viewer.clock.currentTime = start.clone();
      viewer.clock.clockRange = Cesium.ClockRange.LOOP_STOP;
      viewer.clock.multiplier = 1;
      viewer.clock.shouldAnimate = true;

      //viewer.trackedEntity = drone;
  }

  // Получение массива с дронами
  let dronesData = []
  const selectDroneOption = document.querySelector('.drone_toolbar'); // тулбар выбора дрона
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

      let droneData = []; // Установка камеры на первый дрон по умолчанию
      selectDroneOption.addEventListener('change', () => {
        const selectedDrone = selectDroneOption.value;
        droneData = data[selectedDrone]
        //drawDroneRoute(droneData, selectedDrone)
        console.log(selectedDrone)
        if (selectedDrone === "allDrones") {
          Object.keys(dronesData).forEach(key => {
            console.log("DEL", key)
            viewer.entities.removeById(key + '-path');
            viewer.entities.removeById(key + '-point');
          });
          for (const key in data) {
            drawDroneRoute(data[key], key); // Отрисовка всех
          }
        }else{
          Object.keys(dronesData).forEach(key => {
            console.log("DEL", key)
            viewer.entities.removeById(key + '-path');
            viewer.entities.removeById(key + '-point');
          });
          droneData = data[selectedDrone]
          drawDroneRoute(droneData, selectedDrone)
        }
      });

    }).catch(error => {
      console.error("Ошибка загрузки JSON:", error);
    });

  // Poligons
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

  const selectZoneOption = document.querySelector('.zones_toolbar'); // тулбар выбора зоны
  let zonesData = []
  fetch('zones.json')
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
      for (const key in data) {
        drawZones(data[key], key)
      }
      

  })

  function drawZones(zoneData, key){
      //const property = new Cesium.SampledPositionProperty();
      let coordinates = []

      //console.log("KEK2", key, zoneData)
      zoneData.area.forEach(p => {
        console.log("KEK", key, zoneData)
        //console.log([p[0], p[1], zoneData.altitude].join(', '))
        coordinates.push(p[1], p[0], zoneData.altitude)
        //const pos = Cesium.Cartesian3.fromDegrees(p[0], p[1], zoneData.altitude);
        
        //const pos = Cesium.Cartesian3.fromDegrees(p.position[1], p.position[0], p.altitude);
        //property.addSample(pos);
      });
      
      //console.log(zoneData)
      //console.log(property)

      viewer.entities.add({
        name: key,
        id: key,
        polygon: {
          hierarchy: Cesium.Cartesian3.fromDegreesArrayHeights(
            coordinates
          ),
          extrudedHeight: 0,
          perPositionHeight: true,
          material: Cesium.Color.ORANGE.withAlpha(0.5),
          outline: false,
          outlineColor: Cesium.Color.BLACK,
        },
      });
      

      
      //viewer.trackedEntity = drone;
  }

// Отслеживание пролетов в зоне