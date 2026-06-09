import {
  opportunities,
  stakeholders,
  tasks,
  resourceLinks,
  type Opportunity,
  type InsertOpportunity,
  type UpdateOpportunity,
  type Stakeholder,
  type InsertStakeholder,
  type UpdateStakeholder,
  type Task,
  type InsertTask,
  type UpdateTask,
  type ResourceLink,
  type InsertResourceLink,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  // Opportunities
  getAllOpportunities(): Promise<Opportunity[]>;
  getOpportunityById(id: string): Promise<Opportunity | undefined>;
  createOpportunity(opportunity: InsertOpportunity, createdBy?: string): Promise<Opportunity>;
  updateOpportunity(id: string, updates: UpdateOpportunity, updatedBy?: string): Promise<Opportunity | undefined>;
  deleteOpportunity(id: string): Promise<boolean>;
  
  // Stakeholders
  getStakeholdersByOpportunityId(opportunityId: string): Promise<Stakeholder[]>;
  createStakeholder(stakeholder: InsertStakeholder): Promise<Stakeholder>;
  updateStakeholder(id: string, updates: UpdateStakeholder): Promise<Stakeholder | undefined>;
  deleteStakeholder(id: string): Promise<boolean>;
  
  // Tasks
  getTasksByOpportunityId(opportunityId: string): Promise<Task[]>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: string, updates: UpdateTask): Promise<Task | undefined>;
  deleteTask(id: string): Promise<boolean>;
  
  // Resource Links
  getResourceLinksByOpportunityId(opportunityId: string): Promise<ResourceLink[]>;
  createResourceLink(link: InsertResourceLink): Promise<ResourceLink>;
  deleteResourceLink(id: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // Opportunities
  async getAllOpportunities(): Promise<Opportunity[]> {
    return await db.select().from(opportunities).orderBy(desc(opportunities.createdAt));
  }

  async getOpportunityById(id: string): Promise<Opportunity | undefined> {
    const [opportunity] = await db.select().from(opportunities).where(eq(opportunities.id, id));
    return opportunity || undefined;
  }

  async createOpportunity(insertOpportunity: InsertOpportunity, createdBy?: string): Promise<Opportunity> {
    const [opportunity] = await db
      .insert(opportunities)
      .values({
        ...insertOpportunity,
        expectedCloseDate: new Date(insertOpportunity.expectedCloseDate),
        startDate: new Date(insertOpportunity.startDate),
        createdBy: createdBy || null,
        updatedBy: createdBy || null,
      })
      .returning();
    return opportunity;
  }

  async updateOpportunity(id: string, updates: UpdateOpportunity, updatedBy?: string): Promise<Opportunity | undefined> {
    const updateData: any = { ...updates, updatedAt: new Date(), updatedBy: updatedBy || null };
    
    if (updates.expectedCloseDate) {
      updateData.expectedCloseDate = new Date(updates.expectedCloseDate);
    }
    if (updates.startDate) {
      updateData.startDate = new Date(updates.startDate);
    }
    
    const [opportunity] = await db
      .update(opportunities)
      .set(updateData)
      .where(eq(opportunities.id, id))
      .returning();
    return opportunity || undefined;
  }

  async deleteOpportunity(id: string): Promise<boolean> {
    const result = await db.delete(opportunities).where(eq(opportunities.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Stakeholders
  async getStakeholdersByOpportunityId(opportunityId: string): Promise<Stakeholder[]> {
    return await db.select().from(stakeholders).where(eq(stakeholders.opportunityId, opportunityId));
  }

  async createStakeholder(insertStakeholder: InsertStakeholder): Promise<Stakeholder> {
    const [stakeholder] = await db
      .insert(stakeholders)
      .values(insertStakeholder)
      .returning();
    return stakeholder;
  }

  async updateStakeholder(id: string, updates: UpdateStakeholder): Promise<Stakeholder | undefined> {
    const [stakeholder] = await db
      .update(stakeholders)
      .set(updates)
      .where(eq(stakeholders.id, id))
      .returning();
    return stakeholder || undefined;
  }

  async deleteStakeholder(id: string): Promise<boolean> {
    const result = await db.delete(stakeholders).where(eq(stakeholders.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Tasks
  async getTasksByOpportunityId(opportunityId: string): Promise<Task[]> {
    return await db.select().from(tasks).where(eq(tasks.opportunityId, opportunityId));
  }

  async createTask(insertTask: InsertTask): Promise<Task> {
    const [task] = await db
      .insert(tasks)
      .values({
        ...insertTask,
        dueDate: new Date(insertTask.dueDate),
      })
      .returning();
    return task;
  }

  async updateTask(id: string, updates: UpdateTask): Promise<Task | undefined> {
    const updateData: any = { ...updates };
    if (updates.dueDate) {
      updateData.dueDate = new Date(updates.dueDate);
    }
    
    const [task] = await db
      .update(tasks)
      .set(updateData)
      .where(eq(tasks.id, id))
      .returning();
    return task || undefined;
  }

  async deleteTask(id: string): Promise<boolean> {
    const result = await db.delete(tasks).where(eq(tasks.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Resource Links
  async getResourceLinksByOpportunityId(opportunityId: string): Promise<ResourceLink[]> {
    return await db.select().from(resourceLinks).where(eq(resourceLinks.opportunityId, opportunityId));
  }

  async createResourceLink(insertLink: InsertResourceLink): Promise<ResourceLink> {
    const [link] = await db
      .insert(resourceLinks)
      .values(insertLink)
      .returning();
    return link;
  }

  async deleteResourceLink(id: string): Promise<boolean> {
    const result = await db.delete(resourceLinks).where(eq(resourceLinks.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }
}

export const storage = new DatabaseStorage();
