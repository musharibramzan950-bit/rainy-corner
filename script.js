document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('scene');
    const actionBtn = document.getElementById('actionBtn');
    const instructions = document.getElementById('instructions');

    const btnUp = document.getElementById('btnUp');
    const btnDown = document.getElementById('btnDown');
    const btnLeft = document.getElementById('btnLeft');
    const btnRight = document.getElementById('btnRight');

    setTimeout(() => {
        instructions.style.opacity = 0;
        setTimeout(() => instructions.remove(), 1000);
    }, 6000);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x040408);

    scene.fog = new THREE.FogExp2(0x06060c, 0.08);

    const camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0.5, 1.7, 3.5);
    camera.rotation.order = 'YXZ';

    let pitch = -0.03;
    let yaw = 0;
    let targetPitch = pitch;
    let targetYaw = yaw;
    const clampPitch = Math.PI / 4;

    const moveState = { forward: false, backward: false, left: false, right: false };
    const velocity = new THREE.Vector3();
    const targetVelocity = new THREE.Vector3();
    const moveSpeed = 0.09;
    const lerpFactor = 0.15;

    const bounds = {
        minX: -4.2,
        maxX: 4.2,
        minZ: -3.2,
        maxZ: 3.2
    };

    let isDragging = false;
    let prevPointerX = 0;
    let prevPointerY = 0;

    canvas.addEventListener('pointerdown', (e) => {
        isDragging = true;
        prevPointerX = e.clientX;
        prevPointerY = e.clientY;
    });

    window.addEventListener('pointermove', (e) => {
        if (!isDragging) return;
        const dx = e.clientX - prevPointerX;
        const dy = e.clientY - prevPointerY;

        targetYaw -= dx * 0.0045;
        targetPitch -= dy * 0.0045;

        targetPitch = Math.max(-clampPitch, Math.min(clampPitch, targetPitch));

        prevPointerX = e.clientX;
        prevPointerY = e.clientY;
    });

    window.addEventListener('pointerup', () => {
        isDragging = false;
    });

    window.addEventListener('keydown', (e) => {
        switch (e.key.toLowerCase()) {
            case 'w':
            case 'arrowup':
                moveState.forward = true;
                break;
            case 's':
            case 'arrowdown':
                moveState.backward = true;
                break;
            case 'a':
            case 'arrowleft':
                moveState.left = true;
                break;
            case 'd':
            case 'arrowright':
                moveState.right = true;
                break;
        }
    });

    window.addEventListener('keyup', (e) => {
        switch (e.key.toLowerCase()) {
            case 'w':
            case 'arrowup':
                moveState.forward = false;
                break;
            case 's':
            case 'arrowdown':
                moveState.backward = false;
                break;
            case 'a':
            case 'arrowleft':
                moveState.left = false;
                break;
            case 'd':
            case 'arrowright':
                moveState.right = false;
                break;
        }
    });

    function setupDpad(btn, stateProp) {
        btn.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            moveState[stateProp] = true;
        });
        btn.addEventListener('pointerup', (e) => {
            e.preventDefault();
            moveState[stateProp] = false;
        });
        btn.addEventListener('pointerleave', (e) => {
            e.preventDefault();
            moveState[stateProp] = false;
        });
    }
    setupDpad(btnUp, 'forward');
    setupDpad(btnDown, 'backward');
    setupDpad(btnLeft, 'left');
    setupDpad(btnRight, 'right');

    function updateMovement(dt) {

        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
        forward.y = 0;
        forward.normalize();

        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
        right.y = 0;
        right.normalize();

        targetVelocity.set(0, 0, 0);
        if (moveState.forward) targetVelocity.add(forward);
        if (moveState.backward) targetVelocity.add(forward.clone().negate());
        if (moveState.left) targetVelocity.add(right.clone().negate());
        if (moveState.right) targetVelocity.add(right);

        if (targetVelocity.lengthSq() > 0) {
            targetVelocity.normalize().multiplyScalar(moveSpeed);
        }

        velocity.lerp(targetVelocity, lerpFactor);
        camera.position.add(velocity);

        camera.position.x = Math.max(bounds.minX, Math.min(bounds.maxX, camera.position.x));
        camera.position.z = Math.max(bounds.minZ, Math.min(bounds.maxZ, camera.position.z));
    }

    const RW = 10, RH = 5, RD = 8;

    const floorMat = new THREE.MeshStandardMaterial({
        color: 0x2c1d16,
        roughness: 0.35,
        metalness: 0.05
    });

    const wallMat = new THREE.MeshStandardMaterial({
        color: 0x1f1a24,
        roughness: 0.85,
        metalness: 0.02
    });

    const ceilMat = new THREE.MeshStandardMaterial({
        color: 0x18141d,
        roughness: 0.9,
        metalness: 0
    });

    const woodMat = new THREE.MeshStandardMaterial({
        color: 0x1c120c,
        roughness: 0.5,
        metalness: 0.05
    });

    const brassMat = new THREE.MeshStandardMaterial({
        color: 0xcca050,
        roughness: 0.25,
        metalness: 0.8
    });

    const metalMat = new THREE.MeshStandardMaterial({
        color: 0x2c2c2c,
        roughness: 0.35,
        metalness: 0.85
    });

    const lampBaseMat = new THREE.MeshStandardMaterial({
        color: 0x1e1e1e,
        roughness: 0.4,
        metalness: 0.7
    });

    function addBox(w, h, d, x, y, z, mat, castS, recS) {
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
        m.position.set(x, y, z);
        m.castShadow = castS;
        m.receiveShadow = recS;
        scene.add(m);
        return m;
    }

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(RW, RD), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    addBox(5, RH, 0.05, -2.5, RH / 2, -RD / 2, wallMat, false, true);
    addBox(1.8, RH, 0.05, 4.1, RH / 2, -RD / 2, wallMat, false, true);
    addBox(3.2, 1.1, 0.05, 1.6, 0.55, -RD / 2, wallMat, false, true);
    addBox(3.2, 0.9, 0.05, 1.6, 4.55, -RD / 2, wallMat, false, true);
    addBox(RW, RH, 0.05, 0, RH / 2, RD / 2, wallMat, false, true);
    addBox(0.05, RH, RD, -RW / 2, RH / 2, 0, wallMat, false, true);
    addBox(0.05, RH, RD, RW / 2, RH / 2, 0, wallMat, false, true);

    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(RW, RD), ceilMat);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(0, RH, 0);
    scene.add(ceiling);

    const winW = 3.2, winH = 3.0;
    const winCX = 1.6, winCY = 2.6;
    const winZ = -RD / 2 + 0.01;
    const fT = 0.12, fD = 0.18;
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x1a120c, roughness: 0.55 });

    addBox(winW + fT * 2, fT, fD, winCX, winCY + winH / 2, winZ, frameMat, true, false);
    addBox(winW + fT * 2, fT, fD, winCX, winCY - winH / 2, winZ, frameMat, true, false);
    addBox(fT, winH, fD, winCX - winW / 2 - fT / 2, winCY, winZ, frameMat, true, false);
    addBox(fT, winH, fD, winCX + winW / 2 + fT / 2, winCY, winZ, frameMat, true, false);
    addBox(fT * 0.7, winH, fD, winCX, winCY, winZ, frameMat, true, false);

    const winPivotL = new THREE.Group();
    winPivotL.position.set(winCX - winW / 4 - 0.03, winCY, winZ);
    scene.add(winPivotL);

    const winPivotR = new THREE.Group();
    winPivotR.position.set(winCX + winW / 4 + 0.03, winCY, winZ);
    scene.add(winPivotR);

    const glassCanvas = document.createElement('canvas');
    glassCanvas.width = 1024;
    glassCanvas.height = 1024;
    const glassCtx = glassCanvas.getContext('2d');

    function drawFoggyGlass() {

        const g = glassCtx.createLinearGradient(0, 0, 0, 1024);
        g.addColorStop(0, 'rgba(195, 215, 235, 0.16)');
        g.addColorStop(0.5, 'rgba(180, 200, 220, 0.10)');
        g.addColorStop(1, 'rgba(165, 185, 205, 0.16)');
        glassCtx.fillStyle = g;
        glassCtx.fillRect(0, 0, 1024, 1024);

        for (let i = 0; i < 40; i++) {
            const x = Math.random() * 1024;
            const y = Math.random() * 1024;
            const r = 90 + Math.random() * 150;
            const radial = glassCtx.createRadialGradient(x, y, 0, x, y, r);
            radial.addColorStop(0, `rgba(220, 235, 255, ${0.12 + Math.random() * 0.15})`);
            radial.addColorStop(1, 'rgba(220, 235, 255, 0)');
            glassCtx.fillStyle = radial;
            glassCtx.fillRect(x - r, y - r, r * 2, r * 2);
        }

        glassCtx.globalCompositeOperation = 'destination-out';
        glassCtx.font = 'italic 105px Georgia, serif';
        glassCtx.textAlign = 'center';
        glassCtx.textBaseline = 'middle';

        glassCtx.fillText('i miss you', 512, 512);

        glassCtx.font = 'italic 109px Georgia, serif';
        glassCtx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        glassCtx.fillText('i miss you', 514, 514);

        glassCtx.globalCompositeOperation = 'source-over';

        for (let i = 0; i < 180; i++) {
            glassCtx.beginPath();
            glassCtx.arc(Math.random() * 1024, Math.random() * 1024, 2 + Math.random() * 4, 0, Math.PI * 2);
            glassCtx.fillStyle = `rgba(220, 240, 255, ${0.35 + Math.random() * 0.35})`;
            glassCtx.fill();
        }
    }
    drawFoggyGlass();

    const glassTex = new THREE.CanvasTexture(glassCanvas);
    const glassMat = new THREE.MeshPhysicalMaterial({
        map: glassTex,
        transparent: true,
        opacity: 0.58,
        roughness: 0.15,
        transmission: 0.82,
        ior: 1.5,
        side: THREE.DoubleSide
    });

    const paneL = new THREE.Mesh(new THREE.PlaneGeometry(winW / 2 - 0.08, winH - 0.08), glassMat);
    paneL.position.set(winW / 4 - 0.03, 0, 0.01);
    winPivotL.add(paneL);

    const paneR = new THREE.Mesh(new THREE.PlaneGeometry(winW / 2 - 0.08, winH - 0.08), glassMat);
    paneR.position.set(-winW / 4 + 0.03, 0, 0.01);
    winPivotR.add(paneR);

    const lawnMat = new THREE.MeshStandardMaterial({ color: 0x0c1e10, roughness: 0.98 });
    const lawn = new THREE.Mesh(new THREE.PlaneGeometry(32, 22), lawnMat);
    lawn.rotation.x = -Math.PI / 2;
    lawn.position.set(winCX, 0.01, -RD / 2 - 11.05);
    scene.add(lawn);

    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x120a06, roughness: 0.95 });
    const foliageMat = new THREE.MeshStandardMaterial({ color: 0x0e1f11, roughness: 0.9 });
    const treeGroup = new THREE.Group();
    scene.add(treeGroup);

    function createTree(x, z, scale) {
        const t = new THREE.Group();
        t.position.set(x, 0, z);
        t.scale.set(scale, scale, scale);

        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 3, 6), trunkMat);
        trunk.position.y = 1.5;
        t.add(trunk);

        for (let i = 0; i < 4; i++) {
            const layer = new THREE.Mesh(new THREE.ConeGeometry(0.8 - i * 0.18, 1.5, 6), foliageMat);
            layer.position.y = 2.8 + i * 0.9;
            t.add(layer);
        }
        treeGroup.add(t);
    }
    createTree(winCX - 4.5, -RD / 2 - 4.5, 1.25);
    createTree(winCX - 1.8, -RD / 2 - 8, 1.6);
    createTree(winCX + 2.8, -RD / 2 - 6, 1.35);
    createTree(winCX + 5.2, -RD / 2 - 4.8, 1.15);

    const skyCanvas = document.createElement('canvas');
    skyCanvas.width = 512;
    skyCanvas.height = 512;
    const skyCtx = skyCanvas.getContext('2d');
    const skyGrd = skyCtx.createLinearGradient(0, 0, 0, 512);
    skyGrd.addColorStop(0, '#060a12');
    skyGrd.addColorStop(0.25, '#0b1626');
    skyGrd.addColorStop(0.5, '#172235');
    skyGrd.addColorStop(0.7, '#2b2a47');
    skyGrd.addColorStop(0.85, '#40384f');
    skyGrd.addColorStop(1, '#523a54');
    skyCtx.fillStyle = skyGrd;
    skyCtx.fillRect(0, 0, 512, 512);

    const skyTex = new THREE.CanvasTexture(skyCanvas);
    const skyPlane = new THREE.Mesh(new THREE.PlaneGeometry(28, 18), new THREE.MeshBasicMaterial({ map: skyTex }));
    skyPlane.position.set(winCX, 6, -RD / 2 - 13);
    scene.add(skyPlane);

    const rainCount = 2800;
    const rainGeo = new THREE.BufferGeometry();
    const rainPos = new Float32Array(rainCount * 3);
    const rainVel = [];

    for (let i = 0; i < rainCount; i++) {
        rainPos[i * 3] = winCX + (Math.random() - 0.5) * 18;
        rainPos[i * 3 + 1] = Math.random() * 12;
        rainPos[i * 3 + 2] = -RD / 2 - 0.5 - Math.random() * 9;
        rainVel.push(0.08 + Math.random() * 0.11);
    }
    rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));

    const rainMat = new THREE.PointsMaterial({
        color: 0x6e7e9e,
        size: 0.055,
        transparent: true,
        opacity: 0.5,
        depthWrite: false
    });
    const rain = new THREE.Points(rainGeo, rainMat);
    scene.add(rain);

    const bedFrameMat = new THREE.MeshStandardMaterial({ color: 0x22150f, roughness: 0.7 });
    const mattressMat = new THREE.MeshStandardMaterial({ color: 0xeae7e1, roughness: 0.9 });
    const pillowMat = new THREE.MeshStandardMaterial({ color: 0xf2eee6, roughness: 0.95 });
    const sheetMat = new THREE.MeshStandardMaterial({ color: 0x212f45, roughness: 0.85 });

    addBox(3.4, 0.28, 2.3, -2.6, 0.3, -2.4, bedFrameMat, true, true);

    addBox(3.4, 1.4, 0.12, -2.6, 0.9, -3.5, bedFrameMat, true, true);

    addBox(3.2, 0.35, 2.1, -2.6, 0.58, -2.4, mattressMat, true, true);

    addBox(2.95, 0.2, 1.85, -2.6, 0.68, -2.2, sheetMat, true, true);

    addBox(0.9, 0.16, 0.52, -3.1, 0.8, -3.15, pillowMat, true, false);
    addBox(0.9, 0.16, 0.52, -2.1, 0.8, -3.15, pillowMat, true, false);

    const phoneCaseMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.5 });
    const phoneCase = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.015, 0.09), phoneCaseMat);
    phoneCase.position.set(-2.2, 0.785, -1.8);
    phoneCase.rotation.y = -Math.PI / 12;
    scene.add(phoneCase);

    const phoneScreenMat = new THREE.MeshStandardMaterial({
        color: 0x88bbff,
        emissive: 0x88bbff,
        emissiveIntensity: 0.15,
        roughness: 0.1
    });
    const phoneScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.08), phoneScreenMat);
    phoneScreen.rotation.x = -Math.PI / 2;
    phoneScreen.position.set(-2.2, 0.795, -1.8);
    phoneScreen.rotation.z = -Math.PI / 12;
    scene.add(phoneScreen);

    addBox(0.7, 0.65, 0.55, -0.4, 0.32, -3.15, woodMat, true, true);

    addBox(0.2, 0.04, 0.03, -0.4, 0.45, -2.85, metalMat, true, false);

    const cupMat = new THREE.MeshStandardMaterial({ color: 0xf5f0e5, roughness: 0.6 });
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.1, 12), cupMat);
    cup.position.set(-0.55, 0.7, -3.0);
    cup.castShadow = true;
    scene.add(cup);

    const handleMat = new THREE.MeshStandardMaterial({ color: 0xf5f0e5, roughness: 0.6 });
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.008, 8, 12, Math.PI), handleMat);
    handle.position.set(-0.49, 0.69, -3.0);
    handle.rotation.z = Math.PI / 2;
    handle.rotation.y = Math.PI / 2;
    scene.add(handle);

    const coffeeMat = new THREE.MeshStandardMaterial({ color: 0x2a1508, roughness: 0.3 });
    const coffee = new THREE.Mesh(new THREE.CircleGeometry(0.055, 12), coffeeMat);
    coffee.position.set(-0.55, 0.745, -3.0);
    coffee.rotation.x = -Math.PI / 2;
    scene.add(coffee);

    const steamCount = 30;
    const steamGeo = new THREE.BufferGeometry();
    const steamPos = new Float32Array(steamCount * 3);
    const steamVelY = [];
    const steamLife = [];

    for (let i = 0; i < steamCount; i++) {
        steamPos[i * 3] = -0.55 + (Math.random() - 0.5) * 0.06;
        steamPos[i * 3 + 1] = 0.75 + Math.random() * 0.3;
        steamPos[i * 3 + 2] = -3.0 + (Math.random() - 0.5) * 0.06;
        steamVelY.push(0.005 + Math.random() * 0.008);
        steamLife.push(Math.random());
    }
    steamGeo.setAttribute('position', new THREE.BufferAttribute(steamPos, 3));

    const steamMaterial = new THREE.PointsMaterial({
        color: 0xeeeeee,
        size: 0.03,
        transparent: true,
        opacity: 0.25,
        depthWrite: false
    });
    const steam = new THREE.Points(steamGeo, steamMaterial);
    scene.add(steam);

    const deskW = 1.3, deskH = 0.95, deskD = 2.2;
    const deskX = -5.0 + deskW / 2 + 0.03, deskY = deskH / 2, deskZ = 0.5;

    addBox(deskW, 0.06, deskD, deskX, deskH, deskZ, woodMat, true, true);

    addBox(deskW - 0.05, deskH - 0.06, 0.45, deskX, deskY - 0.03, deskZ - deskD / 2 + 0.225, woodMat, true, true);

    const deskLeg1 = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, deskH - 0.06, 6), woodMat);
    deskLeg1.position.set(deskX + deskW / 2 - 0.05, (deskH - 0.06) / 2, deskZ + deskD / 2 - 0.08);
    deskLeg1.castShadow = true;
    scene.add(deskLeg1);

    const deskLeg2 = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, deskH - 0.06, 6), woodMat);
    deskLeg2.position.set(deskX - deskW / 2 + 0.08, (deskH - 0.06) / 2, deskZ + deskD / 2 - 0.08);
    deskLeg2.castShadow = true;
    scene.add(deskLeg2);

    addBox(0.64, 0.05, 0.6, deskX + 0.62, 0.52, deskZ, woodMat, true, true);
    addBox(0.05, 0.58, 0.6, deskX + 0.92, 0.81, deskZ, woodMat, true, false);

    const chairLegGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.5, 6);
    [[deskX + 0.37, deskZ - 0.25], [deskX + 0.37, deskZ + 0.25], [deskX + 0.87, deskZ - 0.25], [deskX + 0.87, deskZ + 0.25]].forEach(([x, z]) => {
        const leg = new THREE.Mesh(chairLegGeo, woodMat);
        leg.position.set(x, 0.25, z);
        leg.castShadow = true;
        scene.add(leg);
    });

    const laptopGroup = new THREE.Group();
    laptopGroup.position.set(deskX, deskH + 0.03, deskZ);
    laptopGroup.rotation.y = Math.PI / 2;
    scene.add(laptopGroup);

    const lapBase = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.016, 0.36), metalMat);
    lapBase.castShadow = true;
    laptopGroup.add(lapBase);
    const screenFrameGroup = new THREE.Group();
    screenFrameGroup.position.set(0, 0.008, -0.17);
    screenFrameGroup.rotation.x = -Math.PI / 10;
    laptopGroup.add(screenFrameGroup);

    const lapScreenFrame = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.34, 0.012), metalMat);
    lapScreenFrame.position.set(0, 0.17, 0);
    lapScreenFrame.castShadow = true;
    screenFrameGroup.add(lapScreenFrame);

    const lapCanvas = document.createElement('canvas');
    lapCanvas.width = 512;
    lapCanvas.height = 340;
    const lapCtx = lapCanvas.getContext('2d');

    function drawLaptopScreen() {
        lapCtx.fillStyle = '#050c18';
        lapCtx.fillRect(0, 0, 512, 340);

        lapCtx.strokeStyle = 'rgba(0, 240, 255, 0.08)';
        lapCtx.lineWidth = 1;
        for (let i = 0; i < 512; i += 40) {
            lapCtx.beginPath();
            lapCtx.moveTo(i, 0);
            lapCtx.lineTo(i, 340);
            lapCtx.stroke();
        }
        for (let i = 0; i < 340; i += 40) {
            lapCtx.beginPath();
            lapCtx.moveTo(0, i);
            lapCtx.lineTo(512, i);
            lapCtx.stroke();
        }

        lapCtx.fillStyle = '#00f0ff';
        lapCtx.font = 'bold 38px Courier, monospace';
        lapCtx.textAlign = 'center';
        lapCtx.textBaseline = 'middle';
        lapCtx.shadowColor = '#00f0ff';
        lapCtx.shadowBlur = 18;
        lapCtx.fillText('codewithanurag', 256, 170);

        lapCtx.shadowBlur = 0;
        lapCtx.fillStyle = 'rgba(0, 240, 255, 0.65)';
        lapCtx.font = '16px Courier, monospace';
        lapCtx.fillText('system.active: true', 256, 222);
    }
    drawLaptopScreen();

    const lapScreenTex = new THREE.CanvasTexture(lapCanvas);
    const lapScreenMat = new THREE.MeshBasicMaterial({
        map: lapScreenTex,
        side: THREE.DoubleSide
    });

    const lapScreenPanel = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.32), lapScreenMat);
    lapScreenPanel.position.set(0, 0.17, 0.007);
    screenFrameGroup.add(lapScreenPanel);

    const laptopLight = new THREE.PointLight(0x00f0ff, 0.9, 4);
    laptopLight.position.set(deskX + 0.35, deskH + 0.25, deskZ);
    scene.add(laptopLight);

    const bookColors = [0x501a1a, 0x1e3a27, 0x1a2e3b, 0x483d2e];
    for (let i = 0; i < 3; i++) {
        const bMat = new THREE.MeshStandardMaterial({ color: bookColors[i], roughness: 0.8 });
        const b = addBox(0.25, 0.045, 0.32, deskX, deskH + 0.0225 + i * 0.045, deskZ + 0.55, bMat, true, true);
        b.rotation.y = (Math.random() - 0.5) * 0.15;
    }

    const shelfW = 1.6, shelfH = 2.4, shelfD = 0.36;
    const shelfX = 4.8 - shelfW / 2, shelfY = shelfH / 2, shelfZ = -2.5;

    addBox(shelfW, shelfH, 0.04, shelfX, shelfY, shelfZ - shelfD / 2, woodMat, true, true);
    addBox(0.04, shelfH, shelfD, shelfX - shelfW / 2, shelfY, shelfZ, woodMat, true, false);
    addBox(0.04, shelfH, shelfD, shelfX + shelfW / 2, shelfY, shelfZ, woodMat, true, false);
    for (let i = 0; i < 4; i++) {
        addBox(shelfW - 0.04, 0.04, shelfD, shelfX, 0.28 + i * 0.6, shelfZ, woodMat, true, true);
    }

    const bsBookColors = [0x802020, 0x205030, 0x204060, 0x504020, 0x402040];
    for (let sh = 0; sh < 4; sh++) {
        let bx = shelfX - shelfW / 2 + 0.12;
        const count = 3 + Math.floor(Math.random() * 4);
        for (let b = 0; b < count; b++) {
            const bw = 0.06 + Math.random() * 0.08;
            const bh = 0.28 + Math.random() * 0.2;
            const bMat = new THREE.MeshStandardMaterial({
                color: bsBookColors[Math.floor(Math.random() * bsBookColors.length)],
                roughness: 0.8
            });
            const book = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, shelfD - 0.08), bMat);
            book.position.set(bx + bw / 2, 0.3 + sh * 0.6 + bh / 2, shelfZ);
            book.castShadow = true;
            scene.add(book);
            bx += bw + 0.02;
        }
    }

    const rugMat = new THREE.MeshStandardMaterial({ color: 0x422d3b, roughness: 0.95, metalness: 0 });
    const rug = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 2.5), rugMat);
    rug.rotation.x = -Math.PI / 2;
    rug.position.set(0, 0.005, 0.5);
    scene.add(rug);

    const plantGroup = new THREE.Group();
    plantGroup.position.set(3.9, 2.4, -2.5);
    scene.add(plantGroup);

    const potMat = new THREE.MeshStandardMaterial({ color: 0xb56545, roughness: 0.7 });
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.08, 0.2, 10), potMat);
    pot.position.y = 0.1;
    pot.castShadow = true;
    plantGroup.add(pot);

    const soilMat = new THREE.MeshStandardMaterial({ color: 0x3d2b1f, roughness: 0.9 });
    const soil = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.02, 8), soilMat);
    soil.position.y = 0.19;
    plantGroup.add(soil);

    const vineMat = new THREE.MeshStandardMaterial({ color: 0x1d3c1f, roughness: 0.95 });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x2e5c33, roughness: 0.8, side: THREE.DoubleSide });

    const vineDirections = [
        { angle: Math.PI / 4, len: 0.6, drop: 0.5 },
        { angle: Math.PI / 1.5, len: 0.9, drop: 0.8 },
        { angle: Math.PI / 3.2, len: 0.5, drop: 0.4 },
        { angle: Math.PI / 1.1, len: 0.75, drop: 0.65 }
    ];

    vineDirections.forEach((vd) => {
        const startPt = new THREE.Vector3(0, 0.18, 0);
        const midPt = new THREE.Vector3(Math.cos(vd.angle) * 0.18, 0.1, Math.sin(vd.angle) * 0.18);
        const endPt = new THREE.Vector3(Math.cos(vd.angle) * 0.28, 0.1 - vd.drop, Math.sin(vd.angle) * 0.28);

        const vineCurve = new THREE.CatmullRomCurve3([startPt, midPt, endPt]);
        const vinePoints = vineCurve.getPoints(12);

        const vineLineGeo = new THREE.BufferGeometry().setFromPoints(vinePoints);
        const vineLine = new THREE.Line(vineLineGeo, new THREE.LineBasicMaterial({ color: 0x1a331c }));
        plantGroup.add(vineLine);

        vinePoints.forEach((pt, pIdx) => {
            if (pIdx === 0) return;
            const leafGeo = new THREE.CircleGeometry(0.045, 5);
            const leaf = new THREE.Mesh(leafGeo, leafMat);
            leaf.position.copy(pt);
            leaf.rotation.x = Math.random() * Math.PI;
            leaf.rotation.y = Math.random() * Math.PI;
            leaf.rotation.z = Math.random() * Math.PI;
            leaf.scale.set(1, 0.75, 1);
            leaf.castShadow = true;
            plantGroup.add(leaf);
        });
    });

    const clockGroup = new THREE.Group();
    clockGroup.position.set(-2.6, 3.4, -3.95);
    scene.add(clockGroup);

    const clockFrameMat = new THREE.MeshStandardMaterial({ color: 0x1c120c, roughness: 0.5 });
    const clockFrame = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.05, 24), clockFrameMat);
    clockFrame.rotation.x = Math.PI / 2;
    clockFrame.castShadow = true;
    clockGroup.add(clockFrame);

    const clockFaceMat = new THREE.MeshStandardMaterial({ color: 0xfafafa, roughness: 0.3 });
    const clockFace = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.29, 0.01, 24), clockFaceMat);
    clockFace.rotation.x = Math.PI / 2;
    clockFace.position.z = 0.026;
    clockGroup.add(clockFace);

    const hourHand = new THREE.Mesh(
        new THREE.BoxGeometry(0.018, 0.15, 0.006),
        new THREE.MeshBasicMaterial({ color: 0x111111 })
    );
    hourHand.geometry.translate(0, 0.075, 0);
    hourHand.position.z = 0.034;
    clockGroup.add(hourHand);

    const minHand = new THREE.Mesh(
        new THREE.BoxGeometry(0.012, 0.22, 0.006),
        new THREE.MeshBasicMaterial({ color: 0x222222 })
    );
    minHand.geometry.translate(0, 0.11, 0);
    minHand.position.z = 0.038;
    clockGroup.add(minHand);

    const pin = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.02, 0.01, 8),
        new THREE.MeshStandardMaterial({ color: 0xcca050, metalness: 0.8 })
    );
    pin.rotation.x = Math.PI / 2;
    pin.position.z = 0.042;
    clockGroup.add(pin);

    const shadeMat = new THREE.MeshStandardMaterial({
        color: 0xeab57a,
        roughness: 0.85,
        metalness: 0,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.82
    });

    const lampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.04, 16), lampBaseMat);
    lampBase.position.set(-0.4, 0.66, -3.15);
    lampBase.castShadow = true;
    scene.add(lampBase);

    const lampPole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.55, 8), lampBaseMat);
    lampPole.position.set(-0.4, 0.95, -3.15);
    lampPole.castShadow = true;
    scene.add(lampPole);

    const lampShade = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.28, 16, 1, true), shadeMat);
    lampShade.position.set(-0.4, 1.3, -3.15);
    lampShade.rotation.x = Math.PI;
    lampShade.castShadow = true;
    scene.add(lampShade);

    const bulbMat = new THREE.MeshStandardMaterial({ color: 0xffb355, emissive: 0x000000, emissiveIntensity: 0 });
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 10), bulbMat);
    bulb.position.set(-0.4, 1.2, -3.15);
    scene.add(bulb);

    const ropeMat = new THREE.MeshStandardMaterial({ color: 0x777777, metalness: 0.8, roughness: 0.2 });
    const ropePole = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.35, 6), ropeMat);
    ropePole.position.set(-0.32, 1.0, -3.15);
    scene.add(ropePole);

    const bead = new THREE.Mesh(new THREE.SphereGeometry(0.024, 8, 8), new THREE.MeshStandardMaterial({ color: 0xcca050, metalness: 0.9 }));
    bead.position.set(-0.32, 0.825, -3.15);
    scene.add(bead);

    const lampLight = new THREE.PointLight(0xffa54f, 0, 10);
    lampLight.position.set(-0.4, 1.2, -3.15);
    lampLight.castShadow = true;
    lampLight.shadow.mapSize.set(512, 512);
    scene.add(lampLight);

    const swGroup = new THREE.Group();
    swGroup.position.set(4.94, 1.6, 1.8);
    scene.add(swGroup);

    const swPlate = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.22, 0.14), new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.4 }));
    swPlate.castShadow = true;
    swGroup.add(swPlate);

    const swLeverMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });
    const swLever = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.05, 0.02), swLeverMat);
    swLever.position.set(0.015, 0, 0);
    swLever.rotation.z = Math.PI / 6;
    swGroup.add(swLever);

    const ceilingLight = new THREE.PointLight(0xfff3e0, 1.6, 16);
    ceilingLight.position.set(0, RH - 0.4, 0);
    ceilingLight.castShadow = true;
    ceilingLight.shadow.mapSize.set(512, 512);
    scene.add(ceilingLight);

    const fixture = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.08, 12), metalMat);
    fixture.position.set(0, RH - 0.04, 0);
    scene.add(fixture);

    const ceilBulbMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x000000, emissiveIntensity: 0 });
    const ceilBulb = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 12), ceilBulbMat);
    ceilBulb.position.set(0, RH - 0.1, 0);
    scene.add(ceilBulb);

    const defaultAmbientColor = new THREE.Color(0x3a4b6e);
    const litAmbientColor = new THREE.Color(0x5a554a);
    const ambientLight = new THREE.AmbientLight(defaultAmbientColor, 0.45);
    scene.add(ambientLight);

    const windowLight = new THREE.DirectionalLight(0x4466aa, 0.55);
    windowLight.position.set(winCX, winCY + 3, -RD / 2 - 2);
    scene.add(windowLight);

    const thunderLight = new THREE.PointLight(0xaabbff, 0, 30);
    thunderLight.position.set(winCX, 8, -RD / 2 - 6);
    scene.add(thunderLight);

    let thunderTimer = 5 + Math.random() * 8;
    let thunderFlashing = false;
    let thunderFlashTime = 0;

    function triggerThunder() {
        thunderFlashing = true;
        thunderFlashTime = 0;
        thunderTimer = 8 + Math.random() * 15;
    }

    function updateThunder(dt) {
        thunderTimer -= dt;
        if (thunderTimer <= 0 && !thunderFlashing) {
            triggerThunder();
        }

        if (thunderFlashing) {
            thunderFlashTime += dt;

            if (thunderFlashTime < 0.08) {
                thunderLight.intensity = 8;
            } else if (thunderFlashTime < 0.15) {
                thunderLight.intensity = 0;
            } else if (thunderFlashTime < 0.22) {
                thunderLight.intensity = 12;
            } else if (thunderFlashTime < 0.35) {
                thunderLight.intensity = Math.max(0, 12 - (thunderFlashTime - 0.22) * 80);
            } else {
                thunderLight.intensity = 0;
                thunderFlashing = false;
            }
        }
    }

    let cinematicMode = false;
    let cinematicTime = 0;

    const keyframes = [
        { t: 0, px: 0.5, py: 1.7, pz: 3.5, yaw: 0, pitch: -0.03, action: null },
        { t: 3, px: 0.8, py: 1.7, pz: 1.0, yaw: 0.05, pitch: 0.0, action: null },
        { t: 6, px: 1.4, py: 1.7, pz: -1.5, yaw: 0.05, pitch: 0.12, action: null },
        { t: 9, px: 0.0, py: 1.7, pz: -1.0, yaw: -0.35, pitch: -0.08, action: 'lampOn' },
        { t: 12, px: -2.0, py: 1.7, pz: 1.5, yaw: -1.4, pitch: -0.12, action: null },
        { t: 15, px: 1.0, py: 1.7, pz: -0.5, yaw: 0.05, pitch: 0.08, action: 'windowOpen' },
        { t: 19, px: 0.5, py: 1.7, pz: 3.5, yaw: 0, pitch: -0.03, action: null },
    ];

    function getCinematicState(time) {

        let kfA = keyframes[0];
        let kfB = keyframes[keyframes.length - 1];

        for (let i = 0; i < keyframes.length - 1; i++) {
            if (time >= keyframes[i].t && time < keyframes[i + 1].t) {
                kfA = keyframes[i];
                kfB = keyframes[i + 1];
                break;
            }
        }

        const segDuration = kfB.t - kfA.t;
        const localT = segDuration > 0 ? (time - kfA.t) / segDuration : 0;

        const ease = localT < 0.5
            ? 4 * localT * localT * localT
            : 1 - Math.pow(-2 * localT + 2, 3) / 2;

        return {
            px: kfA.px + (kfB.px - kfA.px) * ease,
            py: kfA.py + (kfB.py - kfA.py) * ease,
            pz: kfA.pz + (kfB.pz - kfA.pz) * ease,
            yaw: kfA.yaw + (kfB.yaw - kfA.yaw) * ease,
            pitch: kfA.pitch + (kfB.pitch - kfA.pitch) * ease,
            action: kfB.action
        };
    }

    let firedActions = new Set();

    function updateCinematic(dt) {
        if (!cinematicMode) return;

        cinematicTime += dt;
        const totalDuration = keyframes[keyframes.length - 1].t;

        if (cinematicTime >= totalDuration) {

            cinematicTime = 0;
            firedActions.clear();
            isLampOn = false;
            targetLampIntensity = 0;
            isWindowOpen = false;
            targetWindowAngle = 0;
        }

        const state = getCinematicState(cinematicTime);

        camera.position.set(state.px, state.py, state.pz);
        targetYaw = state.yaw;
        targetPitch = state.pitch;
        yaw = state.yaw;
        pitch = state.pitch;

        if (state.action && !firedActions.has(state.action)) {
            firedActions.add(state.action);
            if (state.action === 'lampOn' && !isLampOn) {
                isLampOn = true;
                targetLampIntensity = 2.8;
            }
            if (state.action === 'windowOpen' && !isWindowOpen) {
                isWindowOpen = true;
                targetWindowAngle = Math.PI / 2.8;
            }
        }
    }

    const rainAudio = new Audio('https://actions.google.com/sounds/v1/weather/rain_heavy_loud.ogg');
    rainAudio.loop = true;
    rainAudio.volume = 0.5;
    let audioStarted = false;

    function startAudio() {
        if (!audioStarted) {
            rainAudio.play().catch(err => console.log("Audio autoplay blocked, waiting for interaction"));
            audioStarted = true;
        }
    }

    canvas.addEventListener('pointerdown', startAudio);

    let isWindowOpen = false;
    let targetWindowAngle = 0;
    let currentWindowAngle = 0;

    let isLampOn = false;
    let targetLampIntensity = 0;
    let currentLampIntensity = 0;

    let isCeilingLit = true;
    let targetCeilingIntensity = 1.6;
    let currentCeilingIntensity = 1.6;

    const ropeTargets = [ropePole, bead];
    const lampTargets = [lampBase, lampPole, lampShade, bulb, ...ropeTargets];
    const winTargets = [paneL, paneR];
    const switchTargets = [swPlate, swLever];

    function checkInteractivity() {
        const cp = camera.position;
        const distToWindow = Math.hypot(cp.x - winCX, cp.z - winZ);
        const distToLamp = Math.hypot(cp.x - (-0.4), cp.z - (-3.15));
        const distToSwitch = Math.hypot(cp.x - 4.94, cp.z - 1.8);

        let activeTarget = null;
        let actionText = '';

        if (distToWindow < 2.0) {
            activeTarget = 'window';
            actionText = isWindowOpen ? 'Close Window 🪟' : 'Open Window 🪟';
        } else if (distToLamp < 2.0) {
            activeTarget = 'lamp';
            actionText = isLampOn ? 'Release Lamp Rope 💡' : 'Pull Lamp Rope 💡';
        } else if (distToSwitch < 2.2) {
            activeTarget = 'switch';
            actionText = isCeilingLit ? 'Turn Off Main Light 🔌' : 'Turn On Main Light 🔌';
        }

        if (activeTarget) {
            actionBtn.textContent = actionText;
            actionBtn.classList.add('visible');
            actionBtn.dataset.target = activeTarget;
        } else {
            actionBtn.classList.remove('visible');
            actionBtn.dataset.target = '';
        }
    }

    actionBtn.addEventListener('click', () => {
        const target = actionBtn.dataset.target;
        if (target === 'window') {
            isWindowOpen = !isWindowOpen;
            targetWindowAngle = isWindowOpen ? Math.PI / 2.8 : 0;
        } else if (target === 'lamp') {
            isLampOn = !isLampOn;
            targetLampIntensity = isLampOn ? 2.8 : 0;

            ropePole.position.y -= 0.05;
            bead.position.y -= 0.05;
            setTimeout(() => {
                ropePole.position.y += 0.05;
                bead.position.y += 0.05;
            }, 150);
        } else if (target === 'switch') {
            isCeilingLit = !isCeilingLit;
            targetCeilingIntensity = isCeilingLit ? 1.6 : 0;
            swLever.rotation.z = isCeilingLit ? Math.PI / 6 : -Math.PI / 6;
        }
        checkInteractivity();
    });

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    canvas.addEventListener('pointerdown', (e) => {
        const startX = e.clientX;
        const startY = e.clientY;

        const onPointerUpRaycast = (upEvent) => {
            const dragDistance = Math.hypot(upEvent.clientX - startX, upEvent.clientY - startY);
            if (dragDistance < 8) {
                mouse.x = (upEvent.clientX / window.innerWidth) * 2 - 1;
                mouse.y = -(upEvent.clientY / window.innerHeight) * 2 + 1;
                raycaster.setFromCamera(mouse, camera);

                if (raycaster.intersectObjects(lampTargets).length > 0) {
                    isLampOn = !isLampOn;
                    targetLampIntensity = isLampOn ? 2.8 : 0;
                    ropePole.position.y -= 0.05;
                    bead.position.y -= 0.05;
                    setTimeout(() => {
                        ropePole.position.y += 0.05;
                        bead.position.y += 0.05;
                    }, 150);
                    checkInteractivity();
                } else if (raycaster.intersectObjects(winTargets).length > 0) {
                    isWindowOpen = !isWindowOpen;
                    targetWindowAngle = isWindowOpen ? Math.PI / 2.8 : 0;
                    checkInteractivity();
                } else if (raycaster.intersectObjects(switchTargets).length > 0) {
                    isCeilingLit = !isCeilingLit;
                    targetCeilingIntensity = isCeilingLit ? 1.6 : 0;
                    swLever.rotation.z = isCeilingLit ? Math.PI / 6 : -Math.PI / 6;
                    checkInteractivity();
                }
            }
            window.removeEventListener('pointerup', onPointerUpRaycast);
        };
        window.addEventListener('pointerup', onPointerUpRaycast);
    });

    const clock = new THREE.Clock();

    function animate() {
        requestAnimationFrame(animate);
        const dt = clock.getDelta();

        updateMovement(dt);
        checkInteractivity();

        yaw += (targetYaw - yaw) * 0.12;
        pitch += (targetPitch - pitch) * 0.12;
        camera.rotation.set(0, 0, 0);
        camera.rotation.y = yaw;
        camera.rotation.x = pitch;

        currentLampIntensity += (targetLampIntensity - currentLampIntensity) * dt * 4;
        lampLight.intensity = currentLampIntensity;
        bulbMat.emissive.setHex(isLampOn ? 0xffb355 : 0x000000);
        bulbMat.emissiveIntensity = currentLampIntensity * 0.65;
        shadeMat.emissive = new THREE.Color(isLampOn ? 0x664422 : 0x000000);
        shadeMat.emissiveIntensity = currentLampIntensity * 0.25;

        currentCeilingIntensity += (targetCeilingIntensity - currentCeilingIntensity) * dt * 4;
        ceilingLight.intensity = currentCeilingIntensity;
        ceilBulbMat.emissive = new THREE.Color(isCeilingLit ? 0xffffff : 0x000000);
        ceilBulbMat.emissiveIntensity = currentCeilingIntensity * 0.7;

        ambientLight.color.lerpColors(
            defaultAmbientColor,
            litAmbientColor,
            currentCeilingIntensity / 1.6
        );

        currentWindowAngle += (targetWindowAngle - currentWindowAngle) * dt * 3.5;
        winPivotL.rotation.y = currentWindowAngle;
        winPivotR.rotation.y = -currentWindowAngle;

        const pos = rain.geometry.attributes.position.array;
        for (let i = 0; i < rainCount; i++) {
            pos[i * 3 + 1] -= rainVel[i];
            if (pos[i * 3 + 1] < 0) {
                pos[i * 3 + 1] = 10 + Math.random() * 2;
                pos[i * 3] = winCX + (Math.random() - 0.5) * 16;
            }
        }
        rain.geometry.attributes.position.needsUpdate = true;

        renderer.render(scene, camera);

        updateThunder(dt);

        const sp = steam.geometry.attributes.position.array;
        for (let i = 0; i < steamCount; i++) {
            sp[i * 3 + 1] += steamVelY[i];
            steamLife[i] += dt * 0.8;

            sp[i * 3] += (Math.random() - 0.5) * 0.001;
            sp[i * 3 + 2] += (Math.random() - 0.5) * 0.001;

            if (steamLife[i] > 1 || sp[i * 3 + 1] > 1.1) {
                sp[i * 3] = -0.55 + (Math.random() - 0.5) * 0.06;
                sp[i * 3 + 1] = 0.75;
                sp[i * 3 + 2] = -3.0 + (Math.random() - 0.5) * 0.06;
                steamLife[i] = 0;
            }
        }
        steam.geometry.attributes.position.needsUpdate = true;

        if (phoneScreenMat) {
            const time = clock.getElapsedTime();

            const cycle = time % 4;
            let intensity = 0.15;
            if (cycle > 2.0 && cycle < 2.2) intensity = 1.0;
            if (cycle > 2.35 && cycle < 2.55) intensity = 1.0;
            phoneScreenMat.emissiveIntensity = intensity;
        }

        if (hourHand && minHand) {
            const now = new Date();
            const h = now.getHours() % 12;
            const m = now.getMinutes();
            const s = now.getSeconds();
            hourHand.rotation.z = -((h + m / 60) * (Math.PI / 6));
            minHand.rotation.z = -((m + s / 60) * (Math.PI / 30));
        }
    }
    animate();

    function handleResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        renderer.setSize(width, height);

        camera.aspect = width / height;

        if (camera.aspect < 1) {

            camera.fov = 68;
        } else {

            camera.fov = 52;
        }

        camera.updateProjectionMatrix();
    }

    window.addEventListener('resize', handleResize);
    handleResize();
});
