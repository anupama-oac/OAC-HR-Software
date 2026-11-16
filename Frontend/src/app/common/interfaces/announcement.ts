export interface Announcement {
  id: number;
  message: string;
  type: string;
  fileUrl?: string;
  dismissible?: boolean;
  startDate?: string | null;
  endDate?: string | null;
  createdAt?: string;
  updatedAt?: string;
}
