export interface User {
  id: string;
  name: string | null;
  email: string;
  role: "admin" | "editor" | "moderator";
  isActive: boolean;
  createdAt: Date;
}
