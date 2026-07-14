import React from "react";
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { TemplateEntry } from "./registry";

interface Props {
  fullName?: string;
  email?: string;
  company?: string;
  jobTitle?: string;
  teamSize?: string;
  useCase?: string;
  requestId?: string;
  submittedAt?: string;
  browser?: string;
  device?: string;
  country?: string;
  language?: string;
  source?: string;
}

const Row = ({ label, value }: { label: string; value?: string }) => (
  <Section style={row}>
    <Text style={rowLabel}>{label}</Text>
    <Text style={rowValue}>{value && value.length ? value : "—"}</Text>
  </Section>
);

const InternalDemoNotification = (p: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>New Enterprise Demo Request — {p.company || p.fullName || "NEXUS AI OS"}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>🚀 New Enterprise Demo Request</Heading>
        <Text style={sub}>NEXUS AI OS — Inbound lead</Text>
        <Row label="Request ID" value={p.requestId} />
        <Row label="Submitted At" value={p.submittedAt} />
        <Row label="Full Name" value={p.fullName} />
        <Row label="Business Email" value={p.email} />
        <Row label="Company" value={p.company} />
        <Row label="Job Title" value={p.jobTitle} />
        <Row label="Team Size" value={p.teamSize} />
        <Row label="Use Case" value={p.useCase} />
        <Row label="Country" value={p.country} />
        <Row label="Language" value={p.language} />
        <Row label="Browser" value={p.browser} />
        <Row label="Device" value={p.device} />
        <Row label="Source" value={p.source} />
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: InternalDemoNotification,
  subject: (data: Readonly<Record<string, unknown>>) => {
    const company = typeof data.company === "string" ? data.company : "";
    const fullName = typeof data.fullName === "string" ? data.fullName : "";
    return `🚀 New Enterprise Demo Request | ${company || fullName || "NEXUS AI OS"}`;
  },
  displayName: "Demo Request — Internal Notification",
  previewData: {
    fullName: "Faisal Aljohaimy",
    email: "faisal@example.com",
    company: "Acme Co",
    jobTitle: "CTO",
    teamSize: "50-200",
    useCase: "Industrial security operations",
    requestId: "NEX-20260626-AB12CD",
    submittedAt: "2026-06-26 12:34 UTC",
    browser: "Chrome 126",
    device: "Desktop",
    country: "SA",
    language: "en",
    source: "request-demo",
  },
} satisfies TemplateEntry;

const main: React.CSSProperties = {
  backgroundColor: "#ffffff",
  fontFamily: "system-ui, -apple-system, Segoe UI, Arial, sans-serif",
  padding: "24px 0",
};
const container: React.CSSProperties = {
  maxWidth: 620,
  margin: "0 auto",
  padding: "24px",
  border: "1px solid #e6eef5",
  borderRadius: 16,
};
const h1: React.CSSProperties = { margin: "0 0 4px", fontSize: 20, color: "#061A2E" };
const sub: React.CSSProperties = {
  margin: "0 0 16px",
  color: "#5b7a93",
  fontSize: 12,
  letterSpacing: 1,
  textTransform: "uppercase",
};
const row: React.CSSProperties = {
  display: "block",
  padding: "10px 12px",
  borderBottom: "1px solid #eef3f8",
};
const rowLabel: React.CSSProperties = {
  margin: 0,
  fontSize: 11,
  color: "#7a93ac",
  letterSpacing: 0.6,
  textTransform: "uppercase",
};
const rowValue: React.CSSProperties = {
  margin: "2px 0 0",
  fontSize: 14,
  color: "#0a1628",
  wordBreak: "break-word",
};
