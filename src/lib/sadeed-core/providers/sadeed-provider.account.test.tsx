import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useEffect, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSadeedStore } from "../state/sadeed-store";
import { SadeedProvider, useSadeedChat } from "./sadeed-provider";

const fixture = vi.hoisted(() => ({
  user: { id: "account-A" } as { id: string } | null,
  locale: "ar" as "ar" | "en",
  pathname: "/sec/incidents",
  chats: [] as {
    id: string;
    stop: ReturnType<typeof vi.fn>;
    sendMessage: ReturnType<typeof vi.fn>;
  }[],
  submit: vi.fn(),
}));

vi.mock("@/lib/auth-context", () => ({ useAuth: () => ({ user: fixture.user }) }));
vi.mock("@/lib/i18n", () => ({ useI18n: () => ({ locale: fixture.locale }) }));
vi.mock("@tanstack/react-router", () => ({
  useRouterState: ({ select }: { select: (state: unknown) => unknown }) =>
    select({ location: { pathname: fixture.pathname, searchStr: "" } }),
}));
vi.mock("@ai-sdk/react", async () => {
  const { useRef } = await import("react");
  return {
    useChat: ({ id, messages }: { id: string; messages: unknown[] }) => {
      const current = useRef<{
        id: string;
        messages: unknown[];
        status: string;
        stop: ReturnType<typeof vi.fn>;
        sendMessage: ReturnType<typeof vi.fn>;
      } | null>(null);
      if (current.current?.id !== id) {
        current.current = { id, messages, status: "ready", stop: vi.fn(), sendMessage: vi.fn() };
        fixture.chats.push(current.current);
      }
      return current.current;
    },
  };
});
vi.mock("../services/sadeed-service", () => ({
  createSadeedTransport: () => ({}),
  setPendingRouteHint: vi.fn(),
  setPendingReplyMode: vi.fn(),
}));
vi.mock("../core/sadeed-brain", () => ({
  sadeedBrain: { bindSender: () => () => {}, submit: fixture.submit, reportCompletion: vi.fn() },
}));
vi.mock("../core/voice-manager", () => ({
  voiceManager: { getState: () => "idle", setState: vi.fn() },
}));
vi.mock("../core/avatar-lifecycle", () => ({ avatarLifecycle: { mount: () => () => {} } }));
vi.mock("../core/avatar-brain", () => ({ avatarBrain: { onOpen: vi.fn(), onClose: vi.fn() } }));
vi.mock("@/lib/sadeed/singletons", () => ({ trackMount: () => () => {} }));

function Composer() {
  const { bindComposerDraft } = useSadeedChat();
  const [draft, setDraft] = useState("");
  useEffect(() => bindComposerDraft(setDraft), [bindComposerDraft]);
  return (
    <input aria-label="composer" value={draft} onChange={(event) => setDraft(event.target.value)} />
  );
}

function Probe({ editor }: { editor: boolean }) {
  const { chat } = useSadeedChat();
  return (
    <>
      <output data-testid="chat-id">{chat.id}</output>
      {editor && <Composer />}
    </>
  );
}

function View({ editor = false }: { editor?: boolean }) {
  return (
    <SadeedProvider>
      <Probe editor={editor} />
    </SadeedProvider>
  );
}

beforeEach(() => {
  fixture.user = { id: "account-A" };
  fixture.locale = "ar";
  fixture.pathname = "/sec/incidents";
  fixture.chats.length = 0;
  fixture.submit.mockClear();
  useSadeedStore.setState({
    accountScope: null,
    accountRevision: 0,
    pageContext: null,
    activeTurn: null,
    activeEnvelope: null,
    activeExecution: null,
    pendingCommands: [],
    mode: "collapsed",
    voice: "idle",
  });
});
afterEach(cleanup);

describe("account-scoped singleton drafts", () => {
  it("retains a first-mount queued draft through late composer binding without sending", () => {
    useSadeedStore.getState().enqueue({ kind: "open", options: { draft: "Review this draft" } });
    const view = render(<View />);
    view.rerender(<View editor />);
    expect(screen.getByRole("textbox", { name: "composer" })).toHaveValue("Review this draft");
    expect(fixture.submit).not.toHaveBeenCalled();
    expect(fixture.chats[0].sendMessage).not.toHaveBeenCalled();
  });

  it("aborts the old stream and drops old pending drafts, queued sends and page facts on account switch", () => {
    const view = render(<View />);
    act(() => {
      useSadeedStore.getState().enqueue({ kind: "open", options: { draft: "PRIVATE-A-DRAFT" } });
      useSadeedStore.getState().setPageContext({
        pathname: fixture.pathname,
        label: "Incidents",
        locale: "ar",
        facts: { private: "PRIVATE-A-FACT" },
      });
    });
    const previousChat = fixture.chats[0];
    act(() => {
      useSadeedStore.getState().requestVoiceConversation();
      useSadeedStore.getState().enqueue({ kind: "send", text: "PRIVATE-A-QUEUED" });
      fixture.user = { id: "account-B" };
      view.rerender(<View />);
    });
    view.rerender(<View editor />);
    expect(screen.getByTestId("chat-id")).toHaveTextContent("sadeed-singleton:account-B");
    expect(screen.getByRole("textbox", { name: "composer" })).toHaveValue("");
    expect(useSadeedStore.getState().pageContext?.facts).toBeUndefined();
    expect(useSadeedStore.getState().pendingCommands).toEqual([]);
    expect(useSadeedStore.getState().voiceConversationRequest).toBe(0);
    expect(useSadeedStore.getState().activeEnvelope).toBeNull();
    expect(previousChat.stop).toHaveBeenCalled();
    expect(fixture.submit).not.toHaveBeenCalled();
  });

  it("preserves an edited draft on same-account token/locale/route updates", () => {
    const view = render(<View editor />);
    fireEvent.change(screen.getByRole("textbox", { name: "composer" }), {
      target: { value: "My edited question" },
    });
    const currentChat = fixture.chats[0];
    fixture.user = { id: "account-A" };
    fixture.locale = "en";
    fixture.pathname = "/diagnostics";
    view.rerender(<View editor />);
    expect(screen.getByRole("textbox", { name: "composer" })).toHaveValue("My edited question");
    expect(useSadeedStore.getState().pageContext?.locale).toBe("en");
    expect(currentChat.stop).not.toHaveBeenCalled();
    expect(fixture.chats).toHaveLength(1);
    expect(fixture.submit).not.toHaveBeenCalled();
  });

  it("clears the mounted draft on sign-out and invalidates state after a provider remount", () => {
    const view = render(<View editor />);
    fireEvent.change(screen.getByRole("textbox", { name: "composer" }), {
      target: { value: "PRIVATE-A" },
    });
    fixture.user = null;
    view.rerender(<View editor />);
    expect(screen.getByRole("textbox", { name: "composer" })).toHaveValue("");
    expect(screen.getByTestId("chat-id")).toHaveTextContent("sadeed-singleton:guest");
    view.unmount();
    useSadeedStore
      .getState()
      .setPageContext({ pathname: "/", label: "Old", locale: "ar", facts: { private: "OLD" } });
    fixture.user = { id: "account-B" };
    render(<View editor />);
    expect(useSadeedStore.getState().pageContext?.facts).toBeUndefined();
    expect(useSadeedStore.getState().accountRevision).toBe(2);
  });
});
