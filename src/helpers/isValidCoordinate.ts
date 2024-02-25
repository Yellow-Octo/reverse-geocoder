export function isValidLat(lat: number): boolean {
  return lat >= -90 && lat <= 90;
}

export function isValidLng(lng: number): boolean {
  return lng >= -180 && lng <= 180;
}
