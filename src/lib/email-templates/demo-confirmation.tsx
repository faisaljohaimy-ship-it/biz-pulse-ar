import React from 'react'
import { Body, Container, Head, Heading, Html, Preview, Section, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  name?: string
  requestId?: string
}

const DemoConfirmation = ({ name, requestId }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>We received your demo request — NEXUS AI OS</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={brandBar}>
          <Text style={brand}>NEXUS AI OS</Text>
        </Section>
        <Heading style={h1}>Thank you{name ? `, ${name}` : ''}.</Heading>
        <Text style={p}>
          Your request has been received successfully. Our Enterprise Team will contact you within 24 hours
          to schedule your personalized walkthrough.
        </Text>
        <Section style={refBox}>
          <Text style={refLabel}>Request reference</Text>
          <Text style={refValue}>{requestId || '—'}</Text>
        </Section>
        <Text style={p}>If you need anything in the meantime, just reply to this email.</Text>
        <Text style={footer}>© NEXUS AI OS — Enterprise Operating System</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: DemoConfirmation,
  subject: '✅ We received your request — NEXUS AI OS',
  displayName: 'Demo Request — Confirmation',
  previewData: { name: 'Faisal', requestId: 'NEX-20260626-AB12CD' },
} satisfies TemplateEntry

const main: React.CSSProperties = { backgroundColor: '#ffffff', fontFamily: 'system-ui, -apple-system, Segoe UI, Arial, sans-serif', padding: '24px 0' }
const container: React.CSSProperties = { maxWidth: 560, margin: '0 auto', padding: '28px', border: '1px solid #e6eef5', borderRadius: 16 }
const brandBar: React.CSSProperties = { textAlign: 'center', marginBottom: 18 }
const brand: React.CSSProperties = { display: 'inline-block', padding: '10px 18px', borderRadius: 999, background: '#061A2E', color: '#3AE8FF', fontWeight: 700, letterSpacing: 2, fontSize: 11, margin: 0 }
const h1: React.CSSProperties = { margin: '0 0 8px', fontSize: 22, color: '#0a1628' }
const p: React.CSSProperties = { margin: '0 0 14px', color: '#33506b', lineHeight: 1.55, fontSize: 14 }
const refBox: React.CSSProperties = { background: '#f3faff', border: '1px solid #cdeaff', borderRadius: 12, padding: '14px 16px', margin: '16px 0' }
const refLabel: React.CSSProperties = { fontSize: 11, color: '#5b7a93', letterSpacing: 1.5, textTransform: 'uppercase', margin: 0 }
const refValue: React.CSSProperties = { fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 16, color: '#0a1628', marginTop: 4, marginBottom: 0 }
const footer: React.CSSProperties = { marginTop: 22, paddingTop: 18, borderTop: '1px solid #e6eef5', color: '#8aa3bb', fontSize: 12, textAlign: 'center' }
