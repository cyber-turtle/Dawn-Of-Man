// --- 1. SETUP THREE.JS SCENE ---
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
// Deeper fog for the void
scene.fog = new THREE.FogExp2(0x000000, 0.015);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputEncoding = THREE.sRGBEncoding;
// ENABLE SHADOWS FOR REALISM
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
container.appendChild(renderer.domElement);

// --- 2. ASSETS & PROCEDURAL GENERATION ---
const textureLoader = new THREE.TextureLoader();
// Update path to local image
const adamTextureUrl = '/img/adam.jpg';

const simplex = new SimplexNoise();

// --- GENERATE REALISTIC ROCK TEXTURE ---
function createRockTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 2048; // Increased for high res
    canvas.height = 2048;
    const ctx = canvas.getContext('2d');
    
    // Fill Background
    ctx.fillStyle = '#6d4c41';
    ctx.fillRect(0, 0, 2048, 2048);
    
    // Noise Layers
    for(let i = 0; i < 100000; i++) {
        const x = Math.random() * 2048;
        const y = Math.random() * 2048;
        const w = Math.random() * 4;
        const h = Math.random() * 4;
        const alpha = Math.random() * 0.2;
        ctx.fillStyle = `rgba(0,0,0,${alpha})`;
        ctx.fillRect(x, y, w, h);
    }
    
    // Add lighter spots (Highlight)
    for(let i = 0; i < 40000; i++) {
        const x = Math.random() * 2048;
        const y = Math.random() * 2048;
        const r = Math.random() * 3;
        ctx.fillStyle = `rgba(200,150,120, 0.1)`;
        ctx.beginPath();
        ctx.arc(x,y,r,0,Math.PI*2);
        ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
}

// --- GENERATE CELESTIAL ENERGY TEXTURE (NEW) ---
function createCelestialTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 2048; // High res
    canvas.height = 2048;
    const ctx = canvas.getContext('2d');
    
    // 1. Dark Void Base
    ctx.fillStyle = '#1a0500'; // Very dark reddish-brown base
    ctx.fillRect(0, 0, 2048, 2048);
    
    // Enable additive blending for glowing effect
    ctx.globalCompositeOperation = 'lighter';

    // 2. Create "Nebula" clouds (Large, diffuse)
    for(let i = 0; i < 300; i++) {
        const x = Math.random() * 2048;
        const y = Math.random() * 2048;
        const r = Math.random() * 400 + 100;
        
        const grd = ctx.createRadialGradient(x, y, 0, x, y, r);
        // Golden/Orange Hues
        grd.addColorStop(0, 'rgba(255, 160, 50, 0.05)'); 
        grd.addColorStop(0.5, 'rgba(200, 100, 0, 0.02)');
        grd.addColorStop(1, 'rgba(0,0,0,0)');
        
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI*2);
        ctx.fill();
    }

    // 3. Bright Plasma Cores (Smaller, brighter)
    for(let i = 0; i < 150; i++) {
        const x = Math.random() * 2048;
        const y = Math.random() * 2048;
        const r = Math.random() * 100 + 50;
        
        const grd = ctx.createRadialGradient(x, y, 0, x, y, r);
        grd.addColorStop(0, 'rgba(255, 255, 200, 0.15)'); // White/Yellow hot center
        grd.addColorStop(1, 'rgba(0,0,0,0)');
        
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI*2);
        ctx.fill();
    }

    // 4. Filament Strands (Reset blend mode for sharp lines)
    ctx.globalCompositeOperation = 'source-over'; 
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.3)'; // Gold lines
    ctx.lineWidth = 2;
    
    // Draw Sine/Noise waves
    for(let i=0; i<40; i++) {
        ctx.beginPath();
        let x = Math.random() * 2048;
        ctx.moveTo(x, 0);
        
        for(let y=0; y<2048; y+=50) {
            x += (Math.random() - 0.5) * 100; // Random walk
            ctx.lineTo(x, y);
        }
        ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
}

const rockTexture = createRockTexture();
const energyTexture = createCelestialTexture(); // USE NEW TEXTURE

// Groups
const worldGroup = new THREE.Group();
scene.add(worldGroup);

// --- 3. CREATE OBJECTS ---

let particlesSystem;
let earthMesh; // High res clay
let godGroup;  // Group of light strands
let paintingMeshReference; // Global reference for GSAP

// Painting Group
const paintingGroup = new THREE.Group();
paintingGroup.position.set(0, 0, -60); 
paintingGroup.rotation.y = Math.PI; 
paintingGroup.visible = true; // KEEP TRUE, use opacity
worldGroup.add(paintingGroup);

// A. STARFIELD / VOID
function createParticles() {
    const geometry = new THREE.BufferGeometry();
    const count = 3000;
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    for(let i = 0; i < count * 3; i+=3) {
        positions[i] = (Math.random() - 0.5) * 150; 
        positions[i+1] = (Math.random() - 0.5) * 150; 
        positions[i+2] = (Math.random() - 0.5) * 100; 
        sizes[i/3] = Math.random();
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
        size: 0.15,
        color: 0xffffff,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending
    });

    particlesSystem = new THREE.Points(geometry, material);
    worldGroup.add(particlesSystem);
}

// B. REALISTIC CLAY (ADAMA)
function createClayEarth() {
    // HIGH POLY SPHERE for smooth close-ups
    const geometry = new THREE.IcosahedronGeometry(5, 70); // Significantly increased subdivision
    
    // Perturb vertices to look like a lump of clay
    const positionAttribute = geometry.attributes.position;
    const vertex = new THREE.Vector3();
    
    for ( let i = 0; i < positionAttribute.count; i ++ ) {
        vertex.fromBufferAttribute( positionAttribute, i );
        // Noise based displacement
        const noise = simplex.noise3D(vertex.x * 0.1, vertex.y * 0.1, vertex.z * 0.1);
        const distortion = 1 + noise * 0.4;
        vertex.multiplyScalar(distortion);
        positionAttribute.setXYZ( i, vertex.x, vertex.y, vertex.z );
    }
    
    geometry.computeVertexNormals();

    // Material: REALISTIC ROCK/CLAY
    const material = new THREE.MeshPhysicalMaterial({
        map: rockTexture,
        bumpMap: rockTexture,
        bumpScale: 0.15,
        roughnessMap: rockTexture,
        roughness: 0.9,
        metalness: 0.1,
        clearcoat: 0.05, // Slight sheen of raw clay
        clearcoatRoughness: 0.4,
        color: 0x8B4513
    });

    earthMesh = new THREE.Mesh(geometry, material);
    earthMesh.position.set(-15, -5, -20);
    earthMesh.castShadow = true;
    earthMesh.receiveShadow = true;
    worldGroup.add(earthMesh);
}

// C. INTERTWINED LIGHT (DIVINUS) WITH ENERGY TEXTURE
function createDivineLight() {
    godGroup = new THREE.Group();
    godGroup.position.set(15, 5, -30);
    
    const strandCount = 12; // More strands
    for(let i=0; i<strandCount; i++) {
        const p = 2 + Math.floor(Math.random() * 2); 
        const q = 3 + Math.floor(Math.random() * 2);
        const radius = 3 + Math.random();
        const tube = 0.08 + Math.random() * 0.1;
        
        // Smoother tubes
        const geo = new THREE.TorusKnotGeometry(radius, tube, 300, 32, p, q);
        
        // Using Standard Material with Emissive for better lighting interaction
        const mat = new THREE.MeshStandardMaterial({
            map: energyTexture,
            emissive: 0xFF8C00, // Orange-Gold Glow
            emissiveMap: energyTexture,
            emissiveIntensity: 1.2, // Slightly reduced to show texture detail
            color: 0xFFD700,
            transparent: true,
            opacity: 0.9,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide
        });

        const mesh = new THREE.Mesh(geo, mat);
        mesh.rotation.set(Math.random()*Math.PI, Math.random()*Math.PI, Math.random()*Math.PI);
        godGroup.add(mesh);
    }

    // Central Core Glow
    const coreGeo = new THREE.SphereGeometry(1.5, 64, 64);
    const coreMat = new THREE.MeshBasicMaterial({ color: 0xffffee });
    const core = new THREE.Mesh(coreGeo, coreMat);
    godGroup.add(core);

    // Light Emitter attached to God
    const godLight = new THREE.PointLight(0xffaa00, 3, 40);
    godLight.castShadow = true;
    godGroup.add(godLight);

    worldGroup.add(godGroup);
}

// D. PAINTING
function createPainting() {
    textureLoader.load(adamTextureUrl, (texture) => {
        texture.encoding = THREE.sRGBEncoding;
        texture.anisotropy = renderer.capabilities.getMaxAnisotropy(); // Sharp textures at angles
        
        const geometry = new THREE.PlaneGeometry(40, 20, 32, 32);
        
        const material = new THREE.MeshStandardMaterial({
            map: texture,
            side: THREE.DoubleSide,
            roughness: 0.6,
            metalness: 0.1,
            emissive: 0xffffff, // Emit white light
            emissiveMap: texture, // Use the painting itself as the light source map
            emissiveIntensity: 0.8, // Brightness multiplier
            transparent: true, // IMPORTANT: Allows fading
            opacity: 0 // Start invisible (but rendered)
        });

        const paintingMesh = new THREE.Mesh(geometry, material);
        paintingMesh.receiveShadow = true;
        paintingMeshReference = paintingMesh;
        paintingGroup.add(paintingMesh);
        
        // Remove loading screen
        gsap.to('#loader', { opacity: 0, duration: 1, onComplete: () => {
            const loader = document.getElementById('loader');
            if (loader) loader.remove();
        }});
    });
}

// E. LIGHTING
function createLights() {
    const ambientLight = new THREE.AmbientLight(0x050505); // Very dark ambient for contrast
    scene.add(ambientLight);

    // Main Key Light
    const spotLight = new THREE.SpotLight(0xffffff, 2);
    spotLight.position.set(20, 30, 20);
    spotLight.angle = 0.4;
    spotLight.penumbra = 0.5;
    spotLight.castShadow = true;
    spotLight.shadow.mapSize.width = 2048;
    spotLight.shadow.mapSize.height = 2048;
    scene.add(spotLight);

    // Rim light for clay (Blue/Cold to contrast Warmth)
    const blueLight = new THREE.PointLight(0x4444ff, 1, 50);
    blueLight.position.set(-20, 10, -10);
    scene.add(blueLight);
    
    return spotLight;
}

createParticles();
createClayEarth();
createDivineLight();
createPainting();
const mainLight = createLights();

// --- 4. ANIMATION LOOP ---
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const time = clock.getElapsedTime();

    // Stars
    if(particlesSystem) particlesSystem.rotation.y = time * 0.02;

    // Earth: Slow, heavy rotation
    if(earthMesh) {
        earthMesh.rotation.y = time * 0.05;
        earthMesh.rotation.x = Math.sin(time * 0.2) * 0.1;
    }

    // God: Fast, chaotic energy
    if(godGroup) {
        godGroup.rotation.y = -time * 0.2;
        godGroup.rotation.z = time * 0.1;
        // Animate texture offset for flowing energy
        godGroup.children.forEach((child) => {
            if(child.material && child.material.map) {
                child.material.map.offset.x = time * 0.5; // Flowing texture
                child.material.emissiveMap.offset.x = time * 0.5;
            }
            if(child.type === 'Mesh') {
                child.scale.setScalar(1 + Math.sin(time * 2) * 0.03);
            }
        });
    }

    renderer.render(scene, camera);
}
animate();

// --- 5. GSAP SCROLLTRIGGER ---
gsap.registerPlugin(ScrollTrigger);

camera.position.set(0, 0, 12);

// Setup Sections Timeline
const tl = gsap.timeline({
    scrollTrigger: {
        trigger: "body",
        start: "top top",
        end: "bottom bottom",
        scrub: 1.2,
    }
});

// 1->2: Into the Void
tl.to(camera.position, { z: 2, y: -2, duration: 2 })
  .to(particlesSystem.material, { size: 0.05, opacity: 0.3, duration: 2 }, "<");

// 2->3: To Clay (Left)
tl.to(camera.position, { x: -10, y: -3, z: -8, duration: 3 })
  .to(camera.rotation, { y: -0.8, duration: 3 }, "<")
  .to(earthMesh.position, { x: -8, z: -15, duration: 3 }, "<");

// 3->4: Clay Detail (Dormancy) - Zoom in on texture
tl.to(camera.position, { x: -9, y: -4, z: -11, duration: 2 })
  .to(earthMesh.rotation, { z: 1, duration: 2 }, "<");

// 4->5: To Light (Right) - Big pan
tl.to(camera.position, { x: 10, y: 4, z: -15, duration: 4 })
  .to(camera.rotation, { y: 0.6, x: 0.2, duration: 4 }, "<")
  .to(godGroup.position, { x: 8, z: -25, duration: 4 }, "<");

// 5->6: Light Detail (Cortex) - Orbit slightly
tl.to(camera.position, { x: 12, y: 6, z: -20, duration: 2 })
  .to(godGroup.rotation, { x: 1, duration: 2 }, "<");

// 6->7: Sophia (Under arm view)
tl.to(camera.position, { x: 6, y: 2, z: -22, duration: 2 });

// 7->8: The Gap (Center alignment)
tl.to(camera.position, { x: 0, y: 0, z: -5, duration: 3 })
  .to(camera.rotation, { x: 0, y: 0, z: 0, duration: 3 }, "<")
  .to(earthMesh.position, { x: -6, y: -2, z: -20, duration: 3 }, "<")
  .to(godGroup.position, { x: 6, y: 2, z: -20, duration: 3 }, "<");

// 8->9: Reflection (Hovering in center)
tl.to(camera.position, { z: -8, duration: 2 });

// 9->10: The Spark (Intense Close up)
tl.to(camera.position, { z: -15, duration: 2 })
  .to(mainLight, { intensity: 5, duration: 1 }, "<");

// 10->11: Reveal Painting
// CRITICAL FIX: The Reveal sequence is now staggered.
// 1. Fade opacity IN first (while old meshes fade out)
tl.addLabel("reveal_fade")
  .to([earthMesh.position, godGroup.position], { x: (i) => i === 0 ? -40 : 40, duration: 1.5, opacity: 0 }, "reveal_fade")
  .to({}, { 
      duration: 1.5, 
      onUpdate: function() {
          if(paintingMeshReference) {
              paintingMeshReference.material.opacity = this.progress();
          }
      }
  }, "reveal_fade");
  
// 2. THEN zoom and flip camera/painting
tl.addLabel("reveal_move")
  .to(camera.position, { z: -40, duration: 2 }, "reveal_move")
  .to(paintingGroup.position, { z: -45, duration: 2 }, "reveal_move")
  .to(paintingGroup.rotation, { y: 0, duration: 2 }, "reveal_move");

// 11->12: Footer fade out
tl.to("body", { backgroundColor: "#000", duration: 1 });


// --- 6. RESIZE HANDLER ---
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- 7. DYNAMIC DOTS & NAVIGATION ---
const sections = document.querySelectorAll('section');
const dotsContainer = document.getElementById('nav-dots');

if (dotsContainer) {
    sections.forEach((section, i) => {
        const dot = document.createElement('div');
        dot.className = i === 0 ? 'dot active' : 'dot';
        
        // ADDED CLICK EVENT FOR TIMELINE
        dot.addEventListener('click', () => {
            const targetTop = section.offsetTop;
            window.scrollTo({
                top: targetTop,
                behavior: 'smooth'
            });
        });

        dotsContainer.appendChild(dot);
    });
}

const dots = document.querySelectorAll('.dot');

window.addEventListener('scroll', () => {
    let current = '';
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        if (window.scrollY >= sectionTop - window.innerHeight/2) {
            current = section.getAttribute('id');
        }
    });

    sections.forEach((section, index) => {
        if(section.getAttribute('id') === current) {
            dots.forEach(d => d.classList.remove('active'));
            if(dots[index]) dots[index].classList.add('active');
        }
    });
});
