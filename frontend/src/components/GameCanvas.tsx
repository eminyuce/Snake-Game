import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { Play, Pause, RotateCcw, Trophy, Timer, Target, Users, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Sparkles, HelpCircle, Skull } from 'lucide-react';
import { useUpdateGameStats, useGetRewardConfig, useGetOnlinePlayerCount } from '../hooks/useQueries';
import { toast } from 'sonner';
import type { UserProfile } from '../backend';
import GameOverDialog from './GameOverDialog';

interface GameCanvasProps {
  userProfile: UserProfile | null;
}

type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
type Position = { x: number; y: number };
type SurpriseEffect = 'colorChange' | 'doubleSize' | 'halfSize' | 'slowSpeed' | 'minimalSize' | 'removeWalls' | 'wallEatingMode' | null;

const GRID_SIZE = 20;
const CELL_SIZE = 20;
const CANVAS_WIDTH = GRID_SIZE * CELL_SIZE;
const CANVAS_HEIGHT = GRID_SIZE * CELL_SIZE;
const INITIAL_SPEED = 150;
const BALL_TIMER = 10000; // 10 seconds
const SUPERBALL_CHANCE = 0.1; // 1 in 10 chance
const SURPRISE_BALL_FREQUENCY = 5; // At least 1 surprise ball per 5 regular balls
const SURPRISE_EFFECT_DURATION = 60000; // 60 seconds (1 minute)
const DEATH_BALL_DESPAWN_TIME = 15000; // 15 seconds

export default function GameCanvas({ userProfile }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'paused' | 'gameover'>('idle');
  const [score, setScore] = useState(0);
  const [ballsCaught, setBallsCaught] = useState(0);
  const [superballsCaught, setSuperballsCaught] = useState(0);
  const [surpriseBallsCaught, setSurpriseBallsCaught] = useState(0);
  const [deathBallsEncountered, setDeathBallsEncountered] = useState(0);
  const [icpEarned, setIcpEarned] = useState(0);
  const [ballsForNextReward, setBallsForNextReward] = useState(10);
  const [rewardLevel, setRewardLevel] = useState(0);
  const [ballTimer, setBallTimer] = useState(BALL_TIMER);
  const [showGameOver, setShowGameOver] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [keyboardActive, setKeyboardActive] = useState(false);
  const [touchStartPos, setTouchStartPos] = useState<{ x: number; y: number } | null>(null);
  const [activeSurpriseEffect, setActiveSurpriseEffect] = useState<SurpriseEffect>(null);
  const [snakeColor, setSnakeColor] = useState<string>('oklch(0.488 0.243 264.376)');

  const updateGameStats = useUpdateGameStats();
  const { data: rewardConfig } = useGetRewardConfig();
  const { data: onlinePlayerCount } = useGetOnlinePlayerCount();

  // Game state refs
  const snakeRef = useRef<Position[]>([{ x: 10, y: 10 }]);
  const directionRef = useRef<Direction>('RIGHT');
  const nextDirectionRef = useRef<Direction>('RIGHT');
  const ballRef = useRef<Position>({ x: 15, y: 10 });
  const isSuperballRef = useRef<boolean>(false);
  const isSurpriseBallRef = useRef<boolean>(false);
  const wallsRef = useRef<Position[]>([]);
  const gameLoopRef = useRef<number | undefined>(undefined);
  const ballTimerRef = useRef<number | undefined>(undefined);
  const ballTimerStartRef = useRef<number>(Date.now());
  const speedRef = useRef(INITIAL_SPEED);
  const glowAnimationRef = useRef<number>(0);
  const surpriseEffectTimeoutRef = useRef<number | undefined>(undefined);
  const originalSpeedRef = useRef<number>(INITIAL_SPEED);
  const originalColorRef = useRef<string>('oklch(0.488 0.243 264.376)');
  const originalWallsRef = useRef<Position[]>([]);
  
  // Surprise ball tracking system
  const ballSpawnCountRef = useRef<number>(0);
  const surpriseBallsInBatchRef = useRef<number>(0);

  // Death ball state
  const deathBallRef = useRef<Position | null>(null);
  const deathBallSpawnTimeRef = useRef<number>(0);
  const deathBallTimerRef = useRef<number | undefined>(undefined);

  // Detect touch device
  useEffect(() => {
    const checkTouch = () => {
      setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
    };
    checkTouch();
    window.addEventListener('touchstart', checkTouch, { once: true });
    return () => window.removeEventListener('touchstart', checkTouch);
  }, []);

  const generateRandomPosition = useCallback((): Position => {
    return {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE),
    };
  }, []);

  const isPositionValid = useCallback((pos: Position): boolean => {
    // Check if position is occupied by snake
    if (snakeRef.current.some((segment) => segment.x === pos.x && segment.y === pos.y)) {
      return false;
    }
    // Check if position is occupied by walls
    if (wallsRef.current.some((wall) => wall.x === pos.x && wall.y === pos.y)) {
      return false;
    }
    // Check if position is occupied by death ball
    if (deathBallRef.current && deathBallRef.current.x === pos.x && deathBallRef.current.y === pos.y) {
      return false;
    }
    // Check if position is occupied by regular ball
    if (ballRef.current.x === pos.x && ballRef.current.y === pos.y) {
      return false;
    }
    return true;
  }, []);

  const spawnDeathBall = useCallback(() => {
    // Only spawn if no death ball exists
    if (deathBallRef.current) return;

    let newPos: Position;
    let attempts = 0;
    do {
      newPos = generateRandomPosition();
      attempts++;
    } while (!isPositionValid(newPos) && attempts < 100);

    if (attempts < 100) {
      deathBallRef.current = newPos;
      deathBallSpawnTimeRef.current = Date.now();
      toast.warning('💀 Death Ball Spawned!', {
        description: 'Avoid the X or game over!',
      });
    }
  }, [generateRandomPosition, isPositionValid]);

  const despawnDeathBall = useCallback(() => {
    if (deathBallRef.current) {
      deathBallRef.current = null;
      deathBallSpawnTimeRef.current = 0;
    }
  }, []);

  const generateBall = useCallback(() => {
    let newBall: Position;
    let attempts = 0;
    do {
      newBall = generateRandomPosition();
      attempts++;
    } while (!isPositionValid(newBall) && attempts < 100);
    ballRef.current = newBall;
    
    // Increment spawn count
    ballSpawnCountRef.current += 1;
    
    // Determine ball type with guaranteed surprise ball frequency
    const currentBatchPosition = ballSpawnCountRef.current % SURPRISE_BALL_FREQUENCY;
    const isLastInBatch = currentBatchPosition === 0;
    const needsSurpriseBall = isLastInBatch && surpriseBallsInBatchRef.current === 0;
    
    if (needsSurpriseBall) {
      // Guarantee a surprise ball if we haven't had one in this batch
      isSurpriseBallRef.current = true;
      isSuperballRef.current = false;
      surpriseBallsInBatchRef.current += 1;
    } else {
      // Random chance for surprise ball (but not guaranteed)
      const rand = Math.random();
      const surpriseChance = 0.2; // 20% chance when not forced
      
      if (rand < surpriseChance && currentBatchPosition !== 0) {
        isSurpriseBallRef.current = true;
        isSuperballRef.current = false;
        surpriseBallsInBatchRef.current += 1;
      } else if (rand < surpriseChance + SUPERBALL_CHANCE) {
        isSuperballRef.current = true;
        isSurpriseBallRef.current = false;
      } else {
        isSuperballRef.current = false;
        isSurpriseBallRef.current = false;
      }
    }
    
    // Reset batch counter when we complete a batch
    if (isLastInBatch) {
      surpriseBallsInBatchRef.current = 0;
    }
    
    ballTimerStartRef.current = Date.now();

    // Randomly spawn death ball (low chance)
    if (Math.random() < 0.15 && !deathBallRef.current) {
      spawnDeathBall();
    }
  }, [generateRandomPosition, isPositionValid, spawnDeathBall]);

  const generateWalls = useCallback((count: number) => {
    const newWalls: Position[] = [];
    for (let i = 0; i < count; i++) {
      let wall: Position;
      let attempts = 0;
      do {
        wall = generateRandomPosition();
        attempts++;
      } while (
        (!isPositionValid(wall) || newWalls.some((w) => w.x === wall.x && w.y === wall.y)) &&
        attempts < 100
      );
      if (attempts < 100) {
        newWalls.push(wall);
      }
    }
    wallsRef.current = [...wallsRef.current, ...newWalls];
  }, [generateRandomPosition, isPositionValid]);

  const checkCollision = useCallback((head: Position): boolean => {
    // Check wall collision
    if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
      return true;
    }
    // Check self collision
    if (snakeRef.current.slice(1).some((segment) => segment.x === head.x && segment.y === head.y)) {
      return true;
    }
    // Check wall obstacles collision (unless wall-eating mode is active)
    if (activeSurpriseEffect !== 'wallEatingMode') {
      if (wallsRef.current.some((wall) => wall.x === head.x && wall.y === head.y)) {
        return true;
      }
    }
    // Check death ball collision
    if (deathBallRef.current && head.x === deathBallRef.current.x && head.y === deathBallRef.current.y) {
      setDeathBallsEncountered((prev) => prev + 1);
      toast.error('💀 Death Ball Hit!', {
        description: 'Game Over!',
      });
      return true;
    }
    return false;
  }, [activeSurpriseEffect]);

  const getRandomVibrantColor = useCallback((): string => {
    const hues = [0, 30, 60, 120, 180, 240, 300, 330]; // Various hues
    const randomHue = hues[Math.floor(Math.random() * hues.length)];
    return `oklch(0.65 0.25 ${randomHue})`;
  }, []);

  const applySurpriseEffect = useCallback((effectType: SurpriseEffect) => {
    if (!effectType) return;

    // Clear any existing timeout
    if (surpriseEffectTimeoutRef.current) {
      clearTimeout(surpriseEffectTimeoutRef.current);
    }

    switch (effectType) {
      case 'colorChange': {
        const newColor = getRandomVibrantColor();
        setSnakeColor(newColor);
        toast.success('🎨 Color Change!', {
          description: 'Snake color changed for 60 seconds',
        });
        
        // Set timeout to revert after 60 seconds
        surpriseEffectTimeoutRef.current = window.setTimeout(() => {
          setSnakeColor(originalColorRef.current);
          if (activeSurpriseEffect === 'colorChange') {
            setActiveSurpriseEffect(null);
            toast.info('✨ Color effect ended');
          }
        }, SURPRISE_EFFECT_DURATION);
        break;
      }
      case 'doubleSize': {
        // Double the snake's length by duplicating all segments
        const currentLength = snakeRef.current.length;
        const lastSegment = snakeRef.current[snakeRef.current.length - 1];
        
        // Add segments equal to current length to double it
        for (let i = 0; i < currentLength; i++) {
          snakeRef.current.push({ ...lastSegment });
        }
        
        toast.success('📈 Double Size!', {
          description: `Snake doubled from ${currentLength} to ${snakeRef.current.length} segments`,
        });
        break;
      }
      case 'halfSize': {
        // Halve the snake's length, keeping at least 1 segment (the head)
        const currentLength = snakeRef.current.length;
        const newLength = Math.max(1, Math.floor(currentLength / 2));
        snakeRef.current = snakeRef.current.slice(0, newLength);
        
        toast.info('📉 Half Size!', {
          description: `Snake halved from ${currentLength} to ${newLength} segments`,
        });
        break;
      }
      case 'slowSpeed': {
        originalSpeedRef.current = speedRef.current;
        speedRef.current = speedRef.current * 2; // Slower speed (higher interval)
        toast.info('🐌 Slow Motion!', {
          description: 'Snake movement slowed for 60 seconds',
        });
        
        // Set timeout to revert after 60 seconds
        surpriseEffectTimeoutRef.current = window.setTimeout(() => {
          speedRef.current = originalSpeedRef.current;
          if (activeSurpriseEffect === 'slowSpeed') {
            setActiveSurpriseEffect(null);
            toast.info('✨ Slow effect ended');
          }
        }, SURPRISE_EFFECT_DURATION);
        break;
      }
      case 'minimalSize': {
        const currentLength = snakeRef.current.length;
        snakeRef.current = [snakeRef.current[0]]; // Keep only head
        toast.warning('🔬 Minimal Size!', {
          description: `Snake shrunk from ${currentLength} to 1 segment`,
        });
        break;
      }
      case 'removeWalls': {
        if (wallsRef.current.length > 0) {
          originalWallsRef.current = [...wallsRef.current];
          wallsRef.current = [];
          toast.success('💥 Walls Removed!', {
            description: 'All walls cleared',
          });
        } else {
          toast.info('💥 No Walls to Remove!', {
            description: 'There were no walls on the field',
          });
        }
        break;
      }
      case 'wallEatingMode': {
        toast.success('🧱 Wall-Eating Mode!', {
          description: 'Pass through and eat walls for 60 seconds!',
        });
        
        // Set timeout to revert after 60 seconds
        surpriseEffectTimeoutRef.current = window.setTimeout(() => {
          if (activeSurpriseEffect === 'wallEatingMode') {
            setActiveSurpriseEffect(null);
            toast.info('✨ Wall-eating mode ended');
          }
        }, SURPRISE_EFFECT_DURATION);
        break;
      }
    }
    
    setActiveSurpriseEffect(effectType);
  }, [getRandomVibrantColor, activeSurpriseEffect]);

  const handleReward = useCallback(() => {
    const rewardAmount = Number(rewardConfig?.icpAmount || 1n);
    setIcpEarned((prev) => prev + rewardAmount);
    setRewardLevel((prev) => prev + 1);
    setBallsForNextReward((prev) => prev + 1);
    
    // Generate 1-2 new walls (reduced from 3-4 for better difficulty balance)
    const wallCount = Math.floor(Math.random() * 2) + 1;
    generateWalls(wallCount);
    
    // Increase speed slightly
    speedRef.current = Math.max(50, speedRef.current - 10);
    
    toast.success(`🎉 ICP Reward Earned! +${rewardAmount} ICP`, {
      description: `Next reward in ${ballsForNextReward + 1} balls`,
    });
  }, [rewardConfig, ballsForNextReward, generateWalls]);

  const gameLoop = useCallback(() => {
    const snake = snakeRef.current;
    const direction = nextDirectionRef.current;
    directionRef.current = direction;

    const head = { ...snake[0] };

    switch (direction) {
      case 'UP':
        head.y -= 1;
        break;
      case 'DOWN':
        head.y += 1;
        break;
      case 'LEFT':
        head.x -= 1;
        break;
      case 'RIGHT':
        head.x += 1;
        break;
    }

    // Check if in wall-eating mode and head is on a wall
    if (activeSurpriseEffect === 'wallEatingMode') {
      const wallIndex = wallsRef.current.findIndex((wall) => wall.x === head.x && wall.y === head.y);
      if (wallIndex !== -1) {
        // Remove the wall and grow the snake
        wallsRef.current.splice(wallIndex, 1);
        const newSnake = [head, ...snake];
        snakeRef.current = newSnake;
        toast.success('🧱 Wall Eaten!', {
          description: 'Snake grew by eating a wall!',
        });
        return;
      }
    }

    if (checkCollision(head)) {
      setGameState('gameover');
      setShowGameOver(true);
      return;
    }

    const newSnake = [head, ...snake];

    // Check if ball is caught
    if (head.x === ballRef.current.x && head.y === ballRef.current.y) {
      const isSuperball = isSuperballRef.current;
      const isSurpriseBall = isSurpriseBallRef.current;
      
      if (isSurpriseBall) {
        // Surprise ball: randomly choose one of 7 effects (including wallEatingMode)
        const effects: SurpriseEffect[] = ['colorChange', 'doubleSize', 'halfSize', 'slowSpeed', 'minimalSize', 'removeWalls', 'wallEatingMode'];
        const randomEffect = effects[Math.floor(Math.random() * effects.length)];
        applySurpriseEffect(randomEffect);
        setScore((prev) => prev + 20);
        setSurpriseBallsCaught((prev) => prev + 1);
      } else if (isSuperball) {
        // Superball: grow 3x faster (add 2 extra segments)
        setScore((prev) => prev + 30);
        setSuperballsCaught((prev) => prev + 1);
        // Keep the tail and add 2 more segments
        newSnake.push(snake[snake.length - 1]);
        newSnake.push(snake[snake.length - 1]);
        toast.success('✨ Superball! +3 Growth!', {
          description: 'Snake grew 3 times faster!',
        });
      } else {
        setScore((prev) => prev + 10);
      }
      
      setBallsCaught((prev) => {
        const newCount = prev + 1;
        const ballsNeeded = 10 + rewardLevel;
        const progress = newCount % ballsNeeded;
        
        if (progress === 0) {
          handleReward();
        }
        
        return newCount;
      });
      generateBall();
    } else {
      newSnake.pop();
    }

    snakeRef.current = newSnake;
  }, [checkCollision, generateBall, handleReward, rewardLevel, applySurpriseEffect, activeSurpriseEffect]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Update glow animation
    glowAnimationRef.current = (glowAnimationRef.current + 0.1) % (Math.PI * 2);

    // Clear canvas
    ctx.fillStyle = 'oklch(0.145 0 0)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw grid
    ctx.strokeStyle = 'oklch(0.269 0 0)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= GRID_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(i * CELL_SIZE, 0);
      ctx.lineTo(i * CELL_SIZE, CANVAS_HEIGHT);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * CELL_SIZE);
      ctx.lineTo(CANVAS_WIDTH, i * CELL_SIZE);
      ctx.stroke();
    }

    // Draw walls (with special effect if wall-eating mode is active)
    if (activeSurpriseEffect === 'wallEatingMode') {
      // Walls glow green when in wall-eating mode
      const glowIntensity = Math.sin(glowAnimationRef.current) * 0.3 + 0.7;
      ctx.fillStyle = `oklch(${0.65 * glowIntensity} 0.2 145)`;
    } else {
      ctx.fillStyle = 'oklch(0.556 0 0)';
    }
    wallsRef.current.forEach((wall) => {
      ctx.fillRect(wall.x * CELL_SIZE + 1, wall.y * CELL_SIZE + 1, CELL_SIZE - 2, CELL_SIZE - 2);
    });

    // Draw death ball
    if (deathBallRef.current) {
      const deathX = deathBallRef.current.x * CELL_SIZE + CELL_SIZE / 2;
      const deathY = deathBallRef.current.y * CELL_SIZE + CELL_SIZE / 2;
      const deathRadius = CELL_SIZE / 2 - 2;
      
      // Pulsing red glow
      const glowIntensity = Math.sin(glowAnimationRef.current * 3) * 0.4 + 0.8;
      const pulseScale = Math.sin(glowAnimationRef.current * 2) * 0.1 + 1;
      
      // Outer glow
      const deathGradient = ctx.createRadialGradient(deathX, deathY, 0, deathX, deathY, deathRadius * 2.5);
      deathGradient.addColorStop(0, `rgba(220, 38, 38, ${glowIntensity * 0.9})`);
      deathGradient.addColorStop(0.4, `rgba(220, 38, 38, ${glowIntensity * 0.5})`);
      deathGradient.addColorStop(1, 'rgba(220, 38, 38, 0)');
      ctx.fillStyle = deathGradient;
      ctx.beginPath();
      ctx.arc(deathX, deathY, deathRadius * 2.5, 0, Math.PI * 2);
      ctx.fill();
      
      // Inner death ball
      ctx.fillStyle = `oklch(${0.55 * glowIntensity} 0.25 25)`;
      ctx.beginPath();
      ctx.arc(deathX, deathY, deathRadius * 1.3 * pulseScale, 0, Math.PI * 2);
      ctx.fill();
      
      // X symbol with shadow
      ctx.shadowBlur = 4;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      
      const xSize = 10;
      ctx.beginPath();
      ctx.moveTo(deathX - xSize, deathY - xSize);
      ctx.lineTo(deathX + xSize, deathY + xSize);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(deathX + xSize, deathY - xSize);
      ctx.lineTo(deathX - xSize, deathY + xSize);
      ctx.stroke();
      
      ctx.shadowBlur = 0;
    }

    // Draw ball
    const ballX = ballRef.current.x * CELL_SIZE + CELL_SIZE / 2;
    const ballY = ballRef.current.y * CELL_SIZE + CELL_SIZE / 2;
    const ballRadius = CELL_SIZE / 2 - 2;

    if (isSurpriseBallRef.current) {
      // Enhanced surprise ball with pulsing animation and larger glow
      const glowIntensity = Math.sin(glowAnimationRef.current) * 0.4 + 0.8;
      const pulseScale = Math.sin(glowAnimationRef.current * 2) * 0.15 + 1;
      
      // Outer glow (larger and more vibrant)
      const gradient = ctx.createRadialGradient(ballX, ballY, 0, ballX, ballY, ballRadius * 2.5);
      gradient.addColorStop(0, `rgba(138, 43, 226, ${glowIntensity * 0.9})`);
      gradient.addColorStop(0.4, `rgba(138, 43, 226, ${glowIntensity * 0.5})`);
      gradient.addColorStop(1, 'rgba(138, 43, 226, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(ballX, ballY, ballRadius * 2.5, 0, Math.PI * 2);
      ctx.fill();
      
      // Middle glow ring
      const midGradient = ctx.createRadialGradient(ballX, ballY, 0, ballX, ballY, ballRadius * 1.8);
      midGradient.addColorStop(0, `rgba(186, 85, 211, ${glowIntensity * 0.6})`);
      midGradient.addColorStop(1, 'rgba(186, 85, 211, 0)');
      ctx.fillStyle = midGradient;
      ctx.beginPath();
      ctx.arc(ballX, ballY, ballRadius * 1.8, 0, Math.PI * 2);
      ctx.fill();
      
      // Inner surprise ball with pulse
      ctx.fillStyle = `oklch(${0.75 * glowIntensity} 0.28 300)`;
      ctx.beginPath();
      ctx.arc(ballX, ballY, ballRadius * 1.3 * pulseScale, 0, Math.PI * 2);
      ctx.fill();
      
      // Question mark with shadow
      ctx.shadowBlur = 4;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      ctx.fillStyle = 'white';
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('?', ballX, ballY);
      ctx.shadowBlur = 0;
    } else if (isSuperballRef.current) {
      // Superball with glowing effect
      const glowIntensity = Math.sin(glowAnimationRef.current) * 0.3 + 0.7;
      
      // Outer glow
      const gradient = ctx.createRadialGradient(ballX, ballY, 0, ballX, ballY, ballRadius * 2);
      gradient.addColorStop(0, `rgba(255, 215, 0, ${glowIntensity * 0.8})`);
      gradient.addColorStop(0.5, `rgba(255, 215, 0, ${glowIntensity * 0.3})`);
      gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(ballX, ballY, ballRadius * 2, 0, Math.PI * 2);
      ctx.fill();
      
      // Inner superball
      ctx.fillStyle = `oklch(${0.9 * glowIntensity} 0.25 85)`;
      ctx.beginPath();
      ctx.arc(ballX, ballY, ballRadius * 1.2, 0, Math.PI * 2);
      ctx.fill();
      
      // Core
      ctx.fillStyle = 'oklch(0.95 0.15 85)';
      ctx.beginPath();
      ctx.arc(ballX, ballY, ballRadius * 0.6, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Regular ball
      ctx.fillStyle = 'oklch(0.828 0.189 84.429)';
      ctx.beginPath();
      ctx.arc(ballX, ballY, ballRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw snake with visual feedback for active effects
    snakeRef.current.forEach((segment, index) => {
      if (index === 0) {
        // Head
        ctx.fillStyle = 'oklch(0.646 0.222 41.116)';
      } else {
        // Body - use custom color if color change effect is active
        ctx.fillStyle = snakeColor;
        
        // Add glow effect for certain surprise effects
        if (activeSurpriseEffect === 'doubleSize' || activeSurpriseEffect === 'halfSize' || activeSurpriseEffect === 'minimalSize' || activeSurpriseEffect === 'wallEatingMode') {
          const glowIntensity = Math.sin(glowAnimationRef.current) * 0.2 + 0.8;
          ctx.shadowBlur = 10;
          ctx.shadowColor = activeSurpriseEffect === 'wallEatingMode' ? 'oklch(0.65 0.2 145)' : snakeColor;
          ctx.globalAlpha = glowIntensity;
        }
      }
      ctx.fillRect(segment.x * CELL_SIZE + 1, segment.y * CELL_SIZE + 1, CELL_SIZE - 2, CELL_SIZE - 2);
      
      // Reset shadow and alpha
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    });
  }, [activeSurpriseEffect, snakeColor]);

  useEffect(() => {
    if (gameState === 'playing') {
      gameLoopRef.current = window.setInterval(() => {
        gameLoop();
        draw();
      }, speedRef.current);

      ballTimerRef.current = window.setInterval(() => {
        const elapsed = Date.now() - ballTimerStartRef.current;
        const remaining = Math.max(0, BALL_TIMER - elapsed);
        setBallTimer(remaining);

        if (remaining === 0) {
          generateBall();
        }
      }, 100);

      // Death ball despawn timer
      deathBallTimerRef.current = window.setInterval(() => {
        if (deathBallRef.current) {
          const elapsed = Date.now() - deathBallSpawnTimeRef.current;
          if (elapsed >= DEATH_BALL_DESPAWN_TIME) {
            despawnDeathBall();
            toast.info('💀 Death Ball Despawned');
          }
        }
      }, 100);

      return () => {
        if (gameLoopRef.current) clearInterval(gameLoopRef.current);
        if (ballTimerRef.current) clearInterval(ballTimerRef.current);
        if (deathBallTimerRef.current) clearInterval(deathBallTimerRef.current);
      };
    }
  }, [gameState, gameLoop, draw, generateBall, despawnDeathBall]);

  const changeDirection = useCallback((newDirection: Direction) => {
    if (gameState !== 'playing') return;
    
    const currentDirection = directionRef.current;
    let isValid = false;

    switch (newDirection) {
      case 'UP':
        isValid = currentDirection !== 'DOWN';
        break;
      case 'DOWN':
        isValid = currentDirection !== 'UP';
        break;
      case 'LEFT':
        isValid = currentDirection !== 'RIGHT';
        break;
      case 'RIGHT':
        isValid = currentDirection !== 'LEFT';
        break;
    }

    if (isValid) {
      nextDirectionRef.current = newDirection;
    }
  }, [gameState]);

  // Keyboard controls - support both arrow keys and WASD
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (gameState !== 'playing') return;

      const currentDirection = directionRef.current;
      let newDirection: Direction | null = null;

      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          if (currentDirection !== 'DOWN') newDirection = 'UP';
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          if (currentDirection !== 'UP') newDirection = 'DOWN';
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          if (currentDirection !== 'RIGHT') newDirection = 'LEFT';
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          if (currentDirection !== 'LEFT') newDirection = 'RIGHT';
          break;
        case ' ':
          e.preventDefault();
          setGameState((prev) => (prev === 'playing' ? 'paused' : 'playing'));
          break;
      }

      if (newDirection) {
        e.preventDefault();
        nextDirectionRef.current = newDirection;
        // Mark keyboard as active to hide mobile controls
        if (!keyboardActive) {
          setKeyboardActive(true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [gameState, keyboardActive]);

  // Swipe gesture support
  const handleTouchStart = (e: React.TouchEvent) => {
    if (gameState !== 'playing') return;
    const touch = e.touches[0];
    setTouchStartPos({ x: touch.clientX, y: touch.clientY });
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (gameState !== 'playing' || !touchStartPos) return;
    
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartPos.x;
    const deltaY = touch.clientY - touchStartPos.y;
    const minSwipeDistance = 30;

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      // Horizontal swipe
      if (Math.abs(deltaX) > minSwipeDistance) {
        changeDirection(deltaX > 0 ? 'RIGHT' : 'LEFT');
      }
    } else {
      // Vertical swipe
      if (Math.abs(deltaY) > minSwipeDistance) {
        changeDirection(deltaY > 0 ? 'DOWN' : 'UP');
      }
    }

    setTouchStartPos(null);
  };

  useEffect(() => {
    draw();
  }, [draw]);

  const startGame = () => {
    snakeRef.current = [{ x: 10, y: 10 }];
    directionRef.current = 'RIGHT';
    nextDirectionRef.current = 'RIGHT';
    wallsRef.current = [];
    speedRef.current = INITIAL_SPEED;
    originalSpeedRef.current = INITIAL_SPEED;
    originalColorRef.current = 'oklch(0.488 0.243 264.376)';
    originalWallsRef.current = [];
    isSuperballRef.current = false;
    isSurpriseBallRef.current = false;
    ballSpawnCountRef.current = 0;
    surpriseBallsInBatchRef.current = 0;
    deathBallRef.current = null;
    deathBallSpawnTimeRef.current = 0;
    setSnakeColor('oklch(0.488 0.243 264.376)');
    setScore(0);
    setBallsCaught(0);
    setSuperballsCaught(0);
    setSurpriseBallsCaught(0);
    setDeathBallsEncountered(0);
    setIcpEarned(0);
    setRewardLevel(0);
    setBallsForNextReward(10);
    setBallTimer(BALL_TIMER);
    setActiveSurpriseEffect(null);
    if (surpriseEffectTimeoutRef.current) {
      clearTimeout(surpriseEffectTimeoutRef.current);
    }
    generateBall();
    setGameState('playing');
    setShowGameOver(false);
  };

  const togglePause = () => {
    setGameState((prev) => (prev === 'playing' ? 'paused' : 'playing'));
  };

  const handleSaveStats = async () => {
    if (ballsCaught > 0) {
      await updateGameStats.mutateAsync({
        ballsCaught: BigInt(ballsCaught),
        superballsCaught: BigInt(superballsCaught),
        surpriseBallsCaught: BigInt(surpriseBallsCaught),
        deathBallsEncountered: BigInt(deathBallsEncountered),
        icpRewards: BigInt(icpEarned),
      });
    }
  };

  const handleGameOverClose = () => {
    // Close dialog immediately, stats persist until new game starts
    setShowGameOver(false);
    setGameState('idle');
  };

  const ballsNeeded = 10 + rewardLevel;
  const progressInCurrentLevel = ballsCaught % ballsNeeded;
  const progressPercent = (progressInCurrentLevel / ballsNeeded) * 100;

  const getEffectBadgeText = () => {
    switch (activeSurpriseEffect) {
      case 'colorChange': return '🎨 Color';
      case 'doubleSize': return '📈 2x Size';
      case 'halfSize': return '📉 ½ Size';
      case 'slowSpeed': return '🐌 Slow';
      case 'minimalSize': return '🔬 Minimal';
      case 'removeWalls': return '💥 No Walls';
      case 'wallEatingMode': return '🧱 Wall Eater';
      default: return '';
    }
  };

  // Determine if mobile controls should be shown
  const showMobileControls = isTouchDevice && !keyboardActive && gameState === 'playing';

  return (
    <div className="max-w-4xl mx-auto space-y-4 md:space-y-6 px-2 md:px-0">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
        <Card>
          <CardContent className="pt-4 md:pt-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-1 md:gap-0">
              <div className="flex items-center gap-1 md:gap-2">
                <Target className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                <span className="text-xs md:text-sm font-medium text-muted-foreground">Score</span>
              </div>
              <span className="text-xl md:text-2xl font-bold">{score}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 md:pt-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-1 md:gap-0">
              <div className="flex items-center gap-1 md:gap-2">
                <Trophy className="w-4 h-4 md:w-5 md:h-5 text-accent" />
                <span className="text-xs md:text-sm font-medium text-muted-foreground">Balls</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xl md:text-2xl font-bold">{ballsCaught}</span>
                {superballsCaught > 0 && (
                  <Badge variant="outline" className="text-[10px] gap-1">
                    <Sparkles className="w-2 h-2" />
                    {superballsCaught}
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 md:pt-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-1 md:gap-0">
              <div className="flex items-center gap-1 md:gap-2">
                <Trophy className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                <span className="text-xs md:text-sm font-medium text-muted-foreground">ICP</span>
              </div>
              <span className="text-xl md:text-2xl font-bold">{icpEarned}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 md:pt-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-1 md:gap-0">
              <div className="flex items-center gap-1 md:gap-2">
                <Users className="w-4 h-4 md:w-5 md:h-5 text-accent" />
                <span className="text-xs md:text-sm font-medium text-muted-foreground">Online</span>
              </div>
              <span className="text-xl md:text-2xl font-bold">{Number(onlinePlayerCount || 0n)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Card */}
      <Card>
        <CardContent className="pt-4 md:pt-6 space-y-3 md:space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs md:text-sm">
              <span className="text-muted-foreground">Next Reward Progress</span>
              <span className="font-medium">
                {progressInCurrentLevel}/{ballsNeeded} balls
              </span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>
          {gameState === 'playing' && (
            <div className="flex items-center justify-between text-xs md:text-sm flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Timer className="w-3 h-3 md:w-4 md:h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Ball Timer</span>
                {isSuperballRef.current && (
                  <Badge variant="default" className="text-[10px] gap-1">
                    <Sparkles className="w-2 h-2" />
                    Superball!
                  </Badge>
                )}
                {isSurpriseBallRef.current && (
                  <Badge variant="secondary" className="text-[10px] gap-1 animate-pulse">
                    <HelpCircle className="w-2 h-2" />
                    Surprise!
                  </Badge>
                )}
                {deathBallRef.current && (
                  <Badge variant="destructive" className="text-[10px] gap-1 animate-pulse">
                    <Skull className="w-2 h-2" />
                    Death Ball!
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">{(ballTimer / 1000).toFixed(1)}s</Badge>
                {activeSurpriseEffect && (
                  <Badge variant="default" className="text-[10px]">
                    {getEffectBadgeText()}
                  </Badge>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Game Canvas Card */}
      <Card>
        <CardContent className="pt-4 md:pt-6 space-y-3 md:space-y-4">
          <div className="flex justify-center">
            <canvas
              ref={canvasRef}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              className="border border-border rounded-lg max-w-full h-auto"
              style={{ 
                imageRendering: 'pixelated',
                width: '100%',
                maxWidth: `${CANVAS_WIDTH}px`,
                height: 'auto',
                aspectRatio: '1/1'
              }}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            />
          </div>

          {/* Mobile Touch Controls - only shown when touch device and keyboard not active */}
          {showMobileControls && (
            <div className="flex flex-col items-center gap-2">
              <Button
                size="icon"
                variant="outline"
                className="w-14 h-14"
                onTouchStart={(e) => {
                  e.preventDefault();
                  changeDirection('UP');
                }}
              >
                <ArrowUp className="w-6 h-6" />
              </Button>
              <div className="flex gap-2">
                <Button
                  size="icon"
                  variant="outline"
                  className="w-14 h-14"
                  onTouchStart={(e) => {
                    e.preventDefault();
                    changeDirection('LEFT');
                  }}
                >
                  <ArrowLeft className="w-6 h-6" />
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  className="w-14 h-14"
                  onTouchStart={(e) => {
                    e.preventDefault();
                    changeDirection('DOWN');
                  }}
                >
                  <ArrowDown className="w-6 h-6" />
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  className="w-14 h-14"
                  onTouchStart={(e) => {
                    e.preventDefault();
                    changeDirection('RIGHT');
                  }}
                >
                  <ArrowRight className="w-6 h-6" />
                </Button>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2 justify-center">
            {gameState === 'idle' || gameState === 'gameover' ? (
              <Button onClick={startGame} className="gap-2 flex-1 md:flex-initial min-w-[140px]">
                <Play className="w-4 h-4" />
                {gameState === 'gameover' ? 'Start Over' : 'Start Game'}
              </Button>
            ) : (
              <>
                <Button onClick={togglePause} variant="outline" className="gap-2 flex-1 md:flex-initial min-w-[120px]">
                  {gameState === 'paused' ? (
                    <>
                      <Play className="w-4 h-4" />
                      Resume
                    </>
                  ) : (
                    <>
                      <Pause className="w-4 h-4" />
                      Pause
                    </>
                  )}
                </Button>
                <Button onClick={startGame} variant="outline" className="gap-2 flex-1 md:flex-initial min-w-[120px]">
                  <RotateCcw className="w-4 h-4" />
                  Start Over
                </Button>
              </>
            )}
          </div>
          <div className="text-center text-xs md:text-sm text-muted-foreground space-y-1">
            {keyboardActive ? (
              <>
                <p>Use Arrow Keys or WASD to control the snake</p>
                <p>✨ Gold glow = 3x growth | 🟣 Question mark = Random surprise!</p>
                <p className="text-destructive">💀 Red X = Death Ball - Avoid or game over!</p>
                <p className="text-accent">💡 At least 1 surprise ball every 5 regular balls!</p>
                <p className="text-primary">🧱 Wall-eating mode lets you pass through and eat walls!</p>
              </>
            ) : isTouchDevice ? (
              <>
                <p>Use on-screen buttons or swipe to control the snake</p>
                <p>✨ Gold glow = 3x growth | 🟣 Question mark = Random surprise!</p>
                <p className="text-destructive">💀 Red X = Death Ball - Avoid or game over!</p>
                <p className="text-accent">💡 At least 1 surprise ball every 5 regular balls!</p>
                <p className="text-primary">🧱 Wall-eating mode lets you pass through and eat walls!</p>
              </>
            ) : (
              <>
                <p>Use Arrow Keys or WASD to control the snake</p>
                <p>✨ Gold glow = 3x growth | 🟣 Question mark = Random surprise!</p>
                <p className="text-destructive">💀 Red X = Death Ball - Avoid or game over!</p>
                <p className="text-accent">💡 At least 1 surprise ball every 5 regular balls!</p>
                <p className="text-primary">🧱 Wall-eating mode lets you pass through and eat walls!</p>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <GameOverDialog
        open={showGameOver}
        onClose={handleGameOverClose}
        score={score}
        ballsCaught={ballsCaught}
        icpEarned={icpEarned}
        onSaveStats={handleSaveStats}
      />
    </div>
  );
}
