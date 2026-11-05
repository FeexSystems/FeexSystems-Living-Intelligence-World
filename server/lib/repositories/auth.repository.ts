/** Auth Repository — handles authentication and user operations */

import { prisma } from '../database';
import { User, Prisma } from '@prisma/client';

export interface AuthRepository {
  findByFirebaseUid(uid: string): Promise<User | null>;

  findByEmail(email: string): Promise<User | null>;

  createOrUpdate(user: {
    firebaseUid: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    profileImageUrl?: string;
  }): Promise<User>;

  updateProfile(userId: string, data: {
    firstName?: string;
    lastName?: string;
    profileImageUrl?: string;
  }): Promise<User | null>;

  changeEmail(userId: string, newEmail: string): Promise<User | null>;
}

export class PrismaAuthRepository implements AuthRepository {
  async findByFirebaseUid(uid: string): Promise<User | null> {
    return prisma.user.findFirst({ where: { firebase_uid: uid } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findFirst({ where: { email: email.toLowerCase() } });
  }

  async createOrUpdate(user: {
    firebaseUid: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    profileImageUrl?: string;
  }): Promise<User> {
    const existing = await this.findByFirebaseUid(user.firebaseUid);
    if (existing) {
      return prisma.user.update({
        where: { id: existing.id },
        data: {
          email: user.email?.toLowerCase(),
          first_name: user.firstName,
          last_name: user.lastName,
          profile_image_url: user.profileImageUrl,
          updated_at: new Date(),
        }
      });
    }
    return prisma.user.create({
      data: {
        firebase_uid: user.firebaseUid,
        email: user.email?.toLowerCase(),
        first_name: user.firstName,
        last_name: user.lastName,
        profile_image_url: user.profileImageUrl,
        created_at: new Date(),
        updated_at: new Date(),
      }
    });
  }

  async updateProfile(userId: string, data: {
    firstName?: string;
    lastName?: string;
    profileImageUrl?: string;
  }): Promise<User | null> {
    return prisma.user.update({
      where: { id: userId },
      data: {
        first_name: data.firstName,
        last_name: data.lastName,
        profile_image_url: data.profileImageUrl,
        updated_at: new Date(),
      }
    });
  }

  async changeEmail(userId: string, newEmail: string): Promise<User | null> {
    const normalizedEmail = newEmail.trim().toLowerCase();
    // Check if email already belongs to another user
    const existing = await prisma.user.findFirst({
      where: { email: normalizedEmail }
    });
    if (existing && existing.id !== userId) {
      throw new Error('Email is already taken');
    }
    return prisma.user.update({
      where: { id: userId },
      data: { email: normalizedEmail, updated_at: new Date() }
    });
  }
}