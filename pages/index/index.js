// index.js
const BIRD_SIZE = 30;
const PIPE_WIDTH = 50;
const INITIAL_PIPE_GAP = 200;
const MIN_PIPE_GAP = 150;
const GRAVITY = 0.25;
const MIN_JUMP_SPEED = -5;
const MAX_JUMP_SPEED = -12;
const MAX_PRESS_TIME = 500;
const FRAME_TIME = 16;
const INITIAL_PIPE_SPEED = 1.5;
const MAX_PIPE_SPEED = 3;
const INITIAL_PIPE_INTERVAL = 3000;
const MIN_PIPE_INTERVAL = 2000;
const GROUND_HEIGHT = 100;

const DIFFICULTY_SETTINGS = {
  0: { pipeGap: 200, pipeSpeed: 1.5, pipeInterval: 3000 },
  5: { pipeGap: 190, pipeSpeed: 1.8, pipeInterval: 2800 },
  10: { pipeGap: 180, pipeSpeed: 2.0, pipeInterval: 2600 },
  15: { pipeGap: 170, pipeSpeed: 2.3, pipeInterval: 2400 },
  20: { pipeGap: 160, pipeSpeed: 2.5, pipeInterval: 2200 },
  25: { pipeGap: 150, pipeSpeed: 3.0, pipeInterval: 2000 }
};

Component({
  data: {
    score: 0,
    isPlaying: false,
    canvasReady: false,
    currentLevel: 0
  },

  lifetimes: {
    attached() {
      console.log('组件加载');
      wx.nextTick(() => {
        this.initCanvas();
      });
    },

    detached() {
      if (this.gameLoopTimer) {
        clearInterval(this.gameLoopTimer);
      }
    }
  },

  methods: {
    async initCanvas() {
      try {
        const query = this.createSelectorQuery();
        query.select('#gameCanvas')
          .fields({ node: true, size: true })
          .exec((res) => {
            if (res[0]) {
              const canvas = res[0].node;
              const ctx = canvas.getContext('2d');
              
              const { windowWidth, windowHeight } = wx.getSystemInfoSync();
              canvas.width = windowWidth;
              canvas.height = windowHeight;
              
              this.canvas = canvas;
              this.ctx = ctx;
              this.canvasWidth = windowWidth;
              this.canvasHeight = windowHeight;

              this.setData({ canvasReady: true }, () => {
                this.initGame();
                console.log('Canvas 初始化成功');
              });
            } else {
              console.error('未找到 Canvas 元素');
            }
          });
      } catch (error) {
        console.error('Canvas 初始化失败:', error);
      }
    },

    initGame() {
      if (!this.canvasWidth || !this.canvasHeight) {
        console.error('Canvas 尺寸未初始化');
        return;
      }

      this.gameState = {
        bird: {
          x: this.canvasWidth / 4,
          y: this.canvasHeight / 2,
          velocity: 0,
          pressStartTime: 0
        },
        pipes: [],
        backgroundX: 0,
        score: 0,
        nextPipeTime: 0
      };

      this.setData({ 
        score: 0,
        currentLevel: 0 
      });
      
      if (this.ctx) {
        this.drawBackground();
        this.drawBird();
      }
    },

    startGame(e) {
      if (e && e.stopPropagation) {
        e.stopPropagation();
      }
      if (this.data.isPlaying || !this.data.canvasReady) return;
      
      console.log('游戏开始');
      this.setData({ isPlaying: true });
      this.initGame();
      
      // 设置第一个管道生成时间
      this.gameState.nextPipeTime = Date.now() + 2000; // 延迟2秒生成第一个管道
      
      this.startGameLoop();
    },

    startGameLoop() {
      if (this.gameLoopTimer) {
        clearInterval(this.gameLoopTimer);
      }

      this.gameLoopTimer = setInterval(() => {
        if (!this.data.isPlaying) {
          clearInterval(this.gameLoopTimer);
          return;
        }
        this.update();
        this.render();
      }, FRAME_TIME);
    },

    update() {
      const { gameState } = this;
      if (!gameState || !gameState.bird) return;

      const currentSettings = this.getCurrentDifficultySettings();

      // 更新小鸟位置
      gameState.bird.velocity += GRAVITY;
      gameState.bird.y += gameState.bird.velocity;

      // 更新管道位置
      gameState.pipes.forEach(pipe => {
        pipe.x -= currentSettings.pipeSpeed;
      });

      // 移除超出屏幕的管道
      gameState.pipes = gameState.pipes.filter(pipe => pipe.x > -PIPE_WIDTH);

      // 检查是否需要生成新管道
      const currentTime = Date.now();
      if (currentTime >= gameState.nextPipeTime) {
        this.generatePipes();
        gameState.nextPipeTime = currentTime + currentSettings.pipeInterval;
      }

      // 检查碰撞
      if (this.checkCollision()) {
        this.gameOver();
        return;
      }

      // 更新背景
      gameState.backgroundX = (gameState.backgroundX - 1) % this.canvasWidth;
      
      // 更新分数
      this.updateScore();
    },

    getCurrentDifficultySettings() {
      const score = this.data.score;
      let settings = DIFFICULTY_SETTINGS[0];

      for (let level of Object.keys(DIFFICULTY_SETTINGS).sort((a, b) => b - a)) {
        if (score >= parseInt(level)) {
          settings = DIFFICULTY_SETTINGS[level];
          break;
        }
      }

      return settings;
    },

    generatePipes() {
      if (!this.data.isPlaying || !this.gameState) return;

      const settings = this.getCurrentDifficultySettings();
      const minHeight = 100;
      const maxHeight = this.canvasHeight - settings.pipeGap - minHeight - GROUND_HEIGHT;
      const topHeight = Math.random() * (maxHeight - minHeight) + minHeight;

      this.gameState.pipes.push({
        x: this.canvasWidth,
        topHeight: topHeight,
        scored: false
      });
    },

    drawBackground() {
      const ctx = this.ctx;
      ctx.fillStyle = '#87CEEB';
      ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
      
      ctx.fillStyle = '#8B4513';
      ctx.fillRect(0, this.canvasHeight - GROUND_HEIGHT, this.canvasWidth, GROUND_HEIGHT);
    },

    drawBird() {
      if (!this.gameState || !this.gameState.bird) return;
      
      const ctx = this.ctx;
      const bird = this.gameState.bird;
      
      // 小鸟身体
      ctx.fillStyle = '#FFD700';
      ctx.beginPath();
      ctx.arc(bird.x, bird.y, BIRD_SIZE/2, 0, Math.PI * 2);
      ctx.fill();
      
      // 小鸟眼睛
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.arc(bird.x + BIRD_SIZE/4, bird.y - BIRD_SIZE/6, BIRD_SIZE/8, 0, Math.PI * 2);
      ctx.fill();

      // 蓄力效果
      if (this.gameState.bird.pressStartTime > 0) {
        const pressTime = Date.now() - this.gameState.bird.pressStartTime;
        const progress = Math.min(pressTime / MAX_PRESS_TIME, 1);
        
        ctx.strokeStyle = `rgba(255, 255, 0, ${0.5 + progress * 0.5})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(bird.x, bird.y, BIRD_SIZE/2 + 5 + progress * 10, 0, Math.PI * 2);
        ctx.stroke();
      }
    },

    drawPipe(pipe) {
      const ctx = this.ctx;
      const settings = this.getCurrentDifficultySettings();
      
      ctx.fillStyle = '#2E8B57';
      
      // 上管道
      ctx.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.topHeight);
      
      // 下管道
      const bottomPipeY = pipe.topHeight + settings.pipeGap;
      ctx.fillRect(pipe.x, bottomPipeY, PIPE_WIDTH, this.canvasHeight - bottomPipeY);
      
      // 管道边缘
      ctx.fillStyle = '#1B5E20';
      const capHeight = 20;
      ctx.fillRect(pipe.x - 5, pipe.topHeight - capHeight, PIPE_WIDTH + 10, capHeight);
      ctx.fillRect(pipe.x - 5, bottomPipeY, PIPE_WIDTH + 10, capHeight);
    },

    drawScore() {
      const ctx = this.ctx;
      ctx.fillStyle = '#FFF';
      ctx.font = 'bold 48px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3;
      ctx.strokeText(this.data.score.toString(), this.canvasWidth / 2, 50);
      ctx.fillText(this.data.score.toString(), this.canvasWidth / 2, 50);
    },

    render() {
      if (!this.ctx || !this.gameState) return;
      
      const ctx = this.ctx;
      ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);

      this.drawBackground();
      this.gameState.pipes.forEach(pipe => this.drawPipe(pipe));
      this.drawBird();
      this.drawScore();
    },

    checkCollision() {
      const bird = this.gameState.bird;
      if (!bird) return false;

      // 检查地面碰撞
      if (bird.y + BIRD_SIZE/2 > this.canvasHeight - GROUND_HEIGHT) {
        console.log('地面碰撞');
        return true;
      }

      // 检查天花板碰撞
      if (bird.y - BIRD_SIZE/2 < 0) {
        console.log('天花板碰撞');
        return true;
      }

      // 检查管道碰撞
      const collision = this.gameState.pipes.some(pipe => {
        const inXRange = bird.x + BIRD_SIZE/2 > pipe.x && 
                        bird.x - BIRD_SIZE/2 < pipe.x + PIPE_WIDTH;
        
        if (!inXRange) return false;

        const settings = this.getCurrentDifficultySettings();
        const hitTopPipe = bird.y - BIRD_SIZE/2 < pipe.topHeight;
        const hitBottomPipe = bird.y + BIRD_SIZE/2 > pipe.topHeight + settings.pipeGap;

        if (hitTopPipe || hitBottomPipe) {
          console.log('管道碰撞');
          return true;
        }
        return false;
      });

      return collision;
    },

    updateScore() {
      if (!this.gameState) return;
      
      this.gameState.pipes.forEach(pipe => {
        if (!pipe.scored && pipe.x + PIPE_WIDTH < this.gameState.bird.x) {
          pipe.scored = true;
          const newScore = this.data.score + 1;
          
          const newLevel = Math.floor(newScore / 5);
          this.setData({
            score: newScore,
            currentLevel: newLevel
          });
          
          const settings = this.getCurrentDifficultySettings();
          this.gameState.nextPipeTime = Date.now() + settings.pipeInterval;
        }
      });
    },

    gameOver() {
      if (this.gameLoopTimer) {
        clearInterval(this.gameLoopTimer);
      }
      
      this.setData({ isPlaying: false });
      wx.showModal({
        title: '游戏结束',
        content: `得分：${this.data.score}`,
        showCancel: false,
        success: () => {
          this.initGame();
        }
      });
    },

    onTouchStart(e) {
      if (e && e.stopPropagation) {
        e.stopPropagation();
      }
      if (this.data.isPlaying && this.gameState && this.gameState.bird) {
        console.log('开始按压');
        this.gameState.bird.pressStartTime = Date.now();
      }
    },

    onTouchEnd(e) {
      if (e && e.stopPropagation) {
        e.stopPropagation();
      }
      if (this.data.isPlaying && this.gameState && this.gameState.bird) {
        const pressTime = Date.now() - this.gameState.bird.pressStartTime;
        const progress = Math.min(pressTime / MAX_PRESS_TIME, 1);
        const jumpSpeed = MIN_JUMP_SPEED + (MAX_JUMP_SPEED - MIN_JUMP_SPEED) * progress;
        
        console.log('跳跃力度:', progress);
        this.gameState.bird.velocity = jumpSpeed;
        this.gameState.bird.pressStartTime = 0;
      }
    }
  }
});
