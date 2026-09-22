import "server-only";
import nodemailer from "nodemailer";
import { mailConfig } from "@/lib/server/auth-config";

export async function sendAuthMail(to: string, subject: string, text: string) {
  const { from, ...config } = mailConfig();
  const transport = nodemailer.createTransport({
    ...config, connectionTimeout: 10_000, greetingTimeout: 10_000, socketTimeout: 15_000,
    disableFileAccess: true, disableUrlAccess: true,
  });
  try {
    const result = await transport.sendMail({ from, to, subject, text });
    if (!result.accepted.length) throw new Error("auth_mail_rejected");
  } finally {
    transport.close();
  }
}
