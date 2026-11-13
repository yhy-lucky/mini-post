export interface Coordinates {
  latitude: number
  longitude: number
}

export const GEOLOCATION_OPTIONS: PositionOptions = {
  timeout: 8000,
  maximumAge: 10 * 60 * 1000
}

export function isGeolocationSupported(): boolean {
  return typeof navigator !== 'undefined' && Boolean(navigator.geolocation)
}

export function getCurrentLocation(): Promise<Coordinates> {
  return new Promise((resolve, reject) => {
    if (!isGeolocationSupported()) {
      reject(new Error('浏览器不支持定位'))
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude })
      },
      (error) => {
        reject(new Error(error.message || '定位失败'))
      },
      GEOLOCATION_OPTIONS
    )
  })
}
