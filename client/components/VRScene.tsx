import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

interface VRSceneProps {
  onVRReady?: (vrSupported: boolean) => void;
}

export function VRScene({ onVRReady }: VRSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const panelsRef = useRef<THREE.Mesh[]>([]);
  const [, setVRSupported] = useState(false);
  const [selectedPanelIndex, setSelectedPanelIndex] = useState(0);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000,
    );
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: true,
    });

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x0a0a0a, 1);

    // Check for VR support
    if (navigator.xr) {
      navigator.xr.isSessionSupported("immersive-vr").then((supported) => {
        if (supported) {
          renderer.xr.enabled = true;
          setVRSupported(true);
        }
        onVRReady?.(supported);
      });
    }

    sceneRef.current = scene;
    rendererRef.current = renderer;
    cameraRef.current = camera;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(0, 10, 10);
    scene.add(directionalLight);

    // Create wireframe globe
    const globeGeometry = new THREE.SphereGeometry(2, 32, 32);
    const globeMaterial = new THREE.MeshStandardMaterial({
      color: 0x00aaff,
      wireframe: true,
      transparent: true,
      opacity: 0.7,
    });
    const globe = new THREE.Mesh(globeGeometry, globeMaterial);
    globe.position.set(0, 1.5, -5);
    scene.add(globe);

    // Create interactive panels
    const panelGeometry = new THREE.PlaneGeometry(3, 2);
    const panels: THREE.Mesh[] = [];

    const panelData = [
      {
        position: [-4, 1.5, -7],
        rotation: Math.PI / 4,
        text: "About FeexSystems\nAI Refinery",
        id: "about-panel",
        url: null,
      },
      {
        position: [0, 1.5, -9],
        rotation: 0,
        text: "Capabilities\nLoading...",
        id: "capabilities-panel",
        url: null,
      },
      {
        position: [4, 1.5, -7],
        rotation: -Math.PI / 4,
        text: "Contact Us\nGitHub",
        id: "contact-panel",
        url: "https://github.com/FeexSystems?tab=repositories",
      },
    ];

    function createTextTexture(
      text: string,
      width = 512,
      height = 256,
    ): THREE.CanvasTexture {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;

      ctx.fillStyle = "#1a1a1a";
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = "#ffffff";
      ctx.font = "30px Inter";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const lines = text.split("\n");
      const lineHeight = 40;
      const startY = height / 2 - ((lines.length - 1) * lineHeight) / 2;

      lines.forEach((line, index) => {
        ctx.fillText(line, width / 2, startY + index * lineHeight);
      });

      return new THREE.CanvasTexture(canvas);
    }

    panelData.forEach((data, _index) => {
      const material = new THREE.MeshBasicMaterial({
        map: createTextTexture(data.text),
        side: THREE.DoubleSide,
        transparent: true,
      });
      const panel = new THREE.Mesh(panelGeometry, material);
      panel.position.set(data.position[0], data.position[1], data.position[2]);
      panel.rotation.y = data.rotation;
      panel.userData = {
        id: data.id,
        url: data.url,
        originalColor: material.color.clone(),
      };
      scene.add(panel);
      panels.push(panel);
    });

    panelsRef.current = panels;

    // Fetch World Model project data from the canonical server API
    async function fetchWorldModelProjects() {
      try {
        const response = await fetch("/api/world-model/projects");
        if (!response.ok) throw new Error(`World Model responded ${response.status}`);
        const json = await response.json();
        const projects: any[] = json.projects || [];
        const capabilitiesPanel = panels.find(
          (p) => p.userData.id === "capabilities-panel",
        );
        if (projects.length > 0 && capabilitiesPanel) {
          const names = projects
            .slice(0, 3)
            .map((p: any) => p.name || p.fullName || "Project")
            .join("\n");
          const newTexture = createTextTexture(`Capabilities\n${names}`);
          (capabilitiesPanel.material as THREE.MeshBasicMaterial).map = newTexture;
          (capabilitiesPanel.material as THREE.MeshBasicMaterial).needsUpdate = true;
        }
      } catch (error) {
        console.warn("World Model projects fetch failed — VR panel will show placeholder:", error);
      }
    }

    fetchWorldModelProjects();

    // Camera position
    camera.position.set(0, 1.5, 0);

    // Animation loop
    let animationId: number;
    function animate() {
      animationId = requestAnimationFrame(animate);

      // Rotate globe
      globe.rotation.y += 0.005;

      renderer.render(scene, camera);
    }
    animate();

    // Cleanup
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
      renderer.dispose();
      scene.clear();
    };
  }, [onVRReady]);

  // Panel selection
  const selectPanel = (index: number) => {
    const panels = panelsRef.current;
    if (!panels.length) return;

    // Reset all panel colors
    panels.forEach((panel) => {
      (panel.material as THREE.MeshBasicMaterial).color.copy(
        panel.userData.originalColor,
      );
    });

    // Highlight selected panel
    const selectedPanel = panels[index];
    (selectedPanel.material as THREE.MeshBasicMaterial).color.setHex(0x00aaff);

    // Open URL if available
    if (selectedPanel.userData.url) {
      window.open(selectedPanel.userData.url, "_blank");
    }

    setSelectedPanelIndex(index);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const panels = panelsRef.current;
      if (!panels.length) return;

      switch (event.key) {
        case "ArrowLeft":
          event.preventDefault();
          const prevIndex =
            (selectedPanelIndex - 1 + panels.length) % panels.length;
          selectPanel(prevIndex);
          break;
        case "ArrowRight":
          event.preventDefault();
          const nextIndex = (selectedPanelIndex + 1) % panels.length;
          selectPanel(nextIndex);
          break;
        case "Enter":
          event.preventDefault();
          selectPanel(selectedPanelIndex);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedPanelIndex]);

  // Window resize handler
  useEffect(() => {
    const handleResize = () => {
      if (cameraRef.current && rendererRef.current) {
        cameraRef.current.aspect = window.innerWidth / window.innerHeight;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(window.innerWidth, window.innerHeight);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="vr-canvas"
      role="img"
      aria-label="FeexSystems VR Experience"
    />
  );
}
