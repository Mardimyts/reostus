function openOtherMaps(lat, lng) {
    var url = "https://www.google.com/maps/search/?api=1&query=" + lat + "," + lng;
    window.open(url, '_blank');
}
var map = L.map('map').setView([59.412141, 24.799889], 12); // Maarake kaardi keskpunkt ja suurendustase
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
	attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// Jõe trajektoori joone loomine
var riverPolyline = L.polyline(riverPoints, { color: 'blue' });

// Trajektoorijoone sisse ja välja lülitamine
var isTrajectoryVisible = false; // Algselt peidetud
var toggleTrajectoryButton = document.getElementById('toggleTrajectory');
toggleTrajectoryButton.addEventListener('click', function() {
	if (isTrajectoryVisible) {
		map.removeLayer(riverPolyline);
		isTrajectoryVisible = false;
		toggleTrajectoryButton.innerText = 'Kuva trajektoor';
	} else {
		riverPolyline.addTo(map);
		isTrajectoryVisible = true;
		toggleTrajectoryButton.innerText = 'Peida trajektoor';
	}
});

// Jõe vee liikumiskiirus, m/s
var riverSpeed = 0.75;

// Funktsioon, mis arvutab vahemaa kahe punkti vahel kaardil meetrites
function calculateDistanceBetweenPoints(point1, point2) {
	var distance = map.distance(point1, point2);
	return distance;
}

// Funktsioon, mis arvutab vahemaa jõe alguspunktist punktini, arvestades jõe käänakuid
function calculateDistanceFromRiverStart(point) {
	var distance = 0;
	var found = false; // Kas punkt on juba leidunud
	for (var i = 1; i < riverPoints.length; i++) {
		var segmentStart = riverPoints[i - 1];
		var segmentEnd = riverPoints[i];
		var segmentLength = calculateDistanceBetweenPoints(segmentStart, segmentEnd);
		var tempDistance = calculateDistanceBetweenPoints(segmentStart, point);
		if (tempDistance < segmentLength) {
			distance += tempDistance;
			found = true;
			break;
		} else {
			if (!found) {
				distance += segmentLength; // Kui punkt pole juba olnud
			}
		}
	}
	return distance;
}

// Vahemaa järvest arvestades jõe käänakuid
for (var i = 0; i < markerPoints.length; i++) {
	var punkt = markerPoints[i];
	var distanceFromStart = calculateDistanceFromRiverStart(punkt);
	var distanceInKm = (distanceFromStart / 1000).toFixed(2);
	punkt.distanceFromStart = distanceFromStart;
	punkt.distanceInKm = distanceInKm;
}

// Funktsioon markerile klikkimisel
function markerClick(e) {
	var clickedMarker = e.target;
	var clickedPointIndex = clickedMarker.options.id; // Saame klikitud punkti indeksi

	// Lähima punkti leidmine, et kuvada hiljem trajektoor selleni
	var nearestRiverPointIndex = -1;
	var nearestDistance = Infinity;
	for (var i = 0; i < riverPoints.length; i++) {
		var point = riverPoints[i];
		var distance = Math.sqrt(Math.pow(point.lat - clickedMarker.getLatLng().lat, 2) + Math.pow(point.lng - clickedMarker.getLatLng().lng, 2));
		if (distance < nearestDistance) {
			nearestDistance = distance;
			nearestRiverPointIndex = i - 1;
		}
	}

	// Slice'imine lähima punktini
	var newRiverPoints = riverPoints.slice(0, nearestRiverPointIndex + 1);

	// Klikitud punkt trajektoori lõpppunktiks
	newRiverPoints.push({ lat: clickedMarker.getLatLng().lat, lng: clickedMarker.getLatLng().lng });

	// Eelmise eemaldamine
	if (riverPolyline) {
		map.removeLayer(riverPolyline);
	}

	// Trajektoor kuni klikitud punktini
	var riverPolylinePoints = [];
	for (var i = 0; i < newRiverPoints.length; i++) {
		riverPolylinePoints.push([newRiverPoints[i].lat, newRiverPoints[i].lng]);
	}
	riverPolyline = L.polyline(riverPolylinePoints, { color: 'blue' }).addTo(map);

	// Nähtavuse muutmine, nähtavaks
	isTrajectoryVisible = true;
	toggleTrajectoryButton.innerText = 'Peida trajektoor';

	// Vahemaa arvutamine ja väljastamine
	var vahemaa = clickedMarker.options.distanceInKm;
	var timeToLake = vahemaa / riverSpeed;
	var timeHours = Math.floor(timeToLake);
	var timeMinutes = Math.round((timeToLake - timeHours) * 60);
	document.getElementById('output').innerHTML = "<b>Vahemaa: </b>" + vahemaa + " km, ID: " + clickedMarker.options.id;
	document.getElementById('speed').innerHTML = riverSpeed;
	document.getElementById('time').innerHTML = timeHours;
	document.getElementById('minutes').innerHTML = timeMinutes;

	// Marker punaseks
	if (previousMarker) {
		previousMarker.setStyle({
			color: 'red',
			fillOpacity: 0.8
		});
	}

	// Marker siniseks
	clickedMarker.setStyle({
		color: 'blue',
		fillOpacity: 0.8
	});

	// Markeri salvestamine mällu
	previousMarker = clickedMarker;
}

// Vahemaa
for (var i = 0; i < markerPoints.length; i++) {
	var punkt = markerPoints[i];
	var marker = L.circleMarker([punkt.lat, punkt.lng], {
		radius: 6.5,
		color: 'red',
		fillOpacity: 0.8
	}).addTo(map);
	marker.bindPopup('<b>Punkt nr ' + punkt.id + '</b><br>' +
		'Laiuskraad: ' + punkt.lat + '<br>' +
		'Pikkuskraad: ' + punkt.lng + '<br>' +
		'Vahemaa jõest alguspunkti: ' + punkt.distanceInKm + ' km<br>' +
		'<a class="button-link" href="#" onclick="openOtherMaps(' + punkt.lat + ', ' + punkt.lng + ')"><span class="button-link-text">Ava punkt Google Mapsis</a>');
	marker.on('click', markerClick);
	marker.options.id = punkt.id;
	marker.options.distanceFromStart = punkt.distanceFromStart;
	marker.options.distanceInKm = punkt.distanceInKm;
}

// Alumine info-abibox
document.addEventListener('DOMContentLoaded', function() {
	var footer = document.getElementById('footer');
	footer.addEventListener('click', function() {
		var infoHelp = document.createElement('div');
		infoHelp.innerHTML = '<center>' + 'Vali mingi punkt ning kliki sellele!' + '<br>' + 'Punktile klikkides avaneb täpsem info punkti kohta ja ka viide Google Mapsi.' + '<br><br><br>' + 'Rakenduse lõid <b>' + 'Oskar Kelt, Karl Michal ja Hendrik Markin Lõhmus';
		infoHelp.style.position = 'fixed';
		infoHelp.style.top = '50%';
		infoHelp.style.left = '50%';
		infoHelp.style.transform = 'translate(-50%, -50%)';
		infoHelp.style.backgroundColor = '#fff';
		infoHelp.style.padding = '20px';
		infoHelp.style.borderRadius = '8px';
		infoHelp.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.4)';
		infoHelp.style.zIndex = '9999';
		document.body.appendChild(infoHelp);

		// Kestus, kaua boks on ekraanil
		setTimeout(function() {
			document.body.removeChild(infoHelp);
		}, 2000);
	});
});
