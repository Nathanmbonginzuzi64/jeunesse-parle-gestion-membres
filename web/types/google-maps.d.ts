/** Déclarations minimales pour l'API Maps JavaScript (chargement dynamique). */
declare namespace google.maps {
  class Map {
    constructor(el: HTMLElement, opts: MapOptions);
    setCenter(latLng: LatLngLiteral): void;
    fitBounds(bounds: LatLngBounds): void;
  }
  class Marker {
    constructor(opts: MarkerOptions);
    setMap(map: Map | null): void;
    addListener(event: string, handler: () => void): void;
  }
  class InfoWindow {
    constructor(opts?: { content?: string });
    setContent(content: string): void;
    open(map: Map, marker?: Marker): void;
    close(): void;
  }
  class LatLngBounds {
    extend(point: LatLngLiteral): void;
  }
  interface MapOptions {
    center?: LatLngLiteral;
    zoom?: number;
    mapTypeControl?: boolean;
    streetViewControl?: boolean;
    fullscreenControl?: boolean;
    styles?: Array<Record<string, unknown>>;
  }
  interface MarkerOptions {
    map?: Map;
    position?: LatLngLiteral;
    title?: string;
    label?: string | { text: string; color?: string; fontWeight?: string };
    icon?: { path?: number; scale?: number; fillColor?: string; fillOpacity?: number; strokeColor?: string; strokeWeight?: number };
  }
  interface LatLngLiteral {
    lat: number;
    lng: number;
  }
  enum SymbolPath {
    CIRCLE = 0,
  }
}

declare const google: { maps: typeof google.maps };

interface Window {
  google?: typeof google;
}
