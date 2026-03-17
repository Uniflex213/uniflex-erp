export interface EmailAddress {
  name: string;
  address: string;
}

export interface EmailAttachment {
  filename: string;
  contentType: string;
  size: number;
}

export interface EmailMessage {
  id: string;
  user_id: string;
  uid: number;
  mailbox: string;
  message_id: string | null;
  from_address: string;
  from_name: string;
  to_addresses: EmailAddress[];
  cc_addresses: EmailAddress[];
  subject: string;
  body_html: string | null;
  body_text: string | null;
  received_at: string | null;
  is_read: boolean;
  is_starred: boolean;
  is_deleted: boolean;
  has_attachments: boolean;
  fetched_at: string;
}

export type MailboxFolder = "INBOX" | "Sent" | "Drafts" | "Trash" | "Spam";

export interface FolderInfo {
  name: MailboxFolder | string;
  label: string;
  icon: string;
  unread: number;
}

export interface ComposeData {
  to: string;
  cc: string;
  subject: string;
  body: string;
  replyToId?: string;
}
