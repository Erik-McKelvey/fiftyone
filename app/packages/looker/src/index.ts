/**
 * Copyright 2017-2021, Voxel51, Inc.
 */
import LRU from "lru-cache";
import { v4 as uuid } from "uuid";

import {
  FONT_SIZE,
  STROKE_WIDTH,
  PAD,
  POINT_RADIUS,
  MAX_FRAME_CACHE_SIZE,
} from "./constants";
import {
  getFrameElements,
  getImageElements,
  getVideoElements,
} from "./elements";
import { LookerElement } from "./elements/common";
import processOverlays from "./processOverlays";
import { loadOverlays } from "./overlays";
import { CONTAINS, Overlay } from "./overlays/base";
import {
  FrameState,
  ImageState,
  VideoState,
  StateUpdate,
  BaseState,
  DEFAULT_FRAME_OPTIONS,
  DEFAULT_IMAGE_OPTIONS,
  DEFAULT_VIDEO_OPTIONS,
  Coordinates,
  Optional,
  BaseSample,
  FrameChunkResponse,
} from "./state";
import {
  createWorker,
  getElementBBox,
  getFitRect,
  mergeUpdates,
  snapBox,
} from "./util";
import { zoomToContent } from "./zoom";

import "./style.css";
import { getFrameNumber } from "./elements/util";

export { zoomAspectRatio } from "./zoom";

const labelsWorker = createWorker();

export abstract class Looker<
  State extends BaseState = BaseState,
  Sample extends BaseSample = BaseSample
> {
  private eventTarget: EventTarget;
  protected lookerElement: LookerElement<State>;
  private resizeObserver: ResizeObserver;

  protected currentOverlays: Overlay<State>[];
  protected pluckedOverlays: Overlay<State>[];
  protected sample: Sample;
  protected state: State;
  protected readonly canvas: HTMLCanvasElement;
  protected readonly updater: StateUpdate<State>;

  constructor(
    sample: Sample,
    config: State["config"],
    options: Optional<State["options"]>
  ) {
    this.updateSample(sample);
    this.eventTarget = new EventTarget();
    this.updater = this.makeUpdate();
    this.state = this.getInitialState(config, options);
    this.pluckedOverlays = [];
    this.currentOverlays = [];
    this.lookerElement = this.getElements();
    this.canvas = this.lookerElement.children[1].element as HTMLCanvasElement;
    this.resizeObserver = new ResizeObserver(() =>
      requestAnimationFrame(() => this.updater(({ loaded }) => ({ loaded })))
    );
  }

  protected dispatchEvent(eventType: string, detail: any): void {
    this.eventTarget.dispatchEvent(new CustomEvent(eventType, { detail }));
  }

  protected getDispatchEvent(): (eventType: string, detail: any) => void {
    return (eventType: string, detail: any) => {
      this.dispatchEvent(eventType, detail);
    };
  }

  private makeUpdate(): StateUpdate<State> {
    return (stateOrUpdater, postUpdate) => {
      const updates =
        stateOrUpdater instanceof Function
          ? stateOrUpdater(this.state)
          : stateOrUpdater;
      if (Object.keys(updates).length === 0 && !postUpdate) {
        return;
      }
      const prevState = this.state;
      this.state = mergeUpdates(this.state, updates);
      this.pluckedOverlays = this.pluckOverlays(this.state, prevState);
      [this.currentOverlays, this.state.rotate] = processOverlays(
        this.state,
        this.pluckedOverlays
      );
      this.state = this.postProcess(this.lookerElement.element);
      this.state.mouseIsOnOverlay =
        this.currentOverlays.length &&
        this.currentOverlays[0].containsPoint(this.state) > CONTAINS.NONE;
      postUpdate && postUpdate(this.state, this.currentOverlays);
      this.lookerElement.render(this.state as Readonly<State>);

      const ctx = this.canvas.getContext("2d");
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.lineWidth = this.state.strokeWidth;
      ctx.font = `bold ${this.state.fontSize.toFixed(2)}px Palanquin`;
      ctx.textAlign = "left";
      ctx.textBaseline = "bottom";
      ctx.imageSmoothingEnabled = false;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.translate(...this.state.pan);
      ctx.scale(this.state.scale, this.state.scale);
      const numOverlays = this.currentOverlays.length;
      for (let index = numOverlays - 1; index >= 0; index--) {
        this.currentOverlays[index].draw(ctx, this.state);
      }
    };
  }

  addEventListener(eventType, handler, ...args) {
    this.eventTarget.addEventListener(eventType, handler, ...args);
  }

  removeEventListener(eventType, handler, ...args) {
    this.eventTarget.removeEventListener(eventType, handler, ...args);
  }

  attach(element: HTMLElement): void {
    this.state = this.postProcess(element);
    this.resizeObserver.observe(this.lookerElement.element);
    element.appendChild(this.lookerElement.element);
  }

  detach(): void {
    this.resizeObserver.unobserve(this.lookerElement.element);
    this.lookerElement.element.parentNode.removeChild(
      this.lookerElement.element
    );
  }

  destroy(): void {
    this.detach();
    delete this.lookerElement;
  }

  updateOptions(options: Optional<State["options"]>) {
    this.updater({ options });
  }

  updateSample(sample: Sample) {
    const messageUUID = uuid();
    const listener = ({ data: { sample, uuid } }) => {
      if (uuid === messageUUID) {
        this.loadOverlays(sample);
        this.updater({ overlaysPrepared: true });
        labelsWorker.removeEventListener("message", listener);
      }
    };
    labelsWorker.addEventListener("message", listener);
    labelsWorker.postMessage({
      method: "processSample",
      origin: window.location.origin,
      sample,
      uuid: messageUUID,
    });
  }

  protected abstract getElements(): LookerElement<State>;

  protected abstract loadOverlays(sample: BaseSample);

  protected abstract pluckOverlays(
    state: State,
    prevState: Readonly<State>
  ): Overlay<State>[];

  protected abstract getDefaultOptions(): State["options"];

  protected abstract getInitialState(
    config: State["config"],
    options: Optional<State["options"]>
  ): State;

  protected getInitialBaseState(): Omit<BaseState, "config" | "options"> {
    return {
      cursorCoordinates: [0, 0],
      pixelCoordinates: [0, 0],
      relativeCoordinates: [0, 0],
      disableControls: false,
      hovering: false,
      hoveringControls: false,
      showControls: false,
      showHelp: false,
      showOptions: false,
      loaded: false,
      scale: 1,
      pan: <Coordinates>[0, 0],
      rotate: 0,
      panning: false,
      canZoom: false,
      strokeWidth: STROKE_WIDTH,
      fontSize: FONT_SIZE,
      wheeling: false,
      transformedWindowBBox: null,
      windowBBox: null,
      transformedMediaBBox: null,
      mediaBBox: null,
      canvasBBox: null,
      textPad: PAD,
      fullscreen: false,
      pointRadius: POINT_RADIUS,
      mouseIsOnOverlay: false,
      overlaysPrepared: false,
    };
  }

  protected postProcess(element: HTMLElement): State {
    let [tlx, tly, w, h] = this.state.windowBBox;
    this.state.pan = snapBox(
      this.state.scale,
      this.state.pan,
      [w, h],
      this.state.config.dimensions
    );
    this.state.mediaBBox = getFitRect(
      this.state.config.dimensions,
      this.state.windowBBox
    );
    this.state.transformedWindowBBox = [
      tlx + this.state.pan[0],
      tly + this.state.pan[1],
      this.state.scale * w,
      this.state.scale * h,
    ];

    this.state.transformedMediaBBox = getFitRect(
      this.state.config.dimensions,
      this.state.transformedWindowBBox
    );
    this.state.canvasBBox = [
      this.state.mediaBBox[0] - this.state.windowBBox[0],
      this.state.mediaBBox[1] - this.state.windowBBox[1],
      this.state.mediaBBox[2],
      this.state.mediaBBox[3],
    ];
    this.state.relativeCoordinates = [
      (this.state.cursorCoordinates[0] - this.state.transformedMediaBBox[0]) /
        this.state.transformedMediaBBox[2],
      (this.state.cursorCoordinates[1] - this.state.transformedMediaBBox[1]) /
        this.state.transformedMediaBBox[3],
    ];
    this.state.pixelCoordinates = [
      this.state.relativeCoordinates[0] * this.state.config.dimensions[0],
      this.state.relativeCoordinates[1] * this.state.config.dimensions[1],
    ];
    this.state.fontSize = FONT_SIZE / this.state.scale;
    this.state.pointRadius = POINT_RADIUS / this.state.scale;
    this.state.strokeWidth = STROKE_WIDTH / this.state.scale;
    this.state.config.thumbnail && (this.state.strokeWidth /= 2);
    this.state.textPad = PAD / this.state.scale;

    return this.state;
  }
}

export class FrameLooker extends Looker<FrameState> {
  private overlays: Overlay<FrameState>[];

  constructor(sample, config, options) {
    super(sample, config, options);
    this.overlays = [];
  }

  getElements() {
    return getFrameElements(this.updater, this.getDispatchEvent());
  }

  getInitialState(config, options) {
    options = {
      ...this.getDefaultOptions(),
      ...options,
    };
    return {
      duration: null,
      ...this.getInitialBaseState(),
      canZoom: options.zoom,
      config: { ...config },
      options,
    };
  }

  getDefaultOptions() {
    return DEFAULT_FRAME_OPTIONS;
  }

  loadOverlays(sample) {
    this.overlays = loadOverlays(sample);
  }

  pluckOverlays() {
    return this.overlays;
  }

  postProcess(element): FrameState {
    this.state.windowBBox = getElementBBox(element);
    this.state = zoomToContent(this.state, this.pluckedOverlays);
    return super.postProcess(element);
  }
}

export class ImageLooker extends Looker<ImageState> {
  private overlays: Overlay<ImageState>[];

  constructor(sample, config, options) {
    super(sample, config, options);
    this.overlays = [];
  }

  getElements() {
    return getImageElements(this.updater, this.getDispatchEvent());
  }

  getInitialState(config, options) {
    options = {
      ...this.getDefaultOptions(),
      ...options,
    };

    return {
      ...this.getInitialBaseState(),
      canZoom: options.zoom,
      config: { ...config },
      options,
    };
  }

  getDefaultOptions() {
    return DEFAULT_IMAGE_OPTIONS;
  }

  loadOverlays(sample) {
    this.overlays = loadOverlays(sample);
  }

  pluckOverlays() {
    return this.overlays;
  }

  postProcess(element): ImageState {
    this.state.windowBBox = getElementBBox(element);
    this.state = zoomToContent(this.state, this.pluckedOverlays);
    return super.postProcess(element);
  }
}

interface FrameSample extends Object {
  frame_number: number;
}

interface VideoSample extends BaseSample {
  frames: { 1?: FrameSample };
}

interface AttachReaderOptions {
  addFrame: (frameNumber: number, frame: FrameSample) => void;
  getCurrentFrame: () => number;
  sampleId: string;
  frameNumber: number;
  frameCount: number;
}

const aquireReader = (() => {
  const frameCache = new LRU<string, FrameSample>({
    max: MAX_FRAME_CACHE_SIZE,
  });
  let streamCount: number = null;

  const frameReader = createWorker();

  return ({
    addFrame,
    frameNumber,
    frameCount,
    getCurrentFrame,
    sampleId,
  }: AttachReaderOptions) => {
    const subscription = uuid();
    streamCount = 0;
    frameReader.onmessage = ({
      data: {
        uuid,
        method,
        frames,
        range: [start, end],
      },
    }: MessageEvent<FrameChunkResponse>) => {
      if (uuid === subscription && method === "frameChunk") {
        Array(end - start + 1)
          .fill(0)
          .forEach((_, i) => {
            streamCount += 1;
            const frameNumber = start + i;
            const frame = frames[frameNumber] || {};
            frameCache.set(`${sampleId}-${frameNumber}`, frame);
            addFrame(frameNumber, frame);
          });

        if (streamCount < end - getCurrentFrame() && end < frameCount) {
          frameReader.postMessage({
            method: "requestFrameChunk",
            uuid: subscription,
          });
        }
      }
    };
    frameReader.postMessage({
      method: "setReader",
      sampleId,
      frameCount,
      frameNumber,
      uuid: subscription,
    });
  };
})();

export class VideoLooker extends Looker<VideoState, VideoSample> {
  private sampleOverlays: Overlay<VideoState>[];
  private frameOverlays: Map<number, WeakRef<Overlay<VideoState>[]>>;
  private firstFrameOverlays: Overlay<VideoState>[];

  constructor(sample, config, options) {
    super(sample, config, options);
    this.sampleOverlays = [];
    this.frameOverlays = new Map();
  }

  get frameNumber() {
    return this.state.frameNumber;
  }

  getElements() {
    return getVideoElements(this.updater, this.getDispatchEvent());
  }

  getInitialState(config, options) {
    return {
      duration: null,
      seeking: false,
      locked: false,
      fragment: null,
      playing: false,
      frameNumber: 1,
      buffering: true,
      hasReader: false,
      ...this.getInitialBaseState(),
      config: { ...config },
      options: {
        ...this.getDefaultOptions(),
        ...options,
      },
    };
  }

  loadOverlays(sample) {
    this.sampleOverlays = loadOverlays(
      Object.fromEntries(
        Object.entries(sample).filter(([fieldName]) => fieldName !== "frames")
      )
    );
    this.firstFrameOverlays = loadOverlays(
      Object.fromEntries(
        Object.entries(sample?.frames[1] || {}).map(([k, v]) => [
          "frames." + k,
          v,
        ])
      )
    );
    this.frameOverlays.set(1, new WeakRef(this.firstFrameOverlays));
  }

  pluckOverlays(state: VideoState, prevState: Readonly<VideoState>) {
    const overlays = this.sampleOverlays;
    if (this.frameOverlays.has(state.frameNumber)) {
      const frame = this.frameOverlays.get(state.frameNumber).deref();

      if (frame !== undefined) {
        return [...overlays, ...frame];
      }
    }

    if (state.config.thumbnail && state.playing) {
      aquireReader({
        addFrame: (frameNumber, frame) =>
          this.frameOverlays.set(frameNumber, new WeakRef(frame)),
        getCurrentFrame: () => this.frameNumber,
        sampleId: this.state.config.sampleId,
        frameCount: getFrameNumber(
          this.state.duration,
          this.state.duration,
          this.state.config.frameRate
        ),
        frameNumber: state.frameNumber,
      });
    }

    state.frameNumber = prevState.frameNumber;
    state.buffering = true;

    return this.pluckedOverlays;
  }

  getDefaultOptions() {
    return DEFAULT_VIDEO_OPTIONS;
  }

  play(): void {
    this.updater(({ playing }) => {
      if (!playing) {
        return { playing: true };
      }
      return {};
    });
  }

  pause(): void {
    this.updater(({ playing }) => {
      if (playing) {
        return { playing: false };
      }
      return {};
    });
  }

  resetToFragment(): void {
    this.updater(({ fragment }) => {
      if (!fragment) {
        this.dispatchEvent("error", new Error("No fragment set"));
        return {};
      } else {
        return { locked: true, frameNumber: fragment[0] };
      }
    });
  }

  postProcess(element): VideoState {
    this.state.windowBBox = getElementBBox(element);
    return super.postProcess(element);
  }
}
