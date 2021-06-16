/**
 * Copyright 2017-2021, Voxel51, Inc.
 */

import { processMasks } from "./overlays";
import { FrameChunk } from "./state";

/** GLOBALS */

const HIGH_WATER_MARK = 6;
const CHUNK_SIZE = 30;

let stream: FrameStream = null;
let streamId: string = null;

/** END GLOBALS */

interface ReaderMethod {
  method: string;
}

interface ProcessSample {
  origin: string;
  uuid: string;
  sample: {
    [key: string]: object;
    frames?: {
      1: object;
    };
  };
}

type ProcessSampleMethod = ReaderMethod & ProcessSample;

const processSample = ({ sample, uuid }: ProcessSample) => {
  let buffers = processMasks(sample);

  if (sample.frames && sample.frames[1]) {
    buffers = [...buffers, ...processMasks(sample.frames[1])];
  }

  postMessage(
    {
      method: "processSample",
      sample,
      uuid,
    },
    // @ts-ignore
    buffers
  );
};

interface FrameStream {
  chunkSize: number;
  frameNumber: number;
  sampleId: string;
  reader: ReadableStreamDefaultReader<FrameChunk>;
  cancel: () => void;
}

const createReader = ({
  chunkSize,
  frameCount,
  frameNumber,
  url,
  sampleId,
}: {
  chunkSize: number;
  frameCount: number;
  frameNumber: number;
  url: string;
  sampleId: string;
}): FrameStream => {
  let cancelled = false;

  const stream = new ReadableStream<FrameChunk>(
    {
      pull: (controller: ReadableStreamDefaultController) => {
        if (frameNumber >= frameCount || cancelled) {
          controller.close();
          return Promise.resolve();
        }

        return new Promise((resolve, reject) => {
          fetch(
            url +
              new URLSearchParams({
                frameNumber: frameNumber.toString(),
                numFrames: chunkSize.toString(),
                frameCount: frameCount.toString(),
                sampleId,
              })
          )
            .then((response: Response) => response.json())
            .then(({ frames, range }) => {
              controller.enqueue({ frames, range });
              frameNumber = range[1];
              resolve();
            })
            .catch((error) => {
              reject(error);
            });
        });
      },
      cancel: () => {
        cancelled = true;
      },
    },
    new CountQueuingStrategy({ highWaterMark: HIGH_WATER_MARK })
  );
  return {
    sampleId,
    frameNumber,
    chunkSize,
    reader: stream.getReader(),
    cancel: () => stream.cancel(),
  };
};

const getSendChunk = (id: string) => ({
  value,
}: {
  done: boolean;
  value?: FrameChunk;
}) => {
  if (value) {
    let buffers: ArrayBuffer[] = [];
    Object.entries(value.frames).forEach(([_, frame]) => {
      buffers = [...buffers, ...processMasks(frame)];
    });
    postMessage(
      {
        method: "frameChunk",
        frames: value.frames,
        range: value.range,
      },
      // @ts-ignore
      buffers
    );
  }
};

interface RequestFrameChunk {
  id: string;
}

const requestFrameChunk = ({ id }) => {
  if (id === streamId && !stream.reader.closed) {
    stream.reader.read().then(getSendChunk(id));
  }
};

interface SetStream {
  origin: string;
  sampleId: string;
  frameNumber: number;
  frameCount: number;
  id: string;
}

type SetStreamMethod = ReaderMethod & SetStream;

const setStream = ({
  origin,
  sampleId,
  frameNumber,
  frameCount,
  id,
}: SetStream) => {
  stream && stream.cancel();
  streamId = id;
  stream = createReader({
    chunkSize: CHUNK_SIZE,
    frameCount: frameCount,
    frameNumber: frameNumber,
    sampleId,
    url: `${origin}/frames`,
  });

  stream.reader.read().then(getSendChunk(id));
};

type Method = SetStreamMethod | ProcessSampleMethod;

onmessage = ({ data: { method, ...args } }: MessageEvent<Method>) => {
  switch (method) {
    case "processSample":
      processSample(args as ProcessSample);
      return;
    case "requestFrameChunk":
      requestFrameChunk(args as RequestFrameChunk);
      return;
    case "setReader":
      setStream(args as SetStream);
      return;
    default:
      throw new Error("unknown method");
  }
};
