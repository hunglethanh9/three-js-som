const THREE = require('three')
const OrbitControls = require('three-orbit-controls')(THREE)
const dat = require('dat.gui');

sceneSettings = {
    backgroundColor: new THREE.Color(0x000000),
    fogStrength: 0.06,
    fov: 60,
    scale: 5,
    cameraDistance: 11,
}

datasets = {
    sphereVolume: '3D sphere volume',
    sphereSurface: '3D sphere surface',
    twoSphereVolume: '3D two spheres volume',
}

guiModel = {
    params: {
        neuronsSpread: 1,
        neuronsCount: 500,
        initialRange: 0.5,
        initialForce: 0.5,
        rangeDecay: 0.0009,
        forceDecay: 0.0008,
        iteration: 0,
    },
    iteration: 0,
    map: '2D grid',
    dataset: datasets.sphereVolume,
    isPlaying: true,
    restart: () => restartScene(),
    iterate: () => iterate(),
    info: () => document.getElementById('modal').style.display = 'block',
}

initScene();
initGui();
initNetwork();
animate();

function initScene() {
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(sceneSettings.backgroundColor, sceneSettings.fogStrength);
    scene.background = sceneSettings.backgroundColor;

    let aspectRatio = window.innerWidth / window.innerHeight;
    camera = new THREE.PerspectiveCamera(sceneSettings.fov, aspectRatio);
    let cameraPosition = new THREE.Vector3(1, 1, 1).normalize().multiplyScalar(sceneSettings.cameraDistance);
    camera.position.set(cameraPosition.x, cameraPosition.y, cameraPosition.z);
    camera.lookAt(new THREE.Vector3());

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
}

function initGui() {
    let gui = new dat.GUI({ width: 300 });

    gui.add(guiModel, 'info').name('<b>What is going on?</b>');
    let datasetNames = [];
    for (const key of Object.keys(datasets)) {
        datasetNames.push(datasets[key]);
    }
    gui.add(guiModel, 'dataset', datasetNames).name('Dataset (map from...)');
    gui.add(guiModel, 'map', ['1D line', '2D grid', '3D grid']).name('Network (map to...)');

    let paramsFolder = gui.addFolder('Network parameters');
    paramsFolder
        .add(guiModel.params, 'neuronsCount', 10, 10000)
        .name('neuron count <a href="#" title="For a multidimensional network, this will be clamped down to fit a regular grid">?</a>');
    paramsFolder
        .add(guiModel.params, 'initialRange', 0, 1)
        .name('<b>h</b> initial range');
    paramsFolder
        .add(guiModel.params, 'rangeDecay', 0, .005)
        .name('<b>&lambda;<sub>h</sub></b> range decay');
    paramsFolder
        .add(guiModel.params, 'initialForce', 0, 1)
        .name('<b>&sigma;</b> initial force');
    paramsFolder
        .add(guiModel.params, 'forceDecay', 0, .005)
        .name('<b>&lambda;<sub>&sigma;</sub></b> force decay');

    gui.add(guiModel, 'isPlaying').name('Autoplay');
    gui.add(guiModel, 'iterate').name('Step forward');
    gui.add(guiModel, 'iteration').name('Iteration').listen();
    gui.add(guiModel, 'restart').name('<b>RESTART</b>');
}

function initNetwork() {
    params = Object.assign({}, guiModel.params);
    guiModel.iteration = 0;
    initNeurons();
    initData();
}

function initData() {
    switch (guiModel.dataset) {
        case datasets.sphereSurface:
            initSphereSurface();
            break;
        case datasets.sphereVolume:
            initSphereVolume();
            break;
        case datasets.twoSphereVolume:
            initTwoSphereVolume();
            break;
    }
}

function restartScene() {
    scene.remove(neuronPoints);
    scene.remove(neuronLines);
    neuronsBufferGeometry.dispose();
    scene.remove(dataRepresentation);
    initNetwork();
}

function animate() {
    requestAnimationFrame(animate);
    if (guiModel.isPlaying) {
        iterate();
    }
    renderer.render(scene, camera);
}

function initNeurons() {
    networkDimensions = Number(guiModel.map.charAt(0));
    neuronsCountSide = Math.floor(Math.pow(params.neuronsCount, 1 / networkDimensions));
    neuronsCount = Math.pow(neuronsCountSide, networkDimensions);

    neuronsBufferGeometry = new THREE.BufferGeometry();
    neuronsBufferGeometry.dynamic = true;
    let neuronPositionsAttribute = new THREE.Float32BufferAttribute(new Array(3 * neuronsCount).fill(0), 3);
    neuronsBufferGeometry.addAttribute('position', neuronPositionsAttribute);
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

function sphereRepresentation(radius) {
    let geometry = new THREE.IcosahedronBufferGeometry(radius, 1);
    let wireframe = new THREE.WireframeGeometry(geometry);
    let material = new THREE.LineBasicMaterial();
    return new THREE.LineSegments(wireframe, material);
}

function initSphereVolume() {
    let radius = sceneSettings.scale;
    dataRepresentation = sphereRepresentation(radius);
    scene.add(dataRepresentation);
    sampleFromData = () => sampleFromSphereVolume(radius);
}

function initSphereSurface() {
    let radius = sceneSettings.scale;
    dataRepresentation = sphereRepresentation(radius);
    scene.add(dataRepresentation);
    sampleFromData = () => sampleFromSphereSurface(radius);
}

function initTwoSphereVolume() {
    let radius = sceneSettings.scale / 2;
    let distance = sceneSettings.scale * 1.5;
    let sphere1 = sphereRepresentation(radius);
    sphere1.position.set(distance / 2, 0, 0);
    let sphere2 = sphereRepresentation(radius);
    sphere2.position.set(-distance / 2, 0, 0);
    dataRepresentation = new THREE.Object3D();
    dataRepresentation.add(sphere1);
    dataRepresentation.add(sphere2);
    scene.add(dataRepresentation);
    sampleFromData = () => sampleFromTwoSphereVolume(radius, distance);
}

function sampleFromSphereVolume(radius, center) {
    center = center || new THREE.Vector3();
    let u = Math.random();
    let v = Math.random();
    let theta = 2 * Math.PI * u;
    let phi = Math.acos(2 * v - 1);
    let sinPhi = Math.sin(phi);
    let adjustedRandomRadius = radius * Math.cbrt(Math.random());
    let x = adjustedRandomRadius * Math.cos(theta) * sinPhi;
    let y = adjustedRandomRadius * Math.sin(theta) * sinPhi
    let z = adjustedRandomRadius * Math.cos(phi);
    return new THREE.Vector3(center.x + x, center.y + y, center.z + z);
}

function sampleFromTwoSphereVolume(radius, distance) {
    let centerX = distance / 2;
    if (Math.random() > .5) {
        centerX = -centerX;
    }
    let center = new THREE.Vector3(centerX, 0, 0);
    return sampleFromSphereVolume(radius, center);
}

function sampleFromSphereSurface(radius) {
    let u = Math.random();
    let v = Math.random();
    let theta = 2 * Math.PI * u;
    let phi = Math.acos(2 * v - 1);
    let sinPhi = Math.sin(phi);
    let x = radius * Math.cos(theta) * sinPhi;
    let y = radius * Math.sin(theta) * sinPhi
    let z = radius * Math.cos(phi);
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
    let range = params.initialRange * neuronsCountSide * Math.sqrt(networkDimensions) * Math.exp(-params.rangeDecay * params.iteration);
    let force = params.initialForce * Math.exp(-params.forceDecay * params.iteration);

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

    params.iteration++;
    guiModel.iteration = params.iteration;

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