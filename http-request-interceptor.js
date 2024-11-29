/**
 * Intercept and Monitor Fetch and XMLHttpRequest (XHR) Requests with Optional Domain Filtering
 * 
 * This script is designed to monitor and capture HTTP requests made using the `fetch` API and `XMLHttpRequest`.
 * It can optionally filter requests based on a specified domain and capture relevant request and response details.
 * Captured data is pushed to the `dataLayer` for tracking or debugging purposes.
 *
 * Configuration Options:
 * ----------------------
 * - `enableDomainFiltering` (boolean): Enables or disables domain-based filtering.
 *   - Set to `true` to capture only requests matching the `targetDomain`.
 *   - Set to `false` to capture all requests.
 * 
 * - `targetDomain` (string): The domain to filter for when `enableDomainFiltering` is enabled.
 *   - Example: 'example.com' will match requests to 'https://example.com/api'.
 *   - Ignored when `enableDomainFiltering` is set to `false`.
 *
 * Features:
 * ---------
 * 1. Intercepts `fetch` and `XMLHttpRequest` (XHR) requests.
 * 2. Captures request details, including:
 *    - URL
 *    - HTTP method (GET, POST, etc.)
 *    - Request body (JSON, FormData, or raw data)
 *    - Response body (if available and parsable as JSON)
 *    - HTTP status code
 * 3. Optionally filters requests by domain (when `enableDomainFiltering` is enabled).
 * 4. Pushes captured data to the `dataLayer` for use in Google Tag Manager or analytics tools.
 * 5. Ensures original `fetch` and `XHR` behavior remains intact for all requests.
 *
 * Example Use Cases:
 * ------------------
 * - Debugging HTTP requests and responses in real-time.
 * - Capturing analytics data for specific API calls.
 * - Tracking requests made to a specific domain or endpoint.
 *
 * Example Configurations:
 * -----------------------
 * // Enable domain filtering and capture only requests to 'example.com'
 * var enableDomainFiltering = true;
 * var targetDomain = 'example.com';
 *
 * // Disable domain filtering and capture all requests
 * var enableDomainFiltering = false;
 *
 * Installation:
 * -------------
 * 1. Copy the script into your project or paste it into the browser console for testing.
 * 2. Configure the `enableDomainFiltering` and `targetDomain` variables as needed.
 * 3. Observe the captured data in the console or the `dataLayer`.
 *
 * Author:
 * -------
 * Abdelhamid El Abbassi
 * License:
 * --------
 * MIT License
 */

(function() {
    // Configuration
    var enableDomainFiltering = true; // Set to false to disable domain filtering
    var targetDomain = 'example.com'; // Specify the domain to filter for when enabled

    // Function to check if domain filtering is enabled and matches
    function isDomainAllowed(url) {
        if (!enableDomainFiltering) {
            return true; // If filtering is disabled, allow all domains
        }
        return url.includes(targetDomain); // Check if the URL includes the target domain
    }

    // Intercept fetch
    var originalFetch = window.fetch;
    window.fetch = function() {
        var apiUrl = arguments[0]; // The URL of the API call

        if (isDomainAllowed(apiUrl)) {
            console.log('API Call (fetch) URL:', apiUrl);

            if (arguments[1]) {
                var options = arguments[1];
                var fetchPayload = {
                    event: 'fetchRequest',
                    apiUrl: apiUrl,
                    method: options.method || 'GET',
                    body: null,
                    headers: options.headers || {}
                };

                if (options.body) {
                    if (typeof options.body === 'string') {
                        try {
                            fetchPayload.body = JSON.parse(options.body);
                        } catch (e) {
                            fetchPayload.body = options.body; // Raw string body
                        }
                    } else if (options.body instanceof FormData) {
                        var formDataObject = {};
                        options.body.forEach(function(value, key) {
                            formDataObject[key] = value;
                        });
                        fetchPayload.body = formDataObject;
                    } else {
                        fetchPayload.body = options.body; // Raw body
                    }
                }

                // Push fetch data to dataLayer
                window.dataLayer = window.dataLayer || [];
                window.dataLayer.push(fetchPayload);
                console.log('Fetch data pushed to dataLayer:', fetchPayload);
            }
        }

        return originalFetch.apply(this, arguments); // Continue with the original fetch
    };

    // Intercept XMLHttpRequest
    var originalXhrOpen = XMLHttpRequest.prototype.open;
    var originalXhrSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function(method, url) {
        this._method = method; // Save HTTP method
        this._url = url;       // Save URL
        return originalXhrOpen.apply(this, arguments);
    };

    XMLHttpRequest.prototype.send = function(body) {
        if (isDomainAllowed(this._url)) {
            this._body = body; // Save the request body

            // Push data to dataLayer after the request completes
            var xhr = this;
            xhr.addEventListener('load', function() {
                var xhrPayload = {
                    event: 'xhrRequest',
                    apiUrl: xhr._url,
                    method: xhr._method,
                    body: null,
                    response: null,
                    status: xhr.status
                };

                // Capture the request body
                if (xhr._body) {
                    if (xhr._body instanceof FormData) {
                        var formDataObject = {};
                        xhr._body.forEach(function(value, key) {
                            formDataObject[key] = value;
                        });
                        xhrPayload.body = formDataObject;
                    } else {
                        try {
                            xhrPayload.body = JSON.parse(xhr._body);
                        } catch (e) {
                            xhrPayload.body = xhr._body; // Raw string or other body
                        }
                    }
                }

                // Capture the response
                try {
                    xhrPayload.response = JSON.parse(xhr.responseText); // Parse JSON response
                } catch (e) {
                    xhrPayload.response = xhr.responseText; // Raw response if not JSON
                }

                // Push xhr data to dataLayer
                window.dataLayer = window.dataLayer || [];
                window.dataLayer.push(xhrPayload);
                console.log('XHR data pushed to dataLayer:', xhrPayload);
            });
        }

        return originalXhrSend.apply(this, arguments);
    };
})();
