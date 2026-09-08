import { createDesktopOperatorRegistrationInput } from './desktop-operator-registration';
import {
  getExternalPluginRegistration,
  installExternalPluginRegistration,
  type ExternalPluginRegistration,
  type ExternalPluginUnixSocketTransport,
} from './external-registration';

function isForgeDesktopOperatorBinding(
  registration: ExternalPluginRegistration,
): registration is ExternalPluginRegistration & { transport: ExternalPluginUnixSocketTransport } {
  return registration.pluginId === 'desktop_operator'
    && registration.providerPluginId === 'desktop_operator'
    && registration.provider === 'local-macos'
    && registration.scope === 'controller'
    && registration.transport.kind === 'unix_socket_jsonl';
}

/**
 * Reconcile one installed first-party external provider to the current Forge-owned
 * policy contract while preserving installation/runtime identity. The external
 * registration store remains the only persistence, fingerprint and revision
 * authority; this layer only materializes desired state from current source.
 */
export function reconcileFirstPartyExternalPluginRegistration(
  controllerHome: string,
  pluginId: string,
): ExternalPluginRegistration | undefined {
  const existing = getExternalPluginRegistration(controllerHome, pluginId);
  if (!existing) return undefined;
  if (pluginId !== 'desktop_operator' || !isForgeDesktopOperatorBinding(existing)) return existing;

  const lifecycle = existing.lifecycle?.kind === 'verified_user_launch_agent'
    ? existing.lifecycle
    : undefined;
  const desired = createDesktopOperatorRegistrationInput({
    socketPath: existing.transport.socketPath,
    launchAgentLabel: lifecycle?.label,
    expectedProgramContains: lifecycle?.expectedProgramContains,
    pluginVersion: existing.pluginVersion,
    protocolVersion: existing.protocolVersion,
    enabled: existing.enabled,
  });
  return installExternalPluginRegistration(controllerHome, desired);
}

/** Reconcile every currently installed first-party external provider. */
export function reconcileFirstPartyExternalPluginRegistrations(controllerHome: string): ExternalPluginRegistration[] {
  const desktop = reconcileFirstPartyExternalPluginRegistration(controllerHome, 'desktop_operator');
  return desktop ? [desktop] : [];
}
