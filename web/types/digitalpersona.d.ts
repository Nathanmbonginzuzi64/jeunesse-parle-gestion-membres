/// <reference path="../node_modules/@digitalpersona/fingerprint/dist/fingerprint.sdk.d.ts" />

export {};

declare global {
  interface Window {
    Fingerprint: typeof Fingerprint;
  }
}
