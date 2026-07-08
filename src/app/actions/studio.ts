"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getStudioSession, setStudioSession, clearStudioSession } from "@/lib/studio/session";

export interface StudioProjectData {
  id: string;
  client: string;
  name: string;
  url: string;
  passwordHash: string;
  status: string;
  latency: string;
}

const DEFAULT_PROJECTS = [
  {
    id: "schools24-pilot",
    name: "Schools24 Administrative Core",
    client: "Oakridge International School",
    status: "ACTIVE",
    latency: "4.8ms",
    url: "https://schools24.in",
    passwordHash: "schools24",
  },
  {
    id: "project-nexus",
    name: "Autonomous Logistics Node",
    client: "Alpha Logistics Solutions",
    status: "PENDING",
    latency: "--",
    url: "https://bluevolt.group",
    passwordHash: "nexus24",
  }
];

async function requireStudioAdmin() {
  const session = await getStudioSession();
  if (!session) {
    throw new Error("ACCESS DENIED. Studio admin session required.");
  }
  return session;
}

export async function authenticateStudioAdmin(input: {
  email: string;
  password: string;
}): Promise<{ success: boolean; message?: string }> {
  const configuredEmail = process.env.STUDIO_ADMIN_EMAIL?.trim().toLowerCase();
  const configuredPassword = process.env.STUDIO_ADMIN_PASSWORD;

  if (!configuredEmail || !configuredPassword) {
    return { success: false, message: "Studio admin access is not configured." };
  }

  const email = input.email.trim().toLowerCase();
  if (email !== configuredEmail || input.password !== configuredPassword) {
    return { success: false, message: "ACCESS DENIED. INVALID SECURITY SIGNATURE NODE." };
  }

  await setStudioSession(email);
  return { success: true };
}

export async function logoutStudioAdmin(): Promise<{ success: boolean }> {
  await clearStudioSession();
  return { success: true };
}

// Fetch all studio projects for public site (hides passwordHash)
export async function getPublicStudioProjects(): Promise<StudioProjectData[]> {
  try {
    const projects = await prisma.studioProject.findMany({
      orderBy: { createdAt: "asc" }
    });

    return projects.map((p) => ({
      id: p.id,
      client: p.client,
      name: p.name,
      url: p.url,
      passwordHash: "", // Hidden
      status: p.status,
      latency: p.latency
    }));
  } catch (error) {
    console.error("Error fetching public studio projects:", error);
    return [];
  }
}

// Verify a project's password on the server side
export async function verifyStudioProjectPassword(input: {
  id: string;
  passwordHash: string;
}): Promise<{ success: boolean }> {
  try {
    const project = await prisma.studioProject.findUnique({
      where: { id: input.id }
    });
    if (!project) return { success: false };
    return { success: project.passwordHash === input.passwordHash };
  } catch {
    return { success: false };
  }
}

// Fetch all studio projects from the configured cloud database (Admin version)
export async function getStudioProjects(): Promise<StudioProjectData[]> {
  await requireStudioAdmin();
  try {
    const projects = await prisma.studioProject.findMany({
      orderBy: { createdAt: "asc" }
    });

    return projects.map((p) => ({
      id: p.id,
      client: p.client,
      name: p.name,
      url: p.url,
      passwordHash: p.passwordHash,
      status: p.status,
      latency: p.latency
    }));
  } catch (error) {
    console.error("Error fetching studio projects from cloud database:", error);
    throw new Error("Database connection failed. Please check backend configuration.");
  }
}

// Manually seed/restore default projects in the database
export async function seedStudioProjects(): Promise<{ success: boolean; message: string }> {
  await requireStudioAdmin();
  try {
    // Delete any existing projects to prevent duplicate keys
    await prisma.studioProject.deleteMany({});

    await prisma.studioProject.createMany({
      data: DEFAULT_PROJECTS
    });

    revalidatePath("/studio");
    revalidatePath("/studio/admin");
    return { success: true, message: "Default workspace nodes successfully restored." };
  } catch (error) {
    console.error("Failed to seed default studio projects:", error);
    return { success: false, message: "Failed to restore defaults in cloud database." };
  }
}

// Add or update a studio project in the configured cloud database
export async function saveStudioProject(data: StudioProjectData): Promise<{ success: boolean; message: string }> {
  await requireStudioAdmin();
  try {
    await prisma.studioProject.upsert({
      where: { id: data.id },
      update: {
        client: data.client,
        name: data.name,
        url: data.url,
        passwordHash: data.passwordHash,
        status: data.status,
        latency: data.latency
      },
      create: {
        id: data.id,
        client: data.client,
        name: data.name,
        url: data.url,
        passwordHash: data.passwordHash,
        status: data.status,
        latency: data.latency
      }
    });

    revalidatePath("/studio");
    revalidatePath("/studio/admin");
    return { success: true, message: "Workspace node configuration successfully synchronized." };
  } catch (error) {
    console.error("Error saving studio project to cloud database:", error);
    return { success: false, message: "Failed to sync workspace configuration with cloud database." };
  }
}

// Delete a studio project from the configured cloud database
export async function deleteStudioProject(id: string): Promise<{ success: boolean; message: string }> {
  await requireStudioAdmin();
  try {
    await prisma.studioProject.deleteMany({
      where: { id }
    });

    revalidatePath("/studio");
    revalidatePath("/studio/admin");
    return { success: true, message: "Workspace node successfully decommissioned." };
  } catch (error) {
    console.error("Error deleting studio project from cloud database:", error);
    return { success: false, message: "Failed to decommission workspace node from cloud database." };
  }
}
