import { 
  users, 
  documents, 
  analyses, 
  userActivities, 
  cognitiveProfiles, 
  intelligentRewrites,
  type User, 
  type InsertUser, 
  type InsertDocument, 
  type Document, 
  type InsertUserActivity, 
  type InsertCognitiveProfile
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  getUser(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getUserByEmail(email: string): Promise<User | undefined>;
  
  // Document operations
  createDocument(doc: InsertDocument): Promise<Document>;
  getDocumentsByUser(userEmail: string): Promise<Document[]>;
  
  // Analysis operations
  createAnalysis(analysis: any): Promise<any>;
  
  // Intelligent Rewrite operations
  createIntelligentRewrite(rewrite: any): Promise<any>;
  
  // Activity tracking
  logActivity(activity: InsertUserActivity): Promise<void>;
  
  // Cognitive profile operations
  getCognitiveProfile(userEmail: string): Promise<any>;
  updateCognitiveProfile(userEmail: string, profile: Partial<InsertCognitiveProfile>): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return this.getUser(email);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async createDocument(doc: InsertDocument): Promise<Document> {
    const [document] = await db
      .insert(documents)
      .values(doc)
      .returning();
    return document;
  }

  async getDocumentsByUser(userEmail: string): Promise<Document[]> {
    return await db
      .select()
      .from(documents)
      .where(eq(documents.userEmail, userEmail));
  }

  async logActivity(activity: InsertUserActivity): Promise<void> {
    await db.insert(userActivities).values(activity);
  }

  async getCognitiveProfile(userEmail: string): Promise<any> {
    const [profile] = await db
      .select()
      .from(cognitiveProfiles)
      .where(eq(cognitiveProfiles.userEmail, userEmail));
    return profile;
  }

  async updateCognitiveProfile(userEmail: string, profile: Partial<InsertCognitiveProfile>): Promise<void> {
    await db
      .insert(cognitiveProfiles)
      .values({ ...profile, userEmail })
      .onConflictDoUpdate({
        target: cognitiveProfiles.userEmail,
        set: { ...profile, lastUpdated: new Date() }
      });
  }

  async createAnalysis(analysis: any): Promise<any> {
    const [result] = await db
      .insert(analyses)
      .values(analysis)
      .returning();
    return result;
  }

  async createIntelligentRewrite(rewrite: any): Promise<any> {
    const [result] = await db
      .insert(intelligentRewrites)
      .values(rewrite)
      .returning();
    return result;
  }
}

export const storage = new DatabaseStorage();
