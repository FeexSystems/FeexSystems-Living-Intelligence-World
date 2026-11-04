

/**
 * Force-directed orbital layout:
 * - Technologies form an inner gravity cluster
 * - Projects orbit outward, pulled toward technologies they USE
 * - Mild continuous drift is applied in the scene (not here)
 */
export function computeForceLayout(
  nodes,
  links,
  iterations = 80
) {
  const projects = nodes.filter((n) => n.type === "project");
  const techs = nodes.filter((n) => n.type === "technology");

  
  const particles = [];

  techs.forEach((n, i) => {
    const a = (i / Math.max(techs.length, 1)) * Math.PI * 2;
    const r = 5 + (i % 3) * 0.8;
    particles.push({
      id: n.id,
      x: Math.cos(a) * r,
      y: Math.sin(i * 1.1) * 2.2,
      z: Math.sin(a) * r,
      vx: 0,
      vy: 0,
      vz: 0,
      type: "technology",
    });
  });

  projects.forEach((n, i) => {
    const a = (i / Math.max(projects.length, 1)) * Math.PI * 2 + 0.35;
    const r = 12 + (n.isPinned ? 1.5 : 0) + (i % 4) * 0.6;
    particles.push({
      id: n.id,
      x: Math.cos(a) * r,
      y: Math.sin(i * 1.7) * 3.5,
      z: Math.sin(a) * r,
      vx: 0,
      vy: 0,
      vz: 0,
      type: "project",
    });
  });

  const byId = new Map(particles.map((p) => [p.id, p]));
  const adj = new Map();
  for (const l of links) {
    if (!adj.has(l.source)) adj.set(l.source, []);
    if (!adj.has(l.target)) adj.set(l.target, []);
    adj.get(l.source).push(l.target);
    adj.get(l.target).push(l.source);
  }

  const repulsion = 28;
  const spring = 0.045;
  const centerPull = 0.008;
  const damping = 0.82;

  for (let iter = 0; iter < iterations; iter++) {
    // repulsion
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const a = particles[i];
        const b = particles[j];
        let dx = a.x - b.x;
        let dy = a.y - b.y;
        let dz = a.z - b.z;
        const dist2 = dx * dx + dy * dy + dz * dz + 0.01;
        const dist = Math.sqrt(dist2);
        const f = repulsion / dist2;
        dx = (dx / dist) * f;
        dy = (dy / dist) * f;
        dz = (dz / dist) * f;
        a.vx += dx;
        a.vy += dy;
        a.vz += dz;
        b.vx -= dx;
        b.vy -= dy;
        b.vz -= dz;
      }
    }

    // springs along links
    for (const l of links) {
      const a = byId.get(l.source);
      const b = byId.get(l.target);
      if (!a || !b) continue;
      const ideal = a.type === "technology" && b.type === "technology" ? 4 : 9;
      let dx = b.x - a.x;
      let dy = b.y - a.y;
      let dz = b.z - a.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) + 0.01;
      const force = (dist - ideal) * spring;
      dx = (dx / dist) * force;
      dy = (dy / dist) * force;
      dz = (dz / dist) * force;
      a.vx += dx;
      a.vy += dy;
      a.vz += dz;
      b.vx -= dx;
      b.vy -= dy;
      b.vz -= dz;
    }

    // soft center + keep techs inward
    for (const p of particles) {
      const targetR = p.type === "technology" ? 6 : 13;
      const r = Math.sqrt(p.x * p.x + p.z * p.z) + 0.01;
      const radial = (targetR - r) * centerPull;
      p.vx += (p.x / r) * radial;
      p.vz += (p.z / r) * radial;
      p.vy += -p.y * 0.01;

      p.vx *= damping;
      p.vy *= damping;
      p.vz *= damping;
      p.x += p.vx;
      p.y += p.vy;
      p.z += p.vz;
    }
  }

  const pos = new Map(particles.map((p) => [p.id, [p.x, p.y, p.z] ]));
  return nodes.map((n) => ({
    ...n,
    position: pos.get(n.id) || n.position || [0, 0, 0],
  }));
}
