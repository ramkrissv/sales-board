import type { Express } from "express";
import { authStorage } from "./storage";
import { isAuthenticated } from "./replitAuth";

const isReplitEnv = !!process.env.REPL_ID;

// Ensure a default user exists in DB for standalone mode
async function ensureDefaultUser() {
  if (isReplitEnv) return;
  const existing = await authStorage.getUser("default-user");
  if (!existing) {
    await authStorage.upsertUser({
      id: "default-user",
      email: "admin@galent.com",
      firstName: "Admin",
      lastName: "User",
      profileImageUrl: null,
    });
  }
}

// Register auth-specific routes
export function registerAuthRoutes(app: Express): void {
  // Seed default user on startup
  ensureDefaultUser().catch(console.error);

  if (!isReplitEnv) {
    // Standalone: /api/login just redirects to the app
    app.get("/api/login", (_req, res) => res.redirect("/"));
    app.get("/api/logout", (_req, res) => res.redirect("/"));
  }

  // Get current authenticated user
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.json(null);
      }
      const user = await authStorage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.json(null);
    }
  });
}
