package com.oss.vrexperience;

import android.content.res.AssetManager;
import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;
import fi.iki.elonen.NanoHTTPD;

public class LocalWebServer extends NanoHTTPD {

    private final AssetManager assets;
    private static final String ASSETS_ROOT = "public";

    private static final Map<String, String> MIME = new HashMap<>();
    static {
        MIME.put("html", "text/html");
        MIME.put("js",   "application/javascript");
        MIME.put("css",  "text/css");
        MIME.put("json", "application/json");
        MIME.put("png",  "image/png");
        MIME.put("jpg",  "image/jpeg");
        MIME.put("gif",  "image/gif");
        MIME.put("svg",  "image/svg+xml");
        MIME.put("woff", "font/woff");
        MIME.put("woff2","font/woff2");
    }

    public LocalWebServer(AssetManager assets, int port) throws IOException {
        super(port);
        this.assets = assets;
        start(NanoHTTPD.SOCKET_READ_TIMEOUT, false);
    }

    @Override
    public Response serve(IHTTPSession session) {
        String uri = session.getUri();
        if (uri.equals("/")) uri = "/index.html";

        // Strip leading slash, build asset path
        String assetPath = ASSETS_ROOT + uri;

        try {
            InputStream is = assets.open(assetPath);
            String ext = uri.contains(".") ? uri.substring(uri.lastIndexOf('.') + 1) : "html";
            String mime = MIME.getOrDefault(ext, "application/octet-stream");
            return newChunkedResponse(Response.Status.OK, mime, is);
        } catch (IOException e) {
            return newFixedLengthResponse(Response.Status.NOT_FOUND, "text/plain", "Not found: " + uri);
        }
    }
}
