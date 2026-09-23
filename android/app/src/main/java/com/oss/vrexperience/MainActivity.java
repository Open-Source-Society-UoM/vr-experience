package com.oss.vrexperience;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.util.Log;

public class MainActivity extends Activity {

    private static final String TAG = "OSSVRExperience";
    private static final int PORT = 8765;
    private LocalWebServer server;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Start local HTTP server
        try {
            server = new LocalWebServer(getAssets(), PORT);
            Log.i(TAG, "Local server started on port " + PORT);
        } catch (Exception e) {
            Log.e(TAG, "Failed to start server", e);
        }

        // Wait 800ms for server to be ready, then open Quest Browser
        new Handler().postDelayed(() -> {
            String url = "http://localhost:" + PORT + "/";
            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

            // Try Quest Browser first, fall back to any browser
            intent.setPackage("com.oculus.browser");
            if (intent.resolveActivity(getPackageManager()) == null) {
                intent.setPackage(null);
            }

            startActivity(intent);

            // Move to background — keeps this activity (and the server) alive
            moveTaskToBack(true);
        }, 800);
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        if (server != null) server.stop();
    }
}
