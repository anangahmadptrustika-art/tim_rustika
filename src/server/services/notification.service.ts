import type { NotificationChannel, NotificationType, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { emitToUser } from '@/server/realtime/emitter';

interface NotifyArgs {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  channels?: NotificationChannel[];
}

/**
 * Persist an in-app notification, push it over Socket.IO, and fan out to the
 * configured external channels (email / WhatsApp). External delivery is
 * delegated to providers and runs best-effort (failures are logged, not thrown).
 */
export async function notify({
  userId,
  type,
  title,
  body,
  data,
  channels = ['IN_APP'],
}: NotifyArgs) {
  const notification = await prisma.notification.create({
    data: {
      userId,
      type,
      title,
      body,
      data: (data ?? undefined) as Prisma.InputJsonValue | undefined,
      channel: 'IN_APP',
    },
  });

  // Realtime in-app push
  emitToUser(userId, 'notification:new', notification);

  // External channels — fire and forget
  for (const channel of channels) {
    if (channel === 'IN_APP') continue;
    void deliverExternal(channel, userId, title, body).catch((err) =>
      console.error(`[notify] ${channel} delivery failed`, err),
    );
  }

  return notification;
}

async function deliverExternal(
  channel: NotificationChannel,
  userId: string,
  title: string,
  body: string,
) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return;

  if (channel === 'EMAIL' && user.email) {
    await sendEmail(user.email, title, body);
  }
  if (channel === 'WHATSAPP' && user.phone) {
    await sendWhatsApp(user.phone, `*${title}*\n${body}`);
  }
}

// ---- Provider adapters (swap with real SMTP / WhatsApp Cloud API) ----------

async function sendEmail(to: string, subject: string, body: string) {
  if (!process.env.SMTP_HOST) {
    console.info(`[email:mock] -> ${to} :: ${subject} :: ${body.slice(0, 80)}`);
    return;
  }
  // TODO: integrate nodemailer / Resend using SMTP_* env vars.
}

async function sendWhatsApp(toE164: string, message: string) {
  const token = process.env.WHATSAPP_API_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  if (!token || !phoneId) {
    console.info(`[whatsapp:mock] -> ${toE164} :: ${message}`);
    return;
  }
  // Meta WhatsApp Cloud API
  await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: toE164,
      type: 'text',
      text: { body: message },
    }),
  });
}
