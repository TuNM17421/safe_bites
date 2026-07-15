import type { BiometricAuthenticator } from './authenticator';

// Simulated biometric ceremony — always available, always succeeds after a short delay so the
// unlock flow can be exercised end-to-end without a real authenticator. The device key that
// actually protects the data (local-crypto) is unaffected by which authenticator is used.
export class SimulatedAuthenticator implements BiometricAuthenticator {
  async isAvailable(): Promise<boolean> {
    return true;
  }

  async register(): Promise<void> {
    // No credential to persist in simulation; the real adapter stores one here.
  }

  async authenticate(): Promise<boolean> {
    await new Promise((resolve) => setTimeout(resolve, 900));
    return true;
  }
}
