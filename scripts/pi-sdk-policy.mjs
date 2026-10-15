/** Minimum Pi SDK supported by published extensions and generated aggregates. */
export const PI_PEER_RANGE = ">=1.2.0";

export function pi1PeerDependencies(peers = {}) {
	return Object.fromEntries(Object.entries(peers).map(([name, range]) => [
		name,
		name.startsWith("@earendil-works/pi-") ? PI_PEER_RANGE : range,
	]));
}
