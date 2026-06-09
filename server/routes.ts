import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertOpportunitySchema, 
  insertStakeholderSchema, 
  insertTaskSchema, 
  insertResourceLinkSchema,
  updateOpportunitySchema,
  updateStakeholderSchema,
  updateTaskSchema
} from "@shared/schema";
import { isAuthenticated, authStorage } from "./replit_integrations/auth";

// Helper to get user display name from authenticated request
async function getUserDisplayName(req: any): Promise<string> {
  try {
    const userId = req.user?.claims?.sub;
    if (!userId) return 'Unknown';
    
    const user = await authStorage.getUser(userId);
    if (!user) return 'Unknown';
    
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    return user.email || 'Unknown';
  } catch {
    return 'Unknown';
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Opportunities endpoints (all protected by isAuthenticated)
  
  // Get all opportunities
  app.get("/api/opportunities", isAuthenticated, async (req, res) => {
    try {
      const opportunities = await storage.getAllOpportunities();
      
      // Fetch nested resources for each opportunity
      const enrichedOpportunities = await Promise.all(
        opportunities.map(async (opp) => {
          const [customerStakeholders, subTasks, resourceLinks] = await Promise.all([
            storage.getStakeholdersByOpportunityId(opp.id),
            storage.getTasksByOpportunityId(opp.id),
            storage.getResourceLinksByOpportunityId(opp.id),
          ]);
          
          return {
            ...opp,
            customerStakeholders,
            subTasks,
            resourceLinks,
            expectedCloseDate: opp.expectedCloseDate.toISOString(),
            startDate: opp.startDate.toISOString(),
            createdAt: opp.createdAt.toISOString(),
            updatedAt: opp.updatedAt.toISOString(),
          };
        })
      );
      
      res.json(enrichedOpportunities);
    } catch (error) {
      console.error("Error fetching opportunities:", error);
      res.status(500).json({ error: "Failed to fetch opportunities" });
    }
  });

  // Get single opportunity by ID
  app.get("/api/opportunities/:id", isAuthenticated, async (req, res) => {
    try {
      const opportunity = await storage.getOpportunityById(req.params.id);
      
      if (!opportunity) {
        return res.status(404).json({ error: "Opportunity not found" });
      }
      
      const [customerStakeholders, subTasks, resourceLinks] = await Promise.all([
        storage.getStakeholdersByOpportunityId(opportunity.id),
        storage.getTasksByOpportunityId(opportunity.id),
        storage.getResourceLinksByOpportunityId(opportunity.id),
      ]);
      
      res.json({
        ...opportunity,
        customerStakeholders,
        subTasks,
        resourceLinks,
        expectedCloseDate: opportunity.expectedCloseDate.toISOString(),
        startDate: opportunity.startDate.toISOString(),
        createdAt: opportunity.createdAt.toISOString(),
        updatedAt: opportunity.updatedAt.toISOString(),
      });
    } catch (error) {
      console.error("Error fetching opportunity:", error);
      res.status(500).json({ error: "Failed to fetch opportunity" });
    }
  });

  // Create new opportunity
  app.post("/api/opportunities", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertOpportunitySchema.parse(req.body);
      const userName = await getUserDisplayName(req);
      const opportunity = await storage.createOpportunity(validatedData, userName);
      
      res.status(201).json({
        ...opportunity,
        customerStakeholders: [],
        subTasks: [],
        resourceLinks: [],
        expectedCloseDate: opportunity.expectedCloseDate.toISOString(),
        startDate: opportunity.startDate.toISOString(),
        createdAt: opportunity.createdAt.toISOString(),
        updatedAt: opportunity.updatedAt.toISOString(),
      });
    } catch (error) {
      console.error("Error creating opportunity:", error);
      res.status(400).json({ error: "Failed to create opportunity" });
    }
  });

  // Update opportunity
  app.patch("/api/opportunities/:id", isAuthenticated, async (req, res) => {
    try {
      // Validate the update data
      const validatedData = updateOpportunitySchema.parse(req.body);
      const userName = await getUserDisplayName(req);
      
      const opportunity = await storage.updateOpportunity(req.params.id, validatedData, userName);
      
      if (!opportunity) {
        return res.status(404).json({ error: "Opportunity not found" });
      }
      
      const [customerStakeholders, subTasks, resourceLinks] = await Promise.all([
        storage.getStakeholdersByOpportunityId(opportunity.id),
        storage.getTasksByOpportunityId(opportunity.id),
        storage.getResourceLinksByOpportunityId(opportunity.id),
      ]);
      
      res.json({
        ...opportunity,
        customerStakeholders,
        subTasks,
        resourceLinks,
        expectedCloseDate: opportunity.expectedCloseDate.toISOString(),
        startDate: opportunity.startDate.toISOString(),
        createdAt: opportunity.createdAt.toISOString(),
        updatedAt: opportunity.updatedAt.toISOString(),
      });
    } catch (error) {
      console.error("Error updating opportunity:", error);
      res.status(400).json({ error: "Failed to update opportunity" });
    }
  });

  // Delete opportunity
  app.delete("/api/opportunities/:id", isAuthenticated, async (req, res) => {
    try {
      const success = await storage.deleteOpportunity(req.params.id);
      
      if (!success) {
        return res.status(404).json({ error: "Opportunity not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting opportunity:", error);
      res.status(500).json({ error: "Failed to delete opportunity" });
    }
  });

  // Stakeholder endpoints
  app.post("/api/opportunities/:opportunityId/stakeholders", isAuthenticated, async (req, res) => {
    try {
      const data = insertStakeholderSchema.parse({
        ...req.body,
        opportunityId: req.params.opportunityId,
      });
      const stakeholder = await storage.createStakeholder(data);
      res.status(201).json(stakeholder);
    } catch (error) {
      console.error("Error creating stakeholder:", error);
      res.status(400).json({ error: "Failed to create stakeholder" });
    }
  });

  app.patch("/api/stakeholders/:id", isAuthenticated, async (req, res) => {
    try {
      // Validate the update data
      const validatedData = updateStakeholderSchema.parse(req.body);
      
      const stakeholder = await storage.updateStakeholder(req.params.id, validatedData);
      
      if (!stakeholder) {
        return res.status(404).json({ error: "Stakeholder not found" });
      }
      
      res.json(stakeholder);
    } catch (error) {
      console.error("Error updating stakeholder:", error);
      res.status(400).json({ error: "Failed to update stakeholder" });
    }
  });

  app.delete("/api/stakeholders/:id", isAuthenticated, async (req, res) => {
    try {
      const success = await storage.deleteStakeholder(req.params.id);
      
      if (!success) {
        return res.status(404).json({ error: "Stakeholder not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting stakeholder:", error);
      res.status(500).json({ error: "Failed to delete stakeholder" });
    }
  });

  // Task endpoints
  app.post("/api/opportunities/:opportunityId/tasks", isAuthenticated, async (req, res) => {
    try {
      const data = insertTaskSchema.parse({
        ...req.body,
        opportunityId: req.params.opportunityId,
      });
      const task = await storage.createTask(data);
      res.status(201).json({
        ...task,
        dueDate: task.dueDate.toISOString(),
      });
    } catch (error) {
      console.error("Error creating task:", error);
      res.status(400).json({ error: "Failed to create task" });
    }
  });

  app.patch("/api/tasks/:id", isAuthenticated, async (req, res) => {
    try {
      // Validate the update data
      const validatedData = updateTaskSchema.parse(req.body);
      
      const task = await storage.updateTask(req.params.id, validatedData);
      
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }
      
      res.json({
        ...task,
        dueDate: task.dueDate.toISOString(),
      });
    } catch (error) {
      console.error("Error updating task:", error);
      res.status(400).json({ error: "Failed to update task" });
    }
  });

  app.delete("/api/tasks/:id", isAuthenticated, async (req, res) => {
    try {
      const success = await storage.deleteTask(req.params.id);
      
      if (!success) {
        return res.status(404).json({ error: "Task not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting task:", error);
      res.status(500).json({ error: "Failed to delete task" });
    }
  });

  // Resource link endpoints
  app.post("/api/opportunities/:opportunityId/resource-links", isAuthenticated, async (req, res) => {
    try {
      const data = insertResourceLinkSchema.parse({
        ...req.body,
        opportunityId: req.params.opportunityId,
      });
      const link = await storage.createResourceLink(data);
      res.status(201).json({
        ...link,
        addedAt: link.addedAt.toISOString(),
      });
    } catch (error) {
      console.error("Error creating resource link:", error);
      res.status(400).json({ error: "Failed to create resource link" });
    }
  });

  app.delete("/api/resource-links/:id", isAuthenticated, async (req, res) => {
    try {
      const success = await storage.deleteResourceLink(req.params.id);
      
      if (!success) {
        return res.status(404).json({ error: "Resource link not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting resource link:", error);
      res.status(500).json({ error: "Failed to delete resource link" });
    }
  });

  return httpServer;
}
