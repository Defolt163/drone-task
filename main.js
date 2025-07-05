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
      // Анимация дрона
      const start = Cesium.JulianDate.now();
      const property = new Cesium.SampledPositionProperty();

      droneData.forEach(p => {
        const time = Cesium.JulianDate.addSeconds(start, p.time, new Cesium.JulianDate());
        const pos = Cesium.Cartesian3.fromDegrees(p.position[1], p.position[0], p.altitude);
        property.addSample(time, pos);
      });

      const drone = viewer.entities.add({
        id: selectedDrone,
        availability: new Cesium.TimeIntervalCollection([{
          start: start,
          stop: Cesium.JulianDate.addSeconds(start, droneData.at(-1).time, new Cesium.JulianDate())
        }]),
        position: property,
        point: { pixelSize: 10, color: Cesium.Color.RED },
        label: {
          text: `${selectedDrone}`,
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

      viewer.trackedEntity = drone;
  }

  // Получение массива с дронами
  let dronesData = []
  const selectDroneOption = document.querySelector('.toolbar'); // тулбар выбора дрона
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

      let droneData = data.drone1; // Установка камеры на первый дрон по умолчанию
      selectDroneOption.addEventListener('change', () => {
        const selectedDrone = selectDroneOption.value;
        //droneData = data[selectedDrone]
        //drawDroneRoute(droneData, selectedDrone)
        console.log(selectedDrone)
        if (selectedDrone === "allDrones") {
          Object.keys(dronesData).forEach(key => {
            viewer.entities.removeById(key)
          });
          //viewer.entities.remove('drones')
          for (const key in data) {
            drawDroneRoute(data[key], key); // Отрисовка всех
          }
        }else{
          //viewer.entities.removeAll()
          droneData = data[selectedDrone]
          drawDroneRoute(droneData, selectedDrone)
        }
      });

    }).catch(error => {
      console.error("Ошибка загрузки JSON:", error);
    });

  // Poligons
  const orangePolygon = viewer.entities.add({
  name: "Orange polygon with per-position heights and outline",
  id: 'test12',
  polygon: {
    hierarchy: Cesium.Cartesian3.fromDegreesArrayHeights([
      50.143131, 53.198720, 300, 50.119270, 53.199906, 300, 50.122617, 53.191246, 300
    ]),
    extrudedHeight: 0,
    perPositionHeight: true,
    material: Cesium.Color.ORANGE.withAlpha(0.5),
    outline: false,
    outlineColor: Cesium.Color.BLACK,
  },
});