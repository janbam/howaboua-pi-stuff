import type {
	ExtensionAPI,
	ExtensionContext,
} from "@earendil-works/pi-coding-agent";
import type {
	SharedContextRequest,
	SharedContextResult,
} from "@howaboua/pi-codex-conversion/context-sharing";
import { attachmentOwner, attachmentRoutes } from "./attachment-protocol.js";
import type { AgentBoard } from "./board/host.js";
import type { AgentFleet } from "./fleet.js";
import {
	listenContext,
	sessionContextPath,
} from "./remote/shepherdr-context.mjs";
import { SharedAgentContext } from "./shared-context.js";

export async function registerSharedAgentContext(
	pi: ExtensionAPI,
	fleet: AgentFleet,
	board: AgentBoard,
): Promise<SharedAgentContext> {
	let api:
		| typeof import("@howaboua/pi-codex-conversion/context-sharing")
		| undefined;
	try {
		api = await import("@howaboua/pi-codex-conversion/context-sharing");
	} catch (error) {
		const failure = error as { code?: string; message?: string };
		const missing = failure.message?.match(
			/Cannot find (?:package|module) ['"]([^'"]+)['"]/,
		)?.[1];
		const module = "@howaboua/pi-codex-conversion/context-sharing";
		const unavailable =
			((failure.code === "ERR_MODULE_NOT_FOUND" ||
				failure.code === "MODULE_NOT_FOUND") &&
				(missing === "@howaboua/pi-codex-conversion" ||
					missing === module ||
					missing?.endsWith(`/${module}`))) ||
			(failure.code === "ERR_PACKAGE_PATH_NOT_EXPORTED" &&
				failure.message?.includes("@howaboua/pi-codex-conversion") &&
				failure.message.includes("./context-sharing"));
		if (!unavailable)
			throw new Error(
				"Update pi-codex-conversion to use shared agent context",
				{ cause: error },
			);
	}
	const connection = api?.connectCodexContextSharing(pi);
	const shared = new SharedAgentContext(
		pi,
		fleet,
		() => connection?.service,
		board,
	);
	let close: (() => Promise<void>) | undefined;
	let unregister: (() => void) | undefined;
	const publish = async (ctx: ExtensionContext) => {
		const file = ctx.sessionManager.getSessionFile();
		if (!file) return;
		try {
			close = await listenContext(
				sessionContextPath(file),
				(request: unknown, signal: AbortSignal) =>
					shared.handle(ctx, request, signal),
			);
		} catch (error) {
			if (
				!(error instanceof Error) ||
				!("code" in error) ||
				error.code !== "SHARED_CONTEXT_ALREADY_OPEN"
			)
				throw error;
			ctx.ui.notify(
				"This session is open in another window. Agents remain available, but shared context is unavailable here. Close the other window, then /reload here to enable sharing.",
				"warning",
			);
		}
	};
	pi.on("session_start", async () => {
		await close?.();
		close = undefined;
		unregister?.();
		unregister = connection?.service?.registerRouter(
			Object.assign(
				async (
					context: ExtensionContext,
					request: SharedContextRequest,
					signal?: AbortSignal,
				) => {
					const attached = await shared.attachment.routing.route(
						context,
						request,
						[],
						(route, next) =>
							fleet
								.connected(route.machine)
								.client.requestContext(
									sessionContextPath(route.sessionFile),
									next,
									signal,
								),
						signal,
					);
					if (attached) return attached;
					if (connection?.service?.describe(context)?.storage === "remote")
						return undefined;
					return shared.handle(
						context,
						{ operation: "context", request, visited: [] },
						signal,
					) as Promise<SharedContextResult>;
				},
				{
					requiresRemoteScope: (context: ExtensionContext) =>
						attachmentOwner(context)?.context?.controller.storage ===
							"remote" ||
						attachmentRoutes(context).some(
							(route) =>
								route.phase === "ready" &&
								route.plan.context?.target.storage === "remote",
						),
				},
			),
		);
	});
	pi.on("resources_discover", async (_event, ctx) => publish(ctx));
	pi.on("session_shutdown", async () => {
		unregister?.();
		await close?.();
		connection?.dispose();
	});
	fleet.setContextRelay((ctx, request, signal) =>
		shared.handle(ctx, request, signal),
	);
	return shared;
}
