'use client';

import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';

/**
 * Teams Tab Configuration Page
 * Shown when adding SalesPilot as a channel/group chat tab.
 * Calls microsoftTeams.settings.setSettings() to save the tab config.
 */
export default function TeamsConfigPage() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const teamsSDK = await import('@microsoft/teams-js');
        await teamsSDK.app.initialize();

        // Enable the Save button
        teamsSDK.pages.config.registerOnSaveHandler((saveEvent) => {
          teamsSDK.pages.config.setConfig({
            suggestedDisplayName: 'SalesPilot',
            contentUrl: 'https://salespilot.galent.ai/pipeline',
            websiteUrl: 'https://salespilot.galent.ai/pipeline',
            entityId: 'salespilot-tab',
          });
          saveEvent.notifySuccess();
        });

        teamsSDK.pages.config.setValidityState(true);
        setReady(true);
      } catch {
        // Not in Teams context — show fallback
        setReady(true);
      }
    })();
  }, []);

  return (
    <div style={{ padding: 40, textAlign: 'center', fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <div style={{ marginBottom: 20 }}>
        <Sparkles style={{ width: 40, height: 40, color: '#7c3aed' }} />
      </div>
      <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>Add SalesPilot to this channel</h2>
      <p style={{ fontSize: 14, color: '#666', marginBottom: 24 }}>
        Your team will get access to the pipeline board, deal intelligence, and AI-powered sales insights.
      </p>
      {ready && (
        <p style={{ fontSize: 13, color: '#7c3aed', fontWeight: 500 }}>
          Click "Save" below to add the tab.
        </p>
      )}
    </div>
  );
}
