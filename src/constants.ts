/** Spelkonstanter – lätt att justera. */
export const CONFIG = {
  /** Hur utzoomad kameran är (0–1). Mindre = mer utzoomad, mer synlig värld. */
  zoom: 0.5,
  /** Hastighet när man trycker framåt. */
  thrust: 280,
  /** Rotationshastighet (radianer per sekund). */
  turnSpeed: 4.5,
  /** Friktion (0–1). 0 = ingen, 1 = stannar direkt. */
  friction: 0.98,
  /** Skeppets kollisionsradie (för kollision med hinder/fiender). */
  shipRadius: 14,
  /** Dämpning vid skepp–asteroid (0 = ren reflektion, högre = mjukare omdirigering). */
  shipAsteroidDamping: 0.3,
  /** Skeppets "näsa" längd för ritning (pixlar). */
  shipNoseLength: 20,
  /** Skeppets "bredd" för ritning (halva vingen). */
  shipWingHalf: 10,

  /** Skepp: max HP vid start. */
  shipMaxHp: 100,
  /** Skepp: skada per kollision med asteroid (bas). */
  shipCollisionDamage: 12,
  /** Skepp: skada per kollision skalas med asteroidens radie (extra). */
  shipCollisionDamagePerRadius: 0.2,
  /** Bas hp-regeneration (hp/s). Faktisk regen = baseHealthRegenPerSecond × ship.healthRegenModifier. */
  baseHealthRegenPerSecond: 10,

  /** Belöning: guld per förstörd asteroid (bas + per radie). */
  asteroidGoldBase: 2,
  asteroidGoldPerRadius: 0.5,
  /** Belöning: XP per förstörd asteroid. Högre = snabbare level-up. */
  asteroidXpBase: 10,
  asteroidXpPerRadius: 0.5,

  /** Skott: hastighet (världsenheter/s). */
  bulletSpeed: 420,
  /** Skott: skada per träff. */
  bulletDamage: 1,
  /** Skott: livstid i sekunder. */
  bulletLifetime: 1.2,
  /** Skott: kollisionsradie. */
  bulletRadius: 2,
  /** Skott: cooldown mellan skott (sekunder). */
  bulletCooldown: 0.15,
  /** Visa cooldown-bar i vapen-UI endast när cooldown > detta (sekunder). */
  weaponCooldownBarMin: 0.4,

  /** Vapen: raket – hastighet, skada, cooldown, livstid. */
  rocketSpeed: 180,
  rocketDamage: 8,
  rocketCooldown: 0.6,
  rocketLifetime: 2,
  /** Bomb – släpps, exploderar efter fuse. */
  bombFuse: 2,
  bombDamage: 25,
  bombRadius: 80,
  bombCooldown: 1.5,
  /** Mina – släpps, triggas av asteroid inom radie. */
  mineTriggerRadius: 70,
  mineDamage: 20,
  mineExplosionRadius: 90,
  mineCooldown: 2,
  /** Puls – omedelbar AoE runt skepp. */
  pulseRadius: 120,
  pulseDamage: 12,
  pulseCooldown: 1.2,
  /** Konpuls – kon framåt. */
  conePulseAngle: Math.PI / 3,
  conePulseRange: 150,
  conePulseDamage: 15,
  conePulseCooldown: 1.4,
  /** Laser – kort linje, lång cooldown. */
  laserLength: 100,
  laserDuration: 0.15,
  laserDamage: 40,
  laserCooldown: 3,

  /** Asteroider: min/max radie (världsenheter). */
  asteroidRadiusMin: 18,
  asteroidRadiusMax: 42,
  /** Asteroider: HP per radie-enhet (total HP = radius * denna). */
  asteroidHpPerRadius: 0.8,
  /** Asteroider: hastighet min/max. */
  asteroidSpeedMin: 20,
  asteroidSpeedMax: 70,
  /** Asteroider: spawn-intervall (sekunder). */
  asteroidSpawnInterval: 2.5,
  /** Studs mellan objekt (0–1). */
  restitution: 0.75,
  /**
   * Penetration under denna tjocklek (världsenheter) ger ingen positionsseparation.
   * Motsvarar "linear slop" i vanliga 2D-motorer — minskar jitter i vila och vid flerpass-lösning.
   */
  collisionLinearSlop: 1.25,
  /** Antal pass skepp–asteroid + asteroid–asteroid (en loop; tidigare fanns extra dublett). */
  collisionResolutionPasses: 3,

  /** VFX: explosion animation duration (seconds). */
  effectExplosionDuration: 0.42,
  /** VFX: pulse / cone pulse animation duration (seconds). */
  effectPulseDuration: 0.32,
} as const;
