import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Opportunities table
export const opportunities = pgTable("opportunities", {
  id: varchar("id").primaryKey(),
  customerName: text("customer_name").notNull(),
  opportunityName: text("opportunity_name").notNull(),
  status: varchar("status").notNull(),
  tcv: integer("tcv").notNull().default(0),
  dealDuration: text("deal_duration").notNull(),
  expectedCloseDate: timestamp("expected_close_date").notNull(),
  startDate: timestamp("start_date").notNull(),
  primaryOwner: text("primary_owner").notNull(),
  salesPOCs: text("sales_pocs").array().notNull().default(sql`'{}'::text[]`),
  presalesPOCs: text("presales_pocs").array().notNull().default(sql`'{}'::text[]`),
  conversationLog: text("conversation_log").notNull().default(''),
  industry: varchar("industry").notNull(),
  region: varchar("region").notNull(),
  serviceLine: varchar("service_line"),
  clientType: varchar("client_type"),
  opportunityType: varchar("opportunity_type"),
  billingModel: varchar("billing_model"),
  margin: integer("margin"),
  source: text("source").notNull(),
  customTags: text("custom_tags").array().notNull().default(sql`'{}'::text[]`),
  activityLog: jsonb("activity_log").notNull().default('[]'),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  createdBy: text("created_by"),
  updatedBy: text("updated_by"),
});

// Customer stakeholders table
export const stakeholders = pgTable("stakeholders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  opportunityId: varchar("opportunity_id").notNull().references(() => opportunities.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  title: text("title").notNull(),
  email: text("email"),
  phone: text("phone"),
  linkedInUrl: text("linkedin_url"),
  isPrimaryContact: boolean("is_primary_contact").notNull().default(false),
  isDecisionMaker: boolean("is_decision_maker").notNull().default(false),
  notes: text("notes"),
});

// Sub-tasks table
export const tasks = pgTable("tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  opportunityId: varchar("opportunity_id").notNull().references(() => opportunities.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  owner: text("owner").notNull(),
  dueDate: timestamp("due_date").notNull(),
  status: varchar("status").notNull(),
  priority: varchar("priority").notNull(),
  notes: text("notes"),
});

// Resource links table
export const resourceLinks = pgTable("resource_links", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  opportunityId: varchar("opportunity_id").notNull().references(() => opportunities.id, { onDelete: 'cascade' }),
  title: text("title").notNull(),
  url: text("url").notNull(),
  type: varchar("type").notNull(),
  addedBy: text("added_by").notNull(),
  addedAt: timestamp("added_at").notNull().defaultNow(),
});

// Relations
export const opportunitiesRelations = relations(opportunities, ({ many }) => ({
  stakeholders: many(stakeholders),
  tasks: many(tasks),
  resourceLinks: many(resourceLinks),
}));

export const stakeholdersRelations = relations(stakeholders, ({ one }) => ({
  opportunity: one(opportunities, {
    fields: [stakeholders.opportunityId],
    references: [opportunities.id],
  }),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  opportunity: one(opportunities, {
    fields: [tasks.opportunityId],
    references: [opportunities.id],
  }),
}));

export const resourceLinksRelations = relations(resourceLinks, ({ one }) => ({
  opportunity: one(opportunities, {
    fields: [resourceLinks.opportunityId],
    references: [opportunities.id],
  }),
}));

// Zod schemas for validation
export const insertOpportunitySchema = createInsertSchema(opportunities, {
  tcv: z.number().min(0),
  margin: z.number().min(0).max(100).optional(),
  expectedCloseDate: z.string().or(z.date()),
  startDate: z.string().or(z.date()),
}).omit({
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
});

export const insertStakeholderSchema = createInsertSchema(stakeholders).omit({
  id: true,
});

export const insertTaskSchema = createInsertSchema(tasks, {
  dueDate: z.string().or(z.date()),
}).omit({
  id: true,
});

export const insertResourceLinkSchema = createInsertSchema(resourceLinks).omit({
  id: true,
  addedAt: true,
});

// Partial update schemas for PATCH endpoints
export const updateOpportunitySchema = insertOpportunitySchema.partial().extend({
  expectedCloseDate: z.string().or(z.date()).optional(),
  startDate: z.string().or(z.date()).optional(),
  salesPOCs: z.array(z.string()).optional(),
  presalesPOCs: z.array(z.string()).optional(),
  customTags: z.array(z.string()).optional(),
  margin: z.number().min(0).max(100).nullable().optional(),
});

export const updateStakeholderSchema = insertStakeholderSchema.partial().omit({
  opportunityId: true,
});

export const updateTaskSchema = insertTaskSchema.partial().omit({
  opportunityId: true,
}).extend({
  dueDate: z.string().or(z.date()).optional(),
});

// TypeScript types
export type Opportunity = typeof opportunities.$inferSelect;
export type InsertOpportunity = z.infer<typeof insertOpportunitySchema>;
export type UpdateOpportunity = z.infer<typeof updateOpportunitySchema>;

export type Stakeholder = typeof stakeholders.$inferSelect;
export type InsertStakeholder = z.infer<typeof insertStakeholderSchema>;
export type UpdateStakeholder = z.infer<typeof updateStakeholderSchema>;

export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type UpdateTask = z.infer<typeof updateTaskSchema>;

export type ResourceLink = typeof resourceLinks.$inferSelect;
export type InsertResourceLink = z.infer<typeof insertResourceLinkSchema>;

// Re-export auth models
export * from "./models/auth";
