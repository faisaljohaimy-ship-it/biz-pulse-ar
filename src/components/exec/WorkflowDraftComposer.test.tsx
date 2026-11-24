import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { I18nProvider } from "@/lib/i18n";
import type {
  WorkflowDraftSaveInput,
  WorkflowDraftSaveResult,
} from "@/lib/exec/workflow-drafts.functions";
import { WorkflowDraftComposer } from "./WorkflowDraftComposer";

const state = vi.hoisted(() => ({ userId: "user-one" }));
const fetchOrgs = vi.hoisted(() => vi.fn());
const save = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth-context", () => ({ useAuth: () => ({ user: { id: state.userId } }) }));
vi.mock("@/lib/org/org.functions", () => ({ listMyOrgs: fetchOrgs }));
vi.mock("@/lib/exec/workflow-drafts.functions", () => ({ saveWorkflowDraft: save }));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
const orgId = "00000000-0000-0000-0000-000000000001";
const saved = (data: WorkflowDraftSaveInput): WorkflowDraftSaveResult => ({
  status: "saved",
  receipt: {
    id: data.draftId,
    orgId: data.orgId,
    ownerId: "user-one",
    enabled: false,
    version: 1,
    createdAt: "2026-11-24T16:00:00Z",
    replayed: false,
  },
});
const clients: QueryClient[] = [];
beforeEach(() => {
  localStorage.setItem("locale", "en");
  fetchOrgs.mockResolvedValue([{ id: orgId, name: "Example organization", role: "operator" }]);
});
afterEach(() => {
  localStorage.clear();
  state.userId = "user-one";
  vi.resetAllMocks();
  for (const client of clients.splice(0)) client.clear();
});
function mount(onSaved = vi.fn()) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  clients.push(client);
  const tree = () => (
    <QueryClientProvider client={client}>
      <I18nProvider>
        <WorkflowDraftComposer onSaved={onSaved} />
      </I18nProvider>
    </QueryClientProvider>
  );
  return { ...render(tree()), tree, client, onSaved };
}
async function preview() {
  fireEvent.change(await screen.findByLabelText("Organization"), { target: { value: orgId } });
  fireEvent.change(screen.getByLabelText("Request"), {
    target: { value: "offline asset diagnostic draft" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Preview without saving" }));
}

it("requires explicit org choice, previews without saving, and clears after edits/account changes", async () => {
  const view = mount();
  const org = await screen.findByLabelText("Organization");
  expect(org).toHaveValue("");
  fireEvent.change(screen.getByLabelText("Request"), {
    target: { value: "offline asset diagnostic draft" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Preview without saving" }));
  expect(screen.getByRole("alert")).toHaveTextContent("Choose an organization");
  fireEvent.change(org, { target: { value: orgId } });
  fireEvent.click(screen.getByRole("button", { name: "Preview without saving" }));
  expect(screen.getByLabelText("Unsaved preview")).toHaveTextContent("Disabled, unsaved draft");
  expect(screen.getByRole("button", { name: "Save disabled draft" })).toBeDisabled();
  expect(save).not.toHaveBeenCalled();
  expect(fetchOrgs).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole("button", { name: /^Run|Activate/ })).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Proposed read limit"), { target: { value: "21" } });
  expect(screen.queryByLabelText("Unsaved preview")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Preview without saving" }));
  expect(screen.getByLabelText("Unsaved preview")).toBeVisible();
  state.userId = "user-two";
  view.rerender(view.tree());
  expect(screen.queryByLabelText("Unsaved preview")).not.toBeInTheDocument();
  expect(await screen.findByLabelText("Organization")).toHaveValue("");
  expect(screen.getByLabelText("Request")).toHaveValue("");
});

it("requires review and retries an unconfirmed save only manually with the same ID", async () => {
  const view = mount();
  await preview();
  save
    .mockImplementationOnce(
      async ({ data }: { data: WorkflowDraftSaveInput }): Promise<WorkflowDraftSaveResult> => ({
        status: "unconfirmed",
        draftId: data.draftId,
      }),
    )
    .mockImplementation(async ({ data }: { data: WorkflowDraftSaveInput }) => saved(data));
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(screen.getByRole("button", { name: "Save disabled draft" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("may have been saved");
  expect(save).toHaveBeenCalledTimes(1);
  expect(screen.queryByLabelText("Save receipt")).not.toBeInTheDocument();
  const firstId = save.mock.calls[0][0].data.draftId;
  fireEvent.click(screen.getByRole("button", { name: "Save disabled draft" }));
  expect(await screen.findByLabelText("Save receipt")).toHaveTextContent(firstId);
  expect(save.mock.calls[1][0].data.draftId).toBe(firstId);
  expect(view.onSaved).toHaveBeenCalledTimes(1);
  fireEvent.change(screen.getByLabelText("Proposed read limit"), { target: { value: "21" } });
  expect(screen.queryByLabelText("Save receipt")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Preview without saving" }));
  expect(screen.getByRole("checkbox")).not.toBeChecked();
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(screen.getByRole("button", { name: "Save disabled draft" }));
  await screen.findByLabelText("Save receipt");
  expect(save.mock.calls[2][0].data.draftId).not.toBe(firstId);
});

it("cannot show an old account's pending receipt after account change", async () => {
  let finish!: (result: WorkflowDraftSaveResult) => void;
  save.mockImplementation(
    () =>
      new Promise<WorkflowDraftSaveResult>((resolve) => {
        finish = resolve;
      }),
  );
  const view = mount();
  await preview();
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(screen.getByRole("button", { name: "Save disabled draft" }));
  await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
  const original = save.mock.calls[0][0].data;
  expect(screen.getByLabelText("Request")).toBeDisabled();
  state.userId = "user-two";
  view.rerender(view.tree());
  expect(await screen.findByLabelText("Organization")).toHaveValue("");
  await act(async () => finish(saved(original)));
  expect(screen.queryByLabelText("Save receipt")).not.toBeInTheDocument();
  expect(view.onSaved).not.toHaveBeenCalled();
  expect(fetchOrgs).toHaveBeenCalledTimes(2);
});

it("cancels an old account membership request and ignores its late response", async () => {
  let finish!: (orgs: Array<{ id: string; name: string; role: string }>) => void;
  let oldSignal: AbortSignal | undefined;
  fetchOrgs
    .mockImplementationOnce(({ signal }: { signal: AbortSignal }) => {
      oldSignal = signal;
      return new Promise((resolve) => {
        finish = resolve;
      });
    })
    .mockResolvedValueOnce([{ id: orgId, name: "Second account organization", role: "operator" }]);
  const view = mount();
  await screen.findByText("Loading your organizations…");
  state.userId = "user-two";
  view.rerender(view.tree());
  expect(await screen.findByLabelText("Organization")).toHaveValue("");
  expect(oldSignal?.aborted).toBe(true);
  await act(async () =>
    finish([{ id: orgId, name: "Private first account organization", role: "owner" }]),
  );
  expect(
    screen.queryByRole("option", { name: "Private first account organization" }),
  ).not.toBeInTheDocument();
  expect(screen.getByRole("option", { name: "Second account organization" })).toBeVisible();
});
