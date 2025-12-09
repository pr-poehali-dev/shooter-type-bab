import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import Icon from '@/components/ui/icon';

type Difficulty = 'easy' | 'normal' | 'hard';
type GameState = 'menu' | 'playing' | 'gameover' | 'victory';
type WeaponType = 'pistol' | 'rifle' | 'knife';
type OutfitType = 'soldier' | 'medic' | 'sniper';

interface Outfit {
  type: OutfitType;
  name: string;
  color: string;
  healthBonus: number;
  speedBonus: number;
  damageBonus: number;
}

interface Ally {
  id: number;
  x: number;
  y: number;
  health: number;
  maxHealth: number;
  isDowned: boolean;
  reviveProgress: number;
}

interface Weapon {
  type: WeaponType;
  name: string;
  damage: number;
  fireRate: number;
  ammoCapacity: number;
  reloadTime: number;
  range: number;
  spread: number;
  icon: string;
}

interface Enemy {
  id: number;
  x: number;
  y: number;
  health: number;
  speed: number;
  state: 'patrol' | 'attack' | 'cover';
  direction: number;
  lastShot: number;
}

interface Bullet {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  isPlayer: boolean;
}

const Index = () => {
  const [gameState, setGameState] = useState<GameState>('menu');
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [playerHealth, setPlayerHealth] = useState(100);
  const [ammo, setAmmo] = useState(30);
  const [currentWeapon, setCurrentWeapon] = useState<WeaponType>('pistol');
  const [currentOutfit, setCurrentOutfit] = useState<OutfitType>('soldier');
  const [allies, setAllies] = useState<Ally[]>([]);
  const [isReviving, setIsReviving] = useState(false);
  const [revivingAllyId, setRevivingAllyId] = useState<number | null>(null);
  const allyIdRef = useRef(0);
  const [score, setScore] = useState(0);
  const [wave, setWave] = useState(1);
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [bullets, setBullets] = useState<Bullet[]>([]);
  const [isReloading, setIsReloading] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const bulletIdRef = useRef(0);
  const enemyIdRef = useRef(0);
  const lastShotTime = useRef(0);

  const outfits: Record<OutfitType, Outfit> = {
    soldier: {
      type: 'soldier',
      name: 'Солдат',
      color: 'bg-green-700',
      healthBonus: 0,
      speedBonus: 0,
      damageBonus: 0
    },
    medic: {
      type: 'medic',
      name: 'Медик',
      color: 'bg-blue-600',
      healthBonus: 50,
      speedBonus: 0,
      damageBonus: -10
    },
    sniper: {
      type: 'sniper',
      name: 'Снайпер',
      color: 'bg-purple-700',
      healthBonus: -20,
      speedBonus: 0,
      damageBonus: 30
    }
  };

  const weapons: Record<WeaponType, Weapon> = {
    pistol: {
      type: 'pistol',
      name: 'Пистолет',
      damage: 50,
      fireRate: 500,
      ammoCapacity: 12,
      reloadTime: 1500,
      range: 400,
      spread: 0.05,
      icon: 'Crosshair'
    },
    rifle: {
      type: 'rifle',
      name: 'Автомат',
      damage: 35,
      fireRate: 150,
      ammoCapacity: 30,
      reloadTime: 2500,
      range: 600,
      spread: 0.12,
      icon: 'Target'
    },
    knife: {
      type: 'knife',
      name: 'Нож',
      damage: 100,
      fireRate: 300,
      ammoCapacity: 999,
      reloadTime: 0,
      range: 100,
      spread: 0,
      icon: 'Sword'
    }
  };

  const difficultySettings = {
    easy: { enemyHealth: 50, enemySpeed: 1, enemyDamage: 5, enemiesPerWave: 3 },
    normal: { enemyHealth: 100, enemySpeed: 1.5, enemyDamage: 10, enemiesPerWave: 5 },
    hard: { enemyHealth: 150, enemySpeed: 2, enemyDamage: 15, enemiesPerWave: 7 }
  };

  const startGame = (diff: Difficulty) => {
    setDifficulty(diff);
    setGameState('playing');
    const baseHealth = 100 + outfits[currentOutfit].healthBonus;
    setPlayerHealth(baseHealth);
    setCurrentWeapon('pistol');
    setAmmo(weapons.pistol.ammoCapacity);
    setScore(0);
    setWave(1);
    setEnemies([]);
    setBullets([]);
    spawnAllies();
    spawnWave(1, diff);
  };

  const spawnAllies = () => {
    const newAllies: Ally[] = [
      { id: allyIdRef.current++, x: 350, y: 520, health: 100, maxHealth: 100, isDowned: false, reviveProgress: 0 },
      { id: allyIdRef.current++, x: 450, y: 520, health: 100, maxHealth: 100, isDowned: false, reviveProgress: 0 }
    ];
    setAllies(newAllies);
  };

  const spawnWave = (waveNum: number, diff: Difficulty) => {
    const settings = difficultySettings[diff];
    const enemyCount = settings.enemiesPerWave + Math.floor(waveNum / 2);
    const newEnemies: Enemy[] = [];

    for (let i = 0; i < enemyCount; i++) {
      newEnemies.push({
        id: enemyIdRef.current++,
        x: Math.random() * 800,
        y: Math.random() * 200,
        health: settings.enemyHealth,
        speed: settings.enemySpeed,
        state: 'patrol',
        direction: Math.random() * Math.PI * 2,
        lastShot: 0
      });
    }

    setEnemies(newEnemies);
  };

  const shoot = (targetX: number, targetY: number) => {
    if (isReviving) return;
    
    const weapon = weapons[currentWeapon];
    const damageMultiplier = 1 + (outfits[currentOutfit].damageBonus / 100);
    const now = Date.now();
    
    if (now - lastShotTime.current < weapon.fireRate) return;
    if (weapon.type !== 'knife' && (ammo <= 0 || isReloading)) return;

    lastShotTime.current = now;

    const centerX = 400;
    const centerY = 500;
    const angle = Math.atan2(targetY - centerY, targetX - centerX);
    const dist = Math.sqrt(Math.pow(targetX - centerX, 2) + Math.pow(targetY - centerY, 2));

    if (weapon.type === 'knife') {
      if (dist > weapon.range) return;
      
      setEnemies(prev => {
        return prev.map(enemy => {
          const enemyDist = Math.sqrt(
            Math.pow(enemy.x - centerX, 2) + Math.pow(enemy.y - centerY, 2)
          );
          
          const enemyAngle = Math.atan2(enemy.y - centerY, enemy.x - centerX);
          const angleDiff = Math.abs(angle - enemyAngle);
          
          if (enemyDist < weapon.range && angleDiff < 0.5) {
            const finalDamage = Math.round(weapon.damage * damageMultiplier);
            const newHealth = enemy.health - finalDamage;
            if (newHealth <= 0) {
              setScore(s => s + 150);
              return { ...enemy, health: 0 };
            }
            return { ...enemy, health: newHealth };
          }
          return enemy;
        }).filter(e => e.health > 0);
      });
      return;
    }

    const spread = (Math.random() - 0.5) * weapon.spread;
    const bulletSpeed = weapon.type === 'rifle' ? 12 : 10;

    setBullets(prev => [...prev, {
      id: bulletIdRef.current++,
      x: centerX,
      y: centerY,
      vx: Math.cos(angle + spread) * bulletSpeed,
      vy: Math.sin(angle + spread) * bulletSpeed,
      isPlayer: true
    }]);

    setAmmo(prev => prev - 1);
  };

  const reload = () => {
    const weapon = weapons[currentWeapon];
    if (isReloading || weapon.type === 'knife' || ammo === weapon.ammoCapacity) return;
    setIsReloading(true);
    setTimeout(() => {
      setAmmo(weapon.ammoCapacity);
      setIsReloading(false);
    }, weapon.reloadTime);
  };

  const switchWeapon = (weaponType: WeaponType) => {
    if (isReloading) return;
    setCurrentWeapon(weaponType);
    setAmmo(weapons[weaponType].ammoCapacity);
  };

  useEffect(() => {
    if (gameState !== 'playing') return;

    const interval = setInterval(() => {
      // Update bullets
      setBullets(prev => {
        return prev
          .map(b => ({
            ...b,
            x: b.x + b.vx,
            y: b.y + b.vy
          }))
          .filter(b => b.x >= 0 && b.x <= 800 && b.y >= 0 && b.y <= 600);
      });

      // Update enemies AI
      setEnemies(prev => {
        const now = Date.now();
        return prev.map(enemy => {
          const distToPlayer = Math.sqrt(
            Math.pow(enemy.x - 400, 2) + Math.pow(enemy.y - 500, 2)
          );

          let newState = enemy.state;
          let newDirection = enemy.direction;

          // AI decision making
          if (distToPlayer < 200) {
            newState = 'attack';
            newDirection = Math.atan2(500 - enemy.y, 400 - enemy.x);
          } else if (distToPlayer < 300) {
            newState = 'cover';
          } else {
            newState = 'patrol';
            if (Math.random() < 0.02) {
              newDirection = Math.random() * Math.PI * 2;
            }
          }

          // Enemy shooting
          if (newState === 'attack' && now - enemy.lastShot > 1500) {
            const angle = Math.atan2(500 - enemy.y, 400 - enemy.x);
            setBullets(b => [...b, {
              id: bulletIdRef.current++,
              x: enemy.x,
              y: enemy.y,
              vx: Math.cos(angle) * 8,
              vy: Math.sin(angle) * 8,
              isPlayer: false
            }]);
            return { ...enemy, lastShot: now };
          }

          // Move enemy
          const moveSpeed = newState === 'attack' ? enemy.speed * 1.2 : enemy.speed;
          return {
            ...enemy,
            state: newState,
            direction: newDirection,
            x: Math.max(0, Math.min(800, enemy.x + Math.cos(newDirection) * moveSpeed)),
            y: Math.max(0, Math.min(400, enemy.y + Math.sin(newDirection) * moveSpeed))
          };
        });
      });

      // Collision detection
      setBullets(prevBullets => {
        const remainingBullets = [...prevBullets];

        prevBullets.forEach(bullet => {
          if (bullet.isPlayer) {
            setEnemies(prevEnemies => {
              return prevEnemies.map(enemy => {
                const dist = Math.sqrt(
                  Math.pow(bullet.x - enemy.x, 2) + Math.pow(bullet.y - enemy.y, 2)
                );
                if (dist < 30) {
                  const weapon = weapons[currentWeapon];
                  const damageMultiplier = 1 + (outfits[currentOutfit].damageBonus / 100);
                  const finalDamage = Math.round(weapon.damage * damageMultiplier);
                  const newHealth = enemy.health - finalDamage;
                  if (newHealth <= 0) {
                    setScore(s => s + 100);
                    remainingBullets.splice(remainingBullets.indexOf(bullet), 1);
                    return { ...enemy, health: 0 };
                  }
                  remainingBullets.splice(remainingBullets.indexOf(bullet), 1);
                  return { ...enemy, health: newHealth };
                }
                return enemy;
              }).filter(e => e.health > 0);
            });
          } else {
            const distToPlayer = Math.sqrt(
              Math.pow(bullet.x - 400, 2) + Math.pow(bullet.y - 500, 2)
            );
            if (distToPlayer < 30) {
              setPlayerHealth(h => {
                const newHealth = h - difficultySettings[difficulty].enemyDamage;
                if (newHealth <= 0) {
                  setGameState('gameover');
                }
                return Math.max(0, newHealth);
              });
              remainingBullets.splice(remainingBullets.indexOf(bullet), 1);
            }
            
            setAllies(prevAllies => {
              return prevAllies.map(ally => {
                if (ally.isDowned) return ally;
                const distToAlly = Math.sqrt(
                  Math.pow(bullet.x - ally.x, 2) + Math.pow(bullet.y - ally.y, 2)
                );
                if (distToAlly < 25) {
                  const newHealth = ally.health - difficultySettings[difficulty].enemyDamage;
                  if (newHealth <= 0) {
                    remainingBullets.splice(remainingBullets.indexOf(bullet), 1);
                    return { ...ally, health: 0, isDowned: true, reviveProgress: 0 };
                  }
                  remainingBullets.splice(remainingBullets.indexOf(bullet), 1);
                  return { ...ally, health: newHealth };
                }
                return ally;
              });
            });
          }
        });

        return remainingBullets;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [gameState, difficulty]);

  useEffect(() => {
    if (gameState === 'playing' && enemies.length === 0 && wave > 0) {
      setTimeout(() => {
        const nextWave = wave + 1;
        setWave(nextWave);
        spawnWave(nextWave, difficulty);
        setScore(s => s + 500);
      }, 2000);
    }
  }, [enemies, gameState, wave, difficulty]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (gameState !== 'playing') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const downedAlly = allies.find(ally => {
      const dist = Math.sqrt(Math.pow(x - ally.x, 2) + Math.pow(y - ally.y, 2));
      return ally.isDowned && dist < 50;
    });
    
    if (downedAlly && currentOutfit === 'medic') {
      startRevive(downedAlly.id);
      return;
    }
    
    shoot(x, y);
  };

  const startRevive = (allyId: number) => {
    if (isReviving) return;
    setIsReviving(true);
    setRevivingAllyId(allyId);
    
    const reviveInterval = setInterval(() => {
      setAllies(prev => prev.map(ally => {
        if (ally.id === allyId) {
          const newProgress = Math.min(100, ally.reviveProgress + 10);
          if (newProgress >= 100) {
            clearInterval(reviveInterval);
            setIsReviving(false);
            setRevivingAllyId(null);
            setScore(s => s + 200);
            return { ...ally, isDowned: false, health: ally.maxHealth, reviveProgress: 0 };
          }
          return { ...ally, reviveProgress: newProgress };
        }
        return ally;
      }));
    }, 200);
    
    setTimeout(() => {
      clearInterval(reviveInterval);
      setIsReviving(false);
      setRevivingAllyId(null);
    }, 2000);
  };

  if (gameState === 'menu') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <Card className="p-8 bg-slate-800/90 border-slate-700 max-w-2xl w-full backdrop-blur">
          <div className="text-center space-y-8">
            <div>
              <h1 className="text-6xl font-bold text-white mb-2" style={{ fontFamily: 'Oswald, sans-serif' }}>
                TACTICAL OPS
              </h1>
              <p className="text-slate-400 text-lg">Одиночная кампания</p>
            </div>

            <div className="space-y-4">
              <h2 className="text-2xl font-semibold text-white mb-4">Выбери одежду</h2>
              <div className="grid grid-cols-3 gap-3 mb-6">
                <Button
                  onClick={() => setCurrentOutfit('soldier')}
                  variant={currentOutfit === 'soldier' ? 'default' : 'outline'}
                  className={`h-20 flex-col ${currentOutfit === 'soldier' ? 'bg-green-700' : 'border-slate-600'}`}
                >
                  <Icon name="User" size={24} className="mb-1" />
                  <span className="font-bold">Солдат</span>
                  <span className="text-xs opacity-75">Баланс</span>
                </Button>
                <Button
                  onClick={() => setCurrentOutfit('medic')}
                  variant={currentOutfit === 'medic' ? 'default' : 'outline'}
                  className={`h-20 flex-col ${currentOutfit === 'medic' ? 'bg-blue-600' : 'border-slate-600'}`}
                >
                  <Icon name="HeartPulse" size={24} className="mb-1" />
                  <span className="font-bold">Медик</span>
                  <span className="text-xs opacity-75">+50 HP</span>
                </Button>
                <Button
                  onClick={() => setCurrentOutfit('sniper')}
                  variant={currentOutfit === 'sniper' ? 'default' : 'outline'}
                  className={`h-20 flex-col ${currentOutfit === 'sniper' ? 'bg-purple-700' : 'border-slate-600'}`}
                >
                  <Icon name="Scope" size={24} className="mb-1" />
                  <span className="font-bold">Снайпер</span>
                  <span className="text-xs opacity-75">+30% урон</span>
                </Button>
              </div>
              
              <h2 className="text-2xl font-semibold text-white mb-4">Выбери сложность</h2>
              
              <Button
                onClick={() => startGame('easy')}
                className="w-full h-16 bg-blue-600 hover:bg-blue-700 text-xl"
              >
                <Icon name="Shield" className="mr-3" size={24} />
                ЛЕГКО
                <span className="ml-auto text-sm opacity-75">3 врага / меньше урона</span>
              </Button>

              <Button
                onClick={() => startGame('normal')}
                className="w-full h-16 bg-orange-600 hover:bg-orange-700 text-xl"
              >
                <Icon name="Target" className="mr-3" size={24} />
                НОРМАЛЬНО
                <span className="ml-auto text-sm opacity-75">5 врагов / средний урон</span>
              </Button>

              <Button
                onClick={() => startGame('hard')}
                className="w-full h-16 bg-red-600 hover:bg-red-700 text-xl"
              >
                <Icon name="Skull" className="mr-3" size={24} />
                СЛОЖНО
                <span className="ml-auto text-sm opacity-75">7+ врагов / высокий урон</span>
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 text-left text-sm text-slate-300">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Icon name="Brain" size={16} className="text-purple-400" />
                  <span>Умный AI врагов</span>
                </div>
                <div className="flex items-center gap-2">
                  <Icon name="Waves" size={16} className="text-blue-400" />
                  <span>Волновая система</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Icon name="Crosshair" size={16} className="text-red-400" />
                  <span>Реалистичная физика</span>
                </div>
                <div className="flex items-center gap-2">
                  <Icon name="TrendingUp" size={16} className="text-green-400" />
                  <span>Прогрессия сложности</span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (gameState === 'gameover') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-red-950 via-slate-900 to-slate-900 flex items-center justify-center p-4">
        <Card className="p-8 bg-slate-800/90 border-red-900 max-w-md w-full backdrop-blur text-center space-y-6">
          <Icon name="Skull" size={64} className="mx-auto text-red-500" />
          <h1 className="text-4xl font-bold text-white" style={{ fontFamily: 'Oswald, sans-serif' }}>
            ПОРАЖЕНИЕ
          </h1>
          <div className="space-y-2 text-slate-300">
            <p className="text-xl">Счет: <span className="text-white font-bold">{score}</span></p>
            <p className="text-lg">Волна: {wave}</p>
          </div>
          <Button
            onClick={() => setGameState('menu')}
            className="w-full h-12 bg-red-600 hover:bg-red-700"
          >
            В главное меню
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
      {/* HUD */}
      <div className="w-full max-w-4xl mb-4 space-y-2">
        <div className="flex justify-between items-center text-white">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Icon name="Heart" size={20} className="text-red-500" />
              <span className="font-bold">{playerHealth}</span>
            </div>
            <div className="flex items-center gap-2">
              <Icon name="Crosshair" size={20} className="text-orange-500" />
              <span className="font-bold">{currentWeapon === 'knife' ? '∞' : `${ammo}/${weapons[currentWeapon].ammoCapacity}`}</span>
              {isReloading && <span className="text-sm text-yellow-500 animate-pulse">(перезарядка...)</span>}
            </div>
            <div className="flex items-center gap-2 bg-slate-800 px-3 py-1 rounded">
              <Icon name={weapons[currentWeapon].icon as any} size={20} className="text-blue-400" />
              <span className="font-bold text-sm">{weapons[currentWeapon].name}</span>
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold" style={{ fontFamily: 'Oswald, sans-serif' }}>
              ВОЛНА {wave}
            </div>
            <div className="text-sm text-slate-400">Врагов: {enemies.length}</div>
          </div>

          <div className="text-right">
            <div className="text-2xl font-bold text-yellow-500">{score}</div>
            <div className="text-xs text-slate-400">СЧЕТ</div>
          </div>
        </div>

        <Progress value={playerHealth} className="h-2" />
      </div>

      {/* Game Canvas */}
      <Card 
        ref={canvasRef}
        onClick={handleCanvasClick}
        className="relative w-full max-w-4xl aspect-[4/3] border-slate-600 overflow-hidden cursor-crosshair"
        style={{
          background: 'linear-gradient(to bottom, #1e293b 0%, #334155 30%, #475569 60%, #64748b 100%)',
          backgroundImage: `
            linear-gradient(to bottom, #1e293b 0%, #334155 30%, #475569 60%, #64748b 100%),
            repeating-linear-gradient(90deg, transparent 0, transparent 40px, rgba(255,255,255,0.03) 40px, rgba(255,255,255,0.03) 80px),
            repeating-linear-gradient(0deg, transparent 0, transparent 40px, rgba(255,255,255,0.03) 40px, rgba(255,255,255,0.03) 80px)
          `
        }}
      >
        {/* Airplane fuselage sections */}
        <div className="absolute top-0 left-0 right-0 h-24 bg-slate-700/40 border-b-2 border-slate-500" style={{boxShadow: 'inset 0 -10px 20px rgba(0,0,0,0.3)'}} />
        <div className="absolute top-24 left-10 right-10 h-12 bg-slate-600/30 rounded-t-full" />
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-slate-800/40 border-t-2 border-slate-600" style={{boxShadow: 'inset 0 10px 20px rgba(0,0,0,0.3)'}} />
        
        {/* Windows on sides */}
        {[...Array(8)].map((_, i) => (
          <div 
            key={`window-${i}`}
            className="absolute w-16 h-12 bg-sky-900/30 border border-slate-500 rounded-lg"
            style={{
              left: i < 4 ? '20px' : 'auto',
              right: i >= 4 ? '20px' : 'auto',
              top: `${100 + i % 4 * 80}px`,
              boxShadow: 'inset 0 0 10px rgba(56, 189, 248, 0.2)'
            }}
          />
        ))}
        
        {/* Cargo boxes */}
        <div className="absolute top-40 left-1/4 w-16 h-16 bg-amber-900/50 border-2 border-amber-700" style={{transform: 'rotate(5deg)'}} />
        <div className="absolute top-50 right-1/4 w-20 h-20 bg-amber-900/50 border-2 border-amber-700" style={{transform: 'rotate(-8deg)'}} />
        
        {/* Allies */}
        {allies.map(ally => (
          <div
            key={ally.id}
            className="absolute transition-all duration-100"
            style={{
              left: `${ally.x}px`,
              top: `${ally.y}px`,
              transform: 'translate(-50%, -50%)'
            }}
          >
            <div className="relative">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                ally.isDowned 
                  ? 'bg-red-900 border-red-700 opacity-60' 
                  : 'bg-green-600 border-green-400'
              }`}>
                <Icon name={ally.isDowned ? 'HeartCrack' : 'UserCheck'} size={20} className="text-white" />
              </div>
              {!ally.isDowned && (
                <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-10 h-1 bg-slate-900 rounded">
                  <div 
                    className="h-full bg-green-500 rounded transition-all"
                    style={{ width: `${(ally.health / ally.maxHealth) * 100}%` }}
                  />
                </div>
              )}
              {ally.isDowned && currentOutfit === 'medic' && (
                <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                  <div className="text-xs text-yellow-400 bg-black/70 px-2 py-1 rounded animate-pulse">
                    Возродить
                  </div>
                </div>
              )}
              {ally.isDowned && ally.reviveProgress > 0 && (
                <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 w-12 h-1 bg-slate-900 rounded">
                  <div 
                    className="h-full bg-blue-500 rounded transition-all"
                    style={{ width: `${ally.reviveProgress}%` }}
                  />
                </div>
              )}
            </div>
          </div>
        ))}
      >
        {/* Enemies */}
        {enemies.map(enemy => (
          <div
            key={enemy.id}
            className="absolute transition-all duration-100"
            style={{
              left: `${enemy.x}px`,
              top: `${enemy.y}px`,
              transform: 'translate(-50%, -50%)'
            }}
          >
            <div className={`relative ${
              enemy.state === 'attack' ? 'animate-pulse' : ''
            }`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                enemy.state === 'attack' ? 'bg-red-600' : 
                enemy.state === 'cover' ? 'bg-yellow-600' : 'bg-slate-600'
              }`}>
                <Icon name="User" size={20} className="text-white" />
              </div>
              <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-10 h-1 bg-slate-900 rounded">
                <div 
                  className="h-full bg-red-500 rounded transition-all"
                  style={{ width: `${(enemy.health / difficultySettings[difficulty].enemyHealth) * 100}%` }}
                />
              </div>
            </div>
          </div>
        ))}

        {/* Bullets */}
        {bullets.map(bullet => (
          <div
            key={bullet.id}
            className="absolute w-2 h-2 rounded-full"
            style={{
              left: `${bullet.x}px`,
              top: `${bullet.y}px`,
              backgroundColor: bullet.isPlayer ? '#F97316' : '#ef4444',
              boxShadow: bullet.isPlayer ? '0 0 8px #F97316' : '0 0 8px #ef4444'
            }}
          />
        ))}

        {/* Player */}
        <div
          className="absolute bottom-4 left-1/2 transform -translate-x-1/2"
        >
          <div className="relative">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${outfits[currentOutfit].color} ${
              currentOutfit === 'soldier' ? 'border-green-400' :
              currentOutfit === 'medic' ? 'border-blue-400' : 'border-purple-400'
            }`}>
              <Icon name="User" size={24} className="text-white" />
            </div>
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center">
              <Icon name="Crosshair" size={12} className="text-white" />
            </div>
          </div>
        </div>

        {/* Hints */}
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 text-center space-y-1">
          <div className="text-white text-sm bg-black/50 px-3 py-1 rounded">
            {isReviving ? '⚕️ Возрождение...' : 'Кликай для стрельбы'}
          </div>
          {currentOutfit === 'medic' && allies.some(a => a.isDowned) && (
            <div className="text-yellow-400 text-xs bg-black/70 px-2 py-1 rounded animate-pulse">
              Кликни на раненого союзника для возрождения
            </div>
          )}
        </div>
      </Card>

      {/* Weapon Selection */}
      <div className="mt-4 flex gap-3">
        <Button
          onClick={() => switchWeapon('pistol')}
          variant={currentWeapon === 'pistol' ? 'default' : 'outline'}
          className={`h-14 ${currentWeapon === 'pistol' ? 'bg-blue-600 hover:bg-blue-700' : 'border-slate-600'}`}
        >
          <Icon name="Crosshair" className="mr-2" size={20} />
          Пистолет
          <span className="ml-2 text-xs opacity-75">12 патронов</span>
        </Button>
        <Button
          onClick={() => switchWeapon('rifle')}
          variant={currentWeapon === 'rifle' ? 'default' : 'outline'}
          className={`h-14 ${currentWeapon === 'rifle' ? 'bg-orange-600 hover:bg-orange-700' : 'border-slate-600'}`}
        >
          <Icon name="Target" className="mr-2" size={20} />
          Автомат
          <span className="ml-2 text-xs opacity-75">30 патронов</span>
        </Button>
        <Button
          onClick={() => switchWeapon('knife')}
          variant={currentWeapon === 'knife' ? 'default' : 'outline'}
          className={`h-14 ${currentWeapon === 'knife' ? 'bg-red-600 hover:bg-red-700' : 'border-slate-600'}`}
        >
          <Icon name="Sword" className="mr-2" size={20} />
          Нож
          <span className="ml-2 text-xs opacity-75">ближний бой</span>
        </Button>
      </div>

      {/* Controls */}
      <div className="mt-3 flex gap-4">
        <Button 
          onClick={reload}
          disabled={isReloading || currentWeapon === 'knife' || ammo === weapons[currentWeapon].ammoCapacity}
          className="bg-slate-700 hover:bg-slate-600"
        >
          <Icon name="RotateCw" className="mr-2" />
          Перезарядка
        </Button>
        <Button 
          onClick={() => setGameState('menu')}
          variant="outline"
          className="border-slate-600"
        >
          <Icon name="Home" className="mr-2" />
          Меню
        </Button>
      </div>
    </div>
  );
};

export default Index;