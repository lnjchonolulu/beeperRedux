document.addEventListener('DOMContentLoaded', () => {
    const initialZoomLevel = 16.6; // 초기 축척 레벨을 더 확대

    const userIcon = L.icon({
        iconUrl: '../img/map-pin.png', // 사용자 지정 아이콘 이미지 경로
        iconRetinaUrl: '../img/map-pin.png', // 레티나 디스플레이용 아이콘 이미지 경로
        iconSize: [47, 61], // 아이콘 크기
        iconAnchor: [12, 61], // 아이콘의 앵커 위치 (기본적으로 아이콘의 하단 중앙)
        popupAnchor: [1, -34], // 팝업 앵커 위치
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png', // 그림자 이미지 경로
        shadowSize: [41, 41] // 그림자 크기
    });

    const clientId = getOrCreateClientId();
    const socket = io();

    Promise.all([getBeeperNumber(clientId), getAllowedAreas()]).then(([beeperData, allowedAreas]) => {
        const beeperNumber = beeperData.beeperNumber;
        console.log('Beeper Number:', beeperNumber);
        const formattedBeeperNumber = formatBeeperNumber(beeperNumber);
        document.getElementById('beeperInfo').innerText = `이 삐삐 번호  ${formattedBeeperNumber}`;

        initializeMap(beeperNumber, allowedAreas);
    
        socket.emit('registerBeeper', { clientId, beeperNumber }); 
    
        document.addEventListener('callBeeper', function(e) {
            const dialedBeeperNumber = e.detail;
            console.log(`Calling beeper number: ${dialedBeeperNumber}`);
            socket.emit('callBeeper', { beeperNumber: dialedBeeperNumber });
        });
    });

    socket.on('beeperCalled', (data) => {
        console.log('Beeper called:', data.message);
        alert('Beeper called: ' + data.message);
    });

    function initializeMap(beeperNumber, allowedAreas) {
        const map = L.map('map', {
            zoomControl: false,
            dragging: false,
            doubleClickZoom: false,
            scrollWheelZoom: false,
            boxZoom: false,
            keyboard: false,
            tap: false,
            touchZoom: false
        }).setView([37.5665, 126.9780], initialZoomLevel);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
        }).addTo(map);

        let userMarker = null;

        const markers = L.markerClusterGroup();

        allowedAreas.forEach(area => {
            const marker = L.circleMarker([area.lat, area.lon], {
                radius: 50,
                color: 'blue',
                fillColor: '#30f',
                fillOpacity: 0.5
            });
            markers.addLayer(marker);
        });

        map.addLayer(markers);

        function onLocationFound(e) {
            const userLat = e.latlng.lat;
            const userLon = e.latlng.lng;

            if (userMarker) {
                userMarker.setLatLng(e.latlng);
            } else {
                userMarker = L.marker(e.latlng, { icon: userIcon }).addTo(map);
            }

            const inAllowedArea = allowedAreas.some(area => {
                const distance = getDistance(userLat, userLon, area.lat, area.lon);
                return distance <= 50;
            });

            // if (inAllowedArea) {
            //     document.getElementById('msgContainer').style.display = 'none'; // 메시지 숨김
            // } else {
            //     if(document.getElementById('menu').getAttribute("activated") != 2){
            //         document.getElementById('msgContainer').style.display = 'block'; // 메시지 표시
            //     }
            // }
    
            // map.eachLayer(layer => {
            //     if (layer instanceof L.Circle) {
            //         map.removeLayer(layer);
            //     }
            // });
    
            map.setView(e.latlng, initialZoomLevel); // 사용자의 위치로 지도의 중심을 설정
            map.invalidateSize();
        };

        const locateOptions = {
            setView: true,
            watch: true,
            maxZoom: initialZoomLevel,
            timeout: 20000, // 타임아웃 시간 설정 (20초)
            enableHighAccuracy: true, // 높은 정확도 요청
            maximumAge: 0 // 캐시된 위치를 사용하지 않음
        };

        map.locate(locateOptions);

        function updateLocation() {
            map.locate(locateOptions);
        }

        document.querySelectorAll('.menu-item').forEach(item => {
            item.addEventListener('click', () => {
                map.invalidateSize();
                updateLocation();
            });
        });

        map.on('locationfound', onLocationFound);

        map.on('locationerror', (e) => {
            if (e.code === 1) { // Permission denied
                alert("Location access denied. Please enable location services in your browser settings. To do this, go to Settings > Privacy > Location Services and enable location access for your browser.");
            } else {
                // alert(`Geolocation error: ${e.message}.`);
            }
        });

        setTimeout(() => {
            map.invalidateSize();
        }, 1000);
    }

    function getOrCreateClientId() {
        let clientId = localStorage.getItem('clientId');
        if (!clientId) {
            clientId = generateUUID();
            localStorage.setItem('clientId', clientId);
        }
        return clientId;
    }

    function generateUUID() {
        var d = new Date().getTime();
        var d2 = (performance && performance.now && (performance.now() * 1000)) || 0;
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random() * 16;
            if (d > 0) {
                r = (d + r) % 16 | 0;
                d = Math.floor(d / 16);
            } else {
                r = (d2 + r) % 16 | 0;
                d2 = Math.floor(d2 / 16);
            }
            return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
    }

    function formatBeeperNumber(beeperNumber) {
        if (beeperNumber.length === 10) {
            return beeperNumber.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
        } else if (beeperNumber.length === 9) {
            return beeperNumber.replace(/(\d{3})(\d{3})(\d{3})/, '$1-$2-$3');
        } else {
            return beeperNumber; // 형식에 맞지 않는 경우 그대로 반환
        }
    }

    async function getBeeperNumber(clientId) {
        const response = await fetch(`/api/beeper?clientId=${clientId}`);
        const data = await response.json();
        return data; // 객체 전체를 반환
    }

    async function getAllowedAreas() {
        const response = await fetch('/api/allowedAreas');
        const data = await response.json();
        return data.allowedAreas;
    }

    function getDistance(lat1, lon1, lat2, lon2) {
        const R = 6371e3; // metres
        const φ1 = lat1 * Math.PI/180; // φ, λ in radians
        const φ2 = lat2 * Math.PI/180;
        const Δφ = (lat2-lat1) * Math.PI/180;
        const Δλ = (lon2-lon1) * Math.PI/180;

        const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                  Math.cos(φ1) * Math.cos(φ2) *
                  Math.sin(Δλ/2) * Math.sin(Δλ/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

        const d = R * c; // in metres
        return d;
    }

    function generateAllowedAreas(center, distance, count) {
        const [centerLat, centerLon] = center;
        const areas = [];

        for (let i = 0; i < count; i++) {
            const angle = (i * 360) / count;
            const angleRad = angle * (Math.PI / 180);
            const lat = centerLat + (distance * Math.cos(angleRad)) / 111320;
            const lon = centerLon + (distance * Math.sin(angleRad)) / (111320 * Math.cos(centerLat * Math.PI / 180));
            areas.push({ lat, lon });
        }

        return areas;
    }
});