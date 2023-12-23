class ThreeJSApp {
    constructor() {
        this.threejsCanvas = document.querySelector('#threejs-canvas');
        this.width = this.threejsCanvas.offsetWidth;
        this.height = this.threejsCanvas.offsetHeight;

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(70, this.width / this.height, 0.1, 100);
        this.camera.position.set(10, 10, 10);
        this.camera.lookAt(0, 0, 0);

        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
        });
        this.renderer.setSize(this.width, this.height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.threejsCanvas.appendChild(this.renderer.domElement);

        this.line = this.createLine(0xff0000); // Create a single line

        this.axesHelper = new THREE.AxesHelper(10);
        this.scene.add(this.axesHelper);

        this.zoomSpeed = 1.2;

        this.setupEventListeners();

        this.update();
    }

    createLine(color) {
        const material = new THREE.LineBasicMaterial({ color, linewidth: 2 });
        const points = [];
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geometry, material);
        this.scene.add(line);
        return line;
    }

    setupEventListeners() {
        window.addEventListener('resize', () => this.onResize());
        window.addEventListener('wheel', (event) => this.onMouseWheel(event));
    }

    update() {
        this.updateLine(this.line);

        this.renderer.render(this.scene, this.camera);
        window.requestAnimationFrame(() => this.update());
    }

    onResize() {
        this.width = this.threejsCanvas.offsetWidth;
        this.height = this.threejsCanvas.offsetHeight;

        this.renderer.setSize(this.width, this.height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        this.camera.aspect = this.width / this.height;
        this.camera.updateProjectionMatrix();
    }

    updateLine(line) {
        const inputs = ['x', 'y', 'z', 'a', 'b', 'c'];
        const values = inputs.map((input) => {
            const inputElement = document.getElementById(`${input}line`);
            return inputElement ? parseFloat(inputElement.value) || 0 : 0;
        });

        const [x, y, z, a, b, c] = values;
        const point1 = new THREE.Vector3(x, y, z);
        const point2 = new THREE.Vector3(x + 10 * a, y + 10 * b, z + 10 * c);
        const point3 = new THREE.Vector3(x - 10 * a, y - 10 * b, z - 10 * c);
        const point4 = new THREE.Vector3(x + 30 * a, y + 30 * b, z + 30 * c);
        const point5 = new THREE.Vector3(x - 30 * a, y - 30 * b, z - 30 * c);

        line.geometry.setFromPoints([point1, point2, point3, point4, point5]);
    }

    onMouseWheel(event) {
        const delta = Math.sign(event.deltaY);
        this.camera.position.z *= Math.pow(this.zoomSpeed, delta);
    }
}

window.addEventListener('load', () => {
    const app = new ThreeJSApp();

    // Initial random integer values for Line 1 between -7 and 7
    document.getElementById('xline').value = Math.floor(Math.random() * 15) - 7;
    document.getElementById('yline').value = Math.floor(Math.random() * 15) - 7;
    document.getElementById('zline').value = Math.floor(Math.random() * 15) - 7;
    document.getElementById('aline').value = Math.floor(Math.random() * 15) - 7;
    document.getElementById('bline').value = Math.floor(Math.random() * 15) - 7;
    document.getElementById('cline').value = Math.floor(Math.random() * 15) - 7;
});
