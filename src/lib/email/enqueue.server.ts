/**
 * Server-only helper to enqueue a registered React Email template via the
 * Lovable Email queue, without requiring a user JWT. Mirrors the logic of
 * /lovable/email/transactional/send so anonymous server flows (e.g. public
 * demo form) can deliver branded transactional email reliably.
 *
 * - Uses supabaseAdmin (service role) — server-only.
 * - Skips suppression + unsubscribe-token issuance for fixed-recipient internal
 *   notifications (template.to set) since those are operator-only mails.
 */
import * as React from 'react'
import { render } from 'react-email'
import { TEMPLATES } from '@/lib/email-templates/registry'

const SITE_NAME = 'NEXUS AI OS'
const SENDER_DOMAIN = 'notify.neexios.com'
const FROM_DOMAIN = 'notify.neexios.com'

function generateToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
}

export interface EnqueueResult {
  ok: boolean
  message_id?: string
  reason?: string
  error?: string
}

export async function enqueueTemplateEmail(opts: {
  templateName: string
  recipientEmail?: string
  templateData?: Record<string, any>
  idempotencyKey?: string
}): Promise<EnqueueResult> {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
  const template = TEMPLATES[opts.templateName]
  if (!template) return { ok: false, error: `Template '${opts.templateName}' not found` }

  const recipient = (template.to || opts.recipientEmail || '').trim()
  if (!recipient) return { ok: false, error: 'recipientEmail required' }

  const messageId = crypto.randomUUID()
  const idempotencyKey = opts.idempotencyKey || messageId
  const templateData = opts.templateData ?? {}
  const normalized = recipient.toLowerCase()
  const isFixedRecipient = Boolean(template.to)

  // Suppression check for end-user recipients only.
  if (!isFixedRecipient) {
    const { data: suppressed } = await supabaseAdmin
      .from('suppressed_emails').select('id').eq('email', normalized).maybeSingle()
    if (suppressed) {
      await supabaseAdmin.from('email_send_log').insert({
        message_id: messageId, template_name: opts.templateName,
        recipient_email: recipient, status: 'suppressed',
      })
      return { ok: false, reason: 'suppressed' }
    }
  }

  // Unsubscribe token (skip for fixed-recipient internal notifications).
  let unsubscribeToken: string | undefined
  if (!isFixedRecipient) {
    const { data: existing } = await supabaseAdmin
      .from('email_unsubscribe_tokens').select('token, used_at').eq('email', normalized).maybeSingle()
    if (existing && !existing.used_at) {
      unsubscribeToken = existing.token
    } else if (!existing) {
      const token = generateToken()
      await supabaseAdmin
        .from('email_unsubscribe_tokens')
        .upsert({ token, email: normalized }, { onConflict: 'email', ignoreDuplicates: true })
      const { data: stored } = await supabaseAdmin
        .from('email_unsubscribe_tokens').select('token').eq('email', normalized).maybeSingle()
      unsubscribeToken = stored?.token ?? token
    }
  }

  // Render the template.
  let html: string
  let text: string
  try {
    const element = React.createElement(template.component as any, templateData)
    html = await render(element)
    text = await render(element, { plainText: true })
  } catch (err) {
    return { ok: false, error: `render failed: ${err instanceof Error ? err.message : String(err)}` }
  }

  const subject = typeof template.subject === 'function'
    ? template.subject(templateData) : template.subject

  await supabaseAdmin.from('email_send_log').insert({
    message_id: messageId, template_name: opts.templateName,
    recipient_email: recipient, status: 'pending',
  })

  const { error: enqueueError } = await supabaseAdmin.rpc('enqueue_email', {
    queue_name: 'transactional_emails',
    payload: {
      message_id: messageId,
      to: recipient,
      from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
      sender_domain: SENDER_DOMAIN,
      subject,
      html,
      text,
      purpose: 'transactional',
      label: opts.templateName,
      idempotency_key: idempotencyKey,
      unsubscribe_token: unsubscribeToken,
      queued_at: new Date().toISOString(),
    } as never,
  })

  if (enqueueError) {
    await supabaseAdmin.from('email_send_log').insert({
      message_id: messageId, template_name: opts.templateName,
      recipient_email: recipient, status: 'failed',
      error_message: `enqueue: ${enqueueError.message}`,
    })
    return { ok: false, error: enqueueError.message }
  }

  return { ok: true, message_id: messageId }
}
