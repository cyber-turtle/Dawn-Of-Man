'use client';

import { useEffect, useRef, useState } from 'react';

export default function Home() {
  const [isNarrow, setIsNarrow] = useState(false);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const loaderRef = useRef<HTMLDivElement>(null);
  const navDotsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkWidth = () => {
      const width = window.innerWidth;
      const isMobile = width < 800;
      setIsNarrow(isMobile);
      return width;
    };

    let lastWidth = checkWidth();

    const interval = setInterval(() => {
      const currentWidth = window.innerWidth;
      if (Math.abs(currentWidth - lastWidth) > 50) {
        window.location.reload();
      }
    }, 1000);

    window.addEventListener('resize', checkWidth);
    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', checkWidth);
    };
  }, []);

  useEffect(() => {
    const loadScript = (src: string) => {
      return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    };

    const loadScripts = async () => {
      try {
        await loadScript('/js/three.min.js');
        await loadScript('/js/simplex-noise.min.js');
        await loadScript('/js/gsap.min.js');
        await loadScript('/js/ScrollTrigger.min.js');
        
        initializeScene();
      } catch (error) {
        console.error('Failed to load scripts:', error);
      }
    };

    loadScripts();
  }, []);

  const initializeScene = () => {
    // @ts-ignore
    const { THREE, SimplexNoise, gsap, ScrollTrigger } = window;
    
    if (!THREE || !SimplexNoise || !gsap || !ScrollTrigger) return;

    const container = canvasContainerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000000, 0.015);

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    const textureLoader = new THREE.TextureLoader();
    const adamTextureUrl = '/img/adam.jpg';
    
    const simplex = new SimplexNoise();

    function createRockTexture() {
      const canvas = document.createElement('canvas');
      canvas.width = 2048;
      canvas.height = 2048;
      const ctx = canvas.getContext('2d')!;
      
      ctx.fillStyle = '#6d4c41';
      ctx.fillRect(0, 0, 2048, 2048);
      
      for(let i = 0; i < 100000; i++) {
        const x = Math.random() * 2048;
        const y = Math.random() * 2048;
        const w = Math.random() * 4;
        const h = Math.random() * 4;
        const alpha = Math.random() * 0.2;
        ctx.fillStyle = `rgba(0,0,0,${alpha})`;
        ctx.fillRect(x, y, w, h);
      }
      
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
    
    function createCelestialTexture() {
      const canvas = document.createElement('canvas');
      canvas.width = 2048;
      canvas.height = 2048;
      const ctx = canvas.getContext('2d')!;
      
      ctx.fillStyle = '#1a0500';
      ctx.fillRect(0, 0, 2048, 2048);
      
      ctx.globalCompositeOperation = 'lighter';

      for(let i = 0; i < 300; i++) {
        const x = Math.random() * 2048;
        const y = Math.random() * 2048;
        const r = Math.random() * 400 + 100;
        
        const grd = ctx.createRadialGradient(x, y, 0, x, y, r);
        grd.addColorStop(0, 'rgba(255, 160, 50, 0.05)'); 
        grd.addColorStop(0.5, 'rgba(200, 100, 0, 0.02)');
        grd.addColorStop(1, 'rgba(0,0,0,0)');
        
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI*2);
        ctx.fill();
      }

      for(let i = 0; i < 150; i++) {
        const x = Math.random() * 2048;
        const y = Math.random() * 2048;
        const r = Math.random() * 100 + 50;
        
        const grd = ctx.createRadialGradient(x, y, 0, x, y, r);
        grd.addColorStop(0, 'rgba(255, 255, 200, 0.15)');
        grd.addColorStop(1, 'rgba(0,0,0,0)');
        
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI*2);
        ctx.fill();
      }

      ctx.globalCompositeOperation = 'source-over'; 
      ctx.strokeStyle = 'rgba(255, 215, 0, 0.3)';
      ctx.lineWidth = 2;
      
      for(let i=0; i<40; i++) {
        ctx.beginPath();
        let x = Math.random() * 2048;
        ctx.moveTo(x, 0);
        
        for(let y=0; y<2048; y+=50) {
          x += (Math.random() - 0.5) * 100;
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
    const energyTexture = createCelestialTexture();

    const worldGroup = new THREE.Group();
    scene.add(worldGroup);

    let particlesSystem: any;
    let earthMesh: any;
    let godGroup: any;
    let paintingMeshReference: any;
    
    const paintingGroup = new THREE.Group();
    paintingGroup.position.set(0, 0, -60); 
    paintingGroup.rotation.y = Math.PI; 
    paintingGroup.visible = true;
    worldGroup.add(paintingGroup);

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

    function createClayEarth() {
      const geometry = new THREE.IcosahedronGeometry(5, 70);
      
      const positionAttribute = geometry.attributes.position;
      const vertex = new THREE.Vector3();
      
      for ( let i = 0; i < positionAttribute.count; i ++ ) {
        vertex.fromBufferAttribute( positionAttribute, i );
        const noise = simplex.noise3D(vertex.x * 0.1, vertex.y * 0.1, vertex.z * 0.1);
        const distortion = 1 + noise * 0.4;
        vertex.multiplyScalar(distortion);
        positionAttribute.setXYZ( i, vertex.x, vertex.y, vertex.z );
      }
      
      geometry.computeVertexNormals();

      const material = new THREE.MeshPhysicalMaterial({
        map: rockTexture,
        bumpMap: rockTexture,
        bumpScale: 0.15,
        roughnessMap: rockTexture,
        roughness: 0.9,
        metalness: 0.1,
        clearcoat: 0.05,
        clearcoatRoughness: 0.4,
        color: 0x8B4513
      });

      earthMesh = new THREE.Mesh(geometry, material);
      earthMesh.position.set(-15, -5, -20);
      earthMesh.castShadow = true;
      earthMesh.receiveShadow = true;
      worldGroup.add(earthMesh);
    }

    function createDivineLight() {
      godGroup = new THREE.Group();
      godGroup.position.set(15, 5, -30);
      
      const strandCount = 12;
      for(let i=0; i<strandCount; i++) {
        const p = 2 + Math.floor(Math.random() * 2); 
        const q = 3 + Math.floor(Math.random() * 2);
        const radius = 3 + Math.random();
        const tube = 0.08 + Math.random() * 0.1;
        
        const geo = new THREE.TorusKnotGeometry(radius, tube, 300, 32, p, q);
        
        const mat = new THREE.MeshStandardMaterial({
          map: energyTexture,
          emissive: 0xFF8C00,
          emissiveMap: energyTexture,
          emissiveIntensity: 1.2,
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

      const coreGeo = new THREE.SphereGeometry(1.5, 64, 64);
      const coreMat = new THREE.MeshBasicMaterial({ color: 0xffffee });
      const core = new THREE.Mesh(coreGeo, coreMat);
      godGroup.add(core);

      const godLight = new THREE.PointLight(0xffaa00, 3, 40);
      godLight.castShadow = true;
      godGroup.add(godLight);

      worldGroup.add(godGroup);
    }

    function createPainting() {
      textureLoader.load(adamTextureUrl, (texture: any) => {
        texture.encoding = THREE.sRGBEncoding;
        texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
        
        const geometry = new THREE.PlaneGeometry(40, 20, 32, 32);
        
        const material = new THREE.MeshStandardMaterial({
          map: texture,
          side: THREE.DoubleSide,
          roughness: 0.6,
          metalness: 0.1,
          emissive: 0xffffff,
          emissiveMap: texture,
          emissiveIntensity: 0.8,
          transparent: true,
          opacity: 0
        });

        const paintingMesh = new THREE.Mesh(geometry, material);
        paintingMesh.receiveShadow = true;
        paintingMeshReference = paintingMesh;
        paintingGroup.add(paintingMesh);
        
        if (loaderRef.current) {
          gsap.to(loaderRef.current, { 
            opacity: 0, 
            duration: 1.5,
            ease: "power2.inOut",
            onStart: () => {
              if (loaderRef.current) {
                loaderRef.current.style.pointerEvents = 'none';
              }
            },
            onComplete: () => {
              if (loaderRef.current) {
                loaderRef.current.style.display = 'none';
              }
            }
          });
        }
      });
    }

    function createLights() {
      const ambientLight = new THREE.AmbientLight(0x050505);
      scene.add(ambientLight);

      const spotLight = new THREE.SpotLight(0xffffff, 2);
      spotLight.position.set(20, 30, 20);
      spotLight.angle = 0.4;
      spotLight.penumbra = 0.5;
      spotLight.castShadow = true;
      spotLight.shadow.mapSize.width = 2048;
      spotLight.shadow.mapSize.height = 2048;
      scene.add(spotLight);

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

    const clock = new THREE.Clock();

    function animate() {
      requestAnimationFrame(animate);
      const time = clock.getElapsedTime();

      if(particlesSystem) particlesSystem.rotation.y = time * 0.02;

      if(earthMesh) {
        earthMesh.rotation.y = time * 0.05;
        earthMesh.rotation.x = Math.sin(time * 0.2) * 0.1;
      }

      if(godGroup) {
        godGroup.rotation.y = -time * 0.2;
        godGroup.rotation.z = time * 0.1;
        godGroup.children.forEach((child: any) => {
          if(child.material && child.material.map) {
            child.material.map.offset.x = time * 0.5;
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

    gsap.registerPlugin(ScrollTrigger);

    camera.position.set(0, 0, 12);
    
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: "body",
        start: "top top",
        end: "bottom bottom",
        scrub: 1.2,
      }
    });

    tl.to(camera.position, { z: 2, y: -2, duration: 2 })
      .to(particlesSystem.material, { size: 0.05, opacity: 0.3, duration: 2 }, "<");

    tl.to(camera.position, { x: -10, y: -3, z: -8, duration: 3 })
      .to(camera.rotation, { y: -0.8, duration: 3 }, "<")
      .to(earthMesh.position, { x: -8, z: -15, duration: 3 }, "<");

    tl.to(camera.position, { x: -9, y: -4, z: -11, duration: 2 })
      .to(earthMesh.rotation, { z: 1, duration: 2 }, "<");

    tl.to(camera.position, { x: 10, y: 4, z: -15, duration: 4 })
      .to(camera.rotation, { y: 0.6, x: 0.2, duration: 4 }, "<")
      .to(godGroup.position, { x: 8, z: -25, duration: 4 }, "<");

    tl.to(camera.position, { x: 12, y: 6, z: -20, duration: 2 })
      .to(godGroup.rotation, { x: 1, duration: 2 }, "<");

    tl.to(camera.position, { x: 6, y: 2, z: -22, duration: 2 });

    tl.to(camera.position, { x: 0, y: 0, z: -5, duration: 3 })
      .to(camera.rotation, { x: 0, y: 0, z: 0, duration: 3 }, "<")
      .to(earthMesh.position, { x: -6, y: -2, z: -20, duration: 3 }, "<")
      .to(godGroup.position, { x: 6, y: 2, z: -20, duration: 3 }, "<");

    tl.to(camera.position, { z: -8, duration: 2 });

    tl.to(camera.position, { z: -15, duration: 2 })
      .to(mainLight, { intensity: 5, duration: 1 }, "<");

    tl.addLabel("reveal_fade")
      .to([earthMesh.position, godGroup.position], { x: (i: number) => i === 0 ? -40 : 40, duration: 1.5, opacity: 0 }, "reveal_fade")
      .to({}, { 
          duration: 1.5, 
          onUpdate: function() {
              if(paintingMeshReference) {
                  paintingMeshReference.material.opacity = this.progress();
              }
          }
      }, "reveal_fade");
      
    tl.addLabel("reveal_move")
      .to(camera.position, { z: -40, duration: 2 }, "reveal_move")
      .to(paintingGroup.position, { z: -45, duration: 2 }, "reveal_move")
      .to(paintingGroup.rotation, { y: 0, duration: 2 }, "reveal_move");

    tl.to("body", { backgroundColor: "#000", duration: 1 });

    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    const sections = document.querySelectorAll('section');
    const dotsContainer = navDotsRef.current;
    
    if (dotsContainer) {
      sections.forEach((section, i) => {
        const dot = document.createElement('div');
        dot.className = i === 0 ? 'dot active' : 'dot';
        
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
        if (scrollY >= sectionTop - window.innerHeight/2) {
          current = section.getAttribute('id') || '';
        }
      });

      sections.forEach((section, index) => {
        if(section.getAttribute('id') === current) {
          dots.forEach(d => d.classList.remove('active'));
          if(dots[index]) dots[index].classList.add('active');
        }
      });
    });
  };

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700;900&family=Italiana&family=Syncopate:wght@400;700&display=swap" rel="stylesheet" />

      <div className="min-h-screen bg-[#030303] text-[#E0D4C3] overflow-x-hidden">
        {isNarrow && (
          <div className="fixed inset-0 z-[2000] bg-black flex flex-col items-center justify-center p-10 text-center">
            <div className="mobile-guard-animation mb-12">
              <svg width="120" height="120" viewBox="0 0 100 100" fill="none" stroke="white" strokeWidth="1">
                <rect x="20" y="10" width="60" height="80" rx="5" className="device-rect" />
                <path d="M45 85 h10" strokeOpacity="0.5" />
                <path d="M10 40 L30 40 M70 40 L90 40" strokeDasharray="2 2" className="rotate-arrow" />
              </svg>
            </div>
            <h2 className="text-3xl font-cinzel mb-4 tracking-widest text-white">GENESIS REQUIRES SPACE</h2>
            <p className="font-italiana text-xl text-gray-400 mb-8 max-w-sm">
              The creation of matter is too vast for this viewport.
            </p>
            <div className="flex flex-col items-center gap-4">
              <span className="text-xs font-syncopate tracking-[0.3em] text-yellow-500/80 uppercase">Please rotate your device</span>
              <div className="w-12 h-[1px] bg-white/20"></div>
              <span className="text-[10px] font-syncopate text-gray-600 uppercase tracking-widest">or view on a desktop</span>
            </div>
            <div className="absolute bottom-10 animate-pulse text-[10px] uppercase tracking-widest text-gray-700 font-syncopate">
              Waiting for expansion...
            </div>
          </div>
        )}

        <div ref={loaderRef} className="fixed top-0 left-0 w-full h-full bg-black z-[1000] flex justify-center items-center text-white font-syncopate">
          <div className="text-center">
            <h1 className="text-4xl mb-4 tracking-widest">GENESIS</h1>
            <p className="text-xs text-gray-400 animate-pulse">REFINING MATTER...</p>
          </div>
        </div>

        <div ref={canvasContainerRef} className="fixed top-0 left-0 w-full h-full z-0 pointer-events-none" />

        <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-[5] opacity-[0.04] bg-noise" />

        <div className="nav-logo fixed top-8 left-8 z-[100] mix-blend-difference">
          <svg width="50" height="50" viewBox="0 0 100 100" fill="none" stroke="white" strokeWidth="2">
            <circle cx="50" cy="50" r="40" strokeDasharray="2 4" strokeOpacity="0.5"/>
            <path d="M30 50 L50 30 L70 50 L50 70 Z" fill="white" />
          </svg>
        </div>

        <div ref={navDotsRef} className="fixed right-8 top-1/2 -translate-y-1/2 flex flex-col gap-3 z-[100]">
        </div>

        <main>
          <section className="section" id="s1">
            <div className="max-w-7xl mx-auto w-full grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
              <div className="z-20">
                <span className="chapter-num">PROLOGUE</span>
                <h1 className="text-7xl md:text-9xl font-bold mb-6 font-cinzel uppercase leading-[0.9]">
                  DAWN<br/>
                  <span className="outline-text">OF MAN</span>
                </h1>
                <p className="text-lg md:text-xl font-italiana max-w-md text-gray-300 leading-relaxed">
                  A forensic reconstruction of the moment matter met spirit.
                </p>
              </div>
            </div>
          </section>

          <section className="section items-end text-right" id="s2">
            <div className="max-w-4xl ml-auto pr-8 md:pr-20 logo-blend relative">
              <h1 className="text-6xl md:text-8xl font-bold opacity-50 absolute -top-32 right-0 -z-10 select-none font-cinzel uppercase leading-[0.9]">VOID</h1>
              <h2 className="text-5xl font-italiana mb-6">The Primordial Void</h2>
              <p className="text-2xl font-light max-w-lg ml-auto border-r-4 pr-6">
                Before geometry, there was only potential. 
              </p>
            </div>
          </section>

          <section className="section" id="s3">
            <div className="glass-panel p-12 max-w-xl rounded-sm border-l-4 border-white pointer-events-auto relative z-10">
              <span className="chapter-num">I. MATTER</span>
              <h2 className="text-6xl font-serif mb-6">ADAMA</h2>
              <p className="text-gray-300 leading-relaxed text-lg">
                The heavy earth. The red clay. Adam sits on the ground, his body a landscape of hills and valleys. He is physically complete but spiritually inert.
              </p>
            </div>
          </section>
          
          <section className="section items-end" id="s4">
             <div className="max-w-lg mr-20 text-right logo-blend">
                <span className="chapter-num">II. STATIS</span>
                <h2 className="text-4xl font-syncopate tracking-wider mb-4">DORMANCY</h2>
                <p className="text-xl font-italiana italic">
                  "He is the earth waiting for the wind."
                </p>
                <p className="mt-4 text-sm">
                  Michelangelo depicts him with a heavy hand, wrist limp, fingers drooping. Gravity owns him.
                </p>
            </div>
          </section>

          <section className="section justify-start pt-32" id="s5">
            <div className="text-center w-full relative logo-blend">
              <span className="chapter-num">III. FORCE</span>
              <h2 className="text-8xl font-bold font-syncopate tracking-tighter mb-4">DIVINUS</h2>
              <p className="max-w-xl mx-auto mt-8 text-lg">
                 A whirlwind of intellect and will. Not a man, but a force of nature wrapped in a cloak of cosmic wind.
              </p>
            </div>
          </section>

          <section className="section justify-start items-end" id="s6">
            <div className="glass-panel p-10 max-w-2xl mr-8 md:mr-20 mt-20 pointer-events-auto relative z-10">
              <span className="chapter-num">IV. ANATOMY</span>
              <h2 className="text-4xl font-serif mb-4">The Brain Theory</h2>
              <p className="text-gray-300 leading-relaxed">
                Look closely at the mantle surrounding the Creator. It is not merely cloth. The shape perfectly matches a sagittal section of the human brain.
              </p>
              <div className="mt-4 border-t border-gray-600 pt-4 flex gap-4 text-xs font-syncopate text-gray-500">
                <div>CEREBELLUM</div>
                <div>PITUITARY</div>
                <div>VERTEBRAL ARTERY</div>
              </div>
            </div>
          </section>

          <section className="section items-end pb-32" id="s7">
            <div className="max-w-lg ml-10 md:ml-32 mb-10 logo-blend">
               <h2 className="text-5xl font-italiana mb-2">Sophia</h2>
               <p className="text-lg">
                   Under His left arm, a figure watches. Some say it is Eve, waiting to be born. Others say it is Sophia—Divine Wisdom.
               </p>
            </div>
          </section>

          <section className="section items-center justify-center" id="s8">
            <div className="relative logo-blend text-center">
              <h2 className="text-[8vw] font-bold leading-none font-cinzel uppercase">THE SYNAPSE</h2>
              <p className="text-xl font-syncopate tracking-[1em] mt-4 uppercase">Distance = Desire</p>
            </div>
          </section>

          <section className="section" id="s9">
             <div className="glass-panel p-8 max-w-xl mx-auto text-center pointer-events-auto relative z-10">
              <span className="chapter-num">V. REFLECTION</span>
              <h3 className="text-3xl font-italiana mb-4">"In Our Image"</h3>
              <p className="text-gray-400">
                Adam's pose mirrors God's. The concave shape of Adam fits the convex shape of God.
              </p>
            </div>
          </section>

          <section className="section" id="s10">
            <div className="grid grid-cols-1 md:grid-cols-2 w-full max-w-7xl mx-auto">
              <div className="glass-panel p-8 md:p-16 border-yellow-500/30 border pointer-events-auto relative z-10">
                <h3 className="text-yellow-400 font-syncopate mb-2 tracking-widest">IGNITION</h3>
                <h2 className="text-5xl md:text-6xl font-bold mb-6 font-cinzel uppercase leading-[0.9]">The Touch</h2>
                <p className="text-lg leading-relaxed text-gray-300">
                  The fingers do not touch. The spark must jump the gap. It is the transmission of the soul.
                </p>
              </div>
            </div>
          </section>

          <section className="section" id="s11">
            <div className="absolute bottom-10 right-10 z-20 text-right">
              <h2 className="text-4xl font-italiana">Buonarroti's Vision</h2>
              <p className="text-sm font-syncopate tracking-widest mt-2">1512 AD • Sistine Chapel Ceiling</p>
            </div>
          </section>

          <section className="section bg-black z-20" id="s12">
            <div className="max-w-6xl mx-auto w-full grid grid-cols-1 md:grid-cols-3 gap-12 text-center md:text-left">
              <div>
                <h3 className="text-2xl font-bold mb-6 font-syncopate">CREATION</h3>
                <p className="text-gray-500 text-sm leading-loose">
                  A digital deconstruction of the most famous section of the Sistine Chapel ceiling. 
                </p>
              </div>
              <div>
                <h3 className="text-xl font-bold mb-6 font-syncopate">INDEX</h3>
                <ul className="space-y-4 text-gray-400 font-italiana">
                  <li>I. Matter</li>
                  <li>II. Stasis</li>
                  <li>III. Force</li>
                  <li>IV. Anatomy</li>
                  <li>V. Reflection</li>
                </ul>
              </div>
              <div>
                <h3 className="text-xl font-bold mb-6 font-syncopate">CONNECT</h3>
                <div className="flex gap-4 justify-center md:justify-start">
                  <div className="w-10 h-10 border border-gray-700 flex items-center justify-center rounded-full hover:bg-white hover:text-black transition-all cursor-pointer pointer-events-auto">IG</div>
                  <div className="w-10 h-10 border border-gray-700 flex items-center justify-center rounded-full hover:bg-white hover:text-black transition-all cursor-pointer pointer-events-auto">TW</div>
                </div>
              </div>
            </div>
            <div className="absolute bottom-4 w-full text-center text-xs text-gray-800 font-syncopate">
              TOP 0.1% DESIGN • MAXIMALIST • 2025
            </div>
          </section>
        </main>

        <style jsx global>{`
          body, html {
            margin: 0;
            padding: 0;
            overflow-x: hidden;
            background-color: #030303;
            color: #E0D4C3;
            scroll-behavior: smooth;
          }

          .section {
            position: relative;
            width: 100%;
            height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: center;
            padding: 2rem;
            box-sizing: border-box;
            border-bottom: 1px solid rgba(255,255,255,0.02);
            pointer-events: none;
          }
          
          .glass-panel, .logo-blend, .nav-logo, .nav-progress {
            pointer-events: auto;
            position: relative;
            z-index: 10;
          }

          h1, h2, h3 {
            font-family: 'Cinzel', serif;
            text-transform: uppercase;
            line-height: 0.9;
          }

          .font-syncopate {
            font-family: 'Syncopate', sans-serif;
          }
          
          .font-italiana {
            font-family: 'Italiana', serif;
          }

          .font-cinzel {
            font-family: 'Cinzel', serif;
          }

          .outline-text {
            -webkit-text-stroke: 1px rgba(224, 212, 195, 0.5);
            color: transparent;
          }

          .glass-panel {
            background: rgba(5, 5, 5, 0.6);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.08);
            box-shadow: 0 4px 30px rgba(0, 0, 0, 0.5);
            mix-blend-mode: normal; 
          }

          .logo-blend {
            mix-blend-mode: difference !important;
            color: #ffffff !important;
          }
          
          .logo-blend h1, .logo-blend h2, .logo-blend h3, .logo-blend p, .logo-blend span, .logo-blend div {
            color: #ffffff !important;
            border-color: #ffffff !important;
          }

          ::-webkit-scrollbar { width: 4px; }
          ::-webkit-scrollbar-track { background: #000; }
          ::-webkit-scrollbar-thumb { background: #444; }

          .nav-logo, .nav-progress {
            mix-blend-mode: difference;
          }

          .dot {
            width: 4px;
            height: 4px;
            background: rgba(255,255,255,0.5);
            border-radius: 50%;
            transition: all 0.3s ease;
            cursor: pointer;
            position: relative;
            pointer-events: auto;
          }
          
          .dot::after {
            content: '';
            position: absolute;
            top: -8px;
            left: -8px;
            right: -8px;
            bottom: -8px;
          }

          .dot:hover {
            background: rgba(255,255,255,1);
            transform: scale(1.5);
          }

          .dot.active {
            background: #fff;
            transform: scale(2.5);
            box-shadow: 0 0 10px rgba(255,255,255,0.5);
          }

          .bg-noise {
            background: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyBAMAAADsEZWCAAAAGFBMVEUAAAA5OTkAAABMTExERERmZmYzMzMyMjJ4D30DAAAAB3RSTlMAnNm8bzAqjLdGowAAAMJlEQVQ4y2NgwA2YQACO4QZgDAGwYQZgDAMwYgZgDAPQYgZgDAMwYgZgDAPQYgZgDAMwYgZgDAPQYgZgDAMwYgZgDAPQYgZgDAMwYgZgDAPQYgZgDAMwYgZgDAPQYgZgDAMwYgZgDAPQYgZgDAMwYgZgDAPQYgZgDAMwYgZgDAPQYgZgDAMwYgZgDAPQYgZgDAMwYgZgDAPQYgZgDAMwYgZgDANQAQZgDADoO2aC902hSAAAAABJRU5ErkJggg==');
          }
          
          .chapter-num {
            font-family: 'Syncopate', sans-serif;
            font-size: 0.8rem;
            letter-spacing: 0.2em;
            color: #888;
            margin-bottom: 1rem;
            display: block;
          }

          .mobile-guard-animation {
            animation: float 4s ease-in-out infinite;
          }

          .device-rect {
            animation: rotateDevice 3s ease-in-out infinite;
            transform-origin: center;
          }

          @keyframes rotateDevice {
            0%, 20% { transform: rotate(0deg); }
            40%, 60% { transform: rotate(90deg); }
            80%, 100% { transform: rotate(0deg); }
          }

          @keyframes float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-20px); }
          }
        `}</style>
      </div>
    </>
  );
}
