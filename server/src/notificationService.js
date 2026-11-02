import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mutatePersistentState, readPersistentState } from './storage.js';

const dataDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'data');
const notificationsFile = path.join(dataDir, 'notifications.json');
const EMPTY = [];

function notificationRecipients(eventType, payload = {}) {
  const booking = payload.booking || {};
  const job = payload.job || {};
  const order = payload.order || {};
  const ids = new Set();
  if (eventType.startsWith('booking:')) {
    [payload.customerId, payload.providerId, booking.customerId, booking.providerId].forEach(id => id && ids.add(id));
  } else if (eventType.startsWith('driver:')) {
    [payload.customerId, payload.driverId, payload.userId, job.customerId, job.driverId].forEach(id => id && ids.add(id));
  } else if (eventType.startsWith('grocery:')) {
    [payload.customerId, payload.providerId, order.customerId, order.providerId].forEach(id => id && ids.add(id));
  } else if (eventType === 'review:submitted') {
    if (payload.providerId) ids.add(payload.providerId);
  } else if (eventType === 'user:status_changed') {
    if (payload.userId) ids.add(payload.userId);
  }
  return [...ids];
}

function describeNotification(eventType, payload = {}) {
  const booking = payload.booking || {};
  const job = payload.job || {};
  const order = payload.order || {};
  if (eventType === 'user:registered') return { title: 'New account registration', body: 'A new ARY Services account has been registered.', resourceType: 'account', resourceId: payload.user?.id || null };
  if (eventType === 'booking:created') return { title: 'New service booking', body: 'A service booking request has been created.', resourceType: 'booking', resourceId: booking.id || null };
  if (eventType === 'booking:quote_sent') return { title: 'New service quote', body: 'Your service provider has sent a price quote. Review it in My Bookings.', resourceType: 'booking', resourceId: payload.bookingId || null };
  if (eventType === 'booking:quote_decided') return { title: 'Service quote decision', body: `The customer has ${payload.status || 'updated'} the service quote.`, resourceType: 'booking', resourceId: payload.bookingId || null };
  if (eventType === 'booking:reschedule_requested') return { title: 'Booking time change requested', body: 'A customer has requested a new service date and time.', resourceType: 'booking', resourceId: payload.bookingId || null };
  if (eventType === 'booking:reschedule_decided') return { title: 'Reschedule decision received', body: `The new booking time request was ${payload.status || 'updated'}.`, resourceType: 'booking', resourceId: payload.bookingId || null };
  if (eventType === 'booking:status_updated') return { title: 'Booking updated', body: `Your booking status is now ${String(payload.status || booking.status || 'updated').replaceAll('_', ' ')}.`, resourceType: 'booking', resourceId: payload.bookingId || booking.id || null };
  if (eventType === 'driver:job_created') return { title: 'Ride or delivery request created', body: 'Your mobility request has been received.', resourceType: 'mobility', resourceId: job.id || null };
  if (eventType === 'driver:job_updated') return { title: 'Ride or delivery updated', body: `Your request status is now ${String(job.status || 'updated').replaceAll('_', ' ')}.`, resourceType: 'mobility', resourceId: job.id || null };
  if (eventType === 'driver:application_reviewed') return { title: 'Driver application reviewed', body: 'Your driver service application has been reviewed by ARY Admin.', resourceType: 'driver_application', resourceId: null };
  if (eventType === 'grocery:order_created') return { title: 'Grocery order received', body: 'A grocery order has been placed.', resourceType: 'grocery_order', resourceId: payload.orderId || order.id || null };
  if (eventType === 'grocery:order_updated') return { title: 'Grocery order updated', body: `Order status: ${String(payload.status || 'updated').replaceAll('_', ' ')}.`, resourceType: 'grocery_order', resourceId: payload.orderId || order.id || null };
  if (eventType === 'review:submitted') return { title: 'New customer review', body: 'A customer has submitted a review for your service.', resourceType: 'review', resourceId: payload.review?.id || null };
  if (eventType === 'user:status_changed') return { title: 'Account status updated', body: `Your account status is now ${String(payload.status || 'updated')}.`, resourceType: 'account', resourceId: null };
  return null;
}

export async function persistEventNotifications(eventType, payload = {}) {
  const description = describeNotification(eventType, payload);
  if (!description) return;
  const recipients = notificationRecipients(eventType, payload);
  const adminBroadcast = eventType === 'user:registered';
  if (!recipients.length && !adminBroadcast) return;
  const now = new Date().toISOString();
  await mutatePersistentState('notifications', notificationsFile, EMPTY, stored => {
    if (!Array.isArray(stored)) throw new Error('Notification storage is invalid.');
    const additions = adminBroadcast
      ? [{ id: 'ntf-' + crypto.randomUUID(), recipientId: null, audience: 'admin', ...description, eventType, readAt: null, createdAt: now }]
      : recipients.map(recipientId => ({ id: 'ntf-' + crypto.randomUUID(), recipientId, audience: 'user', ...description, eventType, readAt: null, createdAt: now }));
    stored.unshift(...additions);
    if (stored.length > 5000) stored.length = 5000;
  });
}

export async function listNotifications(user, limit = 50) {
  const all = await readPersistentState('notifications', notificationsFile, EMPTY);
  return all.filter(item => item.recipientId === user.id || (user.accountType === 'admin' && item.audience === 'admin'))
    .slice(0, Math.max(1, Math.min(100, Number(limit) || 50)));
}

export async function markNotificationRead(user, notificationId) {
  return mutatePersistentState('notifications', notificationsFile, EMPTY, stored => {
    const item = stored.find(entry => entry.id === notificationId && (entry.recipientId === user.id || (user.accountType === 'admin' && entry.audience === 'admin')));
    if (!item) return null;
    item.readAt = new Date().toISOString();
    return item;
  });
}

export async function markAllNotificationsRead(user) {
  return mutatePersistentState('notifications', notificationsFile, EMPTY, stored => {
    const now = new Date().toISOString();
    let updated = 0;
    for (const item of stored) {
      if ((item.recipientId === user.id || (user.accountType === 'admin' && item.audience === 'admin')) && !item.readAt) { item.readAt = now; updated += 1; }
    }
    return { updated };
  });
}
