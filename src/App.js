import { useEffect, useRef, useState } from "react";
import "./App.css";

const patutiFrames = {
  idle: ["idle-1.png", "idle-2.png"],
  right: ["right-1.png", "right-2.png", "right-3.png", "right-4.png", "right-5.png"],
  left: ["left-1.png", "left-2.png", "left-3.png", "left-4.png", "left-6.png"],
  jump: ["jump-1.png", "jump-2.png", "jump-3.png", "jump-4.png", "jump-5.png", "jump-6.png", "jump-7.png"],
  dock: ["dock-1.png", "dock-2.png", "dock-3.png", "dock-4.png", "dock-5.png"],
};

const loadImages = (frames) => {
  const images = {};
  const promises = [];
  for (const action in frames) {
    images[action] = frames[action].map((filename) => {
      const img = new Image();
      img.src = `/moves/${filename}`;
      promises.push(new Promise((res) => (img.onload = res)));
      return img;
    });
  }
  return Promise.all(promises).then(() => images);
};

function App() {
  const canvasRef = useRef();
  const imagesRef = useRef({});
  const keys = useRef({});
  const bullets = useRef([]);
  const [gameOver, setGameOver] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const background = new Image();
    background.src = "/moves/background.png";
    const area = new Image();
    area.src = "/moves/area.png";
    const bulletH = new Image();
    bulletH.src = "/moves/bullet_h.png";
    const bulletV = new Image();
    bulletV.src = "/moves/bullet_v.png";

    const platform = {
      x: canvas.width / 2 - 150,
      y: canvas.height - 300,
      width: 300,
      height: 150,
    };

    const patuti = {
      x: platform.x + 85,
      y: platform.y - 80,
      width: 80,
      height: 80,
      dx: 0,
      dy: 0,
      gravity: 1,
      speed: 5,
      jumping: false,
      ducking: false,
      action: "idle",
      frameIndex: 0,
      life: 100,
    };

    loadImages(patutiFrames).then((imgs) => {
      imagesRef.current = imgs;

      const drawPatuti = () => {
        const frames = imagesRef.current[patuti.action];
        const img = frames[Math.floor(patuti.frameIndex) % frames.length];
        const adjustedHeight = patuti.ducking ? patuti.height / 2 : patuti.height;
        const adjustedY = patuti.ducking ? patuti.y + patuti.height / 2 : patuti.y;
        ctx.drawImage(img, patuti.x, adjustedY, patuti.width, adjustedHeight);
        patuti.frameIndex += 0.2;
      };

      const updatePatuti = () => {
        patuti.dx = 0;
        if (keys.current["ArrowLeft"]) {
          patuti.dx = -patuti.speed;
          patuti.action = "left";
        } else if (keys.current["ArrowRight"]) {
          patuti.dx = patuti.speed;
          patuti.action = "right";
        }

        if (keys.current["ArrowDown"]) {
          patuti.ducking = true;
          patuti.action = "dock";
        } else {
          patuti.ducking = false;
        }

        if (keys.current["ArrowUp"] && !patuti.jumping) {
          patuti.dy = -18;
          patuti.jumping = true;
          patuti.action = "jump";
        }

        patuti.x += patuti.dx;
        patuti.y += patuti.dy;
        patuti.dy += patuti.gravity;

        if (patuti.x < platform.x) patuti.x = platform.x;
        if (patuti.x + patuti.width > platform.x + platform.width)
          patuti.x = platform.x + platform.width - patuti.width;

        if (patuti.y > platform.y + 10) triggerGameOver();

        if (patuti.y >= platform.y - patuti.height + 5) {
          patuti.y = platform.y - patuti.height + 5;
          patuti.dy = 0;
          patuti.jumping = false;
          if (!keys.current["ArrowLeft"] && !keys.current["ArrowRight"] && !patuti.ducking) {
            patuti.action = "idle";
          }
        }
      };

      const drawBullets = () => {
        bullets.current.forEach((b, i) => {
          b.x -= b.speedX;
          b.y += b.speedY;
          ctx.drawImage(b.image, b.x, b.y, b.width, b.height);

          const collisionTop = patuti.ducking ? patuti.y + patuti.height / 2 : patuti.y;
          const collisionHeight = patuti.ducking ? patuti.height / 2 : patuti.height;

          if (
            b.x < patuti.x + patuti.width &&
            b.x + b.width > patuti.x &&
            b.y < collisionTop + collisionHeight &&
            b.y + b.height > collisionTop
          ) {
            patuti.life -= 10;
            bullets.current.splice(i, 1);
          }
        });
        bullets.current = bullets.current.filter((b) => b.x + b.width > 0 && b.y < canvas.height);
      };

      const drawLifeBar = () => {
        const x = canvas.width - 250;
        const y = canvas.height - 50;
        ctx.font = "16px Arial";
        ctx.fillStyle = "white";
        ctx.fillText("Patuti HP:", x - 90, y + 20);
        ctx.fillStyle = "green";
        ctx.fillRect(x, y, 2 * patuti.life, 25);
        ctx.strokeStyle = "black";
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, 200, 25);
      };

      const drawArea = () => {
        ctx.drawImage(area, platform.x, platform.y, platform.width, platform.height);
      };

      const triggerGameOver = () => {
        setGameOver(true);
        ctx.fillStyle = "rgba(228, 86, 86, 0.7)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "white";
        ctx.font = "bold 48px Arial";
        ctx.textAlign = "center";
        ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2 - 30);
        ctx.font = "24px Arial";
        ctx.fillText("Patuti failed to dodge the bullets!", canvas.width / 2, canvas.height / 2 + 10);
        ctx.fillText("Tap anywhere to restart", canvas.width / 2, canvas.height / 2 + 50);
        canvas.addEventListener("click", () => window.location.reload(), { once: true });
        canvas.addEventListener("touchstart", () => window.location.reload(), { once: true });
      };

      const spawnBullet = () => {
        if (gameOver) return;
        const type = Math.random() < 0.5 ? "horizontal" : "vertical";
        if (type === "horizontal") {
          bullets.current.push({
            x: canvas.width,
            y: patuti.y + patuti.height / 4 + Math.random() * 10,
            width: 30,
            height: 30,
            speedX: 4,
            speedY: 0,
            image: bulletH,
          });
        } else {
          bullets.current.push({
            x: platform.x + Math.random() * platform.width,
            y: -40,
            width: 30,
            height: 30,
            speedX: 0,
            speedY: 4,
            image: bulletV,
          });
        }
      };

      const gameLoop = () => {
        if (gameOver || patuti.life <= 0) return triggerGameOver();
        ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
        drawArea();
        updatePatuti();
        drawPatuti();
        drawBullets();
        drawLifeBar();
        requestAnimationFrame(gameLoop);
      };

      setInterval(spawnBullet, 1000);
      gameLoop();
    });

    const handleKeyDown = (e) => (keys.current[e.key] = true);
    const handleKeyUp = (e) => (keys.current[e.key] = false);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [gameOver]);

  return <canvas ref={canvasRef} id="gameCanvas" />;
}

export default App;
