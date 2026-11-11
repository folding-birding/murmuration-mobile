import { describe, expect, it } from 'vitest'
import { readHandSide } from '../src/camera/hand/handedness'
import { openHand } from './fixtures/open-hand'
import { observeHand, type HandSample } from '../src/camera/hand/gesture'
import { birdTarget, departureOffset } from '../src/interactive-bird/placement'
import { measurePalm } from '../src/camera/hand/palmGeometry'
import type { HandFrame } from '../src/camera/hand/types'
import { BirdFlight, follow, flightCorner } from '../src/interactive-bird/flight'

const observe = (frame: HandFrame) => observeHand(frame, 640, 480, measurePalm(frame, readHandSide(frame)), readHandSide(frame))
const hand = observe(openHand())!
const sample = (time: number, open = true): HandSample => ({time, hand:{...hand, open}})

describe('interactive bird positioning', () => {
  it('departs along projected gravity up, including camera tilt and front-camera mirroring', () => {
    const vertical = departureOffset({x:0,y:-1,z:0},400,600,100,false)
    expect(vertical.x).toBe(0); expect(vertical.y).toBeLessThan(-600)
    const tilted = departureOffset({x:.6,y:-.8,z:0},400,600,100,false)
    const mirrored = departureOffset({x:.6,y:-.8,z:0},400,600,100,true)
    expect(tilted.x / tilted.y).toBeCloseTo(-.75)
    expect(mirrored.x).toBe(-tilted.x); expect(mirrored.y).toBe(tilted.y)
    expect(departureOffset({x:0,y:0,z:1},400,600,100,false)).toEqual({x:0,y:0})
    expect(departureOffset(null,400,600,100,false)).toEqual({x:0,y:0})
  })
  it('projects 0.15 m along up, including mirrored X and depth foreshortening', () => {
    const flat = birdTarget(hand,{x:0,y:0,z:-1},640,480,640,480,false)!
    const up = birdTarget(hand,{x:0,y:-1,z:0},640,480,640,480,false)!
    expect(flat.y - up.y).toBeCloseTo(hand.spanPixels / hand.spanMeters * .15)
    const right = birdTarget(hand,{x:1,y:0,z:0},640,480,640,480,false)!
    const mirrored = birdTarget(hand,{x:1,y:0,z:0},640,480,640,480,true)!
    expect(right.x + mirrored.x).toBeCloseTo(640)
    expect(birdTarget({...hand,spanMeters:NaN},{x:0,y:-1,z:0},640,480,640,480,false)).toBeNull()
  })
})

describe('interactive bird lifecycle', () => {
  it('counts observed gesture time, tolerates brief gaps, and waits for scene and gravity readiness', () => {
    const flight = new BirdFlight()
    for(let t=0;t<=200;t+=100) flight.step(t,sample(t),true)
    flight.step(300,{time:300,hand:null},true)
    for(let t=400;t<=600;t+=100) flight.step(t,sample(t),true)
    expect(flight.phase).toBe('hidden')
    flight.step(700,sample(700),false)
    expect(flight.phase).toBe('hidden')
    flight.step(800,sample(800),true)
    expect(flight.phase).toBe('arriving')
  })
  it('does not count stale frames or accumulate across long gesture interruptions', () => {
    const flight = new BirdFlight()
    flight.step(0,sample(0),true)
    flight.step(2000,sample(0),true)
    expect(flight.phase).toBe('hidden')
    for(let t=2100;t<=2400;t+=100) flight.step(t,sample(t),true)
    flight.step(2800,sample(2800,false),true)
    for(let t=2900;t<=3200;t+=100) flight.step(t,sample(t),true)
    expect(flight.phase).toBe('hidden')
  })
  it('discards old gesture evidence when tracking resumes after a render stall', () => {
    const flight = new BirdFlight()
    for (let time = 0; time <= 400; time += 100) flight.step(time, sample(time), true)
    expect(flight.phase).toBe('hidden')
    flight.step(1000, sample(1000), true)
    for (let time = 1100; time <= 1400; time += 100) flight.step(time, sample(time), true)
    expect(flight.phase).toBe('hidden')
    flight.step(1500, sample(1500), true)
    expect(flight.phase).toBe('arriving')
  })
  it('keeps following a closed or tilted hand and departs only after a full second of absence', () => {
    const flight = new BirdFlight()
    for(let t=0;t<=1000;t+=100) flight.step(t,sample(t),true)
    expect(flight.phase).toBe('arriving')
    for(let t=1100;t<=2000;t+=100) flight.step(t,sample(t,false),true)
    expect(flight.phase).toBe('hovering')
    flight.step(2700,{time:2700,hand:null},true)
    expect(flight.phase).toBe('hovering')
    flight.step(2800,sample(2800,false),true)
    flight.step(3799,{time:3799,hand:null},true)
    expect(flight.phase).toBe('hovering')
    flight.step(3800,{time:3800,hand:null},true)
    expect(flight.phase).toBe('leaving')
    flight.step(4800,{time:4800,hand:null},true)
    expect(flight.phase).toBe('hidden')
  })
  it('does not confuse missing handedness or normal with a missing tracked skeleton', () => {
    const flight = new BirdFlight()
    for (let t = 0; t <= 2000; t += 100) flight.step(t, sample(t), true)
    const uncertain = openHand(); uncertain.handedness[0][0].score = 0.55
    const uncertainHand = observe(uncertain)
    for (let t = 2100; t <= 4000; t += 100) flight.step(t, { time: t, hand: uncertainHand }, true)
    expect(flight.phase).toBe('hovering')
    flight.step(4999, { time: 4999, hand: null }, true)
    expect(flight.phase).toBe('hovering')
    flight.step(5000, { time: 5000, hand: null }, true)
    expect(flight.phase).toBe('leaving')
    const waiting = new BirdFlight()
    for (let t = 0; t <= 2000; t += 100) waiting.step(t, { time: t, hand: uncertainHand }, true)
    expect(waiting.phase).toBe('hidden')
  })
  it('enters on the invited side and follows with frame-independent lag', () => {
    const flight = new BirdFlight()
    for(let t=0;t<=1000;t+=100) flight.step(t,{time:t,hand:{...hand,side:'Left'}},true)
    expect(flight.side).toBe('Left')
    expect(flightCorner(flight.side,400,100)).toEqual({x:-100,y:-100})
    expect(flightCorner('Right',400,100)).toEqual({x:500,y:-100})
    const moved = follow(0,100,.1)
    expect(moved).toBeGreaterThan(0); expect(moved).toBeLessThan(100)
    expect(follow(moved,100,.1)).toBeCloseTo(follow(0,100,.2))
  })
})
