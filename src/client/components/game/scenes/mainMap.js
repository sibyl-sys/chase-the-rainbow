/* eslint-disable max-len */
import Phaser from 'phaser';
import { io } from 'socket.io-client';
import { load } from 'recaptcha-v3';
import eventCenter from './eventCenter';
import constants from '../../../../shared/constants';
import Player from '../sprites/player';
import DeathScreen from '../../deathScreen/index';


//Private Reference for PlayerMap and Powerups
const _playerMap = Symbol("PlayerMap");
const _serverType = Symbol("ServerType");
const _timeLeft = Symbol("timeLeft");
const _isWinner = Symbol("isWinner");
const _powerUps = Symbol("Powerups");
const _pickups = Symbol("pickups");
const _killQueueTimer = Symbol("qTimer");
// eslint-disable-next-line no-unused-vars

export default class MainMap extends Phaser.Scene {
  constructor() {
    super('mainMap');

    // change this if in local development
    this.prodMode = false;

    this.myNFT = JSON.parse(window.sessionStorage.getItem('nft'));
    this.username = window.sessionStorage.getItem('username');
    this.server = window.sessionStorage.getItem('server');
    this.tourneyCode = window.sessionStorage.getItem('tourneyCode');
    this.walletaddy = window.sessionStorage.getItem('user');
    
    if (!this.username || !this.myNFT) window.location.replace(this.prodMode ? 'https://www.chasetherainbow.app' : 'http://localhost:3000');

    this.config = {
      tile: 'bg0',
      width: 1920,
      height: 1080,
      bots: 10,
      planetScrollFactor : 0.5,
      starScrollFactor : 0.3
    };

    // Dummy login button to test respawn state.
    this.respawnButton = document.createElement('iframe');
    this.respawnButton.style.position = 'absolute';
    this.respawnButton.style.zIndex = '5';
    this.respawnButton.style.width = '100%';
    this.respawnButton.style.height = '100%';
    this.respawnButton.style.display = 'none';
    this.respawnButton.style.margin = '0px';
    this.respawnButton.style.padding = '0px';
    document.getElementById("root").prepend(this.respawnButton);
    this.respawnButton.src = '/deathScreen';

    this.loggedIn = false;
    this[_killQueueTimer] = 0;
  }

  login() {
    this.scene.run('ui');
    load('6LdIBrEgAAAAANdAzUznT4xvQb8Qqh7VXVsRAG7L').then((recaptcha) => {
      recaptcha.execute('login').then((token) => {
        this.socket.emit('login', {
          auth: 'placeholder_auth', name: this.username, token, nft: this.myNFT, tourneyCode: this.tourneyCode, walletaddy: this.walletaddy,
        });
      });
    });
  }

  preload() {
    window.addEventListener('popstate', () => {
      // The popstate event is fired each time when the current history entry changes. It will kick users off the game when the back/refresh button is pressed.
      this.socket.emit('forcedDisconnect');
      history.back();
    }, false);

    this.magnet = {};
  }

  updateRotationThroughJoystick(rotation) {
      this.socket.emit('angle', rotation);
  }

  handleBoostButton(isBoostDown) {
    this.isBoostButtonPressed = isBoostDown;
  }

  create() {
    this.login();
    this.hsv = Phaser.Display.Color.HSVColorWheel();
    const url = this.server === 'us1' ? 'https://www.chasetherainbow.app' : `https://space-doodles-${this.server}.herokuapp.com`;

    this.socket = io(this.prodMode ? url : undefined, {
      closeOnBeforeunload: false,
      transports: ['websocket'],
    });

    this.anims.create({
      key: 'magnetFX',
      frames: [
        {key: 'magnetFX_1', duration: 100}, 
        {key: 'magnetFX_2', duration: 100}, 
        {key: 'magnetFX_3', duration: 100}, 
        {key: 'magnetFX_4', duration: 100}, 
      ],
      repeat: -1,
    })

    this.moon = this.add.image(8314, 16415, 'moon').setDepth(3.6).setScrollFactor(this.config.planetScrollFactor);
    this.bluePlanet = this.add.image(6289, 14146, 'doodliftsplanet').setDepth(3.6).setScrollFactor(this.config.planetScrollFactor);
    this.greenPlanet = this.add.image(12038, 9734, 'finnsplanet').setDepth(3.6).setScrollFactor(this.config.planetScrollFactor);
    this.cookiePlanet = this.add.image(4327, 8328, 'fundayplanet').setDepth(3.6).setScrollFactor(this.config.planetScrollFactor);
    this.bubblePlanet = this.add.image(10048, 7245, 'jkbplanet').setDepth(3.6).setScrollFactor(this.config.planetScrollFactor);
    this.narutoPlanet = this.add.image(11695, 17161, 'perfyplanet').setDepth(3.6).setScrollFactor(this.config.planetScrollFactor);
    this.sushiPlanet = this.add.image(8431, 1605, 'wizardplanet').setDepth(3.6).setScrollFactor(this.config.planetScrollFactor);
    this.carrotPlanet = this.add.image(6897, 3612, 'bananacandyplanet').setDepth(3.6).setScrollFactor(this.config.planetScrollFactor);
    this.carrotPlanet = this.add.image(2004, 6224, 'coffeeplanet').setDepth(3.6).setScrollFactor(this.config.planetScrollFactor);
    this.poopieplanet = this.add.image(7200, 16000, 'poopieplanet').setDepth(3.6).setScrollFactor(this.config.planetScrollFactor);
    this.raeplanet = this.add.image(800, 1600, 'raeplanet').setDepth(3.6).setScrollFactor(this.config.planetScrollFactor);

    this.bg = this.add.graphics(0,0);
    this.bg.fillStyle(0xA4A4F4, 1);
    this.bg.fillRect(0, 0, this.config.width, this.config.height);
    this.bg.setScrollFactor(0);

    this.stars = this.add.tileSprite(0, 0, this.config.width, this.config.height, "stars");
    this.stars.setOrigin(0);
    this.stars.setScrollFactor(0);

    this.clouds = this.add.tileSprite(0, 0, this.config.width, this.config.height, "clouds");
    this.clouds.setOrigin(0);
    this.clouds.setScrollFactor(0);
    this.clouds.setDepth(3.7);

    this.localPlayerSprite = this.add.player(0, 0, true, this.myNFT).setDepth(6);

    eventCenter.on('joystickmove', this.updateRotationThroughJoystick, this);
    eventCenter.on('boostButton', this.handleBoostButton, this);

    this.localPlayerSprite.on('spawn', () => {
      this.respawnButton.style.display = 'none';
    });

    this.localPlayerSprite.on('death', (data) => {
      //TODO UPDATE TEXT DEPENDING ON TOURNAMENT TYPE
      if(this[_isWinner]) {
        this.respawnButton.contentWindow.document.getElementById('title').innerHTML = `YOU WON!`;
      }
      this.respawnButton.contentWindow.document.getElementById('score').innerHTML = `Score: ${this.localPlayerSprite.score}`;
      this.respawnButton.contentWindow.document.getElementById('again').onclick = () => {
        this.socket.emit('forcedDisconnect');
        window.location.replace(this.prodMode ? 'https://www.chasetherainbow.app/pilots' : 'http://localhost:3000/pilots');
        clearTimeout(this.AFKKick);
      };
      this.respawnButton.contentWindow.document.getElementById('titleMenu').onclick = () => {
        this.socket.emit('forcedDisconnect');
        window.location.replace(this.prodMode ? 'https://www.chasetherainbow.app' : 'http://localhost:3000');
        clearTimeout(this.AFKKick);
      };

      if (this.localPlayerSprite.score >= 10) {
        const particles = this.add.particles('rainbowBit');

        const emitter = particles.createEmitter({

          maxParticles: Math.min(this.localPlayerSprite.score / 10, 15),
          scale: 1,
        });
        emitter.setPosition(this.localPlayerSprite.x, this.localPlayerSprite.y);

        emitter.setSpeed(200);
        particles.setDepth(105);
      }

      setTimeout(() => {
        document.body.style.overflow = 'hidden';
        this.respawnButton.style.display = 'block';
      }, 1000);

      this.AFKKick = setTimeout(() => {
        this.socket.emit('forcedDisconnect');
        window.location.replace(this.prodMode ? 'https://www.chasetherainbow.app' : 'http://localhost:3000');
      }, 20000);
    });

    this.socket.on('connect', () => {
      console.log('connected!!');
    });

    this.socket.on('setup', (data) => {
      this[_serverType] = data.serverType;
      if(!data.isActive) {
        this.respawnButton.contentWindow.document.getElementById('title').innerHTML = `TOURNAMENT CLOSED`;
        this.respawnButton.contentWindow.document.getElementById('score').innerHTML = `Next Tournament Starts at ` + data.next;
        this.respawnButton.contentWindow.document.getElementById('again').innerHTML = `Change Server`;
        document.body.style.overflow = 'hidden';
        this.respawnButton.style.display = 'block';
        this.respawnButton.contentWindow.document.getElementById('again').onclick = () => {
          this.socket.emit('forcedDisconnect');
          window.location.replace(this.prodMode ? 'https://www.chasetherainbow.app/pilots' : 'http://localhost:3000/pilots');
          clearTimeout(this.AFKKick);
        };
        this.respawnButton.contentWindow.document.getElementById('titleMenu').onclick = () => {
          this.socket.emit('forcedDisconnect');
          window.location.replace(this.prodMode ? 'https://www.chasetherainbow.app' : 'http://localhost:3000');
          clearTimeout(this.AFKKick);
        };
      } 
    })

    this.socket.on('loggedIn', () => {
      this.loggedIn = true;
    });

    this.socket.on('lb', (data) => {
      if (!this.loggedIn) return;
      eventCenter.emit('lb', data);
    });

    this.socket.on('death', (data) => {
      eventCenter.emit('killNotif', data);
    })
    // Create key listener and check if player is boosting
    this.cursors = this.input.keyboard.createCursorKeys();
    this.spaceKeyPressed = false;
    this.isBoostButtonPressed = false;

    // Used to manage player/rainbow bit/fuel tank creation, deletion, and update.
    const playerIds = new Set();
    this[_playerMap] = new Map();
    this[_powerUps] = [];
    const entityIds = new Set();
    const entityMap = new Map();
    this[_pickups] = [];
    this[_isWinner] = false;

    this.socket.on('frame', (frame) => {
      this.localPlayerSprite.pushFrame(frame.localPlayer);
      this[_timeLeft] = frame.timeLeft;
      this[_isWinner] = frame.isWinner;
      const newPlayerIds = new Set();
      const newEntityIds = new Set();

      frame.players.forEach((player) => {
        newPlayerIds.add(player.id);
        if (!playerIds.has(player.id)) {
          playerIds.add(player.id);
          // Player is created.
          this[_playerMap].set(player.id, this.add.player(0, 0, false, player.nft).setDepth(6));
        } else {
          // Player is updated.
          const playerToUpdate = this[_playerMap].get(player.id);
          playerToUpdate.pushFrame(player);
        }
      });

      playerIds.forEach((playerId) => {
        if (!newPlayerIds.has(playerId)) {
          // Player is deleted.
          const playerToDelete = this[_playerMap].get(playerId);
          playerToDelete.destroy();
          playerIds.delete(playerId);
          this[_playerMap].delete(playerId);
        }
      });

      this[_powerUps] = frame.powerups;
      this[_pickups] = frame.entities;

      frame.entities.forEach((entity) => {
        newEntityIds.add(entity.id);
        if (!entityIds.has(entity.id)) {
          entityIds.add(entity.id);

          // Create rainbow bit or fuel tank.
          if (entity.type === constants.ENTITY_TYPE.DEBUG_CIRCLE) {
            entityMap.set(entity.id, this.add.circle(entity.x, entity.y, 30, 'red').setDepth(5));
          } else if(entity.type === constants.ENTITY_TYPE.TREASURE) {
            console.log("process treasure");
            this.treasure = this.add.sprite(entity.x, entity.y, entity.type).setDepth(5);
            if(!this.treasureLife) {
              this.treasureLife = this.add.text(
                this.treasure.x, this.treasure.y, entity.life, 
                {
                  fontFamily: 'Pangolin',
                  fontSize: '36px',
                  align: 'center'
                }
                ).setDepth(100).setOrigin(0.5);
            } else {
              this.treasureLife.setPosition(this.treasure.x, this.treasure.y);
              this.treasureLife.setVisible(true);
            }
            entityMap.set(entity.id, this.treasure);
          } else {
            entityMap.set(entity.id, this.add.sprite(entity.x, entity.y, entity.type).setDepth(5));
          }
        }

        function lerp(a, b, t) {
          return a + (b - a) * t;
        }

        if(entity.type == constants.ENTITY_TYPE.TREASURE && this.treasure && this.treasureLife) {
          if(entity.isInvul) {
            let top = this.hsv[Math.floor(Math.random() * 359)].color;
            let left = this.hsv[Math.floor(Math.random() * 359)].color;
            let right = this.hsv[Math.floor(Math.random() * 359)].color;
            let bottom = this.hsv[Math.floor(Math.random() * 359)].color;
            this.treasure.setTint(top, left, right, bottom);
          } else {
            this.treasure.clearTint();
          }

          if(this.treasure.x != entity.x || this.treasure.y != entity.y) {
            this.treasure.setPosition(entity.x, entity.y);
            this.treasureLife.setPosition(this.treasure.x, this.treasure.y);
          }
          this.treasureLife.setText(entity.life);
        }

        if (entity.collectedBy && entityMap.has(entity.id) && (entity.collectedBy === this.socket.id || playerIds.has(entity.collectedBy)) && !this.magnet.hasOwnProperty(entity.id)) {
          this.magnet[entity.id] = entity.collectedBy;
          // get player
          const player = entity.collectedBy === this.socket.id ? this.localPlayerSprite : this[_playerMap].get(entity.collectedBy);
          // get entity
          const entityToUpdate = entityMap.get(entity.id);
          const entityArray = Array.from(entityMap.values());
          // console.log(entityArray.filter((e) => e.x === entityToUpdate.x && e.y === entityToUpdate.y).length);
          this.tweens.addCounter({
            from: 0,
            to: 1,
            alpha: 0,
            duration: 3000,
            ease: 'Power2',
            onUpdate: (tween) => {
              entityToUpdate.setX(lerp(entityToUpdate.x, player.x, tween.getValue()));
              entityToUpdate.setY(lerp(entityToUpdate.y, player.y, tween.getValue()));
            },
            onComplete: () => {
              delete this.magnet[entity.id];
              entityToUpdate.destroy();
              entityIds.delete(entity.id);
              entityMap.delete(entity.id);
            },

          });
        }
      });

      entityIds.forEach((entityId) => {
        if (!newEntityIds.has(entityId)) {
          // Rainbow bit or fuel tank is deleted.
          const e = entityMap.get(entityId);
          if (e) {
            if(e == this.treasure) {
              this.sound.play('powerupPickup', { loop: false });
              this.treasureLife.setVisible(false);
            }
            e.destroy();
            entityIds.delete(entityId);
            entityMap.delete(entityId);
          }
        }
      });
    });

    // boundary
    this.graphics = this.add.graphics().setDepth(4);
    const THICKNESS = 12000;
    this.graphics.lineStyle(THICKNESS, 0xc6c6ff, 1);
    this.graphics.strokeRect(0 - (THICKNESS / 2), 0 - (THICKNESS / 2), 18000 + THICKNESS, 18000 + THICKNESS);

    this.graphics.lineStyle(4, 0xffffff, 0.7);

    this.graphics.strokeRect(0, 0, 18000, 18000);

    // Send frequent input updates.
    setInterval(() => {
      // Calculate rotation from mouse, for input.
      const { canvas } = this.game;
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const d = this.input.mousePointer.y - centerY;
      const k = this.input.mousePointer.x - centerX;
      const rotation = Math.atan2(d, k);
      // console.log(rotation);

      if(!this.sys.game.device.os.android && !this.sys.game.device.os.iOS) {
        this.socket.emit('angle', rotation);
      }
    }, 100);
  }

  update(time, delta) {
    // background movement
    this.clouds.setTilePosition(this.cameras.main.scrollX, this.cameras.main.scrollY);
    this.stars.setTilePosition(this.cameras.main.scrollX * this.config.starScrollFactor, this.cameras.main.scrollY * this.config.starScrollFactor);
  
    this[_killQueueTimer] += delta;

    if(this[_killQueueTimer] > 1000) {
      this[_killQueueTimer] = 0;
      eventCenter.emit('showKillQueue');
    }

    const spacebar = this.spaceKeyPressed;
    if (this.cursors.space.isDown || this.isBoostButtonPressed) {
      this.spaceKeyPressed = true;
    } else {
      this.spaceKeyPressed = false;
    }
    
    eventCenter.emit("minimap", {x: this.localPlayerSprite.x, y: this.localPlayerSprite.y, visible: this.localPlayerSprite.visible, playerMap: this[_playerMap], powerups: this[_powerUps], pickups: this.localPlayerSprite.radarActive ? this[_pickups] : []});
    if(this[_serverType] == 'Tournament') {
      eventCenter.emit("countdown", this[_timeLeft]);
    }
    
    if (spacebar !== this.spaceKeyPressed) {
      eventCenter.emit('spacebar', this.spaceKeyPressed);
      this.socket.emit('spacebar', this.spaceKeyPressed);
    }
  }
}
