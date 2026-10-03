import React from "react";
import { Landing } from "../landing/Landing";

/**
 * `/` route entry.
 *
 * Phase E cutover: this file is intentionally a thin entry that renders the
 * landing composition. All scene sequencing, command-launcher state and ambient
 * surfaces live inside `client/landing/`.
 *
 * Route contract preserved: `/`, `/world`, `/navigator`, `/omni`, `/projects`,
 * `/evidence` all remain reachable — the landing's command surface links to the
 * last four.
 */
export default function Index() {
  return <Landing />;
}
