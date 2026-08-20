import type { GameSprite, GameSpeed } from '@/config/invitation.config';

/**
 * "떨어지는 일홍이 받기" 캔버스 미니게임 엔진.
 * React에 의존하지 않는 순수 클래스 — 컴포넌트는 start()/destroy()와
 * onGameOver 콜백만 사용합니다. (원본 DCLogic의 게임 로직을 이식)
 */

interface FallingItem {
  x: number;
  y: number;
  vy: number;
  sway: number;
  spin: number;
  rot: number;
  kind: 'good' | 'bad';
  /** 받아야 하는 것의 그림 — 아이콘이면 `img` 가 없습니다 */
  sprite: Sprite;
  /** 피해야 하는 것(벌) */
  e: string;
}

/**
 * 그릴 준비가 된 그림.
 *
 * 이모지는 폰트로 바로 그리고, 사진은 `Image` 를 미리 만들어 둡니다 —
 * 프레임 안에서 `new Image()` 를 하면 첫 낙하가 빈칸으로 떨어집니다.
 */
type Sprite = { kind: 'emoji'; value: string } | { kind: 'image'; img: HTMLImageElement };

interface FloatingText {
  x: number;
  y: number;
  c: string;
  s: string;
  life: number;
}

export interface GameResult {
  score: number;
  caught: number;
}

export interface CatchGameOptions {
  canvas: HTMLCanvasElement;
  /** 떨어질 것 — 아이콘·사진을 섞을 수 있습니다 */
  fallingItems: GameSprite[];
  speed: GameSpeed;
  onGameOver: (result: GameResult) => void;
}

export class CatchGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null = null;
  private speed: GameSpeed;
  private onGameOver: (result: GameResult) => void;
  private sprites: Sprite[];
  /** 상단 '받은 개수' 옆 아이콘 — 고른 아이콘을 따라갑니다 (사진만 골랐으면 강아지) */
  private countIcon: string;

  private W = 340;
  private H = 440;
  private items: FallingItem[] = [];
  private fx: FloatingText[] = [];
  private dog = { x: 170, tx: 170 };
  private hp = 100;
  private elapsed = 0;
  private caught = 0;
  private lastSpawn = 0;
  private last = 0;
  private running = false;
  private raf = 0;

  constructor(opts: CatchGameOptions) {
    this.canvas = opts.canvas;
    this.speed = opts.speed;
    this.onGameOver = opts.onGameOver;
    this.sprites = opts.fallingItems.map((it) => {
      if (it.kind === 'emoji') return { kind: 'emoji' as const, value: it.value };
      const img = new Image();
      img.src = it.src;
      return { kind: 'image' as const, img };
    });

    const firstEmoji = this.sprites.find((s): s is { kind: 'emoji'; value: string } => s.kind === 'emoji');
    this.countIcon = firstEmoji?.value ?? '🐶';

    this.canvas.addEventListener('pointerdown', this.onPointer);
    this.canvas.addEventListener('pointermove', this.onPointer);
    this.canvas.addEventListener('touchstart', this.onPointer, { passive: true });
    this.canvas.addEventListener('touchmove', this.onPointer, { passive: true });
  }

  private speedFactor(): number {
    return this.speed === 'easy' ? 0.8 : this.speed === 'hard' ? 1.3 : 1;
  }

  /** 새 라운드 시작 */
  start(): void {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.W = rect.width || 340;
    this.H = rect.height || 440;
    this.canvas.width = this.W * dpr;
    this.canvas.height = this.H * dpr;
    this.ctx = this.canvas.getContext('2d');
    this.ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);

    this.items = [];
    this.fx = [];
    this.dog = { x: this.W / 2, tx: this.W / 2 };
    this.hp = 100;
    this.elapsed = 0;
    this.caught = 0;
    this.lastSpawn = 0;
    this.last = performance.now();
    this.running = true;

    this.draw();
    cancelAnimationFrame(this.raf);
    this.raf = requestAnimationFrame(this.loop);
  }

  /** 루프 정지 (게임오버/언마운트 시) */
  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  /** 리스너까지 정리 */
  destroy(): void {
    this.stop();
    this.canvas.removeEventListener('pointerdown', this.onPointer);
    this.canvas.removeEventListener('pointermove', this.onPointer);
    this.canvas.removeEventListener('touchstart', this.onPointer);
    this.canvas.removeEventListener('touchmove', this.onPointer);
  }

  private onPointer = (e: PointerEvent | TouchEvent): void => {
    if (!this.running) return;
    const rect = this.canvas.getBoundingClientRect();
    const clientX =
      'touches' in e && e.touches[0]
        ? e.touches[0].clientX
        : (e as PointerEvent).clientX;
    const cx = clientX - rect.left;
    this.dog.tx = Math.max(28, Math.min((this.W || rect.width) - 28, cx));
  };

  private loop = (t: number): void => {
    if (!this.running) return;
    const dt = Math.min(48, t - this.last) / 1000;
    this.last = t;
    this.elapsed += dt;
    const sf = this.speedFactor();

    this.lastSpawn += dt * 1000;
    const interval = Math.max(360, 880 - this.elapsed * 9) / sf;
    if (this.lastSpawn > interval) {
      this.lastSpawn = 0;
      this.spawn(sf);
    }

    this.hp -= (2 + this.elapsed * 0.18) * dt;
    for (const it of this.items) {
      it.y += it.vy * dt;
      it.x += it.sway * Math.sin(it.y / 34) * dt;
      it.rot = (it.rot || 0) + it.spin * dt;
    }
    this.dog.x += (this.dog.tx - this.dog.x) * Math.min(1, dt * 13);

    const dy = this.H - 50;
    const survivors: FallingItem[] = [];
    for (const it of this.items) {
      if (it.y > dy - 34 && it.y < dy + 26 && Math.abs(it.x - this.dog.x) < 58) {
        if (it.kind === 'good') {
          this.caught++;
          this.hp = Math.min(100, this.hp + 8);
          this.fx.push({ x: it.x, y: it.y, c: '#A65A6E', s: '+8', life: 0.6 });
        } else {
          this.hp -= 20;
          this.fx.push({ x: it.x, y: it.y, c: '#3b6fd0', s: '벌!', life: 0.6 });
        }
        continue;
      }
      if (it.y > this.H + 34) {
        if (it.kind === 'good') this.hp -= 13;
        continue;
      }
      survivors.push(it);
    }
    this.items = survivors;

    if (this.hp <= 0) {
      this.hp = 0;
      this.draw();
      this.gameOver();
      return;
    }
    this.draw();
    this.raf = requestAnimationFrame(this.loop);
  };

  /** 고른 것 중 하나. 아무것도 없으면 이모지 폴백 (빈 화면으로 떨어지지 않게) */
  private pickSprite(): Sprite {
    if (this.sprites.length === 0) return { kind: 'emoji', value: '🐶' };
    return this.sprites[Math.floor(Math.random() * this.sprites.length)] as Sprite;
  }

  private spawn(sf: number): void {
    const good = Math.random() < 0.8;
    this.items.push({
      x: 30 + Math.random() * (this.W - 60),
      y: -24,
      vy: (70 + Math.random() * 45) * sf,
      sway: (Math.random() * 2 - 1) * 18,
      spin: (Math.random() * 2 - 1) * 1.4,
      rot: (Math.random() * 2 - 1) * 0.3,
      kind: good ? 'good' : 'bad',
      sprite: this.pickSprite(),
      e: '🐝',
    });
  }

  private rr(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
  ): void {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  private draw(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    ctx.clearRect(0, 0, this.W, this.H);
    ctx.fillStyle = 'rgba(147,169,140,0.18)';
    ctx.fillRect(0, this.H - 22, this.W, 22);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const dw = 52;
    for (const it of this.items) {
      if (it.kind !== 'good') {
        ctx.font = '28px serif';
        ctx.fillText(it.e, it.x, it.y);
        continue;
      }
      if (it.sprite.kind === 'emoji') {
        // 아이콘도 사진과 같이 회전시킵니다 — 한쪽만 안 돌면 섞어 썼을 때 눈에 걸립니다
        ctx.save();
        ctx.translate(it.x, it.y);
        ctx.rotate(it.rot || 0);
        ctx.font = '44px serif';
        ctx.fillText(it.sprite.value, 0, 0);
        ctx.restore();
        continue;
      }
      const im = it.sprite.img;
      if (im.complete && im.naturalWidth) {
        const dh = dw * (im.naturalHeight / im.naturalWidth);
        ctx.save();
        ctx.translate(it.x, it.y);
        ctx.rotate(it.rot || 0);
        ctx.drawImage(im, -dw / 2, -dh / 2, dw, dh);
        ctx.restore();
      } else {
        // 아직 안 받아진 사진 — 빈칸 대신 자리를 잡아둡니다
        ctx.font = '30px serif';
        ctx.fillText('🐶', it.x, it.y);
      }
    }

    for (const f of this.fx) {
      f.life -= 0.028;
      ctx.globalAlpha = Math.max(0, f.life);
      ctx.fillStyle = f.c;
      ctx.font = '800 16px ui-monospace,monospace';
      ctx.fillText(f.s, f.x, f.y - (0.6 - f.life) * 38);
    }
    ctx.globalAlpha = 1;
    this.fx = this.fx.filter((f) => f.life > 0);

    ctx.font = '76px serif';
    ctx.fillText('🧺', this.dog.x, this.H - 26);

    const bx = 16;
    const by = 14;
    const bw = this.W - 32;
    ctx.fillStyle = 'rgba(58,51,46,0.10)';
    this.rr(ctx, bx, by, bw, 10, 5);
    ctx.fill();
    ctx.fillStyle = this.hp > 40 ? '#C77B8B' : '#d8665f';
    this.rr(ctx, bx, by, (bw * Math.max(0, this.hp)) / 100, 10, 5);
    ctx.fill();

    ctx.fillStyle = '#5a4d48';
    ctx.font = '800 15px ui-monospace,monospace';
    ctx.textAlign = 'right';
    ctx.fillText(this.elapsed.toFixed(1) + 's', this.W - 16, 40);
    ctx.textAlign = 'left';
    ctx.font = '700 11px sans-serif';
    ctx.fillStyle = '#857569';
    ctx.fillText('체력', 16, 40);
    ctx.textAlign = 'center';
    ctx.font = '800 13px sans-serif';
    ctx.fillStyle = '#A65A6E';
    ctx.fillText(this.countIcon + ' ' + this.caught, this.W / 2, 40);
  }

  private gameOver(): void {
    this.stop();
    this.onGameOver({ score: +this.elapsed.toFixed(1), caught: this.caught });
  }
}
