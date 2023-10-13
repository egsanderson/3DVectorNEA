
import * as THREE from "three";

// Step 1: Set up the scene, camera, and renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);

const renderer = new THREE.WebGLRenderer({ alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('threejs-container').appendChild(renderer.domElement);

// Step 2: Create a plane and add it to the scene
const planeSize = 5;
const geometry = new THREE.PlaneGeometry(planeSize, planeSize);
const material = new THREE.MeshBasicMaterial({ color: 0xff0000, side: THREE.DoubleSide });
const plane = new THREE.Mesh(geometry, material);

// Step 3: Create an axes grid
const axesHelper = new THREE.AxesHelper(5);

// Step 4: Position the plane and camera
plane.rotation.x = Math.PI / 2; // Rotate the plane to be horizontal
scene.add(plane);
scene.add(axesHelper);
camera.position.set(5, 5, 5);
camera.lookAt(scene.position);

// Step 5: Create an animation loop
function animate() {
  requestAnimationFrame(animate);

  // Step 6: Rotate the plane (optional)
  plane.rotation.z += 0.005;
  plane.rotation.y += 0.005;

  // Step 7: Render the scene with the camera
  renderer.render(scene, camera);
}

animate();
