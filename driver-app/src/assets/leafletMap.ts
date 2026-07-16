/**
 * Self-contained Leaflet/OpenStreetMap page for the MapScreen WebView.
 * Mirrors frontend/src/components/MapContainer.jsx's tile source and marker
 * approach so the driver app's map looks and behaves like the admin panel's.
 *
 * Shipped as a template string (not a static .html file) so it loads via
 * WebView's `source={{ html }}` with no extra Metro asset configuration.
 * RN pushes position updates in with `webViewRef.current.postMessage(json)`;
 * the dual `document`/`window` "message" listeners below are the standard
 * cross-platform pattern for react-native-webview (Android vs iOS).
 */
export const LEAFLET_MAP_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; background: #0f172a; }
    .amb-marker, .inc-marker {
      width: 18px; height: 18px; border-radius: 50%;
      border: 3px solid #fff; box-shadow: 0 2px 6px rgba(0,0,0,0.5);
    }
    .amb-marker { background: #10B981; }
    .inc-marker { background: #EF4444; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    var map = L.map('map', { zoomControl: true }).setView([20.7, 78.6], 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);

    var ambIcon = L.divIcon({ className: 'amb-marker', iconSize: [18, 18] });
    var incIcon = L.divIcon({ className: 'inc-marker', iconSize: [18, 18] });

    var ambMarker = null;
    var incMarker = null;
    var routeLine = null;
    var didInitialFit = false;

    function render(data) {
      if (data.command === 'recenter') {
        if (ambMarker && incMarker) {
          map.fitBounds(L.latLngBounds([ambMarker.getLatLng(), incMarker.getLatLng()]), { padding: [40, 40] });
        } else if (ambMarker) {
          map.setView(ambMarker.getLatLng(), 15);
        }
        return;
      }

      var amb = data.ambulance;
      var inc = data.emergency;

      if (amb) {
        var ambLatLng = [amb.latitude, amb.longitude];
        if (!ambMarker) {
          ambMarker = L.marker(ambLatLng, { icon: ambIcon }).addTo(map).bindPopup('Your position');
        } else {
          ambMarker.setLatLng(ambLatLng);
        }
      }

      if (inc) {
        var incLatLng = [inc.latitude, inc.longitude];
        if (!incMarker) {
          incMarker = L.marker(incLatLng, { icon: incIcon }).addTo(map).bindPopup(inc.description || 'Emergency');
        } else {
          incMarker.setLatLng(incLatLng);
        }
      }

      if (amb && inc) {
        var line = [[amb.latitude, amb.longitude], [inc.latitude, inc.longitude]];
        if (!routeLine) {
          routeLine = L.polyline(line, { color: '#3B82F6', weight: 4, opacity: 0.85, dashArray: '8,8' }).addTo(map);
        } else {
          routeLine.setLatLngs(line);
        }
      }

      if (!didInitialFit && amb && inc) {
        didInitialFit = true;
        map.fitBounds(L.latLngBounds([[amb.latitude, amb.longitude], [inc.latitude, inc.longitude]]), { padding: [40, 40] });
      } else if (!didInitialFit && amb) {
        didInitialFit = true;
        map.setView([amb.latitude, amb.longitude], 15);
      }
    }

    function handleMessage(raw) {
      try {
        render(JSON.parse(raw));
      } catch (err) {
        /* ignore malformed payloads */
      }
    }

    document.addEventListener('message', function (e) { handleMessage(e.data); });
    window.addEventListener('message', function (e) { handleMessage(e.data); });

    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage('ready');
    }
  </script>
</body>
</html>`;
