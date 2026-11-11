/** Auth Repository â€” handles authentication and user operations */

import { prisma } from '../database';
import type { User } from '@prisma/client';

export interface AuthRepository {
  /**
   * Look a user up by their Firebase UID.
   *
   * The `User` model has no `firebaseUid` column — Firebase's UID *is* the
   * primary key (`User.id`), so this is a primary-key lookup.
   */
  findByFirebaseUid(uid: string): Promise<User | null>;

  findByEmail(email: string): Promise<User | null>;

  createOrUpdate(user: {
    firebaseUid: string;
    email: string;
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
    return prisma.user.findUnique({ where: { id: uid } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findFirst({ where: { email: email.toLowerCase() } });
  }

  async createOrUpdate(user: {
    firebaseUid: string;
    email: string;
    firstName?: string;
    lastName?: string;
    profileImageUrl?: string;
  }): Promise<User> {
    const existing = await this.findByFirebaseUid(user.firebaseUid);
    if (existing) {
      return prisma.user.update({
        where: { id: existing.id },
        data: {
          email: user.email.toLowerCase(),
          firstName: user.firstName,
          lastName: user.lastName,
          profileImageUrl: user.profileImageUrl,
          updatedAt: new Date(),
        }
      });
    }
    return prisma.user.create({
      data: {
        // Firebase UID is the primary key — there is no separate column.
        id: user.firebaseUid,
        email: user.email.toLowerCase(),
        firstName: user.firstName ?? '',
        lastName: user.lastName ?? '',
        profileImageUrl: user.profileImageUrl ?? null,
        // Firebase-only identity: no local password ever exists. Store an
        // unset marker instead of a real hash so password login is impossible.
        passwordHash: 'FIREBASE_AUTH_NO_LOCAL_PASSWORD',
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
        firstName: data.firstName,
        lastName: data.lastName,
        profileImageUrl: data.profileImageUrl,
        updatedAt: new Date(),
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
      data: { email: normalizedEmail, updatedAt: new Date() }
    });
  }
}