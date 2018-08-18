const THREE = require('three')
const OrbitControls = require('three-orbit-controls')(THREE)
const dat = require('dat.gui');

guiParams = {
    networkParams: {
        neuronsSpread: 1,
        neuronsCount: 400,
        initialRange: 0.4,
        initialForce: 0.3,
        rangeDecay: 0.0007,
        forceDecay: 0.0007,
    },
    iteration: 0,
    map: '2D',
    dataset: '3D sphere volume',
    isPlaying: true,
    restart: () => restartScene(),
    iterate: () => iterate(),
    info: () => document.getElementById('modal').style.display = 'block',
    showLines: true,
}

let neuronsCount, neuronsCountSide, iteration = 0;

initThree();
initTarget = (size) => initSphere(size / 2.0);
initScene();
animate();

function initThree() {
    scene = new THREE.Scene();
    let backgroundColor = new THREE.Color(0x000000);
    scene.fog = new THREE.FogExp2(backgroundColor, 0.06);
    scene.background = backgroundColor;

    aspect = window.innerWidth / window.innerHeight;
    let fov = 60;
    camera = new THREE.PerspectiveCamera(fov, aspect);
    let distance = 7;
    camera.position.set(distance, distance, distance);
    camera.lookAt(new THREE.Vector3());

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;

    let gui = new dat.GUI({ width: 300 });

    gui.add(guiParams, 'info').name('<b>What is going on?</b>');

    gui.add(guiParams, 'dataset', ['3D sphere volume']).name('Dataset (map from...)');
    gui.add(guiParams, 'map', ['1D', '2D', '3D']).name('Network (map to...)');

    let paramsFolder = gui.addFolder('Network parameters');
    paramsFolder
        .add(guiParams.networkParams, 'neuronsCount', 10, 10000)
        .name('neuron count <a href="#" title="For a multidimensional network, this will be clamped down to fit a regular grid">?</a>');
    paramsFolder
        .add(guiParams.networkParams, 'initialRange', 0, 1)
        .name('<b>h</b> initial range');
    paramsFolder
        .add(guiParams.networkParams, 'rangeDecay', 0, .005)
        .name('<b>&lambda;<sub>h</sub></b> range decay');
    paramsFolder
        .add(guiParams.networkParams, 'initialForce', 0, 1)
        .name('<b>&sigma;</b> initial force');
    paramsFolder
        .add(guiParams.networkParams, 'forceDecay', 0, .005)
        .name('<b>&lambda;<sub>&sigma;</sub></b> force decay');

    // let showLines = gui.add(guiParams, 'isPlaying').name('Show lines').listen();
    // showLines.onChange((value) => {
    //     neuronLines.visible = value;
    // });

    gui.add(guiParams, 'isPlaying').name('Autoplay');
    gui.add(guiParams, 'iterate').name('Step forward');
    gui.add(guiParams, 'iteration').name('Iteration').listen();
    gui.add(guiParams, 'restart').name('<b>RESTART</b>');
}

function initScene() {
    params = Object.assign({}, guiParams.networkParams);
    initNeurons();
    initTarget(10);
}

function clearScene() {
    scene.remove(neuronPoints);
    scene.remove(neuronLines);
    neuronsBufferGeometry.dispose();
    scene.remove(dataRepresentation);
}

function restartScene() {
    clearScene();
    initScene();
    iteration = 0;
    guiParams.iteration = iteration;
}

function animate() {
    requestAnimationFrame(animate);

    if (guiParams.isPlaying) {
        iterate();
    }

    renderer.render(scene, camera);
}

function initNeurons() {
    networkDimensions = Number(guiParams.map.charAt(0));
    neuronsCountSide = Math.floor(Math.pow(params.neuronsCount, 1 / networkDimensions));
    neuronsCount = Math.pow(neuronsCountSide, networkDimensions);

    let points = [];
    for (let i = 0; i < neuronsCount; i++) {
        let point = sampleFromSphereVolume(params.neuronsSpread);
        points.push(point.x, point.y, point.z);
    }

    neuronsBufferGeometry = new THREE.BufferGeometry();
    neuronsBufferGeometry.dynamic = true;
    neuronsBufferGeometry.addAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    neuronPositions = neuronsBufferGeometry.attributes.position.array;

    let neuronLinesMaterial = new THREE.LineBasicMaterial();

    let colors = [];

    switch (networkDimensions) {
        case 1:
            neighborhoodDistance = (a, b) => neighborhoodDistance1D(a, b);
            for (let i = 0; i < neuronsCount; i++) {
                let r = i / (neuronsCount - 1);
                let g = 1 - r;
                let b = 1 - Math.abs(r - g);
                colors.push(r);
                colors.push(g);
                colors.push(b);
            }
            neuronLines = new THREE.Line(neuronsBufferGeometry, neuronLinesMaterial);
            break;
        case 2:
            neighborhoodDistance = (a, b) => neighborhoodDistance2D(a, b);
            let indices2D = [];
            for (let i = 0; i < neuronsCount; i++) {
                var p = mapTo2D(i);
                if (p.x + 1 < neuronsCountSide) {
                    indices2D.push(i);
                    indices2D.push(mapFrom2D(p.x + 1, p.y));
                }
                if (p.y + 1 < neuronsCountSide) {
                    indices2D.push(i);
                    indices2D.push(mapFrom2D(p.x, p.y + 1));
                }
                let r = p.x / (neuronsCountSide - 1);
                let g = p.y / (neuronsCountSide - 1);
                let b = 1 - Math.abs(r - g);
                colors.push(r);
                colors.push(g);
                colors.push(b);
            }
            neuronsBufferGeometry.setIndex(indices2D);
            neuronLines = new THREE.LineSegments(neuronsBufferGeometry, neuronLinesMaterial);
            break;
        case 3:
            neighborhoodDistance = (a, b) => neighborhoodDistance3D(a, b);
            let indices3D = [];
            for (let i = 0; i < neuronsCount; i++) {
                var p = mapTo3D(i);
                if (p.x + 1 < neuronsCountSide) {
                    indices3D.push(i);
                    indices3D.push(mapFrom3D(p.x + 1, p.y, p.z));
                }
                if (p.y + 1 < neuronsCountSide) {
                    indices3D.push(i);
                    indices3D.push(mapFrom3D(p.x, p.y + 1, p.z));
                }
                if (p.z + 1 < neuronsCountSide) {
                    indices3D.push(i);
                    indices3D.push(mapFrom3D(p.x, p.y, p.z + 1));
                }

                let r = p.x / (neuronsCountSide - 1);
                let g = p.y / (neuronsCountSide - 1);
                let b = p.z / (neuronsCountSide - 1);
                colors.push(r);
                colors.push(g);
                colors.push(b);
            }
            neuronsBufferGeometry.setIndex(indices3D);
            neuronLines = new THREE.LineSegments(neuronsBufferGeometry, neuronLinesMaterial);
            break;
    }
    neuronsBufferGeometry.addAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    let neuronsMaterial = new THREE.PointsMaterial({ size: .2, vertexColors: THREE.VertexColors });
    neuronPoints = new THREE.Points(neuronsBufferGeometry, neuronsMaterial);

    scene.add(neuronPoints);
    scene.add(neuronLines);
}

function initSphere(radius) {
    let geometry = new THREE.IcosahedronBufferGeometry(radius, 1);
    let wireframe = new THREE.WireframeGeometry(geometry);
    let material = new THREE.LineBasicMaterial({ color: 0xFFFFFF });
    dataRepresentation = new THREE.LineSegments(wireframe, material);
    scene.add(dataRepresentation);
    sampleFromData = () => sampleFromSphereVolume(5);
}

function sampleFromSphereVolume(radius) {
    let u = Math.random();
    let v = Math.random();
    let theta = 2 * Math.PI * u;
    let phi = Math.acos(2 * v - 1);
    let sinPhi = Math.sin(phi);
    let adjustedRandomRadius = radius * Math.cbrt(Math.random());
    let x = adjustedRandomRadius * Math.cos(theta) * sinPhi;
    let y = adjustedRandomRadius * Math.sin(theta) * sinPhi
    let z = adjustedRandomRadius * Math.cos(phi);
    return new THREE.Vector3(x, y, z);
}

function findClosestNeuron(point) {
    let minIndex, minDistance = Infinity, minPosition;
    for (let i = 0; i < neuronsCount; i++) {
        let position = getNeuronPosition(i);
        let distance = position.distanceTo(point);
        if (distance < minDistance) {
            minDistance = distance;
            minIndex = i;
            minPosition = position;
        }
    }
    return [minIndex, minPosition];
}

function neighborhoodDistance1D(index1, index2) {
    return Math.abs(index1 - index2);
}

function mapTo2D(index) {
    let x = index % neuronsCountSide;
    let y = Math.floor(index / neuronsCountSide);
    return { x: x, y: y };
}

function mapFrom2D(x, y) {
    return x + y * neuronsCountSide;
}

function neighborhoodDistance2D(index1, index2) {
    let p1 = mapTo2D(index1);
    let p2 = mapTo2D(index2);
    return new THREE.Vector2(p1.x - p2.x, p1.y - p2.y).length();
}

function mapTo3D(index) {
    let x = index % neuronsCountSide;
    let y = Math.floor(index / neuronsCountSide) % neuronsCountSide;
    let z = Math.floor(index / (neuronsCountSide * neuronsCountSide));
    return { x: x, y: y, z: z };
}

function mapFrom3D(x, y, z) {
    return x + y * neuronsCountSide + z * neuronsCountSide * neuronsCountSide;
}

function neighborhoodDistance3D(index1, index2) {
    let p1 = mapTo3D(index1);
    let p2 = mapTo3D(index2);
    return new THREE.Vector3(p1.x - p2.x, p1.y - p2.y, p1.z - p2.z).length();
}

function gaussian(x, sigma) {
    return Math.exp(-(x * x) / (sigma * sigma));
}

function iterate() {
    let targetPosition = sampleFromData();
    let range = params.initialRange * neuronsCountSide * networkDimensions * Math.exp(-params.rangeDecay * iteration);
    let force = params.initialForce * Math.exp(-params.forceDecay * iteration);

    let bestIndex, bestPosition;
    [bestIndex, bestPosition] = findClosestNeuron(targetPosition);

    for (let i = 0; i < neuronsCount; i++) {
        let position = getNeuronPosition(i);
        let indexDistance = neighborhoodDistance(i, bestIndex);
        let scale = force * gaussian(indexDistance, range);
        let difference = new THREE.Vector3().subVectors(targetPosition, position);
        position.addScaledVector(difference, scale);
        setNeuronPosition(i, position);
    }

    iteration++;
    guiParams.iteration = iteration;

    neuronsBufferGeometry.attributes.position.needsUpdate = true;
}

function getNeuronPosition(index) {
    return new THREE.Vector3(
        neuronPositions[3 * index + 0],
        neuronPositions[3 * index + 1],
        neuronPositions[3 * index + 2]
    );
}

function setNeuronPosition(index, position) {
    neuronPositions[3 * index + 0] = position.x;
    neuronPositions[3 * index + 1] = position.y;
    neuronPositions[3 * index + 2] = position.z;
}

window.addEventListener('resize', onWindowResize);

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}