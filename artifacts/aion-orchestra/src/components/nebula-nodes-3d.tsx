import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useGetWorkspaceSummary, useHealthCheck } from '@workspace/api-client-react';

/**
 * NebulaNodes3D: Interactive 3D Visualization of AION Virtual Machines.
 * Renders the Logic Nodes in a reactive nebula field.
 */

const VM_NODES = [
  { id: 'orchestra', name: 'Orchestra Node', color: 0x0023ff, position: [-2, 1, 0] },
  { id: 'cmo', name: 'CMO Node', color: 0xff0055, position: [2, 1, 0] },
  { id: 'bridge', name: 'Bridge Node', color: 0xbc00ff, position: [0, -1, 0] },
  { id: 'architect', name: 'Architect Node', color: 0x00f0ff, position: [-3, -2, 1] },
  { id: 'data', name: 'Data Node', color: 0xffcc00, position: [3, -2, -1] }
];

export function NebulaNodes3D() {
  const mountRef = useRef<HTMLDivElement>(null);
  const { data: summary } = useGetWorkspaceSummary();
  const { data: health } = useHealthCheck();

  useEffect(() => {
    if (!mountRef.current) return;

    // 1. Scene Setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, mountRef.current.clientWidth / mountRef.current.clientHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    mountRef.current.appendChild(renderer.domElement);

    camera.position.z = 8;

    // 2. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);
    const pointLight = new THREE.PointLight(0x00f0ff, 1);
    pointLight.position.set(5, 5, 5);
    scene.add(pointLight);

    // 3. VM Nodes
    const nodeGroup = new THREE.Group();
    const nodeMeshes: THREE.Mesh[] = [];

    VM_NODES.forEach((node) => {
      const geometry = new THREE.IcosahedronGeometry(0.8, 1);
      const material = new THREE.MeshPhongMaterial({
        color: node.color,
        wireframe: true,
        emissive: node.color,
        emissiveIntensity: 0.5,
        transparent: true,
        opacity: 0.8
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(node.position[0], node.position[1], node.position[2]);
      mesh.userData = { id: node.id, name: node.name };
      nodeMeshes.push(mesh);
      nodeGroup.add(mesh);
    });

    scene.add(nodeGroup);

    // 4. Star/Nebula Field
    const starsGeometry = new THREE.BufferGeometry();
    const starsCount = 2000;
    const posArray = new Float32Array(starsCount * 3);

    for (let i = 0; i < starsCount * 3; i++) {
      posArray[i] = (Math.random() - 0.5) * 20;
    }

    starsGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    const starsMaterial = new THREE.PointsMaterial({
      size: 0.05,
      color: 0xbc00ff,
      transparent: true,
      opacity: 0.5
    });

    const starField = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(starField);

    // 5. Lines/Data-Flow between nodes
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.2 });
    for (let i = 0; i < nodeMeshes.length; i++) {
      for (let j = i + 1; j < nodeMeshes.length; j++) {
        const points = [nodeMeshes[i].position, nodeMeshes[j].position];
        const lineGeom = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(lineGeom, lineMaterial);
        scene.add(line);
      }
    }

    // 6. Animation Loop
    let frame = 0;
    const animate = () => {
      frame = requestAnimationFrame(animate);

      nodeGroup.rotation.y += 0.005;
      starField.rotation.y -= 0.001;

      nodeMeshes.forEach((mesh, idx) => {
        mesh.rotation.x += 0.01;
        mesh.rotation.y += 0.01;

        // Dynamic scaling based on index/summary if needed
        const scale = 1 + Math.sin(Date.now() * 0.002 + idx) * 0.1;
        mesh.scale.set(scale, scale, scale);
      });

      renderer.render(scene, camera);
    };

    animate();

    // 7. Cleanup
    return () => {
      cancelAnimationFrame(frame);
      if (mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
      }
      scene.clear();
    };
  }, []);

  return (
    <div className="relative w-full h-[400px] cyber-card overflow-hidden bg-black/20">
      <div ref={mountRef} className="w-full h-full cursor-move" />

      <div className="absolute top-4 left-4 pointer-events-none">
        <div className="text-[10px] font-mono text-accent uppercase tracking-widest flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-accent animate-ping" />
          VM Visualization Node active
        </div>
        <h3 className="text-sm font-bold text-foreground mt-1">Nebula VM Design</h3>
      </div>

      <div className="absolute bottom-4 right-4 flex flex-col gap-1 text-[8px] font-mono uppercase text-foreground/40 text-right">
        {VM_NODES.map(n => (
          <div key={n.id} className="flex items-center justify-end gap-2">
            {n.name} <div className="h-1 w-8" style={{ background: `linear-gradient(to right, #${n.color.toString(16).padStart(6, '0')}, transparent)` }} />
          </div>
        ))}
      </div>
    </div>
  );
}
