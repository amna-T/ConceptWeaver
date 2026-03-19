import React, { useEffect, useRef } from "react";
import "./BackgroundAnimation.css";

console.log("BackgroundAnimation.jsx: File Loaded!");

const BackgroundAnimation = () => {
    const canvasRef = useRef(null);
    console.log("BackgroundAnimation.jsx: Component Rendered");

    useEffect(() => {
        console.log("BackgroundAnimation.jsx: useEffect Started");
        const canvas = canvasRef.current;
        if (!canvas) {
            console.error("BackgroundAnimation.jsx: Canvas Ref is NULL!");
            return;
        }
        const ctx = canvas.getContext("2d");
        
        const setCanvasSize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            console.log("BackgroundAnimation.jsx: Canvas resized to", canvas.width, "x", canvas.height);
        };
        setCanvasSize();
        window.addEventListener("resize", setCanvasSize);

        let mouse = { x: undefined, y: undefined, radius: 150 };
        window.addEventListener('mousemove', (e) => {
            mouse.x = e.x;
            mouse.y = e.y;
        });

        const particlesArray = [];
        const numberOfParticles = 80;

        class Particle {
            constructor() {
                this.x = Math.random() * canvas.width;
                this.y = Math.random() * canvas.height;
                this.speedX = (Math.random() - 0.5) * 1.5;
                this.speedY = (Math.random() - 0.5) * 1.5;
                this.size = Math.random() * 2 + 1;
            }
            update() {
                if (this.x > canvas.width || this.x < 0) this.speedX = -this.speedX;
                if (this.y > canvas.height || this.y < 0) this.speedY = -this.speedY;
                this.x += this.speedX;
                this.y += this.speedY;
            }
            draw() {
                ctx.fillStyle = '#a855f7'; // Bright purple for visibility
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        for (let i = 0; i < numberOfParticles; i++) {
            particlesArray.push(new Particle());
        }

        const animate = () => {
            // Safety: If canvas size is wrong, fix it
            if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
                setCanvasSize();
            }

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            for (let i = 0; i < particlesArray.length; i++) {
                particlesArray[i].update();
                particlesArray[i].draw();
                
                for (let j = i; j < particlesArray.length; j++) {
                    const dx = particlesArray[i].x - particlesArray[j].x;
                    const dy = particlesArray[i].y - particlesArray[j].y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    if (distance < 120) {
                        ctx.strokeStyle = `rgba(168, 85, 247, ${1 - distance/120})`;
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        ctx.moveTo(particlesArray[i].x, particlesArray[i].y);
                        ctx.lineTo(particlesArray[j].x, particlesArray[j].y);
                        ctx.stroke();
                    }
                }
            }
            requestAnimationFrame(animate);
        };
        animate();

        return () => window.removeEventListener("resize", setCanvasSize);
    }, []);

    return <canvas ref={canvasRef} className="network-canvas" style={{ background: '#050505' }} />;
};

export default BackgroundAnimation;
