import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';

/**
 * Microsoft Graph Directory — search O365 users
 * Uses client_credentials flow to query the organization directory
 */
export const directoryRouter = router({
  searchUsers: protectedProcedure
    .input(z.object({ query: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const clientId = process.env.AZURE_AD_CLIENT_ID;
      const clientSecret = process.env.AZURE_AD_CLIENT_SECRET;
      const tenantId = process.env.AZURE_AD_TENANT_ID;

      if (!clientId || !clientSecret || !tenantId) {
        throw new Error('Azure AD not configured. Set AZURE_AD_CLIENT_ID, AZURE_AD_CLIENT_SECRET, AZURE_AD_TENANT_ID.');
      }

      try {
        // Get access token using client credentials
        const tokenRes = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            scope: 'https://graph.microsoft.com/.default',
            grant_type: 'client_credentials',
          }),
        });

        if (!tokenRes.ok) {
          const err = await tokenRes.text();
          // If client_credentials fails (needs admin grant), return helpful message
          return {
            users: [],
            error: 'Directory access requires admin consent. Ask your Azure AD admin to grant "User.Read.All" permission to the Galent SalesPilot app.',
            hint: `Go to: https://entra.microsoft.com → App registrations → Galent SalesPilot → API permissions → Add "User.Read.All" (Application) → Grant admin consent`,
          };
        }

        const tokenData = await tokenRes.json();
        const accessToken = tokenData.access_token;

        // Search users via Microsoft Graph
        const graphRes = await fetch(
          `https://graph.microsoft.com/v1.0/users?$filter=startswith(displayName,'${input.query}') or startswith(mail,'${input.query}')&$top=10&$select=displayName,mail,jobTitle,department`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );

        if (!graphRes.ok) {
          return {
            users: [],
            error: 'Could not search directory. The app may need "User.Read.All" permission with admin consent.',
            hint: `Grant permission at: https://entra.microsoft.com → App registrations → API permissions`,
          };
        }

        const graphData = await graphRes.json();
        return {
          users: (graphData.value || []).map((u: any) => ({
            name: u.displayName || '',
            email: u.mail || u.userPrincipalName || '',
            title: u.jobTitle || '',
            department: u.department || '',
          })),
          error: null,
          hint: null,
        };
      } catch (e: any) {
        return {
          users: [],
          error: e.message || 'Failed to search directory',
          hint: null,
        };
      }
    }),
});
