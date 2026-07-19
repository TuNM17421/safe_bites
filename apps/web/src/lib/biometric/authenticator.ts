import { SimulatedAuthenticator } from './simulated-authenticator';

// Stable seam for the biometric unlock ceremony. Today only a simulated implementation exists so
// the app is never blocked on WebAuthn availability. A real adapter wrapping @simplewebauthn/browser
// (`webauthn-authenticator.ts`) can land behind this same interface with NO UI change.
export interface BiometricAuthenticator {
  isAvailable(): Promise<boolean>;
  register(): Promise<void>;
  authenticate(): Promise<boolean>;
}

// The ONLY construction site — swap the returned implementation to go real.
export function getAuthenticator(): BiometricAuthenticator {
  return new SimulatedAuthenticator();
}
