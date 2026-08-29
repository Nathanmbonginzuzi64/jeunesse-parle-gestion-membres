"use client";

/// <reference path="../../types/digitalpersona.d.ts" />

import Script from "next/script";
import { useState } from "react";

const WEBSDK = "/vendor/digitalpersona/websdk.client.ui.min.js";
const FINGERPRINT_SDK = "/vendor/digitalpersona/fingerprint.sdk.min.js";

let scriptsReadyPromise: Promise<void> | null = null;

export function waitForDigitalPersona(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("DigitalPersona disponible uniquement dans le navigateur."));
  }
  if (window.Fingerprint?.WebApi) {
    return Promise.resolve();
  }
  if (!scriptsReadyPromise) {
    scriptsReadyPromise = new Promise((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        reject(new Error("Timeout chargement DigitalPersona SDK."));
      }, 15000);
      const check = () => {
        if (window.Fingerprint?.WebApi) {
          window.clearTimeout(timeout);
          resolve();
        } else {
          window.setTimeout(check, 120);
        }
      };
      check();
    });
  }
  return scriptsReadyPromise;
}

export function DigitalPersonaScripts() {
  const [websdkLoaded, setWebsdkLoaded] = useState(false);

  return (
    <>
      <Script
        id="digitalpersona-websdk"
        src={WEBSDK}
        strategy="lazyOnload"
        onLoad={() => setWebsdkLoaded(true)}
      />
      {websdkLoaded && (
        <Script
          id="digitalpersona-fingerprint"
          src={FINGERPRINT_SDK}
          strategy="lazyOnload"
          onLoad={() => {
            if (window.Fingerprint?.WebApi) {
              scriptsReadyPromise = Promise.resolve();
            }
          }}
        />
      )}
    </>
  );
}

export const DIGITALPERSONA_LITE_CLIENT_URL = "https://digitalpersona.hidglobal.com/lite-client/";
