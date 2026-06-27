export type UserStatus = "ONLINE" | "OFFLINE";
export type RoomType = "GROUP" | "PRIVATE" | "CHANNEL";
export type MessageType = "TEXT" | "IMAGE" | "FILE";
export type MemberRole = "OWNER" | "ADMIN" | "MEMBER";

export interface User {
  id: string;
  username: string;
  email: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  status?: UserStatus;
  lastSeenAt?: string | null;
  createdAt?: string;
}

export interface RoomMember {
  roomId: string;
  userId: string;
  role: MemberRole;
  lastReadAt?: string | null;
  isMuted?: boolean;
  joinedAt?: string;
  user: User;
}

export interface MessageReaction {
  messageId: string;
  userId: string;
  emoji: string;
  createdAt?: string;
}

export interface MessageReadReceipt {
  messageId: string;
  userId: string;
  readAt: string;
}

export interface Message {
  id: string;
  roomId: string;
  senderId: string;
  replyToId?: string | null;
  content: string;
  type: MessageType;
  isEdited?: boolean;
  isDeleted?: boolean;
  editedAt?: string | null;
  createdAt: string;
  sender: User;
  replyTo?: Message | null;
  attachments?: unknown[];
  reactions?: MessageReaction[];
  readBy?: MessageReadReceipt[];
}

export interface Room {
  id: string;
  name?: string | null;
  description?: string | null;
  avatarUrl?: string | null;
  type: RoomType;
  isArchived?: boolean;
  createdById?: string;
  createdAt?: string;
  members?: RoomMember[];
  messages?: Message[];
  lastMessage?: Message | null;
  unreadCount?: number;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}
