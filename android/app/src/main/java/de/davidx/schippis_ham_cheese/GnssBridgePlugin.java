package de.davidx.schippis_ham_cheese;

import android.Manifest;
import android.annotation.SuppressLint;
import android.content.Context;
import android.content.pm.PackageManager;
import android.location.GnssStatus;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Looper;

import androidx.core.content.ContextCompat;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;

import java.util.LinkedHashMap;
import java.util.Map;

@CapacitorPlugin(
        name = "GnssBridge",
        permissions = {
                @Permission(strings = {Manifest.permission.ACCESS_FINE_LOCATION}, alias = "location"),
                @Permission(strings = {Manifest.permission.ACCESS_COARSE_LOCATION}, alias = "coarseLocation")
        }
)
public class GnssBridgePlugin extends Plugin {
    private LocationManager locationManager;
    private boolean started = false;

    private final LocationListener locationListener = new LocationListener() {
        @Override
        public void onLocationChanged(Location location) {
            notifyListeners("gnssLocation", buildLocationPayload(location));
        }

        @Override
        public void onStatusChanged(String provider, int status, Bundle extras) {}

        @Override
        public void onProviderEnabled(String provider) {}

        @Override
        public void onProviderDisabled(String provider) {}
    };

    private final GnssStatus.Callback gnssCallback = new GnssStatus.Callback() {
        @Override
        public void onStarted() {
            JSObject obj = new JSObject();
            obj.put("status", "started");
            notifyListeners("gnssMeta", obj);
        }

        @Override
        public void onStopped() {
            JSObject obj = new JSObject();
            obj.put("status", "stopped");
            notifyListeners("gnssMeta", obj);
        }

        @Override
        public void onFirstFix(int ttffMillis) {
            JSObject obj = new JSObject();
            obj.put("status", "firstFix");
            obj.put("ttffMillis", ttffMillis);
            notifyListeners("gnssMeta", obj);
        }

        @Override
        public void onSatelliteStatusChanged(GnssStatus status) {
            notifyListeners("gnssStatus", buildGnssPayload(status));
        }
    };

    @Override
    public void load() {
        super.load();
        locationManager = (LocationManager) getContext().getSystemService(Context.LOCATION_SERVICE);
    }

    @PluginMethod
    public void start(PluginCall call) {
        if (!hasFineLocationPermission()) {
            requestPermissionForAlias("location", call, "permCallback");
            return;
        }
        try {
            startInternal();
            JSObject res = new JSObject();
            res.put("ok", true);
            call.resolve(res);
        } catch (Exception ex) {
            call.reject(ex.getMessage(), ex);
        }
    }

    @PluginMethod
    public void stop(PluginCall call) {
        stopInternal();
        JSObject res = new JSObject();
        res.put("ok", true);
        call.resolve(res);
    }

    @PluginMethod
    public void getSnapshot(PluginCall call) {
        JSObject out = new JSObject();
        try {
            if (hasFineLocationPermission() && locationManager != null) {
                Location last = null;
                try { last = locationManager.getLastKnownLocation(LocationManager.GPS_PROVIDER); } catch (Exception ignored) {}
                if (last == null) {
                    try { last = locationManager.getLastKnownLocation(LocationManager.NETWORK_PROVIDER); } catch (Exception ignored) {}
                }
                if (last != null) out.put("location", buildLocationPayload(last));
            }
        } catch (Exception ignored) {}
        call.resolve(out);
    }

    @SuppressWarnings("unused")
    @PluginMethod(returnType = PluginMethod.RETURN_CALLBACK)
    public void permCallback(PluginCall call) {
        PermissionState state = getPermissionState("location");
        if (state == PermissionState.GRANTED) {
            start(call);
        } else {
            call.reject("Location permission denied");
        }
    }

    @Override
    protected void handleOnPause() {
        super.handleOnPause();
        stopInternal();
    }

    @Override
    protected void handleOnResume() {
        super.handleOnResume();
        if (hasFineLocationPermission() && started) {
            try { startInternal(); } catch (Exception ignored) {}
        }
    }

    @Override
    protected void handleOnDestroy() {
        stopInternal();
        super.handleOnDestroy();
    }

    @SuppressLint("MissingPermission")
    private void startInternal() {
        if (locationManager == null) {
            locationManager = (LocationManager) getContext().getSystemService(Context.LOCATION_SERVICE);
        }
        if (locationManager == null) {
            throw new IllegalStateException("LocationManager not available");
        }
        if (!hasFineLocationPermission()) {
            throw new IllegalStateException("Fine location permission not granted");
        }
        stopInternal();
        started = true;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            locationManager.registerGnssStatusCallback(getContext().getMainExecutor(), gnssCallback);
        } else {
            locationManager.registerGnssStatusCallback(gnssCallback, new android.os.Handler(Looper.getMainLooper()));
        }

        if (locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER)) {
            locationManager.requestLocationUpdates(LocationManager.GPS_PROVIDER, 1000L, 0f, locationListener, Looper.getMainLooper());
        }
        if (locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)) {
            locationManager.requestLocationUpdates(LocationManager.NETWORK_PROVIDER, 2000L, 0f, locationListener, Looper.getMainLooper());
        }
    }

    private void stopInternal() {
        started = false;
        if (locationManager == null) return;
        try { locationManager.removeUpdates(locationListener); } catch (Exception ignored) {}
        try { locationManager.unregisterGnssStatusCallback(gnssCallback); } catch (Exception ignored) {}
    }

    private boolean hasFineLocationPermission() {
        return ContextCompat.checkSelfPermission(getContext(), Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED;
    }

    private JSObject buildLocationPayload(Location location) {
        JSObject obj = new JSObject();
        obj.put("provider", location.getProvider() != null ? location.getProvider() : "gps");
        obj.put("latitude", location.getLatitude());
        obj.put("longitude", location.getLongitude());
        if (location.hasAccuracy()) obj.put("accuracy", location.getAccuracy());
        if (location.hasAltitude()) obj.put("altitude", location.getAltitude());
        if (location.hasSpeed()) obj.put("speed", location.getSpeed());
        if (location.hasBearing()) obj.put("bearing", location.getBearing());
        obj.put("timestamp", location.getTime());
        return obj;
    }

    private JSObject buildGnssPayload(GnssStatus status) {
        JSObject obj = new JSObject();
        int total = status.getSatelliteCount();
        int used = 0;
        Map<String, int[]> systems = new LinkedHashMap<>();
        JSArray sats = new JSArray();

        for (int i = 0; i < total; i++) {
            boolean usedInFix = status.usedInFix(i);
            if (usedInFix) used++;
            String systemName = getConstellationName(status.getConstellationType(i));
            int[] counts = systems.containsKey(systemName) ? systems.get(systemName) : new int[]{0, 0};
            counts[0] += 1;
            if (usedInFix) counts[1] += 1;
            systems.put(systemName, counts);

            JSObject sat = new JSObject();
            sat.put("svid", status.getSvid(i));
            sat.put("system", systemName);
            sat.put("used", usedInFix);
            sat.put("cn0DbHz", status.getCn0DbHz(i));
            sat.put("azimuthDegrees", status.getAzimuthDegrees(i));
            sat.put("elevationDegrees", status.getElevationDegrees(i));
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                sat.put("hasCarrierFrequencyHz", status.hasCarrierFrequencyHz(i));
                if (status.hasCarrierFrequencyHz(i)) sat.put("carrierFrequencyHz", status.getCarrierFrequencyHz(i));
            }
            sats.put(sat);
        }

        JSArray systemRows = new JSArray();
        for (Map.Entry<String, int[]> entry : systems.entrySet()) {
            JSObject row = new JSObject();
            row.put("name", entry.getKey());
            row.put("visible", entry.getValue()[0]);
            row.put("used", entry.getValue()[1]);
            systemRows.put(row);
        }

        obj.put("visible", total);
        obj.put("used", used);
        obj.put("systems", systemRows);
        obj.put("satellites", sats);
        return obj;
    }

    private String getConstellationName(int type) {
        switch (type) {
            case GnssStatus.CONSTELLATION_GPS: return "GPS";
            case GnssStatus.CONSTELLATION_SBAS: return "SBAS";
            case GnssStatus.CONSTELLATION_GLONASS: return "GLONASS";
            case GnssStatus.CONSTELLATION_QZSS: return "QZSS";
            case GnssStatus.CONSTELLATION_BEIDOU: return "BeiDou";
            case GnssStatus.CONSTELLATION_GALILEO: return "Galileo";
            case GnssStatus.CONSTELLATION_IRNSS: return "NavIC";
            default: return "Unknown";
        }
    }
}
