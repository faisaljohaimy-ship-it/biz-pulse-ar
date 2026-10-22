import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { act } from "react";
import { useFnnChatStore } from "@/lib/dual-agent/fnn-chat-store";

const mocks = vi.hoisted(() => ({
  allowed: true,
  userId: "owner",
  locale: "ar",
  openSadeed: vi.fn(),
  ask: vi.fn(),
}));
vi.mock("@/lib/dual-agent/use-fnn-owner", () => ({ useFnnOwner: () => mocks }));
vi.mock("@/lib/dual-agent/owner.functions", () => ({ askFnn: mocks.ask }));
vi.mock("@/lib/dual-agent/code-workspace.functions", () => ({
  listFnnCodeBundles: vi.fn(),
  readFnnCodeBundle: vi.fn(),
  saveFnnCodeBundle: vi.fn(),
}));
vi.mock("@/lib/sadeed-core/hooks/useSadeed", () => ({
  useSadeed: () => ({ open: mocks.openSadeed }),
}));
vi.mock("@/lib/i18n", () => ({ useI18n: () => ({ locale: mocks.locale }) }));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to }: { children: ReactNode; to: string }) => <a href={to}>{children}</a>,
}));
import { HomeOwnerAgents } from "./HomeOwnerAgents";
import { FnnOwnerChat } from "@/components/agents/FnnOwnerChat";

beforeEach(() => {
  mocks.allowed = true;
  mocks.userId = "owner";
  mocks.locale = "ar";
  mocks.openSadeed.mockReset();
  mocks.ask.mockReset();
  useFnnChatStore.getState().close();
});
afterEach(cleanup);

describe("owner dashboard assistants", () => {
  it("opens the single independent FNN dialog and keeps SADEED separate", () => {
    render(
      <>
        <HomeOwnerAgents />
        <FnnOwnerChat />
      </>,
    );
    expect(screen.getByRole("link", { name: "الأدوات وسجل النتائج" })).toHaveAttribute(
      "href",
      "/orchestration",
    );
    fireEvent.click(screen.getByRole("button", { name: "فتح محادثة سَدِيد" }));
    expect(mocks.openSadeed).toHaveBeenCalledWith({ focus: true });
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "فتح محادثة FNN" }));
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    expect(screen.getByRole("log", { name: "محادثة FNN المستقلة" })).toBeInTheDocument();
    expect(mocks.openSadeed).toHaveBeenCalledTimes(1);
    expect(mocks.ask).not.toHaveBeenCalled();
  });

  it("hides FNN on failed owner verification even if UI state requests opening", () => {
    mocks.allowed = false;
    useFnnChatStore.getState().openFor("owner");
    render(
      <>
        <HomeOwnerAgents />
        <FnnOwnerChat />
      </>,
    );
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(mocks.ask).not.toHaveBeenCalled();
  });

  it("closes the owner dialog on account change and permission revocation", () => {
    const view = render(
      <>
        <HomeOwnerAgents />
        <FnnOwnerChat />
      </>,
    );
    fireEvent.click(screen.getByRole("button", { name: "فتح محادثة FNN" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    mocks.userId = "other";
    view.rerender(
      <>
        <HomeOwnerAgents />
        <FnnOwnerChat />
      </>,
    );
    expect(screen.queryByRole("dialog")).toBeNull();
    act(() => useFnnChatStore.getState().openFor("other"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    mocks.allowed = false;
    view.rerender(
      <>
        <HomeOwnerAgents />
        <FnnOwnerChat />
      </>,
    );
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(useFnnChatStore.getState().ownerId).toBeNull();
  });

  it("supports the English layout without changing access", () => {
    mocks.locale = "en";
    render(<HomeOwnerAgents />);
    expect(screen.getByRole("region", { name: "SADEED & FNN · Owner workspace" })).toHaveAttribute(
      "dir",
      "ltr",
    );
    expect(screen.getByRole("button", { name: "Open FNN chat" })).toBeInTheDocument();
  });
});
