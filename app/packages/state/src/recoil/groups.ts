import {
  mainSample,
  mainSampleQuery,
  paginateGroup,
  paginateGroupPinnedSampleFragment,
  paginateGroupPinnedSample_query$key,
  paginateGroupQuery,
  paginateGroup_query$key,
} from "@fiftyone/relay";

import { atom, atomFamily, selector, selectorFamily } from "recoil";
import { VariablesOf, readInlineData } from "react-relay";

import { graphQLSelector } from "recoil-relay";
import {
  AppSample,
  dataset,
  modal,
  modal as modalAtom,
  sidebarOverride,
} from "./atoms";
import { RelayEnvironmentKey } from "./relay";
import { datasetName } from "./selectors";
import { view } from "./view";
import type { ResponseFrom } from "../utils";

export const isGroup = selector<boolean>({
  key: "isGroup",
  get: ({ get }) => {
    return get(dataset)?.mediaType === "group";
  },
});

export const defaultGroupSlice = selector<string>({
  key: "defaultGroupSlice",
  get: ({ get }) => {
    return get(dataset).defaultGroupSlice;
  },
});

export const groupSlice = atomFamily<string, boolean>({
  key: "groupSlice",
  default: null,
});

export const groupMediaTypes = selector<{ name: string; mediaType: string }[]>({
  key: "groupMediaTypes",
  get: ({ get }) => get(dataset).groupMediaTypes,
});

export const groupSlices = selector<string[]>({
  key: "groupSlices",
  get: ({ get }) => {
    return get(groupMediaTypes)
      .filter(
        ({ mediaType }) => !["point_cloud", "point-cloud"].includes(mediaType)
      )
      .map(({ name }) => name)
      .sort();
  },
});

export const pinnedSlice = selector<string | null>({
  key: "pinnedSlice",
  get: ({ get }) => {
    const { groupMediaTypes } = get(dataset);

    for (const { name, mediaType } of groupMediaTypes) {
      if (["point_cloud", "point-cloud"].includes(mediaType)) {
        return name;
      }
    }

    return null;
  },
});

export const currentSlice = selectorFamily<string | null, boolean>({
  key: "currentSlice",
  get:
    (modal) =>
    ({ get }) => {
      if (!get(isGroup)) return null;

      if (modal && get(sidebarOverride)) {
        return get(pinnedSlice);
      }

      return get(groupSlice(modal)) || get(defaultGroupSlice);
    },
});

export const hasPinnedSlice = selector<boolean>({
  key: "hasPinnedSlice",
  get: ({ get }) => Boolean(get(pinnedSlice)),
});

export const groupField = selector<string>({
  key: "groupField",
  get: ({ get }) => get(dataset).groupField,
});

export const groupId = selector<string>({
  key: "groupId",
  get: ({ get }) => {
    return get(modalAtom).sample[get(groupField)]._id;
  },
});

export const refreshGroupQuery = atom<number>({
  key: "refreshGroupQuery",
  default: 0,
});

export const groupQuery = graphQLSelector<
  VariablesOf<paginateGroupQuery>,
  ResponseFrom<paginateGroupQuery>
>({
  key: "groupQuery",
  environment: RelayEnvironmentKey,
  mapResponse: (response) => response,
  query: paginateGroup,
  variables: ({ get }) => {
    const sample = get(modalAtom).sample;

    const group = get(groupField);

    return {
      dataset: get(datasetName),
      view: get(view),
      filter: {
        group: {
          id: sample[group]._id,
        },
      },
      pinnedSampleFilter: {
        group: {
          id: sample[group]._id,
          slice: get(pinnedSlice),
        },
      },
    };
  },
});

export const pinnedSliceSample = selector({
  key: "pinnedSliceSampleFragment",
  get: ({ get }) => {
    let data = readInlineData<paginateGroupPinnedSample_query$key>(
      paginateGroupPinnedSampleFragment,
      get(groupQuery)
    ).sample;

    if (data.__typename !== "PointCloudSample") {
      throw new Error("unsupported pinned sample type");
    }

    if (typeof data.sample === "string") {
      data = {
        ...data,
        sample: JSON.parse(data.sample),
      };
    }

    return {
      sample: data.sample,
      urls: Object.fromEntries(data.urls.map(({ field, url }) => [field, url])),
    };
  },
});

export const groupPaginationFragment = selector<paginateGroup_query$key>({
  key: "groupPaginationFragment",
  get: ({ get }) => get(groupQuery),
});

export const activeModalSample = selector<
  AppSample | paginateGroupPinnedSample_query$key
>({
  key: "activeModalSample",
  get: ({ get }) => {
    if (get(sidebarOverride)) {
      return get(pinnedSliceSample).sample;
    }

    return get(modal)?.sample;
  },
});

const mainSampleQuery = graphQLSelector<
  VariablesOf<mainSampleQuery>,
  ResponseFrom<mainSampleQuery>
>({
  environment: RelayEnvironmentKey,
  key: "mainSampleQuery",
  mapResponse: (response) => response,
  query: mainSample,
  variables: ({ get }) => {
    return {
      view: get(view),
      dataset: get(dataset).name,
      filter: {
        group: {
          slice: get(groupSlice(true)),
          id: get(modal).sample[get(groupField)]._id,
        },
      },
    };
  },
});

export const mainGroupSample = selector<AppSample>({
  key: "mainGroupSample",
  get: ({ get }) => {
    const field = get(groupField);
    const group = get(isGroup);

    const sample = get(modal).sample;

    if (!field || !group) return sample;

    if (sample[field].name === get(groupSlice(true))) {
      return sample;
    }

    return get(mainSampleQuery).sample.sample as AppSample;
  },
});

export const groupStatistics = atomFamily<"group" | "slice", boolean>({
  key: "groupStatistics",
  default: "slice",
});
