import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const sim = vi.hoisted(() => ({
  user: null as null | { id: string },
  access: vi.fn(),
  locale: "ar" as "ar" | "en",
}));

vi.mock("@/lib/finn-agent/access.functions", () => ({
  getFinnAccess: (...args: unknown[]) => sim.access(...args),
}));
vi.mock("@/lib/auth-context", () => ({ useAuth: () => ({ user: sim.user }) }));
vi.mock("@/lib/i18n", () => ({ useI18n: () => ({ locale: sim.locale }) }));
vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, ...rest }: { to: string; children: ReactNode }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock("./FinnChat", () => ({
  default: function MockChat() {
    const [draft, setDraft] = useState("");
    return (
      <textarea
        aria-label="Independent FNN draft"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
      />
    );
  },
}));

import { HomeFinnCard } from "./HomeFinnCard";
import { HOME_IMAGES } from "@/components/home/home-images";

const OWNER = {
  allowed: true,
  engine: { gpt: true, gptModel: "gpt-4.1", fallback: true, paused: false },
};

function mountCard(client = new QueryClient({ defaultOptions: { queries: { retry: false } } })) {
  const tree = () => (
    <QueryClientProvider client={client}>
      <HomeFinnCard />
    </QueryClientProvider>
  );
  return { ...render(tree()), tree };
}

describe("FNN home identity and separate session", () => {
  beforeEach(() => {
    sim.user = { id: "owner-a" };
    sim.locale = "ar";
    sim.access.mockReset();
    sim.access.mockResolvedValue(OWNER);
  });

  it("shows the distinct FNN identity and the supplied portrait", async () => {
    const { container } = mountCard();
    expect(await screen.findByText("FNN")).toBeInTheDocument();
    const card = container.querySelector('[data-agent="fnn"]');
    expect(card).toHaveAttribute("data-finn-home-card");
    expect(card).toHaveAttribute("aria-describedby", "nx-home-finn-separation");
    expect(screen.getByText("محادثة مستقلة عن سديد · للمالك فقط")).toBeInTheDocument();
    expect(card?.querySelector("img")).toHaveAttribute("src", HOME_IMAGES.finn.src);
    expect(HOME_IMAGES.finn.src).not.toBe(HOME_IMAGES.persona.src);
  });

  it("keeps an English separation label and links to the standalone workspace", async () => {
    sim.locale = "en";
    mountCard();
    expect(await screen.findByRole("link", { name: /Open the Finn chat/ })).toHaveAttribute(
      "href",
      "/fnn",
    );
    expect(screen.getByText("Separate from SADEED · Owner only")).toBeInTheDocument();
  });

  it("shows a public identity but never loads a chat or checks access for a guest", () => {
    sim.user = null;
    const { container } = mountCard();
    expect(container.querySelector('[data-finn-access="guest"]')).not.toBeNull();
    expect(screen.getByText("FNN")).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(sim.access).not.toHaveBeenCalled();
  });

  it("keeps the public card but no private conversation after an access denial", async () => {
    sim.access.mockResolvedValue({ allowed: false });
    const { container } = mountCard();
    await waitFor(() =>
      expect(container.querySelector('[data-finn-access="denied"]')).not.toBeNull(),
    );
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(container.querySelector('a[href="/finn"]')).toBeNull();
  });

  it("preserves a draft while folding and reopening the same owner's chat", async () => {
    mountCard();
    const box = await screen.findByRole("textbox", { name: "Independent FNN draft" });
    fireEvent.change(box, { target: { value: "FNN-only draft" } });
    fireEvent.click(screen.getByRole("button", { name: /إخفاء المحادثة/ }));
    fireEvent.click(screen.getByRole("button", { name: /إظهار المحادثة/ }));
    expect(screen.getByRole("textbox")).toHaveValue("FNN-only draft");
  });

  it("resets the draft across identities even when both access results are cached", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    client.setQueryData(["finn-access", "owner-a"], OWNER);
    client.setQueryData(["finn-access", "owner-b"], OWNER);
    const { rerender, tree } = mountCard(client);
    const box = await screen.findByRole("textbox", { name: "Independent FNN draft" });
    fireEvent.change(box, { target: { value: "Private draft from first session" } });
    sim.user = { id: "owner-b" };
    rerender(tree());
    expect(await screen.findByRole("textbox")).toHaveValue("");
  });

  it("removes the private draft on sign-out while leaving the public entry visible", async () => {
    const { container, rerender, tree } = mountCard();
    const box = await screen.findByRole("textbox");
    fireEvent.change(box, { target: { value: "Private draft" } });
    sim.user = null;
    rerender(tree());
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(container).not.toHaveTextContent("Private draft");
    expect(container.querySelector('[data-finn-access="guest"]')).not.toBeNull();
  });
});
