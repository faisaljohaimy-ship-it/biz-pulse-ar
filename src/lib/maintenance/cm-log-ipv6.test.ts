/** Synthetic CM LOG notes only: redact all IP address families before import. */
import { describe, expect, it } from "vitest";
import { maskNetworkIds } from "@/lib/maintenance/cm-log-rules";

describe("CM LOG network identifier redaction", () => {
  it.each([
    ["camera fe80::a2b:3c4d%eth0", "camera [عنوان IP محجوب]"],
    ["gateway 2001:db8:0:1::a.", "gateway [عنوان IP محجوب]."],
    ["link [2001:db8::2] down", "link [عنوان IP محجوب] down"],
    ["adapter ::ffff:192.0.2.4", "adapter [عنوان IP محجوب]"],
    ["router :: not configured", "router [عنوان IP محجوب] not configured"],
  ])("redacts IPv6 note %s", (note, expected) => {
    expect(maskNetworkIds(note)).toBe(expected);
  });

  it("retains prior IPv4/MAC protection and ordinary technician text", () => {
    expect(maskNetworkIds("203.0.113.7 / 02:00:5E:10:20:30")).toBe(
      "[عنوان IP محجوب] / [عنوان MAC محجوب]",
    );
    expect(maskNetworkIds("maintenance at 12:30:45; check port 1:2:3")).toBe(
      "maintenance at 12:30:45; check port 1:2:3",
    );
  });
});
