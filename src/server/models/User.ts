import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';

export interface IUser {
  _id: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPublicUser {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}

// In-memory collection simulating MongoDB collection for Users
const usersCollection = new Map<string, IUser>();

export const UserModel = {
  create: async (data: { name: string; email: string; password: string }): Promise<IUser> => {
    const normalizedEmail = data.email.trim().toLowerCase();

    // Check if email already exists
    for (const user of usersCollection.values()) {
      if (user.email.toLowerCase() === normalizedEmail) {
        throw new Error('User with this email already exists');
      }
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(data.password, saltRounds);
    const id = randomUUID();
    const now = new Date();

    const user: IUser = {
      _id: id,
      name: data.name.trim(),
      email: normalizedEmail,
      passwordHash,
      createdAt: now,
      updatedAt: now,
    };

    usersCollection.set(id, user);
    return { ...user };
  },

  findByEmail: async (email: string): Promise<IUser | null> => {
    const normalizedEmail = email.trim().toLowerCase();
    for (const user of usersCollection.values()) {
      if (user.email.toLowerCase() === normalizedEmail) {
        return { ...user };
      }
    }
    return null;
  },

  findById: async (id: string): Promise<IUser | null> => {
    const user = usersCollection.get(id);
    if (!user) return null;
    return { ...user };
  },

  comparePassword: async (plainPassword: string, passwordHash: string): Promise<boolean> => {
    return await bcrypt.compare(plainPassword, passwordHash);
  },

  toPublicJSON: (user: IUser): IPublicUser => {
    return {
      id: user._id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
    };
  },
};
