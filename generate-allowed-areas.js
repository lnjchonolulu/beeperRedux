const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./beeper.db');

const koreaCenter = { lat: 36.5, lon: 127.5 }; // 대한민국 중심 좌표
const nagoyaCenter = { lat: 35.1815, lon: 136.9066 }; // 나고야 중심 좌표
const distance = 250; // 250m 간격
const numAreasKorea = 200; // 대한민국을 커버할 수 있는 점의 수
const numAreasNagoya = 60; // 나고야를 커버할 수 있는 점의 수

function generateAllowedAreas(center, distance, numAreas) {
    const areas = [];
    const R = 6371e3; // 지구의 반지름 (미터)

    for (let i = -numAreas; i <= numAreas; i++) {
        for (let j = -numAreas; j <= numAreas; j++) {
            const latOffset = (Math.random() - 0.5) * (distance / R) * (180 / Math.PI);
            const lonOffset = (Math.random() - 0.5) * (distance / R) * (180 / Math.PI) / Math.cos(center.lat * Math.PI / 180);
            const lat = center.lat + (i * (distance / R)) * (180 / Math.PI) + latOffset;
            const lon = center.lon + (j * (distance / R)) * (180 / Math.PI) / Math.cos(center.lat * Math.PI / 180) + lonOffset;
            areas.push({ lat, lon });
        }
    }
    return areas;
}

const allowedAreasKorea = generateAllowedAreas(koreaCenter, distance, numAreasKorea);
const allowedAreasNagoya = generateAllowedAreas(nagoyaCenter, distance, numAreasNagoya);
const allowedAreas = allowedAreasKorea.concat(allowedAreasNagoya);

db.serialize(() => {
    const stmt = db.prepare("INSERT INTO allowedAreas (lat, lon) VALUES (?, ?)");
    allowedAreas.forEach(area => {
        stmt.run(area.lat, area.lon);
    });
    stmt.finalize();
});

db.close();