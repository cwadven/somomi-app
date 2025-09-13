import { createEntity, updateEntity, deleteEntity } from '../api/syncApi';

const nowIso = () => new Date().toISOString();

export const ensureCreateMeta = (payload = {}, { deviceId, ownerUserId } = {}) => {
  const meta = { ...payload };
  if (!meta.localId) meta.localId = meta.id;
  if (!meta.createdAt) meta.createdAt = nowIso();
  meta.updatedAt = nowIso();
  if (!meta.deviceId && deviceId) meta.deviceId = deviceId;
  if (!meta.ownerUserId && ownerUserId) meta.ownerUserId = ownerUserId;
  return meta;
};

export const ensureUpdateMeta = (payload = {}, { deviceId, ownerUserId } = {}) => {
  const meta = { ...payload };
  meta.updatedAt = nowIso();
  if (!meta.deviceId && deviceId) meta.deviceId = deviceId;
  if (!meta.ownerUserId && ownerUserId) meta.ownerUserId = ownerUserId;
  return meta;
};

export const ensureDeleteMeta = (payload = {}, { deviceId, ownerUserId } = {}) => {
  const meta = { ...payload };
  meta.updatedAt = nowIso();
  meta.deletedAt = nowIso();
  if (!meta.deviceId && deviceId) meta.deviceId = deviceId;
  if (!meta.ownerUserId && ownerUserId) meta.ownerUserId = ownerUserId;
  return meta;
};

export const commitCreate = async (entityType, payload, context = {}) => {
  const enriched = ensureCreateMeta(payload, context);
  const result = await createEntity(entityType, enriched, context);
  return result;
};

export const commitUpdate = async (entityType, payload, context = {}) => {
  const enriched = ensureUpdateMeta(payload, context);
  const result = await updateEntity(entityType, enriched, context);
  return result;
};

export const commitDelete = async (entityType, payload, context = {}) => {
  const enriched = ensureDeleteMeta(payload, context);
  const result = await deleteEntity(entityType, enriched, context);
  return result;
};


