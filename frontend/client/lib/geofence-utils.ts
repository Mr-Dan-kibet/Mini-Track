/**
 * Geofence Utilities for Frontend
 * 
 * Functions to validate if a location is within a route's geographic corridor
 */

export type GPSCoordinates = {
  lat: number
  lng: number
}

export type RouteGeofence = {
  starting_point_gps: string | null
  ending_point_gps: string | null
  route_radius_km: number
}

/**
 * Parse GPS string to coordinates
 * @param gpsString - Format: "latitude,longitude" e.g., "-1.2921,36.8219"
 * @returns GPSCoordinates or null if invalid
 */
export function parseGPS(gpsString: string | null | undefined): GPSCoordinates | null {
  if (!gpsString || typeof gpsString !== 'string') {
    return null
  }

  const parts = gpsString.split(',').map(s => s.trim())
  
  if (parts.length !== 2) {
    return null
  }

  const lat = parseFloat(parts[0])
  const lng = parseFloat(parts[1])

  // Validate ranges
  if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return null
  }

  return { lat, lng }
}

/**
 * Calculate distance between two GPS points using Haversine formula
 * @param point1 - First GPS point
 * @param point2 - Second GPS point
 * @returns Distance in kilometers
 */
export function haversineDistance(point1: GPSCoordinates, point2: GPSCoordinates): number {
  const R = 6371 // Earth radius in km

  const lat1Rad = (point1.lat * Math.PI) / 180
  const lat2Rad = (point2.lat * Math.PI) / 180
  const dLat = ((point2.lat - point1.lat) * Math.PI) / 180
  const dLng = ((point2.lng - point1.lng) * Math.PI) / 180

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(dLng / 2) * Math.sin(dLng / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c
}

/**
 * Calculate perpendicular distance from point to line segment
 * @param point - Point to check
 * @param lineStart - Start of line segment (route start)
 * @param lineEnd - End of line segment (route end)
 * @returns Distance in kilometers
 */
export function pointToLineDistance(
  point: GPSCoordinates,
  lineStart: GPSCoordinates,
  lineEnd: GPSCoordinates
): number {
  // Use lng as x, lat as y (approximate Cartesian for short distances)
  const px = point.lng
  const py = point.lat
  const ax = lineStart.lng
  const ay = lineStart.lat
  const bx = lineEnd.lng
  const by = lineEnd.lat

  // Vector from A to B
  const abx = bx - ax
  const aby = by - ay

  // Vector from A to P
  const apx = px - ax
  const apy = py - ay

  // Length squared of AB
  const abLengthSq = abx * abx + aby * aby

  if (abLengthSq === 0) {
    // A and B are the same point
    return haversineDistance(point, lineStart)
  }

  // Project AP onto AB, get parameter t (0 to 1)
  let t = (apx * abx + apy * aby) / abLengthSq
  t = Math.max(0, Math.min(1, t))

  // Closest point on line segment
  const closestX = ax + t * abx
  const closestY = ay + t * aby
  const closestPoint: GPSCoordinates = { lat: closestY, lng: closestX }

  // Distance from point to closest point on line
  return haversineDistance(point, closestPoint)
}

/**
 * Check if a location is within a route's geographic corridor
 * @param locationCoords - GPS coordinates to check
 * @param routeGeofence - Route's geofence data
 * @returns Object with validation result and distance
 */
export function isLocationWithinRouteCorridor(
  locationCoords: GPSCoordinates,
  routeGeofence: RouteGeofence
): {
  isValid: boolean
  distance: number | null
  errorMessage: string
} {
  // Parse route GPS coordinates
  const routeStart = parseGPS(routeGeofence.starting_point_gps)
  const routeEnd = parseGPS(routeGeofence.ending_point_gps)

  // If route doesn't have GPS boundaries, allow any location
  if (!routeStart || !routeEnd) {
    return {
      isValid: true,
      distance: null,
      errorMessage: ''
    }
  }

  // If no radius set or invalid radius, allow any location
  const radius = routeGeofence.route_radius_km
  if (!radius || radius <= 0) {
    return {
      isValid: true,
      distance: null,
      errorMessage: ''
    }
  }

  // Calculate distance from location to route line
  const distance = pointToLineDistance(locationCoords, routeStart, routeEnd)

  // Check if within corridor
  if (distance <= radius) {
    return {
      isValid: true,
      distance: distance,
      errorMessage: ''
    }
  } else {
    const routeName = 'this route' // You can pass route name if needed
    return {
      isValid: false,
      distance: distance,
      errorMessage: `This location is ${distance.toFixed(1)}km from ${routeName} (maximum allowed: ${radius}km)`
    }
  }
}

/**
 * Validate location string against route geofence
 * @param locationGPS - GPS string "lat,lng"
 * @param routeGeofence - Route's geofence data
 * @returns Validation result
 */
export function validateLocationGeofence(
  locationGPS: string | null | undefined,
  routeGeofence: RouteGeofence | null
): {
  isValid: boolean
  distance: number | null
  errorMessage: string
} {
  // Parse location coordinates
  const locationCoords = parseGPS(locationGPS)
  
  if (!locationCoords) {
    return {
      isValid: false,
      distance: null,
      errorMessage: 'Invalid GPS coordinates'
    }
  }

  // If no geofence data, allow any location
  if (!routeGeofence) {
    return {
      isValid: true,
      distance: null,
      errorMessage: ''
    }
  }

  // Check corridor
  return isLocationWithinRouteCorridor(locationCoords, routeGeofence)
}