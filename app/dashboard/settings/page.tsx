"use client";

import { useMutation, useQuery } from "convex/react";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/convex/_generated/api";

type DefaultView = "grid" | "table";
type ThemeMode = "dark" | "light" | "system";

const defaultSettings = {
  emailNotifications: true,
  notifyOnTraction: true,
  notifyOnDown: true,
  defaultView: "grid" as DefaultView,
  theme: "system" as ThemeMode,
};

export default function SettingsPage() {
  const settings = useQuery(api.settings.get);
  const connections = useQuery(api.connections.list);
  const upsertSettings = useMutation(api.settings.upsert);
  const upsertConnection = useMutation(api.connections.upsert);
  const removeConnection = useMutation(api.connections.remove);

  const [emailNotifications, setEmailNotifications] = useState(
    defaultSettings.emailNotifications
  );
  const [notifyOnTraction, setNotifyOnTraction] = useState(
    defaultSettings.notifyOnTraction
  );
  const [notifyOnDown, setNotifyOnDown] = useState(defaultSettings.notifyOnDown);
  const [defaultView, setDefaultView] = useState<DefaultView>(
    defaultSettings.defaultView
  );
  const [theme, setTheme] = useState<ThemeMode>(defaultSettings.theme);
  const [vercelToken, setVercelToken] = useState("");

  const [settingsHydrated, setSettingsHydrated] = useState(false);
  const [connectionsHydrated, setConnectionsHydrated] = useState(false);

  const [notificationsError, setNotificationsError] = useState<string | null>(null);
  const [displayError, setDisplayError] = useState<string | null>(null);
  const [integrationsError, setIntegrationsError] = useState<string | null>(null);

  const [isSavingNotifications, setIsSavingNotifications] = useState(false);
  const [isSavingDisplay, setIsSavingDisplay] = useState(false);
  const [isSavingIntegrations, setIsSavingIntegrations] = useState(false);

  const vercelConnection = useMemo(
    () => connections?.find((connection) => connection.service === "vercel"),
    [connections]
  );

  useEffect(() => {
    if (settings === undefined || settingsHydrated) return;

    setEmailNotifications(
      settings?.emailNotifications ?? defaultSettings.emailNotifications
    );
    setNotifyOnTraction(settings?.notifyOnTraction ?? defaultSettings.notifyOnTraction);
    setNotifyOnDown(settings?.notifyOnDown ?? defaultSettings.notifyOnDown);
    setDefaultView(settings?.defaultView ?? defaultSettings.defaultView);
    setTheme(settings?.theme ?? defaultSettings.theme);
    setSettingsHydrated(true);
  }, [settings, settingsHydrated]);

  useEffect(() => {
    if (connections === undefined || connectionsHydrated) return;

    setVercelToken(vercelConnection?.accessToken ?? "");
    setConnectionsHydrated(true);
  }, [connections, connectionsHydrated, vercelConnection]);

  const handleSaveNotifications = async () => {
    setNotificationsError(null);
    setIsSavingNotifications(true);

    try {
      await upsertSettings({
        emailNotifications,
        notifyOnTraction,
        notifyOnDown,
      });
    } catch (err) {
      setNotificationsError(
        err instanceof Error ? err.message : "Failed to save notifications."
      );
    } finally {
      setIsSavingNotifications(false);
    }
  };

  const handleSaveDisplay = async () => {
    setDisplayError(null);
    setIsSavingDisplay(true);

    try {
      await upsertSettings({ defaultView, theme });
    } catch (err) {
      setDisplayError(err instanceof Error ? err.message : "Failed to save display.");
    } finally {
      setIsSavingDisplay(false);
    }
  };

  const handleSaveIntegrations = async () => {
    setIntegrationsError(null);
    setIsSavingIntegrations(true);

    const trimmedToken = vercelToken.trim();

    try {
      if (!trimmedToken) {
        if (vercelConnection) {
          await removeConnection({ service: "vercel" });
        }
      } else {
        await upsertConnection({ service: "vercel", accessToken: trimmedToken });
      }
    } catch (err) {
      setIntegrationsError(
        err instanceof Error ? err.message : "Failed to save integration."
      );
    } finally {
      setIsSavingIntegrations(false);
    }
  };

  const settingsReady = settings !== undefined;
  const connectionsReady = connections !== undefined;

  return (
    <div className="p-8 max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-display font-semibold text-text-light">
          Settings
        </h1>
        <p className="text-text-dim">Tune Overmind to your workflow.</p>
      </div>

      <section className="card p-6 space-y-6">
        <div>
          <h2 className="text-lg font-display font-semibold text-text-light">
            Notifications
          </h2>
          <p className="text-sm text-text-dim">
            Choose when Overmind should reach out.
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex items-start justify-between gap-6">
            <div>
              <label
                htmlFor="email-notifications"
                className="text-sm font-medium text-text-light"
              >
                Email updates
              </label>
              <p className="text-sm text-text-dim">
                Weekly summaries and highlights.
              </p>
            </div>
            <input
              id="email-notifications"
              type="checkbox"
              checked={emailNotifications}
              onChange={(event) => setEmailNotifications(event.target.checked)}
              className="mt-1 h-4 w-4 rounded border-border-subtle bg-bg-elevated text-hive focus:ring-2 focus:ring-hive-glow"
            />
          </div>

          <div className="flex items-start justify-between gap-6">
            <div>
              <label
                htmlFor="traction-alerts"
                className="text-sm font-medium text-text-light"
              >
                Traction alerts
              </label>
              <p className="text-sm text-text-dim">
                Notify me when a product spikes in traffic.
              </p>
            </div>
            <input
              id="traction-alerts"
              type="checkbox"
              checked={notifyOnTraction}
              onChange={(event) => setNotifyOnTraction(event.target.checked)}
              className="mt-1 h-4 w-4 rounded border-border-subtle bg-bg-elevated text-hive focus:ring-2 focus:ring-hive-glow"
            />
          </div>

          <div className="flex items-start justify-between gap-6">
            <div>
              <label
                htmlFor="downtime-alerts"
                className="text-sm font-medium text-text-light"
              >
                Downtime alerts
              </label>
              <p className="text-sm text-text-dim">
                Get pinged when a product goes down.
              </p>
            </div>
            <input
              id="downtime-alerts"
              type="checkbox"
              checked={notifyOnDown}
              onChange={(event) => setNotifyOnDown(event.target.checked)}
              className="mt-1 h-4 w-4 rounded border-border-subtle bg-bg-elevated text-hive focus:ring-2 focus:ring-hive-glow"
            />
          </div>
        </div>

        {notificationsError && (
          <p className="text-sm text-spore">{notificationsError}</p>
        )}

        <div className="flex items-center gap-3">
          <button
            type="button"
            className="btn-primary px-4 py-2 text-sm font-medium disabled:opacity-60"
            onClick={handleSaveNotifications}
            disabled={!settingsReady || isSavingNotifications}
          >
            {isSavingNotifications ? "Saving..." : "Save notifications"}
          </button>
        </div>
      </section>

      <section className="card p-6 space-y-6">
        <div>
          <h2 className="text-lg font-display font-semibold text-text-light">Display</h2>
          <p className="text-sm text-text-dim">Control how data is presented.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm text-text-dim mb-2" htmlFor="view">
              Default view
            </label>
            <select
              id="view"
              value={defaultView}
              onChange={(event) => setDefaultView(event.target.value as DefaultView)}
              className="w-full rounded-lg bg-bg-elevated border border-border-subtle text-text-light px-3 py-2 focus:outline-none focus:border-border-glow focus:ring-2 focus:ring-hive-glow"
            >
              <option value="grid">Grid</option>
              <option value="table">Table</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-text-dim mb-2" htmlFor="theme">
              Theme
            </label>
            <select
              id="theme"
              value={theme}
              onChange={(event) => setTheme(event.target.value as ThemeMode)}
              className="w-full rounded-lg bg-bg-elevated border border-border-subtle text-text-light px-3 py-2 focus:outline-none focus:border-border-glow focus:ring-2 focus:ring-hive-glow"
            >
              <option value="dark">Dark</option>
              <option value="light">Light</option>
              <option value="system">System</option>
            </select>
          </div>
        </div>

        {displayError && <p className="text-sm text-spore">{displayError}</p>}

        <div className="flex items-center gap-3">
          <button
            type="button"
            className="btn-primary px-4 py-2 text-sm font-medium disabled:opacity-60"
            onClick={handleSaveDisplay}
            disabled={!settingsReady || isSavingDisplay}
          >
            {isSavingDisplay ? "Saving..." : "Save display"}
          </button>
        </div>
      </section>

      <section className="card p-6 space-y-6">
        <div>
          <h2 className="text-lg font-display font-semibold text-text-light">
            Integrations
          </h2>
          <p className="text-sm text-text-dim">
            Connect Overmind to the services that power your products.
          </p>
        </div>

        <div>
          <label className="block text-sm text-text-dim mb-2" htmlFor="vercel-token">
            Vercel API token
          </label>
          <input
            id="vercel-token"
            type="password"
            value={vercelToken}
            onChange={(event) => setVercelToken(event.target.value)}
            className="w-full rounded-lg bg-bg-elevated border border-border-subtle text-text-light px-3 py-2 focus:outline-none focus:border-border-glow focus:ring-2 focus:ring-hive-glow"
            placeholder="vercel_xxxxx"
          />
          <p className="text-xs text-text-dim mt-2">
            Stored securely in your Overmind connection vault.
          </p>
        </div>

        {integrationsError && (
          <p className="text-sm text-spore">{integrationsError}</p>
        )}

        <div className="flex items-center gap-3">
          <button
            type="button"
            className="btn-primary px-4 py-2 text-sm font-medium disabled:opacity-60"
            onClick={handleSaveIntegrations}
            disabled={!connectionsReady || isSavingIntegrations}
          >
            {isSavingIntegrations ? "Saving..." : "Save integrations"}
          </button>
        </div>
      </section>
    </div>
  );
}
