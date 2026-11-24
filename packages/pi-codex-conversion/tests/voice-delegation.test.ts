import assert from "node:assert/strict";
import test from "node:test";
import type { CodexRealtimePeer } from "../src/voice/conversation/peer.ts";
import { ConversationTurns } from "../src/voice/conversation/turn-events.ts";
import type { RealtimeVoiceTurn } from "../src/voice/turns.ts";

/** Exercise the real Codex event admission and rewrite queue without a live peer. */
function conversation() {
	const tasks: RealtimeVoiceTurn[] = [];
	const captions: string[] = [];
	const controls: string[] = [];
	const sent: unknown[] = [];
	const peer: CodexRealtimePeer = {
		kind: "webrtc",
		onEvent: () => () => {},
		onExit: () => () => {},
		start: async () => "",
		applyAnswer() {},
		sendData: (message) => {
			sent.push(message);
		},
		setInputMuted() {},
		setSpeakerSuppressed() {},
		close: async () => {},
	};
	const fail = (error: Error) => {
		throw error;
	};
	const turns = new ConversationTurns(
		{
			onError: fail,
			onDrop: fail,
			onStatus() {},
			onTurn: (turn) => {
				tasks.push(turn);
			},
			rewriteDelegation: async (turn) => ({
				input: `Prepared: ${turn.input}`,
				endCall: false,
			}),
			onUserTranscript: (input) => {
				captions.push(input);
			},
			onTranscriptTail() {},
			onContextSubmitted: (content) => {
				controls.push(content);
			},
		},
		peer,
		() => true,
		fail,
	);
	return { turns, tasks, captions, controls, sent };
}

/** Build the captured Codex delegation shape, including its independent turn and handoff IDs. */
function delegation(
	id: string,
	turnId?: string,
	input = "Hey GPT, what time is it",
) {
	return {
		type: "delegation.created",
		item: {
			type: "delegation",
			target: "client",
			id,
			handoff_id: `handoff_${id}`,
			...(turnId ? { user_bidi_turn_id: turnId } : {}),
			content: [{ type: "input_text", text: input }],
		},
	};
}

test("same-turn handoffs with fresh IDs rewrite and deliver one task, including after settlement", async () => {
	const { turns, tasks, captions } = conversation();
	turns.receive({
		type: "turn.created",
		turn: { id: "user-turn", role: "user" },
	});
	turns.receive({
		type: "input_transcript.added",
		item: { text: "Hey GPT, what time is it" },
	});
	// The reported call emitted four handoffs for one unchanged user turn before its final caption.
	for (let id = 1; id <= 4; id++)
		turns.receive(delegation(`item_${id}`, "user-turn"));
	turns.receive({
		type: "turn.done",
		turn: {
			id: "user-turn",
			role: "user",
			transcript: "Hey GPT, what time is it",
		},
	});
	await turns.waitForDelegations(new AbortController().signal);
	assert.equal(tasks.length, 1);
	assert.deepEqual(captions, ["Hey GPT, what time is it"]);
	assert.equal(tasks[0]?.originalDelegation, "Hey GPT, what time is it");
	assert.equal(tasks[0]?.input, "Prepared: Hey GPT, what time is it");

	// A completed Pi response must not reopen the same logical request under another item ID.
	turns.handoff.activate("item_1");
	turns.handoff.settle();
	turns.receive(delegation("item_5", "user-turn"));
	await turns.waitForDelegations(new AbortController().signal);
	assert.equal(tasks.length, 1);
	assert.equal(captions.length, 1);
});

test("new turns and changed text remain actionable without guessing missing turn identities", async () => {
	const { turns, tasks } = conversation();
	turns.receive(delegation("first", "turn-a"));
	turns.receive(delegation("first", "turn-a"));
	turns.receive(delegation("second", "turn-b"));
	turns.receive(delegation("revised", "turn-b", "What time is it in Tokyo?"));
	turns.receive(delegation("unidentified-a"));
	turns.receive(delegation("unidentified-b"));
	await turns.waitForDelegations(new AbortController().signal);
	assert.deepEqual(
		tasks.map((turn) => turn.delegationId),
		["first", "second", "revised", "unidentified-a", "unidentified-b"],
	);
});

test("hidden controls stay inspectable while visible Pi forwarding is sent without duplicate audit cards", () => {
	const { turns, controls, sent } = conversation();
	turns.sendContext(
		{ type: "session" },
		"speakable",
		"Greet the user, then wait for their request.",
	);
	turns.handoff.agentStarted();
	turns.handoff.piInput("An already visible typed request");
	turns.handoff.progress("Visible Pi progress", "Visible reasoning summary");
	turns.handoff.result("Visible final Pi answer");
	assert.deepEqual(controls, ["Greet the user, then wait for their request."]);
	assert.equal(sent.length, 5);
	assert.ok(JSON.stringify(sent).includes("Visible final Pi answer"));
});
