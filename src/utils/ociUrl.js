/**
 * Utility functions for constructing OCI Object Storage URLs
 * Uses environment variables to build URLs from object paths
 */

/**
 * Constructs a full OCI Object Storage URL from an object path
 * @param {string|null|undefined} objectPath - The object path (e.g., "images/1234567890-image.jpg")
 * @returns {string|null} Full OCI URL for accessing the object
 */
export function getOciUrl(objectPath) {
  if (
    !objectPath ||
    objectPath === "null" ||
    objectPath === "undefined" ||
    objectPath === ""
  ) {
    return null;
  }

  // If it's already a full URL, return it as-is (for backward compatibility)
  if (typeof objectPath === "string" && objectPath.startsWith("https://")) {
    return objectPath;
  }

  // If it's a base64 data URL, return it as-is
  if (typeof objectPath === "string" && objectPath.startsWith("data:")) {
    return objectPath;
  }

  // Get environment variables (must be prefixed with REACT_APP_ for client-side access in React)
  const baseUrl =
    "https://yzs2ppflgbk8.objectstorage.ca-toronto-1.oci.customer-oci.com";
  const namespace = "yzs2ppflgbk8";
  const bucket = "digitalwall";

  // Validate required environment variables
  if (!baseUrl || !namespace || !bucket) {
    console.warn(
      "OCI environment variables not configured. Please set REACT_APP_OCI_BASE_URL, REACT_APP_OCI_NAMESPACE, and REACT_APP_OCI_BUCKET"
    );
    return null;
  }

  // Construct the OCI URL
  // Format: https://objectstorage.{region}.oraclecloud.com/n/{namespace}/b/{bucket}/o/{objectName}
  // Or if baseUrl is provided, use it directly
  const encodedObjectName = encodeURIComponent(objectPath);

  // If baseUrl already includes the full path structure, use it
  if (baseUrl.includes("/n/") && baseUrl.includes("/b/")) {
    // baseUrl is in format: https://objectstorage.{region}.oraclecloud.com/n/{namespace}/b/{bucket}
    return `${baseUrl}/o/${encodedObjectName}`;
  } else {
    // baseUrl is just the domain, construct full path
    return `${baseUrl}/n/${namespace}/b/${bucket}/o/${encodedObjectName}`;
  }
}

/**
 * Checks if a string is an OCI object path (not a full URL)
 * @param {string|null|undefined} path - The path to check
 * @returns {boolean} true if it's an object path, false if it's a full URL or data URL
 */
export function isOciObjectPath(path) {
  if (!path) return false;
  if (path.startsWith("https://") || path.startsWith("data:")) return false;
  return true;
}

