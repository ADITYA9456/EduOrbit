// Records privileged actions made by server routes (which use the service role, so the database
// triggers from migration 005 cannot see who the admin was). Never throws: auditing must not break the action.
export async function logAdminAction(admin, actorId, action, targetType, targetId, details = {}) {
  try {
    const { error } = await admin.from('admin_audit_log').insert({
      actor_id: actorId ?? null,
      action,
      target_type: targetType,
      target_id: targetId == null ? null : String(targetId),
      details,
    });
    // Before migration 005 the table does not exist: skip silently.
    if (error && !/does not exist|schema cache/i.test(error.message)) console.error('audit log failed:', error.message);
  } catch (err) {
    console.error('audit log failed:', err?.message || err);
  }
}
