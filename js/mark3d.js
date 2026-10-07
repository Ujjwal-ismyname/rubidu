// The Rubidu mark (two rings and a smile), drawn in 3D from simple shapes.
import * as THREE from "./vendor/three.module.min.js"; // self-hosted (MIT): no visitor data to a CDN

const U = 1 / 100;            // one SVG unit in scene units
const CX = 232.5, CY = 111;   // centre of the mark in SVG space

function svgPoint(x, y) {
  return new THREE.Vector3((x - CX) * U, -(y - CY) * U, 0);
}

export function createRubiduMarkModel({ ringColor, smileColor }) {
  const group = new THREE.Group();
  group.name = "rubidu-mark";

  const ringMat = new THREE.MeshPhysicalMaterial({
    color: ringColor, roughness: 0.38, metalness: 0.0, clearcoat: 0.3, clearcoatRoughness: 0.3,
  });
  const smileMat = new THREE.MeshPhysicalMaterial({
    color: smileColor, roughness: 0.28, metalness: 0.0, clearcoat: 0.8, clearcoatRoughness: 0.2,
    emissive: smileColor, emissiveIntensity: 0.04,
  });

  const tube = 12 * U;  // stroke 24 -> radius 12
  for (const [name, x] of [["eye-left", 111], ["eye-right", 354]]) {
    const eye = new THREE.Mesh(new THREE.TorusGeometry(75 * U, tube, 40, 96), ringMat);
    eye.name = name;
    eye.position.copy(svgPoint(x, 111));
    group.add(eye);
  }

  const curve = new THREE.QuadraticBezierCurve3(
    svgPoint(199, 148.5), svgPoint(232.5, 195), svgPoint(266, 148.5));
  const smile = new THREE.Group();
  smile.name = "smile";
  smile.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 48, tube, 24, false), smileMat));
  for (const end of [curve.v0, curve.v2]) {     // round line caps
    const cap = new THREE.Mesh(new THREE.SphereGeometry(tube, 24, 16), smileMat);
    cap.position.copy(end);
    smile.add(cap);
  }
  group.add(smile);
  return { group, ringMat, smileMat };
}

// The same rule as the CSS: ?theme= / data-theme wins, else the system setting.
// Kept in JS on purpose: a WebGL material can't follow a CSS variable.
const PALETTE = {
  light: { ring: "#1f2233", smile: "#0f9c8c" },
  dark: { ring: "#e9ecf1", smile: "#2dd4bf" },
};
function themeColors() {
  const forced = document.documentElement.dataset.theme;
  const dark = forced ? forced === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
  const p = dark ? PALETTE.dark : PALETTE.light;
  return { ringColor: new THREE.Color(p.ring), smileColor: new THREE.Color(p.smile) };
}

export function mountMark(canvas, { reducedMotion = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  camera.position.set(0, 0, 9);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x404858, 1.15));
  const key = new THREE.DirectionalLight(0xffffff, 1.9);
  key.position.set(-3, 4, 6);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x9ff5e6, 0.6);
  rim.position.set(4, -2, -3);
  scene.add(rim);

  const { group, ringMat, smileMat } = createRubiduMarkModel(themeColors());
  scene.add(group);
  const eyes = group.children.filter((c) => c.name.startsWith("eye"));

  const resize = () => {
    const { clientWidth: w, clientHeight: h } = canvas;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Keep the whole mark (about 4.7 units wide) in frame on narrow screens.
    camera.position.z = Math.max(8, 5.4 / camera.aspect + 3.4);
    camera.updateProjectionMatrix();
  };
  new ResizeObserver(resize).observe(canvas);
  resize();

  // Follow the pointer a little: the face looks at you, it does not spin.
  const target = { x: 0, y: 0 };
  window.addEventListener("pointermove", (e) => {
    target.y = ((e.clientX / window.innerWidth) - 0.5) * 0.7;
    target.x = ((e.clientY / window.innerHeight) - 0.5) * 0.45;
  }, { passive: true });

  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    const c = themeColors();
    ringMat.color.copy(c.ringColor);
    smileMat.color.copy(c.smileColor);
    smileMat.emissive.copy(c.smileColor);
  });

  // A blink every few seconds, like the menu-bar face.
  let nextBlink = 2.5;
  const clock = new THREE.Clock();
  let visible = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(canvas);

  function frame() {
    requestAnimationFrame(frame);
    if (!visible) return;
    const t = clock.getElapsedTime();
    if (!reducedMotion) {
      group.rotation.x += (target.x - group.rotation.x) * 0.06;
      group.rotation.y += (target.y - group.rotation.y) * 0.06;
      group.position.y = Math.sin(t * 1.1) * 0.06;
      const sinceBlink = t - nextBlink;
      const lid = sinceBlink > 0 && sinceBlink < 0.16 ? 1 - Math.sin((sinceBlink / 0.16) * Math.PI) * 0.88 : 1;
      for (const eye of eyes) eye.scale.y = lid;
      if (sinceBlink >= 0.16) nextBlink = t + 3 + Math.random() * 3;
    }
    renderer.render(scene, camera);
  }
  frame();
  canvas.dataset.ready = "true";
}
