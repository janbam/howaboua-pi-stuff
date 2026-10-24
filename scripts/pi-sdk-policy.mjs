/** Minimum Pi SDK supported by published extensions and generated aggregates. */
export const PI_PEER_RANGE = ">=1.2.0";

/** Raise older Pi 1.x peer minima without weakening newer upstream requirements. */
export function pi1PeerDependencies(peers = {}) {
	return Object.fromEntries(Object.entries(peers).map(([name, range]) => [
		name,
		name.startsWith("@earendil-works/pi-") && /^>=1\.[01]\.\d+$/.test(range) ? PI_PEER_RANGE : range,
	]));
}
